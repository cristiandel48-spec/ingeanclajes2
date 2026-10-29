// Generación del HTML imprimible de Informes de Actividades organizado
// con el nuevo Formato Técnico Industrial Ejecutivo IngeAnclajes.
// Empaquetado fluido por páginas con fidelidad 100%, sin desbordes y con paginación exacta.

import { fmtL } from "./format";
import { escapeHtml, imagenDeFirmaSegura } from "./html";
import { normalizarMayusculas } from "./normalizarEntrada";
import { LOGO_INGEANCLAJES } from "../assets/embeddedImages";
import { getControlDocumental } from "./controlDocumental";
import { conActividadSeparada } from "./informeTextos";
import { cssHojaImpresion } from "./hojaImpresion";
import { FUENTE } from "../styles/designTokens";

// Los mismos tonos de la cotizacion: casi negro y gris para el texto, y los
// grises de Apple para sombreados y lineas. Solo cambian la letra y los
// colores; la forma del informe es la de siempre.
const TINTA = "#1d1d1f";
const GRIS = "#6e6e73";
const FONDO = "#f5f5f7";
const LINEA = "#d2d2d7";
const LINEA_SUAVE = "#e8e8ed";

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

// Texto de las actividades y del dictamen a 10,5px (unos 8pt impresos):
// ~81 caracteres y 15,5px por linea.
const CARACTERES_LINEA = 81;
const ALTO_LINEA = 15.5;

const calcularAltoActividad = (act) => {
  const lAct = estimarLineas(act.actividadesRealizadas, CARACTERES_LINEA);
  const lDesc = estimarLineas(act.descripcion, CARACTERES_LINEA);
  const lObs = estimarLineas(act.observaciones, CARACTERES_LINEA);
  const altoTextos = (lAct > 0 ? (16 + lAct * ALTO_LINEA + 4) : 0) +
                     (lDesc > 0 ? (16 + lDesc * ALTO_LINEA + 4) : 0);
  return 34 + (act.fecha ? 14 : 0) + altoTextos + (lObs > 0 ? 28 : 22) + 16;
};

const calcularAltoRecomendaciones = (rec) => {
  if (!rec) return 0;
  const lRec = estimarLineas(rec, CARACTERES_LINEA);
  return 22 + lRec * ALTO_LINEA + 16 + 10;
};

// «13 – 17 oct. 2026» en vez de «13 de octubre de 2026 al 17 de octubre de
// 2026», que no cabia en su casilla y se partia en dos lineas. Solo repite
// el mes o el año cuando cambian.
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
 *   entrega de esta obra, si ya esta firmada. El cliente que recibe la obra es
 *   el mismo que recibe el informe, asi que su firma se plasma tambien aqui y
 *   la casilla deja de salir en blanco para completarla a mano.
 */
