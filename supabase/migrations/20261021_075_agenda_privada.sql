-- ======================================================
-- MIGRACIÓN 075: AGENDA PRIVADA POR USUARIO
-- Cada persona ve y edita solo los compromisos que ella misma creó.
-- Antes la agenda era de toda la empresa: Paola Escobar veía las visitas
-- que programaba Camila Sepúlveda.
--
-- Igual que en tareas_personales (057), el dueño lo pone la base con
-- auth.uid() al insertar: el programa no lo envía, así nadie puede crear
-- compromisos a nombre de otro.
--
-- Las estrellitas (id ESP-...) las pone Cristian para Camila: son de él y
-- además las ve ella, por la columna compartido_con, que llena un trigger.
--
-- Los compromisos que ya existían no guardaban quién los creó. Se le
-- asignan a Camila, que es quien venía usando la agenda; las estrellitas,
-- a Cristian.
--
-- Es idempotente: se puede volver a ejecutar sin error.
-- ======================================================

alter table app.agenda
  add column if not exists usuario_id uuid default auth.uid() references auth.users(id) on delete cascade,
  add column if not exists compartido_con uuid references auth.users(id) on delete set null;

create index if not exists agenda_usuario on app.agenda (tenant_id, usuario_id);

-- Camila de la empresa de la fila (mismos correos que src/lib/agendaEspecial.js).
create or replace function app._agenda_usuario_camila(p_tenant uuid)
returns uuid
language sql
stable
security definer
set search_path = app, public
as $$
  select m.user_id
    from app.memberships m
   where m.tenant_id = p_tenant
     and lower(m.email) in ('sistemasingeanclajes@gmail.com', 'camilascadavid@gmail.com')
   order by m.email = 'sistemasingeanclajes@gmail.com' desc
   limit 1;
$$;

revoke execute on function app._agenda_usuario_camila(uuid) from public, anon;

-- La estrellita nueva se comparte con Camila sin que el programa tenga que
-- saber su id.
create or replace function app._agenda_compartir_estrellita()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
begin
  if new.id like 'ESP-%' and new.compartido_con is null then
    new.compartido_con := app._agenda_usuario_camila(new.tenant_id);
  end if;
  return new;
end;
$$;

drop trigger if exists agenda_compartir_estrellita on app.agenda;
create trigger agenda_compartir_estrellita
before insert on app.agenda
for each row execute function app._agenda_compartir_estrellita();

-- Dueños de lo que ya había.
update app.agenda a
   set usuario_id = app._agenda_usuario_camila(a.tenant_id)
 where a.usuario_id is null
   and a.id not like 'ESP-%';

update app.agenda a
   set usuario_id = (select m.user_id from app.memberships m
                      where m.tenant_id = a.tenant_id and lower(m.email) = 'cristiandel48@gmail.com'
                      limit 1),
       compartido_con = coalesce(a.compartido_con, app._agenda_usuario_camila(a.tenant_id))
 where a.usuario_id is null
   and a.id like 'ESP-%';

-- Politicas. Se quitan las de toda la empresa (056 y 069).
drop policy if exists agenda_tenant_select on app.agenda;
drop policy if exists agenda_tenant_insert on app.agenda;
drop policy if exists agenda_tenant_update on app.agenda;
drop policy if exists agenda_tenant_delete on app.agenda;
drop policy if exists agenda_leer on app.agenda;
drop policy if exists agenda_escribir on app.agenda;

drop policy if exists agenda_privada_leer on app.agenda;
create policy agenda_privada_leer on app.agenda
for select
using (
  tenant_id in (select app.current_user_tenant_ids())
  and (usuario_id = (select auth.uid()) or compartido_con = (select auth.uid()))
);

-- Escribir: hace falta el modulo de agenda (como en 069) y que la fila sea
-- tuya. La compartida se puede actualizar (el programa guarda con upsert, y
-- si la base rechazara esa fila se perderia el guardado entero), pero no
-- cambia de dueño ni se borra.
drop policy if exists agenda_privada_insertar on app.agenda;
create policy agenda_privada_insertar on app.agenda
for insert
with check (
  app.puede_escribir(tenant_id, array['agenda'])
  and usuario_id = (select auth.uid())
);

drop policy if exists agenda_privada_actualizar on app.agenda;
create policy agenda_privada_actualizar on app.agenda
for update
using (
  app.puede_escribir(tenant_id, array['agenda'])
  and (usuario_id = (select auth.uid()) or compartido_con = (select auth.uid()))
)
with check (usuario_id = (select auth.uid()) or compartido_con = (select auth.uid()));

drop policy if exists agenda_privada_borrar on app.agenda;
create policy agenda_privada_borrar on app.agenda
for delete
using (
  app.puede_escribir(tenant_id, array['agenda'])
  and usuario_id = (select auth.uid())
);
