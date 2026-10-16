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

/**
 * @param {Document} doc  Documento ya dibujado (el del iframe oculto).
 * @param {object} opciones
 * @param {number} opciones.altoUtil  Alto disponible para el contenido de
 *   una hoja, en pixeles de pantalla. Es el alto de la hoja menos los
 *   margenes de arriba y abajo y menos el pie.
 * @returns {{hojas:number, movidos:number}|null}
 */
export function repaginarHojas(doc, { altoUtil }) {
  const secciones = [...doc.querySelectorAll(".page")];
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
  const abrirHoja = (primera) => {
    let seccion;
    if (nuevas.length < secciones.length) {
      seccion = secciones[nuevas.length];
    } else {
      seccion = molde.cloneNode(false);
      seccion.className = molde.className;
      seccion.innerHTML = molde.innerHTML;
      contenedorDe(seccion).replaceChildren();
      secciones[secciones.length - 1].after(seccion);
    }
    const caja = contenedorDe(seccion);
    if (primera && fijo) caja.appendChild(fijo);
    if (!primera && encabezado) caja.appendChild(encabezado.cloneNode(true));
    nuevas.push(seccion);
    return caja;
  };

  let caja = abrirHoja(true);
  let movidos = 0;

  const altoDe = (caja) => {
    // El alto que de verdad ocupa lo que lleva puesto la hoja.
    let total = 0;
    for (const hijo of caja.children) {
      const r = hijo.getBoundingClientRect();
      total += r.height;
    }
    return total;
  };

  for (const bloque of bloques) {
    caja.appendChild(bloque);
    if (altoDe(caja) > altoUtil && caja.children.length > 1) {
      // No cabia: se lleva a una hoja nueva. Si es el unico bloque de la
      // hoja se queda igual, porque moverlo no arreglaria nada y lo
      // dejaria dando saltos de hoja en hoja.
      caja.removeChild(bloque);
      caja = abrirHoja(false);
      caja.appendChild(bloque);
      movidos += 1;
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
