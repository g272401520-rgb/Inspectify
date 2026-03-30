import { describe, it, expect, beforeEach, vi } from "vitest"
import { StorageManager } from "@/lib/storage-manager"

describe("StorageManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("debe calcular el uso de almacenamiento", async () => {
    const usage = await StorageManager.getUsage()

    expect(usage).toHaveProperty("used")
    expect(usage).toHaveProperty("quota")
    expect(usage).toHaveProperty("percentage")
    expect(usage.percentage).toBeGreaterThanOrEqual(0)
    expect(usage.percentage).toBeLessThanOrEqual(100)
  })

  it("debe verificar si hay espacio disponible", async () => {
    const hasSpace = await StorageManager.hasSpace(1024 * 1024) // 1MB
    expect(typeof hasSpace).toBe("boolean")
  })

  it("debe limpiar datos antiguos cuando sea necesario", async () => {
    const cleaned = await StorageManager.cleanOldData(30)
    expect(typeof cleaned).toBe("number")
    expect(cleaned).toBeGreaterThanOrEqual(0)
  })
})
