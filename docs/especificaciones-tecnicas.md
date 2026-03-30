# Especificaciones Técnicas - Inspectify CG

## Requisitos Mínimos del Sistema

### Dispositivos Móviles (Smartphones/Tablets)

#### **Mínimo (Funcionalidad Básica)**
- **RAM**: 2 GB
- **Almacenamiento libre**: 500 MB
- **Sistema Operativo**: 
  - Android 8.0 o superior
  - iOS 12 o superior
- **Navegador**:
  - Chrome 90+
  - Safari 14+
  - Firefox 88+
- **Conexión**: 3G o superior (recomendado 4G/WiFi)

**Limitaciones con RAM mínima:**
- Máximo 10-15 fotos por inspección
- Subida en lotes de 4 fotos simultáneas
- Puede experimentar lentitud con muchas fotos

#### **Recomendado (Experiencia Óptima)**
- **RAM**: 4 GB o más
- **Almacenamiento libre**: 1 GB
- **Sistema Operativo**: 
  - Android 10 o superior
  - iOS 14 o superior
- **Navegador**: Última versión disponible
- **Conexión**: 4G/5G o WiFi

**Beneficios con RAM recomendada:**
- Hasta 50+ fotos por inspección sin problemas
- Subida en lotes de 8 fotos simultáneas
- Generación de PDF rápida
- Multitarea sin cierres de app

### Computadoras de Escritorio/Laptop

#### **Mínimo**
- **RAM**: 4 GB
- **Almacenamiento libre**: 1 GB
- **Sistema Operativo**: 
  - Windows 10
  - macOS 10.14 (Mojave)
  - Linux (Ubuntu 18.04 o equivalente)
- **Navegador**: Chrome 90+, Firefox 88+, Edge 90+, Safari 14+

#### **Recomendado**
- **RAM**: 8 GB o más
- **Almacenamiento libre**: 2 GB
- **Sistema Operativo**: Última versión disponible
- **Navegador**: Última versión disponible

## Consumo de Recursos por Operación

### Uso de Memoria RAM

| Operación | RAM Requerida | Duración |
|-----------|---------------|----------|
| Navegación básica | 200-300 MB | Continuo |
| Realizar inspección (sin fotos) | 300-400 MB | Variable |
| Subir 10 fotos | +200 MB | 10-15 seg |
| Subir 30 fotos | +400 MB | 20-30 seg |
| Generar PDF (10 fotos) | +150 MB | 5-10 seg |
| Generar PDF (30 fotos) | +300 MB | 15-20 seg |
| **Pico máximo (30 fotos + PDF)** | **~1.2 GB** | Temporal |

### Uso de Almacenamiento

| Tipo de Dato | Tamaño Aproximado |
|--------------|-------------------|
| Aplicación web (caché) | 50-100 MB |
| Base de datos local (IndexedDB) | 10-50 MB |
| Fotos en Blob Storage | Variable (servidor) |
| PDFs generados | 1-5 MB por PDF |

### Uso de Ancho de Banda

| Operación | Datos Consumidos |
|-----------|------------------|
| Carga inicial de app | 2-5 MB |
| Subir 1 foto (promedio) | 1-3 MB |
| Subir 10 fotos | 10-30 MB |
| Subir 30 fotos | 30-90 MB |
| Descargar PDF | 1-5 MB |
| Sincronización de datos | 100-500 KB |

## Optimizaciones Implementadas

### Para Dispositivos con Poca RAM (< 3 GB)

1. **Subida en lotes reducidos**: 4 fotos simultáneas en lugar de 8
2. **Sin compresión**: Eliminada para reducir procesamiento
3. **Liberación de memoria**: Limpieza automática después de cada operación
4. **Advertencias proactivas**: Notifica cuando hay muchas fotos (20+)

### Para Conexiones Lentas

1. **Subida asíncrona**: No bloquea la interfaz
2. **Indicadores de progreso**: Feedback visual claro
3. **Reintentos automáticos**: En caso de fallo de red
4. **Timeout extendido**: 60 segundos para operaciones largas

## Recomendaciones de Uso

### Para Mejor Rendimiento

✅ **Hacer:**
- Usar WiFi cuando sea posible para subir muchas fotos
- Cerrar otras apps/pestañas durante inspecciones grandes
- Subir fotos en lotes (completar una inspección antes de empezar otra)
- Generar PDFs solo cuando sea necesario
- Limpiar caché del navegador periódicamente

❌ **Evitar:**
- Subir más de 50 fotos en una sola inspección
- Tener múltiples pestañas de la app abiertas
- Usar la app con menos de 500 MB de RAM libre
- Generar múltiples PDFs simultáneamente

### Límites Recomendados

| Recurso | Límite Sugerido | Límite Técnico |
|---------|-----------------|----------------|
| Fotos por inspección | 30 fotos | 100 fotos |
| Tamaño por foto | 5 MB | 10 MB |
| Inspecciones activas | 1 a la vez | 3 simultáneas |
| PDFs generados/día | 50 PDFs | Sin límite |

## Troubleshooting

### Problemas Comunes

**"La app se cierra sola al subir fotos"**
- Causa: RAM insuficiente
- Solución: Cerrar otras apps, reducir número de fotos por inspección

**"La subida de fotos es muy lenta"**
- Causa: Conexión lenta o muchas fotos
- Solución: Usar WiFi, subir en lotes más pequeños

**"Error al generar PDF"**
- Causa: Demasiadas fotos o RAM insuficiente
- Solución: Reducir número de fotos, cerrar otras pestañas

**"La app está lenta"**
- Causa: Caché lleno o muchos datos locales
- Solución: Limpiar caché del navegador, cerrar pestañas innecesarias

## Monitoreo de Rendimiento

### Indicadores de Salud

La app incluye indicadores automáticos:
- ⚠️ Advertencia con 20+ fotos
- 🔄 Progreso de subida en tiempo real
- ⏱️ Estimación de tiempo restante
- ✅ Confirmación de operaciones completadas

### Logs de Depuración

Para soporte técnico, la app genera logs que incluyen:
- Tiempo de operaciones
- Errores de red
- Uso de memoria (aproximado)
- Versión del navegador

## Actualizaciones Futuras

### Optimizaciones Planificadas

1. **Compresión inteligente**: Comprimir solo si la foto es muy grande
2. **Subida progresiva**: Subir fotos mientras el usuario las agrega
3. **Caché de imágenes**: Reducir descargas repetidas
4. **Modo offline**: Guardar localmente y sincronizar después
5. **Detección adaptativa**: Ajustar automáticamente según el dispositivo

---

**Última actualización**: Enero 2025  
**Versión de la app**: 1.0  
**Contacto**: soporte@inspectifycg.com
