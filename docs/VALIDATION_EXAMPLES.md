# Ejemplos de Validación de Acciones

## Ejemplo 1: Botón Simple con Tooltip

### Escenario
Un botón "Descargar Evidencias" que solo funciona si hay fotos capturadas.

### Implementación

```typescript
import { ValidatedActionButton } from "@/components/validated-action-button"
import { Download } from "lucide-react"

export function DownloadEvidencesButton({ photos }) {
  const handleDownload = async () => {
    // Descarga las fotos
    console.log(`Descargando ${photos.length} fotos...`)
  }

  return (
    <ValidatedActionButton
      onValidatedClick={handleDownload}
      isDisabled={photos.length === 0}
      disabledTooltip="Captura fotos primero para descargar evidencias"
      variant="outline"
    >
      <Download className="mr-2 h-4 w-4" />
      Descargar Evidencias
    </ValidatedActionButton>
  )
}
```

### Resultado Visual
- ✅ Si hay fotos: botón azul, clickeable, sin tooltip
- ❌ Si no hay fotos: botón gris, no clickeable, tooltip al hover

---

## Ejemplo 2: Validación Múltiple en Formulario

### Escenario
Un formulario de inspección que requiere ubicación, inspector y responsable antes de continuar.

### Implementación

```typescript
import { useState } from "react"
import { useActionValidation } from "@/hooks/use-action-validation"
import { ValidatedActionButton } from "@/components/validated-action-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function InspectionInfoForm() {
  const { validateInspectionInfo, getValidationStatus } = useActionValidation()
  const [lugar, setLugar] = useState("")
  const [inspector, setInspector] = useState("")
  const [responsable, setResponsable] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleContinue = async () => {
    // Validar todos los campos
    if (!validateInspectionInfo(lugar, inspector, responsable)) {
      return // Toast mostrará qué falta completar
    }

    setIsSubmitting(true)
    try {
      // Guardar información y continuar
      await saveInspectionInfo({ lugar, inspector, responsable })
      // Navegar a siguiente paso
    } finally {
      setIsSubmitting(false)
    }
  }

  // Verificar si el formulario es válido
  const isFormValid = lugar.trim() && inspector.trim() && responsable.trim()

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleContinue() }}>
      <div>
        <Label htmlFor="lugar">Lugar</Label>
        <Input
          id="lugar"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          placeholder="Ej: Oficina Central"
        />
      </div>

      <div>
        <Label htmlFor="inspector">Inspector</Label>
        <Input
          id="inspector"
          value={inspector}
          onChange={(e) => setInspector(e.target.value)}
          placeholder="Ej: Juan Pérez"
        />
      </div>

      <div>
        <Label htmlFor="responsable">Responsable</Label>
        <Input
          id="responsable"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          placeholder="Ej: María García"
        />
      </div>

      <ValidatedActionButton
        type="submit"
        onValidatedClick={handleContinue}
        isDisabled={!isFormValid || isSubmitting}
        disabledTooltip="Completa todos los campos para continuar"
        variant="default"
      >
        {isSubmitting ? "Guardando..." : "Continuar"}
      </ValidatedActionButton>
    </form>
  )
}
```

### Comportamiento
1. Mientras falten campos → botón gris, tooltip "Completa todos los campos..."
2. Campos completos → botón azul, clickeable
3. Al hacer click → valida, si todo ok procede, si no muestra toast

---

## Ejemplo 3: Acciones con Toast (sin Tooltip)

### Escenario
Una acción que requiere validación y muestra toast si hay error.

### Implementación

```typescript
import { useActionValidation } from "@/hooks/use-action-validation"
import { Button } from "@/components/ui/button"

export function GeneratePDFButton({ hallazgos, fotos }) {
  const { validateHallazgos, validatePhotos } = useActionValidation()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePDF = async () => {
    // Validación múltiple
    if (!validateHallazgos(hallazgos)) {
      return // Toast: "No hay hallazgos registrados..."
    }
    
    if (!validatePhotos(fotos)) {
      return // Toast: "No hay fotos capturadas..."
    }

    setIsGenerating(true)
    try {
      const pdf = await generateInspectionPDF({
        hallazgos,
        fotos,
      })
      downloadFile(pdf, "informe.pdf")
    } catch (error) {
      // Toast de error
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isGenerating}
    >
      {isGenerating ? "Generando..." : "Generar PDF"}
    </Button>
  )
}
```

