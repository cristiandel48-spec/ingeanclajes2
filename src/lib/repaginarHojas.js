// Vuelve a repartir los bloques de un documento en hojas, MIDIENDO el
// documento ya dibujado en vez de estimar alturas.
//
// ── Por que hace falta ───────────────────────────────────────────────────
//
// El informe decide en que hoja va cada bloque con alturas calculadas a
// ojo: tantos caracteres por linea, tantos pixeles por linea, tanto por
// foto. Esas cuentas no pueden acertar -dependen de la fuente, de donde
// parte cada palabra, del alto real de cada imagen- y cuando se pasan por
// cien pixeles mandan a la hoja siguiente un bloque que en realidad cabia.
// Eso es lo que dejaba media hoja en blanco debajo de la primera actividad.
//
// Aqui no se estima nada: el documento ya esta dibujado dentro del marco
// oculto donde se va a generar el PDF, asi que se pregunta a cada bloque
// cuanto mide de verdad y se rellena cada hoja hasta donde de.
//
// ── Que espera encontrar ─────────────────────────────────────────────────
//
// Marcas `data-rol` puestas por quien genera el HTML:
//   fijo        se queda en la primera hoja, no se mueve nunca
//   encabezado  se repite arriba de cada hoja nueva
//   contenido   se reparte
//   numeracion  el «Pagina N de M» del pie, que hay que renumerar
//
// Si no encuentra esas marcas no toca nada y lo deja como estaba, asi que
// es seguro llamarlo sobre un documento que no las trae.
//
// ── Bloques que se pueden partir ─────────────────────────────────────────
//
// Un bloque de contenido se mueve entero, y cuando es alto -la descripcion
// del trabajo de un acta ocupa media hoja- al no caber se va a la hoja
// siguiente y deja un hueco en blanco enorme detras.
//
// Por eso un bloque puede venir marcado `data-divisible="1"`: dentro trae
// un `[data-parte="caja"]` cuyos hijos (los parrafos) si se pueden repartir.
// Entonces en la hoja se deja lo que quepa y el resto sigue en la siguiente,
// sin el titulo, como un texto que continua.

// Hoja Carta a 96 ppp = 11in = 1056px.
export const ALTO_HOJA_PX = 1056;

/**
 * Calcula el alto util disponible para `.page-content` dentro de una `.page`,
 * descontando los margenes internos (padding de `.page`), el encabezado
 * externo (si lo hay, como `.header` en cotizaciones) y el pie (`.footer` o
 * `.page-footer`) mas un respiro minimo para que nada pegue contra el pie.
 */
export function calcularAltoUtil(seccion, ventana) {
  if (!seccion || !ventana) return 0;
  const estilo = ventana.getComputedStyle(seccion);
  const relleno = (parseFloat(estilo.paddingTop) || 0) + (parseFloat(estilo.paddingBottom) || 0);
  const contenedor = seccion.querySelector(".page-content");
  const inner = seccion.querySelector(".page-inner") || seccion;

  let altoFijos = 0;
  if (contenedor && inner !== contenedor) {
    for (const hijo of inner.children) {
      if (hijo === contenedor) continue;
      const r = hijo.getBoundingClientRect();
      const st = ventana.getComputedStyle(hijo);
      const esPie = hijo.classList.contains("footer") || hijo.classList.contains("page-footer");
      if (esPie) {
        // El pie lleva margin-top: auto; solo descontamos su altura real + respiro.
        altoFijos += r.height + 10;
      } else {
        const mt = parseFloat(st.marginTop) || 0;
        const mb = parseFloat(st.marginBottom) || 0;
        altoFijos += r.height + mt + mb;
      }
    }
  } else {
    const pie = seccion.querySelector(".page-footer, .footer");
    if (pie) altoFijos += pie.getBoundingClientRect().height + 10;
  }

  return ALTO_HOJA_PX - relleno - altoFijos - 2;
}

