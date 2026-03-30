"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Camera, Trash2, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Finding } from "@/lib/types"

interface FindingFormProps {
  finding: Finding | null
  onSave: (finding: Partial<Finding>) => void
  onCancel: () => void
}

export function FindingForm({ finding, onSave, onCancel }: FindingFormProps) {
  const [description, setDescription] = useState(finding?.description || "")
  const [status, setStatus] = useState<Finding["status"]>(finding?.status || "pendiente")
  const [photos, setPhotos] = useState<string[]>(finding?.photos || [])
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [uploadError, setUploadError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCameraPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) {
      console.log("[v0] No camera files selected")
      return
    }

    console.log("[v0] Camera photo upload started - files count:", files.length)

    setUploadError(null)
    setIsUploadingPhotos(true)
    const totalFiles = files.length
    setUploadProgress({ current: 0, total: totalFiles })

    try {
      const { compressMultipleImages } = await import("@/lib/image-compression")
      const { uploadPhotosAction } = await import("@/lib/actions")

      const base64Images = await compressMultipleImages(Array.from(files), (current, total) => {
        setUploadProgress({ current, total })
      })

      console.log("[v0] Uploading", base64Images.length, "photos to Blob Storage...")
      const photoUrls = await uploadPhotosAction(base64Images)
      console.log("[v0] Photos uploaded successfully. URLs:", photoUrls)

      setPhotos((prev) => [...prev, ...photoUrls])
      setUploadProgress({ current: totalFiles, total: totalFiles })
    } catch (error) {
      console.error("[v0] Error processing camera photos:", error)
      setUploadError(`Error al procesar las fotos: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsUploadingPhotos(false)
      setUploadProgress({ current: 0, total: 0 })
      e.target.value = ""
    }
  }

  const handleGalleryPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadError(null)
    setIsUploadingPhotos(true)
    const totalFiles = files.length
    setUploadProgress({ current: 0, total: totalFiles })

    try {
      const { compressMultipleImages } = await import("@/lib/image-compression")
      const { uploadPhotosAction } = await import("@/lib/actions")

      const base64Images = await compressMultipleImages(Array.from(files), (current, total) => {
        setUploadProgress({ current, total })
      })

      console.log("[v0] Uploading", base64Images.length, "photos to Blob Storage...")
      const photoUrls = await uploadPhotosAction(base64Images)
      console.log("[v0] Photos uploaded successfully. URLs:", photoUrls)

      setPhotos((prev) => [...prev, ...photoUrls])
      setUploadProgress({ current: totalFiles, total: totalFiles })
    } catch (error) {
      console.error("[v0] Error processing gallery photos:", error)
      setUploadError(`Error al procesar las fotos: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsUploadingPhotos(false)
      setUploadProgress({ current: 0, total: 0 })
      e.target.value = ""
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    onSave({
      description,
      status,
      photos,
    })
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const isDescriptionRequired = status === "no-conforme" || status === "pendiente"
  const canSave = !isDescriptionRequired || description.trim().length > 0

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">{finding ? "Editar Hallazgo" : "Registrar Hallazgo"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm md:text-base">Estado</Label>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant={status === "conforme" ? "default" : "outline"}
              className={`flex-1 h-12 text-sm md:text-base ${status === "conforme" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
              onClick={() => setStatus("conforme")}
            >
              Conforme
            </Button>
            <Button
              type="button"
              variant={status === "no-conforme" ? "default" : "outline"}
              className={`flex-1 h-12 text-sm md:text-base ${status === "no-conforme" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
              onClick={() => setStatus("no-conforme")}
            >
              No Conforme
            </Button>
            <Button
              type="button"
              variant={status === "pendiente" ? "default" : "outline"}
              className={`flex-1 h-12 text-sm md:text-base ${status === "pendiente" ? "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}`}
              onClick={() => setStatus("pendiente")}
            >
              Pendiente
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="description" className="text-sm md:text-base">
            Observaciones {isDescriptionRequired && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isDescriptionRequired
                ? "La descripción es obligatoria para estados No Conforme y Pendiente..."
                : "Observaciones opcionales..."
            }
            className="mt-2 min-h-[120px] text-base"
          />
          {isDescriptionRequired && !description.trim() && (
            <p className="text-xs md:text-sm text-destructive mt-1">Este campo es obligatorio</p>
          )}
        </div>

        <div>
          <Label className="text-sm md:text-base">Fotos del Hallazgo</Label>
          <div className="mt-2 space-y-3">
            {isUploadingPhotos && uploadProgress.total > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  Procesando fotos: {uploadProgress.current} de {uploadProgress.total}
                </span>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <span className="text-sm text-red-600 dark:text-red-400">{uploadError}</span>
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo || "/placeholder.svg"}
                      alt={`Foto ${index + 1}`}
                      className="w-full aspect-square object-cover rounded-lg border border-border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-8 w-8 p-0 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemovePhoto(index)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraPhotoUpload}
                className="hidden"
                id="photo-camera"
                disabled={isUploadingPhotos}
              />
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryPhotoUpload}
                className="hidden"
                id="photo-file"
                disabled={isUploadingPhotos}
              />
              <Button
                variant="outline"
                className="w-full h-12 bg-transparent text-sm md:text-base"
                onClick={handleCameraClick}
                type="button"
                disabled={isUploadingPhotos}
              >
                {isUploadingPhotos ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-5 w-5" />
                    Tomar Foto
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 bg-transparent text-sm md:text-base"
                onClick={handleFileClick}
                type="button"
                disabled={isUploadingPhotos}
              >
                {isUploadingPhotos ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    {photos.length > 0 ? "Agregar Más Fotos" : "Agregar Fotos"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            onClick={handleSave}
            className="flex-1 h-12 text-sm md:text-base bg-green-600 hover:bg-green-700 text-white"
            disabled={!canSave || isUploadingPhotos}
          >
            Guardar Hallazgo
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1 h-12 text-sm md:text-base bg-transparent">
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
