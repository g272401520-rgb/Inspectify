"use client"

import { useState } from "react"
import { AlertCircle, Database, Loader2, CheckCircle2, XCircle, ExternalLink, Copy, Check } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const SQL_SCRIPT = `-- Create tables for Inspectify quality management system

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
DROP POLICY IF EXISTS "Allow public access to areas" ON areas;
CREATE POLICY "Allow public access to areas" ON areas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to checklists" ON checklists;
CREATE POLICY "Allow public access to checklists" ON checklists FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to checklist_items" ON checklist_items;
CREATE POLICY "Allow public access to checklist_items" ON checklist_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to inspections" ON inspections;
CREATE POLICY "Allow public access to inspections" ON inspections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to findings" ON findings;
CREATE POLICY "Allow public access to findings" ON findings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to finding_photos" ON finding_photos;
CREATE POLICY "Allow public access to finding_photos" ON finding_photos FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_checklists_area_id ON checklists(area_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_inspections_area_id ON inspections(area_id);
CREATE INDEX IF NOT EXISTS idx_inspections_checklist_id ON inspections(checklist_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(date DESC);
CREATE INDEX IF NOT EXISTS idx_findings_inspection_id ON findings(inspection_id);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
CREATE INDEX IF NOT EXISTS idx_finding_photos_finding_id ON finding_photos(finding_id);`

export function SetupPrompt() {
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{ success: boolean; error: string | null; needsManualSetup?: boolean } | null>(
    null,
  )

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCRIPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Error al copiar:", error)
    }
  }

  const handleOpenSQLEditor = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const projectRef = supabaseUrl.split("//")[1]?.split(".")[0]
      window.open(`https://supabase.com/dashboard/project/${projectRef}/sql/new`, "_blank")
    } else {
      window.open("https://supabase.com/dashboard", "_blank")
    }
  }

  const handleSetup = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/setup-database", {
        method: "POST",
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        setTimeout(() => {
          window.location.href = "/"
        }, 2000)
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        needsManualSetup: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Configuración de Base de Datos</CardTitle>
              <CardDescription>Configura las tablas de Supabase para Inspectify</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuración Requerida</AlertTitle>
            <AlertDescription>
              La base de datos de Supabase necesita ser configurada antes de usar la aplicación. Sigue estos pasos para
              crear las tablas necesarias.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold">Pasos para configurar:</h3>
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="min-w-[1.5rem]">1.</span>
                <div className="flex-1">
                  <p className="font-medium mb-2">Copia el script SQL</p>
                  <Button onClick={handleCopySQL} variant="outline" size="sm" className="w-full bg-transparent">
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        SQL Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar Script SQL
                      </>
                    )}
                  </Button>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="min-w-[1.5rem]">2.</span>
                <div className="flex-1">
                  <p className="font-medium mb-2">Abre el SQL Editor de Supabase</p>
                  <Button onClick={handleOpenSQLEditor} variant="outline" size="sm" className="w-full bg-transparent">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir SQL Editor
                  </Button>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="min-w-[1.5rem]">3.</span>
                <div className="flex-1">
                  <p className="font-medium">Pega el script SQL y ejecútalo</p>
                  <p className="text-muted-foreground mt-1">Haz clic en "Run" o presiona Ctrl+Enter</p>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="min-w-[1.5rem]">4.</span>
                <div className="flex-1">
                  <p className="font-medium">Verifica que las tablas se crearon</p>
                  <p className="text-muted-foreground mt-1">Deberías ver 6 tablas creadas exitosamente</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Tablas que se crearán:</h3>
            <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                areas
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                checklists
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                checklist_items
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                inspections
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                findings
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                finding_photos
              </li>
            </ul>
          </div>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Configuración Exitosa</AlertTitle>
                  <AlertDescription>
                    La base de datos ha sido configurada correctamente. Redirigiendo...
                  </AlertDescription>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Verificación Pendiente</AlertTitle>
                  <AlertDescription className="text-sm whitespace-pre-line">{result.error}</AlertDescription>
                </>
              )}
            </Alert>
          )}

          <div className="space-y-2">
            <Button onClick={handleSetup} disabled={isLoading || result?.success} className="w-full" size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando Base de Datos...
                </>
              ) : result?.success ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Configuración Completada
                </>
              ) : (
                "Ya ejecuté el script, verificar ahora"
              )}
            </Button>

            {result?.needsManualSetup && (
              <p className="text-xs text-center text-muted-foreground">
                Después de ejecutar el script SQL, haz clic en el botón de arriba
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
