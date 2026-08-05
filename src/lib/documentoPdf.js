// Genera el PDF de un documento de flujo continuo -certificacion,
// recertificacion, informe de actividades- sin pasar por el dialogo de
// impresion del navegador.
//
// POR QUE EXISTE: imprimiendo con Ctrl+P, Chrome estampa su encabezado y su
// pie en cada hoja: la fecha, el titulo, "about:blank" y el numero de pagina.
// Eso no se puede desactivar desde el codigo -es una casilla del dialogo, del
// lado de quien imprime- y salia en los documentos que se le entregan al
// cliente. Generando el archivo aqui, no aparece nunca.
//
// DIFERENCIA CON cotizacionPdf: la cotizacion ya trae sus hojas marcadas
// (`.page`), asi que alli basta con recorrerlas. El certificado y el informe
// son un texto corrido, y hay que decidir DONDE cortar. Cortar cada 1056px a
// ciegas parte una foto o una fila de tabla por la mitad, que se ve peor que
// el problema que veniamos a resolver.

// El documento se DIBUJA en pixeles -es como mide el navegador, a 96 por
// pulgada- pero el PDF se DECLARA en puntos, que es la unidad del papel: 72 por
// pulgada. Sin esa conversion la hoja salia de 15,1 x 19,6 pulgadas en vez de
// carta, la impresora la encogia al 56% para que cupiera, y el texto llegaba al
// papel a unos 4,6 pt: ilegible. De ahi venia lo de "la letra sale
// desproporcionada".
const PX_A_PT = 72 / 96;

// A cuanto se dibuja el documento antes de meterlo en el PDF. A 2 el texto se
// lee limpio sin disparar el peso del archivo.
const ESCALA_DIBUJO = 2;

// Carta a 96 ppp: 8,5 x 11 pulgadas.
const ANCHO_HOJA = 816;
const ALTO_HOJA = 1056;
// 12 mm, EL MISMO margen que `@page` en print.js. Los dos botones tienen que
// sacar la misma hoja: si aqui se pone otro numero, "Descargar PDF" e
// "Imprimir" dan documentos distintos y el de descargar es el que se manda al
// cliente. Si algun dia se quiere mas aire, hay que cambiarlo en los dos sitios.
const MARGEN = 45;
const ANCHO_UTIL = ANCHO_HOJA - MARGEN * 2;
const ALTO_UTIL = ALTO_HOJA - MARGEN * 2;

// Medidas de la hoja ya en puntos, que es como hay que dárselas a jsPDF.
const HOJA_PT = [ANCHO_HOJA * PX_A_PT, ALTO_HOJA * PX_A_PT];

// OJO con el tamaño de letra: aqui NO se declara ninguno.
//
// El documento se copia entero -con el `style` que lleva puesto en pantalla-,
// asi que el tamaño lo pone el, igual que cuando se imprime con Ctrl+P. Antes
// el body declaraba `font-size:12pt` y solo se copiaba el CONTENIDO del
// documento, no el elemento: se perdia su tamaño y todo lo que no llevara uno
// propio caia a esos 12 pt, o sea 16 px en vez de 10. De ahi que el boton de
// descargar sacara las letras mucho mas grandes que el de imprimir.
const HOJA_ESTILOS = `
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  html,body{margin:0;padding:0;background:#fff;}
  .doc-shell{background:#fff;border:0 !important;padding:0 !important;
    margin:0 !important;width:100% !important;}
  .doc-shell table{width:100%;border-collapse:collapse;}
  img{max-width:100%;}
`;

/** Espera a que carguen las imagenes; sin esto salen huecos en blanco. */
function esperarImagenes(doc) {
  const imagenes = [...doc.images].filter((img) => !img.complete);
  if (!imagenes.length) return Promise.resolve();
  return Promise.all(imagenes.map((img) => new Promise((listo) => {
    img.addEventListener("load", listo, { once: true });
    img.addEventListener("error", listo, { once: true });
  })));
}

