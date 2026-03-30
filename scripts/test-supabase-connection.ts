/**
 * Script para probar la conexión a Supabase
 * Ejecuta: npx ts-node scripts/test-supabase-connection.ts
 */

import { createClient } from "@supabase/supabase-js"

async function testSupabaseConnection() {
  console.log("[v0] Iniciando prueba de conexión a Supabase...")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Error: Variables de entorno no configuradas")
    console.error("[v0] NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗")
    console.error("[v0] NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "✓" : "✗")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    // Prueba 1: Conectar a Supabase
    console.log("\n[v0] Prueba 1: Conectando a Supabase...")
    const { data: healthData, error: healthError } = await supabase.from("areas").select("count", { count: "exact" })

    if (healthError) {
      console.error("[v0] Error de conexión:", healthError.message)
      process.exit(1)
    }

    console.log("[v0] ✓ Conexión exitosa")

    // Prueba 2: Verificar tablas
    console.log("\n[v0] Prueba 2: Verificando tablas...")
    const tables = ["areas", "checklists", "checklist_items", "inspections", "findings", "finding_photos"]

    for (const table of tables) {
      const { error } = await supabase.from(table).select("count", { count: "exact" }).limit(1)

      if (error) {
        console.error(`[v0] ✗ Tabla '${table}' no existe o no es accesible`)
      } else {
        console.log(`[v0] ✓ Tabla '${table}' existe`)
      }
    }

    // Prueba 3: Crear un área de prueba
    console.log("\n[v0] Prueba 3: Creando área de prueba...")
    const { data: newArea, error: insertError } = await supabase
      .from("areas")
      .insert({
        name: "Área de Prueba",
        responsible: "Tester",
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error al crear área:", insertError.message)
      process.exit(1)
    }

    console.log("[v0] ✓ Área creada:", newArea.id)

    // Prueba 4: Leer el área
    console.log("\n[v0] Prueba 4: Leyendo área...")
    const { data: readArea, error: readError } = await supabase.from("areas").select("*").eq("id", newArea.id).single()

    if (readError) {
      console.error("[v0] Error al leer área:", readError.message)
      process.exit(1)
    }

    console.log("[v0] ✓ Área leída:", readArea.name)

    // Prueba 5: Actualizar el área
    console.log("\n[v0] Prueba 5: Actualizando área...")
    const { error: updateError } = await supabase
      .from("areas")
      .update({ responsible: "Tester Actualizado" })
      .eq("id", newArea.id)

    if (updateError) {
      console.error("[v0] Error al actualizar área:", updateError.message)
      process.exit(1)
    }

    console.log("[v0] ✓ Área actualizada")

    // Prueba 6: Eliminar el área
    console.log("\n[v0] Prueba 6: Eliminando área...")
    const { error: deleteError } = await supabase.from("areas").delete().eq("id", newArea.id)

    if (deleteError) {
      console.error("[v0] Error al eliminar área:", deleteError.message)
      process.exit(1)
    }

    console.log("[v0] ✓ Área eliminada")

    console.log("\n[v0] ✓ Todas las pruebas pasaron correctamente")
    console.log("[v0] Tu integración con Supabase está funcionando correctamente")
  } catch (error) {
    console.error("[v0] Error inesperado:", error)
    process.exit(1)
  }
}

testSupabaseConnection()
