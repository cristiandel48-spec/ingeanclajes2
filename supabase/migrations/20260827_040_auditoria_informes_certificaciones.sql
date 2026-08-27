-- Quien creo cada informe y cada certificacion, y quien fue el ultimo en tocarlos.
--
-- Igual que en cotizaciones (migracion 030): se registra en la BASE con
-- disparadores, no en la aplicacion, para que no dependa de que la pantalla
-- lo envie ni se pueda falsear desde el cliente.
--
-- ALCANCE: el creador original y el ultimo cambio realizado.
--
-- Es idempotente: se puede volver a ejecutar sin error.

-- ── 1. Informes de actividades ───────────────────────────────────────────────
alter table app.informes
  add column if not exists creado_por             uuid,
  add column if not exists creado_por_nombre      text,
  add column if not exists creado_en              timestamptz,
  add column if not exists modificado_por         uuid,
  add column if not exists modificado_por_nombre  text,
  add column if not exists modificado_en          timestamptz;

comment on column app.informes.creado_por_nombre is
  'Nombre de quien creo el informe, preservado aunque la cuenta del usuario se borre.';

-- ── 2. Certificaciones ───────────────────────────────────────────────────────
alter table app.certificaciones
  add column if not exists creado_por             uuid,
  add column if not exists creado_por_nombre      text,
  add column if not exists creado_en              timestamptz,
  add column if not exists modificado_por         uuid,
  add column if not exists modificado_por_nombre  text,
  add column if not exists modificado_en          timestamptz;

comment on column app.certificaciones.creado_por_nombre is
  'Nombre de quien creo la certificacion, preservado aunque la cuenta del usuario se borre.';

-- ── 3. Funcion generica para registrar autoria ──────────────────────────────
create or replace function app.marcar_autoria_documento()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_nombre text;
begin
  -- El nombre de quien esta guardando, tomado de su ficha en la empresa.
  select coalesce(nullif(m.nombre, ''), m.email)
    into v_nombre
    from app.memberships m
   where m.user_id = auth.uid()
     and m.tenant_id = new.tenant_id
   limit 1;

  if tg_op = 'INSERT' then
    new.creado_por        := auth.uid();
    new.creado_por_nombre := v_nombre;
    new.creado_en         := now();
  else
    -- Quien la creo no cambia nunca, aunque la editen otros.
    new.creado_por        := coalesce(old.creado_por, new.creado_por);
    new.creado_por_nombre := coalesce(old.creado_por_nombre, new.creado_por_nombre);
    new.creado_en         := coalesce(old.creado_en, new.creado_en);
  end if;

  new.modificado_por        := auth.uid();
  new.modificado_por_nombre := v_nombre;
  new.modificado_en         := now();

  return new;
end;
$$;

-- Triggers para Informes
drop trigger if exists trg_autoria_informes on app.informes;
create trigger trg_autoria_informes
before insert or update on app.informes
for each row execute function app.marcar_autoria_documento();

-- Triggers para Certificaciones
drop trigger if exists trg_autoria_certificaciones on app.certificaciones;
create trigger trg_autoria_certificaciones
before insert or update on app.certificaciones
for each row execute function app.marcar_autoria_documento();

-- Actualizar registros existentes para que al menos tengan fecha de ordenamiento
update app.informes
   set modificado_en = coalesce(modificado_en, updated_at)
 where modificado_en is null;

update app.certificaciones
   set modificado_en = coalesce(modificado_en, updated_at)
 where modificado_en is null;
