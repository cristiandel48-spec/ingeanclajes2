// Libro de Excel de verdad (.xlsx), armado a mano.
//
// `downloadExcelWorkbook` de la nomina escribe el formato XML viejo con
// extension .xls: Excel lo abre, pero antes avisa de que «el formato y la
// extension no coinciden», y en el telefono muchas veces no abre. Un .xlsx es
// un zip con unos cuantos XML dentro, y JSZip ya esta en el proyecto, asi que
// no hace falta traer una libreria de hojas de calculo de varios megas.
//
// Solo sabe lo que hace falta para un reporte: texto, numeros, fechas,
// negrita, encabezado sombreado, anchos de columna y fila fija.

// Estilos disponibles para una celda: { v: valor, s: "encabezado" }.
const ESTILO = { normal: 0, encabezado: 1, negrita: 2, titulo: 3, fecha: 4, tenue: 5 };

const escaparXml = (texto) =>
  String(texto)
    // Caracteres de control que XML no admite y que dejan el archivo ilegible.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// 0 -> A, 25 -> Z, 26 -> AA
export function letraColumna(indice) {
  let letra = "";
  for (let n = indice + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letra = String.fromCharCode(65 + ((n - 1) % 26)) + letra;
  }
  return letra;
}

// «2026-11-03» -> numero de serie de Excel (dias desde 1900).
function serieDeFecha(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000 + 25569;
}

function celdaXml(ref, celda) {
  const conEstilo = celda !== null && typeof celda === "object";
  const valor = conEstilo ? celda.v : celda;
  const estilo = conEstilo ? ESTILO[celda.s] ?? 0 : 0;
  const s = estilo ? ` s="${estilo}"` : "";

  if (estilo === ESTILO.fecha) {
    const serie = serieDeFecha(valor);
    if (serie !== null) return `<c r="${ref}"${s}><v>${serie}</v></c>`;
  }
  if (valor === null || valor === undefined || valor === "") {
    return estilo ? `<c r="${ref}"${s}/>` : "";
  }
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return `<c r="${ref}"${s}><v>${valor}</v></c>`;
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`;
}

function hojaXml({ filas = [], anchos = [], filasFijas = 0 }) {
  const cuerpo = filas
    .map((fila, f) => {
      const celdas = (Array.isArray(fila) ? fila : [fila])
        .map((celda, c) => celdaXml(`${letraColumna(c)}${f + 1}`, celda))
        .join("");
      return `<row r="${f + 1}">${celdas}</row>`;
    })
    .join("");

  const fijas = filasFijas > 0
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${filasFijas}" topLeftCell="A${filasFijas + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : "";
  const columnas = anchos.length
    ? `<cols>${anchos.map((ancho, i) => `<col min="${i + 1}" max="${i + 1}" width="${ancho}" customWidth="1"/>`).join("")}</cols>`
    : "";

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    fijas + columnas + `<sheetData>${cuerpo}</sheetData></worksheet>`
  );
}

const ESTILOS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="4">' +
  '<font><sz val="11"/><color rgb="FF101828"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FF101828"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><b/><sz val="15"/><color rgb="FF101828"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><sz val="11"/><color rgb="FF667085"/><name val="Calibri"/><family val="2"/></font>' +
  "</fonts>" +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFF2F4F7"/><bgColor indexed="64"/></patternFill></fill>' +
  "</fills>" +
  '<borders count="2">' +
  "<border><left/><right/><top/><bottom/><diagonal/></border>" +
  '<border><left/><right/><top/><bottom style="thin"><color rgb="FFD0D5DD"/></bottom><diagonal/></border>' +
  "</borders>" +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="6">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  "</cellXfs>" +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  "</styleSheet>";

// Excel no admite estos caracteres en el nombre de una hoja, ni mas de 31.
const nombreHoja = (nombre, i) =>
  String(nombre || `Hoja ${i + 1}`).replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || `Hoja ${i + 1}`;

export const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * @param {Array<{nombre:string, filas:Array<Array>, anchos?:number[], filasFijas?:number}>} hojas
 *   Cada celda es un valor suelto o { v, s } con s de ESTILO.
 * @param {string} [tipo]  Lo que entrega JSZip: "blob" en el navegador.
 */
export async function construirXlsx(hojas, tipo = "blob") {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const lista = hojas.map((hoja, i) => ({ ...hoja, nombre: nombreHoja(hoja.nombre, i) }));

  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    lista.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
    "</Types>"
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>"
  );
  zip.file(
    "xl/workbook.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${lista.map((hoja, i) => `<sheet name="${escaparXml(hoja.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>` +
    "</workbook>"
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    lista.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
    `<Relationship Id="rId${lista.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    "</Relationships>"
  );
  zip.file("xl/styles.xml", ESTILOS_XML);
  lista.forEach((hoja, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, hojaXml(hoja)));

  return zip.generateAsync({ type: tipo, mimeType: TIPO_XLSX, compression: "DEFLATE" });
}
