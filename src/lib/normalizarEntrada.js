// Normalizacion de lo que la gente escribe en los formularios.
//
// Los datos que se capturan aqui salen impresos en cotizaciones, informes y
// certificados que ve el cliente. "juan PEREZ  gomez" o " CORREO@X.COM " se
// ven mal en un documento formal, y ademas ensucian las busquedas y los
// listados: "Juan Perez" y "JUAN PEREZ" quedaban como dos personas distintas.
//
// Se aplica al SALIR del campo, no mientras se escribe: corregir tecla a tecla
// mueve el cursor de sitio y pelea con quien esta escribiendo.
//
// Sobre la ortografia: se corrige una LISTA CERRADA de palabras del oficio
// que se escriben mal siempre igual (recidencial, anclage, instalacion sin
// tilde). Lo demas lo subraya el corrector del navegador y lo decide la
// persona: un diccionario del español entero corrigiendo a ciegas haria
// destrozos con marcas y referencias tecnicas.
//
// Los NOMBRES PROPIOS no pasan por esa correccion. "Jose" y "José" no son
// intercambiables en el apellido de alguien, y un cliente que se llama
// "Recidencial S.A.S" tiene derecho a llamarse asi.

// Palabras que dentro de un nombre van en minuscula, salvo al principio.
const CONECTORES = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "da", "do",
]);

// Siglas frecuentes en razones sociales, que deben quedar en mayuscula.
const SIGLAS = new Set([
  "sas", "sa", "ltda", "eu", "sca", "esp", "eps", "arl", "ips", "nit", "cc", "ce",
]);

const limpiarEspacios = (valor) => String(valor ?? "").trim().replace(/\s+/g, " ");

import { corregirOrtografiaLocal } from "./correctorTexto";

// ── Correccion de palabras del oficio y ortografía general ─────────────────
export function corregirPalabras(valor) {
  return corregirOrtografiaLocal(valor);
}

/**
 * Nombres de persona, clientes, ciudades, razones sociales.
 * "  juan   PEREZ gomez " -> "Juan Perez Gomez"
 * "constructora velez sas" -> "Constructora Velez SAS"
 */
export function normalizarNombrePropio(valor) {
  const texto = limpiarEspacios(valor);
  if (!texto) return "";

  return texto
    .split(" ")
    .map((palabra, i) => {
      const plano = palabra.toLowerCase();

      // S.A.S, E.U., iniciales: se respetan en mayuscula.
      if (palabra.includes(".")) return palabra.toUpperCase();
      if (SIGLAS.has(plano.replace(/[^a-z]/g, ""))) return palabra.toUpperCase();
      // Los conectores van en minuscula, pero nunca de primeros.
      if (i > 0 && CONECTORES.has(plano)) return plano;
      // Guiones internos: "maria-jose" -> "Maria-Jose".
      return plano
        .split("-")
        .map((parte) => (parte ? parte[0].toUpperCase() + parte.slice(1) : parte))
        .join("-");
    })
    .join(" ");
}

/**
 * Frases y descripciones: primera letra en mayuscula, el resto como lo
 * escribio la persona. No se toca el interior porque ahi puede haber nombres
 * propios, medidas y referencias que no se deben alterar.
 */
export function normalizarFrase(valor) {
  const texto = corregirPalabras(limpiarEspacios(valor));
  if (!texto) return "";
  // Si viene TODO gritado se baja a minuscula; si no, se respeta.
  const base = texto === texto.toUpperCase() && texto.length > 3 ? texto.toLowerCase() : texto;
  return base[0].toUpperCase() + base.slice(1);
}

/**
 * Textos largos de varios parrafos: corrige las palabras del oficio pero
 * RESPETA los saltos de linea.
 *
 * `normalizarFrase` no sirve para estos campos: aplasta todos los espacios en
 * blanco -saltos incluidos- a un solo espacio, asi que un texto escrito en dos
 * bloques quedaba en un parrafo corrido en cuanto se salia del campo. Tampoco
 * baja a minuscula los renglones que van en mayuscula a proposito, como los
 * encabezados de "ACTIVIDADES REALIZADAS" o "DESCRIPCION".
 */
