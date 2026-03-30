# Análisis de Base de Datos: Normalización y Optimización de Rendimiento

## 1. Esquema Actual

### Tablas Existentes

#### areas
- id (uuid, PK)
- name (text)
- responsible (text)
- created_at (timestamp)

#### checklists
- id (uuid, PK)
- area_id (uuid, FK → areas)
- name (text)
- type (text)
- created_at (timestamp)

#### checklist_items
- id (uuid, PK)
- checklist_id (uuid, FK → checklists)
- category (text)
- subcriterion (text)
- criterion (text)
- details (text)
- position (integer)

#### inspections
- id (uuid, PK)
- area_id (uuid, FK → areas)
- checklist_id (uuid, FK → checklists)
- inspector_name (text)
- date (timestamp)
- status (text)
- created_at (timestamp)

#### findings
- id (uuid, PK)
- inspection_id (uuid, FK → inspections)
- item_id (uuid, FK → checklist_items)
- status (text)
- description (text)
- corrective_action (text)
- due_date (timestamp)
- closed_date (timestamp)
- created_at (timestamp)
- updated_at (timestamp)

#### finding_photos
- id (uuid, PK)
- finding_id (uuid, FK → findings)
- photo_url (text)
- photo_type (text)
- created_at (timestamp)

---

## 2. Análisis de Normalización (3FN)

### ✅ Primera Forma Normal (1FN)
**Cumple:** Todos los atributos contienen valores atómicos, sin grupos repetitivos.

### ✅ Segunda Forma Normal (2FN)
**Cumple:** No hay dependencias parciales. Todas las claves primarias son simples (uuid único).

### ⚠️ Tercera Forma Normal (3FN)
**Problemas identificados:**

1. **checklist_items.category, subcriterion, criterion**
   - Problema: Datos repetitivos almacenados como texto
   - Impacto: Inconsistencias, espacio desperdiciado, difícil de consultar

2. **inspections.inspector_name**
   - Problema: Nombre del inspector almacenado como texto
   - Impacto: Duplicación si el mismo inspector hace múltiples inspecciones

3. **finding_photos.photo_type**
   - Problema: Tipo de foto almacenado como texto libre
   - Impacto: Posibles inconsistencias en los valores

---

## 3. Esquema Normalizado Propuesto (3FN)

### 3.1 Nuevas Tablas para Normalización