function repaginarSecciones(secciones, { altoUtil, ventana }) {
  if (!secciones.length) return null;

  const contenedorDe = (seccion) => seccion.querySelector(".page-content") || seccion;

  // 1. Se recoge todo en orden y se separa por su papel.
  let fijo = null;
  let encabezado = null;
  const bloques = [];

  for (const seccion of secciones) {
    for (const hijo of [...contenedorDe(seccion).children]) {
      const rol = hijo.getAttribute?.("data-rol");
      if (rol === "fijo") { fijo = hijo; continue; }
      // Solo hace falta quedarse con uno: se clona para las demas hojas.
      if (rol === "encabezado") { if (!encabezado) encabezado = hijo; continue; }
      if (rol === "contenido") { bloques.push(hijo); continue; }
    }
  }

  // Sin marcas no hay nada que hacer: se deja el documento como vino.
  if (!fijo && !bloques.length) return null;

  // 2. La primera hoja se queda con lo fijo; las demas se vacian para
  //    volver a llenarlas.
  const molde = secciones[0];
  for (const seccion of secciones) contenedorDe(seccion).replaceChildren();

  const nuevas = [];
  // La ultima hoja que hay puesta en el documento. Hace falta llevarla a
  // mano: `secciones` es la lista de las que habia al empezar, asi que a
  // partir de la tercera hoja nueva todas se colgaban detras de la primera
  // y el documento quedaba con las hojas desordenadas.
  let ultima = secciones[secciones.length - 1];
  const abrirHoja = (primera) => {
    let seccion;
    if (nuevas.length < secciones.length) {
      seccion = secciones[nuevas.length];
    } else {
      seccion = molde.cloneNode(false);
      seccion.className = molde.className;
      seccion.innerHTML = molde.innerHTML;
      contenedorDe(seccion).replaceChildren();
      ultima.after(seccion);
    }
    ultima = seccion;
    const caja = contenedorDe(seccion);
    if (primera && fijo) caja.appendChild(fijo);
    if (!primera && encabezado) caja.appendChild(encabezado.cloneNode(true));
    nuevas.push(seccion);
    return caja;
  };

  let caja = abrirHoja(true);
  let movidos = 0;

  const altoDe = (caja) => {
    // El alto real que ocupa lo puesto en la hoja, incluyendo los margenes
    // verticales entre bloques consecutivos (.flow-block + .flow-block, etc.).
    const hijos = [...caja.children];
    if (!hijos.length) return 0;
    const primero = hijos[0];
    const ultimo = hijos[hijos.length - 1];
    const rPrimero = primero.getBoundingClientRect();
    const rUltimo = ultimo.getBoundingClientRect();
    const medido = rUltimo.bottom - rPrimero.top;
    if (medido > 0) {
      let extra = 0;
      if (ventana?.getComputedStyle) {
        extra += Math.max(0, parseFloat(ventana.getComputedStyle(primero).marginTop) || 0);
        extra += Math.max(0, parseFloat(ventana.getComputedStyle(ultimo).marginBottom) || 0);
      }
      return medido + extra;
    }
    let total = 0;
    for (const hijo of hijos) {
      const r = hijo.getBoundingClientRect();
      total += r.height;
    }
    return total;
  };

  // Deja en la hoja los parrafos del bloque que quepan y devuelve un bloque
  // gemelo -sin titulo- con los que sobraron, o null si no se pudo partir.
  const partir = (bloque) => {
    const contenedor = bloque.querySelector('[data-parte="caja"]');
    const parrafos = contenedor ? [...contenedor.children] : [];
    if (parrafos.length < 2) return null;

    contenedor.replaceChildren();
    caja.appendChild(bloque);

    const sobrantes = [];
    for (const parrafo of parrafos) {
      // En cuanto uno no cabe, los que siguen van detras de el: el texto
      // tiene que seguir leyendose en orden.
      if (sobrantes.length) { sobrantes.push(parrafo); continue; }
      contenedor.appendChild(parrafo);
      if (altoDe(caja) > altoUtil) {
        contenedor.removeChild(parrafo);
        sobrantes.push(parrafo);
      }
    }

    // Ni el primer parrafo cabia: partirlo no sirve de nada, se deja que el
    // bloque entero se vaya a la hoja siguiente.
    if (!contenedor.children.length) {
      caja.removeChild(bloque);
      contenedor.replaceChildren(...parrafos);
      return null;
    }

    const resto = bloque.cloneNode(false);
    const cajaResto = contenedor.cloneNode(false);
    cajaResto.append(...sobrantes);
    resto.appendChild(cajaResto);
    return resto;
  };

  // Muestra u oculta el rotulo "(cont.)" embebido dentro de una fila de fotos
  // segun quede al inicio de una hoja nueva (justo tras el encabezado) o
  // pegada debajo de la fila anterior en la misma hoja. Asi nunca queda un
  // titulo huerfano al final de una pagina ni un "(cont.)" en mitad de hoja.
  const actualizarBannerCont = (bloque, cajaActual, esPrimeraHoja) => {
    const banner = bloque.querySelector?.('[data-banner-cont="1"]');
    if (!banner) return;
    const soloEncabezado = !esPrimeraHoja && cajaActual.children.length === 1 && cajaActual.children[0]?.getAttribute?.("data-rol") === "encabezado";
    const vacia = !esPrimeraHoja && cajaActual.children.length === 0;
    banner.style.display = (soloEncabezado || vacia) ? "flex" : "none";
  };

  const pendientes = [...bloques];
  while (pendientes.length) {
    const bloque = pendientes.shift();
    const esPrimeraHoja = nuevas.length === 1;
    actualizarBannerCont(bloque, caja, esPrimeraHoja);
    caja.appendChild(bloque);
    if (altoDe(caja) <= altoUtil) continue;

    const eraElUnico = caja.children.length === 1 || (!esPrimeraHoja && caja.children.length === 2 && caja.children[0]?.getAttribute?.("data-rol") === "encabezado");
    caja.removeChild(bloque);

    const resto = bloque.dataset?.divisible === "1" ? partir(bloque) : null;
    if (resto) {
      // Lo que cupo ya quedo puesto; el resto sigue en la hoja siguiente.
      caja = abrirHoja(false);
      pendientes.unshift(resto);
      movidos += 1;
      continue;
    }

    // No cabia y no se puede partir. Si es el unico bloque de la hoja se
    // queda igual, porque moverlo no arreglaria nada y lo dejaria dando
    // saltos de hoja en hoja.
    if (eraElUnico) {
      actualizarBannerCont(bloque, caja, esPrimeraHoja);
      caja.appendChild(bloque);
      continue;
    }
    caja = abrirHoja(false);
    actualizarBannerCont(bloque, caja, false);
    caja.appendChild(bloque);
    movidos += 1;
  }

  // Evita dejar un bloque marcado `data-no-solo="1"` (ej. firma) huerfano en
  // la ultima hoja cuando puede acompañarse del ultimo bloque de la hoja previa.
  if (nuevas.length >= 2) {
    const ultimaCaja = contenedorDe(nuevas[nuevas.length - 1]);
    const penultimaCaja = contenedorDe(nuevas[nuevas.length - 2]);
    const contenidosUltima = [...ultimaCaja.children].filter((h) => h.getAttribute?.("data-rol") === "contenido");
    const contenidosPenultima = [...penultimaCaja.children].filter((h) => h.getAttribute?.("data-rol") === "contenido");
    if (
      contenidosUltima.length === 1 &&
      contenidosUltima[0].dataset?.noSolo === "1" &&
      contenidosPenultima.length >= 2
    ) {
      const acompanante = contenidosPenultima[contenidosPenultima.length - 1];
      ultimaCaja.insertBefore(acompanante, contenidosUltima[0]);
      if (altoDe(ultimaCaja) > altoUtil) {
        penultimaCaja.appendChild(acompanante);
      } else {
        movidos += 1;
      }
    }
  }

  // 3. Se tiran las hojas que quedaron sin usar y se renumera el pie.
  for (const seccion of secciones) {
    if (!nuevas.includes(seccion)) seccion.remove();
  }
  nuevas.forEach((seccion, i) => {
    const marca = seccion.querySelector('[data-rol="numeracion"]');
    if (marca) marca.textContent = `Página ${i + 1} de ${nuevas.length}`;
  });

  return { hojas: nuevas.length, movidos };
}

