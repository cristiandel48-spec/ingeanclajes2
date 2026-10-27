-- Migracion 082: cedula y cargo del contacto que recibe en clientes y obras.
--
-- Permite que al registrar la cedula y el cargo de quien recibe el acta en una obra,
-- estos datos queden guardados en la tabla `clientes` (contacto_cedula, contacto_cargo)
-- y en la tabla `obras` (recibe_documento, recibe_cargo).

alter table app.clientes
  add column if not exists contacto_cedula text,
  add column if not exists contacto_cargo text;

comment on column app.clientes.contacto_cedula is 'Cedula del contacto de quien recibe en el cliente.';
comment on column app.clientes.contacto_cargo is 'Cargo del contacto de quien recibe en el cliente.';

alter table app.obras
  add column if not exists recibe_documento text,
  add column if not exists recibe_cargo text;

comment on column app.obras.recibe_documento is 'Documento de quien recibe la obra / actas.';
comment on column app.obras.recibe_cargo is 'Cargo de quien recibe la obra / actas.';
