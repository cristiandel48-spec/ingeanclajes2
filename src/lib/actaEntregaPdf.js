// El PDF del acta de entrega, hoja por hoja.
//
// Es el mismo procedimiento del informe: se dibuja el HTML en un marco
// oculto, se vuelve a repartir el contenido MIDIENDO lo dibujado -la
// descripcion del trabajo puede pasarse de hoja- y se fotografia cada hoja.

import { buildActaPrintHtml } from "./actaEntregaPrint";
import { MARGEN_HOJA } from "./hojaImpresion";
import { repaginarHojas } from "./repaginarHojas";
import { nombreDocumento } from "./nombreArchivo";
import { FUENTE } from "../styles/designTokens";
import { ALTO_HOJA, pdfDeHojas } from "./pdfHojas";

export function prepararHtmlParaPdf(html) {
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

// Igual que en el informe: el alto util es el de la hoja menos los margenes
// (que aqui son el `padding` de .page) menos el pie.
export function repartirConMedidasReales(doc, ventana) {
  try {
    const primera = doc.querySelector(".page");
    const pie = primera?.querySelector(".page-footer");
    const estilo = primera ? ventana.getComputedStyle(primera) : null;
    const relleno = estilo
      ? parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom)
      : 0;
    const altoPie = pie ? pie.getBoundingClientRect().height : 0;
    const altoUtil = ALTO_HOJA - relleno - altoPie - 2;
    if (altoUtil > 200) repaginarHojas(doc, { altoUtil });
  } catch (fallo) {
    console.warn("No se pudo recalcular el reparto de hojas del acta:", fallo);
  }
}

// `liviano`: la version que se le envia al cliente para firmar, a unos 190 ppp.
export async function generarActaPdf(acta, { empresaConfig, firmaImg = "", onProgreso, liviano = false, firmaCliente = null } = {}) {
  const html = prepararHtmlParaPdf(buildActaPrintHtml(acta, { empresaConfig, firmaImg, firmaCliente }));
  const blob = await pdfDeHojas(html, {
    onProgreso,
    ...(liviano ? { escala: 2, calidad: 0.82 } : {}),
    antesDeFotografiar: repartirConMedidasReales,
    mensajeError: "No se pudo preparar el acta de entrega.",
    mensajeVacio: "El acta no contiene páginas.",
  });
  const nombre = nombreDocumento("Acta de entrega", [acta?.id, acta?.direccionObra, acta?.contratante]);
  return { blob, nombre: `${nombre}.pdf` };
}

export async function descargarActaPdf(acta, opciones = {}) {
  const { blob, nombre } = await generarActaPdf(acta, opciones);
  let blobFinal = blob;
  let nombreFinal = nombre;
  if (opciones.firmaCliente && opciones.firmaCliente.estado === "firmado") {
    try {
      const { armarPdfConConstancia, nombreConConstancia } = await import("./constanciaRecibido");
      blobFinal = await armarPdfConConstancia(blob, opciones.firmaCliente);
      nombreFinal = `${nombreConConstancia(opciones.firmaCliente)}.pdf`;
    } catch (e) {
      console.warn("No se pudo adjuntar la constancia de recibido:", e);
    }
  }
  const url = URL.createObjectURL(blobFinal);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreFinal;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
