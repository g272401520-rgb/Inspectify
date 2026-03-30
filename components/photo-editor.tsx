"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Circle, ArrowRight, Type, Undo, Palette, Eraser } from 'lucide-react'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"

type Tool = "circle" | "arrow" | "text" | null
type Annotation = {
  type: "circle" | "arrow" | "text"
  x: number
  y: number
  x2?: number
  y2?: number
  radius?: number
  text?: string
  color: string
  lineWidth: number
}

interface PhotoEditorProps {
  imageUrl: string
  isOpen: boolean
  onClose: () => void
  onSave: (editedImageUrl: string) => void
}

export function PhotoEditor({ imageUrl, isOpen, onClose, onSave }: PhotoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeTool, setActiveTool] = useState<Tool>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [currentColor, setCurrentColor] = useState("#FF0000")
  const [currentLineWidth, setCurrentLineWidth] = useState(8)
  const [textInput, setTextInput] = useState("")
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (isOpen && imageUrl) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        imageRef.current = img
        setImageLoaded(true)
        drawCanvas()
      }
      img.src = imageUrl
    }
  }, [isOpen, imageUrl])

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas()
    }
  }, [annotations, imageLoaded])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !imageRef.current) return

    // Set canvas size to match image
    canvas.width = imageRef.current.width
    canvas.height = imageRef.current.height

    // Draw image
    ctx.drawImage(imageRef.current, 0, 0)

    // Draw all annotations
    annotations.forEach((annotation) => {
      ctx.strokeStyle = annotation.color
      ctx.fillStyle = annotation.color
      ctx.lineWidth = annotation.lineWidth
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (annotation.type === "circle" && annotation.radius) {
        ctx.beginPath()
        ctx.arc(annotation.x, annotation.y, annotation.radius, 0, 2 * Math.PI)
        ctx.stroke()
      } else if (annotation.type === "arrow" && annotation.x2 !== undefined && annotation.y2 !== undefined) {
        // Draw arrow line
        ctx.beginPath()
        ctx.moveTo(annotation.x, annotation.y)
        ctx.lineTo(annotation.x2, annotation.y2)
        ctx.stroke()

        // Draw arrowhead
        const angle = Math.atan2(annotation.y2 - annotation.y, annotation.x2 - annotation.x)
        const headLength = 25 + annotation.lineWidth * 2
        ctx.beginPath()
        ctx.moveTo(annotation.x2, annotation.y2)
        ctx.lineTo(
          annotation.x2 - headLength * Math.cos(angle - Math.PI / 6),
          annotation.y2 - headLength * Math.sin(angle - Math.PI / 6),
        )
        ctx.moveTo(annotation.x2, annotation.y2)
        ctx.lineTo(
          annotation.x2 - headLength * Math.cos(angle + Math.PI / 6),
          annotation.y2 - headLength * Math.sin(angle + Math.PI / 6),
        )
        ctx.stroke()
      } else if (annotation.type === "text" && annotation.text) {
        const fontSize = 28 + annotation.lineWidth * 2
        ctx.font = `bold ${fontSize}px Arial`
        
        // Agregar fondo blanco semi-transparente al texto
        const metrics = ctx.measureText(annotation.text)
        const textHeight = fontSize
        const padding = 4
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        ctx.fillRect(
          annotation.x - padding,
          annotation.y - textHeight,
          metrics.width + padding * 2,
          textHeight + padding
        )
        
        ctx.fillStyle = annotation.color
        ctx.fillText(annotation.text, annotation.x, annotation.y)
      }
    })
  }

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clientX: number, clientY: number

    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!activeTool) return

    const pos = getCanvasCoordinates(e)

    if (activeTool === "text") {
      setTextPosition(pos)
      setShowTextInput(true)
      return
    }

    setIsDrawing(true)
    setStartPos(pos)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !activeTool) return

    const pos = getCanvasCoordinates(e)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !imageRef.current) return

    // Redraw everything
    drawCanvas()

    // Draw preview
    ctx.strokeStyle = currentColor
    ctx.fillStyle = currentColor
    ctx.lineWidth = currentLineWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    if (activeTool === "circle") {
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2))
      ctx.beginPath()
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI)
      ctx.stroke()
    } else if (activeTool === "arrow") {
      ctx.beginPath()
      ctx.moveTo(startPos.x, startPos.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()

      const angle = Math.atan2(pos.y - startPos.y, pos.x - startPos.x)
      const headLength = 25 + currentLineWidth * 2
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      ctx.lineTo(pos.x - headLength * Math.cos(angle - Math.PI / 6), pos.y - headLength * Math.sin(angle - Math.PI / 6))
      ctx.moveTo(pos.x, pos.y)
      ctx.lineTo(pos.x - headLength * Math.cos(angle + Math.PI / 6), pos.y - headLength * Math.sin(angle + Math.PI / 6))
      ctx.stroke()
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !activeTool) return

    const pos = getCanvasCoordinates(e)

    if (activeTool === "circle") {
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2))
      setAnnotations([
        ...annotations,
        { type: "circle", x: startPos.x, y: startPos.y, radius, color: currentColor, lineWidth: currentLineWidth },
      ])
    } else if (activeTool === "arrow") {
      setAnnotations([
        ...annotations,
        {
          type: "arrow",
          x: startPos.x,
          y: startPos.y,
          x2: pos.x,
          y2: pos.y,
          color: currentColor,
          lineWidth: currentLineWidth,
        },
      ])
    }

    setIsDrawing(false)
    setStartPos(null)
  }

  const handleAddText = () => {
    if (!textInput.trim() || !textPosition) return

    setAnnotations([
      ...annotations,
      {
        type: "text",
        x: textPosition.x,
        y: textPosition.y,
        text: textInput,
        color: currentColor,
        lineWidth: currentLineWidth,
      },
    ])
    setTextInput("")
    setShowTextInput(false)
    setTextPosition(null)
  }

  const handleUndo = () => {
    setAnnotations(annotations.slice(0, -1))
  }

  const handleClear = () => {
    setAnnotations([])
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const reader = new FileReader()
        reader.onloadend = () => {
          onSave(reader.result as string)
        }
        reader.readAsDataURL(blob)
      },
      "image/jpeg",
      0.95,
    )
  }

  const handleClose = () => {
    setAnnotations([])
    setActiveTool(null)
    setImageLoaded(false)
    setTextInput("")
    setShowTextInput(false)
    setTextPosition(null)
    setIsDrawing(false)
    setStartPos(null)
    onClose()
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Foto - Agregar Anotaciones</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b pb-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant={activeTool === "circle" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTool("circle")}
                >
                  <Circle className="h-4 w-4 mr-2" />
                  Círculo
                </Button>
                <Button
                  variant={activeTool === "arrow" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTool("arrow")}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Flecha
                </Button>
                <Button
                  variant={activeTool === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTool("text")}
                >
                  <Type className="h-4 w-4 mr-2" />
                  Texto
                </Button>
              </div>

              <div className="flex gap-2 items-center">
                <Label htmlFor="color-picker" className="flex items-center gap-2 cursor-pointer">
                  <Palette className="h-4 w-4" />
                  <input
                    id="color-picker"
                    type="color"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border"
                  />
                </Label>
                <Button variant="outline" size="sm" onClick={handleUndo} disabled={annotations.length === 0}>
                  <Undo className="h-4 w-4 mr-2" />
                  Deshacer
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear} disabled={annotations.length === 0}>
                  <Eraser className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium whitespace-nowrap">Grosor: {currentLineWidth}px</Label>
              <Slider
                value={[currentLineWidth]}
                onValueChange={(value) => setCurrentLineWidth(value[0])}
                min={3}
                max={15}
                step={1}
                className="flex-1"
              />
            </div>
          </div>

          {/* Canvas */}
          <div className="relative border rounded-lg overflow-hidden bg-muted">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              className="max-w-full h-auto cursor-crosshair"
              style={{ touchAction: "none" }}
            />
          </div>

          {/* Text Input Dialog */}
          {showTextInput && (
            <div className="p-4 border rounded-lg bg-card space-y-3">
              <Label htmlFor="text-input">Ingresa el texto:</Label>
              <Input
                id="text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Escribe aquí..."
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={handleAddText} size="sm">
                  Agregar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowTextInput(false)
                    setTextInput("")
                    setTextPosition(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {activeTool
              ? `Herramienta activa: ${activeTool === "circle" ? "Círculo" : activeTool === "arrow" ? "Flecha" : "Texto"}`
              : "Selecciona una herramienta para comenzar"}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            Guardar Foto Editada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
