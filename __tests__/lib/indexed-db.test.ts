import { describe, it, expect, beforeEach, vi } from "vitest"
import { InspectifyDB } from "@/lib/indexed-db"

describe("IndexedDB", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("debe inicializar la base de datos correctamente", async () => {
    const db = InspectifyDB.getInstance()
    expect(db).toBeDefined()
  })

  it("debe guardar y recuperar un item", async () => {
    const db = InspectifyDB.getInstance()
    const testData = { id: "test-1", name: "Test Area" }

    await db.set("areas", "test-1", testData)
    const retrieved = await db.get("areas", "test-1")

    expect(retrieved).toEqual(testData)
  })

  it("debe listar todos los items de una store", async () => {
    const db = InspectifyDB.getInstance()
    const testData1 = { id: "test-1", name: "Area 1" }
    const testData2 = { id: "test-2", name: "Area 2" }

    await db.set("areas", "test-1", testData1)
    await db.set("areas", "test-2", testData2)

    const all = await db.getAll("areas")
    expect(all.length).toBeGreaterThanOrEqual(2)
  })

  it("debe eliminar un item correctamente", async () => {
    const db = InspectifyDB.getInstance()
    const testData = { id: "test-delete", name: "To Delete" }

    await db.set("areas", "test-delete", testData)
    await db.delete("areas", "test-delete")

    const retrieved = await db.get("areas", "test-delete")
    expect(retrieved).toBeUndefined()
  })
})
