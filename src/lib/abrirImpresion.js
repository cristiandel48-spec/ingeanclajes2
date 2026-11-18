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

export function openPrintTab(fullHtml, tituloCrudo){
  const title = escapeHtml(tituloCrudo || "Documento");
  const w = window.open("", "_blank");
  if(!w){ alert("El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio."); return; }

  // Barra de herramientas superior estilo Apple (minimalista, cristal esmerilado, tipografía sobria)
  const toolbar = `
    <div id="print-toolbar" style="position:fixed;top:0;left:0;right:0;z-index:99999;background:rgba(29,29,31,0.88);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid rgba(255,255,255,0.12);color:#f5f5f7;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 24px;font-family:${FUENTE};box-shadow:0 4px 20px rgba(0,0,0,0.25);">
      <div style="min-width:0;display:flex;align-items:center;gap:12px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#30d158;box-shadow:0 0 8px #30d158;flex-shrink:0;"></span>
        <div>
          <div style="font-size:13.5px;font-weight:600;letter-spacing:-0.01em;color:#ffffff;line-height:1.2;">${title || "Documento"}</div>
          <div style="font-size:11px;color:#a1a1a6;margin-top:2px;line-height:1.35;">
            Documento vectorial para impresión directa o guardado en PDF de alta fidelidad. Tamaño <b>Carta</b> · Sin encabezados ni pies del navegador.
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;align-items:center;">
        <button onclick="var tb=document.getElementById('print-toolbar');var sp=tb.nextElementSibling;tb.style.display='none';if(sp)sp.style.display='none';setTimeout(function(){window.print();setTimeout(function(){tb.style.display='flex';if(sp)sp.style.display='block';},300);},100);" style="background:#ffffff;color:#1d1d1f;border:none;padding:7px 18px;border-radius:980px;font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,0.12);transition:all 0.15s ease;" onmouseover="this.style.background='#f5f5f7'" onmouseout="this.style.background='#ffffff'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Imprimir / Guardar PDF
        </button>
        <button onclick="window.close();" style="background:rgba(255,255,255,0.12);color:#e5e5ea;border:1px solid rgba(255,255,255,0.15);padding:7px 14px;border-radius:980px;font-size:12.5px;font-weight:500;cursor:pointer;transition:all 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">✕ Cerrar</button>
      </div>
    </div>
    <div style="height:76px;"></div>`;

  let output = fullHtml;
  const printStyles = `
    <style>
      @media print {
        #print-toolbar, #print-toolbar + div, .no-print, button { display: none !important; }
        body { padding: 0 !important; margin: 0 !important; background: #ffffff !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        img { image-rendering: -webkit-optimize-contrast !important; image-rendering: crisp-edges !important; }
      }
    </style>
  `;
  const bodyMatch = fullHtml.match(/<body[^>]*>/i);
  if(bodyMatch){
    const idx = fullHtml.indexOf(bodyMatch[0]) + bodyMatch[0].length;
    output = fullHtml.slice(0, idx) + printStyles + toolbar + fullHtml.slice(idx);
  } else {
    output = `<!doctype html><html><head><meta charset="utf-8"><title>${title||"Documento"}</title>
      ${printStyles}
    </head><body>${toolbar}${fullHtml}</body></html>`;
  }
  // Cada documento trae su letra declarada, pero la pestaña es un documento
  // aparte: sin esto Inter no existe ahi y cae en la de respaldo.
  w.document.write(conFuenteInter(output));
  w.document.close();

  // Repaginar en vivo con medidas reales (igual que al generar PDF) para que
  // la vista de impresion nunca deje huecos en blanco ni encabezados huerfanos.
  const ajustarPaginacion = async () => {
    try {
      if (w.closed) return;
      await Promise.race([
        w.document.fonts?.ready || Promise.resolve(),
        new Promise((r) => setTimeout(r, 1200)),
      ]);
      const imgs = [...w.document.images];
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? (typeof img.decode === "function" ? img.decode().catch(() => {}) : Promise.resolve())
            : new Promise((res) => {
                img.addEventListener("load", res, { once: true });
                img.addEventListener("error", res, { once: true });
                setTimeout(res, 1500);
              })
        )
      );
      if (w.closed) return;
      const primera = w.document.querySelector(".page");
      if (!primera || !w.document.querySelector('[data-rol="contenido"]')) return;
      const pie = primera.querySelector(".page-footer");
      const estilo = w.getComputedStyle(primera);
      const relleno = (parseFloat(estilo.paddingTop) || 0) + (parseFloat(estilo.paddingBottom) || 0);
      const altoPie = pie ? pie.getBoundingClientRect().height : 0;
      // Hoja Carta = 11in = 1056px a 96ppp
      const altoUtil = 1056 - relleno - altoPie - 4;
      if (altoUtil > 200) {
        repaginarHojas(w.document, { altoUtil });
      }
    } catch {
      // Si el navegador restringe la medicion se conserva el reparto estimado.
    }
  };

  setTimeout(ajustarPaginacion, 60);
}
