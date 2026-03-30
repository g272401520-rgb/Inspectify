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

export async function generateInspectionPPT(inspection: Inspection, area: Area, checklist: Checklist): Promise<void> {
  const doc = new jsPDF()
  const stats = calculateInspectionStats(inspection, checklist)
  const compliancePercentage =
    stats.totalCriteria > 0 ? ((stats.totalCriteria - stats.totalFindings) / stats.totalCriteria) * 100 : 100

  const isRegistroChecklist = checklist.type === "registro"

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
      0: { fontStyle: "bold", cellWidth: 50, textColor: COLORS.primary },
      1: { cellWidth: 120 },
    },
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
    doc.text("2. TABLA DE REGISTROS", 20, yPosition + 5.5)
    doc.setFont("helvetica", "normal")
    yPosition += 13

    const registroTableData = checklist.items.map((item) => {
      const finding = inspection.findings.find((f) => f.itemId === item.id)
      const estado = finding && finding.status === "no-conforme" ? "No Conforme" : "Conforme"
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
        0: { cellWidth: 120 },
        1: {
          halign: "center",
          fontStyle: "bold",
          fontSize: 11,
          cellWidth: 60,
        },
      },
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

  doc.setFillColor(...COLORS.accent)
  doc.rect(15, yPosition, 180, 8, "F")
  doc.setFontSize(14)
  doc.setTextColor(...COLORS.white)
  doc.setFont("helvetica", "bold")
  doc.text("2. GRÁFICOS Y ESTADÍSTICAS", 20, yPosition + 5.5)
  doc.setFont("helvetica", "normal")
  yPosition += 13

  doc.setFillColor(...COLORS.primary)
  doc.rect(15, yPosition, 180, 8, "F")
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.white)
  doc.setFont("helvetica", "bold")
  doc.text("2.1 Resumen de Cumplimiento", 20, yPosition + 5.5)
  doc.setFont("helvetica", "normal")
  yPosition += 13

  const conformeCount = stats.totalCriteria - stats.totalFindings
  const centerX = 105 // Centrado en página de 210mm
  const centerY = yPosition + 30
  const outerRadius = 25
  const innerRadius = 15

  const conformeAngle = (conformeCount / stats.totalCriteria) * 360
  const noConformeAngle = (stats.totalFindings / stats.totalCriteria) * 360

  // Dibujar segmento verde (Conforme)
  doc.setFillColor(...COLORS.conforme)
  drawDonutSlice(doc, centerX, centerY, outerRadius, innerRadius, 0, conformeAngle)

  // Dibujar segmento rojo (No Conforme)
  doc.setFillColor(...COLORS.noConforme)
  drawDonutSlice(doc, centerX, centerY, outerRadius, innerRadius, conformeAngle, conformeAngle + noConformeAngle)

  doc.setFillColor(34, 197, 94) // Verde #22c55e
  doc.circle(centerX, centerY, innerRadius, "F")

  // Porcentaje en el centro
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.white) // Texto blanco sobre fondo verde
  doc.text(`${compliancePercentage.toFixed(0)}%`, centerX, centerY + 2, { align: "center" })
  doc.setFont("helvetica", "normal")

  const legendStartX = centerX - 40
  const legendY = centerY + 35

  // Conforme
  doc.setFillColor(...COLORS.conforme)
  doc.rect(legendStartX, legendY, 8, 8, "F")
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.text)
  doc.text(
    `Conforme: ${conformeCount} ${conformeCount === 1 ? "criterio" : "criterios"} (${((conformeCount / stats.totalCriteria) * 100).toFixed(1)}%)`,
    legendStartX + 12,
    legendY + 5.5,
  )

  // No Conforme
  doc.setFillColor(...COLORS.noConforme)
  doc.rect(legendStartX, legendY + 12, 8, 8, "F")
  doc.text(
    `No Conforme: ${stats.totalFindings} ${stats.totalFindings === 1 ? "criterio" : "criterios"} (${((stats.totalFindings / stats.totalCriteria) * 100).toFixed(1)}%)`,
    legendStartX + 12,
    legendY + 17.5,
  )
  doc.setFont("helvetica", "normal")

  yPosition += 75

  if (Object.keys(stats.findingsByCategory).length > 0) {
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFillColor(...COLORS.primary)
    doc.rect(15, yPosition, 180, 8, "F")
    doc.setFontSize(12)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text("2.2 Hallazgos por Categoría", 20, yPosition + 5.5)
    doc.setFont("helvetica", "normal")
    yPosition += 13

    const categoryData = Object.entries(stats.findingsByCategory)
      .map(([category, findings]) => {
        const totalInCategory = checklist.items.filter((item) => item.category === category).length
        const conforme = totalInCategory - findings
        return { category, conforme, noConforme: findings }
      })
      .sort((a, b) => b.noConforme - a.noConforme)
      .slice(0, 4)

    const chartX = 20
    const chartY = yPosition
    const chartWidth = 170
    const chartHeight = 70
    const barWidth = chartWidth / (categoryData.length * 3)
    const maxValue = Math.max(...categoryData.map((d) => Math.max(d.conforme, d.noConforme)))

    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight)
    doc.line(chartX, chartY, chartX, chartY + chartHeight)

    categoryData.forEach((data, index) => {
      const xPos = chartX + index * (barWidth * 3) + 15
      const conformeHeight = (data.conforme / maxValue) * chartHeight * 0.75
      const noConformeHeight = (data.noConforme / maxValue) * chartHeight * 0.75

      doc.setFillColor(...COLORS.conforme)
      doc.rect(xPos, chartY + chartHeight - conformeHeight, barWidth * 0.9, conformeHeight, "F")

      if (data.conforme > 0) {
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(...COLORS.text)
        doc.text(data.conforme.toString(), xPos + barWidth * 0.45, chartY + chartHeight - conformeHeight - 2, {
          align: "center",
        })
      }

      doc.setFillColor(...COLORS.noConforme)
      doc.rect(xPos + barWidth * 1.1, chartY + chartHeight - noConformeHeight, barWidth * 0.9, noConformeHeight, "F")

      if (data.noConforme > 0) {
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(...COLORS.text)
        doc.text(
          data.noConforme.toString(),
          xPos + barWidth * 1.1 + barWidth * 0.45,
          chartY + chartHeight - noConformeHeight - 2,
          { align: "center" },
        )
      }

      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...COLORS.text)
      const categoryLabel = data.category.length > 15 ? data.category.substring(0, 15) + "..." : data.category
      if (categoryLabel.length > 10) {
        const words = categoryLabel.split(" ")
        if (words.length > 1) {
          const mid = Math.ceil(words.length / 2)
          const line1 = words.slice(0, mid).join(" ")
          const line2 = words.slice(mid).join(" ")
          doc.text(line1, xPos + barWidth, chartY + chartHeight + 4, { align: "center" })
          doc.text(line2, xPos + barWidth, chartY + chartHeight + 8, { align: "center" })
        } else {
          doc.text(categoryLabel, xPos + barWidth, chartY + chartHeight + 4, { align: "center" })
        }
      } else {
        doc.text(categoryLabel, xPos + barWidth, chartY + chartHeight + 4, { align: "center" })
      }
    })

    const legendBarX = chartX
    const legendBarY = chartY + chartHeight + 20

    doc.setFillColor(...COLORS.conforme)
    doc.rect(legendBarX, legendBarY, 6, 6, "F")
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.text)
    doc.text("Conforme", legendBarX + 10, legendBarY + 4.5)

    doc.setFillColor(...COLORS.noConforme)
    doc.rect(legendBarX + 50, legendBarY, 6, 6, "F")
    doc.text("No Conforme", legendBarX + 60, legendBarY + 4.5)
    doc.setFont("helvetica", "normal")

    yPosition += chartHeight + 30
  }

  if (Object.keys(stats.findingsByCategory).length > 0) {
    if (yPosition > 220) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFillColor(...COLORS.accent)
    doc.rect(15, yPosition, 180, 8, "F")
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text("3. DISTRIBUCIÓN POR CATEGORÍA", 20, yPosition + 5.5)
    doc.setFont("helvetica", "normal")
    yPosition += 13

    const categoryData = Object.entries(stats.findingsByCategory).map(([category, count]) => {
      const totalInCategory = checklist.items.filter((item) => item.category === category).length
      const compliance = totalInCategory > 0 ? ((totalInCategory - count) / totalInCategory) * 100 : 100
      return [category, totalInCategory.toString(), count.toString(), `${compliance.toFixed(1)}%`]
    })

    autoTable(doc, {
      startY: yPosition,
      head: [["Categoría", "Total", "Hallazgos", "Cumplimiento"]],
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
        1: { halign: "center", fontStyle: "bold", fontSize: 11 },
        2: { halign: "center", fontStyle: "bold", fontSize: 11 },
        3: { halign: "center", fontStyle: "bold", fontSize: 11 },
      },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  const nonConformFindings = inspection.findings.filter((f) => f.status === "no-conforme")

  if (nonConformFindings.length > 0) {
    doc.addPage()
    yPosition = 20

    doc.setFillColor(...COLORS.accent)
    doc.rect(15, yPosition, 180, 8, "F")
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.text("4. HALLAZGOS NO CONFORMES", 20, yPosition + 5.5)
    doc.setFont("helvetica", "normal")
    yPosition += 15

    for (let i = 0; i < nonConformFindings.length; i++) {
      const finding = nonConformFindings[i]
      const item = checklist.items.find((it) => it.id === finding.itemId)
      if (!item) continue

      if (finding.photos.length > 0 && i > 0) {
        doc.addPage()
        yPosition = 20
      } else if (yPosition > 240) {
        // Solo agregar página si no cabe y no tiene fotos
        doc.addPage()
        yPosition = 20
      }

      const hallazgoNumber = String(i + 1).padStart(2, "0")
      doc.setFillColor(...COLORS.primary)
      doc.rect(15, yPosition, 180, 10, "F")
      doc.setFontSize(12)
      doc.setTextColor(...COLORS.white)
      doc.setFont("helvetica", "bold")
      doc.text(`Hallazgo ${hallazgoNumber}`, 105, yPosition + 6.5, { align: "center" })
      doc.setFont("helvetica", "normal")
      yPosition += 15

      const findingData = [
        ["Categoría", item.category],
        ["Nombre del Registro", item.criterion],
        ["Descripción", finding.description || "Sin descripción"],
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
            cellWidth: 40,
            textColor: COLORS.primary,
            fillColor: COLORS.lightGray,
          },
          1: { cellWidth: 140 },
        },
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10

      if (finding.photos.length > 0) {
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(...COLORS.primary)
        doc.text("Evidencia Fotográfica:", 105, yPosition, { align: "center" })
        doc.setFont("helvetica", "normal")
        yPosition += 8

        const photoWidth = 75
        const photoHeight = 55
        const photosPerRow = 2
        const horizontalSpacing = 10

        for (let j = 0; j < finding.photos.length; j++) {
          const photoIndex = j % photosPerRow
          const rowIndex = Math.floor(j / photosPerRow)

          if (photoIndex === 0 && yPosition + photoHeight > 270) {
            doc.addPage()
            yPosition = 20
          }

          try {
            const totalWidth = photosPerRow * photoWidth + (photosPerRow - 1) * horizontalSpacing
            const startX = (210 - totalWidth) / 2
            const xPos = startX + photoIndex * (photoWidth + horizontalSpacing)

            doc.addImage(finding.photos[j], "JPEG", xPos, yPosition, photoWidth, photoHeight)

            doc.setDrawColor(...COLORS.primary)
            doc.setLineWidth(0.5)
            doc.rect(xPos, yPosition, photoWidth, photoHeight)
          } catch (error) {
            console.error("Error adding image to PDF:", error)
            doc.setFontSize(9)
            doc.setTextColor(150, 150, 150)
            const totalWidth = photosPerRow * photoWidth + (photosPerRow - 1) * horizontalSpacing
            const startX = (210 - totalWidth) / 2
            const xPos = startX + photoIndex * (photoWidth + horizontalSpacing)
            doc.text("Error al cargar imagen", xPos + photoWidth / 2, yPosition + photoHeight / 2, { align: "center" })
          }

          if (photoIndex === photosPerRow - 1 || j === finding.photos.length - 1) {
            yPosition += photoHeight + 8
          }
        }
      } else {
        doc.setFontSize(9)
        doc.setTextColor(150, 150, 150)
        doc.text("Sin evidencia fotográfica", 105, yPosition, { align: "center" })
        yPosition += 5
      }

      if (finding.photos.length === 0) {
        yPosition += 10
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

  const fileName = `Informe_${area.name}_${new Date(inspection.date).toLocaleDateString("es-ES").replace(/\//g, "-")}.pdf`
  doc.save(fileName)
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
  // Convertir ángulos de grados a radianes
  const startRad = (startAngle - 90) * (Math.PI / 180)
  const endRad = (endAngle - 90) * (Math.PI / 180)

  // Número de segmentos para suavizar el arco
  const segments = Math.max(20, Math.ceil(Math.abs(endAngle - startAngle) / 5))
  const angleStep = (endRad - startRad) / segments

  // Construir el path del segmento del donut
  const points: [number, number][] = []

  // Arco exterior
  for (let i = 0; i <= segments; i++) {
    const angle = startRad + i * angleStep
    const x = centerX + outerRadius * Math.cos(angle)
    const y = centerY + outerRadius * Math.sin(angle)
    points.push([x, y])
  }

  // Arco interior (en reversa)
  for (let i = segments; i >= 0; i--) {
    const angle = startRad + i * angleStep
    const x = centerX + innerRadius * Math.cos(angle)
    const y = centerY + innerRadius * Math.sin(angle)
    points.push([x, y])
  }

  // Dibujar el polígono
  if (points.length > 0) {
    doc.lines(
      points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]),
      points[0][0],
      points[0][1],
      [1, 1],
      "F",
    )
  }
}
