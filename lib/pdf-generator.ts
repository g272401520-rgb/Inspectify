/**
 * PDF Generator Module - VERSIÓN OPTIMIZADA PARA LANDSCAPE
 * 
 * OPTIMIZACIONES REALIZADAS:
 * 
 * 1. ✅ ORIENTACIÓN HORIZONTAL (LANDSCAPE)
 *    - Página: 297mm × 210mm (vs 210mm × 297mm)
 *    - Aprovecha el espacio horizontal máximo
 * 
 * 2. ✅ IMÁGENES MAXIMIZADAS
 *    - Ancho: 277mm (vs 170mm anterior)
 *    - Alto: 170mm (vs 110mm anterior)
 *    - Resultado: Imágenes ENORMES y nítidas
 * 
 * 3. ✅ RESOLUCIÓN ALTA
 *    - 2000px máximo (profesional para impresión)
 *    - Compresión 0.90 (óptima calidad/tamaño)
 * 
 * 4. ✅ ORDEN PRESERVADO
 *    - Acceso directo por índice a hallazgo.fotos[j]
 *    - 100% respeta el orden de captura
 */

"use client"

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { Inspection, Area, Checklist } from "./types"
import { calculateInspectionStats } from "./utils-inspection"

const COLORS = {
  primary: [26, 36, 64], // #1A2440
  accent: [132, 191, 44], // #84BF2C
  conforme: [34, 197, 94], // #22c55e - verde brillante
  noConforme: [239, 68, 68], // #ef4444 - rojo
  pendiente: [245, 158, 11], // #f59e0b - naranja
  text: [50, 50, 50],
  lightGray: [240, 240, 240],
  white: [255, 255, 255],
}

async function loadAndOptimizeImage(photoUrl: string): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("No se pudo crear el contexto del canvas"))
          return
        }

        // ✅ OPTIMIZADO: Resolución ALTA para PDF (2000px máximo)
        const maxSize = 2000
        let width = img.width
        let height = img.height

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }

        canvas.width = width
        canvas.height = height

        ctx.drawImage(img, 0, 0, width, height)

        // ✅ Calidad 0.90 = nítido y comprimido
        const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.90)

        resolve({ dataUrl: optimizedDataUrl, width, height })
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error("Error al cargar la imagen"))
    }

    img.src = photoUrl
  })
}

/**
 * GENERADOR DE PDF - INSPECCIÓN NORMAL
 * (Mantiene funcionalidad original sin cambios)
 */
