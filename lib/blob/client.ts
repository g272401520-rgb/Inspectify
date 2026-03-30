/**
 * Cliente de Vercel Blob para operaciones en el navegador
 * Proporciona funciones para subir, eliminar y listar archivos
 */

export interface BlobUploadResponse {
  url: string
  filename: string
  size: number
  type: string
}

export interface BlobFile {
  url: string
  pathname: string
  size: number
  uploadedAt: Date
}

/**
 * Sube un archivo a Vercel Blob Storage
 * @param file - Archivo a subir
 * @param onProgress - Callback para reportar progreso
 * @returns URL del archivo subido
 */
export async function uploadFileToBlob(file: File, onProgress?: (progress: number) => void): Promise<string> {
  try {
    const formData = new FormData()
    formData.append("file", file)

    const xhr = new XMLHttpRequest()

    // Reportar progreso
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100
          onProgress(percentComplete)
        }
      })
    }

    return new Promise((resolve, reject) => {
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText) as BlobUploadResponse
          resolve(response.url)
        } else {
          const error = JSON.parse(xhr.responseText)
          reject(new Error(error.error || "Error al subir archivo"))
        }
      })

      xhr.addEventListener("error", () => {
        reject(new Error("Error de conexión al subir archivo"))
      })

      xhr.open("POST", "/api/blob/upload")
      xhr.send(formData)
    })
  } catch (error) {
    console.error("[v0] Error uploading file to Blob:", error)
    throw error
  }
}

/**
 * Sube múltiples archivos a Vercel Blob Storage
 * @param files - Array de archivos a subir
 * @param onProgress - Callback para reportar progreso general
 * @returns Array de URLs de archivos subidos
 */
export async function uploadMultipleFilesToBlob(
  files: File[],
  onProgress?: (current: number, total: number) => void,
): Promise<string[]> {
  const urls: string[] = []
  const total = files.length

  for (let i = 0; i < total; i++) {
    try {
      const url = await uploadFileToBlob(files[i], (progress) => {
        if (onProgress) {
          onProgress(i + progress / 100, total)
        }
      })
      urls.push(url)
    } catch (error) {
      console.error(`[v0] Error uploading file ${i + 1}:`, error)
      // Continuar con el siguiente archivo
    }

    if (onProgress) {
      onProgress(i + 1, total)
    }
  }

  return urls
}

/**
 * Elimina un archivo de Vercel Blob Storage
 * @param url - URL del archivo a eliminar
 */
export async function deleteFileFromBlob(url: string): Promise<void> {
  try {
    const response = await fetch("/api/blob/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Error al eliminar archivo")
    }
  } catch (error) {
    console.error("[v0] Error deleting file from Blob:", error)
    throw error
  }
}

/**
 * Elimina múltiples archivos de Vercel Blob Storage
 * @param urls - Array de URLs de archivos a eliminar
 */
export async function deleteMultipleFilesFromBlob(urls: string[]): Promise<void> {
  for (const url of urls) {
    try {
      await deleteFileFromBlob(url)
      // Pequeño delay para no saturar
      await new Promise((resolve) => setTimeout(resolve, 50))
    } catch (error) {
      console.error(`[v0] Error deleting file ${url}:`, error)
      // Continuar con el siguiente archivo
    }
  }
}

/**
 * Lista todos los archivos en Vercel Blob Storage
 * @returns Array de archivos
 */
export async function listBlobFiles(): Promise<BlobFile[]> {
  try {
    const response = await fetch("/api/blob/list")

    if (!response.ok) {
      throw new Error("Error al listar archivos")
    }

    const data = await response.json()
    return data.files || []
  } catch (error) {
    console.error("[v0] Error listing Blob files:", error)
    return []
  }
}

/**
 * Descarga un archivo desde una URL
 * @param url - URL del archivo
 * @param filename - Nombre del archivo a descargar
 */
export async function downloadBlobFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()

    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  } catch (error) {
    console.error("[v0] Error downloading file:", error)
    throw error
  }
}
