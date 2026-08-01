// Presentación de textos que se escriben en MAYÚSCULA SOSTENIDA.
//
// Los formularios se llenan en mayúsculas -"FISCALIA GENERAL DE LA NACION",
// "ISABEL CESPEDES"- porque así se ven bien en el documento impreso. Metidos
// dentro de la frase de un correo suenan a grito y desentonan con el resto.
//
// Aquí solo se cambia cómo se muestran; el dato guardado no se toca.
//
// AVISO: no se recuperan las tildes. Si el dato entró como "NACION", sale como
// "Nacion". Inventarlas seria peor: "Jose" y "José" no son intercambiables en
// un nombre propio.

// Palabras que en español van en minúscula dentro de un nombre, salvo al
// principio.
const MENORES = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "u",
  "en", "para", "por", "con", "a", "al", "un", "una", "sin", "sobre",
]);

// Solo se reescribe lo que viene gritado. Si alguien escribió "Fiscalía General
// de la Nación" con sus tildes, se respeta tal cual.
function vieneEnMayusculas(texto) {
  const letras = texto.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
  if (letras.length < 4) return false;
  return letras === letras.toUpperCase();
}

/** Nombres propios: "FISCALIA GENERAL DE LA NACION" -> "Fiscalia General de la Nacion" */
export function comoNombre(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto || !vieneEnMayusculas(texto)) return texto;

  return texto
    .toLowerCase()
    .split(/\s+/)
    .map((palabra, i) => {
      // Siglas y cosas como S.A.S o NIT se dejan como estaban.
      if (palabra.includes(".") || palabra.length <= 1) return palabra.toUpperCase();
      if (i > 0 && MENORES.has(palabra)) return palabra;
      return palabra[0].toUpperCase() + palabra.slice(1);
    })
    .join(" ");
}

/** Frases: "5 DIAS CALENDARIO DEPENDIENDO..." -> "5 dias calendario dependiendo..." */
export function comoFrase(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto || !vieneEnMayusculas(texto)) return texto;

  const minusculas = texto.toLowerCase();
  // Solo se pone mayuscula si la frase ARRANCA con letra. Cuando empieza por
  // un numero -"5 dias calendario...", "50% anticipo..."- la mayuscula caeria
  // en la segunda palabra, que es peor que no ponerla.
  return /^[a-záéíóúñ]/.test(minusculas)
    ? minusculas[0].toUpperCase() + minusculas.slice(1)
    : minusculas;
}

/** Solo el primer nombre, para saludar: "ISABEL CESPEDES" -> "Isabel" */
export function primerNombre(valor) {
  const texto = comoNombre(valor).trim();
  return texto ? texto.split(/\s+/)[0] : "";
}
