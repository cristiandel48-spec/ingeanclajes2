// Lector e intérprete de Facturas Electrónicas de la DIAN (Colombia).
//
// Soporta:
// 1. Archivos XML en estándar UBL 2.1 (AttachedDocument o Invoice directo).
// 2. Representaciones gráficas HTML generadas por la DIAN o proveedores tecnológicos.
// 3. Extracción de CUFE, datos del emisor (proveedor), receptor, fechas,
//    subtotal, IVA desglosado, retenciones, ítems y neto a pagar.

// Expresión regular oficial para CUFE en Colombia (hash SHA-384 hexadecimal de 96 caracteres,
// o SHA-1/SHA-256 de 64 a 96 caracteres).
const CUFE_REGEX = /\b([0-9a-fA-F]{64,96})\b/;

// Normaliza números monetarios evitando NaN.
const toNum = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  const num = Number(String(val).replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : 0;
};

// Busca texto en nodos XML ignorando el prefijo de namespace (cbc:, cac:, fe:, etc.).
function findTextByLocalName(parent, localName) {
  if (!parent) return "";
  // 1. Búsqueda directa por getElementsByTagNameNS si existe
  if (typeof parent.getElementsByTagNameNS === "function") {
    const nodes = parent.getElementsByTagNameNS("*", localName);
    if (nodes && nodes.length > 0 && nodes[0].textContent) {
      return nodes[0].textContent.trim();
    }
  }
  // 2. Búsqueda por getElementsByTagName con prefijos comunes
  const prefixes = ["", "cbc:", "cac:", "fe:", "ws:"];
  for (const prefix of prefixes) {
    const nodes = parent.getElementsByTagName(prefix + localName);
    if (nodes && nodes.length > 0 && nodes[0].textContent) {
      return nodes[0].textContent.trim();
    }
  }
  // 3. Búsqueda por recorrido recursivo de hijos
  const children = parent.children || parent.childNodes || [];
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (child.nodeType === 1) {
      const name = child.localName || child.nodeName.split(":").pop();
      if (name === localName && child.textContent) {
        return child.textContent.trim();
      }
    }
  }
  return "";
}

function findNodeByLocalName(parent, localName) {
  if (!parent) return null;
  if (typeof parent.getElementsByTagNameNS === "function") {
    const nodes = parent.getElementsByTagNameNS("*", localName);
    if (nodes && nodes.length > 0) return nodes[0];
  }
  const prefixes = ["", "cac:", "cbc:", "fe:"];
  for (const prefix of prefixes) {
    const nodes = parent.getElementsByTagName(prefix + localName);
    if (nodes && nodes.length > 0) return nodes[0];
  }
  return null;
}

function findNodesByLocalName(parent, localName) {
  if (!parent) return [];
  if (typeof parent.getElementsByTagNameNS === "function") {
    const nodes = parent.getElementsByTagNameNS("*", localName);
    if (nodes && nodes.length > 0) return Array.from(nodes);
  }
  const prefixes = ["", "cac:", "cbc:", "fe:"];
  for (const prefix of prefixes) {
    const nodes = parent.getElementsByTagName(prefix + localName);
    if (nodes && nodes.length > 0) return Array.from(nodes);
  }
  return [];
}

/**
 * Parsea un documento XML UBL 2.1 de la DIAN (AttachedDocument o Invoice).
 */
