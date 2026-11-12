// Descarga del reporte de actividad por usuario en Excel y en PDF.
//
// Va aparte del conteo (reporteActividad.js) y se carga solo al pulsar el
// boton: JSZip y jsPDF pesan, y casi nadie abre este reporte.

import { downloadGeneratedFile } from "./download";
import { registrarInterEnPdf } from "./fuenteInter";
import { construirXlsx, TIPO_XLSX } from "./xlsxSimple";
import { TIPOS_REPORTE, filasPorUsuarioYMes, tituloMes, tituloPeriodo } from "./reporteActividad";

const TITULO = "Reporte de actividad por usuario";

const fechaLarga = (fecha) =>
  fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Bogota" });

export function nombreArchivoReporte(reporte, extension) {
  const periodo = reporte.desde === reporte.hasta ? reporte.desde : `${reporte.desde}_a_${reporte.hasta}`;
  return `Reporte-actividad-${periodo}.${extension}`;
}

const enc = (v) => ({ v, s: "encabezado" });
const neg = (v) => ({ v, s: "negrita" });

/** Las hojas del libro, sin generar el archivo. */
export function hojasDelReporte(reporte, generadoEn = new Date()) {
  const etiquetas = TIPOS_REPORTE.map((t) => t.label);
  const cifras = (conteo) => [...TIPOS_REPORTE.map((t) => conteo[t.id] || 0), conteo.total || 0];
  const cabecera = [
    [{ v: TITULO, s: "titulo" }],
    [{ v: `Período: ${tituloPeriodo(reporte.desde, reporte.hasta)}`, s: "tenue" }],
    [{ v: `Generado el ${fechaLarga(generadoEn)}`, s: "tenue" }],
    [],
  ];

  const porMes = {
    nombre: "Por usuario y mes",
    anchos: [30, 18, 14, 24, 16, 20, 10],
    filasFijas: cabecera.length + 1,
    filas: [
      ...cabecera,
      ["Usuario", "Mes", ...etiquetas, "Total"].map(enc),
      ...filasPorUsuarioYMes(reporte).map((l) => [l.usuario, tituloMes(l.mes), ...cifras(l)]),
      [neg("Total"), neg(""), ...cifras(reporte.totales.general).map(neg)],
    ],
  };

  const porUsuario = {
    nombre: "Total por usuario",
    anchos: [30, 14, 24, 16, 20, 10],
    filasFijas: cabecera.length + 1,
    filas: [
      ...cabecera,
      ["Usuario", ...etiquetas, "Total"].map(enc),
      ...reporte.filas.map((f) => [f.usuario, ...cifras(f.totales)]),
      [neg("Total"), ...cifras(reporte.totales.general).map(neg)],
    ],
  };

  const detalle = {
    nombre: "Detalle",
    anchos: [24, 18, 46, 30, 13, 18],
    filasFijas: 1,
    filas: [
      ["Tipo", "Código", "Referencia", "Usuario", "Fecha", "Mes"].map(enc),
      ...reporte.detalle.map((d) => [d.tipoLabel, d.codigo, d.referencia, d.usuario, { v: d.fecha, s: "fecha" }, tituloMes(d.mes)]),
    ],
  };

  return [porMes, porUsuario, detalle];
}

export async function descargarReporteExcel(reporte, generadoEn = new Date()) {
  const blob = await construirXlsx(hojasDelReporte(reporte, generadoEn));
  downloadGeneratedFile(new File([blob], nombreArchivoReporte(reporte, "xlsx"), { type: TIPO_XLSX }));
}

// ── PDF ────────────────────────────────────────────────────────────────────
// Vectorial, con jsPDF, como la colilla de pago: pesa unos pocos KB, el texto
// se puede seleccionar y no depende de fotografiar la pantalla.

const TINTA = [16, 24, 40];
const SUAVE = [71, 84, 103];
const TENUE = [152, 162, 179];
const LINEA = [234, 236, 240];
const RELLENO = [246, 247, 249];
const ACENTO = [224, 52, 42];

