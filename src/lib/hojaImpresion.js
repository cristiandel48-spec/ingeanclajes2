// Base comun de impresion de los documentos que se le envian al cliente:
// cotizacion, informe de actividades y certificado.
//
// ── Por que existe este archivo ──────────────────────────────────────────
//
// Los tres documentos se escribieron por separado y los tres repitieron el
// mismo modelo: cada hoja era una caja de 8,5 x 11 pulgadas clavadas, con
// `overflow:hidden`, dentro de un `@page` con margen cero. Eso daba cuatro
// problemas a la vez:
//
// 1. Se salia de margen. El cuadro de impresion de Chrome trae sus propios
//    margenes, asi que el area imprimible real ronda las 7,5 pulgadas. Meter
//    8,5 en 7,5 obliga al navegador a recortar o a encoger la hoja, y el
//    resultado cambiaba segun como tuviera cada quien el dialogo.
//
// 2. Lo que no cabia se perdia. `height` fijo mas `overflow:hidden` no es
//    "se pasa a la hoja siguiente", es "se corta y desaparece". Una actividad
//    o una foto de mas no empujaban nada: se iban sin avisar.
//
// 3. Hojas casi en blanco entre hoja y hoja. Al medir cada pagina 11 pulgadas
//    exactas pero ser el area imprimible menor, cada una se desbordaba unos
//    milimetros sobre la siguiente, y esos milimetros se llevaban una hoja
//    entera.
//
// 4. `table { break-inside: avoid }` mandaba una tabla completa a la hoja
//    siguiente en cuanto no cabia entera, dejando el hueco anterior vacio.
//
// ── Como se resuelve ─────────────────────────────────────────────────────
//
// El margen lo declara `@page` y el contenido fluye. En pantalla se sigue
// viendo como una hoja, porque para revisar antes de enviar eso ayuda; al
// imprimir, la geometria la decide el navegador, que es quien sabe cuanto
// puede pintar de verdad.
//
// `break-inside: avoid` se reserva para lo que de verdad no debe partirse
// -una tarjeta de foto, un bloque de firma, una fila-, nunca para una tabla
// entera.

// Margen de la hoja. Va aqui y no en cada documento para que los tres
// coincidan: antes uno usaba 0, otro 12mm y otro 9mm de relleno interno.
export const MARGEN_HOJA = "14mm 13mm 15mm";

// Alto minimo del bloque de una hoja, para que el pie no quede flotando a
// media pagina cuando el contenido es corto.
//
// No es un alto fijo: si el contenido crece, la hoja crece y pasa a la
// siguiente en vez de recortarse. Y se queda corto a proposito -una carta
// mide 279mm- para que siga cuadrando aunque alguien imprima con margenes
// mas anchos que los de aqui. Quedarse corto solo sube un poco el pie;
// pasarse devuelve las hojas en blanco.
export const ALTO_MINIMO_HOJA = "232mm";

// Oculta automaticamente los encabezados y pies que inyecta el navegador
// (fecha, about:blank, 1/6) en Chrome/Edge modernos sin obligar al usuario a
// desmarcar la casilla manualmente en el dialogo de impresion.
const SIN_MARGENES_NAVEGADOR = `
      @top-left { content: ""; }
      @top-center { content: ""; }
      @top-right { content: ""; }
      @bottom-left { content: ""; }
      @bottom-center { content: ""; }
      @bottom-right { content: ""; }`;

/**
 * Hoja de estilos base. Se pega dentro del <style> de cada documento, antes
 * de sus reglas propias, para que estas puedan afinar lo que necesiten.
 *
 * @param {object} opciones
 * @param {string} [opciones.margen]  Margen interno de la hoja Carta.
 * @param {string} [opciones.altoMinimo]  Alto minimo del bloque `.page`.
 * @param {boolean} [opciones.vistaPrevia]  Si el documento esta paginado en
 *   hojas `.page` (cotizacion, informe, acta). Cuando es true, la impresion usa
 *   exactamente la misma geometria Carta 8.5in x 11in con `padding: margen` que
 *   el generador de PDF, y `@page { margin: 0 }` suprime los encabezados/pies
 *   del navegador. Cuando es false (flujo continuo `#pz`), `@page` conserva el
 *   margen para las hojas sucesivas.
 */
export function cssHojaImpresion({
  margen = MARGEN_HOJA,
  altoMinimo = ALTO_MINIMO_HOJA,
  vistaPrevia = true,
} = {}) {
  return `
    @page {
      size: Letter;
      margin: ${vistaPrevia ? "0" : margen};${SIN_MARGENES_NAVEGADOR}
    }

    html, body { margin: 0; padding: 0; background: #ffffff; }

    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* Una «hoja» es un bloque que empieza en pagina nueva. */
    .page {
      position: relative;
      width: 100%;
      min-height: ${altoMinimo};
      display: flex;
      flex-direction: column;
      break-after: page;
      page-break-after: always;
    }
    .page:last-child, .page:last-of-type { break-after: auto; page-break-after: auto; }

    /* El pie se va al fondo del bloque sin necesidad de posicionarlo contra
       una hoja de alto fijo. */
    .page-footer { margin-top: auto; }

    /* Lo que no debe partirse por la mitad, y solo eso. Una tabla entera no
       entra en esta lista a proposito. */
    tr, thead, .no-partir, .foto-card, .bloque-firma, figure {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    /* Un titulo nunca se queda solo al final de una hoja. */
    h1, h2, h3, h4, .doc-h2, .doc-h3 {
      break-after: avoid;
      page-break-after: avoid;
    }
    p, li { orphans: 3; widows: 3; }

    /* Que ninguna imagen se salga del ancho util, venga del tamaño que venga.
       Sin !important para que logos, fotos y diagramas conserven su altura. */
    img { max-width: 100%; height: auto; }

    table { width: 100%; border-collapse: collapse; }
    /* El encabezado de una tabla larga se repite en cada hoja. */
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }

    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        ${vistaPrevia ? "width: 8.5in !important;" : ""}
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        -webkit-font-smoothing: antialiased !important;
        text-rendering: geometricPrecision !important;
      }
      .page {
        box-shadow: none !important;
        margin: 0 !important;
        border: none !important;
        border-radius: 0 !important;
        background: #ffffff !important;
        ${vistaPrevia ? `width: 8.5in !important;
        height: 11in !important;
        min-height: 11in !important;
        max-height: 11in !important;
        padding: ${margen} !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        break-after: page !important;
        page-break-after: always !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;` : `padding: 0 !important;
        width: 100% !important;`}
      }
      ${vistaPrevia ? `.page:last-child, .page:last-of-type {
        break-after: auto !important;
        page-break-after: auto !important;
      }` : ""}
      #print-toolbar, #print-toolbar + div, .no-print, button, nav {
        display: none !important;
      }
      tr, thead, .no-partir, .foto-card, .bloque-firma, figure {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      h1, h2, h3, h4, .doc-h2, .doc-h3 {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }
    }

    ${vistaPrevia ? `
    /* En pantalla se dibuja la hoja Carta exacta (8.5in x 11in) con sus
       margenes internos, identica a como sale impresa y en Descargar PDF. */
    @media screen {
      body { background: #f1f5f9; padding: 24px 0; }
      .page {
        width: 8.5in;
        min-height: 11in;
        margin: 0 auto 20px;
        padding: ${margen};
        background: #ffffff;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
      }
    }` : ""}
  `;
}