\`\`\`sql
-- Tabla de inspectores
CREATE TABLE inspectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de categorías (nivel 1)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(checklist_id, name)
);

-- Tabla de subcategorías (nivel 2)
CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Tabla de criterios (nivel 3)
CREATE TABLE criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  details TEXT,
  subcategory_id UUID REFERENCES subcategories(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de foto (catálogo)
CREATE TABLE photo_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

-- Insertar tipos predefinidos
INSERT INTO photo_types (name, description) VALUES
  ('evidence', 'Foto de evidencia del hallazgo'),
  ('before', 'Foto del estado antes de la corrección'),
  ('after', 'Foto del estado después de la corrección');
\`\`\`

### 3.2 Tablas Modificadas

\`\`\`sql
-- Modificar inspections para usar FK a inspectors
ALTER TABLE inspections 
  ADD COLUMN inspector_id UUID REFERENCES inspectors(id);

-- Migración de datos existentes
INSERT INTO inspectors (name)
SELECT DISTINCT inspector_name 
FROM inspections 
WHERE inspector_name IS NOT NULL;

UPDATE inspections i
SET inspector_id = (
  SELECT id FROM inspectors 
  WHERE name = i.inspector_name 
  LIMIT 1
);

-- Eliminar columna antigua después de migración
-- ALTER TABLE inspections DROP COLUMN inspector_name;

-- Modificar finding_photos para usar FK a photo_types
ALTER TABLE finding_photos
  ADD COLUMN photo_type_id UUID REFERENCES photo_types(id);

-- Migración de datos existentes
UPDATE finding_photos fp
SET photo_type_id = (
  SELECT id FROM photo_types 
  WHERE name = fp.photo_type 
  LIMIT 1
);

-- Modificar findings para referenciar criteria en lugar de checklist_items
ALTER TABLE findings
  ADD COLUMN criterion_id UUID REFERENCES criteria(id);
\`\`\`

---

## 4. Estrategia de Rendimiento

### 4.1 Índices para Consultas Rápidas

\`\`\`sql
-- Índices para búsquedas frecuentes
CREATE INDEX idx_inspections_area_date ON inspections(area_id, date DESC);
CREATE INDEX idx_inspections_status ON inspections(status) WHERE status != 'completed';
CREATE INDEX idx_findings_inspection ON findings(inspection_id);
CREATE INDEX idx_findings_status ON findings(status) WHERE status != 'closed';
CREATE INDEX idx_finding_photos_finding ON finding_photos(finding_id);

-- Índices compuestos para consultas complejas
CREATE INDEX idx_inspections_area_checklist ON inspections(area_id, checklist_id, date DESC);
CREATE INDEX idx_findings_inspection_status ON findings(inspection_id, status);

-- Índice para búsqueda de texto en hallazgos
CREATE INDEX idx_findings_description_gin ON findings USING gin(to_tsvector('spanish', description));

-- Índices para jerarquía de criterios
CREATE INDEX idx_categories_checklist ON categories(checklist_id, position);
CREATE INDEX idx_subcategories_category ON subcategories(category_id, position);
CREATE INDEX idx_criteria_subcategory ON criteria(subcategory_id, position);
\`\`\`

### 4.2 Estrategia de Subida Masiva de Evidencias

#### Opción 1: Batch Insert con Transacciones (Actual)
\`\`\`sql
-- Insertar múltiples fotos en una sola transacción
BEGIN;

INSERT INTO finding_photos (finding_id, photo_url, photo_type_id)
VALUES 
  ('uuid1', 'https://blob.vercel-storage.com/photo1.jpg', 'type_uuid'),
  ('uuid1', 'https://blob.vercel-storage.com/photo2.jpg', 'type_uuid'),
  ('uuid1', 'https://blob.vercel-storage.com/photo3.jpg', 'type_uuid');

COMMIT;
\`\`\`

#### Opción 2: COPY para Inserciones Masivas (Óptimo para >1000 registros)
\`\`\`sql
-- Usar COPY para inserción ultra-rápida
COPY finding_photos (finding_id, photo_url, photo_type_id)
FROM STDIN WITH (FORMAT csv);
\`\`\`

#### Opción 3: Prepared Statements con Pooling
\`\`\`typescript
// En el código de la aplicación
const insertPhotos = await supabase.rpc('batch_insert_photos', {
  photos: [
    { finding_id: 'uuid1', photo_url: 'url1', photo_type_id: 'type1' },
    { finding_id: 'uuid1', photo_url: 'url2', photo_type_id: 'type1' }
  ]
});
\`\`\`

### 4.3 Función Almacenada para Batch Insert

\`\`\`sql
-- Función para inserción masiva optimizada
CREATE OR REPLACE FUNCTION batch_insert_photos(photos JSONB)
RETURNS SETOF finding_photos AS $$
BEGIN
  RETURN QUERY
  INSERT INTO finding_photos (finding_id, photo_url, photo_type_id)
  SELECT 
    (p->>'finding_id')::UUID,
    p->>'photo_url',
    (p->>'photo_type_id')::UUID
  FROM jsonb_array_elements(photos) AS p
  RETURNING *;
END;
$$ LANGUAGE plpgsql;
\`\`\`

### 4.4 Vistas Materializadas para Reportes

\`\`\`sql
-- Vista materializada para estadísticas de áreas
CREATE MATERIALIZED VIEW area_statistics AS
SELECT 
  a.id,
  a.name,
  COUNT(DISTINCT i.id) as total_inspections,
  COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_inspections,
  COUNT(DISTINCT f.id) as total_findings,
  COUNT(DISTINCT CASE WHEN f.status = 'open' THEN f.id END) as open_findings,
  MAX(i.date) as last_inspection_date
FROM areas a
LEFT JOIN inspections i ON a.id = i.area_id
LEFT JOIN findings f ON i.id = f.inspection_id
GROUP BY a.id, a.name;

-- Índice en la vista materializada
CREATE UNIQUE INDEX idx_area_stats_id ON area_statistics(id);

-- Refrescar periódicamente (puede ser automático con pg_cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY area_statistics;
\`\`\`

### 4.5 Particionamiento para Tablas Grandes

\`\`\`sql
-- Particionar inspections por fecha (si hay muchas inspecciones)
CREATE TABLE inspections_partitioned (
  LIKE inspections INCLUDING ALL
) PARTITION BY RANGE (date);

-- Crear particiones por año
CREATE TABLE inspections_2024 PARTITION OF inspections_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE inspections_2025 PARTITION OF inspections_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
\`\`\`

---

## 5. Optimizaciones de Aplicación

### 5.1 Estrategia de Carga de Fotos

\`\`\`typescript
// Subir fotos en paralelo con límite de concurrencia
async function uploadPhotosInBatches(photos: File[], batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < photos.length; i += batchSize) {
    const batch = photos.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(photo => uploadPhotoToBlob(photo))
    );
    results.push(...batchResults);
    
    // Pequeña pausa entre lotes para no saturar
    if (i + batchSize < photos.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
\`\`\`

### 5.2 Caché de Consultas Frecuentes

\`\`\`typescript
// Usar SWR para caché automático
import useSWR from 'swr';

function useAreaStatistics(areaId: string) {
  return useSWR(
    `/api/areas/${areaId}/statistics`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 60000 // Refrescar cada minuto
    }
  );
}
\`\`\`

### 5.3 Paginación y Lazy Loading

\`\`\`typescript
// Cargar fotos bajo demanda
function InspectionPhotos({ findingId }: { findingId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSWR(
    `/api/findings/${findingId}/photos?page=${page}&limit=20`
  );
  
  return (
    <InfiniteScroll
      loadMore={() => setPage(p => p + 1)}
      hasMore={data?.hasMore}
    >
      {data?.photos.map(photo => (
        <LazyImage key={photo.id} src={photo.url} />
      ))}
    </InfiniteScroll>
  );
}
\`\`\`

---

## 6. Monitoreo y Mantenimiento

### 6.1 Consultas de Monitoreo

\`\`\`sql
-- Identificar consultas lentas
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Tamaño de tablas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Índices no utilizados
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey';
\`\`\`

### 6.2 Mantenimiento Automático

\`\`\`sql
-- Configurar autovacuum agresivo para tablas con muchas actualizaciones
ALTER TABLE findings SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- Configurar autovacuum para finding_photos
ALTER TABLE finding_photos SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);
\`\`\`

---

## 7. Plan de Migración

### Fase 1: Preparación (Sin downtime)
1. Crear nuevas tablas (inspectors, categories, subcategories, criteria, photo_types)
2. Crear índices en tablas existentes
3. Crear funciones almacenadas

### Fase 2: Migración de Datos (Downtime mínimo)
1. Migrar datos de inspector_name a inspectors
2. Migrar estructura de checklist_items a categories/subcategories/criteria
3. Actualizar referencias en findings

### Fase 3: Actualización de Aplicación
1. Actualizar código para usar nuevas tablas
2. Implementar batch insert para fotos
3. Agregar caché y paginación

### Fase 4: Limpieza
1. Eliminar columnas antiguas
2. Eliminar índices redundantes
3. Optimizar configuración de base de datos

---

## 8. Métricas de Éxito

### Antes de Optimización
- Tiempo de carga de inspección con 50 fotos: ~5-10 segundos
- Tiempo de guardado con 50 fotos: ~15-30 segundos (congelamiento)
- Consultas de reportes: ~2-5 segundos

### Después de Optimización (Objetivos)
- Tiempo de carga de inspección con 50 fotos: <1 segundo
- Tiempo de guardado con 50 fotos: <3 segundos (sin congelamiento)
- Consultas de reportes: <500ms
- Subida de 100 fotos: <10 segundos

---

## 9. Recomendaciones Adicionales

1. **Implementar CDN para fotos**: Usar Vercel Blob con CDN para carga rápida
2. **Compresión de imágenes**: Mantener calidad 0.7 y max 1200px
3. **Lazy loading**: Cargar fotos solo cuando sean visibles
4. **Service Worker**: Caché de fotos en el navegador para offline
5. **WebP format**: Usar formato WebP para mejor compresión
6. **Thumbnail generation**: Generar miniaturas para listados
7. **Database connection pooling**: Usar Supabase pooler para mejor rendimiento
8. **Rate limiting**: Limitar subidas simultáneas para evitar saturación