/**
 * Posiciones donde se puede cortar sin partir nada, en pixeles del documento.
 *
 * Se recorren los bloques de primer nivel y, dentro de las tablas, sus filas:
 * el final de cada uno es un sitio seguro. Asi el corte cae entre dos filas o
 * entre dos fotos, nunca por la mitad de una.
 */
function limitesSeguros(raiz) {
  const limites = new Set([0]);
  const arriba = raiz.getBoundingClientRect().top;

  const registrar = (elemento) => {
    const caja = elemento.getBoundingClientRect();
    if (caja.height <= 0) return;
    limites.add(Math.round(caja.bottom - arriba));
  };

  // Por debajo de esto una pieza no se parte por dentro: una fila de tabla, un
  // titulo, un pie de foto. Son las unidades minimas del documento.
  const ATOMICO = 140;

  // Se baja por el arbol hasta llegar a esas unidades minimas.
  //
  // Antes solo se bajaba dentro de un bloque si el bloque NO cabia en una hoja
  // entera. Sonaba prudente y salia caro: la tabla de una actividad mide unos
  // 500 px, cabe de sobra en una hoja, asi que se trataba como indivisible; si
  // en la pagina en curso quedaban 366 px libres, se iba entera a la siguiente
  // y dejaba ese hueco en blanco. Las hojas salian llenas al 60% y la firma
  // terminaba sola en la ultima.
  //
  // Partir una tabla entre dos filas es normal y se lee bien. Lo que no se debe
  // partir es una foto de su pie, y de eso se encarga la regla de abajo.
  const descender = (elemento, profundidad = 0) => {
    registrar(elemento);
    if (profundidad >= 8) return;

    const alto = elemento.getBoundingClientRect().height;
    if (alto <= ATOMICO) return;

    // Un recuadro con UNA sola foto es una unidad: la imagen y su comentario
    // van juntos o no van. La rejilla que los contiene lleva varias, asi que
    // esta regla no la frena y se sigue pudiendo cortar entre foto y foto.
    if (elemento.querySelectorAll("img").length === 1 && alto <= ALTO_UTIL) return;

    [...elemento.children].forEach((hijo) => descender(hijo, profundidad + 1));
  };

  raiz.querySelectorAll(":scope > *").forEach((bloque) => descender(bloque));

  // Dos fotos lado a lado terminan a alturas parecidas pero no iguales. Si se
  // corta por la mas baja, la otra se parte igual. Los limites que caen a menos
  // de 24 px se tratan como uno solo y se conserva el mas bajo del grupo, que
  // es el que deja pasar la fila completa.
  const ordenados = [...limites].sort((a, b) => a - b);
  const agrupados = [];
  for (const limite of ordenados) {
    const ultimo = agrupados[agrupados.length - 1];
    if (agrupados.length && limite - ultimo < 24) agrupados[agrupados.length - 1] = limite;
    else agrupados.push(limite);
  }

  // Y ADEMAS, entre renglon y renglon.
  //
  // Hasta aqui solo se sabia cortar entre bloques enteros. Cuando un parrafo
  // largo no cabia en lo que quedaba de hoja, no habia ningun sitio valido
  // dentro y el corte se hacia a la fuerza por donde tocara: a media letra,
  // con la parte de arriba del renglon en una hoja y la de abajo en la
  // siguiente. Sabiendo donde termina cada renglon, el corte cae en el hueco
  // que hay entre dos y la frase se lee entera en su hoja.
  return [...new Set([...agrupados, ...limitesEntreRenglones(raiz, arriba)])]
    .sort((a, b) => a - b);
}

/**
 * Los huecos entre renglon y renglon, en pixeles del documento.
 *
 * No entra donde haya imagenes: entre una foto y su pie tambien hay un hueco,
 * y cortar ahi las separaria. Tampoco en las tablas: dos celdas de la misma
 * fila no siempre empiezan a la misma altura, y ese desnivel se confundiria
 * con un hueco entre renglones y partiria la fila. Las filas ya aportan sus
 * propios cortes.
 */
