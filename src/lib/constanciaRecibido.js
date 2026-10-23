// «Constancia de recepcion»: la hoja que se pega al final del PDF firmado.
//
// El PDF que firmo el cliente no se vuelve a generar: se toma el archivo
// exacto que se le envio (el de la huella SHA-256) y se le agrega esta hoja
// al final con pdf-lib. Asi las hojas del documento siguen siendo las mismas
// que recibio, y la huella impresa en la constancia es la de ese archivo.
//
// La hoja se arma con jsPDF (texto de verdad, con Inter) y lleva el QR de la
// verificacion publica.

import { registrarInterEnPdf } from "./fuenteInter";
import { enlaceVerificacionFirma } from "./firmaRecibido";

const TINTA = [29, 29, 31];
const GRIS = [110, 110, 115];
const LINEA = [210, 210, 215];
const FONDO = [245, 245, 247];

const EVENTOS = {
  enviado: "Enviado por correo",
  abierto: "Enlace abierto",
  "codigo-enviado": "Código enviado al correo",
  "codigo-incorrecto": "Código incorrecto",
  "codigo-verificado": "Código verificado",
  firmado: "Recibido firmado",
  anulado: "Envío anulado",
};

export function fechaHoraCo(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }) + " (hora de Colombia)";
}

// Las aperturas se repiten cada vez que el cliente vuelve al enlace: se dejan
// las tres primeras y se cuenta el resto, para que el rastro quepa en la hoja.
function rastroResumido(eventos = []) {
  const salida = [];
  let aperturas = 0;
  let omitidas = 0;
  for (const e of eventos) {
    if (e?.evento === "abierto") {
      aperturas += 1;
      if (aperturas > 3) { omitidas += 1; continue; }
    }
    salida.push(e);
  }
  return { eventos: salida, omitidas };
}