export async function generateInspectionPDF(inspection: Inspection, area: Area, checklist: Checklist): Promise<void> {
  try {
    console.log("[v0] generateInspectionPDF: Iniciando generación de PDF para INSPECCIÓN NORMAL...")
    const doc = new jsPDF()
    const stats = calculateInspectionStats(inspection, checklist)
    const compliancePercentage =
      stats.totalCriteria > 0 ? ((stats.totalCriteria - stats.totalFindings) / stats.totalCriteria) * 100 : 100

    const isRegistroChecklist = checklist.type === "registro"
    
    let sectionNumber = 1
    let yPosition = 20

    doc.setFillColor(...COLORS.primary)
    doc.rect(0, 0, 210, 40, "F")

    doc.setFontSize(24)
    doc.setTextColor(...COLORS.white)
    doc.text("INFORME DE INSPECCIÓN", 105, 20, { align: "center" })

    doc.setFontSize(10)
    doc.setTextColor(200, 200, 200)
    doc.text("Inspectify - Gestión de Calidad", 105, 30, { align: "center" })

    yPosition = 50

    doc.setFillColor(...COLORS.accent)
    doc.rect(15, yPosition, 180, 8, "F")
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text("1. RESUMEN DE LA INSPECCIÓN", 20, yPosition + 5.5)
    doc.setFont("helvetica", "normal")
    yPosition += 13

    const summaryData = [
      ["Área", area.name],
      ["Responsable del Área", area.responsible || "No especificado"],
      ["Checklist", checklist.name],
      ["Inspector", inspection.inspectorName],
      [
        "Fecha de Inspección",
        new Date(inspection.date).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      ],
    ]

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: summaryData,
      theme: "plain",
      styles: {
        fontSize: 10,
        cellPadding: 3,
        textColor: COLORS.text,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 45, textColor: COLORS.primary },
        1: { cellWidth: "auto" },
      },
      margin: { left: 15, right: 15 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15

    if (isRegistroChecklist) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFillColor(...COLORS.accent)
      doc.rect(15, yPosition, 180, 8, "F")
      doc.setFontSize(14)
      doc.setTextColor(...COLORS.white)
      doc.setFont("helvetica", "bold")
      doc.text(`${sectionNumber}. RESUMEN DE LA INSPECCIÓN`, 20, yPosition + 5.5)
      doc.setFont("helvetica", "normal")
      yPosition += 13
      sectionNumber++

      const registroTableData = checklist.items.map((item) => {
        const finding = inspection.findings.find((f) => f.itemId === item.id)
        const estado = finding?.status === "no-conforme" ? "No Conforme" : "Conforme"
        return [item.criterion, estado]
      })

      autoTable(doc, {
        startY: yPosition,
        head: [["Nombre del Registro", "Estado"]],
        body: registroTableData,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 4,
          textColor: COLORS.text,
        },
        headStyles: {
          fillColor: COLORS.primary,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 11,
        },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: {
            halign: "center",
            fontStyle: "bold",
            fontSize: 11,
            cellWidth: 40,
          },
        },
        margin: { left: 15, right: 15 },
        didParseCell: (data) => {
          if (data.column.index === 1 && data.section === "body") {
            if (data.cell.text[0] === "Conforme") {
              data.cell.styles.textColor = COLORS.conforme
            } else if (data.cell.text[0] === "No Conforme") {
              data.cell.styles.textColor = COLORS.noConforme
            }
          }
        },
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15
    }

    if (yPosition > 210) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFillColor(...COLORS.accent)
    doc.rect(15, yPosition, 180, 8, "F")
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text(`${sectionNumber}. GRÁFICO DE DISTRIBUCIÓN` + (isRegistroChecklist ? "" : " Y ESTADÍSTICAS"), 20, yPosition + 5.5)
    doc.setFont("helvetica", "normal")
    yPosition += 13
    sectionNumber++

    if (!isRegistroChecklist) {
      doc.setFillColor(...COLORS.primary)
      doc.rect(15, yPosition, 180, 8, "F")
      doc.setFontSize(12)
      doc.setTextColor(...COLORS.white)
      doc.setFont("helvetica", "bold")
      doc.text(`${sectionNumber}.1 Resumen de Cumplimiento`, 20, yPosition + 5.5)
      doc.setFont("helvetica", "normal")
      yPosition += 13
    }

    const conformeCount = stats.totalCriteria - stats.totalFindings
    const centerX = 105
    const centerY = yPosition + 30
    const outerRadius = 25
    const innerRadius = 15

    if (stats.totalCriteria === 0) {
      doc.setFontSize(12)
      doc.setTextColor(150, 150, 150)
      doc.text("No hay criterios definidos para esta inspección", centerX, centerY + 5, { align: "center" })
      yPosition += 50
    } else {
      const conformeAngle = (conformeCount / stats.totalCriteria) * 360
      const noConformeAngle = (stats.totalFindings / stats.totalCriteria) * 360

      doc.setFillColor(...COLORS.conforme)
      drawDonutSlice(doc, centerX, centerY, outerRadius, innerRadius, 0, conformeAngle)

      doc.setFillColor(...COLORS.noConforme)
      drawDonutSlice(doc, centerX, centerY, outerRadius, innerRadius, conformeAngle, conformeAngle + noConformeAngle)

      doc.setFillColor(255, 255, 255)
      doc.circle(centerX, centerY, innerRadius, "F")

      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(34, 197, 94)
      doc.text(`${compliancePercentage.toFixed(0)}%`, centerX, centerY + 2, { align: "center" })
      doc.setFont("helvetica", "normal")

      const legendStartX = centerX - 40
      const legendY = yPosition + 65

      doc.setFillColor(...COLORS.conforme)
      doc.rect(legendStartX, legendY, 6, 6, "F")
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...COLORS.text)
      const conformePercent = stats.totalCriteria > 0 ? ((conformeCount / stats.totalCriteria) * 100).toFixed(1) : "0"
      doc.text(
        `Conforme: ${conformeCount} ${conformeCount === 1 ? "criterio" : "criterios"} (${conformePercent}%)`,
        legendStartX + 10,
        legendY + 4.5,
      )

      doc.setFillColor(...COLORS.noConforme)
      doc.rect(legendStartX, legendY + 10, 6, 6, "F")
      const noConformePercent = stats.totalCriteria > 0 ? ((stats.totalFindings / stats.totalCriteria) * 100).toFixed(1) : "0"
      doc.text(
        `No Conforme: ${stats.totalFindings} ${stats.totalFindings === 1 ? "criterio" : "criterios"} (${noConformePercent}%)`,
        legendStartX + 10,
        legendY + 14.5,
      )
      doc.setFont("helvetica", "normal")

      yPosition += 85
    }

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Página ${i} de ${pageCount} | Generado el ${new Date().toLocaleDateString("es-ES")}`, 105, 290, {
        align: "center",
      })
    }

    const fileName = `Informe_${area.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date(inspection.date).toLocaleDateString("es-ES").replace(/\//g, "-")}.pdf`

    console.log("[v0] Guardando PDF...")
    doc.save(fileName)

    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log("[v0] PDF generado y descargado exitosamente")
  } catch (error) {
    console.error("[v0] Error generando PDF:", error)
    throw new Error("No se pudo generar el PDF. Por favor, intenta nuevamente.")
  }
}

