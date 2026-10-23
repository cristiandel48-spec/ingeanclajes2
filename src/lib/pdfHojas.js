// Piezas comunes de los PDF que se arman fotografiando el documento (M5).
//
// Cotizaciones, informes y certificados se hacen igual: se dibuja el HTML en
// un marco invisible, se espera a que esten las fuentes y las fotos, se
// fotografia cada hoja con html2canvas y se arma el PDF con jsPDF. Cada
// generador tenia su propia copia de esos pasos, y un arreglo en uno no
// llegaba a los otros (el PDF que se detenia al cambiar de pestaña hubo que
// corregirlo dos veces). Aqui estan una sola vez; cada generador conserva
// solo lo suyo: su plantilla, su reparto de hojas o sus cortes de pagina.

import { avanceDePdf, dejarPintar } from "./progresoPdf";
import { conFuenteInter } from "./fuenteInter";

// Hoja carta a 96 ppp, la unidad en la que estan escritas las plantillas.
export const ANCHO_HOJA = 816;
export const ALTO_HOJA = 1056;

// Las dos librerias pesan cerca de un mega, asi que se cargan solo al generar
// un PDF. El precio es que si se publica una version nueva mientras alguien
// tiene la pagina abierta, el navegador pide un archivo que ya no existe y
// falla con un mensaje en ingles que no dice que hacer.
export async function cargarLibreriasPdf() {
  try {
    const [mod1, mod2] = await Promise.all([import("html2canvas"), import("jspdf")]);
    return { html2canvas: mod1.default, jsPDF: mod2.jsPDF };
  } catch {
    throw new Error(
      "Se publicó una versión nueva del sistema mientras tenías esta página abierta. " +
      "Recárgala (Ctrl+Shift+R) y vuelve a intentarlo."
    );
  }
}

// html2canvas acomoda cada palabra donde la puso el navegador, pero la
// dibuja en un lienzo, y el lienzo no sabe de `font-variant-numeric`. Con
// los numeros de ancho fijo de Inter el navegador ensancha cifras y guiones
// y el lienzo no, asi que quedaba un hueco despues de cada guion:
// «IA- FT- 02», «INF- 033». En el PDF se usan los numeros normales, que
// miden lo mismo en los dos.
const SIN_NUMEROS_FIJOS = "*, *::before, *::after { font-variant-numeric: normal !important; }";

// Dibuja el HTML en un marco fuera de la vista. No oculto: display:none o
// visibility:hidden hacen que html2canvas mida todo en cero. Quien lo pide
// tiene que quitarlo al terminar (marco.remove()).
//
// El marco es un documento aparte: se le mete Inter aqui para que todos los
// PDF -cotizacion, informe, certificado, orden de compra- salgan con la letra
// de la aplicacion. `esperarRecursos` espera a que este cargada.
export async function abrirEnMarco(html, { ancho = ANCHO_HOJA, alto = ALTO_HOJA, mensajeError = "No se pudo preparar el documento." } = {}) {
  html = conFuenteInter(html).replace(/<\/head>/i, `<style>${SIN_NUMEROS_FIJOS}</style></head>`);
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.style.cssText =
    `position:fixed;left:0;top:0;width:${ancho}px;height:${alto}px;opacity:0.01;pointer-events:none;z-index:-9999;border:0;`;
  document.body.appendChild(marco);
  try {
    marco.srcdoc = html;
    await new Promise((listo, fallo) => {
      marco.addEventListener("load", listo, { once: true });
      marco.addEventListener("error", () => fallo(new Error(mensajeError)), { once: true });
    });
    const doc = marco.contentDocument;
    if (!doc) throw new Error("No se pudo leer el documento generado.");
    return { marco, doc, ventana: marco.contentWindow };
  } catch (error) {
    marco.remove();
    throw error;
  }
}

// Espera a que el documento del marco tenga fuentes e imagenes listas. Sin
// esto html2canvas dibuja huecos donde van las fotos y el logo.
export async function esperarRecursos(doc, ventana) {
  // Se pide Inter de forma explicita: `fonts.ready` solo espera a las letras
  // que el navegador ya empezo a cargar, y podria resolverse antes de que
  // arranque la de la negrita.
  try {
    await Promise.all(["400", "600", "700", "800"].map((grueso) => doc.fonts?.load(`${grueso} 16px Inter`)));
    await doc.fonts?.ready;
  } catch { /* navegador sin la API */ }

  const imagenes = [...doc.images].filter((img) => !img.complete);
  await Promise.all(imagenes.map((img) => new Promise((listo) => {
    img.addEventListener("load", listo, { once: true });
    img.addEventListener("error", listo, { once: true });
  })));

  // Un cuadro mas para que el navegador termine de pintar.
  await dejarPintar(ventana);
}

/**
 * PDF de un documento ya dividido en hojas (.page) de tamaño carta: una
 * fotografia por hoja. Devuelve el Blob del PDF.
 *
 * - onProgreso(hoja, total): si quien llama muestra su propio avance; si
 *   no, sale el aviso comun («hoja 2 de 5»).
 * - antesDeFotografiar(doc, ventana): para ajustar el documento ya dibujado
 *   (el informe reparte de nuevo sus hojas con medidas reales).
 */
//
// - escala y calidad: por defecto 3 (288 ppp) y JPEG 0,95, para el PDF que se
//   descarga. Para enviar a firma se usa una version liviana (2 y 0,82, unos
//   190 ppp): con un informe lleno de fotos la de 288 ppp pasaba de 20 MB.
export async function pdfDeHojas(html, { onProgreso, antesDeFotografiar, mensajeError, mensajeVacio = "El documento salió vacío.", escala = 3, calidad = 0.95 } = {}) {
  const { html2canvas, jsPDF } = await cargarLibreriasPdf();
  const avance = avanceDePdf(onProgreso);
  let marco = null;

  try {
    const abierto = await abrirEnMarco(html, { mensajeError });
    marco = abierto.marco;
    const { doc, ventana } = abierto;

    await esperarRecursos(doc, ventana);
    if (antesDeFotografiar) antesDeFotografiar(doc, ventana);

    const hojas = [...doc.querySelectorAll(".page")];
    if (!hojas.length) throw new Error(mensajeVacio);

    const pdf = new jsPDF({ unit: "px", format: [ANCHO_HOJA, ALTO_HOJA], orientation: "portrait" });

    for (let i = 0; i < hojas.length; i += 1) {
      avance.hoja(i + 1, hojas.length);
      await dejarPintar();

      const lienzo = await html2canvas(hojas[i], {
        // 3 = 288 puntos por pulgada, al borde del estandar de imprenta. Este
        // PDF es el que se le manda al cliente y sigue siendo una foto de la
        // hoja: lo unico que se puede hacer por el es que sea una foto buena.
        // A 2,4 eran 230 ppp y el texto se veia blando al ampliarlo.
        scale: escala,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: ANCHO_HOJA,
        windowHeight: ALTO_HOJA,
      });

      // JPEG de alta calidad: mantiene planos nitidos y sin halos de compresion.
      const imagen = lienzo.toDataURL("image/jpeg", calidad);
      if (i > 0) pdf.addPage([ANCHO_HOJA, ALTO_HOJA], "portrait");
      pdf.addImage(imagen, "JPEG", 0, 0, ANCHO_HOJA, ALTO_HOJA, undefined, "MEDIUM");
    }

    return pdf.output("blob");
  } finally {
    marco?.remove();
    avance.cerrar();
  }
}
