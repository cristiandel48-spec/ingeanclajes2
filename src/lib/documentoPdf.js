// Genera el PDF de un documento de flujo continuo -certificacion,
// recertificacion, informe de actividades- sin pasar por el dialogo de
// impresion del navegador.
//
// POR QUE EXISTE: imprimiendo con Ctrl+P, Chrome estampa su encabezado y su
// pie en cada hoja: la fecha, el titulo, "about:blank" y el numero de pagina.
// Eso no se puede desactivar desde el codigo -es una casilla del dialogo, del
// lado de quien imprime- y salia en los documentos que se le entregan al
// cliente. Generando el archivo aqui, no aparece nunca.
//
// DIFERENCIA CON cotizacionPdf: la cotizacion ya trae sus hojas marcadas
// (`.page`), asi que alli basta con recorrerlas. El certificado y el informe
// son un texto corrido, y hay que decidir DONDE cortar. Cortar cada 1056px a
// ciegas parte una foto o una fila de tabla por la mitad, que se ve peor que
// el problema que veniamos a resolver.

// Carta a 96 ppp, con los mismos margenes que la impresion normal (12mm).
const ANCHO_HOJA = 816;
const ALTO_HOJA = 1056;
const MARGEN = 45;
const ANCHO_UTIL = ANCHO_HOJA - MARGEN * 2;
const ALTO_UTIL = ALTO_HOJA - MARGEN * 2;

const HOJA_ESTILOS = `
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  html,body{margin:0;padding:0;background:#fff;color:#111;
    font-family:Aptos,"Segoe UI",Arial,sans-serif;font-size:12pt;line-height:1.5;}
  .doc-shell{background:#fff;color:#111;border:0 !important;padding:0 !important;}
  .doc-shell table{width:100%;border-collapse:collapse;}
  img{max-width:100%;}
`;

/** Espera a que carguen las imagenes; sin esto salen huecos en blanco. */
function esperarImagenes(doc) {
  const imagenes = [...doc.images].filter((img) => !img.complete);
  if (!imagenes.length) return Promise.resolve();
  return Promise.all(imagenes.map((img) => new Promise((listo) => {
    img.addEventListener("load", listo, { once: true });
    img.addEventListener("error", listo, { once: true });
  })));
}

/**
 * Posiciones donde se puede cortar sin partir nada, en pixeles del documento.
 *
 * Se recorren los bloques de primer nivel y, dentro de las tablas, sus filas:
 * el final de cada uno es un sitio seguro. Asi el corte cae entre dos filas o
 * entre dos fotos, nunca por la mitad de una.
 */
function limitesSeguros(raiz) {
  const limites = new Set([0]);
  const arriba = raiz.getBoundingClientRect().top;

  const registrar = (elemento) => {
    const caja = elemento.getBoundingClientRect();
    if (caja.height <= 0) return;
    limites.add(Math.round(caja.bottom - arriba));
  };

  raiz.querySelectorAll(":scope > *").forEach((bloque) => {
    registrar(bloque);
    // Las tablas y las rejillas de fotos son altas: hay que poder cortar por
    // dentro, entre fila y fila o entre foto y foto.
    bloque.querySelectorAll("tr, :scope > div").forEach(registrar);
  });

  return [...limites].sort((a, b) => a - b);
}

/**
 * Devuelve { blob, nombre } con el PDF del documento que hay en pantalla.
 *
 * @param {HTMLElement} nodo  El contenedor del documento (normalmente #pz).
 * @param {string} nombre     Nombre del archivo, sin extension.
 */
export async function generarDocumentoPdf(nodo, nombre = "Documento") {
  if (!nodo) throw new Error("No se encontró el documento en pantalla.");

  let html2canvas, jsPDF;
  try {
    const [mod1, mod2] = await Promise.all([import("html2canvas"), import("jspdf")]);
    html2canvas = mod1.default;
    jsPDF = mod2.jsPDF;
  } catch {
    throw new Error(
      "Se publicó una versión nueva del sistema mientras tenías esta página abierta. " +
      "Recárgala (Ctrl+Shift+R) y vuelve a intentarlo."
    );
  }

  // Se dibuja fuera de la vista, no oculto: con display:none o
  // visibility:hidden, html2canvas mide todo en cero.
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.style.cssText = `position:fixed;left:-10000px;top:0;width:${ANCHO_UTIL}px;height:${ALTO_UTIL}px;border:0;`;
  document.body.appendChild(marco);

  try {
    marco.srcdoc = `<!doctype html><html><head><meta charset="utf-8">
      <style>${HOJA_ESTILOS}</style></head>
      <body><div id="raiz">${nodo.innerHTML}</div></body></html>`;

    await new Promise((listo, fallo) => {
      marco.addEventListener("load", listo, { once: true });
      marco.addEventListener("error", () => fallo(new Error("No se pudo preparar el documento.")), { once: true });
    });

    const doc = marco.contentDocument;
    if (!doc) throw new Error("No se pudo leer el documento generado.");
    await esperarImagenes(doc);
    // Un respiro para que termine de acomodarse el texto antes de medir.
    await new Promise((listo) => setTimeout(listo, 120));

    const raiz = doc.getElementById("raiz");
    const altoTotal = raiz.scrollHeight;
    const cortes = limitesSeguros(raiz);

    const lienzo = await html2canvas(raiz, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: ANCHO_UTIL,
      windowHeight: altoTotal,
    });

    const escala = lienzo.height / altoTotal;
    const altoPagina = ALTO_UTIL;

    const pdf = new jsPDF({ unit: "px", format: [ANCHO_HOJA, ALTO_HOJA], orientation: "portrait" });
    const recorte = document.createElement("canvas");
    const pincel = recorte.getContext("2d");

    let desde = 0;
    let primera = true;

    while (desde < altoTotal - 1) {
      const tope = desde + altoPagina;

      // El corte mas bajo que quepa en la hoja. Si ningun bloque cabe entero
      // -una foto mas alta que la pagina- se corta a la fuerza, que es peor
      // pero al menos no se pierde contenido.
      let hasta = cortes.reduce((mejor, corte) => (
        corte > desde && corte <= tope ? Math.max(mejor, corte) : mejor
      ), 0);
      if (hasta <= desde) hasta = Math.min(tope, altoTotal);
      if (altoTotal - hasta < 4) hasta = altoTotal;

      const altoTrozo = Math.round((hasta - desde) * escala);
      recorte.width = lienzo.width;
      recorte.height = altoTrozo;
      pincel.fillStyle = "#ffffff";
      pincel.fillRect(0, 0, recorte.width, recorte.height);
      pincel.drawImage(lienzo, 0, Math.round(desde * escala), lienzo.width, altoTrozo,
                       0, 0, lienzo.width, altoTrozo);

      if (!primera) pdf.addPage([ANCHO_HOJA, ALTO_HOJA], "portrait");
      primera = false;

      // JPEG y no PNG: con fotos de obra el PNG multiplica el peso por diez.
      pdf.addImage(
        recorte.toDataURL("image/jpeg", 0.92), "JPEG",
        MARGEN, MARGEN, ANCHO_UTIL, altoTrozo / escala,
        undefined, "FAST",
      );

      desde = hasta;
    }

    return { blob: pdf.output("blob"), nombre: `${nombre}.pdf` };
  } finally {
    marco.remove();
  }
}

/** Genera el PDF y lo descarga. */
export async function descargarDocumentoPdf(nodo, nombre) {
  const { blob, nombre: archivo } = await generarDocumentoPdf(nodo, nombre);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Se libera despues: en Safari, revocar de inmediato cancela la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
