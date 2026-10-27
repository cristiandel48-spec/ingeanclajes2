-- ======================================================
-- MIGRACIÓN 080: QUITAR ESTRELLITAS
-- Con la 075 una fila de la agenda solo la borra su dueño (usuario_id). Las
-- estrellitas viejas se le asignaron a la cuenta cristiandel48@gmail.com: si
-- Cristian entra con otra cuenta, o un administrador quiere quitarlas, la base
-- no las borra. Y no avisa: un DELETE que RLS no deja pasar borra cero filas
-- sin error, así que la estrellita desaparecía en pantalla y volvía al
-- recargar.
--
-- Ahora una estrellita (id ESP-...) la puede borrar también un administrador
-- de la empresa o el dueño del sistema. Los demás compromisos siguen siendo
-- solo de quien los creó. Leer no cambia: las estrellitas las siguen viendo
-- solo quien las puso y Camila. Como un DELETE con filtro también pasa por la
-- política de lectura, el administrador solo borra las que ve (las suyas o las
-- compartidas con su cuenta).
--
-- Es idempotente: se puede volver a ejecutar sin error.
-- ======================================================

drop policy if exists agenda_privada_borrar on app.agenda;
create policy agenda_privada_borrar on app.agenda
for delete
using (
  app.puede_escribir(tenant_id, array['agenda'])
  and (
    usuario_id = (select auth.uid())
    or (id like 'ESP-%' and (app.es_admin(tenant_id) or app.es_dueno()))
  )
);
