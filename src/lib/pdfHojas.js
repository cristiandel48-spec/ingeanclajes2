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

// html2canvas no conoce `clip-path` ni `object-fit`. Con el primero la ficha
// de la linea de vida vertical salia con la lamina ENTERA del proveedor -sus
// recuadros de texto y el dibujo corrido- en vez del recorte; con el segundo
// las fotos se estiraban para llenar su caja. En la impresion del navegador
// todo salia bien, solo fallaba el PDF.
//
// Aqui, ya con todo dibujado, se mide donde quedo cada una de esas imagenes y
// se repite el resultado con lo que html2canvas si entiende: una caja con
// overflow:hidden del tamaño de lo visible y la imagen completa dentro, en su
// sitio y a su tamaño. La caja va encima de la hoja y la imagen original se
// oculta, asi el documento no se mueve.
const recuadro = (r) => ({ izq: r.left, arr: r.top, der: r.right, aba: r.bottom });
const cortar = (a, b) => ({
  izq: Math.max(a.izq, b.izq), arr: Math.max(a.arr, b.arr),
  der: Math.min(a.der, b.der), aba: Math.min(a.aba, b.aba),
});

// «inset(3% 32% 2% 37%)» -> lo que se recorta por cada lado, en pixeles del
// recuadro ya ampliado (el recorte se escala con la imagen).
function recorteDe(clipPath, img, r) {
  const m = /^inset\(([^)]*)\)/.exec(clipPath || "");
  if (!m) return null;
  const v = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/);
  const [a, d = a, b = a, i = d] = v;
  const escalaX = img.offsetWidth ? (r.der - r.izq) / img.offsetWidth : 1;
  const escalaY = img.offsetHeight ? (r.aba - r.arr) / img.offsetHeight : 1;
  const px = (t, total, escala) => (t.endsWith("%") ? (parseFloat(t) / 100) * total : (parseFloat(t) || 0) * escala);
  const ancho = r.der - r.izq, alto = r.aba - r.arr;
  return {
    izq: r.izq + px(i, ancho, escalaX), arr: r.arr + px(a, alto, escalaY),
    der: r.der - px(d, ancho, escalaX), aba: r.aba - px(b, alto, escalaY),
  };
}

// Donde cae la imagen entera con object-fit contain/cover dentro de su caja.
function ajusteDe(estilo, img, caja) {
  const ancho = caja.der - caja.izq, alto = caja.aba - caja.arr;
  const prop = img.naturalWidth / img.naturalHeight;
  const cubre = estilo.objectFit === "cover";
  let w = ancho, h = ancho / prop;
  if (cubre ? h < alto : h > alto) { h = alto; w = alto * prop; }
  const [px = "50%", py = "50%"] = (estilo.objectPosition || "").split(/\s+/);
  const pos = (t, libre) => (t.endsWith("%") ? (parseFloat(t) / 100) * libre : parseFloat(t) || 0);
  const izq = caja.izq + pos(px, ancho - w), arr = caja.arr + pos(py, alto - h);
  return { izq, arr, der: izq + w, aba: arr + h };
}

export function rehacerImagenes(hoja, ventana) {
  const base = hoja.getBoundingClientRect();
  const capas = [];
  for (const img of hoja.querySelectorAll("img")) {
    if (!img.naturalWidth || !img.naturalHeight) continue;
    const estilo = ventana.getComputedStyle(img);
    if (estilo.visibility === "hidden" || estilo.display === "none") continue;
    const recortada = estilo.clipPath && estilo.clipPath !== "none";
    const movida = estilo.transform && estilo.transform !== "none";
    const ajustada = estilo.objectFit === "contain" || estilo.objectFit === "cover";
    if (!recortada && !movida && !ajustada) continue;

    // `completa`: donde se dibuja la imagen entera. `visible`: lo que se ve.
    let completa = recuadro(img.getBoundingClientRect());
    let visible = completa;
    if (ajustada) {
      const caja = completa;
      completa = ajusteDe(estilo, img, caja);
      visible = cortar(caja, completa);
    }
    if (recortada) visible = cortar(visible, recorteDe(estilo.clipPath, img, completa) || visible);
    // El contenedor que recorta lo que la ampliacion saca de la caja.
    for (let p = img.parentElement; p && p !== hoja; p = p.parentElement) {
      const o = ventana.getComputedStyle(p).overflow;
      if (o && o !== "visible") { visible = cortar(visible, recuadro(p.getBoundingClientRect())); break; }
    }
    if (visible.der <= visible.izq || visible.aba <= visible.arr) continue;

    const caja = hoja.ownerDocument.createElement("div");
    caja.style.cssText =
      `position:absolute;overflow:hidden;margin:0;padding:0;border:0;` +
      `left:${visible.izq - base.left - hoja.clientLeft}px;top:${visible.arr - base.top - hoja.clientTop}px;` +
      `width:${visible.der - visible.izq}px;height:${visible.aba - visible.arr}px;` +
      `border-radius:${estilo.borderRadius};`;
    const copia = hoja.ownerDocument.createElement("img");
    copia.src = img.currentSrc || img.src;
    copia.alt = "";
    copia.style.cssText =
      `position:absolute;display:block;margin:0;padding:0;border:0;max-width:none;max-height:none;` +
      `left:${completa.izq - visible.izq}px;top:${completa.arr - visible.arr}px;` +
      `width:${completa.der - completa.izq}px;height:${completa.aba - completa.arr}px;`;
    caja.appendChild(copia);
    capas.push([img, caja]);
  }
  if (!capas.length) return;
  // Se agrega al final, despues de medir todo: si no, cada capa nueva podria
  // mover lo que falta por medir.
  if (ventana.getComputedStyle(hoja).position === "static") hoja.style.position = "relative";
  for (const [img, caja] of capas) {
    img.style.visibility = "hidden";
    hoja.appendChild(caja);
  }
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
    hojas.forEach((hoja) => rehacerImagenes(hoja, ventana));

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
