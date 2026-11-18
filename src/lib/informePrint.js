// Generación del HTML imprimible de Informes de Actividades con diseño
// ejecutivo estilo macOS / Apple (jerarquía limpia, acentos cromáticos
// sobrios y tarjetas con bordes suaves).
// Empaquetado fluido por páginas con fidelidad 100%, sin desbordes y con
// auto-firma del coordinador de obra / SST cuando está configurado.

import { fmtL } from "./format";
import { escapeHtml, imagenDeFirmaSegura } from "./html";
import { normalizarMayusculas } from "./normalizarEntrada";
import { LOGO_INGEANCLAJES } from "../assets/embeddedImages";
import { getControlDocumental } from "./controlDocumental";
import { conActividadSeparada } from "./informeTextos";
import { cssHojaImpresion } from "./hojaImpresion";
import { FUENTE } from "../styles/designTokens";
import {
  claveCoordinador,
  esCargoCoordinador,
  extraerCoordinadorDeInforme,
  personalVisibleEnInforme,
} from "./firmasCoordinadores";

// Paleta ejecutiva estilo macOS / Apple en armonía con la marca Ingeanclajes:
// tintas limpias sobre papel blanco, tarjetas suaves y acentos de color con
// propósito semántico (marca, operación, conformidad SST y dictamen).
const TINTA = "#1d1d1f";
const GRIS = "#6e6e73";
const FONDO = "#f8fafc";
const LINEA = "#cbd5e1";
const LINEA_SUAVE = "#e2e8f0";

// Acentos de color estilo macOS
const MARCA = "#E0342A";
const MARCA_SOFT = "#FEF2F2";
const MARCA_BORDE = "#FECACA";
const MARCA_TEXTO = "#B91C1C";

const AZUL = "#0071E3";
const AZUL_SOFT = "#EFF6FF";
const AZUL_BORDE = "#BFDBFE";
const AZUL_TEXTO = "#1D4ED8";

const VERDE = "#059669";
const VERDE_SOFT = "#ECFDF5";
const VERDE_BORDE = "#A7F3D0";
const VERDE_TEXTO = "#047857";

const AMBAR = "#D97706";
const AMBAR_SOFT = "#FFFBEB";
const AMBAR_BORDE = "#FDE68A";
const AMBAR_TEXTO = "#B45309";

// Capacidad util de contenido por hoja, en pixeles de pantalla (96 ppp).
// Una hoja carta mide 1056px de alto. Con los margenes de @page -14mm arriba
// y 15mm abajo- el area util imprimible es de 946px. Quitando el pie de hoja
// (~26px) quedan ~920 para el contenido.
const MAX_ALTO_PAGINA = 915;

const ALTO_HEADER_PORTADA = 94;
const ALTO_HEADER_SECUNDARIO = 38;
const ALTO_BANNER_ACTIVIDADES = 26;
const ALTO_BANNER_FOTOS = 24;
const ALTO_FILA_FOTOS = 196;
const ALTO_FIRMA = 132;

function estimarLineas(texto, caracteresPorLinea = 82) {
  const str = String(texto || "").trim();
  if (!str) return 0;
  const parrafos = str.split(/\r?\n/).filter(Boolean);
  return parrafos.reduce((total, p) => total + Math.max(1, Math.ceil(p.length / caracteresPorLinea)), 0);
}

const calcularAltoDatos = (hasFilaExtra) => (hasFilaExtra ? 140 : 116);

const calcularAltoPersonal = (arr) => {
  if (!arr || arr.length === 0) return 40;
  const filas = Math.ceil(arr.length / 3);
  return 24 + filas * 40 + 10;
};

const CARACTERES_LINEA = 81;
const ALTO_LINEA = 15.5;

const calcularAltoActividad = (act) => {
  const lAct = estimarLineas(act.actividadesRealizadas, CARACTERES_LINEA);
  const lDesc = estimarLineas(act.descripcion, CARACTERES_LINEA);
  const lObs = estimarLineas(act.observaciones, CARACTERES_LINEA);
  const altoTextos = (lAct > 0 ? (16 + lAct * ALTO_LINEA + 4) : 0) +
                     (lDesc > 0 ? (16 + lDesc * ALTO_LINEA + 4) : 0);
  return 36 + (act.fecha ? 14 : 0) + altoTextos + (lObs > 0 ? 30 : 24) + 16;
};