function drawDonutSlice(
  doc: jsPDF,
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const startRad = (startAngle * Math.PI) / 180
  const endRad = (endAngle * Math.PI) / 180

  doc.moveTo(centerX + outerRadius * Math.cos(startRad), centerY + outerRadius * Math.sin(startRad))

  for (let i = 0; i <= Math.ceil(Math.abs(endAngle - startAngle)); i++) {
    const angle = startRad + (endRad - startRad) * (i / Math.ceil(Math.abs(endAngle - startAngle)))
    const x = centerX + outerRadius * Math.cos(angle)
    const y = centerY + outerRadius * Math.sin(angle)
    doc.lineTo(x, y)
  }

  doc.lineTo(centerX + innerRadius * Math.cos(endRad), centerY + innerRadius * Math.sin(endRad))

  for (let i = Math.ceil(Math.abs(endAngle - startAngle)); i >= 0; i--) {
    const angle = startRad + (endRad - startRad) * (i / Math.ceil(Math.abs(endAngle - startAngle)))
    const x = centerX + innerRadius * Math.cos(angle)
    const y = centerY + innerRadius * Math.sin(angle)
    doc.lineTo(x, y)
  }

  doc.lineTo(centerX + outerRadius * Math.cos(startRad), centerY + outerRadius * Math.sin(startRad))
  doc.fill()
}

/**
 * GENERADOR DE PDF - INSPECCIÓN RÁPIDA (OPTIMIZADO PARA LANDSCAPE)
 * 
 * ✅ ORIENTACIÓN: HORIZONTAL (Landscape)
 * ✅ IMÁGENES: Maximizadas (277mm × 170mm)
 * ✅ RESOLUCIÓN: 2000px para impresión profesional
 * ✅ COMPRESIÓN: 0.90 (óptima calidad)
 * ✅ ORDEN: Preservado exactamente
 */
