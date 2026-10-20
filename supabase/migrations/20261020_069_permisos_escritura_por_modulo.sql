-- Migracion 069: permisos por modulo en la base, fase 2 (escritura).
--
-- Hasta ahora, en las tablas operativas, cualquier miembro de la empresa podia
-- crear, cambiar o borrar cualquier registro desde las herramientas del
-- navegador, aunque no tuviera el modulo. Aqui cada tabla solo se MODIFICA
-- desde los modulos que la usan, incluidos los cruces que hace la aplicacion:
--
--   obras             obras, cotizacion (al aprobar), horarios, clientes (renombrar)
--   cotizaciones      cotizacion, obras, clientes (renombrar)
--   clientes          clientes, cotizacion
--   certificaciones   certificaciones, vencimientos, clientes (renombrar)
--   informes          informes
--   horarios          horarios, obras
--   cuentas_por_pagar obras (gastos de obra), pagos
--   empleados, cargos nomina, obras, horarios (alta rapida; el salario y la
--                     cuenta los sigue protegiendo el trigger de la migracion 063)
--   agenda            agenda
--   proveedores,
--   ordenes_compra    pagos
--
-- El administrador y el contador escriben en todo, como siempre. El rol
-- Consulta queda de solo lectura.
--
-- LEER se sigue permitiendo a todos los miembros: son datos operativos de la
-- propia empresa y las pantallas los cruzan (Informes lee obras, cotizaciones,
-- empleados y horarios). Restringir la lectura romperia esas pantallas.
--
-- La aplicacion aplica las mismas reglas (src/lib/permisos.js,
-- ENTIDADES_ESCRITURA) para no intentar guardar lo que la base rechazaria.
--
-- Es idempotente: se puede volver a ejecutar sin error.

create or replace function app.puede_escribir(p_tenant uuid, p_modulos text[])
returns boolean
language sql
stable
security definer
set search_path = app, public
as $$
  select app.tiene_acceso_modulo(p_tenant, p_modulos)
     and not exists (
       select 1 from app.memberships m
        where m.user_id = auth.uid() and m.tenant_id = p_tenant and m.role = 'viewer'
     );
$$;

revoke execute on function app.puede_escribir(uuid, text[]) from public, anon;
grant execute on function app.puede_escribir(uuid, text[]) to authenticated, service_role;

-- Cambia las politicas de una tabla: leer = cualquier miembro; escribir =
-- quien tenga alguno de los modulos. Se borran las politicas anteriores, que
-- dejaban todo a todos.
create or replace function app._aplicar_permisos_escritura(p_tabla text, p_modulos text[], p_viejas text[])
returns void
language plpgsql
as $$
declare
  v text;
begin
  foreach v in array p_viejas loop
    execute format('drop policy if exists %I on app.%I', v, p_tabla);
  end loop;
  execute format('drop policy if exists %I on app.%I', p_tabla || '_leer', p_tabla);
  execute format('drop policy if exists %I on app.%I', p_tabla || '_escribir', p_tabla);

  execute format(
    'create policy %I on app.%I for select using (tenant_id in (select app.current_user_tenant_ids()))',
    p_tabla || '_leer', p_tabla);
  execute format(
    'create policy %I on app.%I for all using (app.puede_escribir(tenant_id, %L::text[])) with check (app.puede_escribir(tenant_id, %L::text[]))',
    p_tabla || '_escribir', p_tabla, p_modulos, p_modulos);
end;
$$;

select app._aplicar_permisos_escritura('obras',             array['obras','cotizacion','horarios','clientes'], array['obras_tenant_all']);
select app._aplicar_permisos_escritura('cotizaciones',      array['cotizacion','obras','clientes'],            array['cotizaciones_tenant_all']);
select app._aplicar_permisos_escritura('clientes',          array['clientes','cotizacion'],                    array['clientes_tenant_all']);
select app._aplicar_permisos_escritura('certificaciones',   array['certificaciones','vencimientos','clientes'], array['certificaciones_tenant_all']);
select app._aplicar_permisos_escritura('informes',          array['informes'],                                 array['informes_tenant_all']);
select app._aplicar_permisos_escritura('horarios',          array['horarios','obras'],                         array['horarios_tenant_all']);
select app._aplicar_permisos_escritura('cuentas_por_pagar', array['obras','pagos'],                            array['cuentas_tenant_all']);
select app._aplicar_permisos_escritura('empleados',         array['nomina','obras','horarios'],                array['empleados_tenant_all']);
select app._aplicar_permisos_escritura('cargos',            array['nomina','obras','horarios'],                array['cargos_tenant_all']);
select app._aplicar_permisos_escritura('agenda',            array['agenda'],
  array['agenda_tenant_select','agenda_tenant_insert','agenda_tenant_update','agenda_tenant_delete']);
select app._aplicar_permisos_escritura('proveedores',       array['pagos'],                                    array['proveedores_tenant_all']);
select app._aplicar_permisos_escritura('ordenes_compra',    array['pagos'],
  array['ordenes_compra_tenant_select','ordenes_compra_tenant_insert','ordenes_compra_tenant_update','ordenes_compra_tenant_delete']);

drop function app._aplicar_permisos_escritura(text, text[], text[]);

-- Comprobacion: quien puede modificar cada tabla, por usuario.
select m.email, m.role,
       (m.role in ('admin','contador') or m.modulos is null or m.modulos && array['obras','cotizacion','horarios','clientes']) as obras,
       (m.role in ('admin','contador') or m.modulos is null or m.modulos && array['cotizacion','obras','clientes'])           as cotizaciones,
       (m.role in ('admin','contador') or m.modulos is null or m.modulos && array['certificaciones','vencimientos','clientes']) as certificados,
       (m.role in ('admin','contador') or m.modulos is null or m.modulos && array['informes'])                                as informes,
       (m.role in ('admin','contador') or m.modulos is null or m.modulos && array['agenda'])                                  as agenda
  from app.memberships m
 where coalesce(m.activo, true)
 order by m.email;
