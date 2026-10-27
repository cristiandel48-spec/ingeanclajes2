-- Migracion 081: acta de entrega de obra (FORM-SST-89).
--
-- POR QUE: el acta la llenaba a mano en la obra quien entrega -el lider de
-- proyecto o la coordinadora SST- con datos que el programa ya tiene: el
-- cliente, lo cotizado, las fechas de la bitacora y quien estuvo. Copiarlos a
-- mano se equivoca, la hoja se moja y se pierde, y cuando el cliente reclama
-- meses despues no hay con que responder.
--
-- COMO SE GUARDA: dentro de la obra, en `actas`, igual que la bitacora. Un
-- acta es un documento de SU obra, no una entidad suelta: no tiene sentido
-- sin ella y se borra con ella. Cada acta es un objeto JSON con sus casillas
-- (contratante, objetivo, sistemas, colaboradores, descripcion, quien recibe).
--
-- Tambien se habilita el tipo «acta» en la firma de recibido (migracion 076),
-- para que el cliente la firme desde su celular igual que firma el informe.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.obras
  add column if not exists actas jsonb not null default '[]'::jsonb;

comment on column app.obras.actas is
  'Actas de entrega de la obra (FORM-SST-89). Arreglo de objetos JSON; ver src/lib/actaEntrega.js.';

-- La restriccion de la 076 solo admitia informe, cotizacion y certificado.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'app.firmas_documento'::regclass
      and conname = 'firmas_documento_tipo_documento_check'
  ) then
    alter table app.firmas_documento
      drop constraint firmas_documento_tipo_documento_check;
  end if;

  alter table app.firmas_documento
    add constraint firmas_documento_tipo_documento_check
    check (tipo_documento in ('informe', 'cotizacion', 'certificado', 'acta'));
exception
  -- Si todavia no se corrio la migracion 076 no hay tabla que ajustar.
  when undefined_table then null;
end $$;
