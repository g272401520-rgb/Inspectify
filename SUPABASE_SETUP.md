# Configuración de Supabase para Inspectify CG

## Estado Actual
Tu aplicación ya está configurada para usar Supabase. Solo necesitas ejecutar el script SQL para crear las tablas.

## Pasos para Completar la Integración

### 1. Ejecutar el Script SQL
El script SQL está en `/scripts/001_create_tables.sql`. Este script:
- Crea todas las tablas necesarias (areas, checklists, checklist_items, inspections, findings, finding_photos)
- Configura las relaciones entre tablas
- Habilita Row Level Security (RLS)
- Crea políticas de acceso público
- Crea índices para optimizar consultas

**Para ejecutar el script:**
1. Ve a tu proyecto en Supabase
2. Abre el SQL Editor
3. Copia y pega el contenido de `/scripts/001_create_tables.sql`
4. Ejecuta el script

### 2. Verificar Variables de Entorno
Las siguientes variables de entorno ya están configuradas:
- `NEXT_PUBLIC_SUPABASE_URL` - URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clave anónima de Supabase

### 3. Estructura de Datos

#### Tabla: areas
- `id` (UUID) - Identificador único
- `name` (TEXT) - Nombre del área
- `responsible` (TEXT) - Responsable del área
- `created_at` (TIMESTAMPTZ) - Fecha de creación

#### Tabla: checklists
- `id` (UUID) - Identificador único
- `name` (TEXT) - Nombre del checklist
- `area_id` (UUID) - Referencia al área
- `type` (TEXT) - Tipo: 'normal', 'registro', 'manual', 'excel'
- `created_at` (TIMESTAMPTZ) - Fecha de creación

#### Tabla: checklist_items
- `id` (UUID) - Identificador único
- `checklist_id` (UUID) - Referencia al checklist
- `category` (TEXT) - Categoría del ítem
- `criterion` (TEXT) - Criterio de evaluación
- `subcriterion` (TEXT) - Subcriterio (opcional)
- `details` (TEXT) - Detalles adicionales
- `position` (INTEGER) - Posición en el checklist

#### Tabla: inspections
- `id` (UUID) - Identificador único
- `area_id` (UUID) - Referencia al área
- `checklist_id` (UUID) - Referencia al checklist
- `inspector_name` (TEXT) - Nombre del inspector
- `date` (TIMESTAMPTZ) - Fecha de la inspección
- `status` (TEXT) - Estado: 'en-progreso', 'completada'
- `created_at` (TIMESTAMPTZ) - Fecha de creación

#### Tabla: findings
- `id` (UUID) - Identificador único
- `inspection_id` (UUID) - Referencia a la inspección
- `item_id` (TEXT) - ID del ítem del checklist
- `description` (TEXT) - Descripción del hallazgo
- `status` (TEXT) - Estado: 'conforme', 'no-conforme', 'pendiente'
- `tracking_status` (TEXT) - Estado de seguimiento: 'pendiente', 'en-proceso', 'resuelto'
- `corrective_action` (TEXT) - Acción correctiva
- `due_date` (TIMESTAMPTZ) - Fecha de vencimiento
- `closed_date` (TIMESTAMPTZ) - Fecha de cierre
- `created_at` (TIMESTAMPTZ) - Fecha de creación
- `updated_at` (TIMESTAMPTZ) - Fecha de actualización

#### Tabla: finding_photos
- `id` (UUID) - Identificador único
- `finding_id` (UUID) - Referencia al hallazgo
- `photo_url` (TEXT) - URL de la foto
- `photo_type` (TEXT) - Tipo: 'evidence', 'solution', 'before', 'after'
- `created_at` (TIMESTAMPTZ) - Fecha de creación

## Funcionalidades Disponibles

### Lado del Servidor (Server Actions)
- `getAreasAction()` - Obtener todas las áreas
- `saveAreaAction(area)` - Guardar o actualizar un área
- `deleteAreaAction(id)` - Eliminar un área
- `getChecklistsAction()` - Obtener todos los checklists
- `getChecklistsByAreaAction(areaId)` - Obtener checklists de un área
- `saveChecklistAction(checklist)` - Guardar o actualizar un checklist
- `deleteChecklistAction(id)` - Eliminar un checklist
- `getInspectionsAction()` - Obtener todas las inspecciones
- `saveInspectionAction(inspection)` - Guardar o actualizar una inspección
- `deleteInspectionAction(id)` - Eliminar una inspección
- `getInspectionsWithFindingsAction()` - Obtener inspecciones con hallazgos

### Lado del Cliente (Client Functions)
- `getAreasClient()` - Obtener áreas desde el navegador
- `saveAreaClient(area)` - Guardar área desde el navegador
- `getChecklistsClient()` - Obtener checklists desde el navegador
- `saveChecklistClient(checklist)` - Guardar checklist desde el navegador
- `getInspectionsClient()` - Obtener inspecciones desde el navegador
- `saveInspectionClient(inspection)` - Guardar inspección desde el navegador

## Seguridad

### Row Level Security (RLS)
Todas las tablas tienen RLS habilitado con políticas de acceso público. Esto permite que la aplicación funcione sin autenticación de usuarios.

**Nota:** Si en el futuro deseas agregar autenticación, puedes modificar las políticas para restringir el acceso por usuario.

## Sincronización de Datos

La aplicación utiliza:
- **Server Actions** para operaciones desde componentes del servidor
- **Client Functions** para operaciones desde componentes del cliente
- **Revalidación de caché** para mantener los datos actualizados

## Próximos Pasos

1. Ejecuta el script SQL en Supabase
2. Verifica que las tablas se hayan creado correctamente
3. Prueba la aplicación creando un área, checklist e inspección
4. Los datos se guardarán automáticamente en Supabase

## Solución de Problemas

### Las tablas no se crean
- Verifica que tengas permisos de administrador en Supabase
- Comprueba que el script SQL no tenga errores de sintaxis

### Los datos no se guardan
- Verifica que las variables de entorno estén configuradas correctamente
- Comprueba la consola del navegador para ver mensajes de error
- Verifica que RLS esté habilitado correctamente

### Errores de conexión
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` sea correcto
- Verifica que `NEXT_PUBLIC_SUPABASE_ANON_KEY` sea válida
- Comprueba que Supabase esté en línea
