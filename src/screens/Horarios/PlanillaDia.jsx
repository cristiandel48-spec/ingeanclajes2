import { useEffect, useRef, useState } from "react";
import { Button, EmptyState, Icono, Sheet } from "../../components/ui";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { today } from "../../lib/format";
import { obrasMasNuevasPrimero } from "../../lib/identificadores";
import { normalizarNombrePropio } from "../../lib/normalizarEntrada";
import { FUENTE } from "../../styles/designTokens";

// Planilla «Actividades y clientes» del dia: edicion directa en pantalla
// (tabla limpia estilo Apple en escritorio y tarjetas tactiles en celular) y
// exportacion como imagen PNG lista para el grupo de WhatsApp.
//
// Usa los mismos tokens de color y tipografia (Inter / Apple) que toda la
// aplicacion. En la copia que se fotografia para WhatsApp (.hor-planilla--imagen)
// se fijan valores de papel claro para que salga nitida incluso en modo oscuro.

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const fechaLarga = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso || "";
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}, ${d.getFullYear()}`;
};

const sumarDias = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const hora12 = (hhmm) => {
  const [hs, ms = "00"] = String(hhmm || "").trim().split(":");
  const h = Number(hs);
  if (!hs || Number.isNaN(h)) return "";
  return `${((h + 11) % 12) + 1}:${ms.padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const ENCUENTRO_POR_DEFECTO = "Salida desde la oficina";
const INICIO_POR_DEFECTO = "07:00";

const limpio = (v) => String(v ?? "").trim();
const inicioDelTurno = (turno) => limpio(turno).split("-")[0].trim();
const distintos = (lista) => [...new Set(lista)];

const etiquetaTrabajador = (e) => {
  const base = limpio(e?.nombre) || "—";
  const nombre = base === base.toUpperCase() && base.length > 3 ? normalizarNombrePropio(base) : base;
  return /\bSST\b|SEGURIDAD/i.test(String(e?.cargo || "")) ? `${nombre} · SST` : nombre;
};

const direccionDe = (o) => [limpio(o?.direccion), limpio(o?.ciudad)].filter(Boolean).join(", ");

const ESTILOS_PLANILLA = `
  .hor-shell {
    background: #ffffff;
    color: #1d1d1f;
    border: 1px solid #d5dcef;
    border-radius: 18px;
    overflow: hidden;
    font-family: ${FUENTE};
    -webkit-font-smoothing: antialiased;
    box-shadow: 0 1px 2px rgba(16, 24, 64, 0.04), 0 8px 24px rgba(16, 24, 64, 0.05);
  }

  /* ── Cabecera azul suave de la planilla con acabado Apple ── */
  .hor-head {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 20px;
    background: #dfe6ff;
    border-bottom: 1px solid #c5d0f0;
  }
  .hor-head__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }
  .hor-head__marca {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .hor-head__acciones {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ui-hor-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 980px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    transition: background var(--transicion-rapida), border-color var(--transicion-rapida),
                color var(--transicion-rapida), transform var(--transicion-rapida), box-shadow var(--transicion-rapida);
  }
  .ui-hor-btn:active:not(:disabled) { transform: scale(0.975); }
  .ui-hor-btn--ghost {
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid #c5d0f0;
    color: #2a3b8f;
  }
  .ui-hor-btn--ghost:hover:not(:disabled) {
    background: #ffffff;
    border-color: #a8b9ee;
  }
  .ui-hor-btn--primary {
    background: #2a3b8f;
    border: 1px solid #2a3b8f;
    color: #ffffff;
    box-shadow: 0 1px 2px rgba(24, 36, 96, 0.16);
  }
  .ui-hor-btn--primary:hover:not(:disabled) {
    background: #213078;
    border-color: #213078;
  }
  .ui-hor-btn--secondary {
    background: #ffffff;
    border: 1px solid #c5d0f0;
    color: #1d1d1f;
  }
  .ui-hor-btn--secondary:hover:not(:disabled) {
    background: #eef2ff;
  }
  .hor-head__punto {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #2a3b8f;
    flex: none;
  }
  .hor-head__titulo {
    margin: 0;
    font-size: 17px;
    line-height: 22px;
    font-weight: 700;
    letter-spacing: -0.015em;
    color: #1d1d1f;
  }
  .hor-head__cuenta {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 980px;
    background: rgba(255, 255, 255, 0.72);
    color: #2a3b8f;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .hor-head .ui-seg {
    background: rgba(255, 255, 255, 0.55);
  }
  .hor-head .ui-seg__op {
    color: #46506b;
  }
  .hor-head .ui-seg__op[aria-selected="true"] {
    background: #ffffff;
    color: #1d1d1f;
  }

  /* ── Navegacion unificada de fecha ── */
  .hor-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }
  .hor-nav__grupo {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid #c5d0f0;
    border-radius: 980px;
    max-width: 100%;
  }
  .hor-nav__atajos {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .ui-hor-flecha {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #4a5578;
    cursor: pointer;
    flex: none;
    transition: background var(--transicion-rapida), color var(--transicion-rapida);
  }
  .ui-hor-flecha:hover {
    background: #eef2ff;
    color: #1d1d1f;
  }
  .ui-hor-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 30px;
    padding: 0 13px;
    border: 1px solid transparent;
    border-radius: 980px;
    background: transparent;
    color: #46506b;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background var(--transicion-rapida), color var(--transicion-rapida), box-shadow var(--transicion-rapida);
  }
  .ui-hor-chip:hover {
    color: #1d1d1f;
  }
  .ui-hor-chip--activo {
    background: #ffffff;
    color: #2a3b8f;
    box-shadow: 0 1px 2px rgba(16, 24, 64, 0.08);
  }
  .hor-nav__seg {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: 980px;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid #c5d0f0;
  }

  /* ── Botones nativos de Hora y Fecha (tactiles en iOS/Android y clic en PC) ── */
  .ui-hor-picker {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 32px;
    padding: 4px 12px;
    border-radius: 980px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition: background var(--transicion-rapida), border-color var(--transicion-rapida),
                color var(--transicion-rapida), transform var(--transicion-rapida);
  }
  .ui-hor-picker:active {
    transform: scale(0.98);
  }
  .ui-hor-picker--fecha-head {
    border: 1px solid transparent;
    background: transparent;
    color: #1d1d1f;
    font-size: 13.5px;
    font-weight: 600;
    padding: 4px 10px;
  }
  .ui-hor-picker--fecha-head:hover {
    background: #eef2ff;
  }
  .ui-hor-picker--hora {
    background: #eef2ff;
    color: #2a3b8f;
    border: 1px solid #c5d0f5;
  }
  .ui-hor-picker--hora:hover {
    background: #dfe6ff;
    border-color: #a8b9ee;
  }
  .ui-hor-picker--hora-vacia {
    background: #f5f7ff;
    color: #3a4668;
    border: 1px solid #cdd7f5;
  }
  .ui-hor-picker--hora-vacia:hover {
    background: #e9eeff;
    color: #2a3b8f;
  }
  .ui-hor-picker--fecha {
    background: #ffffff;
    color: #2a3b8f;
    border: 1px solid #cdd7f5;
  }
  .ui-hor-picker--fecha:hover {
    background: #eef2ff;
    border-color: #a8b9ee;
  }
  .ui-hor-picker--select {
    background: #f4f6ff;
    color: #2a3b8f;
    border: 1px solid #cdd7f5;
    min-height: 34px;
    padding: 5px 12px;
  }
  .ui-hor-picker--select:hover {
    background: #e8eeff;
    border-color: #a8b9ee;
  }
  .ui-hor-picker--bloque {
    width: 100%;
    box-sizing: border-box;
    min-height: 44px;
    font-size: 14px;
    padding: 8px 14px;
  }
  .ui-hor-picker:focus-within {
    outline: 2px solid #2a3b8f;
    outline-offset: 2px;
  }
  .hor-native-overlay {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    min-height: 0 !important;
    opacity: 0 !important;
    cursor: pointer !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    font-size: 16px !important;
    z-index: 2;
  }

  /* ── Tabla limpia estilo Apple con azul suave tipo planilla ── */
  .hor-marco-tabla {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    box-sizing: border-box;
  }
  .hor-tabla {
    width: 100%;
    min-width: 960px;
    border-collapse: collapse;
    table-layout: auto;
    font-family: ${FUENTE};
  }
  .hor-tabla th {
    background: #eef2ff;
    color: #2c3550;
    font-weight: 600;
    font-size: 11.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: left;
    padding: 11px 14px;
    border-bottom: 1px solid #d5dcef;
    border-right: 1px solid #d5dcef;
    white-space: nowrap;
  }
  .hor-tabla th:last-child { border-right: none; }
  .hor-tabla th.hor-col-centro,
  .hor-tabla td.hor-col-centro { text-align: center; }

  .hor-tabla td {
    position: relative;
    background: #ffffff;
    color: #1d1d1f;
    font-size: 13.5px;
    font-weight: 400;
    line-height: 1.5;
    vertical-align: middle;
    padding: 16px 14px;
    border-bottom: 1px solid #e3e7f2;
    border-right: 1px solid #e3e7f2;
    overflow-wrap: break-word;
    word-break: normal;
    transition: background var(--transicion-rapida);
  }
  .hor-tabla td:last-child { border-right: none; }
  .hor-tabla tbody tr:last-child td { border-bottom: none; }
  .hor-tabla tbody tr.hor-fila-datos:nth-child(even) td { background: #fafbff; }
  .hor-tabla tbody tr.hor-fila-datos:hover td { background: #f3f6ff; }
  .hor-tabla tbody tr.hor-fila-nueva td { background: #fbfcff; }

  .hor-cliente {
    display: block;
    font-weight: 600;
    font-size: 14px;
    color: #1d1d1f;
    letter-spacing: -0.008em;
  }
  .hor-proyecto {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    color: #667085;
  }
  .hor-direccion {
    font-size: 13px;
    color: #475467;
  }
  .hor-cifra {
    display: inline-block;
    font-size: 18px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    color: #1d1d1f;
  }
  .hor-vacio { color: #b8c0d4; }
  .hor-sin-datos {
    padding: 22px 16px !important;
    text-align: center !important;
    color: #667085 !important;
    font-size: 13px !important;
    background: #fafbff !important;
  }

  /* ── Edicion inline limpia ── */
  .hor-celda {
    display: block;
    min-height: 24px;
    margin: -4px -6px;
    padding: 5px 8px;
    border: 1px solid transparent;
    border-radius: 10px;
    cursor: text;
    outline: none;
    transition: background var(--transicion-rapida), border-color var(--transicion-rapida);
  }
  .hor-celda:hover, .hor-celda:focus-visible {
    background: #f1f4ff;
    border-color: #c5d0f5;
  }
  .hor-celda--linea { display: inline-flex; align-items: center; gap: 5px; margin: 0; }
  .hor-celda__ph {
    color: #98a2b3;
    font-size: 13px;
    font-weight: 400;
  }
  .hor-input {
    display: block;
    width: 100%;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 14px;
    color: #1d1d1f;
    background: #ffffff;
    border: 1.5px solid #2a3b8f;
    border-radius: 10px;
    padding: 6px 10px;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(42, 59, 143, 0.14) !important;
  }
  .hor-input::placeholder { color: #98a2b3; }

  /* ── Chips de trabajadores ── */
  .hor-trabs-lista {
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
  }
  .hor-trab-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px 4px 11px;
    border-radius: 980px;
    background: #eef2ff;
    color: #1d1d1f;
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1.3;
    max-width: 100%;
  }
  .hor-trab-chip__nombre {
    white-space: nowrap;
  }
  .ui-hor-x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #6e7894;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    flex: none;
    transition: background var(--transicion-rapida), color var(--transicion-rapida);
  }
  .ui-hor-x:hover, .ui-hor-x:focus-visible {
    background: #ffe5e5;
    color: #d70015;
  }
  .ui-hor-x--fila {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 26px;
    height: 26px;
    opacity: 0.55;
  }
  .hor-tabla tr:hover .ui-hor-x--fila { opacity: 1; }

  /* ── Columna Fecha y Hora ── */
  .hor-fecha-bloque {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }
  .hor-fecha-texto {
    font-size: 13px;
    font-weight: 600;
    color: #1d1d1f;
  }
  .hor-encuentro-texto {
    font-size: 12px;
    color: #475467;
  }
  .hor-acciones-fecha {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin-top: 2px;
  }

  .hor-pista {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #b54708;
  }
  .hor-pista--suave { color: #8c96ab; font-weight: 400; }

  /* ── Vista Tarjetas Apple para Celular (armonia azul suave) ── */
  .hor-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: #f4f6ff;
  }
  .hor-card {
    background: #ffffff;
    border: 1px solid #dce3f5;
    border-radius: 16px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .hor-card--nueva {
    background: #ffffff;
    border: 1px solid #c5d0f0;
  }
  .hor-card__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .hor-card__label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #5b6478;
    margin-bottom: 5px;
  }
  .hor-card__grid2 {
    display: grid;
    grid-template-columns: minmax(0, 2.2fr) minmax(88px, 1fr);
    gap: 10px;
  }
  .hor-card__panel {
    background: #f6f8ff;
    border: 1px solid #e1e7f7;
    border-radius: 12px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hor-card__pickers {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .hor-card__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }
  .hor-card .hor-trab-chip {
    padding: 6px 8px 6px 12px;
    font-size: 13px;
  }
  .hor-card .ui-hor-x {
    width: 28px;
    height: 28px;
    font-size: 16px;
  }
  .hor-card .hor-input {
    font-size: 16px;
    padding: 9px 12px;
  }
  .hor-card .ui-hor-picker {
    min-height: 40px;
    width: 100%;
    box-sizing: border-box;
    font-size: 13px;
    padding: 6px 10px;
  }
  .hor-card-input {
    width: 100%;
    box-sizing: border-box;
    height: 42px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid #e3e7f2;
    background: #f8faff;
    color: #1d1d1f;
    font-family: inherit;
    font-size: 16px;
    transition: background var(--transicion-rapida), border-color var(--transicion-rapida);
  }
  .hor-card-input:focus {
    outline: none;
    background: #ffffff;
    border-color: #2a3b8f;
    box-shadow: 0 0 0 3px rgba(42, 59, 143, 0.14);
  }
  .hor-card-input::placeholder { color: #98a2b3; }

  /* ── Pie de acciones de la planilla ── */
  .hor-pie {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 18px;
    background: #f7f9ff;
    border-top: 1px solid #e3e7f2;
  }
  .hor-pie__acciones {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* ── Espejo oculto para exportar PNG cuando el celular esta en vista Tarjetas ── */
  .hor-export-offscreen {
    position: fixed;
    left: -10000px;
    top: 0;
    width: 1120px;
    pointer-events: none;
    z-index: -1;
  }

  /* ── La hoja fotografiada para WhatsApp (fiel a la planilla azul con acabado Apple) ── */
  .hor-shell.hor-planilla--imagen {
    position: absolute;
    left: 0;
    top: 0;
    margin: 0;
    width: 1120px;
    min-width: 0;
    border-radius: 0;
    border: 1px solid #d5dcef;
    box-shadow: none;
    overflow: visible;
    background: #ffffff;
    color: #1d1d1f;
  }
  .hor-planilla--imagen .hor-head {
    background: #dfe6ff;
    border-bottom: 2px solid #b9c5ea;
    align-items: center;
    text-align: center;
    padding: 18px 24px 14px;
    gap: 6px;
  }
  .hor-planilla--imagen .hor-head__top { justify-content: center; }
  .hor-planilla--imagen .hor-head__punto { display: none; }
  .hor-planilla--imagen .hor-head__titulo { font-size: 19px; letter-spacing: 0.04em; text-transform: uppercase; }
  .hor-planilla--imagen .hor-nav { justify-content: center; }
  .hor-planilla--imagen .hor-nav__grupo { border: none; background: transparent; padding: 0; }
  .hor-planilla--imagen .hor-tabla { min-width: 0; }
  .hor-planilla--imagen .hor-trab-chip {
    background: transparent;
    padding: 1px 0;
    font-weight: 500;
    font-size: 13.5px;
  }
  .hor-planilla--imagen .hor-trabs-lista { align-items: center; gap: 3px; }
  .hor-planilla--imagen .hor-tabla th,
  .hor-planilla--imagen .hor-tabla td { text-align: center; }
  .hor-planilla--imagen .ui-hor-picker--hora {
    border: none;
    padding: 3px 11px;
    min-height: 26px;
  }
  .hor-shell.hor-planilla--imagen.hor-planilla--preview {
    position: relative;
    left: auto;
    top: auto;
    border: none;
  }
  .hor-preview-marco {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid #d5dcef;
    background: #ffffff;
    box-shadow: 0 2px 10px rgba(16, 24, 64, 0.06);
    cursor: zoom-in;
    transition: border-color var(--transicion-rapida), box-shadow var(--transicion-rapida);
  }
  .hor-preview-marco:hover {
    border-color: #a8b9ee;
    box-shadow: 0 6px 20px rgba(16, 24, 64, 0.1);
  }
  .hor-preview-marco__escala {
    position: absolute;
    top: 0;
    left: 0;
    width: 1120px;
    transform-origin: top left;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .hor-head { padding: 14px; }
    .hor-pie { padding: 12px 14px; }
    .ui-hor-flecha { width: 36px; height: 36px; }
    .ui-hor-chip { height: 34px; padding: 0 13px; }
    .ui-hor-btn { height: 38px; padding: 0 14px; font-size: 13px; }
    .ui-hor-picker--fecha-head { font-size: 13px; padding: 6px 8px; }
    .ui-hor-x--fila { opacity: 1; width: 34px; height: 34px; }
  }
`;

function filasDeLaPlanilla(dia, obras, empleados) {
  const porObra = new Map();
  for (const h of dia) {
    if (!porObra.has(h.obraId)) porObra.set(h.obraId, []);
    porObra.get(h.obraId).push(h);
  }
  return [...porObra.entries()].map(([obraId, turnos]) => {
    const o = obras.find((x) => x.id === obraId);
    const trabajadores = distintos(turnos.map((t) => t.empleadoId))
      .map((id) => empleados.find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => ({ id: e.id, etiqueta: etiquetaTrabajador(e) }));
    const tareas = distintos(turnos.map((t) => limpio(t.tarea)));
    const cantidades = distintos(turnos.map((t) => limpio(t.cantidad)));
    const encuentros = distintos(turnos.map((t) => limpio(t.encuentro)));
    const horas = distintos(turnos.map((t) => limpio(t.turno)));
    const inicios = horas.map(inicioDelTurno).filter(Boolean).sort();
    const cliente = limpio(o?.cliente) || "Sin obra";
    const proyecto = limpio(o?.proyecto);
    return {
      obraId,
      cliente,
      proyecto: proyecto && proyecto.toLowerCase() !== cliente.toLowerCase() ? proyecto : "",
      trabajadores,
      direccion: direccionDe(o),
      tarea: tareas.length === 1 ? tareas[0] : null,
      tareaTexto: tareas.filter(Boolean).join(" / "),
      cantidad: cantidades.length === 1 ? cantidades[0] : null,
      cantidadTexto: cantidades.filter(Boolean).join(" / "),
      encuentro: encuentros.length === 1 ? encuentros[0] : null,
      encuentroTexto: distintos(encuentros.map((x) => x || ENCUENTRO_POR_DEFECTO)).join(" / "),
      inicio: horas.length === 1 ? inicioDelTurno(horas[0]) : null,
      inicioTexto: inicios[0] ? hora12(inicios[0]) : "",
    };
  });
}

const VARIA = "Este dato cambia entre los turnos de la fila. Edítalo abajo en «Turnos del día».";

function CeldaTexto({
  valor, mostrar, placeholder, onGuardar, lista, maxLength = 160,
  etiqueta, enLinea = false, claseTexto, icono = null,
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const cerrado = useRef(false);

  if (valor === null) {
    return <span title={VARIA} className={claseTexto}>{mostrar}</span>;
  }

  const abrir = () => {
    cerrado.current = false;
    setBorrador(valor);
    setEditando(true);
  };
  const cerrar = (guardar) => {
    if (cerrado.current) return;
    cerrado.current = true;
    setEditando(false);
    const nuevo = limpio(borrador);
    if (guardar && nuevo !== valor) onGuardar(nuevo);
  };

  if (editando) {
    return (
      <input
        autoFocus
        className="hor-input no-full-width"
        value={borrador}
        list={lista}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={etiqueta}
        onChange={(e) => setBorrador(e.target.value)}
        onBlur={() => cerrar(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); cerrar(true); }
          if (e.key === "Escape") { e.preventDefault(); cerrar(false); }
        }}
      />
    );
  }

  const texto = mostrar ?? valor;
  return (
    <div
      role="button"
      tabIndex={0}
      className={`hor-celda${enLinea ? " hor-celda--linea" : ""}`}
      title="Clic para escribir"
      aria-label={`${etiqueta}: ${texto || "vacío"}. Clic para escribir`}
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "F2") { e.preventDefault(); abrir(); }
      }}
    >
      {icono && <span data-html2canvas-ignore="true" style={{ color: "var(--text-tertiary)", display: "inline-flex" }}>{icono}</span>}
      {texto
        ? <span className={claseTexto}>{texto}</span>
        : <span className="hor-celda__ph" data-html2canvas-ignore="true">{placeholder}</span>}
    </div>
  );
}