export function normalizarParrafos(valor) {
  const texto = String(valor ?? "");
  if (!texto.trim()) return "";

  const lineas = texto
    .split("\n")
    .map((linea) => {
      let l = corregirPalabras(linea);
      // Limpiar puntos accidentales repetidos ("..", "...")
      l = l.replace(/\.{2,}/g, ".");
      // Limpiar espacios indebidos antes de signos
      l = l.replace(/\s+([.,;:])(?!\d)/g, "$1");
      // Espacio después de coma o punto y coma
      l = l.replace(/([,;:])([A-Za-zÁÉÍÓÚáéíóúñÑ])/g, "$1 $2");
      return l.replace(/[ \t]+/g, " ").trim();
    });

  return lineas
    .join("\n")
    // Varias lineas en blanco seguidas se quedan en una: separan parrafos, y
    // mas de una solo abre huecos en el documento impreso.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const NUMS_FEM = {
  1: "una (1)",
  2: "dos (2)",
  3: "tres (3)",
  4: "cuatro (4)",
  5: "cinco (5)",
  6: "seis (6)",
  7: "siete (7)",
  8: "ocho (8)",
  9: "nueve (9)",
  10: "diez (10)",
  12: "doce (12)",
  15: "quince (15)",
  20: "veinte (20)",
};

const NUMS_MASC = {
  1: "un (1)",
  2: "dos (2)",
  3: "tres (3)",
  4: "cuatro (4)",
  5: "cinco (5)",
  6: "seis (6)",
  7: "siete (7)",
  8: "ocho (8)",
  9: "nueve (9)",
  10: "diez (10)",
  12: "doce (12)",
  15: "quince (15)",
  20: "veinte (20)",
};

function numTexto(n, fem = true) {
  const num = parseInt(n, 10);
  const mapa = fem ? NUMS_FEM : NUMS_MASC;
  return mapa[num] || String(num);
}

/**
 * Embellece y sintetiza técnicamente las descripciones de actividades de obra
 * para convertirlas en un alcance de certificación impecable.
 */
function embellecerDetalleCertificacion(raw) {
  let str = String(raw || "").trim();
  if (!str) return str;

  // Si ya tiene redacción pulida ("consistentes en:"), no sobreescribir
  if (/consistentes en:/i.test(str)) return str;

  // Limpiar frases repetitivas de notas de campo ("Instalación de líneas de vida...", "Instalación de puntos de anclaje...")
  str = str.replace(/(?:^|[.;])\s*instalaci[oó]n\s+(?:de\s+)?(?:l[ií]neas?\s+de\s+vida|puntos?\s+de\s+anclaje[s]?|sistemas?\s+antica[ií]das?)[.:]?\s*/gi, "; ");

  // Normalizar unidades y metros: "10ml" -> "10 m", "32ml" -> "32 m"
  str = str.replace(/(\d+)\s*(?:ml|mts?|metros?(?:\s+lineales)?)(?!\w)/gi, "$1 m");
  // Número suelto tras "de" antes de "y", coma o punto: "de 45 y" -> "de 45 m y"
  str = str.replace(/\bde\s+(\d+)\s+(y|,|\.)/gi, "de $1 m $2");

  // Estandarizar "puntos de anclajes" -> "puntos de anclaje"
  str = str.replace(/\bpuntos?\s+de\s+anclajes\b/gi, "puntos de anclaje");

  // Limpiar punto y coma inicial si quedó
  str = str.replace(/^;\s*/, "").trim();

  // Dividir por bloques/tramos si hay puntos seguidos o punto y coma
  const rawBloques = str.split(/[;.]\s+/).map((s) => s.trim()).filter(Boolean);

  // Procesar números en palabras
  const bloques = rawBloques.map((bloque) => {
    let b = bloque;
    b = b.replace(/\b1\s+l[ií]nea\b/gi, "una (1) línea");
    b = b.replace(/\b(\d+)\s+l[ií]neas\b/gi, (m, n) => numTexto(n, true) + " líneas");
    b = b.replace(/\b1\s+punto\s+de\s+anclaje\b/gi, "un (1) punto de anclaje");
    b = b.replace(/\b(\d+)\s+puntos?\s+de\s+anclaje\b/gi, (m, n) => numTexto(n, false) + " puntos de anclaje");
    return b;
  });

  if (bloques.length === 0) return raw;

  let finalDetalle = "";
  if (bloques.length === 4) {
    const tramo1 = `${bloques[0]} con ${bloques[1]}`;
    const tramo2 = `${bloques[2]} con ${bloques[3]} adicionales`;
    finalDetalle = `${tramo1}; más ${tramo2}`;
  } else if (bloques.length === 2) {
    if (/puntos?\s+de\s+anclaje/i.test(bloques[1]) && /l[ií]nea/i.test(bloques[0])) {
      finalDetalle = `${bloques[0]} con ${bloques[1]}`;
    } else {
      finalDetalle = `${bloques[0]}; más ${bloques[1]}`;
    }
  } else {
    finalDetalle = bloques.join("; ");
  }

  return "los sistemas de protección contra caídas instalados, consistentes en: " + finalDetalle;
}

