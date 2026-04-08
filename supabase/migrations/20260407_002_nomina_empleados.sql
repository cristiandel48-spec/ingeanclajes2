alter table app.empleados
add column if not exists cedula text;

alter table app.empleados
add column if not exists deducciones_personalizadas jsonb not null default '[]'::jsonb;

create table if not exists app.cargos (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index if not exists idx_cargos_nombre on app.cargos(tenant_id, nombre);

alter table app.cargos enable row level security;

drop trigger if exists cargos_updated_at on app.cargos;
create trigger cargos_updated_at before update on app.cargos
for each row execute procedure app.set_updated_at();

drop policy if exists cargos_tenant_all on app.cargos;
create policy cargos_tenant_all on app.cargos
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

insert into app.cargos (tenant_id, id, nombre, descripcion, activo)
select base.tenant_id,
       concat('CAR-', lpad(base.orden::text, 3, '0')) as id,
       base.cargo,
       '',
       true
from (
  select tenant_id,
         cargo,
         row_number() over (partition by tenant_id order by cargo) as orden
  from (
    select distinct tenant_id, btrim(cargo) as cargo
    from app.empleados
    where cargo is not null and btrim(cargo) <> ''
  ) cargos_distintos
) base
where not exists (
  select 1
  from app.cargos c
  where c.tenant_id = base.tenant_id
    and lower(c.nombre) = lower(base.cargo)
);
