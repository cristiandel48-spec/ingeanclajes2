// Generacion del HTML imprimible de Informes de Actividades organizado por paginas limpias
import { fmtL } from "./format";
import { escapeHtml } from "./html";
import { normalizarMayusculas } from "./normalizarEntrada";
import { LOGO_INGEANCLAJES } from "../assets/embeddedImages";
import { selloDe } from "./controlDocumental";
import { conActividadSeparada } from "./informeTextos";

const BORDE = "#ddd";
const GRIS_ROTULO = "#6B6B6B";

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

  // Construir las páginas
  const paginasHtml = [];

  // Encabezado estándar de página 1
  const renderHeaderPortada = () => `
    <div style="display:flex;justify-content:space-between;align-items:stretch;border-bottom:2.5px solid #cc0000;padding-bottom:12px;margin-bottom:0;">
      <img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" style="height:52px;object-fit:contain;align-self:center;"/>
      <div style="text-align:center;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="font-size:10px;letter-spacing:3px;color:#333;text-transform:uppercase;font-weight:700;">Especialistas en Anclajes</div>
      </div>
      <div style="text-align:right;font-size:9.5px;color:#555;line-height:1.6;display:flex;flex-direction:column;justify-content:center;">
        <div>Calle 38 sur # 36 - 48, Envigado</div>
        <div>PBX 448 26 86 · Cel 3152889541</div>
        <div>Nit. 900193965-4</div>
        <div style="color:#cc0000;font-weight:600;">www.ingeanclajessas.com</div>
      </div>
      ${sello ? `
        <div style="border:1px solid #333;margin-left:12px;width:145px;flex-shrink:0;display:flex;flex-direction:column;align-self:stretch;">
          <div style="border-bottom:1px solid #333;padding:3px 6px;text-align:center;font-size:8px;color:#333;line-height:1.3;flex:1;display:flex;align-items:center;justify-content:center;">${escapeHtml(sello.linea)}</div>
          <div style="padding:3px 6px;text-align:center;font-size:8.5px;font-weight:700;letter-spacing:.3px;font-family:Consolas, monospace;color:#111;flex:1;display:flex;align-items:center;justify-content:center;">${escapeHtml(sello.codigo)}</div>
        </div>
      ` : ""}
    </div>
  `;

  // Encabezado compacto para páginas 2 en adelante
  const renderHeaderSecundario = () => `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #cc0000;padding-bottom:6px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" style="height:26px;object-fit:contain;"/>
        <span style="font-size:10px;font-weight:700;color:#111;letter-spacing:1px;text-transform:uppercase;">Informe de Actividades · ${escapeHtml(proyecto)}</span>
      </div>
      <div style="font-size:9px;color:#64748b;font-family:Consolas, monospace;font-weight:600;">${escapeHtml(informe?.id || "")}</div>
    </div>
  `;

  // Tabla general de datos
  const renderTablaGeneral = () => `
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10px;">
      <tbody>
        <tr><td style="border:1px solid ${BORDE};padding:5px 10px;background:#f0f0f0;font-weight:700;width:28%;color:${GRIS_ROTULO};letter-spacing:.05em;">PROYECTO</td><td style="border:1px solid ${BORDE};padding:5px 10px;">${escapeHtml(proyecto)}</td></tr>
        <tr><td style="border:1px solid ${BORDE};padding:5px 10px;background:#f0f0f0;font-weight:700;color:${GRIS_ROTULO};letter-spacing:.05em;">LOCALIZACIÓN</td><td style="border:1px solid ${BORDE};padding:5px 10px;">${escapeHtml(localizacion)}</td></tr>
        <tr><td style="border:1px solid ${BORDE};padding:5px 10px;background:#f0f0f0;font-weight:700;color:${GRIS_ROTULO};letter-spacing:.05em;">FECHA INFORME</td><td style="border:1px solid ${BORDE};padding:5px 10px;">${escapeHtml(fechaInforme)}</td></tr>
        <tr><td style="border:1px solid ${BORDE};padding:5px 10px;background:#f0f0f0;font-weight:700;color:${GRIS_ROTULO};letter-spacing:.05em;">PERÍODO DE INFORME</td><td style="border:1px solid ${BORDE};padding:5px 10px;">${escapeHtml(periodo)}</td></tr>
      </tbody>
    </table>
  `;

  // Tabla personal en obra
  const renderTablaPersonal = () => `
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10px;">
      <thead>
        <tr style="background:#ddd;"><td colspan="2" style="border:1px solid ${BORDE};padding:6px 10px;font-weight:700;text-align:center;font-size:10px;letter-spacing:.04em;">PERSONAL EN OBRA</td></tr>
        <tr style="background:#f5f5f5;">
          <th style="border:1px solid ${BORDE};padding:5px 10px;text-align:left;width:35%;color:${GRIS_ROTULO};letter-spacing:.05em;font-size:10px;">CARGO</th>
          <th style="border:1px solid ${BORDE};padding:5px 10px;text-align:left;color:${GRIS_ROTULO};letter-spacing:.05em;font-size:10px;">NOMBRE</th>
        </tr>
      </thead>
      <tbody>
        ${personal.map((p) => `
          <tr>
            <td style="border:1px solid ${BORDE};padding:5px 10px;">${escapeHtml(p.cargo || "")}</td>
            <td style="border:1px solid ${BORDE};padding:5px 10px;">${escapeHtml(p.nombre || "")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  // Render de tarjeta de foto individual
  const renderFotoCard = (ft, idx) => `
    <div style="border:1px solid ${BORDE};border-radius:4px;overflow:hidden;background:#fff;padding:6px;display:flex;flex-direction:column;">
      <div style="height:215px;display:flex;align-items:center;justify-content:center;background:#f8fafc;border-radius:3px;overflow:hidden;">
        <img src="${ft.img || ft.url}" alt="foto ${idx + 1}" style="width:100%;height:100%;object-fit:contain;display:block;background:#fff;"/>
      </div>
      ${ft.comentario ? `
        <div style="padding:5px 2px 0;font-size:8.5px;color:${GRIS_ROTULO};border-top:1px solid #eee;margin-top:4px;line-height:1.35;">
          ${escapeHtml(ft.comentario)}
        </div>
      ` : `
        <div style="height:2px;"></div>
      `}
    </div>
  `;

  // Render de cuadrícula de fotos
  const renderFotosGrid = (fotosLote, inicioIdx = 0) => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;align-items:start;">
      ${fotosLote.map((ft, i) => renderFotoCard(ft, inicioIdx + i)).join("")}
    </div>
  `;

  // Render de tabla de actividad
  const renderTablaActividad = (act) => `
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10px;">
      <tbody>
        <tr><td colspan="2" style="border:1px solid ${BORDE};padding:6px 10px;background:#ddd;font-weight:700;text-align:center;font-size:10px;letter-spacing:.04em;">${escapeHtml(act.titulo || "Actividad")}</td></tr>
        ${act.fecha ? `<tr><td style="border:1px solid ${BORDE};padding:5px 10px;font-weight:700;width:22%;color:${GRIS_ROTULO};letter-spacing:.05em;">FECHA</td><td style="border:1px solid ${BORDE};padding:5px 10px;">${escapeHtml(fmtL(act.fecha))}</td></tr>` : ""}
        ${(act.actividadesRealizadas || "").trim() ? `<tr><td style="border:1px solid ${BORDE};padding:5px 10px;font-weight:700;width:22%;vertical-align:top;color:${GRIS_ROTULO};letter-spacing:.05em;">ACTIVIDADES REALIZADAS</td><td style="border:1px solid ${BORDE};padding:5px 10px;text-align:justify;white-space:pre-line;line-height:1.45;">${escapeHtml(act.actividadesRealizadas)}</td></tr>` : ""}
        ${(act.descripcion || "").trim() ? `<tr><td style="border:1px solid ${BORDE};padding:5px 10px;font-weight:700;width:22%;vertical-align:top;color:${GRIS_ROTULO};letter-spacing:.05em;">DESCRIPCIÓN</td><td style="border:1px solid ${BORDE};padding:5px 10px;text-align:justify;white-space:pre-line;line-height:1.45;">${escapeHtml(act.descripcion)}</td></tr>` : ""}
        <tr><td style="border:1px solid ${BORDE};padding:5px 10px;font-weight:700;vertical-align:top;color:${GRIS_ROTULO};letter-spacing:.05em;">OBSERVACIONES</td><td style="border:1px solid ${BORDE};padding:5px 10px;">${escapeHtml(act.observaciones || "")}</td></tr>
      </tbody>
    </table>
  `;

  // Render de bloque de firma
  const renderBloqueFirma = () => `
    <div style="margin-top:16px;font-size:10px;">
      <div style="margin-bottom:6px;">Cordialmente,</div>
      <div style="height:60px;display:flex;align-items:flex-end;margin-bottom:4px;">
        ${firmaImg ? `<img src="${firmaImg}" alt="Firma" style="max-height:58px;max-width:210px;object-fit:contain;"/>` : ""}
      </div>
      <div>
        <div style="display:inline-block;border-top:1px solid #333;padding-top:6px;min-width:230px;">
          <div style="font-weight:700;font-size:10px;letter-spacing:.02em;">ING. JHON JAIME SEPULVEDA LONDOÑO</div>
          <div style="font-size:9px;color:${GRIS_ROTULO};margin-top:2px;">Cl 38 sur # 36-48, Envigado · PBX 448 26 86 · Cel. 314 863 40 72</div>
          <div style="font-size:9px;color:${GRIS_ROTULO};">Nit. 900193965-4 · ingeanclajes.sas@gmail.com</div>
        </div>
      </div>
    </div>
  `;

  // Render de tabla recomendaciones
  const renderTablaRecomendaciones = () => `
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10px;">
      <tbody>
        <tr>
          <td style="border:1px solid ${BORDE};padding:6px 10px;font-weight:700;width:22%;vertical-align:top;color:${GRIS_ROTULO};letter-spacing:.05em;">RECOMENDACIONES</td>
          <td style="border:1px solid ${BORDE};padding:6px 10px;text-align:justify;white-space:pre-line;line-height:1.45;">${escapeHtml(recomendaciones)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // --- DISTRIBUCION EN PAGINAS ---
  // PAGINA 1: Portada + Datos Generales + Personal en Obra
  const p1Contenido = `
    ${renderHeaderPortada()}
    <div style="text-align:center;font-size:14px;font-weight:700;letter-spacing:1.5px;padding:2px 0 8px;border-bottom:2px solid #333;color:#111;text-transform:uppercase;margin-bottom:16px;margin-top:10px;">Informe de Actividades</div>
    ${renderTablaGeneral()}
    ${renderTablaPersonal()}
  `;
  paginasHtml.push(p1Contenido);

  // PAGINAS PARA CADA ACTIVIDAD
  actividades.forEach((act) => {
    const fotos = (act.fotos || []).filter((ft) => ft.img || ft.url);

    if (!fotos.length) {
      // Actividad sin fotos
      paginasHtml.push(`
        ${renderHeaderSecundario()}
        ${renderTablaActividad(act)}
      `);
      return;
    }

    // Actividad con fotos:
    // Si tiene 1 o 2 fotos, la tabla y las 2 fotos caben en una misma pagina
    if (fotos.length <= 2) {
      paginasHtml.push(`
        ${renderHeaderSecundario()}
        ${renderTablaActividad(act)}
        <div style="font-weight:700;text-align:center;background:#ddd;border:1px solid ${BORDE};padding:5px;margin-bottom:8px;font-size:9.5px;letter-spacing:.04em;">REGISTRO FOTOGRÁFICO · ${escapeHtml(act.titulo || "")}</div>
        ${renderFotosGrid(fotos, 0)}
      `);
    } else {
      // Si tiene mas de 2 fotos (ej: 4, 6 fotos):
      // Pagina con la tabla de actividad y titulo de fotos
      paginasHtml.push(`
        ${renderHeaderSecundario()}
        ${renderTablaActividad(act)}
        <div style="font-weight:700;text-align:center;background:#ddd;border:1px solid ${BORDE};padding:5px;margin-bottom:8px;font-size:9.5px;letter-spacing:.04em;">REGISTRO FOTOGRÁFICO · ${escapeHtml(act.titulo || "")}</div>
        ${renderFotosGrid(fotos.slice(0, 2), 0)}
      `);

      // Las fotos restantes van de a 6 fotos por pagina completa (3 filas de 2)
      const restantes = fotos.slice(2);
      const FOTOS_POR_PAGINA = 6;
      for (let f = 0; f < restantes.length; f += FOTOS_POR_PAGINA) {
        const lote = restantes.slice(f, f + FOTOS_POR_PAGINA);
        paginasHtml.push(`
          ${renderHeaderSecundario()}
          <div style="font-weight:700;text-align:center;background:#ddd;border:1px solid ${BORDE};padding:5px;margin-bottom:8px;font-size:9.5px;letter-spacing:.04em;">REGISTRO FOTOGRÁFICO · ${escapeHtml(act.titulo || "")} ${restantes.length > FOTOS_POR_PAGINA ? `(Continuación)` : ""}</div>
          ${renderFotosGrid(lote, 2 + f)}
        `);
      }
    }
  });

  // PAGINA FINAL: RECOMENDACIONES Y FIRMA
  paginasHtml.push(`
    ${renderHeaderSecundario()}
    ${renderTablaRecomendaciones()}
    ${renderBloqueFirma()}
  `);

  const totalHojas = paginasHtml.length;

  // Envolver cada fragmento en un elemento <section class="page">
  const seccionesHtml = paginasHtml.map((contenido, idx) => `
    <section class="page" style="width:816px;height:1056px;padding:32px 40px 24px;box-sizing:border-box;background:#fff;position:relative;display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;break-after:page;">
      <div style="flex:1;">
        ${contenido}
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:5px;display:flex;justify-content:space-between;align-items:center;font-size:8px;color:#94a3b8;margin-top:6px;">
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
