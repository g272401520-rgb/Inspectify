"use client"

import { useState, useEffect, useRef } from "react"
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getInspectionsWithFindingsAction, getAreasAction, getChecklistsAction } from "@/lib/actions"
import type { Inspection, Area as AreaType, Checklist } from "@/lib/types"
import { ChartDownloadButton } from "@/components/chart-download-button"
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
  LabelList,
  Area,
  Tooltip,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { useToast } from "@/hooks/use-toast"

type TimeFilter = "3months" | "6months" | "1year" | "all"

export default function ComparativasPage() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [areas, setAreas] = useState<AreaType[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [filterArea, setFilterArea] = useState<string>("all")
  const [filterChecklist, setFilterChecklist] = useState<string>("all")
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all")
  const { toast } = useToast()

  const conformityChartRef = useRef<HTMLDivElement>(null)
  const categoryChartRef = useRef<HTMLDivElement>(null)
  const statusChartRef = useRef<HTMLDivElement>(null)
  const topCriteriaChartRef = useRef<HTMLDivElement>(null)
  const areaComparisonChartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [inspectionsData, areasData, checklistsData] = await Promise.all([
          getInspectionsWithFindingsAction(),
          getAreasAction(),
          getChecklistsAction(),
        ])
        setInspections(inspectionsData || [])
        setAreas(areasData || [])
        setChecklists(checklistsData || [])
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos. Por favor, intenta de nuevo.",
          variant: "destructive",
        })
      }
    }
    loadData()
  }, [toast])

  const getTimeFilteredInspections = () => {
    if (!inspections || !Array.isArray(inspections)) return []

    const now = new Date()
    let cutoffDate = new Date(0)

    switch (timeFilter) {
      case "3months":
        cutoffDate = new Date(now.setMonth(now.getMonth() - 3))
        break
      case "6months":
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6))
        break
      case "1year":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1))
        break
      case "all":
        cutoffDate = new Date(0)
        break
    }

    return inspections.filter((inspection) => new Date(inspection.date) >= cutoffDate)
  }

  const filteredInspections = getTimeFilteredInspections()
    .filter((inspection) => {
      if (filterArea !== "all" && inspection.areaId !== filterArea) return false
      if (filterChecklist !== "all" && inspection.checklistId !== filterChecklist) return false
      return true
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const conformityData = filteredInspections
    .map((inspection) => {
      const checklist = checklists.find((c) => c.id === inspection.checklistId)
      const findings = inspection.findings || []
      if (!checklist || findings.length === 0) return null

      const conformes = findings.filter((f) => f.status === "conforme").length
      const noConformes = findings.filter((f) => f.status === "no-conforme").length
      const pendientes = findings.filter((f) => f.status === "pendiente").length
      const totalEvaluados = conformes + noConformes + pendientes

      if (totalEvaluados === 0) return null

      return {
        date: formatDate(inspection.date),
        porcentajeConformes: Math.round((conformes / totalEvaluados) * 100),
        porcentajeNoConformes: Math.round((noConformes / totalEvaluados) * 100),
        porcentajeConformidad: Math.round((conformes / totalEvaluados) * 100),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const calculateTrendLine = (data: typeof conformityData) => {
    if (data.length < 2) return data

    const n = data.length
    const sumX = data.reduce((sum, _, i) => sum + i, 0)
    const sumY = data.reduce((sum, item) => sum + item.porcentajeConformidad, 0)
    const sumXY = data.reduce((sum, item, i) => sum + i * item.porcentajeConformidad, 0)
    const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return data.map((item, i) => ({
      ...item,
      tendencia: Math.round(slope * i + intercept),
    }))
  }

  const conformityDataWithTrend = calculateTrendLine(conformityData)

  const categoryTrendData = filteredInspections
    .map((inspection) => {
      const checklist = checklists.find((c) => c.id === inspection.checklistId)
      const findings = inspection.findings || []
      if (!checklist || !checklist.items || !Array.isArray(checklist.items) || findings.length === 0) return null

      const categoryCounts: Record<string, number> = {}

      checklist.items.forEach((item) => {
        if (item && item.category && !categoryCounts[item.category]) {
          categoryCounts[item.category] = 0
        }
      })

      findings
        .filter((f) => f && f.status === "no-conforme")
        .forEach((finding) => {
          const item = checklist.items.find((i) => i && i.id === finding.itemId)
          if (item && item.category) {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
          }
        })

      return {
        date: formatDate(inspection.date),
        ...categoryCounts,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const allCategories = Array.from(
    new Set(
      checklists
        .filter((c) => c && c.items && Array.isArray(c.items))
        .flatMap((c) => c.items.filter((item) => item && item.category).map((item) => item.category)),
    ),
  )

  const statusDistributionData = filteredInspections
    .map((inspection) => {
      const findings = inspection.findings || []
      if (findings.length === 0) return null

      const noConformes = findings.filter((f) => f && f.status === "no-conforme")
      const pendientes = noConformes.filter((f) => !f.resolutionStatus || f.resolutionStatus === "pendiente").length
      const enProceso = noConformes.filter((f) => f.resolutionStatus === "en-proceso").length
      const resueltos = noConformes.filter((f) => f.resolutionStatus === "resuelto").length

      return {
        date: formatDate(inspection.date),
        pendientes,
        enProceso,
        resueltos,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const criteriaFailures: Record<string, { count: number; description: string }> = {}

  filteredInspections.forEach((inspection) => {
    const checklist = checklists.find((c) => c.id === inspection.checklistId)
    const findings = inspection.findings || []
    if (!checklist || !checklist.items || !Array.isArray(checklist.items)) return

    findings
      .filter((f) => f && f.status === "no-conforme")
      .forEach((finding) => {
        const item = checklist.items.find((i) => i && i.id === finding.itemId)
        if (item && item.id && item.description) {
          if (!criteriaFailures[item.id]) {
            criteriaFailures[item.id] = { count: 0, description: item.description }
          }
          criteriaFailures[item.id].count++
        }
      })
  })

  const topCriteriaData = Object.entries(criteriaFailures)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([id, data]) => ({
      criterio: data.description.length > 40 ? data.description.substring(0, 40) + "..." : data.description,
      hallazgos: data.count,
    }))

  const areaComparisonData = filteredInspections.reduce(
    (acc, inspection) => {
      const area = areas.find((a) => a.id === inspection.areaId)
      const checklist = checklists.find((c) => c.id === inspection.checklistId)
      const findings = inspection.findings || []
      if (!area || !area.name || !checklist || findings.length === 0) return acc

      const date = formatDate(inspection.date)
      const conformes = findings.filter((f) => f && f.status === "conforme").length
      const totalEvaluados = findings.length
      const porcentaje = totalEvaluados > 0 ? Math.round((conformes / totalEvaluados) * 100) : 0

      const existing = acc.find((item) => item.date === date)
      if (existing) {
        existing[area.name] = porcentaje
      } else {
        acc.push({
          date,
          [area.name]: porcentaje,
        })
      }

      return acc
    },
    [] as Array<Record<string, string | number>>,
  )

  const areaNames = Array.from(new Set(areas.filter((a) => a && a.name).map((a) => a.name)))

  const selectedArea = areas.find((a) => a.id === filterArea)
  const selectedChecklist = checklists.find((c) => c.id === filterChecklist)
  const filterDescription =
    filterArea !== "all" || filterChecklist !== "all"
      ? ` - ${selectedArea?.name || "Todas las áreas"} / ${selectedChecklist?.name || "Todos los checklists"}`
      : ""

  const hasEnoughData = filteredInspections.length >= 2 && conformityData.length >= 2

  const categoryColors = [
    "hsl(217, 91%, 60%)",
    "hsl(142, 76%, 36%)",
    "hsl(0, 72%, 51%)",
    "hsl(45, 93%, 47%)",
    "hsl(280, 67%, 55%)",
    "hsl(33, 100%, 50%)",
  ]

  const areaColors = [
    "hsl(217, 91%, 60%)",
    "hsl(142, 76%, 36%)",
    "hsl(280, 67%, 55%)",
    "hsl(33, 100%, 50%)",
    "hsl(0, 72%, 51%)",
  ]

  return (
    <>
      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Filters */}
        <Card className="mb-6 md:mb-8">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-base md:text-lg">Filtros</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Selecciona el período de tiempo, área o checklist para comparar
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs md:text-sm font-medium text-foreground mb-2 block">Período de Tiempo</label>
                <Select value={timeFilter} onValueChange={(value: TimeFilter) => setTimeFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el historial</SelectItem>
                    <SelectItem value="3months">Últimos 3 meses</SelectItem>
                    <SelectItem value="6months">Últimos 6 meses</SelectItem>
                    <SelectItem value="1year">Último año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs md:text-sm font-medium text-foreground mb-2 block">Área</label>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las áreas</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs md:text-sm font-medium text-foreground mb-2 block">Checklist</label>
                <Select value={filterChecklist} onValueChange={setFilterChecklist}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los checklists</SelectItem>
                    {checklists.map((checklist) => (
                      <SelectItem key={checklist.id} value={checklist.id}>
                        {checklist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!hasEnoughData ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 md:py-16 px-4">
              <TrendingUp className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-3 md:mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 text-center">Datos insuficientes</h3>
              <p className="text-xs md:text-sm text-muted-foreground text-center max-w-md">
                Se necesitan al menos 2 inspecciones para mostrar comparativas. Realiza más inspecciones o ajusta los
                filtros para ver la evolución de tus hallazgos.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 md:space-y-8">
            <Card>
              <CardHeader className="px-4 md:px-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base md:text-lg">Porcentaje de Conformidad{filterDescription}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Porcentaje de criterios conformes respecto al total evaluado en cada inspección
                  </CardDescription>
                </div>
                <ChartDownloadButton chartRef={conformityChartRef} fileName="conformidad" />
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <div ref={conformityChartRef} className="overflow-x-auto">
                  <ChartContainer
                    config={{
                      porcentajeConformidad: {
                        label: "% Conformidad",
                        color: "hsl(142, 76%, 36%)",
                      },
                      tendencia: {
                        label: "Tendencia",
                        color: "#9ca3af",
                      },
                    }}
                    className="h-[300px] md:h-[350px]"
                    style={{ minWidth: "600px" }}
                  >
                    <LineChart data={conformityDataWithTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        domain={[0, 100]}
                        label={{ value: "%", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="line" />
                      <Line
                        type="monotone"
                        dataKey="porcentajeConformidad"
                        stroke="hsl(142, 76%, 36%)"
                        strokeWidth={3}
                        name="% Conformidad"
                        dot={{ fill: "hsl(142, 76%, 36%)", r: 5 }}
                        activeDot={{ r: 7 }}
                        connectNulls
                      >
                        <LabelList
                          dataKey="porcentajeConformidad"
                          position="top"
                          formatter={(value: number) => `${value}%`}
                          style={{ fontSize: 12, fontWeight: "bold", fill: "hsl(var(--foreground))" }}
                        />
                      </Line>
                      <Line
                        type="monotone"
                        dataKey="tendencia"
                        stroke="#9ca3af"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Tendencia"
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {categoryTrendData.length >= 2 && allCategories.length > 0 && (
              <Card>
                <CardHeader className="px-4 md:px-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base md:text-lg">
                      Hallazgos por Categoría a lo Largo del Tiempo{filterDescription}
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Evolución de no conformidades por categoría en cada inspección
                    </CardDescription>
                  </div>
                  <ChartDownloadButton chartRef={categoryChartRef} fileName="hallazgos-categoria-tiempo" />
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  <div ref={categoryChartRef} className="overflow-x-auto">
                    <div className="h-[350px] md:h-[400px]" style={{ minWidth: "600px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} />
                          {allCategories.map((category, idx) => (
                            <Bar
                              key={category}
                              dataKey={category}
                              fill={categoryColors[idx % categoryColors.length]}
                              name={category}
                            >
                              <LabelList
                                dataKey={category}
                                position="top"
                                style={{ fontSize: 11, fontWeight: "bold", fill: "hsl(var(--foreground))" }}
                              />
                            </Bar>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {statusDistributionData.length >= 2 && (
              <Card>
                <CardHeader className="px-4 md:px-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base md:text-lg">
                      Distribución de Estados de Hallazgos{filterDescription}
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Volumen y estado de resolución de hallazgos no conformes a lo largo del tiempo
                    </CardDescription>
                  </div>
                  <ChartDownloadButton chartRef={statusChartRef} fileName="distribucion-estados" />
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  <div ref={statusChartRef} className="overflow-x-auto">
                    <div className="h-[350px] md:h-[400px]" style={{ minWidth: "600px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={statusDistributionData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} />
                          <Area
                            type="monotone"
                            dataKey="resueltos"
                            stackId="1"
                            fill="hsl(142, 76%, 36%)"
                            stroke="hsl(142, 76%, 36%)"
                            name="Resueltos"
                          />
                          <Area
                            type="monotone"
                            dataKey="enProceso"
                            stackId="1"
                            fill="hsl(45, 93%, 47%)"
                            stroke="hsl(45, 93%, 47%)"
                            name="En Proceso"
                          />
                          <Area
                            type="monotone"
                            dataKey="pendientes"
                            stackId="1"
                            fill="hsl(0, 72%, 51%)"
                            stroke="hsl(0, 72%, 51%)"
                            name="Pendientes"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {topCriteriaData.length > 0 && (
              <Card>
                <CardHeader className="px-4 md:px-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base md:text-lg">
                      Top 5 Criterios con Más No Conformidades{filterDescription}
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Criterios que fallan con mayor frecuencia en las inspecciones
                    </CardDescription>
                  </div>
                  <ChartDownloadButton chartRef={topCriteriaChartRef} fileName="top-criterios" />
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  <div ref={topCriteriaChartRef} className="overflow-x-auto">
                    <div className="h-[300px] md:h-[350px]" style={{ minWidth: "600px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCriteriaData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis
                            dataKey="criterio"
                            type="category"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            width={200}
                          />
                          <Tooltip />
                          <Bar dataKey="hallazgos" fill="hsl(0, 72%, 51%)" name="Hallazgos">
                            <LabelList
                              dataKey="hallazgos"
                              position="right"
                              style={{ fontSize: 12, fontWeight: "bold", fill: "hsl(var(--foreground))" }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {areaComparisonData.length >= 2 && areaNames.length > 1 && filterArea === "all" && (
              <Card>
                <CardHeader className="px-4 md:px-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base md:text-lg">
                      Comparación de Conformidad entre Áreas{filterDescription}
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Desempeño comparativo de diferentes áreas a lo largo del tiempo
                    </CardDescription>
                  </div>
                  <ChartDownloadButton chartRef={areaComparisonChartRef} fileName="comparacion-areas" />
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  <div ref={areaComparisonChartRef} className="overflow-x-auto">
                    <div className="h-[350px] md:h-[400px]" style={{ minWidth: "600px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={areaComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                            domain={[0, 100]}
                            label={{ value: "% Conformidad", angle: -90, position: "insideLeft" }}
                          />
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="line" />
                          {areaNames.map((areaName, idx) => (
                            <Line
                              key={areaName}
                              type="monotone"
                              dataKey={areaName}
                              stroke={areaColors[idx % areaColors.length]}
                              strokeWidth={2}
                              name={areaName}
                              dot={{ fill: areaColors[idx % areaColors.length], r: 4 }}
                              connectNulls
                            >
                              <LabelList
                                dataKey={areaName}
                                position="top"
                                formatter={(value: number) => (value ? `${value}%` : "")}
                                style={{ fontSize: 11, fontWeight: "bold", fill: "hsl(var(--foreground))" }}
                              />
                            </Line>
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </>
  )
}
