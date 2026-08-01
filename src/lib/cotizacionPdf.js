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
export async function generarCotizacionPdf(cotizacion, { firmaImg = "", onProgreso } = {}) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const html = buildCotizacionPrintHtml(cotizacion, { firmaImg });

  // Se dibuja fuera de la vista, no oculto: display:none o visibility:hidden
  // hacen que html2canvas mida todo en cero.
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${ANCHO_HOJA}px;height:${ALTO_HOJA}px;border:0;`;
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
        scale: 2,              // legible sin disparar el peso
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: ANCHO_HOJA,
        windowHeight: ALTO_HOJA,
      });

      // JPEG en vez de PNG: con fotos, el PNG multiplica el peso por diez y
      // los correos rebotan por tamaño.
      const imagen = lienzo.toDataURL("image/jpeg", 0.92);
      if (i > 0) pdf.addPage([ANCHO_HOJA, ALTO_HOJA], "portrait");
      pdf.addImage(imagen, "JPEG", 0, 0, ANCHO_HOJA, ALTO_HOJA, undefined, "FAST");
    }

    const numero = String(cotizacion?.numero || cotizacion?.id || "cotizacion").replace(/[^\w-]+/g, "_");
    return { blob: pdf.output("blob"), nombre: `Cotizacion ${numero}.pdf` };
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