export function buildInformePrintHtml(informe, { empresaConfig, firmaImg = "", firmaCliente = null } = {}) {
  const firmaClienteImg = imagenDeFirmaSegura(firmaCliente?.firmaImagen || firmaCliente?.firma_imagen || "");
  const nombreFirmante = firmaCliente?.firmanteNombre || firmaCliente?.firmante_nombre || "";
  const documentoFirmante = firmaCliente?.firmanteDocumento || firmaCliente?.firmante_documento || "";
  const cargoFirmante = firmaCliente?.firmanteCargo || firmaCliente?.firmante_cargo || "";
  const fechaFirmaIso = firmaCliente?.firmadoEn || firmaCliente?.firmado_en || "";
  const fechaFirmaTexto = fechaFirmaIso ? fmtL(fechaFirmaIso) : "";

  const control = getControlDocumental(empresaConfig)?.informe;
  const docCodigo = control?.codigo || "FO-ACT-04";
  const docVersion = control?.version || "03";

  const proyecto = normalizarMayusculas(informe?.proyecto || "");
  const localizacion = normalizarMayusculas(informe?.localizacion || "");
  const cliente = normalizarMayusculas(informe?.cliente || informe?.contratante || informe?.empresa || "");
  const fechaInforme = fmtL(informe?.fechaInforme);
  const periodo = fmtPeriodo(informe?.periodoInicio, informe?.periodoFin);
  const personal = Array.isArray(informe?.personal) ? informe.personal : [];
  const cotizacionRef = informe?.cotizacionNumero || informe?.cotizacionRef || informe?.cotizacionId || "";
  
  const rawActividades = Array.isArray(informe?.actividades) && informe.actividades.length
    ? informe.actividades
    : [{ titulo: informe?.actividad, descripcion: informe?.descripcion, observaciones: informe?.observaciones, fotos: informe?.fotos || [] }];
  const actividades = rawActividades.map(conActividadSeparada);
  const recomendaciones = String(informe?.recomendaciones || "").trim();

  const numDoc = informe?.id ? String(informe.id).trim() : (informe?.numero ? String(informe.numero).trim() : "");

  // --- RENDERIZADORES DE FRAGMENTOS VISUALES ---

  // Encabezado de formato controlado: tres casillas de igual alto -logo,
  // titulo y datos de control- en vez de dos bloques flotando a cada lado.
  // Antes el nombre de la empresa salia dos veces (en el logo y en texto), y
  // el lema y el titulo no cabian y se partian en dos lineas, asi que los dos
  // lados quedaban de alturas distintas y el encabezado se veia descuadrado.
  const celdaControl = (etiqueta, valor, ultima = false) => `
    <tr>
      <td style="padding:4px 9px;font-size:9px;font-weight:600;color:${GRIS};text-transform:uppercase;letter-spacing:0.04em;${ultima ? "" : `border-bottom:1px solid ${LINEA_SUAVE};`}">${etiqueta}</td>
      <td style="padding:4px 9px;font-size:10px;font-weight:700;color:${TINTA};text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;${ultima ? "" : `border-bottom:1px solid ${LINEA_SUAVE};`}">${valor}</td>
    </tr>`;

  const renderHeaderPortada = () => `
    <table style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid ${LINEA};border-radius:8px;margin-bottom:10px;table-layout:fixed;">
      <tr>
        <td style="width:27%;padding:8px 12px;border-right:1px solid ${LINEA};vertical-align:middle;text-align:center;">
          ${LOGO_INGEANCLAJES ? `<img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" style="height:44px;max-width:100%;object-fit:contain;display:inline-block;"/>` : `<div style="font-size:17px;font-weight:800;color:${TINTA};letter-spacing:-0.03em;">INGEANCLAJES</div>`}
        </td>
        <td style="padding:8px 12px;vertical-align:middle;text-align:center;">
          <div style="font-size:9px;font-weight:600;color:${GRIS};text-transform:uppercase;letter-spacing:0.08em;">Sistema de gestión de calidad</div>
          <div style="font-size:14px;font-weight:800;color:${TINTA};letter-spacing:0.01em;text-transform:uppercase;margin-top:3px;line-height:1.25;">Informe técnico de actividades en obra</div>
          <div style="font-size:9px;color:${GRIS};margin-top:4px;">Ingeanclajes S.A.S. · NIT 900.193.965-4 · PBX (604) 448 26 86</div>
        </td>
        <td style="width:24%;padding:0;border-left:1px solid ${LINEA};vertical-align:middle;">
          <table style="width:100%;border-collapse:collapse;">
            ${celdaControl("Código", escapeHtml(docCodigo))}
            ${celdaControl("Versión", escapeHtml(docVersion))}
            ${celdaControl("Consecutivo", escapeHtml(numDoc || "INF-OFICIAL"), true)}
          </table>
        </td>
      </tr>
    </table>
  `;

  const renderHeaderSecundario = () => `
    <div style="height:2px;background:${TINTA};border-radius:1px;margin-bottom:7px;"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${LINEA_SUAVE};padding-bottom:5px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;font-weight:800;color:${TINTA};">INGE<span style="color:${TINTA};">ANCLAJES</span></span>
        <span style="color:${LINEA};font-size:11px;">·</span>
        <span style="font-size:9.5px;font-weight:700;color:${GRIS};text-transform:uppercase;letter-spacing:0.04em;">Informe de Actividades · ${escapeHtml(proyecto)}</span>
      </div>
      <div style="font-size:9.5px;color:${TINTA};font-variant-numeric:tabular-nums;font-weight:700;">${escapeHtml(numDoc)}</div>
    </div>
  `;

  const renderDatosProyecto = () => `
    <div style="border:1px solid ${LINEA_SUAVE};border-radius:8px;padding:8px 12px;margin-bottom:10px;background:${FONDO};">
      <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
        <tr>
          <td style="width:16%;font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;">PROYECTO:</td>
          <td style="width:40%;font-weight:700;color:${TINTA};font-size:10.5px;padding:3.5px 6px;">${escapeHtml(proyecto || "OBRA GENERAL")}</td>
          <td style="width:16%;font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid ${LINEA_SUAVE};">PERÍODO:</td>
          <td style="width:28%;color:${TINTA};font-weight:600;font-size:10px;padding:3.5px 6px;">${escapeHtml(periodo)}</td>
        </tr>
        <tr>
          <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">CONTRATANTE:</td>
          <td style="color:${TINTA};font-weight:600;font-size:10px;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">${escapeHtml(cliente || "A QUIEN INTERESE")}</td>
          <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid ${LINEA_SUAVE};border-top:1px solid ${LINEA_SUAVE};">FECHA EMISIÓN:</td>
          <td style="color:${TINTA};font-weight:600;font-size:10px;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">${escapeHtml(fechaInforme)}</td>
        </tr>
        <tr>
          <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">LOCALIZACIÓN:</td>
          <td style="color:${TINTA};font-weight:600;font-size:10px;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">${escapeHtml(localizacion || "MEDELLÍN")}</td>
          <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-left:1px solid ${LINEA_SUAVE};border-top:1px solid ${LINEA_SUAVE};">NORMATIVA:</td>
          <td style="padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">
            <span style="background:#ffffff;color:${TINTA};border:1px solid ${LINEA};font-size:9px;font-weight:700;padding:1.5px 6px;border-radius:3px;display:inline-block;letter-spacing:0.02em;">Res. 4272/2021 · OSHA 1926</span>
          </td>
        </tr>
        ${cotizacionRef ? `
        <tr>
          <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};">REF. COTIZACIÓN:</td>
          <td colspan="3" style="color:${TINTA};font-weight:700;padding:3.5px 6px;border-top:1px solid ${LINEA_SUAVE};font-variant-numeric:tabular-nums;">
            <span style="background:#ffffff;color:${TINTA};padding:1.5px 6px;border-radius:3px;border:1px solid ${LINEA};font-size:9px;">📄 ${escapeHtml(cotizacionRef)}</span>
          </td>
        </tr>
        ` : ''}
      </table>
    </div>
  `;

  const renderPersonalEnObra = () => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
      <span style="font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:${TINTA};">1. Personal Técnico Asignado en Sitio</span>
      <span style="font-size:9px;font-weight:500;color:${GRIS};">Personal certificado con trabajo seguro en alturas</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(${Math.min(3, Math.max(1, personal.length))}, 1fr);gap:7px;margin-bottom:10px;">
      ${personal.length > 0 ? personal.map((p, idx) => `
        <div style="border:1px solid ${LINEA_SUAVE};border-radius:6px;padding:5px 8px;background:#ffffff;display:flex;align-items:center;gap:7px;">
          <div style="width:20px;height:20px;background:${FONDO};border-radius:4px;color:${TINTA};font-variant-numeric:tabular-nums;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${String(idx + 1).padStart(2, "0")}
          </div>
          <div style="min-width:0;flex:1;">
            <div style="font-size:9px;font-weight:700;color:${GRIS};text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(String(p.cargo || "TÉCNICO ESPECIALISTA").toUpperCase())}</div>
            <div style="font-size:10px;font-weight:600;color:${TINTA};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.nombre || "Sin nombre")}</div>
          </div>
        </div>
      `).join("") : `
        <div style="border:1px dashed ${LINEA};border-radius:6px;padding:6px 9px;color:${GRIS};font-size:9px;font-style:italic;">Personal asignado conforme a programación de cuadrilla en obra.</div>
      `}
    </div>
  `;

  const renderBannerActividades = () => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;padding-top:1px;">
      <span style="font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:${TINTA};">2. Metodología y Registro de Actividades Ejecutadas</span>
      <span style="font-size:9px;font-weight:500;color:${GRIS};">Control y Trazabilidad Operativa</span>
    </div>
  `;

  const renderTablaActividad = (act, idx) => `
    <div style="border:1px solid ${LINEA_SUAVE};border-radius:8px;background:#ffffff;padding:9px 12px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${LINEA_SUAVE};padding-bottom:5px;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="background:${FONDO};color:${TINTA};font-variant-numeric:tabular-nums;font-size:9px;font-weight:700;padding:1.5px 6px;border-radius:3px;">
            ACT-${String(idx + 1).padStart(2, "0")}
          </span>
          <span style="font-size:11px;font-weight:700;color:${TINTA};">
            ${escapeHtml(act.titulo || "Actividad Ejecutada")}
          </span>
        </div>
        ${act.fecha ? `
          <span style="font-size:9px;color:${GRIS};font-variant-numeric:tabular-nums;">
            Fecha: ${escapeHtml(fmtL(act.fecha))}
          </span>
        ` : ""}
      </div>

      <div style="font-size:10.5px;color:${TINTA};line-height:1.48;text-align:justify;">
        ${(act.actividadesRealizadas || "").trim() ? `
          <div style="margin-bottom:5px;">
            <strong style="color:${GRIS};text-transform:uppercase;font-size:9px;letter-spacing:0.05em;display:block;margin-bottom:1px;">Actividades Realizadas:</strong>
            ${escapeHtml(act.actividadesRealizadas)}
          </div>
        ` : ""}
        ${(act.descripcion || "").trim() ? `
          <div style="margin-bottom:4px;">
            <strong style="color:${GRIS};text-transform:uppercase;font-size:9px;letter-spacing:0.05em;display:block;margin-bottom:1px;">Descripción Técnica:</strong>
            ${escapeHtml(act.descripcion)}
          </div>
        ` : ""}
      </div>

      <!-- Dos columnas en tabla, no en flex: con flex, un texto de conforme
           largo aplastaba el estado y lo partia en dos renglones («Estado:
           Concluido» y debajo «100%»), que acababa leyendose como si el 100%
           fuera parte del texto de al lado. En tabla el estado no se encoge
           ni se parte, y va en su recuadro para que se vea que es un estado
           y no la continuacion de la frase. -->
      <table style="width:100%;border-collapse:collapse;margin-top:6px;border-top:1px solid ${LINEA_SUAVE};">
        <tr>
          <td style="padding:5px 10px 0 0;font-size:9px;color:${TINTA};vertical-align:top;line-height:1.45;">
            <strong style="color:${TINTA};">✓ Conforme:</strong> ${(act.observaciones || "").trim() ? escapeHtml(act.observaciones) : "Ejecutado a conformidad sin novedades reportadas."}
          </td>
          <td style="padding:5px 0 0;width:1%;white-space:nowrap;vertical-align:top;text-align:right;">
            <span style="display:inline-block;background:${FONDO};border:1px solid ${LINEA};border-radius:3px;padding:2px 7px;font-size:8.5px;font-weight:700;color:${TINTA};letter-spacing:0.02em;">
              ESTADO: CONCLUIDO · 100%
            </span>
          </td>
        </tr>
      </table>
    </div>
  `;

  // Las evidencias son parte de su actividad, no una seccion aparte: antes
  // salian como «3. Panel...» una vez por actividad, y la numeracion iba
  // 2, 3, 3, 3 intercalada con las actividades.
  const renderBannerFotos = (act, actIdx, continuacion) => `
    <div style="display:flex;align-items:center;gap:7px;margin:-2px 0 6px;">
      <span style="font-size:9px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${GRIS};">
        Evidencias fotográficas · ACT-${String(actIdx + 1).padStart(2, "0")}${continuacion ? " (cont.)" : ""}
      </span>
      <span style="flex:1;height:1px;background:${LINEA_SUAVE};"></span>
    </div>
  `;

  // La foto llena el recuadro (`cover`): con `contain` una foto vertical
  // ocupaba un tercio del ancho entre dos franjas blancas.
  const renderFotoCard = (ft, actIdx, fotoIdx) => `
    <div class="foto-card" style="border:1px solid ${LINEA_SUAVE};border-radius:8px;overflow:hidden;background:#ffffff;display:flex;flex-direction:column;">
      <div style="height:155px;display:flex;align-items:center;justify-content:center;background:${FONDO};border-bottom:1px solid ${LINEA_SUAVE};overflow:hidden;position:relative;">
        <img src="${ft.img || ft.url}" alt="Evidencia ${fotoIdx + 1}" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;background:${FONDO};"/>
        <span style="position:absolute;top:5px;left:5px;background:rgba(255,255,255,0.92);color:${TINTA};font-size:9px;font-variant-numeric:tabular-nums;font-weight:700;padding:2px 6px;border-radius:4px;">
          EVIDENCIA ${actIdx + 1}.${fotoIdx + 1}
        </span>
      </div>
      ${String(ft.comentario || "").trim() ? `<div style="padding:5px 8px;font-size:9px;color:${TINTA};line-height:1.35;background:#ffffff;">
        ${escapeHtml(ft.comentario)}
      </div>` : ""}
    </div>
  `;
  // Sin comentario la foto sale sola: antes se ponia siempre «Registro
  // fotografico y trazabilidad de actividades ejecutadas en sitio», que
  // repetido debajo de cada foto no decia nada.

  // Una foto sola va centrada, del mismo tamaño que las demas. Antes iba a
  // la izquierda con un recuadro punteado «(Espacio reservado)» al lado,
  // que en un documento para el cliente se leia como algo sin terminar.
  const renderFotosFila = (parFotos, actIdx, startFotoIdx) => `
    <div style="display:grid;grid-template-columns:${parFotos.length === 1 ? "calc(50% - 4.5px)" : "1fr 1fr"};justify-content:center;gap:9px;margin-bottom:9px;align-items:start;">
      ${parFotos.map((ft, i) => renderFotoCard(ft, actIdx, startFotoIdx + i)).join("")}
    </div>
  `;

  const renderTablaRecomendaciones = () => `
    <div style="border:1px solid ${LINEA_SUAVE};border-radius:8px;overflow:hidden;margin-bottom:10px;background:${FONDO};padding:8px 12px;">
      <div style="font-size:9px;font-weight:800;color:${GRIS};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">DICTAMEN TÉCNICO Y RECOMENDACIONES</div>
      <div style="font-size:10.5px;color:${TINTA};line-height:1.48;text-align:justify;white-space:pre-line;">${escapeHtml(recomendaciones)}</div>
    </div>
  `;

  const renderBloqueFirma = () => `
    <table class="bloque-firma" style="width:100%;border-collapse:collapse;margin-top:10px;border-top:1px solid ${LINEA_SUAVE};padding-top:8px;">
      <tr>
        <td style="width:50%;padding:8px 12px 0 0;vertical-align:top;border-right:1px solid ${LINEA_SUAVE};">
          <div style="font-size:9px;font-weight:700;color:${GRIS};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;">Por el Contratista Especialista:</div>
          <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:3px;">
            ${firmaImg ? `<img src="${firmaImg}" alt="Firma" style="max-height:42px;max-width:180px;object-fit:contain;"/>` : `<div style="font-family:'Segoe Script',cursive,sans-serif;font-size:14px;font-weight:700;color:${TINTA};">Jhon Jaime Sepúlveda L.</div>`}
          </div>
          <div style="font-weight:800;font-size:10.5px;color:${TINTA};letter-spacing:0.01em;">ING. JHON JAIME SEPÚLVEDA LONDOÑO</div>
          <div style="font-size:9px;color:${GRIS};margin-top:1px;">Gerente General · MP. 05256-409949</div>
          <div style="font-size:9px;color:${GRIS};margin-top:1px;">Ingeanclajes S.A.S · NIT. 900.193.965-4</div>
        </td>
        <td style="width:50%;padding:8px 0 0 12px;vertical-align:top;">
          <div style="font-size:9px;font-weight:700;color:${GRIS};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;">Recibido por la Interventoría / Constructora:</div>
          <!-- Si el cliente ya firmo el acta de entrega de esta obra, su firma
               vale tambien aqui: es la misma persona recibiendo el mismo
               trabajo. Se trae la firma, la cedula y el cargo, y nada mas: el
               rastro del envio y el QR son del acta y aqui no pintan. -->
          <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:3px;font-size:9px;color:${GRIS};font-style:italic;">
            ${firmaClienteImg
              ? `<img src="${firmaClienteImg}" alt="Firma del cliente" style="max-height:42px;max-width:180px;object-fit:contain;display:inline-block;font-style:normal;"/>`
              : "(Firma y sello de recepción a satisfacción)"}
          </div>
          <div style="font-weight:700;font-size:9.5px;color:${TINTA};">NOMBRE: ${nombreFirmante ? escapeHtml(nombreFirmante) : "____________________________________"}</div>
          <div style="font-size:9px;color:${GRIS};margin-top:2px;">C.C.: ${documentoFirmante ? escapeHtml(documentoFirmante) : "______________________________"}</div>
          <div style="font-size:9px;color:${GRIS};margin-top:2px;">CARGO: ${cargoFirmante ? escapeHtml(cargoFirmante) : "____________________________"}</div>
          <div style="font-size:9px;color:${GRIS};margin-top:1px;">EMPRESA: ${escapeHtml(cliente || "Constructora / Contratante")}</div>${fechaFirmaTexto ? `
          <div style="font-size:8px;color:${GRIS};margin-top:3px;">Firmado electrónicamente · ${escapeHtml(fechaFirmaTexto)}</div>` : ""}
        </td>
      </tr>
    </table>
  `;

  // --- MOTOR DE EMPAQUETADO FLUIDO Y SEGURO DE PÁGINAS ---
  const paginas = [[]];
  let pIdx = 0;
  let alturaActual = 0;

  // Cada bloque sale envuelto con una marca de que es. Asi, al generar el
  // PDF, se puede volver a repartir en hojas MIDIENDO el documento ya
  // dibujado en vez de fiarse de las alturas estimadas de aqui arriba.
  // Ver lib/repaginarHojas.js: es lo que quita los huecos en blanco, porque
  // una estimacion que se pasa por 100px manda a la hoja siguiente un
  // bloque que en realidad cabia.
  const marcar = (html, rol) => `<div data-rol="${rol}">${html}</div>`;

  const nuevaPagina = () => {
    pIdx += 1;
    paginas[pIdx] = [marcar(renderHeaderSecundario(), "encabezado")];
    alturaActual = ALTO_HEADER_SECUNDARIO;
  };

  // El mismo tope para todas las hojas: lo que ocupa el encabezado de cada
  // una ya va sumado en `alturaActual`, asi que no hay que volver a
  // descontarlo aqui.
  const getLimiteActual = () => MAX_ALTO_PAGINA;

  // 1. Portada Top. Va como un solo bloque «fijo»: nunca se mueve de la
  // primera hoja, pase lo que pase al volver a repartir.
  paginas[0].push(marcar(
    renderHeaderPortada() + renderDatosProyecto() + renderPersonalEnObra() + renderBannerActividades(),
    "fijo"
  ));
  alturaActual = ALTO_HEADER_PORTADA + calcularAltoDatos(Boolean(cotizacionRef)) + calcularAltoPersonal(personal) + ALTO_BANNER_ACTIVIDADES;

  // 2. Empaquetar Actividades y Fotos de forma armónica
  actividades.forEach((act, actIdx) => {
    const fotos = (act.fotos || []).filter((ft) => ft.img || ft.url);
    const filas = [];
    for (let i = 0; i < fotos.length; i += 2) {
      filas.push(fotos.slice(i, i + 2));
    }

    // La actividad sale en un solo bloque con su primera fila de fotos, para
    // que nunca quede al final de una hoja y sus fotos en la siguiente. Al
    // ir en un mismo `data-rol`, el repartido del PDF tampoco los separa.
    const altoBloque = calcularAltoActividad(act) + (filas.length ? ALTO_BANNER_FOTOS + ALTO_FILA_FOTOS : 0);
    if (alturaActual + altoBloque > getLimiteActual()) {
      nuevaPagina();
    }

    paginas[pIdx].push(marcar(
      renderTablaActividad(act, actIdx) +
        (filas.length ? renderBannerFotos(act, actIdx, false) + renderFotosFila(filas[0], actIdx, 0) : ""),
      "contenido"
    ));
    alturaActual += altoBloque;

    // El resto de filas se reparte suelto; si alguna pasa a otra hoja, lleva
    // de nuevo el titulo con «(cont.)».
    if (filas.length > 1) {
      let tituloPuesto = true;

      filas.slice(1).forEach((fila, i) => {
        const fIdx = i + 1;
        const espacioRequerido = ALTO_FILA_FOTOS;

        if (alturaActual + espacioRequerido > getLimiteActual()) {
          nuevaPagina();
          tituloPuesto = false;
        }

        if (!tituloPuesto) {
          paginas[pIdx].push(marcar(renderBannerFotos(act, actIdx, true), "contenido"));
          alturaActual += ALTO_BANNER_FOTOS;
          tituloPuesto = true;
        }

        paginas[pIdx].push(marcar(renderFotosFila(fila, actIdx, fIdx * 2), "contenido"));
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
    paginas[pIdx].push(marcar(renderTablaRecomendaciones(), "contenido"));
    alturaActual += altoRec;
  }

  // Si no cabe la firma en la hoja actual
  if (alturaActual + altoFirma > getLimiteActual()) {
    nuevaPagina();
  }
  paginas[pIdx].push(marcar(renderBloqueFirma(), "contenido"));
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
          <span data-rol="numeracion">Página ${idx + 1} de ${totalHojas}</span>
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
        /* La misma letra que la aplicacion. Antes declaraba la pila de
           Apple, que en un Mac da SF Pro pero en Windows cae en Segoe UI:
           el informe salia con una letra distinta de la del programa desde
           el que se genera. Inter es la que usa toda la aplicacion. */
        font-family: ${FUENTE};
        color: ${TINTA};
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
        /* Sin esto el navegador quita los sombreados grises al imprimir. */
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
        font-size: 9px;
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
