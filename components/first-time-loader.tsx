"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { LoadingScreen } from "./loading-screen"

export function FirstTimeLoader({ children }: { children: React.ReactNode }) {
  const [isFirstTime, setIsFirstTime] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const hasVisited = sessionStorage.getItem("hasVisitedApp")

      if (hasVisited) {
        setIsLoading(false)
        setIsFirstTime(false)
      } else {
        // Show loading screen for 1.5 seconds (matches animation)
        const timer = setTimeout(() => {
          setIsLoading(false)
          sessionStorage.setItem("hasVisitedApp", "true")
        }, 1500)

        return () => clearTimeout(timer)
      }
    } catch (err) {
      console.error("[v0] FirstTimeLoader error:", err)
      setError(null) // Silently fail and show content
      setIsLoading(false)
    }
  }, [])

  if (error) {
    return <div className="p-4 text-red-600">Error al cargar: {error}</div>
  }

  if (isLoading && isFirstTime) {
    return <LoadingScreen message="Bienvenido a Inspectify" />
  }

  return <>{children}</>
}
