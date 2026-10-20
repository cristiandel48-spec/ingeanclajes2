-- Migracion 063: permisos por modulo en la base, fase 1.
--
-- Hasta ahora las politicas solo comprobaban que el usuario perteneciera a la
-- empresa. Los modulos y el rol se aplicaban unicamente en la pantalla: con
-- las herramientas del navegador, cualquier usuario podia leer y modificar la
-- contabilidad, los pagos, las nominas y las cuentas bancarias del personal.
-- Ademas, un usuario desactivado conservaba todo su acceso a la base.
--
-- Esta fase cierra lo mas sensible sin tocar los modulos que se cruzan entre
-- si (obras, cotizaciones, informes, certificados), que quedan para la fase 2:
--
--   1. Un usuario desactivado ya no ve ni escribe nada.
--   2. Pagos: administrador, contador o quien tenga el modulo «pagos».
--   3. Contabilidad (configuracion, plan de cuentas, asientos): administrador,
--      contador o quien tenga el modulo «contabilidad».
--   4. Nominas generadas: administrador, contador o quien tenga «nomina».
--   5. Salario, banco, tipo y numero de cuenta de un empleado: solo los cambia
--      administrador, contador o quien tenga «nomina». El alta rapida desde
--      Obras u Horarios sigue funcionando (llega sin cuenta bancaria).
--
-- La aplicacion aplica las mismas reglas (src/lib/permisos.js,
-- ENTIDADES_RESTRINGIDAS) para no intentar guardar lo que la base rechazaria:
-- un rechazo detiene el autoguardado completo de esa persona.
--
-- Es idempotente: se puede volver a ejecutar sin error.

-- ── 1. Usuarios desactivados ─────────────────────────────────────────────────
-- Todas las politicas por empresa dependen de esta funcion.
create or replace function app.current_user_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = app, public
as $$
  select m.tenant_id
  from app.memberships m
  where m.user_id = auth.uid()
    and coalesce(m.activo, true);
$$;

-- ── Funcion de acceso por modulo ─────────────────────────────────────────────
-- Igual que modulosPermitidos() en la aplicacion: modulos null = todos.
create or replace function app.tiene_acceso_modulo(p_tenant uuid, p_modulos text[])
returns boolean
language sql
stable
security definer
set search_path = app, public
as $$
  select exists (
    select 1
      from app.memberships m
     where m.user_id = auth.uid()
       and m.tenant_id = p_tenant
       and coalesce(m.activo, true)
       and (m.role in ('admin', 'contador') or m.modulos is null or m.modulos && p_modulos)
  );
$$;

revoke execute on function app.tiene_acceso_modulo(uuid, text[]) from public, anon;
grant execute on function app.tiene_acceso_modulo(uuid, text[]) to authenticated, service_role;

-- ── 2. Pagos ─────────────────────────────────────────────────────────────────
drop policy if exists pagos_tenant_all on app.pagos;
drop policy if exists pagos_por_modulo on app.pagos;
create policy pagos_por_modulo on app.pagos
for all
using (app.tiene_acceso_modulo(tenant_id, array['pagos']))
with check (app.tiene_acceso_modulo(tenant_id, array['pagos']));

-- ── 3. Contabilidad ──────────────────────────────────────────────────────────
drop policy if exists contabilidad_config_tenant_all on app.contabilidad_config;
drop policy if exists contabilidad_config_por_modulo on app.contabilidad_config;
create policy contabilidad_config_por_modulo on app.contabilidad_config
for all
using (app.tiene_acceso_modulo(tenant_id, array['contabilidad']))
with check (app.tiene_acceso_modulo(tenant_id, array['contabilidad']));

drop policy if exists plan_cuentas_tenant_all on app.plan_cuentas;
drop policy if exists plan_cuentas_por_modulo on app.plan_cuentas;
create policy plan_cuentas_por_modulo on app.plan_cuentas
for all
using (app.tiene_acceso_modulo(tenant_id, array['contabilidad']))
with check (app.tiene_acceso_modulo(tenant_id, array['contabilidad']));

drop policy if exists asientos_contables_tenant_all on app.asientos_contables;
drop policy if exists asientos_contables_por_modulo on app.asientos_contables;
create policy asientos_contables_por_modulo on app.asientos_contables
for all
using (app.tiene_acceso_modulo(tenant_id, array['contabilidad']))
with check (app.tiene_acceso_modulo(tenant_id, array['contabilidad']));

-- ── 4. Nominas generadas ─────────────────────────────────────────────────────
drop policy if exists nominas_generadas_tenant_all on app.nominas_generadas;
drop policy if exists nominas_generadas_por_modulo on app.nominas_generadas;
create policy nominas_generadas_por_modulo on app.nominas_generadas
for all
using (app.tiene_acceso_modulo(tenant_id, array['nomina']))
with check (app.tiene_acceso_modulo(tenant_id, array['nomina']));

-- ── 5. Datos de pago del personal ────────────────────────────────────────────
-- La tabla de empleados la siguen leyendo y escribiendo todos (Obras y
-- Horarios la usan para asignar personal). Lo que se protege es el cambio de
-- salario y cuenta bancaria: es lo que permitiria desviar una nomina.
create or replace function app.proteger_pago_empleado()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
begin
  -- Sin sesion (panel de Supabase, funciones del servidor) o con permiso de
  -- nomina: pasa.
  if auth.uid() is null or app.tiene_acceso_modulo(new.tenant_id, array['nomina']) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- La aplicacion guarda con upsert: un empleado que ya existe llega primero
    -- como INSERT. Ese caso lo decide el trigger de UPDATE.
    if exists (select 1 from app.empleados e where e.tenant_id = new.tenant_id and e.id = new.id) then
      return new;
    end if;
    if coalesce(new.numero_cuenta, '') <> '' then
      raise exception 'Solo quien tiene el modulo Personal puede registrar la cuenta bancaria de un empleado.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.salario is distinct from old.salario
     or new.banco is distinct from old.banco
     or new.tipo_cuenta is distinct from old.tipo_cuenta
     or new.numero_cuenta is distinct from old.numero_cuenta then
    raise exception 'Solo quien tiene el modulo Personal puede cambiar el salario o la cuenta bancaria de un empleado.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_pago_empleado_ins on app.empleados;
create trigger trg_proteger_pago_empleado_ins
before insert on app.empleados
for each row execute function app.proteger_pago_empleado();

drop trigger if exists trg_proteger_pago_empleado_upd on app.empleados;
create trigger trg_proteger_pago_empleado_upd
before update on app.empleados
for each row execute function app.proteger_pago_empleado();

-- Comprobacion: quien queda con acceso a cada area.
select m.email, m.role, m.activo,
       (m.role in ('admin','contador') or m.modulos is null or m.modulos && array['pagos'])        as pagos,
       (m.role in ('admin','contador') or m.modulos is null or m.modulos && array['contabilidad']) as contabilidad,
       (m.role in ('admin','contador') or m.modulos is null or m.modulos && array['nomina'])       as nomina
  from app.memberships m
 order by m.email;
