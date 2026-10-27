// Saca el texto de un archivo que llega de fuera: la solicitud que manda el
// cliente, una cotizacion vieja en PDF, un correo guardado.
//
// La regla de oro: SI EL ARCHIVO YA TRAE EL TEXTO, NO SE USA IA. Un PDF hecho
// en Word o el que genera este mismo programa lleva las letras dentro; se leen
// tal cual, sin costo, sin esperar y sin riesgo de que un numero se lea mal.
// La IA solo hace falta para interpretar despues QUE significa ese texto, y
// para los escaneados y las fotos, que no tienen letras sino pixeles.
//
// pdf.js pesa cerca de un mega, asi que se carga con import() solo cuando de
// verdad se abre un PDF: quien nunca use el boton no lo descarga.

// Menos de esto no es un documento: es un PDF de puras imagenes -escaneado o
// fotografiado- del que no se saco nada aprovechable.
const MINIMO_CARACTERES = 40;

export const TIPOS_ACEPTADOS = ".pdf,.txt";

// Se usa el build «legacy» de pdf.js: el normal necesita funciones que Safari
// anterior a 18.2 no tiene (Uint8Array.toHex, Map.getOrInsertComputed) y en
// esos Mac no abria ningun PDF. El legacy trae esos remiendos.
async function cargarPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
  // Si el modulo no llega (pasa con la pestaña abierta durante un deploy: el
  // archivo de la version anterior ya no existe), no hay nada que reintentar.
  if (!pdfjs?.getDocument) throw new Error("Hay una versión nueva del sistema: recarga la página e inténtalo otra vez.");
  let workerPropio = null;
  try {
    workerPropio = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  } catch {
    // Queda el del servidor externo.
  }
  return { pdfjs, workerPropio };
}

// Errores del propio archivo: con otro worker daria igual, no se reintenta.
const ERRORES_DEL_ARCHIVO = {
  PasswordException: "Ese PDF está protegido con contraseña. Pídele al cliente una versión sin clave, o ábrelo y guárdalo de nuevo como PDF sin protección.",
  InvalidPDFException: "Ese archivo no es un PDF válido o está dañado. Prueba descargarlo otra vez.",
  FormatError: "Ese PDF está dañado o tiene un formato que no se puede leer. Prueba descargarlo otra vez o pedirlo de nuevo.",
};

export function mensajeErrorPdf(fallo) {
  return ERRORES_DEL_ARCHIVO[fallo?.name] || null;
}

async function abrirPdf(pdfjs, datos, workerSrc, opciones) {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  // Copia de los datos en cada intento: pdf.js los transfiere al worker y el
  // original queda vacio; reintentar con el mismo daba «ArrayBuffer detached».
  const tarea = pdfjs.getDocument({ ...opciones, data: datos.slice() });
  try {
    return await tarea.promise;
  } catch (fallo) {
    try { await tarea.destroy(); } catch { /* ya estaba cerrada */ }
    throw fallo;
  }
}

