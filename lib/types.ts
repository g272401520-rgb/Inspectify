export interface Area {
  id: string
  name: string
  responsible: string
  createdAt: string
}

export interface ChecklistItem {
  id: string
  category: string
  criterion: string
  details?: string
}

export interface Checklist {
  id: string
  name: string
  areaId: string
  items: ChecklistItem[]
  createdAt: string
  type?: "normal" | "registro" // Tipo de checklist: normal o registro
}

export interface Finding {
  id: string
  itemId: string
  description: string
  photos: string[]
  thumbnails?: string[] // Miniaturas para renderizado rápido en móvil
  status: "conforme" | "no-conforme" | "pendiente"
  trackingStatus?: "pendiente" | "en-proceso" | "resuelto"
  correctiveAction?: string
  dueDate?: string
  closedDate?: string
  solutionPhotos: string[]
}

export interface Inspection {
  id: string
  areaId: string
  checklistId: string
  date: string
  findings: Finding[]
  inspectorName: string
  status: "en-progreso" | "completada"
}

export interface InspectionStats {
  totalCriteria: number
  totalFindings: number
  findingsPercentage: number
  resolvedFindings: number
  pendingFindings: number
  inProgressFindings: number
  findingsByCategory: Record<string, number>
  findingsByStatus: Record<string, number>
}

export interface ChecklistCategory {
  id: string
  name: string
  criteria: ChecklistCriterion[]
}

export interface ChecklistCriterion {
  id: string
  name: string
  subcriteria: ChecklistSubcriterion[]
  details?: string
}

export interface ChecklistSubcriterion {
  id: string
  name: string
  details?: string
}
