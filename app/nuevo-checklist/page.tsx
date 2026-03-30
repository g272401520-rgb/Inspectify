"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Plus, X } from "lucide-react"
import { saveChecklistAction } from "@/lib/actions"
import type { Checklist, ChecklistCategory as ChecklistCategoryType, ChecklistItem } from "@/lib/types"
import { navigateTo, getHashParam } from "@/lib/navigation"

export default function NuevoChecklistPage() {
  const [areaId, setAreaId] = useState<string>("")
  const [checklistName, setChecklistName] = useState("")
  const [categories, setCategories] = useState<ChecklistCategoryType[]>([])

  useEffect(() => {
    const id = getHashParam("areaId")
    if (id) {
      setAreaId(id)
    }
  }, [])

  const addCategory = () => {
    const newCategory: ChecklistCategoryType = {
      id: Date.now().toString(),
      name: "",
      criteria: [],
    }
    setCategories([...categories, newCategory])
  }

  const removeCategory = (categoryId: string) => {
    setCategories(categories.filter((cat) => cat.id !== categoryId))
  }

  const updateCategoryName = (categoryId: string, name: string) => {
    setCategories(categories.map((cat) => (cat.id === categoryId ? { ...cat, name } : cat)))
  }

  const addCriterion = (categoryId: string) => {
    setCategories(
      categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            criteria: [
              ...cat.criteria,
              {
                id: Date.now().toString(),
                name: "",
                details: "",
                subcriteria: [],
              },
            ],
          }
        }
        return cat
      }),
    )
  }

  const removeCriterion = (categoryId: string, criterionId: string) => {
    setCategories(
      categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            criteria: cat.criteria.filter((crit) => crit.id !== criterionId),
          }
        }
        return cat
      }),
    )
  }

  const updateCriterionName = (categoryId: string, criterionId: string, name: string) => {
    setCategories(
      categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            criteria: cat.criteria.map((crit) => (crit.id === criterionId ? { ...crit, name } : crit)),
          }
        }
        return cat
      }),
    )
  }

  const updateCriterionDetails = (categoryId: string, criterionId: string, details: string) => {
    setCategories(
      categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            criteria: cat.criteria.map((crit) => (crit.id === criterionId ? { ...crit, details } : crit)),
          }
        }
        return cat
      }),
    )
  }

  const toggleCriterionDetails = (categoryId: string, criterionId: string) => {
    setCategories(
      categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            criteria: cat.criteria.map((crit) => {
              if (crit.id === criterionId) {
                return {
                  ...crit,
                  details: crit.details === undefined ? "" : crit.details,
                }
              }
              return crit
            }),
          }
        }
        return cat
      }),
    )
  }

  const handleSave = async () => {
    if (!checklistName.trim()) {
      alert("Por favor ingresa un nombre para el checklist")
      return
    }

    if (categories.length === 0) {
      alert("Por favor agrega al menos una categoría")
      return
    }

    const hasEmptyCategories = categories.some((cat) => !cat.name.trim())
    if (hasEmptyCategories) {
      alert("Por favor completa los nombres de todas las categorías")
      return
    }

    const hasEmptyCriteria = categories.some((cat) => cat.criteria.some((crit) => !crit.name.trim()))
    if (hasEmptyCriteria) {
      alert("Por favor completa los nombres de todos los criterios")
      return
    }

    const items: ChecklistItem[] = []
    categories.forEach((category) => {
      category.criteria.forEach((criterion) => {
        items.push({
          id: `${category.id}-${criterion.id}`,
          category: category.name,
          criterion: criterion.name,
          details: criterion.details || undefined,
        })
      })
    })

    const newChecklist: Checklist = {
      id: Date.now().toString(),
      name: checklistName,
      areaId: areaId,
      items,
      createdAt: new Date().toISOString(),
      type: "normal",
    }

    try {
      await saveChecklistAction(newChecklist)
      navigateTo(`/area?areaId=${areaId}`)
    } catch (error) {
      alert("Error al guardar el checklist")
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateTo(`/area?areaId=${areaId}`)}
            className="text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Crear Checklist</h1>
        </div>

        <Card className="p-6 bg-card border-border">
          <div className="space-y-6">
            <div>
              <Input
                placeholder="Nombre del checklist (ej: ISO 9001)"
                value={checklistName}
                onChange={(e) => setChecklistName(e.target.value)}
                className="text-lg h-14 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Categorías</h2>
                <p className="text-sm text-muted-foreground mt-1">Estructura: Categoría → Criterio → Detalles</p>
              </div>
              <Button onClick={addCategory} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Categoría
              </Button>
            </div>

            <div className="space-y-4">
              {categories.map((category) => (
                <Card key={category.id} className="p-6 bg-muted/30 border-border">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Input
                        placeholder="Nombre de la categoría (ej: Inventario, Documentación)"
                        value={category.name}
                        onChange={(e) => updateCategoryName(category.id, e.target.value)}
                        className="flex-1 bg-background border-border text-foreground font-medium"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCategory(category.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">Criterios:</p>
                        <Button
                          onClick={() => addCriterion(category.id)}
                          size="sm"
                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agregar Criterio
                        </Button>
                      </div>

                      {category.criteria.map((criterion) => (
                        <div key={criterion.id} className="space-y-2 pl-4 border-l-2 border-primary/30">
                          <div className="flex items-start gap-3">
                            <Input
                              placeholder="Nombre del criterio (ej: Almacenamiento de productos)"
                              value={criterion.name}
                              onChange={(e) => updateCriterionName(category.id, criterion.id, e.target.value)}
                              className="flex-1 bg-background border-border text-foreground"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCriterion(category.id, criterion.id)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          {criterion.details !== undefined ? (
                            <Input
                              placeholder="Detalles adicionales del criterio (opcional)"
                              value={criterion.details}
                              onChange={(e) => updateCriterionDetails(category.id, criterion.id, e.target.value)}
                              className="bg-background border-border text-foreground text-sm"
                            />
                          ) : (
                            <button
                              onClick={() => toggleCriterionDetails(category.id, criterion.id)}
                              className="text-sm text-primary hover:underline"
                            >
                              + Agregar detalle
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Crear Checklist
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateTo(`/area?areaId=${areaId}`)}
                className="border-border text-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
