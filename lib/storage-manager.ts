/**
 * Gestión inteligente de almacenamiento con IndexedDB y Storage API
 * Optimizado para móviles con gran capacidad
 */

import { getAllItems, getTotalSize, cleanOldItems } from "./indexed-db"

const WARNING_THRESHOLD = 0.8 // Advertir al 80% de capacidad

/**
 * Obtiene la cuota de almacenamiento disponible usando Storage API
 */
export async function getStorageQuota(): Promise<{
  usage: number
  quota: number
  usagePercentage: number
}> {
  if (typeof navigator === "undefined" || !navigator.storage || !navigator.storage.estimate) {
    return { usage: 0, quota: 0, usagePercentage: 0 }
  }

  try {
    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage || 0
    const quota = estimate.quota || 0
    const usagePercentage = quota > 0 ? (usage / quota) * 100 : 0

    return { usage, quota, usagePercentage }
  } catch (error) {
    console.error("[v0] Error obteniendo cuota de almacenamiento:", error)
    return { usage: 0, quota: 0, usagePercentage: 0 }
  }
}

/**
 * Obtiene estadísticas detalladas de almacenamiento
 */
export async function getStorageStats() {
  const items = await getAllItems()
  const totalSize = await getTotalSize()
  const quota = await getStorageQuota()

  // Ordenar items por tamaño
  const sortedItems = items.sort((a, b) => b.size - a.size)

  return {
    // Tamaños
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    totalSizeBytes: totalSize,

    // Cuota del sistema
    quotaUsageMB: (quota.usage / (1024 * 1024)).toFixed(2),
    quotaTotalMB: (quota.quota / (1024 * 1024)).toFixed(2),
    quotaUsagePercentage: quota.usagePercentage.toFixed(1),

    // Items
    itemCount: items.length,
    largestItems: sortedItems.slice(0, 5).map((item) => ({
      key: item.key,
      sizeMB: (item.size / (1024 * 1024)).toFixed(2),
      timestamp: new Date(item.timestamp).toLocaleString("es-ES"),
    })),

    // Alertas
    isNearLimit: quota.usagePercentage > WARNING_THRESHOLD * 100,
    warningThreshold: WARNING_THRESHOLD * 100,
  }
}

/**
 * Limpia almacenamiento antiguo automáticamente
 */
export async function autoCleanStorage(daysOld = 30): Promise<number> {
  try {
    const quota = await getStorageQuota()

    // Solo limpiar si estamos cerca del límite
    if (quota.usagePercentage > WARNING_THRESHOLD * 100) {
      console.warn(`[v0] Almacenamiento al ${quota.usagePercentage.toFixed(1)}% de capacidad. Ejecutando limpieza...`)
      const deletedCount = await cleanOldItems(daysOld)
      console.log(`[v0] Eliminados ${deletedCount} items antiguos`)
      return deletedCount
    }

    return 0
  } catch (error) {
    console.error("[v0] Error en limpieza automática:", error)
    return 0
  }
}

/**
 * Verifica si hay espacio suficiente para guardar datos
 */
export async function hasStorageSpace(estimatedSizeBytes: number): Promise<boolean> {
  try {
    const quota = await getStorageQuota()

    // Si no hay cuota disponible, asumir que hay espacio
    if (quota.quota === 0) return true

    const availableSpace = quota.quota - quota.usage
    return availableSpace > estimatedSizeBytes
  } catch (error) {
    console.error("[v0] Error verificando espacio:", error)
    return true // Asumir que hay espacio en caso de error
  }
}

/**
 * Inicializa el monitoreo de almacenamiento
 */
export async function initStorageMonitoring(): Promise<void> {
  if (typeof window === "undefined") return

  try {
    const quota = await getStorageQuota()

    if (quota.usagePercentage > WARNING_THRESHOLD * 100) {
      console.warn(
        `[v0] Almacenamiento al ${quota.usagePercentage.toFixed(1)}% de capacidad (${quota.usagePercentage.toFixed(2)} MB / ${(quota.quota / (1024 * 1024)).toFixed(2)} MB)`,
      )

      // Ejecutar limpieza automática
      await autoCleanStorage(30)
    }
  } catch (error) {
    console.error("[v0] Error inicializando monitoreo:", error)
  }
}

// Inicializar monitoreo al cargar el módulo
if (typeof window !== "undefined") {
  initStorageMonitoring()
}
