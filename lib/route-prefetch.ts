"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Hook para prefetch de rutas críticas en móvil
 * Precarga rutas que el usuario probablemente visitará
 */
export function usePrefetchRoutes(routes: string[]) {
  const router = useRouter()

  useEffect(() => {
    // Solo prefetch en conexiones rápidas
    if (
      typeof navigator !== "undefined" &&
      "connection" in navigator &&
      (navigator as any).connection?.effectiveType === "4g"
    ) {
      // Prefetch después de que la página esté idle
      const timeoutId = setTimeout(() => {
        routes.forEach((route) => {
          router.prefetch(route)
        })
      }, 2000)

      return () => clearTimeout(timeoutId)
    }
  }, [routes, router])
}

/**
 * Prefetch de rutas críticas para la app de inspecciones
 */
export function usePrefetchInspectionRoutes() {
  usePrefetchRoutes(["/area", "/inspeccion-rapida", "/historial", "/seguimiento"])
}