function limitesEntreRenglones(raiz, arriba) {
  const doc = raiz.ownerDocument;
  const rango = doc.createRange();
  const renglones = [];

  const recorrer = (elemento) => {
    // Si en el bloque hay una foto o una tabla, se deja entero en paz.
    //
    // Se intento bajar hijo a hijo para aprovechar los que estuvieran libres,
    // y salio peor: en la rejilla de fotos, los pies de dos tarjetas vecinas
    // no empiezan a la misma altura, ese desnivel se tomaba por un hueco
    // entre renglones y el corte partia la foto de al lado. Medido: 16 fotos
    // partidas en 14 informes. Aqui no hacen falta cortes finos; los limites
    // de bloque ya los dan.
    if (elemento.tagName === "TABLE" || elemento.tagName === "IMG") return;
    if (elemento.querySelector("img, table")) return;
    const paseo = doc.createTreeWalker(elemento, NodeFilter.SHOW_TEXT);
    let nodo;
    while ((nodo = paseo.nextNode())) {
      if (!nodo.nodeValue || !nodo.nodeValue.trim()) continue;
      rango.selectNodeContents(nodo);
      for (const linea of rango.getClientRects()) {
        if (linea.height > 0) {
          renglones.push({ top: linea.top - arriba, bottom: linea.bottom - arriba });
        }
      }
    }
  };
  // Se arranca por los bloques de primer nivel: la raiz suele llevar alguna
  // foto y se descartaria el documento entero.
  raiz.querySelectorAll(":scope > *").forEach(recorrer);

  renglones.sort((a, b) => a.top - b.top);

  // El corte va en mitad del hueco, no pegado a la letra: asi no se llevan por
  // delante los rabos de las jotas y las ges del renglon de arriba.
  const cortes = [];
  for (let i = 0; i < renglones.length - 1; i += 1) {
    const fin = renglones[i].bottom;
    const empieza = renglones[i + 1].top;
    if (empieza > fin) cortes.push(Math.round((fin + empieza) / 2));
  }
  return cortes;
}

/**
 * Devuelve { blob, nombre } con el PDF del documento que hay en pantalla.
 *
 * @param {HTMLElement} nodo  El contenedor del documento (normalmente #pz).
 * @param {string} nombre     Nombre del archivo, sin extension.
 */
