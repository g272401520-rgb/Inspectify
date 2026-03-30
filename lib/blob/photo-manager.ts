/**
 * Gestor completo de fotos para inspecciones
 * Maneja carga, almacenamiento, eliminación y sincronización con Supabase
 */

import { uploadMultipleImagesToBlob, deleteMultipleImagesFromBlob } from "@/lib/blob-storage"
import { createClient } from "@/lib/supabase/client"

export interface PhotoMetadata {
  id: string
  url: string
  type: "evidence" | "solution" | "before" | "after"
  findingId: string
  uploadedAt: Date
  size: number
}

/**
 * Sube fotos de evidencia para un hallazgo
 * @param findingId - ID del hallazgo
 * @param base64Images - Array de imágenes en base64
 * @param photoType - Tipo de foto (evidence, solution, etc)
 * @param onProgress - Callback para reportar progreso
 * @returns Array de URLs de fotos subidas
 */
export async function uploadFindingPhotos(
  findingId: string,
  base64Images: string[],
  photoType: "evidence" | "solution" | "before" | "after" = "evidence",
  onProgress?: (current: number, total: number) => void,
): Promise<string[]> {
  try {
    console.log(`[v0] Subiendo ${base64Images.length} fotos para hallazgo ${findingId}...`)

    // Subir a Blob Storage
    const photoUrls = await uploadMultipleImagesToBlob(base64Images, onProgress)

    console.log(`[v0] ${photoUrls.length} fotos subidas exitosamente a Blob Storage`)

    // Guardar referencias en Supabase
    const supabase = createClient()
    const photoRecords = photoUrls.map((url) => ({
      finding_id: findingId,
      photo_url: url,
      photo_type: photoType,
    }))

    const { error } = await supabase.from("finding_photos").insert(photoRecords)

    if (error) {
      console.error("[v0] Error guardando referencias de fotos en Supabase:", error)
      // No lanzar error, las fotos ya están en Blob
    } else {
      console.log(`[v0] Referencias de fotos guardadas en Supabase`)
    }

    return photoUrls
  } catch (error) {
    console.error("[v0] Error subiendo fotos de hallazgo:", error)
    throw error
  }
}

/**
 * Elimina fotos de un hallazgo
 * @param findingId - ID del hallazgo
 * @param photoUrls - URLs de fotos a eliminar
 */
export async function deleteFindingPhotos(findingId: string, photoUrls: string[]): Promise<void> {
  try {
    console.log(`[v0] Eliminando ${photoUrls.length} fotos del hallazgo ${findingId}...`)

    // Eliminar de Supabase
    const supabase = createClient()
    const { error: dbError } = await supabase
      .from("finding_photos")
      .delete()
      .eq("finding_id", findingId)
      .in("photo_url", photoUrls)

    if (dbError) {
      console.error("[v0] Error eliminando referencias de Supabase:", dbError)
    }

    // Eliminar de Blob Storage
    await deleteMultipleImagesFromBlob(photoUrls)

    console.log(`[v0] Fotos eliminadas exitosamente`)
  } catch (error) {
    console.error("[v0] Error eliminando fotos:", error)
    throw error
  }
}

/**
 * Obtiene todas las fotos de un hallazgo
 * @param findingId - ID del hallazgo
 * @returns Array de URLs de fotos
 */
export async function getFindingPhotos(findingId: string): Promise<string[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("finding_photos").select("photo_url").eq("finding_id", findingId)

    if (error) {
      console.error("[v0] Error obteniendo fotos:", error)
      return []
    }

    return data?.map((p) => p.photo_url) || []
  } catch (error) {
    console.error("[v0] Error fetching finding photos:", error)
    return []
  }
}

/**
 * Obtiene fotos de un tipo específico
 * @param findingId - ID del hallazgo
 * @param photoType - Tipo de foto a obtener
 * @returns Array de URLs de fotos
 */
export async function getFindingPhotosByType(
  findingId: string,
  photoType: "evidence" | "solution" | "before" | "after",
): Promise<string[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("finding_photos")
      .select("photo_url")
      .eq("finding_id", findingId)
      .eq("photo_type", photoType)

    if (error) {
      console.error("[v0] Error obteniendo fotos por tipo:", error)
      return []
    }

    return data?.map((p) => p.photo_url) || []
  } catch (error) {
    console.error("[v0] Error fetching photos by type:", error)
    return []
  }
}

/**
 * Reemplaza todas las fotos de un hallazgo
 * @param findingId - ID del hallazgo
 * @param newBase64Images - Nuevas imágenes en base64
 * @param photoType - Tipo de foto
 * @param onProgress - Callback para reportar progreso
 * @returns Array de URLs de nuevas fotos
 */
export async function replaceFindingPhotos(
  findingId: string,
  newBase64Images: string[],
  photoType: "evidence" | "solution" | "before" | "after" = "evidence",
  onProgress?: (current: number, total: number) => void,
): Promise<string[]> {
  try {
    // Obtener fotos antiguas
    const oldPhotos = await getFindingPhotosByType(findingId, photoType)

    // Eliminar fotos antiguas
    if (oldPhotos.length > 0) {
      await deleteFindingPhotos(findingId, oldPhotos)
    }

    // Subir nuevas fotos
    return await uploadFindingPhotos(findingId, newBase64Images, photoType, onProgress)
  } catch (error) {
    console.error("[v0] Error reemplazando fotos:", error)
    throw error
  }
}

/**
 * Obtiene estadísticas de fotos de una inspección
 * @param inspectionId - ID de la inspección
 * @returns Estadísticas de fotos
 */
export async function getInspectionPhotoStats(inspectionId: string): Promise<{
  totalPhotos: number
  evidencePhotos: number
  solutionPhotos: number
  totalSize: number
}> {
  try {
    const supabase = createClient()

    // Obtener todos los hallazgos de la inspección
    const { data: findings } = await supabase.from("findings").select("id").eq("inspection_id", inspectionId)

    if (!findings || findings.length === 0) {
      return { totalPhotos: 0, evidencePhotos: 0, solutionPhotos: 0, totalSize: 0 }
    }

    const findingIds = findings.map((f) => f.id)

    // Obtener todas las fotos
    const { data: photos } = await supabase.from("finding_photos").select("photo_type").in("finding_id", findingIds)

    const stats = {
      totalPhotos: photos?.length || 0,
      evidencePhotos: photos?.filter((p) => p.photo_type === "evidence").length || 0,
      solutionPhotos: photos?.filter((p) => p.photo_type === "solution").length || 0,
      totalSize: 0, // Calcular si es necesario
    }

    return stats
  } catch (error) {
    console.error("[v0] Error getting photo stats:", error)
    return { totalPhotos: 0, evidencePhotos: 0, solutionPhotos: 0, totalSize: 0 }
  }
}
