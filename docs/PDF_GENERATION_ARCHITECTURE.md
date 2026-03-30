# Arquitectura de Generación de PDFs

## Separación Clara: Inspección Normal vs Inspección Rápida

Este documento especifica la separación arquitectónica entre los dos sistemas de generación de PDFs para evitar confusiones y asegurar que cada uno funcione de forma independiente.

---

## 1. Inspección Normal

### Ubicación
- **Archivo principal**: `/app/inspeccion/[areaId]/[checklistId]/page.tsx`
- **Función PDF**: `generateInspectionPDF()` en `/lib/pdf-generator.ts`

### Características
- ✓ PDF con criterios y subcritérios de un checklist
- ✓ Fotos organizadas por criterio evaluado
- ✓ Tabla completa de hallazgos con estados (conforme/no-conforme/pendiente)
- ✓ Estadísticas detalladas de cumplimiento por criterio
- ✓ Datos persistidos en base de datos Supabase

### Flujo de Generación
```
1. Usuario completa inspección en la página
2. Hace clic en "Descargar PDF"
3. Se ejecuta handleGeneratePDF()
4. Se llama a generateInspectionPDF(inspection, area, checklist)
5. PDF se descarga al navegador
6. Datos persisten en base de datos
```

### Estructura de Datos
```typescript
Inspection {
  id: string
  areaId: string
  checklistId: string
  inspector: string
  findings: Finding[] // Por criterio
  photos: Photo[] // Organizadas por criterio
  timestamps: ...
}
```

### ¿Es Automático?
❌ **NO**. Solo se genera cuando el usuario hace clic explícitamente en descargar PDF.

---

## 2. Inspección Rápida

### Ubicación
- **Archivo principal**: `/app/inspeccion-rapida/page.tsx`
- **Función PDF**: `generateQuickInspectionPDF()` en `/lib/pdf-generator.ts`

### Características
- ✓ PDF rápido con hallazgos y evidencias agrupados
- ✓ Fotos organizadas por grupos de hallazgos
- ✓ Resumen simple: lugar, inspector, responsable
- ✓ Porcentaje de conformidad general
- ✓ Datos NO persistidos (IndexedDB solo, sesión local)

### Flujo de Generación
```
1. Pantalla 1: Usuario ingresa lugar, inspector, responsable
2. Pantalla 2: Usuario captura fotos y las clasifica
3. Fotos se almacenan en IndexedDB
4. Usuario hace clic en "Generar PDF"
5. Se abre diálogo de confirmación
6. Usuario confirma
7. Se ejecuta handleGeneratePDF()
8. Se llama a generateQuickInspectionPDF(data)
9. PDF se descarga al navegador
10. IndexedDB se limpia
```

### Estructura de Datos
```typescript
QuickInspectionData {
  lugar: string
  inspector: string
  responsable: string
  fecha: string
  hallazgos: Array<{
    descripcion: string
    fotos: string[] // Base64 images
  }>
  evidencias: string[] // Base64 images
}
```

### ¿Es Automático?
❌ **NO**. Solo se genera cuando el usuario:
1. Completa la captura de fotos en Pantalla 2
2. Hace clic en botón "PDF"
3. Confirma en el diálogo

---

## 3. Comparación Lado a Lado

| Aspecto | Inspección Normal | Inspección Rápida |
|---------|-------------------|-------------------|
| **Persistencia** | Supabase DB | IndexedDB (sesión) |
| **Criterios** | Por checklist | Sin criterios |
| **Fotos** | Por criterio | Por hallazgo grupal |
| **PDF Manual** | Solo usuario lo solicita | Solo usuario lo solicita |
| **PDF Automático** | ❌ No | ❌ No |
| **Función Generador** | `generateInspectionPDF()` | `generateQuickInspectionPDF()` |
| **Complejidad** | Alta | Baja |
| **Uso** | Inspecciones detalladas | Inspecciones rápidas |

---

## 4. Garantías de Independencia

### ✓ No hay conflictos
- Cada sistema usa su propia función de PDF
- Las estructuras de datos son completamente diferentes
- No comparten estado

### ✓ No hay generación automática
- **Inspección Normal**: Solo por acción del usuario en la página
- **Inspección Rápida**: Solo por acción del usuario en diálogo

### ✓ Procesos ágiles
- Inspección Rápida nunca genera PDF automáticamente
- Permite captura rápida de fotos sin interrupciones
- Solo genera PDF si el usuario lo solicita explícitamente

---

## 5. Archivos Relacionados

### PDFs
- `/lib/pdf-generator.ts` - Ambas funciones de generación

### Inspección Normal
- `/app/inspeccion/[areaId]/[checklistId]/page.tsx` - Página principal
- `/lib/storage.server.ts` - Lectura/escritura en Supabase
- `/lib/actions.ts` - Server actions para guardar inspecciones

### Inspección Rápida
- `/app/inspeccion-rapida/page.tsx` - Página principal (2 pantallas)
- `/lib/image-compression.ts` - Compresión de imágenes
- IndexedDB (local) - Almacenamiento temporal

---

## 6. Checklist de Validación

Para asegurar la separación correcta:

- [ ] `generateInspectionPDF()` solo se llama desde Inspección Normal
- [ ] `generateQuickInspectionPDF()` solo se llama desde Inspección Rápida
- [ ] No hay useEffect que genere PDFs automáticamente en ninguna página
- [ ] Ambas funciones están documentadas en `/lib/pdf-generator.ts`
- [ ] Las páginas tienen comentarios claros sobre su funcionamiento
- [ ] Los diálogos de confirmación son explícitos

---

## Conclusión

La arquitectura está **completamente separada**. Cada sistema funciona de forma independiente:

- **Inspección Normal**: Completa, persistente, con criterios detallados
- **Inspección Rápida**: Ligera, temporal, con hallazgos agrupados
- **Generación de PDFs**: Siempre manual, nunca automático en ningún sistema
