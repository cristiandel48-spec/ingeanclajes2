// Abrir la pestaña de impresion. Vive aparte de cotizacionPrint a proposito:
// ese archivo carga las fotos de la ficha tecnica (mas de 1 MB), y Informes,
// Pagos y la nomina solo necesitan esta funcion. Importandola desde alla se
// llevaban todas esas fotos sin usarlas.

import { escapeHtml } from "./html";
import { conFuenteInter } from "./fuenteInter";
import { FUENTE } from "../styles/designTokens";
import { repaginarHojas } from "./repaginarHojas";

// ─── Abre HTML completo en nueva pestaña con toolbar de impresión ───
// NO bloquea la app principal. El usuario imprime/guarda PDF desde la pestaña.
//
// La pestaña nueva es del mismo sitio que la aplicacion: un texto con codigo
// que llegue sin escapar se ejecuta ahi con la sesion de quien imprime. Por eso
// el titulo se escapa aqui, y cada plantilla escapa sus datos.

// Sanitiza el titulo para que sirva tanto en la pestaña como de nombre de
// archivo al usar «Guardar como PDF» en el dialogo de impresion del navegador.
export function limpiarTituloImpresion(tituloCrudo) {
  return String(tituloCrudo || "Documento")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "Documento";
}

// Reemplaza o inyecta <title> en el HTML para que Chrome/Edge propongan el
// nombre completo del documento (identico a «Descargar PDF») al guardar o
// imprimir, en vez de quedarse con el titulo corto interno de la plantilla.
export function aplicarTituloHtml(html, tituloEscapado) {
  if (/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${tituloEscapado}</title>`);
  }
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const idx = html.indexOf(headMatch[0]) + headMatch[0].length;
    return html.slice(0, idx) + `<title>${tituloEscapado}</title>` + html.slice(idx);
  }
  return html;
}

export function prepararHtmlImpresion(fullHtml, tituloCrudo) {
  const tituloLimpio = limpiarTituloImpresion(tituloCrudo);
  const title = escapeHtml(tituloLimpio);

  // Barra de herramientas superior estilo Apple (minimalista, cristal esmerilado, tipografía sobria)
  const toolbar = `
    <div id="print-toolbar" style="position:fixed;top:0;left:0;right:0;z-index:99999;background:rgba(29,29,31,0.88);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid rgba(255,255,255,0.12);color:#f5f5f7;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 24px;font-family:${FUENTE};box-shadow:0 4px 20px rgba(0,0,0,0.25);">
      <div style="min-width:0;display:flex;align-items:center;gap:12px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#30d158;box-shadow:0 0 8px #30d158;flex-shrink:0;"></span>
        <div style="min-width:0;">
          <div style="font-size:13.5px;font-weight:600;letter-spacing:-0.01em;color:#ffffff;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
          <div style="font-size:11px;color:#a1a1a6;margin-top:2px;line-height:1.35;">
            Listo para imprimir o guardar en PDF con el mismo diseño y nombre del documento.
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;align-items:center;">
        <button id="btn-ejecutar-impresion" onclick="window.__ejecutarImpresion && window.__ejecutarImpresion();" style="background:#ffffff;color:#1d1d1f;border:none;padding:7px 18px;border-radius:980px;font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,0.12);transition:all 0.15s ease;" onmouseover="this.style.background='#f5f5f7'" onmouseout="this.style.background='#ffffff'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Imprimir / Guardar PDF
        </button>
        <button onclick="window.close();" style="background:rgba(255,255,255,0.12);color:#e5e5ea;border:1px solid rgba(255,255,255,0.15);padding:7px 14px;border-radius:980px;font-size:12.5px;font-weight:500;cursor:pointer;transition:all 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">✕ Cerrar</button>
      </div>
    </div>
    <div id="print-toolbar-spacer" style="height:76px;"></div>`;

  // Reglas de impresion comunes: ocultan la barra flotante y suprimen los
  // encabezados/pies del navegador (fecha, about:blank, 1/N) sin tocar el
  // tamaño de papel ni los tamanos de imagen declarados por cada plantilla.
  const printStyles = `
    <style>
      @page {
        @top-left { content: ""; }
        @top-center { content: ""; }
        @top-right { content: ""; }
        @bottom-left { content: ""; }
        @bottom-center { content: ""; }
        @bottom-right { content: ""; }
      }
      @media print {
        #print-toolbar, #print-toolbar-spacer, #print-toolbar + div, .no-print, button { display: none !important; }
        body { padding: 0 !important; margin: 0 !important; background: #ffffff !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    </style>
  `;

  let output = String(fullHtml || "");
  const bodyMatch = output.match(/<body[^>]*>/i);
  if (bodyMatch) {
    output = aplicarTituloHtml(output, title);
    const idx = output.indexOf(bodyMatch[0]) + bodyMatch[0].length;
    output = output.slice(0, idx) + printStyles + toolbar + output.slice(idx);
  } else {
    output = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      ${printStyles}
    </head><body>${toolbar}${output}</body></html>`;
  }

  return { html: conFuenteInter(output), tituloLimpio };
}

export function openPrintTab(fullHtml, tituloCrudo){
  const w = window.open("", "_blank");
  if(!w){ alert("El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio."); return; }

  const { html, tituloLimpio } = prepararHtmlImpresion(fullHtml, tituloCrudo);

  // Cada documento trae su letra declarada, pero la pestaña es un documento
  // aparte: conFuenteInter inyecta Inter aqui para que no caiga en respaldo.
  w.document.write(html);
  w.document.close();
  try {
    w.document.title = tituloLimpio;
  } catch { /* ignore */ }

  // Repaginar en vivo con medidas reales (igual que al generar PDF) para que
  // la vista de impresion nunca deje huecos en blanco ni encabezados huerfanos.
  const ajustarPaginacion = async () => {
    try {
      if (w.closed) return;
      await Promise.race([
        (async () => {
          if (w.document.fonts?.load) {
            await Promise.all(
              ["400", "600", "700", "800"].map((grueso) =>
                w.document.fonts.load(`${grueso} 16px Inter`).catch(() => {})
              )
            );
          }
          await w.document.fonts?.ready;
        })(),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
      const imgs = [...w.document.images];
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? (typeof img.decode === "function" ? img.decode().catch(() => {}) : Promise.resolve())
            : new Promise((res) => {
                img.addEventListener("load", res, { once: true });
                img.addEventListener("error", res, { once: true });
                setTimeout(res, 2000);
              })
        )
      );
      if (w.closed) return;
      const primera = w.document.querySelector(".page");
      if (!primera || !w.document.querySelector('[data-rol="contenido"]')) return;
      repaginarHojas(w.document, { ventana: w });
    } catch {
      // Si el navegador restringe la medicion se conserva el reparto estimado.
    }
  };

  const promesaListo = new Promise((resolve) => {
    setTimeout(() => {
      ajustarPaginacion().finally(resolve);
    }, 60);
  });

  w.__ejecutarImpresion = async () => {
    if (w.closed) return;
    const tb = w.document.getElementById("print-toolbar");
    const sp = w.document.getElementById("print-toolbar-spacer") || tb?.nextElementSibling;
    try {
      await Promise.race([promesaListo, new Promise((r) => setTimeout(r, 2500))]);
    } catch { /* ignore */ }
    if (w.closed) return;
    try {
      w.document.title = tituloLimpio;
    } catch { /* ignore */ }
    if (tb) tb.style.display = "none";
    if (sp) sp.style.display = "none";
    const restaurar = () => {
      if (w.closed) return;
      if (tb) tb.style.display = "flex";
      if (sp) sp.style.display = "block";
    };
    w.addEventListener("afterprint", restaurar, { once: true });
    setTimeout(() => {
      if (w.closed) return;
      w.focus();
      w.print();
      setTimeout(restaurar, 500);
    }, 60);
  };
}
