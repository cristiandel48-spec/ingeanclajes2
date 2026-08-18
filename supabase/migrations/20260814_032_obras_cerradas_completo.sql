-- Amplia el bloqueo de las obras cerradas a TODO lo que no sea plata.
--
-- La version anterior (031) enumeraba los campos a proteger y se dejo fuera
-- varios que si son contenido de la obra: la bitacora -el avance del dia con
-- sus fotos, que son las que salen impresas en el informe-, los planos, los
-- trazos y las mediciones. Con una cuenta de Coordinador se podia entrar a una
-- obra ya entregada y borrar una foto.
--
-- El fallo de fondo era el planteamiento: una lista de lo que se protege se
-- queda corta en cuanto la tabla crece. Ahora se da la vuelta y se enumera lo
-- UNICO que se deja pasar, que es corto y no va a crecer:
--
--   pagado, saldo   la plata, que sigue entrando despues de entregar
--   updated_at      lo pone la propia base
--
-- Todo lo demas de una obra finalizada se queda como estaba, salvo que quien
-- guarde sea administrador. El dia que se agregue una columna a app.obras
-- queda protegida sola, sin que nadie tenga que acordarse de nada.
--
-- Es idempotente: se puede volver a ejecutar sin error.

create or replace function app.proteger_obra_cerrada()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_pagado numeric(14,2);
  v_saldo  numeric(14,2);
begin
  -- Solo protege lo que YA estaba entregado. Cerrar una obra por primera vez
  -- -pasarla a Finalizado- es un cambio normal y no se estorba.
  if coalesce(old.estado, '') <> 'Finalizado' then
    return new;
  end if;

  if app.es_admin(old.tenant_id) then
    return new;
  end if;

  -- Lo unico que se respeta de lo que llega: el cobro. A uno le siguen pagando
  -- despues de entregar, y ese es justo el momento de registrar el abono.
  v_pagado := new.pagado;
  v_saldo  := new.saldo;

  -- El resto vuelve a ser la fila guardada.
  new := old;

  new.pagado     := v_pagado;
  new.saldo      := v_saldo;
  new.updated_at := now();

  return new;
end;
$$;

comment on function app.proteger_obra_cerrada() is
  'De una obra ya finalizada solo se deja cambiar el cobro (pagado y saldo). '
  'Todo lo demas vuelve al valor guardado, salvo que quien escriba sea '
  'administrador. No lanza error a proposito: la aplicacion guarda por lotes '
  'y un error tumbaria el lote entero.';

-- El disparador ya existe desde la 031; se rehace por si esta migracion se
-- ejecuta sobre una base donde no se corrio aquella.
drop trigger if exists proteger_obra_cerrada on app.obras;
create trigger proteger_obra_cerrada
  before update on app.obras
  for each row
  execute function app.proteger_obra_cerrada();