// Campo con borrador local para la vista de tarjetas moviles: guarda al salir
// o pulsar Enter sin perder el foco en cada tecla.
function CampoTarjeta({
  valor, placeholder, onGuardar, lista, maxLength = 160, etiqueta, disabled = false,
}) {
  const [borrador, setBorrador] = useState(valor ?? "");
  const [enfocado, setEnfocado] = useState(false);

  const visible = enfocado ? borrador : (valor ?? "");
  const confirmarValor = (texto) => {
    const nuevo = limpio(texto);
    if (nuevo !== limpio(valor)) onGuardar(nuevo);
  };

  return (
    <input
      className="hor-card-input"
      value={visible}
      list={lista}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={etiqueta}
      disabled={disabled}
      onFocus={() => { setBorrador(valor ?? ""); setEnfocado(true); }}
      onChange={(e) => setBorrador(e.target.value)}
      onBlur={(e) => { setEnfocado(false); confirmarValor(e.target.value); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === "Escape") { setBorrador(valor ?? ""); setEnfocado(false); e.currentTarget.blur(); }
      }}
    />
  );
}

// Boton tactil de hora: cubre el boton con el <input type="time"> nativo para
// que funcione igual de bien al tocar en iPhone/Android que al hacer clic en PC.
function BotonHora({ inicio, mostrar, onGuardar, editable }) {
  const tieneHora = Boolean(inicio || mostrar);
  if (!editable) {
    return tieneHora ? (
      <span className="ui-hor-picker ui-hor-picker--hora" style={{ cursor: "default" }}>
        <Icono nombre="reloj" size={13} />
        <span>{mostrar || hora12(inicio)}</span>
      </span>
    ) : null;
  }

  return (
    <span
      className={`ui-hor-picker ${tieneHora ? "ui-hor-picker--hora" : "ui-hor-picker--hora-vacia"}`}
      title={inicio === null ? "Unificar hora de entrada de esta fila" : "Toca para cambiar o agregar la hora"}
    >
      <Icono nombre="reloj" size={14} />
      <span>{tieneHora ? (mostrar || hora12(inicio)) : "Agregar hora"}</span>
      <span data-html2canvas-ignore="true" style={{ display: "inline-flex", opacity: 0.7 }}>
        <Icono nombre="flechaAbajo" size={12} />
      </span>
      <input
        type="time"
        className="hor-native-overlay no-full-width"
        aria-label="Elegir hora de entrada"
        data-html2canvas-ignore="true"
        value={inicio || ""}
        onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* nativo en movil */ } }}
        onChange={(e) => {
          if (e.target.value && e.target.value !== inicio) onGuardar(e.target.value);
        }}
      />
    </span>
  );
}

