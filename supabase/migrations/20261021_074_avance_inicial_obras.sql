-- Avance de la obra = avance inicial + lo que suma cada jornada.
--
-- POR QUE: el avance de la obra tomaba el de la jornada mas reciente, como si
-- cada jornada anotara el total. En la practica se anota lo que se avanzo ese
-- dia: en la OB-038, jornadas de 26% y 30% mostraban 30% en vez de 56%.
--
-- avance_inicial guarda el avance con el que la obra entro al sistema, o el
-- que se le habia puesto a mano antes de que existiera el avance por jornada.
-- Asi esas obras no vuelven a 0% al registrar su primera jornada.
--
-- Los cambios de abajo no son de una persona: se apagan los disparadores de
-- la tabla mientras se hacen (autoria, version, proteccion de obras
-- finalizadas), como en la migracion 034.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.obras
  add column if not exists avance_inicial numeric(5,2) not null default 0;

alter table app.obras disable trigger user;

-- Obras sin avance en ninguna jornada: lo que tienen hoy es su avance inicial.
update app.obras o
   set avance_inicial = coalesce(o.avance, 0)
 where not exists (
   select 1
     from jsonb_array_elements(case when jsonb_typeof(o.bitacora) = 'array' then o.bitacora else '[]'::jsonb end) b
    where nullif(b->>'avance', '') is not null
 );

-- Obras con avance en sus jornadas: el avance es la suma (hoy solo la OB-038).
update app.obras o
   set avance = least(100, o.avance_inicial + s.suma)
  from (
    select o2.id, o2.tenant_id, sum(nullif(b->>'avance', '')::numeric) as suma
      from app.obras o2,
           jsonb_array_elements(case when jsonb_typeof(o2.bitacora) = 'array' then o2.bitacora else '[]'::jsonb end) b
     group by o2.id, o2.tenant_id
    having count(nullif(b->>'avance', '')) > 0
  ) s
 where s.id = o.id and s.tenant_id = o.tenant_id;

alter table app.obras enable trigger user;

-- Comprobacion: la OB-038 debe quedar en 56.
-- select id, avance_inicial, avance from app.obras where id = 'OB-038';
