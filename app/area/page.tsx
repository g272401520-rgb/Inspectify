"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Upload, FileSpreadsheet, Trash2, Edit2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAreasAction, getChecklistsByAreaAction, saveChecklistAction, deleteChecklistAction } from "@/lib/actions"
import type { Area, Checklist, ChecklistItem } from "@/lib/types"
import { parseExcelFile } from "@/lib/excel-parser"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { getHashParams, createLink } from "@/lib/navigation"

export default function AreaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [areaId, setAreaId] = useState<string>("")

  const [area, setArea] = useState<Area | null>(null)
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [showNewChecklistDialog, setShowNewChecklistDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [newChecklistName, setNewChecklistName] = useState("")
  const [manualItems, setManualItems] = useState("")
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const params = getHashParams()
      const id = params.areaId

      if (!id) {
        router.push("/")
        return
      }

      setAreaId(id)

      try {
        const areas = await getAreasAction()
        const foundArea = areas.find((a) => a.id === id)
        if (!foundArea) {
          router.push("/")
          return
        }
        setArea(foundArea)

        const checklistsData = await getChecklistsByAreaAction(id)
        setChecklists(checklistsData)
      } catch (error) {
        console.error("[v0] Error loading data:", error)
        router.push("/")
      }
    }

    loadData()
  }, [router])

  const handleCreateManualChecklist = async () => {
    if (!newChecklistName.trim() || !manualItems.trim()) return

    const lines = manualItems.split("\n").filter((line) => line.trim())
    const items: ChecklistItem[] = []

    lines.forEach((line, index) => {
      const parts = line.split("|").map((p) => p.trim())
      if (parts.length >= 3) {
        items.push({
          id: `item_${Date.now()}_${index}`,
          category: parts[0],
          subcategory: parts[1],
          criterion: parts[2],
        })
      }
    })

    if (items.length === 0) {
      toast({
        title: "Error",
        description: "No se encontraron ítems válidos. Usa el formato: Categoría | Subcategoría | Criterio",
        variant: "destructive",
      })
      return
    }

    const newChecklist: Checklist = {
      id: `checklist_${Date.now()}`,
      name: newChecklistName.trim(),
      areaId,
      items,
      createdAt: new Date().toISOString(),
      type: "manual",
    }

    try {
      await saveChecklistAction(newChecklist)
      const updatedChecklists = await getChecklistsByAreaAction(areaId)
      setChecklists(updatedChecklists)
      setNewChecklistName("")
      setManualItems("")
      setShowManualDialog(false)
      toast({
        title: "Checklist creado",
        description: `Se creó el checklist "${newChecklist.name}" con ${items.length} criterios`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el checklist",
        variant: "destructive",
      })
    }
  }

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const result = await parseExcelFile(file)

    if (!result.success || !result.items) {
      toast({
        title: "Error al importar",
        description: result.error || "No se pudo procesar el archivo",
        variant: "destructive",
      })
      return
    }

    const newChecklist: Checklist = {
      id: `checklist_${Date.now()}`,
      name: newChecklistName.trim() || file.name.replace(".xlsx", ""),
      areaId,
      items: result.items,
      createdAt: new Date().toISOString(),
      type: "excel",
    }

    saveChecklistAction(newChecklist)
    setChecklists(await getChecklistsByAreaAction(areaId))
    setNewChecklistName("")
    setShowImportDialog(false)
    toast({
      title: "Checklist importado",
      description: `Se importó el checklist con ${result.items.length} criterios`,
    })
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleConfirmImport = async () => {
    if (!selectedFile) return

    const result = await parseExcelFile(selectedFile)

    if (!result.success || !result.items) {
      toast({
        title: "Error al importar",
        description: result.error || "No se pudo procesar el archivo",
        variant: "destructive",
      })
      return
    }

    const newChecklist: Checklist = {
      id: `checklist_${Date.now()}`,
      name: newChecklistName.trim() || selectedFile.name.replace(".xlsx", ""),
      areaId,
      items: result.items,
      createdAt: new Date().toISOString(),
      type: "normal",
    }

    try {
      await saveChecklistAction(newChecklist)
      const updatedChecklists = await getChecklistsByAreaAction(areaId)
      setChecklists(updatedChecklists)
      setNewChecklistName("")
      setSelectedFile(null)
      setShowImportDialog(false)
      toast({
        title: "Checklist importado",
        description: `Se importó el checklist con ${result.items.length} criterios`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo importar el checklist",
        variant: "destructive",
      })
    }
  }

  const handleDeleteChecklist = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este checklist?")) {
      try {
        await deleteChecklistAction(id)
        const updatedChecklists = await getChecklistsByAreaAction(areaId)
        setChecklists(updatedChecklists)
        toast({
          title: "Checklist eliminado",
          description: "El checklist ha sido eliminado correctamente",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar el checklist",
          variant: "destructive",
        })
      }
    }
  }

  if (!area || !areaId) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-[#054078]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 bg-white text-[#054078] hover:bg-white/90">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{area.name}</h1>
              <p className="text-sm text-white/80">Gestión de Checklists</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Checklists Disponibles</h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                Selecciona un checklist para iniciar una inspección o crea uno nuevo
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href={createLink("/area/nuevo-checklist", { areaId })} className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Crear Manual</span>
                </Button>
              </Link>
              <Link href={createLink("/area/nuevo-registro", { areaId })} className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full sm:w-auto">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  <span>Crear Registros</span>
                </Button>
              </Link>
              <Button onClick={() => setShowImportDialog(true)} variant="outline" className="w-full sm:w-auto">
                <Upload className="h-4 w-4 mr-2" />
                <span>Importar Excel</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Checklists Grid */}
        {checklists.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4">
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay checklists creados</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md text-sm">
                Crea tu primer checklist manualmente o importa uno desde un archivo Excel con el formato: Categoría |
                Subcategoría | Criterio
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Link href={createLink("/area/nuevo-checklist", { areaId })} className="flex-1 sm:flex-none">
                  <Button variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Manual
                  </Button>
                </Link>
                <Link href={createLink("/area/nuevo-registro", { areaId })} className="flex-1 sm:flex-none">
                  <Button variant="outline" className="w-full">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Crear Registros
                  </Button>
                </Link>
                <Button onClick={() => setShowImportDialog(true)} variant="outline" className="w-full sm:w-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {checklists.map((checklist) => (
              <Card key={checklist.id} className="hover:border-primary transition-colors flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{checklist.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        {(checklist.items || []).length}{" "}
                        {checklist.type === "registro" ? "registros" : "criterios de inspección"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {checklist.type === "registro" && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded whitespace-nowrap">
                          Registro
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2 pt-2 border-t border-border">
                    <Link href={createLink("/area/editar-checklist", { areaId, checklistId: checklist.id })} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <Edit2 className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="hidden sm:inline text-xs">Editar</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteChecklist(checklist.id)}
                      className="flex-1 justify-start"
                    >
                      <Trash2 className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline text-xs">Eliminar</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-2">
                  <Link href={createLink("/inspeccion", { areaId, checklistId: checklist.id })} className="flex-1">
                    <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm">
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Inspección
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
