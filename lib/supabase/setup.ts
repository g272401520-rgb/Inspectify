import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export async function checkDatabaseSetup() {
  try {
    const supabase = await createClient()

    // Intentar obtener una fila de la tabla areas
    const { data, error } = await supabase.from("areas").select("id").limit(1)

    if (error) {
      // Si el error es que la tabla no existe, retornar false
      if (error.message.includes("relation") || error.message.includes("does not exist")) {
        return { setup: false, error: "Las tablas no existen" }
      }
      return { setup: false, error: error.message }
    }

    return { setup: true, error: null }
  } catch (error) {
    logger.error("Error checking database setup:", error)
    return { setup: false, error: "Error de conexión" }
  }
}

export async function setupDatabase() {
  try {
    const supabase = await createClient()

    // Leer el script SQL
    const sqlScript = `
-- Crear tablas principales
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  criterion TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  inspector_name TEXT NOT NULL,
  inspection_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  criterion TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('conforme', 'no_conforme', 'no_aplica')),
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finding_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT DEFAULT 'evidence' CHECK (photo_type IN ('evidence', 'solution', 'before', 'after')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_photos ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (sin autenticación)
CREATE POLICY "Allow public read access on areas" ON areas FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on areas" ON areas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on areas" ON areas FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on areas" ON areas FOR DELETE USING (true);

CREATE POLICY "Allow public read access on checklists" ON checklists FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on checklists" ON checklists FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on checklists" ON checklists FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on checklists" ON checklists FOR DELETE USING (true);

CREATE POLICY "Allow public read access on checklist_items" ON checklist_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on checklist_items" ON checklist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on checklist_items" ON checklist_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on checklist_items" ON checklist_items FOR DELETE USING (true);

CREATE POLICY "Allow public read access on inspections" ON inspections FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on inspections" ON inspections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on inspections" ON inspections FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on inspections" ON inspections FOR DELETE USING (true);

CREATE POLICY "Allow public read access on findings" ON findings FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on findings" ON findings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on findings" ON findings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on findings" ON findings FOR DELETE USING (true);

CREATE POLICY "Allow public read access on finding_photos" ON finding_photos FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on finding_photos" ON finding_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on finding_photos" ON finding_photos FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on finding_photos" ON finding_photos FOR DELETE USING (true);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_checklists_area_id ON checklists(area_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_inspections_area_id ON inspections(area_id);
CREATE INDEX IF NOT EXISTS idx_inspections_checklist_id ON inspections(checklist_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_findings_inspection_id ON findings(inspection_id);
CREATE INDEX IF NOT EXISTS idx_finding_photos_finding_id ON finding_photos(finding_id);
    `

    // Ejecutar el script SQL usando la función de Supabase
    const { error } = await supabase.rpc("exec_sql", { sql: sqlScript })

    if (error) {
      logger.error("Error executing SQL script:", error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    logger.error("Error setting up database:", error)
    return { success: false, error: "Error al configurar la base de datos" }
  }
}
