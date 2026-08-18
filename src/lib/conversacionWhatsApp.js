// Limpia una conversación de WhatsApp pegada tal cual, para poder
// interpretarla.
//
// POR QUE HACE FALTA LIMPIARLA: un chat exportado viene lleno de fechas y
// horas -«12/8/26, 8:12 a. m. - María Gómez:»- y de avisos del propio
// WhatsApp. Si eso llega crudo a la IA, los numeros del reloj compiten con las
// cantidades del pedido: «8:12» puede acabar siendo 8 metros. Aqui se dejan
// solo los mensajes, con quien los escribio.
//
// Formatos que se reconocen, que son los que salen en la practica:
//   12/8/26, 8:12 a. m. - María Gómez: texto        (exportar chat, Android)
//   [12/8/26, 8:12:33 a. m.] María Gómez: texto     (exportar chat, iPhone)
//   [8:12, 12/8/2026] María Gómez: texto            (copiar desde WhatsApp Web)
//   María Gómez: texto                              (pegado a mano)
//
// Lo que no encaje en ninguno se conserva igual: es preferible mandarle a la
// IA una linea de mas que perder lo que pidio el cliente.

// Marca de tiempo al principio de la linea, en cualquiera de sus formas.
const FECHA_HORA = new RegExp(
  "^\\s*" +
  "(?:\\[)?" +                                  // corchete opcional
  "(?:\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}[,\\s]+)?" + // fecha, si viene primero
  "\\d{1,2}:\\d{2}(?::\\d{2})?" +                // hora
  "(?:\\s*[ap]\\.?\\s*m\\.?)?" +                 // a. m. / p. m.
  "(?:[,\\s]+\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})?" + // fecha, si viene despues
  "(?:\\])?" +
  "\\s*[-–]?\\s*",
  "i",
);

// Quien escribe: lo que va hasta los dos puntos, si es corto y no parece una
// frase. Asi «María Gómez:» se toma como remitente y «Necesito esto: 120 m»
// no.
const REMITENTE = /^([^:]{1,40}):\s*/;

// Avisos del propio WhatsApp, que no dijo nadie.
const DEL_SISTEMA = [
  /mensajes y las llamadas est[aá]n cifrad/i,
  /cifrado de extremo a extremo/i,
  /se uni[oó] (usando|al grupo)/i,
  /cre[oó] el grupo/i,
  /cambi[oó] (el asunto|la descripci[oó]n|su n[uú]mero)/i,
  /^<?multimedia omitid[oa]>?$/i,
  /^<?archivo adjunto omitid[oa]>?$/i,
  /^(imagen|video|audio|sticker|gif) omitid[oa]$/i,
  /^se elimin[oó] este mensaje$/i,
  /^este mensaje fue eliminado$/i,
  /^null$/i,
];

const esDelSistema = (texto) => DEL_SISTEMA.some((re) => re.test(texto.trim()));

// Conectores que sí van en minuscula dentro de un nombre: «Maria de los
// Angeles», «Juan del Rio».
const CONECTORES = new Set(["de", "del", "la", "las", "los", "y", "da", "do"]);

// Un nombre propio: pocas palabras, sin puntuacion, y todas empezando por
// mayuscula salvo los conectores. Con eso «María Gómez» pasa y «Necesito lo
// siguiente» no.
function esNombrePropio(texto) {
  const limpio = String(texto || "").trim();
  if (!limpio || /[.,;?!¿¡]/.test(limpio)) return false;

  const palabras = limpio.split(/\s+/);
  if (palabras.length > 4) return false;

  return palabras.every((palabra, i) => {
    if (i > 0 && CONECTORES.has(palabra.toLowerCase())) return true;
    const primera = palabra[0] || "";
    // Se compara con toLowerCase para que funcione con tildes y con la Ñ.
    return primera !== primera.toLowerCase();
  });
}

/**
 * Devuelve los mensajes de la conversacion, en orden.
 * [{ quien, texto }]
 */
export function leerConversacion(pegado) {
  const lineas = String(pegado || "").replace(/\r/g, "").split("\n");
  const mensajes = [];

  for (const cruda of lineas) {
    const linea = cruda.trim();
    if (!linea) continue;

    const sinFecha = linea.replace(FECHA_HORA, "");
    const teniaFecha = sinFecha !== linea;

    const conRemitente = sinFecha.match(REMITENTE);
    // Un remitente solo se reconoce si la linea traia marca de tiempo, o si lo
    // que hay antes de los dos puntos parece un NOMBRE PROPIO.
    //
    // Con pedir solo que fuera corto no bastaba: «Necesito lo siguiente: 120
    // metros de linea de vida» tomaba «Necesito lo siguiente» por remitente y
    // partia la frase justo donde estaba el pedido.
    const pareceNombre = conRemitente && esNombrePropio(conRemitente[1]);

    if (conRemitente && (teniaFecha || pareceNombre)) {
      const quien = conRemitente[1].trim();
      const texto = sinFecha.slice(conRemitente[0].length).trim();
      if (texto && !esDelSistema(texto)) mensajes.push({ quien, texto });
      continue;
    }

    if (esDelSistema(sinFecha)) continue;

    // Continuacion de un mensaje de varias lineas.
    if (mensajes.length) {
      mensajes[mensajes.length - 1].texto += "\n" + sinFecha;
    } else {
      mensajes.push({ quien: "", texto: sinFecha });
    }
  }

  return mensajes;
}

/** Quienes hablan, de mas a menos veces. */
export function participantes(mensajes) {
  const cuenta = new Map();
  for (const m of mensajes) {
    if (!m.quien) continue;
    cuenta.set(m.quien, (cuenta.get(m.quien) || 0) + 1);
  }
  return [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([quien, veces]) => ({ quien, veces }));
}

/**
 * El texto que se le manda a la IA: sin horas, sin avisos del sistema y con
 * quien habla delante de cada mensaje.
 */
export function textoParaInterpretar(mensajes) {
  return mensajes
    .map((m) => (m.quien ? `${m.quien}: ${m.texto}` : m.texto))
    .join("\n");
}

/** Un telefono colombiano suelto en la conversacion, si lo hay. */
export function telefonoEnTexto(texto) {
  const encontrado = String(texto || "").match(/\b(?:\+?57[\s-]?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/);
  return encontrado ? encontrado[0].replace(/\D/g, "").slice(-10) : "";
}
