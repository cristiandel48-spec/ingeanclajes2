-- Migracion 070: salarios y cuentas bancarias solo para quien tiene Personal.
--
-- La tabla de empleados la leia cualquier miembro: salario, banco, numero de
-- cuenta, horas extra, comisiones, deducciones, incapacidades y prestaciones
-- de todo el personal, a un clic desde las herramientas del navegador.
--
-- Ahora:
--
--   - La tabla completa solo la leen el administrador, el contador y quien
--     tenga el modulo Personal (nomina).
--   - Los demas leen app.empleados_basico: nombre, cedula, cargo, telefono,
--     correo, estado y fechas. Es lo que necesitan Obras, Horarios e Informes
--     para asignar y nombrar al personal. Nada de pago.
--   - Dar de alta a un empleado desde Obras u Horarios sigue igual (insert).
--     Modificar o borrar uno es solo de Personal. Reactivar a un inactivo
--     desde Obras u Horarios va por app.reactivar_empleado().
--
-- La aplicacion lee la vista cuando la persona no tiene Personal y no intenta
-- modificar empleados existentes (src/lib/backend/dataService.js).
--
-- Es idempotente: se puede volver a ejecutar sin error.

-- ── La vista sin datos de pago ───────────────────────────────────────────────
-- Corre con los permisos de su dueño (no los de quien consulta), asi que no
-- depende de la politica de lectura de la tabla; filtra por empresa ella misma.
create or replace view app.empleados_basico
with (security_invoker = false)
as
select e.tenant_id, e.id, e.nombre, e.cedula, e.cargo, e.tel, e.email, e.activo,
       e.avatar, e.tipo_contrato, e.fecha_ingreso, e.fecha_salida,
       e.alta_estado, e.alta_creado_por, e.alta_creado_en,
       e.created_at, e.updated_at
  from app.empleados e
 where e.tenant_id in (select app.current_user_tenant_ids());

comment on view app.empleados_basico is
  'Empleados sin datos de pago (salario, banco, cuenta, novedades de nomina). La leen quienes no tienen el modulo Personal.';

revoke all on app.empleados_basico from anon, public;
grant select on app.empleados_basico to authenticated;

-- ── Politicas de la tabla completa ───────────────────────────────────────────
drop policy if exists empleados_leer on app.empleados;
drop policy if exists empleados_escribir on app.empleados;
drop policy if exists empleados_tenant_all on app.empleados;
drop policy if exists empleados_insertar on app.empleados;
drop policy if exists empleados_modificar on app.empleados;
drop policy if exists empleados_borrar on app.empleados;

create policy empleados_leer on app.empleados
for select
using (app.tiene_acceso_modulo(tenant_id, array['nomina']));

-- Alta rapida desde Obras u Horarios. El salario y la cuenta los sigue
-- cuidando el trigger de la migracion 063.
create policy empleados_insertar on app.empleados
for insert
with check (app.puede_escribir(tenant_id, array['nomina','obras','horarios']));

create policy empleados_modificar on app.empleados
for update
using (app.puede_escribir(tenant_id, array['nomina']))
with check (app.puede_escribir(tenant_id, array['nomina']));

create policy empleados_borrar on app.empleados
for delete
using (app.puede_escribir(tenant_id, array['nomina']));

-- ── Reactivar desde Obras u Horarios ─────────────────────────────────────────
create or replace function app.reactivar_empleado(p_tenant uuid, p_id text)
returns boolean
language plpgsql
security definer
set search_path = app, public
as $$
begin
  if not app.puede_escribir(p_tenant, array['nomina','obras','horarios']) then
    raise exception 'No tienes permiso para reactivar empleados.' using errcode = '42501';
  end if;
  update app.empleados
     set activo = true
   where tenant_id = p_tenant and id = p_id;
  return found;
end;
$$;

revoke execute on function app.reactivar_empleado(uuid, text) from public, anon;
grant execute on function app.reactivar_empleado(uuid, text) to authenticated, service_role;

-- Comprobacion: quien ve salarios.
select m.email, m.role,
       (m.role in ('admin','contador') or m.modulos is null or m.modulos && array['nomina']) as ve_salarios
  from app.memberships m
 where coalesce(m.activo, true)
 order by m.email;
