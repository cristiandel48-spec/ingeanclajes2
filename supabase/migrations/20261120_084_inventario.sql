-- Migración 084: módulo de Inventario (bienes y equipos de la empresa).
--
-- POR QUE: llevar el control de herramientas, equipos de medición (p. ej.
-- dinamómetros), cómputo, EPP, vehículos y mobiliario: qué se tiene, cuánto
-- vale hoy, dónde está, quién lo tiene y qué tiene calibración o vencimiento
-- próximo. No reemplaza el despacho de materiales por obra ni el catálogo de
-- precios.
--
-- FOTOS EN STORAGE: la columna `foto` guarda únicamente la referencia al
-- bucket privado `fotos` («sb-foto:<tenant>/<sha256>.<ext>», migración 071),
-- nunca base64 dentro de la fila. La aplicación además la omite al arrancar y
-- usa `tiene_foto` (calculada) en el listado.
--
-- PERMISOS: lectura restringida a quien tiene el módulo «inventario» (más
-- administrador y contador); escritura y borrado solo con `app.puede_escribir`
-- (excluye al rol Consulta), en espejo con `src/lib/permisos.js`.
--
-- Es idempotente: se puede volver a ejecutar sin error.

create table if not exists app.inventario (
  tenant_id              uuid not null references app.tenants(id) on delete cascade,
  id                     text not null,
  nombre                 text not null,
  categoria              text not null default 'Otro'
                         check (categoria in (
                           'Herramienta eléctrica',
                           'Herramienta manual',
                           'Equipo de medición',
                           'Cómputo y oficina',
                           'Protección personal (EPP)',
                           'Vehículos',
                           'Mobiliario',
                           'Otro'
                         )),
  marca                  text,
  modelo                 text,
  serial                 text,
  cantidad               integer not null default 1 check (cantidad >= 1),
  fecha_compra           date,
  valor_compra           numeric(14,2) check (valor_compra is null or valor_compra >= 0),
  valor_actual           numeric(14,2) not null default 0 check (valor_actual >= 0),
  estado                 text not null default 'En bodega'
                         check (estado in (
                           'En uso',
                           'En bodega',
                           'En mantenimiento',
                           'Dañado',
                           'Dado de baja'
                         )),
  responsable_tipo       text not null default 'texto'
                         check (responsable_tipo in ('texto', 'empleado', 'obra')),
  empleado_id            text,
  obra_id                text,
  ubicacion              text,
  fecha_calibracion      date,
  motivo_baja            text,
  fecha_baja             date,
  foto                   text,
  tiene_foto             boolean generated always as (coalesce(nullif(trim(foto), ''), '') <> '') stored,
  notas                  text,
  creado_por             uuid,
  creado_por_nombre      text,
  creado_en              timestamptz,
  modificado_por         uuid,
  modificado_por_nombre  text,
  modificado_en          timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  primary key (tenant_id, id),
  -- Solo anula la referencia y conserva tenant_id si se borra un empleado o una obra.
  foreign key (tenant_id, empleado_id) references app.empleados(tenant_id, id) on delete set null (empleado_id),
  foreign key (tenant_id, obra_id)     references app.obras(tenant_id, id)     on delete set null (obra_id)
);

comment on table app.inventario is
  'Control de bienes propios de la empresa (herramientas, equipos de medición, cómputo, EPP, vehículos y mobiliario).';
comment on column app.inventario.foto is
  'Referencia al archivo en el bucket privado fotos (sb-foto:<tenant>/<sha256>.<ext>); no debe guardar base64.';
comment on column app.inventario.tiene_foto is
  'Bandera ligera para el listado inicial sin descargar la columna foto al arrancar.';
comment on column app.inventario.creado_por_nombre is
  'Se guarda el nombre además del identificador para conservar la autoría si la cuenta se elimina después.';

