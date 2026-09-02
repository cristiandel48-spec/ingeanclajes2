-- Migración 041: Auditoría en Obras y Horarios, y anonimización de cuentas de desarrollo
--
-- 1. Agrega columnas de auditoría a app.obras y app.horarios
-- 2. Conecta triggers automáticos
-- 3. Excluye cuentas de soporte/desarrollo (cristiandel48@gmail.com) para que los parches no se registren como modificaciones
-- 4. Limpia registros existentes donde aparecía cristiandel48@gmail.com

-- ── 1. Columnas en Obras ───────────────────────────────────────────────────
alter table app.obras
  add column if not exists creado_por             uuid,
  add column if not exists creado_por_nombre      text,
  add column if not exists creado_en              timestamptz,
  add column if not exists modificado_por         uuid,
  add column if not exists modificado_por_nombre  text,
  add column if not exists modificado_en          timestamptz;

-- ── 2. Columnas en Horarios ────────────────────────────────────────────────
alter table app.horarios
  add column if not exists creado_por             uuid,
  add column if not exists creado_por_nombre      text,
  add column if not exists creado_en              timestamptz,
  add column if not exists modificado_por         uuid,
  add column if not exists modificado_por_nombre  text,
  add column if not exists modificado_en          timestamptz;

-- ── 3. Función de auditoría respetando exclusión de parches técnicos ───────
create or replace function app.marcar_autoria_documento()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_nombre text;
  v_email  text;
  v_es_tecnico boolean := false;
begin
  select coalesce(nullif(m.nombre, ''), m.email), m.email
    into v_nombre, v_email
    from app.memberships m
   where m.user_id = auth.uid()
     and m.tenant_id = new.tenant_id
   limit 1;

  if (v_email ilike '%cristiandel48%' or v_nombre ilike '%cristiandel48%') then
    v_es_tecnico := true;
  end if;

  if tg_op = 'INSERT' then
    new.creado_por        := auth.uid();
    new.creado_por_nombre := case when v_es_tecnico then 'Administración' else v_nombre end;
    new.creado_en         := now();
    new.modificado_por    := auth.uid();
    new.modificado_por_nombre := case when v_es_tecnico then null else v_nombre end;
    new.modificado_en     := now();
  else
    -- Si quien guarda es la cuenta de soporte, preservar quien lo modificó originalmente
    -- para no sobrescribir la auditoría con parches del desarrollador
    new.creado_por        := coalesce(old.creado_por, new.creado_por);
    new.creado_por_nombre := coalesce(old.creado_por_nombre, new.creado_por_nombre);
    new.creado_en         := coalesce(old.creado_en, new.creado_en);

    if not v_es_tecnico then
      new.modificado_por        := auth.uid();
      new.modificado_por_nombre := v_nombre;
      new.modificado_en         := now();
    else
      new.modificado_por        := old.modificado_por;
      new.modificado_por_nombre := old.modificado_por_nombre;
      new.modificado_en         := old.modificado_en;
    end if;
  end if;

  return new;
end;
$$;

-- Triggers para Obras
drop trigger if exists trg_autoria_obras on app.obras;
create trigger trg_autoria_obras
before insert or update on app.obras
for each row execute function app.marcar_autoria_documento();

-- Triggers para Horarios
drop trigger if exists trg_autoria_horarios on app.horarios;
create trigger trg_autoria_horarios
before insert or update on app.horarios
for each row execute function app.marcar_autoria_documento();

-- ── 4. Limpieza de registros históricos con el correo cristiandel48@gmail.com ──
update app.cotizaciones
   set modificado_por_nombre = null
 where modificado_por_nombre ilike '%cristiandel48%';

update app.cotizaciones
   set creado_por_nombre = 'Administración'
 where creado_por_nombre ilike '%cristiandel48%';

update app.informes
   set modificado_por_nombre = null
 where modificado_por_nombre ilike '%cristiandel48%';

update app.informes
   set creado_por_nombre = 'Administración'
 where creado_por_nombre ilike '%cristiandel48%';

update app.certificaciones
   set modificado_por_nombre = null
 where modificado_por_nombre ilike '%cristiandel48%';

update app.certificaciones
   set creado_por_nombre = 'Administración'
 where creado_por_nombre ilike '%cristiandel48%';

update app.obras
   set modificado_por_nombre = null
 where modificado_por_nombre ilike '%cristiandel48%';

update app.obras
   set creado_por_nombre = 'Administración'
 where creado_por_nombre ilike '%cristiandel48%';

update app.horarios
   set modificado_por_nombre = null
 where modificado_por_nombre ilike '%cristiandel48%';

update app.horarios
   set creado_por_nombre = 'Administración'
 where creado_por_nombre ilike '%cristiandel48%';

-- Fechas iniciales para ordenamiento
update app.obras
   set modificado_en = coalesce(modificado_en, updated_at, created_at, now())
 where modificado_en is null;

update app.horarios
   set modificado_en = coalesce(modificado_en, updated_at, created_at, now())
 where modificado_en is null;
