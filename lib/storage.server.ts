"use server"

import type { Area, Checklist, Inspection } from "./types"
import { createClient } from "./supabase/server"
import { logger } from "./logger"

async function getSupabaseOrNull() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      logger.warn("Supabase no está configurado")
      return null
    }
    return supabase
  } catch (error: any) {
    logger.error("Error al crear cliente Supabase:", error.message || error)
    return null
  }
}

async function checkTablesExist(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase.from("areas").select("id").limit(1)

    if (error) {
      // Detectar errores de tabla no existente
      const errorMsg = error.message?.toLowerCase() || ""
      if (
        (errorMsg.includes("relation") && errorMsg.includes("does not exist")) ||
        (errorMsg.includes("table") && errorMsg.includes("not found")) ||
        errorMsg.includes("invalid") ||
        errorMsg.includes("syntax error")
      ) {
        logger.error("Las tablas de Supabase no existen. Ejecuta: scripts/001_create_tables.sql")
        return false
      }
    }

    return true
  } catch (err: any) {
    logger.error("Error verificando tablas:", err.message || err)
    return false
  }
}

// Areas
export async function getAreas(): Promise<Area[]> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return []

  const tablesExist = await checkTablesExist(supabase)
  if (!tablesExist) return []

  try {
    const { data, error } = await supabase.from("areas").select("*").order("created_at", { ascending: false })

    if (error) {
      logger.error("Error fetching areas:", error.message || error)
      return []
    }

    return (
      data?.map((area) => ({
        id: area.id,
        name: area.name,
        responsible: area.responsible || "",
        createdAt: area.created_at,
      })) || []
    )
  } catch (err: any) {
    const errorMsg = err.message || String(err)
    if (errorMsg.includes("JSON") || errorMsg.includes("Unexpected token")) {
      logger.error("Error de conexión con Supabase. Las tablas probablemente no existen.")
      return []
    }
    logger.error("Error inesperado al obtener áreas:", errorMsg)
    return []
  }
}

export async function saveArea(area: Area): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return { success: false, error: "Supabase no está configurado" }

  const isUUID = area.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

  if (isUUID) {
    const { error } = await supabase
      .from("areas")
      .update({
        name: area.name,
        responsible: area.responsible,
      })
      .eq("id", area.id)

    if (error) {
      logger.error("Error updating area:", error)
      return { success: false, error: error.message }
    }
    return { success: true, id: area.id }
  } else {
    const { data, error } = await supabase
      .from("areas")
      .insert({
        name: area.name,
        responsible: area.responsible,
      })
      .select()
      .single()

    if (error) {
      logger.error("Error inserting area:", error)
      return { success: false, error: error.message }
    }
    return { success: true, id: data.id }
  }
}

