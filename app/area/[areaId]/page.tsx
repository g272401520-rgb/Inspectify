"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Plus, Upload, FileSpreadsheet, Trash2, Edit2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getAreasAction, getChecklistsByAreaAction, saveChecklistAction, deleteChecklistAction } from "@/lib/actions"
import type { Area, Checklist, ChecklistItem } from "@/lib/types"
import { parseExcelFile } from "@/lib/excel-parser"
import type { ValidationError } from "@/lib/excel-parser"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/page-header"

export default function AreaPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const areaId = params.areaId as string

  const [area, setArea] = useState<Area | null>(null)
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [showNewChecklistDialog, setShowNewChecklistDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [newChecklistName, setNewChecklistName] = useState("")
  const [manualItems, setManualItems] = useState("")
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sortBy, setSortBy] = useState<"name" | "date" | "items">("name")
  const [isImporting, setIsImporting] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    items: ChecklistItem[]
    errors: ValidationError[]
    warnings: string[]
    stats: any
  } | null>(null)
  const [showValidationDialog, setShowValidationDialog] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const areas = await getAreasAction()
        const foundArea = areas.find((a) => a.id === areaId)
        if (!foundArea) {
          router.push("/")
          return
        }
        setArea(foundArea)
        const loadedChecklists = await getChecklistsByAreaAction(areaId)
        setChecklists(loadedChecklists)
      } catch (error) {
        console.error("Error loading area data:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar los datos del área",
          variant: "destructive",
        })
      }
    }
    loadData()
  }, [areaId, router, toast])

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
        description: "No se encontraron ítems válidos. Usa el formato: Categoría | Criterio | Detalles",
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
      console.error("Error creating checklist:", error)
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
      console.error("Error importing checklist:", error)
      toast({
        title: "Error",
        description: "No se pudo importar el checklist",
        variant: "destructive",
      })
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    const result = await parseExcelFile(file)

    if (!result.success) {
      toast({
        title: "Error al validar archivo",
        description: result.error || "No se pudo procesar el archivo",
        variant: "destructive",
      })
      setValidationResult(null)
      return
    }

    if (result.items && result.validationErrors && result.warnings && result.stats) {
      setValidationResult({
        items: result.items,
        errors: result.validationErrors,
        warnings: result.warnings,
        stats: result.stats,
      })
      setShowValidationDialog(true)
    }
  }

  const handleConfirmImport = async () => {
    if (!selectedFile || !validationResult) return

    setIsImporting(true)

    const newChecklist: Checklist = {
      id: `checklist_${Date.now()}`,
      name: newChecklistName.trim() || selectedFile.name.replace(".xlsx", ""),
      areaId,
      items: validationResult.items,
      createdAt: new Date().toISOString(),
      type: "normal",
    }

    try {
      await saveChecklistAction(newChecklist)
      const updatedChecklists = await getChecklistsByAreaAction(areaId)
      setChecklists(updatedChecklists)
      setNewChecklistName("")
      setSelectedFile(null)
      setValidationResult(null)
      setShowImportDialog(false)
      setShowValidationDialog(false)
      toast({
        title: "Checklist importado",
        description: `Se importó el checklist con ${validationResult.items.length} criterios`,
      })
    } catch (error) {
      console.error("Error importing checklist:", error)
      toast({
        title: "Error",
        description: "No se pudo importar el checklist",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
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
        console.error("Error deleting checklist:", error)
        toast({
          title: "Error",
          description: "No se pudo eliminar el checklist",
          variant: "destructive",
        })
      }
    }
  }

  const handleStartInspection = (id: string) => {
    router.push(`/inspeccion/${areaId}/${id}`)
  }

  const handleImport = () => {
    handleConfirmImport()
  }

  const getSortedChecklists = () => {
    const sorted = [...checklists]
    switch (sortBy) {
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case "date":
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case "items":
        return sorted.sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0))
      default:
        return sorted
    }
  }

  if (!area) return null

  return (
    <div className="min-h-screen bg-background">
      <PageHeader variant="title" title={area.name} subtitle="Gestión de Checklists" backHref="/" />

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col gap-4">
            <div className="min-w-0">{/* El título y subtítulo ahora están en PageHeader */}</div>
            {checklists.length > 0 && (
              <div className="flex justify-end">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "date" | "items")}
                  className="h-7 px-1 rounded border-0 bg-transparent text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors focus:outline-none focus:ring-0 cursor-pointer appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.1rem center",
                    backgroundSize: "10px",
                    paddingRight: "1.2rem",
                  }}
                >
                  <option value="name">Por Nombre</option>
                  <option value="date">Por Fecha</option>
                  <option value="items">Por Cantidad</option>
                </select>
              </div>
            )}
            <div className="flex flex-col gap-3 w-full">
              <Button
                onClick={() => router.push(`/area/${areaId}/nuevo-checklist`)}
                size="lg"
                variant="outline"
                className="w-full border border-foreground/10 hover:border-[#054078]/30 hover:bg-[#054078]/12 text-foreground transition-all"
              >
                <Plus className="mr-2 h-5 w-5 text-foreground" />
                Crear Checklist
              </Button>
              <Button
                onClick={() => router.push(`/area/${areaId}/nuevo-registro`)}
                size="lg"
                variant="outline"
                className="w-full border border-foreground/10 hover:border-[#054078]/30 hover:bg-[#054078]/12 text-foreground transition-all"
              >
                <FileSpreadsheet className="mr-2 h-5 w-5 text-foreground" />
                Crear Checklist de Registro
              </Button>
              <Button
                onClick={() => setShowImportDialog(true)}
                size="lg"
                variant="outline"
                className="w-full border border-foreground/10 hover:border-[#054078]/30 hover:bg-[#054078]/12 text-foreground transition-all"
              >
                <Upload className="mr-2 h-5 w-5 text-foreground" />
                Importar desde Excel
              </Button>
            </div>
          </div>
        </div>

        {checklists.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 md:py-16 px-4">
              <FileSpreadsheet className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-4 flex-shrink-0" />
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 text-center">
                No hay checklists creados
              </h3>
              <p className="text-sm md:text-base text-muted-foreground mb-6 text-center max-w-md">
                Crea tu primer checklist manualmente o importa uno desde un archivo Excel con el formato: Categoría |
                Criterio | Detalles
              </p>
              <div className="flex flex-col gap-3 w-full max-w-sm">
                <Button
                  onClick={() => router.push(`/area/${areaId}/nuevo-checklist`)}
                  size="lg"
                  variant="outline"
                  className="w-full border border-foreground/10 hover:border-[#054078]/30 hover:bg-[#054078]/12 text-foreground transition-all"
                >
                  <Plus className="mr-2 h-5 w-5 text-foreground" />
                  Crear Checklist
                </Button>
                <Button
                  onClick={() => router.push(`/area/${areaId}/nuevo-registro`)}
                  size="lg"
                  variant="outline"
                  className="w-full border border-foreground/10 hover:border-[#054078]/30 hover:bg-[#054078]/12 text-foreground transition-all"
                >
                  <FileSpreadsheet className="mr-2 h-5 w-5 text-foreground" />
                  Crear Checklist de Registro
                </Button>
                <Button
                  onClick={() => setShowImportDialog(true)}
                  size="lg"
                  variant="outline"
                  className="w-full border border-foreground/10 hover:border-[#054078]/30 hover:bg-[#054078]/12 text-foreground transition-all"
                >
                  <Upload className="mr-2 h-5 w-5 text-foreground" />
                  Importar desde Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {getSortedChecklists().map((checklist) => (
              <Card key={checklist.id} className="group hover:border-primary transition-colors relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-base md:text-lg truncate min-w-0 flex-1">{checklist.name}</CardTitle>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {checklist.type === "registro" && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded whitespace-nowrap">
                          Registro
                        </span>
                      )}
                      <Link href={`/area/${areaId}/editar/${checklist.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteChecklist(checklist.id)}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs md:text-sm">
                    {(checklist.items || []).length}{" "}
                    {checklist.type === "registro" ? "registros" : "criterios de inspección"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={() => handleStartInspection(checklist.id)}
                    className="w-full bg-[#054078]/65 hover:bg-[#054078]/75 text-white"
                    size="lg"
                    variant={null}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar Inspección
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl mx-4">
          <DialogHeader>
            <DialogTitle>Crear Checklist Manual</DialogTitle>
            <DialogDescription>
              Ingresa los criterios de inspección en formato: Categoría | Criterio | Detalles (uno por línea)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="checklist-name">Nombre del Checklist</Label>
              <Input
                id="checklist-name"
                value={newChecklistName}
                onChange={(e) => setNewChecklistName(e.target.value)}
                placeholder="Ej: BPM, ISO 9001, Orden y Limpieza"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="checklist-items">Criterios de Inspección</Label>
              <Textarea
                id="checklist-items"
                value={manualItems}
                onChange={(e) => setManualItems(e.target.value)}
                placeholder="Infraestructura | Pisos | Los pisos están limpios y sin grietas&#10;Infraestructura | Paredes | Las paredes están pintadas y limpias&#10;Equipos | Mantenimiento | Los equipos tienen registro de mantenimiento"
                className="mt-2 min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Formato: Categoría | Criterio | Detalles (separados por |)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateManualChecklist} disabled={!newChecklistName.trim() || !manualItems.trim()}>
              Crear Checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Importar Checklist desde Excel</DialogTitle>
            <DialogDescription>
              Selecciona un archivo Excel (.xlsx, .csv) con el formato: Categoría | Criterio | Detalles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="import-name">Nombre del Checklist (opcional)</Label>
              <Input
                id="import-name"
                value={newChecklistName}
                onChange={(e) => setNewChecklistName(e.target.value)}
                placeholder="Se usará el nombre del archivo si se deja vacío"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="excel-file">Archivo Excel</Label>
              <Input id="excel-file" type="file" accept=".xlsx,.csv" onChange={handleFileSelect} className="mt-2" />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">Archivo seleccionado: {selectedFile.name}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                El archivo debe tener 3 columnas: Categoría, Criterio, Detalles
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false)
                setSelectedFile(null)
                setNewChecklistName("")
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !selectedFile}
              variant="outline"
              className="border border-foreground/10 hover:border-[#054078]/30 hover:bg-[#054078]/12 text-foreground bg-transparent transition-all"
            >
              {isImporting ? "Importando..." : "Confirmar Importación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl mx-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Validación de Datos</DialogTitle>
            <DialogDescription>Revisa los resultados de la validación antes de importar</DialogDescription>
          </DialogHeader>

          {validationResult && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{validationResult.stats.totalRows}</div>
                  <div className="text-xs text-blue-600">Filas totales</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{validationResult.stats.validRows}</div>
                  <div className="text-xs text-green-600">Filas válidas</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">{validationResult.stats.emptyRows}</div>
                  <div className="text-xs text-yellow-600">Filas vacías</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-orange-700">{validationResult.stats.duplicates}</div>
                  <div className="text-xs text-orange-600">Duplicados</div>
                </div>
              </div>

              {validationResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">Advertencias</h4>
                  <ul className="space-y-1">
                    {validationResult.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-yellow-700">
                        • {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <h4 className="font-semibold text-red-800 mb-2">
                    Errores encontrados ({validationResult.errors.length})
                  </h4>
                  <div className="space-y-2">
                    {validationResult.errors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium text-red-700">Fila {error.row}</span>
                        <span className="text-red-600"> - {error.field}: </span>
                        <span className="text-red-800">{error.message}</span>
                      </div>
                    ))}
                    {validationResult.errors.length > 10 && (
                      <p className="text-sm text-red-600 italic">
                        ... y {validationResult.errors.length - 10} error(es) más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {validationResult.items.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-3">
                    Vista previa ({validationResult.items.length} criterios válidos)
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {validationResult.items.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="text-sm bg-muted/50 p-2 rounded">
                        <div className="font-medium text-foreground">{item.category}</div>
                        <div className="text-muted-foreground">{item.criterion}</div>
                        {item.subcategory && (
                          <div className="text-xs text-muted-foreground italic">{item.subcategory}</div>
                        )}
                      </div>
                    ))}
                    {validationResult.items.length > 5 && (
                      <p className="text-sm text-muted-foreground italic text-center">
                        ... y {validationResult.items.length - 5} criterio(s) más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowValidationDialog(false)
                setShowImportDialog(false)
                setSelectedFile(null)
                setValidationResult(null)
                setNewChecklistName("")
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!validationResult || validationResult.items.length === 0 || isImporting}
              className="bg-[#054078]/70 hover:bg-[#054078]/80 text-white"
            >
              {isImporting ? "Importando..." : `Importar ${validationResult?.items.length || 0} Criterios`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
