-- Migracion 064: registro de los correos que salen desde la cuenta de la
-- empresa.
--
-- La funcion gestionar-usuarios envia cotizaciones, colillas, avisos de
-- agenda y novedades desde el Gmail de la empresa. Antes no quedaba rastro de
-- quien mandaba que, y cualquier usuario activo podia enviar sin limite. Ahora
-- cada envio queda aqui, y la funcion cuenta los de las ultimas 24 horas de
-- cada persona para ponerle un tope diario.
--
-- Solo la escribe la funcion (con la llave de servicio). La leen los
-- administradores de la empresa.
--
-- Es idempotente: se puede volver a ejecutar sin error.

create table if not exists app.correos_enviados (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null references app.tenants(id) on delete cascade,
  user_id     uuid,
  email_autor text,
  para        text not null,
  asunto      text,
  tipo        text,
  adjunto     text,
  creado_en   timestamptz not null default now()
);

create index if not exists idx_correos_enviados_usuario_fecha
  on app.correos_enviados(user_id, creado_en desc);
create index if not exists idx_correos_enviados_tenant_fecha
  on app.correos_enviados(tenant_id, creado_en desc);

comment on table app.correos_enviados is
  'Cada correo enviado desde la cuenta de la empresa por la funcion gestionar-usuarios. Sirve de auditoria y para el tope diario por persona.';

alter table app.correos_enviados enable row level security;

drop policy if exists correos_enviados_admin_select on app.correos_enviados;
create policy correos_enviados_admin_select on app.correos_enviados
for select
using (app.es_admin(tenant_id));

-- Sin politicas de escritura: desde la aplicacion nadie inserta, cambia ni
-- borra. La funcion escribe con la llave de servicio, que no pasa por RLS.
revoke all on app.correos_enviados from anon;
grant select on app.correos_enviados to authenticated;
