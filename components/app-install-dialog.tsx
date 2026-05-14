"use client"

import { useEffect, useState } from "react"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Download } from "lucide-react"

export function AppInstallDialog() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Mostrar diálogo al montar (después de 2 segundos para mejor UX)
    const showTimer = setTimeout(() => {
      setIsOpen(true)
    }, 2000)

    return () => clearTimeout(showTimer)
  }, [])

  useEffect(() => {
    // Auto-cerrar después de 5 segundos
    if (!isOpen) return

    const closeTimer = setTimeout(() => {
      setIsOpen(false)
    }, 5000)

    return () => clearTimeout(closeTimer)
  }, [isOpen])

  const handleInstall = async () => {
    // Detectar si hay PWA install prompt
    if ("beforeinstallprompt" in window) {
      const event = (window as any).deferredPrompt
      if (event) {
        event.prompt()
        const { outcome } = await event.userChoice
        if (outcome === "accepted") {
          setIsOpen(false)
        }
      }
    } else {
      // Fallback para navegadores que no soportan PWA
      const userAgent = navigator.userAgent.toLowerCase()
      if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
        // iOS: mostrar instrucciones
        alert(
          "Para instalar Inspectify en iOS:\n\n1. Abre el menú de Safari\n2. Selecciona 'Añadir a pantalla de inicio'\n3. Confirma el nombre de la app",
        )
      } else if (userAgent.includes("android")) {
        // Android: mostrar instrucciones
        alert("Para instalar Inspectify en Android:\n\n1. Abre el menú del navegador\n2. Selecciona 'Instalar app'\n3. Confirma")
      }
      setIsOpen(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-sm mx-auto">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div>
            <AlertDialogTitle>Instalar Inspectify</AlertDialogTitle>
            <AlertDialogDescription className="mt-2">
              Instala Inspectify en tu dispositivo para acceder más rápido y usar la app sin conexión.
            </AlertDialogDescription>
          </div>
          <div className="flex gap-2 w-full pt-2">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Ahora no
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Instalar
            </button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
