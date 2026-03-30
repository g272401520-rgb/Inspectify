"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"

export function InstallNotification() {
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Detectar si la app ya está instalada
    const handleAppInstalled = () => {
      console.log("[v0] PWA instalada detectada")
      setIsInstalled(true)
      // Mostrar notificación por 3 segundos
      setTimeout(() => setIsInstalled(false), 3000)
    }

    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  if (!isInstalled) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto md:max-w-sm bg-green-600 text-white rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <Check className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">¡Inspectify instalado exitosamente en tu pantalla de inicio!</span>
      </div>
    </div>
  )
}
