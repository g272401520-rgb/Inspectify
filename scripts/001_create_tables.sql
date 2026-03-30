-- Create tables for Inspectify CG quality management system

-- Areas table
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  responsible TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklists table
CREATE TABLE IF NOT EXISTS checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('normal', 'registro', 'manual', 'excel')) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist items table
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  criterion TEXT NOT NULL,
  subcriterion TEXT,
  details TEXT,
  position INTEGER DEFAULT 0
);

-- Inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE,
  inspector_name TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('en-progreso', 'completada', 'in_progress', 'completed')) DEFAULT 'en-progreso',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Findings table
CREATE TABLE IF NOT EXISTS findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('conforme', 'no-conforme', 'pendiente', 'open', 'closed', 'in_progress')) NOT NULL,
  tracking_status TEXT CHECK (tracking_status IN ('pendiente', 'en-proceso', 'resuelto')) DEFAULT 'pendiente',
  corrective_action TEXT,
  due_date TIMESTAMPTZ,
  closed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finding photos table
CREATE TABLE IF NOT EXISTS finding_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID REFERENCES findings(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT CHECK (photo_type IN ('evidence', 'solution', 'before', 'after')) DEFAULT 'evidence',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
-- This allows the app to work without user authentication

-- Areas policies
DROP POLICY IF EXISTS "Allow public access to areas" ON areas;
CREATE POLICY "Allow public access to areas" 
  ON areas FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Checklists policies
DROP POLICY IF EXISTS "Allow public access to checklists" ON checklists;
CREATE POLICY "Allow public access to checklists" 
  ON checklists FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Checklist items policies
DROP POLICY IF EXISTS "Allow public access to checklist_items" ON checklist_items;
CREATE POLICY "Allow public access to checklist_items" 
  ON checklist_items FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Inspections policies
DROP POLICY IF EXISTS "Allow public access to inspections" ON inspections;
CREATE POLICY "Allow public access to inspections" 
  ON inspections FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Findings policies
DROP POLICY IF EXISTS "Allow public access to findings" ON findings;
CREATE POLICY "Allow public access to findings" 
  ON findings FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Finding photos policies
DROP POLICY IF EXISTS "Allow public access to finding_photos" ON finding_photos;
CREATE POLICY "Allow public access to finding_photos" 
  ON finding_photos FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_checklists_area_id ON checklists(area_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_inspections_area_id ON inspections(area_id);
CREATE INDEX IF NOT EXISTS idx_inspections_checklist_id ON inspections(checklist_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(date DESC);
CREATE INDEX IF NOT EXISTS idx_findings_inspection_id ON findings(inspection_id);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
CREATE INDEX IF NOT EXISTS idx_finding_photos_finding_id ON finding_photos(finding_id);
