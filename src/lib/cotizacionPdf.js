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
import { MARGEN_HOJA } from "./hojaImpresion";
import { pdfDeHojas } from "./pdfHojas";

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

      /* Hoja de tamaño fijo, SOLO para este camino.
         Este PDF se arma fotografiando cada .page y encajandola en una
         pagina de 8,5 x 11 exactas, asi que aqui la hoja si tiene que ser
         una caja de medida fija. La impresion de verdad no la necesita -y
         no la quiere-: alli el margen lo pone @page y el contenido fluye,
         que es lo que evita los recortes y las hojas en blanco. */
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

/**
 * Devuelve { blob, nombre } con el PDF de la cotización.
 * onProgreso recibe (hojaActual, hojasTotales) para poder mostrar avance:
 * en una cotización con fotos esto tarda varios segundos.
 */
export async function generarCotizacionPdf(cotizacion, { firmaImg = "", sello = null, onProgreso } = {}) {
  const html = prepararHtmlParaPdf(buildCotizacionPrintHtml(cotizacion, { firmaImg, sello }));
  const blob = await pdfDeHojas(html, { onProgreso });
  return { blob, nombre: nombreDeCotizacion(cotizacion) };
}

// El nombre lleva numero, cliente y obra, como el de los informes y las
// certificaciones: en una carpeta con veinte, "Cotizacion C-26121" a secas no
// dice de quien es. Se limpian los caracteres que Windows no admite en un
// nombre de archivo.
function nombreDeCotizacion(cotizacion) {
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
  return `${nombre}.pdf`;
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
