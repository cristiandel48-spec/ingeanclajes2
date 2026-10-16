// Genera el PDF del informe de actividades hoja por hoja (.page)
// garantizando fidelidad 100%, 0 cortes en fotos ni textos y paginación exacta.

import { buildInformePrintHtml } from "./informePrint";
import { MARGEN_HOJA } from "./hojaImpresion";
import { repaginarHojas } from "./repaginarHojas";
import { nombreDocumento } from "./nombreArchivo";
import { FUENTE } from "../styles/designTokens";

const ANCHO_HOJA = 816;
const ALTO_HOJA = 1056;

function prepararHtmlParaPdf(html) {
  // El enlace a la fuente se mantiene: antes se quitaba y luego se forzaba
  // Arial, asi que el PDF salia con una letra distinta de la del programa.
  // Esperar a doc.fonts.ready antes de fotografiar las hojas ya garantiza
  // que este cargada, y el navegador la tiene en cache de la propia
  // aplicacion. Si no llegara, la pila de respaldo resuelve igual.
  return html
    .replace("</head>", `<style>
      body, table, td, th, input, button,
      h1, h2, h3, p, span, div, strong, li {
        font-family: ${FUENTE} !important;
      }
      body { background: #ffffff !important; padding: 0 !important; }
      .page {
        width: 8.5in !important;
        height: 11in !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: ${MARGEN_HOJA} !important;
        box-shadow: none !important;
        overflow: hidden !important;
      }
    </style></head>`);
}

async function esperarRecursos(doc, ventana) {
  try {
    if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
  } catch {
    // API no disponible
  }

  const imagenes = [...doc.images].filter((img) => !img.complete);
  if (imagenes.length) {
    await Promise.all(
      imagenes.map(
        (img) =>
          new Promise((listo) => {
            img.addEventListener("load", listo, { once: true });
            img.addEventListener("error", listo, { once: true });
          })
      )
    );
  }

  await new Promise((r) => ventana.requestAnimationFrame(() => r()));
}

export async function generarInformePdf(informe, { empresaConfig, firmaImg = "", onProgreso } = {}) {
  let html2canvas, jsPDF;
  try {
    const [mod1, mod2] = await Promise.all([import("html2canvas"), import("jspdf")]);
    html2canvas = mod1.default;
    jsPDF = mod2.jsPDF;
  } catch {
    throw new Error(
      "Se publicó una nueva versión. Recarga la página (Ctrl+Shift+R) e intenta nuevamente."
    );
  }

  const html = prepararHtmlParaPdf(buildInformePrintHtml(informe, { empresaConfig, firmaImg }));

  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.style.cssText = `position:fixed;left:0;top:0;width:${ANCHO_HOJA}px;height:${ALTO_HOJA}px;opacity:0.01;pointer-events:none;z-index:-9999;border:0;`;
  document.body.appendChild(marco);

  try {
    marco.srcdoc = html;
    await new Promise((listo, fallo) => {
      marco.addEventListener("load", listo, { once: true });
      marco.addEventListener("error", () => fallo(new Error("No se pudo preparar el informe.")), { once: true });
    });

    const doc = marco.contentDocument;
    const ventana = marco.contentWindow;
    if (!doc) throw new Error("No se pudo leer el informe generado.");

    await esperarRecursos(doc, ventana);

    // Se vuelve a repartir el contenido midiendo el documento ya dibujado.
    // El reparto que trae informePrint.js se hace con alturas estimadas y
    // se queda corto: cuando se pasa, manda a la hoja siguiente un bloque
    // que cabia y deja media hoja en blanco. Aqui ya hay medidas de verdad.
    //
    // El alto util es el de la hoja menos los margenes de arriba y abajo
    // (que aqui son el `padding` de .page) menos el pie.
    try {
      const primera = doc.querySelector(".page");
      const pie = primera?.querySelector(".page-footer");
      const estilo = primera ? ventana.getComputedStyle(primera) : null;
      const relleno = estilo
        ? parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom)
        : 0;
      const altoPie = pie ? pie.getBoundingClientRect().height : 0;
      const altoUtil = ALTO_HOJA - relleno - altoPie - 2; // 2px de respiro
      if (altoUtil > 200) repaginarHojas(doc, { altoUtil });
    } catch (fallo) {
      // Si algo sale mal se usa el reparto estimado, que es el de antes.
      console.warn("No se pudo recalcular el reparto de hojas:", fallo);
    }

    const hojas = [...doc.querySelectorAll(".page")];
    if (!hojas.length) throw new Error("El documento no contiene páginas.");

    const pdf = new jsPDF({ unit: "px", format: [ANCHO_HOJA, ALTO_HOJA], orientation: "portrait" });

    for (let i = 0; i < hojas.length; i += 1) {
      onProgreso?.(i + 1, hojas.length);

      const lienzo = await html2canvas(hojas[i], {
        // Escala 3 = 288 ppp (estándar imprenta de alta fidelidad, idéntico a cotizaciones)
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: ANCHO_HOJA,
        windowHeight: ALTO_HOJA,
      });

      const imagen = lienzo.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage([ANCHO_HOJA, ALTO_HOJA], "portrait");
      pdf.addImage(imagen, "JPEG", 0, 0, ANCHO_HOJA, ALTO_HOJA, undefined, "MEDIUM");
    }

    const nombre = nombreDocumento("Informe de actividades", [
      informe?.id || informe?.numero,
      informe?.proyecto,
      informe?.cliente,
    ]);

    return { blob: pdf.output("blob"), nombre: `${nombre}.pdf` };
  } finally {
    marco.remove();
  }
}

export async function descargarInformePdf(informe, opciones = {}) {
  const { blob, nombre } = await generarInformePdf(informe, opciones);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
