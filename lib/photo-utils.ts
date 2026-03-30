/**
 * Descarga automáticamente una foto en el dispositivo del usuario
 * @param base64Image - Imagen en formato base64
 * @param fileName - Nombre del archivo (opcional)
 */
export function downloadPhotoToDevice(base64Image: string, fileName?: string): void {
  try {
    // Crear un enlace temporal para descargar
    const link = document.createElement("a")
    link.href = base64Image
    link.download = fileName || `foto_${Date.now()}.jpg`

    // Simular click para iniciar descarga
    document.body.appendChild(link)
    link.click()

    // Limpiar
    document.body.removeChild(link)
  } catch (error) {
    console.error("[v0] Error al descargar foto:", error)
  }
}

/**
 * Genera un nombre de archivo descriptivo para una foto
 * @param prefix - Prefijo para el nombre del archivo
 * @param index - Índice de la foto (opcional)
 */
export function generatePhotoFileName(prefix: string, index?: number): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
  const indexStr = index !== undefined ? `_${index + 1}` : ""
  return `${prefix}${indexStr}_${timestamp}.jpg`
}