export async function deleteArea(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return { success: false, error: "Supabase no está configurado" }

  try {
    const { data: inspections } = await supabase.from("inspections").select("id").eq("area_id", id)
    const inspectionIds = inspections?.map((i) => i.id) || []

    if (inspectionIds.length > 0) {
      const { data: findings } = await supabase.from("findings").select("id").in("inspection_id", inspectionIds)
      const findingIds = findings?.map((f) => f.id) || []

      if (findingIds.length > 0) {
        await supabase.from("finding_photos").delete().in("finding_id", findingIds)
      }

      await supabase.from("findings").delete().in("inspection_id", inspectionIds)
      await supabase.from("inspections").delete().eq("area_id", id)
    }

    const { data: checklists } = await supabase.from("checklists").select("id").eq("area_id", id)
    const checklistIds = checklists?.map((c) => c.id) || []

    if (checklistIds.length > 0) {
      await supabase.from("checklist_items").delete().in("checklist_id", checklistIds)
      await supabase.from("checklists").delete().eq("area_id", id)
    }

    const { error } = await supabase.from("areas").delete().eq("id", id)

    if (error) {
      logger.error("Error deleting area:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    logger.error("Error deleting area:", error)
    return { success: false, error: error.message }
  }
}

// Checklists
export async function getChecklists(): Promise<Checklist[]> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return []

  try {
    const { data: checklistsData, error: checklistsError } = await supabase
      .from("checklists")
      .select("*")
      .order("created_at", { ascending: false })

    if (checklistsError) {
      logger.error("Error fetching checklists:", checklistsError.message || checklistsError)
      return []
    }

    const checklists: Checklist[] = []
    for (const checklist of checklistsData || []) {
      const { data: itemsData, error: itemsError } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("checklist_id", checklist.id)
        .order("position", { ascending: true })

      if (itemsError) {
        logger.error("Error fetching checklist items:", itemsError.message || itemsError)
        continue
      }

      checklists.push({
        id: checklist.id,
        name: checklist.name,
        areaId: checklist.area_id,
        type: checklist.type as "normal" | "registro",
        createdAt: checklist.created_at,
        items:
          itemsData?.map((item) => ({
            id: item.id,
            category: item.category,
            criterion: item.criterion,
            details: item.details,
          })) || [],
      })
    }

    return checklists
  } catch (err: any) {
    logger.error("Error inesperado al obtener checklists:", err.message || err)
    return []
  }
}

export async function getChecklistsByArea(areaId: string): Promise<Checklist[]> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return []

  try {
    const { data: checklistsData, error: checklistsError } = await supabase
      .from("checklists")
      .select("*")
      .eq("area_id", areaId)
      .order("created_at", { ascending: false })

    if (checklistsError) {
      logger.error("Error fetching checklists by area:", checklistsError.message || checklistsError)
      return []
    }

    const checklists: Checklist[] = []
    for (const checklist of checklistsData || []) {
      const { data: itemsData, error: itemsError } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("checklist_id", checklist.id)
        .order("position", { ascending: true })

      if (itemsError) {
        logger.error("Error fetching checklist items:", itemsError.message || itemsError)
        continue
      }

      checklists.push({
        id: checklist.id,
        name: checklist.name,
        areaId: checklist.area_id,
        type: checklist.type as "normal" | "registro",
        createdAt: checklist.created_at,
        items:
          itemsData?.map((item) => ({
            id: item.id,
            category: item.category,
            criterion: item.criterion,
            details: item.details,
          })) || [],
      })
    }

    return checklists
  } catch (err: any) {
    logger.error("Error inesperado al obtener checklists por área:", err.message || err)
    return []
  }
}

export async function getChecklistById(id: string): Promise<Checklist | null> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return null

  try {
    const { data: checklistData, error: checklistError } = await supabase
      .from("checklists")
      .select("*")
      .eq("id", id)
      .single()

    if (checklistError) {
      logger.error("Error fetching checklist:", checklistError.message || checklistError)
      return null
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("checklist_id", checklistData.id)
      .order("position", { ascending: true })

    if (itemsError) {
      logger.error("Error fetching checklist items:", itemsError.message || itemsError)
      return null
    }

    return {
      id: checklistData.id,
      name: checklistData.name,
      areaId: checklistData.area_id,
      type: checklistData.type as "normal" | "registro",
      createdAt: checklistData.created_at,
      items:
        itemsData?.map((item) => ({
          id: item.id,
          category: item.category,
          criterion: item.criterion,
          details: item.details,
        })) || [],
    }
  } catch (err: any) {
    logger.error("Error inesperado al obtener checklist por ID:", err.message || err)
    return null
  }
}