function parsearXmlDian(xmlString) {
  const parser = new DOMParser();
  let xmlDoc = parser.parseFromString(xmlString, "application/xml");

  const parseError = xmlDoc.getElementsByTagName("parsererror")[0];
  if (parseError) {
    // Si falló el parseo estricto, intentar limpiando caracteres inválidos previos
    const limpio = xmlString.replace(/^[\s\S]*?(<\?xml|<AttachedDocument|<Invoice)/i, "$1");
    xmlDoc = parser.parseFromString(limpio, "application/xml");
    if (xmlDoc.getElementsByTagName("parsererror")[0]) {
      throw new Error("El archivo XML no tiene una estructura válida.");
    }
  }

  // Si es un AttachedDocument, la factura real suele venir dentro de Description en CDATA
  let invoiceDoc = xmlDoc;
  const descriptionNode = findNodeByLocalName(xmlDoc, "Description");
  if (descriptionNode && descriptionNode.textContent && descriptionNode.textContent.includes("<Invoice")) {
    try {
      const innerXml = descriptionNode.textContent.trim();
      const parsedInner = parser.parseFromString(innerXml, "application/xml");
      if (!parsedInner.getElementsByTagName("parsererror")[0]) {
        invoiceDoc = parsedInner;
      }
    } catch {
      // Usar xmlDoc principal si falla el CDATA
    }
  }

  // --- Factura y Fechas ---
  const facturaId = findTextByLocalName(invoiceDoc, "ID");
  const cufe = findTextByLocalName(invoiceDoc, "UUID");
  const fechaEmision = findTextByLocalName(invoiceDoc, "IssueDate");
  let fechaVence = findTextByLocalName(invoiceDoc, "DueDate") || findTextByLocalName(invoiceDoc, "PaymentDueDate");
  if (!fechaVence && fechaEmision) {
    fechaVence = fechaEmision;
  }

  // --- Proveedor (Emisor) ---
  const supplierParty = findNodeByLocalName(invoiceDoc, "AccountingSupplierParty");
  let nombreProveedor = "";
  let nitProveedor = "";
  let dvProveedor = "";
  let direccionProveedor = "";
  let ciudadProveedor = "";
  let telefonoProveedor = "";
  let emailProveedor = "";

  if (supplierParty) {
    nombreProveedor =
      findTextByLocalName(supplierParty, "RegistrationName") ||
      findTextByLocalName(supplierParty, "Name") ||
      findTextByLocalName(supplierParty, "Line");

    const companyIdNode = findNodeByLocalName(supplierParty, "CompanyID");
    if (companyIdNode) {
      nitProveedor = (companyIdNode.textContent || "").trim();
      dvProveedor = companyIdNode.getAttribute("schemeID") || "";
    }

    direccionProveedor = findTextByLocalName(supplierParty, "Line") || findTextByLocalName(supplierParty, "AddressLine");
    ciudadProveedor = findTextByLocalName(supplierParty, "CityName") || findTextByLocalName(supplierParty, "CountrySubentity");
    telefonoProveedor = findTextByLocalName(supplierParty, "Telephone");
    emailProveedor = findTextByLocalName(supplierParty, "ElectronicMail");
  }

  // Si el NIT viene con guion, separar NIT y DV
  if (nitProveedor.includes("-")) {
    const partes = nitProveedor.split("-");
    nitProveedor = partes[0].replace(/\D/g, "");
    if (!dvProveedor && partes[1]) dvProveedor = partes[1].trim();
  } else {
    nitProveedor = nitProveedor.replace(/\D/g, "");
  }

  // --- Receptor (Ingeanclajes) ---
  const customerParty = findNodeByLocalName(invoiceDoc, "AccountingCustomerParty");
  const nombreReceptor = customerParty ? findTextByLocalName(customerParty, "RegistrationName") || findTextByLocalName(customerParty, "Name") : "";
  const nitReceptor = customerParty ? findTextByLocalName(customerParty, "CompanyID").replace(/\D/g, "") : "";

  // --- Totales Económicos ---
  const legalTotal = findNodeByLocalName(invoiceDoc, "LegalMonetaryTotal");
  let subtotal = 0;
  let valorTotalPagar = 0;

  if (legalTotal) {
    subtotal =
      toNum(findTextByLocalName(legalTotal, "LineExtensionAmount")) ||
      toNum(findTextByLocalName(legalTotal, "TaxExclusiveAmount")) ||
      toNum(findTextByLocalName(legalTotal, "TaxInclusiveAmount"));

    valorTotalPagar =
      toNum(findTextByLocalName(legalTotal, "PayableAmount")) ||
      toNum(findTextByLocalName(legalTotal, "TaxInclusiveAmount"));
  }

  // --- Impuestos (IVA) y Retenciones ---
  let valorIva = 0;
  let tarifaIva = 0;
  let valorRetFuente = 0;
  let valorReteiva = 0;
  let valorReteica = 0;

  const taxTotals = findNodesByLocalName(invoiceDoc, "TaxTotal");
  for (const tax of taxTotals) {
    const taxSubtotals = findNodesByLocalName(tax, "TaxSubtotal");
    for (const sub of taxSubtotals) {
      const schemeId = findTextByLocalName(sub, "ID");
      const schemeName = findTextByLocalName(sub, "Name").toLowerCase();
      const taxVal = toNum(findTextByLocalName(sub, "TaxAmount"));
      const percent = toNum(findTextByLocalName(sub, "Percent"));

      // 01 = IVA
      if (schemeId === "01" || schemeName.includes("iva") || schemeName.includes("valor agregado")) {
        valorIva += taxVal;
        if (percent > 0) tarifaIva = percent;
      }
      // 05 = ReteIVA
      else if (schemeId === "05" || schemeName.includes("reteiva")) {
        valorReteiva += taxVal;
      }
      // 06 = Retefuente
      else if (schemeId === "06" || schemeName.includes("retefuente") || schemeName.includes("renta")) {
        valorRetFuente += taxVal;
      }
      // 07 = ReteICA
      else if (schemeId === "07" || schemeName.includes("reteica") || schemeName.includes("ica")) {
        valorReteica += taxVal;
      }
    }
  }

  // Si no se encontró tarifa explícita de IVA pero hay valor de IVA y subtotal
  if (tarifaIva === 0 && valorIva > 0 && subtotal > 0) {
    const calc = Math.round((valorIva / subtotal) * 100);
    tarifaIva = calc === 19 || calc === 5 ? calc : 19;
  }

  // --- Ítems y líneas facturadas ---
  const invoiceLines = findNodesByLocalName(invoiceDoc, "InvoiceLine");
  const items = [];
  for (const line of invoiceLines) {
    const desc = findTextByLocalName(line, "Description") || "Ítem de factura";
    const cant = toNum(findTextByLocalName(line, "InvoicedQuantity")) || 1;
    const precio = toNum(findTextByLocalName(line, "PriceAmount"));
    const totalLinea = toNum(findTextByLocalName(line, "LineExtensionAmount")) || cant * precio;

    items.push({
      desc,
      cant,
      vu: precio || (cant > 0 ? Number((totalLinea / cant).toFixed(2)) : totalLinea),
      total: totalLinea,
    });
  }

  // Inferencia del tipo de operación (compras vs servicios)
  const textoTotal = (items.map((i) => i.desc).join(" ") + " " + nombreProveedor).toLowerCase();
  const esServicio =
    textoTotal.includes("servicio") ||
    textoTotal.includes("mantenimiento") ||
    textoTotal.includes("instalacion") ||
    textoTotal.includes("honorario") ||
    textoTotal.includes("asesoria") ||
    textoTotal.includes("arrendamiento") ||
    textoTotal.includes("transporte");

  const tipoOperacion = esServicio ? "servicio" : "compras";

  return {
    formato: "xml-ubl",
    factura: facturaId || "SIN-NUMERO",
    cufe: (cufe.match(CUFE_REGEX)?.[1] || cufe).trim(),
    fecha: fechaEmision || new Date().toISOString().slice(0, 10),
    fechaVence: fechaVence || fechaEmision || new Date().toISOString().slice(0, 10),
    proveedor: {
      nombre: nombreProveedor || "Proveedor no identificado",
      nit: nitProveedor,
      dv: dvProveedor,
      direccion: direccionProveedor,
      ciudad: ciudadProveedor || "Envigado",
      municipioIca: ciudadProveedor || "Envigado",
      telefono: telefonoProveedor,
      email: emailProveedor,
      responsableIva: valorIva > 0,
      autorretenedorRenta: false,
    },
    receptor: {
      nombre: nombreReceptor,
      nit: nitReceptor,
    },
    subtotal: subtotal || (valorTotalPagar > valorIva ? valorTotalPagar - valorIva : valorTotalPagar),
    tarifaIva: valorIva > 0 ? (tarifaIva || 19) : 0,
    valorIva,
    valorRetFuente,
    valorReteiva,
    valorReteica,
    valorTotalPagar: valorTotalPagar || subtotal + valorIva,
    tipoOperacion,
    concepto: items.length > 0 ? items.map((i) => `${i.desc} (x${i.cant})`).slice(0, 3).join(", ") : "Factura de compra/servicio",
    items,
    estadoRadian: "pendiente",
  };
}

