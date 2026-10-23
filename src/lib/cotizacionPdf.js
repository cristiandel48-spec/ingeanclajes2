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

// La letra y los colores son los mismos de la cotizacion impresa. Antes aqui
// se cambiaba todo a Arial, porque Inter venia de Google Fonts y la negrita no
// siempre llegaba a tiempo al marco donde html2canvas redibuja el documento:
// media con una letra y dibujaba con otra, y las palabras salian pegadas
// ("FISCALIAGENERALDELANACION"). Con ese cambio venian tambien colores
// distintos (texto negro, pie rojo, total vino). Ahora Inter va dentro de la
// aplicacion y el marco espera a que cargue (pdfHojas.js), asi que el cliente
// recibe el mismo documento que se reviso en pantalla.
function prepararHtmlParaPdf(html) {
  return html
    .replace("</head>", `<style>
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