async function hojaConstancia(firma) {
  const [{ jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")]);
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  await registrarInterEnPdf(doc);

  const izq = 48;
  const der = 612 - 48;
  const ancho = der - izq;
  let y = 52;

  const texto = (t, x, yy, { tam = 9, negrita = false, color = TINTA, alinear = "left", max } = {}) => {
    doc.setFont("Inter", negrita ? "bold" : "normal");
    doc.setFontSize(tam);
    doc.setTextColor(...color);
    const lineas = Array.isArray(t) ? t : max ? doc.splitTextToSize(String(t ?? ""), max) : String(t ?? "");
    doc.text(lineas, x, yy, { align: alinear });
    return Array.isArray(lineas) ? lineas.length : 1;
  };
  const raya = (yy) => { doc.setDrawColor(...LINEA); doc.setLineWidth(0.6); doc.line(izq, yy, der, yy); };
  const nuevaHojaSiHaceFalta = (alto) => {
    if (y + alto > 740) { doc.addPage("letter", "portrait"); y = 52; }
  };

  // Encabezado
  doc.setFillColor(...TINTA);
  doc.rect(izq, y - 4, ancho, 2, "F");
  y += 18;
  texto("CONSTANCIA DE RECEPCIÓN Y FIRMA ELECTRÓNICA", izq, y, { tam: 13, negrita: true });
  texto(firma.numero || "", der, y, { tam: 11, negrita: true, alinear: "right" });
  y += 14;
  texto("Ingeanclajes S.A.S. · NIT 900.193.965-4 · Calle 38 Sur # 36-48, Envigado", izq, y, { tam: 8.5, color: GRIS });
  y += 12;
  raya(y);
  y += 20;

  // Pares rotulo / valor en dos columnas
  const bloque = (titulo, filas) => {
    nuevaHojaSiHaceFalta(24 + filas.length * 16);
    texto(titulo.toUpperCase(), izq, y, { tam: 8.5, negrita: true, color: GRIS });
    y += 12;
    for (const [rotulo, valor] of filas) {
      if (!valor) continue;
      texto(rotulo, izq, y, { tam: 9, color: GRIS });
      const n = texto(valor, izq + 130, y, { tam: 9.5, negrita: true, max: ancho - 130 });
      y += 14 * n + 2;
    }
    y += 8;
  };

  bloque("Documento recibido", [
    ["Documento", [firma.titulo, firma.numero].filter(Boolean).join(" · ")],
    ["Cliente", firma.cliente],
    ["Archivo", firma.pdfNombre],
    ["Huella SHA-256", firma.pdfSha256],
  ]);

  bloque("Quién firma", [
    ["Nombre", firma.firmanteNombre],
    ["Documento", firma.firmanteDocumento],
    ["Cargo", firma.firmanteCargo],
    ["Empresa", firma.firmanteEmpresa],
    ["Correo verificado", firma.firmanteEmail ? `${firma.firmanteEmail} (con código de un solo uso)` : ""],
    ["Fecha y hora", fechaHoraCo(firma.firmadoEn)],
    ["Dirección IP", firma.firmaIp],
  ]);

  // Lo que acepto
  const lineasAcepto = doc.splitTextToSize(firma.textoAceptado || "", ancho - 24);
  nuevaHojaSiHaceFalta(30 + lineasAcepto.length * 13);
  doc.setFillColor(...FONDO);
  doc.setDrawColor(...LINEA);
  doc.roundedRect(izq, y - 10, ancho, 16 + lineasAcepto.length * 13, 4, 4, "FD");
  texto(lineasAcepto, izq + 12, y + 3, { tam: 9.5 });
  y += 16 + lineasAcepto.length * 13 + 8;

  if (firma.firmanteObservaciones) {
    const lineasObs = doc.splitTextToSize(firma.firmanteObservaciones, ancho);
    nuevaHojaSiHaceFalta(24 + lineasObs.length * 13);
    texto("OBSERVACIONES DEL CLIENTE", izq, y, { tam: 8.5, negrita: true, color: GRIS });
    y += 13;
    texto(lineasObs, izq, y, { tam: 9.5 });
    y += lineasObs.length * 13 + 10;
  }

  // Firma y QR
  nuevaHojaSiHaceFalta(130);
  const altoFirma = 80;
  if (firma.firmaImagen) {
    try {
      const props = doc.getImageProperties(firma.firmaImagen);
      const escala = Math.min(220 / props.width, altoFirma / props.height);
      doc.addImage(firma.firmaImagen, "PNG", izq, y, props.width * escala, props.height * escala);
    } catch { /* firma ilegible: queda la raya */ }
  }
  doc.setDrawColor(...TINTA);
  doc.setLineWidth(0.8);
  doc.line(izq, y + altoFirma + 4, izq + 240, y + altoFirma + 4);
  texto(firma.firmanteNombre || "", izq, y + altoFirma + 17, { tam: 9.5, negrita: true });
  texto([firma.firmanteCargo, firma.firmanteEmpresa].filter(Boolean).join(" · "), izq, y + altoFirma + 29, { tam: 8.5, color: GRIS });

  const enlace = enlaceVerificacionFirma(firma.codigoVerificacion);
  const qr = await QRCode.toDataURL(enlace, { margin: 1, width: 320, color: { dark: "#1d1d1f", light: "#ffffff" } });
  doc.addImage(qr, "PNG", der - 92, y, 92, 92);
  texto("Verifique esta constancia", der - 100, y + 30, { tam: 8.5, negrita: true, alinear: "right" });
  texto("escaneando el código o en", der - 100, y + 42, { tam: 8.5, color: GRIS, alinear: "right" });
  // La direccion no tiene espacios donde partirla: va en dos lineas, el sitio
  // y el codigo, para que se lea completa.
  const [sitio, codigoQr] = enlace.replace(/^https?:\/\//, "").split("?");
  texto(`${sitio}?`, der - 100, y + 54, { tam: 7.5, color: GRIS, alinear: "right" });
  texto(codigoQr || "", der - 100, y + 64, { tam: 7.5, color: GRIS, alinear: "right" });
  y += altoFirma + 50;

  // Rastro
  const { eventos, omitidas } = rastroResumido(firma.eventos);
  nuevaHojaSiHaceFalta(30 + eventos.length * 14);
  raya(y - 10);
  texto("RASTRO DEL ENVÍO", izq, y + 4, { tam: 8.5, negrita: true, color: GRIS });
  y += 18;
  for (const e of eventos) {
    nuevaHojaSiHaceFalta(14);
    texto(fechaHoraCo(e.en).replace(" (hora de Colombia)", ""), izq, y, { tam: 8.5 });
    texto(EVENTOS[e.evento] || e.evento, izq + 190, y, { tam: 8.5, negrita: true });
    texto(e.ip ? `IP ${e.ip}` : "", der, y, { tam: 8, color: GRIS, alinear: "right" });
    y += 13;
  }
  if (omitidas) {
    texto(`… y ${omitidas} apertura(s) más del enlace.`, izq, y, { tam: 8, color: GRIS });
    y += 13;
  }

  // Pie legal, en todas las hojas de la constancia
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...LINEA);
    doc.line(izq, 748, der, 748);
    texto(
      "Firma electrónica en los términos de la Ley 527 de 1999 y el Decreto 2364 de 2012: quien firma se identificó con un código "
        + "enviado al correo al que se remitió el documento y aceptó el texto de recibido. La huella SHA-256 identifica el archivo exacto recibido.",
      izq, 760, { tam: 7.5, color: GRIS, max: ancho },
    );
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

/**
 * El PDF enviado con la constancia al final. Devuelve un Blob.
 * @param {Uint8Array} pdfOriginal  El archivo exacto que se le envio al cliente.
 * @param {object} firma  Los datos de la firma (lib/firmaRecibido.js).
 */
export async function armarPdfConConstancia(pdfOriginal, firma) {
  const [{ PDFDocument }, constancia] = await Promise.all([import("pdf-lib"), hojaConstancia(firma)]);
  const final = await PDFDocument.load(pdfOriginal);
  const hoja = await PDFDocument.load(constancia);
  const copiadas = await final.copyPages(hoja, hoja.getPageIndices());
  copiadas.forEach((p) => final.addPage(p));
  final.setSubject(`Constancia de recepción firmada por ${firma.firmanteNombre || "el cliente"}`);
  return new Blob([await final.save()], { type: "application/pdf" });
}

export function nombreConConstancia(firma) {
  const base = String(firma.pdfNombre || firma.numero || "Documento").replace(/\.pdf$/i, "");
  return `${base} - recibido firmado.pdf`;
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
