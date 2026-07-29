-- Da acceso a la aplicacion a un usuario nuevo.
--
-- ANTES de ejecutar esto, el usuario debe existir en Supabase Auth:
--   Dashboard > Authentication > Users > Add user
--   Email: sistemasingeanclajes@gmail.com
--   Marca "Auto Confirm User" para que pueda entrar sin correo de validacion.
--
-- Sin la fila en app.memberships el usuario inicia sesion pero la aplicacion
-- responde "El usuario no tiene membresias": las politicas de seguridad (RLS)
-- filtran todo por tenant y esa fila es la que lo autoriza.
--
-- Se puede ejecutar dos veces sin error.

insert into app.memberships (tenant_id, user_id, role)
select t.id, u.id, 'admin'
from app.tenants t
cross join auth.users u
where t.slug = 'ingeanclajes'
  and u.email = 'sistemasingeanclajes@gmail.com'
on conflict (tenant_id, user_id) do update set role = 'admin';

-- Comprobacion: debe devolver una fila con el correo y el rol admin.
select u.email, t.slug as empresa, m.role, m.created_at
from app.memberships m
join auth.users u on u.id = m.user_id
join app.tenants t on t.id = m.tenant_id
order by m.created_at;
