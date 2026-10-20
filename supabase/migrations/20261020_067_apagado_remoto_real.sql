-- Migracion 067: el apagado remoto del sistema, de verdad y solo del dueño.
--
-- Antes el «apagado» era una marca dentro de app.empresa_config, una tabla que
-- cualquier miembro puede escribir: cualquiera podia apagar el sistema o
-- encenderlo desde las herramientas del navegador. Y el apagado solo
-- escondia la pantalla: la base seguia entregando y aceptando datos.
--
-- Ahora:
--
--   1. El estado vive en app.estado_sistema, que nadie escribe directamente.
--   2. Solo el dueño lo cambia, con app.cambiar_bloqueo_sistema(), que mira el
--      correo de la sesion (no lo que diga la aplicacion).
--   3. Mientras esta apagado, la base no entrega ni acepta datos a nadie salvo
--      al dueño: app.current_user_tenant_ids() y app.tiene_acceso_modulo(),
--      de las que dependen todas las politicas, devuelven vacio.
--
-- El dueño es la misma cuenta que en la aplicacion (src/lib/permisos.js,
-- CUENTAS_SOPORTE) y en la funcion gestionar-usuarios (CUENTAS_DUENO).
--
-- Es idempotente: se puede volver a ejecutar sin error.

-- ── El dueño ─────────────────────────────────────────────────────────────────
create or replace function app.es_dueno()
returns boolean
language sql
stable
set search_path = app, public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in ('cristiandel48@gmail.com');
$$;

-- ── El estado ────────────────────────────────────────────────────────────────
create table if not exists app.estado_sistema (
  tenant_id     uuid primary key references app.tenants(id) on delete cascade,
  bloqueado     boolean not null default false,
  cambiado_por  text,
  cambiado_en   timestamptz not null default now()
);

comment on table app.estado_sistema is
  'Apagado remoto del sistema por empresa. Solo lo cambia el dueño con app.cambiar_bloqueo_sistema().';

alter table app.estado_sistema enable row level security;

-- Lo leen los miembros aunque este apagado: la aplicacion lo necesita para
-- mostrar la pantalla de sistema apagado. No pasa por current_user_tenant_ids,
-- que justamente se vacia cuando esta apagado.
drop policy if exists estado_sistema_select on app.estado_sistema;
create policy estado_sistema_select on app.estado_sistema
for select
using (tenant_id in (
  select m.tenant_id from app.memberships m
   where m.user_id = auth.uid() and coalesce(m.activo, true)
));

revoke all on app.estado_sistema from anon, public;
grant select on app.estado_sistema to authenticated;

-- Si estaba apagado con el metodo viejo, se respeta.
insert into app.estado_sistema (tenant_id, bloqueado, cambiado_por)
select ec.tenant_id, true, 'migracion 067'
  from app.empresa_config ec
 where (ec.control_documental ->> 'appBloqueada') = 'true'
on conflict (tenant_id) do nothing;

-- ── Disponible para quien pregunta ───────────────────────────────────────────
create or replace function app.sistema_disponible(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = app, public
as $$
  select app.es_dueno()
      or not exists (
        select 1 from app.estado_sistema e
         where e.tenant_id = p_tenant and e.bloqueado
      );
$$;

-- Todas las politicas por empresa dependen de esta funcion: apagado, devuelve
-- vacio para todos menos el dueño.
create or replace function app.current_user_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = app, public
as $$
  select m.tenant_id
  from app.memberships m
  where m.user_id = auth.uid()
    and coalesce(m.activo, true)
    and app.sistema_disponible(m.tenant_id);
$$;

create or replace function app.tiene_acceso_modulo(p_tenant uuid, p_modulos text[])
returns boolean
language sql
stable
security definer
set search_path = app, public
as $$
  select app.sistema_disponible(p_tenant) and exists (
    select 1
      from app.memberships m
     where m.user_id = auth.uid()
       and m.tenant_id = p_tenant
       and coalesce(m.activo, true)
       and (m.role in ('admin', 'contador') or m.modulos is null or m.modulos && p_modulos)
  );
$$;

-- La empresa se sigue pudiendo identificar con el sistema apagado: sin esto,
-- la aplicacion no sabria de que empresa es la persona y mostraria «tu cuenta
-- no tiene acceso» en vez de la pantalla de sistema apagado.
drop policy if exists tenants_select on app.tenants;
create policy tenants_select on app.tenants
for select
using (id in (
  select m.tenant_id from app.memberships m
   where m.user_id = auth.uid() and coalesce(m.activo, true)
));

-- ── Cambiar el estado: solo el dueño ─────────────────────────────────────────
create or replace function app.cambiar_bloqueo_sistema(p_tenant uuid, p_bloqueado boolean)
returns boolean
language plpgsql
security definer
set search_path = app, public
as $$
begin
  if not app.es_dueno() then
    raise exception 'Solo el dueño del sistema puede apagarlo o encenderlo.'
      using errcode = '42501';
  end if;
  if not exists (select 1 from app.memberships m where m.user_id = auth.uid() and m.tenant_id = p_tenant) then
    raise exception 'No perteneces a esa empresa.' using errcode = '42501';
  end if;

  insert into app.estado_sistema (tenant_id, bloqueado, cambiado_por, cambiado_en)
  values (p_tenant, coalesce(p_bloqueado, false), auth.jwt() ->> 'email', now())
  on conflict (tenant_id) do update
     set bloqueado = excluded.bloqueado,
         cambiado_por = excluded.cambiado_por,
         cambiado_en = excluded.cambiado_en;
  return coalesce(p_bloqueado, false);
end;
$$;

revoke execute on function app.cambiar_bloqueo_sistema(uuid, boolean) from public, anon;
grant execute on function app.cambiar_bloqueo_sistema(uuid, boolean) to authenticated, service_role;
revoke execute on function app.sistema_disponible(uuid) from public, anon;
grant execute on function app.sistema_disponible(uuid) to authenticated, service_role;
revoke execute on function app.es_dueno() from public, anon;
grant execute on function app.es_dueno() to authenticated, service_role;

-- Comprobacion: estado actual.
select t.slug, coalesce(e.bloqueado, false) as bloqueado, e.cambiado_por, e.cambiado_en
  from app.tenants t
  left join app.estado_sistema e on e.tenant_id = t.id;
