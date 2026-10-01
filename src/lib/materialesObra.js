// Estimación técnica y lista de despacho de materiales para obras
// a partir de los sistemas cotizados (Ingeanclajes)

/**
 * Extrae metros de longitud de un texto técnico como "LÍNEA DE VIDA DE 15 M"
 */
function extraerLongitudMetros(texto = "") {
  const match = String(texto).match(/(\d+(?:[.,]\d+)?)\s*(?:m|ml|metros)\b/i);
  if (match) {
    const val = parseFloat(match[1].replace(",", "."));
    if (val > 0 && val < 500) return val;
  }
  return 12; // Valor típico si no se especifica
}

/**
 * Genera la lista de materiales e insumos técnicos estimados
 * a partir de los ítems de la cotización vinculada.
 */
export function generarDesgloseMateriales(itemsCot = []) {
  if (!Array.isArray(itemsCot) || !itemsCot.length) {
    return { entregables: [], insumos: [] };
  }

  // 1. Entregables directos de la cotización
  const entregables = itemsCot.map((it, idx) => {
    const cant = Math.max(1, Math.round(Number(it.cant || it.cantidad || 1)));
    const unidad = it.unit || it.unidad || "Und";
    const desc = it.desc || it.descripcion || `Ítem cotizado ${idx + 1}`;
    return {
      id: `ent-${it.id || idx + 1}`,
      itemCotId: it.id || String(idx + 1),
      cant,
      unidad,
      descripcion: desc,
      estado: "Pendiente", // "Pendiente" | "En alistamiento" | "Despachado" | "Instalado"
      notas: "",
    };
  });

  // 2. Cálculo acumulado de insumos técnicos
  let totalMetrosCableHoriz = 0;
  let totalMetrosCableVert = 0;
  let totalAbsorbedores = 0;
  let totalTensores = 0;
  let totalPostesTerminales = 0;
  let totalPasadoresIntermedios = 0;
  let totalPuntosAnclajeFijo = 0;
  let totalPlacasCertificacion = 0;
  let totalVarillasRoscadas = 0;
  let totalCartuchosEpoxicos = 0;

  for (const it of itemsCot) {
    const cant = Math.max(1, Math.round(Number(it.cant || it.cantidad || 1)));
    const desc = (it.desc || it.descripcion || "").toLowerCase();

    // Líneas de vida horizontales
    if (desc.includes("horizontal") && (desc.includes("vida") || desc.includes("linea") || desc.includes("línea"))) {
      const long = extraerLongitudMetros(desc);
      totalMetrosCableHoriz += Math.round(cant * (long * 1.1 + 3)); // 10% adicional + holgura para terminales
      totalAbsorbedores += cant;
      totalTensores += cant * 2;
      totalPostesTerminales += cant * 2;

      // Intermedios cada 10-12m si supera los 12m
      const intermediosPorLinea = long > 12 ? Math.floor(long / 10) : 0;
      totalPasadoresIntermedios += cant * intermediosPorLinea;

      // Anclajes químicos (4 por poste)
      const postesTotales = (cant * 2) + (cant * intermediosPorLinea);
      totalVarillasRoscadas += postesTotales * 4;
      totalCartuchosEpoxicos += Math.ceil((postesTotales * 4) / 6); // 1 cartucho rinde aprox 6 anclajes
      totalPlacasCertificacion += cant;
    }
    // Líneas de vida verticales
    else if (desc.includes("vertical") && (desc.includes("vida") || desc.includes("linea") || desc.includes("línea"))) {
      const long = extraerLongitudMetros(desc);
      totalMetrosCableVert += Math.round(cant * (long + 3));
      totalAbsorbedores += cant;
      totalTensores += cant;
      totalPlacasCertificacion += cant;
      totalVarillasRoscadas += cant * 4;
      totalCartuchosEpoxicos += Math.ceil((cant * 4) / 6);
    }
    // Puntos de anclaje fijos
    else if (desc.includes("anclaje") || desc.includes("punto")) {
      totalPuntosAnclajeFijo += cant;
      totalVarillasRoscadas += cant;
      totalCartuchosEpoxicos += Math.ceil(cant / 5);
      totalPlacasCertificacion += cant;
    }
    // Inspección / Certificación
    else if (desc.includes("certificaci") || desc.includes("inspecci")) {
      totalPlacasCertificacion += cant;
    }
  }

  const insumos = [];

  // Agregar insumos calculados
  if (totalMetrosCableHoriz > 0) {
    insumos.push({
      id: "mat-cab-horiz",
      categoria: "Cables y Accesorios",
      nombre: "Cable de acero 5/16\" (7x19) Alma de acero galvanizado / inox",
      cant: totalMetrosCableHoriz,
      unidad: "ML",
      estado: "En Bodega",
      verificado: false,
    });
  }

  if (totalMetrosCableVert > 0) {
    insumos.push({
      id: "mat-cab-vert",
      categoria: "Cables y Accesorios",
      nombre: "Cable de acero 5/16\" o 3/8\" alma de acero para línea vertical",
      cant: totalMetrosCableVert,
      unidad: "ML",
      estado: "En Bodega",
      verificado: false,
    });
    insumos.push({
      id: "mat-arr-vert",
      categoria: "Cables y Accesorios",
      nombre: "Arrestador de caídas desmontable para cable vertical con conector",
      cant: Math.max(1, Math.round(totalMetrosCableVert / 15)),
      unidad: "Und",
      estado: "En Bodega",
      verificado: false,
    });
  }

  if (totalAbsorbedores > 0) {
    insumos.push({
      id: "mat-abs-imp",
      categoria: "Cables y Accesorios",
      nombre: "Absorbedor de energía de impacto en acero inoxidable para línea de vida",
      cant: totalAbsorbedores,
      unidad: "Und",
      estado: "En Bodega",
      verificado: false,
    });
  }

  if (totalTensores > 0) {
    insumos.push({
      id: "mat-ten-forj",
      categoria: "Cables y Accesorios",
      nombre: "Tensor forjado ojo-mandíbula 1/2\" o 5/8\" con tuerca de seguridad",
      cant: totalTensores,
      unidad: "Und",
      estado: "En Bodega",
      verificado: false,
    });
    insumos.push({
      id: "mat-gra-pren",
      categoria: "Cables y Accesorios",
      nombre: "Prensacables / terminales en acero forjado para cable de 5/16\"",
      cant: totalTensores * 3,
      unidad: "Und",
      estado: "En Bodega",
      verificado: false,
    });
  }

  if (totalPostesTerminales > 0) {
    insumos.push({
      id: "mat-pst-term",
      categoria: "Estructuras y Postes",
      nombre: "Postes estructurales terminales de anclaje para línea de vida",
      cant: totalPostesTerminales,
      unidad: "Und",
      estado: "En Bodega",
      verificado: false,
    });
  }

  if (totalPasadoresIntermedios > 0) {
    insumos.push({
      id: "mat-pas-int",
      categoria: "Estructuras y Postes",
      nombre: "Pasadores intermedios anticorte para línea de vida",
      cant: totalPasadoresIntermedios,
      unidad: "Und",
      estado: "En Bodega",
      verificado: false,
    });
  }

  if (totalPuntosAnclajeFijo > 0) {
    insumos.push({
      id: "mat-anc-5k",
      categoria: "Fijación y Anclajes",
      nombre: "Placas / Cáncamos de anclaje fijo certificados 5.000 lbf (22.2 kN)",
      cant: totalPuntosAnclajeFijo,
      unidad: "Und",
      estado: "En Bodega",
      verificado: false,
    });
  }

  if (totalVarillasRoscadas > 0) {
    insumos.push({
      id: "mat-var-rosc",
      categoria: "Fijación y Anclajes",
      nombre: "Espárragos / Varillas roscadas Grado B7 o Inox A4 (1/2\" x 6\" o 5/8\") con tuerca",
      cant: totalVarillasRoscadas,
      unidad: "Und",
      estado: "En Bodega",
      verificado: false,
    });
  }

  if (totalCartuchosEpoxicos > 0) {
    insumos.push({
      id: "mat-epox-res",
      categoria: "Fijación y Anclajes",
      nombre: "Cartuchos de adhesivo epóxico estructural de alta resistencia (Hilti / Sikadur)",
      cant: Math.max(1, totalCartuchosEpoxicos),
      unidad: "Cartuchos",
      estado: "En Bodega",
      verificado: false,
    });
  }

  if (totalPlacasCertificacion > 0) {
    insumos.push({
      id: "mat-plc-cert",
      categoria: "Señalización y Placas",
      nombre: "Placas reglamentarias de identificación y certificación Res. 4272/2021",
      cant: totalPlacasCertificacion,
      unidad: "Und",
      estado: "En Bodega",
      verificado: false,
    });
  }

  // Consumibles generales de montaje siempre necesarios
  insumos.push({
    id: "mat-bro-sds",
    categoria: "Consumibles y Herramientas",
    nombre: "Brocas de percusión para concreto SDS-Plus / Max (1/2\" o 5/8\")",
    cant: 2,
    unidad: "Und",
    estado: "En Bodega",
    verificado: false,
  });

  insumos.push({
    id: "mat-kit-torq",
    categoria: "Consumibles y Herramientas",
    nombre: "Kit de instalación (Dinamómetro/Torquímetro, cepillo de limpieza y bomba de aire)",
    cant: 1,
    unidad: "Kit",
    estado: "En Bodega",
    verificado: false,
  });

  return { entregables, insumos };
}

