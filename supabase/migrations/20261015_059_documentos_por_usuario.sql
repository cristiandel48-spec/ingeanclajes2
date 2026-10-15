-- ======================================================
-- MIGRACIÓN 059: LOS DOCUMENTOS PASAN A SER DE CADA PERSONA
--
-- La migración 058 creó app.documentos_equipo como un espacio compartido:
-- las políticas solo comprobaban la empresa, así que cualquier miembro leía
-- y editaba las notas de los demás. En la práctica eso significaba que lo
-- que escribía una persona en «Mis tareas y recordatorios · Documentos»
-- lo veía todo el equipo, que no es lo que espera quien escribe ahí.
--
-- Aquí la tabla se alinea con app.tareas_personales (migración 057): cada
-- fila tiene dueño y nadie ve las de otro. La tabla conserva el nombre para
-- no romper el código que ya la usa.
-- ======================================================

-- 1. Columna de dueño. Primero sin NOT NULL, para poder rellenar lo que ya hay.
alter table app.documentos_equipo
  add column if not exists usuario_id uuid references auth.users(id) on delete cascade;

-- 2. Los documentos que ya existen no guardan quién los escribió: la columna
--    `responsable` se quedó siempre vacía. Para no borrarle el trabajo a
--    nadie se le asignan al administrador más antiguo de esa empresa, que es
--    quien puede volver a repartirlos si hiciera falta.
update app.documentos_equipo d
set usuario_id = (
  select m.user_id
  from app.memberships m
  where m.tenant_id = d.tenant_id
  order by (m.role = 'admin') desc, m.created_at asc
  limit 1
)
where d.usuario_id is null;

-- Una empresa sin miembros no puede tener documentos de nadie.
delete from app.documentos_equipo where usuario_id is null;

-- 3. A partir de aquí el dueño lo pone la base al insertar. El programa no lo
--    envía, así nadie puede crear documentos a nombre de otro.
alter table app.documentos_equipo
  alter column usuario_id set not null;
alter table app.documentos_equipo
  alter column usuario_id set default auth.uid();

comment on table app.documentos_equipo is
  'Documentos, notas y checklists estilo Notion. Cada persona ve solo los suyos.';

create index if not exists documentos_equipo_usuario_idx
  on app.documentos_equipo (tenant_id, usuario_id, updated_at desc);

-- 4. Privacidad: además de pertenecer a la empresa, la fila tiene que ser tuya.
drop policy if exists documentos_equipo_select on app.documentos_equipo;
create policy documentos_equipo_select on app.documentos_equipo
for select
using (
  tenant_id in (select app.current_user_tenant_ids())
  and usuario_id = (select auth.uid())
);

drop policy if exists documentos_equipo_insert on app.documentos_equipo;
create policy documentos_equipo_insert on app.documentos_equipo
for insert
with check (
  tenant_id in (select app.current_user_tenant_ids())
  and usuario_id = (select auth.uid())
);

drop policy if exists documentos_equipo_update on app.documentos_equipo;
create policy documentos_equipo_update on app.documentos_equipo
for update
using (
  tenant_id in (select app.current_user_tenant_ids())
  and usuario_id = (select auth.uid())
)
with check (usuario_id = (select auth.uid()));

drop policy if exists documentos_equipo_delete on app.documentos_equipo;
create policy documentos_equipo_delete on app.documentos_equipo
for delete
using (
  tenant_id in (select app.current_user_tenant_ids())
  and usuario_id = (select auth.uid())
);
