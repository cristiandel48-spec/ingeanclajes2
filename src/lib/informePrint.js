// Generacion del HTML imprimible de Informes de Actividades organizado
// mediante empaquetado fluido por paginas para evitar espacios en blanco innecesarios.

import { fmtL } from "./format";
import { escapeHtml } from "./html";
import { normalizarMayusculas } from "./normalizarEntrada";
import { LOGO_INGEANCLAJES } from "../assets/embeddedImages";
import { selloDe } from "./controlDocumental";
import { conActividadSeparada } from "./informeTextos";

const BORDE = "#ddd";
const GRIS_ROTULO = "#6B6B6B";

// Capacidad util de contenido por pagina Carta (a 96 DPI: 1056px - padding vertical 64px - footer 30px)
const MAX_ALTO_PAGINA = 940;

function estimarLineas(texto, caracteresPorLinea = 78) {
  const str = String(texto || "").trim();
  if (!str) return 0;
  const parrafos = str.split(/\r?\n/).filter(Boolean);
  return parrafos.reduce((total, p) => total + Math.max(1, Math.ceil(p.length / caracteresPorLinea)), 0);
}

export function buildInformePrintHtml(informe, { empresaConfig, firmaImg = "" } = {}) {
  const sello = selloDe(empresaConfig, "informe");
  const proyecto = normalizarMayusculas(informe?.proyecto || "");
  const localizacion = normalizarMayusculas(informe?.localizacion || "");
  const fechaInforme = fmtL(informe?.fechaInforme);
  const periodo = `${fmtL(informe?.periodoInicio)} - ${fmtL(informe?.periodoFin)}`;
  const personal = Array.isArray(informe?.personal) ? informe.personal : [];
  const rawActividades = Array.isArray(informe?.actividades) && informe.actividades.length
    ? informe.actividades
    : [{ titulo: informe?.actividad, descripcion: informe?.descripcion, observaciones: informe?.observaciones, fotos: informe?.fotos || [] }];
  const actividades = rawActividades.map(conActividadSeparada);
  const recomendaciones = String(informe?.recomendaciones || "").trim();

  const numDoc = informe?.id ? String(informe.id).trim() : "";

  // --- RENDERIZADORES DE FRAGMENTOS ---

  const renderHeaderPortada = () => `
    <div style="display:flex;justify-content:space-between;align-items:stretch;border-bottom:2.5px solid #cc0000;padding-bottom:10px;margin-bottom:0;">
      <img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" style="height:50px;object-fit:contain;align-self:center;"/>
      <div style="text-align:center;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="font-size:9.5px;letter-spacing:3px;color:#333;text-transform:uppercase;font-weight:700;">Especialistas en Anclajes</div>
      </div>
      <div style="text-align:right;font-size:9px;color:#555;line-height:1.5;display:flex;flex-direction:column;justify-content:center;">
        <div>Calle 38 sur # 36 - 48, Envigado</div>
        <div>PBX 448 26 86 · Cel 3152889541</div>
        <div>Nit. 900193965-4</div>
        <div style="color:#cc0000;font-weight:600;">www.ingeanclajessas.com</div>
      </div>
      ${sello || numDoc ? `
        <div style="border:1px solid #333;margin-left:12px;width:145px;flex-shrink:0;display:flex;flex-direction:column;align-self:stretch;overflow:hidden;">
          ${sello ? `
            <div style="border-bottom:1px solid #333;padding:2px 4px;text-align:center;font-size:7.5px;color:#444;line-height:1.2;flex:1;display:flex;align-items:center;justify-content:center;">${escapeHtml(sello.linea)}</div>
            <div style="border-bottom:${numDoc ? "1px solid #333" : "none"};padding:2px 4px;text-align:center;font-size:8px;font-weight:700;letter-spacing:.3px;font-family:Consolas, monospace;color:#111;flex:1;display:flex;align-items:center;justify-content:center;">${escapeHtml(sello.codigo)}</div>
          ` : ""}
          ${numDoc ? `
            <div style="padding:2px 4px;text-align:center;font-size:8.5px;font-weight:800;letter-spacing:.4px;font-family:Consolas, monospace;color:#cc0000;background:#fff5f5;flex:1;display:flex;align-items:center;justify-content:center;">${escapeHtml(numDoc)}</div>
          ` : ""}
        </div>
      ` : ""}
    </div>
  `;

  const renderHeaderSecundario = () => `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #cc0000;padding-bottom:5px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" style="height:24px;object-fit:contain;"/>
        <span style="font-size:9.5px;font-weight:700;color:#111;letter-spacing:1px;text-transform:uppercase;">Informe de Actividades · ${escapeHtml(proyecto)}</span>
      </div>
      <div style="font-size:8.5px;color:#64748b;font-family:Consolas, monospace;font-weight:600;">${escapeHtml(informe?.id || "")}</div>
    </div>
  `;

  const renderPortadaTop = () => `
    ${renderHeaderPortada()}
    <div style="text-align:center;font-size:14px;font-weight:700;letter-spacing:1.5px;padding:2px 0 6px;border-bottom:2px solid #333;color:#111;text-transform:uppercase;margin-bottom:12px;margin-top:8px;">Informe de Actividades</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:9.5px;">
      <tbody>
        <tr><td style="border:1px solid ${BORDE};padding:4px 8px;background:#f0f0f0;font-weight:700;width:28%;color:${GRIS_ROTULO};letter-spacing:.05em;">PROYECTO</td><td style="border:1px solid ${BORDE};padding:4px 8px;">${escapeHtml(proyecto)}</td></tr>
        <tr><td style="border:1px solid ${BORDE};padding:4px 8px;background:#f0f0f0;font-weight:700;color:${GRIS_ROTULO};letter-spacing:.05em;">LOCALIZACIÓN</td><td style="border:1px solid ${BORDE};padding:4px 8px;">${escapeHtml(localizacion)}</td></tr>
        <tr><td style="border:1px solid ${BORDE};padding:4px 8px;background:#f0f0f0;font-weight:700;color:${GRIS_ROTULO};letter-spacing:.05em;">FECHA INFORME</td><td style="border:1px solid ${BORDE};padding:4px 8px;">${escapeHtml(fechaInforme)}</td></tr>
        <tr><td style="border:1px solid ${BORDE};padding:4px 8px;background:#f0f0f0;font-weight:700;color:${GRIS_ROTULO};letter-spacing:.05em;">PERÍODO DE INFORME</td><td style="border:1px solid ${BORDE};padding:4px 8px;">${escapeHtml(periodo)}</td></tr>
      </tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:9.5px;">
      <thead>
        <tr style="background:#ddd;"><td colspan="2" style="border:1px solid ${BORDE};padding:5px 8px;font-weight:700;text-align:center;font-size:9.5px;letter-spacing:.04em;">PERSONAL EN OBRA</td></tr>
        <tr style="background:#f5f5f5;">
          <th style="border:1px solid ${BORDE};padding:4px 8px;text-align:left;width:35%;color:${GRIS_ROTULO};letter-spacing:.05em;font-size:9.5px;">CARGO</th>
          <th style="border:1px solid ${BORDE};padding:4px 8px;text-align:left;color:${GRIS_ROTULO};letter-spacing:.05em;font-size:9.5px;">NOMBRE</th>
        </tr>
      </thead>
      <tbody>
        ${personal.map((p) => `
          <tr>
            <td style="border:1px solid ${BORDE};padding:4px 8px;">${escapeHtml(p.cargo || "")}</td>
            <td style="border:1px solid ${BORDE};padding:4px 8px;">${escapeHtml(p.nombre || "")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  const renderTablaActividad = (act) => `
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:9.5px;">
      <tbody>
        <tr><td colspan="2" style="border:1px solid ${BORDE};padding:5px 8px;background:#ddd;font-weight:700;text-align:center;font-size:9.5px;letter-spacing:.04em;">${escapeHtml(act.titulo || "Actividad")}</td></tr>
        ${act.fecha ? `<tr><td style="border:1px solid ${BORDE};padding:4px 8px;font-weight:700;width:22%;color:${GRIS_ROTULO};letter-spacing:.05em;">FECHA</td><td style="border:1px solid ${BORDE};padding:4px 8px;">${escapeHtml(fmtL(act.fecha))}</td></tr>` : ""}
        ${(act.actividadesRealizadas || "").trim() ? `<tr><td style="border:1px solid ${BORDE};padding:4px 8px;font-weight:700;width:22%;vertical-align:top;color:${GRIS_ROTULO};letter-spacing:.05em;">ACTIVIDADES REALIZADAS</td><td style="border:1px solid ${BORDE};padding:5px 8px;text-align:justify;white-space:pre-line;line-height:1.4;">${escapeHtml(act.actividadesRealizadas)}</td></tr>` : ""}
        ${(act.descripcion || "").trim() ? `<tr><td style="border:1px solid ${BORDE};padding:4px 8px;font-weight:700;width:22%;vertical-align:top;color:${GRIS_ROTULO};letter-spacing:.05em;">DESCRIPCIÓN</td><td style="border:1px solid ${BORDE};padding:5px 8px;text-align:justify;white-space:pre-line;line-height:1.4;">${escapeHtml(act.descripcion)}</td></tr>` : ""}
        <tr><td style="border:1px solid ${BORDE};padding:4px 8px;font-weight:700;vertical-align:top;color:${GRIS_ROTULO};letter-spacing:.05em;">OBSERVACIONES</td><td style="border:1px solid ${BORDE};padding:4px 8px;">${escapeHtml(act.observaciones || "")}</td></tr>
      </tbody>
    </table>
  `;

  const renderTituloFotos = (titulo) => `
    <div style="font-weight:700;text-align:center;background:#ddd;border:1px solid ${BORDE};padding:5px;margin-bottom:8px;font-size:9.5px;letter-spacing:.04em;">${escapeHtml(titulo)}</div>
  `;

  const renderFotoCard = (ft, idx) => `
    <div style="border:1px solid ${BORDE};border-radius:4px;overflow:hidden;background:#fff;padding:6px;display:flex;flex-direction:column;">
      <div style="height:205px;display:flex;align-items:center;justify-content:center;background:#f8fafc;border-radius:3px;overflow:hidden;">
        <img src="${ft.img || ft.url}" alt="foto ${idx + 1}" style="width:100%;height:100%;object-fit:contain;display:block;background:#fff;"/>
      </div>
      ${ft.comentario ? `
        <div style="padding:4px 2px 0;font-size:8.5px;color:${GRIS_ROTULO};border-top:1px solid #eee;margin-top:4px;line-height:1.3;">
          ${escapeHtml(ft.comentario)}
        </div>
      ` : `
        <div style="height:2px;"></div>
      `}
    </div>
  `;

  const renderFotosFila = (parFotos, startIdx = 0) => `
    <div style="display:grid;grid-template-columns:${parFotos.length === 1 ? "1fr 1fr" : "1fr 1fr"};gap:10px;margin-bottom:8px;align-items:start;">
      ${parFotos.map((ft, i) => renderFotoCard(ft, startIdx + i)).join("")}
      ${parFotos.length === 1 ? `<div></div>` : ""}
    </div>
  `;

  const renderTablaRecomendaciones = () => `
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:9.5px;">
      <tbody>
        <tr>
          <td style="border:1px solid ${BORDE};padding:5px 8px;font-weight:700;width:22%;vertical-align:top;color:${GRIS_ROTULO};letter-spacing:.05em;">RECOMENDACIONES</td>
          <td style="border:1px solid ${BORDE};padding:5px 8px;text-align:justify;white-space:pre-line;line-height:1.4;">${escapeHtml(recomendaciones)}</td>
        </tr>
      </tbody>
    </table>
  `;

  const renderBloqueFirma = () => `
    <div style="margin-top:14px;font-size:9.5px;">
      <div style="margin-bottom:4px;">Cordialmente,</div>
      <div style="height:55px;display:flex;align-items:flex-end;margin-bottom:4px;">
        ${firmaImg ? `<img src="${firmaImg}" alt="Firma" style="max-height:52px;max-width:200px;object-fit:contain;"/>` : ""}
      </div>
      <div>
        <div style="display:inline-block;border-top:1px solid #333;padding-top:5px;min-width:220px;">
          <div style="font-weight:700;font-size:9.5px;letter-spacing:.02em;">ING. JHON JAIME SEPULVEDA LONDOÑO</div>
          <div style="font-size:8.5px;color:${GRIS_ROTULO};margin-top:2px;">Cl 38 sur # 36-48, Envigado · PBX 448 26 86 · Cel. 314 863 40 72</div>
          <div style="font-size:8.5px;color:${GRIS_ROTULO};">Nit. 900193965-4 · ingeanclajes.sas@gmail.com</div>
        </div>
      </div>
    </div>
  `;

  // --- MOTOR DE EMPAQUETADO FLUIDO DE PÁGINAS ---
  const paginas = [[]];
  let pIdx = 0;
  let alturaActual = 0;

  const nuevaPagina = () => {
    pIdx += 1;
    paginas[pIdx] = [renderHeaderSecundario()];
    alturaActual = 32; // Altura del encabezado secundario
  };

  // 1. Empaquetar Portada Top
  const altoPortadaTop = 60 + 32 + 88 + (35 + personal.length * 20);
  paginas[0].push(renderPortadaTop());
  alturaActual = altoPortadaTop;

  // 2. Empaquetar Actividades y Fotos de forma continua
  actividades.forEach((act) => {
    // Altura estimada de la tabla de la actividad
    const lineasAct = estimarLineas(act.actividadesRealizadas);
    const lineasDesc = estimarLineas(act.descripcion);
    const lineasObs = estimarLineas(act.observaciones);
    const altoTabla = 26 + (act.fecha ? 20 : 0) + Math.max(22, lineasAct * 14 + 10) + Math.max(22, lineasDesc * 14 + 10) + Math.max(20, lineasObs * 14 + 10) + 12;

    const fotos = (act.fotos || []).filter((ft) => ft.img || ft.url);

    // Si la tabla no cabe en la hoja actual, abrir una nueva hoja
    if (alturaActual + altoTabla > MAX_ALTO_PAGINA) {
      nuevaPagina();
    }

    paginas[pIdx].push(renderTablaActividad(act));
    alturaActual += altoTabla;

    // Procesar fotos de la actividad
    if (fotos.length > 0) {
      // Agrupar fotos de a pares (filas de 2)
      const filas = [];
      for (let i = 0; i < fotos.length; i += 2) {
        filas.push(fotos.slice(i, i + 2));
      }

      const altoTituloFotos = 28;
      const altoFilaFotos = 240;

      let tituloPuesto = false;

      filas.forEach((fila, fIdx) => {
        const esPrimeraFila = fIdx === 0;
        const espacioRequerido = (esPrimeraFila && !tituloPuesto) ? (altoTituloFotos + altoFilaFotos) : altoFilaFotos;

        // Si la fila de fotos (o título + fila) no cabe en la hoja actual
        if (alturaActual + espacioRequerido > MAX_ALTO_PAGINA) {
          nuevaPagina();
          tituloPuesto = false;
        }

        if (!tituloPuesto) {
          const textoTitulo = `REGISTRO FOTOGRÁFICO · ${act.titulo || ""}${fIdx > 0 ? " (Continuación)" : ""}`;
          paginas[pIdx].push(renderTituloFotos(textoTitulo));
          alturaActual += altoTituloFotos;
          tituloPuesto = true;
        }

        paginas[pIdx].push(renderFotosFila(fila, fIdx * 2));
        alturaActual += altoFilaFotos;
      });
    }
  });

  // 3. Empaquetar Recomendaciones y Firma
  const lineasRec = estimarLineas(recomendaciones);
  const altoRecomendaciones = Math.max(30, lineasRec * 14 + 16) + 12;
  const altoFirma = 135;

  // Si no caben recomendaciones en la hoja actual
  if (alturaActual + altoRecomendaciones > MAX_ALTO_PAGINA) {
    nuevaPagina();
  }
  paginas[pIdx].push(renderTablaRecomendaciones());
  alturaActual += altoRecomendaciones;

  // Si no cabe la firma en la hoja actual
  if (alturaActual + altoFirma > MAX_ALTO_PAGINA) {
    nuevaPagina();
  }
  paginas[pIdx].push(renderBloqueFirma());
  alturaActual += altoFirma;

  // Total de hojas consolidadas
  const totalHojas = paginas.length;

  const seccionesHtml = paginas.map((bloques, idx) => `
    <section class="page" style="width:816px;height:1056px;padding:30px 40px 22px;box-sizing:border-box;background:#fff;position:relative;display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;break-after:page;">
      <div style="flex:1;">
        ${bloques.join("\n")}
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:4px;display:flex;justify-content:space-between;align-items:center;font-size:8px;color:#94a3b8;margin-top:6px;">
        <span>Ingeanclajes S.A.S · Nit. 900193965-4</span>
        <span>Página ${idx + 1} de ${totalHojas}</span>
      </div>
    </section>
  `).join("\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Informe ${escapeHtml(informe?.id || "")} ${escapeHtml(proyecto)}</title>
    <style>
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; background: #f8fafc; font-family: 'Aptos', 'Segoe UI', Arial, sans-serif; color: #111; }
      .page { width: 816px; height: 1056px; margin: 0 auto 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      @media print {
        body { background: #fff; }
        .page { margin: 0; box-shadow: none; width: 100%; height: 100vh; page-break-after: always; break-after: page; }
      }
    </style>
  </head>
  <body>
    ${seccionesHtml}
  </body>
</html>`;
}