/**
 * Reestructura y embellece el texto completo de una certificación (Opción 2 ejecutiva)
 */
function embellecerTextoCompletoCertificacion(texto) {
  const t = String(texto || "").trim();
  if (!t) return t;

  const mVerbo = t.match(/^(CERTIFICA|RECERTIFICA)\s+que\s+/i);
  if (!mVerbo) return t;

  const verbo = mVerbo[1].toUpperCase();
  const afterVerbo = t.slice(mVerbo[0].length);
  const mCierre = afterVerbo.match(/(,\s*cumplen\s+a\s+cabalidad[\s\S]*)$/i);
  const cierre = mCierre ? mCierre[1] : "";
  const cuerpo = mCierre ? afterVerbo.slice(0, mCierre.index) : afterVerbo;

  let remaining = cuerpo;
  let direccion = "";
  const mDir = remaining.match(/(?:,\s*|\s+)con\s+DIRECCI[OÓ]N:\s*(.+)$/i);
  if (mDir) {
    direccion = mDir[1].trim();
    remaining = remaining.slice(0, mDir.index);
  }

  let nit = "";
  let cliente = "";
  const mNit = remaining.match(/(?:,\s*|\s+)con\s+NIT:\s*([0-9kK.\-]+)\s*(?:\(([^)]+)\))?$/i);
  if (mNit) {
    nit = mNit[1].trim();
    cliente = mNit[2] ? mNit[2].trim() : "";
    remaining = remaining.slice(0, mNit.index);
  } else {
    const mClienteDe = remaining.match(/(?:,\s*|\s+)de\s+([^,]+)$/i);
    if (mClienteDe) {
      cliente = mClienteDe[1].trim();
      remaining = remaining.slice(0, mClienteDe.index);
    }
  }

  let lugar = "";
  const mLugar = remaining.match(/(?:,\s*|\s+)instalados\s+en\s+(\([^)]+\)|[^,]+)$/i);
  if (mLugar) {
    lugar = mLugar[1].trim();
    remaining = remaining.slice(0, mLugar.index);
  }

  const rawDetalle = remaining.trim().replace(/[,\s]+$/, "");
  const detalleLindo = embellecerDetalleCertificacion(rawDetalle);

  let resultado = `${verbo} que ${detalleLindo}`;
  if (lugar) resultado += `, instalados en ${lugar.startsWith("(") ? lugar : `(${lugar})`}`;
  if (nit) {
    resultado += ` con NIT: ${nit}`;
    if (cliente) resultado += ` (${cliente.replace(/^\(|\)$/g, "")})`;
  } else if (cliente) {
    resultado += ` de ${cliente}`;
  }
  if (direccion) resultado += ` con DIRECCIÓN: ${direccion}`;
  if (cierre) resultado += cierre;
  else resultado += ", cumplen a cabalidad con la Resolución 4272 de 2021 del Ministerio del Trabajo, por la cual se establece el reglamento de seguridad para protección contra caídas en trabajo en alturas.";

  return resultado;
}

/**
 * Normaliza, reestructura y autocorrige el texto del sistema certificado.
 * Si detecta actividades de campo sin procesar, las sintetiza en un texto
 * técnico y ejecutivo sin repeticiones, estandariza unidades y cita legal.
 */
