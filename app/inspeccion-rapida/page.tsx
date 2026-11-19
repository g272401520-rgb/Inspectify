"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, ArrowRight, Camera, X, Download, FileText, Loader2, CheckCircle2, AlertTriangle, ClipboardCheck, MapPin, UserRound, ImagePlus } from "lucide-react"
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
import { useActionValidation } from "@/hooks/use-action-validation"
import { ValidatedActionButton } from "@/components/validated-action-button"
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
  const { validatePhotos, validateInspectionInfo, getValidationStatus } = useActionValidation()
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

  // Cargar datos guardados al montar (solo una vez)
  useEffect(() => {
    let isMounted = true // Prevenir memory leaks si se desmonta durante carga
    
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
        
        if (!isMounted) return // Componente se desmontó, no actualizar estado
        
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
        if (!isMounted) return // Componente se desmontó
        
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
    
    return () => {
      isMounted = false // Cleanup al desmontar
    }
  }, [])

  // Guardar datos cada vez que cambien (con debounce para evitar race conditions)
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

        // Guardar fotos en IndexedDB (con sincronización correcta)
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

        // Esperar a que ambas transacciones terminen antes de continuar
        await Promise.all([metaPromise, photoPromise])
      } catch (error) {
        console.error("[v0] Error al guardar en IndexedDB:", error)
        // Fallback: guardar solo metadata en localStorage (sin fotos que pesan mucho)
        localStorage.setItem("inspeccionRapidaData", JSON.stringify({
          lugar,
          inspector,
          responsable,
          hallazgoDescriptions,
          photoCount: photos.length
        }))
      }
    }
    
    // Usar debounce para evitar guardar en cada cambio individual
    const saveTimeout = setTimeout(() => {
      saveData()
    }, 1000) // Guardar 1 segundo después del último cambio
    
    return () => clearTimeout(saveTimeout) // Cleanup
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
    // Validar que haya fotos
    if (!validatePhotos(photos)) {
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

  const resetQuickInspection = async () => {
    try {
      const db = await initDB()
      await Promise.all(["fotos", "metadata"].map((storeName) => new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite")
        transaction.objectStore(storeName).clear()
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })))
    } catch (error) {
      console.error("[v0] Error al limpiar datos de inspección:", error)
    }

    localStorage.removeItem("inspeccionRapidaData")
    setLugar("")
    setInspector("")
    setResponsable("")
    setPhotos([])
    setHallazgoDescriptions({})
    setCurrentStep(1)
    setShowDiscardConfirm(false)
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
      const hallazgossinDescripcion: string[] = []
      
      for (const [hallazgoId] of hallazgosGrouped) {
        const descripcion = hallazgoDescriptions[hallazgoId]?.trim()
        
        if (!descripcion) {
          // Buscar el nombre del hallazgo del objeto hallazgos
          const hallazgo = hallazgos.find((h) => h.id === hallazgoId)
          hallazgossinDescripcion.push(hallazgo?.name || hallazgoId)
        }
      }
      
      if (hallazgossinDescripcion.length > 0) {
        const descripcionTexto = 
          hallazgossinDescripcion.length === 1
            ? `"${hallazgossinDescripcion[0]}"` 
            : hallazgossinDescripcion.map((h) => `"${h}"`).join(", ")
        
        toast({
          title: "Descripción requerida",
          description: `Completa la descripción de: ${descripcionTexto}`,
          variant: "destructive",
        })
        return
      }
    }

    setIsGeneratingPDF(true)
    console.log("[v0] Generando PDF...")

    try {
      // Crear hallazgos para PDF con las fotos agrupadas
      const hallazgosForPDF = Array.from(hallazgosGrouped.entries()).map(([hallazgoId, hallazgoPhotos]) => ({
        descripcion: hallazgoDescriptions[hallazgoId] || "",
        fotos: hallazgoPhotos.map((p) => p.dataUrl),
      }))

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
      await resetQuickInspection()
      toast({
        title: "Listo para una nueva inspección",
        description: "Los datos anteriores se limpiaron y puedes comenzar de nuevo.",
      })
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
            <div className="flex gap-2">
              <ValidatedActionButton
                onValidatedClick={() => setShowZipConfirm(true)}
                isDisabled={photos.length === 0 || isDownloadingZip}
                disabledTooltip={photos.length === 0 ? "Sin fotos para descargar" : "Descargando..."}
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 bg-white text-[#054078] hover:bg-white/90"
                title="Descargar ZIP"
              >
                {isDownloadingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </ValidatedActionButton>
              <ValidatedActionButton
                onValidatedClick={() => setShowPDFConfirm(true)}
                isDisabled={photos.length === 0 || isGeneratingPDF}
                disabledTooltip={photos.length === 0 ? "Sin fotos para generar PDF" : "Generando..."}
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 bg-white text-[#054078] hover:bg-white/90"
                title="Generar Informe PDF"
              >
                {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              </ValidatedActionButton>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="container mx-auto flex max-w-6xl items-center gap-3 px-4 py-3" aria-label={`Paso ${currentStep} de 2`}>
            <div className="flex flex-1 items-center gap-3">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${currentStep === 1 ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                {currentStep > 1 ? <CheckCircle2 aria-hidden="true" /> : "1"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Datos</p>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full w-full rounded-full bg-primary" /></div>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-3">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${currentStep === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${currentStep === 2 ? "text-foreground" : "text-muted-foreground"}`}>Fotos y cierre</p>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={`h-full rounded-full bg-primary transition-all ${currentStep === 2 ? "w-full" : "w-0"}`} /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[calc(100vh-200px)]">
          {currentStep === 1 ? (
            // PANTALLA 1: Información de Inspección
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ClipboardCheck aria-hidden="true" /></span>
                <div>
                  <p className="text-sm font-semibold text-primary">PASO 1 · DATOS</p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Información de la inspección</h1>
                  <p className="mt-1 text-muted-foreground">Completa los datos básicos antes de tomar las fotos.</p>
                </div>
              </div>

              <Card className="overflow-hidden border-border/80 shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-lg">Datos de la inspección</CardTitle>
                  <CardDescription>Los campos marcados con * son obligatorios.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="lugar" className="flex items-center gap-2"><MapPin className="size-4 text-primary" aria-hidden="true" />Lugar a inspeccionar *</Label>
                    <Input
                      id="lugar"
                      placeholder="Ej: Almacén Principal"
                      value={lugar}
                      onChange={(e) => setLugar(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inspector" className="flex items-center gap-2"><UserRound className="size-4 text-primary" aria-hidden="true" />Inspector *</Label>
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
                  <Button variant="outline" size="lg" className="h-12 w-full rounded-xl text-base">
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
                  className="flex-1 h-12 rounded-xl text-base"
                >
                  Siguiente
                  <ArrowRight className="ml-2 size-5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : (
            // PANTALLA 2: Captura de Fotos y Clasificación
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Camera aria-hidden="true" /></span>
                <div>
                  <p className="text-sm font-semibold text-primary">PASO 2 · FOTOS Y CIERRE</p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Captura de fotos</h1>
                  <p className="mt-1 text-muted-foreground">Clasifica cada foto como hallazgo o evidencia y agrega una descripción.</p>
                </div>
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
              <label htmlFor="photo-input" className="block cursor-pointer">
                <Button asChild size="lg" className="h-14 w-full rounded-xl text-base font-semibold shadow-sm">
                  <span>
                    <Camera className="mr-2 size-5" aria-hidden="true" />
                    Tomar una foto
                  </span>
                </Button>
              </label>

              {photos.length === 0 && (
                <Card className="border-dashed border-primary/30 bg-primary/[0.03]">
                  <CardContent className="flex items-center gap-4 py-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ImagePlus aria-hidden="true" /></span>
                    <div>
                      <p className="font-medium">Aún no hay fotos</p>
                      <p className="text-sm text-muted-foreground">Toma una foto para agregarla como hallazgo o evidencia.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

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
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-red-700">HALLAZGO {String(index + 1).padStart(2, "0")}</h3>
                            {hallazgoDescriptions[hallazgoId]?.trim() ? (
                              <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded font-medium">
                                ✓ Con descripción
                              </span>
                            ) : (
                              <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded font-medium">
                                ⚠ Sin descripción
                              </span>
                            )}
                          </div>

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
              <div className="flex flex-col gap-3 sm:flex-row">
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
                  className="h-12 flex-1 rounded-xl text-base"
                >
                  <ArrowLeft className="mr-2 size-5" aria-hidden="true" />
                  Volver
                </Button>
                <Button
                  onClick={() => setShowZipConfirm(true)}
                  disabled={photos.length === 0 || isDownloadingZip}
                  variant="outline"
                  size="lg"
                  className="h-12 flex-1 rounded-xl text-base"
                >
                  {isDownloadingZip ? <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" /> : <Download className="mr-2 size-5" aria-hidden="true" />}
                  Descargar ZIP
                </Button>
                <Button
                  onClick={() => setShowPDFConfirm(true)}
                  disabled={photos.length === 0 || isGeneratingPDF}
                  size="lg"
                  className="h-12 flex-1 rounded-xl text-base"
                >
                  {isGeneratingPDF ? <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" /> : <FileText className="mr-2 size-5" aria-hidden="true" />}
                  Terminar y generar PDF
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
              className="h-24 flex flex-col items-center justify-center rounded-xl border-2 border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
            >
              <AlertTriangle className="mb-2 size-6 text-destructive" aria-hidden="true" />
              <span className="text-sm font-semibold text-destructive">HALLAZGO</span>
              <span className="text-xs text-muted-foreground">No conforme</span>
            </Button>

            <Button
              onClick={() => {
                setShowClassificationDialog(false)
                addPhotoWithClassification("evidencia")
              }}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10"
            >
              <CheckCircle2 className="mb-2 size-6 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-primary">EVIDENCIA</span>
              <span className="text-xs text-muted-foreground">Conforme</span>
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
              onClick={() => void resetQuickInspection()}
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
