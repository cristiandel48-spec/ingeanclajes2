// Descarga del reporte de actividad por usuario en Excel y en PDF.
//
// Va aparte del conteo (reporteActividad.js) y se carga solo al pulsar el
// boton: JSZip y jsPDF pesan, y casi nadie abre este reporte.

import { downloadGeneratedFile, sanitizeFileName } from "./download";
import { registrarInterEnPdf } from "./fuenteInter";
import { construirXlsx, TIPO_XLSX } from "./xlsxSimple";
import {
  TIPOS_REPORTE,
  detallePorTipo,
  fechaLegible,
  filasPorUsuarioYMes,
  tituloMes,
  tituloPeriodo,
  valorCasilla,
} from "./reporteActividad";

const TITULO = "Reporte de tareas ejecutadas por usuarios";
const TITULO_DETALLE = "Informe detallado por documento";

const fechaLarga = (fecha) =>
  fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Bogota" });

export function nombreArchivoReporte(reporte, extension) {
  const periodo = reporte.desde === reporte.hasta ? reporte.desde : `${reporte.desde}_a_${reporte.hasta}`;
  // Filtrado por una persona, su nombre va en el archivo para no confundirlo
  // con el de todo el equipo.
  const persona = reporte.soloUsuario ? `${sanitizeFileName(reporte.soloUsuario)}-` : "";
  return `Reporte-actividad-${persona}${periodo}.${extension}`;
}

export function notaVisitas(reporte) {
  return reporte.visitasDe
    ? `Visitas: solo las de la agenda de ${reporte.visitasDe}. La agenda de cada persona es privada; en los demás aparece «—».`
    : "Visitas: sin datos de agenda.";
}

const enc = (v) => ({ v, s: "encabezado" });
const neg = (v) => ({ v, s: "negrita" });

