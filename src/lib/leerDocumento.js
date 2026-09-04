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

async function cargarPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  try {
    const workerModule = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default || "/pdf.worker.min.mjs";
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjs;
}

async function textoDePdf(archivo) {
  const pdfjs = await cargarPdfJs();
  const datos = new Uint8Array(await archivo.arrayBuffer());

  const version = pdfjs.version || "6.2.108";
  const cMapUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/cmaps/`;
  const standardFontDataUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/standard_fonts/`;

  let documento;
  try {
    documento = await pdfjs.getDocument({
      data: datos,
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
    }).promise;
  } catch (err1) {
    console.warn("Fallo lectura inicial de PDF con worker, reintentando con worker público:", err1);
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      documento = await pdfjs.getDocument({
        data: datos,
        cMapUrl,
        cMapPacked: true,
        standardFontDataUrl,
      }).promise;
    } catch (err2) {
      console.warn("Fallo lectura de PDF con worker local, reintentando con CDN:", err2);
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      documento = await pdfjs.getDocument({
        data: datos,
        cMapUrl,
        cMapPacked: true,
        standardFontDataUrl,
      }).promise;
    }
  }

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
  documento.destroy();

  return paginas.join("\n\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Devuelve el texto del archivo y como se obtuvo.
 * Lanza un Error con un mensaje ya entendible si no se puede.
 */
export async function leerTextoDeArchivo(archivo) {
  if (!archivo) throw new Error("No se escogió ningún archivo.");

  const nombre = String(archivo.name || "").toLowerCase();

  if (nombre.endsWith(".txt")) {
    const texto = (await archivo.text()).trim();
    if (!texto) throw new Error("Ese archivo está vacío.");
    return { texto, comoSeLeyo: "texto", paginas: 1 };
  }

  if (nombre.endsWith(".pdf")) {
    let texto = "";
    try {
      texto = await textoDePdf(archivo);
    } catch (fallo) {
      console.error("No se pudo abrir el PDF:", fallo);
      throw new Error(`No se pudo leer ese archivo PDF: ${fallo?.message || "Puede estar protegido o en un formato no soportado."}`);
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
const NIT = /\b(?:nit|n\.i\.t|rut|c\.?c\.?)[.:\s]*([\d][\d.,-]{6,15}[\dkK])\b/i;
const CORREO = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

export function datosSueltos(texto = "") {
  const plano = String(texto || "");
  return {
    nit: (plano.match(NIT)?.[1] || "").replace(/,/g, "").trim(),
    correo: (plano.match(CORREO)?.[0] || "").toLowerCase(),
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
