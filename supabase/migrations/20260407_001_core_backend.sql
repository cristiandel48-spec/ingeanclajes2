-- supabase/migrations/20260407_001_core_backend.sql
-- Backend escalable para Ingeanclajes (multi-tenant + RLS)

create extension if not exists pgcrypto;
create schema if not exists app;

-- =========================
-- Tenants y membresias
-- =========================
create table if not exists app.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists app.memberships (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'operator' check (role in ('admin', 'manager', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create or replace function app.current_user_tenant_ids()
returns setof uuid
language sql
stable
as $$
  select m.tenant_id
  from app.memberships m
  where m.user_id = auth.uid();
$$;

-- =========================
-- Catalogos base
-- =========================
create table if not exists app.clientes (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  nombre text not null,
  nit text,
  telefono text,
  ciudad text,
  direccion text,
  contacto text,
  email text,
  estado text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists app.empleados (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  nombre text not null,
  cargo text,
  tel text,
  email text,
  salario numeric(14,2),
  activo boolean not null default true,
  avatar text,
  banco text,
  tipo_cuenta text,
  numero_cuenta text,
  extras jsonb not null default '[]'::jsonb,
  comisiones jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists app.proveedores (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  nombre text not null,
  nit text,
  telefono text,
  email text,
  ciudad text,
  direccion text,
  contacto text,
  estado text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

-- =========================
-- Operacion
-- =========================
create table if not exists app.obras (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  cliente text not null,
  nit text,
  tel text,
  proyecto text,
  ciudad text,
  direccion text,
  coords text,
  estado text,
  avance numeric(6,2),
  total numeric(14,2),
  pagado numeric(14,2),
  saldo numeric(14,2),
  costos numeric(14,2),
  fecha_inicio date,
  fecha_fin date,
  empleados jsonb not null default '[]'::jsonb,
  trazos jsonb not null default '[]'::jsonb,
  anclajes jsonb not null default '[]'::jsonb,
  geo_mediciones jsonb not null default '[]'::jsonb,
  img_plano text,
  img_sat text,
  geo_map_view jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists app.obra_empleados (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  obra_id text not null,
  empleado_id text not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, obra_id, empleado_id),
  foreign key (tenant_id, obra_id) references app.obras(tenant_id, id) on delete cascade,
  foreign key (tenant_id, empleado_id) references app.empleados(tenant_id, id) on delete cascade
);

create table if not exists app.cotizaciones (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  numero text,
  fecha date,
  validez_dias integer,
  cliente text,
  obra text,
  telefono text,
  ciudad text,
  coords text,
  forma_pago text,
  tiempo_ejecucion text,
  utilidad_pct numeric(6,2),
  total numeric(14,2),
  items jsonb not null default '[]'::jsonb,
  map_img text,
  geo_mediciones jsonb not null default '[]'::jsonb,
  geo_map_view jsonb,
  estado text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists app.certificaciones (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  obra_id text,
  tipo text,
  numero text,
  fecha date,
  cliente text,
  nit text,
  direccion text,
  sistema text,
  elementos jsonb not null default '[]'::jsonb,
  normativa text,
  ingeniero text,
  matricula text,
  estado text,
  prox_mant date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, obra_id) references app.obras(tenant_id, id) on delete set null
);

create table if not exists app.informes (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  obra_id text,
  proyecto text,
  localizacion text,
  fecha_informe date,
  periodo_inicio date,
  periodo_fin date,
  personal jsonb not null default '[]'::jsonb,
  actividad text,
  descripcion text,
  observaciones text,
  recomendaciones text,
  fotos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, obra_id) references app.obras(tenant_id, id) on delete set null
);

create table if not exists app.cuentas_por_pagar (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  proveedor_id text,
  obra_id text,
  concepto text,
  monto numeric(14,2),
  fecha date,
  fecha_vence date,
  estado text,
  factura text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, proveedor_id) references app.proveedores(tenant_id, id) on delete set null,
  foreign key (tenant_id, obra_id) references app.obras(tenant_id, id) on delete set null
);

create table if not exists app.pagos (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  obra_id text,
  fecha date,
  valor numeric(14,2),
  medio text,
  referencia text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, obra_id) references app.obras(tenant_id, id) on delete set null
);

create table if not exists app.horarios (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  empleado_id text,
  obra_id text,
  fecha date,
  hora_inicio text,
  hora_fin text,
  horas numeric(6,2),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, empleado_id) references app.empleados(tenant_id, id) on delete set null,
  foreign key (tenant_id, obra_id) references app.obras(tenant_id, id) on delete set null
);

-- =========================
-- Utilidades
-- =========================
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clientes_updated_at before update on app.clientes
for each row execute procedure app.set_updated_at();

create trigger empleados_updated_at before update on app.empleados
for each row execute procedure app.set_updated_at();

create trigger proveedores_updated_at before update on app.proveedores
for each row execute procedure app.set_updated_at();

create trigger obras_updated_at before update on app.obras
for each row execute procedure app.set_updated_at();

create trigger cotizaciones_updated_at before update on app.cotizaciones
for each row execute procedure app.set_updated_at();

create trigger certificaciones_updated_at before update on app.certificaciones
for each row execute procedure app.set_updated_at();

create trigger informes_updated_at before update on app.informes
for each row execute procedure app.set_updated_at();

create trigger cuentas_por_pagar_updated_at before update on app.cuentas_por_pagar
for each row execute procedure app.set_updated_at();

create trigger pagos_updated_at before update on app.pagos
for each row execute procedure app.set_updated_at();

create trigger horarios_updated_at before update on app.horarios
for each row execute procedure app.set_updated_at();

-- =========================
-- Indexes
-- =========================
create index if not exists idx_memberships_user on app.memberships(user_id);
create index if not exists idx_clientes_nombre on app.clientes(tenant_id, nombre);
create index if not exists idx_obras_estado on app.obras(tenant_id, estado);
create index if not exists idx_obras_cliente on app.obras(tenant_id, cliente);
create index if not exists idx_certificaciones_prox_mant on app.certificaciones(tenant_id, prox_mant);
create index if not exists idx_cuentas_estado on app.cuentas_por_pagar(tenant_id, estado);
create index if not exists idx_pagos_fecha on app.pagos(tenant_id, fecha);

-- =========================
-- Row Level Security
-- =========================
alter table app.tenants enable row level security;
alter table app.memberships enable row level security;
alter table app.clientes enable row level security;
alter table app.empleados enable row level security;
alter table app.proveedores enable row level security;
alter table app.obras enable row level security;
alter table app.obra_empleados enable row level security;
alter table app.cotizaciones enable row level security;
alter table app.certificaciones enable row level security;
alter table app.informes enable row level security;
alter table app.cuentas_por_pagar enable row level security;
alter table app.pagos enable row level security;
alter table app.horarios enable row level security;

create policy tenants_select on app.tenants
for select
using (id in (select app.current_user_tenant_ids()));

create policy memberships_select_own on app.memberships
for select
using (user_id = auth.uid());

-- Inserciones/actualizaciones/borrados de membresias:
-- recomendados solo por service_role (dashboard, scripts de backend o migration jobs).

-- Politicas por tenant para tablas de negocio
create policy clientes_tenant_all on app.clientes
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

create policy empleados_tenant_all on app.empleados
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

create policy proveedores_tenant_all on app.proveedores
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

create policy obras_tenant_all on app.obras
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

create policy obra_empleados_tenant_all on app.obra_empleados
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

create policy cotizaciones_tenant_all on app.cotizaciones
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

create policy certificaciones_tenant_all on app.certificaciones
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

create policy informes_tenant_all on app.informes
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

create policy cuentas_tenant_all on app.cuentas_por_pagar
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

create policy pagos_tenant_all on app.pagos
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

create policy horarios_tenant_all on app.horarios
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

-- Tenant por defecto (opcional)
insert into app.tenants (slug, name)
values ('ingeanclajes', 'Ingeanclajes S.A.S')
on conflict (slug) do nothing;