export async function saveChecklist(checklist: Checklist): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await getSupabaseOrNull()

  const isUUID = checklist.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

  let checklistExists = false
  if (isUUID) {
    const { data: existingChecklist } = await supabase.from("checklists").select("id").eq("id", checklist.id).single()

    checklistExists = !!existingChecklist
  }

  if (isUUID && checklistExists) {
    const { error: checklistError } = await supabase
      .from("checklists")
      .update({
        name: checklist.name,
        area_id: checklist.areaId,
        type: checklist.type || "normal",
      })
      .eq("id", checklist.id)

    if (checklistError) {
      logger.error("Error updating checklist:", checklistError)
      return { success: false, error: checklistError.message }
    }

    await supabase.from("checklist_items").delete().eq("checklist_id", checklist.id)

    if (checklist.items && checklist.items.length > 0) {
      const { error: itemsError } = await supabase.from("checklist_items").insert(
        checklist.items.map((item, index) => ({
          checklist_id: checklist.id,
          category: item.category,
          criterion: item.criterion,
          subcriterion: null,
          details: item.details || null,
          position: index,
        })),
      )

      if (itemsError) {
        logger.error("Error updating checklist items:", itemsError)
        return { success: false, error: itemsError.message }
      }
    }

    return { success: true, id: checklist.id }
  } else {
    // If it's a valid UUID that doesn't exist, preserve it; otherwise let DB generate new one
    const insertData: any = {
      name: checklist.name,
      area_id: checklist.areaId,
      type: checklist.type || "normal",
    }

    // Only include ID if it's a valid UUID (to preserve IDs during import)
    if (isUUID) {
      insertData.id = checklist.id
    }

    const { data: checklistData, error: checklistError } = await supabase
      .from("checklists")
      .insert(insertData)
      .select()
      .single()

    if (checklistError) {
      logger.error("Error inserting checklist:", checklistError)
      return { success: false, error: checklistError.message }
    }

    if (checklist.items && checklist.items.length > 0) {
      const { error: itemsError } = await supabase.from("checklist_items").insert(
        checklist.items.map((item, index) => ({
          checklist_id: checklistData.id,
          category: item.category,
          criterion: item.criterion,
          subcriterion: null,
          details: item.details || null,
          position: index,
        })),
      )

      if (itemsError) {
        logger.error("Error inserting checklist items:", itemsError)
        return { success: false, error: itemsError.message }
      }
    }

    return { success: true, id: checklistData.id }
  }
}

export async function deleteChecklist(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return { success: false, error: "Supabase no está configurado" }

  const { error } = await supabase.from("checklists").delete().eq("id", id)

  if (error) {
    logger.error("Error deleting checklist:", error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// Inspections
export async function getInspections(): Promise<Inspection[]> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return []

  // Fetch inspections without nested data for better performance
  const { data: inspectionsData, error: inspectionsError } = await supabase
    .from("inspections")
    .select("*")
    .order("date", { ascending: false })
    .limit(500) // Limit to most recent 500 inspections

  if (inspectionsError) {
    logger.error("Error fetching inspections:", inspectionsError.message || inspectionsError)
    return []
  }

  // Fetch findings count for each inspection in a single query
  const inspectionIds = inspectionsData?.map((i) => i.id) || []
  const { data: findingsData } = await supabase
    .from("findings")
    .select("inspection_id, id")
    .in("inspection_id", inspectionIds)

  // Group findings by inspection_id
  const findingsByInspection = (findingsData || []).reduce((acc: Record<string, number>, finding: any) => {
    acc[finding.inspection_id] = (acc[finding.inspection_id] || 0) + 1
    return acc
  }, {})

  return (inspectionsData || []).map((inspection: any) => ({
    id: inspection.id,
    areaId: inspection.area_id,
    checklistId: inspection.checklist_id,
    date: inspection.date,
    inspectorName: inspection.inspector_name,
    status: inspection.status as "en-progreso" | "completada",
    findings: Array(findingsByInspection[inspection.id] || 0).fill({
      id: "",
      itemId: "",
      description: "",
      status: "pendiente" as const,
      correctiveAction: "",
      dueDate: "",
      closedDate: "",
      photos: [],
      solutionPhotos: [],
    }),
  }))
}

export async function getInspectionsByArea(areaId: string): Promise<Inspection[]> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return []

  const { data: inspectionsData, error: inspectionsError } = await supabase
    .from("inspections")
    .select("*")
    .eq("area_id", areaId)
    .order("date", { ascending: false })

  if (inspectionsError) {
    logger.error("Error fetching inspections by area:", inspectionsError.message || inspectionsError)
    return []
  }

  return (inspectionsData || []).map((inspection: any) => ({
    id: inspection.id,
    areaId: inspection.area_id,
    checklistId: inspection.checklist_id,
    date: inspection.date,
    inspectorName: inspection.inspector_name,
    status: inspection.status as "en-progreso" | "completada",
    findings: [],
  }))
}

export async function getInspectionsByChecklist(checklistId: string): Promise<Inspection[]> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return []

  const { data: inspectionsData, error: inspectionsError } = await supabase
    .from("inspections")
    .select("*")
    .eq("checklist_id", checklistId)
    .order("date", { ascending: false })

  if (inspectionsError) {
    logger.error("Error fetching inspections by checklist:", inspectionsError.message || inspectionsError)
    return []
  }

  return (inspectionsData || []).map((inspection: any) => ({
    id: inspection.id,
    areaId: inspection.area_id,
    checklistId: inspection.checklist_id,
    date: inspection.date,
    inspectorName: inspection.inspector_name,
    status: inspection.status as "en-progreso" | "completada",
    findings: [],
  }))
}

