/**
 * Sistema de almacenamiento con IndexedDB
 * Optimizado para móviles con gran capacidad de almacenamiento
 */

const DB_NAME = "InspectifyCG"
const DB_VERSION = 1
const STORE_NAME = "appData"

interface DBItem {
  key: string
  value: any
  timestamp: number
  size: number
}

/**
 * Inicializa la base de datos IndexedDB
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB no disponible en servidor"))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Crear object store si no existe
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "key" })
        objectStore.createIndex("timestamp", "timestamp", { unique: false })
        objectStore.createIndex("size", "size", { unique: false })
      }
    }
  })
}

/**
 * Guarda un item en IndexedDB
 */
export async function setItem(key: string, value: any): Promise<boolean> {
  try {
    const db = await initDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    const serialized = JSON.stringify(value)
    const size = new Blob([serialized]).size

    const item: DBItem = {
      key,
      value,
      timestamp: Date.now(),
      size,
    }

    const request = store.put(item)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close()
        resolve(true)
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`[v0] Error guardando en IndexedDB:`, error)
    return false
  }
}

/**
 * Obtiene un item de IndexedDB
 */
export async function getItem<T = any>(key: string): Promise<T | null> {
  try {
    const db = await initDB()
    const transaction = db.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(key)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close()
        const result = request.result as DBItem | undefined
        resolve(result ? result.value : null)
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`[v0] Error leyendo de IndexedDB:`, error)
    return null
  }
}

/**
 * Elimina un item de IndexedDB
 */
export async function removeItem(key: string): Promise<boolean> {
  try {
    const db = await initDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(key)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close()
        resolve(true)
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`[v0] Error eliminando de IndexedDB:`, error)
    return false
  }
}

/**
 * Obtiene todos los items de IndexedDB
 */
export async function getAllItems(): Promise<DBItem[]> {
  try {
    const db = await initDB()
    const transaction = db.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close()
        resolve(request.result as DBItem[])
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`[v0] Error obteniendo items de IndexedDB:`, error)
    return []
  }
}

/**
 * Limpia items antiguos de IndexedDB
 */
export async function cleanOldItems(daysOld = 30): Promise<number> {
  try {
    const items = await getAllItems()
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000
    let deletedCount = 0

    // Filtrar items temporales y antiguos
    const itemsToDelete = items.filter((item) => item.key.startsWith("temp_") || item.timestamp < cutoffTime)

    for (const item of itemsToDelete) {
      // No eliminar items críticos
      if (item.key.includes("auth") || item.key.includes("session") || item.key.includes("user")) {
        continue
      }

      const deleted = await removeItem(item.key)
      if (deleted) deletedCount++
    }

    return deletedCount
  } catch (error) {
    console.error(`[v0] Error limpiando IndexedDB:`, error)
    return 0
  }
}

/**
 * Limpia completamente IndexedDB
 */
export async function clearAll(): Promise<boolean> {
  try {
    const db = await initDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close()
        console.log("[v0] IndexedDB limpiado completamente")
        resolve(true)
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`[v0] Error limpiando IndexedDB:`, error)
    return false
  }
}

/**
 * Obtiene el tamaño total de IndexedDB
 */
export async function getTotalSize(): Promise<number> {
  try {
    const items = await getAllItems()
    return items.reduce((total, item) => total + item.size, 0)
  } catch (error) {
    console.error(`[v0] Error calculando tamaño de IndexedDB:`, error)
    return 0
  }
}

/**
 * Migra datos de localStorage a IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<number> {
  if (typeof window === "undefined") return 0

  let migratedCount = 0

  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            const parsed = JSON.parse(value)
            await setItem(key, parsed)
            migratedCount++
          } catch {
            // Si no es JSON, guardar como string
            await setItem(key, value)
            migratedCount++
          }
        }
      }
    }

    console.log(`[v0] Migrados ${migratedCount} items de localStorage a IndexedDB`)
  } catch (error) {
    console.error(`[v0] Error migrando de localStorage:`, error)
  }

  return migratedCount
}
