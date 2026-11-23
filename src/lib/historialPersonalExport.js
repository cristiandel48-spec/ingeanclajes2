// Descarga del historial de personal en obras, en Excel y en PDF.
//
// Va aparte del calculo (historialPersonal.js) y se carga solo al pulsar el
// boton: JSZip y jsPDF pesan, y el historial se consulta de vez en cuando.

import { downloadGeneratedFile, sanitizeFileName } from "./download";
import { registrarInterEnPdf } from "./fuenteInter";
import {
  diaDeLaSemana,
  fechaCortaHistorial,
  fechaLargaHistorial,
  tituloPeriodoHistorial,
} from "./historialPersonal";
import { construirXlsx, TIPO_XLSX } from "./xlsxSimple";

const TITULO = "Historial de personal en obras";

const fechaDeHoy = (fecha) =>
  fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Bogota" });

// «Todo el personal · Todas las obras», o lo que se haya filtrado.
export const alcanceDelHistorial = (historial) =>
  [historial.soloPersona || "Todo el personal", historial.soloObra || "Todas las obras"].join(" · ");

export function nombreArchivoHistorial(historial, extension) {
  const periodo = historial.desde === historial.hasta ? historial.desde : `${historial.desde}_a_${historial.hasta}`;
  const persona = historial.soloPersona ? `${sanitizeFileName(historial.soloPersona)}-` : "";
  return `Historial-personal-${persona}${periodo}.${extension}`;
}

const enc = (v) => ({ v, s: "encabezado" });
const neg = (v) => ({ v, s: "negrita" });
const fec = (v) => ({ v, s: "fecha" });

/** Las hojas del libro, sin generar el archivo. */
export function hojasDelHistorial(historial, generadoEn = new Date()) {
  const cabecera = [
    [{ v: `${TITULO} — Ingeanclajes S.A.S.`, s: "titulo" }],
    [{ v: `Período: ${tituloPeriodoHistorial(historial.desde, historial.hasta)} · ${alcanceDelHistorial(historial)}`, s: "tenue" }],
    [{ v: `Generado el ${fechaDeHoy(generadoEn)} · ${historial.totales.personas} persona(s) · ${historial.totales.dias} día(s) con actividad · ${historial.totales.obras} obra(s)`, s: "tenue" }],
    [],
  ];

  // Donde estuvo cada persona, dia por dia. Una fila por asistencia, con el
  // nombre repetido en cada una para poder filtrar y ordenar en Excel.
  const porPersona = {
    nombre: "Por persona",
    anchos: [30, 20, 13, 12, 30, 28, 12, 38, 22, 36, 12],
    filasFijas: cabecera.length + 1,
    filas: [
      ...cabecera,
      ["Persona", "Cargo", "Fecha", "Día", "Cliente", "Obra", "Código", "Actividad", "Horario", "Dirección", "Cantidad"].map(enc),
      ...historial.porPersona.flatMap((p) => p.registros.map((r) => [
        r.persona, r.cargo, fec(r.fecha), r.dia, r.cliente, r.proyecto, r.obraId, r.actividad, r.horario, r.direccion, r.cantidad,
      ])),
    ],
  };

  // Que obras hubo cada dia y quien fue a cada una.
  const porDia = {
    nombre: "Por día",
    anchos: [13, 12, 30, 28, 12, 10, 60, 38, 22, 36],
    filasFijas: cabecera.length + 1,
    filas: [
      ...cabecera,
      ["Fecha", "Día", "Cliente", "Obra", "Código", "Personas", "Trabajadores", "Actividad", "Horario", "Dirección"].map(enc),
      ...historial.porDia.flatMap((d) => d.obras.map((o) => [
        fec(d.fecha), d.dia, o.cliente, o.proyecto, o.obraId, o.personas.length, o.personas.join(", "), o.actividad, o.horario, o.direccion,
      ])),
    ],
  };

  const resumen = {
    nombre: "Resumen",
    anchos: [30, 20, 16, 16, 80],
    filasFijas: cabecera.length + 1,
    filas: [
      ...cabecera,
      ["Persona", "Cargo", "Días trabajados", "Obras distintas", "Obras"].map(enc),
      ...historial.porPersona.map((p) => [p.persona, p.cargo, p.dias, p.obras, p.obrasTexto]),
      [neg("Total"), neg(""), neg(historial.totales.asistencias), neg(historial.totales.obras), neg("")],
    ],
  };

  return [porPersona, porDia, resumen];
}

