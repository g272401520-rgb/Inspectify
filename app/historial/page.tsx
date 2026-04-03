"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { FileText, Filter, Eye, ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getInspectionsAction, getAreasAction, getChecklistsAction, deleteInspectionAction } from "@/lib/actions"
import type { Inspection, Area, Checklist } from "@/lib/types"
import Link from "next/link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface AreaGroup {
  area: Area
  checklists: ChecklistGroup[]
}

interface ChecklistGroup {
  checklist: Checklist
  inspections: Inspection[]
}

export default function HistorialPage() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [inspectionToDelete, setInspectionToDelete] = useState<Inspection | null>(null)
  const [sortBy, setSortBy] = useState<"name" | "date-desc">("date-desc")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        const [inspectionsData, areasData, checklistsData] = await Promise.all([
          getInspectionsAction(),
          getAreasAction(),
          getChecklistsAction(),
        ])

        if (isMounted) {
          setInspections(inspectionsData)
          setAreas(areasData)
          setChecklists(checklistsData)
        }
      } catch (error) {
        if (isMounted) {
          toast({
            title: "Error",
            description: "No se pudieron cargar los datos",
            variant: "destructive",
          })
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [toast])

  const getSortedInspections = useCallback(
    (inspectionsList: Inspection[]) => {
      const sorted = [...inspectionsList]
      switch (sortBy) {
        case "date-desc":
          return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        case "name":
          return sorted.sort((a, b) => {
            const areaA = areas.find((area) => area.id === a.areaId)?.name || ""
            const areaB = areas.find((area) => area.id === b.areaId)?.name || ""
            return areaA.localeCompare(areaB)
          })
        default:
          return sorted
      }
    },
    [sortBy, areas],
  )

  const organizedData: AreaGroup[] = useMemo(() => {
    return areas
      .map((area) => {
        const areaChecklists = checklists
          .filter((checklist) => inspections.some((i) => i.areaId === area.id && i.checklistId === checklist.id))
          .map((checklist) => ({
            checklist,
            inspections: getSortedInspections(
              inspections.filter((i) => i.areaId === area.id && i.checklistId === checklist.id),
            ),
          }))
          .filter((group) => group.inspections.length > 0)

        return {
          area,
          checklists: areaChecklists,
        }
      })
      .filter((group) => group.checklists.length > 0)
  }, [areas, checklists, inspections, getSortedInspections])

  const toggleArea = useCallback((areaId: string) => {
    setExpandedAreas((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(areaId)) {
        newSet.delete(areaId)
      } else {
        newSet.add(areaId)
      }
      return newSet
    })
  }, [])

  const toggleChecklist = useCallback((checklistId: string) => {
    setExpandedChecklists((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(checklistId)) {
        newSet.delete(checklistId)
      } else {
        newSet.add(checklistId)
      }
      return newSet
    })
  }, [])

  const handleDeleteClick = useCallback((inspection: Inspection) => {
    setInspectionToDelete(inspection)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!inspectionToDelete) return

    try {
      await deleteInspectionAction(inspectionToDelete.id)
      setInspections((prev) => prev.filter((i) => i.id !== inspectionToDelete.id))
      toast({
        title: "Éxito",
        description: "Inspección eliminada correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la inspección",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setInspectionToDelete(null)
    }
  }, [inspectionToDelete, toast])

  const totalInspections = inspections.length

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Stats */}
        <Card className="mb-4 md:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Filter className="h-4 w-4 md:h-5 md:w-5" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:gap-4 grid-cols-3">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                <p className="text-xl md:text-3xl font-bold text-foreground">{totalInspections}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Áreas</p>
                <p className="text-xl md:text-3xl font-bold text-foreground">{organizedData.length}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Checklists</p>
                <p className="text-xl md:text-3xl font-bold text-foreground">
                  {organizedData.reduce((sum, area) => sum + area.checklists.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hierarchical List */}
        <div className="space-y-3 md:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg md:text-2xl font-bold text-foreground">Inspecciones por Área</h2>
            {totalInspections > 0 && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "date-desc")}
                className="h-11 px-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="name">A a Z</option>
                <option value="date-desc">Reciente</option>
              </select>
            )}
          </div>

          {organizedData.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
                <FileText className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-3 md:mb-4" />
                <h3 className="text-base md:text-xl font-semibold text-foreground mb-2">No hay inspecciones</h3>
                <p className="text-sm md:text-base text-muted-foreground text-center max-w-md">
                  Aún no has realizado ninguna inspección
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {organizedData.map((areaGroup) => (
                <Card key={areaGroup.area.id}>
                  <Collapsible
                    open={expandedAreas.has(areaGroup.area.id)}
                    onOpenChange={() => toggleArea(areaGroup.area.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer transition-colors py-3 md:py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 md:gap-3">
                            {expandedAreas.has(areaGroup.area.id) ? (
                              <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                            )}
                            <div className="text-left">
                              <CardTitle className="text-sm md:text-base">{areaGroup.area.name}</CardTitle>
                              <CardDescription className="text-xs md:text-sm">
                                {areaGroup.checklists.reduce((sum, c) => sum + c.inspections.length, 0)} inspecciones
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {areaGroup.checklists.length} checklist{areaGroup.checklists.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-3 md:space-y-4 pt-0">
                        {areaGroup.checklists.map((checklistGroup) => (
                          <Card key={checklistGroup.checklist.id} className="border-l-4 border-l-primary">
                            <Collapsible
                              open={expandedChecklists.has(checklistGroup.checklist.id)}
                              onOpenChange={() => toggleChecklist(checklistGroup.checklist.id)}
                            >
                              <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer transition-colors py-3 md:py-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 md:gap-3">
                                      {expandedChecklists.has(checklistGroup.checklist.id) ? (
                                        <ChevronDown className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                      )}
                                      <div className="text-left">
                                        <CardTitle className="text-sm md:text-base">
                                          {checklistGroup.checklist.name}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                          {checklistGroup.inspections.length} inspección
                                          {checklistGroup.inspections.length !== 1 ? "es" : ""}
                                        </CardDescription>
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <CardContent className="space-y-3 pt-0">
                                  {checklistGroup.inspections.map((inspection) => (
                                    <div
                                      key={inspection.id}
                                      className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 rounded-lg border bg-card hover:border-primary transition-colors gap-3"
                                    >
                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge
                                            variant={inspection.status === "completada" ? "default" : "secondary"}
                                            className="text-xs"
                                          >
                                            {inspection.status === "completada" ? "Completada" : "En Progreso"}
                                          </Badge>
                                          <span className="text-xs md:text-sm text-muted-foreground">
                                            {new Date(inspection.date).toLocaleDateString("es-ES", {
                                              day: "2-digit",
                                              month: "short",
                                              year: "numeric",
                                            })}
                                          </span>
                                        </div>
                                        <div className="grid gap-1 text-xs md:text-sm">
                                          <div>
                                            <span className="text-muted-foreground">Inspector:</span>
                                            <span className="ml-2 text-foreground font-medium">
                                              {inspection.inspectorName}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Hallazgos:</span>
                                            <span className="ml-2 text-foreground font-medium">
                                              {inspection.findings.length}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 flex-wrap">
                                        <Link href={`/resultados/${inspection.id}`} className="flex-1 md:flex-none">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-10 md:h-12 bg-transparent"
                                          >
                                            <Eye className="h-4 w-4 md:mr-2" />
                                            <span className="hidden md:inline">Ver</span>
                                          </Button>
                                        </Link>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDeleteClick(inspection)}
                                          className="flex-1 md:flex-none h-10 md:h-12 text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 md:mr-2" />
                                          <span className="hidden md:inline">Eliminar</span>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </CardContent>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar inspección?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la inspección y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
