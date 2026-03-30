"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, X, GripVertical, ChevronDown, ChevronUp, Trash2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getChecklistByIdAction, saveChecklistAction } from "@/lib/actions"
import type { Checklist, ChecklistItem } from "@/lib/types"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { LoadingScreen } from "@/components/loading-screen"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Category {
  id: string
  name: string
  criteria: Criterion[]
  isExpanded: boolean
}

interface Criterion {
  id: string
  name: string
  details?: string
}

function SortableCategory({
  category,
  index,
  onToggle,
  onUpdateName,
  onDelete,
  onAddCriterion,
  onRemoveCriterion,
  onUpdateCriterion,
  onToggleCriterionDetails,
}: {
  category: Category
  index: number
  onToggle: () => void
  onUpdateName: (name: string) => void
  onDelete: () => void
  onAddCriterion: () => void
  onRemoveCriterion: (criterionId: string) => void
  onUpdateCriterion: (criterionId: string, field: "name" | "details", value: string) => void
  onToggleCriterionDetails: (criterionId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card ref={setNodeRef} style={style} className="bg-background border-2">
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="flex items-center gap-2 text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="cursor-pointer flex-1" onClick={onToggle}>
            <div className="flex items-center gap-2">
              {category.isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground">Categoría {index + 1}</span>
                  <Badge variant="secondary" className="text-xs">
                    {category.criteria.length} {category.criteria.length === 1 ? "criterio" : "criterios"}
                  </Badge>
                </div>
                {category.name && <p className="text-sm text-foreground font-medium truncate">{category.name}</p>}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {category.isExpanded && (
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nombre de la Categoría:</Label>
            <div className="flex items-center gap-2">
              <Input
                value={category.name}
                onChange={(e) => onUpdateName(e.target.value)}
                placeholder="Ej: Documentación, Equipos, etc."
                className="flex-1 h-12 text-base"
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                variant="ghost"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="h-12 w-12 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="pl-0 md:pl-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Label className="text-sm font-medium">Criterios:</Label>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onAddCriterion()
                }}
                size="lg"
                className="w-full sm:w-auto h-11 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Criterio
              </Button>
            </div>

            {category.criteria.map((crit, critIndex) => (
              <div key={crit.id} className="space-y-2 p-3 rounded-lg border border-border">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 pt-3">
                    <Badge variant="outline" className="text-xs">
                      {critIndex + 1}
                    </Badge>
                  </div>
                  <Input
                    value={crit.name}
                    onChange={(e) => onUpdateCriterion(crit.id, "name", e.target.value)}
                    placeholder="Nombre del criterio"
                    className="flex-1 bg-background h-12 text-base"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveCriterion(crit.id)
                    }}
                    className="h-12 w-12 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {crit.details !== undefined ? (
                  <div className="pl-0 md:pl-10 space-y-2">
                    <Textarea
                      value={crit.details || ""}
                      onChange={(e) => onUpdateCriterion(crit.id, "details", e.target.value)}
                      placeholder="Detalles adicionales (opcional)"
                      className="min-h-[80px] bg-background text-base"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      variant="link"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleCriterionDetails(crit.id)
                      }}
                      className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Quitar detalle
                    </Button>
                  </div>
                ) : (
                  <div className="pl-0 md:pl-10">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleCriterionDetails(crit.id)
                      }}
                      className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                    >
                      + Agregar detalle
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {category.criteria.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">No hay criterios en esta categoría</p>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddCriterion()
                  }}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primer Criterio
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default function EditChecklistPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const areaId = params.areaId as string
  const checklistId = params.checklistId as string

  const [checklistName, setChecklistName] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; categoryId: string | null }>({
    open: false,
    categoryId: null,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    const loadChecklist = async () => {
      try {
        const checklist = await getChecklistByIdAction(checklistId)
        if (!checklist) {
          router.push(`/area/${areaId}`)
          return
        }

        setChecklistName(checklist.name)

        const categoryMap = new Map<string, Category>()

        checklist.items.forEach((item) => {
          if (!categoryMap.has(item.category)) {
            categoryMap.set(item.category, {
              id: `cat_${Date.now()}_${Math.random()}`,
              name: item.category,
              criteria: [],
              isExpanded: true,
            })
          }

          const category = categoryMap.get(item.category)!
          category.criteria.push({
            id: item.id,
            name: item.criterion,
            details: item.details,
          })
        })

        setCategories(Array.from(categoryMap.values()))
        setLoading(false)
      } catch (error) {
        console.error("[v0] Error loading checklist:", error)
        router.push(`/area/${areaId}`)
      }
    }

    loadChecklist()
  }, [checklistId, areaId, router])

  const handleAddCategory = () => {
    setCategories([
      ...categories,
      {
        id: `cat_${Date.now()}`,
        name: "",
        criteria: [],
        isExpanded: true,
      },
    ])
  }

  const handleRemoveCategory = (categoryId: string) => {
    setCategories(categories.filter((cat) => cat.id !== categoryId))
    setDeleteDialog({ open: false, categoryId: null })
    toast({
      title: "Categoría eliminada",
      description: "La categoría ha sido eliminada correctamente",
    })
  }

  const handleUpdateCategoryName = (categoryId: string, name: string) => {
    setCategories(categories.map((cat) => (cat.id === categoryId ? { ...cat, name } : cat)))
  }

  const handleToggleCategory = (categoryId: string) => {
    setCategories(categories.map((cat) => (cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat)))
  }

  const handleAddCriterion = (categoryId: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              criteria: [
                ...cat.criteria,
                {
                  id: `crit_${Date.now()}`,
                  name: "",
                  details: "",
                },
              ],
            }
          : cat,
      ),
    )
  }

  const handleRemoveCriterion = (categoryId: string, criterionId: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              criteria: cat.criteria.filter((crit) => crit.id !== criterionId),
            }
          : cat,
      ),
    )
  }

  const handleUpdateCriterion = (categoryId: string, criterionId: string, field: "name" | "details", value: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              criteria: cat.criteria.map((crit) => (crit.id === criterionId ? { ...crit, [field]: value } : crit)),
            }
          : cat,
      ),
    )
  }

  const handleToggleCriterionDetails = (categoryId: string, criterionId: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              criteria: cat.criteria.map((crit) =>
                crit.id === criterionId ? { ...crit, details: crit.details === undefined ? "" : undefined } : crit,
              ),
            }
          : cat,
      ),
    )
  }

  const handleSave = async () => {
    if (!checklistName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del checklist es requerido",
        variant: "destructive",
      })
      return
    }

    const validCategories = categories.filter((cat) => cat.name.trim() && cat.criteria.some((crit) => crit.name.trim()))

    if (validCategories.length === 0) {
      toast({
        title: "Error",
        description: "Debes agregar al menos una categoría con criterios",
        variant: "destructive",
      })
      return
    }

    const items: ChecklistItem[] = []
    validCategories.forEach((category) => {
      category.criteria
        .filter((crit) => crit.name.trim())
        .forEach((crit) => {
          items.push({
            id: crit.id,
            category: category.name.trim(),
            criterion: crit.name.trim(),
            details: crit.details?.trim() || undefined,
          })
        })
    })

    const updatedChecklist: Checklist = {
      id: checklistId,
      name: checklistName.trim(),
      areaId,
      items,
      createdAt: new Date().toISOString(),
    }

    try {
      await saveChecklistAction(updatedChecklist)
      toast({
        title: "Checklist actualizado",
        description: `Se actualizó el checklist con ${items.length} criterios`,
      })
      router.push(`/area/${areaId}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el checklist",
        variant: "destructive",
      })
    }
  }

  const handleExportToExcel = () => {
    if (!checklistName.trim() || categories.length === 0) {
      toast({
        title: "Error",
        description: "No hay datos para exportar",
        variant: "destructive",
      })
      return
    }

    let csvContent = "Categoría,Criterio,Detalles\n"

    categories.forEach((category) => {
      category.criteria.forEach((crit) => {
        const row = [category.name.trim(), crit.name.trim(), crit.details?.trim() || ""]
          .map((field) => `"${field.replace(/"/g, '""')}"`)
          .join(",")
        csvContent += row + "\n"
      })
    })

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${checklistName.trim()}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Checklist exportado",
      description: "El archivo se ha descargado correctamente",
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })

      toast({
        title: "Orden actualizado",
        description: "Las categorías han sido reordenadas",
      })
    }
  }

  if (loading) {
    return <LoadingScreen message="Cargando checklist..." />
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 border-b border-border bg-[#054078] shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/area/${areaId}`}>
              <Button variant="ghost" size="lg" className="h-12 w-12 p-0 bg-white text-[#054078] hover:bg-white/90">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-white">Editar Checklist</h1>
              <p className="text-xs md:text-sm text-white/80">Modifica los criterios de inspección</p>
            </div>
            <Button
              onClick={handleExportToExcel}
              variant="ghost"
              size="lg"
              className="h-12 px-4 text-white hover:bg-white/10"
            >
              <Download className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Card className="bg-accent/20">
          <CardContent className="p-4 md:p-6 space-y-6">
            <div>
              <Label className="text-sm font-medium mb-2 block">Nombre del Checklist</Label>
              <Input
                value={checklistName}
                onChange={(e) => setChecklistName(e.target.value)}
                placeholder="Ej: Inspección de Seguridad"
                className="text-base md:text-lg font-medium h-12 md:h-14"
              />
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Categorías</h2>
                  <p className="text-xs text-muted-foreground">
                    {categories.length} {categories.length === 1 ? "categoría" : "categorías"}
                  </p>
                </div>
                <Button onClick={handleAddCategory} size="lg" className="w-full sm:w-auto h-12">
                  <Plus className="mr-2 h-5 w-5" />
                  Añadir Categoría
                </Button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {categories.map((category, index) => (
                      <SortableCategory
                        key={category.id}
                        category={category}
                        index={index}
                        onToggle={() => handleToggleCategory(category.id)}
                        onUpdateName={(name) => handleUpdateCategoryName(category.id, name)}
                        onDelete={() => setDeleteDialog({ open: true, categoryId: category.id })}
                        onAddCriterion={() => handleAddCriterion(category.id)}
                        onRemoveCriterion={(criterionId) => handleRemoveCriterion(category.id, criterionId)}
                        onUpdateCriterion={(criterionId, field, value) =>
                          handleUpdateCriterion(category.id, criterionId, field, value)
                        }
                        onToggleCriterionDetails={(criterionId) =>
                          handleToggleCriterionDetails(category.id, criterionId)
                        }
                      />
                    ))}

                    {categories.length === 0 && (
                      <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                          <p className="text-muted-foreground mb-4 text-center">
                            No hay categorías agregadas
                            <br />
                            <span className="text-sm">Comienza agregando tu primera categoría</span>
                          </p>
                          <Button onClick={handleAddCategory} size="lg" className="h-12">
                            <Plus className="mr-2 h-5 w-5" />
                            Agregar Primera Categoría
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handleSave} size="lg" className="w-full sm:flex-1 h-12 bg-green-600 hover:bg-green-700">
                Actualizar Checklist
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push(`/area/${areaId}`)}
                className="w-full sm:w-auto h-12"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, categoryId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la categoría y todos sus criterios. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.categoryId && handleRemoveCategory(deleteDialog.categoryId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
