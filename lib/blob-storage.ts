"use server"

import { put, del } from "@vercel/blob"
import { Buffer } from "buffer"

/**
 * Comprime una imagen en base64 si excede el tamaño máximo
 * @param base64Data - Imagen en formato base64
 * @param maxSizeInBytes - Tamaño máximo en bytes (default: 4MB)
 * @returns Imagen comprimida en base64
 */
async function compressImageIfNeeded(base64Data: string, maxSizeInBytes = 4 * 1024 * 1024): Promise<string> {
  // Remover el prefijo data:image/... si existe
  const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data
  const prefix = base64Data.includes(",") ? base64Data.split(",")[0] + "," : ""

  const buffer = Buffer.from(base64Content, "base64")

  // Si la imagen es menor al límite, devolverla sin cambios
  if (buffer.length <= maxSizeInBytes) {
    return base64Data
  }

  console.log(`[v0] Imagen grande detectada (${(buffer.length / 1024 / 1024).toFixed(2)} MB), comprimiendo...`)

  try {
    // Importar sharp dinámicamente
    const sharp = (await import("sharp")).default

    // Calcular el factor de calidad basado en el tamaño
    const compressionRatio = maxSizeInBytes / buffer.length
    const quality = Math.max(60, Math.min(85, Math.floor(compressionRatio * 100)))

    console.log(`[v0] Aplicando compresión con calidad ${quality}%`)

    // Comprimir la imagen
    const compressedBuffer = await sharp(buffer).jpeg({ quality, mozjpeg: true }).toBuffer()

    console.log(
      `[v0] Imagen comprimida: ${(buffer.length / 1024 / 1024).toFixed(2)} MB → ${(compressedBuffer.length / 1024 / 1024).toFixed(2)} MB`,
    )

    return prefix + compressedBuffer.toString("base64")
  } catch (error) {
    console.error("[v0] Error comprimiendo imagen, usando original:", error)
    return base64Data
  }
}

/**
 * Sube una imagen a Vercel Blob Storage
 * @param base64Data - Imagen en formato base64 (con o sin prefijo data:image/...)
 * @param filename - Nombre del archivo (opcional)
 * @returns URL de la imagen en Blob Storage
 */
export async function uploadImageToBlob(base64Data: string, filename?: string): Promise<string> {
  try {
    console.log("[v0] Iniciando subida a Blob Storage...")

    const compressedData = await compressImageIfNeeded(base64Data)

    // Remover el prefijo data:image/... si existe
    const base64Content = compressedData.includes(",") ? compressedData.split(",")[1] : compressedData

    const buffer = Buffer.from(base64Content, "base64")

    const maxSize = 4.5 * 1024 * 1024
    if (buffer.length > maxSize) {
      throw new Error(`Imagen demasiado grande: ${(buffer.length / 1024 / 1024).toFixed(2)} MB. Máximo: 4.5 MB`)
    }

    const blob = new Blob([buffer], { type: "image/jpeg" })

    // Generar nombre único si no se proporciona
    const finalFilename = filename || `inspection-photo-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`

    console.log("[v0] Subiendo archivo:", finalFilename, "Tamaño:", (buffer.length / 1024 / 1024).toFixed(2), "MB")

    const uploadedBlob = await Promise.race([
      put(finalFilename, blob, {
        access: "public",
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout al subir imagen (30s)")), 30000)),
    ])

    console.log("[v0] Imagen subida exitosamente a Blob Storage:", uploadedBlob.url)
    return uploadedBlob.url
  } catch (error) {
    console.error("[v0] Error subiendo imagen a Blob Storage:", error)

    let errorMessage = "Error desconocido"
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === "string") {
      errorMessage = error
    } else {
      // Si el error no es un Error ni string, intentar extraer información útil
      try {
        errorMessage = JSON.stringify(error)
      } catch {
        errorMessage = "Error al procesar la respuesta del servidor"
      }
    }

    throw new Error(`Error al subir la imagen: ${errorMessage}`)
  }
}

/**
 * Sube múltiples imágenes a Vercel Blob Storage EN PARALELO
 * Optimizado para manejar hasta 200 fotos sin errores
 * @param images - Array de imágenes en base64
 * @param onProgress - Callback para reportar progreso (opcional)
 * @param batchSize - Número de imágenes a subir en paralelo (default: 25)
 * @returns Array de URLs de las imágenes
 */
export async function uploadMultipleImagesToBlob(
  images: string[],
  onProgress?: (current: number, total: number) => void,
  batchSize = 25, // Increased from 15 to 25 for more efficient uploads
): Promise<string[]> {
  const urls: string[] = []
  const total = images.length

  console.log(`[v0] Iniciando subida de ${total} imágenes en lotes de ${batchSize}...`)

  for (let i = 0; i < total; i += batchSize) {
    const batch = images.slice(i, Math.min(i + batchSize, total))
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(total / batchSize)

    console.log(`[v0] Procesando lote ${batchNumber}/${totalBatches} (${batch.length} imágenes)...`)

    // Subir todas las imágenes del lote en paralelo con manejo de errores
    const batchPromises = batch.map((image, idx) =>
      uploadImageToBlob(image).catch((error) => {
        console.error(`[v0] Error subiendo imagen ${i + idx + 1}:`, error)
        // Retornar una URL de placeholder en caso de error para no bloquear el proceso
        return ""
      }),
    )

    const batchUrls = await Promise.all(batchPromises)

    // Filtrar URLs vacías (errores)
    const validUrls = batchUrls.filter((url) => url !== "")
    urls.push(...validUrls)

    const failedCount = batchUrls.length - validUrls.length
    if (failedCount > 0) {
      console.warn(`[v0] ${failedCount} imagen(es) fallaron en el lote ${batchNumber}`)
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, total), total)
    }

    if (i + batchSize < total) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  console.log(`[v0] Subida completada: ${urls.length}/${total} imágenes exitosas`)

  return urls
}

/**
 * Elimina una imagen de Vercel Blob Storage
 * @param url - URL de la imagen a eliminar
 */
export async function deleteImageFromBlob(url: string): Promise<void> {
  try {
    await del(url)
    console.log("[v0] Imagen eliminada de Blob Storage:", url)
  } catch (error) {
    console.error("[v0] Error eliminando imagen de Blob Storage:", error)
    // No lanzar error para no bloquear otras operaciones
  }
}

/**
 * Elimina múltiples imágenes de Vercel Blob Storage
 * @param urls - Array de URLs de imágenes a eliminar
 */
export async function deleteMultipleImagesFromBlob(urls: string[]): Promise<void> {
  for (const url of urls) {
    await deleteImageFromBlob(url)
    // Pequeño delay para no saturar
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}
