"use server"

import { revalidatePath } from "next/cache"
import type { Area, Checklist, Inspection } from "./types"
import {
  getAreas,
  getChecklists,
  getChecklistsByArea,
  getChecklistById,
  getInspections,
  getInspectionsByArea,
  getInspectionsByChecklist,
  getInspectionById,
  getInspectionsWithFindings,
  exportData,
  saveArea,
  deleteArea,
  saveChecklist,
  deleteChecklist,
  saveInspection,
  deleteInspection,
  clearAllData,
  importData,
  cleanOrphanedInspections,
} from "./storage.server"
import { uploadMultipleImagesToBlob } from "./blob-storage"
import { initializeDatabase, isDatabaseInitialized } from "./db-init"
import { logger } from "./logger" // Assuming logger is imported from another file

export { initializeDatabase, isDatabaseInitialized }

export async function saveAreaAction(area: Area) {
  const result = await saveArea(area)
  revalidatePath("/")
  revalidatePath("/area")
  return result
}

export async function deleteAreaAction(id: string) {
  const result = await deleteArea(id)
  revalidatePath("/")
  revalidatePath("/area")
  return result
}

export async function saveChecklistAction(checklist: Checklist) {
  const result = await saveChecklist(checklist)
  revalidatePath("/")
  revalidatePath("/area")
  revalidatePath(`/area/${checklist.areaId}`)
  return result
}

export async function deleteChecklistAction(id: string) {
  const result = await deleteChecklist(id)
  revalidatePath("/")
  revalidatePath("/area")
  return result
}

export async function saveInspectionAction(
  inspection: Inspection,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Validar datos antes de enviar
    if (!inspection.areaId || !inspection.checklistId) {
      return { success: false, error: "Faltan datos requeridos: área o checklist" }
    }

    if (!inspection.inspectorName || inspection.inspectorName.trim() === "") {
      return { success: false, error: "El nombre del inspector es requerido" }
    }

    // Serializar correctamente la inspección eliminando datos no serializables
    const serializedInspection: Inspection = {
      id: inspection.id,
      areaId: inspection.areaId,
      checklistId: inspection.checklistId,
      date: typeof inspection.date === "string" ? inspection.date : new Date(inspection.date).toISOString(),
      inspectorName: inspection.inspectorName.trim(),
      status: inspection.status,
      findings: inspection.findings.map((finding) => ({
        id: finding.id,
        itemId: finding.itemId,
        description: finding.description || "",
        status: finding.status,
        correctiveAction: finding.correctiveAction || "",
        dueDate: finding.dueDate || "",
        closedDate: finding.closedDate || "",
        trackingStatus: finding.trackingStatus || "pendiente",
        // Solo incluir URLs de fotos, NO thumbnails ni base64
        photos: finding.photos.filter((photo) => photo.startsWith("http")),
        solutionPhotos: finding.solutionPhotos?.filter((photo) => photo.startsWith("http")) || [],
        // NO incluir thumbnails en el servidor
      })),
    }

    logger.log(
      `Guardando inspección con ${serializedInspection.findings.length} hallazgos y ${serializedInspection.findings.reduce((sum, f) => sum + f.photos.length, 0)} fotos`,
    )

    const result = await saveInspection(serializedInspection)

    if (result.success) {
      revalidatePath("/historial")
      revalidatePath("/consolidado")
      revalidatePath("/seguimiento")
      revalidatePath(`/resultados/${result.id}`)
    }

    return result
  } catch (error) {
    logger.error("Error en saveInspectionAction:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al guardar la inspección",
    }
  }
}

export async function deleteInspectionAction(id: string) {
  const result = await deleteInspection(id)
  revalidatePath("/")
  revalidatePath("/historial")
  revalidatePath("/seguimiento")
  return result
}

export async function clearAllDataAction() {
  await clearAllData()
  revalidatePath("/")
}

export async function importDataAction(jsonData: string) {
  await importData(jsonData)
  revalidatePath("/")
}

export async function cleanOrphanedInspectionsAction() {
  await cleanOrphanedInspections()
  revalidatePath("/")
}

export async function exportDatabase() {
  try {
    const data = await exportData()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al exportar la base de datos",
    }
  }
}

export async function importDatabase(data: any) {
  try {
    await importData(JSON.stringify(data))
    revalidatePath("/")
    revalidatePath("/respaldo")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al importar la base de datos",
    }
  }
}

export async function uploadPhotosAction(images: string[]): Promise<string[]> {
  return await uploadMultipleImagesToBlob(images, undefined, 15)
}

export async function getAreasAction() {
  return await getAreas()
}

export async function getChecklistsAction() {
  return await getChecklists()
}

export async function getChecklistsByAreaAction(areaId: string) {
  return await getChecklistsByArea(areaId)
}

export async function getChecklistByIdAction(id: string) {
  return await getChecklistById(id)
}

export async function getInspectionsAction() {
  return await getInspections()
}

export async function getInspectionsByAreaAction(areaId: string) {
  return await getInspectionsByArea(areaId)
}

export async function getInspectionsByChecklistAction(checklistId: string) {
  return await getInspectionsByChecklist(checklistId)
}

export async function getInspectionByIdAction(id: string) {
  return await getInspectionById(id)
}

export async function getInspectionsWithFindingsAction() {
  return await getInspectionsWithFindings()
}

export async function exportDataAction() {
  return await exportData()
}
