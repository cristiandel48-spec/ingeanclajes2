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

// La obra al 100% esta terminada, asi que el estado se pone solo: nadie tiene
// que acordarse de mover el desplegable, que era justo lo que se olvidaba y
// dejaba obras al 100% sin poder certificar.
export function estadoSegunAvance(avance, estadoActual) {
  const n = Number(avance) || 0;
  if (n >= 100) return "Finalizado";
  // Al bajar del 100% vuelve a estar en curso, no se queda "Finalizado".
  if (estadoActual === "Finalizado") return "En Obra";
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
    // La certificacion se hace sobre trabajo terminado.
    estaTerminada: avance >= 100 || String(obra?.estado || "").toLowerCase() === "finalizado",
  };
}
