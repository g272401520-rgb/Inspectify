# Guía de Validación de Acciones en Inspectify

## Descripción General

Esta guía explica cómo implementar validaciones coherentes para acciones que requieren datos disponibles (descargar, generar PDF, exportar, etc.) en Inspectify.

El objetivo es proporcionar una experiencia de usuario consistente donde:
- Los botones se deshabilitan cuando no hay datos disponibles
- Se muestran tooltips informativos en lugar de errores silenciosos
- Los mensajes de error son claros y coherentes
- La lógica de validación es reutilizable y centralizada

## Componentes Disponibles

### 1. Hook `useActionValidation`

**Ubicación**: `hooks/use-action-validation.ts`

Proporciona métodos para validar datos y mostrar mensajes coherentes:

```typescript
import { useActionValidation } from "@/hooks/use-action-validation"

export function MyComponent() {
  const { validatePhotos, validateData, getValidationStatus } = useActionValidation()
  
  // Validar fotos
  if (!validatePhotos(photos)) {
    return // Toast se muestra automáticamente
  }
  
  // Validar datos genéricos
  if (!validateData(someData, "generar informe")) {
    return
  }
  
  // Obtener estado de validación sin mostrar toast
  const { isValid, message } = getValidationStatus(photos, "photos")
}
```

#### Métodos Disponibles

- **`validateData(data, actionName)`**: Valida si hay datos disponibles. Retorna `boolean`.
- **`validatePhotos(photos)`**: Valida si hay fotos. Retorna `boolean`.
- **`validateInspectionInfo(lugar, inspector, responsable)`**: Valida información de inspección.
- **`validateHallazgos(hallazgos)`**: Valida si hay hallazgos.
- **`getValidationStatus(data, type)`**: Retorna `{ isValid, message }` sin mostrar toast.

### 2. Componente `ValidatedActionButton`

**Ubicación**: `components/validated-action-button.tsx`

Botón con validación integrada que muestra un tooltip cuando la acción no está disponible.

#### Uso Básico

```typescript
import { ValidatedActionButton } from "@/components/validated-action-button"

<ValidatedActionButton
  isDisabled={photos.length === 0}
  disabledTooltip="Sin fotos para descargar"
  onValidatedClick={() => handleDownload()}
  variant="default"
>
  Descargar
</ValidatedActionButton>
```

#### Props

- **`isDisabled`** (`boolean`): Si `true`, desactiva el botón y muestra tooltip
- **`disabledTooltip`** (`string`): Mensaje del tooltip cuando está desactivado
- **`onValidatedClick`**: Callback ejecutado solo si no está desactivado
- Todos los props de `Button` son soportados

#### Styling del Tooltip

El tooltip tiene un estilo oscuro (`bg-slate-800`) similar al ejemplo de "Descargar Evidencias". Para personalizar:

```typescript
<TooltipContent 
  side="bottom" 
  className="bg-slate-800 text-white border-0"
>
  {disabledTooltip}
</TooltipContent>
```

## Casos de Uso Implementados

### 1. Inspección Rápida - Descarga de ZIP

**Archivo**: `app/inspeccion-rapida/page.tsx`

```typescript
<ValidatedActionButton
  onValidatedClick={() => setShowZipConfirm(true)}
  isDisabled={photos.length === 0 || isDownloadingZip}
  disabledTooltip={photos.length === 0 ? "Sin fotos para descargar" : "Descargando..."}
  variant="ghost"
  size="sm"
>
  <Download className="h-4 w-4" />
</ValidatedActionButton>
```

### 2. Inspección Rápida - Generación de PDF

```typescript
<ValidatedActionButton
  onValidatedClick={() => setShowPDFConfirm(true)}
  isDisabled={photos.length === 0 || isGeneratingPDF}
  disabledTooltip={photos.length === 0 ? "Sin fotos para generar PDF" : "Generando..."}
  variant="ghost"
  size="sm"
>
  <FileText className="h-4 w-4" />
</ValidatedActionButton>
```

## Implementación en Nuevas Funciones

### Pasos para Agregar Validación a una Acción

1. **Importar el hook y componente**
   ```typescript
   import { useActionValidation } from "@/hooks/use-action-validation"
   import { ValidatedActionButton } from "@/components/validated-action-button"
   ```

2. **Instanciar el hook**
   ```typescript
   const { validatePhotos, validateData } = useActionValidation()
   ```

3. **Crear la función handler**
   ```typescript
   const handleMyAction = async () => {
     // Validar datos primero
     if (!validateData(requiredData, "mi acción")) {
       return // Toast se muestra automáticamente
     }
     
     // Ejecutar lógica
     await doSomething()
   }
   ```

4. **Usar `ValidatedActionButton`**
   ```typescript
   <ValidatedActionButton
     onValidatedClick={handleMyAction}
     isDisabled={requiredData.length === 0}
     disabledTooltip="No hay datos disponibles"
   >
     Mi Acción
   </ValidatedActionButton>
   ```