/**
 * Parsea una representación gráfica HTML de factura de la DIAN o portal de facturación.
 */
function parsearHtmlDian(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const textoPlano = doc.body.innerText || doc.body.textContent || "";

  // Extraer CUFE
  const cufeMatch = textoPlano.match(/CUFE[:\s]*([0-9a-fA-F]{64,96})/i) || textoPlano.match(CUFE_REGEX);
  const cufe = cufeMatch ? cufeMatch[1] : "";

  // Extraer Número de Factura
  const facturaMatch =
    textoPlano.match(/(?:Factura(?:\s+Electr[oó]nica)?(?:\s+de\s+Venta)?\s*(?:N[o°.]|Número)?[:\s]*)([A-Za-z0-9-_]{3,20})/i) ||
    textoPlano.match(/(?:N[uú]mero\s+de\s+factura[:\s]*)([A-Za-z0-9-_]{3,20})/i);
  const factura = facturaMatch ? facturaMatch[1].trim() : "FE-001";

  // Extraer NIT Proveedor
  const nitMatch = textoPlano.match(/(?:NIT|N\.I\.T|RUT)[:\s]*([\d.,-]{7,15})/i);
  let nit = nitMatch ? nitMatch[1].replace(/\D/g, "") : "";
  let dv = "";
  if (nit.length > 9) {
    dv = nit.slice(-1);
    nit = nit.slice(0, -1);
  }

  // Extraer Nombre o Razón Social
  const razonMatch =
    textoPlano.match(/(?:Raz[oó]n\s+Social|Emisor|Proveedor|Señor(?:es)?)[:\s]+([^\n\r,]{3,60})/i) ||
    textoPlano.match(/([A-Z0-9\s.]{4,50}\s+(?:S\.?A\.?S\.?|S\.?A\.?|LTDA\.?))/i);
  const nombreProveedor = razonMatch ? razonMatch[1].trim() : "Proveedor DIAN";

  // Extraer Fechas
  const fechaMatch = textoPlano.match(/(?:Fecha\s+(?:de\s+)?Emisi[oó]n|Fecha)[:\s]*(\d{4}[-/.]\d{2}[-/.]\d{2})/i);
  const fecha = fechaMatch ? fechaMatch[1].replace(/\//g, "-") : new Date().toISOString().slice(0, 10);

  const fechaVenceMatch = textoPlano.match(/(?:Fecha\s+(?:de\s+)?Vencimiento|Vence)[:\s]*(\d{4}[-/.]\d{2}[-/.]\d{2})/i);
  const fechaVence = fechaVenceMatch ? fechaVenceMatch[1].replace(/\//g, "-") : fecha;

  // Extraer Subtotal y Totales numéricos
  const subtotalMatch = textoPlano.match(/(?:Subtotal|Total\s+Bruto|Base\s+Gravable)[:\s]*\$?\s*([\d.,]{3,15})/i);
  const subtotal = subtotalMatch ? toNum(subtotalMatch[1]) : 0;

  const ivaMatch = textoPlano.match(/(?:IVA|Total\s+IVA|Impuesto)[:\s]*\$?\s*([\d.,]{3,15})/i);
  const valorIva = ivaMatch ? toNum(ivaMatch[1]) : 0;

  const totalMatch = textoPlano.match(/(?:Total\s+a\s+Pagar|Total\s+Factura|Valor\s+Total|Total)[:\s]*\$?\s*([\d.,]{3,15})/i);
  const valorTotalPagar = totalMatch ? toNum(totalMatch[1]) : subtotal + valorIva;

  return {
    formato: "html-dian",
    factura,
    cufe,
    fecha,
    fechaVence,
    proveedor: {
      nombre: nombreProveedor,
      nit,
      dv,
      direccion: "",
      ciudad: "Envigado",
      municipioIca: "Envigado",
      telefono: "",
      email: "",
      responsableIva: valorIva > 0,
      autorretenedorRenta: false,
    },
    receptor: {
      nombre: "INGEANCLAJES S.A.S.",
      nit: "900193965",
    },
    subtotal: subtotal || valorTotalPagar,
    tarifaIva: valorIva > 0 ? 19 : 0,
    valorIva,
    valorRetFuente: 0,
    valorReteiva: 0,
    valorReteica: 0,
    valorTotalPagar: valorTotalPagar || subtotal,
    tipoOperacion: "compras",
    concepto: `Factura ${factura} de ${nombreProveedor}`,
    items: [],
    estadoRadian: "pendiente",
  };
}

/**
 * Función principal para leer cualquier factura electrónica DIAN
 * (sea archivo o texto plano, XML UBL o HTML).
 */
export async function leerFacturaDian(archivoOTexto) {
  let texto = "";

  if (typeof archivoOTexto === "string") {
    texto = archivoOTexto.trim();
  } else if (archivoOTexto && typeof archivoOTexto.text === "function") {
    texto = (await archivoOTexto.text()).trim();
  } else {
    throw new Error("No se suministró un archivo o texto de factura válido.");
  }

  if (!texto) {
    throw new Error("El contenido de la factura está vacío.");
  }

  // Detectar formato
  const esXml = texto.startsWith("<?xml") || texto.includes("<AttachedDocument") || texto.includes("<Invoice");
  if (esXml) {
    return parsearXmlDian(texto);
  }

  const esHtml = texto.includes("<html") || texto.includes("<!DOCTYPE html") || texto.includes("<table") || texto.includes("<div");
  if (esHtml) {
    return parsearHtmlDian(texto);
  }

  // Si viene solo un CUFE pegado
  const soloCufe = texto.match(CUFE_REGEX);
  if (soloCufe) {
    return {
      formato: "cufe-directo",
      factura: "CONSULTA-DIAN",
      cufe: soloCufe[1],
      fecha: new Date().toISOString().slice(0, 10),
      fechaVence: new Date().toISOString().slice(0, 10),
      proveedor: {
        nombre: "Proveedor por consultar en DIAN",
        nit: "",
        dv: "",
        direccion: "",
        ciudad: "Envigado",
        municipioIca: "Envigado",
        telefono: "",
        email: "",
        responsableIva: true,
        autorretenedorRenta: false,
      },
      receptor: { nombre: "INGEANCLAJES S.A.S.", nit: "900193965" },
      subtotal: 0,
      tarifaIva: 19,
      valorIva: 0,
      valorRetFuente: 0,
      valorReteiva: 0,
      valorReteica: 0,
      valorTotalPagar: 0,
      tipoOperacion: "servicio",
      concepto: `Factura consultada por CUFE: ${soloCufe[1].slice(0, 10)}...`,
      items: [],
      estadoRadian: "pendiente",
    };
  }

  throw new Error(
    "El formato no coincide con un XML UBL 2.1 ni con un HTML de factura electrónica DIAN."
  );
}
