"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { BarChart3, TrendingUp, CheckCircle2, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getInspectionsWithFindingsAction, getAreasAction, getChecklistsAction } from "@/lib/actions"
import type { Inspection, Area, Checklist } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { ChartDownloadButton } from "@/components/chart-download-button"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LabelList,
} from "recharts"
import { LoadingScreen } from "@/components/loading-screen"

interface AreaStats {
  areaId: string
  areaName: string
  totalInspections: number
  totalChecklists: number
  averageCompliance: number
  checklistsData: Array<{
    checklistName: string
    compliance: number
  }>
}

export default function ConsolidadoPage() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"name" | "compliance">("name")
  const { toast } = useToast()
  const radarChartRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        const [loadedInspections, loadedAreas, loadedChecklists] = await Promise.all([
          getInspectionsWithFindingsAction(),
          getAreasAction(),
          getChecklistsAction(),
        ])

        if (isMounted) {
          setInspections(loadedInspections)
          setAreas(loadedAreas)
          setChecklists(loadedChecklists)
        }
      } catch (error) {
        if (isMounted) {
          toast({
            title: "Error",
            description: "No se pudieron cargar los datos consolidados",
            variant: "destructive",
          })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [toast])

  const areaStats = useMemo(() => {
    return areas.map((area) => {
      const areaChecklists = checklists.filter((c) => c.areaId === area.id)

      const checklistsData = areaChecklists.map((checklist) => {
        const checklistInspections = inspections.filter((i) => i.checklistId === checklist.id)

        if (checklistInspections.length === 0) {
          return {
            checklistName: checklist.name,
            compliance: 0,
          }
        }

        const totalCompliance = checklistInspections.reduce((sum, inspection) => {
          if (!inspection.findings || inspection.findings.length === 0) {
            return sum
          }

          const conformes = inspection.findings.filter((f) => f.status === "conforme").length
          const noConformes = inspection.findings.filter((f) => f.status === "no-conforme").length
          const pendientes = inspection.findings.filter((f) => f.status === "pendiente").length
          const totalEvaluados = conformes + noConformes + pendientes

          if (totalEvaluados === 0) return sum

          const compliance = (conformes / totalEvaluados) * 100
          return sum + compliance
        }, 0)

        const averageCompliance = checklistInspections.length > 0 ? totalCompliance / checklistInspections.length : 0

        return {
          checklistName: checklist.name,
          compliance: Math.round(averageCompliance),
        }
      })

      const totalInspections = inspections.filter((i) => i.areaId === area.id).length
      const averageCompliance =
        checklistsData.length > 0
          ? Math.round(checklistsData.reduce((sum, c) => sum + c.compliance, 0) / checklistsData.length)
          : 0

      return {
        areaId: area.id,
        areaName: area.name,
        totalInspections,
        totalChecklists: areaChecklists.length,
        averageCompliance,
        checklistsData,
      }
    })
  }, [inspections, areas, checklists])

  const sortedAreaStats = useMemo(() => {
    const sorted = [...areaStats]
    if (sortBy === "name") {
      return sorted.sort((a, b) => a.areaName.localeCompare(b.areaName))
    } else {
      return sorted.sort((a, b) => b.averageCompliance - a.averageCompliance)
    }
  }, [areaStats, sortBy])

  const globalStats = useMemo(() => {
    const totalInspections = inspections.length
    const totalAreas = areas.length
    const totalChecklists = checklists.length

    const totalCompliance =
      areaStats.length > 0
        ? Math.round(areaStats.reduce((sum, area) => sum + area.averageCompliance, 0) / areaStats.length)
        : 0

    return {
      totalInspections,
      totalAreas,
      totalChecklists,
      totalCompliance,
    }
  }, [inspections.length, areas.length, checklists.length, areaStats])

  const handleDownloadChart = useCallback((areaId: string, areaName: string) => {
    const chartElement = radarChartRefs.current[areaId]
    if (chartElement) {
      // Lógica de descarga
    }
  }, [])

  if (loading) {
    return <LoadingScreen message="Cargando datos consolidados..." />
  }

  return (
    <>
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Consolidado</h1>
          <p className="mt-1 text-sm text-muted-foreground">Resumen global del desempeño de todas las áreas e inspecciones</p>
        </div>

        {/* Estadísticas Generales */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-base md:text-xl font-semibold text-foreground mb-3 md:mb-4">Detalles Generales</h2>
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium">Total Inspecciones</CardTitle>
                <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="text-xl md:text-2xl font-bold">{globalStats.totalInspections}</div>
                <p className="text-xs text-muted-foreground">Inspecciones realizadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium">Cumplimiento General</CardTitle>
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="text-xl md:text-2xl font-bold">{globalStats.totalCompliance}%</div>
                <p className="text-xs text-muted-foreground">Promedio de todas las áreas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium">Áreas Activas</CardTitle>
                <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="text-xl md:text-2xl font-bold">{globalStats.totalAreas}</div>
                <p className="text-xs text-muted-foreground">{globalStats.totalChecklists} checklists totales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium">Estado de Hallazgos</CardTitle>
                <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="flex gap-2 text-xs md:text-sm">
                  <span className="text-green-600 font-semibold">
                    {inspections.reduce((sum, inspection) => {
                      return sum + (inspection.findings?.filter((f) => f.status === "conforme").length || 0)
                    }, 0)}
                    C
                  </span>
                  <span className="text-red-600 font-semibold">
                    {inspections.reduce((sum, inspection) => {
                      return sum + (inspection.findings?.filter((f) => f.status === "no-conforme").length || 0)
                    }, 0)}
                    NC
                  </span>
                  <span className="text-yellow-600 font-semibold">
                    {inspections.reduce((sum, inspection) => {
                      return sum + (inspection.findings?.filter((f) => f.status === "pendiente").length || 0)
                    }, 0)}
                    P
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Conformes / No Conformes / Pendientes</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cumplimiento por Área */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 md:mb-4">
            <h2 className="text-base md:text-xl font-semibold text-foreground">Cumplimiento por Área</h2>
            {areaStats.length > 0 && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "compliance")}
                className="h-11 px-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="name">A a Z</option>
                <option value="compliance">Reciente</option>
              </select>
            )}
          </div>
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {sortedAreaStats.map((area) => (
              <Card key={area.areaId}>
                <CardHeader className="px-4 md:px-6">
                  <CardTitle className="text-base md:text-lg truncate">{area.areaName}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {area.totalInspections} inspecciones • {area.totalChecklists} checklists
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-muted-foreground">Cumplimiento Promedio</span>
                    <span
                      className={`text-xl md:text-2xl font-bold ${
                        area.averageCompliance >= 80
                          ? "text-green-600"
                          : area.averageCompliance >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {area.averageCompliance}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Gráficos Radar por Área */}
        <div>
          <h2 className="text-base md:text-xl font-semibold text-foreground mb-3 md:mb-4">
            Gráficos Radar de Cumplimiento por Área
          </h2>
          <div className="grid gap-4 md:gap-6 grid-cols-1">
            {areaStats
              .filter((area) => area.checklistsData.length > 0)
              .map((area) => (
                <Card key={area.areaId}>
                  <CardHeader className="px-4 md:px-6 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{area.areaName}</CardTitle>
                      <CardDescription>
                        Cumplimiento porcentual por checklist (Promedio: {area.averageCompliance}%)
                      </CardDescription>
                    </div>
                    <ChartDownloadButton
                      chartRef={{ current: radarChartRefs.current[area.areaId] }}
                      fileName={`radar-${area.areaName}`}
                    />
                  </CardHeader>
                  <CardContent className="px-2 md:px-6">
                    <div
                      ref={(el) => {
                        if (el) radarChartRefs.current[area.areaId] = el
                      }}
                      className="overflow-x-auto"
                    >
                      <div style={{ minWidth: "400px", minHeight: "400px" }}>
                        <ResponsiveContainer width="100%" height={400}>
                          <RadarChart data={area.checklistsData}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis
                              dataKey="checklistName"
                              tick={{ fill: "#6b7280", fontSize: 12 }}
                              tickLine={false}
                            />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} tickCount={6} axisLine={false} />
                            <Radar
                              name="Cumplimiento (%)"
                              dataKey="compliance"
                              stroke="#10b981"
                              fill="#10b981"
                              fillOpacity={0.6}
                              strokeWidth={2}
                            >
                              <LabelList
                                dataKey="compliance"
                                position="outside"
                                formatter={(value: number) => `${value}%`}
                                style={{ fill: "#374151", fontSize: 13, fontWeight: "bold" }}
                                offset={40}
                              />
                            </Radar>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => [`${value}%`, "Cumplimiento"]}
                            />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {areaStats.filter((area) => area.checklistsData.length > 0).length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No hay datos disponibles</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Realiza inspecciones para ver los gráficos radar de cumplimiento por área.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  )
}
