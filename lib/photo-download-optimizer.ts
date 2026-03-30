"use client"

/**
 * Optimizador de descargas de fotos
 * Descarga múltiples fotos en paralelo sin bloquear la UI
 */

interface DownloadProgress {
  total: number
  completed: number
  percentage: number
  currentFile: string
}

type ProgressCallback = (progress: DownloadProgress) => void

export class PhotoDownloadOptimizer {
  /**
   * Descarga múltiples fotos en paralelo (máximo 5 simultáneas)
   */
  static async downloadPhotosOptimized(photoUrls: string[], onProgress?: ProgressCallback): Promise<void> {
    return downloadPhotosOptimized(photoUrls, onProgress)
  }

  /**
   * Descarga una foto individual
   */
  static async downloadPhotoOptimized(photoUrl: string, filename?: string): Promise<void> {
    return downloadPhotoOptimized(photoUrl, filename)
  }

  /**
   * Descarga fotos en background usando Web Worker
   */
  static async downloadPhotosInBackground(photoUrls: string[], onProgress?: ProgressCallback): Promise<void> {
    return downloadPhotosInBackground(photoUrls, onProgress)
  }

  /**
   * Comprime y descarga fotos en paralelo
   */
  static async downloadPhotosCompressed(
    photoUrls: string[],
    quality?: number,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    return downloadPhotosCompressed(photoUrls, quality, onProgress)
  }
}

export { downloadPhotosOptimized }

/**
 * Descarga múltiples fotos en paralelo (máximo 5 simultáneas)
 * Evita retardos bloqueando la UI
 */
async function downloadPhotosOptimized(photoUrls: string[], onProgress?: ProgressCallback): Promise<void> {
  const CONCURRENT_DOWNLOADS = 5
  const CHUNK_SIZE = 1024 * 1024 // 1MB chunks

  let completed = 0
  const total = photoUrls.length

  // Crear colas de descargas
  const queue = [...photoUrls]
  const activeDownloads = new Set<Promise<void>>()

  const downloadPhoto = async (url: string, index: number): Promise<void> => {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "image/*",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`)
      }

      const blob = await response.blob()

      // Reportar progreso
      completed++
      onProgress?.({
        total,
        completed,
        percentage: Math.round((completed / total) * 100),
        currentFile: `Foto ${index + 1} de ${total}`,
      })

      // Descargar al dispositivo
      downloadBlobToDevice(blob, `evidencia_${Date.now()}_${index + 1}.jpg`)
    } catch (error) {
      console.error(`[v0] Error descargando foto ${index + 1}:`, error)
      // Continuar con las siguientes fotos
    }
  }

  // Procesar descargas en paralelo (máximo 5 simultáneas)
  while (queue.length > 0 || activeDownloads.size > 0) {
    // Llenar slots disponibles
    while (activeDownloads.size < CONCURRENT_DOWNLOADS && queue.length > 0) {
      const url = queue.shift()!
      const index = photoUrls.indexOf(url)

      const downloadPromise = downloadPhoto(url, index).finally(() => activeDownloads.delete(downloadPromise))

      activeDownloads.add(downloadPromise)
    }

    // Esperar a que se complete al menos una descarga
    if (activeDownloads.size > 0) {
      await Promise.race(activeDownloads)
    }
  }
}

/**
 * Descarga una foto individual de forma optimizada
 */
async function downloadPhotoOptimized(photoUrl: string, filename = `evidencia_${Date.now()}.jpg`): Promise<void> {
  try {
    const response = await fetch(photoUrl, {
      method: "GET",
      headers: {
        Accept: "image/*",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`)
    }

    const blob = await response.blob()
    downloadBlobToDevice(blob, filename)
  } catch (error) {
    console.error("[v0] Error descargando foto:", error)
    throw error
  }
}

/**
 * Descarga un blob al dispositivo del usuario
 * Optimizado para no bloquear la UI
 */
function downloadBlobToDevice(blob: Blob, filename: string): void {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => {
      performDownload(blob, filename)
    })
  } else {
    // Fallback para navegadores sin requestIdleCallback
    setTimeout(() => {
      performDownload(blob, filename)
    }, 0)
  }
}

/**
 * Realiza la descarga actual
 */
function performDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename

  // Agregar al DOM, hacer click y remover
  document.body.appendChild(link)
  link.click()

  // Limpiar recursos
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Descarga fotos en background usando Web Worker
 * Para no bloquear la UI en absoluto
 */
async function downloadPhotosInBackground(photoUrls: string[], onProgress?: ProgressCallback): Promise<void> {
  // Si el navegador soporta Web Workers
  if (typeof Worker !== "undefined") {
    return downloadPhotosWithWorker(photoUrls, onProgress)
  }

  // Fallback: descargar en paralelo sin worker
  return downloadPhotosOptimized(photoUrls, onProgress)
}

/**
 * Descarga fotos usando Web Worker
 */
function downloadPhotosWithWorker(photoUrls: string[], onProgress?: ProgressCallback): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Crear worker inline
      const workerCode = `
        self.onmessage = async (event) => {
          const { photoUrls } = event.data
          let completed = 0
          
          for (const url of photoUrls) {
            try {
              const response = await fetch(url)
              const blob = await response.blob()
              
              self.postMessage({
                type: 'progress',
                completed: ++completed,
                total: photoUrls.length,
              })
            } catch (error) {
              console.error('Error en worker:', error)
            }
          }
          
          self.postMessage({ type: 'complete' })
        }
      `

      const blob = new Blob([workerCode], { type: "application/javascript" })
      const worker = new Worker(URL.createObjectURL(blob))

      worker.onmessage = (event) => {
        if (event.data.type === "progress") {
          onProgress?.({
            total: event.data.total,
            completed: event.data.completed,
            percentage: Math.round((event.data.completed / event.data.total) * 100),
            currentFile: `Foto ${event.data.completed} de ${event.data.total}`,
          })
        } else if (event.data.type === "complete") {
          worker.terminate()
          resolve()
        }
      }

      worker.onerror = (error) => {
        worker.terminate()
        reject(error)
      }

      worker.postMessage({ photoUrls })
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Comprime y descarga fotos en paralelo
 * Reduce tamaño antes de descargar
 */
async function downloadPhotosCompressed(
  photoUrls: string[],
  quality = 0.8,
  onProgress?: ProgressCallback,
): Promise<void> {
  const CONCURRENT_DOWNLOADS = 5

  let completed = 0
  const total = photoUrls.length
  const queue = [...photoUrls]
  const activeDownloads = new Set<Promise<void>>()

  const downloadAndCompress = async (url: string, index: number): Promise<void> => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()

      // Comprimir imagen
      const compressedBlob = await compressImage(blob, quality)

      completed++
      onProgress?.({
        total,
        completed,
        percentage: Math.round((completed / total) * 100),
        currentFile: `Foto ${index + 1} de ${total} (comprimida)`,
      })

      downloadBlobToDevice(compressedBlob, `evidencia_${Date.now()}_${index + 1}.jpg`)
    } catch (error) {
      console.error(`[v0] Error comprimiendo foto ${index + 1}:`, error)
    }
  }

  // Procesar en paralelo
  while (queue.length > 0 || activeDownloads.size > 0) {
    while (activeDownloads.size < CONCURRENT_DOWNLOADS && queue.length > 0) {
      const url = queue.shift()!
      const index = photoUrls.indexOf(url)

      const downloadPromise = downloadAndCompress(url, index).finally(() => activeDownloads.delete(downloadPromise))

      activeDownloads.add(downloadPromise)
    }

    if (activeDownloads.size > 0) {
      await Promise.race(activeDownloads)
    }
  }
}

/**
 * Comprime una imagen usando Canvas
 */
async function compressImage(blob: Blob, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("No se pudo obtener contexto de canvas"))
          return
        }

        // Mantener aspecto
        const maxWidth = 1920
        const maxHeight = 1080
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (compressedBlob) => {
            if (compressedBlob) {
              resolve(compressedBlob)
            } else {
              reject(new Error("Error comprimiendo imagen"))
            }
          },
          "image/jpeg",
          quality,
        )
      }

      img.onerror = () => reject(new Error("Error cargando imagen"))
      img.src = event.target?.result as string
    }

    reader.onerror = () => reject(new Error("Error leyendo archivo"))
    reader.readAsDataURL(blob)
  })
}
