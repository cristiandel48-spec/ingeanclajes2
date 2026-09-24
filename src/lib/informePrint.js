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
  
  const rawActividades = Array.isArray(informe?.actividades) && informe.actividades.length
    ? informe.actividades
    : [{ titulo: informe?.actividad, descripcion: informe?.descripcion, observaciones: informe?.observaciones, fotos: informe?.fotos || [] }];
  const actividades = rawActividades.map(conActividadSeparada);
  const recomendaciones = String(informe?.recomendaciones || "").trim();

  const numDoc = informe?.id ? String(informe.id).trim() : (informe?.numero ? String(informe.numero).trim() : "");

  // --- RENDERIZADORES DE FRAGMENTOS VISUALES ---

  const renderHeaderPortada = () => `
    <div style="height:4px;background:linear-gradient(90deg, #ea580c 0%, #f97316 40%, #0f172a 100%);border-radius:2px;margin-bottom:12px;"></div>
    <table style="width:100%;border-collapse:collapse;border:1.5px solid #1e293b;margin-bottom:12px;background:#ffffff;">
      <tr>
        <td style="width:28%;text-align:center;border-right:1.5px solid #1e293b;padding:6px 12px;vertical-align:middle;">
          ${LOGO_INGEANCLAJES ? `<img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" style="height:44px;max-width:180px;object-fit:contain;display:block;margin:0 auto 3px;"/>` : `<div style="font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-0.03em;">INGE<span style="color:#ea580c;">ANCLAJES</span></div>`}
          <div style="font-size:7.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Especialistas en Anclajes S.A.S</div>
          <div style="font-size:7.5px;color:#94a3b8;margin-top:1px;">NIT. 900.193.965-4 · PBX (604) 448 26 86</div>
        </td>
        <td style="width:46%;text-align:center;padding:6px 10px;vertical-align:middle;border-right:1px solid #334155;">
          <div style="font-size:8px;font-weight:800;color:#ea580c;letter-spacing:0.12em;text-transform:uppercase;">Sistema de Gestión de la Calidad</div>
          <div style="font-size:12px;font-weight:800;color:#0f172a;letter-spacing:0.04em;margin-top:3px;line-height:1.25;">INFORME TÉCNICO DE ACTIVIDADES EN OBRA</div>
          <div style="font-size:8px;font-weight:500;color:#475569;margin-top:2px;">Inspección, Montaje y Pruebas Estructurales</div>
        </td>
        <td style="width:26%;font-size:8px;line-height:1.5;background:#fafafa;padding:6px 10px;vertical-align:middle;">
          <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #e2e8f0;padding-bottom:1px;margin-bottom:2px;">
            <span style="color:#64748b;font-weight:600;">CÓDIGO:</span>
            <span style="font-weight:700;color:#0f172a;font-family:'JetBrains Mono',monospace;">${escapeHtml(docCodigo)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #e2e8f0;padding-bottom:1px;margin-bottom:2px;">
            <span style="color:#64748b;font-weight:600;">VERSIÓN:</span>
            <span style="font-weight:700;color:#0f172a;font-family:'JetBrains Mono',monospace;">${escapeHtml(docVersion)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #e2e8f0;padding-bottom:1px;margin-bottom:2px;">
            <span style="color:#64748b;font-weight:600;">EMISIÓN:</span>
            <span style="font-weight:700;color:#0f172a;font-family:'JetBrains Mono',monospace;">${escapeHtml(docFecha)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#64748b;font-weight:600;">CONSECUTIVO:</span>
            <span style="color:#ea580c;font-weight:800;font-size:9.5px;font-family:'JetBrains Mono',monospace;">${escapeHtml(numDoc || "INF-OFICIAL")}</span>
          </div>
        </td>
      </tr>
    </table>
  `;

  const renderHeaderSecundario = () => `
    <div style="height:3px;background:linear-gradient(90deg, #ea580c 0%, #0f172a 100%);border-radius:2px;margin-bottom:8px;"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #cbd5e1;padding-bottom:5px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:7px;">
        <span style="font-size:11px;font-weight:800;color:#0f172a;">INGE<span style="color:#ea580c;">ANCLAJES</span></span>
        <span style="color:#94a3b8;font-size:10px;">·</span>
        <span style="font-size:9px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.04em;">Informe de Actividades · ${escapeHtml(proyecto)}</span>
      </div>
      <div style="font-size:9px;color:#ea580c;font-family:'JetBrains Mono',monospace;font-weight:800;">${escapeHtml(numDoc)}</div>
    </div>
  `;

  const renderDatosProyecto = () => `
    <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;font-size:9px;margin-bottom:12px;background:#ffffff;">
      <tr>
        <td style="width:18%;background:#f8fafc;font-weight:700;color:#475569;letter-spacing:0.04em;font-size:8px;text-transform:uppercase;border:1px solid #e2e8f0;padding:5px 9px;">PROYECTO:</td>
        <td style="width:36%;font-weight:800;color:#0f172a;border:1px solid #e2e8f0;padding:5px 9px;">${escapeHtml(proyecto || "OBRA GENERAL")}</td>
        <td style="width:18%;background:#f8fafc;font-weight:700;color:#475569;letter-spacing:0.04em;font-size:8px;text-transform:uppercase;border:1px solid #e2e8f0;padding:5px 9px;">PERÍODO AUDITADO:</td>
        <td style="width:28%;color:#0f172a;font-weight:600;border:1px solid #e2e8f0;padding:5px 9px;">${escapeHtml(periodo)}</td>
      </tr>
      <tr>
        <td style="background:#f8fafc;font-weight:700;color:#475569;letter-spacing:0.04em;font-size:8px;text-transform:uppercase;border:1px solid #e2e8f0;padding:5px 9px;">CONTRATANTE:</td>
        <td style="color:#0f172a;font-weight:600;border:1px solid #e2e8f0;padding:5px 9px;">${escapeHtml(cliente || "A QUIEN INTERESE")}</td>
        <td style="background:#f8fafc;font-weight:700;color:#475569;letter-spacing:0.04em;font-size:8px;text-transform:uppercase;border:1px solid #e2e8f0;padding:5px 9px;">FECHA INFORME:</td>
        <td style="color:#0f172a;font-weight:600;border:1px solid #e2e8f0;padding:5px 9px;">${escapeHtml(fechaInforme)}</td>
      </tr>
      <tr>
        <td style="background:#f8fafc;font-weight:700;color:#475569;letter-spacing:0.04em;font-size:8px;text-transform:uppercase;border:1px solid #e2e8f0;padding:5px 9px;">LOCALIZACIÓN:</td>
        <td style="color:#0f172a;font-weight:600;border:1px solid #e2e8f0;padding:5px 9px;">${escapeHtml(localizacion || "MEDELLÍN")}</td>
        <td style="background:#f8fafc;font-weight:700;color:#475569;letter-spacing:0.04em;font-size:8px;text-transform:uppercase;border:1px solid #e2e8f0;padding:5px 9px;">NORMATIVA:</td>
        <td style="border:1px solid #e2e8f0;padding:5px 9px;">
          <span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-size:8px;font-weight:700;padding:1.5px 6px;border-radius:4px;display:inline-block;letter-spacing:0.02em;">Res. 4272/2021 · OSHA 1926.502</span>
        </td>
      </tr>
    </table>
  `;

  const renderPersonalEnObra = () => `
    <div style="background:linear-gradient(90deg, #0f172a 0%, #1e293b 100%);color:#ffffff;padding:4px 10px;display:flex;align-items:center;justify-content:space-between;border-left:4px solid #ea580c;margin-bottom:6px;border-radius:0 4px 4px 0;">
      <span style="font-size:9.5px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;">1. Personal Técnico en Obra</span>
      <span style="font-size:8px;font-weight:600;color:#94a3b8;letter-spacing:0.04em;text-transform:uppercase;">Cuadrilla Asignada en Sitio</span>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;font-size:9px;margin-bottom:12px;background:#ffffff;">
      <thead>
        <tr>
          <th style="width:38%;background:#f1f5f9;border:1px solid #cbd5e1;padding:5px 9px;font-weight:800;text-align:left;color:#334155;font-size:8.5px;letter-spacing:0.05em;text-transform:uppercase;">CARGO / ESPECIALIDAD EN SITIO</th>
          <th style="width:62%;background:#f1f5f9;border:1px solid #cbd5e1;padding:5px 9px;font-weight:800;text-align:left;color:#334155;font-size:8.5px;letter-spacing:0.05em;text-transform:uppercase;">NOMBRE COMPLETO DEL PERSONAL EN OBRA</th>
        </tr>
      </thead>
      <tbody>
        ${personal.length > 0 ? personal.map((p, idx) => `
          <tr style="background:${idx % 2 === 1 ? "#fafafa" : "#ffffff"};">
            <td style="border:1px solid #e2e8f0;padding:5px 9px;vertical-align:middle;">
              <div style="font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;">
                <span style="width:6px;height:6px;background:#ea580c;border-radius:50%;display:inline-block;flex-shrink:0;"></span>
                <span>${escapeHtml(p.cargo || "Técnico Especialista")}</span>
              </div>
            </td>
            <td style="border:1px solid #e2e8f0;padding:5px 9px;vertical-align:middle;font-weight:600;color:#1e293b;font-size:9.5px;">
              ${escapeHtml(p.nombre || "Sin nombre registrado")}
            </td>
          </tr>
        `).join("") : `
          <tr>
            <td colspan="2" style="border:1px solid #e2e8f0;padding:6px 9px;color:#94a3b8;font-style:italic;">Personal asignado conforme a programación de cuadrilla en obra.</td>
          </tr>
        `}
      </tbody>
    </table>
  `;

  const renderBannerActividades = () => `
    <div style="background:linear-gradient(90deg, #0f172a 0%, #1e293b 100%);color:#ffffff;padding:4px 10px;display:flex;align-items:center;justify-content:space-between;border-left:4px solid #ea580c;margin-bottom:6px;border-radius:0 4px 4px 0;">
      <span style="font-size:9.5px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;">2. Registro y Metodología de Actividades Ejecutadas</span>
      <span style="font-size:8px;font-weight:600;color:#94a3b8;letter-spacing:0.04em;text-transform:uppercase;">Control Operativo</span>
    </div>
  `;

  const renderTablaActividad = (act, idx) => `
    <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;font-size:9px;margin-bottom:10px;background:#ffffff;">
      <thead>
        <tr>
          <th colspan="2" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:5px 9px;font-weight:800;text-align:left;color:#0f172a;font-size:9.5px;">
            <div style="display:flex;align-items:center;gap:7px;">
              <span style="background:#0f172a;color:#ffffff;font-family:'JetBrains Mono',monospace;font-size:8.5px;padding:1px 5px;border-radius:3px;font-weight:700;">${String(idx + 1).padStart(2, "0")}</span>
              <span>${escapeHtml(act.titulo || "Actividad Ejecutada")}</span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        ${act.fecha ? `
          <tr>
            <td style="width:24%;border:1px solid #e2e8f0;padding:4px 9px;background:#f8fafc;font-weight:700;font-size:8px;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">FECHA DE EJECUCIÓN</td>
            <td style="border:1px solid #e2e8f0;padding:4px 9px;font-size:9px;color:#0f172a;font-weight:600;">${escapeHtml(fmtL(act.fecha))}</td>
          </tr>
        ` : ""}
        ${(act.actividadesRealizadas || "").trim() ? `
          <tr>
            <td style="width:24%;border:1px solid #e2e8f0;padding:5px 9px;background:#f8fafc;font-weight:700;font-size:8px;color:#475569;text-transform:uppercase;letter-spacing:0.04em;vertical-align:top;">ACTIVIDADES REALIZADAS</td>
            <td style="border:1px solid #e2e8f0;padding:5px 9px;font-size:8.5px;color:#334155;line-height:1.45;text-align:justify;white-space:pre-line;">${escapeHtml(act.actividadesRealizadas)}</td>
          </tr>
        ` : ""}
        ${(act.descripcion || "").trim() ? `
          <tr>
            <td style="width:24%;border:1px solid #e2e8f0;padding:5px 9px;background:#f8fafc;font-weight:700;font-size:8px;color:#475569;text-transform:uppercase;letter-spacing:0.04em;vertical-align:top;">DESCRIPCIÓN TÉCNICA</td>
            <td style="border:1px solid #e2e8f0;padding:5px 9px;font-size:8.5px;color:#334155;line-height:1.45;text-align:justify;white-space:pre-line;">${escapeHtml(act.descripcion)}</td>
          </tr>
        ` : ""}
        <tr>
          <td style="width:24%;border:1px solid #e2e8f0;padding:5px 9px;background:#f8fafc;font-weight:700;font-size:8px;color:#475569;text-transform:uppercase;letter-spacing:0.04em;vertical-align:top;">CRITERIO / OBSERVACIONES</td>
          <td style="border:1px solid #e2e8f0;padding:5px 9px;font-size:8.5px;color:#334155;line-height:1.4;">
            ${(act.observaciones || "").trim() ? `<span style="color:#059669;font-weight:700;">✓ Conforme:</span> ${escapeHtml(act.observaciones)}` : `<span style="color:#64748b;font-style:italic;">Ejecutado a conformidad sin novedades reportadas.</span>`}
          </td>
        </tr>
      </tbody>
    </table>
  `;

  const renderBannerFotos = (titulo) => `
    <div style="background:linear-gradient(90deg, #0f172a 0%, #1e293b 100%);color:#ffffff;padding:4px 10px;display:flex;align-items:center;justify-content:space-between;border-left:4px solid #ea580c;margin-bottom:8px;border-radius:0 4px 4px 0;">
      <span style="font-size:9.5px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;">${escapeHtml(titulo)}</span>
      <span style="font-size:8px;font-weight:600;color:#94a3b8;letter-spacing:0.04em;text-transform:uppercase;">Registro Visual en Sitio</span>
    </div>
  `;

  const renderFotoCard = (ft, actIdx, fotoIdx) => `
    <div style="border:1px solid #cbd5e1;border-radius:4px;overflow:hidden;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.04);display:flex;flex-direction:column;">
      <div style="height:190px;display:flex;align-items:center;justify-content:center;background:#f8fafc;border-bottom:1px solid #e2e8f0;overflow:hidden;">
        <img src="${ft.img || ft.url}" alt="Evidencia ${fotoIdx + 1}" style="width:100%;height:100%;object-fit:contain;display:block;background:#ffffff;"/>
      </div>
      <div style="padding:5px 8px;font-size:8px;color:#334155;line-height:1.35;background:#ffffff;">
        <strong style="color:#ea580c;">REF ${actIdx + 1}.${fotoIdx + 1}:</strong> ${escapeHtml(ft.comentario || "Registro fotográfico y trazabilidad de actividades ejecutadas en sitio.")}
      </div>
    </div>
  `;

  const renderFotosFila = (parFotos, actIdx, startFotoIdx) => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;align-items:start;">
      ${parFotos.map((ft, i) => renderFotoCard(ft, actIdx, startFotoIdx + i)).join("")}
      ${parFotos.length === 1 ? `<div style="border:1px dashed #cbd5e1;border-radius:4px;background:#f8fafc;height:100%;min-height:220px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:8px;">(Espacio reservado)</div>` : ""}
    </div>
  `;

  const renderTablaRecomendaciones = () => `
    <div style="border:1px solid #cbd5e1;border-radius:4px;overflow:hidden;margin-bottom:10px;background:#ffffff;">
      <div style="background:#f1f5f9;padding:4px 9px;font-size:8.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #cbd5e1;">RECOMENDACIONES TÉCNICAS GENERALES</div>
      <div style="padding:6px 9px;font-size:8.5px;color:#334155;line-height:1.45;text-align:justify;white-space:pre-line;">${escapeHtml(recomendaciones)}</div>
    </div>
  `;

  const renderBloqueFirma = () => `
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr>
        <td style="width:50%;padding:0 10px 0 0;vertical-align:top;">
          <div style="border-top:2px solid #0f172a;padding-top:6px;font-size:8.5px;line-height:1.45;">
            <div style="font-size:8px;font-weight:800;color:#64748b;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:3px;">Por el Contratista (Ingeanclajes S.A.S):</div>
            <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:2px;">
              ${firmaImg ? `<img src="${firmaImg}" alt="Firma" style="max-height:42px;max-width:180px;object-fit:contain;"/>` : `<div style="font-family:'Segoe Script',cursive,sans-serif;font-size:13px;font-weight:700;color:#0f172a;">Jhon Jaime Sepúlveda L.</div>`}
            </div>
            <div style="font-weight:800;font-size:9.5px;color:#0f172a;letter-spacing:0.02em;">ING. JHON JAIME SEPÚLVEDA LONDOÑO</div>
            <div style="font-size:8px;color:#64748b;">Gerente General · MP. 05256-409949</div>
            <div style="font-size:8px;color:#64748b;">Ingeanclajes S.A.S · NIT. 900.193.965-4</div>
          </div>
        </td>
        <td style="width:50%;padding:0 0 0 10px;vertical-align:top;">
          <div style="border-top:2px solid #0f172a;padding-top:6px;font-size:8.5px;line-height:1.45;">
            <div style="font-size:8px;font-weight:800;color:#64748b;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:3px;">Recibido por la Interventoría / Constructora:</div>
            <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:2px;font-size:8px;color:#94a3b8;font-style:italic;">
              (Firma y sello de recepción a satisfacción)
            </div>
            <div style="font-weight:700;font-size:9px;color:#0f172a;">NOMBRE: ____________________________________</div>
            <div style="font-size:8px;color:#64748b;margin-top:2px;">CARGO / FIRMA: ______________________________</div>
            <div style="font-size:8px;color:#64748b;">EMPRESA: ${escapeHtml(cliente || "Constructora / Contratante")}</div>
          </div>
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
    <section class="page" style="width:816px;height:1056px;padding:30px 40px 22px;box-sizing:border-box;background:#ffffff;position:relative;display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;break-after:page;">
      <div style="flex:1;">
        ${bloques.join("\n")}
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:5px;display:flex;justify-content:space-between;align-items:center;font-size:8px;color:#94a3b8;margin-top:8px;">
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
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body {
        margin: 0;
        padding: 0;
        background: #f1f5f9;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        -webkit-font-smoothing: antialiased;
      }
      .page {
        width: 816px;
        height: 1056px;
        margin: 0 auto 20px;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
      }
      @media print {
        body { background: #ffffff; }
        .page { margin: 0; box-shadow: none; width: 100%; height: 100vh; page-break-after: always; break-after: page; }
      }
    </style>
  </head>
  <body>
    ${seccionesHtml}
  </body>
</html>`;
}