/** Las hojas del libro, sin generar el archivo. */
export function hojasDelReporte(reporte, generadoEn = new Date()) {
  const etiquetas = TIPOS_REPORTE.map((t) => t.label);
  // `fila` dice de quien es la linea: en las visitas de quien no es el dueño
  // de la agenda va «—» (no se sabe), no un cero.
  const cifras = (conteo, fila) => [...TIPOS_REPORTE.map((t) => valorCasilla(fila, conteo, t.id)), conteo.total || 0];
  const cabecera = [
    [{ v: TITULO, s: "titulo" }],
    [{ v: `Período: ${tituloPeriodo(reporte.desde, reporte.hasta)}${reporte.soloUsuario ? ` · Usuario: ${reporte.soloUsuario}` : " · Todo el equipo"}`, s: "tenue" }],
    [{ v: `Generado el ${fechaLarga(generadoEn)}`, s: "tenue" }],
    [{ v: notaVisitas(reporte), s: "tenue" }],
    [],
  ];

  const porMes = {
    nombre: "Por usuario y mes",
    anchos: [30, 18, 14, 24, 16, 20, 18, 10],
    filasFijas: cabecera.length + 1,
    filas: [
      ...cabecera,
      ["Usuario", "Mes", ...etiquetas, "Total"].map(enc),
      ...filasPorUsuarioYMes(reporte).map((l) => [l.usuario, tituloMes(l.mes), ...cifras(l, l.fila)]),
      [neg("Total"), neg(""), ...cifras(reporte.totales.general, reporte.filaTotal).map(neg)],
    ],
  };

  const porUsuario = {
    nombre: "Total por usuario",
    anchos: [30, 14, 24, 16, 20, 18, 10],
    filasFijas: cabecera.length + 1,
    filas: [
      ...cabecera,
      ["Usuario", ...etiquetas, "Total"].map(enc),
      ...reporte.filas.map((f) => [f.usuario, ...cifras(f.totales, f)]),
      [neg("Total"), ...cifras(reporte.totales.general, reporte.filaTotal).map(neg)],
    ],
  };

  const detalle = {
    nombre: "Detalle",
    anchos: [24, 16, 32, 34, 34, 14, 26, 13, 11, 18],
    filasFijas: 1,
    filas: [
      ["Tipo", "Código", "Cliente", "Detalle", "Lugar", "Estado", "Usuario", "Fecha", "Hora", "Mes"].map(enc),
      ...reporte.detalle.map((d) => [
        d.tipoLabel, d.codigo, d.cliente, d.descripcion, d.lugar, d.estado, d.usuario,
        { v: d.fecha, s: "fecha" }, d.hora, tituloMes(d.mes),
      ]),
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

/**
 * @param {object} [opciones]
 * @param {boolean} [opciones.conDetalle]  Informe detallado: primero la lista
 *   documento por documento (fecha, hora, codigo, cliente y lugar) y, al
 *   final, el resumen.
 */
export async function generarReportePdf(reporte, generadoEn = new Date(), { conDetalle = false } = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  await registrarInterEnPdf(doc);

  const izq = 48;
  const der = 612 - 48;
  const ancho = der - izq;
  const fondo = 792 - 64;
  // Borde derecho de cada columna de cifras.
  const columnas = [
    ...TIPOS_REPORTE.map((t, i) => ({ id: t.id, titulo: t.corto, x: [290, 345, 428, 472, 518][i] })),
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

  const cifras = (conteo, peso, color, fila) => {
    columnas.forEach((c) => {
      const valor = c.id === "total" ? conteo.total || 0 : valorCasilla(fila, conteo, c.id);
      // Un cero (o un «—») en gris: lo que importa son las cifras que hay.
      letra(peso, 9.5, typeof valor === "number" && valor ? color : TENUE);
      doc.text(String(valor), c.x, y, { align: "right" });
    });
  };

  // Encabezado de una seccion, en la hoja en la que este el documento. La
  // fecha de generacion solo va en la primera hoja.
  const portada = (etiqueta, titulo) => {
    letra("bold", 8, ACENTO);
    doc.text(etiqueta, izq, 64);
    letra("bold", 22, TINTA);
    doc.text(titulo, izq, 92);
    letra("normal", 10, SUAVE);
    doc.text(
      `${tituloPeriodo(reporte.desde, reporte.hasta)} · ${reporte.soloUsuario || "Todo el equipo"}`,
      izq,
      110
    );
    if (doc.getNumberOfPages() === 1) {
      letra("normal", 9, TENUE);
      doc.text(`Generado el ${fechaLarga(generadoEn)}`, der, 110, { align: "right" });
    }
  };

  // ── Resumen: cuantos documentos por persona y por mes ─────────────────
  const dibujarResumen = (etiqueta) => {
  portada(etiqueta, TITULO);

  // Resumen del periodo
  const separacion = 10;
  const anchoTarjeta = (ancho - separacion * (TIPOS_REPORTE.length - 1)) / TIPOS_REPORTE.length;
  TIPOS_REPORTE.forEach((t, i) => {
    const x = izq + i * (anchoTarjeta + separacion);
    doc.setFillColor(...RELLENO);
    doc.roundedRect(x, 128, anchoTarjeta, 58, 8, 8, "F");
    letra("bold", 20, TINTA);
    doc.text(String(valorCasilla(reporte.filaTotal, reporte.totales.general, t.id)), x + 9, 156);
    letra("normal", 7, SUAVE);
    doc.text(t.label, x + 9, 173);
  });

  letra("normal", 7.5, TENUE);
  doc.text(notaVisitas(reporte), izq, 202, { maxWidth: ancho });

  y = 232;
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
    doc.text(doc.splitTextToSize(fila.usuario, 180)[0], izq, y);
    cifras(fila.totales, "bold", TINTA, fila);
    y += 8;

    for (const mes of mesesConActividad) {
      if (y + 16 > fondo) hojaNueva();
      y += 11;
      letra("normal", 9.5, SUAVE);
      doc.text(tituloMes(mes), izq + 12, y);
      cifras(fila.porMes[mes], "normal", SUAVE, fila);
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
    cifras(reporte.totales.general, "bold", TINTA, reporte.filaTotal);
  }
  };

  // ── Detalle: documento por documento ──────────────────────────────────
  const grupos = conDetalle ? detallePorTipo(reporte) : [];
  const dibujarDetalle = () => {
    const col = { fecha: izq, hora: izq + 60, codigo: izq + 112, cliente: izq + 182, lugar: izq + 384 };
    const anchoCol = { codigo: 64, cliente: 194, lugar: der - col.lugar };
    // Una sola linea: lo que no cabe se corta con puntos suspensivos.
    const recortar = (texto, w) => {
      const lineas = doc.splitTextToSize(String(texto || ""), w);
      return lineas.length > 1 ? `${lineas[0].trimEnd()}…` : lineas[0] || "";
    };
    const cabeceraGrupo = (grupo, continua) => {
      letra("bold", 12, TINTA);
      doc.text(`${grupo.label}${continua ? " (continuación)" : ""}`, izq, y);
      letra("normal", 9, TENUE);
      doc.text(String(grupo.items.length), der, y, { align: "right" });
      y += 15;
      letra("bold", 7.5, TENUE);
      doc.text("FECHA", col.fecha, y);
      doc.text("HORA", col.hora, y);
      doc.text("CÓDIGO", col.codigo, y);
      doc.text("CLIENTE / DETALLE", col.cliente, y);
      doc.text("LUGAR", col.lugar, y);
      y += 7;
      raya(y);
      y += 3;
    };

    portada("INGEANCLAJES S.A.S.", TITULO_DETALLE);
    y = 142;

    for (const grupo of grupos) {
      // El titulo de un grupo no se queda solo al pie de la hoja.
      if (y + 70 > fondo) { doc.addPage("letter", "portrait"); y = 64; }
      cabeceraGrupo(grupo, false);

      for (const d of grupo.items) {
        // Segunda linea, en gris: lo que complementa al cliente, el estado y,
        // si el reporte es de todo el equipo, quien lo hizo.
        const principal = d.cliente || d.descripcion || "—";
        const secundaria = [d.cliente ? d.descripcion : "", d.estado, reporte.soloUsuario ? "" : d.usuario]
          .filter(Boolean)
          .join(" · ");
        const alto = secundaria ? 27 : 17;
        if (y + alto > fondo) {
          doc.addPage("letter", "portrait");
          y = 64;
          cabeceraGrupo(grupo, true);
        }

        y += 12;
        letra("normal", 9.5, TINTA);
        doc.text(fechaLegible(d.fecha), col.fecha, y);
        letra("normal", 9.5, d.hora ? SUAVE : TENUE);
        doc.text(d.hora || "—", col.hora, y);
        letra("normal", 9.5, SUAVE);
        doc.text(recortar(d.codigo || "—", anchoCol.codigo), col.codigo, y);
        letra("bold", 9.5, TINTA);
        doc.text(recortar(principal, anchoCol.cliente), col.cliente, y);
        letra("normal", 9.5, SUAVE);
        doc.text(recortar(d.lugar || "—", anchoCol.lugar), col.lugar, y);
        if (secundaria) {
          y += 10;
          letra("normal", 8, TENUE);
          doc.text(recortar(secundaria, anchoCol.cliente), col.cliente, y);
        }
        y += 5;
        raya(y);
      }
      y += 26;
    }
  };

  // En el informe detallado va primero el detalle, que es lo que se pidio, y
  // el resumen cierra el documento en su propia hoja. Sin detalle (o sin
  // documentos que detallar), el resumen es el documento entero.
  if (grupos.length) {
    dibujarDetalle();
    doc.addPage("letter", "portrait");
    dibujarResumen("RESUMEN");
  } else {
    dibujarResumen("INGEANCLAJES S.A.S.");
  }

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p += 1) {
    doc.setPage(p);
    letra("normal", 8, TENUE);
    doc.text(`Ingeanclajes · ${grupos.length ? TITULO_DETALLE : TITULO}`, izq, 792 - 36);
    doc.text(`Página ${p} de ${paginas}`, der, 792 - 36, { align: "right" });
  }

  return doc.output("blob");
}

export async function descargarReportePdf(reporte, opciones = {}, generadoEn = new Date()) {
  const blob = await generarReportePdf(reporte, generadoEn, opciones);
  const nombre = nombreArchivoReporte(reporte, "pdf").replace(/^Reporte-actividad-/, opciones.conDetalle ? "Reporte-actividad-detallado-" : "Reporte-actividad-");
  downloadGeneratedFile(new File([blob], nombre, { type: "application/pdf" }));
}
