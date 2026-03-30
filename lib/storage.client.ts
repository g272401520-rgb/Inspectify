import { getSupabaseClient } from "./supabase/client"
import type { Area, Checklist, Inspection } from "./types"

// Areas
export async function getAreasClient(): Promise<Area[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase.from("areas").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching areas:", error)
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
}

export async function saveAreaClient(area: Area): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = getSupabaseClient()
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
      console.error("[v0] Error updating area:", error)
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
      console.error("[v0] Error inserting area:", error)
      return { success: false, error: error.message }
    }
    return { success: true, id: data.id }
  }
}

export async function deleteAreaClient(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) return { success: false, error: "Supabase no está configurado" }

  try {
    const { error } = await supabase.from("areas").delete().eq("id", id)

    if (error) {
      console.error("[v0] Error deleting area:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Error deleting area:", error)
    return { success: false, error: error.message }
  }
}

// Checklists
export async function getChecklistsClient(): Promise<Checklist[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data: checklistsData, error: checklistsError } = await supabase
    .from("checklists")
    .select("*")
    .order("created_at", { ascending: false })

  if (checklistsError) {
    console.error("[v0] Error fetching checklists:", checklistsError)
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
      console.error("[v0] Error fetching checklist items:", itemsError)
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
}

export async function saveChecklistClient(
  checklist: Checklist,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) return { success: false, error: "Supabase no está configurado" }

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
      console.error("[v0] Error updating checklist:", checklistError)
      return { success: false, error: checklistError.message }
    }

    await supabase.from("checklist_items").delete().eq("checklist_id", checklist.id)

    if (checklist.items && checklist.items.length > 0) {
      const { error: itemsError } = await supabase.from("checklist_items").insert(
        checklist.items.map((item, index) => ({
          checklist_id: checklist.id,
          category: item.category,
          criterion: item.criterion,
          details: item.details,
          position: index,
        })),
      )

      if (itemsError) {
        console.error("[v0] Error updating checklist items:", itemsError)
        return { success: false, error: itemsError.message }
      }
    }

    return { success: true, id: checklist.id }
  } else {
    const insertData: any = {
      name: checklist.name,
      area_id: checklist.areaId,
      type: checklist.type || "normal",
    }

    if (isUUID) {
      insertData.id = checklist.id
    }

    const { data: checklistData, error: checklistError } = await supabase
      .from("checklists")
      .insert(insertData)
      .select()
      .single()

    if (checklistError) {
      console.error("[v0] Error inserting checklist:", checklistError)
      return { success: false, error: checklistError.message }
    }

    if (checklist.items && checklist.items.length > 0) {
      const { error: itemsError } = await supabase.from("checklist_items").insert(
        checklist.items.map((item, index) => ({
          checklist_id: checklistData.id,
          category: item.category,
          criterion: item.criterion,
          details: item.details,
          position: index,
        })),
      )

      if (itemsError) {
        console.error("[v0] Error inserting checklist items:", itemsError)
        return { success: false, error: itemsError.message }
      }
    }

    return { success: true, id: checklistData.id }
  }
}

export async function deleteChecklistClient(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) return { success: false, error: "Supabase no está configurado" }

  const { error } = await supabase.from("checklists").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting checklist:", error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// Inspections
export async function getInspectionsClient(): Promise<Inspection[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data: inspectionsData, error: inspectionsError } = await supabase
    .from("inspections")
    .select("*")
    .order("date", { ascending: false })
    .limit(500)

  if (inspectionsError) {
    console.error("[v0] Error fetching inspections:", inspectionsError)
    return []
  }

  const inspectionIds = inspectionsData?.map((i) => i.id) || []
  const { data: findingsData } = await supabase
    .from("findings")
    .select("inspection_id, id")
    .in("inspection_id", inspectionIds)

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

