"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, Database } from "lucide-react"

export function SetupClient() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; error: string | null } | null>(null)

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
        // Redirigir después de 2 segundos
        setTimeout(() => {
          window.location.href = "/"
        }, 2000)
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
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
            <AlertTitle>Configuración Requerida</AlertTitle>
            <AlertDescription>
              La base de datos de Supabase necesita ser configurada antes de usar la aplicación. Este proceso creará
              todas las tablas necesarias y configurará los permisos.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="font-semibold">Se crearán las siguientes tablas:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>areas - Áreas de inspección</li>
              <li>checklists - Listas de verificación</li>
              <li>checklist_items - Criterios de evaluación</li>
              <li>inspections - Inspecciones realizadas</li>
              <li>findings - Hallazgos de inspección</li>
              <li>finding_photos - Fotos de evidencia</li>
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
                  <AlertTitle>Error en la Configuración</AlertTitle>
                  <AlertDescription>{result.error}</AlertDescription>
                </>
              )}
            </Alert>
          )}

          <Button onClick={handleSetup} disabled={isLoading || result?.success} className="w-full" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configurando Base de Datos...
              </>
            ) : result?.success ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Configuración Completada
              </>
            ) : (
              "Configurar Base de Datos"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