-- ── Índices ──────────────────────────────────────────────────────────────────
create index if not exists idx_inventario_estado
  on app.inventario (tenant_id, estado);

create index if not exists idx_inventario_categoria
  on app.inventario (tenant_id, categoria);

create index if not exists idx_inventario_calibracion
  on app.inventario (tenant_id, fecha_calibracion)
  where fecha_calibracion is not null;

create index if not exists idx_inventario_empleado
  on app.inventario (tenant_id, empleado_id)
  where empleado_id is not null;

create index if not exists idx_inventario_obra
  on app.inventario (tenant_id, obra_id)
  where obra_id is not null;

-- ── Disparadores (updated_at y autoría) ──────────────────────────────────────
drop trigger if exists inventario_updated_at on app.inventario;
create trigger inventario_updated_at
before update on app.inventario
for each row execute procedure app.set_updated_at();

-- Misma convención de autoría que cotizaciones (migraciones 030 y 044): la base
-- toma el usuario de la sesión para que no se pueda falsear desde el cliente.
create or replace function app.marcar_autoria_inventario()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_nombre text;
  v_email  text;
begin
  select coalesce(nullif(m.nombre, ''), m.email), m.email
    into v_nombre, v_email
    from app.memberships m
   where m.user_id = auth.uid()
     and m.tenant_id = new.tenant_id
   limit 1;

  if (
    v_email ilike '%cristiandel48%'
    or v_nombre ilike '%cristiandel48%'
    or v_nombre ilike '%cristian florez%'
    or v_nombre ilike '%cristian flórez%'
  ) then
    v_nombre := 'Camila Sepúlveda';
  end if;

  if tg_op = 'INSERT' then
    new.creado_por            := auth.uid();
    new.creado_por_nombre     := coalesce(v_nombre, 'Camila Sepúlveda');
    new.creado_en             := now();
    new.modificado_por        := auth.uid();
    new.modificado_por_nombre := coalesce(v_nombre, 'Camila Sepúlveda');
    new.modificado_en         := now();
  else
    -- Quien registró el bien no cambia aunque otros lo editen después.
    new.creado_por            := old.creado_por;
    new.creado_por_nombre     := coalesce(old.creado_por_nombre, 'Camila Sepúlveda');
    new.creado_en             := coalesce(old.creado_en, old.created_at, now());
    new.modificado_por        := coalesce(auth.uid(), old.modificado_por);
    new.modificado_por_nombre := coalesce(v_nombre, old.modificado_por_nombre, 'Camila Sepúlveda');
    new.modificado_en         := now();
  end if;

  return new;
end;
$$;

-- Función de disparador: no debe quedar expuesta como endpoint RPC (migración 045).
revoke execute on function app.marcar_autoria_inventario() from public, anon, authenticated;

drop trigger if exists trg_autoria_inventario on app.inventario;
create trigger trg_autoria_inventario
before insert or update on app.inventario
for each row execute function app.marcar_autoria_inventario();

-- ── Permisos y seguridad por fila (RLS) ──────────────────────────────────────
alter table app.inventario enable row level security;

revoke all on app.inventario from anon, public;
grant select, insert, update, delete on app.inventario to authenticated, service_role;

drop policy if exists inventario_leer on app.inventario;
create policy inventario_leer on app.inventario
for select
using (app.tiene_acceso_modulo(tenant_id, array['inventario']));

drop policy if exists inventario_insertar on app.inventario;
create policy inventario_insertar on app.inventario
for insert
with check (app.puede_escribir(tenant_id, array['inventario']));

drop policy if exists inventario_modificar on app.inventario;
create policy inventario_modificar on app.inventario
for update
using (app.puede_escribir(tenant_id, array['inventario']))
with check (app.puede_escribir(tenant_id, array['inventario']));

drop policy if exists inventario_borrar on app.inventario;
create policy inventario_borrar on app.inventario
for delete
using (app.puede_escribir(tenant_id, array['inventario']));
