/**
 * PDF Generator Module
 * 
 * ⚠️ SEPARACIÓN DE FUNCIONES:
 * 
 * Este módulo contiene DOS funciones de generación de PDF completamente independientes:
 * 
 * 1. generateInspectionPDF()
 *    - USO: Inspección Normal (app/inspeccion/[areaId]/[checklistId]/page.tsx)
 *    - CARACTERÍSTICAS: Genera PDF con criterios, checklists y fotos organizadas por criterios
 *    - CUANDO: Se ejecuta SOLO cuando el usuario hace clic en "Generar PDF"
 *    - NO ES AUTOMÁTICO
 * 
 * 2. generateQuickInspectionPDF()
 *    - USO: Inspección Rápida (app/inspeccion-rapida/page.tsx)
 *    - CARACTERÍSTICAS: Genera PDF con hallazgos y evidencias agrupados
 *    - CUANDO: Se ejecuta SOLO cuando el usuario hace clic en "Generar PDF"
 *    - NO ES AUTOMÁTICO
 * 
 * AMBAS FUNCIONES:
 * ✓ Solo se ejecutan manualmente (no automático)
 * ✓ No interfieren una con la otra
 * ✓ Usan diferentes estructuras de datos
 * ✓ Generan PDFs con diferentes formatos
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
        // Crear canvas para optimizar la imagen
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("No se pudo crear el contexto del canvas"))
          return
        }

        // Calcular dimensiones optimizadas (máximo 1200px en el lado más largo)
        const maxSize = 1200
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

        // Dibujar imagen optimizada
        ctx.drawImage(img, 0, 0, width, height)

        // Convertir a base64 con calidad optimizada
        const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.85)

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
 * 
 * Genera un reporte PDF completo para inspecciones normales con:
 * - Tabla de criterios y subcritérios
 * - Fotos organizadas por criterio evaluado
 * - Estadísticas de cumplimiento
 * - Detalles del área y checklist
 * 
 * @param inspection - Objeto de inspección con todos los datos y fotos
 * @param area - Área inspecciona
 * @param checklist - Checklist utilizado
 * 
 * IMPORTANTE: Esta función es COMPLETAMENTE INDEPENDIENTE de generateQuickInspectionPDF
 * y NO debe interferir con la inspección rápida.
 */
