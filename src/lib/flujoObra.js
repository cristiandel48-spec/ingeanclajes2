// Estado de una obra dentro del flujo automatico del sistema:
//
//   cotizacion  ->  aprobar  ->  obra  ->  informe de actividades
//                                      ->  certificacion
//
// El certificado y el informe se alimentan de la obra, asi que antes de
// generarlos hay que revisar que la obra este completa. Esta funcion es la
// unica fuente de esa verdad: la usan la guia del detalle de obra y los avisos
// de las pantallas de certificaciones e informes.

// Estados por los que pasa una obra. Se quito "Pagado": el cobro se lleva en
// cuentas por cobrar, y tener aqui un estado de plata mezclado con el avance
// del trabajo confundia -una obra terminada y sin cobrar no sabia cual poner-.
export const ESTADOS_OBRA = ["Cotización", "En Obra", "Finalizado"];

// ── El trabajo y la plata son dos cosas ──────────────────────────────────────
//
// «Pagado» se habia quitado de esta lista, pero la pantalla de pagos seguia
// escribiendolo encima del estado al saldar una obra. Quedaban dos verdades en
// el mismo campo y se estorbaban:
//
//   - Una obra EN CURSO que el cliente pagaba por adelantado pasaba a
//     "Pagado" y desaparecia de las obras activas, aunque siguiera abierta.
//   - Una obra terminada y sin cobrar no sabia cual de los dos poner.
//
// Ahora el estado dice solo como va el TRABAJO. Como va el COBRO no se guarda
// en ninguna columna: se calcula del saldo, que es el que mantienen los
// abonos. Un dato calculado no se puede desincronizar del que manda.

export const ESTADOS_COBRO = ["Sin cobrar", "Abonado", "Cobrado"];

/**
 * Como va el cobro de una obra, deducido de lo que lleva pagado.
 * Devuelve "" cuando la obra no tiene valor y no hay nada que cobrar.
 */
export function estadoCobroDe(obra) {
  const total = Number(obra?.total || 0);
  if (total <= 0) return "";
  const pagado = Number(obra?.pagado || 0);
  const saldo = Number(obra?.saldo ?? Math.max(0, total - pagado));
  if (saldo <= 0) return "Cobrado";
  return pagado > 0 ? "Abonado" : "Sin cobrar";
}

/**
 * El estado del trabajo, sin la plata.
 *
 * Las obras guardadas antes de la separacion pueden tener "Pagado" en el
 * campo. Se leen como "Finalizado": se marcaban al saldar, y solo se saldaba
 * lo que ya estaba entregado. El cobro de esas obras no se pierde -sigue en el
 * saldo-, solo deja de ocupar el sitio del avance.
 */
export function estadoObraDe(obra) {
  const estado = String(obra?.estado || "").trim();
  if (estado === "Pagado") return "Finalizado";
  return estado || "En Obra";
}

/**
 * Una obra terminada no se sigue editando: los informes y los certificados que
 * salen de ella se apoyan en lo que dice, y cambiarla despues deja documentos
 * ya entregados diciendo algo distinto de lo que hay guardado.
 *
 * Esto responde SOLO por el estado de la obra. Quien llama decide si la
 * persona puede saltarselo -esAdmin(membresia) en lib/permisos-.
 */
export function obraEstaCerrada(obra) {
  return estadoObraDe(obra) === "Finalizado";
}

// Lo que no se puede tocar en una obra cerrada. El cobro NO esta aqui a
// proposito: a uno le siguen pagando despues de entregar, y ese es justo el
// momento en que hay que poder registrar el abono.
export const CAMPOS_BLOQUEADOS = [
  "estado", "avance", "cliente", "proyecto", "ciudad", "direccion",
  "total", "costos", "fechaInicio", "fechaFin", "bitacora",
];

// La obra al 100% esta terminada, asi que el estado se pone solo: nadie tiene
// que acordarse de mover el desplegable, que era justo lo que se olvidaba y
// dejaba obras al 100% sin poder certificar.
export function estadoSegunAvance(avance, estadoActual) {
  const n = Number(avance) || 0;
  if (n >= 100) return "Finalizado";
  // Al bajar del 100% vuelve a estar en curso, no se queda "Finalizado".
  // Se compara con el estado ya limpio para que una obra vieja en "Pagado"
  // tampoco se quede clavada.
  if (estadoObraDe({ estado: estadoActual }) === "Finalizado") return "En Obra";
  return estadoActual;
}

export function getEstadoFlujoObra(obra) {
  const total = Number(obra?.total || 0);
  const pagado = Number(obra?.pagado || 0);
  const saldo = Number(obra?.saldo ?? Math.max(0, total - pagado));
  const avance = Number(obra?.avance || 0);

  return {
    total,
    pagado,
    saldo,
    avance,
    estaPagada: total > 0 && saldo <= 0,
    estadoCobro: estadoCobroDe(obra),
    // La certificacion se hace sobre trabajo terminado.
    estaTerminada: avance >= 100 || estadoObraDe(obra) === "Finalizado",
  };
}
