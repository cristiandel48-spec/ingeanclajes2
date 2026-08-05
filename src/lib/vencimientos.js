// Reglas de vencimiento de certificaciones, compartidas por el Dashboard y la
// pantalla de Vencimientos. Estaban escritas dentro de la pantalla, asi que el
// Dashboard no podia avisar de nada; ahora ambos usan los mismos umbrales.

export const UMBRAL_URGENTE = 30;   // dias
export const UMBRAL_PROXIMO = 90;   // dias

// Devuelve las certificaciones pendientes con los dias que faltan para el
// proximo mantenimiento, de la mas urgente a la menos. `diasRestantes` en null
// significa que la certificacion no tiene fecha registrada.
export function calcularVencimientos(certs = [], hoy = new Date()) {
  const referencia = new Date(hoy);
  referencia.setHours(12, 0, 0, 0);

  return (Array.isArray(certs) ? certs : [])
    .filter((cert) => cert?.estado !== "Recertificado")
    .map((cert) => {
      if (!cert?.proxMant) return { ...cert, diasRestantes: null };
      const fecha = new Date(cert.proxMant + "T12:00:00");
      if (Number.isNaN(fecha.getTime())) return { ...cert, diasRestantes: null };
      return {
        ...cert,
        diasRestantes: Math.round((fecha - referencia) / (1000 * 60 * 60 * 24)),
      };
    })
    .sort((a, b) => {
      if (a.diasRestantes === null) return 1;
      if (b.diasRestantes === null) return -1;
      return a.diasRestantes - b.diasRestantes;
    });
}

export function colorVencimiento(dias) {
  if (dias === null) return "#667085";
  if (dias < 0) return "#cc0000";
  if (dias < UMBRAL_URGENTE) return "#fb923c";
  if (dias < UMBRAL_PROXIMO) return "#b54708";
  return "#101828";
}

export function etiquetaVencimiento(dias) {
  if (dias === null) return "Sin fecha";
  if (dias < 0) return `VENCIDA hace ${Math.abs(dias)}d`;
  if (dias === 0) return "VENCE HOY";
  if (dias === 1) return "Vence mañana";
  return `${dias} días`;
}

export const GRUPOS_VENCIMIENTO = [
  { titulo: "Vencidas o críticas", filtro: (d) => d !== null && d < 0, color: "#cc0000" },
  { titulo: `Urgente (menos de ${UMBRAL_URGENTE} días)`, filtro: (d) => d !== null && d >= 0 && d < UMBRAL_URGENTE, color: "#fb923c" },
  { titulo: `Próximas (${UMBRAL_URGENTE}-${UMBRAL_PROXIMO} días)`, filtro: (d) => d !== null && d >= UMBRAL_URGENTE && d < UMBRAL_PROXIMO, color: "#b54708" },
  { titulo: `Al día (más de ${UMBRAL_PROXIMO} días)`, filtro: (d) => d !== null && d >= UMBRAL_PROXIMO, color: "#101828" },
];

// Resumen para el Dashboard: cuantas hay en cada estado y las mas urgentes.
export function resumenVencimientos(certs = [], hoy = new Date(), cuantasMostrar = 3) {
  const lista = calcularVencimientos(certs, hoy);
  const conFecha = lista.filter((cert) => cert.diasRestantes !== null);

  const vencidas = conFecha.filter((cert) => cert.diasRestantes < 0);
  const urgentes = conFecha.filter((cert) => cert.diasRestantes >= 0 && cert.diasRestantes < UMBRAL_URGENTE);
  const proximas = conFecha.filter((cert) => cert.diasRestantes >= UMBRAL_URGENTE && cert.diasRestantes < UMBRAL_PROXIMO);
  const sinFecha = lista.filter((cert) => cert.diasRestantes === null);

  return {
    lista,
    vencidas,
    urgentes,
    proximas,
    sinFecha,
    // Lo que merece atencion ya: vencidas primero, luego las urgentes.
    requierenAccion: [...vencidas, ...urgentes],
    destacadas: [...vencidas, ...urgentes].slice(0, cuantasMostrar),
    hayAlgoQueHacer: vencidas.length + urgentes.length > 0,
  };
}
