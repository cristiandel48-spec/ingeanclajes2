import { fmt } from "./format";

/**
 * Convierte un Blob de PDF a string base64 puro (sin el prefijo data:application/pdf;base64,).
 */
export function blobABase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || "");
      resolve(res.slice(res.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("No se pudo convertir el PDF a base64"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Genera el documento PDF oficial de la colilla de pago utilizando jsPDF (vectorial puro).
 * Es ultrarrápido (tarda < 10ms por documento) y produce un archivo nítido y ligero (~15 KB).
 */
export async function generarColillaPdf(empleado, resumen, periodoNomina) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });

  const margenIzq = 40;
  const anchoPagina = 612; // 8.5 * 72 pt
  const margenDer = anchoPagina - 40;
  const anchoUtil = margenDer - margenIzq; // 532 pt

  // 1. Cabecera principal corporativa
  doc.setFillColor(15, 23, 42); // Navy oscuro #0f172a
  doc.roundedRect(margenIzq, 40, anchoUtil, 48, 4, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("INGEANCLAJES S.A.S.", margenIzq + 16, 64);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text("NIT 900.193.965-4 · Especialistas en Anclajes y Alturas", margenIzq + 16, 78);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(74, 222, 128); // #4ade80
  doc.text("COLILLA DE PAGO", margenDer - 16, 64, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(String(periodoNomina?.label || "Corte de Nómina"), margenDer - 16, 78, { align: "right" });

  // 2. Información del Trabajador
  let y = 100;
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.roundedRect(margenIzq, y, anchoUtil, 70, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(empleado.nombre || "Empleado", margenIzq + 14, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Documento: ${empleado.cedula || "N/A"}   |   Cargo: ${empleado.cargo || "N/A"}`, margenIzq + 14, y + 36);
  doc.text(
    `Días laborados: ${resumen.diasNomina || 15}${
      resumen.diasIncapacidad > 0 ? `   |   Días incapacidad: ${resumen.diasIncapacidad}` : ""
    }`,
    margenIzq + 14,
    y + 50
  );

  const medioPago = empleado.banco
    ? `${empleado.banco} (${empleado.tipoCuenta || "Ahorros"} N° ${empleado.numeroCuenta || "N/A"})`
    : "Transferencia bancaria / Efectivo";
  doc.text(`Forma de pago: ${medioPago}`, margenIzq + 14, y + 64);

  // 3. Tabla de Devengados
  y = 185;
  doc.setFillColor(241, 245, 249);
  doc.rect(margenIzq, y, anchoUtil, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("CONCEPTO DEVENGADO", margenIzq + 10, y + 14);
  doc.text("VALOR", margenDer - 10, y + 14, { align: "right" });

  y += 20;
  const devengados = [
    ["Salario básico correspondiente al corte", resumen.salario],
    resumen.auxilioTransporte > 0 ? ["Auxilio de transporte", resumen.auxilioTransporte] : null,
    resumen.horasExtras > 0 ? ["Horas extras y recargos", resumen.horasExtras] : null,
    resumen.comisiones > 0 ? ["Comisiones / Bonificaciones", resumen.comisiones] : null,
    resumen.incapacidadTotal > 0 ? ["Incapacidades reconocidas", resumen.incapacidadTotal] : null,
  ].filter(Boolean);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  devengados.forEach(([concepto, val]) => {
    y += 18;
    doc.setTextColor(51, 65, 85);
    doc.text(concepto, margenIzq + 10, y);
    doc.setTextColor(15, 23, 42);
    doc.text(fmt(val), margenDer - 10, y, { align: "right" });
    doc.setDrawColor(241, 245, 249);
    doc.line(margenIzq, y + 4, margenDer, y + 4);
  });

  // 4. Tabla de Deducciones
  y += 24;
  doc.setFillColor(241, 245, 249);
  doc.rect(margenIzq, y, anchoUtil, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("CONCEPTO DEDUCCIÓN", margenIzq + 10, y + 14);
  doc.text("VALOR", margenDer - 10, y + 14, { align: "right" });

  y += 20;
  const otrasDed = Math.max(0, (resumen.totalDeducciones || 0) - (resumen.salud || 0) - (resumen.pension || 0));
  const deducciones = [
    ["Aporte Seguridad Social - Salud (4%)", resumen.salud],
    ["Aporte Seguridad Social - Pensión (4%)", resumen.pension],
    otrasDed > 0 ? ["Otras deducciones autorizadas", otrasDed] : null,
  ].filter(Boolean);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  deducciones.forEach(([concepto, val]) => {
    y += 18;
    doc.setTextColor(51, 65, 85);
    doc.text(concepto, margenIzq + 10, y);
    doc.setTextColor(185, 28, 28); // Rojo
    doc.text(`-${fmt(val)}`, margenDer - 10, y, { align: "right" });
    doc.setDrawColor(241, 245, 249);
    doc.line(margenIzq, y + 4, margenDer, y + 4);
  });

  // 5. Total Neto a Pagar
  y += 26;
  doc.setFillColor(22, 101, 52); // Verde oscuro #166534
  doc.roundedRect(margenIzq, y, anchoUtil, 36, 4, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL NETO A PAGAR:", margenIzq + 16, y + 23);

  doc.setFontSize(14);
  doc.setTextColor(134, 239, 172); // #86efac
  doc.text(fmt(resumen.neto), margenDer - 16, y + 23, { align: "right" });

  // 6. Pie de página
  y += 55;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Documento oficial expedido por Ingeanclajes S.A.S. - Calle 38 Sur # 36 - 48, Envigado - PBX 448 26 86",
    anchoPagina / 2,
    y,
    { align: "center" }
  );

  const nombreLimpio = (empleado.nombre || "Empleado").replace(/[^a-zA-Z0-9]/g, "_");
  const periodoLimpio = (periodoNomina?.label || "Corte").replace(/[^a-zA-Z0-9]/g, "_");
  const nombreArchivo = `Colilla_${nombreLimpio}_${periodoLimpio}.pdf`;

  return {
    blob: doc.output("blob"),
    nombre: nombreArchivo,
  };
}
