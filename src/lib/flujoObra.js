// Estado de una obra dentro del flujo automatico del sistema:
//
//   cotizacion  ->  aprobar  ->  obra  ->  informe de actividades
//                                      ->  certificacion
//
// El certificado y el informe se alimentan de la obra, asi que antes de
// generarlos hay que revisar que la obra este completa. Esta funcion es la
// unica fuente de esa verdad: la usan la guia del detalle de obra y los avisos
// de las pantallas de certificaciones e informes.

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
