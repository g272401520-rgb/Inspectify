"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileText, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getInspectionByIdAction, getAreasAction, getChecklistsAction } from "@/lib/actions"
import type { Inspection, Area, Checklist } from "@/lib/types"
import { calculateInspectionStats } from "@/lib/utils-inspection"
import { ChartDownloadButton } from "@/components/chart-download-button"
import { generateInspectionPDF } from "@/lib/pdf-generator"
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  LabelList,
  Tooltip,
  Legend,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import Link from "next/link"
import JSZip from "jszip"
import { useToast } from "@/hooks/use-toast"

const CustomizedAxisTick = ({ x, y, payload, maxCharsPerLine = 25, maxLines = 3 }) => {
  const label = payload.value
  const words = label.split(" ")
  const lines = []
  let currentLine = ""

  // Agrupar palabras en líneas sin exceder maxCharsPerLine
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word

    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine
    } else {
      // Si la palabra sola es más larga que maxCharsPerLine, la agregamos de todos modos
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        lines.push(word)
        currentLine = ""
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  // Limitar al número máximo de líneas
  const finalLines = lines.slice(0, maxLines)
  const hasMore = lines.length > maxLines

  return (
    <g transform={`translate(${x},${y})`}>
      {finalLines.map((line, index) => (
        <text
          key={index}
          x={0}
          y={0}
          dy={index * 14 - ((finalLines.length - 1) * 14) / 2}
          textAnchor="end"
          fill="hsl(var(--muted-foreground))"
          style={{ fontSize: "12px" }}
        >
          {line}
        </text>
      ))}
      {hasMore && (
        <text
          x={0}
          y={0}
          dy={finalLines.length * 14 - ((finalLines.length - 1) * 14) / 2}
          textAnchor="end"
          fill="hsl(var(--muted-foreground))"
          style={{ fontSize: "12px" }}
        >
          ...
        </text>
      )}
    </g>
  )
}