export async function getInspectionById(id: string): Promise<Inspection | null> {
  const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

  if (!isUUID) {
    logger.log("Non-UUID inspection ID provided, cannot fetch from database:", id)
    return null
  }

  const supabase = await getSupabaseOrNull()
  if (!supabase) return null

  const { data: inspectionData, error: inspectionError } = await supabase
    .from("inspections")
    .select(`
      *,
      findings (
        *,
        finding_photos (*)
      )
    `)
    .eq("id", id)
    .single()

  if (inspectionError) {
    logger.error("Error fetching inspection:", inspectionError.message || inspectionError)
    return null
  }

  if (!inspectionData) return null

  return {
    id: inspectionData.id,
    areaId: inspectionData.area_id,
    checklistId: inspectionData.checklist_id,
    date: inspectionData.date,
    inspectorName: inspectionData.inspector_name,
    status: inspectionData.status as "en-progreso" | "completada",
    findings: (inspectionData.findings || []).map((finding: any) => ({
      id: finding.id,
      itemId: finding.item_id,
      description: finding.description || "",
      status: finding.status as "conforme" | "no-conforme" | "pendiente",
      trackingStatus: finding.tracking_status as "pendiente" | "en-proceso" | "resuelto" | undefined,
      correctiveAction: finding.corrective_action || "",
      dueDate: finding.due_date || "",
      closedDate: finding.closed_date || "",
      photos: (finding.finding_photos || [])
        .filter((p: any) => p.photo_type === "evidence")
        .map((p: any) => p.photo_url),
      solutionPhotos: (finding.finding_photos || [])
        .filter((p: any) => p.photo_type === "solution")
        .map((p: any) => p.photo_url),
    })),
  }
}

