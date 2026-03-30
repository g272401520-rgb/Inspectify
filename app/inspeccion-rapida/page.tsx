"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, ArrowRight, Camera, X, Download, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import Link from "next/link"
import { AppLogo } from "@/components/app-logo"
import { useToast } from "@/hooks/use-toast"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { ChartDownloadButton } from "@/components/chart-download-button"
import JSZip from "jszip"
import { PhotoEditor } from "@/components/photo-editor"
import { compressImage } from "@/lib/image-compression"
import { generateQuickInspectionPDF } from "@/lib/pdf-generator"

interface QuickPhoto {
  id: string
  dataUrl: string
  type: "hallazgo" | "evidencia"
  description: string
  hallazgoId?: string
}

interface HallazgoDescription {
  [hallazgoId: string]: string
}

/**
 * INSPECCIÓN RÁPIDA - Página Principal
 * 
 * ⚠️ CLARIFICACIÓN IMPORTANTE:
 * 
 * 1. SIN GENERACIÓN AUTOMÁTICA DE PDF
 *    - Este componente NUNCA genera automáticamente un PDF
 *    - PDF solo se genera si el usuario hace clic en "Generar PDF"
 * 
 * 2. FUNCIONALIDAD COMPLETAMENTE OFFLINE
 *    - Todos los datos se guardan en IndexedDB (navegador local)
 *    - NO requiere conexión a Internet
 *    - Perfecto para inspecciones en sitios remotos sin WiFi
 *    - Fotos se capturan, comprimen y almacenan localmente
 *    - PDF y ZIP se generan en el navegador (sin servidor)
 * 
 * PROCESO:
 * 1. Pantalla 1: Usuario ingresa lugar, inspector, responsable
 * 2. Pantalla 2: Usuario captura fotos y las clasifica (Hallazgo/Evidencia)
 * 3. Almacenamiento: Datos en IndexedDB (temporal, sesión actual)
 * 4. Generación Manual: PDF/ZIP solo cuando usuario lo solicita
 * 5. Descarga: Archivos se descargan directamente del navegador
 * 
 * ⚠️ NOTA IMPORTANTE: Los datos se PIERDEN al cerrar pestaña/navegador
 *    (Por diseño - inspección rápida es para uso temporal)
 *    Descarga PDF/ZIP antes de cerrar si necesitas guardar
 * 
 * DIFERENCIA CON INSPECCIÓN NORMAL:
 * - Inspección Rápida: Offline, sin persistencia, fotos por hallazgo
 * - Inspección Normal: Online, persistente, fotos por criterio
 */
