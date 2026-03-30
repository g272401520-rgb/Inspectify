"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  Check,
  X,
  Trash2,
  Camera,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eraser,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getAreasAction, getChecklistByIdAction, saveInspectionAction, uploadPhotosAction } from "@/lib/actions"
import type { Area, Checklist, Inspection, Finding } from "@/lib/types"
import { generateInspectionId, generateFindingId } from "@/lib/utils-inspection"
import { useToast } from "@/hooks/use-toast"
import { PhotoEditor } from "@/components/photo-editor"
import { downloadPhotosOptimized } from "@/lib/photo-download-optimizer"
import { DownloadProgress } from "@/components/download-progress"
import { logger } from "@/lib/logger"

type FindingStatus = "conforme" | "no-conforme" | "pendiente"

interface GroupedCategory {
  name: string
  items: Array<{ id: string; criterion: string; subcriterion?: string; details?: string }>
}

export default function InspectionPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const areaId = params.areaId as string
  const checklistId = params.checklistId as string

  const [area, setArea] = useState<Area | null>(null)
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [inspectorName, setInspectorName] = useState("")
  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(null)
  const [groupedCategories, setGroupedCategories] = useState<GroupedCategory[]>([])

  const [criteriaStates, setCriteriaStates] = useState<
    Record<
      string,
      {
        status: FindingStatus | null
        description: string
        photos: string[]
        thumbnails: string[] // Miniaturas para renderizado rápido
      }
    >
  >({})

  const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({})
  const [uploadProgress, setUploadProgress] = useState<Record<string, { current: number; total: number }>>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  const [photoEditorOpen, setPhotoEditorOpen] = useState(false)
  const [currentEditingPhoto, setCurrentEditingPhoto] = useState<string>("")
  const [currentEditingCriterionId, setCurrentEditingCriterionId] = useState<string>("")

  const [compressingPhotos, setCompressingPhotos] = useState<Record<string, boolean>>({})
  const [compressionProgress, setCompressionProgress] = useState<Record<string, { current: number; total: number }>>({})

  const [activeCategory, setActiveCategory] = useState<string>("")
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const [showEditConfirmDialog, setShowEditConfirmDialog] = useState(false)
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false) // Added state for exit confirmation
  const [pendingPhotoData, setPendingPhotoData] = useState<{
    dataUrl: string
    criterionId: string
    thumbnail?: string // Added thumbnail for instant preview
  } | null>(null)

  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const [showDraftsDialog, setShowDraftsDialog] = useState(false)
  const [drafts, setDrafts] = useState<
    Array<{
      id: string
      inspectorName: string
      criteriaStates: typeof criteriaStates
      timestamp: number
      photoCount: number
      evaluatedCount: number
      totalCount: number
    }>
  >([])

  const [downloadProgress, setDownloadProgress] = useState<{ show: boolean; percentage: number; message: string }>({
    show: false,
    percentage: 0,
    message: "",
  })

  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "Conexión restaurada",
        description: "Ya puedes guardar la inspección",
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "Sin conexión",
        description: "Los datos se guardan localmente. Podrás sincronizar cuando vuelva la señal.",
        variant: "destructive",
        duration: 5000,
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Check initial state
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [toast])

  useEffect(() => {
    if (!currentInspection || !hasUnsavedChanges) return

    const autoSaveKey = `inspection_autosave_${areaId}_${checklistId}`
    const dataToSave = {
      inspectorName,
      criteriaStates,
      timestamp: Date.now(),
    }

    try {
      localStorage.setItem(autoSaveKey, JSON.stringify(dataToSave))
      logger.log("[v0] Auto-saved to localStorage")
    } catch (error) {
      logger.error("[v0] Error auto-saving:", error)
    }
  }, [inspectorName, criteriaStates, areaId, checklistId, currentInspection, hasUnsavedChanges])

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = "¿Estás seguro de que quieres salir? Los cambios no guardados se perderán."
      return e.returnValue
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  useEffect(() => {
    loadDrafts()
  }, [])

  const loadDrafts = () => {
    try {
      const draftsKey = `inspection_drafts_${areaId}_${checklistId}`
      const savedDrafts = localStorage.getItem(draftsKey)
      if (savedDrafts) {
        setDrafts(JSON.parse(savedDrafts))
      }
    } catch (error) {
      logger.error("[v0] Error loading drafts:", error)
    }
  }

  const saveToDrafts = () => {
    if (!inspectorName.trim()) {
      toast({
        title: "Error",
        description: "Ingresa el nombre del inspector antes de guardar como borrador",
        variant: "destructive",
      })
      return
    }

    const photoCount = Object.values(criteriaStates).reduce((sum, state) => sum + state.photos.length, 0)
    const evaluatedCount = Object.values(criteriaStates).filter(
      (state) => state.status !== null && state.status !== undefined,
    ).length
    const totalCount = checklist?.items?.length || 0

    const draft = {
      id: Date.now().toString(),
      inspectorName,
      criteriaStates,
      timestamp: Date.now(),
      photoCount,
      evaluatedCount,
      totalCount,
    }

    try {
      const draftsKey = `inspection_drafts_${areaId}_${checklistId}`
      const existingDrafts = localStorage.getItem(draftsKey)
      const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : []

      // Keep only last 10 drafts
      const updatedDrafts = [draft, ...draftsArray].slice(0, 10)

      localStorage.setItem(draftsKey, JSON.stringify(updatedDrafts))
      setDrafts(updatedDrafts)

      toast({
        title: "Borrador guardado",
        description: "La inspección se guardó como borrador exitosamente",
      })

      setHasUnsavedChanges(false)
    } catch (error) {
      logger.error("[v0] Error saving draft:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el borrador",
        variant: "destructive",
      })
    }
  }

  const loadDraft = (draftId: string) => {
    const draft = drafts.find((d) => d.id === draftId)
    if (!draft) return

    setInspectorName(draft.inspectorName)
    setCriteriaStates(draft.criteriaStates)
    setShowDraftsDialog(false)
    setHasUnsavedChanges(true)

    toast({
      title: "Borrador cargado",
      description: "Se restauró el borrador exitosamente",
    })
  }

  const deleteDraft = (draftId: string) => {
    try {
      const draftsKey = `inspection_drafts_${areaId}_${checklistId}`
      const updatedDrafts = drafts.filter((d) => d.id !== draftId)
      // </CHANGE> Fixed typo: removed JSON.JSON.parse and just use JSON.stringify
      localStorage.setItem(draftsKey, JSON.stringify(updatedDrafts))
      setDrafts(updatedDrafts)

      toast({
        title: "Borrador eliminado",
        description: "El borrador se eliminó correctamente",
      })
    } catch (error) {
      logger.error("[v0] Error deleting draft:", error)
    }
  }

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirmDialog(true)
    } else {
      router.back()
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const areas = await getAreasAction()
        const foundArea = areas.find((a) => a.id === areaId)
        if (!foundArea) {
          router.push("/")
          return
        }

        const foundChecklist = await getChecklistByIdAction(checklistId)
        if (!foundChecklist || !foundChecklist.items) {
          router.push(`/area/${areaId}`)
          return
        }

        setArea(foundArea)
        setChecklist(foundChecklist)

        const grouped: Record<string, GroupedCategory> = {}

        foundChecklist.items.forEach((item) => {
          if (!grouped[item.category]) {
            grouped[item.category] = {
              name: item.category,
              items: [],
            }
          }
          grouped[item.category].items.push({
            id: item.id,
            criterion: item.criterion,
            subcriterion: item.subcriterion,
            details: item.details,
          })
        })

        const categoriesArray = Object.values(grouped)
        setGroupedCategories(categoriesArray)

        if (categoriesArray.length > 0) {
          setActiveCategory(categoriesArray[0].name)
        }

        const newInspection: Inspection = {
          id: generateInspectionId(),
          areaId,
          checklistId,
          date: new Date().toISOString(),
          findings: [],
          inspectorName: "",
          status: "en-progreso",
        }
        setCurrentInspection(newInspection)

        const autoSaveKey = `inspection_autosave_${areaId}_${checklistId}`
        const savedData = localStorage.getItem(autoSaveKey)

        if (savedData) {
          try {
            const parsed = JSON.parse(savedData)
            const timeDiff = Date.now() - parsed.timestamp

            // Only restore if saved within last 24 hours
            if (timeDiff < 24 * 60 * 60 * 1000) {
              setInspectorName(parsed.inspectorName || "")
              setCriteriaStates(parsed.criteriaStates || {})

              toast({
                title: "Datos restaurados",
                description: "Se recuperaron los datos de la sesión anterior",
              })
            } else {
              // Clear old data
              localStorage.removeItem(autoSaveKey)
            }
          } catch (error) {
            logger.error("[v0] Error restoring auto-save:", error)
          }
        }
      } catch (error) {
        logger.error("Error loading inspection data:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos de la inspección",
          variant: "destructive",
        })
      }
    }

    loadData()
  }, [areaId, checklistId, router, toast])

  const checkScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener("resize", checkScroll)
    return () => window.removeEventListener("resize", checkScroll)
  }, [groupedCategories])

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
      setTimeout(checkScroll, 300)
    }
  }

  const handleStatusChange = (criterionId: string, status: FindingStatus) => {
    setCriteriaStates((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        status,
        description: prev[criterionId]?.description || "",
        photos: prev[criterionId]?.photos || [],
        thumbnails: prev[criterionId]?.thumbnails || [], // Include thumbnails
      },
    }))
    setHasUnsavedChanges(true)
  }

  const handleDescriptionChange = (criterionId: string, description: string) => {
    setCriteriaStates((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        description,
        status: prev[criterionId]?.status || null,
        photos: prev[criterionId]?.photos || [],
        thumbnails: prev[criterionId]?.thumbnails || [], // Include thumbnails
      },
    }))
    setHasUnsavedChanges(true)
  }

  const handlePhotoUpload = async (criterionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      logger.log("[v0] No files selected")
      return
    }

    logger.log("[v0] Photo upload started - files count:", files.length)

    if (files.length > 200) {
      toast({
        title: "Demasiadas fotos",
        description: "Por favor sube máximo 200 fotos a la vez.",
        variant: "destructive",
      })
      event.target.value = ""
      return
    }

    if (files.length === 1) {
      const file = files[0]
      logger.log("[v0] Single file detected:", file.name, file.type, file.size)

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Por favor selecciona solo archivos de imagen",
          variant: "destructive",
        })
        event.target.value = ""
        return
      }

      setCompressingPhotos((prev) => ({ ...prev, [criterionId]: true }))
      setCompressionProgress((prev) => ({ ...prev, [criterionId]: { current: 0, total: 1 } }))

      try {
        const { compressMultipleImages, generateThumbnail } = await import("@/lib/image-compression")

        // Generate thumbnail for instant preview
        const thumbnail = await generateThumbnail(file)

        const base64Images = await compressMultipleImages([file], (current, total) => {
          setCompressionProgress((prev) => ({
            ...prev,
            [criterionId]: { current, total },
          }))
        })

        setCompressingPhotos((prev) => {
          const newState = { ...prev }
          delete newState[criterionId]
          return newState
        })

        const compressedDataUrl = base64Images[0]
        logger.log("[v0] Single file compressed, showing preview dialog")
        setPendingPhotoData({ dataUrl: compressedDataUrl, criterionId, thumbnail })
        setShowEditConfirmDialog(true)
        event.target.value = ""
      } catch (error) {
        logger.error("[v0] Error compressing photo:", error)
        toast({
          title: "Error",
          description: "No se pudo procesar la foto",
          variant: "destructive",
        })
        setCompressingPhotos((prev) => {
          const newState = { ...prev }
          delete newState[criterionId]
          return newState
        })
        setCompressionProgress((prev) => {
          const newState = { ...prev }
          delete newState[criterionId]
          return newState
        })
        event.target.value = ""
      }
      return
    }

    const totalFiles = files.length
    setCompressingPhotos((prev) => ({ ...prev, [criterionId]: true }))
    setCompressionProgress((prev) => ({ ...prev, [criterionId]: { current: 0, total: totalFiles } }))

    try {
      const { compressMultipleImages, generateMultipleThumbnails } = await import("@/lib/image-compression")

      logger.log("[v0] Generating thumbnails for instant preview...")

      // Generate all thumbnails with adaptive batching
      const thumbnails = await generateMultipleThumbnails(Array.from(files), (current, total) => {
        // Update UI progressively as thumbnails are generated
        setCriteriaStates((prev) => {
          const currentState = prev[criterionId] || { status: null, description: "", photos: [], thumbnails: [] }
          return {
            ...prev,
            [criterionId]: {
              ...currentState,
              thumbnails: [...currentState.thumbnails],
            },
          }
        })
      })

      const tempThumbnails = thumbnails

      // Compress images with adaptive batching
      const base64Images = await compressMultipleImages(Array.from(files), (current, total) => {
        setCompressionProgress((prev) => ({
          ...prev,
          [criterionId]: { current, total },
        }))
      })

      setCompressingPhotos((prev) => {
        const newState = { ...prev }
        delete newState[criterionId]
        return newState
      })

      setUploadingPhotos((prev) => ({ ...prev, [criterionId]: true }))
      setUploadProgress((prev) => ({ ...prev, [criterionId]: { current: 0, total: base64Images.length } }))

      const uploadedUrls = await uploadPhotosAction(base64Images)

      logger.log("[v0] Photos uploaded successfully. URLs:", uploadedUrls)

      logger.log("[v0] Iniciando descarga paralela optimizada de fotos...")
      setDownloadProgress({ show: true, percentage: 0, message: "Descargando fotos..." })

      await downloadPhotosOptimized(uploadedUrls, (progress) => {
        setDownloadProgress({
          show: true,
          percentage: progress.percentage,
          message: `${progress.currentFile} - ${progress.percentage}%`,
        })
      })

      setDownloadProgress({ show: false, percentage: 0, message: "" })

      setCriteriaStates((prev) => {
        const currentState = prev[criterionId] || { status: null, description: "", photos: [], thumbnails: [] }
        return {
          ...prev,
          [criterionId]: {
            ...currentState,
            photos: [...currentState.photos, ...uploadedUrls],
            thumbnails: [...currentState.thumbnails, ...tempThumbnails],
          },
        }
      })

      toast({
        title: "Fotos agregadas",
        description: `Se agregaron ${uploadedUrls.length} foto(s) correctamente y se descargaron al dispositivo`,
      })
      setHasUnsavedChanges(true)
    } catch (error) {
      logger.error("[v0] Error processing photos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las fotos. Intenta con menos imágenes a la vez.",
        variant: "destructive",
      })
    } finally {
      setDownloadProgress({ show: false, percentage: 0, message: "" })
      setCompressingPhotos((prev) => {
        const newState = { ...prev }
        delete newState[criterionId]
        return newState
      })
      setCompressionProgress((prev) => {
        const newState = { ...prev }
        delete newState[criterionId]
        return newState
      })
      setUploadingPhotos((prev) => {
        const newState = { ...prev }
        delete newState[criterionId]
        return newState
      })
      setUploadProgress((prev) => {
        const newState = { ...prev }
        delete newState[criterionId]
        return newState
      })
      event.target.value = ""
    }
  }

  const handleSaveEditedPhoto = async (editedImageUrl: string) => {
    const criterionId = currentEditingCriterionId

    setUploadingPhotos((prev) => ({ ...prev, [criterionId]: true }))
    setUploadProgress((prev) => ({ ...prev, [criterionId]: { current: 0, total: 1 } }))

    try {
      logger.log("[v0] Uploading edited photo to Blob Storage...")
      const photoUrls = await uploadPhotosAction([editedImageUrl])
      logger.log("[v0] Photo uploaded successfully:", photoUrls[0])

      logger.log("[v0] Descargando foto editada de forma optimizada...")
      setDownloadProgress({ show: true, percentage: 50, message: "Descargando foto editada..." })

      await downloadPhotosOptimized(photoUrls, (progress) => {
        setDownloadProgress({
          show: true,
          percentage: progress.percentage,
          message: "Descargando foto editada...",
        })
      })

      setDownloadProgress({ show: false, percentage: 0, message: "" })

      setCriteriaStates((prev) => {
        const currentState = prev[criterionId] || { status: null, description: "", photos: [], thumbnails: [] }
        return {
          ...prev,
          [criterionId]: {
            ...currentState,
            photos: [...currentState.photos, photoUrls[0]],
            thumbnails: [...currentState.thumbnails, editedImageUrl],
          },
        }
      })

      toast({
        title: "Foto agregada",
        description: "La foto editada se agregó correctamente y se descargó al dispositivo",
      })
      setHasUnsavedChanges(true)
    } catch (error) {
      logger.error("[v0] Error uploading edited photo:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la foto editada",
        variant: "destructive",
      })
    } finally {
      setDownloadProgress({ show: false, percentage: 0, message: "" })
      setUploadingPhotos((prev) => {
        const newState = { ...prev }
        delete newState[criterionId]
        return newState
      })
      setUploadProgress((prev) => {
        const newState = { ...prev }
        delete newState[criterionId]
        return newState
      })
      setPhotoEditorOpen(false)
      setCurrentEditingPhoto("")
      setCurrentEditingCriterionId("")
      setPendingPhotoData(null)
    }
  }

  const handleRemovePhoto = (criterionId: string, photoIndex: number) => {
    setCriteriaStates((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        photos: prev[criterionId]?.photos.filter((_, idx) => idx !== photoIndex) || [],
        thumbnails: prev[criterionId]?.thumbnails.filter((_, idx) => idx !== photoIndex) || [], // Remove thumbnail too
        status: prev[criterionId]?.status || null,
        description: prev[criterionId]?.description || "",
      },
    }))
    setHasUnsavedChanges(true)
  }

  const handleConfirmSave = () => {
    logger.log("[v0] handleConfirmSave called")
    setSaveError(null)

    logger.log("[v0] Inspector name:", inspectorName)
    logger.log("[v0] Uploading photos:", Object.keys(uploadingPhotos))
    logger.log("[v0] Compressing photos:", Object.keys(compressingPhotos))
    logger.log("[v0] Criteria states:", criteriaStates)

    if (!inspectorName.trim()) {
      toast({
        title: "❌ Falta el nombre del inspector",
        description: "Por favor ingresa el nombre del inspector antes de finalizar",
        variant: "destructive",
      })
      return
    }

    const isRegistroChecklist = checklist?.type === "registro"

    // Validar que todos los criterios no conformes tengan descripción
    if (!isRegistroChecklist) {
      const noConformesWithoutDescription = Object.entries(criteriaStates).filter(([_, state]) => {
        return state.status === "no-conforme" && !state.description.trim()
      })

      if (noConformesWithoutDescription.length > 0) {
        const criterionIds = noConformesWithoutDescription.map(([id]) => id).join(", ")
        toast({
          title: "❌ Faltan observaciones",
          description: `Los hallazgos "No Conforme" deben tener una observación. Revisa los criterios: ${criterionIds.substring(0, 50)}${criterionIds.length > 50 ? "..." : ""}`,
          variant: "destructive",
          duration: 8000,
        })
        return
      }

      // Validar que los criterios no conformes tengan al menos una foto
      const noConformesWithoutPhotos = Object.entries(criteriaStates).filter(([_, state]) => {
        return state.status === "no-conforme" && state.photos.length === 0
      })

      if (noConformesWithoutPhotos.length > 0) {
        toast({
          title: "⚠️ Recomendación",
          description: `Hay ${noConformesWithoutPhotos.length} hallazgo(s) "No Conforme" sin fotos. Se recomienda agregar evidencia fotográfica.`,
          variant: "default",
          duration: 6000,
        })
        // No bloqueamos el guardado, solo advertimos
      }
    }

    // Validar que haya al menos un criterio evaluado
    const evaluatedCriteria = Object.values(criteriaStates).filter((state) => state.status !== null)
    if (evaluatedCriteria.length === 0) {
      toast({
        title: "❌ No hay criterios evaluados",
        description: "Debes evaluar al menos un criterio antes de finalizar la inspección",
        variant: "destructive",
      })
      return
    }

    setShowConfirmDialog(true)
  }

  const handleSaveInspection = async () => {
    if (!currentInspection) return

    if (!isOnline) {
      setSaveError(
        "Sin conexión a internet. Los datos están guardados localmente. Intenta de nuevo cuando tengas señal.",
      )
      return
    }

    setIsSaving(true)
    setSaveError(null)
    logger.log("Iniciando guardado de inspección...")
    logger.log("Tipo de dispositivo:", isMobile ? "Móvil" : "Escritorio")

    // const saveTimeout = isMobile ? 120000 : 60000 // 2 minutes for mobile, 1 minute for desktop

    try {
      const findings: Finding[] = Object.entries(criteriaStates)
        .filter(([_, state]) => state.status !== null)
        .map(([criterionId, state]) => {
          // Filtrar solo URLs válidas de Blob Storage (no base64 ni thumbnails)
          const validPhotos = state.photos.filter((photo) => typeof photo === "string" && photo.startsWith("http"))

          logger.log(`Criterio ${criterionId}: ${validPhotos.length} fotos válidas de ${state.photos.length} totales`)

          return {
            id: generateFindingId(),
            itemId: criterionId,
            description: state.description || "",
            photos: validPhotos,
            status: state.status!,
            correctiveAction: "",
            dueDate: "",
            closedDate: "",
            trackingStatus: "pendiente",
            solutionPhotos: [],
            // NO incluir thumbnails aquí
          }
        })

      const totalPhotos = findings.reduce((sum, finding) => sum + finding.photos.length, 0)
      logger.log(`Guardando inspección con ${findings.length} hallazgos y ${totalPhotos} fotos`)

      const finalInspection: Inspection = {
        id: currentInspection.id,
        areaId: currentInspection.areaId,
        checklistId: currentInspection.checklistId,
        date: new Date().toISOString(), // Siempre usar ISO string
        inspectorName: inspectorName.trim(),
        status: "completada",
        findings,
      }

      logger.log("Llamando a saveInspectionAction...")
      const result = await saveInspectionAction(finalInspection)
      logger.log("Resultado de saveInspectionAction:", result)

      if (!result.success || !result.id) {
        throw new Error(result.error || "No se pudo guardar la inspección")
      }

      logger.log("Inspección guardada exitosamente:", result.id)

      // Limpiar autosave
      const autoSaveKey = `inspection_autosave_${areaId}_${checklistId}`
      localStorage.removeItem(autoSaveKey)
      setHasUnsavedChanges(false)

      toast({
        title: "Inspección guardada",
        description: "La inspección ha sido guardada correctamente",
      })

      setShowConfirmDialog(false)
      router.push(`/resultados/${result.id}`)
    } catch (error) {
      logger.error("Error guardando inspección:", error)

      let errorMessage = "Error desconocido al guardar"

      if (error instanceof Error) {
        errorMessage = error.message

        // Mensajes de error más específicos
        if (errorMessage.includes("fetch") || errorMessage.includes("NetworkError")) {
          errorMessage = "Error de conexión. Verifica tu señal de internet e intenta de nuevo."
        } else if (errorMessage.includes("timeout") || errorMessage.includes("Tiempo")) {
          errorMessage = `Tiempo de espera agotado. ${isMobile ? "En móvil con muchas fotos puede tomar hasta 2 minutos." : "Intenta de nuevo."}`
        } else if (errorMessage.includes("Failed to fetch")) {
          errorMessage = "Sin conexión a internet. Verifica tu señal e intenta de nuevo."
        } else if (errorMessage.includes("serialize") || errorMessage.includes("JSON")) {
          errorMessage = "Error al procesar los datos. Por favor intenta de nuevo."
        }
      }

      setSaveError(errorMessage)

      toast({
        title: "Error al guardar",
        description: errorMessage,
        variant: "destructive",
        duration: 10000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUseOriginalPhoto = async () => {
    if (!pendingPhotoData) {
      logger.log("[v0] ERROR: No pending photo data")
      return
    }

    const { dataUrl, criterionId, thumbnail } = pendingPhotoData
    logger.log("[v0] handleUseOriginalPhoto started - criterionId:", criterionId)

    setShowEditConfirmDialog(false)
    setPendingPhotoData(null)

    setUploadingPhotos((prev) => ({ ...prev, [criterionId]: true }))
    setUploadProgress((prev) => ({ ...prev, [criterionId]: { current: 0, total: 1 } }))

    try {
      logger.log("[v0] Starting upload to Blob Storage...")
      const photoUrls = await uploadPhotosAction([dataUrl])
      logger.log("[v0] Upload completed successfully. Photo URL:", photoUrls[0])

      logger.log("[v0] Descargando foto de forma optimizada...")
      setDownloadProgress({ show: true, percentage: 50, message: "Descargando foto..." })

      await downloadPhotosOptimized(photoUrls, (progress) => {
        setDownloadProgress({
          show: true,
          percentage: progress.percentage,
          message: "Descargando foto...",
        })
      })

      setDownloadProgress({ show: false, percentage: 0, message: "" })

      setCriteriaStates((prev) => {
        const currentState = prev[criterionId] || { status: null, description: "", photos: [], thumbnails: [] }
        const newState = {
          ...prev,
          [criterionId]: {
            ...currentState,
            photos: [...currentState.photos, photoUrls[0]],
            thumbnails: [...currentState.thumbnails, thumbnail || dataUrl],
          },
        }
        logger.log("[v0] State updated with new photo. New photos array:", newState[criterionId].photos)
        return newState
      })

      toast({
        title: "Foto agregada",
        description: "La foto se agregó correctamente y se descargó al dispositivo",
      })
      setHasUnsavedChanges(true)
    } catch (error) {
      logger.error("[v0] Error uploading photo:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la foto",
        variant: "destructive",
      })
    } finally {
      logger.log("[v0] Cleaning up upload state...")
      setDownloadProgress({ show: false, percentage: 0, message: "" })
      setUploadingPhotos((prev) => {
        const newState = { ...prev }
        delete newState[criterionId]
        return newState
      })
      setUploadProgress((prev) => {
        const newState = { ...prev }
        delete newState[criterionId]
        return newState
      })
      logger.log("[v0] handleUseOriginalPhoto completed")
    }
  }

  const handleOpenEditor = () => {
    if (!pendingPhotoData) return

    setCurrentEditingPhoto(pendingPhotoData.dataUrl)
    setCurrentEditingCriterionId(pendingPhotoData.criterionId)
    setShowEditConfirmDialog(false)
    setPhotoEditorOpen(true)
    setPendingPhotoData(null) // Clear pending data once we decide to edit
  }

  const getEvaluatedCount = (categoryName: string) => {
    const category = groupedCategories.find((c) => c.name === categoryName)
    if (!category) return { evaluated: 0, total: 0 }

    const total = category.items.length
    const evaluated = category.items.filter(
      (item) => criteriaStates[item.id]?.status !== null && criteriaStates[item.id]?.status !== undefined,
    ).length

    return { evaluated, total }
  }

  const getTotalEvaluated = () => {
    if (!checklist || !checklist.items) return { evaluated: 0, total: 0 }

    const total = checklist.items.length
    const evaluated = Object.values(criteriaStates).filter(
      (state) => state.status !== null && state.status !== undefined,
    ).length

    return { evaluated, total }
  }

  const scrollToCategory = (categoryName: string) => {
    setActiveCategory(categoryName)
    const element = categoryRefs.current[categoryName]
    if (element) {
      const headerOffset = 180 // Offset for sticky header + tabs
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }
  }

  const activeCategories = groupedCategories.filter((cat) => cat.name === activeCategory)

  return (
    <div className="min-h-screen bg-background">
      <DownloadProgress
        show={downloadProgress.show}
        percentage={downloadProgress.percentage}
        message={downloadProgress.message}
      />

      <header className="border-b border-border bg-[#054078] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleBack} // Changed to use handleBack instead of direct router.back()
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 bg-white text-[#054078] hover:bg-white/90"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowDraftsDialog(true)}
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 bg-white text-[#054078] hover:bg-white/90 relative"
                title="Borradores"
              >
                <Eraser className="h-4 w-4" />
                {drafts.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {drafts.length}
                  </span>
                )}
              </Button>
              {!isOnline && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Sin conexión
                </div>
              )}
              <div className="text-right">
                <p className="text-sm text-white/80">
                  {activeCategories.length} de {groupedCategories.length}
                </p>
                <p className="text-sm font-semibold text-white">100%</p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <h1 className="text-xl md:text-2xl font-bold text-white">Inspección en Progreso</h1>
            <p className="text-xs md:text-sm text-white/80">
              {area?.name || "Cargando..."} • {checklist?.name || "Cargando..."} • {inspectorName || "Sin asignar"}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6">
        <Card className="p-4 mb-4 md:mb-6">
          <Label htmlFor="inspector" className="text-sm font-medium">
            Nombre del Inspector
          </Label>
          <Input
            id="inspector"
            value={inspectorName}
            onChange={(e) => {
              setInspectorName(e.target.value)
              setHasUnsavedChanges(true)
            }}
            placeholder="Ingresa tu nombre"
            className="mt-2 h-12 text-base"
          />
        </Card>

        {groupedCategories.length > 1 && (
          <div className="sticky top-[120px] z-10 bg-background pb-4 mb-6">
            <div className="relative">
              {canScrollLeft && (
                <button
                  onClick={() => scrollTabs("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm p-1 rounded-full shadow-md hover:bg-background"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              <div
                ref={tabsContainerRef}
                onScroll={checkScroll}
                className="overflow-x-auto scrollbar-hide scroll-smooth"
              >
                <div className="flex gap-2 min-w-max pb-2 px-8">
                  {groupedCategories.map((category) => {
                    const { evaluated, total } = getEvaluatedCount(category.name)
                    const isActive = activeCategory === category.name

                    return (
                      <button
                        key={category.name}
                        onClick={() => scrollToCategory(category.name)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          isActive ? "bg-[#054078] text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span>{category.name}</span>
                          <span className={`text-xs ${isActive ? "text-white/90" : "text-gray-500"}`}>
                            {evaluated}/{total}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {canScrollRight && (
                <button
                  onClick={() => scrollTabs("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm p-1 rounded-full shadow-md hover:bg-background"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="mt-3 px-8">
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-[#054078] transition-all duration-300"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {activeCategories.map((category) => {
            const { evaluated, total } = getEvaluatedCount(category.name)

            return (
              <div
                key={category.name}
                className="space-y-3 md:space-y-4"
                ref={(el) => {
                  categoryRefs.current[category.name] = el
                }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-1 h-6 bg-[#054078] rounded-full flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-lg md:text-xl font-bold text-foreground">{category.name}</h2>
                  </div>
                </div>

                {category.items.map((item) => {
                  const state = criteriaStates[item.id]
                  const isNonConformeOrPending = state?.status === "no-conforme"
                  const isUploadingThis = uploadingPhotos[item.id] || false
                  const progressThis = uploadProgress[item.id] || { current: 0, total: 0 }
                  const isCompressingThis = compressingPhotos[item.id] || false
                  const compressionProgressThis = compressionProgress[item.id] || { current: 0, total: 0 }

                  return (
                    <Card key={item.id} className="p-4 md:p-6 bg-white">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm md:text-base text-foreground leading-relaxed">{item.criterion}</p>
                          {item.subcriterion && (
                            <p className="text-xs md:text-sm text-muted-foreground mt-1">{item.subcriterion}</p>
                          )}
                          {item.details && (
                            <p className="text-xs md:text-sm text-muted-foreground mt-1">{item.details}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={() => handleStatusChange(item.id, "conforme")}
                            className={`h-14 text-base font-medium transition-all border-2 ${
                              state?.status === "conforme"
                                ? "!bg-[#86d293] !text-white !border-[#86d293] hover:!bg-[#75c182]"
                                : "!bg-white !text-gray-700 !border-gray-300 hover:!bg-green-50"
                            }`}
                          >
                            <Check
                              className={`h-6 w-6 ${state?.status === "conforme" ? "text-white" : "text-[#86d293]"}`}
                            />
                          </Button>
                          <Button
                            onClick={() => handleStatusChange(item.id, "no-conforme")}
                            className={`h-14 text-base font-medium transition-all border-2 ${
                              state?.status === "no-conforme"
                                ? "!bg-[#f5a5a8] !text-white !border-[#f5a5a8] hover:!bg-[#f39499]"
                                : "!bg-white !text-gray-700 !border-gray-300 hover:!bg-red-50"
                            }`}
                          >
                            <X
                              className={`h-6 w-6 ${state?.status === "no-conforme" ? "text-white" : "text-[#f5a5a8]"}`}
                            />
                          </Button>
                        </div>

                        {isNonConformeOrPending && (
                          <div>
                            <Textarea
                              value={state?.description || ""}
                              onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                              placeholder="Descripción del hallazgo (obligatorio)"
                              className="min-h-[100px] text-base"
                            />
                          </div>
                        )}

                        <div className="space-y-3">
                          {isCompressingThis && compressionProgressThis.total > 0 && (
                            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                              <span className="text-sm text-purple-600 dark:text-purple-400">
                                Comprimiendo fotos: {compressionProgressThis.current} de {compressionProgressThis.total}
                              </span>
                            </div>
                          )}

                          {isUploadingThis && progressThis.total > 0 && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              <span className="text-sm text-blue-600 dark:text-blue-400">
                                {progressThis.total === 1
                                  ? "Procesando foto..."
                                  : `Subiendo fotos: ${progressThis.current} de ${progressThis.total}`}
                              </span>
                            </div>
                          )}

                          {state?.thumbnails && state.thumbnails.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {state.thumbnails.map((thumbnail, idx) => (
                                <div key={idx} className="relative group">
                                  <img
                                    src={thumbnail || state.photos[idx] || "/placeholder.svg"}
                                    alt={`Evidencia ${idx + 1}`}
                                    className="w-full aspect-square object-cover rounded-lg border border-border"
                                    loading="lazy"
                                  />
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="absolute top-1 right-1 h-8 w-8 p-0 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemovePhoto(item.id, idx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <input
                              ref={(el) => {
                                if (el) cameraInputRefs.current[`camera-${item.id}`] = el
                              }}
                              id={`camera-${item.id}`}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => handlePhotoUpload(item.id, e)}
                              className="hidden"
                              disabled={isUploadingThis || isCompressingThis}
                            />
                            <label htmlFor={`camera-${item.id}`} className="block">
                              <Button
                                className="w-full h-14 cursor-pointer bg-white hover:bg-gray-50 text-sm md:text-base border-2"
                                disabled={isUploadingThis || isCompressingThis}
                                asChild
                              >
                                <span>
                                  {isUploadingThis || isCompressingThis ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  ) : (
                                    <Camera className="h-5 w-5 text-gray-600" />
                                  )}
                                </span>
                              </Button>
                            </label>

                            <input
                              id={`gallery-${item.id}`}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handlePhotoUpload(item.id, e)}
                              className="hidden"
                              disabled={isUploadingThis || isCompressingThis}
                            />
                            <label htmlFor={`gallery-${item.id}`} className="block">
                              <Button
                                className="w-full h-14 cursor-pointer bg-white hover:bg-gray-50 text-sm md:text-base border-2"
                                disabled={isUploadingThis || isCompressingThis}
                                asChild
                              >
                                <span>
                                  {isUploadingThis || isCompressingThis ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  ) : (
                                    <Plus className="h-5 w-5 text-gray-600" />
                                  )}
                                </span>
                              </Button>
                            </label>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="mt-6 md:mt-8 flex gap-3 justify-center sticky bottom-4 md:static">
          <Button
            onClick={saveToDrafts}
            variant="outline"
            size="lg"
            className="h-14 text-base md:text-lg border-2 border-[#5b9bd5] text-[#5b9bd5] hover:bg-[#5b9bd5] hover:text-white bg-transparent"
            disabled={!inspectorName.trim()}
          >
            <FileText className="h-5 w-5 mr-2" />
            Guardar Borrador
          </Button>

          <Button
            onClick={handleConfirmSave}
            disabled={
              !inspectorName.trim() ||
              Object.keys(uploadingPhotos).length > 0 ||
              Object.keys(compressingPhotos).length > 0
            }
            size="lg"
            className="flex-1 md:flex-none h-14 text-base md:text-lg bg-[#5b9bd5] hover:bg-[#4a8ac4] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Object.keys(uploadingPhotos).length > 0 || Object.keys(compressingPhotos).length > 0 ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Procesando fotos... ({Object.keys(uploadingPhotos).length + Object.keys(compressingPhotos).length})
              </>
            ) : (
              "Finalizar Inspección"
            )}
          </Button>
        </div>
      </main>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Finalización</DialogTitle>
            <DialogDescription>Revisa el resumen de la inspección antes de guardar</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Inspector:</span>
                <span className="font-medium">{inspectorName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Criterios evaluados:</span>
                <span className="font-medium">
                  {getTotalEvaluated().evaluated} de {getTotalEvaluated().total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Conformes:</span>
                <span className="font-medium text-green-600">
                  {Object.values(criteriaStates).filter((s) => s.status === "conforme").length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">No conformes:</span>
                <span className="font-medium text-red-600">
                  {Object.values(criteriaStates).filter((s) => s.status === "no-conforme").length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total de fotos:</span>
                <span className="font-medium">
                  {Object.values(criteriaStates).reduce((sum, state) => sum + state.photos.length, 0)}
                </span>
              </div>
            </div>
            {getTotalEvaluated().evaluated < getTotalEvaluated().total && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">⚠️ Hay criterios sin evaluar.</p>
              </div>
            )}
            {Object.values(criteriaStates).reduce((sum, state) => sum + state.photos.length, 0) === 0 && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  ⚠️ Tienes 0 fotos. El guardado puede tomar varios segundos.
                </p>
              </div>
            )}

            {saveError && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">❌ Error al guardar:</p>
                <p className="text-sm text-red-800 dark:text-red-200">{saveError}</p>
                {!isOnline && (
                  <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                    💡 Tus datos están guardados localmente. Cuando vuelva la señal, podrás intentar de nuevo.
                  </p>
                )}
              </div>
            )}

            {!isOnline && !saveError && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  ⚠️ Sin conexión a internet. Conecta tu dispositivo para guardar.
                </p>
              </div>
            )}

            {isSaving && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Guardando inspección...</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {isMobile
                      ? "En móvil puede tomar hasta 2 minutos. No cierres la app."
                      : "Esto puede tomar hasta un minuto con muchas fotos"}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setSaveError(null) // Clear error when closing
              }}
              size="lg"
              className="w-full sm:w-auto"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveInspection}
              size="lg"
              className="w-full sm:w-auto bg-[#054078] hover:bg-[#043060] text-white"
              disabled={isSaving || !isOnline}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : !isOnline ? (
                "Sin conexión"
              ) : (
                "Confirmar y Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditConfirmDialog} onOpenChange={setShowEditConfirmDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>¿Editar la foto?</DialogTitle>
            <DialogDescription>
              Puedes agregar anotaciones (círculos, flechas, texto) o usar la foto tal como está
            </DialogDescription>
          </DialogHeader>
          {pendingPhotoData && (
            <div className="py-4">
              <img
                src={pendingPhotoData.dataUrl || "/placeholder.svg"}
                alt="Vista previa"
                className="w-full h-48 object-cover rounded-lg border"
              />
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleUseOriginalPhoto}
              size="lg"
              className="w-full sm:w-auto bg-transparent"
            >
              Usar Original
            </Button>
            <Button
              onClick={handleOpenEditor}
              size="lg"
              className="w-full sm:w-auto bg-[#054078] hover:bg-[#043060] text-white"
            >
              Editar Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PhotoEditor
        imageUrl={currentEditingPhoto}
        isOpen={photoEditorOpen}
        onClose={() => {
          setCurrentEditingPhoto("")
          setCurrentEditingCriterionId("")
        }}
        onSave={handleSaveEditedPhoto}
      />

      <Dialog open={showDraftsDialog} onOpenChange={setShowDraftsDialog}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Borradores Guardados</DialogTitle>
            <DialogDescription>
              Inspecciones guardadas temporalmente. Se mantienen hasta que las finalices o elimines.
            </DialogDescription>
          </DialogHeader>

          {drafts.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hay borradores guardados</p>
              <p className="text-sm text-muted-foreground mt-1">
                Usa "Guardar Borrador" para guardar tu progreso sin finalizar
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {drafts.map((draft) => (
                <Card key={draft.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{draft.inspectorName}</p>
                        {!isOnline && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                            Sin conexión
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Evaluados:</span> {draft.evaluatedCount}/{draft.totalCount}
                        </div>
                        <div>
                          <span className="font-medium">Fotos:</span> {draft.photoCount}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(draft.timestamp).toLocaleString("es-PE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => loadDraft(draft.id)} size="sm" className="bg-[#054078] hover:bg-[#043060]">
                        Cargar
                      </Button>
                      <Button onClick={() => deleteDraft(draft.id)} size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDraftsDialog(false)} size="lg" className="w-full sm:w-auto">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHANGE START */}
      <Dialog open={showExitConfirmDialog} onOpenChange={setShowExitConfirmDialog}>
        <DialogContent className="w-[90vw] max-w-[400px] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">¿Deseas salir de la inspección?</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Si sales ahora, todos los cambios realizados en esta inspección se perderán permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button
              variant="destructive"
              onClick={() => {
                const autoSaveKey = `inspection_autosave_${areaId}_${checklistId}`
                localStorage.removeItem(autoSaveKey)
                setHasUnsavedChanges(false)
                router.back()
              }}
              size="lg"
              className="w-full text-base font-semibold py-6"
            >
              Descartar inspección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* CHANGE END */}
    </div>
  )
}
