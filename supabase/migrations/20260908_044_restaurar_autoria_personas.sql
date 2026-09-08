-- Migración 044: Restaurar nombres reales de personas en auditoría (Camila Sepúlveda)
--
-- 1. Actualiza funciones automáticas de autoría para guardar Camila Sepúlveda (responsable administrativa).
-- 2. La cuenta técnica de desarrollo (cristiandel48) se asigna automáticamente a Camila Sepúlveda.
-- 3. Restaura los registros históricos que quedaron marcados con 'Administración' o cuentas técnicas a 'Camila Sepúlveda'.

-- ── 1. Función para Documentos (Obras, Horarios, Informes, Certificaciones) ──
create or replace function app.marcar_autoria_documento()
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

  if (v_email ilike '%cristiandel48%' or v_nombre ilike '%cristiandel48%' or v_nombre ilike '%cristian florez%' or v_nombre ilike '%cristian flórez%') then
    v_nombre := 'Camila Sepúlveda';
  end if;

  if tg_op = 'INSERT' then
    new.creado_por        := coalesce(new.creado_por, auth.uid());
    new.creado_por_nombre := coalesce(nullif(nullif(new.creado_por_nombre, 'Administración'), ''), v_nombre, 'Camila Sepúlveda');
    new.creado_en         := coalesce(new.creado_en, now());
    new.modificado_por    := coalesce(new.modificado_por, auth.uid());
    new.modificado_por_nombre := coalesce(nullif(nullif(new.modificado_por_nombre, 'Administración'), ''), v_nombre, 'Camila Sepúlveda');
    new.modificado_en     := coalesce(new.modificado_en, now());
  else
    new.creado_por        := coalesce(old.creado_por, new.creado_por);
    new.creado_por_nombre := case
      when old.creado_por_nombre = 'Administración' or old.creado_por_nombre ilike '%cristiandel48%' or old.creado_por_nombre ilike '%cristian florez%' or old.creado_por_nombre ilike '%cristian flórez%' then 'Camila Sepúlveda'
      else coalesce(old.creado_por_nombre, new.creado_por_nombre, 'Camila Sepúlveda')
    end;
    new.creado_en         := coalesce(old.creado_en, new.creado_en);

    new.modificado_por        := coalesce(auth.uid(), old.modificado_por);
    new.modificado_por_nombre := coalesce(nullif(nullif(new.modificado_por_nombre, 'Administración'), ''), v_nombre, old.modificado_por_nombre, 'Camila Sepúlveda');
    new.modificado_en         := now();
  end if;

  return new;
end;
$$;

-- ── 2. Función para Cotizaciones ─────────────────────────────────────────────
create or replace function app.marcar_autoria_cotizacion()
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

  if (v_email ilike '%cristiandel48%' or v_nombre ilike '%cristiandel48%' or v_nombre ilike '%cristian florez%' or v_nombre ilike '%cristian flórez%') then
    v_nombre := 'Camila Sepúlveda';
  end if;

  if tg_op = 'INSERT' then
    new.creado_por        := coalesce(new.creado_por, auth.uid());
    new.creado_por_nombre := coalesce(nullif(nullif(new.creado_por_nombre, 'Administración'), ''), v_nombre, 'Camila Sepúlveda');
    new.creado_en         := coalesce(new.creado_en, now());
  else
    new.creado_por        := coalesce(old.creado_por, new.creado_por);
    new.creado_por_nombre := case
      when old.creado_por_nombre = 'Administración' or old.creado_por_nombre ilike '%cristiandel48%' or old.creado_por_nombre ilike '%cristian florez%' or old.creado_por_nombre ilike '%cristian flórez%' then 'Camila Sepúlveda'
      else coalesce(old.creado_por_nombre, new.creado_por_nombre, 'Camila Sepúlveda')
    end;
    new.creado_en         := coalesce(old.creado_en, new.creado_en);
  end if;

  new.modificado_por        := coalesce(auth.uid(), old.modificado_por);
  new.modificado_por_nombre := coalesce(nullif(nullif(new.modificado_por_nombre, 'Administración'), ''), v_nombre, old.modificado_por_nombre, 'Camila Sepúlveda');
  new.modificado_en         := now();

  return new;
end;
$$;

-- ── 3. Corrección de registros históricos ─────────────────────────────────────
update app.obras
   set creado_por_nombre = 'Camila Sepúlveda'
 where creado_por_nombre = 'Administración' or creado_por_nombre ilike '%cristiandel48%' or creado_por_nombre ilike '%cristian florez%' or creado_por_nombre ilike '%cristian flórez%';

update app.horarios
   set creado_por_nombre = 'Camila Sepúlveda'
 where creado_por_nombre = 'Administración' or creado_por_nombre ilike '%cristiandel48%' or creado_por_nombre ilike '%cristian florez%' or creado_por_nombre ilike '%cristian flórez%';

update app.cotizaciones
   set creado_por_nombre = 'Camila Sepúlveda'
 where creado_por_nombre = 'Administración' or creado_por_nombre ilike '%cristiandel48%' or creado_por_nombre ilike '%cristian florez%' or creado_por_nombre ilike '%cristian flórez%';

update app.informes
   set creado_por_nombre = 'Camila Sepúlveda'
 where creado_por_nombre = 'Administración' or creado_por_nombre ilike '%cristiandel48%' or creado_por_nombre ilike '%cristian florez%' or creado_por_nombre ilike '%cristian flórez%';

update app.certificaciones
   set creado_por_nombre = 'Camila Sepúlveda'
 where creado_por_nombre = 'Administración' or creado_por_nombre ilike '%cristiandel48%' or creado_por_nombre ilike '%cristian florez%' or creado_por_nombre ilike '%cristian flórez%';
