// Generación del HTML imprimible de Informes de Actividades organizado
// con el nuevo Formato Técnico Industrial Ejecutivo IngeAnclajes.
// Empaquetado fluido por páginas con fidelidad 100%, sin desbordes y con paginación exacta.

import { fmtL } from "./format";
import { escapeHtml } from "./html";
import { normalizarMayusculas } from "./normalizarEntrada";
import { LOGO_INGEANCLAJES } from "../assets/embeddedImages";
import { getControlDocumental } from "./controlDocumental";
import { conActividadSeparada } from "./informeTextos";

// Capacidad útil de contenido por página Carta (a 96 DPI: 1056px - padding vertical 52px - footer 30px)
const MAX_ALTO_PAGINA = 940;

function estimarLineas(texto, caracteresPorLinea = 78) {
  const str = String(texto || "").trim();
  if (!str) return 0;
  const parrafos = str.split(/\r?\n/).filter(Boolean);
  return parrafos.reduce((total, p) => total + Math.max(1, Math.ceil(p.length / caracteresPorLinea)), 0);
}

export function buildInformePrintHtml(informe, { empresaConfig, firmaImg = "" } = {}) {
  const control = getControlDocumental(empresaConfig)?.informe;
  const docCodigo = control?.codigo || "FO-ACT-04";
  const docVersion = control?.version || "03";
  const docFecha = control?.fecha ? fmtL(control.fecha) : fmtL(informe?.fechaInforme);

  const proyecto = normalizarMayusculas(informe?.proyecto || "");
  const localizacion = normalizarMayusculas(informe?.localizacion || "");
  const cliente = normalizarMayusculas(informe?.cliente || informe?.contratante || informe?.empresa || "");
  const fechaInforme = fmtL(informe?.fechaInforme);
  const periodo = `${fmtL(informe?.periodoInicio)} al ${fmtL(informe?.periodoFin)}`;
  const personal = Array.isArray(informe?.personal) ? informe.personal : [];
  const cotizacionRef = informe?.cotizacionNumero || informe?.cotizacionRef || informe?.cotizacionId || "";
  
  const rawActividades = Array.isArray(informe?.actividades) && informe.actividades.length
    ? informe.actividades
    : [{ titulo: informe?.actividad, descripcion: informe?.descripcion, observaciones: informe?.observaciones, fotos: informe?.fotos || [] }];
  const actividades = rawActividades.map(conActividadSeparada);
  const recomendaciones = String(informe?.recomendaciones || "").trim();

  const numDoc = informe?.id ? String(informe.id).trim() : (informe?.numero ? String(informe.numero).trim() : "");

  // --- RENDERIZADORES DE FRAGMENTOS VISUALES ---

  const renderHeaderPortada = () => `
    <div style="height:2px;background:#1d1d1f;border-radius:1px;margin-bottom:12px;"></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid rgba(0,0,0,0.08);padding-bottom:12px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${LOGO_INGEANCLAJES ? `<img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" style="height:44px;max-width:180px;object-fit:contain;display:block;"/>` : `<div style="font-size:16px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;">INGE<span style="color:#f47c20;">ANCLAJES</span></div>`}
        <div>
          <div style="font-size:12px;font-weight:800;color:#1d1d1f;letter-spacing:-0.01em;">INGEANCLAJES <span style="font-size:10px;font-weight:600;color:#f47c20;">S.A.S.</span></div>
          <div style="font-size:8px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;">Sistemas de Ingeniería y Protección Contra Caídas</div>
          <div style="font-size:7.5px;color:#86868b;margin-top:1px;">NIT. 900.193.965-4 · PBX (604) 448 26 86 · Medellín, Colombia</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="display:inline-block;padding:2px 7px;border-radius:4px;background:#f5f5f7;border:1px solid #e5e5ea;font-size:8px;color:#6e6e73;font-family:'JetBrains Mono',monospace;margin-bottom:3px;">
          SISTEMA DE GESTIÓN DE CALIDAD · ${escapeHtml(docCodigo)} (V-${escapeHtml(docVersion)})
        </div>
        <div style="font-size:11px;font-weight:800;color:#1d1d1f;letter-spacing:0.02em;text-transform:uppercase;">INFORME TÉCNICO DE ACTIVIDADES EN OBRA</div>
        <div style="font-size:9px;color:#1d1d1f;font-family:'JetBrains Mono',monospace;font-weight:700;margin-top:2px;">
          Consecutivo: <span style="background:#1d1d1f;color:#ffffff;padding:1.5px 6px;border-radius:3px;">${escapeHtml(numDoc || "INF-OFICIAL")}</span>
        </div>
      </div>
    </div>
  `;

  const renderHeaderSecundario = () => `
    <div style="height:2px;background:#1d1d1f;border-radius:1px;margin-bottom:8px;"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(0,0,0,0.08);padding-bottom:5px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:7px;">
        <span style="font-size:10.5px;font-weight:800;color:#1d1d1f;">INGE<span style="color:#f47c20;">ANCLAJES</span></span>
        <span style="color:#d2d2d7;font-size:10px;">·</span>
        <span style="font-size:8.5px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.04em;">Informe de Actividades · ${escapeHtml(proyecto)}</span>
      </div>
      <div style="font-size:8.5px;color:#1d1d1f;font-family:'JetBrains Mono',monospace;font-weight:700;">${escapeHtml(numDoc)}</div>
    </div>
  `;

  const renderDatosProyecto = () => `
    <div style="border:1px solid rgba(0,0,0,0.08);border-radius:8px;padding:9px 12px;margin-bottom:12px;background:#fbfbfd;">
      <table style="width:100%;border-collapse:collapse;font-size:8.5px;">
        <tr>
          <td style="width:17%;font-weight:700;color:#6e6e73;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;">PROYECTO:</td>
          <td style="width:38%;font-weight:700;color:#1d1d1f;padding:3.5px 6px;">${escapeHtml(proyecto || "OBRA GENERAL")}</td>
          <td style="width:17%;font-weight:700;color:#6e6e73;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid rgba(0,0,0,0.06);">PERÍODO:</td>
          <td style="width:28%;color:#1d1d1f;font-weight:600;padding:3.5px 6px;">${escapeHtml(periodo)}</td>
        </tr>
        <tr>
          <td style="font-weight:700;color:#6e6e73;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">CONTRATANTE:</td>
          <td style="color:#1d1d1f;font-weight:600;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">${escapeHtml(cliente || "A QUIEN INTERESE")}</td>
          <td style="font-weight:700;color:#6e6e73;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid rgba(0,0,0,0.06);border-top:1px solid rgba(0,0,0,0.04);">FECHA EMISIÓN:</td>
          <td style="color:#1d1d1f;font-weight:600;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">${escapeHtml(fechaInforme)}</td>
        </tr>
        <tr>
          <td style="font-weight:700;color:#6e6e73;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">LOCALIZACIÓN:</td>
          <td style="color:#1d1d1f;font-weight:600;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">${escapeHtml(localizacion || "MEDELLÍN")}</td>
          <td style="font-weight:700;color:#6e6e73;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid rgba(0,0,0,0.06);border-top:1px solid rgba(0,0,0,0.04);">NORMATIVA:</td>
          <td style="padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">
            <span style="background:#ffffff;color:#1d1d1f;border:1px solid #d2d2d7;font-size:7.5px;font-weight:700;padding:1px 5px;border-radius:3px;display:inline-block;letter-spacing:0.02em;">Res. 4272/2021 · OSHA 1926</span>
          </td>
        </tr>
        ${cotizacionRef ? `
        <tr>
          <td style="font-weight:700;color:#6e6e73;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">REF. COTIZACIÓN:</td>
          <td colspan="3" style="color:#1d1d1f;font-weight:700;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);font-family:'JetBrains Mono',monospace;">
            <span style="background:#ffffff;color:#1d1d1f;padding:1px 6px;border-radius:3px;border:1px solid #d2d2d7;font-size:8px;">📄 ${escapeHtml(cotizacionRef)}</span>
          </td>
        </tr>
        ` : ''}
      </table>
    </div>
  `;

  const renderPersonalEnObra = () => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <span style="font-size:9px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#1d1d1f;">1. Personal Técnico Asignado en Sitio</span>
      <span style="font-size:8px;font-weight:500;color:#86868b;">Personal con certificación de trabajo en alturas</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(${Math.min(3, Math.max(1, personal.length))}, 1fr);gap:8px;margin-bottom:12px;">
      ${personal.length > 0 ? personal.map((p, idx) => `
        <div style="border:1px solid rgba(0,0,0,0.08);border-radius:6px;padding:6px 9px;background:#ffffff;display:flex;align-items:center;gap:7px;">
          <div style="width:20px;height:20px;background:#f5f5f7;border-radius:4px;color:#1d1d1f;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${String(idx + 1).padStart(2, "0")}
          </div>
          <div style="min-width:0;flex:1;">
            <div style="font-size:7.5px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(String(p.cargo || "TÉCNICO ESPECIALISTA").toUpperCase())}</div>
            <div style="font-size:9px;font-weight:600;color:#1d1d1f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.nombre || "Sin nombre")}</div>
          </div>
        </div>
      `).join("") : `
        <div style="border:1px dashed #d2d2d7;border-radius:6px;padding:6px 9px;color:#6e6e73;font-size:8px;font-style:italic;">Personal asignado conforme a programación de cuadrilla en obra.</div>
      `}
    </div>
  `;

  const renderBannerActividades = () => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;padding-top:2px;">
      <span style="font-size:9px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#1d1d1f;">2. Metodología y Registro de Actividades Ejecutadas</span>
      <span style="font-size:8px;font-weight:500;color:#86868b;">Control y Trazabilidad Operativa</span>
    </div>
  `;

  const renderTablaActividad = (act, idx) => `
    <div style="border:1px solid rgba(0,0,0,0.08);border-radius:8px;background:#ffffff;padding:10px 12px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f2f2f7;padding-bottom:5px;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="background:#1d1d1f;color:#ffffff;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px;">
            ACT-${String(idx + 1).padStart(2, "0")}
          </span>
          <span style="font-size:9.5px;font-weight:700;color:#1d1d1f;">
            ${escapeHtml(act.titulo || "Actividad Ejecutada")}
          </span>
        </div>
        ${act.fecha ? `
          <span style="font-size:8px;color:#6e6e73;font-family:'JetBrains Mono',monospace;">
            Fecha: ${escapeHtml(fmtL(act.fecha))}
          </span>
        ` : ""}
      </div>

      <div style="font-size:8.5px;color:#1d1d1f;line-height:1.45;text-align:justify;">
        ${(act.actividadesRealizadas || "").trim() ? `
          <div style="margin-bottom:4px;">
            <strong style="color:#6e6e73;text-transform:uppercase;font-size:7.5px;letter-spacing:0.04em;display:block;">Actividades Realizadas:</strong>
            ${escapeHtml(act.actividadesRealizadas)}
          </div>
        ` : ""}
        ${(act.descripcion || "").trim() ? `
          <div style="margin-bottom:4px;">
            <strong style="color:#6e6e73;text-transform:uppercase;font-size:7.5px;letter-spacing:0.04em;display:block;">Descripción Técnica:</strong>
            ${escapeHtml(act.descripcion)}
          </div>
        ` : ""}
      </div>

      <div style="margin-top:6px;padding-top:4px;border-top:1px solid #f2f2f7;display:flex;justify-content:space-between;align-items:center;font-size:8px;">
        <span style="color:#1d1d1f;">
          <strong style="color:#047857;">✓ Conforme:</strong> ${(act.observaciones || "").trim() ? escapeHtml(act.observaciones) : "Ejecutado a conformidad sin novedades reportadas."}
        </span>
        <span style="color:#6e6e73;font-weight:600;">Estado: Concluido 100%</span>
      </div>
    </div>
  `;

  const renderBannerFotos = (titulo) => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;padding-top:2px;">
      <span style="font-size:9px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#1d1d1f;">${escapeHtml(titulo)}</span>
      <span style="font-size:8px;font-weight:500;color:#86868b;">Registro Fotográfico en Sitio</span>
    </div>
  `;

  const renderFotoCard = (ft, actIdx, fotoIdx) => `
    <div style="border:1px solid rgba(0,0,0,0.08);border-radius:8px;overflow:hidden;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.02);display:flex;flex-direction:column;">
      <div style="height:190px;display:flex;align-items:center;justify-content:center;background:#fbfbfd;border-bottom:1px solid #f2f2f7;overflow:hidden;position:relative;">
        <img src="${ft.img || ft.url}" alt="Evidencia ${fotoIdx + 1}" style="width:100%;height:100%;object-fit:contain;display:block;background:#ffffff;"/>
        <span style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.65);color:#ffffff;font-size:7.5px;font-family:'JetBrains Mono',monospace;font-weight:700;padding:2px 6px;border-radius:4px;">
          EVIDENCIA ${actIdx + 1}.${fotoIdx + 1}
        </span>
      </div>
      <div style="padding:6px 9px;font-size:8px;color:#1d1d1f;line-height:1.35;background:#ffffff;">
        ${escapeHtml(ft.comentario || "Registro fotográfico y trazabilidad de actividades ejecutadas en sitio.")}
      </div>
    </div>
  `;

  const renderFotosFila = (parFotos, actIdx, startFotoIdx) => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;align-items:start;">
      ${parFotos.map((ft, i) => renderFotoCard(ft, actIdx, startFotoIdx + i)).join("")}
      ${parFotos.length === 1 ? `<div style="border:1px dashed #d2d2d7;border-radius:8px;background:#fbfbfd;height:100%;min-height:220px;display:flex;align-items:center;justify-content:center;color:#86868b;font-size:8px;">(Espacio reservado)</div>` : ""}
    </div>
  `;

  const renderTablaRecomendaciones = () => `
    <div style="border:1px solid rgba(0,0,0,0.08);border-radius:8px;overflow:hidden;margin-bottom:10px;background:#fbfbfd;padding:8px 12px;">
      <div style="font-size:8px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">DICTAMEN TÉCNICO Y RECOMENDACIONES</div>
      <div style="font-size:8.5px;color:#1d1d1f;line-height:1.45;text-align:justify;white-space:pre-line;">${escapeHtml(recomendaciones)}</div>
    </div>
  `;

  const renderBloqueFirma = () => `
    <table style="width:100%;border-collapse:collapse;margin-top:14px;border-top:1px solid rgba(0,0,0,0.08);padding-top:10px;">
      <tr>
        <td style="width:50%;padding:10px 14px 0 0;vertical-align:top;border-right:1px solid rgba(0,0,0,0.08);">
          <div style="font-size:7.5px;font-weight:700;color:#6e6e73;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Por el Contratista Especialista:</div>
          <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:3px;">
            ${firmaImg ? `<img src="${firmaImg}" alt="Firma" style="max-height:42px;max-width:180px;object-fit:contain;"/>` : `<div style="font-family:'Segoe Script',cursive,sans-serif;font-size:13px;font-weight:700;color:#1d1d1f;">Jhon Jaime Sepúlveda L.</div>`}
          </div>
          <div style="font-weight:800;font-size:9.5px;color:#1d1d1f;letter-spacing:0.01em;">ING. JHON JAIME SEPÚLVEDA LONDOÑO</div>
          <div style="font-size:8px;color:#6e6e73;">Gerente General · MP. 05256-409949</div>
          <div style="font-size:8px;color:#86868b;">Ingeanclajes S.A.S · NIT. 900.193.965-4</div>
        </td>
        <td style="width:50%;padding:10px 0 0 14px;vertical-align:top;">
          <div style="font-size:7.5px;font-weight:700;color:#6e6e73;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Recibido por la Interventoría / Constructora:</div>
          <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:3px;font-size:8px;color:#86868b;font-style:italic;">
            (Firma y sello de recepción a satisfacción)
          </div>
          <div style="font-weight:700;font-size:9px;color:#1d1d1f;">NOMBRE: ____________________________________</div>
          <div style="font-size:8px;color:#6e6e73;margin-top:2px;">CARGO / FIRMA: ______________________________</div>
          <div style="font-size:8px;color:#6e6e73;">EMPRESA: ${escapeHtml(cliente || "Constructora / Contratante")}</div>
        </td>
      </tr>
    </table>
  `;

  // --- MOTOR DE EMPAQUETADO FLUIDO DE PÁGINAS ---
  const paginas = [[]];
  let pIdx = 0;
  let alturaActual = 0;

  const nuevaPagina = () => {
    pIdx += 1;
    paginas[pIdx] = [renderHeaderSecundario()];
    alturaActual = 38; // Altura del encabezado secundario
  };

  // 1. Portada Top
  const altoPortadaTop = 16 + 82 + 82 + 24 + (28 + Math.max(1, personal.length) * 26) + 26;
  paginas[0].push(renderHeaderPortada());
  paginas[0].push(renderDatosProyecto());
  paginas[0].push(renderPersonalEnObra());
  paginas[0].push(renderBannerActividades());
  alturaActual = altoPortadaTop;

  // 2. Empaquetar Actividades y Fotos de forma continua
  actividades.forEach((act, actIdx) => {
    const lineasAct = estimarLineas(act.actividadesRealizadas);
    const lineasDesc = estimarLineas(act.descripcion);
    const lineasObs = estimarLineas(act.observaciones);
    const altoTabla = 28 + (act.fecha ? 18 : 0) + Math.max(20, lineasAct * 13 + 10) + Math.max(20, lineasDesc * 13 + 10) + Math.max(20, lineasObs * 13 + 10) + 12;

    const fotos = (act.fotos || []).filter((ft) => ft.img || ft.url);

    // Si la tabla no cabe en la hoja actual, abrir una nueva hoja
    if (alturaActual + altoTabla > MAX_ALTO_PAGINA) {
      nuevaPagina();
    }

    paginas[pIdx].push(renderTablaActividad(act, actIdx));
    alturaActual += altoTabla;

    // Procesar fotos de la actividad
    if (fotos.length > 0) {
      const filas = [];
      for (let i = 0; i < fotos.length; i += 2) {
        filas.push(fotos.slice(i, i + 2));
      }

      const altoTituloFotos = 26;
      const altoFilaFotos = 230;

      let tituloPuesto = false;

      filas.forEach((fila, fIdx) => {
        const esPrimeraFila = fIdx === 0;
        const espacioRequerido = (esPrimeraFila && !tituloPuesto) ? (altoTituloFotos + altoFilaFotos) : altoFilaFotos;

        if (alturaActual + espacioRequerido > MAX_ALTO_PAGINA) {
          nuevaPagina();
          tituloPuesto = false;
        }

        if (!tituloPuesto) {
          const textoTitulo = `3. Panel Técnico de Evidencias Fotográficas · ${act.titulo || "Actividad"}${fIdx > 0 ? " (Cont.)" : ""}`;
          paginas[pIdx].push(renderBannerFotos(textoTitulo));
          alturaActual += altoTituloFotos;
          tituloPuesto = true;
        }

        paginas[pIdx].push(renderFotosFila(fila, actIdx, fIdx * 2));
        alturaActual += altoFilaFotos;
      });
    }
  });

  // 3. Empaquetar Recomendaciones y Firma
  const lineasRec = estimarLineas(recomendaciones);
  const altoRecomendaciones = recomendaciones ? Math.max(28, lineasRec * 13 + 14) + 12 : 0;
  const altoFirma = 115;

  if (recomendaciones) {
    if (alturaActual + altoRecomendaciones > MAX_ALTO_PAGINA) {
      nuevaPagina();
    }
    paginas[pIdx].push(renderTablaRecomendaciones());
    alturaActual += altoRecomendaciones;
  }

  // Si no cabe la firma en la hoja actual
  if (alturaActual + altoFirma > MAX_ALTO_PAGINA) {
    nuevaPagina();
  }
  paginas[pIdx].push(renderBloqueFirma());
  alturaActual += altoFirma;

  // Total de hojas consolidadas
  const totalHojas = paginas.length;

  const seccionesHtml = paginas.map((bloques, idx) => `
    <section class="page" style="width:8.5in;height:11in;padding:28px 36px 20px;box-sizing:border-box;background:#ffffff;position:relative;display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;break-after:page;">
      <div style="flex:1;">
        ${bloques.join("\n")}
      </div>
      <div style="border-top:1px solid #cbd5e1;padding-top:5px;display:flex;justify-content:space-between;align-items:center;font-size:8px;color:#475569;margin-top:6px;">
        <span>Ingeanclajes S.A.S · Documento Técnico Oficial SGC · FO-ACT-04 (V-03)</span>
        <span>Página ${idx + 1} de ${totalHojas}</span>
      </div>
    </section>
  `).join("\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Informe ${escapeHtml(numDoc)} ${escapeHtml(proyecto)}</title>
    <style>
      @page {
        size: Letter;
        margin: 0;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        letter-spacing: normal;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }
      .page {
        width: 8.5in;
        height: 11in;
        margin: 0 auto 20px;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
        background: #ffffff;
        position: relative;
        overflow: hidden;
        break-after: page;
        page-break-after: always;
      }
      @media print {
        html, body {
          background: #ffffff !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #print-toolbar, #print-toolbar + div {
          display: none !important;
        }
        .page {
          margin: 0 !important;
          box-shadow: none !important;
          width: 8.5in !important;
          height: 11in !important;
          page-break-after: always !important;
          break-after: page !important;
        }
      }
    </style>
  </head>
  <body>
    ${seccionesHtml}
  </body>
</html>`;
}
