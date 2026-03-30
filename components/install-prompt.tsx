"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Download } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("[v0] beforeinstallprompt event disparado")
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      setDeferredPrompt(event)
      setShowPrompt(true)
    }

    const handleAppInstalled = () => {
      console.log("[v0] PWA instalada exitosamente")
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.log("[v0] No hay prompt de instalación disponible")
      return
    }

    try {
      // Mostrar el prompt de instalación nativo
      await deferredPrompt.prompt()

      // Esperar por la respuesta del usuario
      const { outcome } = await deferredPrompt.userChoice
      console.log(`[v0] Usuario eligió: ${outcome}`)

      if (outcome === "accepted") {
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    } catch (error) {
      console.error("[v0] Error al instalar PWA:", error)
    }
  }

  if (!showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto md:max-w-sm bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Instalar Inspectify</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Instala la app en tu pantalla de inicio para acceso rápido
          </p>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 mt-4">
        <Button onClick={handleInstall} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
          <Download className="w-4 h-4 mr-2" />
          Instalar
        </Button>
        <Button onClick={() => setShowPrompt(false)} variant="outline" className="flex-1">
          Luego
        </Button>
      </div>
    </div>
  )
}
