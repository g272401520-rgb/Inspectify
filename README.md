# Sistema de Inspecciones y Auditorías

## Descripción General

Aplicación web moderna para realizar inspecciones y auditorías de cumplimiento. Permite dos tipos de inspecciones: **Rápidas** (sin persistencia, ideal para campo) y **Normales** (con criterios detallados, almacenamiento persistente). Funciona completamente offline con IndexedDB y genera reportes en PDF y ZIP.

**Tecnología:** Next.js 16, React 19, TypeScript, Supabase, IndexedDB, jsPDF, JSZip, Tailwind CSS

---

## Tabla de Contenidos

1. [Flujo Principal](#flujo-principal)
2. [Pantallas y Funcionalidades](#pantallas-y-funcionalidades)
3. [Botones y Acciones](#botones-y-acciones)
4. [Tipos de Inspecciones](#tipos-de-inspecciones)
5. [Sistema de Almacenamiento](#sistema-de-almacenamiento)
6. [Capacidades Offline](#capacidades-offline)
7. [Generación de Reportes](#generación-de-reportes)

---

## Flujo Principal

```
Inicio (home) → Seleccionar Área → Seleccionar Checklist → Tipo de Inspección
                                                          ├─ Inspección Rápida
                                                          └─ Inspección Normal
```

### Flujo Detallado:

**1. INICIO (Home - `/`)**
- Muestra lista de **Áreas** (divisiones de la empresa/planta)
- Botones para crear nueva área o editar existentes
- Acceso a reportes consolidados y análisis

**2. SELECCIONAR ÁREA (`/area`)**
- Muestra áreas creadas
- Para cada área: ver checklists, crear nuevos checklists, acciones rápidas

**3. SELECCIONAR CHECKLIST**
- Muestra checklists asignados a esa área
- Opciones: iniciar inspección normal o rápida

**4. TIPO DE INSPECCIÓN**
- **Inspección Rápida** (`/inspeccion-rapida`) - Tabla y fotos, sin persistencia
- **Inspección Normal** (`/inspeccion/[areaId]/[checklistId]`) - Criterios detallados, almacenamiento

---

## Pantallas y Funcionalidades

### 1. PANTALLA PRINCIPAL (Home)

**Ubicación:** `/`  
**Función:** Panel central de la aplicación

#### Elementos Principales:
- **Lista de Áreas:** Todas las áreas registradas
- **Información por Área:**
  - Nombre del área
  - Número de checklists
  - Última fecha de inspección
  - Estado general (% cumplimiento)

#### Botones Principales:

| Botón | Acción | Descripción |
|-------|--------|-------------|
| **+ Área** | Crear nueva área | Abre formulario para ingresar nombre y descripción de nueva área |
| **Editar** | Editar área | Permite modificar nombre y detalles del área |
| **Eliminar** | Eliminar área | Elimina el área y todos sus checklists asociados |
| **Ver Checklists** | Navegar a área | Abre la vista de checklists de esa área |

---

### 2. PANTALLA DE ÁREAS (`/area`)

**Función:** Gestión de checklists dentro de una área específica

#### Elementos Principales:
- **Nombre del Área:** Indicador de dónde estás
- **Lista de Checklists:** Todos los checklists de esta área
- **Para cada Checklist:**
  - Nombre
  - Número de criterios
  - Último inspector
  - Fecha última inspección

#### Botones Principales:

| Botón | Acción | Descripción |
|-------|--------|-------------|
| **+ Nuevo Checklist** | Crear checklist | Abre formulario para crear nuevo checklist con criterios |
| **Inspección Rápida** | Iniciar inspección rápida | Comienza inspección rápida (sin persistencia) para este checklist |
| **Inspección Normal** | Iniciar inspección normal | Comienza inspección normal (con almacenamiento) para este checklist |
| **Editar** | Editar checklist | Modifica criterios y detalles del checklist |
| **Historial** | Ver historial | Muestra todas las inspecciones anteriores de este checklist |
| **Volver** | Regresar a inicio | Vuelve a la pantalla principal |

---

### 3. INSPECCIÓN RÁPIDA (`/inspeccion-rapida`)

**Función:** Inspección ágil para campo, sin persistencia de datos

#### Características:
- ✓ Funciona **100% OFFLINE**
- ✓ Datos **NO se guardan** (temporales en sesión)
- ✓ **Sin criterios detallados** - solo hallazgos y evidencias
- ✓ Captura de fotos rápida
- ✓ Generación de PDF en navegador

#### PANTALLA 1: Información General

**Campos a completar:**
- **Lugar:** Ubicación exacta de inspección
- **Inspector:** Nombre del inspector
- **Responsable:** Responsable del área

#### Botones Pantalla 1:

| Botón | Acción |
|-------|--------|
| **Continuar** | Avanza a Pantalla 2 (captura de fotos) |
| **Cancelar** | Cierra la aplicación sin guardar |

#### PANTALLA 2: Captura y Clasificación de Fotos

**Funcionalidades:**
- Captura de fotos desde cámara
- Clasificación: **Hallazgo** (no conforme) o **Evidencia** (conforme)
- Agrupación de fotos por hallazgo
- Descripción de hallazgos
- Vista previa de fotos capturadas

#### Botones Pantalla 2:

| Botón | Acción | Descripción |
|-------|--------|-------------|
| **📷 Tomar Foto** | Capturar foto | Abre cámara para capturar foto, permite editar |
| **Editar Foto** | Editor de foto | Abre editor con anotaciones (círculos, flechas, texto) |
| **Usar Original** | Confirmar foto | Usa la foto sin editar |
| **HALLAZGO** | Clasificar como hallazgo | Marca como no conforme, requiere descripción |
| **EVIDENCIA** | Clasificar como evidencia | Marca como conforme/prueba de cumplimiento |
| **+ Agregar foto a este hallazgo** | Agregar más fotos | Captura más fotos para el mismo hallazgo |
| **Editar** (hover) | Editar foto existente | Abre editor para foto ya capturada |
| **Eliminar** (hover) | Borrar foto | Elimina foto del grupo |
| **Volver** | Retroceder | Si hay fotos: muestra aviso de descarte. Sin fotos: vuelve a Pantalla 1 |
| **📥 ZIP** | Descargar ZIP | Descarga carpeta con /hallazgos y /evidencias (imagen + metadata.json) |
| **📄 PDF** | Generar PDF | Genera PDF con datos, fotos agrupadas y estadísticas |

#### Diálogos Especiales:

**Diálogo de Foto Capturada:**
- Muestra preview de la foto
- Opciones: "Cancelar", "Usar Original", "Editar Foto"

**Diálogo de Clasificación:**
- Pregunta: ¿Hallazgo o Evidencia?
- Muestra botones grandes con colores (rojo=hallazgo, verde=evidencia)
- Opción para agregar a hallazgo existente

**Diálogo de Descarte:**
- Si intentas volver con fotos capturadas
- Muestra: "Tienes X fotos. Se perderán si vuelves"
- Opciones: "Continuar editando" o "Descartar y volver"

---

### 4. INSPECCIÓN NORMAL (`/inspeccion/[areaId]/[checklistId]`)

**Función:** Inspección completa y detallada con persistencia

#### Características:
- ✓ Datos se **guardan en Supabase** (persistentes)
- ✓ **Criterios detallados** del checklist
- ✓ Evaluación por criterio
- ✓ Fotos por cada criterio
- ✓ Generación de PDF con análisis
- ✓ Historial y seguimiento

#### Estructura:

**1. Panel de Criterios:**
- Nombre del criterio
- Descripción y requisitos
- Estado actual (Conforme/No Conforme/Sin evaluar)

**2. Evaluación por Criterio:**
- Seleccionar: ✓ Conforme o ✗ No Conforme
- Campo de observaciones
- Captura de fotos
- Rúbrica o evidencia requerida

#### Botones Pantalla Normal:

| Botón | Acción | Descripción |
|-------|--------|-------------|
| **Conforme** | Marcar cumple | Marca criterio como cumplido |
| **No Conforme** | Marcar no cumple | Marca criterio como incumplido |
| **+ Foto** | Agregar foto | Captura foto para este criterio específico |
| **Observaciones** | Escribir nota | Campo para comentarios adicionales |
| **Guardar Criterio** | Almacenar evaluación | Guarda datos en Supabase |
| **Siguiente Criterio** | Avanzar | Va al siguiente criterio |
| **Criterio Anterior** | Retroceder | Va al criterio anterior |
| **Generar PDF** | Crear reporte | Genera PDF con criterios, fotos y análisis detallado |
| **Finalizar Inspección** | Completar | Marca inspección como terminada, calcula estadísticas |

---

### 5. PANTALLA DE RESULTADOS (`/inspeccion/[areaId]/[checklistId]/resultados`)

**Función:** Resumen y análisis de la inspección completada

#### Información Mostrada:
- **Estadísticas Generales:**
  - % Cumplimiento
  - Criterios conformes
  - Criterios no conformes
  - Gráfico tipo dona

- **Lista de Hallazgos:**
  - Descripción
  - Fotos asociadas
  - Observaciones

- **Evidencias de Cumplimiento:**
  - Criterios cumplidos
  - Fotos de conformidad

#### Botones:

| Botón | Acción |
|-------|--------|
| **📄 Generar PDF** | Crea reporte en PDF descargable |
| **📥 Descargar Fotos** | ZIP con todas las fotos de la inspección |
| **Editar Inspección** | Vuelve a formulario para hacer cambios |
| **Nueva Inspección** | Inicia nueva inspección del mismo checklist |
| **Volver a Área** | Regresa a lista de checklists |

---

### 6. OTRAS PANTALLAS

#### **Historial (`/historial`)**
- Muestra todas las inspecciones realizadas
- Filtrado por área, fecha, inspector
- Acceso a resultados anteriores

#### **Consolidado (`/consolidado`)**
- Análisis agregado de todas las áreas
- Tendencias de cumplimiento
- Comparativas por período

#### **Comparativas (`/comparativas`)**
- Compara resultados entre áreas
- Gráficos de tendencias
- Identificación de áreas críticas

#### **Seguimiento (`/seguimiento`)**
- Seguimiento de hallazgos no resueltos
- Plan de acción
- Fechas de cierre

#### **Nuevo Registro (`/nuevo-registro`)**
- Crear nueva inspección desde cero
- Seleccionar área y checklist
- Tipo de inspección

#### **Editar Checklist (`/editar-checklist`)**
- Modificar criterios del checklist
- Agregar/eliminar criterios
- Actualizar descripciones

#### **Setup (`/setup`)**
- Configuración inicial de la aplicación
- Crear áreas y checklists base
- Importar datos

#### **Respaldo (`/respaldo`)**
- Exportar datos de la aplicación
- Importar respaldos
- Sincronización manual

#### **Offline (`/offline`)**
- Información sobre funcionamiento offline
- Datos almacenados localmente
- Sincronización pendiente

---

## Tipos de Inspecciones

### INSPECCIÓN RÁPIDA

| Aspecto | Detalles |
|--------|----------|
| **Ubicación** | `/inspeccion-rapida` |
| **Persistencia** | NO - datos temporales en sesión |
| **Offline** | SÍ - 100% funcional sin internet |
| **Almacenamiento** | IndexedDB (se pierden al cerrar pestaña) |
| **Estructura** | Lugar → Inspector → Fotos por hallazgo |
| **Criterios** | NO - solo clasificación simple |
| **Tiempo** | 5-10 minutos |
| **Ideal para** | Campo, sitios remotos, inspecciones ágiles |
| **Reportes** | PDF y ZIP (generados en navegador) |
| **Base de Datos** | NO usa Supabase |

### INSPECCIÓN NORMAL

| Aspecto | Detalles |
|--------|----------|
| **Ubicación** | `/inspeccion/[areaId]/[checklistId]` |
| **Persistencia** | SÍ - guardada en Supabase |
| **Offline** | NO - requiere internet |
| **Almacenamiento** | Base de datos Supabase |
| **Estructura** | Área → Checklist → Criterios detallados |
| **Criterios** | SÍ - evaluación por criterio |
| **Tiempo** | 20-60 minutos según complejidad |
| **Ideal para** | Auditorías formales, seguimiento, análisis |
| **Reportes** | PDF detallado con análisis |
| **Base de Datos** | SÍ - Supabase obligatoria |

---

## Sistema de Almacenamiento

### IndexedDB (Inspección Rápida)

```
📦 IndexedDB (Navegador Local)
├── metadata
│   └── inspeccionData: {lugar, inspector, responsable, ...}
└── fotos
    ├── photo_1: {id, dataUrl, type, hallazgoId, ...}
    ├── photo_2: {id, dataUrl, type, hallazgoId, ...}
    └── ...
```

**Características:**
- Almacenamiento: ~50MB máximo
- Límite fotos: ~50-100 (depende de resolución)
- Límite recomendado: 20-30 fotos por inspección
- Vida útil: Sesión del navegador (se pierden al cerrar)

### Supabase (Inspección Normal)

```
📊 Supabase (Base de Datos)
├── areas
├── checklists
├── criterios
├── inspecciones
├── evaluaciones
└── fotos_inspecciones
```

**Características:**
- Almacenamiento: Ilimitado
- Persistencia: Permanente
- Acceso: Histórico completo
- Sincronización: Automática

---

## Capacidades Offline

La **Inspección Rápida funciona 100% sin internet:**

### Qué Funciona Offline:
- ✅ Captura de fotos (cámara local)
- ✅ Almacenamiento en IndexedDB
- ✅ Compresión de imágenes
- ✅ Generación de PDF (jsPDF)
- ✅ Generación de ZIP (JSZip)
- ✅ Clasificación de hallazgos/evidencias
- ✅ Edición de fotos (anotaciones)
- ✅ Descarga de reportes

### Casos de Uso Offline:
- Inspecciones en plantas sin WiFi
- Sitios remotos/rurales
- Emergencias con caída de internet
- Máxima privacidad (datos no salen del dispositivo)

### Limitación:
⚠️ Datos se pierden al cerrar pestaña/navegador
- **Solución:** Descargar PDF/ZIP antes de cerrar

---

## Generación de Reportes

### PDF - Inspección Rápida

**Contenido:**
```
┌─────────────────────────────────┐
│    REPORTE DE INSPECCIÓN RÁPIDA │
├─────────────────────────────────┤
│ Lugar: [lugar]                  │
│ Inspector: [inspector]          │
│ Responsable: [responsable]      │
│ Fecha: [fecha/hora]             │
├─────────────────────────────────┤
│ HALLAZGOS (N)                   │
│ ├─ Hallazgo 01                  │
│ │  └─ Fotos + descripción       │
│ └─ Hallazgo 02                  │
│    └─ Fotos + descripción       │
├─────────────────────────────────┤
│ EVIDENCIAS (M fotos)            │
│ └─ Fotos de conformidad         │
├─────────────────────────────────┤
│ ESTADÍSTICAS                    │
│ ├─ Total fotos: N+M             │
│ ├─ Hallazgos: N                 │
│ ├─ Conformidad: X%              │
│ └─ [Gráfico tipo dona]          │
└─────────────────────────────────┘
```

**Generación:** Cliente (navegador) - Sin servidor
**Formato:** PDF descargable
**Tamaño:** Variable según fotos

### ZIP - Inspección Rápida

**Estructura:**
```
📦 inspeccion-YYYYMMDD-HHMMSS.zip
├── hallazgos/
│   ├── hallazgo_01_foto_01.jpg
│   ├── hallazgo_01_foto_02.jpg
│   ├── hallazgo_02_foto_01.jpg
│   └── ...
├── evidencias/
│   ├── evidencia_01.jpg
│   ├── evidencia_02.jpg
│   └── ...
└── metadata.json
    {
      "lugar": "...",
      "inspector": "...",
      "responsable": "...",
      "fecha": "...",
      "totalFotos": N,
      "hallazgos": N,
      "evidencias": M
    }
```

**Generación:** Cliente (navegador) - Sin servidor
**Formato:** ZIP descargable
**Tamaño:** Reducido (fotos comprimidas a 0.65 calidad)

### PDF - Inspección Normal

**Contenido:**
```
┌──────────────────────────────────┐
│  REPORTE DE INSPECCIÓN DETALLADO │
├──────────────────────────────────┤
│ Área: [area]                     │
│ Checklist: [checklist]           │
│ Inspector: [inspector]           │
│ Fecha: [fecha]                   │
├──────────────────────────────────┤
│ RESUMEN EJECUTIVO                │
│ ├─ % Cumplimiento: X%            │
│ ├─ Criterios conformes: N        │
│ ├─ Criterios no conformes: M     │
│ └─ [Gráfico análisis]            │
├──────────────────────────────────┤
│ CRITERIOS EVALUADOS              │
│ ├─ [Criterio 1] ✓                │
│ │  └─ Fotos evidencia            │
│ ├─ [Criterio 2] ✗                │
│ │  ├─ Fotos hallazgo             │
│ │  └─ Observaciones              │
│ └─ ...                           │
├──────────────────────────────────┤
│ HALLAZGOS NO RESUELTOS           │
│ └─ Plan de acción                │
└──────────────────────────────────┘
```

**Generación:** Servidor - Supabase
**Formato:** PDF descargable
**Tamaño:** Grande (muchos detalles y fotos)

---

## Accesos Rápidos

### Desde Inicio:
- Crear Área → Botón "+ Área"
- Ver Área → Click en nombre área
- Historial → Menú "Historial"
- Consolidado → Menú "Consolidado"

### Desde Área:
- Crear Checklist → Botón "+ Nuevo Checklist"
- Inspección Rápida → Botón "Inspección Rápida"
- Inspección Normal → Botón "Inspección Normal"
- Editar Checklist → Botón "Editar"

### Desde Inspección Rápida:
- Tomar Foto → Botón "📷 Tomar Foto"
- Clasificar → Diálogo después de capturar
- Generar PDF → Botón "📄 PDF"
- Generar ZIP → Botón "📥 ZIP"

### Desde Inspección Normal:
- Evaluar Criterio → Botones "Conforme/No Conforme"
- Agregar Foto → Botón "+ Foto"
- Siguiente Criterio → Botón "Siguiente"
- Finalizar → Botón "Finalizar Inspección"

---

## Atajos de Teclado (si aplica)

- **ESC:** Cerrar diálogos
- **Enter:** Confirmar acciones
- **Flechas:** Navegar criterios (inspección normal)

---

## Ayuda y Soporte

### Preguntas Frecuentes:

**P: ¿Se guardan los datos de inspección rápida?**  
R: NO. Los datos son temporales y se pierden al cerrar pestaña. Descarga PDF/ZIP antes de cerrar.

**P: ¿Necesito internet para inspección rápida?**  
R: NO. Funciona 100% offline. Ideal para sitios sin WiFi.

**P: ¿Cuántas fotos puedo capturar?**  
R: Máximo 50-100 dependiendo resolución. Recomendado: 20-30.

**P: ¿Dónde se guardan los datos de inspección normal?**  
R: En Supabase (base de datos cloud). Accesible desde cualquier dispositivo.

**P: ¿Puedo editar una inspección después de completarla?**  
R: SÍ en inspección normal (desde resultados). NO en inspección rápida (datos temporales).

### Contacto:
Para reportar problemas: Abre consola del navegador (F12) y comparte los logs [v0].

---

## Notas Técnicas

### Arquitectura:
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Estilos:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **Base de Datos:** Supabase (PostgreSQL)
- **Almacenamiento Local:** IndexedDB
- **Reportes PDF:** jsPDF + jsPDF-autotable
- **Reportes ZIP:** JSZip
- **Compresión Imágenes:** Canvas API

### Seguridad:
- Row Level Security (RLS) en Supabase
- Validación en cliente y servidor
- Parametrized queries (prevención SQL injection)
- HTTPS obligatorio en producción
- Datos offline: sin sincronización automática

### Performance:
- Compresión de imágenes (0.65 calidad)
- Lazy loading de componentes
- IndexedDB para caché local
- Generación PDF/ZIP en navegador (sin servidor)

---

## Changelog

### v1.0.0 (Actual)
- ✅ Inspección Rápida 100% funcional
- ✅ Inspección Normal con criterios
- ✅ Sistema offline completo
- ✅ Generación PDF y ZIP
- ✅ Histórico y consolidado
- ✅ Modo PWA (offline-first)

---

## Licencia

Propiedad Intelectual - Uso interno únicamente

---

**Última actualización:** 2026-03-13  
**Versión:** 1.0.0  
**Estado:** ✅ Funcional y probado
