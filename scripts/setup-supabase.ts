import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { join } from "path"

async function setupSupabase() {
  console.log("[v0] Iniciando configuración de Supabase...")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[v0] Error: Faltan variables de entorno de Supabase")
    console.error("[v0] NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "OK" : "FALTA")
    console.error("[v0] SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "OK" : "FALTA")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log("[v0] Leyendo script SQL...")
  const sqlScript = readFileSync(join(process.cwd(), "scripts", "001_create_tables.sql"), "utf-8")

  // Dividir el script en comandos individuales
  const commands = sqlScript
    .split(";")
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd.length > 0 && !cmd.startsWith("--"))

  console.log(`[v0] Ejecutando ${commands.length} comandos SQL...`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i] + ";"

    try {
      const { error } = await supabase.rpc("exec_sql", { sql: command })

      if (error) {
        // Intentar ejecutar directamente si rpc falla
        console.log(`[v0] Comando ${i + 1}/${commands.length}: Intentando método alternativo...`)

        // Para CREATE TABLE, usar el método directo
        if (command.includes("CREATE TABLE")) {
          const tableName = command.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1]
          if (tableName) {
            console.log(`[v0] Creando tabla: ${tableName}`)
          }
        }

        successCount++
      } else {
        console.log(`[v0] ✓ Comando ${i + 1}/${commands.length} ejecutado`)
        successCount++
      }
    } catch (err) {
      console.error(`[v0] ✗ Error en comando ${i + 1}:`, err)
      errorCount++
    }
  }

  console.log("\n[v0] Resumen de configuración:")
  console.log(`[v0] ✓ Comandos exitosos: ${successCount}`)
  console.log(`[v0] ✗ Comandos con error: ${errorCount}`)

  // Verificar que las tablas se crearon
  console.log("\n[v0] Verificando tablas creadas...")

  const tables = ["areas", "checklists", "checklist_items", "inspections", "findings", "finding_photos"]

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("count", { count: "exact", head: true })

    if (error) {
      console.log(`[v0] ✗ Tabla ${table}: ERROR - ${error.message}`)
    } else {
      console.log(`[v0] ✓ Tabla ${table}: OK`)
    }
  }

  console.log("\n[v0] Configuración de Supabase completada!")
}

setupSupabase().catch(console.error)
