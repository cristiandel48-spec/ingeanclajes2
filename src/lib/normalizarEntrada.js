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
// Lo que esto NO hace: corregir ortografia ni poner tildes que faltan. Para
// eso esta el corrector del navegador (spellCheck), que subraya en rojo y deja
// que la persona decida. Inventar tildes seria peor: "Jose" y "José" no son
// intercambiables en un nombre propio, y "Medellin" escrito sin tilde por el
// cliente no siempre es un error nuestro.

// Palabras que dentro de un nombre van en minuscula, salvo al principio.
const CONECTORES = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "da", "do",
]);

// Siglas frecuentes en razones sociales, que deben quedar en mayuscula.
const SIGLAS = new Set([
  "sas", "sa", "ltda", "eu", "sca", "esp", "eps", "arl", "ips", "nit", "cc", "ce",
]);

const limpiarEspacios = (valor) => String(valor ?? "").trim().replace(/\s+/g, " ");

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
  const texto = limpiarEspacios(valor);
  if (!texto) return "";
  // Si viene TODO gritado se baja a minuscula; si no, se respeta.
  const base = texto === texto.toUpperCase() && texto.length > 3 ? texto.toLowerCase() : texto;
  return base[0].toUpperCase() + base.slice(1);
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
