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

/**
 * Normaliza y autocorrige el texto del sistema certificado (o campos técnicos extensos).
 * Corrige ortografía técnica, tildes, dobles puntos accidentales (".."), estandariza citas
 * normativas ("Ministerio del Trabajo", "Resolución", "trabajo en alturas", etc.)
 * y organiza la puntuación.
 */
export function normalizarTextoCertificacion(valor) {
  const texto = String(valor ?? "");
  if (!texto.trim()) return "";

  let res = corregirOrtografiaLocal(texto);

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