/**
 * Genera el documento HTML imprimible de Remisión y Despacho de Materiales
 * con el formato oficial sobrio de Ingeanclajes.
 */
export function generarRemisionDespachoHtml({ obra, cotizacion, materialesDespacho }) {
  const numCot = cotizacion?.numero || "S/N";
  const numObra = obra?.id || "OBRA";
  const cliente = obra?.cliente || cotizacion?.cliente || "Cliente";
  const nit = obra?.nit || cotizacion?.nit || "";
  const proyecto = obra?.proyecto || "Proyecto";
  const direccion = obra?.direccion || cotizacion?.direccion || "";
  const fechaHoy = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

  const entregables = materialesDespacho?.entregables || [];
  const insumos = materialesDespacho?.insumos || [];

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Remisión de Materiales y Despacho - ${numObra}</title>
  <style>
    @page { size: letter; margin: 15mm 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 24px;
      background: #fff;
      font-size: 12px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; }
    .brand-sub { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 14px; font-weight: 800; color: #b45309; text-transform: uppercase; }
    .doc-num { font-size: 13px; font-weight: 700; color: #0f172a; }
    
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 18px;
    }
    .meta-item strong { color: #475569; font-size: 11px; }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin: 16px 0 8px 0;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11.5px; }
    th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #e2e8f0; }
    td { padding: 6px 8px; border: 1px solid #e2e8f0; color: #334155; }
    .cant { text-align: center; font-weight: 700; color: #0f172a; width: 55px; }
    .unit { text-align: center; color: #64748b; width: 65px; }
    .check { text-align: center; width: 50px; font-weight: 700; }
    
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
      padding-top: 10px;
    }
    .sig-box {
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      font-size: 11px;
    }
    .sig-name { font-weight: 700; color: #0f172a; }
    .sig-role { color: #64748b; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">INGEANCLAJES S.A.S.</div>
      <div class="brand-sub">Ingeniería e Instalación de Sistemas de Protección Contra Caídas</div>
    </div>
    <div class="doc-info">
      <div class="doc-title">Remisión de Materiales y Salida de Bodega</div>
      <div class="doc-num">Obra: ${numObra} · Cotización: ${numCot}</div>
      <div style="font-size: 11px; color: #64748b;">Fecha: ${fechaHoy}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><strong>CLIENTE:</strong> ${cliente} ${nit ? `(${nit})` : ""}</div>
    <div class="meta-item"><strong>PROYECTO / SEDE:</strong> ${proyecto}</div>
    <div class="meta-item"><strong>DIRECCIÓN:</strong> ${direccion || "En obra"}</div>
    <div class="meta-item"><strong>VINCULACIÓN:</strong> Cotización ${numCot}</div>
  </div>

  <div class="section-title">1. Sistemas y Entregables Cotizados a Instalar</div>
  <table>
    <thead>
      <tr>
        <th class="cant">Cant.</th>
        <th class="unit">Unidad</th>
        <th>Descripción del Sistema</th>
        <th class="check">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${entregables.map(e => `
        <tr>
          <td class="cant">${e.cant}</td>
          <td class="unit">${e.unidad}</td>
          <td>${e.descripcion}</td>
          <td class="check">${e.estado || "Pendiente"}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="section-title">2. Insumos Técnicos y Piezas de Instalación Despachadas (Bodega)</div>
  <table>
    <thead>
      <tr>
        <th class="cant">Cant.</th>
        <th class="unit">Unidad</th>
        <th>Categoría</th>
        <th>Descripción y Especificación del Material</th>
        <th class="check">Despacho</th>
      </tr>
    </thead>
    <tbody>
      ${insumos.map(m => `
        <tr>
          <td class="cant">${m.cant}</td>
          <td class="unit">${m.unidad}</td>
          <td style="color:#64748b; font-size: 10.5px;">${m.categoria || "General"}</td>
          <td><strong>${m.nombre}</strong></td>
          <td class="check">${m.verificado || m.estado === "Despachado a Obra" ? "✓ OK" : "Pend."}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div style="font-size: 10.5px; color: #64748b; margin-top: 14px; font-style: italic;">
    Nota: Todos los componentes suministrados cuentan con trazabilidad técnica y cumplen con los requisitos de la Resolución 4272 de 2021 del Ministerio del Trabajo y normas ANSI/OSHA vigentes.
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-name">Despachado por (Bodega / Almacén):</div>
      <div class="sig-role">Firma y C.C.</div>
      <div style="margin-top: 25px; border-bottom: 1px dotted #cbd5e1; width: 80%;"></div>
    </div>
    <div class="sig-box">
      <div class="sig-name">Recibido en Obra (Ingeniero / Residente):</div>
      <div class="sig-role">Firma y C.C.</div>
      <div style="margin-top: 25px; border-bottom: 1px dotted #cbd5e1; width: 80%;"></div>
    </div>
  </div>
</body>
</html>
  `;
}
