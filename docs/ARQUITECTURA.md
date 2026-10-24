# Arquitectura

Guía corta para quien tenga que mantener el sistema. Lo que no está aquí está
explicado en los comentarios del código, que dicen el porqué de cada decisión.

## Piezas

```
Navegador (React + Vite, en Cloudflare)
  │  supabase-js con la sesión del usuario
  ▼
Supabase
  ├─ Postgres, esquema `app`: tablas por empresa (tenant_id) con reglas RLS
  ├─ Auth: usuarios y sesiones
  ├─ Storage: bucket privado `fotos` (fotos de informes, obras y cotizaciones)
  └─ Funciones de borde (Deno): usuarios y correo, IA de cotizaciones y textos

Cloudflare Pages + Pages Functions
  └─ functions/api/ics.js (/api/ics): archivo de calendario (.ics) para Apple Calendar
```

## Carpetas

| Carpeta | Contenido |
|---|---|
| `src/screens/` | Una carpeta por módulo del menú (Cotización, Obras, Informes, Nómina…). |
| `src/components/` | Componentes compartidos; `components/ui/` es el kit de diseño. |
| `src/context/AppDataContext.jsx` | Estado de toda la app y autoguardado en la nube. |
| `src/lib/backend/` | Acceso a Supabase: `dataService.js` (leer y guardar), `bootstrapAppData.js` (carga inicial y diferencias), `entityConfig.js` (columnas de cada tabla), `fotosStorage.js` (fotos en Storage). |
| `src/lib/` | Lógica de negocio: cotizaciones, nómina, permisos, PDF e impresión. |
| `supabase/migrations/` | Cambios de la base, numerados. |
| `supabase/functions/` | Funciones de borde. |

## Cómo se cargan y guardan los datos

1. Al entrar se cargan todas las tablas, **sin** las columnas pesadas (fotos,
   bitácoras). Esas se traen al abrir cada registro (`cargarDetalle`).
2. Los cambios se guardan solos: `saveCloudAppData` compara con lo último que se
   leyó y manda solo lo que cambió.
   - Registros nuevos: `insert`. Si el número ya existe, toma el siguiente libre.
   - Registros existentes: se actualizan solo si nadie más los cambió (por
     `updated_at`). Si otra persona los cambió, se pregunta qué hacer.
3. Fotos: al guardar suben al bucket `fotos` y en la fila queda una referencia
   `sb-foto:<empresa>/<huella>.jpg`. Al abrir el registro se descargan. Las fotos
   anteriores a la migración 071 siguen dentro de las filas.

## Permisos

- Cada usuario tiene una membresía con un rol (`admin`, `contador`, `manager`,
  `operator`, `viewer`) y una lista de módulos.
- La base aplica los permisos con RLS. La app los repite
  (`src/lib/permisos.js`) solo para no intentar guardar lo que la base rechazaría.
  **Las dos tienen que coincidir**: al cambiar una, cambiar la otra.
- Salarios y cuentas bancarias solo los leen administrador, contador o quien
  tenga Personal; los demás leen la vista `empleados_basico`.
- La auditoría y el apagado remoto son solo del dueño.

## Migraciones

- Están en `supabase/migrations/`, con nombre `AAAAMMDD_NNN_descripcion.sql`.
- Se aplican **a mano, en orden**, en el SQL Editor de Supabase. Abrir una
  consulta nueva, pegar el archivo completo y ejecutar sin seleccionar nada.
- Todas son idempotentes: volver a ejecutar una no daña nada.
- Si una migración cambia permisos, el orden importa. Normalmente se publica
  primero la app, se espera a que los usuarios recarguen y luego se aplica la
  migración. El comentario de cada migración lo indica.

## Funciones de borde

| Función | Para qué | Secretos que usa |
|---|---|---|
| `gestionar-usuarios` | Crear, editar y desactivar usuarios; enviar correos (bienvenida, cotizaciones, colillas). | `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_SERVIDOR`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CLAVE`, `APP_URL`, `CUENTAS_DUENO`, `LIMITE_CORREOS_DIA` |
| `armar-cotizacion` | Arma una cotización a partir de un dictado o un documento (IA). | `GROQ_API_KEY` o `IA_API_KEY`, `IA_URL`, `IA_MODELO` |
| `corregir-texto` | Corrige ortografía y redacción (IA). | Los mismos de IA |

- Todas exigen sesión y membresía activa.
- Solo responden al sitio del sistema y a `localhost`. Para otro dominio, agregarlo en
  `ORIGENES_PERMITIDOS`, separado por comas.
- Los secretos se configuran en Supabase → Edge Functions → Secrets.
- `whatsapp-entrada` es del módulo de WhatsApp, que está desactivado.

## Pruebas y publicación

- `npm run build` ejecuta el lint, las pruebas y la compilación. Cloudflare (o `npm run deploy`) usa ese
  comando, así que nada que falle llega a producción.
- Las pruebas cubren la lógica de negocio (cotizaciones, nómina, permisos,
  consecutivos) y el guardado contra una base simulada. No cubren las pantallas
  ni las reglas reales de Supabase.

## Módulos guardados pero inactivos

Producción (tareas y documentos del equipo), WhatsApp y Planos tienen código en
`src/screens/` pero no están en el menú ni la app los carga. Se conservan por
si se reactivan.
