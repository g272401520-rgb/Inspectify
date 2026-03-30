"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Plus, X, GripVertical, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveChecklistAction } from "@/lib/actions"
import type { Checklist, ChecklistItem } from "@/lib/types"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
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

interface Category {
  id: string
  name: string
  subcriteria: Subcriteria[]
  isExpanded: boolean
}

interface Subcriteria {
  id: string
  name: string
  details?: string
}

export default function NuevoChecklistPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const areaId = params.areaId as string

  const [checklistName, setChecklistName] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; categoryId: string | null }>({
    open: false,
    categoryId: null,
  })

  const handleAddCategory = () => {
    setCategories([
      ...categories,
      {
        id: `cat_${Date.now()}`,
        name: "",
        subcriteria: [],
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
        description: "Debes agregar al menos una categoría con criterios",
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

    const newChecklist: Checklist = {
      id: `checklist_${Date.now()}`,
      name: checklistName.trim(),
      areaId,
      items,
      createdAt: new Date().toISOString(),
    }

    try {
      await saveChecklistAction(newChecklist)
      toast({
        title: "Checklist creado",
        description: `Se creó el checklist con ${items.length} criterios`,
      })
      router.push(`/area/${areaId}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el checklist",
        variant: "destructive",
      })
    }
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
              <h1 className="text-xl md:text-2xl font-bold text-white">Crear Checklist</h1>
              <p className="text-xs md:text-sm text-white/80">Define los criterios de inspección</p>
            </div>
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
                <Button
                  onClick={handleAddCategory}
                  size="lg"
                  className="w-full sm:w-auto h-12 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Añadir Categoría
                </Button>
              </div>

              <div className="space-y-4">
                {categories.map((category, index) => (
                  <Card key={category.id} className="bg-background border-2">
                    <CardHeader className="p-4 cursor-pointer" onClick={() => handleToggleCategory(category.id)}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <GripVertical className="h-5 w-5" />
                          {category.isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-muted-foreground">Categoría {index + 1}</span>
                            <Badge variant="secondary" className="text-xs">
                              {category.subcriteria.length}{" "}
                              {category.subcriteria.length === 1 ? "criterio" : "criterios"}
                            </Badge>
                          </div>
                          {category.name && (
                            <p className="text-sm text-foreground font-medium truncate">{category.name}</p>
                          )}
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
                              onChange={(e) => handleUpdateCategoryName(category.id, e.target.value)}
                              placeholder="Ej: Documentación, Equipos, etc."
                              className="flex-1 h-12 text-base"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              variant="ghost"
                              size="lg"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteDialog({ open: true, categoryId: category.id })
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
                                handleAddSubcriteria(category.id)
                              }}
                              size="lg"
                              className="w-full sm:w-auto h-11 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Agregar Criterio
                            </Button>
                          </div>

                          {category.subcriteria.map((sub, subIndex) => (
                            <div key={sub.id} className="space-y-2 p-3 rounded-lg border border-border">
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0 pt-3">
                                  <Badge variant="outline" className="text-xs">
                                    {subIndex + 1}
                                  </Badge>
                                </div>
                                <Input
                                  value={sub.name}
                                  onChange={(e) => handleUpdateSubcriteria(category.id, sub.id, "name", e.target.value)}
                                  placeholder="Nombre del criterio"
                                  className="flex-1 bg-background h-12 text-base"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveSubcriteria(category.id, sub.id)
                                  }}
                                  className="h-12 w-12 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              </div>

                              {sub.details !== undefined ? (
                                <div className="pl-0 md:pl-10 space-y-2">
                                  <Textarea
                                    value={sub.details || ""}
                                    onChange={(e) =>
                                      handleUpdateSubcriteria(category.id, sub.id, "details", e.target.value)
                                    }
                                    placeholder="Detalles adicionales (opcional)"
                                    className="min-h-[80px] bg-background text-base"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleToggleDetails(category.id, sub.id)
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
                                      handleToggleDetails(category.id, sub.id)
                                    }}
                                    className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                                  >
                                    + Agregar detalle
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}

                          {category.subcriteria.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg">
                              <p className="text-sm text-muted-foreground mb-3">No hay criterios en esta categoría</p>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddSubcriteria(category.id)
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
                ))}

                {categories.length === 0 && (
                  <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <p className="text-muted-foreground mb-4 text-center">
                        No hay categorías agregadas
                        <br />
                        <span className="text-sm">Comienza agregando tu primera categoría</span>
                      </p>
                      <Button
                        onClick={handleAddCategory}
                        size="lg"
                        className="h-12 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        Agregar Primera Categoría
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleSave}
                size="lg"
                className="w-full sm:flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
              >
                Crear Checklist
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
