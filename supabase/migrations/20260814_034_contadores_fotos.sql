-- Cuantas fotos y cuantos registros tiene cada informe y cada obra.
--
-- POR QUE: las fotos van dentro de columnas jsonb -actividades, bitacora- y
-- pesan tanto que la aplicacion dejo de traerlas al arrancar. Pero los
-- listados las contaban para avisar de lo que importa: «este informe no tiene
-- fotos, saldria vacio». Sin las columnas, ese aviso diria cero en todo, que
-- es peor que no decir nada.
--
-- Se guarda solo el numero. Son cuatro enteros por fila: no pesan nada y se
-- pueden traer siempre.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.informes
  add column if not exists total_actividades int not null default 0,
  add column if not exists total_fotos       int not null default 0;

alter table app.obras
  add column if not exists total_registros_avance int not null default 0,
  add column if not exists total_fotos_avance     int not null default 0;

-- ── Informes ────────────────────────────────────────────────────────────────
create or replace function app.contar_fotos_informe()
returns trigger
language plpgsql
as $$
begin
  new.total_actividades := coalesce(jsonb_array_length(new.actividades), 0);

  -- Las fotos cuelgan de cada actividad, y solo cuentan las que tienen imagen:
  -- un hueco vacio en la cuadricula no es una foto.
  select count(*)
    into new.total_fotos
    from jsonb_array_elements(coalesce(new.actividades, '[]'::jsonb)) as actividad
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(actividad->'fotos') = 'array'
           then actividad->'fotos' else '[]'::jsonb end
    ) as foto
   where coalesce(foto->>'img', '') <> '';

  return new;
end;
$$;

drop trigger if exists contar_fotos_informe on app.informes;
create trigger contar_fotos_informe
  before insert or update on app.informes
  for each row
  execute function app.contar_fotos_informe();

-- ── Obras ───────────────────────────────────────────────────────────────────
create or replace function app.contar_fotos_obra()
returns trigger
language plpgsql
as $$
begin
  new.total_registros_avance := coalesce(jsonb_array_length(new.bitacora), 0);

  select count(*)
    into new.total_fotos_avance
    from jsonb_array_elements(coalesce(new.bitacora, '[]'::jsonb)) as registro
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(registro->'fotos') = 'array'
           then registro->'fotos' else '[]'::jsonb end
    ) as foto
   where coalesce(foto->>'img', '') <> '';

  return new;
end;
$$;

drop trigger if exists contar_fotos_obra on app.obras;
create trigger contar_fotos_obra
  before insert or update on app.obras
  for each row
  execute function app.contar_fotos_obra();

-- ── Poner al dia lo que ya estaba guardado ──────────────────────────────────
-- Un update que no cambia nada dispara igual el trigger, que es lo que se
-- busca. Ojo: en obras hay otro disparador que protege las finalizadas; se
-- desactiva un momento para que no impida rellenar el contador.
update app.informes set id = id;

alter table app.obras disable trigger proteger_obra_cerrada;
update app.obras set id = id;
alter table app.obras enable trigger proteger_obra_cerrada;

-- Comprobacion: deberia dar los mismos numeros que se ven en la aplicacion.
-- select id, total_actividades, total_fotos from app.informes order by id;