export async function generarDocumentoPdf(nodo, nombre = "Documento") {
  if (!nodo) throw new Error("No se encontró el documento en pantalla.");

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

  // Se dibuja fuera de la vista, no oculto: con display:none o
  // visibility:hidden, html2canvas mide todo en cero.
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.style.cssText = `position:fixed;left:-10000px;top:0;width:${ANCHO_UTIL}px;height:${ALTO_UTIL}px;border:0;`;
  document.body.appendChild(marco);

  try {
    marco.srcdoc = `<!doctype html><html><head><meta charset="utf-8">
      <style>${HOJA_ESTILOS}</style></head>
      <body>${nodo.outerHTML}</body></html>`;

    await new Promise((listo, fallo) => {
      marco.addEventListener("load", listo, { once: true });
      marco.addEventListener("error", () => fallo(new Error("No se pudo preparar el documento.")), { once: true });
    });

    const doc = marco.contentDocument;
    if (!doc) throw new Error("No se pudo leer el documento generado.");
    await esperarImagenes(doc);
    // Un respiro para que termine de acomodarse el texto antes de medir.
    await new Promise((listo) => setTimeout(listo, 120));

    const raiz = doc.body.firstElementChild;
    if (!raiz) throw new Error("No se pudo leer el documento generado.");
    const altoTotal = raiz.scrollHeight;
    const cortes = limitesSeguros(raiz);

    const lienzo = await html2canvas(raiz, {
      scale: ESCALA_DIBUJO,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: ANCHO_UTIL,
      windowHeight: altoTotal,
    });

    // La escala es la que se le pidio al dibujar, NO la que se deduzca de la
    // altura del lienzo.
    //
    // POR QUE: html2canvas suele dibujar unos pixeles menos de alto que el
    // scrollHeight del documento -no pinta el margen que sobra al final-.
    // Dividiendo esa altura entre la del documento salia 1,965 en vez de 2, y
    // ese error se repartia por toda la hoja: el corte que se habia calculado
    // en el pixel 846 se recortaba en el 832, catorce pixeles mas arriba, o
    // sea A MEDIO RENGLON. De ahi que la ultima linea saliera cortada por la
    // mitad, con la parte de arriba en una hoja y la de abajo en la siguiente.
    const escala = ESCALA_DIBUJO;
    const altoPagina = ALTO_UTIL;

    const pdf = new jsPDF({ unit: "pt", format: HOJA_PT, orientation: "portrait" });
    const recorte = document.createElement("canvas");
    const pincel = recorte.getContext("2d");

    let desde = 0;
    let primera = true;

    while (desde < altoTotal - 1) {
      const tope = desde + altoPagina;

      // El corte mas bajo que quepa en la hoja. Si ningun bloque cabe entero
      // -una foto mas alta que la pagina- se corta a la fuerza, que es peor
      // pero al menos no se pierde contenido.
      let hasta = cortes.reduce((mejor, corte) => (
        corte > desde && corte <= tope ? Math.max(mejor, corte) : mejor
      ), 0);
      if (hasta <= desde) hasta = Math.min(tope, altoTotal);
      if (altoTotal - hasta < 4) hasta = altoTotal;

      const altoTrozo = Math.round((hasta - desde) * escala);
      recorte.width = lienzo.width;
      recorte.height = altoTrozo;
      pincel.fillStyle = "#ffffff";
      pincel.fillRect(0, 0, recorte.width, recorte.height);

      // Del dibujo se toma solo lo que existe: como puede quedarse corto al
      // final, pedirle mas pintaria una banda negra en el pie de la ultima
      // hoja. Lo que falte se queda en blanco, que es lo que habia ahi.
      const yLienzo = Math.round(desde * escala);
      const disponible = Math.max(0, Math.min(altoTrozo, lienzo.height - yLienzo));
      if (disponible > 0) {
        pincel.drawImage(lienzo, 0, yLienzo, lienzo.width, disponible,
                         0, 0, lienzo.width, disponible);
      }

      if (!primera) pdf.addPage(HOJA_PT, "portrait");
      primera = false;

      // JPEG y no PNG: con fotos de obra el PNG multiplica el peso por diez.
      pdf.addImage(
        recorte.toDataURL("image/jpeg", 0.92), "JPEG",
        MARGEN * PX_A_PT, MARGEN * PX_A_PT,
        ANCHO_UTIL * PX_A_PT, (altoTrozo / escala) * PX_A_PT,
        undefined, "FAST",
      );

      desde = hasta;
    }

    return { blob: pdf.output("blob"), nombre: `${nombre}.pdf` };
  } finally {
    marco.remove();
  }
}

// Windows no deja guardar un archivo con \ / : * ? " < > | en el nombre, y el
// nombre se arma con datos escritos a mano -proyectos como "SEDE 1/2"-, asi
// que se limpian antes de descargar en vez de que falle el guardado.
function nombreDeArchivo(nombre) {
  const limpio = String(nombre || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // 120 caracteres: deja sitio para la carpeta de destino sin pasarse del
  // limite de ruta de Windows.
  return limpio.slice(0, 120) || "Documento";
}

/** Genera el PDF y lo descarga. */
export async function descargarDocumentoPdf(nodo, nombre) {
  const { blob, nombre: archivo } = await generarDocumentoPdf(nodo, nombreDeArchivo(nombre));
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Se libera despues: en Safari, revocar de inmediato cancela la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