export async function saveInspection(
  inspection: Inspection,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await getSupabaseOrNull()
    if (!supabase) return { success: false, error: "Supabase no está configurado" }

    if (!inspection.areaId || !inspection.checklistId) {
      return { success: false, error: "Faltan datos requeridos: área o checklist" }
    }

    if (!inspection.inspectorName || inspection.inspectorName.trim() === "") {
      return { success: false, error: "El nombre del inspector es requerido" }
    }

    const inspectionDate =
      typeof inspection.date === "string" ? inspection.date : new Date(inspection.date).toISOString()

    const isUUID = inspection.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

    if (isUUID) {
      const { error: inspectionError } = await supabase
        .from("inspections")
        .update({
          area_id: inspection.areaId,
          checklist_id: inspection.checklistId,
          inspector_name: inspection.inspectorName,
          date: inspectionDate,
          status: inspection.status,
        })
        .eq("id", inspection.id)

      if (inspectionError) {
        logger.error("Error updating inspection:", inspectionError)
        return { success: false, error: `Error al actualizar: ${inspectionError.message}` }
      }

      const { error: deleteError } = await supabase.from("findings").delete().eq("inspection_id", inspection.id)

      if (deleteError) {
        logger.error("Error deleting old findings:", deleteError)
      }

      if (inspection.findings && inspection.findings.length > 0) {
        for (const finding of inspection.findings) {
          if (!finding.itemId || !finding.status) {
            logger.warn("Skipping invalid finding:", finding)
            continue
          }

          const { data: findingData, error: findingError } = await supabase
            .from("findings")
            .insert({
              inspection_id: inspection.id,
              item_id: finding.itemId,
              description: finding.description || "",
              status: finding.status,
              tracking_status: finding.trackingStatus || "pendiente",
              corrective_action: finding.correctiveAction || "",
              due_date: finding.dueDate || null,
              closed_date: finding.closedDate || null,
            })
            .select()
            .single()

          if (findingError) {
            logger.error("Error inserting finding:", findingError)
            return { success: false, error: `Error al guardar hallazgo: ${findingError.message}` }
          }

          if (finding.photos && finding.photos.length > 0) {
            const { error: photosError } = await supabase.from("finding_photos").insert(
              finding.photos.map((photo) => ({
                finding_id: findingData.id,
                photo_url: photo,
                photo_type: "evidence",
              })),
            )

            if (photosError) {
              logger.error("Error inserting evidence photos:", photosError)
              return { success: false, error: `Error al guardar fotos: ${photosError.message}` }
            }
          }

          if (finding.solutionPhotos && finding.solutionPhotos.length > 0) {
            const { error: solutionPhotosError } = await supabase.from("finding_photos").insert(
              finding.solutionPhotos.map((photo) => ({
                finding_id: findingData.id,
                photo_url: photo,
                photo_type: "solution",
              })),
            )

            if (solutionPhotosError) {
              logger.error("Error inserting solution photos:", solutionPhotosError)
              return { success: false, error: `Error al guardar fotos de solución: ${solutionPhotosError.message}` }
            }
          }
        }
      }

      return { success: true, id: inspection.id }
    } else {
      const { data: inspectionData, error: inspectionError } = await supabase
        .from("inspections")
        .insert({
          area_id: inspection.areaId,
          checklist_id: inspection.checklistId,
          inspector_name: inspection.inspectorName,
          date: inspectionDate,
          status: inspection.status,
        })
        .select()
        .single()

      if (inspectionError) {
        logger.error("Error inserting inspection:", inspectionError)
        return { success: false, error: `Error al crear inspección: ${inspectionError.message}` }
      }

      if (inspection.findings && inspection.findings.length > 0) {
        for (const finding of inspection.findings) {
          if (!finding.itemId || !finding.status) {
            logger.warn("Skipping invalid finding:", finding)
            continue
          }

          const { data: findingData, error: findingError } = await supabase
            .from("findings")
            .insert({
              inspection_id: inspectionData.id,
              item_id: finding.itemId,
              description: finding.description || "",
              status: finding.status,
              tracking_status: finding.trackingStatus || "pendiente",
              corrective_action: finding.correctiveAction || "",
              due_date: finding.dueDate || null,
              closed_date: finding.closedDate || null,
            })
            .select()
            .single()

          if (findingError) {
            logger.error("Error inserting finding:", findingError)
            return { success: false, error: `Error al guardar hallazgo: ${findingError.message}` }
          }

          if (finding.photos && finding.photos.length > 0) {
            const { error: photosError } = await supabase.from("finding_photos").insert(
              finding.photos.map((photo) => ({
                finding_id: findingData.id,
                photo_url: photo,
                photo_type: "evidence",
              })),
            )

            if (photosError) {
              logger.error("Error inserting evidence photos:", photosError)
              return { success: false, error: `Error al guardar fotos: ${photosError.message}` }
            }
          }

          if (finding.solutionPhotos && finding.solutionPhotos.length > 0) {
            const { error: solutionPhotosError } = await supabase.from("finding_photos").insert(
              finding.solutionPhotos.map((photo) => ({
                finding_id: findingData.id,
                photo_url: photo,
                photo_type: "solution",
              })),
            )

            if (solutionPhotosError) {
              logger.error("Error inserting solution photos:", solutionPhotosError)
              return { success: false, error: `Error al guardar fotos de solución: ${solutionPhotosError.message}` }
            }
          }
        }
      }

      return { success: true, id: inspectionData.id }
    }
  } catch (error: any) {
    logger.error("Unexpected error in saveInspection:", error)
    return {
      success: false,
      error: `Error inesperado: ${error?.message || "Error desconocido"}. Por favor intenta de nuevo.`,
    }
  }
}