export async function generarReportePdf(reporte, generadoEn = new Date()) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  await registrarInterEnPdf(doc);

  const izq = 48;
  const der = 612 - 48;
  const ancho = der - izq;
  const fondo = 792 - 64;
  // Borde derecho de cada columna de cifras.
  const columnas = [
    ...TIPOS_REPORTE.map((t, i) => ({ id: t.id, titulo: t.corto, x: [318, 376, 462, 512][i] })),
    { id: "total", titulo: "Total", x: der },
  ];

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

  let y = 0;

  const encabezadoTabla = () => {
    letra("bold", 7.5, TENUE);
    doc.text("USUARIO / MES", izq, y);
    columnas.forEach((c) => doc.text(c.titulo.toUpperCase(), c.x, y, { align: "right" }));
    y += 8;
    raya(y);
    y += 6;
  };

  const hojaNueva = () => {
    doc.addPage("letter", "portrait");
    y = 64;
    encabezadoTabla();
  };

  const cifras = (conteo, peso, color) => {
    columnas.forEach((c) => {
      const valor = conteo[c.id] || 0;
      // Un cero en gris: lo que importa en la hoja son las cifras que hay.
      letra(peso, 9.5, valor ? color : TENUE);
      doc.text(String(valor), c.x, y, { align: "right" });
    });
  };

  // Titulo
  letra("bold", 8, ACENTO);
  doc.text("INGEANCLAJES S.A.S.", izq, 64);
  letra("bold", 22, TINTA);
  doc.text(TITULO, izq, 92);
  letra("normal", 10, SUAVE);
  doc.text(tituloPeriodo(reporte.desde, reporte.hasta), izq, 110);
  letra("normal", 9, TENUE);
  doc.text(`Generado el ${fechaLarga(generadoEn)}`, der, 110, { align: "right" });

  // Resumen del periodo
  const separacion = 10;
  const anchoTarjeta = (ancho - separacion * (TIPOS_REPORTE.length - 1)) / TIPOS_REPORTE.length;
  TIPOS_REPORTE.forEach((t, i) => {
    const x = izq + i * (anchoTarjeta + separacion);
    doc.setFillColor(...RELLENO);
    doc.roundedRect(x, 128, anchoTarjeta, 58, 8, 8, "F");
    letra("bold", 20, TINTA);
    doc.text(String(reporte.totales.general[t.id] || 0), x + 12, 156);
    letra("normal", 8, SUAVE);
    doc.text(t.label, x + 12, 173);
  });

  y = 216;
  encabezadoTabla();

  if (!reporte.totales.general.total) {
    letra("normal", 10, SUAVE);
    doc.text("No hay documentos creados en este período.", izq, y + 14);
    y += 30;
  }

  for (const fila of reporte.filas) {
    const mesesConActividad = reporte.meses.filter((m) => fila.porMes[m]?.total);
    // El nombre no se queda solo al pie de la hoja: pasa con su primer mes.
    if (y + 22 + (mesesConActividad.length ? 16 : 0) > fondo) hojaNueva();

    y += 12;
    letra("bold", 10.5, TINTA);
    doc.text(doc.splitTextToSize(fila.usuario, 220)[0], izq, y);
    cifras(fila.totales, "bold", TINTA);
    y += 8;

    for (const mes of mesesConActividad) {
      if (y + 16 > fondo) hojaNueva();
      y += 11;
      letra("normal", 9.5, SUAVE);
      doc.text(tituloMes(mes), izq + 12, y);
      cifras(fila.porMes[mes], "normal", SUAVE);
      y += 5;
    }
    y += 4;
    raya(y);
  }

  if (reporte.totales.general.total) {
    if (y + 30 > fondo) hojaNueva();
    y += 18;
    letra("bold", 10.5, TINTA);
    doc.text("Total del período", izq, y);
    cifras(reporte.totales.general, "bold", TINTA);
  }

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p += 1) {
    doc.setPage(p);
    letra("normal", 8, TENUE);
    doc.text(`Ingeanclajes · ${TITULO}`, izq, 792 - 36);
    doc.text(`Página ${p} de ${paginas}`, der, 792 - 36, { align: "right" });
  }

  return doc.output("blob");
}

export async function descargarReportePdf(reporte, generadoEn = new Date()) {
  const blob = await generarReportePdf(reporte, generadoEn);
  downloadGeneratedFile(new File([blob], nombreArchivoReporte(reporte, "pdf"), { type: "application/pdf" }));
}