export async function getInspectionByIdClient(id: string): Promise<Inspection | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

  if (!isUUID) {
    console.log("[v0] Non-UUID inspection ID provided, cannot fetch from database:", id)
    return null
  }

  const { data: inspectionData, error: inspectionError } = await supabase
    .from("inspections")
    .select(
      `
      *,
      findings (
        *,
        finding_photos (*)
      )
    `,
    )
    .eq("id", id)
    .single()

  if (inspectionError) {
    console.error("[v0] Error fetching inspection:", inspectionError)
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

export async function saveInspectionClient(
  inspection: Inspection,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) return { success: false, error: "Supabase no está configurado" }

  const isUUID = inspection.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

  if (isUUID) {
    const { error: inspectionError } = await supabase
      .from("inspections")
      .update({
        area_id: inspection.areaId,
        checklist_id: inspection.checklistId,
        inspector_name: inspection.inspectorName,
        date: inspection.date,
        status: inspection.status,
      })
      .eq("id", inspection.id)

    if (inspectionError) {
      console.error("[v0] Error updating inspection:", inspectionError)
      return { success: false, error: inspectionError.message }
    }

    await supabase.from("findings").delete().eq("inspection_id", inspection.id)

    if (inspection.findings && inspection.findings.length > 0) {
      for (const finding of inspection.findings) {
        const { data: findingData, error: findingError } = await supabase
          .from("findings")
          .insert({
            inspection_id: inspection.id,
            item_id: finding.itemId,
            description: finding.description,
            status: finding.status,
            tracking_status: finding.trackingStatus || "pendiente",
            corrective_action: finding.correctiveAction,
            due_date: finding.dueDate || null,
            closed_date: finding.closedDate || null,
          })
          .select()
          .single()

        if (findingError) {
          console.error("[v0] Error inserting finding:", findingError)
          continue
        }

        if (finding.photos && finding.photos.length > 0) {
          await supabase.from("finding_photos").insert(
            finding.photos.map((photo) => ({
              finding_id: findingData.id,
              photo_url: photo,
              photo_type: "evidence",
            })),
          )
        }

        if (finding.solutionPhotos && finding.solutionPhotos.length > 0) {
          await supabase.from("finding_photos").insert(
            finding.solutionPhotos.map((photo) => ({
              finding_id: findingData.id,
              photo_url: photo,
              photo_type: "solution",
            })),
          )
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
        date: inspection.date,
        status: inspection.status,
      })
      .select()
      .single()

    if (inspectionError) {
      console.error("[v0] Error inserting inspection:", inspectionError)
      return { success: false, error: inspectionError.message }
    }

    if (inspection.findings && inspection.findings.length > 0) {
      for (const finding of inspection.findings) {
        const { data: findingData, error: findingError } = await supabase
          .from("findings")
          .insert({
            inspection_id: inspectionData.id,
            item_id: finding.itemId,
            description: finding.description,
            status: finding.status,
            tracking_status: finding.trackingStatus || "pendiente",
            corrective_action: finding.correctiveAction,
            due_date: finding.dueDate || null,
            closed_date: finding.closedDate || null,
          })
          .select()
          .single()

        if (findingError) {
          console.error("[v0] Error inserting finding:", findingError)
          continue
        }

        if (finding.photos && finding.photos.length > 0) {
          await supabase.from("finding_photos").insert(
            finding.photos.map((photo) => ({
              finding_id: findingData.id,
              photo_url: photo,
              photo_type: "evidence",
            })),
          )
        }

        if (finding.solutionPhotos && finding.solutionPhotos.length > 0) {
          await supabase.from("finding_photos").insert(
            finding.solutionPhotos.map((photo) => ({
              finding_id: findingData.id,
              photo_url: photo,
              photo_type: "solution",
            })),
          )
        }
      }
    }

    return { success: true, id: inspectionData.id }
  }
}

export async function deleteInspectionClient(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) return { success: false, error: "Supabase no está configurado" }

  const { error } = await supabase.from("inspections").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting inspection:", error)
    return { success: false, error: error.message }
  }
  return { success: true }
}