export async function descargarHistorialExcel(historial, generadoEn = new Date()) {
  const blob = await construirXlsx(hojasDelHistorial(historial, generadoEn));
  downloadGeneratedFile(new File([blob], nombreArchivoHistorial(historial, "xlsx"), { type: TIPO_XLSX }));
}

// ── PDF ────────────────────────────────────────────────────────────────────
// Vectorial, con jsPDF, como el reporte de actividad: pesa unos pocos KB y el
// texto se puede seleccionar. Hoja carta apaisada, porque las filas son anchas.

const TINTA = [16, 24, 40];
const SUAVE = [71, 84, 103];
const TENUE = [152, 162, 179];
const LINEA = [234, 236, 240];
const RELLENO = [246, 247, 249];
const ACENTO = [224, 52, 42];

const ANCHO_HOJA = 792;
const ALTO_HOJA = 612;

/**
 * @param {object} historial        Lo que devuelve armarHistorial.
 * @param {"persona"|"dia"} vista   Como se agrupa: lo mismo que se ve en pantalla.
 */
export async function generarHistorialPdf(historial, vista = "persona", generadoEn = new Date()) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "landscape" });
  await registrarInterEnPdf(doc);

  const izq = 40;
  const der = ANCHO_HOJA - 40;
  const fondo = ALTO_HOJA - 56;

  const letra = (peso, tam, color) => {
    doc.setFont("Inter", peso);
    doc.setFontSize(tam);
    doc.setTextColor(...color);
  };
  const raya = (y, color = LINEA) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.6);
    doc.line(izq, y, der, y);
  };
  // Hasta `max` renglones; lo que no cabe termina en puntos suspensivos.
  const renglones = (texto, ancho, max = 2) => {
    const lineas = doc.splitTextToSize(String(texto || "—"), ancho);
    if (lineas.length <= max) return lineas;
    const recortadas = lineas.slice(0, max);
    recortadas[max - 1] = `${recortadas[max - 1].trimEnd()}…`;
    return recortadas;
  };

  // Columnas de cada vista: { titulo, x, ancho }.
  const columnas = vista === "dia"
    ? [
        { id: "obra", titulo: "Cliente / obra", x: izq, ancho: 190 },
        { id: "personas", titulo: "Trabajadores", x: izq + 200, ancho: 206 },
        { id: "actividad", titulo: "Actividad", x: izq + 416, ancho: 150 },
        { id: "direccion", titulo: "Dirección", x: izq + 576, ancho: der - (izq + 576) },
      ]
    : [
        { id: "fecha", titulo: "Fecha", x: izq, ancho: 62 },
        { id: "dia", titulo: "Día", x: izq + 68, ancho: 52 },
        { id: "obra", titulo: "Cliente / obra", x: izq + 126, ancho: 180 },
        { id: "actividad", titulo: "Actividad", x: izq + 316, ancho: 170 },
        { id: "horario", titulo: "Horario", x: izq + 496, ancho: 92 },
        { id: "direccion", titulo: "Dirección", x: izq + 598, ancho: der - (izq + 598) },
      ];

  let y = 0;

  const encabezadoTabla = () => {
    letra("bold", 7.5, TENUE);
    columnas.forEach((c) => doc.text(c.titulo.toUpperCase(), c.x, y));
    y += 7;
    raya(y);
    y += 3;
  };

  const hojaNueva = () => {
    doc.addPage("letter", "landscape");
    y = 56;
  };

  // ── Portada: titulo, periodo y las cuatro cifras del periodo ───────────
  letra("bold", 8, ACENTO);
  doc.text("INGEANCLAJES S.A.S.", izq, 52);
  letra("bold", 20, TINTA);
  doc.text(TITULO, izq, 78);
  letra("normal", 10, SUAVE);
  doc.text(`${tituloPeriodoHistorial(historial.desde, historial.hasta)} · ${alcanceDelHistorial(historial)}`, izq, 95);
  letra("normal", 9, TENUE);
  doc.text(`Generado el ${fechaDeHoy(generadoEn)}`, der, 95, { align: "right" });

  const cifras = [
    ["Personas", historial.totales.personas],
    ["Días con actividad", historial.totales.dias],
    ["Obras", historial.totales.obras],
    ["Asistencias", historial.totales.asistencias],
  ];
  const separacion = 10;
  const anchoTarjeta = (der - izq - separacion * (cifras.length - 1)) / cifras.length;
  cifras.forEach(([rotulo, valor], i) => {
    const x = izq + i * (anchoTarjeta + separacion);
    doc.setFillColor(...RELLENO);
    doc.roundedRect(x, 110, anchoTarjeta, 46, 8, 8, "F");
    letra("bold", 17, TINTA);
    doc.text(String(valor), x + 10, 132);
    letra("normal", 7.5, SUAVE);
    doc.text(rotulo, x + 10, 147);
  });
  y = 182;

  if (!historial.registros.length) {
    letra("normal", 10, SUAVE);
    doc.text("No hay personal programado en obras en este período.", izq, y);
  }

  // Titulo de un grupo (una persona o un dia) con su encabezado de columnas.
  const cabeceraGrupo = (titulo, detalle, continua) => {
    letra("bold", 11.5, TINTA);
    doc.text(`${titulo}${continua ? " (continuación)" : ""}`, izq, y);
    letra("normal", 8.5, TENUE);
    doc.text(detalle, der, y, { align: "right" });
    y += 14;
    encabezadoTabla();
  };

  // Una fila: cada celda con sus renglones; la fila mide lo que la mas alta.
  const dibujarFila = (celdas, grupo) => {
    const preparadas = columnas.map((c) => {
      const fuerte = c.id === "obra" || c.id === "fecha";
      // La letra se pone ANTES de partir el texto: jsPDF mide con la letra
      // activa, y una celda en negrita medida con la normal se pasaba de su
      // columna y pisaba la de al lado.
      letra(fuerte ? "bold" : "normal", 9, fuerte ? TINTA : SUAVE);
      return { ...c, fuerte, lineas: renglones(celdas[c.id], c.ancho, c.id === "personas" ? 6 : 2) };
    });
    const alto = 9 + Math.max(...preparadas.map((c) => c.lineas.length)) * 10.5;
    if (y + alto > fondo) {
      hojaNueva();
      cabeceraGrupo(grupo.titulo, grupo.detalle, true);
    }
    preparadas.forEach((c) => {
      letra(c.fuerte ? "bold" : "normal", 9, c.fuerte ? TINTA : SUAVE);
      doc.text(c.lineas, c.x, y + 11, { lineHeightFactor: 1.17 });
    });
    y += alto;
    raya(y);
  };

  const grupos = vista === "dia"
    ? historial.porDia.map((d) => ({
        titulo: `${d.dia} ${fechaLargaHistorial(d.fecha)}`,
        detalle: `${d.personas} persona${d.personas === 1 ? "" : "s"} · ${d.obras.length} obra${d.obras.length === 1 ? "" : "s"}`,
        filas: d.obras.map((o) => ({
          obra: o.obraId ? `${o.obraTexto} (${o.obraId})` : o.obraTexto,
          personas: o.personas.join(", "),
          actividad: o.actividad,
          direccion: o.direccion,
        })),
      }))
    : historial.porPersona.map((p) => ({
        titulo: p.cargo ? `${p.persona} · ${p.cargo}` : p.persona,
        detalle: `${p.dias} día${p.dias === 1 ? "" : "s"} · ${p.obras} obra${p.obras === 1 ? "" : "s"}`,
        filas: p.registros.map((r) => ({
          fecha: fechaCortaHistorial(r.fecha),
          dia: diaDeLaSemana(r.fecha),
          obra: r.obraId ? `${r.obraTexto} (${r.obraId})` : r.obraTexto,
          actividad: r.actividad,
          horario: r.horario,
          direccion: r.direccion,
        })),
      }));

  for (const grupo of grupos) {
    // El titulo de un grupo no se queda solo al pie de la hoja.
    if (y + 64 > fondo) hojaNueva();
    cabeceraGrupo(grupo.titulo, grupo.detalle, false);
    for (const fila of grupo.filas) dibujarFila(fila, grupo);
    y += 22;
  }

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p += 1) {
    doc.setPage(p);
    letra("normal", 8, TENUE);
    doc.text(`Ingeanclajes · ${TITULO} · ${vista === "dia" ? "por día" : "por persona"}`, izq, ALTO_HOJA - 30);
    doc.text(`Página ${p} de ${paginas}`, der, ALTO_HOJA - 30, { align: "right" });
  }

  return doc.output("blob");
}

export async function descargarHistorialPdf(historial, vista = "persona", generadoEn = new Date()) {
  const blob = await generarHistorialPdf(historial, vista, generadoEn);
  const nombre = nombreArchivoHistorial(historial, "pdf").replace(/^Historial-personal-/, `Historial-personal-${vista === "dia" ? "por-dia" : "por-persona"}-`);
  downloadGeneratedFile(new File([blob], nombre, { type: "application/pdf" }));
}