const COLORS = {
  conforme: "#22c55e", // Verde brillante
  "no-conforme": "#ef4444", // Rojo brillante
  pendiente: "#f97316", // Naranja brillante
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const inspectionId = params.inspectionId as string
  const { toast } = useToast()

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [area, setArea] = useState<Area | null>(null)
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDownloadingZip, setIsDownloadingZip] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const pieChartRef = useRef<HTMLDivElement>(null)
  const barChartRef = useRef<HTMLDivElement>(null)
  const complianceChartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [foundInspection, areas, checklists] = await Promise.all([
          getInspectionByIdAction(inspectionId),
          getAreasAction(),
          getChecklistsAction(),
        ])

        if (!foundInspection) {
          setError("No se encontró la inspección")
          setIsLoading(false)
          return
        }

        const foundArea = areas.find((a) => a.id === foundInspection.areaId)
        const foundChecklist = checklists.find((c) => c.id === foundInspection.checklistId)

        if (!foundArea || !foundChecklist) {
          setError("No se encontraron los datos del área o checklist")
          setIsLoading(false)
          return
        }

        setInspection(foundInspection)
        setArea(foundArea)
        setChecklist(foundChecklist)
        setIsLoading(false)
      } catch (error) {
        console.error("[v0] Error loading inspection data:", error)
        setError(
          "Error al cargar los datos de la inspección. Por favor, verifica que Supabase esté configurado correctamente.",
        )
        setIsLoading(false)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos de la inspección",
          variant: "destructive",
        })
      }
    }

    loadData()
  }, [inspectionId, router, toast])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando resultados...</p>
        </div>
      </div>
    )
  }

  if (error || !inspection || !area || !checklist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error || "No se pudieron cargar los datos"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Posibles causas:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Las tablas de Supabase no están creadas</li>
              <li>La inspección no existe</li>
              <li>Problemas de conexión con la base de datos</li>
            </ul>
            <div className="flex gap-2">
              <Button onClick={() => router.push("/")} variant="outline" className="flex-1">
                Volver al inicio
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const safeInspection = {
    ...inspection,
    findings: inspection.findings || [],
  }

  const safeChecklist = {
    ...checklist,
    items: checklist.items || [],
  }

  const stats = calculateInspectionStats(safeInspection, safeChecklist)

  const compliancePercentage =
    stats.totalCriteria > 0 ? ((stats.totalCriteria - stats.totalFindings) / stats.totalCriteria) * 100 : 100

  const getComplianceColor = (percentage: number) => {
    if (percentage < 50) return "text-red-500"
    if (percentage <= 75) return "text-yellow-500"
    return "text-green-500"
  }

  const isRegistroChecklist = checklist.type === "registro"

  const registroTableData = isRegistroChecklist
    ? (safeChecklist.items || []).map((item) => {
        const finding = safeInspection.findings.find((f) => f.itemId === item.id)
        // Si hay un finding, verificar su status; si no hay finding, es Conforme
        const estado = finding?.status === "no-conforme" ? "No Conforme" : "Conforme"
        return {
          nombre: item.criterion,
          estado: estado,
          itemId: item.id,
          finding: finding,
        }
      })
    : []

  const allCategories = Array.from(new Set((safeChecklist.items || []).map((item) => item.category)))

  const categoryComparisonData = allCategories
    .map((category) => {
      const totalInCategory = safeChecklist.items.filter((item) => item.category === category).length
      const findings = stats.findingsByCategory[category] || 0
      const conforme = totalInCategory - findings
      return {
        category: category.length > 20 ? category.substring(0, 20) + "..." : category,
        fullCategory: category,
        Conformidades: conforme,
        "No Conformidades": findings,
      }
    })
    .sort((a, b) => b["No Conformidades"] - a["No Conformidades"])

  const conformeCount = stats.totalCriteria - stats.totalFindings
  const donutData = [
    {
      name: "Conforme",
      value: conformeCount,
      fill: "#22c55e", // Verde brillante - igual que en el PDF
    },
    {
      name: "No Conforme",
      value: stats.totalFindings,
      fill: "#ef4444", // Rojo - igual que en el PDF
    },
  ]

  const statusData = [
    {
      name: "Conforme",
      value: conformeCount,
      color: COLORS.conforme,
      percentage: (conformeCount / stats.totalCriteria) * 100,
    },
    {
      name: "No Conforme",
      value: stats.totalFindings,
      color: COLORS["no-conforme"],
      percentage: (stats.totalFindings / stats.totalCriteria) * 100,
    },
  ].filter((item) => item.value > 0)

  const complianceByCategory = allCategories
    .map((category) => {
      const totalInCategory = safeChecklist.items.filter((item) => item.category === category).length
      const findings = stats.findingsByCategory[category] || 0
      const compliance = totalInCategory > 0 ? ((totalInCategory - findings) / totalInCategory) * 100 : 100
      return {
        category: category.length > 20 ? category.substring(0, 20) + "..." : category,
        cumplimiento: Math.round(compliance),
        fullCategory: category,
      }
    })
    .sort((a, b) => a.cumplimiento - b.cumplimiento)

  const handleDownloadZip = async () => {
    if (!inspection || !area || !checklist) return

    setIsDownloadingZip(true)

    try {
      const zip = new JSZip()

      const dateStr = new Date(inspection.date).toLocaleDateString("es-ES").replace(/\//g, "-")
      const zipFileName = `${dateStr}.${checklist.name}`

      const rootFolder = zip.folder(zipFileName)
      if (!rootFolder) return

      let hasEvidences = false
      let processedPhotos = 0
      let failedPhotos = 0

      // Agrupar items por categoría
      const itemsByCategory = new Map<string, typeof checklist.items>()
      for (const item of checklist.items) {
        if (!itemsByCategory.has(item.category)) {
          itemsByCategory.set(item.category, [])
        }
        itemsByCategory.get(item.category)!.push(item)
      }

      // Iterar por cada categoría
      for (const [category, items] of itemsByCategory) {
        const categoryFolder = rootFolder.folder(category)
        if (!categoryFolder) continue

        // Iterar por cada criterio en la categoría
        for (const item of items) {
          const finding = inspection.findings.find((f) => f.itemId === item.id)

          // Solo procesar si hay fotos
          if (finding && finding.photos && finding.photos.length > 0) {
            hasEvidences = true

            const criterioFolder = categoryFolder.folder(item.criterion)
            if (!criterioFolder) continue

            for (let i = 0; i < finding.photos.length; i++) {
              const photoUrl = finding.photos[i]

              try {
                let blob: Blob

                // Procesar data URL (base64)
                if (photoUrl.startsWith("data:")) {
                  // Extraer el tipo MIME y los datos base64
                  const matches = photoUrl.match(/^data:([^;]+);base64,(.+)$/)
                  if (matches) {
                    const mimeType = matches[1]
                    const base64Data = matches[2]

                    // Convertir base64 a blob directamente
                    const byteCharacters = atob(base64Data)
                    const byteNumbers = new Array(byteCharacters.length)
                    for (let j = 0; j < byteCharacters.length; j++) {
                      byteNumbers[j] = byteCharacters.charCodeAt(j)
                    }
                    const byteArray = new Uint8Array(byteNumbers)
                    blob = new Blob([byteArray], { type: mimeType })
                  } else {
                    // Fallback: usar fetch si el formato no coincide
                    const response = await fetch(photoUrl)
                    blob = await response.blob()
                  }
                } else {
                  // Procesar URL externa
                  const response = await fetch(photoUrl)
                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                  }
                  blob = await response.blob()
                }

                // Determinar la extensión del archivo
                const mimeType = blob.type
                let extension = "jpg"
                if (mimeType.includes("png")) extension = "png"
                else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg"
                else if (mimeType.includes("webp")) extension = "webp"

                const fileName = `foto_${i + 1}.${extension}`
                criterioFolder.file(fileName, blob, { binary: true })
                processedPhotos++

                console.log(`[v0] Foto procesada exitosamente: ${item.criterion} - ${fileName}`)
              } catch (error) {
                failedPhotos++
                console.error(`[v0] Error al procesar foto ${i + 1} del criterio "${item.criterion}":`, error)
              }
            }
          }
        }
      }

      if (!hasEvidences) {
        toast({
          title: "Sin evidencias",
          description: "No hay evidencias fotográficas para descargar en esta inspección.",
          variant: "destructive",
        })
        return
      }

      console.log(`[v0] Resumen: ${processedPhotos} fotos procesadas, ${failedPhotos} fallidas`)

      // Generar el ZIP
      const content = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      })

      // Crear enlace de descarga
      const url = URL.createObjectURL(content)
      const link = document.createElement("a")
      link.href = url
      link.download = `${zipFileName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "ZIP descargado",
        description: `Se descargaron ${processedPhotos} fotos correctamente${failedPhotos > 0 ? `. ${failedPhotos} fotos no pudieron ser procesadas.` : "."}`,
      })
    } catch (error) {
      console.error("[v0] Error al generar ZIP:", error)
      toast({
        title: "Error",
        description: "Error al generar el archivo ZIP. Por favor, intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsDownloadingZip(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!inspection || !area || !checklist) {
      toast({
        title: "Error",
        description: "Faltan datos necesarios para generar el informe",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingPDF(true)
    try {
      console.log("[v0] Iniciando generación de PDF desde pantalla de resultados...")
      await generateInspectionPDF(inspection, area, checklist)
      console.log("[v0] PDF generado exitosamente")

      toast({
        title: "PDF generado",
        description: "El informe PDF ha sido descargado correctamente",
      })
    } catch (error) {
      console.error("[v0] Error al generar PDF:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el PDF",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleDownloadRegistrosZip = async () => {
    if (!inspection || !area || !checklist) return

    setIsDownloadingZip(true)

    try {
      const zip = new JSZip()

      const dateStr = new Date(inspection.date).toLocaleDateString("es-ES").replace(/\//g, "-")
      const zipFileName = `${checklist.name}.${dateStr}`

      // Crear carpeta raíz
      const rootFolder = zip.folder(zipFileName)
      if (!rootFolder) return

      let hasEvidences = false
      let processedPhotos = 0
      let failedPhotos = 0

      // Iterar sobre cada registro
      for (const registro of registroTableData) {
        if (registro.finding && registro.finding.photos && registro.finding.photos.length > 0) {
          hasEvidences = true

          // Crear carpeta para este registro
          const registroFolder = rootFolder.folder(registro.nombre)
          if (!registroFolder) continue

          // Determinar si es hallazgo (no conforme) o evidencia normal
          const isHallazgo = registro.finding.status === "no-conforme"
          const targetFolder = isHallazgo ? registroFolder.folder("Hallazgos") : registroFolder.folder("Evidencias")

          if (!targetFolder) continue

          for (let i = 0; i < registro.finding.photos.length; i++) {
            const photoUrl = registro.finding.photos[i]

            try {
              let blob: Blob

              // Procesar data URL (base64)
              if (photoUrl.startsWith("data:")) {
                // Extraer el tipo MIME y los datos base64
                const matches = photoUrl.match(/^data:([^;]+);base64,(.+)$/)
                if (matches) {
                  const mimeType = matches[1]
                  const base64Data = matches[2]

                  // Convertir base64 a blob directamente
                  const byteCharacters = atob(base64Data)
                  const byteNumbers = new Array(byteCharacters.length)
                  for (let j = 0; j < byteCharacters.length; j++) {
                    byteNumbers[j] = byteCharacters.charCodeAt(j)
                  }
                  const byteArray = new Uint8Array(byteNumbers)
                  blob = new Blob([byteArray], { type: mimeType })
                } else {
                  // Fallback: usar fetch si el formato no coincide
                  const response = await fetch(photoUrl)
                  blob = await response.blob()
                }
              } else {
                // Procesar URL externa
                const response = await fetch(photoUrl)
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`)
                }
                blob = await response.blob()
              }

              // Determinar la extensión del archivo
              const mimeType = blob.type
              let extension = "jpg"
              if (mimeType.includes("png")) extension = "png"
              else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg"
              else if (mimeType.includes("webp")) extension = "webp"

              const fileName = `evidencia_${i + 1}.${extension}`
              targetFolder.file(fileName, blob, { binary: true })
              processedPhotos++

              console.log(`[v0] Foto procesada exitosamente: ${registro.nombre} - ${fileName}`)
            } catch (error) {
              failedPhotos++
              console.error(`[v0] Error al procesar foto ${i + 1} del registro "${registro.nombre}":`, error)
            }
          }
        }
      }

      if (!hasEvidences) {
        toast({
          title: "Sin evidencias",
          description: "No hay evidencias fotográficas para descargar en este checklist de registros.",
          variant: "destructive",
        })
        return
      }

      console.log(`[v0] Resumen: ${processedPhotos} fotos procesadas, ${failedPhotos} fallidas`)

      // Generar el ZIP
      const content = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      })

      // Crear enlace de descarga
      const url = URL.createObjectURL(content)
      const link = document.createElement("a")
      link.href = url
      link.download = `${zipFileName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "ZIP descargado",
        description: `Se descargaron ${processedPhotos} fotos correctamente${failedPhotos > 0 ? `. ${failedPhotos} fotos no pudieron ser procesadas.` : "."}`,
      })
    } catch (error) {
      console.error("[v0] Error al generar ZIP:", error)
      toast({
        title: "Error",
        description: "Error al generar el archivo ZIP. Por favor, intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsDownloadingZip(false)
    }
  }

  const registroRadialData = isRegistroChecklist
    ? [
        {
          name: checklist.name,
          cumplimiento: Math.round(compliancePercentage),
          fill: "#84BF2C",
        },
      ]
    : []

  const registroDonutData = isRegistroChecklist
    ? [
        {
          name: "Conforme",
          value: conformeCount,
          fill: "#22c55e",
        },
        {
          name: "No Conforme",
          value: stats.totalFindings,
          fill: "#ef4444",
        },
      ]
    : []

  const registroStatusData = isRegistroChecklist
    ? [
        {
          name: "Conforme",
          value: conformeCount,
          color: COLORS.conforme,
          percentage: (conformeCount / stats.totalCriteria) * 100,
        },
        {
          name: "No Conforme",
          value: stats.totalFindings,
          color: COLORS["no-conforme"],
          percentage: (stats.totalFindings / stats.totalCriteria) * 100,
        },
      ].filter((item) => item.value > 0)
    : []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-[#054078]">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <Link href="/historial">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 bg-white text-[#054078] hover:bg-white/90">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-white truncate">Resultados</h1>
                <p className="text-xs md:text-sm text-white/80 truncate">
                  {area.name} • {checklist.name}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={isRegistroChecklist ? handleDownloadRegistrosZip : handleDownloadZip}
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 bg-white text-[#054078] hover:bg-white/90"
                title="Descargar Evidencias"
                disabled={isDownloadingZip}
              >
                {isDownloadingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 bg-white text-[#054078] hover:bg-white/90"
                title="Generar Informe PDF"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Inspection Details */}
        <Card className="mb-6 md:mb-8">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-base md:text-lg">Detalles de la Inspección</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Inspector</p>
                <p className="text-foreground font-medium">{inspection.inspectorName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="text-foreground font-medium">
                  {new Date(inspection.date).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Área</p>
                <p className="text-foreground font-medium">{area.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Checklist</p>
                <p className="text-foreground font-medium">{checklist.name}</p>
              </div>
              {area.responsible && (
                <div>
                  <p className="text-sm text-muted-foreground">Responsable del Área</p>
                  <p className="text-foreground font-medium">{area.responsible}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
          <Card className="border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground mb-2">Porcentaje de Cumplimiento</CardTitle>
              <div className={`text-4xl font-bold ${getComplianceColor(compliancePercentage)}`}>
                {compliancePercentage.toFixed(1)}%
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {stats.totalCriteria - stats.totalFindings} de {stats.totalCriteria}{" "}
                {isRegistroChecklist ? "registros" : "criterios"} conformes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground mb-2">
                {isRegistroChecklist ? "Total Registros" : "Total Criterios"}
              </CardTitle>
              <div className="text-4xl font-bold text-foreground">{stats.totalCriteria}</div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {isRegistroChecklist ? "Registros inspeccionados" : "Criterios inspeccionados"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground mb-2">
                {isRegistroChecklist ? "Registros No Conformes" : "Hallazgos No Conformes"}
              </CardTitle>
              <div className="text-4xl font-bold text-red-500">{stats.totalFindings}</div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {isRegistroChecklist ? "Registros inspeccionados" : "Criterios inspeccionados"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground mb-2">Categorías Evaluadas</CardTitle>
              <div className="text-4xl font-bold text-foreground">{Object.keys(stats.findingsByCategory).length}</div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Áreas de inspección</p>
            </CardContent>
          </Card>
        </div>

        {isRegistroChecklist && (
          <Card className="mb-6 md:mb-8">
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="text-base md:text-lg">Estado de Registros</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Lista completa de registros inspeccionados
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 md:px-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 md:p-3 font-semibold text-foreground text-xs md:text-sm">
                        Nombre del Registro
                      </th>
                      <th className="text-center p-2 md:p-3 font-semibold text-foreground w-32 md:w-40 text-xs md:text-sm">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {registroTableData.map((registro, index) => (
                      <tr key={index} className="border-b border-border hover:bg-accent/5">
                        <td className="p-2 md:p-3 text-foreground text-xs md:text-sm">{registro.nombre}</td>
                        <td className="p-2 md:p-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-medium ${
                              registro.estado === "Conforme"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {registro.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="space-y-6 md:space-y-8 mb-6 md:mb-8">
          {/* 1. Distribución de Estados */}
          {!isRegistroChecklist && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base md:text-lg">Resumen de Cumplimiento</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Distribución de estados de evaluación
                  </CardDescription>
                </div>
                <ChartDownloadButton chartRef={pieChartRef} fileName="resumen-cumplimiento" />
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <div ref={pieChartRef} className="space-y-4 w-full" data-chart-id="resumen-cumplimiento">
                    <div className="w-full h-[280px] md:h-[350px] flex items-center justify-center">
                      <ChartContainer
                        config={{
                          conforme: {
                            label: "Conforme",
                            color: "#22c55e",
                          },
                          noConforme: {
                            label: "No Conforme",
                            color: "#ef4444",
                          },
                        }}
                        className="h-full w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={85}
                              startAngle={90}
                              endAngle={450}
                              dataKey="value"
                              stroke="none"
                            >
                              {donutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <text 
                              x="50%" 
                              y="50%" 
                              textAnchor="middle" 
                              dominantBaseline="middle" 
                              className="text-3xl md:text-4xl font-bold fill-[#22c55e]"
                            >
                              {Math.round(compliancePercentage)}%
                            </text>
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {statusData.map((item) => (
                        <div key={item.name} className="flex items-center gap-3 p-2 bg-background rounded-lg border">
                          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.value} {item.value === 1 ? "criterio" : "criterios"} ({item.percentage.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No hay datos disponibles
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 2. Hallazgos por Categoría - Gráfico de barras verticales */}
          {!isRegistroChecklist && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Hallazgos por Categoría</CardTitle>
                  <CardDescription>Comparación de conformidades vs no conformidades</CardDescription>
                </div>
                <ChartDownloadButton chartRef={barChartRef} fileName="hallazgos-categoria" />
              </CardHeader>
              <CardContent className="pt-6 px-2 md:px-6">
                {categoryComparisonData.length > 0 ? (
                  <div ref={barChartRef} className="w-full overflow-x-auto -mx-2 md:mx-0">
                    <div style={{ minWidth: "600px" }} className="px-2 md:px-0">
                      <ChartContainer
                        config={{
                          Conformidades: {
                            label: "Conformidades",
                            color: "#22c55e",
                          },
                          "No Conformidades": {
                            label: "No Conformidades",
                            color: "#ef4444",
                          },
                        }}
                        className="h-[500px] md:h-[600px] w-full"
                        data-chart-id="hallazgos-categoria"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={categoryComparisonData} 
                            margin={{ top: 20, right: 30, bottom: 140, left: 50 }}
                          >
                            <XAxis
                              dataKey="category"
                              angle={-40}
                              textAnchor="end"
                              height={110}
                              interval={0}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                              tickMargin={8}
                            />
                            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "6px",
                              }}
                              cursor={{ fill: "rgba(0,0,0,0.05)" }}
                            />
                            <Bar dataKey="Conformidades" fill="#22c55e" radius={[4, 4, 0, 0]}>
                              <LabelList
                                dataKey="Conformidades"
                                position="top"
                                fill="hsl(var(--foreground))"
                                style={{ fontWeight: "bold", fontSize: "12px" }}
                              />
                            </Bar>
                            <Bar dataKey="No Conformidades" fill="#ef4444" radius={[4, 4, 0, 0]}>
                              <LabelList
                                dataKey="No Conformidades"
                                position="top"
                                fill="hsl(var(--foreground))"
                                style={{ fontWeight: "bold", fontSize: "12px" }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>

                    {/* Leyenda en formato de cards */}
                    <div className="flex flex-col md:grid md:grid-cols-2 gap-2 md:gap-3 mt-4 pt-3 border-t">
                      {[
                        { label: "Conformidades", color: "#22c55e" },
                        { label: "No Conformidades", color: "#ef4444" }
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2 p-2 md:p-3 bg-background border rounded-lg">
                          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs md:text-sm font-medium text-foreground">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No hay hallazgos registrados
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 3. Registros chart for registro checklists */}
          {isRegistroChecklist && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base md:text-lg">Registros</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Cumplimiento porcentual por checklist (Promedio: {Math.round(compliancePercentage)}%)
                  </CardDescription>
                </div>
                <ChartDownloadButton chartRef={pieChartRef} fileName="registros" />
              </CardHeader>
              <CardContent>
                <div ref={pieChartRef} className="overflow-x-auto">
                  <div className="flex flex-col items-center justify-center space-y-6" style={{ minWidth: "300px" }}>
                    <ChartContainer
                      config={{
                        conforme: {
                          label: "Conforme",
                          color: "#22c55e",
                        },
                        noConforme: {
                          label: "No Conforme",
                          color: "#ef4444",
                        },
                      }}
                      className="h-[300px] w-full max-w-[400px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={registroDonutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                            stroke="none"
                          >
                            {registroDonutData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <text
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-foreground font-bold"
                            style={{ fontSize: "48px" }}
                          >
                            {Math.round(compliancePercentage)}%
                          </text>
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    <div className="space-y-2 w-full max-w-[400px]">
                      {registroStatusData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-semibold text-foreground">{item.name}</span>
                          </div>
                          <span className="text-sm font-bold text-foreground">
                            {item.value} ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cumplimiento por Categoría */}
          {!isRegistroChecklist && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6">
                <div>
                  <CardTitle className="text-base md:text-lg">Cumplimiento por Categoría</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Porcentaje de conformidad en cada área evaluada
                  </CardDescription>
                </div>
                <ChartDownloadButton chartRef={complianceChartRef} fileName="cumplimiento-categoria" />
              </CardHeader>
              <CardContent className="pt-6 px-2 md:px-6">
                {complianceByCategory.length > 0 ? (
                  <div ref={complianceChartRef} className="w-full overflow-x-auto -mx-2 md:mx-0 flex justify-center">
                    <div style={{ minWidth: "700px" }} className="px-2 md:px-0 md:w-full">
                      <ChartContainer
                        config={{
                          cumplimiento: {
                            label: "Cumplimiento %",
                            color: "#84BF2C",
                          },
                        }}
                        className="w-full"
                        style={{ height: `${Math.max(400, complianceByCategory.length * 40)}px` }}
                        data-chart-id="cumplimiento-categoria"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={complianceByCategory}
                            layout="vertical"
                            margin={{ left: 160, right: 50, top: 15, bottom: 15 }}
                          >
                            <XAxis
                              type="number"
                              domain={[0, 100]}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                              tickFormatter={(value) => `${value}%`}
                            />
                            <YAxis
                              type="category"
                              dataKey="fullCategory"
                              tick={<CustomizedAxisTick maxCharsPerLine={16} maxLines={2} fontSize={13} />}
                              width={145}
                              interval={0}
                            />
                            <Tooltip
                              formatter={(value: number) => [`${value}%`, "Cumplimiento"]}
                              labelFormatter={(label) => label}
                              contentStyle={{
                                backgroundColor: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "6px",
                              }}
                            />
                            <Bar dataKey="cumplimiento" fill="#84BF2C" radius={[0, 4, 4, 0]}>
                              <LabelList
                                dataKey="cumplimiento"
                                position="right"
                                fill="hsl(var(--foreground))"
                                formatter={(value: number) => `${value}%`}
                                style={{ fontWeight: "bold", fontSize: "12px" }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No hay datos disponibles
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detalles por Categoría */}
          {!isRegistroChecklist && (
            <Card className="mb-6 md:mb-8">
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-base md:text-lg">Detalles por Categoría</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Resumen detallado de cada área evaluada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
                {allCategories.map((category) => {
                  const totalInCategory = safeChecklist.items.filter((item) => item.category === category).length
                  const findings = stats.findingsByCategory[category] || 0
                  const compliance = totalInCategory > 0 ? ((totalInCategory - findings) / totalInCategory) * 100 : 100

                  return (
                    <div key={category} className="border border-border rounded-lg p-3 md:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-foreground text-sm md:text-base truncate flex-1 mr-2">
                          {category}
                        </h3>
                        <span className="text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">
                          {totalInCategory - findings}/{totalInCategory} conformes
                        </span>
                      </div>
                      <Progress value={compliance} className="h-2 mb-2" />
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <span className="text-muted-foreground">{findings} hallazgos encontrados</span>
                        <span className="font-semibold text-accent">{compliance.toFixed(1)}% cumplimiento</span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
