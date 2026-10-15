// Generación del HTML imprimible de Informes de Actividades organizado
// con el nuevo Formato Técnico Industrial Ejecutivo IngeAnclajes.
// Empaquetado fluido por páginas con fidelidad 100%, sin desbordes y con paginación exacta.

import { fmtL } from "./format";
import { escapeHtml } from "./html";
import { normalizarMayusculas } from "./normalizarEntrada";
import { LOGO_INGEANCLAJES } from "../assets/embeddedImages";
import { getControlDocumental } from "./controlDocumental";
import { conActividadSeparada } from "./informeTextos";
import { cssHojaImpresion } from "./hojaImpresion";

// Capacidad util de contenido por hoja, en pixeles de pantalla (96 ppp).
//
// Una hoja carta mide 1056px de alto. Con los margenes de @page -14mm arriba
// y 15mm abajo- el area util imprimible es de 946px. Quitando el pie de hoja
// (~26px) quedan ~920 para el contenido.
//
// Es UN solo tope para todas las hojas, portada incluida, porque la altura
// de los encabezados ya se suma por separado en `alturaActual`: la portada
// arranca con el encabezado editorial, los datos del proyecto y el personal
// ya contados, y las demas con el encabezado secundario. Tener un tope
// aparte para la portada se los cobraba dos veces y la cortaba a media
// hoja, que es lo que dejaba ese hueco blanco enorme debajo de la primera
// actividad.
//
// 915 deja unos 8mm de holgura sobre el area util, suficiente para que no se
// desborde a una hoja fantasma aunque los calculos de altura se queden
// cortos por unos pixeles.
const MAX_ALTO_PAGINA = 915;

const ALTO_HEADER_PORTADA = 88;
const ALTO_HEADER_SECUNDARIO = 36;
const ALTO_BANNER_ACTIVIDADES = 22;
const ALTO_BANNER_FOTOS = 24;
const ALTO_FILA_FOTOS = 196; // 155px imagen + ~30px caption + 9px margen + 2px borde
const ALTO_FIRMA = 112;

function estimarLineas(texto, caracteresPorLinea = 82) {
  const str = String(texto || "").trim();
  if (!str) return 0;
  const parrafos = str.split(/\r?\n/).filter(Boolean);
  return parrafos.reduce((total, p) => total + Math.max(1, Math.ceil(p.length / caracteresPorLinea)), 0);
}

const calcularAltoDatos = (hasCotiz) => (hasCotiz ? 138 : 115);

const calcularAltoPersonal = (arr) => {
  if (!arr || arr.length === 0) return 38;
  const filas = Math.ceil(arr.length / 3);
  return 20 + filas * 38 + 10;
};

const calcularAltoActividad = (act) => {
  const lAct = estimarLineas(act.actividadesRealizadas, 85);
  const lDesc = estimarLineas(act.descripcion, 85);
  const lObs = estimarLineas(act.observaciones, 85);
  const altoTextos = (lAct > 0 ? (16 + lAct * 14.8 + 4) : 0) +
                     (lDesc > 0 ? (16 + lDesc * 14.8 + 4) : 0);
  return 34 + (act.fecha ? 14 : 0) + altoTextos + (lObs > 0 ? 28 : 22) + 16;
};

