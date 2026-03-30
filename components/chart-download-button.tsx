"use client"

import type React from "react"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChartDownloadButtonProps {
  chartRef: React.RefObject<HTMLDivElement>
  fileName?: string
}

export function ChartDownloadButton({ chartRef, fileName = "chart" }: ChartDownloadButtonProps) {
  const handleDownload = async () => {
    if (!chartRef.current) return

    try {
      const { default: html2canvas } = await import("html2canvas")

      const element = chartRef.current

      // Esperar un momento para asegurar que el gráfico esté completamente renderizado
      await new Promise((resolve) => setTimeout(resolve, 100))

      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        allowTaint: false,
        useCORS: true,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector(`[data-chart-id="${fileName}"]`) || clonedDoc.body
          // Asegurar que los estilos se apliquen correctamente
          const styles = clonedElement.querySelectorAll("*")
          styles.forEach((el) => {
            const htmlEl = el as HTMLElement
            const computedStyle = window.getComputedStyle(
              element.querySelector(`[data-chart-id="${fileName}"]`) || element,
            )
            htmlEl.style.cssText = computedStyle.cssText
          })
        },
      })

      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `${fileName}-${new Date().getTime()}.png`
      link.click()
    } catch (error) {
      console.error("Error downloading chart:", error)
      alert("Error al descargar el gráfico. Por favor intenta de nuevo.")
    }
  }

  return (
    <Button
      onClick={handleDownload}
      size="sm"
      variant="outline"
      className="h-8 w-8 p-0 bg-transparent"
      title="Descargar como PNG"
    >
      <Download className="h-4 w-4" />
    </Button>
  )
}