## Mensajes de Error Estándar

Los mensajes están centralizados en `useActionValidation`:

| Tipo | Mensaje |
|------|---------|
| `no-data` | "No hay datos disponibles para [acción]. Por favor, completa los campos requeridos primero." |
| `no-photos` | "No hay fotos capturadas. Debes capturar al menos una foto antes de descargar evidencias." |
| `no-information` | "Información incompleta. Por favor completa el lugar, inspector y responsable antes de continuar." |
| `no-hallazgos` | "No hay hallazgos registrados. Debes agregar al menos un hallazgo antes de generar el informe." |
| `no-criteria` | "No hay criterios disponibles. Verifica que el checklist tenga criterios configurados." |
| `invalid-state` | "Estado inválido. Por favor, recarga la página e intenta de nuevo." |

## Ejemplo Completo

```typescript
"use client"

import { useState } from "react"
import { useActionValidation } from "@/hooks/use-action-validation"
import { ValidatedActionButton } from "@/components/validated-action-button"

export function MyInspectionComponent() {
  const { validatePhotos, getValidationStatus } = useActionValidation()
  const [photos, setPhotos] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleExportPDF = async () => {
    // Primera línea: validar datos
    if (!validatePhotos(photos)) {
      return // Toast mostrado automáticamente
    }

    setIsLoading(true)
    try {
      // Lógica de exportación
      const pdf = await generatePDF(photos)
      downloadFile(pdf, "informe.pdf")
    } finally {
      setIsLoading(false)
    }
  }

  // Obtener estado para mostrar en UI sin toast
  const { isValid: hasPhotos, message: photoMessage } = getValidationStatus(photos, "photos")

  return (
    <div>
      <p>Fotos: {photos.length} {photoMessage && `(${photoMessage})`}</p>
      
      <ValidatedActionButton
        onValidatedClick={handleExportPDF}
        isDisabled={!hasPhotos || isLoading}
        disabledTooltip={!hasPhotos ? "Captura fotos primero" : "Generando PDF..."}
      >
        Exportar PDF
      </ValidatedActionButton>
    </div>
  )
}
```

## Mejores Prácticas

1. **Siempre validar antes de acciones costosas**
   ```typescript
   // ✅ BIEN
   if (!validatePhotos(photos)) return
   await generatePDF() // Solo si fotos existen
   
   // ❌ MAL
   await generatePDF() // Falla si sin fotos
   ```

2. **Usar `ValidatedActionButton` para acciones deshabilitables**
   - Muestra estado visual claro (botón gris)
   - Tooltip explicativo en hover
   - Previene clics accidentales

3. **Mensajes coherentes y en español**
   - Usar los mensajes estándar cuando sea posible
   - Personalizar solo si es absolutamente necesario
   - Siempre incluir contexto de por qué no se puede hacer

4. **Diferenciar entre validación y UI state**
   ```typescript
   // Validación = mostrar toast, prevenir acción
   if (!validatePhotos(photos)) return
   
   // UI state = mostrar/ocultar, deshabilitar botones
   const { isValid } = getValidationStatus(photos, "photos")
   ```

## Preguntas Frecuentes

**P: ¿Dónde se muestran los toasts de validación?**
R: Los toasts se muestran usando `useToast()` y aparecen en la esquina inferior derecha con estilo destructivo (rojo).

**P: ¿Puedo personalizar los mensajes?**
R: Sí, puedes usar `showValidationError()` directamente con mensajes personalizados, pero se recomienda mantener consistencia usando los tipos estándar.

**P: ¿Cómo se ve el tooltip?**
R: Similar a la imagen proporcionada - fondo oscuro (`bg-slate-800`), texto blanco, sin borde, debajo del botón.

**P: ¿Funciona en dispositivos móviles?**
R: Sí, los tooltips funcionan en todos los dispositivos. En móvil, el tooltip se muestra al tocar el botón deshabilitado.

## Integración con Otros Módulos

### Con PDF Generator
```typescript
const handleGeneratePDF = async () => {
  if (!validatePhotos(photos)) return
  
  const pdf = await generateQuickInspectionPDF({
    photos,
    lugar,
    inspector,
    // ...
  })
}
```

### Con Descargas
```typescript
const handleDownload = async () => {
  if (!validatePhotos(photos)) return
  
  const zip = new JSZip()
  photos.forEach(photo => {
    zip.file(photo.name, photo.data)
  })
}
```

## Soporte y Debugging

Si un botón no muestra el tooltip correctamente:

1. Verificar que `ValidatedActionButton` esté envuelto en `TooltipProvider`
2. Confirmar que `isDisabled` esté siendo calculado correctamente
3. Revisar la consola para errores de React

Para debug de validaciones:
```typescript
const { isValid, message } = getValidationStatus(photos, "photos")
console.log("Validation status:", { isValid, message })
```
