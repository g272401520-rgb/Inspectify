# Integración de Vercel Blob Storage

## Descripción General

Tu aplicación Inspectify CG está completamente integrada con **Vercel Blob Storage** para almacenar fotos de inspecciones de forma segura y escalable en la nube.

## Arquitectura

\`\`\`
Usuario toma foto
    ↓
Compresión automática (si > 4MB)
    ↓
Conversión a Buffer
    ↓
Upload a Vercel Blob Storage
    ↓
Retorna URL pública
    ↓
Guarda URL en Supabase (finding_photos)
\`\`\`

## Características Principales

### 1. Almacenamiento en Nube
- Fotos almacenadas en Vercel Blob Storage (CDN global)
- URLs públicas y permanentes
- Acceso rápido desde cualquier dispositivo
- Respaldo automático

### 2. Compresión Inteligente
- Compresión automática si la imagen excede 4MB
- Ajuste dinámico de calidad (60-85%)
- Optimización con mozJPEG
- Máximo permitido: 4.5 MB

### 3. Carga Paralela
- Carga de múltiples fotos simultáneamente
- Lotes adaptativos (5-25 imágenes por lote)
- Manejo de errores por imagen
- Callbacks de progreso para UI

### 4. Gestión de Fotos
- Subir fotos individuales o en lote
- Eliminar fotos de Blob y Supabase
- Obtener fotos por tipo (evidence, solution, before, after)
- Estadísticas de fotos por inspección

## Funciones Disponibles

### Desde `lib/blob-storage.ts` (Server Actions)

\`\`\`typescript
// Subir una foto individual
uploadImageToBlob(base64Data, filename?) → URL

// Subir múltiples fotos
uploadMultipleImagesToBlob(images, onProgress?, batchSize) → URLs[]

// Eliminar foto
deleteImageFromBlob(url) → void

// Eliminar múltiples
deleteMultipleImagesFromBlob(urls) → void
\`\`\`

### Desde `lib/blob/client.ts` (Cliente)

\`\`\`typescript
// Subir archivo desde navegador
uploadFileToBlob(file, onProgress?) → URL

// Subir múltiples archivos
uploadMultipleFilesToBlob(files, onProgress?) → URLs[]

// Eliminar archivo
deleteFileFromBlob(url) → void

// Eliminar múltiples
deleteMultipleFilesFromBlob(urls) → void

// Listar archivos
listBlobFiles() → BlobFile[]

// Descargar archivo
downloadBlobFile(url, filename) → void
\`\`\`

### Desde `lib/blob/photo-manager.ts` (Gestor de Fotos)

\`\`\`typescript
// Subir fotos de hallazgo
uploadFindingPhotos(findingId, base64Images, photoType, onProgress?) → URLs[]

// Eliminar fotos de hallazgo
deleteFindingPhotos(findingId, photoUrls) → void

// Obtener fotos de hallazgo
getFindingPhotos(findingId) → URLs[]

// Obtener fotos por tipo
getFindingPhotosByType(findingId, photoType) → URLs[]

// Reemplazar fotos
replaceFindingPhotos(findingId, newImages, photoType, onProgress?) → URLs[]

// Estadísticas de fotos
getInspectionPhotoStats(inspectionId) → Stats
\`\`\`

## API Routes

### POST /api/blob/upload
Sube un archivo a Vercel Blob Storage

**Request:**
\`\`\`
FormData {
  file: File
}
\`\`\`

**Response:**
\`\`\`json
{
  "url": "https://...",
  "filename": "inspection-photo-...",
  "size": 1024000,
  "type": "image/jpeg"
}
\`\`\`

### DELETE /api/blob/delete
Elimina un archivo de Vercel Blob Storage

**Request:**
\`\`\`json
{
  "url": "https://..."
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true
}
\`\`\`

### GET /api/blob/list
Lista todos los archivos en Vercel Blob Storage

**Response:**
\`\`\`json
{
  "files": [
    {
      "url": "https://...",
      "pathname": "inspection-photo-...",
      "size": 1024000,
      "uploadedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
\`\`\`

## Integración con Supabase

Las fotos se almacenan en dos lugares:

1. **Vercel Blob Storage**: Archivo de imagen (URL pública)
2. **Supabase**: Metadatos y referencias

### Tabla `finding_photos`

\`\`\`sql
CREATE TABLE finding_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('evidence', 'solution', 'before', 'after')),
  created_at TIMESTAMPTZ DEFAULT now()
);
\`\`\`

## Flujo de Uso

### 1. Capturar Foto en Inspección

\`\`\`typescript
// En componente de inspección
const handlePhotoCapture = async (file: File) => {
  try {
    // Comprimir imagen
    const compressed = await compressImage(file)
    
    // Subir a Blob
    const photoUrl = await uploadImageToBlob(compressed)
    
    // Guardar en estado local
    setPhotos([...photos, photoUrl])
  } catch (error) {
    console.error("Error:", error)
  }
}
\`\`\`

### 2. Guardar Hallazgo con Fotos

\`\`\`typescript
// En acciones de servidor
export async function saveFindingWithPhotos(
  inspectionId: string,
  finding: Finding,
  photoUrls: string[]
) {
  // Guardar hallazgo en Supabase
  const { data: findingData } = await supabase
    .from("findings")
    .insert({
      inspection_id: inspectionId,
      description: finding.description,
      status: finding.status
    })
    .select()
    .single()

  // Guardar referencias de fotos
  if (photoUrls.length > 0) {
    await supabase.from("finding_photos").insert(
      photoUrls.map(url => ({
        finding_id: findingData.id,
        photo_url: url,
        photo_type: "evidence"
      }))
    )
  }

  return findingData
}
\`\`\`

### 3. Mostrar Fotos en Informe

\`\`\`typescript
// En componente de informe
const { data: findings } = await supabase
  .from("findings")
  .select(`
    *,
    finding_photos (*)
  `)
  .eq("inspection_id", inspectionId)

// Renderizar fotos
findings.forEach(finding => {
  const photos = finding.finding_photos
    .filter(p => p.photo_type === "evidence")
    .map(p => p.photo_url)
  
  // Mostrar en galería
})
\`\`\`

## Optimizaciones

### Compresión Adaptativa
- Dispositivos móviles: Compresión más agresiva
- Escritorio: Compresión moderada
- Calidad automática basada en tamaño

### Carga en Lotes
- Móvil: 5-10 imágenes por lote
- Escritorio: 20-30 imágenes por lote
- Delays adaptativos para no bloquear UI

### Manejo de Errores
- Una falla no bloquea otras cargas
- Reintentos automáticos
- Fallback a almacenamiento local si es necesario

## Límites y Restricciones

| Aspecto | Límite |
|--------|--------|
| Tamaño máximo por archivo | 4.5 MB |
| Tamaño máximo comprimido | 4 MB |
| Fotos por inspección | 200+ |
| Fotos por lote | 25 (configurable) |
| Timeout por upload | 30 segundos |

## Configuración

### Variables de Entorno Requeridas

\`\`\`env
BLOB_READ_WRITE_TOKEN=your_token_here
\`\`\`

### Configuración en package.json

\`\`\`json
{
  "dependencies": {
    "@vercel/blob": "latest",
    "sharp": "latest"
  }
}
\`\`\`

## Troubleshooting

### Error: "Imagen demasiado grande"
- Solución: La imagen excede 4.5 MB. Intenta comprimir más o usar una imagen más pequeña.

### Error: "Timeout al subir imagen"
- Solución: Conexión lenta. Intenta nuevamente o divide en lotes más pequeños.

### Error: "Error de conexión"
- Solución: Verifica tu conexión a internet y que BLOB_READ_WRITE_TOKEN esté configurado.

### Fotos no aparecen en informe
- Solución: Verifica que las URLs estén guardadas en Supabase en la tabla `finding_photos`.

## Ejemplos de Uso

### Ejemplo 1: Subir foto desde cámara

\`\`\`typescript
const handleCameraCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const url = await uploadFileToBlob(file, (progress) => {
      console.log(`Progreso: ${progress}%`)
    })
    
    setPhotoUrl(url)
  } catch (error) {
    console.error("Error:", error)
  }
}
\`\`\`

### Ejemplo 2: Subir múltiples fotos

\`\`\`typescript
const handleMultiplePhotos = async (files: File[]) => {
  try {
    const urls = await uploadMultipleFilesToBlob(files, (current, total) => {
      console.log(`${current}/${total} fotos subidas`)
    })
    
    setPhotoUrls(urls)
  } catch (error) {
    console.error("Error:", error)
  }
}
\`\`\`

### Ejemplo 3: Gestionar fotos de hallazgo

\`\`\`typescript
// Subir fotos de evidencia
const photoUrls = await uploadFindingPhotos(
  findingId,
  [base64Image1, base64Image2],
  "evidence"
)

// Obtener fotos de solución
const solutionPhotos = await getFindingPhotosByType(findingId, "solution")

// Reemplazar fotos
await replaceFindingPhotos(
  findingId,
  [newBase64Image],
  "evidence"
)
\`\`\`

## Monitoreo

### Verificar uso de Blob Storage

\`\`\`typescript
// Listar todos los archivos
const files = await listBlobFiles()
console.log(`Total de archivos: ${files.length}`)
console.log(`Tamaño total: ${files.reduce((sum, f) => sum + f.size, 0)} bytes`)
\`\`\`

### Estadísticas de inspección

\`\`\`typescript
// Obtener estadísticas de fotos
const stats = await getInspectionPhotoStats(inspectionId)
console.log(`Total de fotos: ${stats.totalPhotos}`)
console.log(`Fotos de evidencia: ${stats.evidencePhotos}`)
console.log(`Fotos de solución: ${stats.solutionPhotos}`)
\`\`\`

## Seguridad

- Todas las URLs son públicas (acceso sin autenticación)
- Las fotos se almacenan en CDN global de Vercel
- Validación de tipo de archivo (solo imágenes)
- Validación de tamaño máximo
- Nombres de archivo únicos con timestamp

## Próximos Pasos

1. Ejecutar el script SQL para crear las tablas en Supabase
2. Probar carga de fotos en la página de inspección
3. Verificar que las fotos aparezcan en los informes
4. Monitorear uso de Blob Storage en dashboard de Vercel

## Soporte

Para más información:
- Documentación de Vercel Blob: https://vercel.com/docs/storage/vercel-blob
- Documentación de Supabase: https://supabase.com/docs
- Documentación de Sharp: https://sharp.pixelplumbing.com/