---

## Ejemplo 4: Validación sin UI

### Escenario
Necesitas validar datos en logic o hook sin mostrar UI de error.

### Implementación

```typescript
import { useActionValidation } from "@/hooks/use-action-validation"

export function useInspectionLogic() {
  const { getValidationStatus } = useActionValidation()
  const [photos, setPhotos] = useState([])

  // Obtener estado de validación sin mostrar toast
  const { isValid: hasPhotos, message } = getValidationStatus(photos, "photos")

  return {
    photos,
    hasPhotos,
    photosMessage: message, // "Sin fotos capturadas" o ""
  }
}

// En componente
export function MyComponent() {
  const { photos, hasPhotos, photosMessage } = useInspectionLogic()

  return (
    <div>
      {/* Mostrar estado sin toast automático */}
      {!hasPhotos && (
        <p className="text-sm text-muted-foreground">
          {photosMessage} - Captura al menos una foto
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {photos.map(photo => (
          <div key={photo.id} className="aspect-square bg-gray-200" />
        ))}
      </div>
    </div>
  )
}
```

---

## Ejemplo 5: Flujo Completo - Inspección Rápida

### Escenario
Integración completa: validación de forma, captura de fotos, generación de PDF.

### Implementación

```typescript
"use client"

import { useState } from "react"
import { useActionValidation } from "@/hooks/use-action-validation"
import { ValidatedActionButton } from "@/components/validated-action-button"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"

export function CompleteInspectionFlow() {
  const { validateInspectionInfo, validatePhotos } = useActionValidation()
  const [step, setStep] = useState<"info" | "photos" | "export">("info")

  // Paso 1: Información
  const [lugar, setLugar] = useState("")
  const [inspector, setInspector] = useState("")
  const [responsable, setResponsable] = useState("")

  // Paso 2: Fotos
  const [photos, setPhotos] = useState([])

  // Paso 3: Exportación
  const [isExporting, setIsExporting] = useState(false)

  // Manejar siguiente paso
  const handleNextStep = async () => {
    if (step === "info") {
      // Validar información
      if (!validateInspectionInfo(lugar, inspector, responsable)) {
        return // Toast muestra qué falta
      }
      setStep("photos")
    } else if (step === "photos") {
      // Validar fotos
      if (!validatePhotos(photos)) {
        return // Toast: "No hay fotos capturadas..."
      }
      setStep("export")
    }
  }

  // Manejar exportación
  const handleExport = async (format: "pdf" | "zip") => {
    // Doble validación (por seguridad)
    if (!validatePhotos(photos)) {
      return
    }

    setIsExporting(true)
    try {
      if (format === "pdf") {
        // Generar PDF
        const pdf = await generatePDF({
          lugar,
          inspector,
          responsable,
          photos,
        })
        downloadFile(pdf, "informe.pdf")
      } else {
        // Generar ZIP
        const zip = await generateZIP(photos)
        downloadFile(zip, "fotos.zip")
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Paso 1: Información */}
      {step === "info" && (
        <div className="space-y-4">
          <h2>Información de Inspección</h2>
          <Input
            placeholder="Lugar"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
          />
          <Input
            placeholder="Inspector"
            value={inspector}
            onChange={(e) => setInspector(e.target.value)}
          />
          <Input
            placeholder="Responsable"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
          />
          <ValidatedActionButton
            onValidatedClick={handleNextStep}
            isDisabled={!lugar.trim() || !inspector.trim() || !responsable.trim()}
            disabledTooltip="Completa todos los campos"
          >
            Siguiente
          </ValidatedActionButton>
        </div>
      )}

      {/* Paso 2: Fotos */}
      {step === "photos" && (
        <div className="space-y-4">
          <h2>Capturar Fotos</h2>
          <div className="grid grid-cols-2 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="aspect-square bg-gray-200" />
            ))}
          </div>
          <Button onClick={() => { /* agregar foto */ }}>
            Capturar Foto
          </Button>
          <ValidatedActionButton
            onValidatedClick={handleNextStep}
            isDisabled={photos.length === 0}
            disabledTooltip="Captura al menos una foto"
          >
            Siguiente
          </ValidatedActionButton>
        </div>
      )}

      {/* Paso 3: Exportación */}
      {step === "export" && (
        <div className="space-y-4">
          <h2>Descargar Resultados</h2>
          <p>Fotos capturadas: {photos.length}</p>
          <div className="flex gap-2">
            <ValidatedActionButton
              onValidatedClick={() => handleExport("pdf")}
              isDisabled={isExporting}
              disabledTooltip={isExporting ? "Generando..." : ""}
            >
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </ValidatedActionButton>
            <ValidatedActionButton
              onValidatedClick={() => handleExport("zip")}
              isDisabled={isExporting}
              disabledTooltip={isExporting ? "Descargando..." : ""}
            >
              <Download className="mr-2 h-4 w-4" />
              ZIP
            </ValidatedActionButton>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Ejemplo 6: Validación Condicional Compleja

### Escenario
Validaciones diferentes según el tipo de inspección.

### Implementación

```typescript
import { useActionValidation } from "@/hooks/use-action-validation"
import { ValidatedActionButton } from "@/components/validated-action-button"

