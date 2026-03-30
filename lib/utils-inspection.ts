import type { Inspection, InspectionStats, Checklist, Finding } from "./types"

export function calculateInspectionStats(inspection: Inspection, checklist: Checklist): InspectionStats {
  const items = Array.isArray(checklist.items) ? checklist.items : []
  const findings = Array.isArray(inspection.findings) ? inspection.findings : []

  const totalCriteria = items.length

  const noConformeFindings = findings.filter((f) => f.status === "no-conforme")
  const totalFindings = noConformeFindings.length
  const findingsPercentage = totalCriteria > 0 ? (totalFindings / totalCriteria) * 100 : 0

  const conformeCount = findings.filter((f) => f.status === "conforme").length
  const noConformeCount = findings.filter((f) => f.status === "no-conforme").length
  const pendienteCount = findings.filter((f) => f.status === "pendiente").length

  // Para compatibilidad con el código existente, mapear los estados
  const resolvedFindings = conformeCount // Los conformes están "resueltos"
  const pendingFindings = pendienteCount // Los pendientes siguen pendientes
  const inProgressFindings = noConformeCount // Los no conformes están "en proceso"

  // Hallazgos por categoría (solo contar no conformes)
  const findingsByCategory: Record<string, number> = {}
  noConformeFindings.forEach((finding) => {
    const item = items.find((i) => i.id === finding.itemId)
    if (item) {
      findingsByCategory[item.category] = (findingsByCategory[item.category] || 0) + 1
    }
  })

  // Hallazgos por estado
  const findingsByStatus = {
    pendiente: pendienteCount,
    "en-proceso": noConformeCount,
    resuelto: conformeCount,
  }

  return {
    totalCriteria,
    totalFindings,
    findingsPercentage,
    resolvedFindings,
    pendingFindings,
    inProgressFindings,
    findingsByCategory,
    findingsByStatus,
  }
}

export function getAllOpenFindings(): Array<
  Finding & { inspectionId: string; areaName: string; checklistName: string }
> {
  // Esta función se implementará cuando tengamos acceso a todas las inspecciones
  return []
}

export function generateInspectionId(): string {
  return `insp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateFindingId(): string {
  return `find_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