export async function generateQuickInspectionPDF(data: {
  lugar: string
  inspector: string
  responsable: string
  fecha: string
  evidencias: string[]
  hallazgos: Array<{ descripcion: string; fotos: string[] }>
}): Promise<void> {
  try {
    console.log("[v0] generateQuickInspectionPDF: Generando PDF OPTIMIZADO para INSPECCIÓN RÁPIDA (LANDSCAPE)...")
    console.log("[v0] ✓ Orientación: HORIZONTAL (297mm × 210mm)")
    console.log("[v0] ✓ Imágenes maximizadas: 277mm × 170mm")

    // ✅ CREAR PDF EN ORIENTACIÓN HORIZONTAL
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = 297  // Ancho en landscape
    const pageHeight = 210 // Alto en landscape
    let yPosition = 20

    // HEADER
    doc.setFillColor(...COLORS.primary)
    doc.rect(0, 0, pageWidth, 40, "F")

    doc.setFontSize(24)
    doc.setTextColor(...COLORS.white)
    doc.text("INFORME DE INSPECCIÓN", pageWidth / 2, 20, { align: "center" })

    doc.setFontSize(10)
    doc.setTextColor(200, 200, 200)
    doc.text("Inspectify - Gestión de Calidad", pageWidth / 2, 30, { align: "center" })

    yPosition = 50

    // SECCIÓN 1: RESUMEN
    doc.setFillColor(...COLORS.accent)
    doc.rect(15, yPosition, pageWidth - 30, 8, "F")
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text("1. RESUMEN DE LA INSPECCIÓN", 20, yPosition + 5.5)
    doc.setFont("helvetica", "normal")
    yPosition += 13

    const summaryData = [
      ["Área", data.lugar],
      ["Responsable del Área", data.responsable],
      ["Checklist", "Inspección Rápida"],
      ["Inspector", data.inspector],
      [
        "Fecha de Inspección",
        new Date(data.fecha).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      ],
    ]

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: summaryData,
      theme: "plain",
      styles: {
        fontSize: 10,
        cellPadding: 3,
        textColor: COLORS.text,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50, textColor: COLORS.primary },
        1: { cellWidth: "auto" },
      },
      margin: { left: 15, right: 15 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15

    if (yPosition > 160) {
      doc.addPage()
      yPosition = 20
    }

    // SECCIÓN 2: GRÁFICO DE CUMPLIMIENTO
    doc.setFillColor(...COLORS.primary)
    doc.rect(15, yPosition, pageWidth - 30, 8, "F")
    doc.setFontSize(12)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text("2. RESUMEN DE CUMPLIMIENTO", 20, yPosition + 5.5)
    doc.setFont("helvetica", "normal")
    yPosition += 13

    const hallazgosFotos = data.hallazgos.reduce((sum, h) => sum + h.fotos.length, 0)
    const totalFotos = data.evidencias.length + hallazgosFotos
    const conformeCount = data.evidencias.length
    const noConformeCount = hallazgosFotos
    const compliancePercentage = totalFotos > 0 ? (conformeCount / totalFotos) * 100 : 100

    const centerX = pageWidth / 2
    const centerY = yPosition + 20
    const outerRadius = 20
    const innerRadius = 12

    const conformeAngle = totalFotos > 0 ? (conformeCount / totalFotos) * 360 : 0
    const noConformeAngle = totalFotos > 0 ? (noConformeCount / totalFotos) * 360 : 0

    if (totalFotos > 0) {
      doc.setFillColor(...COLORS.conforme)
      drawDonutSlice(doc, centerX, centerY, outerRadius, innerRadius, 0, conformeAngle)

      doc.setFillColor(...COLORS.noConforme)
      drawDonutSlice(doc, centerX, centerY, outerRadius, innerRadius, conformeAngle, conformeAngle + noConformeAngle)
    }

    doc.setFillColor(255, 255, 255)
    doc.circle(centerX, centerY, innerRadius, "F")

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(34, 197, 94)
    doc.text(`${compliancePercentage.toFixed(0)}%`, centerX, centerY + 2, { align: "center" })
    doc.setFont("helvetica", "normal")

    const legendStartX = centerX - 45
    const legendY = yPosition + 50

    doc.setFillColor(...COLORS.conforme)
    doc.rect(legendStartX, legendY, 6, 6, "F")
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.text)
    doc.text(
      `Conforme: ${conformeCount} ${conformeCount === 1 ? "foto" : "fotos"} (${totalFotos > 0 ? ((conformeCount / totalFotos) * 100).toFixed(1) : 0}%)`,
      legendStartX + 10,
      legendY + 4.5,
    )

    doc.setFillColor(...COLORS.noConforme)
    doc.rect(legendStartX, legendY + 10, 6, 6, "F")
    doc.text(
      `No Conforme: ${noConformeCount} ${noConformeCount === 1 ? "foto" : "fotos"} (${totalFotos > 0 ? ((noConformeCount / totalFotos) * 100).toFixed(1) : 0}%)`,
      legendStartX + 10,
      legendY + 14.5,
    )
    doc.setFont("helvetica", "normal")

    yPosition += 60

    // SECCIÓN 3: HALLAZGOS
    if (data.hallazgos.length > 0) {
      if (yPosition > 180) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFillColor(...COLORS.accent)
      doc.rect(15, yPosition, pageWidth - 30, 8, "F")
      doc.setFontSize(14)
      doc.setTextColor(...COLORS.white)
      doc.setFont("helvetica", "bold")
      doc.text("3. HALLAZGOS NO CONFORMES", 20, yPosition + 5.5)
      doc.setFont("helvetica", "normal")
      yPosition += 15

      console.log("[v0] Optimizando imágenes para PDF...")
      const imageCache = new Map<string, { dataUrl: string; width: number; height: number } | null>()

      // Pre-cargar todas las imágenes optimizadas
      for (const hallazgo of data.hallazgos) {
        for (const photoUrl of hallazgo.fotos) {
          if (!imageCache.has(photoUrl)) {
            try {
              const optimizedImage = await loadAndOptimizeImage(photoUrl)
              imageCache.set(photoUrl, optimizedImage)
            } catch (error) {
              console.error("[v0] Error optimizando imagen:", error)
              imageCache.set(photoUrl, null)
            }
          }
        }
      }
      console.log("[v0] ✓ Imágenes optimizadas:", imageCache.size)

      const findingsWithPhotos = data.hallazgos.filter((h) => h.fotos.length > 0)
      const findingsWithoutPhotos = data.hallazgos.filter((h) => h.fotos.length === 0)

      // Procesar hallazgos CON fotos (uno por página)
      for (let i = 0; i < findingsWithPhotos.length; i++) {
        const hallazgo = findingsWithPhotos[i]

        if (i > 0) {
          doc.addPage()
          yPosition = 20
        }

        const hallazgoNumber = String(data.hallazgos.indexOf(hallazgo) + 1).padStart(2, "0")
        doc.setFillColor(...COLORS.primary)
        doc.rect(15, yPosition, pageWidth - 30, 10, "F")
        doc.setFontSize(12)
        doc.setTextColor(...COLORS.white)
        doc.setFont("helvetica", "bold")
        doc.text(`Hallazgo ${hallazgoNumber}`, pageWidth / 2, yPosition + 6.5, { align: "center" })
        doc.setFont("helvetica", "normal")
        yPosition += 15

        const findingData = [
          ["Criterio", "Hallazgo Identificado"],
          ["Descripción", hallazgo.descripcion || "Sin descripción"],
        ]

        autoTable(doc, {
          startY: yPosition,
          head: [],
          body: findingData,
          theme: "grid",
          styles: {
            fontSize: 10,
            cellPadding: 4,
            textColor: COLORS.text,
          },
          columnStyles: {
            0: {
              fontStyle: "bold",
              cellWidth: 50,
              textColor: COLORS.primary,
              fillColor: COLORS.lightGray,
            },
            1: { cellWidth: "auto" },
          },
          margin: { left: 15, right: 15 },
          pageBreak: "auto",
          showHead: "firstPage",
        })

        yPosition = (doc as any).lastAutoTable.finalY + 10

        if (hallazgo.fotos.length > 0) {
          doc.setFontSize(10)
          doc.setFont("helvetica", "bold")
          doc.setTextColor(...COLORS.primary)
          doc.text("Evidencia Fotográfica:", pageWidth / 2, yPosition, { align: "center" })
          doc.setFont("helvetica", "normal")
          yPosition += 8

          // ✅ DIMENSIONES OPTIMIZADAS PARA LANDSCAPE
          const margin = 10
          const photoWidth = pageWidth - 2 * margin    // 277mm ancho
          const maxPhotoHeight = 170                   // 170mm alto
          const photoSpacing = 5                       // 5mm entre fotos

          // ✅ PRESERVAR ORDEN EXACTO DE FOTOS
          for (let j = 0; j < hallazgo.fotos.length; j++) {
            const photoUrl = hallazgo.fotos[j]  // Acceso directo por índice
            const optimizedImage = imageCache.get(photoUrl)

            if (!optimizedImage) {
              doc.setFontSize(9)
              doc.setTextColor(150, 150, 150)
              doc.text("Error al cargar imagen", pageWidth / 2, yPosition + 20, { align: "center" })
              yPosition += 40
              continue
            }

            try {
              const aspectRatio = optimizedImage.height / optimizedImage.width

              if (!aspectRatio || isNaN(aspectRatio) || aspectRatio <= 0) {
                console.error("[v0] Aspect ratio inválido:", aspectRatio)
                doc.setFontSize(9)
                doc.setTextColor(150, 150, 150)
                doc.text("Error: dimensiones inválidas", pageWidth / 2, yPosition + 20, { align: "center" })
                yPosition += 40
                continue
              }

              let finalWidth = photoWidth
              let finalHeight = photoWidth * aspectRatio

              if (finalHeight > maxPhotoHeight) {
                finalHeight = maxPhotoHeight
                finalWidth = maxPhotoHeight / aspectRatio
              }

              // GESTIÓN DE SALTOS DE PÁGINA PARA LANDSCAPE
              if (yPosition + finalHeight > 200) {
                doc.addPage()
                yPosition = 20
              }

              const xPos = margin + (photoWidth - finalWidth) / 2

              // AGREGAR IMAGEN
              doc.addImage(optimizedImage.dataUrl, "JPEG", xPos, yPosition, finalWidth, finalHeight)

              // Marco de foto
              doc.setDrawColor(...COLORS.primary)
              doc.setLineWidth(0.5)
              doc.rect(xPos, yPosition, finalWidth, finalHeight)

              // Numeración de foto
              doc.setFontSize(8)
              doc.setTextColor(...COLORS.text)
              doc.text(`Foto ${j + 1} de ${hallazgo.fotos.length}`, pageWidth / 2, yPosition + finalHeight + 4, {
                align: "center",
              })

              yPosition += finalHeight + photoSpacing
            } catch (error) {
              console.error("[v0] Error agregando imagen al PDF:", error)
              doc.setFontSize(9)
              doc.setTextColor(150, 150, 150)
              doc.text("Error al procesar imagen", pageWidth / 2, yPosition + 20, { align: "center" })
              yPosition += 40
            }
          }
        } else {
          doc.setFontSize(9)
          doc.setTextColor(150, 150, 150)
          doc.text("Sin evidencia fotográfica", pageWidth / 2, yPosition, { align: "center" })
          yPosition += 8
        }
      }

      // Procesar hallazgos SIN fotos
      if (findingsWithoutPhotos.length > 0) {
        if (findingsWithPhotos.length > 0) {
          doc.addPage()
          yPosition = 20
        }

        for (let i = 0; i < findingsWithoutPhotos.length; i++) {
          const hallazgo = findingsWithoutPhotos[i]

          if (yPosition > 190) {
            doc.addPage()
            yPosition = 20
          }

          const hallazgoNumber = String(data.hallazgos.indexOf(hallazgo) + 1).padStart(2, "0")
          doc.setFillColor(...COLORS.primary)
          doc.rect(15, yPosition, pageWidth - 30, 8, "F")
          doc.setFontSize(12)
          doc.setTextColor(...COLORS.white)
          doc.setFont("helvetica", "bold")
          doc.text(`Hallazgo ${hallazgoNumber}`, pageWidth / 2, yPosition + 5.5, { align: "center" })
          doc.setFont("helvetica", "normal")
          yPosition += 12

          const findingData = [
            ["Criterio", "Hallazgo Identificado"],
            ["Descripción", hallazgo.descripcion || "Sin descripción"],
          ]

          autoTable(doc, {
            startY: yPosition,
            head: [],
            body: findingData,
            theme: "grid",
            styles: {
              fontSize: 10,
              cellPadding: 3,
              textColor: COLORS.text,
            },
            columnStyles: {
              0: {
                fontStyle: "bold",
                cellWidth: 50,
                textColor: COLORS.primary,
                fillColor: COLORS.lightGray,
              },
              1: { cellWidth: "auto" },
            },
            margin: { left: 15, right: 15 },
            pageBreak: "avoid",
            showHead: "firstPage",
          })

          yPosition = (doc as any).lastAutoTable.finalY + 8

          doc.setFontSize(9)
          doc.setTextColor(150, 150, 150)
          doc.text("Sin evidencia fotográfica", pageWidth / 2, yPosition, { align: "center" })
          yPosition += 12

          if (i < findingsWithoutPhotos.length - 1) {
            yPosition += 3
          }
        }
      }
    }

    // NUMERACIÓN DE PÁGINAS
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Página ${i} de ${pageCount} | Generado el ${new Date().toLocaleDateString("es-ES")}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      })
    }

    const fileName = `Informe_${data.lugar
      .replace(/[^a-zA-Z0-9]/g, "_")}_${new Date()
      .toLocaleDateString("es-ES")
      .replace(/\//g, "-")}.pdf`

    console.log("[v0] Guardando PDF LANDSCAPE optimizado...")
    doc.save(fileName)

    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log("[v0] ✅ PDF generado exitosamente")
    console.log("[v0] ✅ Orientación: LANDSCAPE (297mm × 210mm)")
    console.log("[v0] ✅ Imágenes: 277mm × 170mm (maximizadas)")
    console.log("[v0] ✅ Orden: Preservado exactamente")
  } catch (error) {
    console.error("[v0] Error generando PDF de inspección rápida:", error)
    throw new Error("No se pudo generar el PDF. Por favor, intenta nuevamente.")
  }
}
