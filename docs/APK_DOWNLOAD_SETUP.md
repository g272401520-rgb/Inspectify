# Configuración de Descarga de APK - Inspectify

## Overview

El componente `AppInstallDialog` ahora proporciona una forma compacta y funcional para que los usuarios instalen Inspectify en sus dispositivos. En lugar de mostrar un diálogo grande con instrucciones, ahora muestra un toast pequeño en la esquina inferior derecha con opciones prácticas.

## Características

- **Toast Compacto**: Aparece en la esquina inferior derecha, no interfiere con el contenido principal
- **Detección de Dispositivo**: Detecta automáticamente iOS, Android o Web y muestra opciones relevantes
- **Auto-dismiss**: Se cierra automáticamente después de 8 segundos (el usuario puede cerrar antes)
- **Responsive**: Funciona bien en móvil, tablet y desktop
- **Oscuro/Claro**: Soporta modo oscuro automáticamente

## Opciones por Dispositivo

### Android
- **Botón**: "Descargar APK"
- **Acción**: Descarga directa del APK
- **Configuración**: Requiere configu la ruta `/api/download-apk`

### iOS
- **Botón**: "Ver instrucciones"
- **Acción**: Muestra instrucciones para agregar a pantalla de inicio
- **Instrucciones**: Compartir → Añadir a pantalla de inicio

### Web (Desktop/Tablet)
- **Botón**: "Instalar"
- **Acción**: Activa PWA install prompt si está disponible
- **Soporte**: Solo en navegadores que soportan PWA install

## Configuración

### 1. Para Google Play Store (Recomendado)

Actualiza `/app/api/download-apk/route.ts`:

```typescript
const googlePlayUrl = "https://play.google.com/store/apps/details?id=com.inspectify.app"
return NextResponse.redirect(googlePlayUrl)
```

### 2. Para Descarga Directa desde GitHub

```typescript
const githubUrl = "https://github.com/tu-usuario/inspectify/releases/download/v1.0.0/inspectify.apk"
return NextResponse.redirect(githubUrl)
```

### 3. Para Descarga desde Vercel Blob

```typescript
import { blob } from "@vercel/blob"

export async function GET() {
  const fileBlob = await blob.get("inspectify-app.apk")
  return new Response(fileBlob.content, {
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": "attachment; filename=inspectify.apk",
    },
  })
}
```

## Personalización

### Cambiar tiempo de aparición

En `components/app-install-dialog.tsx`, línea 16:

```typescript
const showTimer = setTimeout(() => {
  // Cambiar 3000 a ms deseados
  // 0 = inmediato, 3000 = 3 segundos
}, 3000)
```

### Cambiar tiempo de auto-dismiss

Línea 39:

```typescript
const closeTimer = setTimeout(() => {
  // Cambiar 8000 a ms deseados
}, 8000)
```

### Cambiar posición

En el JSX, línea 55:

```typescript
className={cn(
  "fixed bottom-4 right-4 z-50", // Cambiar bottom/right por top/left, etc.
  // ...
)}
```

## Mensaje Personalizado

Para cambiar el texto del toast, modifica línea 62-64:

```typescript
<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
  Tu mensaje aquí
</h3>
```

## Testing

### En Desktop
- Abre DevTools (F12)
- Emula dispositivo Android o iOS
- El toast debería aparecer con la opción correspondiente

### En Android Real
- Abre la app en Chrome
- Debería ver opción "Descargar APK" o "Instalar"
- Configura `/api/download-apk` para descargar el APK real

### En iOS Real
- Abre la app en Safari
- Debería ver opción "Ver instrucciones"
- Sigue las instrucciones mostradas

## Troubleshooting

**El toast no aparece:**
- Verifica que `AppInstallDialog` esté en el layout raíz
- Checa la consola para errores de JavaScript
- Asegúrate de que no hay conflictos con otros z-index

**PWA Install no funciona:**
- PWA solo funciona en HTTPS (Vercel lo proporciona)
- No funciona en localhost sin configuración especial
- El navegador debe soportar Web App Manifest

**APK no descarga:**
- Verifica que `/api/download-apk` esté configurado correctamente
- Asegúrate de que la URL de descarga es válida
- Checa headers CORS si descargas desde CDN externo

## Mejoras Futuras

- [ ] Agregar opción para descargar desde múltiples fuentes
- [ ] Estadísticas de descargas/instalaciones
- [ ] Versionado automático de APK
- [ ] Notificación de actualizaciones disponibles
- [ ] Progressive download con barra de progreso

## Archivos Relacionados

- `components/app-install-dialog.tsx` - Componente principal
- `app/api/download-apk/route.ts` - Ruta de descarga
- `app/layout.tsx` - Donde se renderiza el componente
