# Flujo de Inspección Rápida - Guía Completa

## Resumen Ejecutivo

La **Inspección Rápida** es un sistema ágil que captura fotos y datos sin interrupciones. 

**⚠️ IMPORTANTE: NO genera PDF automáticamente en ningún punto.**

---

## Pantalla 1: Información Básica

### Flujo
```
1. Usuario accede a /inspeccion-rapida
2. Ve Pantalla 1 con 3 campos:
   - Lugar a inspeccionar
   - Inspector
   - Responsable (opcional)
3. Completa datos
4. Hace clic en "Siguiente"
5. Avanza a Pantalla 2

❌ En este punto: NO se genera PDF
✓ Los datos se almacenan en estado local (useState)
✓ Se guardan en IndexedDB cuando se llena el formulario
```

### Estado Manejado
```typescript
const [lugar, setLugar] = useState("")
const [inspector, setInspector] = useState("")
const [responsable, setResponsable] = useState("")

// Se guardan en IndexedDB pero NO se genera PDF
```

---

## Pantalla 2: Captura de Fotos

### Flujo Completo

#### 1. Captura de Foto
```
Usuario hace clic en "Tomar Foto"
  ↓
Input file (camera/gallery)
  ↓
handlePhotoCapture() ejecuta
  ↓
Comprime imagen (0.65 quality, 1200x1200px)
  ↓
Muestra diálogo: "Usar Original" o "Editar Foto"
  ↓
Usuario elige opción
  ↓
Si elige "Usar Original":
  → Muestra diálogo de clasificación
If elige "Editar Foto":
  → Abre editor de fotos
  → Luego muestra diálogo de clasificación

❌ EN NINGÚN PUNTO SE GENERA PDF
✓ Las fotos se preparan pero no se procesan a PDF
```

#### 2. Clasificación de Foto
```
Diálogo con 2 opciones:

[HALLAZGO] (Rojo - No conforme)
↓
- Nueva foto de hallazgo → Crea grupo nuevo
- O agregar a hallazgo existente → Selecciona grupo

[EVIDENCIA] (Verde - Conforme)
↓
- Agrupa en sección general de evidencias

Resultado:
- Foto añadida a photos[]
- Se asigna tipo y hallazgoId (si aplica)
- Se almacena en IndexedDB
- El diálogo se cierra

❌ EN NINGÚN PUNTO SE GENERA PDF
✓ Solo se almacena la foto clasificada
```

#### 3. Galería de Fotos
```
Usuario ve:
- Grupos de HALLAZGOS con:
  - Miniatura de fotos
  - Textarea para descripción
  - Botón "Editar" para cada foto
  - Botón "X" para eliminar
  - Botón "+ Agregar foto a este hallazgo"

- Sección EVIDENCIAS con:
  - Miniaturas de fotos
  - Botones para editar/eliminar

Usuario puede:
- Agregar más fotos a un hallazgo existente
- Crear nuevas fotos
- Editar fotos (anotaciones)
- Eliminar fotos
- Escribir descripciones de hallazgos

❌ EN NINGÚN PUNTO SE GENERA PDF
✓ Todo es preparación de datos
✓ Proceso completamente ágil y sin interrupciones
```

#### 4. Botones Finales
```
Tres opciones:

[Volver]      → Regresa a Pantalla 1
[ZIP]         → Descarga ZIP con carpetas /hallazgos /evidencias
[PDF]         → Abre diálogo de confirmación

⚠️ IMPORTANTE:
- El botón "PDF" NO genera automáticamente el PDF
- Solo abre un diálogo pidiendo confirmación
- Usuario debe hacer clic en "Generar PDF" en el diálogo
- Solo ENTONCES se ejecuta generateQuickInspectionPDF()
```

---

## Diálogo de Confirmación PDF

### Flujo Exacto