export async function deleteInspection(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return { success: false, error: "Supabase no está configurado" }

  const { error } = await supabase.from("inspections").delete().eq("id", id)

  if (error) {
    logger.error("Error deleting inspection:", error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// Data Management Functions
export async function exportData(): Promise<string> {
  const areas = await getAreas()
  const checklists = await getChecklists()
  const inspections = await getInspections()

  return JSON.stringify({
    areas,
    checklists,
    inspections,
    exportDate: new Date().toISOString(),
  })
}

export async function clearAllData(): Promise<void> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return

  // Delete in order to respect foreign key constraints
  // First delete photos (depends on findings)
  await supabase.from("finding_photos").delete().not("id", "is", null)

  // Then delete findings (depends on inspections)
  await supabase.from("findings").delete().not("id", "is", null)

  // Then delete inspections (depends on areas and checklists)
  await supabase.from("inspections").delete().not("id", "is", null)

  // Delete checklist items (depends on checklists)
  await supabase.from("checklist_items").delete().not("id", "is", null)

  // Delete checklists (depends on areas)
  await supabase.from("checklists").delete().not("id", "is", null)

  // Finally delete areas (no dependencies)
  await supabase.from("areas").delete().not("id", "is", null)
}

export async function cleanOrphanedInspections(): Promise<void> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return

  try {
    const { data: areasData } = await supabase.from("areas").select("id")
    const areaIds = areasData?.map((a) => a.id) || []

    const { data: checklistsData } = await supabase.from("checklists").select("id")
    const checklistIds = checklistsData?.map((c) => c.id) || []

    if (areaIds.length > 0) {
      await supabase
        .from("inspections")
        .delete()
        .not("area_id", "in", `(${areaIds.join(",")})`)
    }

    if (checklistIds.length > 0) {
      await supabase
        .from("inspections")
        .delete()
        .not("checklist_id", "in", `(${checklistIds.join(",")})`)
    }

    logger.log("Inspecciones huérfanas eliminadas exitosamente")
  } catch (error) {
    logger.error("Error limpiando inspecciones huérfanas:", error)
  }
}

export async function importData(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData)

    const areaIdMap = new Map<string, string>()
    const checklistIdMap = new Map<string, string>()

    if (data.areas) {
      for (const area of data.areas) {
        const oldId = area.id
        const result = await saveArea(area)
        if (result.success && result.id) {
          areaIdMap.set(oldId, result.id)
          logger.log(`Area imported: ${area.name} (${oldId} -> ${result.id})`)
        }
      }
    }

    if (data.checklists) {
      for (const checklist of data.checklists) {
        const oldId = checklist.id
        const oldAreaId = checklist.areaId

        if (areaIdMap.has(oldAreaId)) {
          checklist.areaId = areaIdMap.get(oldAreaId)
        }

        const result = await saveChecklist(checklist)
        if (result.success && result.id) {
          checklistIdMap.set(oldId, result.id)
          logger.log(`Checklist imported: ${checklist.name} (${oldId} -> ${result.id})`)
        }
      }
    }

    if (data.inspections) {
      for (const inspection of data.inspections) {
        const oldAreaId = inspection.areaId
        const oldChecklistId = inspection.checklistId

        if (areaIdMap.has(oldAreaId)) {
          inspection.areaId = areaIdMap.get(oldAreaId)
        }

        if (checklistIdMap.has(oldChecklistId)) {
          inspection.checklistId = checklistIdMap.get(oldChecklistId)
        }

        if (inspection.findings) {
          inspection.findings = inspection.findings.filter((finding: any) => {
            if (!finding.itemId || finding.itemId === "") {
              logger.log(`Skipping finding with empty itemId`)
              return false
            }
            return true
          })
        }

        const result = await saveInspection(inspection)
        if (result.success) {
          logger.log(`Inspection imported: ${inspection.inspectorName} - ${inspection.date}`)
        }
      }
    }

    logger.log(`Import completed successfully`)
    logger.log(`- ${areaIdMap.size} areas imported`)
    logger.log(`- ${checklistIdMap.size} checklists imported`)
  } catch (error) {
    logger.error("Error importing data:", error)
    throw error
  }
}

