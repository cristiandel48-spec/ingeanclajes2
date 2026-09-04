// Genera el PDF del informe de actividades hoja por hoja (.page)
// garantizando fidelidad 100%, 0 cortes en fotos ni textos y paginación exacta.

import { buildInformePrintHtml } from "./informePrint";

const ANCHO_HOJA = 816;
const ALTO_HOJA = 1056;

async function esperarRecursos(doc, ventana) {
  try {
    if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
  } catch {
    // API no disponible
  }

  const imagenes = [...doc.images].filter((img) => !img.complete);
  if (imagenes.length) {
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

  await new Promise((r) => ventana.requestAnimationFrame(() => r()));
}

export async function generarInformePdf(informe, { empresaConfig, firmaImg = "", onProgreso } = {}) {
  let html2canvas, jsPDF;
  try {
    const [mod1, mod2] = await Promise.all([import("html2canvas"), import("jspdf")]);
    html2canvas = mod1.default;
    jsPDF = mod2.jsPDF;
  } catch {
    throw new Error(
      "Se publicó una nueva versión. Recarga la página (Ctrl+Shift+R) e intenta nuevamente."
    );
  }

  const html = buildInformePrintHtml(informe, { empresaConfig, firmaImg });

  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.style.cssText = `position:fixed;left:0;top:0;width:${ANCHO_HOJA}px;height:${ALTO_HOJA}px;opacity:0.01;pointer-events:none;z-index:-9999;border:0;`;
  document.body.appendChild(marco);

  try {
    marco.srcdoc = html;
    await new Promise((listo, fallo) => {
      marco.addEventListener("load", listo, { once: true });
      marco.addEventListener("error", () => fallo(new Error("No se pudo preparar el informe.")), { once: true });
    });

    const doc = marco.contentDocument;
    const ventana = marco.contentWindow;
    if (!doc) throw new Error("No se pudo leer el informe generado.");

    await esperarRecursos(doc, ventana);

    const hojas = [...doc.querySelectorAll(".page")];
    if (!hojas.length) throw new Error("El documento no contiene páginas.");

    const pdf = new jsPDF({ unit: "px", format: [ANCHO_HOJA, ALTO_HOJA], orientation: "portrait" });

    for (let i = 0; i < hojas.length; i += 1) {
      onProgreso?.(i + 1, hojas.length);

      const lienzo = await html2canvas(hojas[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: ANCHO_HOJA,
        windowHeight: ALTO_HOJA,
      });

      const imagen = lienzo.toDataURL("image/jpeg", 0.92);
      if (i > 0) pdf.addPage([ANCHO_HOJA, ALTO_HOJA], "portrait");
      pdf.addImage(imagen, "JPEG", 0, 0, ANCHO_HOJA, ALTO_HOJA, undefined, "FAST");
    }

    const id = String(informe?.id || "Informe");
    const proyecto = String(informe?.proyecto || informe?.cliente || "").trim();
    const nombre = `Informe de actividades ${id} ${proyecto}`
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);

    return { blob: pdf.output("blob"), nombre: `${nombre}.pdf` };
  } finally {
    marco.remove();
  }
}

export async function descargarInformePdf(informe, opciones = {}) {
  const { blob, nombre } = await generarInformePdf(informe, opciones);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