const calcularAltoRecomendaciones = (rec) => {
  if (!rec) return 0;
  const lRec = estimarLineas(rec, CARACTERES_LINEA);
  return 24 + lRec * ALTO_LINEA + 18 + 10;
};

const MESES_CORTOS = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];

export function fmtPeriodo(inicio, fin) {
  const partes = (iso) => {
    const d = new Date(iso + "T12:00:00");
    return Number.isNaN(d.getTime()) ? null : { dia: d.getDate(), mes: d.getMonth(), anio: d.getFullYear() };
  };
  const a = inicio ? partes(inicio) : null;
  const b = fin ? partes(fin) : null;
  const corta = (p) => `${p.dia} ${MESES_CORTOS[p.mes]} ${p.anio}`;
  if (!a && !b) return "";
  if (!a || !b) return corta(a || b);
  if (a.anio !== b.anio) return `${corta(a)} – ${corta(b)}`;
  if (a.mes !== b.mes) return `${a.dia} ${MESES_CORTOS[a.mes]} – ${corta(b)}`;
  if (a.dia !== b.dia) return `${a.dia} – ${corta(b)}`;
  return corta(b);
}

/**
 * @param {object} [opciones.firmaCliente]  La firma de recibido del ACTA de
 *   entrega de esta obra, si ya esta firmada.
 */
