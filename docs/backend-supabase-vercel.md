# Backend Escalable (Supabase + Vercel)

Este proyecto hoy vive 100% en frontend (`src/App.jsx`).
Para moverlo a nube sin romper la operación, la ruta recomendada es por fases:

## Fase 1 (rápida, bajo riesgo)

1. Crear proyecto en Supabase.
2. Ejecutar la migración:
   - `supabase/migrations/20260407_001_core_backend.sql`
3. Crear usuario admin en Supabase Auth (dashboard).
4. Vincular usuario al tenant:

```sql
insert into app.memberships (tenant_id, user_id, role)
values (
  (select id from app.tenants where slug = 'ingeanclajes' limit 1),
  'UUID_DEL_USUARIO_AUTH',
  'admin'
)
on conflict do nothing;
```

5. Configurar variables en `.env` (usa `.env.example` como base).

## Fase 2 (migración de módulos)

Usa los servicios ya creados en `src/lib/backend/` para migrar pantalla por pantalla.

Archivos listos:
- `src/lib/backend/supabaseClient.js`
- `src/lib/backend/entityConfig.js`
- `src/lib/backend/dataService.js`

Ejemplo de bootstrap para cargar todo al iniciar:

```js
import { useEffect, useMemo } from "react";
import {
  createDataService,
  getSupabaseClient,
  isSupabaseConfigured,
  resolveTenantId,
} from "./lib/backend";

useEffect(() => {
  let ignore = false;

  const boot = async () => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseClient();
    const tenantId = await resolveTenantId(
      supabase,
      import.meta.env.VITE_SUPABASE_TENANT_SLUG
    );
    const service = createDataService({ supabase, tenantId });
    const data = await service.loadAll();

    if (ignore) return;
    setObras(data.obras);
    setEmpleados(data.empleados);
    setPagos(data.pagos);
    setHorarios(data.horarios);
    setCerts(data.certificaciones);
    setInformes(data.informes);
    setClientes(data.clientes);
    setProveedores(data.proveedores);
    setCuentas(data.cuentas);
    setCotizaciones(data.cotizaciones);
  };

  boot().catch(console.error);

  return () => {
    ignore = true;
  };
}, []);
```

## Fase 3 (producción robusta)

1. Mover imágenes base64 a Supabase Storage (y guardar URL en DB).
2. Añadir auditoría por cambios críticos.
3. Añadir backups + alertas de costos.
4. Separar `src/App.jsx` en módulos para evitar deuda técnica.

## Notas de seguridad

- Este esquema usa RLS por tenant (empresa) y membresías por usuario.
- No uses `service_role` en frontend.
- Usa `anon key` en frontend + RLS.
