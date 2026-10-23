// La letra Inter va dentro de la aplicacion, no se descarga de Google Fonts.
//
// Antes se pedia a fonts.googleapis.com, y eso tenia dos consecuencias:
//
// 1. Las pestañas de impresion y los marcos donde se arman los PDF son
//    documentos aparte. Los que no traian el enlace a Google (certificado,
//    nomina, recibos, remisiones...) salian con otra letra, y cada uno pedia
//    la suya: Aptos, Segoe UI, Arial, la del sistema.
// 2. En el PDF de la cotizacion la negrita no siempre llegaba a tiempo y las
//    palabras salian pegadas, asi que alli se cambiaba a Arial.
//
// Con los archivos servidos por la propia aplicacion la letra llega siempre,
// tambien sin internet, y todos los documentos usan la misma.

import interLatin from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import interLatinExt from "@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?url";
import interRegularTtf from "../assets/fonts/Inter-Regular.ttf?url";
import interBoldTtf from "../assets/fonts/Inter-Bold.ttf?url";

// Las pestañas de impresion se abren en blanco y los PDF se arman en un
// marco con `srcdoc`: una ruta relativa ahi no siempre resuelve contra el
// sitio. Con la direccion completa no hay duda.
const absoluta = (url) => {
  try {
    return new URL(url, globalThis.location?.href).href;
  } catch {
    return url;
  }
};

// Los rangos son los de @fontsource: latin lleva el español completo (tildes,
// ñ, ¿¡, guiones y comillas tipograficas); latin-ext, lo demas del alfabeto
// latino por si un nombre lo trae.
const RANGO_LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const RANGO_LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

/**
 * Reglas @font-face de Inter (un solo archivo variable para todos los
 * gruesos, del 100 al 900).
 *
 * @param {object} opciones
 * @param {string} [opciones.display]  "swap" en la aplicacion, para que el
 *   texto se vea mientras llega; "block" en los documentos, para que nunca
 *   se fotografien ni se impriman con la letra de respaldo.
 */
export function cssFuenteInter({ display = "swap" } = {}) {
  const regla = (url, rango) => `
    @font-face {
      font-family: 'Inter';
      font-style: normal;
      font-weight: 100 900;
      font-display: ${display};
      src: url("${absoluta(url)}") format("woff2");
      unicode-range: ${rango};
    }`;
  return regla(interLatinExt, RANGO_LATIN_EXT) + regla(interLatin, RANGO_LATIN);
}

/**
 * Mete Inter en un documento HTML completo (pestaña de impresion o marco del
 * PDF), justo al abrir el <head> para que cualquier regla del documento
 * pueda usarla.
 */
export function conFuenteInter(html) {
  const estilo = `<style>${cssFuenteInter({ display: "block" })}</style>`;
  const cabeza = /<head[^>]*>/i.exec(html);
  if (cabeza) {
    const fin = cabeza.index + cabeza[0].length;
    return html.slice(0, fin) + estilo + html.slice(fin);
  }
  return estilo + html;
}

// jsPDF no lee woff2: necesita la letra en TTF. Son las dos instancias fijas
// de Inter (normal y negrita), solo con el alfabeto latino, ~68 KB cada una.
let ttfEnBase64 = null;

async function base64De(url) {
  const respuesta = await fetch(absoluta(url));
  if (!respuesta.ok) throw new Error("No se pudo cargar la letra del documento.");
  const bytes = new Uint8Array(await respuesta.arrayBuffer());
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binario);
}

/**
 * Registra Inter en un documento de jsPDF. Despues se usa con
 * `doc.setFont("Inter", "normal")` o `doc.setFont("Inter", "bold")`.
 * Los archivos se descargan una sola vez por sesion.
 */
export async function registrarInterEnPdf(doc) {
  if (!ttfEnBase64) {
    ttfEnBase64 = Promise.all([base64De(interRegularTtf), base64De(interBoldTtf)]).catch((fallo) => {
      ttfEnBase64 = null;
      throw fallo;
    });
  }
  const [normal, negrita] = await ttfEnBase64;
  doc.addFileToVFS("Inter-Regular.ttf", normal);
  doc.addFont("Inter-Regular.ttf", "Inter", "normal");
  doc.addFileToVFS("Inter-Bold.ttf", negrita);
  doc.addFont("Inter-Bold.ttf", "Inter", "bold");
}
