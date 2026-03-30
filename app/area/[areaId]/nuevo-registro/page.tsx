"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileSpreadsheet, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveChecklistAction } from "@/lib/actions"
import type { Checklist, ChecklistItem } from "@/lib/types"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function NuevoRegistroPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const areaId = params.areaId as string

  const [checklistName, setChecklistName] = useState("")
  const [registrosText, setRegistrosText] = useState("")

  const handleSave = async () => {
    if (!checklistName.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar un nombre para el checklist",
        variant: "destructive",
      })
      return
    }

    const registrosArray = registrosText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (registrosArray.length === 0) {
      toast({
        title: "Error",
        description: "Debes agregar al menos un registro",
        variant: "destructive",
      })
      return
    }

    const items: ChecklistItem[] = registrosArray.map((registro, index) => ({
      id: `item_${Date.now()}_${index}`,
      category: "Registros",
      subcategory: "Documentos",
      criterion: registro,
    }))

    const newChecklist: Checklist = {
      id: `checklist_${Date.now()}`,
      name: checklistName.trim(),
      areaId: params.areaId,
      type: "registro",
      items,
      createdAt: new Date().toISOString(),
    }

    try {
      await saveChecklistAction(newChecklist)
      toast({
        title: "Checklist de registros creado",
        description: `Se creó el checklist "${newChecklist.name}" con ${items.length} registros`,
      })
      router.push(`/area/${params.areaId}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el checklist",
        variant: "destructive",
      })
    }
  }

  const registrosCount = registrosText.split("\n").filter((line) => line.trim().length > 0).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-[#054078]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/area/${areaId}`}>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 bg-white text-[#054078] hover:bg-white/90">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Crear Checklist de Registros</h1>
              <p className="text-sm text-white/80">Agrega registros para inspeccionar</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Información del Checklist
            </CardTitle>
            <CardDescription>
              Ingresa el nombre del checklist y agrega los registros que deseas inspeccionar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nombre del Checklist */}
            <div className="space-y-2">
              <Label htmlFor="checklist-name">Nombre del Checklist</Label>
              <Input
                id="checklist-name"
                value={checklistName}
                onChange={(e) => setChecklistName(e.target.value)}
                placeholder="Ej: Registros de Calidad, Documentos Técnicos, etc."
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="registros-text">Registros a Inspeccionar</Label>
                <span className="text-sm text-muted-foreground">
                  {registrosCount} {registrosCount === 1 ? "registro" : "registros"}
                </span>
              </div>
              <Textarea
                id="registros-text"
                value={registrosText}
                onChange={(e) => setRegistrosText(e.target.value)}
                placeholder="Escribe cada registro en una línea nueva:&#10;Manual de Calidad&#10;Procedimiento de Limpieza&#10;Registro de Capacitaciones&#10;Certificado de Calibración&#10;Plan de Mantenimiento"
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-semibold mb-1">Instrucciones:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Escribe cada registro en una línea nueva</li>
                    <li>Puedes copiar y pegar una lista desde Excel o Word</li>
                    <li>Las líneas vacías serán ignoradas automáticamente</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Crear Checklist de Registros
              </Button>
              <Link href={`/area/${areaId}`} className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  Cancelar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Información Adicional */}
        <Card className="mt-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Sobre los Checklists de Registros</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Los registros solo se evalúan como "Conforme" o "No Conforme"</li>
              <li>• Ideal para inspeccionar documentos, certificados y registros</li>
              <li>• Genera informes con tabla de cumplimiento de registros</li>
              <li>• Aparece en el consolidado con su porcentaje de conformidad</li>
              <li>• Puedes descargar las evidencias fotográficas en formato ZIP</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
