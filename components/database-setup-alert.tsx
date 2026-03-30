"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Database, ExternalLink } from "lucide-react"
import { useState } from "react"

export function DatabaseSetupAlert() {
  const [isOpen, setIsOpen] = useState(true)

  if (!isOpen) return null

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Base de datos no configurada</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>Las tablas de Supabase no existen. Sigue estos pasos para configurar la base de datos:</p>

        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Ve a tu proyecto en Supabase Dashboard</li>
          <li>Abre el SQL Editor</li>
          <li>
            Copia y ejecuta el script:{" "}
            <code className="bg-muted px-1 py-0.5 rounded">scripts/001_create_tables.sql</code>
          </li>
          <li>Recarga esta página</li>
        </ol>

        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={() => window.open("https://supabase.com/dashboard", "_blank")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir Supabase
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.open("/scripts/001_create_tables.sql", "_blank")}>
            <Database className="h-4 w-4 mr-2" />
            Ver Script SQL
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
            Cerrar
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
