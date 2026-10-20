# Ingeanclajes · Sistema de gestión

Aplicación web de gestión comercial, técnica y operativa de Ingeanclajes S.A.S.:
cotizaciones, obras, informes de actividades, certificaciones, personal y nómina,
pagos y contabilidad.

- **Producción:** https://ingeanclajes2.vercel.app
- **Frontend:** React 19 + Vite, publicado en Vercel.
- **Backend:** Supabase (Postgres con RLS, Auth, Storage y funciones de borde).

La arquitectura, el modelo de datos y cómo se publica cada parte están en
[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Trabajar en local

Requisitos: Node 20 o superior.

```bash
npm install
cp .env.example .env   # y completar los valores
npm run dev            # http://localhost:5173
```

El entorno local usa la misma base de Supabase que producción: lo que se guarde
desde `localhost` queda en los datos reales.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm test` | Pruebas automáticas (Vitest), en `src/**/*.test.js`. |
| `npm run lint` | ESLint. Los errores frenan la publicación; los avisos no. |
| `npm run build` | Lint, pruebas y compilación, en ese orden. Si algo falla, se detiene. |

## Publicar

- **App:** cada push a `main` lo publica Vercel solo. Vercel ejecuta `npm run build`,
  así que una prueba o un error de lint que falle impide publicar la versión.
- **Migraciones de la base:** se aplican a mano en el SQL Editor de Supabase, en orden
  (ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md#migraciones)).
- **Funciones de borde:**

  ```bash
  npx supabase functions deploy gestionar-usuarios armar-cotizacion corregir-texto
  ```

## Variables de entorno de la app

| Variable | Para qué |
|---|---|
| `VITE_SUPABASE_URL` | Dirección del proyecto de Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Llave pública (anon). La seguridad la ponen las reglas RLS de la base. |
| `VITE_SUPABASE_TENANT_SLUG` | Empresa con la que trabaja la app (`ingeanclajes`). |
| `VITE_GOOGLE_MAPS_KEY` | Mapas. Restringirla por dominio en Google Cloud. |
| `VITE_SUPABASE_FUNCION_USUARIOS` | Opcional: nombre de la función de usuarios si no es `gestionar-usuarios`. |
| `VITE_CUENTAS_SOPORTE` | Opcional: correos del dueño, separados por coma (ver la auditoría). |

Los secretos de las funciones de borde (correo, IA) se configuran en Supabase, no
aquí: ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md#funciones-de-borde).