export async function getInspectionsWithFindings(): Promise<Inspection[]> {
  const supabase = await getSupabaseOrNull()
  if (!supabase) return []

  // Fetch inspections
  const { data: inspectionsData, error: inspectionsError } = await supabase
    .from("inspections")
    .select("*")
    .order("date", { ascending: false })
    .limit(500)

  if (inspectionsError) {
    logger.error("Error fetching inspections:", inspectionsError.message || inspectionsError)
    return []
  }

  const inspectionIds = inspectionsData?.map((i) => i.id) || []

  if (inspectionIds.length === 0) {
    return []
  }

  // Fetch all findings for these inspections
  const { data: findingsData, error: findingsError } = await supabase
    .from("findings")
    .select("*")
    .in("inspection_id", inspectionIds)

  if (findingsError) {
    logger.error("Error fetching findings:", findingsError.message || findingsError)
  }

  const findingIds = findingsData?.map((f) => f.id) || []

  // Fetch all photos for these findings
  let photosData: any[] = []
  if (findingIds.length > 0 && findingIds.every((id) => id && typeof id === 'string')) {
    try {
      const { data, error: photosError } = await supabase
        .from("finding_photos")
        .select("*")
        .in("finding_id", findingIds)

      if (photosError) {
        logger.error("Error fetching photos:", photosError.message || photosError)
      } else {
        photosData = data || []
      }
    } catch (error) {
      logger.error("[v0] Exception fetching photos:", error)
    }
  }

  // Group photos by finding_id
  const photosByFinding = photosData.reduce((acc: Record<string, any[]>, photo: any) => {
    if (!acc[photo.finding_id]) {
      acc[photo.finding_id] = []
    }
    acc[photo.finding_id].push(photo)
    return acc
  }, {})

  // Group findings by inspection_id
  const findingsByInspection = (findingsData || []).reduce((acc: Record<string, any[]>, finding: any) => {
    if (!acc[finding.inspection_id]) {
      acc[finding.inspection_id] = []
    }

    const findingPhotos = photosByFinding[finding.id] || []

    acc[finding.inspection_id].push({
      id: finding.id,
      itemId: finding.item_id,
      description: finding.description || "",
      status: finding.status as "conforme" | "no-conforme" | "pendiente",
      trackingStatus: finding.tracking_status as "pendiente" | "en-proceso" | "resuelto" | undefined,
      correctiveAction: finding.corrective_action || "",
      dueDate: finding.due_date || "",
      closedDate: finding.closed_date || "",
      photos: findingPhotos.filter((p) => p.photo_type === "evidence").map((p) => p.photo_url),
      solutionPhotos: findingPhotos.filter((p) => p.photo_type === "solution").map((p) => p.photo_url),
    })
    return acc
  }, {})

  return (inspectionsData || []).map((inspection: any) => ({
    id: inspection.id,
    areaId: inspection.area_id,
    checklistId: inspection.checklist_id,
    date: inspection.date,
    inspectorName: inspection.inspector_name,
    status: inspection.status as "en-progreso" | "completada",
    findings: findingsByInspection[inspection.id] || [],
  }))
}

// Deployment Verification Functions
export async function verifyExportData(): Promise<boolean> {
  try {
    const exportedData = await exportData()
    const parsedData = JSON.parse(exportedData)

    if (!parsedData.areas || !parsedData.checklists || !parsedData.inspections) {
      logger.error("Exported data is missing required fields")
      return false
    }

    if (parsedData.areas.length === 0 || parsedData.checklists.length === 0 || parsedData.inspections.length === 0) {
      logger.warn("Exported data contains empty arrays")
    }

    return true
  } catch (error) {
    logger.error("Error verifying exported data:", error)
    return false
  }
}
