import { describe, it, expect, vi } from "vitest"
import { PhotoDownloadOptimizer } from "@/lib/photo-download-optimizer"

describe("PhotoDownloadOptimizer", () => {
  it("debe descargar fotos en paralelo", async () => {
    const mockUrls = [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
      "https://example.com/photo3.jpg",
    ]

    const mockProgress = vi.fn()

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["test"], { type: "image/jpeg" })),
    })

    const result = await PhotoDownloadOptimizer.downloadParallel(mockUrls, {
      onProgress: mockProgress,
      concurrency: 2,
    })

    expect(result.successful).toBe(3)
    expect(result.failed).toBe(0)
    expect(mockProgress).toHaveBeenCalled()
  })

  it("debe manejar errores de descarga correctamente", async () => {
    const mockUrls = ["https://example.com/invalid.jpg"]

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

    const result = await PhotoDownloadOptimizer.downloadParallel(mockUrls)

    expect(result.successful).toBe(0)
    expect(result.failed).toBe(1)
    expect(result.errors.length).toBe(1)
  })
})
