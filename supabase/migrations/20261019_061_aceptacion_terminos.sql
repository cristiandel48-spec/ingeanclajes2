-- Migracion 061: aceptacion de los Terminos de uso y de la Politica de
-- tratamiento de datos personales.
--
-- Cada persona acepta al entrar al sistema, y vuelve a aceptar cuando cambia
-- la version del texto. Queda guardado:
--
--   1. En app.memberships, la ultima version aceptada y cuando. Es lo que lee
--      la aplicacion para saber si tiene que mostrar la pantalla.
--   2. En app.aceptaciones_terminos, una fila por cada aceptacion, que no se
--      borra ni se modifica. Es la prueba de la autorizacion que pide la
--      Ley 1581 de 2012 (art. 9 y Decreto 1377 de 2013): quien, que version,
--      cuando y desde que navegador.
--
-- La aceptacion la escribe app.aceptar_terminos(), con security definer: cada
-- persona solo puede registrar la suya, nunca la de otro.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.memberships
  add column if not exists terminos_version text,
  add column if not exists terminos_aceptados_en timestamptz;

comment on column app.memberships.terminos_version is
  'Ultima version de los Terminos de uso y la Politica de datos que esta persona acepto.';
comment on column app.memberships.terminos_aceptados_en is
  'Fecha y hora en que acepto esa version.';

create table if not exists app.aceptaciones_terminos (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text,
  version     text not null,
  aceptado_en timestamptz not null default now(),
  navegador   text
);

create index if not exists aceptaciones_terminos_user_idx
  on app.aceptaciones_terminos (user_id, aceptado_en desc);

alter table app.aceptaciones_terminos enable row level security;

-- Cada persona ve sus propias aceptaciones. Nadie escribe directo: solo la
-- funcion de abajo. Sin politicas de update ni delete, el historial no se
-- puede alterar desde la aplicacion.
drop policy if exists aceptaciones_terminos_select_own on app.aceptaciones_terminos;
create policy aceptaciones_terminos_select_own on app.aceptaciones_terminos
  for select to authenticated
  using (user_id = auth.uid());

grant select on app.aceptaciones_terminos to authenticated;

create or replace function app.aceptar_terminos(p_version text, p_navegador text default null)
returns timestamptz
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_ahora timestamptz := now();
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesion para aceptar los terminos.';
  end if;
  if p_version is null or char_length(btrim(p_version)) = 0 then
    raise exception 'Falta la version de los terminos.';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  insert into app.aceptaciones_terminos (user_id, email, version, aceptado_en, navegador)
  values (auth.uid(), v_email, btrim(p_version), v_ahora, left(p_navegador, 400));

  update app.memberships
     set terminos_version = btrim(p_version),
         terminos_aceptados_en = v_ahora
   where user_id = auth.uid();

  return v_ahora;
end;
$$;

revoke execute on function app.aceptar_terminos(text, text) from public, anon;
grant execute on function app.aceptar_terminos(text, text) to authenticated, service_role;
