"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { AlertCircle, CheckCircle, Loader } from "lucide-react"

export function SupabaseStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function checkConnection() {
      try {
        const supabase = getSupabaseClient()

        if (!supabase) {
          setStatus("error")
          setMessage("Supabase no está configurado")
          return
        }

        // Intentar una consulta simple
        const { error } = await supabase.from("areas").select("count", { count: "exact" }).limit(1)

        if (error) {
          setStatus("error")
          setMessage(`Error de conexión: ${error.message}`)
        } else {
          setStatus("connected")
          setMessage("Conectado a Supabase")
        }
      } catch (error) {
        setStatus("error")
        setMessage(error instanceof Error ? error.message : "Error desconocido")
      }
    }

    checkConnection()
  }, [])

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader className="h-4 w-4 animate-spin" />
        Verificando conexión...
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        {message}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle className="h-4 w-4" />
      {message}
    </div>
  )
}
