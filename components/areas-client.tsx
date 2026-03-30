"use client"

import { useState } from "react"
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  FileText,
  TrendingUp,
  BarChart3,
  Database,
  Zap,
  HardDrive,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveAreaAction, deleteAreaAction } from "@/lib/actions"
import type { Area } from "@/lib/types"
import Link from "next/link"
import { AppLogo } from "@/components/app-logo"
import { useRouter } from "next/navigation"
import { DatabaseSetupAlert } from "@/components/database-setup-alert"

interface AreasClientProps {
  initialAreas: Area[]
}

export function AreasClient({ initialAreas }: AreasClientProps) {
  const router = useRouter()
  const [areas, setAreas] = useState<Area[]>(initialAreas)
  const [showNewAreaDialog, setShowNewAreaDialog] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [newAreaName, setNewAreaName] = useState("")
  const [newAreaResponsible, setNewAreaResponsible] = useState("")
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [sortBy, setSortBy] = useState<"name" | "date" | "responsible">("name")
  const [isCreating, setIsCreating] = useState(false)
  const [showDatabaseAlert, setShowDatabaseAlert] = useState(initialAreas.length === 0)

  const handleCreateArea = async () => {
    if (!newAreaName.trim() || !newAreaResponsible.trim()) return

    setIsCreating(true)

    if (editingArea) {
      const updatedArea = {
        ...editingArea,
        name: newAreaName.trim(),
        responsible: newAreaResponsible.trim(),
      }
      const result = await saveAreaAction(updatedArea)
      if (result.success) {
        setAreas((prev) => prev.map((a) => (a.id === editingArea.id ? updatedArea : a)))
        setShowDatabaseAlert(false)
      }
    } else {
      const newArea: Area = {
        id: `area_${Date.now()}`,
        name: newAreaName.trim(),
        responsible: newAreaResponsible.trim(),
        createdAt: new Date().toISOString(),
      }
      const result = await saveAreaAction(newArea)
      if (result.success && result.id) {
        setAreas((prev) => [{ ...newArea, id: result.id! }, ...prev])
        setShowDatabaseAlert(false)
      }
    }

    setNewAreaName("")
    setNewAreaResponsible("")
    setEditingArea(null)
    setShowNewAreaDialog(false)
    setIsCreating(false)
    router.refresh()
  }

  const handleDeleteArea = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta área? Se eliminarán también sus checklists asociados.")) {
      const result = await deleteAreaAction(id)
      if (result.success) {
        setAreas((prev) => prev.filter((a) => a.id !== id))
        router.refresh()
      }
    }
  }

  const handleEditArea = (area: Area) => {
    setEditingArea(area)
    setNewAreaName(area.name)
    setNewAreaResponsible(area.responsible)
    setShowNewAreaDialog(true)
  }

  const handleCloseDialog = () => {
    setShowNewAreaDialog(false)
    setNewAreaName("")
    setNewAreaResponsible("")
    setEditingArea(null)
  }

  const getSortedAreas = () => {
    const sorted = [...areas]
    switch (sortBy) {
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case "date":
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case "responsible":
        return sorted.sort((a, b) => a.responsible.localeCompare(b.responsible))
      default:
        return sorted
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-[#054078] sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 md:py-4 max-w-7xl">
          <div className="flex items-center justify-between gap-3 md:gap-8">
            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center min-w-0 flex-1">
              <DropdownMenu open={showMobileNav} onOpenChange={setShowMobileNav}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 focus:outline-none hover:opacity-90 transition-opacity bg-transparent border-none p-0 min-w-0">
                    <div className="min-w-0 flex-1">
                      <AppLogo />
                    </div>
                    <ChevronDown className="h-5 w-5 text-white flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/historial" className="flex items-center cursor-pointer">
                      <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Historial</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/seguimiento" className="flex items-center cursor-pointer">
                      <TrendingUp className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Seguimiento</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/comparativas" className="flex items-center cursor-pointer">
                      <BarChart3 className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Comparativas</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/consolidado" className="flex items-center cursor-pointer">
                      <BarChart3 className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Consolidado</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop Logo */}
            <div className="hidden md:flex items-center flex-shrink-0">
              <AppLogo />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2 mx-auto">
              <Link href="/historial">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Historial</span>
                </Button>
              </Link>
              <Link href="/seguimiento">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  <span>Seguimiento</span>
                </Button>
              </Link>
              <Link href="/comparativas">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>Comparativas</span>
                </Button>
              </Link>
              <Link href="/consolidado">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>Consolidado</span>
                </Button>
              </Link>
            </nav>

            {/* Database Menu */}
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 md:h-10 md:w-10 p-0 text-white hover:bg-white/10"
                  >
                    <Database className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/respaldo" className="flex items-center cursor-pointer">
                      <HardDrive className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Respaldo</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              onClick={() => router.push("/inspeccion-rapida")}
              size="lg"
              className="fixed bottom-6 right-6 h-16 w-16 rounded-full !bg-[#054078] hover:!bg-[#043060] text-white shadow-2xl z-50 p-0 transition-colors"
              aria-label="Inspección Rápida"
            >
              <Zap className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {showDatabaseAlert && areas.length === 0 && <DatabaseSetupAlert />}

        <div className="mb-6 md:mb-8">
          <div className="flex flex-col gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Áreas de Inspección</h2>
              <p className="mt-1 md:mt-2 text-sm md:text-base text-muted-foreground">
                Selecciona un área para comenzar una inspección o crear nuevos checklists
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              {areas.length > 0 && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "date" | "responsible")}
                  className="h-11 px-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full"
                >
                  <option value="name">Ordenar por Nombre</option>
                  <option value="date">Ordenar por Fecha</option>
                  <option value="responsible">Ordenar por Responsable</option>
                </select>
              )}
              <Button
                onClick={() => setShowNewAreaDialog(true)}
                size="lg"
                variant="outline"
                className="w-full border border-foreground/10 hover:border-[#054078]/30 hover:bg-[#054078]/12 text-foreground shadow-sm h-11 transition-all"
              >
                <Plus className="mr-2 h-5 w-5 flex-shrink-0 text-foreground" />
                Nueva Área
              </Button>
            </div>
          </div>
        </div>

        {areas.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12 md:py-16 px-4">
              <div className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 text-center">
                No hay áreas creadas
              </h3>
              <p className="text-sm md:text-base text-muted-foreground mb-6 text-center max-w-md">
                Comienza creando tu primera área de inspección como Almacén, Producción, o cualquier otra área que
                necesites auditar.
              </p>
              <Button
                onClick={() => setShowNewAreaDialog(true)}
                size="lg"
                variant="outline"
                className="w-full max-w-xs border border-foreground/10 hover:border-[#054078]/30 hover:bg-[#054078]/12 text-foreground shadow-sm transition-all"
                aria-label="Crear Primera Área"
              >
                <Plus className="mr-2 h-5 w-5 text-foreground" />
                Crear Primera Área
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {getSortedAreas().map((area) => (
              <Card
                key={area.id}
                className="group hover:border-primary hover:shadow-lg transition-all duration-200 relative"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-base md:text-lg truncate min-w-0 flex-1">{area.name}</CardTitle>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditArea(area)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteArea(area.id)}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs md:text-sm truncate">
                    Responsable: {area.responsible}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={() => router.push(`/area/${area.id}`)}
                    className="w-full bg-[#054078]/65 hover:bg-[#054078]/75 text-white"
                    size="lg"
                    variant={null}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar Inspección
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showNewAreaDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{editingArea ? "Editar Área" : "Crear Nueva Área"}</DialogTitle>
            <DialogDescription className="text-sm">
              {editingArea ? "Modifica la información del área" : "Ingresa el nombre del área y el responsable"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="area-name" className="text-sm md:text-base">
                Nombre del Área
              </Label>
              <Input
                id="area-name"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="Ej: Almacén"
                className="mt-2 h-11 text-base"
              />
            </div>
            <div>
              <Label htmlFor="area-responsible" className="text-sm md:text-base">
                Responsable del Área
              </Label>
              <Input
                id="area-responsible"
                value={newAreaResponsible}
                onChange={(e) => setNewAreaResponsible(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="mt-2 h-11 text-base"
                onKeyDown={(e) => e.key === "Enter" && !isCreating && handleCreateArea()}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              size="lg"
              className="w-full sm:w-auto h-11 bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateArea}
              disabled={isCreating}
              variant="outline"
              className="border border-foreground/10 hover:border-[#054078]/30 hover:bg-[#054078]/12 text-foreground bg-transparent transition-all"
            >
              {isCreating ? "Creando..." : "Crear Área"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
