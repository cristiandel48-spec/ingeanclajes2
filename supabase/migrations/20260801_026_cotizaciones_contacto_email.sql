-- Correo de la persona de contacto del cliente.
--
-- Hacia falta para poder enviarle la cotizacion por correo: el formulario
-- guardaba su nombre y su telefono, pero no su direccion electronica.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.cotizaciones add column if not exists contacto_email text;

comment on column app.cotizaciones.contacto_email is
  'Correo de la persona de contacto. A esta direccion se envia la cotizacion formalizada.';

-- Comprobacion
select id, numero, cliente, contacto, contacto_email
from app.cotizaciones
order by numero;