export default function InspeccionRapidaPage() {
  const { toast } = useToast()
  const [lugar, setLugar] = useState("")
  const [inspector, setInspector] = useState("")
  const [responsable, setResponsable] = useState("")
  const [photos, setPhotos] = useState<QuickPhoto[]>([])
  const [hallazgoDescriptions, setHallazgoDescriptions] = useState<HallazgoDescription>({})
  const [selectedHallazgoId, setSelectedHallazgoId] = useState<string | null>(null)
  const [showPhotoEditor, setShowPhotoEditor] = useState(false)
  const [currentPhotoForEdit, setCurrentPhotoForEdit] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isDownloadingZip, setIsDownloadingZip] = useState(false)
  const [showPDFConfirm, setShowPDFConfirm] = useState(false)
  const [showZipConfirm, setShowZipConfirm] = useState(false)
  const [showEditConfirmDialog, setShowEditConfirmDialog] = useState(false)
  const [pendingPhotoDataUrl, setPendingPhotoDataUrl] = useState<string | null>(null)
  const [pendingPhotoIsCamera, setPendingPhotoIsCamera] = useState(false)
  const [showClassificationDialog, setShowClassificationDialog] = useState(false)
  const [selectedHallazgoGroupForPhoto, setSelectedHallazgoGroupForPhoto] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  const pieChartRef = useRef<HTMLDivElement>(null)

  // Inicializar IndexedDB
  const initDB = async () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("InspectifyDB", 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains("fotos")) {
          db.createObjectStore("fotos", { keyPath: "id" })
        }
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" })
        }
      }
    })
  }

  // Cargar datos guardados al montar
  useEffect(() => {
    const loadData = async () => {
      try {
        const db = await initDB()
        
        // Cargar metadata con Promise
        const metaPromise = new Promise<Record<string, unknown>>((resolve) => {
          const metaTx = db.transaction("metadata", "readonly")
          const metaStore = metaTx.objectStore("metadata")
          const metaRequest = metaStore.get("inspeccionData")
          
          metaRequest.onsuccess = () => {
            resolve(metaRequest.result?.value || {})
          }
          metaRequest.onerror = () => {
            console.error("[v0] Error al cargar metadata:", metaRequest.error)
            resolve({})
          }
        })

        // Cargar fotos con Promise
        const photoPromise = new Promise<QuickPhoto[]>((resolve) => {
          const photoTx = db.transaction("fotos", "readonly")
          const photoStore = photoTx.objectStore("fotos")
          const photoRequest = photoStore.getAll()
          
          photoRequest.onsuccess = () => {
            const photos = photoRequest.result as QuickPhoto[]
            console.log("[v0] Fotos cargadas de IndexedDB:", photos.length)
            resolve(photos)
          }
          photoRequest.onerror = () => {
            console.error("[v0] Error al cargar fotos:", photoRequest.error)
            resolve([])
          }
        })

        // Esperar a que ambas promesas terminen
        const [metaData, loadedPhotos] = await Promise.all([metaPromise, photoPromise])
        
        if (metaData) {
          setLugar((metaData.lugar as string) || "")
          setInspector((metaData.inspector as string) || "")
          setResponsable((metaData.responsable as string) || "")
          setHallazgoDescriptions((metaData.hallazgoDescriptions as Record<string, string>) || {})
        }
        
        if (loadedPhotos && loadedPhotos.length > 0) {
          setPhotos(loadedPhotos)
        }
      } catch (error) {
        console.error("[v0] Error al cargar datos de IndexedDB:", error)
        // Fallback a localStorage
        const savedData = localStorage.getItem("inspeccionRapidaData")
        if (savedData) {
          try {
            const data = JSON.parse(savedData)
            setLugar(data.lugar || "")
            setInspector(data.inspector || "")
            setResponsable(data.responsable || "")
            setPhotos(data.photos || [])
            setHallazgoDescriptions(data.hallazgoDescriptions || {})
          } catch (e) {
            console.error("[v0] Error al cargar fallback localStorage:", e)
          }
        }
      }
    }
    
    loadData()
  }, [])

  // Guardar datos cada vez que cambien
  useEffect(() => {
    const saveData = async () => {
      try {
        const db = await initDB()
        
        // Guardar metadata
        const metaPromise = new Promise<void>((resolve, reject) => {
          const metaTx = db.transaction("metadata", "readwrite")
          const metaStore = metaTx.objectStore("metadata")
          const metaRequest = metaStore.put({
            key: "inspeccionData",
            value: {
              lugar,
              inspector,
              responsable,
              hallazgoDescriptions,
            }
          })
          metaTx.oncomplete = () => resolve()
          metaTx.onerror = () => reject(metaTx.error)
        })

        // Guardar fotos en IndexedDB
        const photoPromise = new Promise<void>((resolve, reject) => {
          const photoTx = db.transaction("fotos", "readwrite")
          const photoStore = photoTx.objectStore("fotos")
          
          // Primero limpiar, luego guardar cada foto
          const clearReq = photoStore.clear()
          clearReq.onsuccess = () => {
            photos.forEach(photo => {
              photoStore.put(photo)
            })
          }
          
          photoTx.oncomplete = () => {
            console.log("[v0] Fotos guardadas en IndexedDB:", photos.length)
            resolve()
          }
          photoTx.onerror = () => reject(photoTx.error)
        })

        // Esperar a que ambas transacciones terminen
        await Promise.all([metaPromise, photoPromise])
      } catch (error) {
        console.error("[v0] Error al guardar en IndexedDB:", error)
        // Fallback: guardar solo metadata en localStorage
        localStorage.setItem("inspeccionRapidaData", JSON.stringify({
          lugar,
          inspector,
          responsable,
          hallazgoDescriptions,
          photoCount: photos.length
        }))
      }
    }
    
    saveData()
  }, [lugar, inspector, responsable, photos, hallazgoDescriptions])

  const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    try {
      // Comprimir imagen con calidad 0.65
      const compressedDataUrl = await compressImage(file, 1200, 1200, 0.65, 2)
      setPendingPhotoDataUrl(compressedDataUrl)
      setPendingPhotoIsCamera(true)
      setShowEditConfirmDialog(true)
    } catch (error) {
      console.error("[v0] Error al comprimir foto:", error)
      // Fallback: usar sin comprimir
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setPendingPhotoDataUrl(dataUrl)
        setPendingPhotoIsCamera(true)
        setShowEditConfirmDialog(true)
      }
      reader.readAsDataURL(file)
    }
    event.target.value = ""
  }

  const handlePhotoEdited = (editedDataUrl: string) => {
    // Mostrar diálogo de clasificación después de editar
    setPendingPhotoDataUrl(editedDataUrl)
    setShowPhotoEditor(false)
    setShowClassificationDialog(true)
  }

  const addPhotoWithClassification = (type: "hallazgo" | "evidencia") => {
    if (!pendingPhotoDataUrl) return

    let hallazgoId: string | undefined = undefined
    
    if (type === "hallazgo") {
      // Si se seleccionó un hallazgo existente, usar ese ID
      if (selectedHallazgoGroupForPhoto) {
        hallazgoId = selectedHallazgoGroupForPhoto
      } else {
        // Crear nuevo hallazgo
        hallazgoId = `hallazgo_${Date.now()}`
      }
    }

    const newPhoto: QuickPhoto = {
      id: `photo_${Date.now()}_${Math.random()}`,
      dataUrl: pendingPhotoDataUrl,
      type,
      description: "",
      hallazgoId,
    }

    setPhotos((prev) => [...prev, newPhoto])
    setPendingPhotoDataUrl(null)
    setShowEditConfirmDialog(false)
    setShowClassificationDialog(false)
    setSelectedHallazgoGroupForPhoto(null)

    toast({
      title: "Foto agregada",
      description: `Foto guardada como ${type === "hallazgo" ? "Hallazgo" : "Evidencia"}`,
    })
  }

  const handleOpenEditor = () => {
    if (!pendingPhotoDataUrl) return

    setCurrentPhotoForEdit(pendingPhotoDataUrl)
    setShowEditConfirmDialog(false)
    setShowPhotoEditor(true)
  }

  const handleUseOriginalPhoto = () => {
    // Mostrar diálogo de clasificación
    setShowEditConfirmDialog(false)
    setShowClassificationDialog(true)
  }

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  const handleToggleType = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          if (p.type === "evidencia") {
            return { ...p, type: "hallazgo" as const, hallazgoId: `hallazgo_${Date.now()}` }
          } else {
            return { ...p, type: "evidencia" as const, hallazgoId: undefined }
          }
        }
        return p
      }),
    )
  }

  const handleDescriptionChange = (photoId: string, description: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, description } : p)))
  }

  const handleHallazgoDescriptionChange = (hallazgoId: string, description: string) => {
    setHallazgoDescriptions((prev) => ({
      ...prev,
      [hallazgoId]: description,
    }))
  }

  const hallazgos = photos.filter((p) => p.type === "hallazgo")
  const evidencias = photos.filter((p) => p.type === "evidencia")
  const totalPhotos = photos.length
  const cumplimientoPercentage = totalPhotos > 0 ? (evidencias.length / totalPhotos) * 100 : 100

  const chartData = [
    {
      name: "Cumplimiento",
      value: evidencias.length,
      fill: "#22c55e",
    },
    {
      name: "No Cumplimiento",
      value: hallazgos.length,
      fill: "#ef4444",
    },
  ]

  const handleDownloadZip = async () => {
    if (photos.length === 0) {
      toast({
        title: "Sin fotos",
        description: "No hay fotos para descargar",
        variant: "destructive",
      })
      return
    }

    setIsDownloadingZip(true)

    try {
      const zip = new JSZip()
      const dateStr = new Date().toLocaleDateString("es-ES").replace(/\//g, "-")
      const zipFileName = `Inspeccion-Rapida_${lugar || "Sin-Lugar"}_${dateStr}`

      const rootFolder = zip.folder(zipFileName)
      if (!rootFolder) return

      // Carpeta de Hallazgos
      if (hallazgos.length > 0) {
        const hallazgosFolder = rootFolder.folder("Hallazgos")
        if (hallazgosFolder) {
          for (let i = 0; i < hallazgos.length; i++) {
            const photo = hallazgos[i]
            const matches = photo.dataUrl.match(/^data:([^;]+);base64,(.+)$/)
            if (matches) {
              const mimeType = matches[1]
              const base64Data = matches[2]
              const byteCharacters = atob(base64Data)
              const byteNumbers = new Array(byteCharacters.length)
              for (let j = 0; j < byteCharacters.length; j++) {
                byteNumbers[j] = byteCharacters.charCodeAt(j)
              }
              const byteArray = new Uint8Array(byteNumbers)
              const blob = new Blob([byteArray], { type: mimeType })

              let extension = "jpg"
              if (mimeType.includes("png")) extension = "png"
              else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg"
              else if (mimeType.includes("webp")) extension = "webp"

              hallazgosFolder.file(`hallazgo_${i + 1}.${extension}`, blob, { binary: true })
            }
          }
        }
      }

      // Carpeta de Evidencias
      if (evidencias.length > 0) {
        const evidenciasFolder = rootFolder.folder("Evidencias")
        if (evidenciasFolder) {
          for (let i = 0; i < evidencias.length; i++) {
            const photo = evidencias[i]
            const matches = photo.dataUrl.match(/^data:([^;]+);base64,(.+)$/)
            if (matches) {
              const mimeType = matches[1]
              const base64Data = matches[2]
              const byteCharacters = atob(base64Data)
              const byteNumbers = new Array(byteCharacters.length)
              for (let j = 0; j < byteCharacters.length; j++) {
                byteNumbers[j] = byteCharacters.charCodeAt(j)
              }
              const byteArray = new Uint8Array(byteNumbers)
              const blob = new Blob([byteArray], { type: mimeType })

              let extension = "jpg"
              if (mimeType.includes("png")) extension = "png"
              else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg"
              else if (mimeType.includes("webp")) extension = "webp"

              evidenciasFolder.file(`evidencia_${i + 1}.${extension}`, blob, { binary: true })
            }
          }
        }
      }

      const content = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      })

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
        description: `Se descargaron ${photos.length} fotos correctamente`,
      })
    } catch (error) {
      console.error("[v0] Error al generar ZIP:", error)
      toast({
        title: "Error",
        description: "Error al generar el archivo ZIP",
        variant: "destructive",
      })
    } finally {
      setIsDownloadingZip(false)
      setShowZipConfirm(false)
    }
  }

  /**
   * GENERACIÓN MANUAL DE PDF - Inspección Rápida
   * 
   * ⚠️ IMPORTANTE: Esta función SOLO se ejecuta cuando el usuario hace clic
   * explícitamente en "Generar PDF" desde el diálogo de confirmación.
   * 
   * NO HAY GENERACIÓN AUTOMÁTICA.
   * 
   * Proceso:
   * 1. Valida que lugar e inspector estén completos
   * 2. Agrupa hallazgos por hallazgoId
   * 3. Valida descripciones de hallazgos
   * 4. Llama a generateQuickInspectionPDF() del archivo pdf-generator.ts
   * 5. Limpia IndexedDB después de completar exitosamente
   */
  const handleGeneratePDF = async () => {
    console.log("[v0] handleGeneratePDF: Iniciando generación de PDF...")
    console.log("[v0] photos.length:", photos.length)
    console.log("[v0] hallazgos.length:", hallazgos.length)
    console.log("[v0] evidencias.length:", evidencias.length)
    
    if (!lugar || !inspector) {
      console.log("[v0] Validación fallida: lugar o inspector faltante")
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el lugar e inspector",
        variant: "destructive",
      })
      return
    }

    if (photos.length === 0) {
      console.log("[v0] No hay fotos para generar PDF")
      toast({
        title: "Sin fotos",
        description: "Por favor agrega fotos antes de generar el PDF",
        variant: "destructive",
      })
      return
    }

    // Agrupar hallazgos por hallazgoId
    const hallazgosGrouped = new Map<string, typeof photos>()
    hallazgos.forEach((h) => {
      const groupId = h.hallazgoId || h.id
      if (!hallazgosGrouped.has(groupId)) {
        hallazgosGrouped.set(groupId, [])
      }
      hallazgosGrouped.get(groupId)?.push(h)
    })

    console.log("[v0] hallazgosGrouped.size:", hallazgosGrouped.size)

    // Validar que todos los hallazgos tengan descripción (si los hay)
    if (hallazgos.length > 0) {
      for (const [hallazgoId, hallazgoPhotos] of hallazgosGrouped) {
        const hasDescription = hallazgoPhotos.some((photo) => hallazgoDescriptions[photo.id]?.trim())
        
        if (!hasDescription) {
          console.log("[v0] Hallazgo sin descripción:", hallazgoId)
          toast({
            title: "Descripción requerida",
            description: `Por favor agrega una descripción a todos los hallazgos`,
            variant: "destructive",
          })
          return
        }
      }
    }

    setIsGeneratingPDF(true)
    console.log("[v0] Generando PDF...")

    try {
      // Crear hallazgos para PDF con las fotos agrupadas
      const hallazgosForPDF = Array.from(hallazgosGrouped.entries()).map(([hallazgoId, hallazgoPhotos]) => {
        let descripcion = ""
        for (const photo of hallazgoPhotos) {
          if (hallazgoDescriptions[photo.id]?.trim()) {
            descripcion = hallazgoDescriptions[photo.id]
            break
          }
        }
        
        return {
          descripcion,
          fotos: hallazgoPhotos.map((p) => p.dataUrl),
        }
      })

      console.log("[v0] Datos preparados para PDF:")
      console.log("[v0] - Lugar:", lugar)
      console.log("[v0] - Inspector:", inspector)
      console.log("[v0] - Hallazgos:", hallazgosForPDF.length)
      console.log("[v0] - Evidencias:", evidencias.length)

      await generateQuickInspectionPDF({
        lugar,
        inspector,
        responsable,
        fecha: new Date().toISOString(),
        hallazgos: hallazgosForPDF,
        evidencias: evidencias.map((e) => e.dataUrl),
      })

      console.log("[v0] PDF generado exitosamente")
      toast({
        title: "✓ PDF generado",
        description: "El informe ha sido descargado correctamente",
      })
      // Limpiar datos después de generar PDF exitosamente
      setTimeout(async () => {
        try {
          const db = await initDB()
          const photoTx = db.transaction("fotos", "readwrite")
          photoTx.objectStore("fotos").clear()
          
          const metaTx = db.transaction("metadata", "readwrite")
          metaTx.objectStore("metadata").clear()
        } catch (e) {
          console.error("[v0] Error al limpiar IndexedDB:", e)
        }
        
        localStorage.removeItem("inspeccionRapidaData")
        setLugar("")
        setInspector("")
        setResponsable("")
        setPhotos([])
        setHallazgoDescriptions({})
      }, 1000)
    } catch (error) {
      console.error("[v0] Error al generar PDF:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
      setShowPDFConfirm(false)
    }
  }

  const downloadPhoto = (dataUrl: string, fileName: string) => {
    try {
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("[v0] Error al descargar foto:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-[#054078]">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <Link href="/">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 bg-white text-[#054078] hover:bg-white/90">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <AppLogo />
            </div>
            {photos.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowZipConfirm(true)}
                  disabled={isDownloadingZip}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 bg-white text-[#054078] hover:bg-white/90"
                  title="Descargar ZIP"
                >
                  {isDownloadingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => setShowPDFConfirm(true)}
                  disabled={isGeneratingPDF}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 bg-white text-[#054078] hover:bg-white/90"
                  title="Generar Informe PDF"
                >
                  {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 bg-background">
        {/* Progress Indicator - Solo barras sin texto */}
        <div className="border-b border-border bg-white sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 max-w-6xl">
            <div className="flex items-center gap-4">
              <div className={`flex-1 h-2 rounded-full transition-colors ${currentStep >= 1 ? "bg-[#054078]" : "bg-gray-200"}`} />
              <div className={`flex-1 h-2 rounded-full transition-colors ${currentStep >= 2 ? "bg-[#054078]" : "bg-gray-200"}`} />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[calc(100vh-200px)]">
          {currentStep === 1 ? (
            // PANTALLA 1: Información de Inspección
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Información de la Inspección</h1>
                <p className="text-muted-foreground">Completa los datos básicos de la inspección</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Datos de la Inspección</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="lugar">Lugar a Inspeccionar *</Label>
                    <Input
                      id="lugar"
                      placeholder="Ej: Almacén Principal"
                      value={lugar}
                      onChange={(e) => setLugar(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inspector">Inspector *</Label>
                    <Input
                      id="inspector"
                      placeholder="Nombre del inspector"
                      value={inspector}
                      onChange={(e) => setInspector(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsable">Responsable</Label>
                    <Input
                      id="responsable"
                      placeholder="Nombre del responsable (opcional)"
                      value={responsable}
                      onChange={(e) => setResponsable(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Botón Siguiente */}
              <div className="flex gap-3">
                <Link href="/" className="flex-1">
                  <Button variant="outline" size="lg" className="w-full h-12 text-base">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  onClick={() => {
                    if (!lugar.trim() || !inspector.trim()) {
                      toast({
                        title: "Campos requeridos",
                        description: "Debes completar Lugar e Inspector",
                        variant: "destructive",
                      })
                      return
                    }
                    setCurrentStep(2)
                  }}
                  size="lg"
                  className="flex-1 h-12 text-base"
                >
                  Siguiente
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          ) : (
            // PANTALLA 2: Captura de Fotos y Clasificación
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Captura de Fotos</h1>
                <p className="text-muted-foreground">Fotografía fotos y clasifícalas como hallazgos o evidencias</p>
              </div>

              {/* Botón Tomar Foto Grande */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
                id="photo-input"
              />
              <label htmlFor="photo-input" className="block">
                <Button asChild size="lg" className="w-full h-16 text-lg" >
                  <span>
                    <Camera className="mr-3 h-6 w-6" />
                    Tomar Foto
                  </span>
                </Button>
              </label>

              {/* Galería de Fotos Agrupadas */}
              {photos.length > 0 && (
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    {/* Agrupar hallazgos por hallazgoId */}
                    {(() => {
                      const hallazgosMap = new Map<string, typeof hallazgos>()
                      hallazgos.forEach((h) => {
                        const groupId = h.hallazgoId || h.id
                        if (!hallazgosMap.has(groupId)) {
                          hallazgosMap.set(groupId, [])
                        }
                        hallazgosMap.get(groupId)?.push(h)
                      })

                      return Array.from(hallazgosMap.entries()).map(([hallazgoId, fotosDelHallazgo], index) => (
                        <div key={hallazgoId} className="border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 rounded-lg p-4 space-y-4">
                          <h3 className="font-bold text-red-700">HALLAZGO {String(index + 1).padStart(2, "0")}</h3>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {fotosDelHallazgo.map((photo) => (
                              <div key={photo.id} className="relative group">
                                <img
                                  src={photo.dataUrl || "/placeholder.svg"}
                                  alt="Hallazgo"
                                  className="w-full h-24 md:h-32 object-cover rounded border border-red-200"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setCurrentPhotoForEdit(photo.dataUrl)
                                      setShowPhotoEditor(true)
                                    }}
                                    className="h-8 px-2 bg-white/80 hover:bg-white text-xs"
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemovePhoto(photo.id)}
                                    className="h-8 w-8 p-0 bg-red-500/80 hover:bg-red-600 text-white"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Descripción del hallazgo */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Descripción del Hallazgo</Label>
                            <Textarea
                              placeholder="Describe el hallazgo"
                              value={hallazgoDescriptions[hallazgoId] || ""}
                              onChange={(e) =>
                                setHallazgoDescriptions((prev) => ({
                                  ...prev,
                                  [hallazgoId]: e.target.value,
                                }))
                              }
                              className="min-h-[80px]"
                            />
                          </div>

                          {/* Botón para agregar más fotos a este hallazgo */}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => {
                              setSelectedHallazgoGroupForPhoto(hallazgoId)
                              handlePhotoCapture(e)
                            }}
                            className="hidden"
                            id={`photo-input-${hallazgoId}`}
                          />
                          <label htmlFor={`photo-input-${hallazgoId}`} className="block">
                            <Button variant="outline" size="sm" asChild className="w-full">
                              <span>
                                <Camera className="mr-2 h-4 w-4" />
                                + Agregar foto a este hallazgo
                              </span>
                            </Button>
                          </label>
                        </div>
                      ))
                    })()}

                    {/* Evidencias General */}
                    {evidencias.length > 0 && (
                      <div className="border-2 border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-4">
                        <h3 className="font-bold text-green-700">EVIDENCIA</h3>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {evidencias.map((photo) => (
                            <div key={photo.id} className="relative group">
                              <img
                                src={photo.dataUrl || "/placeholder.svg"}
                                alt="Evidencia"
                                className="w-full h-24 md:h-32 object-cover rounded border border-green-200"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentPhotoForEdit(photo.dataUrl)
                                    setShowPhotoEditor(true)
                                  }}
                                  className="h-8 px-2 bg-white/80 hover:bg-white text-xs"
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemovePhoto(photo.id)}
                                  className="h-8 w-8 p-0 bg-red-500/80 hover:bg-red-600 text-white"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

  {/* Botones finales */}
  <div className="flex gap-3">
  <Button
  onClick={() => {
    if (photos.length > 0) {
      setShowDiscardConfirm(true)
    } else {
      setCurrentStep(1)
    }
  }}
  variant="outline"
  size="lg"
  className="flex-1 h-12 text-base"
  >
  <ArrowLeft className="mr-2 h-5 w-5" />
  Volver
                </Button>
                <Button
                  onClick={() => setShowZipConfirm(true)}
                  disabled={photos.length === 0 || isDownloadingZip}
                  variant="outline"
                  size="lg"
                  className="flex-1 h-12 text-base"
                >
                  {isDownloadingZip ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                  ZIP
                </Button>
                <Button
                  onClick={() => setShowPDFConfirm(true)}
                  disabled={photos.length === 0 || isGeneratingPDF}
                  size="lg"
                  className="flex-1 h-12 text-base"
                >
                  {isGeneratingPDF ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileText className="mr-2 h-5 w-5" />}
                  PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>



      {/* Resto de cards ocultas */}
      <div className="hidden">
        <div className="space-y-6"></div>
      </div>

      <AlertDialog open={showPDFConfirm} onOpenChange={setShowPDFConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generar Informe PDF</AlertDialogTitle>
            <AlertDialogDescription>
              Se generará un informe completo con {hallazgos.length} hallazgos y {evidencias.length} evidencias. ¿Deseas
              continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGeneratePDF}>Generar PDF</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showZipConfirm} onOpenChange={setShowZipConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descargar ZIP</AlertDialogTitle>
            <AlertDialogDescription>
              Se descargarán {photos.length} fotos organizadas en carpetas (Hallazgos: {hallazgos.length}, Evidencias:{" "}
              {evidencias.length}). ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDownloadZip}>Descargar ZIP</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo: Confirmación y opciones de foto */}
      <AlertDialog open={showEditConfirmDialog} onOpenChange={setShowEditConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Foto Capturada</AlertDialogTitle>
            <AlertDialogDescription>
              Puedes usar la foto tal como está o editarla agregando anotaciones
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingPhotoDataUrl && (
            <div className="py-4">
              <img
                src={pendingPhotoDataUrl || "/placeholder.svg"}
                alt="Vista previa"
                className="w-full h-48 object-cover rounded-lg border"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingPhotoDataUrl(null)}>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={handleUseOriginalPhoto}>
              Usar Original
            </Button>
            <AlertDialogAction onClick={handleOpenEditor}>Editar Foto</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo: Clasificar foto (Hallazgo o Evidencia) */}
      <AlertDialog open={showClassificationDialog} onOpenChange={setShowClassificationDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Clasificar Foto</AlertDialogTitle>
            <AlertDialogDescription>¿Es un hallazgo o una evidencia?</AlertDialogDescription>
          </AlertDialogHeader>

          {/* Opciones de clasificación */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => {
                setShowClassificationDialog(false)
                addPhotoWithClassification("hallazgo")
              }}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center border-2 border-red-300 hover:bg-red-50"
            >
              <div className="text-2xl mb-2">🔴</div>
              <div className="text-sm font-semibold text-red-700">HALLAZGO</div>
              <div className="text-xs text-red-600">No conforme</div>
            </Button>

            <Button
              onClick={() => {
                setShowClassificationDialog(false)
                addPhotoWithClassification("evidencia")
              }}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center border-2 border-green-300 hover:bg-green-50"
            >
              <div className="text-2xl mb-2">🟢</div>
              <div className="text-sm font-semibold text-green-700">EVIDENCIA</div>
              <div className="text-xs text-green-600">Conforme</div>
            </Button>
          </div>

          {/* Si es hallazgo, mostrar opción de seleccionar grupo existente */}
          {(() => {
            const hallazgosUnicos = new Map<string, boolean>()
            hallazgos.forEach((h) => {
              hallazgosUnicos.set(h.hallazgoId || h.id, true)
            })
            return hallazgosUnicos.size > 0 ? (
              <div className="space-y-2 border-t pt-4">
                <Label className="text-xs text-muted-foreground">O agregar a hallazgo existente:</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {Array.from(hallazgosUnicos.keys()).map((hallazgoId, idx) => (
                    <Button
                      key={hallazgoId}
                      onClick={() => {
                        setSelectedHallazgoGroupForPhoto(hallazgoId)
                        setShowClassificationDialog(false)
                        addPhotoWithClassification("hallazgo")
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      Hallazgo {String(idx + 1).padStart(2, "0")}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo: Confirmar descarte de inspección */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar inspección?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes {photos.length} foto{photos.length !== 1 ? "s" : ""} capturadas. Si vuelves atrás, se perderán todos los datos de esta inspección.
              
              Puedes descargar un PDF o ZIP antes de descartar para guardar la información.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <Button
              onClick={() => {
                setShowDiscardConfirm(false)
                setCurrentStep(1)
              }}
              variant="destructive"
            >
              Descartar y volver
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {currentPhotoForEdit && (
        <PhotoEditor
          imageUrl={currentPhotoForEdit}
          isOpen={showPhotoEditor}
          onClose={() => {
            setShowPhotoEditor(false)
            setCurrentPhotoForEdit(null)
          }}
          onSave={handlePhotoEdited}
        />
      )}


    </div>
  )
}
