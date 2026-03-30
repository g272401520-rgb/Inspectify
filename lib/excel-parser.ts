"use client"

import * as XLSX from "xlsx"
import type { ChecklistItem } from "./types"

export interface ValidationError {
  row: number
  field: string
  message: string
  severity: "error" | "warning"
}

export interface ExcelParseResult {
  success: boolean
  items?: ChecklistItem[]
  error?: string
  validationErrors?: ValidationError[]
  warnings?: string[]
  stats?: {
    totalRows: number
    validRows: number
    emptyRows: number
    duplicates: number
    cleaned: number
  }
}

function fixEncodingIssues(text: string): string {
  if (!text) return text

  // Mapeo de caracteres mal codificados comunes (UTF-8 interpretado como Latin-1)
  const encodingMap: Record<string, string> = {
    "Ã¡": "á", // á
    "Ã©": "é", // é
    "Ã­": "í", // í
    "Ã³": "ó", // ó
    Ãº: "ú", // ú
    Ã: "Á", // Á
    "Ã‰": "É", // É
    Ã: "Í", // Í
    Ã: "Ó", // Ó
    Ãš: "Ú", // Ú
    "Ã±": "ñ", // ñ
    "Ã'": "Ñ", // Ñ
    "Ã§": "ç", // ç
    "Ã‡": "Ç", // Ç
    "Â¿": "¿", // ¿
    "Â¡": "¡", // ¡
    "â€": "–", // en dash
    "â€": "—", // em dash
    "â€œ": '"', // left double quote
    "â€": '"', // right double quote
    "â€˜": "'", // left single quote
    "â€™": "'", // right single quote
    "â€¢": "•", // bullet
    "â€¦": "…", // ellipsis
  }

  let result = text
  for (const [wrong, correct] of Object.entries(encodingMap)) {
    result = result.replace(new RegExp(wrong, "g"), correct)
  }

  return result
}

function cleanText(text: string | undefined | null): string {
  if (!text) return ""
  const fixed = fixEncodingIssues(text.toString())
  return fixed
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[\r\n]+/g, " ") // Replace line breaks with space
}

function validateAndCleanData(jsonData: string[][]): {
  items: ChecklistItem[]
  errors: ValidationError[]
  warnings: string[]
  stats: {
    totalRows: number
    validRows: number
    emptyRows: number
    duplicates: number
    cleaned: number
  }
} {
  const items: ChecklistItem[] = []
  const errors: ValidationError[] = []
  const warnings: string[] = []
  const seenItems = new Set<string>()

  let emptyRows = 0
  let duplicates = 0
  let cleaned = 0

  if (jsonData.length < 2) {
    errors.push({
      row: 0,
      field: "general",
      message: "El archivo debe tener al menos 2 filas (encabezado + datos)",
      severity: "error",
    })
    return {
      items: [],
      errors,
      warnings,
      stats: { totalRows: 0, validRows: 0, emptyRows: 0, duplicates: 0, cleaned: 0 },
    }
  }

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i]
    const rowNum = i + 1

    if (!row || row.length === 0 || row.every((cell) => !cell || cell.toString().trim() === "")) {
      emptyRows++
      continue
    }

    const category = cleanText(row[0])
    const criterion = cleanText(row[1])
    const details = cleanText(row[2])

    if (
      (row[0] && row[0].toString() !== category) ||
      (row[1] && row[1].toString() !== criterion) ||
      (row[2] && row[2].toString() !== details)
    ) {
      cleaned++
    }

    if (!category) {
      errors.push({
        row: rowNum,
        field: "Categoría",
        message: "La categoría es obligatoria",
        severity: "error",
      })
    }

    if (!criterion) {
      errors.push({
        row: rowNum,
        field: "Criterio",
        message: "El criterio es obligatorio",
        severity: "error",
      })
    }

    if (!category || !criterion) {
      continue
    }

    const itemKey = `${category}|${criterion}`
    if (seenItems.has(itemKey)) {
      duplicates++
      errors.push({
        row: rowNum,
        field: "general",
        message: "Criterio duplicado",
        severity: "warning",
      })
      continue
    }
    seenItems.add(itemKey)

    if (category.length > 200) {
      errors.push({
        row: rowNum,
        field: "Categoría",
        message: "La categoría es demasiado larga (máximo 200 caracteres)",
        severity: "warning",
      })
    }

    if (criterion.length > 500) {
      errors.push({
        row: rowNum,
        field: "Criterio",
        message: "El criterio es demasiado largo (máximo 500 caracteres)",
        severity: "warning",
      })
    }

    if (details && details.length > 1000) {
      errors.push({
        row: rowNum,
        field: "Detalles",
        message: "Los detalles son demasiado largos (máximo 1000 caracteres)",
        severity: "warning",
      })
    }

    items.push({
      id: `item_${Date.now()}_${i}`,
      category,
      criterion,
      details: details || undefined,
    })
  }

  if (emptyRows > 0) {
    warnings.push(`Se omitieron ${emptyRows} fila(s) vacía(s)`)
  }
  if (duplicates > 0) {
    warnings.push(`Se encontraron ${duplicates} criterio(s) duplicado(s)`)
  }
  if (cleaned > 0) {
    warnings.push(`Se limpiaron ${cleaned} fila(s) con espacios extra o formato incorrecto`)
  }

  return {
    items,
    errors,
    warnings,
    stats: {
      totalRows: jsonData.length - 1,
      validRows: items.length,
      emptyRows,
      duplicates,
      cleaned,
    },
  }
}

export function parseExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        const { items, errors, warnings, stats } = validateAndCleanData(jsonData)

        // Check if there are critical errors (no valid items)
        if (items.length === 0) {
          const criticalErrors = errors.filter((e) => e.severity === "error")
          resolve({
            success: false,
            error:
              criticalErrors.length > 0
                ? "Se encontraron errores críticos en el archivo"
                : "No se encontraron datos válidos en el archivo Excel",
            validationErrors: errors,
            warnings,
            stats,
          })
        } else {
          resolve({
            success: true,
            items,
            validationErrors: errors,
            warnings,
            stats,
          })
        }
      } catch (error) {
        resolve({
          success: false,
          error: "Error al procesar el archivo Excel. Verifica que el formato sea correcto.",
        })
      }
    }

    reader.onerror = () => {
      resolve({
        success: false,
        error: "Error al leer el archivo",
      })
    }

    reader.readAsBinaryString(file)
  })
}
