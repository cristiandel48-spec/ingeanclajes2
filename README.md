# Ingeanclajes Web

Aplicación web de gestión comercial, técnica y operativa para Ingeanclajes (React + Vite).

## Ejecutar local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Backend en nube (Supabase + Vercel)

Ya quedó preparada la base para backend escalable:

- Migración SQL: `supabase/migrations/20260407_001_core_backend.sql`
- Cliente Supabase: `src/lib/backend/supabaseClient.js`
- Repositorio de datos: `src/lib/backend/dataService.js`
- Mapeo de entidades: `src/lib/backend/entityConfig.js`
- Guía de implementación: `docs/backend-supabase-vercel.md`

Variables requeridas (ver `.env.example`):

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_TENANT_SLUG=ingeanclajes
```
