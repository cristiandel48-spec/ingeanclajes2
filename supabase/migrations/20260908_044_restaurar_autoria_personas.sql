-- Migración 044: Restaurar nombres reales de personas en auditoría (eliminar etiqueta genérica "Administración")
--
-- 1. Actualiza funciones automáticas de autoría para guardar el nombre real del usuario (ej. Cristian Flórez).
-- 2. Restaura los registros históricos que quedaron marcados con "Administración" a "Cristian Flórez".

-- ── 1. Función para Documentos (Obras, Horarios, Informes, Certificaciones) ──
create or replace function app.marcar_autoria_documento()
returns trigger
language plpgsql
security definer
set search_path = app, public
as \$\$
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

  if (v_email ilike '%cristiandel48%' or v_nombre ilike '%cristiandel48%') then
    v_nombre := 'Cristian Flórez';
  end if;

  if tg_op = 'INSERT' then
    new.creado_por        := coalesce(new.creado_por, auth.uid());
    new.creado_por_nombre := coalesce(nullif(nullif(new.creado_por_nombre, 'Administración'), ''), v_nombre, 'Cristian Flórez');
    new.creado_en         := coalesce(new.creado_en, now());
    new.modificado_por    := coalesce(new.modificado_por, auth.uid());
    new.modificado_por_nombre := coalesce(nullif(nullif(new.modificado_por_nombre, 'Administración'), ''), v_nombre, 'Cristian Flórez');
    new.modificado_en     := coalesce(new.modificado_en, now());
  else
    new.creado_por        := coalesce(old.creado_por, new.creado_por);
    new.creado_por_nombre := case
      when old.creado_por_nombre = 'Administración' or old.creado_por_nombre ilike '%cristiandel48%' then 'Cristian Flórez'
      else coalesce(old.creado_por_nombre, new.creado_por_nombre, 'Cristian Flórez')
    end;
    new.creado_en         := coalesce(old.creado_en, new.creado_en);

    new.modificado_por        := coalesce(auth.uid(), old.modificado_por);
    new.modificado_por_nombre := coalesce(nullif(nullif(new.modificado_por_nombre, 'Administración'), ''), v_nombre, old.modificado_por_nombre, 'Cristian Flórez');
    new.modificado_en         := now();
  end if;

  return new;
end;
\$\$;

-- ── 2. Función para Cotizaciones ─────────────────────────────────────────────
create or replace function app.marcar_autoria_cotizacion()
returns trigger
language plpgsql
security definer
set search_path = app, public
as \$\$
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

  if (v_email ilike '%cristiandel48%' or v_nombre ilike '%cristiandel48%') then
    v_nombre := 'Cristian Flórez';
  end if;

  if tg_op = 'INSERT' then
    new.creado_por        := coalesce(new.creado_por, auth.uid());
    new.creado_por_nombre := coalesce(nullif(nullif(new.creado_por_nombre, 'Administración'), ''), v_nombre, 'Cristian Flórez');
    new.creado_en         := coalesce(new.creado_en, now());
  else
    new.creado_por        := coalesce(old.creado_por, new.creado_por);
    new.creado_por_nombre := case
      when old.creado_por_nombre = 'Administración' or old.creado_por_nombre ilike '%cristiandel48%' then 'Cristian Flórez'
      else coalesce(old.creado_por_nombre, new.creado_por_nombre, 'Cristian Flórez')
    end;
    new.creado_en         := coalesce(old.creado_en, new.creado_en);
  end if;

  new.modificado_por        := coalesce(auth.uid(), old.modificado_por);
  new.modificado_por_nombre := coalesce(nullif(nullif(new.modificado_por_nombre, 'Administración'), ''), v_nombre, old.modificado_por_nombre, 'Cristian Flórez');
  new.modificado_en         := now();

  return new;
end;
\$\$;

-- ── 3. Corrección de registros históricos ─────────────────────────────────────
update app.obras
   set creado_por_nombre = 'Cristian Flórez'
 where creado_por_nombre = 'Administración' or creado_por_nombre ilike '%cristiandel48%';

update app.horarios
   set creado_por_nombre = 'Cristian Flórez'
 where creado_por_nombre = 'Administración' or creado_por_nombre ilike '%cristiandel48%';

update app.cotizaciones
   set creado_por_nombre = 'Cristian Flórez'
 where creado_por_nombre = 'Administración' or creado_por_nombre ilike '%cristiandel48%';

update app.informes
   set creado_por_nombre = 'Cristian Flórez'
 where creado_por_nombre = 'Administración' or creado_por_nombre ilike '%cristiandel48%';

update app.certificaciones
   set creado_por_nombre = 'Cristian Flórez'
 where creado_por_nombre = 'Administración' or creado_por_nombre ilike '%cristiandel48%';