// Boton tactil de fecha con <input type="date"> nativo superpuesto.
function BotonFecha({ fecha, onCambiar, className, titulo, soloImagen = false, children }) {
  if (soloImagen || !onCambiar) {
    return <span className={className}>{children}</span>;
  }
  return (
    <span className={`ui-hor-picker ${className || "ui-hor-picker--fecha"}`} title={titulo}>
      {children}
      <input
        type="date"
        className="hor-native-overlay no-full-width"
        aria-label={titulo || "Elegir fecha"}
        data-html2canvas-ignore="true"
        value={fecha}
        onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* nativo en movil */ } }}
        onChange={(e) => {
          if (e.target.value && e.target.value !== fecha) onCambiar(e.target.value);
        }}
      />
    </span>
  );
}

function AgregarTrabajador({ empleados, yaEstan, equipo, ocupados, onAgregar, fullWidth = false }) {
  const libres = empleados.filter((e) => !yaEstan.includes(e.id));
  if (!libres.length) return null;
  const delEquipo = libres.filter((e) => equipo.includes(e.id));
  const resto = libres.filter((e) => !equipo.includes(e.id));
  const opcion = (e) => (
    <option key={e.id} value={e.id}>
      {limpio(e.nombre)}
      {e.cargo ? ` · ${e.cargo}` : ""}
      {ocupados.has(e.id) ? ` — ya en ${ocupados.get(e.id)}` : ""}
    </option>
  );
  return (
    <span
      className={`ui-hor-picker ui-hor-picker--select${fullWidth ? " ui-hor-picker--bloque" : ""}`}
      data-html2canvas-ignore="true"
    >
      <Icono nombre="mas" size={13} />
      <span>Agregar trabajador</span>
      <Icono nombre="flechaAbajo" size={12} style={{ opacity: 0.6 }} />
      <select
        className="hor-native-overlay"
        aria-label="Agregar trabajador a la fila"
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          onAgregar(v === "__equipo" ? delEquipo.map((x) => x.id) : [v]);
        }}
      >
        <option value="">＋ Agregar trabajador</option>
        {delEquipo.length > 1 && (
          <option value="__equipo">Todo el equipo de la obra ({delEquipo.length})</option>
        )}
        {delEquipo.length > 0 && <optgroup label="Equipo de la obra">{delEquipo.map(opcion)}</optgroup>}
        {resto.length > 0 && (
          <optgroup label={delEquipo.length ? "Resto del personal" : "Personal"}>{resto.map(opcion)}</optgroup>
        )}
      </select>
    </span>
  );
}

