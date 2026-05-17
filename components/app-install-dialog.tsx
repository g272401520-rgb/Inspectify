"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function AppInstallDialog() {
  const [isVisible, setIsVisible] = useState(false)
  const [deviceType, setDeviceType] = useState<"android" | "ios" | "web">("web")

  useEffect(() => {
    // Detectar dispositivo y mostrar toast después de 3 segundos
    const showTimer = setTimeout(() => {
      const userAgent = navigator.userAgent.toLowerCase()

      if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
        setDeviceType("ios")
        setIsVisible(true)
      } else if (userAgent.includes("android")) {
        setDeviceType("android")
        setIsVisible(true)
      } else {
        // En desktop, mostrar opción PWA
        if ("beforeinstallprompt" in window) {
          setDeviceType("web")
          setIsVisible(true)
        }
      }
    }, 3000)

    return () => clearTimeout(showTimer)
  }, [])

  useEffect(() => {
    // Auto-cerrar después de 8 segundos
    if (!isVisible) return

    const closeTimer = setTimeout(() => {
      setIsVisible(false)
    }, 8000)

    return () => clearTimeout(closeTimer)
  }, [isVisible])

  const handleInstallPWA = async () => {
    if ("beforeinstallprompt" in window) {
      const event = (window as any).deferredPrompt
      if (event) {
        event.prompt()
        const { outcome } = await event.userChoice
        if (outcome === "accepted") {
          setIsVisible(false)
        }
      }
    }
  }

  const handleDownloadAPK = () => {
    // Descarga directa de APK (reemplaza con tu URL real)
    const apkUrl = "/api/download-apk"
    window.location.href = apkUrl
    setIsVisible(false)
  }

  return (
    <>
      {/* Toast/Notification en esquina inferior derecha */}
      {isVisible && (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-lg",
            "p-3 sm:p-4 max-w-xs sm:max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <Download className="h-4 w-4 text-blue-600 dark:text-blue-300" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Instalar Inspectify</h3>

              {/* Contenido según dispositivo */}
              {deviceType === "android" && (
                <div className="mt-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Descarga e instala Inspectify en tu Android
                  </p>
                  <button
                    onClick={handleDownloadAPK}
                    className="w-full px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                  >
                    Descargar APK
                  </button>
                </div>
              )}

              {deviceType === "ios" && (
                <div className="mt-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Agregar a pantalla de inicio
                  </p>
                  <button
                    onClick={() => {
                      alert("Toca el ícono Compartir abajo → Añadir a pantalla de inicio")
                      setIsVisible(false)
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                  >
                    Ver instrucciones
                  </button>
                </div>
              )}

              {deviceType === "web" && (
                <div className="mt-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Instala Inspectify como app
                  </p>
                  <button
                    onClick={handleInstallPWA}
                    className="w-full px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                  >
                    Instalar
                  </button>
                </div>
              )}
            </div>

            {/* Botón cerrar */}
            <button
              onClick={() => setIsVisible(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
