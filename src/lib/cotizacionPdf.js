// Genera un PDF de la cotización desde el navegador, para poder adjuntarlo a
// un correo. Hasta ahora el botón "PDF" abría la pestaña de impresión y la
// persona lo guardaba a mano: no existía ningún archivo que el sistema pudiera
// enviar.
//
// LIMITACIÓN CONOCIDA: cada hoja se convierte en imagen, así que el texto del
// PDF no se puede seleccionar ni buscar, y el archivo pesa más que el que sale
// al imprimir desde el navegador. Es el precio de armarlo sin un servidor que
// renderice. Para archivar o firmar sigue siendo mejor el de imprimir.

import { buildCotizacionPrintHtml } from "./cotizacionPrint";

// Hoja carta a 96 ppp, que es la unidad en la que está escrita la plantilla.
const ANCHO_HOJA = 816;
const ALTO_HOJA = 1056;

// html2canvas no dibuja el documento: lo copia a otro iframe y lo redibuja
// midiendo el texto palabra por palabra. Con una tipografía descargada de
// internet, la negrita no siempre llega a tiempo a esa copia: entonces mide
// con una fuente y dibuja con otra, y las palabras salen pegadas
// ("FISCALIAGENERALDELANACION").
//
// Para el PDF se cambian por fuentes que todo computador ya tiene. Cambia algo
// el aspecto frente al documento impreso, pero se lee bien, que es lo que
// importa en algo que va a un cliente.
function prepararHtmlParaPdf(html) {
  return html
    .replace(/<link[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, "")
    .replace("</head>", `<style>
      body, .table, .table td, input, button,
      h1, h2, h3, p, span, div, strong, li,
      .cover-firm-name, .cover-firm-nit, .cover-firm-contact, .cover-kicker,
      .cover-client-name, .cover-client-nit, .ccg-k, .ccg-v, .cover-foot, .cover-sello,
      .def-term, .def-body, .def-bullets, .section-title, .subheading,
      .ficha-card-title, .ficha-card-tag, .ficha-card-desc, .ficha-name, .ficha-desc,
      .sig-name, .sig-role, .sig-meta,
      .card-label, .meta-label, .meta-value, .meta-card, .meta-strong,
      .steps-list, .contact-box, .contact-line,
      .sst-title, .sst-block p, .doc-copy, .doc-h2, .doc-h3, .incluye-item {
        font-family: Arial, 'Segoe UI', Helvetica, sans-serif !important;
        color: #000000 !important;
      }
      .table th {
        font-family: Arial, 'Segoe UI', Helvetica, sans-serif !important;
        background: #1E1E1E !important;
        color: #ffffff !important;
      }
      .sig-name {
        font-size: 15px !important;
        font-weight: 700 !important;
        white-space: nowrap !important;
        color: #000000 !important;
      }
      .footer-brand {
        color: #cc0000 !important;
      }
      .total-amount, .accent {
        color: #8A1518 !important;
      }
    </style></head>`);
}

// Espera a que el documento del iframe tenga fuentes e imágenes listas. Sin
// esto html2canvas dibuja huecos donde van las fotos y el logo.
async function esperarRecursos(doc, ventana) {
  try { await doc.fonts?.ready; } catch { /* navegador sin la API */ }

  const imagenes = [...doc.images].filter((img) => !img.complete);
  await Promise.all(imagenes.map((img) => new Promise((listo) => {
    img.addEventListener("load", listo, { once: true });
    img.addEventListener("error", listo, { once: true });
  })));

  // Un cuadro más para que el navegador termine de pintar.
  await new Promise((r) => ventana.requestAnimationFrame(() => r()));
}

/**
 * Devuelve { blob, nombre } con el PDF de la cotización.
 * onProgreso recibe (hojaActual, hojasTotales) para poder mostrar avance:
 * en una cotización con fotos esto tarda varios segundos.
 */
export async function generarCotizacionPdf(cotizacion, { firmaImg = "", sello = null, onProgreso } = {}) {
  // Las dos librerias pesan cerca de un mega, asi que se cargan solo al
  // generar un PDF. El precio es que si se publica una version nueva mientras
  // alguien tiene la pagina abierta, el navegador pide un archivo que ya no
  // existe y falla con un mensaje en ingles que no dice que hacer.
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

  const html = prepararHtmlParaPdf(buildCotizacionPrintHtml(cotizacion, { firmaImg, sello }));

  // Se dibuja fuera de la vista, no oculto: display:none o visibility:hidden
  // hacen que html2canvas mida todo en cero.
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.style.cssText =
    `position:fixed;left:0;top:0;width:${ANCHO_HOJA}px;height:${ALTO_HOJA}px;opacity:0.01;pointer-events:none;z-index:-9999;border:0;`;
  document.body.appendChild(marco);

  try {
    marco.srcdoc = html;
    await new Promise((listo, fallo) => {
      marco.addEventListener("load", listo, { once: true });
      marco.addEventListener("error", () => fallo(new Error("No se pudo preparar el documento.")), { once: true });
    });

    const doc = marco.contentDocument;
    const ventana = marco.contentWindow;
    if (!doc) throw new Error("No se pudo leer el documento generado.");

    await esperarRecursos(doc, ventana);

    const hojas = [...doc.querySelectorAll(".page")];
    if (!hojas.length) throw new Error("El documento salió vacío.");

    const pdf = new jsPDF({ unit: "px", format: [ANCHO_HOJA, ALTO_HOJA], orientation: "portrait" });

    for (let i = 0; i < hojas.length; i += 1) {
      onProgreso?.(i + 1, hojas.length);

      const lienzo = await html2canvas(hojas[i], {
        scale: 2.4,            // alta nitidez para planos, textos y cotas sin disparar el peso
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: ANCHO_HOJA,
        windowHeight: ALTO_HOJA,
      });

      // JPEG de alta calidad: mantiene planos nítidos y sin halos de compresión
      const imagen = lienzo.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage([ANCHO_HOJA, ALTO_HOJA], "portrait");
      pdf.addImage(imagen, "JPEG", 0, 0, ANCHO_HOJA, ALTO_HOJA, undefined, "MEDIUM");
    }

    // El nombre lleva numero, cliente y obra, como el de los informes y las
    // certificaciones: en una carpeta con veinte, "Cotizacion C-26121" a
    // secas no dice de quien es. Se limpian los caracteres que Windows no
    // admite en un nombre de archivo.
    const numero = String(cotizacion?.numero || cotizacion?.id || "cotizacion");
    const partes = [numero, cotizacion?.cliente, cotizacion?.obra]
      .map((t) => String(t || "").trim())
      .filter(Boolean);
    // La obra se repite muchas veces con el nombre del cliente; asi no sale dos veces.
    const vistas = [];
    for (const parte of partes) {
      if (!vistas.some((v) => v.toLowerCase() === parte.toLowerCase())) vistas.push(parte);
    }
    const nombre = ("Cotizacion " + vistas.join(" "))
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    return { blob: pdf.output("blob"), nombre: `${nombre}.pdf` };
  } finally {
    marco.remove();
  }
}

// El correo viaja en JSON, así que el PDF va en base64.
export function blobABase64(blob) {
  return new Promise((listo, fallo) => {
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = String(lector.result || "");
      listo(resultado.slice(resultado.indexOf(",") + 1));
    };
    lector.onerror = () => fallo(new Error("No se pudo leer el PDF generado."));
    lector.readAsDataURL(blob);
  });
}