export function buildInformePrintHtml(informe, { empresaConfig, firmaImg = "", firmaCliente = null } = {}) {
  const firmaClienteImg = imagenDeFirmaSegura(firmaCliente?.firmaImagen || firmaCliente?.firma_imagen || "");
  const nombreFirmante = firmaCliente?.firmanteNombre || firmaCliente?.firmante_nombre || "";
  const documentoFirmante = firmaCliente?.firmanteDocumento || firmaCliente?.firmante_documento || "";
  const cargoFirmante = firmaCliente?.firmanteCargo || firmaCliente?.firmante_cargo || "";
  const fechaFirmaIso = firmaCliente?.firmadoEn || firmaCliente?.firmado_en || "";
  const fechaFirmaTexto = fechaFirmaIso ? fmtL(fechaFirmaIso) : "";

  const coordinador = extraerCoordinadorDeInforme(informe, { empresaConfig });
  const firmaCoordImg = imagenDeFirmaSegura(coordinador?.firmaImg || "");
  const claveCoord = coordinador?.nombre ? claveCoordinador(coordinador.nombre) : "";

  const control = getControlDocumental(empresaConfig)?.informe;
  const docCodigo = control?.codigo || "FO-ACT-04";
  const docVersion = control?.version || "03";

  const proyecto = normalizarMayusculas(informe?.proyecto || "");
  const localizacion = normalizarMayusculas(informe?.localizacion || "");
  const cliente = normalizarMayusculas(informe?.cliente || informe?.contratante || informe?.empresa || "");
  const fechaInforme = fmtL(informe?.fechaInforme);
  const periodo = fmtPeriodo(informe?.periodoInicio, informe?.periodoFin);
  const personal = personalVisibleEnInforme(informe?.personal);
  const cotizacionRef = informe?.cotizacionNumero || informe?.cotizacionRef || informe?.cotizacionId || "";

  const rawActividades = Array.isArray(informe?.actividades) && informe.actividades.length
    ? informe.actividades
    : [{ titulo: informe?.actividad, descripcion: informe?.descripcion, observaciones: informe?.observaciones, fotos: informe?.fotos || [] }];
  const actividades = rawActividades.map(conActividadSeparada);
  const recomendaciones = String(informe?.recomendaciones || "").trim();

  const numDoc = informe?.id ? String(informe.id).trim() : (informe?.numero ? String(informe.numero).trim() : "");

  // --- RENDERIZADORES DE FRAGMENTOS VISUALES ESTILO MAC ---

  const celdaControl = (etiqueta, valor, { ultima = false, destacado = false } = {}) => `
    <tr>
      <td style="padding:4.5px 9px;font-size:8.5px;font-weight:700;color:${GRIS};text-transform:uppercase;letter-spacing:0.05em;${ultima ? "" : `border-bottom:1px solid ${LINEA_SUAVE};`}">${etiqueta}</td>
      <td style="padding:4.5px 9px;font-size:9.5px;font-weight:700;color:${destacado ? MARCA_TEXTO : TINTA};text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;${ultima ? "" : `border-bottom:1px solid ${LINEA_SUAVE};`}">
        ${destacado ? `<span style="background:${MARCA_SOFT};color:${MARCA_TEXTO};border:1px solid ${MARCA_BORDE};padding:1.5px 6px;border-radius:999px;font-size:9px;font-weight:800;">${valor}</span>` : valor}
      </td>
    </tr>`;

  const renderHeaderPortada = () => `
    <div style="border:1px solid ${LINEA_SUAVE};border-radius:12px;overflow:hidden;margin-bottom:10px;background:#ffffff;">
      <div style="height:3.5px;background:linear-gradient(90deg, ${MARCA} 0%, #F97316 48%, ${AZUL} 100%);"></div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <tr>
          <td style="width:27%;padding:9px 12px;border-right:1px solid ${LINEA_SUAVE};vertical-align:middle;text-align:center;background:#ffffff;">
            ${LOGO_INGEANCLAJES ? `<img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" style="height:44px;max-width:100%;object-fit:contain;display:inline-block;"/>` : `<div style="font-size:17px;font-weight:800;color:${TINTA};letter-spacing:-0.03em;"><span style="color:${MARCA};">INGE</span>ANCLAJES</div>`}
          </td>
          <td style="padding:9px 12px;vertical-align:middle;text-align:center;background:#ffffff;">
            <span style="display:inline-block;background:${MARCA_SOFT};color:${MARCA_TEXTO};border:1px solid ${MARCA_BORDE};font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:2px 8px;border-radius:999px;">Sistema de gestión de calidad</span>
            <div style="font-size:14px;font-weight:800;color:${TINTA};letter-spacing:-0.01em;text-transform:uppercase;margin-top:4px;line-height:1.2;">Informe técnico de actividades en obra</div>
            <div style="font-size:8.5px;color:${GRIS};margin-top:3px;">Ingeanclajes S.A.S. · NIT 900.193.965-4 · PBX (604) 448 26 86</div>
          </td>
          <td style="width:25%;padding:0;border-left:1px solid ${LINEA_SUAVE};vertical-align:middle;background:${FONDO};">
            <table style="width:100%;border-collapse:collapse;">
              ${celdaControl("Código", escapeHtml(docCodigo))}
              ${celdaControl("Versión", escapeHtml(docVersion))}
              ${celdaControl("Consecutivo", escapeHtml(numDoc || "INF-OFICIAL"), { ultima: true, destacado: true })}
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const renderHeaderSecundario = () => `
    <div style="height:2.5px;background:linear-gradient(90deg, ${MARCA} 0%, #F97316 50%, ${AZUL} 100%);border-radius:2px;margin-bottom:7px;"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${LINEA_SUAVE};padding-bottom:5px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;font-weight:800;color:${TINTA};letter-spacing:-0.02em;"><span style="color:${MARCA};">INGE</span>ANCLAJES</span>
        <span style="color:${LINEA};font-size:11px;">·</span>
        <span style="font-size:9px;font-weight:700;color:${GRIS};text-transform:uppercase;letter-spacing:0.04em;">Informe de Actividades · ${escapeHtml(proyecto)}</span>
      </div>
      <span style="background:${AZUL_SOFT};color:${AZUL_TEXTO};border:1px solid ${AZUL_BORDE};padding:1.5px 7px;border-radius:999px;font-size:9px;font-variant-numeric:tabular-nums;font-weight:700;">${escapeHtml(numDoc)}</span>
    </div>
  `;

  const hasFilaExtra = Boolean(cotizacionRef || coordinador?.nombre);

  const renderDatosProyecto = () => `
    <div style="border:1px solid ${LINEA_SUAVE};border-left:3.5px solid ${AZUL};border-radius:10px;padding:8px 12px;margin-bottom:10px;background:${FONDO};">
      <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
        <tr>
          <td style="width:17%;font-weight:700;color:${AZUL_TEXTO};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;font-size:8.5px;">PROYECTO:</td>
          <td style="width:39%;font-weight:700;color:${TINTA};font-size:10.5px;padding:3.5px 6px;">${escapeHtml(proyecto || "OBRA GENERAL")}</td>
          <td style="width:17%;font-weight:700;color:${AZUL_TEXTO};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid ${LINEA_SUAVE};font-size:8.5px;">PERÍODO:</td>
          <td style="width:27%;color:${TINTA};font-weight:600;font-size:9.5px;padding:3.5px 6px;">${escapeHtml(periodo)}</td>
        </tr>
        <tr>
          <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};font-size:8.5px;">CONTRATANTE:</td>
          <td style="color:${TINTA};font-weight:600;font-size:10px;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">${escapeHtml(cliente || "A QUIEN INTERESE")}</td>
          <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid ${LINEA_SUAVE};border-top:1px solid ${LINEA_SUAVE};font-size:8.5px;">FECHA EMISIÓN:</td>
          <td style="color:${TINTA};font-weight:600;font-size:9.5px;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">${escapeHtml(fechaInforme)}</td>
        </tr>
        <tr>
          <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};font-size:8.5px;">LOCALIZACIÓN:</td>
          <td style="color:${TINTA};font-weight:600;font-size:9.5px;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">${escapeHtml(localizacion || "MEDELLÍN")}</td>
          <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid ${LINEA_SUAVE};border-top:1px solid ${LINEA_SUAVE};font-size:8.5px;">NORMATIVA:</td>
          <td style="padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">
            <span style="background:${AZUL_SOFT};color:${AZUL_TEXTO};border:1px solid ${AZUL_BORDE};font-size:8.5px;font-weight:700;padding:1.5px 7px;border-radius:999px;display:inline-block;letter-spacing:0.02em;">Res. 4272/2021 · OSHA 1926</span>
          </td>
        </tr>
        ${hasFilaExtra ? `
        <tr>
          ${cotizacionRef ? `
            <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};font-size:8.5px;">REF. COTIZACIÓN:</td>
            <td ${coordinador?.nombre ? "" : 'colspan="3"'} style="color:${TINTA};font-weight:700;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};font-variant-numeric:tabular-nums;">
              <span style="background:#ffffff;color:${TINTA};padding:1.5px 7px;border-radius:999px;border:1px solid ${LINEA};font-size:8.5px;">📄 ${escapeHtml(cotizacionRef)}</span>
            </td>
          ` : ""}
          ${coordinador?.nombre ? `
            <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;${cotizacionRef ? `border-left:1px solid ${LINEA_SUAVE};` : ""}border-top:1px solid ${LINEA_SUAVE};font-size:8.5px;">COORD. OBRA / SST:</td>
            <td ${cotizacionRef ? "" : 'colspan="3"'} style="padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">
              <span style="background:${VERDE_SOFT};color:${VERDE_TEXTO};border:1px solid ${VERDE_BORDE};font-size:8.5px;font-weight:700;padding:1.5px 7px;border-radius:999px;display:inline-block;">${escapeHtml(coordinador.nombre)}</span>
            </td>
          ` : ""}
        </tr>
        ` : ""}
      </table>
    </div>
  `;

  const renderPersonalEnObra = () => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:18px;height:18px;border-radius:6px;background:${AZUL};color:#ffffff;font-size:9px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;">1</span>
        <span style="font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:${TINTA};">Personal Técnico Asignado en Sitio</span>
      </div>
      <span style="font-size:8.5px;font-weight:600;color:${AZUL_TEXTO};background:${AZUL_SOFT};padding:1.5px 7px;border-radius:999px;">Personal certificado en alturas</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(${Math.min(3, Math.max(1, personal.length))}, 1fr);gap:7px;margin-bottom:10px;">
      ${personal.length > 0 ? personal.map((p, idx) => {
        const esCoordCard = Boolean(
          p.esCoordinadorInforme ||
          esCargoCoordinador(p.cargo) ||
          (claveCoord && claveCoordinador(p.nombre) === claveCoord)
        );
        return `
        <div style="border:1px solid ${esCoordCard ? AZUL_BORDE : LINEA_SUAVE};border-radius:8px;padding:5.5px 8px;background:${esCoordCard ? AZUL_SOFT : "#ffffff"};display:flex;align-items:center;gap:7px;">
          <div style="width:21px;height:21px;background:${esCoordCard ? AZUL : FONDO};border-radius:6px;color:${esCoordCard ? "#ffffff" : AZUL_TEXTO};border:1px solid ${esCoordCard ? AZUL : LINEA_SUAVE};font-variant-numeric:tabular-nums;font-size:8.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${String(idx + 1).padStart(2, "0")}
          </div>
          <div style="min-width:0;flex:1;">
            <div style="font-size:8px;font-weight:700;color:${esCoordCard ? AZUL_TEXTO : GRIS};text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(String(p.cargo || "TÉCNICO ESPECIALISTA").toUpperCase())}</div>
            <div style="font-size:9.5px;font-weight:700;color:${TINTA};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.nombre || "Sin nombre")}</div>
          </div>
        </div>
      `;
      }).join("") : `
        <div style="border:1px dashed ${LINEA};border-radius:8px;padding:6px 9px;color:${GRIS};font-size:9px;font-style:italic;background:${FONDO};">Personal asignado conforme a programación de cuadrilla en obra.</div>
      `}
    </div>
  `;

  const renderBannerActividades = () => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;padding-top:2px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:18px;height:18px;border-radius:6px;background:${MARCA};color:#ffffff;font-size:9px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;">2</span>
        <span style="font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:${TINTA};">Metodología y Registro de Actividades Ejecutadas</span>
      </div>
      <span style="font-size:8.5px;font-weight:600;color:${GRIS};">Control y Trazabilidad Operativa</span>
    </div>
  `;

  const renderTablaActividad = (act, idx) => `
    <div style="border:1px solid ${LINEA_SUAVE};border-left:3.5px solid ${AZUL};border-radius:10px;background:#ffffff;padding:9px 12px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${LINEA_SUAVE};padding-bottom:6px;margin-bottom:7px;">
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="background:${AZUL};color:#ffffff;font-variant-numeric:tabular-nums;font-size:8.5px;font-weight:800;padding:2px 7px;border-radius:6px;letter-spacing:0.02em;">
            ACT-${String(idx + 1).padStart(2, "0")}
          </span>
          <span style="font-size:11px;font-weight:700;color:${TINTA};">
            ${escapeHtml(act.titulo || "Actividad Ejecutada")}
          </span>
        </div>
        ${act.fecha ? `
          <span style="font-size:8.5px;color:${GRIS};background:${FONDO};border:1px solid ${LINEA_SUAVE};padding:1.5px 7px;border-radius:999px;font-variant-numeric:tabular-nums;font-weight:600;">
            ${escapeHtml(fmtL(act.fecha))}
          </span>
        ` : ""}
      </div>

      <div style="font-size:10.5px;color:${TINTA};line-height:1.48;text-align:justify;">
        ${(act.actividadesRealizadas || "").trim() ? `
          <div style="margin-bottom:5px;">
            <strong style="color:${AZUL_TEXTO};text-transform:uppercase;font-size:8.5px;letter-spacing:0.05em;display:block;margin-bottom:1.5px;">Actividades Realizadas:</strong>
            ${escapeHtml(act.actividadesRealizadas)}
          </div>
        ` : ""}
        ${(act.descripcion || "").trim() ? `
          <div style="margin-bottom:4px;">
            <strong style="color:${AZUL_TEXTO};text-transform:uppercase;font-size:8.5px;letter-spacing:0.05em;display:block;margin-bottom:1.5px;">Descripción Técnica:</strong>
            ${escapeHtml(act.descripcion)}
          </div>
        ` : ""}
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:6px;border-top:1px solid ${LINEA_SUAVE};">
        <tr>
          <td style="padding:5.5px 10px 0 0;font-size:9px;color:${TINTA};vertical-align:top;line-height:1.45;">
            <strong style="color:${VERDE};">✓ Conforme:</strong> ${(act.observaciones || "").trim() ? escapeHtml(act.observaciones) : "Ejecutado a conformidad sin novedades reportadas."}
          </td>
          <td style="padding:5.5px 0 0;width:1%;white-space:nowrap;vertical-align:top;text-align:right;">
            <span style="display:inline-block;background:${VERDE_SOFT};border:1px solid ${VERDE_BORDE};border-radius:999px;padding:2px 8px;font-size:8px;font-weight:800;color:${VERDE_TEXTO};letter-spacing:0.03em;">
              ESTADO: CONCLUIDO · 100%
            </span>
          </td>
        </tr>
      </table>
    </div>
  `;

  const renderBannerFotos = (act, actIdx, continuacion, { oculto = false } = {}) => `
    <div${continuacion ? ' data-banner-cont="1"' : ""} style="display:${oculto ? "none" : "flex"};align-items:center;gap:7px;margin:-2px 0 6px;">
      <span style="font-size:8.5px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:${AZUL_TEXTO};background:${AZUL_SOFT};border:1px solid ${AZUL_BORDE};padding:1.5px 8px;border-radius:999px;">
        Evidencias fotográficas · ACT-${String(actIdx + 1).padStart(2, "0")}${continuacion ? " (cont.)" : ""}
      </span>
      <span style="flex:1;height:1px;background:${LINEA_SUAVE};"></span>
    </div>
  `;

  const renderFotoCard = (ft, actIdx, fotoIdx) => {
    const comentario = String(ft.comentario || "").trim();
    return `
    <div class="foto-card" style="border:1px solid ${LINEA_SUAVE};border-radius:10px;overflow:hidden;background:#ffffff;display:flex;flex-direction:column;">
      <div style="height:155px;display:flex;align-items:center;justify-content:center;background:${FONDO};border-bottom:1px solid ${LINEA_SUAVE};overflow:hidden;position:relative;">
        <img src="${ft.img || ft.url}" alt="Evidencia ${fotoIdx + 1}" style="width:100%;height:100%;object-fit:contain;object-position:center;display:block;background:${FONDO};"/>
        ${comentario ? `<span style="position:absolute;top:6px;left:6px;background:rgba(15,23,42,0.82);color:#ffffff;font-size:8.5px;font-variant-numeric:tabular-nums;font-weight:700;padding:2px 7px;border-radius:999px;letter-spacing:0.03em;">
          EVIDENCIA ${actIdx + 1}.${fotoIdx + 1}
        </span>` : ""}
      </div>
      ${comentario ? `<div style="padding:5.5px 9px;font-size:9px;color:${TINTA};line-height:1.38;background:#ffffff;">
        ${escapeHtml(ft.comentario)}
      </div>` : ""}
    </div>
  `;
  };

  const renderFotosFila = (parFotos, actIdx, startFotoIdx) => `
    <div style="display:grid;grid-template-columns:${parFotos.length === 1 ? "calc(50% - 4.5px)" : "1fr 1fr"};justify-content:center;gap:9px;margin-bottom:9px;align-items:start;">
      ${parFotos.map((ft, i) => renderFotoCard(ft, actIdx, startFotoIdx + i)).join("")}
    </div>
  `;

  const renderTablaRecomendaciones = () => `
    <div style="border:1px solid ${AMBAR_BORDE};border-left:3.5px solid ${AMBAR};border-radius:10px;overflow:hidden;margin-bottom:10px;background:${AMBAR_SOFT};padding:9px 12px;">
      <div style="font-size:8.5px;font-weight:800;color:${AMBAR_TEXTO};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">DICTAMEN TÉCNICO Y RECOMENDACIONES</div>
      <div style="font-size:10px;color:${TINTA};line-height:1.48;text-align:justify;white-space:pre-line;">${escapeHtml(recomendaciones)}</div>
    </div>
  `;

  const renderBloqueFirma = () => {
    const conCoord = Boolean(coordinador?.nombre);
    const anchoCol = conCoord ? "33.33%" : "50%";
    const rayaNombre = conCoord ? "_______________________" : "____________________________________";
    const rayaDoc = conCoord ? "____________________" : "______________________________";
    const rayaCargo = conCoord ? "__________________" : "____________________________";

    const cardContratista = `
      <td style="width:${anchoCol};padding:0 ${conCoord ? "5px" : "6px"} 0 0;vertical-align:stretch;">
        <div style="border:1px solid ${LINEA_SUAVE};border-top:2.5px solid ${MARCA};border-radius:10px;padding:8px 10px;background:#ffffff;height:100%;box-sizing:border-box;">
          <div style="font-size:8px;font-weight:800;color:${MARCA_TEXTO};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px;">Por el Contratista Especialista</div>
          <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:4px;border-bottom:1px solid ${LINEA_SUAVE};padding-bottom:3px;">
            ${firmaImg ? `<img src="${firmaImg}" alt="Firma" style="max-height:40px;max-width:165px;object-fit:contain;"/>` : `<div style="font-family:'Segoe Script',cursive,sans-serif;font-size:13.5px;font-weight:700;color:${TINTA};">Jhon Jaime Sepúlveda L.</div>`}
          </div>
          <div style="font-weight:800;font-size:9.5px;color:${TINTA};letter-spacing:0.01em;line-height:1.25;">ING. JHON JAIME SEPÚLVEDA LONDOÑO</div>
          <div style="font-size:8.5px;color:${GRIS};margin-top:2px;">Gerente General · MP. 05256-409949</div>
          <div style="font-size:8.5px;color:${GRIS};margin-top:1px;">Ingeanclajes S.A.S. · NIT. 900.193.965-4</div>
        </div>
      </td>`;

    const cardCoordinador = conCoord ? `
      <td style="width:${anchoCol};padding:0 5px;vertical-align:stretch;">
        <div style="border:1px solid ${AZUL_BORDE};border-top:2.5px solid ${AZUL};border-radius:10px;padding:8px 10px;background:${AZUL_SOFT};height:100%;box-sizing:border-box;">
          <div style="font-size:8px;font-weight:800;color:${AZUL_TEXTO};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px;">Coordinador de Obra / SST</div>
          <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:4px;border-bottom:1px solid ${AZUL_BORDE};padding-bottom:3px;font-size:8.5px;color:${GRIS};font-style:italic;">
            ${firmaCoordImg
              ? `<img src="${firmaCoordImg}" alt="Firma del coordinador" style="max-height:40px;max-width:165px;object-fit:contain;display:inline-block;font-style:normal;"/>`
              : "(Firma del coordinador de obra / SST)"}
          </div>
          <div style="font-weight:800;font-size:9.5px;color:${TINTA};line-height:1.25;text-transform:uppercase;">${escapeHtml(coordinador.nombre)}</div>
          ${coordinador.cedula ? `<div style="font-size:8.5px;color:${TINTA};margin-top:2px;font-variant-numeric:tabular-nums;">C.C.: ${escapeHtml(coordinador.cedula)}</div>` : ""}
          <div style="font-size:8.5px;color:${AZUL_TEXTO};font-weight:600;margin-top:1.5px;">${escapeHtml(coordinador.cargo || "COORDINADOR SST")}</div>
          <div style="font-size:8px;color:${GRIS};margin-top:1px;">Encargado del personal · Ingeanclajes S.A.S.</div>
        </div>
      </td>` : "";

    const cardCliente = `
      <td style="width:${anchoCol};padding:0 0 0 ${conCoord ? "5px" : "6px"};vertical-align:stretch;">
        <div style="border:1px solid ${firmaClienteImg ? VERDE_BORDE : LINEA_SUAVE};border-top:2.5px solid ${firmaClienteImg ? VERDE : "#64748B"};border-radius:10px;padding:8px 10px;background:${firmaClienteImg ? VERDE_SOFT : "#ffffff"};height:100%;box-sizing:border-box;">
          <div style="font-size:8px;font-weight:800;color:${firmaClienteImg ? VERDE_TEXTO : GRIS};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px;">Recibido Interventoría / Constructora</div>
          <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:4px;border-bottom:1px solid ${firmaClienteImg ? VERDE_BORDE : LINEA_SUAVE};padding-bottom:3px;font-size:8.5px;color:${GRIS};font-style:italic;">
            ${firmaClienteImg
              ? `<img src="${firmaClienteImg}" alt="Firma del cliente" style="max-height:40px;max-width:165px;object-fit:contain;display:inline-block;font-style:normal;"/>`
              : "(Firma y sello de recepción a satisfacción)"}
          </div>
          <div style="font-weight:700;font-size:8.5px;color:${TINTA};">NOMBRE: ${nombreFirmante ? escapeHtml(nombreFirmante) : rayaNombre}</div>
          <div style="font-size:8.5px;color:${GRIS};margin-top:2px;">C.C.: ${documentoFirmante ? escapeHtml(documentoFirmante) : rayaDoc}</div>
          <div style="font-size:8.5px;color:${GRIS};margin-top:2px;">CARGO: ${cargoFirmante ? escapeHtml(cargoFirmante) : rayaCargo}</div>
          <div style="font-size:8.5px;color:${GRIS};margin-top:1.5px;">EMPRESA: ${escapeHtml(cliente || "Constructora / Contratante")}</div>${fechaFirmaTexto ? `
          <div style="font-size:7.5px;color:${VERDE_TEXTO};font-weight:600;margin-top:3px;">Firmado electrónicamente · ${escapeHtml(fechaFirmaTexto)}</div>` : ""}
        </div>
      </td>`;

    return `
      <table class="bloque-firma" style="width:100%;border-collapse:collapse;margin-top:10px;table-layout:fixed;">
        <tr>
          ${cardContratista}
          ${cardCoordinador}
          ${cardCliente}
        </tr>
      </table>
    `;
  };

  // --- MOTOR DE EMPAQUETADO FLUIDO Y SEGURO DE PÁGINAS ---
  const paginas = [[]];
  let pIdx = 0;
  let alturaActual = 0;

  const marcar = (html, rol) => `<div data-rol="${rol}">${html}</div>`;

  const nuevaPagina = () => {
    pIdx += 1;
    paginas[pIdx] = [marcar(renderHeaderSecundario(), "encabezado")];
    alturaActual = ALTO_HEADER_SECUNDARIO;
  };

  const getLimiteActual = () => MAX_ALTO_PAGINA;

  // 1. Portada Top
  paginas[0].push(marcar(
    renderHeaderPortada() + renderDatosProyecto() + renderPersonalEnObra() + renderBannerActividades(),
    "fijo"
  ));
  alturaActual = ALTO_HEADER_PORTADA + calcularAltoDatos(hasFilaExtra) + calcularAltoPersonal(personal) + ALTO_BANNER_ACTIVIDADES;

  // 2. Empaquetar Actividades y Fotos de forma armónica sin dejar huecos en blanco
  actividades.forEach((act, actIdx) => {
    const fotos = (act.fotos || []).filter((ft) => ft.img || ft.url);
    const filas = [];
    for (let i = 0; i < fotos.length; i += 2) {
      filas.push(fotos.slice(i, i + 2));
    }

    // La tabla de la actividad se evalua por separado de las fotos: asi nunca
    // queda media pagina 1 en blanco cuando la actividad cabe perfectamente y
    // solo las fotos necesitan empezar en la pagina 2.
    const altoAct = calcularAltoActividad(act);
    if (alturaActual + altoAct > getLimiteActual()) {
      nuevaPagina();
    }
    paginas[pIdx].push(marcar(renderTablaActividad(act, actIdx), "contenido"));
    alturaActual += altoAct;

    if (filas.length > 0) {
      // El rotulo inicial de evidencias SIEMPRE viaja junto a su primera fila
      // de fotos para que nunca quede huerfano al final de una hoja.
      const altoPrimeraFila = ALTO_BANNER_FOTOS + ALTO_FILA_FOTOS;
      if (alturaActual + altoPrimeraFila > getLimiteActual()) {
        nuevaPagina();
      }
      paginas[pIdx].push(marcar(
        renderBannerFotos(act, actIdx, false) + renderFotosFila(filas[0], actIdx, 0),
        "contenido"
      ));
      alturaActual += altoPrimeraFila;

      // Filas restantes: cada una lleva embebido su rotulo "(cont.)" marcado
      // con data-banner-cont="1". repaginarHojas lo muestra solo si esa fila
      // cae al inicio de una pagina nueva y lo oculta si sigue en la misma.
      filas.slice(1).forEach((fila, i) => {
        const fIdx = i + 1;
        let inicioDeHoja = false;
        if (alturaActual + ALTO_FILA_FOTOS > getLimiteActual()) {
          nuevaPagina();
          inicioDeHoja = true;
        }
        paginas[pIdx].push(marcar(
          renderBannerFotos(act, actIdx, true, { oculto: !inicioDeHoja }) +
            renderFotosFila(fila, actIdx, fIdx * 2),
          "contenido"
        ));
        alturaActual += ALTO_FILA_FOTOS + (inicioDeHoja ? ALTO_BANNER_FOTOS : 0);
      });
    }
  });

  // 3. Empaquetar Recomendaciones y Firma: NUNCA dejar la firma sola/huérfana
  const altoRec = calcularAltoRecomendaciones(recomendaciones);
  const altoFirma = ALTO_FIRMA;

  if (recomendaciones) {
    const cabenAmbos = (alturaActual + altoRec + altoFirma <= getLimiteActual());
    if (!cabenAmbos) {
      nuevaPagina();
    }
    paginas[pIdx].push(marcar(renderTablaRecomendaciones(), "contenido"));
    alturaActual += altoRec;
  }

  if (alturaActual + altoFirma > getLimiteActual()) {
    nuevaPagina();
  }
  paginas[pIdx].push(marcar(renderBloqueFirma(), "contenido"));
  alturaActual += altoFirma;

  const totalHojas = paginas.length;

  const seccionesHtml = paginas.map((bloques, idx) => `
    <section class="page">
      <div class="page-inner">
        <div class="page-content">
          ${bloques.join("\n")}
        </div>
        <div class="page-footer">
          <span><strong style="color:${TINTA};">Ingeanclajes S.A.S.</strong> · Documento Técnico Oficial SGC · ${escapeHtml(docCodigo)} (V-${escapeHtml(docVersion)})</span>
          <span data-rol="numeracion" style="font-weight:700;color:${AZUL_TEXTO};">Página ${idx + 1} de ${totalHojas}</span>
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
        font-family: ${FUENTE};
        color: ${TINTA};
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
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
        border-top: 1px solid ${LINEA_SUAVE};
        padding-top: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 8.5px;
        color: ${GRIS};
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
