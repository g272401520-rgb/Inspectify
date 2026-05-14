"use client"

import { useToast } from "@/hooks/use-toast"

/**
 * Tipos de validación de acciones
 */
export type ActionValidationType = 
  | "no-data"
  | "no-photos"
  | "no-information"
  | "no-hallazgos"
  | "no-criteria"
  | "invalid-state"

/**
 * Hook para validar acciones y mostrar avisos coherentes
 * Centraliza la lógica de validación y mensajes de error
 */
export function useActionValidation() {
  const { toast } = useToast()

  /**
   * Valida si hay datos disponibles
   * @param data - Datos a validar (pueden ser array, string, objeto)
   * @param actionName - Nombre de la acción (para mensaje personalizado)
   * @returns true si hay datos, false si no
   */
  const validateData = (data: any, actionName: string = "la acción"): boolean => {
    const isEmpty = 
      data === null ||
      data === undefined ||
      (Array.isArray(data) && data.length === 0) ||
      (typeof data === "string" && data.trim() === "") ||
      (typeof data === "object" && Object.keys(data).length === 0)

    if (isEmpty) {
      showValidationError("no-data", actionName)
      return false
    }

    return true
  }

  /**
   * Valida si hay fotos disponibles
   * @param photos - Array de fotos
   * @returns true si hay fotos, false si no
   */
  const validatePhotos = (photos: any[]): boolean => {
    if (!Array.isArray(photos) || photos.length === 0) {
      showValidationError("no-photos")
      return false
    }
    return true
  }

  /**
   * Valida información básica de inspección
   * @param lugar - Lugar de inspección
   * @param inspector - Inspector
   * @param responsable - Responsable
   * @returns true si todos los campos están completos
   */
  const validateInspectionInfo = (
    lugar: string,
    inspector: string,
    responsable: string
  ): boolean => {
    if (!lugar.trim() || !inspector.trim() || !responsable.trim()) {
      showValidationError("no-information")
      return false
    }
    return true
  }

  /**
   * Valida si hay hallazgos con fotos
   * @param hallazgos - Objeto con hallazgos
   * @returns true si hay al menos un hallazgo
   */
  const validateHallazgos = (hallazgos: Record<string, any>): boolean => {
    if (!hallazgos || Object.keys(hallazgos).length === 0) {
      showValidationError("no-hallazgos")
      return false
    }
    return true
  }

  /**
   * Muestra un error de validación con mensaje coherente
   */
  const showValidationError = (
    errorType: ActionValidationType,
    context?: string
  ): void => {
    const messages: Record<ActionValidationType, string> = {
      "no-data": `No hay datos disponibles para ${context || "realizar esta acción"}. Por favor, completa los campos requeridos primero.`,
      "no-photos": "No hay fotos capturadas. Debes capturar al menos una foto antes de descargar evidencias.",
      "no-information": "Información incompleta. Por favor completa el lugar, inspector y responsable antes de continuar.",
      "no-hallazgos": "No hay hallazgos registrados. Debes agregar al menos un hallazgo antes de generar el informe.",
      "no-criteria": "No hay criterios disponibles. Verifica que el checklist tenga criterios configurados.",
      "invalid-state": "Estado inválido. Por favor, recarga la página e intenta de nuevo.",
    }

    toast({
      title: "Acción no disponible",
      description: messages[errorType] || "No se puede realizar esta acción en este momento.",
      variant: "destructive",
    })
  }

  /**
   * Retorna un objeto con estado de validación y mensaje
   * Útil para componentes que necesitan mostrar estado diferente en UI
   */
  const getValidationStatus = (data: any, type: "data" | "photos" | "hallazgos" = "data") => {
    let isValid = false
    let message = ""

    switch (type) {
      case "photos":
        isValid = Array.isArray(data) && data.length > 0
        message = isValid ? "" : "Sin fotos capturadas"
        break
      case "hallazgos":
        isValid = data && Object.keys(data).length > 0
        message = isValid ? "" : "Sin hallazgos"
        break
      case "data":
      default:
        isValid = !!data
        message = isValid ? "" : "Sin datos"
    }

    return { isValid, message }
  }

  return {
    validateData,
    validatePhotos,
    validateInspectionInfo,
    validateHallazgos,
    getValidationStatus,
    showValidationError,
  }
}
