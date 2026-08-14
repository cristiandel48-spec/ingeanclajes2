// Seguimiento comercial de las cotizaciones enviadas.
//
// El formulario siempre tuvo el campo «Válida (días)», pero no lo leia nadie:
// se guardaba y ahi quedaba. Una cotizacion se enfriaba sin que nadie se
// enterara. Aqui se calcula lo mismo que ya se hace con las certificaciones
// -lib/vencimientos.js- pero con la fecha de la cotizacion y sus dias de
// validez, para que el Dashboard y el listado puedan avisar.
//
// Nada de esto se guarda en la base: se calcula al vuelo cada vez que se
// muestra. Asi el estado de la cotizacion sigue siendo el que puso una
// persona -Pendiente o Aprobada- y no se pisa solo con el paso del tiempo.

// Cuando faltan estos dias o menos, ya toca llamar al cliente.
export const UMBRAL_POR_VENCER = 5;

// Lo que se asume si la cotizacion se guardo sin dias de validez.
export const VALIDEZ_POR_DEFECTO = 30;

// Una cotizacion deja de estar en seguimiento cuando se cierra, para bien o
// para mal. Todo lo demas -lo que sigue Pendiente- es lo que hay que perseguir.
const ESTADOS_CERRADOS = ["Aprobada", "Rechazada", "Anulada"];

export function estaCerrada(cotizacion) {
  return ESTADOS_CERRADOS.includes(String(cotizacion?.estado || "").trim());
}

function aFecha(texto) {
  if (!texto) return null;
  const fecha = new Date(String(texto) + "T12:00:00");
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Los dias de una sola cotizacion. Lo usa el listado para marcar cada fila sin
 * tener que recorrer la lista entera por cada una.
 *
 * `diasParaVencer` en null significa que no tiene fecha -o que ya esta
 * cerrada- y no hay nada que perseguir.
 */
export function seguimientoDe(cotizacion, hoy = new Date()) {
  const nada = { diasParaVencer: null, diasSinRespuesta: null, validezUsada: null };
  if (!cotizacion || estaCerrada(cotizacion)) return nada;

  const emitida = aFecha(cotizacion.fecha);
  if (!emitida) return nada;

  const referencia = new Date(hoy);
  referencia.setHours(12, 0, 0, 0);
  const enDias = (ms) => Math.round(ms / (1000 * 60 * 60 * 24));

  // Un 0 guardado a proposito se respeta; solo se completa lo que falta.
  const validez = Number(cotizacion.val);
  const dias = Number.isFinite(validez) && validez > 0 ? validez : VALIDEZ_POR_DEFECTO;
  const vence = new Date(emitida);
  vence.setDate(vence.getDate() + dias);

  return {
    diasParaVencer: enDias(vence - referencia),
    diasSinRespuesta: enDias(referencia - emitida),
    validezUsada: dias,
  };
}

/**
 * Cotizaciones que siguen pendientes, con los dias que faltan para que se
 * venza la validez y los que llevan sin respuesta. De la mas urgente a la
 * menos.
 */
export function calcularSeguimiento(cotizaciones = [], hoy = new Date()) {
  return (Array.isArray(cotizaciones) ? cotizaciones : [])
    .filter((cotizacion) => cotizacion && !estaCerrada(cotizacion))
    .map((cotizacion) => ({ ...cotizacion, ...seguimientoDe(cotizacion, hoy) }))
    .sort((a, b) => {
      if (a.diasParaVencer === null) return 1;
      if (b.diasParaVencer === null) return -1;
      return a.diasParaVencer - b.diasParaVencer;
    });
}

export function colorSeguimiento(dias) {
  if (dias === null) return "#64748b";
  if (dias < 0) return "#ef4444";
  if (dias <= UMBRAL_POR_VENCER) return "#fb923c";
  return "#4ade80";
}

export function etiquetaSeguimiento(dias) {
  if (dias === null) return "Sin fecha";
  if (dias < 0) return `VENCIDA hace ${Math.abs(dias)}d`;
  if (dias === 0) return "VENCE HOY";
  if (dias === 1) return "Vence mañana";
  return `Vence en ${dias} días`;
}

// Resumen para el Dashboard: cuantas hay en cada grupo y las mas urgentes.
export function resumenSeguimiento(cotizaciones = [], hoy = new Date(), cuantasMostrar = 3) {
  const lista = calcularSeguimiento(cotizaciones, hoy);
  const conFecha = lista.filter((c) => c.diasParaVencer !== null);

  const vencidas = conFecha.filter((c) => c.diasParaVencer < 0);
  const porVencer = conFecha.filter((c) => c.diasParaVencer >= 0 && c.diasParaVencer <= UMBRAL_POR_VENCER);
  const alDia = conFecha.filter((c) => c.diasParaVencer > UMBRAL_POR_VENCER);
  const sinFecha = lista.filter((c) => c.diasParaVencer === null);

  const requierenAccion = [...vencidas, ...porVencer];

  return {
    lista,
    vencidas,
    porVencer,
    alDia,
    sinFecha,
    requierenAccion,
    destacadas: requierenAccion.slice(0, cuantasMostrar),
    hayAlgoQueHacer: requierenAccion.length > 0,
    // El que mas lleva esperando, para poder decirlo en una linea.
    masVieja: vencidas.length
      ? vencidas.reduce((peor, c) => (c.diasSinRespuesta > peor.diasSinRespuesta ? c : peor), vencidas[0])
      : null,
  };
}