export function normalizarTextoCertificacion(valor) {
  const texto = String(valor ?? "");
  if (!texto.trim()) return "";

  let res = corregirOrtografiaLocal(texto);

  // Auto-embellecimiento de certificaciones
  res = embellecerTextoCompletoCertificacion(res);

  // 1. Limpiar dobles puntos accidentales ("..", "...")
  res = res.replace(/\.{2,}/g, ".");

  // 2. Limpiar espacios indebidos antes de signos
  res = res.replace(/\s+([.,;:])(?!\d)/g, "$1");

  // 3. Espacio después de coma, punto y coma o dos puntos si va pegado a una letra
  res = res.replace(/([,;:])([A-Za-zÁÉÍÓÚáéíóúñÑ])/g, "$1 $2");

  // 4. Espacio después de punto si no es sigla (evita alterar siglas como "S.A.S" o "E.U.")
  res = res.replace(/(?<!\b[A-Za-zÁÉÍÓÚáéíóúñÑ])\.([A-ZÁÉÍÓÚÑ])/g, ". $1");

  // 5. Limpiar punto suelto antes de "instalados en"
  res = res.replace(/\.\s+(instalad[oa]s? en)\b/gi, ", $1");

  // 6. Estandarización institucional y normativa oficial
  res = res.replace(/\bministerio de[l]? trabajo\b/gi, "Ministerio del Trabajo");
  res = res.replace(/\btrabajo en altura\b/gi, "trabajo en alturas");
  res = res.replace(/\bDIRECCION\b/g, "DIRECCIÓN");
  res = res.replace(/\bRESOLUCION\b/g, "RESOLUCIÓN");
  res = res.replace(/\bCERTIFICACION\b/g, "CERTIFICACIÓN");

  const lineas = res.split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim());
  return lineas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Correos: siempre en minuscula y sin espacios. */
export function normalizarCorreo(valor) {
  return String(valor ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

/** Cedulas, NIT, numeros de cuenta: se quedan digitos, guiones y puntos. */
export function normalizarDocumento(valor) {
  return String(valor ?? "").trim().replace(/[^\d.\-a-zA-Z]/g, "");
}

/** Celulares: solo digitos, con el "+57" y los espacios quitados. */
export function normalizarTelefono(valor) {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  return digitos.startsWith("57") && digitos.length > 10 ? digitos.slice(2) : digitos;
}

/** Referencias y codigos que por convencion van en mayuscula: "fv-2026-01" -> "FV-2026-01" */
export function normalizarCodigo(valor) {
  return limpiarEspacios(valor).toUpperCase();
}

/**
 * Todo en mayuscula, sin espacios de sobra: "Proco Inc" -> "PROCO INC".
 *
 * Se salta a proposito la regla de nombre propio. Es como se vienen
 * escribiendo a mano los datos de identificacion en los documentos de la
 * empresa: el cliente, el proyecto, la ciudad y la direccion de la obra, que
 * despues viajan tal cual a la cotizacion, al informe y al certificado.
 *
 * NO se aplica a los textos largos -descripcion del avance, observaciones,
 * recomendaciones-: un parrafo entero en mayuscula no hay quien lo lea.
 */
export function normalizarMayusculas(valor) {
  return corregirPalabras(limpiarEspacios(valor)).toUpperCase();
}

/** Nombre de la empresa cliente. Mismo criterio, nombre propio del caso. */
export const normalizarRazonSocial = normalizarMayusculas;

// ── Avisos ────────────────────────────────────────────────────────────────
// Revisiones simples sobre datos que despues dan problemas: un correo mal
// escrito hace que la cotizacion no llegue, y un celular de 7 digitos hace
// que el WhatsApp del turno nunca salga. Se avisa, no se bloquea: puede
// haber casos raros legitimos.

export function avisoCorreo(valor) {
  const correo = normalizarCorreo(valor);
  if (!correo) return "";
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(correo)) return "Ese correo no parece completo. Revisa que tenga @ y el punto del dominio.";
  return "";
}

export function avisoCelular(valor) {
  const numero = normalizarTelefono(valor);
  if (!numero) return "";
  if (numero.length !== 10) return "Un celular colombiano tiene 10 dígitos. Sin eso no le llegará el WhatsApp del turno.";
  if (!numero.startsWith("3")) return "Los celulares en Colombia empiezan por 3. Revisa el número.";
  return "";
}

export function avisoNombre(valor) {
  const texto = limpiarEspacios(valor);
  if (!texto) return "";
  if (texto.length < 3) return "El nombre parece muy corto.";
  if (!texto.includes(" ")) return "Escribe el nombre completo, con apellido.";
  if (/\d/.test(texto)) return "El nombre tiene números. Revisa que no se haya colado algo.";
  return "";
}

export function avisoCedula(valor) {
  const doc = String(valor ?? "").replace(/\D/g, "");
  if (!doc) return "";
  if (doc.length < 6) return "La cédula parece muy corta.";
  return "";
}
