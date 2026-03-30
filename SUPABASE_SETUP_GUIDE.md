# Guía de Configuración de Supabase para Inspectify CG

Esta guía te ayudará a configurar correctamente la base de datos de Supabase para tu aplicación Inspectify CG.

## Requisitos Previos

- Una cuenta en [Supabase](https://supabase.com)
- Un proyecto de Supabase creado
- Las variables de entorno configuradas en Vercel

## Paso 1: Acceder al SQL Editor

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New Query** para crear una nueva consulta

## Paso 2: Ejecutar el Script de Creación de Tablas

1. Abre el archivo `scripts/001_create_tables.sql` en tu proyecto
2. Copia todo el contenido del archivo
3. Pégalo en el editor SQL de Supabase
4. Haz clic en **Run** (o presiona Ctrl/Cmd + Enter)

El script creará las siguientes tablas:

- **areas** - Áreas de inspección
- **checklists** - Listas de verificación
- **checklist_items** - Items de las listas de verificación
- **inspections** - Inspecciones realizadas
- **findings** - Hallazgos de las inspecciones
- **finding_photos** - Fotos de evidencia y solución

## Paso 3: Verificar la Creación

1. En el menú lateral de Supabase, haz clic en **Table Editor**
2. Deberías ver las 6 tablas creadas
3. Verifica que cada tabla tenga las columnas correctas

## Paso 4: Verificar las Políticas de Seguridad

El script automáticamente configura:

- **Row Level Security (RLS)** habilitado en todas las tablas
- **Políticas de acceso público** para permitir operaciones sin autenticación
- **Índices** para optimizar el rendimiento de las consultas

## Paso 5: Probar la Conexión

1. Regresa a tu aplicación Inspectify CG
2. Recarga la página
3. La alerta de "Base de datos no configurada" debería desaparecer
4. Intenta crear una nueva área para verificar que todo funciona

## Solución de Problemas

### Error: "relation does not exist"

**Causa:** Las tablas no se crearon correctamente.

**Solución:**
1. Verifica que ejecutaste el script completo
2. Revisa el SQL Editor para ver si hay errores
3. Intenta ejecutar el script nuevamente

### Error: "permission denied"

**Causa:** Las políticas de RLS no se configuraron correctamente.

**Solución:**
1. Verifica que las políticas se crearon en el Table Editor
2. Ejecuta nuevamente la sección de políticas del script

### Error: "Invalid API key"

**Causa:** Las variables de entorno no están configuradas correctamente.

**Solución:**
1. Ve a tu proyecto en Supabase Dashboard
2. Ve a **Settings** > **API**
3. Copia las claves y actualiza las variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Estructura de la Base de Datos

### Relaciones

\`\`\`
areas (1) ──→ (N) checklists
areas (1) ──→ (N) inspections
checklists (1) ──→ (N) checklist_items
checklists (1) ──→ (N) inspections
inspections (1) ──→ (N) findings
findings (1) ──→ (N) finding_photos
\`\`\`

### Eliminación en Cascada

Cuando eliminas:
- Un **área**: Se eliminan sus checklists e inspecciones
- Un **checklist**: Se eliminan sus items e inspecciones
- Una **inspección**: Se eliminan sus hallazgos
- Un **hallazgo**: Se eliminan sus fotos

## Mantenimiento

### Respaldo de Datos

Usa la función de exportación en la aplicación:
1. Ve a **Respaldo** en el menú
2. Haz clic en **Exportar Datos**
3. Guarda el archivo JSON en un lugar seguro

### Limpieza de Datos

Para limpiar inspecciones huérfanas:
1. Ve a **Respaldo** en el menú
2. Haz clic en **Limpiar Datos Huérfanos**

## Soporte

Si tienes problemas con la configuración:
1. Revisa los logs en el navegador (F12 > Console)
2. Verifica las variables de entorno en Vercel
3. Consulta la [documentación de Supabase](https://supabase.com/docs)
