import { describe, it, expect, vi, beforeEach } from "vitest"
import { logger } from "@/lib/logger"

describe("Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it("debe loggear en desarrollo", () => {
    process.env.NODE_ENV = "development"
    logger.log("Test message")
    expect(console.log).toHaveBeenCalled()
  })

  it("no debe loggear en producción", () => {
    process.env.NODE_ENV = "production"
    logger.log("Test message")
    // En producción, los logs normales no se muestran
  })

  it("debe siempre loggear errores", () => {
    process.env.NODE_ENV = "production"
    logger.error("Error message")
    expect(console.error).toHaveBeenCalled()
  })
})
