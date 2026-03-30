# Guía de Correcciones - Inspectify CG

## Corrección 1: Eliminar Funciones Wrapper en actions.ts

### Problema
Las funciones en `actions.ts` son simples wrappers que solo llaman a funciones de `storage.server.ts`. Esto añade una capa innecesaria de complejidad.

### Solución
Usar directamente las funciones de `storage.server.ts` en los componentes.

### Cambios Necesarios

**Antes:**
\`\`\`typescript
// app/area/page.tsx
import { getAreasAction, getChecklistsByAreaAction } from "@/lib/actions"

const areas = await getAreasAction()
const checklists = await getChecklistsByAreaAction(areaId)
\`\`\`

**Después:**
\`\`\`typescript
// app/area/page.tsx
import { getAreas, getChecklistsByArea } from "@/lib/storage.server"

const areas = await getAreas()
const checklists = await getChecklistsByArea(areaId)
\`\`\`

### Archivos a Actualizar
- `/lib/actions.ts` - Eliminar funciones wrapper (líneas 52-102)
- `/app/area/page.tsx` - Actualizar imports
- `/app/area/[areaId]/page.tsx` - Actualizar imports
- `/app/consolidado/page.tsx` - Actualizar imports
- `/app/comparativas/page.tsx` - Actualizar imports
- `/app/historial/page.tsx` - Actualizar imports
- `/app/seguimiento/page.tsx` - Actualizar imports
- `/app/informe/[inspectionId]/page.tsx` - Actualizar imports
- `/app/resultados/[inspectionId]/page.tsx` - Actualizar imports

---

## Corrección 2: Optimizar useEffect en Página de Inspección

### Problema
Múltiples useEffect sin dependencias claras causan re-renders innecesarios.

### Solución
Consolidar en un único useEffect con dependencias correctas.

**Archivo:** `/app/inspeccion/[areaId]/[checklistId]/page.tsx`

**Antes:**
\`\`\`typescript
useEffect(() => {
  // Carga datos
}, [])

useEffect(() => {
  // Maneja scroll
}, [])

useEffect(() => {
  // Carga drafts
}, [])
\`\`\`

**Después:**
\`\`\`typescript
useEffect(() => {
  const loadInitialData = async () => {
    // Cargar datos, drafts, y configurar listeners
  }
  loadInitialData()
}, [areaId, checklistId])
\`\`\`

---

## Corrección 3: Extraer Función de Descarga de Blob

### Problema
El código para descargar fotos desde Blob se repite 3 veces.

### Solución
Crear función reutilizable.

**Nuevo archivo:** `/lib/blob/download-helper.ts`

\`\`\`typescript
export async function downloadBlobPhotoToDevice(photoUrl: string): Promise<string> {
  const response = await fetch(photoUrl)
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  return url
}
\`\`\`

**Uso:**
\`\`\`typescript
// Antes
const response = await fetch(uploadedUrls[i])
const blob = await response.blob()
const url = window.URL.createObjectURL(blob)

// Después
const url = await downloadBlobPhotoToDevice(uploadedUrls[i])
\`\`\`

---

## Corrección 4: Implementar Paginación en Reportes

### Problema
Las páginas de reportes cargan TODAS las inspecciones, ralentizando la app.

### Solución
Implementar paginación o lazy loading.

**Archivos afectados:**
- `/app/consolidado/page.tsx`
- `/app/comparativas/page.tsx`
- `/app/historial/page.tsx`

**Ejemplo:**
\`\`\`typescript
const [page, setPage] = useState(1)
const itemsPerPage = 20

const paginatedInspections = inspections.slice(
  (page - 1) * itemsPerPage,
  page * itemsPerPage
)
\`\`\`

---

## Corrección 5: Limpiar localStorage Automáticamente

### Problema
localStorage puede llenarse sin límite, causando errores.

### Solución
Implementar limpieza automática de drafts antiguos.

**Archivo:** `/app/inspeccion/[areaId]/[checklistId]/page.tsx`

\`\`\`typescript
// Limpiar drafts más antiguos de 7 días
const cleanOldDrafts = () => {
  const draftsKey = `inspection_drafts_${areaId}_${checklistId}`
  const savedDrafts = localStorage.getItem(draftsKey)
  
  if (savedDrafts) {
    const drafts = JSON.parse(savedDrafts)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    
    const filteredDrafts = drafts.filter(
      (draft: any) => draft.timestamp > sevenDaysAgo
    )
    
    localStorage.setItem(draftsKey, JSON.stringify(filteredDrafts))
  }
}

// Llamar en useEffect
useEffect(() => {
  cleanOldDrafts()
}, [areaId, checklistId])
\`\`\`

---

## Corrección 6: Memoizar Componentes de Lista

### Problema
Listas de fotos se re-renderizan completamente en cada cambio.

### Solución
Usar React.memo() y useMemo().

**Ejemplo:**
\`\`\`typescript
// Crear componente memoizado
const PhotoItem = React.memo(({ photo, onDelete }: PhotoItemProps) => (
  <div className="photo-item">
    <img src={photo.url || "/placeholder.svg"} alt="photo" />
    <button onClick={() => onDelete(photo.id)}>Eliminar</button>
  </div>
))

// Usar en lista
const photoList = useMemo(
  () => photos.map(photo => (
    <PhotoItem key={photo.id} photo={photo} onDelete={handleDelete} />
  )),
  [photos]
)
\`\`\`

---

## Corrección 7: Validar Datos Importados

### Problema
No hay validación de datos al importar.

### Solución
Usar Zod para validación.

**Archivo:** `/lib/storage.server.ts`

\`\`\`typescript
import { z } from "zod"

const AreaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  created_at: z.string().datetime(),
})

export async function importData(jsonData: string) {
  const data = JSON.parse(jsonData)
  
  // Validar estructura
  const areas = z.array(AreaSchema).parse(data.areas)
  
  // Procesar datos validados
  // ...
}
\`\`\`

---

## Corrección 8: Agregar JSDoc a Funciones

### Problema
Funciones complejas sin documentación.

### Solución
Agregar comentarios JSDoc.

**Ejemplo:**
\`\`\`typescript
/**
 * Sube múltiples imágenes a Vercel Blob Storage en paralelo
 * @param images - Array de imágenes en base64
 * @param onProgress - Callback para reportar progreso
 * @param batchSize - Número de imágenes a subir en paralelo (default: 5)
 * @returns Array de URLs de las imágenes subidas
 * @throws Error si falla la subida
 */
export async function uploadMultipleImagesToBlob(
  images: string[],
  onProgress?: (current: number, total: number) => void,
  batchSize: number = 5
): Promise<string[]> {
  // ...
}
\`\`\`

---

## Cronograma de Implementación

| Corrección | Prioridad | Tiempo Estimado | Semana |
|---|---|---|---|
| 1. Eliminar wrappers | CRÍTICA | 2 horas | Semana 1 |
| 2. Optimizar useEffect | CRÍTICA | 3 horas | Semana 1 |
| 3. Extraer función descarga | ALTA | 1 hora | Semana 1 |
| 4. Paginación | ALTA | 4 horas | Semana 2 |
| 5. Limpiar localStorage | MEDIA | 1 hora | Semana 2 |
| 6. Memoizar listas | MEDIA | 2 horas | Semana 2 |
| 7. Validar datos | MEDIA | 2 horas | Semana 3 |
| 8. Agregar JSDoc | BAJA | 3 horas | Semana 3 |

---

## Testing Recomendado

Después de cada corrección, verificar:

1. ✅ La app carga sin errores
2. ✅ Las inspecciones se guardan correctamente
3. ✅ Las fotos se cargan sin problemas
4. ✅ Los reportes se generan correctamente
5. ✅ No hay memory leaks en DevTools
6. ✅ Performance mejora (medir con Lighthouse)

---

**Última actualización:** 27 de Octubre de 2025
