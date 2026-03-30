/**
 * Indicador de Estado Offline
 * 
 * Componente opcional para mostrar al usuario que está en modo offline.
 * No es requerido para la funcionalidad, pero mejora la UX.
 * 
 * Uso en inspección-rapida/page.tsx:
 * <OfflineIndicator />
 */

"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Wifi, WifiOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showAlert, setShowAlert] = useState(false)

  useEffect(() => {
    // Inicializar con estado actual
    setIsOnline(navigator.onLine)

    // Escuchar cambios de conectividad
    const handleOnline = () => {
      setIsOnline(true)
      setShowAlert(true)
      setTimeout(() => setShowAlert(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowAlert(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!showAlert) return null

  return (
    <Alert
      className={`fixed top-4 right-4 z-50 max-w-sm ${
        isOnline
          ? "bg-green-50 border-green-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-center gap-3">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Conexión restaurada. La inspección rápida funciona en ambos modos.
            </AlertDescription>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Modo offline activo. Toda la funcionalidad sigue disponible.
            </AlertDescription>
          </>
        )}
      </div>
    </Alert>
  )
}
