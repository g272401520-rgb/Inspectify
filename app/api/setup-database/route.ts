import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export async function POST() {
  try {
    const supabase = await createClient()

    const { error: checkError } = await supabase.from("areas").select("id").limit(1)

    if (!checkError) {
      logger.info("Las tablas ya existen")
      return NextResponse.json({
        success: true,
        error: null,
        message: "Las tablas ya están configuradas",
      })
    }

    // Si las tablas no existen, leer el script SQL del archivo
    const fs = await import("fs/promises")
    const path = await import("path")

    const scriptPath = path.join(process.cwd(), "scripts", "001_create_tables.sql")
    const sqlScript = await fs.readFile(scriptPath, "utf-8")

    // Dividir el script en comandos individuales
    const commands = sqlScript
      .split(";")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0 && !cmd.startsWith("--"))

    logger.info(`Ejecutando ${commands.length} comandos SQL...`)

    // Ejecutar cada comando
    let successCount = 0
    let errorCount = 0

    for (const command of commands) {
      try {
        // Usar el cliente de Supabase directamente con SQL raw
        const { error } = await supabase.rpc("exec_sql", { sql: command })

        if (error) {
          // Ignorar errores de "ya existe"
          if (error.message.includes("already exists") || error.message.includes("duplicate")) {
            logger.info("Objeto ya existe, continuando...")
            successCount++
          } else {
            logger.error("Error ejecutando comando:", error)
            errorCount++
          }
        } else {
          successCount++
        }
      } catch (cmdError) {
        logger.error("Error en comando:", cmdError)
        errorCount++
      }
    }

    logger.info(`Comandos ejecutados: ${successCount} exitosos, ${errorCount} con errores`)

    // Verificar que las tablas se crearon
    const { error: finalCheckError } = await supabase.from("areas").select("id").limit(1)

    if (finalCheckError) {
      logger.error("Las tablas no se crearon correctamente:", finalCheckError)
      return NextResponse.json({
        success: false,
        error:
          "No se pudieron crear las tablas. Por favor, ejecuta el script SQL manualmente en Supabase Dashboard > SQL Editor.",
      })
    }

    return NextResponse.json({ success: true, error: null })
  } catch (error) {
    logger.error("Error en setup-database:", error)
    return NextResponse.json({
      success: false,
      error:
        "Error al configurar la base de datos. Por favor, ejecuta el script scripts/001_create_tables.sql manualmente en Supabase Dashboard > SQL Editor.",
      needsManualSetup: true,
    })
  }
}
