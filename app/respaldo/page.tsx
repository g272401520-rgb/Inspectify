"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Upload, Database, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { exportDatabase, importDatabase } from "@/lib/actions"
import Link from "next/link"

export default function RespaldoPage() {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleExport = async () => {
    try {
      setExporting(true)
      setMessage(null)

      const result = await exportDatabase()

      if (!result.success || !result.data) {
        throw new Error(result.error || "Error al exportar")
      }

      // Crear archivo JSON para descargar
      const dataStr = JSON.stringify(result.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `inspectify-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setMessage({ type: "success", text: "Base de datos exportada exitosamente" })
    } catch (error) {
      console.error("Error al exportar:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Error al exportar la base de datos",
      })
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      setMessage(null)

      const text = await file.text()
      const data = JSON.parse(text)

      const result = await importDatabase(data)

      if (!result.success) {
        throw new Error(result.error || "Error al importar")
      }

      setMessage({ type: "success", text: "Base de datos importada exitosamente" })

      // Recargar la página después de 2 segundos
      setTimeout(() => {
        window.location.href = "/"
      }, 2000)
    } catch (error) {
      console.error("Error al importar:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Error al importar la base de datos",
      })
    } finally {
      setImporting(false)
      // Limpiar el input
      event.target.value = ""
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Respaldo y Restauración</h1>
        <p className="text-muted-foreground">Gestiona los respaldos de tu base de datos de inspecciones</p>
      </div>

      {message && (
        <Alert className="mb-6" variant={message.type === "error" ? "destructive" : "default"}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Base de Datos
            </CardTitle>
            <CardDescription>
              Descarga un respaldo completo de todas las áreas, checklists e inspecciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={exporting} className="w-full">
              {exporting ? (
                <>
                  <Database className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Datos
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Base de Datos
            </CardTitle>
            <CardDescription>
              Restaura un respaldo desde un archivo JSON. Esto reemplazará todos los datos actuales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label htmlFor="import-file">
              <Button disabled={importing} className="w-full" asChild>
                <span>
                  {importing ? (
                    <>
                      <Database className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Seleccionar Archivo
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Información Importante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• El archivo de exportación incluye todas las áreas, checklists, inspecciones y hallazgos.</p>
          <p>• Al importar, se eliminarán todos los datos actuales y se reemplazarán con los del archivo.</p>
          <p>• Las fotos de los hallazgos se mantienen en el almacenamiento de Blob y no se incluyen en el respaldo.</p>
          <p>• Se recomienda hacer respaldos periódicos de tu información.</p>
        </CardContent>
      </Card>
    </div>
  )
}
