"use server"

import { createClient } from "./supabase/server"
import { logger } from "./logger"

export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return false
    }

    const { data, error } = await supabase.from("areas").select("id").limit(1)

    if (error) {
      // Códigos de error que indican que la tabla no existe
      const tableNotExistsCodes = ["42P01", "PGRST116", "PGRST204"]
      if (tableNotExistsCodes.includes(error.code || "")) {
        return false
      }
      // Si es otro tipo de error, loguear pero asumir que la tabla existe
      logger.warn("Error checking database, assuming initialized:", error)
      return true
    }

    return true
  } catch (error) {
    logger.error("Error verificando inicialización:", error)
    return false
  }
}

export async function initializeDatabase() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      logger.warn("Supabase no está configurado")
      return {
        success: false,
        message: "Supabase no está configurado",
        requiresSetup: true,
      }
    }

    const isInitialized = await isDatabaseInitialized()

    if (isInitialized) {
      return { success: true, message: "Base de datos ya inicializada" }
    }

    return {
      success: false,
      message: "Las tablas de la base de datos no existen",
      requiresSetup: true,
    }
  } catch (error) {
    logger.error("Error en inicialización de base de datos:", error)
    return {
      success: false,
      message: "Error inesperado al inicializar base de datos",
      requiresSetup: true,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