const calcularAltoRecomendaciones = (rec) => {
  if (!rec) return 0;
  const lRec = estimarLineas(rec, 85);
  return 22 + lRec * 14.8 + 16 + 10;
};

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
    <div style="height:2px;background:#18181b;border-radius:1px;margin-bottom:10px;"></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid rgba(0,0,0,0.08);padding-bottom:10px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${LOGO_INGEANCLAJES ? `<img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" style="height:46px;max-width:180px;object-fit:contain;display:block;"/>` : `<div style="font-size:17px;font-weight:800;color:#18181b;letter-spacing:-0.03em;">INGE<span style="color:#ea580c;">ANCLAJES</span></div>`}
        <div>
          <div style="font-size:13.5px;font-weight:800;color:#18181b;letter-spacing:-0.01em;">INGEANCLAJES <span style="font-size:11px;font-weight:700;color:#ea580c;">S.A.S.</span></div>
          <div style="font-size:9px;font-weight:700;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">Sistemas de Ingeniería y Protección Contra Caídas</div>
          <div style="font-size:8.5px;color:#71717a;margin-top:1px;">NIT. 900.193.965-4 · PBX (604) 448 26 86 · Medellín, Colombia</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="display:inline-block;padding:2px 8px;border-radius:4px;background:#f4f4f5;border:1px solid #e4e4e7;font-size:8.5px;color:#52525b;font-family:'JetBrains Mono',monospace;font-weight:600;margin-bottom:3px;">
          SISTEMA DE GESTIÓN DE CALIDAD · ${escapeHtml(docCodigo)} (V-${escapeHtml(docVersion)})
        </div>
        <div style="font-size:12px;font-weight:800;color:#18181b;letter-spacing:0.02em;text-transform:uppercase;">INFORME TÉCNICO DE ACTIVIDADES EN OBRA</div>
        <div style="font-size:10px;color:#18181b;font-family:'JetBrains Mono',monospace;font-weight:700;margin-top:2px;">
          Consecutivo: <span style="background:#18181b;color:#ffffff;padding:1.5px 7px;border-radius:3px;">${escapeHtml(numDoc || "INF-OFICIAL")}</span>
        </div>
      </div>
    </div>
  `;

  const renderHeaderSecundario = () => `
    <div style="height:2px;background:#18181b;border-radius:1px;margin-bottom:7px;"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(0,0,0,0.08);padding-bottom:5px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;font-weight:800;color:#18181b;">INGE<span style="color:#ea580c;">ANCLAJES</span></span>
        <span style="color:#d4d4d8;font-size:11px;">·</span>
        <span style="font-size:9.5px;font-weight:700;color:#52525b;text-transform:uppercase;letter-spacing:0.04em;">Informe de Actividades · ${escapeHtml(proyecto)}</span>
      </div>
      <div style="font-size:9.5px;color:#18181b;font-family:'JetBrains Mono',monospace;font-weight:700;">${escapeHtml(numDoc)}</div>
    </div>
  `;

  const renderDatosProyecto = () => `
    <div style="border:1px solid rgba(0,0,0,0.08);border-radius:8px;padding:8px 12px;margin-bottom:10px;background:#fafafa;">
      <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
        <tr>
          <td style="width:16%;font-weight:700;color:#52525b;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;">PROYECTO:</td>
          <td style="width:40%;font-weight:700;color:#18181b;font-size:10.5px;padding:3.5px 6px;">${escapeHtml(proyecto || "OBRA GENERAL")}</td>
          <td style="width:16%;font-weight:700;color:#52525b;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid rgba(0,0,0,0.06);">PERÍODO:</td>
          <td style="width:28%;color:#18181b;font-weight:600;font-size:10px;padding:3.5px 6px;">${escapeHtml(periodo)}</td>
        </tr>
        <tr>
          <td style="font-weight:700;color:#52525b;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">CONTRATANTE:</td>
          <td style="color:#18181b;font-weight:600;font-size:10px;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">${escapeHtml(cliente || "A QUIEN INTERESE")}</td>
          <td style="font-weight:700;color:#52525b;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid rgba(0,0,0,0.06);border-top:1px solid rgba(0,0,0,0.04);">FECHA EMISIÓN:</td>
          <td style="color:#18181b;font-weight:600;font-size:10px;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">${escapeHtml(fechaInforme)}</td>
        </tr>
        <tr>
          <td style="font-weight:700;color:#52525b;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">LOCALIZACIÓN:</td>
          <td style="color:#18181b;font-weight:600;font-size:10px;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">${escapeHtml(localizacion || "MEDELLÍN")}</td>
          <td style="font-weight:700;color:#52525b;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid rgba(0,0,0,0.06);border-top:1px solid rgba(0,0,0,0.04);">NORMATIVA:</td>
          <td style="padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">
            <span style="background:#ffffff;color:#18181b;border:1px solid #d4d4d8;font-size:8.5px;font-weight:700;padding:1.5px 6px;border-radius:3px;display:inline-block;letter-spacing:0.02em;">Res. 4272/2021 · OSHA 1926</span>
          </td>
        </tr>
        ${cotizacionRef ? `
        <tr>
          <td style="font-weight:700;color:#52525b;letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);">REF. COTIZACIÓN:</td>
          <td colspan="3" style="color:#18181b;font-weight:700;padding:3.5px 6px;border-top:1px solid rgba(0,0,0,0.04);font-family:'JetBrains Mono',monospace;">
            <span style="background:#ffffff;color:#18181b;padding:1.5px 6px;border-radius:3px;border:1px solid #d4d4d8;font-size:9px;">📄 ${escapeHtml(cotizacionRef)}</span>
          </td>
        </tr>
        ` : ''}
      </table>
    </div>
  `;

  const renderPersonalEnObra = () => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
      <span style="font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#18181b;">1. Personal Técnico Asignado en Sitio</span>
      <span style="font-size:8.5px;font-weight:500;color:#71717a;">Personal certificado con trabajo seguro en alturas</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(${Math.min(3, Math.max(1, personal.length))}, 1fr);gap:7px;margin-bottom:10px;">
      ${personal.length > 0 ? personal.map((p, idx) => `
        <div style="border:1px solid rgba(0,0,0,0.08);border-radius:6px;padding:5px 8px;background:#ffffff;display:flex;align-items:center;gap:7px;">
          <div style="width:20px;height:20px;background:#f4f4f5;border-radius:4px;color:#18181b;font-family:'JetBrains Mono',monospace;font-size:8.5px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${String(idx + 1).padStart(2, "0")}
          </div>
          <div style="min-width:0;flex:1;">
            <div style="font-size:7.5px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(String(p.cargo || "TÉCNICO ESPECIALISTA").toUpperCase())}</div>
            <div style="font-size:10px;font-weight:600;color:#18181b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.nombre || "Sin nombre")}</div>
          </div>
        </div>
      `).join("") : `
        <div style="border:1px dashed #d4d4d8;border-radius:6px;padding:6px 9px;color:#71717a;font-size:8.5px;font-style:italic;">Personal asignado conforme a programación de cuadrilla en obra.</div>
      `}
    </div>
  `;

  const renderBannerActividades = () => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;padding-top:1px;">
      <span style="font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#18181b;">2. Metodología y Registro de Actividades Ejecutadas</span>
      <span style="font-size:8.5px;font-weight:500;color:#71717a;">Control y Trazabilidad Operativa</span>
    </div>
  `;

  const renderTablaActividad = (act, idx) => `
    <div style="border:1px solid rgba(0,0,0,0.08);border-radius:8px;background:#ffffff;padding:9px 12px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f4f4f5;padding-bottom:5px;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="background:#18181b;color:#ffffff;font-family:'JetBrains Mono',monospace;font-size:8.5px;font-weight:700;padding:1.5px 6px;border-radius:3px;">
            ACT-${String(idx + 1).padStart(2, "0")}
          </span>
          <span style="font-size:11px;font-weight:700;color:#18181b;">
            ${escapeHtml(act.titulo || "Actividad Ejecutada")}
          </span>
        </div>
        ${act.fecha ? `
          <span style="font-size:8.5px;color:#71717a;font-family:'JetBrains Mono',monospace;">
            Fecha: ${escapeHtml(fmtL(act.fecha))}
          </span>
        ` : ""}
      </div>

      <div style="font-size:10px;color:#27272a;line-height:1.48;text-align:justify;">
        ${(act.actividadesRealizadas || "").trim() ? `
          <div style="margin-bottom:5px;">
            <strong style="color:#52525b;text-transform:uppercase;font-size:8.5px;letter-spacing:0.05em;display:block;margin-bottom:1px;">Actividades Realizadas:</strong>
            ${escapeHtml(act.actividadesRealizadas)}
          </div>
        ` : ""}
        ${(act.descripcion || "").trim() ? `
          <div style="margin-bottom:4px;">
            <strong style="color:#52525b;text-transform:uppercase;font-size:8.5px;letter-spacing:0.05em;display:block;margin-bottom:1px;">Descripción Técnica:</strong>
            ${escapeHtml(act.descripcion)}
          </div>
        ` : ""}
      </div>

      <div style="margin-top:6px;padding-top:4px;border-top:1px solid #f4f4f5;display:flex;justify-content:space-between;align-items:center;font-size:9px;">
        <span style="color:#18181b;">
          <strong style="color:#059669;">✓ Conforme:</strong> ${(act.observaciones || "").trim() ? escapeHtml(act.observaciones) : "Ejecutado a conformidad sin novedades reportadas."}
        </span>
        <span style="color:#52525b;font-weight:600;">Estado: Concluido 100%</span>
      </div>
    </div>
  `;

  const renderBannerFotos = (titulo) => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;padding-top:1px;">
      <span style="font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#18181b;">${escapeHtml(titulo)}</span>
      <span style="font-size:8.5px;font-weight:500;color:#71717a;">Registro Fotográfico en Sitio</span>
    </div>
  `;

  const renderFotoCard = (ft, actIdx, fotoIdx) => `
    <div class="foto-card" style="border:1px solid rgba(0,0,0,0.08);border-radius:8px;overflow:hidden;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.02);display:flex;flex-direction:column;">
      <div style="height:155px;display:flex;align-items:center;justify-content:center;background:#fafafa;border-bottom:1px solid #f4f4f5;overflow:hidden;position:relative;">
        <img src="${ft.img || ft.url}" alt="Evidencia ${fotoIdx + 1}" style="width:100%;height:100%;object-fit:contain;display:block;background:#ffffff;"/>
        <span style="position:absolute;top:5px;left:5px;background:rgba(0,0,0,0.68);color:#ffffff;font-size:8px;font-family:'JetBrains Mono',monospace;font-weight:700;padding:2px 6px;border-radius:4px;">
          EVIDENCIA ${actIdx + 1}.${fotoIdx + 1}
        </span>
      </div>
      <div style="padding:5px 8px;font-size:8.5px;color:#27272a;line-height:1.35;background:#ffffff;">
        ${escapeHtml(ft.comentario || "Registro fotográfico y trazabilidad de actividades ejecutadas en sitio.")}
      </div>
    </div>
  `;

  const renderFotosFila = (parFotos, actIdx, startFotoIdx) => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:9px;align-items:start;">
      ${parFotos.map((ft, i) => renderFotoCard(ft, actIdx, startFotoIdx + i)).join("")}
      ${parFotos.length === 1 ? `<div style="border:1px dashed #d4d4d8;border-radius:8px;background:#fafafa;height:100%;min-height:185px;display:flex;align-items:center;justify-content:center;color:#71717a;font-size:8.5px;">(Espacio reservado)</div>` : ""}
    </div>
  `;

  const renderTablaRecomendaciones = () => `
    <div style="border:1px solid rgba(0,0,0,0.08);border-radius:8px;overflow:hidden;margin-bottom:10px;background:#fafafa;padding:8px 12px;">
      <div style="font-size:9px;font-weight:800;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">DICTAMEN TÉCNICO Y RECOMENDACIONES</div>
      <div style="font-size:9.5px;color:#27272a;line-height:1.48;text-align:justify;white-space:pre-line;">${escapeHtml(recomendaciones)}</div>
    </div>
  `;

  const renderBloqueFirma = () => `
    <table class="bloque-firma" style="width:100%;border-collapse:collapse;margin-top:10px;border-top:1px solid rgba(0,0,0,0.08);padding-top:8px;">
      <tr>
        <td style="width:50%;padding:8px 12px 0 0;vertical-align:top;border-right:1px solid rgba(0,0,0,0.08);">
          <div style="font-size:8px;font-weight:700;color:#71717a;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;">Por el Contratista Especialista:</div>
          <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:3px;">
            ${firmaImg ? `<img src="${firmaImg}" alt="Firma" style="max-height:42px;max-width:180px;object-fit:contain;"/>` : `<div style="font-family:'Segoe Script',cursive,sans-serif;font-size:14px;font-weight:700;color:#18181b;">Jhon Jaime Sepúlveda L.</div>`}
          </div>
          <div style="font-weight:800;font-size:10.5px;color:#18181b;letter-spacing:0.01em;">ING. JHON JAIME SEPÚLVEDA LONDOÑO</div>
          <div style="font-size:8.5px;color:#52525b;margin-top:1px;">Gerente General · MP. 05256-409949</div>
          <div style="font-size:8px;color:#71717a;margin-top:1px;">Ingeanclajes S.A.S · NIT. 900.193.965-4</div>
        </td>
        <td style="width:50%;padding:8px 0 0 12px;vertical-align:top;">
          <div style="font-size:8px;font-weight:700;color:#71717a;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;">Recibido por la Interventoría / Constructora:</div>
          <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:3px;font-size:8.5px;color:#a1a1aa;font-style:italic;">
            (Firma y sello de recepción a satisfacción)
          </div>
          <div style="font-weight:700;font-size:9.5px;color:#18181b;">NOMBRE: ____________________________________</div>
          <div style="font-size:8.5px;color:#52525b;margin-top:2px;">CARGO / FIRMA: ______________________________</div>
          <div style="font-size:8.5px;color:#52525b;margin-top:1px;">EMPRESA: ${escapeHtml(cliente || "Constructora / Contratante")}</div>
        </td>
      </tr>
    </table>
  `;

  // --- MOTOR DE EMPAQUETADO FLUIDO Y SEGURO DE PÁGINAS ---
  const paginas = [[]];
  let pIdx = 0;
  let alturaActual = 0;

  const nuevaPagina = () => {
    pIdx += 1;
    paginas[pIdx] = [renderHeaderSecundario()];
    alturaActual = ALTO_HEADER_SECUNDARIO;
  };

  // El mismo tope para todas las hojas: lo que ocupa el encabezado de cada
  // una ya va sumado en `alturaActual`, asi que no hay que volver a
  // descontarlo aqui.
  const getLimiteActual = () => MAX_ALTO_PAGINA;

  // 1. Portada Top
  paginas[0].push(renderHeaderPortada());
  paginas[0].push(renderDatosProyecto());
  paginas[0].push(renderPersonalEnObra());
  paginas[0].push(renderBannerActividades());
  alturaActual = ALTO_HEADER_PORTADA + calcularAltoDatos(Boolean(cotizacionRef)) + calcularAltoPersonal(personal) + ALTO_BANNER_ACTIVIDADES;

  // 2. Empaquetar Actividades y Fotos de forma armónica
  actividades.forEach((act, actIdx) => {
    const altoTabla = calcularAltoActividad(act);
    const fotos = (act.fotos || []).filter((ft) => ft.img || ft.url);

    // Si la actividad no cabe en la hoja actual, abrir una nueva hoja limpia
    if (alturaActual + altoTabla > getLimiteActual()) {
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

      let tituloPuesto = false;

      filas.forEach((fila, fIdx) => {
        const esPrimeraFila = fIdx === 0;
        const espacioRequerido = (esPrimeraFila && !tituloPuesto) ? (ALTO_BANNER_FOTOS + ALTO_FILA_FOTOS) : ALTO_FILA_FOTOS;

        if (alturaActual + espacioRequerido > getLimiteActual()) {
          nuevaPagina();
          tituloPuesto = false;
        }

        if (!tituloPuesto) {
          const textoTitulo = `3. Panel Técnico de Evidencias Fotográficas · ${act.titulo || "Actividad"}${fIdx > 0 ? " (Cont.)" : ""}`;
          paginas[pIdx].push(renderBannerFotos(textoTitulo));
          alturaActual += ALTO_BANNER_FOTOS;
          tituloPuesto = true;
        }

        paginas[pIdx].push(renderFotosFila(fila, actIdx, fIdx * 2));
        alturaActual += ALTO_FILA_FOTOS;
      });
    }
  });

  // 3. Empaquetar Recomendaciones y Firma: NUNCA dejar la firma sola/huérfana
  const altoRec = calcularAltoRecomendaciones(recomendaciones);
  const altoFirma = ALTO_FIRMA;

  if (recomendaciones) {
    const cabenAmbos = (alturaActual + altoRec + altoFirma <= getLimiteActual());

    // Si ambos no caben juntos en lo que queda de página, preferimos pasar
    // recomendaciones Y firma a una hoja nueva juntos, garantizando equilibrio estético
    if (!cabenAmbos) {
      nuevaPagina();
    }
    paginas[pIdx].push(renderTablaRecomendaciones());
    alturaActual += altoRec;
  }

  // Si no cabe la firma en la hoja actual
  if (alturaActual + altoFirma > getLimiteActual()) {
    nuevaPagina();
  }
  paginas[pIdx].push(renderBloqueFirma());
  alturaActual += altoFirma;

  // Total de hojas consolidadas
  const totalHojas = paginas.length;

  // Estructura idéntica a cotización (.page > .page-inner > .page-content + .page-footer)
  // con margin-top: auto en el pie, garantizando que el pie se pose suavemente al fondo
  // sin forzar jamás saltos prematuros de hoja ni hojas intermedias en blanco.
  const seccionesHtml = paginas.map((bloques, idx) => `
    <section class="page">
      <div class="page-inner">
        <div class="page-content">
          ${bloques.join("\n")}
        </div>
        <div class="page-footer">
          <span>Ingeanclajes S.A.S · Documento Técnico Oficial SGC · ${escapeHtml(docCodigo)} (V-${escapeHtml(docVersion)})</span>
          <span>Página ${idx + 1} de ${totalHojas}</span>
        </div>
      </div>
    </section>
  `).join("\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Informe ${escapeHtml(numDoc)} ${escapeHtml(proyecto)}</title>
    <style>
      ${cssHojaImpresion()}

      * { letter-spacing: normal; }
      html, body {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #18181b;
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }
      .page-inner {
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: column;
        min-height: 232mm;
        height: 100%;
        box-sizing: border-box;
      }
      .page-content {
        display: block;
        flex: 1 1 auto;
      }
      .page-footer {
        margin-top: auto;
        border-top: 1px solid #e4e4e7;
        padding-top: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 8.5px;
        color: #71717a;
      }
      @media print {
        #print-toolbar, #print-toolbar + div { display: none !important; }
      }
    </style>
  </head>
  <body>
    ${seccionesHtml}
  </body>
</html>`;
}
