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

-- Avisa si el usuario todavia no existe en Authentication. Sin esto el
-- insert de abajo no encuentra a quien dar permiso y no hace nada, sin
-- mostrar ningun error: parece que funciono cuando en realidad falto crear
-- el usuario en Authentication > Users > Add user.
do $$
begin
  if not exists (select 1 from auth.users where email = 'sistemasingeanclajes@gmail.com') then
    raise exception
      'El usuario % no existe en Authentication. Crealo primero en Authentication > Users > Add user (marca Auto Confirm User) y vuelve a ejecutar esto.',
      'sistemasingeanclajes@gmail.com';
  end if;
  if not exists (select 1 from app.tenants where slug = 'ingeanclajes') then
    raise exception 'No existe la empresa con slug "ingeanclajes" en app.tenants.';
  end if;
end $$;

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