/**
 * @param {Document} doc  Documento ya dibujado (iframe oculto o pestaña de impresion).
 * @param {object} [opciones]
 * @param {number} [opciones.altoUtil]  Alto disponible para el contenido de una
 *   hoja en pixeles. Si se omite se mide con `calcularAltoUtil`.
 * @param {Window} [opciones.ventana]  Ventana duena de `doc` (por defecto `doc.defaultView`).
 * @returns {{hojas:number, movidos:number}|null}
 */
export function repaginarHojas(doc, { altoUtil, ventana } = {}) {
  const todas = [...doc.querySelectorAll(".page")];
  if (!todas.length) return null;
  const win = ventana || doc.defaultView;

  // Documentos con hojas fijas (portada, fichas tecnicas) y tramos fluidos
  // marcados con `data-flujo` (ej. cotizaciones): cada tramo contiguo se
  // repagina sin mover ni alterar las hojas fijas.
  const conFlujo = todas.filter((s) => s.hasAttribute("data-flujo"));
  if (conFlujo.length) {
    const grupos = [];
    let actual = null;
    for (const seccion of todas) {
      const id = seccion.getAttribute("data-flujo");
      if (!id) {
        actual = null;
        continue;
      }
      if (actual && actual.id === id) {
        actual.secciones.push(seccion);
      } else {
        actual = { id, secciones: [seccion] };
        grupos.push(actual);
      }
    }
    let hojas = 0;
    let movidos = 0;
    for (const grupo of grupos) {
      const utilGrupo = altoUtil || calcularAltoUtil(grupo.secciones[0], win);
      if (!(utilGrupo > 200)) continue;
      const res = repaginarSecciones(grupo.secciones, { altoUtil: utilGrupo, ventana: win });
      if (res) {
        hojas += res.hojas;
        movidos += res.movidos;
      }
    }
    // El pie de la cotizacion lleva «Página N de M» contando TODAS las hojas
    // -portada, fichas y tramos-, no solo las de un tramo como la numeracion
    // de arriba. Se renumera al final porque el reparto pudo quitar o agregar
    // hojas, y las que se clonan heredan el numero de la que copiaron.
    const finales = [...doc.querySelectorAll(".page")];
    finales.forEach((seccion, i) => {
      const marca = seccion.querySelector('[data-rol="paginacion"]');
      if (marca) marca.textContent = `Página ${i + 1} de ${finales.length}`;
    });
    return { hojas, movidos };
  }

  // Documentos de un solo flujo continuo (informes y actas).
  const util = altoUtil || calcularAltoUtil(todas[0], win);
  if (!(util > 200)) return null;
  return repaginarSecciones(todas, { altoUtil: util, ventana: win });
}