```
Usuario hace clic en botón [PDF]
  ↓
<AlertDialog open={showPDFConfirm}>
  ↓
Muestra opciones:
  [Cancelar] → Cierra diálogo, vuelve a galería
  [Generar PDF] → Ejecuta handleGeneratePDF()

Si usuario hace clic en "Generar PDF":
  ↓
handleGeneratePDF() INICIA:
  1. Valida que lugar e inspector no estén vacíos
  2. Agrupa hallazgos por hallazgoId
  3. Valida que todos los hallazgos tengan descripción
  4. Llama a generateQuickInspectionPDF({
      lugar,
      inspector,
      responsable,
      fecha,
      hallazgos: [...],
      evidencias: [...]
    })
  5. generateQuickInspectionPDF() genera PDF en memoria
  6. PDF se descarga al navegador
  7. IndexedDB se limpia
  8. Datos se resetean
  9. Toast: "✓ PDF generado"

❌ NUNCA automático
✓ SIEMPRE manual, requiere confirmación del usuario
```

---

## Almacenamiento: IndexedDB

### Base de Datos
```javascript
Nombre: "inspeccionRapidaDB"

Object Stores:
1. "metadata" - Información de inspección
   {
     key: "inspeccionData",
     value: {
       lugar,
       inspector,
       responsable,
       hallazgoDescriptions
     }
   }

2. "fotos" - Imágenes (base64 en dataUrl)
   {
     id: "photo_timestamp_random",
     dataUrl: "data:image/jpeg;base64,...",
     type: "hallazgo" | "evidencia",
     description: string,
     hallazgoId?: string (si es hallazgo)
   }
```

### Ciclo de Vida
```
1. Foto se captura
   → Se comprime
   → Se clasifica (hallazgo/evidencia)
   → Se almacena en IndexedDB
   ✓ No se genera PDF

2. Usuario cierra pestaña
   → Datos en IndexedDB se pierden (sesión local)
   ✓ No se guardan en servidor

3. Usuario genera PDF
   → Se procesan datos de IndexedDB
   → Se genera PDF
   → IndexedDB se limpia
   ✓ Datos se eliminen después de descargar

4. Usuario descarga ZIP
   → Se procesan fotos de IndexedDB
   → Se crea ZIP con estructura
   → IndexedDB NO se limpia (usuario podría querer más descargas)
   ✓ Los datos permanecen hasta generar PDF o cerrar
```

---

## Garantías de Independencia

### ✓ No hay PDF Automático
- ❌ No hay useEffect que genere PDF
- ❌ No hay generación en background
- ❌ No hay timers que generen PDF
- ✓ SOLO se genera por clic explícito en diálogo

### ✓ Proceso Ágil
- Fotos se capturan sin interrupciones
- Clasificación es rápida (diálogo pequeño)
- Galería responde al instante
- No hay "procesamiento" de fotos a PDF

### ✓ Sin Interferencias
- IndexedDB usa "metadata" y "fotos" específicos
- No usa tablas de inspección normal (Supabase)
- Completamente aislado de inspección normal

---

## Comparación: Uso de PDF

### Inspección Normal
```
PDF Automático: ❌ No
PDF Manual: ✓ Sí, por usuario
Persistencia: Supabase (permanente)
Cuándo: Después de completar inspección
Función: generateInspectionPDF()
```

### Inspección Rápida
```
PDF Automático: ❌ No
PDF Manual: ✓ Sí, por usuario
Persistencia: IndexedDB (sesión)
Cuándo: Cuando usuario hace clic explícitamente
Función: generateQuickInspectionPDF()
```

---

## Checklist: Validar que No hay PDF Automático

- [ ] No hay `generateQuickInspectionPDF()` en useEffect
- [ ] No hay `handleGeneratePDF()` en useEffect
- [ ] `generateQuickInspectionPDF()` solo se llama en handleGeneratePDF()
- [ ] handleGeneratePDF() solo se llama en AlertDialogAction
- [ ] AlertDialogAction solo se ejecuta con clic manual
- [ ] No hay código en setTimeout/setInterval que genere PDF
- [ ] IndexedDB se crea/carga pero no genera PDF

---

## Conclusión

**La Inspección Rápida es completamente ágil y sin interrupciones.**

✓ Las fotos se capturan sin generar PDF
✓ El usuario controla completamente la generación
✓ Solo genera PDF cuando lo solicita explícitamente
✓ El proceso es rápido y responde al instante
