"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Trash2, Database } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getStorageStats, autoCleanStorage } from "@/lib/storage-manager"
import { clearAll } from "@/lib/indexed-db"

export function StorageMonitor() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getStorageStats>> | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    updateStats()
  }, [])

  const updateStats = async () => {
    setIsLoading(true)
    try {
      const newStats = await getStorageStats()
      setStats(newStats)
    } catch (error) {
      console.error("[v0] Error actualizando estadísticas:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCleanOld = async () => {
    setIsLoading(true)
    try {
      const deletedCount = await autoCleanStorage(30)
      alert(`Se eliminaron ${deletedCount} items antiguos`)
      await updateStats()
    } catch (error) {
      console.error("[v0] Error limpiando almacenamiento:", error)
      alert("Error al limpiar almacenamiento")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (
      confirm(
        "¿Estás seguro de que quieres limpiar todo el almacenamiento? Esta acción eliminará todos los datos guardados y no se puede deshacer.",
      )
    ) {
      setIsLoading(true)
      try {
        await clearAll()
        alert("Almacenamiento limpiado completamente")
        await updateStats()
      } catch (error) {
        console.error("[v0] Error limpiando almacenamiento:", error)
        alert("Error al limpiar almacenamiento")
      } finally {
        setIsLoading(false)
      }
    }
  }

  if (!stats) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Almacenamiento (IndexedDB)
        </CardTitle>
        <CardDescription>
          Uso: {stats.quotaUsageMB} MB de {stats.quotaTotalMB} MB ({stats.quotaUsagePercentage}%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress value={Number.parseFloat(stats.quotaUsagePercentage)} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {stats.itemCount} items almacenados ({stats.totalSizeMB} MB en IndexedDB)
          </p>
        </div>

        {stats.isNearLimit && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Almacenamiento casi lleno</AlertTitle>
            <AlertDescription>
              El almacenamiento está al {stats.quotaUsagePercentage}% de capacidad. Considera limpiar datos antiguos.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCleanOld} disabled={isLoading}>
            <Trash2 className="h-4 w-4 mr-2" />
            {isLoading ? "Limpiando..." : "Limpiar Antiguos"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "Ocultar" : "Ver"} Detalles
          </Button>
        </div>

        {showDetails && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-semibold">Items más grandes:</h4>
            <div className="space-y-1">
              {stats.largestItems.map((item, index) => (
                <div key={index} className="flex justify-between text-xs gap-2">
                  <span className="truncate max-w-[150px]" title={item.key}>
                    {item.key}
                  </span>
                  <div className="flex flex-col items-end text-muted-foreground">
                    <span>{item.sizeMB} MB</span>
                    <span className="text-[10px]">{item.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              disabled={isLoading}
              className="w-full mt-4"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Todo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
