"use client"

/**
 * Utilidades para manejar la captura de fotos desde cámara en dispositivos móviles
 * Soluciona problemas de compatibilidad con navegadores móviles
 */

export async function handleCameraCapture(file: File): Promise<string> {
  console.log("[v0] Camera capture handler - Processing file:", file.name, file.type, file.size)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      try {
        const result = reader.result as string
        console.log("[v0] Camera capture handler - File read successfully, size:", result.length)
        resolve(result)
      } catch (error) {
        console.error("[v0] Camera capture handler - Error processing result:", error)
        reject(new Error("Error al procesar la foto de cámara"))
      }
    }

    reader.onerror = () => {
      console.error("[v0] Camera capture handler - FileReader error:", reader.error)
      reject(new Error("Error al leer el archivo de cámara"))
    }

    reader.onabort = () => {
      console.error("[v0] Camera capture handler - FileReader aborted")
      reject(new Error("Lectura de archivo cancelada"))
    }

    try {
      console.log("[v0] Camera capture handler - Starting to read file as DataURL")
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("[v0] Camera capture handler - Error starting read:", error)
      reject(new Error("Error al iniciar lectura de archivo"))
    }
  })
}

export async function validateCameraFile(file: File): Promise<{ valid: boolean; error?: string }> {
  console.log("[v0] Validating camera file:", file.name, file.type, file.size)

  // Validar tipo de archivo
  if (!file.type.startsWith("image/")) {
    console.error("[v0] Invalid file type:", file.type)
    return { valid: false, error: "El archivo debe ser una imagen" }
  }

  // Validar tamaño (máximo 50MB)
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    console.error("[v0] File too large:", file.size)
    return { valid: false, error: "La imagen es demasiado grande (máximo 50MB)" }
  }

  // Validar tamaño mínimo (al menos 1KB)
  if (file.size < 1024) {
    console.error("[v0] File too small:", file.size)
    return { valid: false, error: "La imagen es demasiado pequeña" }
  }

  console.log("[v0] File validation passed")
  return { valid: true }
}
