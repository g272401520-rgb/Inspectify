-- Crear tablas para el sistema de inspecciones

-- Tabla de áreas
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  responsible TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de checklists
CREATE TABLE IF NOT EXISTS checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('normal', 'registro', 'manual', 'excel')) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar tabla de inspectores
CREATE TABLE IF NOT EXISTS inspectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(checklist_id, name)
);

-- Agregar tabla de subcategorías
CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Agregar tabla de criterios
CREATE TABLE IF NOT EXISTS criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  details TEXT,
  subcategory_id UUID REFERENCES subcategories(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar tabla de tipos de foto
CREATE TABLE IF NOT EXISTS photo_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar tipos de foto predefinidos
INSERT INTO photo_types (name, description) VALUES
  ('evidence', 'Foto de evidencia del hallazgo'),
  ('solution', 'Foto de la solución implementada'),
  ('before', 'Foto del estado antes de la corrección'),
  ('after', 'Foto del estado después de la corrección')
ON CONFLICT (name) DO NOTHING;

-- Tabla de items de checklist
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  criterion TEXT NOT NULL,
  subcriterion TEXT,
  details TEXT,
  position INTEGER DEFAULT 0
);

-- Tabla de inspecciones
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE,
  inspector_name TEXT NOT NULL,
  inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('en-progreso', 'completada', 'in_progress', 'completed')) DEFAULT 'en-progreso',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de hallazgos (findings)
CREATE TABLE IF NOT EXISTS findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  criterion_id UUID REFERENCES criteria(id) ON DELETE SET NULL,
  description TEXT,
  status TEXT CHECK (status IN ('conforme', 'no-conforme', 'pendiente', 'open', 'closed', 'in_progress')) NOT NULL,
  corrective_action TEXT,
  due_date TIMESTAMPTZ,
  closed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de fotos de hallazgos
CREATE TABLE IF NOT EXISTS finding_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID REFERENCES findings(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT CHECK (photo_type IN ('evidence', 'solution', 'before', 'after')) DEFAULT 'evidence',
  photo_type_id UUID REFERENCES photo_types(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_photos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Allow public access to areas" ON areas;
DROP POLICY IF EXISTS "Allow public access to checklists" ON checklists;
DROP POLICY IF EXISTS "Allow public access to categories" ON categories;
DROP POLICY IF EXISTS "Allow public access to subcategories" ON subcategories;
DROP POLICY IF EXISTS "Allow public access to criteria" ON criteria;
DROP POLICY IF EXISTS "Allow public access to inspectors" ON inspectors;
DROP POLICY IF EXISTS "Allow public access to photo_types" ON photo_types;
DROP POLICY IF EXISTS "Allow public access to checklist_items" ON checklist_items;
DROP POLICY IF EXISTS "Allow public access to inspections" ON inspections;
DROP POLICY IF EXISTS "Allow public access to findings" ON findings;
DROP POLICY IF EXISTS "Allow public access to finding_photos" ON finding_photos;

-- Políticas de acceso público (sin autenticación por ahora)
CREATE POLICY "Allow public access to areas" ON areas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to checklists" ON checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to subcategories" ON subcategories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to criteria" ON criteria FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to inspectors" ON inspectors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to photo_types" ON photo_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to checklist_items" ON checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to inspections" ON inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to findings" ON findings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to finding_photos" ON finding_photos FOR ALL USING (true) WITH CHECK (true);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_checklists_area_id ON checklists(area_id);
CREATE INDEX IF NOT EXISTS idx_categories_checklist_id ON categories(checklist_id, position);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id, position);
CREATE INDEX IF NOT EXISTS idx_criteria_subcategory_id ON criteria(subcategory_id, position);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_inspections_area_id ON inspections(area_id);
CREATE INDEX IF NOT EXISTS idx_inspections_checklist_id ON inspections(checklist_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(date DESC);
CREATE INDEX IF NOT EXISTS idx_findings_inspection_id ON findings(inspection_id);
CREATE INDEX IF NOT EXISTS idx_findings_criterion_id ON findings(criterion_id);
CREATE INDEX IF NOT EXISTS idx_finding_photos_finding_id ON finding_photos(finding_id);
CREATE INDEX IF NOT EXISTS idx_finding_photos_finding_photo_type ON finding_photos(finding_id, photo_type);