interface InspectionData {
  type: "rápida" | "completa"
  fotos: Photo[]
  hallazgos: Hallazgo[]
  criterios?: Criterio[]
}

export function DynamicValidationButton({
  data,
  onAction,
}: {
  data: InspectionData
  onAction: () => void
}) {
  const { validatePhotos, validateHallazgos } = useActionValidation()

  // Determinar validaciones según tipo
  const getValidationState = (): { isDisabled: boolean; tooltip: string } => {
    if (data.type === "rápida") {
      // Inspección rápida: solo fotos obligatorias
      if (data.fotos.length === 0) {
        return {
          isDisabled: true,
          tooltip: "Captura fotos para inspección rápida",
        }
      }
    } else {
      // Inspección completa: fotos Y hallazgos Y criterios
      if (data.fotos.length === 0) {
        return {
          isDisabled: true,
          tooltip: "Captura fotos",
        }
      }
      if (Object.keys(data.hallazgos).length === 0) {
        return {
          isDisabled: true,
          tooltip: "Registra hallazgos",
        }
      }
      if (!data.criterios || data.criterios.length === 0) {
        return {
          isDisabled: true,
          tooltip: "Configura criterios",
        }
      }
    }

    return { isDisabled: false, tooltip: "" }
  }

  const validation = getValidationState()

  return (
    <ValidatedActionButton
      onValidatedClick={onAction}
      isDisabled={validation.isDisabled}
      disabledTooltip={validation.tooltip}
    >
      Proceder
    </ValidatedActionButton>
  )
}
```

---

## Testing

### Test de Validación Hook

```typescript
import { renderHook } from "@testing-library/react"
import { useActionValidation } from "@/hooks/use-action-validation"

describe("useActionValidation", () => {
  it("should validate photos correctly", () => {
    const { result } = renderHook(() => useActionValidation())
    
    // Sin fotos
    expect(result.current.validatePhotos([])).toBe(false)
    
    // Con fotos
    expect(result.current.validatePhotos([{ id: "1" }])).toBe(true)
  })

  it("should validate inspection info", () => {
    const { result } = renderHook(() => useActionValidation())
    
    // Datos válidos
    expect(result.current.validateInspectionInfo("Lugar", "Inspector", "Responsable")).toBe(true)
    
    // Datos inválidos
    expect(result.current.validateInspectionInfo("", "Inspector", "Responsable")).toBe(false)
  })
})
```

---

## Resumen

| Caso | Componente | Hook | Resultado |
|------|-----------|------|----------|
| Botón con tooltip | `ValidatedActionButton` | Solo `useActionValidation` | Tooltip en hover |
| Validación con toast | Button regular | `useActionValidation` | Toast de error |
| Sin UI automática | - | `getValidationStatus()` | Retorna `{ isValid, message }` |
| Flujo multi-paso | `ValidatedActionButton` | `useActionValidation` | Navegación validada |

Estos ejemplos cubren los casos más comunes. Para casos específicos, consulta la guía de implementación en `docs/ACTION_VALIDATION_GUIDE.md`.
