// Genera el PDF de un documento de flujo continuo -certificacion,
// recertificacion, informe de actividades- garantizando que NUNCA se corten
// fotos, tablas, textos ni firmas entre paginas.

const PX_A_PT = 72 / 96;
const ESCALA_DIBUJO = 2;

// Hoja Carta a 96 ppp: 8,5 x 11 pulgadas
const ANCHO_HOJA = 816;
const ALTO_HOJA = 1056;
const MARGEN = 40;
const ANCHO_UTIL = ANCHO_HOJA - MARGEN * 2;
const ALTO_UTIL = ALTO_HOJA - MARGEN * 2;
const HOJA_PT = [ANCHO_HOJA * PX_A_PT, ALTO_HOJA * PX_A_PT];

const HOJA_ESTILOS = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: 'Aptos', 'Segoe UI', Arial, sans-serif; }
  .doc-shell { background: #fff; border: 0 !important; padding: 0 !important; margin: 0 !important; width: 100% !important; }
  .doc-shell table { width: 100%; border-collapse: collapse; }
  img { max-width: 100%; }
`;

async function esperarRecursos(doc) {
  try {
    if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
  } catch {
    // API no soportada
  }

  const imagenes = [...doc.images].filter((img) => !img.complete);
  if (!imagenes.length) return;
  await Promise.all(
    imagenes.map(
      (img) =>
        new Promise((listo) => {
          img.addEventListener("load", listo, { once: true });
          img.addEventListener("error", listo, { once: true });
        })
    )
  );
}

/**
 * Identifica todas las cajas visuales atómicas que NO deben partirse por la mitad.
 * Incluye filas de tablas (tr), tarjetas de fotos, encabezados de sección y bloques de firma.
 */
function obtenerCajasAtomicas(raiz) {
  const arriba = raiz.getBoundingClientRect().top;
  const cajas = [];

  // 1. Filas de tablas (tr)
  raiz.querySelectorAll("tr").forEach((tr) => {
    const r = tr.getBoundingClientRect();
    if (r.height > 0) {
      cajas.push({
        tipo: tr.closest("thead") ? "header" : "tr",
        top: Math.round(r.top - arriba),
        bottom: Math.round(r.bottom - arriba),
        height: Math.round(r.height),
      });
    }
  });

  // 2. Tarjetas de fotos (cada recuadro de foto con su imagen y comentario)
  raiz.querySelectorAll("img").forEach((img) => {
    const tarjeta = img.closest(".foto-card") || img.closest("div") || img;
    const r = tarjeta.getBoundingClientRect();
    if (r.height > 0) {
      cajas.push({
        tipo: "foto",
        top: Math.round(r.top - arriba),
        bottom: Math.round(r.bottom - arriba),
        height: Math.round(r.height),
      });
    }
  });

  // 3. Encabezados de sección y títulos
  raiz.querySelectorAll("div, h1, h2, h3, h4").forEach((el) => {
    const texto = String(el.textContent || "").trim();
    const esEncabezado =
      el.classList.contains("seccion-header") ||
      texto.startsWith("REGISTRO FOTOGRÁFICO") ||
      texto === "PERSONAL EN OBRA" ||
      texto === "RECOMENDACIONES" ||
      texto === "Informe de Actividades" ||
      texto.includes("INFORME DE ACTIVIDADES");

    if (esEncabezado) {
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.height < 120) {
        cajas.push({
          tipo: "header",
          top: Math.round(r.top - arriba),
          bottom: Math.round(r.bottom - arriba),
          height: Math.round(r.height),
        });
      }
    }
  });

  // 4. Bloque de firma al final del documento
  const bloquesFirma = [...raiz.querySelectorAll("div")].filter(
    (el) =>
      el.classList.contains("firma-bloque") ||
      (el.textContent.includes("Cordialmente") && el.textContent.includes("ING."))
  );
  if (bloquesFirma.length) {
    const firmaEl = bloquesFirma[bloquesFirma.length - 1];
    const r = firmaEl.getBoundingClientRect();
    if (r.height > 0) {
      cajas.push({
        tipo: "firma",
        top: Math.round(r.top - arriba),
        bottom: Math.round(r.bottom - arriba),
        height: Math.round(r.height),
      });
    }
  }

  // Ordenar por posición vertical
  cajas.sort((a, b) => a.top - b.top || a.bottom - b.bottom);

  // Unificar cajas que están en la misma fila horizontal (ej. dos fotos lado a lado)
  const cajasUnificadas = [];
  for (const caja of cajas) {
    const ultima = cajasUnificadas[cajasUnificadas.length - 1];
    if (ultima && Math.abs(caja.top - ultima.top) < 24 && caja.tipo === ultima.tipo) {
      ultima.top = Math.min(ultima.top, caja.top);
      ultima.bottom = Math.max(ultima.bottom, caja.bottom);
      ultima.height = ultima.bottom - ultima.top;
    } else {
      cajasUnificadas.push({ ...caja });
    }
  }

  return cajasUnificadas;
}

/**
 * Calcula los cortes limpios de página para que ningún elemento quede mochado.
 */
function calcularCortesPagina(cajas, altoTotal, altoPagina) {
  const cortes = [];
  let desde = 0;

  while (desde < altoTotal - 10) {
    const topeIdeal = desde + altoPagina;

    if (topeIdeal >= altoTotal) {
      cortes.push(altoTotal);
      break;
    }

    let corteElegido = topeIdeal;
    let huboConflicto = false;

    for (let i = 0; i < cajas.length; i += 1) {
      const c = cajas[i];

      // Si la caja empieza después del tope ideal, no nos afecta en esta hoja
      if (c.top >= topeIdeal) break;

      // Si la caja empieza en esta hoja pero termina después del tope (estaría mocha)
      if (c.top >= desde && c.bottom > topeIdeal) {
        let candidato = c.top;

        // Regla contra títulos/encabezados huérfanos:
        // Si el elemento inmediatamente anterior es un encabezado que empezó en esta hoja,
        // no dejarlo solo al fondo de la hoja; pasarlo también a la siguiente página.
        if (i > 0) {
          const anterior = cajas[i - 1];
          if (
            anterior.tipo === "header" &&
            anterior.top >= desde &&
            anterior.bottom <= candidato &&
            candidato - anterior.top < 90
          ) {
            candidato = anterior.top;
          }
        }

        // Si el corte permite un avance razonable
        if (candidato > desde + 50) {
          corteElegido = candidato;
          huboConflicto = true;
          break;
        }
      }
    }

    // Si ninguna caja fue cortada directamente por topeIdeal, buscar el límite inferior
    // de la última caja que cabe completa para no dejar espacios en blanco innecesarios
    if (!huboConflicto) {
      const queCaben = cajas.filter((c) => c.bottom > desde && c.bottom <= topeIdeal);
      if (queCaben.length > 0) {
        const ultimaQueCabe = queCaben[queCaben.length - 1];
        if (topeIdeal - ultimaQueCabe.bottom < 40) {
          corteElegido = ultimaQueCabe.bottom;
        }
      }
    }

    // Asegurarse de que siempre se avanza hacia adelante
    if (corteElegido <= desde + 30) {
      corteElegido = Math.min(desde + altoPagina, altoTotal);
    }

    cortes.push(corteElegido);
    desde = corteElegido;
  }

  return cortes;
}

/**
 * Devuelve { blob, nombre } con el PDF del documento que hay en pantalla.
 *
 * @param {HTMLElement} nodo  El contenedor del documento (#pz).
 * @param {string} nombre     Nombre del archivo sin extensión.
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

  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.style.cssText = `position:fixed;left:0;top:0;width:${ANCHO_UTIL}px;opacity:0.01;pointer-events:none;z-index:-9999;border:0;`;
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
    await esperarRecursos(doc);
    await new Promise((listo) => setTimeout(listo, 140));

    const raiz = doc.body.firstElementChild;
    if (!raiz) throw new Error("No se pudo leer el documento generado.");
    const altoTotal = raiz.scrollHeight;

    const cajas = obtenerCajasAtomicas(raiz);
    const cortes = calcularCortesPagina(cajas, altoTotal, ALTO_UTIL);

    const lienzo = await html2canvas(raiz, {
      scale: ESCALA_DIBUJO,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: ANCHO_UTIL,
      windowHeight: altoTotal,
    });

    const escala = ESCALA_DIBUJO;
    const pdf = new jsPDF({ unit: "pt", format: HOJA_PT, orientation: "portrait" });
    const recorte = document.createElement("canvas");
    const pincel = recorte.getContext("2d");

    let desde = 0;
    let primera = true;

    for (const hasta of cortes) {
      const altoTrozo = Math.round((hasta - desde) * escala);
      if (altoTrozo <= 0) continue;

      recorte.width = lienzo.width;
      recorte.height = altoTrozo;
      pincel.fillStyle = "#ffffff";
      pincel.fillRect(0, 0, recorte.width, recorte.height);

      const yLienzo = Math.round(desde * escala);
      const disponible = Math.max(0, Math.min(altoTrozo, lienzo.height - yLienzo));
      if (disponible > 0) {
        pincel.drawImage(
          lienzo,
          0,
          yLienzo,
          lienzo.width,
          disponible,
          0,
          0,
          lienzo.width,
          disponible
        );
      }

      if (!primera) pdf.addPage(HOJA_PT, "portrait");
      primera = false;

      pdf.addImage(
        recorte.toDataURL("image/jpeg", 0.92),
        "JPEG",
        MARGEN * PX_A_PT,
        MARGEN * PX_A_PT,
        ANCHO_UTIL * PX_A_PT,
        (altoTrozo / escala) * PX_A_PT,
        undefined,
        "FAST"
      );

      desde = hasta;
    }

    return { blob: pdf.output("blob"), nombre: `${nombre}.pdf` };
  } finally {
    marco.remove();
  }
}

function nombreDeArchivo(nombre) {
  const limpio = String(nombre || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return limpio.slice(0, 120) || "Documento";
}

/** Genera el PDF y lo descarga automáticamente */
export async function descargarDocumentoPdf(nodo, nombre) {
  const { blob, nombre: archivo } = await generarDocumentoPdf(nodo, nombreDeArchivo(nombre));
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
