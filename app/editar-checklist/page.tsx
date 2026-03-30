"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus, X, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getChecklistByIdAction, saveChecklistAction } from "@/lib/actions"
import type { Checklist, ChecklistItem } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { navigateTo, getHashParam } from "@/lib/navigation"
import { LoadingScreen } from "@/components/loading-screen"
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
  subcriteria: Subcriteria[]
}

interface Subcriteria {
  id: string
  name: string
  details?: string
}

function SortableCategory({
  category,
  onUpdateName,
  onRemove,
  onAddSubcriteria,
  onRemoveSubcriteria,
  onUpdateSubcriteria,
  onToggleDetails,
}: {
  category: Category
  onUpdateName: (name: string) => void
  onRemove: () => void
  onAddSubcriteria: () => void
  onRemoveSubcriteria: (subcriteriaId: string) => void
  onUpdateSubcriteria: (subcriteriaId: string, field: "name" | "details", value: string) => void
  onToggleDetails: (subcriteriaId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card ref={setNodeRef} style={style} className="bg-background">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <Input
            value={category.name}
            onChange={(e) => onUpdateName(e.target.value)}
            placeholder="Nombre de la categoría (ej: Documentación)"
            className="flex-1"
          />
          <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="pl-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Criterios:</Label>
            <Button
              onClick={onAddSubcriteria}
              size="sm"
              variant="outline"
              className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white border-green-600"
            >
              <Plus className="mr-1 h-3 w-3" />
              Agregar Criterio
            </Button>
          </div>

          {category.subcriteria.map((sub) => (
            <div key={sub.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={sub.name}
                  onChange={(e) => onUpdateSubcriteria(sub.id, "name", e.target.value)}
                  placeholder="Nombre del criterio"
                  className="flex-1 bg-background"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveSubcriteria(sub.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {sub.details !== undefined ? (
                <div className="pl-4 space-y-2">
                  <Textarea
                    value={sub.details}
                    onChange={(e) => onUpdateSubcriteria(sub.id, "details", e.target.value)}
                    placeholder="Detalles adicionales (opcional)"
                    className="min-h-[60px] bg-background"
                  />
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onToggleDetails(sub.id)}
                    className="h-auto p-0 text-xs text-muted-foreground"
                  >
                    Quitar detalle
                  </Button>
                </div>
              ) : (
                <div className="pl-4">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onToggleDetails(sub.id)}
                    className="h-auto p-0 text-xs text-primary"
                  >
                    + Agregar detalle
                  </Button>
                </div>
              )}
            </div>
          ))}

          {category.subcriteria.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No hay criterios. Agrega al menos uno.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function EditChecklistPage() {
  const [areaId, setAreaId] = useState<string>("")
  const [checklistId, setChecklistId] = useState<string>("")
  const { toast } = useToast()

  const [checklistName, setChecklistName] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

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
      const area = getHashParam("areaId")
      const checklist = getHashParam("checklistId")

      if (area && checklist) {
        setAreaId(area)
        setChecklistId(checklist)

        try {
          const checklistData = await getChecklistByIdAction(checklist)
          if (!checklistData) {
            navigateTo(`/area?areaId=${area}`)
            return
          }

          setChecklistName(checklistData.name)

          const categoryMap = new Map<string, Category>()

          checklistData.items.forEach((item) => {
            if (!categoryMap.has(item.category)) {
              categoryMap.set(item.category, {
                id: `cat_${Date.now()}_${Math.random()}`,
                name: item.category,
                subcriteria: [],
              })
            }

            const category = categoryMap.get(item.category)!
            category.subcriteria.push({
              id: item.id,
              name: item.criterion,
              details: item.details,
            })
          })

          setCategories(Array.from(categoryMap.values()))
          setLoading(false)
        } catch (error) {
          console.error("[v0] Error loading checklist:", error)
          navigateTo(`/area?areaId=${area}`)
        }
      }
    }

    loadChecklist()
  }, [])

  const handleAddCategory = () => {
    setCategories([
      ...categories,
      {
        id: `cat_${Date.now()}`,
        name: "",
        subcriteria: [],
      },
    ])
  }

  const handleRemoveCategory = (categoryId: string) => {
    setCategories(categories.filter((cat) => cat.id !== categoryId))
  }

  const handleUpdateCategoryName = (categoryId: string, name: string) => {
    setCategories(categories.map((cat) => (cat.id === categoryId ? { ...cat, name } : cat)))
  }

  const handleAddSubcriteria = (categoryId: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              subcriteria: [
                ...cat.subcriteria,
                {
                  id: `sub_${Date.now()}`,
                  name: "",
                  details: "",
                },
              ],
            }
          : cat,
      ),
    )
  }

  const handleRemoveSubcriteria = (categoryId: string, subcriteriaId: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              subcriteria: cat.subcriteria.filter((sub) => sub.id !== subcriteriaId),
            }
          : cat,
      ),
    )
  }

  const handleUpdateSubcriteria = (
    categoryId: string,
    subcriteriaId: string,
    field: "name" | "details",
    value: string,
  ) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              subcriteria: cat.subcriteria.map((sub) => (sub.id === subcriteriaId ? { ...sub, [field]: value } : sub)),
            }
          : cat,
      ),
    )
  }

  const handleToggleDetails = (categoryId: string, subcriteriaId: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              subcriteria: cat.subcriteria.map((sub) =>
                sub.id === subcriteriaId ? { ...sub, details: sub.details === undefined ? "" : undefined } : sub,
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

    const validCategories = categories.filter(
      (cat) => cat.name.trim() && cat.subcriteria.some((sub) => sub.name.trim()),
    )

    if (validCategories.length === 0) {
      toast({
        title: "Error",
        description: "Debes agregar al menos un criterio con subcriterios",
        variant: "destructive",
      })
      return
    }

    const items: ChecklistItem[] = []
    validCategories.forEach((category) => {
      category.subcriteria
        .filter((sub) => sub.name.trim())
        .forEach((sub) => {
          items.push({
            id: sub.id,
            category: category.name.trim(),
            subcategory: category.name.trim(),
            criterion: sub.name.trim(),
            details: sub.details?.trim() || undefined,
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
      navigateTo(`/area?areaId=${areaId}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el checklist",
        variant: "destructive",
      })
    }
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-blue-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo(`/area?areaId=${areaId}`)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Editar Checklist</h1>
              <p className="text-sm text-primary-foreground/80">Modifica los criterios de inspección</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="bg-accent/20">
          <CardContent className="p-6 space-y-6">
            <div>
              <Input
                value={checklistName}
                onChange={(e) => setChecklistName(e.target.value)}
                placeholder="Nombre del checklist"
                className="text-lg font-medium h-12"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Categorías</h2>
                <Button onClick={handleAddCategory} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir Categoría
                </Button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {categories.map((category) => (
                      <SortableCategory
                        key={category.id}
                        category={category}
                        onUpdateName={(name) => handleUpdateCategoryName(category.id, name)}
                        onRemove={() => handleRemoveCategory(category.id)}
                        onAddSubcriteria={() => handleAddSubcriteria(category.id)}
                        onRemoveSubcriteria={(subcriteriaId) => handleRemoveSubcriteria(category.id, subcriteriaId)}
                        onUpdateSubcriteria={(subcriteriaId, field, value) =>
                          handleUpdateSubcriteria(category.id, subcriteriaId, field, value)
                        }
                        onToggleDetails={(subcriteriaId) => handleToggleDetails(category.id, subcriteriaId)}
                      />
                    ))}

                    {categories.length === 0 && (
                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <p className="text-muted-foreground mb-4">No hay categorías agregadas</p>
                          <Button onClick={handleAddCategory} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar Primera Categoría
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                Actualizar Checklist
              </Button>
              <Button variant="secondary" onClick={() => navigateTo(`/area?areaId=${areaId}`)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