async function textoDePdf(archivo) {
  const { pdfjs, workerPropio } = await cargarPdfJs();
  const datos = new Uint8Array(await archivo.arrayBuffer());

  const version = pdfjs.version || "6.2.108";
  // Desde el propio sitio (vite.config.js los copia al compilar), no desde
  // un servidor externo: si ese fallaba, no se podia leer ningun PDF.
  const opciones = {
    cMapUrl: new URL("/pdfjs/cmaps/", window.location.origin).href,
    cMapPacked: true,
    standardFontDataUrl: new URL("/pdfjs/standard_fonts/", window.location.origin).href,
  };

  // Primero el worker del propio sitio; el del servidor externo solo si ese
  // falla al arrancar.
  const workers = [
    workerPropio,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`,
  ].filter(Boolean);

  let documento;
  let ultimoFallo;
  for (const workerSrc of workers) {
    try {
      documento = await abrirPdf(pdfjs, datos, workerSrc, opciones);
      break;
    } catch (fallo) {
      ultimoFallo = fallo;
      if (mensajeErrorPdf(fallo)) throw fallo;
      console.warn(`No se pudo abrir el PDF con el worker ${workerSrc}:`, fallo);
    }
  }
  if (!documento) throw ultimoFallo || new Error("No se pudo abrir el PDF.");

  const paginas = [];
  for (let n = 1; n <= documento.numPages; n += 1) {
    const pagina = await documento.getPage(n);
    const contenido = await pagina.getTextContent();
    // Cada `item` es un trozo suelto con su posicion. Se pega respetando los
    // saltos de renglon que marca el propio PDF (`hasEOL`), porque una
    // solicitud viene en lineas y renglon a renglon se entiende mejor.
    const texto = contenido.items
      .map((item) => (item.str ?? "") + (item.hasEOL ? "\n" : " "))
      .join("");
    paginas.push(texto);
  }
  try {
    if (typeof documento?.destroy === "function") {
      documento.destroy();
    } else if (typeof documento?.cleanup === "function") {
      documento.cleanup();
    }
  } catch (errLimpieza) {
    console.warn("No se pudo invocar limpieza de documento PDF:", errLimpieza);
  }

  return paginas.join("\n\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Texto de un .txt. Se intenta UTF-8; si trae caracteres que no son UTF-8
 * (los .txt que guarda el Bloc de notas viejo o Excel en Windows vienen en
 * Windows-1252), se relee asi para no mostrar «Bogot�».
 */
export function textoPlano(buffer) {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("�")) return utf8;
  try {
    return new TextDecoder("windows-1252").decode(buffer);
  } catch {
    return utf8;
  }
}

/**
 * Devuelve el texto del archivo y como se obtuvo.
 * Lanza un Error con un mensaje ya entendible si no se puede.
 */
export async function leerTextoDeArchivo(archivo) {
  if (!archivo) throw new Error("No se escogió ningún archivo.");

  const nombre = String(archivo.name || "").toLowerCase();

  if (nombre.endsWith(".txt")) {
    let texto = "";
    try {
      texto = textoPlano(await archivo.arrayBuffer()).trim();
    } catch (fallo) {
      console.error("No se pudo leer el TXT:", fallo);
      throw new Error("No se pudo leer ese archivo. Si está en iCloud, guárdalo primero en el equipo y súbelo desde esa copia.");
    }
    if (!texto) throw new Error("Ese archivo está vacío.");
    return { texto, comoSeLeyo: "texto", paginas: 1 };
  }

  if (nombre.endsWith(".pdf")) {
    let texto = "";
    try {
      texto = await textoDePdf(archivo);
    } catch (fallo) {
      console.error("No se pudo abrir el PDF:", fallo);
      throw new Error(mensajeErrorPdf(fallo) || `No se pudo leer ese archivo PDF: ${fallo?.message || "puede estar protegido o en un formato no soportado."}`);
    }
    if (texto.length < MINIMO_CARACTERES) {
      throw new Error(
        "Ese PDF no tiene texto dentro: es un escaneado o una foto. " +
        "Por ahora solo se pueden leer los PDF que traen el texto digital, como los generados desde Word o exportados con texto seleccionable.",
      );
    }
    return { texto, comoSeLeyo: "pdf-con-texto" };
  }

  throw new Error("Por ahora solo se pueden leer archivos PDF o TXT.");
}

// ── Datos que se sacan sin IA ────────────────────────────────────────────────
// Un NIT y un correo son patrones, no interpretacion: leerlos con una regla
// acierta siempre y no depende de lo que entienda un modelo. Ademas la funcion
// «armar-cotizacion» no los devuelve, asi que se sacan aqui.

// 800.201.989-3 · 900123456-7 · NIT 901455782
const NIT_REGEX = /\b(?:nit|n\.i\.t|rut|c\.?c\.?)[.:\s]*([\d][\d.,-]{6,15}[\dkK])\b/gi;
const CORREO_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

export function datosSueltos(texto = "") {
  const plano = String(texto || "");
  const nits = [...plano.matchAll(NIT_REGEX)]
    .map((m) => (m[1] || "").replace(/,/g, "").trim())
    .filter((n) => !n.replace(/\D/g, "").startsWith("900193965"));

  const correos = [...plano.matchAll(CORREO_REGEX)]
    .map((m) => (m[0] || "").toLowerCase())
    .filter((c) => !c.includes("ingeanclajes"));

  return {
    nit: nits[0] || "",
    correo: correos[0] || "",
  };
}

/**
 * Parte el texto en trozos marcando los fragmentos que se aprovecharon, para
 * pintarlos de color y que se vea de un golpe que se leyo y que se paso por
 * alto.
 *
 * Solo marca lo que aparece TAL CUAL en el documento. Si la IA reescribio la
 * frase no se encuentra y ese trozo se queda sin marcar: mejor no resaltar
 * nada que señalar el renglon equivocado.
 *
 * @param {string} texto
 * @param {Array<{texto:string, clase:string}>} fragmentos
 * @returns {Array<{texto:string, clase:string|null}>}
 */
export function marcarFragmentos(texto = "", fragmentos = []) {
  const plano = String(texto || "");
  if (!plano) return [];

  const enMinusculas = plano.toLowerCase();
  const tramos = [];

  for (const { texto: buscado, clase } of fragmentos) {
    const aguja = String(buscado || "").trim().toLowerCase();
    if (aguja.length < 3) continue;
    const desde = enMinusculas.indexOf(aguja);
    if (desde === -1) continue;
    const hasta = desde + aguja.length;
    // Si se cruza con algo ya marcado se descarta: dos colores encima del
    // mismo renglon se ven como un error.
    if (tramos.some((t) => desde < t.hasta && hasta > t.desde)) continue;
    tramos.push({ desde, hasta, clase });
  }

  tramos.sort((a, b) => a.desde - b.desde);

  const partes = [];
  let cursor = 0;
  for (const tramo of tramos) {
    if (tramo.desde > cursor) partes.push({ texto: plano.slice(cursor, tramo.desde), clase: null });
    partes.push({ texto: plano.slice(tramo.desde, tramo.hasta), clase: tramo.clase });
    cursor = tramo.hasta;
  }
  if (cursor < plano.length) partes.push({ texto: plano.slice(cursor), clase: null });

  return partes;
}