const puedeCompartirArchivos = () => {
  try {
    const prueba = new File([""], "prueba.png", { type: "image/png" });
    return Boolean(navigator.canShare && navigator.canShare({ files: [prueba] }));
  } catch {
    return false;
  }
};

const FILA_NUEVA = { obraId: "", empleadoIds: [], tarea: "", cantidad: "", encuentro: "", inicio: INICIO_POR_DEFECTO };

const normalizarEncuentro = (texto) =>
  limpio(texto).toLowerCase() === ENCUENTRO_POR_DEFECTO.toLowerCase() ? "" : limpio(texto);

export default function PlanillaDia({
  fecha, dia, obras, empleados, tareasSugeridas = [],
  onCrearFila, onEditarFila, onAgregarTrabajadores, onQuitarTrabajador, onQuitarFila,
  onCambiarFecha, onMoverFila, onAbrirTextoGrupo, accionesCabecera = null,
}) {
  const isMobile = useIsMobile();
  const [vistaMovil, setVistaMovil] = useState("tarjetas");
  const mostrarTarjetas = isMobile && vistaMovil === "tarjetas";

  const hoy = today();
  const manana = sumarDias(hoy, 1);
  const hojaRef = useRef(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [pendiente, setPendiente] = useState(null);
  const [puedeCompartir] = useState(puedeCompartirArchivos);

  useEffect(() => {
    import("html2canvas").catch(() => {});
  }, []);

  const [nueva, setNueva] = useState(FILA_NUEVA);
  const filas = filasDeLaPlanilla(dia, obras, empleados);
  const fechaTexto = fechaLarga(fecha);
  const editable = Boolean(onCrearFila && onEditarFila);

  const ocupadosFuera = (obraId) => {
    const mapa = new Map();
    for (const h of dia) {
      if (h.obraId === obraId || mapa.has(h.empleadoId)) continue;
      const o = obras.find((x) => x.id === h.obraId);
      mapa.set(h.empleadoId, limpio(o?.cliente) || "otra obra");
    }
    return mapa;
  };
  const equipoDe = (obraId) => {
    const o = obras.find((x) => x.id === obraId);
    return Array.isArray(o?.empleados) ? o.empleados : [];
  };

  const cambiarNueva = (cambios) => {
    const siguiente = { ...nueva, ...cambios };
    if (siguiente.obraId && siguiente.empleadoIds.length) {
      onCrearFila(siguiente);
      setNueva(FILA_NUEVA);
    } else {
      setNueva(siguiente);
    }
  };
  const obraNueva = obras.find((o) => o.id === nueva.obraId);
  const obrasLibres = obrasMasNuevasPrimero(obras).filter((o) => !filas.some((f) => f.obraId === o.id));
  const nuevaEmpezada = Boolean(
    nueva.obraId || nueva.empleadoIds.length || nueva.tarea || nueva.cantidad || nueva.encuentro
  );

  // ── Exportacion como imagen PNG para WhatsApp ────────────────────────────
  const avisoTimer = useRef(null);
  const avisar = (siguiente, segundos = 8) => {
    clearTimeout(avisoTimer.current);
    setAviso(siguiente);
    if (siguiente && segundos) avisoTimer.current = setTimeout(() => setAviso(null), segundos * 1000);
  };

  const generarImagen = async () => {
    const { default: html2canvas } = await import("html2canvas");
    const lienzo = await html2canvas(hojaRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      windowWidth: 1400,
      onclone: (doc, copia) => {
        copia.classList.add("hor-planilla--imagen");
        doc.body.appendChild(copia);
        const tabla = copia.querySelector("table");
        if (tabla && tabla.scrollWidth > copia.clientWidth) {
          copia.style.width = `${tabla.scrollWidth + 2}px`;
        }
      },
    });
    const blob = await new Promise((ok) => lienzo.toBlob(ok, "image/png"));
    if (!blob) throw new Error("No se pudo generar la imagen.");
    return new File([blob], `programacion-${fecha}.png`, { type: "image/png" });
  };

  const bajar = (archivo) => {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = archivo.name;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const conImagen = async (accion) => {
    if (!hojaRef.current || ocupado) return;
    setOcupado(true);
    setPendiente(null);
    avisar(null);
    try {
      await accion(await generarImagen());
    } catch {
      avisar({ tono: "error", texto: "No se pudo generar la imagen. Intenta de nuevo." });
    } finally {
      setOcupado(false);
    }
  };

  const abrirMenuCompartir = async (archivo) => {
    try {
      await navigator.share({ files: [archivo], title: `Programación · ${fechaTexto}` });
      setPendiente(null);
      avisar(null);
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (error?.name === "NotAllowedError") {
        setPendiente(archivo);
        avisar({ tono: "ok", texto: "La imagen ya está lista. Toca «Compartir ahora»." }, 0);
        return;
      }
      bajar(archivo);
      avisar({ tono: "ok", texto: "Imagen descargada: adjúntala en el grupo de WhatsApp." }, 12);
    }
  };

  const enviarPorWhatsApp = () => conImagen(async (archivo) => {
    if (puedeCompartir) {
      await abrirMenuCompartir(archivo);
      return;
    }
    await copiarParaPegar(archivo);
  });

  const copiarImagen = () => conImagen((archivo) => copiarParaPegar(archivo));

  const copiarParaPegar = async (archivo) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": archivo })]);
      avisar({
        tono: "ok",
        texto: "Imagen copiada. Abre el grupo en WhatsApp y pégala con Ctrl+V.",
        enlace: "https://web.whatsapp.com/",
        textoEnlace: "Abrir WhatsApp Web",
      }, 60);
    } catch {
      bajar(archivo);
      avisar({
        tono: "ok",
        texto: "Imagen descargada: adjúntala en el grupo de WhatsApp.",
        enlace: "https://web.whatsapp.com/",
        textoEnlace: "Abrir WhatsApp Web",
      }, 60);
    }
  };

  const descargarImagen = () => conImagen(async (archivo) => {
    bajar(archivo);
    avisar({ tono: "ok", texto: "Imagen descargada." });
  });

  // Cabecera compartida de la hoja (se usa en pantalla y en el espejo de exportacion)
  const renderCabecera = (esSoloImagen = false) => (
    <div className="hor-head">
      <div className="hor-head__top">
        <div className="hor-head__marca">
          <span className="hor-head__punto" aria-hidden="true" />
          <h2 className="hor-head__titulo">Actividades y clientes</h2>
          {!esSoloImagen && (
            <span className="hor-head__cuenta" data-html2canvas-ignore="true">
              {dia.length} turno{dia.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {!esSoloImagen && accionesCabecera && (
          <div className="hor-head__acciones" data-html2canvas-ignore="true">
            {accionesCabecera}
          </div>
        )}
      </div>

      <div className="hor-nav">
        <div className="hor-nav__grupo">
          {!esSoloImagen && onCambiarFecha && (
            <button
              type="button"
              className="ui-hor-flecha"
              data-html2canvas-ignore="true"
              title="Día anterior"
              aria-label="Día anterior"
              onClick={() => onCambiarFecha(sumarDias(fecha, -1))}
            >
              <Icono nombre="flechaIzq" size={16} />
            </button>
          )}
          <BotonFecha
            fecha={fecha}
            onCambiar={esSoloImagen ? null : onCambiarFecha}
            soloImagen={esSoloImagen}
            className="ui-hor-picker--fecha-head"
            titulo="Elegir otro día"
          >
            {!esSoloImagen && <Icono nombre="calendario" size={14} style={{ color: "#2a3b8f" }} />}
            <span>{fechaTexto}</span>
          </BotonFecha>
          {!esSoloImagen && onCambiarFecha && (
            <button
              type="button"
              className="ui-hor-flecha"
              data-html2canvas-ignore="true"
              title="Día siguiente"
              aria-label="Día siguiente"
              onClick={() => onCambiarFecha(sumarDias(fecha, 1))}
            >
              <Icono nombre="flechaDer" size={16} />
            </button>
          )}
        </div>

        {!esSoloImagen && (onCambiarFecha || isMobile) && (
          <div className="hor-nav__atajos" data-html2canvas-ignore="true">
            {onCambiarFecha && (
              <div className="hor-nav__seg" role="group" aria-label="Atajos de fecha">
                <button
                  type="button"
                  className={`ui-hor-chip${fecha === hoy ? " ui-hor-chip--activo" : ""}`}
                  onClick={() => onCambiarFecha(hoy)}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className={`ui-hor-chip${fecha === manana ? " ui-hor-chip--activo" : ""}`}
                  onClick={() => onCambiarFecha(manana)}
                >
                  Mañana
                </button>
              </div>
            )}
            {isMobile && (
              <div className="ui-seg" role="tablist" aria-label="Vista de la planilla">
                <button
                  type="button"
                  role="tab"
                  className="ui-seg__op"
                  aria-selected={vistaMovil === "tarjetas"}
                  onClick={() => setVistaMovil("tarjetas")}
                >
                  Tarjetas
                </button>
                <button
                  type="button"
                  role="tab"
                  className="ui-seg__op"
                  aria-selected={vistaMovil === "tabla"}
                  onClick={() => setVistaMovil("tabla")}
                >
                  Tabla
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Tabla completa (editable en escritorio / tabla movil, o limpia en espejo de exportacion)
  const renderTabla = (esSoloImagen = false) => {
    const permiteEditar = editable && !esSoloImagen;
    return (
      <div className={esSoloImagen ? undefined : "hor-marco-tabla"}>
        <table className="hor-tabla">
          <colgroup>
            <col style={{ width: "17%" }} />
            <col style={{ width: "18%", minWidth: 160 }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Clientes</th>
              <th>Actividad</th>
              <th className="hor-col-centro">Cantidades</th>
              <th>Trabajadores</th>
              <th>Dirección</th>
              <th className="hor-col-centro">Fecha y hora</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.obraId} className="hor-fila-datos">
                <td>
                  <span className="hor-cliente">{f.cliente}</span>
                  {f.proyecto && <span className="hor-proyecto">{f.proyecto}</span>}
                  {permiteEditar && (
                    <button
                      type="button"
                      className="ui-hor-x ui-hor-x--fila"
                      data-html2canvas-ignore="true"
                      title="Quitar esta obra de la planilla"
                      aria-label={`Quitar la fila de ${f.cliente}`}
                      onClick={() => onQuitarFila(f.obraId)}
                    >
                      ×
                    </button>
                  )}
                </td>
                <td>
                  {permiteEditar ? (
                    <CeldaTexto
                      etiqueta="Actividad"
                      valor={f.tarea}
                      mostrar={f.tareaTexto}
                      placeholder="Escribir actividad"
                      lista="hor-planilla-tareas"
                      onGuardar={(v) => onEditarFila(f.obraId, { tarea: v })}
                    />
                  ) : (f.tareaTexto || <span className="hor-vacio">—</span>)}
                </td>
                <td className="hor-col-centro">
                  {permiteEditar ? (
                    <CeldaTexto
                      etiqueta="Cantidad"
                      valor={f.cantidad}
                      mostrar={f.cantidadTexto}
                      placeholder="—"
                      maxLength={40}
                      claseTexto={/^\d+$/.test(f.cantidadTexto) ? "hor-cifra" : undefined}
                      onGuardar={(v) => onEditarFila(f.obraId, { cantidad: v })}
                    />
                  ) : f.cantidadTexto ? (
                    <span className={/^\d+$/.test(f.cantidadTexto) ? "hor-cifra" : undefined}>{f.cantidadTexto}</span>
                  ) : (
                    <span className="hor-vacio">—</span>
                  )}
                </td>
                <td>
                  <div className="hor-trabs-lista">
                    {f.trabajadores.map((t) => (
                      <span key={t.id} className="hor-trab-chip">
                        <span className="hor-trab-chip__nombre">{t.etiqueta}</span>
                        {permiteEditar && (
                          <button
                            type="button"
                            className="ui-hor-x"
                            data-html2canvas-ignore="true"
                            title="Quitar de esta fila"
                            aria-label={`Quitar a ${t.etiqueta} de ${f.cliente}`}
                            onClick={() => onQuitarTrabajador(f.obraId, t.id)}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {permiteEditar && (
                      <div style={{ marginTop: 4 }} data-html2canvas-ignore="true">
                        <AgregarTrabajador
                          empleados={empleados}
                          yaEstan={f.trabajadores.map((t) => t.id)}
                          equipo={equipoDe(f.obraId)}
                          ocupados={ocupadosFuera(f.obraId)}
                          onAgregar={(ids) => onAgregarTrabajadores(f.obraId, ids)}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <span className="hor-direccion">{f.direccion || <span className="hor-vacio">—</span>}</span>
                </td>
                <td className="hor-col-centro">
                  <div className="hor-fecha-bloque">
                    <span className="hor-fecha-texto">{fechaTexto}</span>
                    {permiteEditar ? (
                      <CeldaTexto
                        enLinea
                        etiqueta="Punto de encuentro"
                        valor={f.encuentro}
                        mostrar={f.encuentroTexto}
                        placeholder={ENCUENTRO_POR_DEFECTO}
                        lista="hor-planilla-encuentros"
                        maxLength={60}
                        claseTexto="hor-encuentro-texto"
                        icono={<Icono nombre="ubicacion" size={13} />}
                        onGuardar={(v) => onEditarFila(f.obraId, { encuentro: normalizarEncuentro(v) })}
                      />
                    ) : (
                      <span className="hor-encuentro-texto">{f.encuentroTexto}</span>
                    )}
                    <div className="hor-acciones-fecha">
                      <BotonHora
                        inicio={f.inicio}
                        mostrar={f.inicioTexto}
                        editable={permiteEditar}
                        onGuardar={(v) => onEditarFila(f.obraId, { inicio: v })}
                      />
                      {permiteEditar && onMoverFila && (
                        <span data-html2canvas-ignore="true">
                          <BotonFecha
                            fecha={fecha}
                            onCambiar={(iso) => onMoverFila(f.obraId, iso)}
                            className="ui-hor-picker--fecha"
                            titulo="Mover esta fila a otra fecha"
                          >
                            <Icono nombre="calendario" size={13} />
                            <span>Cambiar fecha</span>
                          </BotonFecha>
                        </span>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}

            {/* Fila para agregar un cliente nuevo (no aparece en la imagen exportada) */}
            {permiteEditar && (
              <tr className="hor-fila-nueva" data-html2canvas-ignore="true">
                <td>
                  {obraNueva ? (
                    <>
                      <span className="hor-cliente">{limpio(obraNueva.cliente) || obraNueva.id}</span>
                      {obraNueva.proyecto && obraNueva.proyecto !== obraNueva.cliente && (
                        <span className="hor-proyecto">{limpio(obraNueva.proyecto)}</span>
                      )}
                    </>
                  ) : obrasLibres.length ? (
                    <span className="ui-hor-picker ui-hor-picker--select">
                      <Icono nombre="mas" size={13} />
                      <span>Agregar cliente</span>
                      <Icono nombre="flechaAbajo" size={12} style={{ opacity: 0.6 }} />
                      <select
                        className="hor-native-overlay"
                        aria-label="Agregar cliente a la planilla"
                        value=""
                        onChange={(e) => e.target.value && cambiarNueva({ obraId: e.target.value })}
                      >
                        <option value="">＋ Agregar cliente</option>
                        {obrasLibres.map((o) => (
                          <option key={o.id} value={o.id}>
                            {limpio(o.cliente) || o.id}
                            {o.proyecto && o.proyecto !== o.cliente ? ` · ${o.proyecto}` : ""}
                          </option>
                        ))}
                      </select>
                    </span>
                  ) : (
                    <span className="hor-pista hor-pista--suave" style={{ marginTop: 0 }}>
                      {obras.length ? "Todas las obras ya están en la hoja" : "Crea primero la obra"}
                    </span>
                  )}
                  {nuevaEmpezada && (
                    <button
                      type="button"
                      className="ui-hor-x ui-hor-x--fila"
                      title="Limpiar fila nueva"
                      aria-label="Descartar la fila nueva"
                      onClick={() => setNueva(FILA_NUEVA)}
                    >
                      ×
                    </button>
                  )}
                </td>
                <td>
                  <CeldaTexto
                    etiqueta="Actividad"
                    valor={nueva.tarea}
                    placeholder="Escribir actividad"
                    lista="hor-planilla-tareas"
                    onGuardar={(v) => cambiarNueva({ tarea: v })}
                  />
                </td>
                <td className="hor-col-centro">
                  <CeldaTexto
                    etiqueta="Cantidad"
                    valor={nueva.cantidad}
                    placeholder="—"
                    maxLength={40}
                    claseTexto={/^\d+$/.test(nueva.cantidad) ? "hor-cifra" : undefined}
                    onGuardar={(v) => cambiarNueva({ cantidad: v })}
                  />
                </td>
                <td>
                  <div className="hor-trabs-lista">
                    {nueva.empleadoIds.map((id) => {
                      const e = empleados.find((x) => x.id === id);
                      return (
                        <span key={id} className="hor-trab-chip">
                          <span className="hor-trab-chip__nombre">{etiquetaTrabajador(e)}</span>
                          <button
                            type="button"
                            className="ui-hor-x"
                            title="Quitar"
                            aria-label={`Quitar a ${limpio(e?.nombre)}`}
                            onClick={() => cambiarNueva({ empleadoIds: nueva.empleadoIds.filter((x) => x !== id) })}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                    <AgregarTrabajador
                      empleados={empleados}
                      yaEstan={nueva.empleadoIds}
                      equipo={equipoDe(nueva.obraId)}
                      ocupados={ocupadosFuera(nueva.obraId)}
                      onAgregar={(ids) => cambiarNueva({ empleadoIds: [...nueva.empleadoIds, ...ids] })}
                    />
                  </div>
                  {nueva.obraId && !nueva.empleadoIds.length && (
                    <span className="hor-pista">Agrega un trabajador para guardar</span>
                  )}
                  {!nueva.obraId && nueva.empleadoIds.length > 0 && (
                    <span className="hor-pista">Elige el cliente para guardar</span>
                  )}
                </td>
                <td>
                  {obraNueva ? (
                    <span className="hor-direccion">{direccionDe(obraNueva) || "—"}</span>
                  ) : (
                    <span className="hor-pista hor-pista--suave" style={{ marginTop: 0 }}>
                      Se completa al elegir cliente
                    </span>
                  )}
                </td>
                <td className="hor-col-centro">
                  <div className="hor-fecha-bloque">
                    <span className="hor-fecha-texto">{fechaTexto}</span>
                    <CeldaTexto
                      enLinea
                      etiqueta="Punto de encuentro"
                      valor={nueva.encuentro}
                      mostrar={nueva.encuentro || ENCUENTRO_POR_DEFECTO}
                      placeholder={ENCUENTRO_POR_DEFECTO}
                      lista="hor-planilla-encuentros"
                      maxLength={60}
                      claseTexto="hor-encuentro-texto"
                      icono={<Icono nombre="ubicacion" size={13} />}
                      onGuardar={(v) => cambiarNueva({ encuentro: normalizarEncuentro(v) })}
                    />
                    <div className="hor-acciones-fecha">
                      <BotonHora
                        inicio={nueva.inicio}
                        mostrar={hora12(nueva.inicio)}
                        editable
                        onGuardar={(v) => cambiarNueva({ inicio: v })}
                      />
                      {onCambiarFecha && (
                        <BotonFecha
                          fecha={fecha}
                          onCambiar={onCambiarFecha}
                          className="ui-hor-picker--fecha"
                          titulo="Elegir fecha de la hoja"
                        >
                          <Icono nombre="calendario" size={13} />
                          <span>Elegir fecha</span>
                        </BotonFecha>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {filas.length === 0 && (
              <tr>
                <td colSpan={6} className="hor-sin-datos">
                  Sin actividades programadas para este día
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Vista Tarjetas Apple para celular (cero scroll horizontal, botones tactiles 44px)
  const renderTarjetasMovil = () => (
    <div className="hor-cards">
      {filas.map((f) => (
        <div key={f.obraId} className="hor-card">
          <div className="hor-card__head">
            <div style={{ minWidth: 0, flex: 1 }}>
              <span className="hor-cliente" style={{ fontSize: 15.5 }}>{f.cliente}</span>
              {f.proyecto && <span className="hor-proyecto">{f.proyecto}</span>}
              {f.direccion && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, color: "var(--text-tertiary)", fontSize: 12.5 }}>
                  <Icono nombre="ubicacion" size={13} />
                  <span>{f.direccion}</span>
                </div>
              )}
            </div>
            {editable && (
              <Button
                variante="destructive"
                tam="sm"
                soloIcono
                icono="papelera"
                aria-label={`Quitar la fila de ${f.cliente}`}
                title="Quitar esta obra del día"
                onClick={() => onQuitarFila(f.obraId)}
              />
            )}
          </div>

          <div className="hor-card__grid2">
            <div>
              <div className="hor-card__label">Actividad</div>
              {f.tarea === null ? (
                <div style={{ fontSize: 14, color: "var(--text-primary)", padding: "8px 0" }} title={VARIA}>
                  {f.tareaTexto || "—"}
                </div>
              ) : (
                <CampoTarjeta
                  etiqueta="Actividad"
                  valor={f.tarea}
                  placeholder="Escribir actividad"
                  lista="hor-planilla-tareas"
                  onGuardar={(v) => onEditarFila(f.obraId, { tarea: v })}
                />
              )}
            </div>
            <div>
              <div className="hor-card__label">Cant.</div>
              {f.cantidad === null ? (
                <div style={{ fontSize: 16, fontWeight: 700, padding: "8px 0" }} title={VARIA}>
                  {f.cantidadTexto || "—"}
                </div>
              ) : (
                <CampoTarjeta
                  etiqueta="Cantidad"
                  valor={f.cantidad}
                  placeholder="—"
                  maxLength={40}
                  onGuardar={(v) => onEditarFila(f.obraId, { cantidad: v })}
                />
              )}
            </div>
          </div>

          <div>
            <div className="hor-card__label">Trabajadores ({f.trabajadores.length})</div>
            <div className="hor-card__chips">
              {f.trabajadores.map((t) => (
                <span key={t.id} className="hor-trab-chip">
                  <span>{t.etiqueta}</span>
                  {editable && (
                    <button
                      type="button"
                      className="ui-hor-x"
                      title="Quitar trabajador"
                      aria-label={`Quitar a ${t.etiqueta}`}
                      onClick={() => onQuitarTrabajador(f.obraId, t.id)}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            {editable && (
              <AgregarTrabajador
                fullWidth
                empleados={empleados}
                yaEstan={f.trabajadores.map((t) => t.id)}
                equipo={equipoDe(f.obraId)}
                ocupados={ocupadosFuera(f.obraId)}
                onAgregar={(ids) => onAgregarTrabajadores(f.obraId, ids)}
              />
            )}
          </div>

          <div className="hor-card__panel">
            <div className="hor-card__label" style={{ marginBottom: 0 }}>Punto de encuentro</div>
            {f.encuentro === null ? (
              <div style={{ fontSize: 13.5, color: "var(--text-secondary)" }} title={VARIA}>
                {f.encuentroTexto}
              </div>
            ) : (
              <CampoTarjeta
                etiqueta="Punto de encuentro"
                valor={f.encuentro || ""}
                placeholder={ENCUENTRO_POR_DEFECTO}
                lista="hor-planilla-encuentros"
                maxLength={60}
                onGuardar={(v) => onEditarFila(f.obraId, { encuentro: normalizarEncuentro(v) })}
              />
            )}
            <div className="hor-card__pickers">
              <BotonHora
                inicio={f.inicio}
                mostrar={f.inicioTexto}
                editable={editable}
                onGuardar={(v) => onEditarFila(f.obraId, { inicio: v })}
              />
              {editable && onMoverFila && (
                <BotonFecha
                  fecha={fecha}
                  onCambiar={(iso) => onMoverFila(f.obraId, iso)}
                  className="ui-hor-picker--fecha"
                  titulo="Mover a otra fecha"
                >
                  <Icono nombre="calendario" size={14} />
                  <span>Cambiar fecha</span>
                </BotonFecha>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Tarjeta para agregar una nueva obra / cliente */}
      {editable && (
        <div className="hor-card hor-card--nueva">
          <div className="hor-card__head">
            <div>
              <div className="hor-card__label" style={{ color: "#2a3b8f", marginBottom: 2 }}>
                + Nueva fila en la planilla
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>
                Elige cliente y trabajador; se guarda sola.
              </div>
            </div>
            {nuevaEmpezada && (
              <Button variante="texto" tam="sm" onClick={() => setNueva(FILA_NUEVA)}>
                Limpiar
              </Button>
            )}
          </div>

          <div>
            <div className="hor-card__label">Cliente / obra</div>
            {obraNueva ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderRadius: 12, background: "var(--fill)" }}>
                <div style={{ minWidth: 0 }}>
                  <span className="hor-cliente">{limpio(obraNueva.cliente) || obraNueva.id}</span>
                  {obraNueva.proyecto && obraNueva.proyecto !== obraNueva.cliente && (
                    <span className="hor-proyecto">{limpio(obraNueva.proyecto)}</span>
                  )}
                  {direccionDe(obraNueva) && (
                    <span className="hor-proyecto">{direccionDe(obraNueva)}</span>
                  )}
                </div>
                <Button variante="texto" tam="sm" onClick={() => setNueva((prev) => ({ ...prev, obraId: "" }))}>
                  Cambiar
                </Button>
              </div>
            ) : obrasLibres.length ? (
              <span className="ui-hor-picker ui-hor-picker--select ui-hor-picker--bloque">
                <Icono nombre="mas" size={14} />
                <span>Agregar cliente</span>
                <Icono nombre="flechaAbajo" size={13} style={{ opacity: 0.6 }} />
                <select
                  className="hor-native-overlay"
                  aria-label="Agregar cliente a la planilla"
                  value=""
                  onChange={(e) => e.target.value && cambiarNueva({ obraId: e.target.value })}
                >
                  <option value="">＋ Agregar cliente</option>
                  {obrasLibres.map((o) => (
                    <option key={o.id} value={o.id}>
                      {limpio(o.cliente) || o.id}
                      {o.proyecto && o.proyecto !== o.cliente ? ` · ${o.proyecto}` : ""}
                    </option>
                  ))}
                </select>
              </span>
            ) : (
              <span className="hor-pista hor-pista--suave" style={{ marginTop: 0 }}>
                {obras.length ? "Todas las obras ya están en la hoja" : "Crea primero la obra"}
              </span>
            )}
          </div>

          <div className="hor-card__grid2">
            <div>
              <div className="hor-card__label">Actividad</div>
              <CampoTarjeta
                etiqueta="Actividad"
                valor={nueva.tarea}
                placeholder="Escribir actividad"
                lista="hor-planilla-tareas"
                onGuardar={(v) => cambiarNueva({ tarea: v })}
              />
            </div>
            <div>
              <div className="hor-card__label">Cant.</div>
              <CampoTarjeta
                etiqueta="Cantidad"
                valor={nueva.cantidad}
                placeholder="—"
                maxLength={40}
                onGuardar={(v) => cambiarNueva({ cantidad: v })}
              />
            </div>
          </div>

          <div>
            <div className="hor-card__label">Trabajadores</div>
            {nueva.empleadoIds.length > 0 && (
              <div className="hor-card__chips">
                {nueva.empleadoIds.map((id) => {
                  const e = empleados.find((x) => x.id === id);
                  return (
                    <span key={id} className="hor-trab-chip">
                      <span>{etiquetaTrabajador(e)}</span>
                      <button
                        type="button"
                        className="ui-hor-x"
                        title="Quitar"
                        aria-label={`Quitar a ${limpio(e?.nombre)}`}
                        onClick={() => cambiarNueva({ empleadoIds: nueva.empleadoIds.filter((x) => x !== id) })}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <AgregarTrabajador
              fullWidth
              empleados={empleados}
              yaEstan={nueva.empleadoIds}
              equipo={equipoDe(nueva.obraId)}
              ocupados={ocupadosFuera(nueva.obraId)}
              onAgregar={(ids) => cambiarNueva({ empleadoIds: [...nueva.empleadoIds, ...ids] })}
            />
            {nueva.obraId && !nueva.empleadoIds.length && (
              <span className="hor-pista">Agrega al menos un trabajador para guardar</span>
            )}
            {!nueva.obraId && nueva.empleadoIds.length > 0 && (
              <span className="hor-pista">Elige el cliente para guardar</span>
            )}
          </div>

          <div className="hor-card__panel">
            <div className="hor-card__label" style={{ marginBottom: 0 }}>Punto de encuentro, hora y fecha</div>
            <CampoTarjeta
              etiqueta="Punto de encuentro"
              valor={nueva.encuentro}
              placeholder={ENCUENTRO_POR_DEFECTO}
              lista="hor-planilla-encuentros"
              maxLength={60}
              onGuardar={(v) => cambiarNueva({ encuentro: normalizarEncuentro(v) })}
            />
            <div className="hor-card__pickers">
              <BotonHora
                inicio={nueva.inicio}
                mostrar={hora12(nueva.inicio)}
                editable
                onGuardar={(v) => cambiarNueva({ inicio: v })}
              />
              {onCambiarFecha && (
                <BotonFecha
                  fecha={fecha}
                  onCambiar={onCambiarFecha}
                  className="ui-hor-picker--fecha"
                  titulo="Elegir fecha de la hoja"
                >
                  <Icono nombre="calendario" size={14} />
                  <span>Elegir fecha</span>
                </BotonFecha>
              )}
            </div>
          </div>
        </div>
      )}

      {filas.length === 0 && (
        <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-tertiary)", padding: "4px 8px 8px" }}>
          Sin actividades programadas para este día
        </div>
      )}
    </div>
  );

  return (
    <div>
      <style>{ESTILOS_PLANILLA}</style>

      {/* Tarjeta principal en pantalla (doc-shell mantiene la hoja clara como documento) */}
      <div ref={mostrarTarjetas ? undefined : hojaRef} className="hor-shell doc-shell">
        {renderCabecera(false)}
        {mostrarTarjetas ? renderTarjetasMovil() : renderTabla(false)}

        <datalist id="hor-planilla-tareas">
          {tareasSugeridas.map((t) => <option key={t} value={t} />)}
        </datalist>
        <datalist id="hor-planilla-encuentros">
          <option value="Salida desde la oficina" />
          <option value="Llegada a la obra" />
        </datalist>

        <div className="hor-pie" data-html2canvas-ignore="true">
          <div className="hor-pie__acciones">
            {filas.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                {mostrarTarjetas
                  ? "Elige un cliente y un trabajador arriba · Todo se guarda solo."
                  : "Haz clic en cualquier celda para escribir · Los cambios se guardan solos."}
              </span>
            ) : pendiente ? (
              <Button variante="primary" icono="compartir" onClick={() => abrirMenuCompartir(pendiente)}>
                Compartir ahora
              </Button>
            ) : (
              <>
                <Button variante="primary" icono="enviar" onClick={enviarPorWhatsApp} disabled={ocupado}>
                  {ocupado ? "Generando imagen…" : "Enviar por WhatsApp"}
                </Button>
                <Button
                  variante="secondary"
                  icono="documento"
                  onClick={copiarImagen}
                  disabled={ocupado}
                  title="Copia la imagen para pegarla en WhatsApp Web con Ctrl+V"
                >
                  Copiar imagen
                </Button>
                <Button variante="texto" icono="descargar" onClick={descargarImagen} disabled={ocupado}>
                  Descargar
                </Button>
                {onAbrirTextoGrupo && (
                  <Button
                    variante="texto"
                    icono="lista"
                    onClick={onAbrirTextoGrupo}
                    title="Copia el horario en texto para pegarlo en el grupo"
                  >
                    Texto para grupo
                  </Button>
                )}
              </>
            )}
          </div>

          {aviso && (
            <span
              role="status"
              style={{ fontSize: 13, color: aviso.tono === "error" ? "var(--danger-text)" : "var(--success-text)" }}
            >
              {aviso.texto}
              {aviso.enlace && (
                <>
                  {" "}
                  <a
                    href={aviso.enlace}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 600, color: "inherit", textDecoration: "underline" }}
                  >
                    {aviso.textoEnlace}
                  </a>
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Espejo oculto para exportar tabla horizontal nitida cuando el celular esta en vista Tarjetas */}
      {mostrarTarjetas && filas.length > 0 && (
        <div className="hor-export-offscreen" aria-hidden="true">
          <div ref={hojaRef} className="hor-shell doc-shell">
            {renderCabecera(true)}
            {renderTabla(true)}
          </div>
        </div>
      )}
    </div>
  );
}

// Vista previa en vivo de la imagen exacta que saldra para WhatsApp (solo del dia seleccionado).
export function VistaPreviaImagenDia({ fecha, dia, obras, empleados }) {
  const filas = filasDeLaPlanilla(dia, obras, empleados);
  const fechaTexto = fechaLarga(fecha);
  const marcoRef = useRef(null);
  const hojaRef = useRef(null);
  const [medida, setMedida] = useState({ escala: 0.4, alto: 220 });
  const [ampliada, setAmpliada] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [pendiente, setPendiente] = useState(null);
  const [puedeCompartir] = useState(puedeCompartirArchivos);
  const avisoTimer = useRef(null);

  useEffect(() => {
    const marco = marcoRef.current;
    const hoja = hojaRef.current;
    if (!marco || !hoja) return undefined;
    const recalcular = () => {
      const ancho = marco.clientWidth || 420;
      const escala = Math.min(1, ancho / 1120);
      const altoHoja = hoja.offsetHeight || 260;
      setMedida({ escala, alto: Math.max(120, Math.ceil(altoHoja * escala)) });
    };
    recalcular();
    if (typeof ResizeObserver === "undefined") return undefined;
    const obs = new ResizeObserver(recalcular);
    obs.observe(marco);
    obs.observe(hoja);
    return () => obs.disconnect();
  }, [filas.length, fecha, dia]);

  const avisar = (siguiente, segundos = 8) => {
    clearTimeout(avisoTimer.current);
    setAviso(siguiente);
    if (siguiente && segundos) avisoTimer.current = setTimeout(() => setAviso(null), segundos * 1000);
  };

  const generarImagen = async () => {
    const { default: html2canvas } = await import("html2canvas");
    const lienzo = await html2canvas(hojaRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      windowWidth: 1400,
      onclone: (doc, copia) => {
        copia.classList.remove("hor-planilla--preview");
        copia.classList.add("hor-planilla--imagen");
        doc.body.appendChild(copia);
        const tabla = copia.querySelector("table");
        if (tabla && tabla.scrollWidth > copia.clientWidth) {
          copia.style.width = `${tabla.scrollWidth + 2}px`;
        }
      },
    });
    const blob = await new Promise((ok) => lienzo.toBlob(ok, "image/png"));
    if (!blob) throw new Error("No se pudo generar la imagen.");
    return new File([blob], `programacion-${fecha}.png`, { type: "image/png" });
  };

  const bajar = (archivo) => {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = archivo.name;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const conImagen = async (accion) => {
    if (!hojaRef.current || ocupado) return;
    setOcupado(true);
    setPendiente(null);
    avisar(null);
    try {
      await accion(await generarImagen());
    } catch {
      avisar({ tono: "error", texto: "No se pudo generar la imagen. Intenta de nuevo." });
    } finally {
      setOcupado(false);
    }
  };

  const abrirMenuCompartir = async (archivo) => {
    try {
      await navigator.share({ files: [archivo], title: `Programación · ${fechaTexto}` });
      setPendiente(null);
      avisar(null);
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (error?.name === "NotAllowedError") {
        setPendiente(archivo);
        avisar({ tono: "ok", texto: "La imagen ya está lista. Toca «Compartir ahora»." }, 0);
        return;
      }
      bajar(archivo);
      avisar({ tono: "ok", texto: "Imagen descargada: adjúntala en el grupo de WhatsApp." }, 12);
    }
  };

  const copiarParaPegar = async (archivo) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": archivo })]);
      avisar({ tono: "ok", texto: "Imagen copiada. Pégala en WhatsApp con Ctrl+V." }, 10);
    } catch {
      bajar(archivo);
      avisar({ tono: "ok", texto: "Imagen descargada: adjúntala en el grupo de WhatsApp." }, 10);
    }
  };

  const enviarPorWhatsApp = () => conImagen(async (archivo) => {
    if (puedeCompartir) { await abrirMenuCompartir(archivo); return; }
    await copiarParaPegar(archivo);
  });
  const descargarImagen = () => conImagen(async (archivo) => {
    bajar(archivo);
    avisar({ tono: "ok", texto: "Imagen descargada." });
  });

  if (filas.length === 0) {
    return (
      <EmptyState
        icono="camara"
        titulo="Sin imagen para este día"
        texto="Cuando agregues clientes y trabajadores arriba, aquí verás al instante la imagen exacta del horario de este día."
      />
    );
  }

  const hojaLimpia = (conRef) => (
    <div ref={conRef ? hojaRef : undefined} className="hor-shell doc-shell hor-planilla--imagen hor-planilla--preview">
      <div className="hor-head">
        <div className="hor-head__top">
          <div className="hor-head__marca">
            <h2 className="hor-head__titulo">Actividades y clientes</h2>
          </div>
        </div>
        <div className="hor-nav">
          <div className="hor-nav__grupo">
            <span className="ui-hor-picker ui-hor-picker--fecha-head" style={{ cursor: "default" }}>
              <Icono nombre="calendario" size={14} style={{ color: "#2a3b8f" }} />
              <span>{fechaTexto}</span>
            </span>
          </div>
        </div>
      </div>
      <table className="hor-tabla">
        <colgroup>
          <col style={{ width: "17%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "19%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Clientes</th>
            <th>Actividad</th>
            <th className="hor-col-centro">Cantidades</th>
            <th>Trabajadores</th>
            <th>Dirección</th>
            <th className="hor-col-centro">Fecha y hora</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.obraId} className="hor-fila-datos">
              <td>
                <span className="hor-cliente">{f.cliente}</span>
                {f.proyecto && <span className="hor-proyecto">{f.proyecto}</span>}
              </td>
              <td>{f.tareaTexto || <span className="hor-vacio">—</span>}</td>
              <td className="hor-col-centro">
                {f.cantidadTexto ? (
                  <span className={/^\d+$/.test(f.cantidadTexto) ? "hor-cifra" : undefined}>{f.cantidadTexto}</span>
                ) : (
                  <span className="hor-vacio">—</span>
                )}
              </td>
              <td>
                <div className="hor-trabs-lista">
                  {f.trabajadores.map((t) => (
                    <span key={t.id} className="hor-trab-chip">
                      <span className="hor-trab-chip__nombre">{t.etiqueta}</span>
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <span className="hor-direccion">{f.direccion || <span className="hor-vacio">—</span>}</span>
              </td>
              <td className="hor-col-centro">
                <div className="hor-fecha-bloque">
                  <span className="hor-fecha-texto">{fechaTexto}</span>
                  <span className="hor-encuentro-texto">{f.encuentroTexto}</span>
                  {f.inicioTexto && (
                    <span className="ui-hor-picker ui-hor-picker--hora" style={{ cursor: "default" }}>
                      <Icono nombre="reloj" size={13} />
                      <span>{f.inicioTexto}</span>
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div
        ref={marcoRef}
        role="button"
        tabIndex={0}
        className="hor-preview-marco"
        style={{ height: medida.alto }}
        title="Toca para ver la imagen en grande"
        aria-label="Ver imagen del horario en grande"
        onClick={() => setAmpliada(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAmpliada(true); } }}
      >
        <div
          className="hor-preview-marco__escala"
          style={{ transform: `scale(${medida.escala})` }}
        >
          {hojaLimpia(true)}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {pendiente ? (
            <Button variante="primary" tam="sm" icono="compartir" onClick={() => abrirMenuCompartir(pendiente)}>
              Compartir ahora
            </Button>
          ) : (
            <>
              <Button variante="primary" tam="sm" icono="enviar" onClick={enviarPorWhatsApp} disabled={ocupado}>
                {ocupado ? "Generando…" : "Enviar por WhatsApp"}
              </Button>
              <Button variante="secondary" tam="sm" icono="descargar" onClick={descargarImagen} disabled={ocupado}>
                Descargar
              </Button>
            </>
          )}
        </div>
        <Button variante="texto" tam="sm" icono="ojo" onClick={() => setAmpliada(true)}>
          Ver en grande
        </Button>
      </div>

      {aviso && (
        <div role="status" style={{ fontSize: 12.5, marginTop: 8, color: aviso.tono === "error" ? "var(--danger-text)" : "var(--success-text)" }}>
          {aviso.texto}
        </div>
      )}

      {ampliada && (
        <Sheet
          ancha
          titulo="Imagen del horario del día"
          subtitulo={fechaTexto}
          onCerrar={() => setAmpliada(false)}
          pie={
            <>
              <Button variante="secondary" onClick={() => setAmpliada(false)}>Cerrar</Button>
              <Button variante="secondary" icono="descargar" onClick={descargarImagen} disabled={ocupado}>
                Descargar PNG
              </Button>
              <Button variante="primary" icono="enviar" onClick={enviarPorWhatsApp} disabled={ocupado}>
                {ocupado ? "Generando…" : "Enviar por WhatsApp"}
              </Button>
            </>
          }
        >
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 12, border: "1px solid #d5dcef" }}>
            {hojaLimpia(false)}
          </div>
        </Sheet>
      )}
    </div>
  );
}
