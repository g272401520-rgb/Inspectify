"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AlertCircle, CheckCircle, Clock, Edit, ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getInspectionsWithFindingsAction,
  getAreasAction,
  getChecklistsAction,
  saveInspectionAction,
} from "@/lib/actions"
import type { Finding } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { downloadPhotoToDevice, generatePhotoFileName } from "@/lib/photo-utils"
import { PageHeader } from "@/components/page-header"

interface FindingWithContext extends Finding {
  inspectionId: string
  areaName: string
  checklistName: string
  criterion: string
  category: string
  areaId: string
  checklistId: string
  inspectionDate: string
}

interface AreaGroup {
  areaId: string
  areaName: string
  checklists: ChecklistGroup[]
}

interface ChecklistGroup {
  checklistId: string
  checklistName: string
  findings: FindingWithContext[]
}

export default function SeguimientoPage() {
  const { toast } = useToast()
  const [allFindings, setAllFindings] = useState<FindingWithContext[]>([])
  const [activeTab, setActiveTab] = useState<string>("pendiente")
  const [editingFinding, setEditingFinding] = useState<FindingWithContext | null>(null)
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<"area" | "checklist" | "date-desc">("date-desc")
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })

  const [editForm, setEditForm] = useState({
    status: "pendiente" as Finding["status"],
    correctiveAction: "",
    dueDate: "",
    closedDate: "",
    solutionPhotos: [] as string[],
  })

  useEffect(() => {
    loadFindings()
  }, [])

  const loadFindings = async () => {
    try {
      const [inspections, areas, checklists] = await Promise.all([
        getInspectionsWithFindingsAction(),
        getAreasAction(),
        getChecklistsAction(),
      ])

      const findings: FindingWithContext[] = []

      inspections.forEach((inspection) => {
        const area = areas.find((a) => a.id === inspection.areaId)
        const checklist = checklists.find((c) => c.id === inspection.checklistId)

        if (!area || !checklist) return

        inspection.findings.forEach((finding) => {
          if (finding.status !== "no-conforme") return

          const item = checklist.items.find((i) => i.id === finding.itemId)
          if (!item) return

          let trackingStatus: "pendiente" | "en-proceso" | "resuelto"
          if (finding.trackingStatus) {
            trackingStatus = finding.trackingStatus
          } else if (finding.closedDate) {
            trackingStatus = "resuelto"
          } else if (finding.correctiveAction && finding.correctiveAction.trim() !== "") {
            trackingStatus = "en-proceso"
          } else {
            trackingStatus = "pendiente"
          }

          findings.push({
            ...finding,
            status: trackingStatus,
            inspectionId: inspection.id,
            inspectionDate: inspection.date,
            areaId: area.id,
            areaName: area.name,
            checklistId: checklist.id,
            checklistName: checklist.name,
            criterion: item.criterion,
            category: item.category,
          })
        })
      })

      console.log("[v0] Loaded findings:", findings.length, "findings")
      console.log("[v0] Findings by status:", {
        pendiente: findings.filter((f) => f.status === "pendiente").length,
        "en-proceso": findings.filter((f) => f.status === "en-proceso").length,
        resuelto: findings.filter((f) => f.status === "resuelto").length,
      })

      setAllFindings(findings)
    } catch (error) {
      console.error("Error loading findings:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los hallazgos",
        variant: "destructive",
      })
    }
  }

  const filteredFindings = allFindings.filter((finding) => {
    return finding.status === activeTab
  })

  const getSortedFindings = (findingsList: FindingWithContext[]) => {
    const sorted = [...findingsList]
    switch (sortBy) {
      case "date-desc":
        return sorted.sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime())
      case "area":
        return sorted.sort((a, b) => a.areaName.localeCompare(b.areaName))
      case "checklist":
        return sorted.sort((a, b) => a.checklistName.localeCompare(b.checklistName))
      default:
        return sorted
    }
  }

  const sortedFilteredFindings = getSortedFindings(filteredFindings)

  const organizedData: AreaGroup[] = Array.from(new Set(sortedFilteredFindings.map((f) => f.areaId))).map((areaId) => {
    const areaFindings = sortedFilteredFindings.filter((f) => f.areaId === areaId)
    const areaName = areaFindings[0]?.areaName || ""

    const checklistGroups = Array.from(new Set(areaFindings.map((f) => f.checklistId))).map((checklistId) => {
      const checklistFindings = areaFindings.filter((f) => f.checklistId === checklistId)

      return {
        checklistId,
        checklistName: areaFindings.find((f) => f.checklistId === checklistId)?.checklistName || "",
        findings: checklistFindings,
      }
    })

    return {
      areaId,
      areaName,
      checklists: checklistGroups,
    }
  })

  const toggleArea = (areaId: string) => {
    const newExpanded = new Set(expandedAreas)
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId)
    } else {
      newExpanded.add(areaId)
    }
    setExpandedAreas(newExpanded)
  }

  const toggleChecklist = (checklistId: string) => {
    const newExpanded = new Set(expandedChecklists)
    if (newExpanded.has(checklistId)) {
      newExpanded.delete(checklistId)
    } else {
      newExpanded.add(checklistId)
    }
    setExpandedChecklists(newExpanded)
  }

  const handleEditClick = (finding: FindingWithContext) => {
    setEditingFinding(finding)
    setEditForm({
      status: finding.status,
      correctiveAction: finding.correctiveAction,
      dueDate: finding.dueDate,
      closedDate: finding.closedDate || "",
      solutionPhotos: finding.solutionPhotos,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingFinding) return

    try {
      const inspections = await getInspectionsWithFindingsAction()
      const inspection = inspections.find((i) => i.id === editingFinding.inspectionId)

      if (!inspection) return

      let trackingStatus: "pendiente" | "en-proceso" | "resuelto"
      if (editForm.status === "resuelto") {
        trackingStatus = "resuelto"
      } else if (editForm.status === "en-proceso") {
        trackingStatus = "en-proceso"
      } else {
        trackingStatus = "pendiente"
      }

      const updatedFindings = inspection.findings.map((f) => {
        if (f.id === editingFinding.id) {
          return {
            ...f,
            status: "no-conforme", // Keep conformity status as no-conforme
            trackingStatus: trackingStatus, // Set tracking status
            correctiveAction: editForm.correctiveAction,
            dueDate: editForm.dueDate,
            closedDate: editForm.status === "resuelto" ? editForm.closedDate || new Date().toISOString() : undefined,
            solutionPhotos: editForm.solutionPhotos,
          }
        }
        return f
      })

      await saveInspectionAction({
        ...inspection,
        findings: updatedFindings,
      })

      await loadFindings()
      setEditingFinding(null)
      toast({
        title: "Actualizado correctamente",
        description: "El hallazgo ha sido actualizado exitosamente",
      })
    } catch (error) {
      console.error("Error saving finding:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el hallazgo",
        variant: "destructive",
      })
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setIsUploadingPhotos(true)
    const totalFiles = files.length
    setUploadProgress({ current: 0, total: totalFiles })

    const fileArray = Array.from(files)

    for (let fileIndex = 0; fileIndex < fileArray.length; fileIndex++) {
      const file = fileArray[fileIndex]

      await new Promise<void>((resolve) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            const base64 = event.target.result as string

            const currentPhotoCount = editForm.solutionPhotos.length
            const photoFileName = generatePhotoFileName("solucion", currentPhotoCount + fileIndex)
            downloadPhotoToDevice(base64, photoFileName)

            setEditForm((prev) => ({
              ...prev,
              solutionPhotos: [...prev.solutionPhotos, base64],
            }))

            setUploadProgress({ current: fileIndex + 1, total: totalFiles })
          }
          resolve()
        }
        reader.readAsDataURL(file)
      })
    }

    setIsUploadingPhotos(false)
    setUploadProgress({ current: 0, total: 0 })
    e.target.value = ""
  }

  const getStatusIcon = (status: Finding["status"]) => {
    switch (status) {
      case "pendiente":
        return <AlertCircle className="h-5 w-5 text-destructive" />
      case "en-proceso":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "resuelto":
        return <CheckCircle className="h-5 w-5 text-green-500" />
    }
  }

  const getStatusLabel = (status: Finding["status"]) => {
    switch (status) {
      case "pendiente":
        return "Pendiente"
      case "en-proceso":
        return "En Proceso"
      case "resuelto":
        return "Resuelto"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="title"
        backHref="/"
        title="Seguimiento de Hallazgos"
        subtitle="Gestiona y actualiza el estado de todos los hallazgos"
      />

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Stats */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4 mb-6 md:mb-8">
          <Card>
            <CardHeader className="pb-3 px-4 md:px-6">
              <CardDescription className="text-xs md:text-sm">Total</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{allFindings.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3 px-4 md:px-6">
              <CardDescription className="text-xs md:text-sm">Pendientes</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-destructive">
                {allFindings.filter((f) => f.status === "pendiente").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3 px-4 md:px-6">
              <CardDescription className="text-xs md:text-sm">En Proceso</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-yellow-500">
                {allFindings.filter((f) => f.status === "en-proceso").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3 px-4 md:px-6">
              <CardDescription className="text-xs md:text-sm">Resueltos</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-green-500">
                {allFindings.filter((f) => f.status === "resuelto").length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="pendiente" className="flex-1 sm:flex-none">
                <AlertCircle className="h-4 w-4 mr-2" />
                Pendientes
              </TabsTrigger>
              <TabsTrigger value="en-proceso" className="flex-1 sm:flex-none">
                <Clock className="h-4 w-4 mr-2" />
                En Proceso
              </TabsTrigger>
              <TabsTrigger value="resuelto" className="flex-1 sm:flex-none">
                <CheckCircle className="h-4 w-4 mr-2" />
                Resueltos
              </TabsTrigger>
            </TabsList>

            {filteredFindings.length > 0 && (
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Más reciente</SelectItem>
                  <SelectItem value="area">Por área (A-Z)</SelectItem>
                  <SelectItem value="checklist">Por checklist (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tab Content - Pendientes */}
          <TabsContent value="pendiente">
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-2xl font-bold text-foreground">
                Hallazgos Pendientes ({sortedFilteredFindings.length})
              </h2>

              {organizedData.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
                    <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-3 md:mb-4" />
                    <h3 className="text-base md:text-xl font-semibold text-foreground mb-2">
                      No hay hallazgos pendientes
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground text-center">
                      Todos los hallazgos están en proceso o resueltos
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {organizedData.map((areaGroup) => (
                    <Card key={areaGroup.areaId}>
                      <Collapsible open={expandedAreas.has(areaGroup.areaId)}>
                        <CollapsibleTrigger onClick={() => toggleArea(areaGroup.areaId)} className="w-full">
                          <CardHeader className="cursor-pointer transition-colors py-3 md:py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 md:gap-3">
                                {expandedAreas.has(areaGroup.areaId) ? (
                                  <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                                )}
                                <div className="text-left">
                                  <CardTitle className="text-sm md:text-base">{areaGroup.areaName}</CardTitle>
                                  <CardDescription className="text-xs md:text-sm">
                                    {areaGroup.checklists.reduce((sum, c) => sum + c.findings.length, 0)} hallazgos
                                  </CardDescription>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3 md:space-y-4 pt-0">
                            {areaGroup.checklists.map((checklistGroup) => (
                              <Card key={checklistGroup.checklistId} className="border-l-4 border-l-primary">
                                <Collapsible open={expandedChecklists.has(checklistGroup.checklistId)}>
                                  <CollapsibleTrigger
                                    onClick={() => toggleChecklist(checklistGroup.checklistId)}
                                    className="w-full"
                                  >
                                    <CardHeader className="cursor-pointer transition-colors py-3 md:py-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 md:gap-3">
                                          {expandedChecklists.has(checklistGroup.checklistId) ? (
                                            <ChevronDown className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                          )}
                                          <div className="text-left">
                                            <CardTitle className="text-sm md:text-base">
                                              {checklistGroup.checklistName}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                              {checklistGroup.findings.length} hallazgo
                                              {checklistGroup.findings.length !== 1 ? "s" : ""}
                                            </CardDescription>
                                          </div>
                                        </div>
                                      </div>
                                    </CardHeader>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <CardContent className="space-y-3 pt-0">
                                      {checklistGroup.findings.map((finding) => (
                                        <div
                                          key={finding.id}
                                          className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4 p-3 md:p-4 rounded-lg border bg-card hover:border-primary transition-colors"
                                        >
                                          <div className="flex-1 space-y-2">
                                            <div className="flex items-start gap-2 md:gap-3">
                                              {getStatusIcon(finding.status)}
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                  <h3 className="font-semibold text-foreground text-xs md:text-sm">
                                                    {finding.criterion}
                                                  </h3>
                                                  <Badge variant="outline" className="text-xs">
                                                    {finding.category}
                                                  </Badge>
                                                </div>
                                                <p className="text-xs md:text-sm text-foreground">
                                                  {finding.description}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="grid gap-1 text-xs pl-6 md:pl-8">
                                              <div>
                                                <span className="text-muted-foreground">Estado:</span>
                                                <Badge
                                                  className="ml-2 text-xs"
                                                  variant={
                                                    finding.status === "resuelto"
                                                      ? "default"
                                                      : finding.status === "en-proceso"
                                                        ? "secondary"
                                                        : "destructive"
                                                  }
                                                >
                                                  {getStatusLabel(finding.status)}
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>

                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditClick(finding)}
                                            className="w-full md:w-auto h-10 md:h-12"
                                          >
                                            <Edit className="h-4 w-4 md:mr-2" />
                                            <span className="hidden md:inline">Editar</span>
                                          </Button>
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
          </TabsContent>

          {/* Tab Content - En Proceso */}
          <TabsContent value="en-proceso">
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-2xl font-bold text-foreground">
                Hallazgos En Proceso ({sortedFilteredFindings.length})
              </h2>

              {organizedData.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
                    <Clock className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-3 md:mb-4" />
                    <h3 className="text-base md:text-xl font-semibold text-foreground mb-2">
                      No hay hallazgos en proceso
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground text-center">
                      No hay hallazgos actualmente en proceso
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {organizedData.map((areaGroup) => (
                    <Card key={areaGroup.areaId}>
                      <Collapsible open={expandedAreas.has(areaGroup.areaId)}>
                        <CollapsibleTrigger onClick={() => toggleArea(areaGroup.areaId)} className="w-full">
                          <CardHeader className="cursor-pointer transition-colors py-3 md:py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 md:gap-3">
                                {expandedAreas.has(areaGroup.areaId) ? (
                                  <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                                )}
                                <div className="text-left">
                                  <CardTitle className="text-sm md:text-base">{areaGroup.areaName}</CardTitle>
                                  <CardDescription className="text-xs md:text-sm">
                                    {areaGroup.checklists.reduce((sum, c) => sum + c.findings.length, 0)} hallazgos
                                  </CardDescription>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3 md:space-y-4 pt-0">
                            {areaGroup.checklists.map((checklistGroup) => (
                              <Card key={checklistGroup.checklistId} className="border-l-4 border-l-yellow-500">
                                <Collapsible open={expandedChecklists.has(checklistGroup.checklistId)}>
                                  <CollapsibleTrigger
                                    onClick={() => toggleChecklist(checklistGroup.checklistId)}
                                    className="w-full"
                                  >
                                    <CardHeader className="cursor-pointer transition-colors py-3 md:py-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 md:gap-3">
                                          {expandedChecklists.has(checklistGroup.checklistId) ? (
                                            <ChevronDown className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                          )}
                                          <div className="text-left">
                                            <CardTitle className="text-sm md:text-base">
                                              {checklistGroup.checklistName}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                              {checklistGroup.findings.length} hallazgo
                                              {checklistGroup.findings.length !== 1 ? "s" : ""}
                                            </CardDescription>
                                          </div>
                                        </div>
                                      </div>
                                    </CardHeader>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <CardContent className="space-y-3 pt-0">
                                      {checklistGroup.findings.map((finding) => (
                                        <div
                                          key={finding.id}
                                          className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4 p-3 md:p-4 rounded-lg border bg-card hover:border-yellow-500 transition-colors"
                                        >
                                          <div className="flex-1 space-y-2">
                                            <div className="flex items-start gap-2 md:gap-3">
                                              {getStatusIcon(finding.status)}
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                  <h3 className="font-semibold text-foreground text-xs md:text-sm">
                                                    {finding.criterion}
                                                  </h3>
                                                  <Badge variant="outline" className="text-xs">
                                                    {finding.category}
                                                  </Badge>
                                                </div>
                                                <p className="text-xs md:text-sm text-foreground">
                                                  {finding.description}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="grid gap-1 text-xs pl-6 md:pl-8">
                                              <div>
                                                <span className="text-muted-foreground">Estado:</span>
                                                <Badge
                                                  className="ml-2 text-xs"
                                                  variant={
                                                    finding.status === "resuelto"
                                                      ? "default"
                                                      : finding.status === "en-proceso"
                                                        ? "secondary"
                                                        : "destructive"
                                                  }
                                                >
                                                  {getStatusLabel(finding.status)}
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>

                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditClick(finding)}
                                            className="w-full md:w-auto h-10 md:h-12"
                                          >
                                            <Edit className="h-4 w-4 md:mr-2" />
                                            <span className="hidden md:inline">Editar</span>
                                          </Button>
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
          </TabsContent>

          {/* Tab Content - Resueltos */}
          <TabsContent value="resuelto">
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-2xl font-bold text-foreground">
                Hallazgos Resueltos ({sortedFilteredFindings.length})
              </h2>

              {organizedData.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
                    <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-3 md:mb-4" />
                    <h3 className="text-base md:text-xl font-semibold text-foreground mb-2">
                      No hay hallazgos resueltos
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground text-center">
                      Aún no se han resuelto hallazgos
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {organizedData.map((areaGroup) => (
                    <Card key={areaGroup.areaId}>
                      <Collapsible open={expandedAreas.has(areaGroup.areaId)}>
                        <CollapsibleTrigger onClick={() => toggleArea(areaGroup.areaId)} className="w-full">
                          <CardHeader className="cursor-pointer transition-colors py-3 md:py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 md:gap-3">
                                {expandedAreas.has(areaGroup.areaId) ? (
                                  <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                                )}
                                <div className="text-left">
                                  <CardTitle className="text-sm md:text-base">{areaGroup.areaName}</CardTitle>
                                  <CardDescription className="text-xs md:text-sm">
                                    {areaGroup.checklists.reduce((sum, c) => sum + c.findings.length, 0)} hallazgos
                                  </CardDescription>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3 md:space-y-4 pt-0">
                            {areaGroup.checklists.map((checklistGroup) => (
                              <Card key={checklistGroup.checklistId} className="border-l-4 border-l-green-500">
                                <Collapsible open={expandedChecklists.has(checklistGroup.checklistId)}>
                                  <CollapsibleTrigger
                                    onClick={() => toggleChecklist(checklistGroup.checklistId)}
                                    className="w-full"
                                  >
                                    <CardHeader className="cursor-pointer transition-colors py-3 md:py-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 md:gap-3">
                                          {expandedChecklists.has(checklistGroup.checklistId) ? (
                                            <ChevronDown className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                          )}
                                          <div className="text-left">
                                            <CardTitle className="text-sm md:text-base">
                                              {checklistGroup.checklistName}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                              {checklistGroup.findings.length} hallazgo
                                              {checklistGroup.findings.length !== 1 ? "s" : ""}
                                            </CardDescription>
                                          </div>
                                        </div>
                                      </div>
                                    </CardHeader>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <CardContent className="space-y-3 pt-0">
                                      {checklistGroup.findings.map((finding) => (
                                        <div
                                          key={finding.id}
                                          className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4 p-3 md:p-4 rounded-lg border bg-card hover:border-green-500 transition-colors"
                                        >
                                          <div className="flex-1 space-y-2">
                                            <div className="flex items-start gap-2 md:gap-3">
                                              {getStatusIcon(finding.status)}
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                  <h3 className="font-semibold text-foreground text-xs md:text-sm">
                                                    {finding.criterion}
                                                  </h3>
                                                  <Badge variant="outline" className="text-xs">
                                                    {finding.category}
                                                  </Badge>
                                                </div>
                                                <p className="text-xs md:text-sm text-foreground">
                                                  {finding.description}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="grid gap-1 text-xs pl-6 md:pl-8">
                                              <div>
                                                <span className="text-muted-foreground">Estado:</span>
                                                <Badge
                                                  className="ml-2 text-xs"
                                                  variant={
                                                    finding.status === "resuelto"
                                                      ? "default"
                                                      : finding.status === "en-proceso"
                                                        ? "secondary"
                                                        : "destructive"
                                                  }
                                                >
                                                  {getStatusLabel(finding.status)}
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>

                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditClick(finding)}
                                            className="w-full md:w-auto h-10 md:h-12"
                                          >
                                            <Edit className="h-4 w-4 md:mr-2" />
                                            <span className="hidden md:inline">Editar</span>
                                          </Button>
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
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingFinding} onOpenChange={() => setEditingFinding(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Hallazgo</DialogTitle>
            <DialogDescription>Actualiza el estado y la información del hallazgo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-status">Estado</Label>
              <Select
                value={editForm.status}
                onValueChange={(value: Finding["status"]) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en-proceso">En Proceso</SelectItem>
                  <SelectItem value="resuelto">Resuelto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-action">Acción Correctiva</Label>
              <Textarea
                id="edit-action"
                value={editForm.correctiveAction}
                onChange={(e) => setEditForm({ ...editForm, correctiveAction: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="edit-due">Fecha Límite</Label>
                <Input
                  id="edit-due"
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="mt-2"
                />
              </div>
              {editForm.status === "resuelto" && (
                <div>
                  <Label htmlFor="edit-closed">Fecha de Cierre</Label>
                  <Input
                    id="edit-closed"
                    type="date"
                    value={editForm.closedDate}
                    onChange={(e) => setEditForm({ ...editForm, closedDate: e.target.value })}
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Fotos de Solución (Opcional)</Label>
              {isUploadingPhotos && uploadProgress.total > 0 && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg mt-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    Procesando fotos: {uploadProgress.current} de {uploadProgress.total}
                  </span>
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="mt-2"
                disabled={isUploadingPhotos}
              />
              {editForm.solutionPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editForm.solutionPhotos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo || "/placeholder.svg"}
                      alt={`Solución ${index + 1}`}
                      className="h-20 w-20 object-cover rounded border"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFinding(null)} disabled={isUploadingPhotos}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} className="bg-accent hover:bg-accent/90" disabled={isUploadingPhotos}>
              {isUploadingPhotos ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