export async function generateInspectionPDF(inspection: Inspection, area: Area, checklist: Checklist): Promise<void> {
  try {
    console.log("[v0] generateInspectionPDF: Iniciando generación de PDF para INSPECCIÓN NORMAL...")
    const doc = new jsPDF()
    const stats = calculateInspectionStats(inspection, checklist)
    const compliancePercentage =
      stats.totalCriteria > 0 ? ((stats.totalCriteria - stats.totalFindings) / stats.totalCriteria) * 100 : 100

    const isRegistroChecklist = checklist.type === "registro"

    // Contador dinámico de secciones para numeración consistente
    let sectionNumber = 0

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

    // Sección 1: RESUMEN DE LA INSPECCIÓN
    sectionNumber++
    doc.setFillColor(...COLORS.accent)
    doc.rect(15, yPosition, 180, 8, "F")
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text(`${sectionNumber}. RESUMEN DE LA INSPECCIÓN`, 20, yPosition + 5.5)
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

    // Sección 2: TABLA DE REGISTROS (solo si es registro checklist)
    if (isRegistroChecklist) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      sectionNumber++
      doc.setFillColor(...COLORS.accent)
      doc.rect(15, yPosition, 180, 8, "F")
      doc.setFontSize(14)
      doc.setTextColor(...COLORS.white)
      doc.setFont("helvetica", "bold")
      doc.text(`${sectionNumber}. TABLA DE REGISTROS`, 20, yPosition + 5.5)
      doc.setFont("helvetica", "normal")
      yPosition += 13

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

    // Sección 3: GRÁFICOS Y ESTADÍSTICAS
    sectionNumber++
    doc.setFillColor(...COLORS.accent)
    doc.rect(15, yPosition, 180, 8, "F")
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text(`${sectionNumber}. GRÁFICOS Y ESTADÍSTICAS`, 20, yPosition + 5.5)
    doc.setFont("helvetica", "normal")
    yPosition += 13

    if (!isRegistroChecklist) {
      doc.setFillColor(...COLORS.primary)
      doc.rect(15, yPosition, 180, 8, "F")
      doc.setFontSize(12)
      doc.setTextColor(...COLORS.white)
      doc.setFont("helvetica", "bold")
      doc.text(`${sectionNumber}.1 Resumen de Cumplimiento`, 20, yPosition + 5.5)
      doc.setFont("helvetica", "normal")
      yPosition += 13
    } else {
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
    const centerX = 105 // Centrado en página de 210mm
    const centerY = yPosition + 30
    const outerRadius = 25
    const innerRadius = 15

    // Validar que no haya división por cero
    if (stats.totalCriteria === 0) {
      doc.setFontSize(12)
      doc.setTextColor(150, 150, 150)
      doc.text("No hay criterios definidos para esta inspección", centerX, centerY + 5, { align: "center" })
      yPosition += 50
    } else {
      const conformeAngle = (conformeCount / stats.totalCriteria) * 360
      const noConformeAngle = (stats.totalFindings / stats.totalCriteria) * 360

      // Dibujar gráfico de anillos
      doc.setFillColor(...COLORS.conforme)
      drawDonutSlice(doc, centerX, centerY, outerRadius, innerRadius, 0, conformeAngle)

      doc.setFillColor(...COLORS.noConforme)
      drawDonutSlice(doc, centerX, centerY, outerRadius, innerRadius, conformeAngle, conformeAngle + noConformeAngle)

      doc.setFillColor(255, 255, 255) // Blanco
      doc.circle(centerX, centerY, innerRadius, "F")

      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(34, 197, 94) // Verde #22c55e
      doc.text(`${compliancePercentage.toFixed(0)}%`, centerX, centerY + 2, { align: "center" })
      doc.setFont("helvetica", "normal")

      const legendStartX = centerX - 40 // Centrar leyenda
      const legendY = yPosition + 65

      doc.setFillColor(...COLORS.conforme)
      doc.rect(legendStartX, legendY, 6, 6, "F")
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...COLORS.text)
      doc.text(
        `Conforme: ${conformeCount} ${conformeCount === 1 ? "criterio" : "criterios"} (${((conformeCount / stats.totalCriteria) * 100).toFixed(1)}%)`,
        legendStartX + 10,
        legendY + 4.5,
      )

      doc.setFillColor(...COLORS.noConforme)
      doc.rect(legendStartX, legendY + 10, 6, 6, "F")
      doc.text(
        `No Conforme: ${stats.totalFindings} ${stats.totalFindings === 1 ? "criterio" : "criterios"} (${((stats.totalFindings / stats.totalCriteria) * 100).toFixed(1)}%)`,
        legendStartX + 10,
        legendY + 14.5,
      )
      doc.setFont("helvetica", "normal")

      yPosition += 85
    }

    if (Object.keys(stats.findingsByCategory).length > 0) {
      const allCategories = Array.from(new Set(checklist.items.map((item) => item.category))).sort((a, b) =>
        a.localeCompare(b),
      )
      const categoryData = allCategories.map((category) => {
        const totalInCategory = checklist.items.filter((item) => item.category === category).length
        const findings = stats.findingsByCategory[category] || 0
        const compliance = totalInCategory > 0 ? ((totalInCategory - findings) / totalInCategory) * 100 : 100
        return [category, totalInCategory.toString(), findings.toString()]
      })

      const estimatedTableHeight = 10 + categoryData.length * 8 + 15

      if (yPosition + estimatedTableHeight > 270) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFillColor(...COLORS.primary)
      doc.rect(15, yPosition, 180, 8, "F")
      doc.setFontSize(12)
      doc.setTextColor(...COLORS.white)
      doc.setFont("helvetica", "bold")
      doc.text(`${sectionNumber}.2 Hallazgos por Categoría`, 20, yPosition + 5.5)
      doc.setFont("helvetica", "normal")
      yPosition += 13

      autoTable(doc, {
        startY: yPosition,
        head: [["Categoría", "Total", "Hallazgos"]],
        body: categoryData,
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
          1: { halign: "center", fontStyle: "bold", fontSize: 11, cellWidth: 30 },
          2: { halign: "center", fontStyle: "bold", fontSize: 11, cellWidth: 40 },
        },
        margin: { left: 15, right: 15 },
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15
    }

    if (!isRegistroChecklist && Object.keys(stats.findingsByCategory).length > 0) {
      const allCategories = Array.from(new Set(checklist.items.map((item) => item.category))).sort((a, b) =>
        a.localeCompare(b),
      )
      const barSpacing = 12
      const estimatedChartHeight = 8 + 13 + allCategories.length * barSpacing + 15 // header + spacing + barras + margen

      if (yPosition + estimatedChartHeight > 270) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFillColor(...COLORS.primary)
      doc.rect(15, yPosition, 180, 8, "F")
      doc.setFontSize(12)
      doc.setTextColor(...COLORS.white)
      doc.setFont("helvetica", "bold")
      doc.text(`${sectionNumber}.3 Cumplimiento por Categoría`, 20, yPosition + 5.5)
      doc.setFont("helvetica", "normal")
      yPosition += 13

      const complianceData = allCategories.map((category) => {
        const totalInCategory = checklist.items.filter((item) => item.category === category).length
        const findings = stats.findingsByCategory[category] || 0
        const compliance = totalInCategory > 0 ? ((totalInCategory - findings) / totalInCategory) * 100 : 100
        return {
          category,
          cumplimiento: Math.round(compliance),
        }
      })

      const chartWidth = 100
      const barHeight = 8
      const chartHeight = complianceData.length * barSpacing
      const labelWidth = 50 // Ancho estimado para las etiquetas
      const totalChartWidth = labelWidth + chartWidth + 20 // labels + barras + porcentajes
      const chartX = (210 - totalChartWidth) / 2 + labelWidth // Centrar y ajustar por las etiquetas
      const chartY = yPosition

      complianceData.forEach((data, index) => {
        const yPos = chartY + index * barSpacing

        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(...COLORS.text)
        const categoryLabel = data.category.length > 20 ? data.category.substring(0, 20) + "..." : data.category
        doc.text(categoryLabel, chartX - 5, yPos + barHeight / 2 + 1, { align: "right" })

        const barWidth = (data.cumplimiento / 100) * chartWidth
        doc.setFillColor(...COLORS.accent)
        doc.rect(chartX, yPos, barWidth, barHeight, "F")

        doc.setFillColor(230, 230, 230)
        doc.rect(chartX + barWidth, yPos, chartWidth - barWidth, barHeight, "F")

        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(...COLORS.text)
        doc.text(`${data.cumplimiento}%`, chartX + chartWidth + 3, yPos + barHeight / 2 + 1)
      })

      yPosition += chartHeight + 15
    }

    const nonConformFindings = inspection.findings.filter((f) => f.status === "no-conforme")

    if (nonConformFindings.length > 0) {
      doc.addPage()
      yPosition = 20

      // Sección 4: HALLAZGOS NO CONFORMES (número dinámico)
      sectionNumber++
      doc.setFillColor(...COLORS.accent)
      doc.rect(15, yPosition, 180, 8, "F")
      doc.setFontSize(14)
      doc.setTextColor(...COLORS.white)
      doc.setFont("helvetica", "bold")
      doc.text(`${sectionNumber}. HALLAZGOS NO CONFORMES`, 20, yPosition + 5.5)
      doc.setFont("helvetica", "normal")
      yPosition += 15

      console.log("[v0] Optimizando imágenes...")
      const imageCache = new Map<string, { dataUrl: string; width: number; height: number } | null>()

      for (const finding of nonConformFindings) {
        if (finding.photos.length > 0) {
          for (const photoUrl of finding.photos) {
            if (!imageCache.has(photoUrl)) {
              try {
                const optimizedImage = await loadAndOptimizeImage(photoUrl)
                imageCache.set(photoUrl, optimizedImage)
              } catch (error) {
                console.error("[v0] Error optimizando imagen:", error)
                imageCache.set(photoUrl, null) // Marcar como error
              }
            }
          }
        }
      }
      console.log("[v0] Imágenes optimizadas:", imageCache.size)

      const findingsWithPhotos = nonConformFindings.filter((f) => f.photos.length > 0)
      const findingsWithoutPhotos = nonConformFindings.filter((f) => f.photos.length === 0)

      for (let i = 0; i < findingsWithPhotos.length; i++) {
        const finding = findingsWithPhotos[i]
        const item = checklist.items.find((it) => it.id === finding.itemId)
        if (!item) continue

        if (i > 0) {
          doc.addPage()
          yPosition = 20
        }

        const hallazgoNumber = String(nonConformFindings.indexOf(finding) + 1).padStart(2, "0")
        doc.setFillColor(...COLORS.primary)
        doc.rect(15, yPosition, 180, 10, "F")
        doc.setFontSize(12)
        doc.setTextColor(...COLORS.white)
        doc.setFont("helvetica", "bold")
        doc.text(`Hallazgo ${hallazgoNumber}`, 105, yPosition + 6.5, { align: "center" })
        doc.setFont("helvetica", "normal")
        yPosition += 15

        const findingData = [
          ["Área", area.name],
          ["Responsable del Área", area.responsible || "No especificado"],
          ["Criterio", item.subcategory || item.criterion],
          ["Descripción", finding.description || "Sin descripción"],
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
              cellWidth: 35,
              textColor: COLORS.primary,
              fillColor: COLORS.lightGray,
            },
            1: { cellWidth: "auto" },
          },
          margin: { left: 15, right: 15 },
        })

        yPosition = (doc as any).lastAutoTable.finalY + 10

        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(...COLORS.primary)
        doc.text("Evidencia Fotográfica:", 105, yPosition, { align: "center" })
        doc.setFont("helvetica", "normal")
        yPosition += 8

        const pageWidth = 210
        const margin = 20
        const photoWidth = pageWidth - 2 * margin
        const maxPhotoHeight = 110
        const photoSpacing = 15

        for (let j = 0; j < finding.photos.length; j++) {
          const photoUrl = finding.photos[j]
          const optimizedImage = imageCache.get(photoUrl)

          if (!optimizedImage) {
            doc.setFontSize(9)
            doc.setTextColor(150, 150, 150)
            doc.text("Error al cargar imagen", 105, yPosition + 20, { align: "center" })
            yPosition += 40
            continue
          }

          try {
            const aspectRatio = optimizedImage.height / optimizedImage.width

            if (!aspectRatio || isNaN(aspectRatio) || aspectRatio <= 0) {
              console.error("[v0] Aspect ratio inválido:", aspectRatio)
              doc.setFontSize(9)
              doc.setTextColor(150, 150, 150)
              doc.text("Error: dimensiones inválidas", 105, yPosition + 20, { align: "center" })
              yPosition += 40
              continue
            }

            let finalWidth = photoWidth
            let finalHeight = photoWidth * aspectRatio

            if (finalHeight > maxPhotoHeight) {
              finalHeight = maxPhotoHeight
              finalWidth = maxPhotoHeight / aspectRatio
            }

            if (yPosition + finalHeight > 270) {
              doc.addPage()
              yPosition = 20
            }

            const xPos = margin + (photoWidth - finalWidth) / 2

            doc.addImage(optimizedImage.dataUrl, "JPEG", xPos, yPosition, finalWidth, finalHeight)

            doc.setDrawColor(...COLORS.primary)
            doc.setLineWidth(0.5)
            doc.rect(xPos, yPosition, finalWidth, finalHeight)

            doc.setFontSize(8)
            doc.setTextColor(...COLORS.text)
            doc.text(`Foto ${j + 1} de ${finding.photos.length}`, 105, yPosition + finalHeight + 4, {
              align: "center",
            })

            yPosition += finalHeight + photoSpacing
          } catch (error) {
            console.error("[v0] Error agregando imagen al PDF:", error)
            doc.setFontSize(9)
            doc.setTextColor(150, 150, 150)
            doc.text("Error al procesar imagen", 105, yPosition + 20, { align: "center" })
            yPosition += 40
          }
        }
      }

      for (let i = 0; i < findingsWithoutPhotos.length; i++) {
        const finding = findingsWithoutPhotos[i]
        const item = checklist.items.find((it) => it.id === finding.itemId)
        if (!item) continue

        const estimatedHeight = 90

        if ((i === 0 && findingsWithPhotos.length > 0) || yPosition + estimatedHeight > 270) {
          const remainingFindings = findingsWithoutPhotos.length - i

          if (remainingFindings <= 2 && yPosition + estimatedHeight * remainingFindings > 270) {
            doc.addPage()
            yPosition = 20
          } else if (yPosition + estimatedHeight > 270) {
            doc.addPage()
            yPosition = 20
          }
        }

        const hallazgoNumber = String(nonConformFindings.indexOf(finding) + 1).padStart(2, "0")
        doc.setFillColor(...COLORS.primary)
        doc.rect(15, yPosition, 180, 8, "F")
        doc.setFontSize(12)
        doc.setTextColor(...COLORS.white)
        doc.setFont("helvetica", "bold")
        doc.text(`Hallazgo ${hallazgoNumber}`, 105, yPosition + 5.5, { align: "center" })
        doc.setFont("helvetica", "normal")
        yPosition += 12

        const findingData = [
          ["Criterio", item.subcategory || item.criterion],
          ["Descripción", finding.description || "Sin descripción"],
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
              cellWidth: 35,
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
        doc.text("Sin evidencia fotográfica", 105, yPosition, { align: "center" })
        yPosition += 8

        if (i < findingsWithoutPhotos.length - 1) {
          yPosition += 3
        }
      }
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
 * GENERADOR DE PDF - INSPECCIÓN RÁPIDA
 * 
 * Genera un reporte PDF para inspecciones rápidas con:
 * - Resumen de datos básicos (lugar, inspector, responsable)
 * - Hallazgos agrupados con sus fotos
 * - Evidencias de cumplimiento
 * - Porcentaje de conformidad
 * 
 * @param data - Objeto con estructura específica de inspección rápida
 *   - lugar: Ubicación inspeccionada
 *   - inspector: Nombre del inspector
 *   - responsable: Responsable del área
 *   - fecha: Fecha/hora de la inspección
 *   - evidencias: Array de fotos base64 de conformidad
 *   - hallazgos: Array de hallazgos con descripción y fotos
 * 
 * IMPORTANTE: Esta función es COMPLETAMENTE INDEPENDIENTE de generateInspectionPDF
 * y NO interfiere con la inspección normal. Solo se ejecuta cuando el usuario
 * solicita explícitamente la generación del PDF (clic en botón).
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
  console.log("[v0] generateQuickInspectionPDF: Generando PDF para INSPECCIÓN RÁPIDA...")
  console.log("[v0] ✓ Confirmado: PDF generado SOLO por solicitud manual del usuario")
  console.log("[v0] ✓ No hay generación automática")
    const doc = new jsPDF()

    // Contador dinámico de secciones
    let sectionNumber = 0

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

    // Sección 1: RESUMEN DE LA INSPECCIÓN
    sectionNumber++
    doc.setFillColor(...COLORS.accent)
    doc.rect(15, yPosition, 180, 8, "F")
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text(`${sectionNumber}. RESUMEN DE LA INSPECCIÓN`, 20, yPosition + 5.5)
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
        0: { fontStyle: "bold", cellWidth: 45, textColor: COLORS.primary },
        1: { cellWidth: "auto" },
      },
      margin: { left: 15, right: 15 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15

    if (yPosition > 210) {
      doc.addPage()
      yPosition = 20
    }

    // Sección 2: GRÁFICOS Y ESTADÍSTICAS
    sectionNumber++
    doc.setFillColor(...COLORS.accent)
    doc.rect(15, yPosition, 180, 8, "F")
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text(`${sectionNumber}. GRÁFICOS Y ESTADÍSTICAS`, 20, yPosition + 5.5)
    doc.setFont("helvetica", "normal")
    yPosition += 13

    doc.setFillColor(...COLORS.primary)
    doc.rect(15, yPosition, 180, 8, "F")
    doc.setFontSize(12)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text(`${sectionNumber}.1 Resumen de Cumplimiento`, 20, yPosition + 5.5)
    doc.setFont("helvetica", "normal")
    yPosition += 13

    const hallazgosFotos = data.hallazgos.reduce((sum, h) => sum + h.fotos.length, 0)
    const totalFotos = data.evidencias.length + hallazgosFotos
    const conformeCount = data.evidencias.length
    const noConformeCount = hallazgosFotos
    const compliancePercentage = totalFotos > 0 ? (conformeCount / totalFotos) * 100 : 100

    const centerX = 105 // Centrado en página de 210mm
    const centerY = yPosition + 30
    const outerRadius = 25
    const innerRadius = 15

    const conformeAngle = totalFotos > 0 ? (conformeCount / totalFotos) * 360 : 0
    const noConformeAngle = totalFotos > 0 ? (noConformeCount / totalFotos) * 360 : 0

    if (totalFotos > 0) {
      doc.setFillColor(...COLORS.conforme)
      drawDonutSlice(doc, centerX, centerY, outerRadius, innerRadius, 0, conformeAngle)

      doc.setFillColor(...COLORS.noConforme)
      drawDonutSlice(doc, centerX, centerY, outerRadius, innerRadius, conformeAngle, conformeAngle + noConformeAngle)
    }

    doc.setFillColor(255, 255, 255) // Blanco
    doc.circle(centerX, centerY, innerRadius, "F")

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(34, 197, 94) // Verde #22c55e
    doc.text(`${compliancePercentage.toFixed(0)}%`, centerX, centerY + 2, { align: "center" })
    doc.setFont("helvetica", "normal")

    const legendStartX = centerX - 40 // Centrar leyenda
    const legendY = yPosition + 65

    doc.setFillColor(...COLORS.conforme)
    doc.rect(legendStartX, legendY, 6, 6, "F")
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.text)
    doc.text(
      `Conforme: ${conformeCount} ${conformeCount === 1 ? "criterio" : "criterios"} (${totalFotos > 0 ? ((conformeCount / totalFotos) * 100).toFixed(1) : 0}%)`,
      legendStartX + 10,
      legendY + 4.5,
    )

    doc.setFillColor(...COLORS.noConforme)
    doc.rect(legendStartX, legendY + 10, 6, 6, "F")
    doc.text(
      `No Conforme: ${noConformeCount} ${noConformeCount === 1 ? "criterio" : "criterios"} (${totalFotos > 0 ? ((noConformeCount / totalFotos) * 100).toFixed(1) : 0}%)`,
      legendStartX + 10,
      legendY + 14.5,
    )
    doc.setFont("helvetica", "normal")

    yPosition += 85

    if (data.hallazgos.length > 0) {
      doc.addPage()
      yPosition = 20

      // Sección 3: HALLAZGOS NO CONFORMES
      sectionNumber++
      doc.setFillColor(...COLORS.accent)
      doc.rect(15, yPosition, 180, 8, "F")
      doc.setFontSize(14)
      doc.setTextColor(...COLORS.white)
      doc.setFont("helvetica", "bold")
      doc.text(`${sectionNumber}. HALLAZGOS NO CONFORMES`, 20, yPosition + 5.5)
      doc.setFont("helvetica", "normal")
      yPosition += 15

      console.log("[v0] Optimizando imágenes...")
      const imageCache = new Map<string, { dataUrl: string; width: number; height: number } | null>()

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
      console.log("[v0] Imágenes optimizadas:", imageCache.size)

      const findingsWithPhotos = data.hallazgos.filter((h) => h.fotos.length > 0)
      const findingsWithoutPhotos = data.hallazgos.filter((h) => h.fotos.length === 0)

      for (let i = 0; i < findingsWithPhotos.length; i++) {
        const hallazgo = findingsWithPhotos[i]

        if (i > 0) {
          doc.addPage()
          yPosition = 20
        }

        const hallazgoNumber = String(data.hallazgos.indexOf(hallazgo) + 1).padStart(2, "0")
        doc.setFillColor(...COLORS.primary)
        const headerHeight = hallazgo.fotos.length > 0 ? 10 : 8
        doc.rect(15, yPosition, 180, headerHeight, "F")
        doc.setFontSize(12)
        doc.setTextColor(...COLORS.white)
        doc.setFont("helvetica", "bold")
        doc.text(`Hallazgo ${hallazgoNumber}`, 105, yPosition + headerHeight / 2 + 2, { align: "center" })
        doc.setFont("helvetica", "normal")
        yPosition += hallazgo.fotos.length > 0 ? 15 : 12

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
            cellPadding: hallazgo.fotos.length > 0 ? 4 : 3,
            textColor: COLORS.text,
          },
          columnStyles: {
            0: {
              fontStyle: "bold",
              cellWidth: 35,
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
          doc.text("Evidencia Fotográfica:", 105, yPosition, { align: "center" })
          doc.setFont("helvetica", "normal")
          yPosition += 8

          const pageWidth = 210
          const margin = 20
          const photoWidth = pageWidth - 2 * margin
          const maxPhotoHeight = 110
          const photoSpacing = 15

          for (let j = 0; j < hallazgo.fotos.length; j++) {
            const photoUrl = hallazgo.fotos[j]
            const optimizedImage = imageCache.get(photoUrl)

            if (!optimizedImage) {
              doc.setFontSize(9)
              doc.setTextColor(150, 150, 150)
              doc.text("Error al cargar imagen", 105, yPosition + 20, { align: "center" })
              yPosition += 40
              continue
            }

            try {
              const aspectRatio = optimizedImage.height / optimizedImage.width

              if (!aspectRatio || isNaN(aspectRatio) || aspectRatio <= 0) {
                console.error("[v0] Aspect ratio inválido:", aspectRatio)
                doc.setFontSize(9)
                doc.setTextColor(150, 150, 150)
                doc.text("Error: dimensiones inválidas", 105, yPosition + 20, { align: "center" })
                yPosition += 40
                continue
              }

              let finalWidth = photoWidth
              let finalHeight = photoWidth * aspectRatio

              if (finalHeight > maxPhotoHeight) {
                finalHeight = maxPhotoHeight
                finalWidth = maxPhotoHeight / aspectRatio
              }

              if (yPosition + finalHeight > 270) {
                doc.addPage()
                yPosition = 20
              }

              const xPos = margin + (photoWidth - finalWidth) / 2

              doc.addImage(optimizedImage.dataUrl, "JPEG", xPos, yPosition, finalWidth, finalHeight)

              doc.setDrawColor(...COLORS.primary)
              doc.setLineWidth(0.5)
              doc.rect(xPos, yPosition, finalWidth, finalHeight)

              doc.setFontSize(8)
              doc.setTextColor(...COLORS.text)
              doc.text(`Foto ${j + 1} de ${hallazgo.fotos.length}`, 105, yPosition + finalHeight + 4, {
                align: "center",
              })

              yPosition += finalHeight + photoSpacing
            } catch (error) {
              console.error("[v0] Error agregando imagen al PDF:", error)
              doc.setFontSize(9)
              doc.setTextColor(150, 150, 150)
              doc.text("Error al procesar imagen", 105, yPosition + 20, { align: "center" })
              yPosition += 40
            }
          }
        } else {
          doc.setFontSize(9)
          doc.setTextColor(150, 150, 150)
          doc.text("Sin evidencia fotográfica", 105, yPosition, { align: "center" })
          yPosition += 8
        }

        if (i < findingsWithPhotos.length - 1) {
          if (hallazgo.fotos.length === 0) {
            yPosition += 3
          } else {
            yPosition += 10
          }
        }
      }

      for (let i = 0; i < findingsWithoutPhotos.length; i++) {
        const hallazgo = findingsWithoutPhotos[i]

        const estimatedHeight = 90

        if ((i === 0 && findingsWithPhotos.length > 0) || yPosition + estimatedHeight > 270) {
          const remainingFindings = findingsWithoutPhotos.length - i

          if (remainingFindings <= 2 && yPosition + estimatedHeight * remainingFindings > 270) {
            doc.addPage()
            yPosition = 20
          } else if (yPosition + estimatedHeight > 270) {
            doc.addPage()
            yPosition = 20
          }
        }

        const hallazgoNumber = String(data.hallazgos.indexOf(hallazgo) + 1).padStart(2, "0")
        doc.setFillColor(...COLORS.primary)
        doc.rect(15, yPosition, 180, 8, "F")
        doc.setFontSize(12)
        doc.setTextColor(...COLORS.white)
        doc.setFont("helvetica", "bold")
        doc.text(`Hallazgo ${hallazgoNumber}`, 105, yPosition + 5.5, { align: "center" })
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
              cellWidth: 35,
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
        doc.text("Sin evidencia fotográfica", 105, yPosition, { align: "center" })
        yPosition += 8

        if (i < findingsWithoutPhotos.length - 1) {
          yPosition += 3
        }
      }
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

    const fileName = `Informe_${data.lugar.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toLocaleDateString("es-ES").replace(/\//g, "-")}.pdf`

    console.log("[v0] Guardando PDF...")
    doc.save(fileName)

    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log("[v0] PDF generado y descargado exitosamente")
  } catch (error) {
    console.error("[v0] Error generando PDF de inspección rápida:", error)
    throw new Error("No se pudo generar el PDF. Por favor, intenta nuevamente.")
  }
}
