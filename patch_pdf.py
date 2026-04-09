path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# ─── find start and end of buildCotizacionPrintHtml ───
START = 'function buildCotizacionPrintHtml(c){'
END_MARKER = '\nfunction openCotizacionPrint'

idx_start = content.find(START)
idx_end   = content.find(END_MARKER, idx_start)
assert idx_start >= 0, "start not found"
assert idx_end   >= 0, "end not found"

OLD_FN = content[idx_start:idx_end]

NEW_FN = r'''function buildCotizacionPrintHtml(c){
  const propuestas = getQuoteProposals(c);
  const activa = getQuoteActiveProposal(c);
  c = mergeQuoteWithProposal(c, activa);
  const items = normalizeQuoteItems(c);
  const measurements = Array.isArray(c.geoMediciones) ? c.geoMediciones : [];
  const fotosCotizacion = Array.isArray(c.fotosCotizacion) ? c.fotosCotizacion.filter(f=>f?.src) : [];
  const esObraBlanca = c.tipoCotizacion === "obra_blanca";
  const alcancePropuesta = String(c.propuestaAlcance || c.alcance || "").trim();
  const requerimientoCliente = String(c.requerimientoCliente || "").trim();
  const mapQuery = c.coords || `${c.obra||""} ${c.ciudad||""}`.trim();
  const { width: mapWidth, height: mapHeight } = getStaticMapDimensions(c.geoMapView);
  const quoteMapSrc = c.mapImg && String(c.mapImg).startsWith("data:")
    ? c.mapImg
    : (buildGoogleStaticMapUrl(measurements, mapQuery, c.geoMapView, { width: mapWidth, height: mapHeight }) || c.mapImg || "");
  const showVerticalAppendix = hasVerticalLifeLineService(c);
  const sub = items.reduce((s,i)=>s+(Number(i.cant)||0)*(Number(i.vu)||0),0);
  const ut  = sub * (Number(c.util)||10) / 100;
  const iva = ut * 0.19;
  const tot = sub + ut + iva;
  const narrative = buildMeasurementNarrative(measurements);

  // Intro paragraph: use alcance if filled, else auto-generate
  const introParrafo = alcancePropuesta
    ? escapeHtml(alcancePropuesta)
    : (narrative
        ? `Tenemos el agrado de presentar nuestra cotización para la instalación sobre cubierta: ${escapeHtml(narrative)}.`
        : esObraBlanca
          ? `Tenemos el agrado de presentar nuestra cotización para la obra blanca solicitada.`
          : `Tenemos el agrado de presentar nuestra cotización para el suministro e instalación de los sistemas de protección anticaída requeridos para la obra.`);

  // Definitions text - matches real PDFs exactly
  const defTrabajo = `<strong>Trabajo en altura:</strong> Se considera toda actividad, labor o trabajo que se deba realizar a una altura física igual o superior a 1,50 metros desde el piso.`;
  const defPuntos  = `<strong>Puntos de anclaje:</strong> Son componentes en acero anclado con un epóxico químico marca PURE 110 de POWER FASTENERS o equivalente, con perno de 5/8 a una profundidad de 15 cm o más según el caso a estructuras en concreto, con capacidad de resistir una fuerza de caída de más de 5.000 Lbs.`;
  const defLinea   = `<strong>Línea de vida:</strong> Son componentes de un sistema/equipo de protección de caídas, consistentes en una cuerda de nylon o cable de acero instalada en forma horizontal y vertical, tensionada y sujeta en tres o dos puntos de anclaje para otorgar movilidad al personal que trabaja en áreas elevadas.`;
  const defBullets = [
    `La línea de vida permite la fijación o enganche en forma directa o indirecta al arnés completo para el cuerpo, o a un dispositivo de impacto o amortiguador.`,
    `Las líneas de vida estarán constituidas por un solo cable continuo.`,
    `Los anclajes a los cuales se fijarán las líneas de vida deben resistir al menos 5.000 libras por cada persona asegurada.`,
  ].map(b=>`<li>${b}</li>`).join('');

  // Item rows for propuesta table
  const itemRows = items.map((it,idx)=>{
    const desc = escapeHtml(it.desc || `ÍTEM ${idx+1}`);
    const qty  = Number(it.cant||0).toFixed(0);
    const unit = escapeHtml(it.unit || 'UND');
    const val  = fmt(Number(it.vu)||0);
    const sub2 = fmt((Number(it.cant)||0)*(Number(it.vu)||0));
    return `<tr><td style="text-align:left">${desc}</td><td class="num">${qty}</td><td class="ctr">${unit}</td><td class="num">${val}</td><td class="num">${sub2}</td></tr>`;
  }).join('');

  // Propuesta title
  const propTitle = propuestas.length > 1
    ? escapeHtml(activa.nombre).toUpperCase()
    : (esObraBlanca ? "PROPUESTA ECONÓMICA" : "PROPUESTA ECONÓMICA");

  // Map block: only if we have a URL
  const mapBlock = quoteMapSrc ? `
    <div class="map-wrap">
      <img src="${quoteMapSrc}" class="map-img" alt="Proyección de líneas de vida"/>
      ${getStaticMapLabelData(measurements, mapQuery, c.geoMapView).map(l=>`<div class="map-lbl" style="left:${l.left};top:${l.top};color:${l.color};transform:translate(-50%,-50%) rotate(${l.angle}deg)">${escapeHtml(l.title)} - ${escapeHtml(l.value)}</div>`).join('')}
    </div>` : '';

  // Fotos block
  const fotosBlock = fotosCotizacion.length ? `
    <div class="sec-title">REGISTRO FOTOGRÁFICO</div>
    <div class="photo-grid">
      ${fotosCotizacion.map((f,i)=>`
        <div class="photo-card">
          <img src="${f.src}" class="photo-img" alt="${escapeHtml(f.label||'Foto '+(i+1))}"/>
          <div class="photo-lbl">${escapeHtml(f.label||'Foto '+(i+1))}</div>
        </div>`).join('')}
    </div>` : '';

  // Multiple proposals summary
  const multiPropBlock = propuestas.length > 1 ? `
    <div class="info-box">
      <strong>Esta cotización incluye ${propuestas.length} propuestas:</strong><br/>
      ${propuestas.map((p,i)=>`${i+1}. ${escapeHtml(p.nombre)} — <strong>${fmt(Number(p.total||0))}</strong>`).join('<br/>')}
    </div>` : '';

  // Requerimiento block (obra blanca)
  const reqBlock = esObraBlanca && requerimientoCliente ? `
    <div class="info-box"><strong>Necesidad del cliente:</strong><br/><span style="white-space:pre-wrap">${escapeHtml(requerimientoCliente)}</span></div>` : '';

  const HDR = `
    <div class="hdr">
      <img src="${LOGO_INGEANCLAJES}" class="logo" alt="Ingeanclajes"/>
      <div class="hdr-mid">ESPECIALISTAS EN ANCLAJES</div>
      <div class="hdr-right">Calle 38 sur # 36 – 48, Envigado<br/>PBX 448 26 86 &nbsp;·&nbsp; Cel. 315 288 95 41<br/>Nit. 900193965-4<br/>comercial1ingeanclajes@gmail.com<br/>www.ingeanclajes.com</div>
    </div>
    <div class="hdr-line"></div>`;

  const FTR = `<div class="ftr">Calle 38 sur # 36 – 48, Envigado &nbsp;·&nbsp; PBX 448 26 86 &nbsp;·&nbsp; Cel. 315 288 95 41 &nbsp;·&nbsp; Nit. 900193965-4 &nbsp;·&nbsp; comercial1ingeanclajes@gmail.com &nbsp;·&nbsp; www.ingeanclajes.com</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Cotización ${escapeHtml(c.numero||'')}</title>
<style>
@page { size: Letter; margin: 18mm 22mm 18mm; }
*{ box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
html,body{ background:#fff; margin:0; padding:0; }
body{ font-family: "Times New Roman", Times, serif; color:#111; font-size:11.5pt; line-height:1.55; }
.page{ width:100%; display:flex; flex-direction:column; min-height:240mm; page-break-after:always; break-after:page; padding-bottom:8mm; }
.page:last-child{ page-break-after:auto; break-after:auto; }
/* HEADER */
.hdr{ display:flex; align-items:flex-start; gap:10px; margin-bottom:4px; }
.logo{ height:64px; width:auto; object-fit:contain; flex-shrink:0; }
.hdr-mid{ flex:1; text-align:center; font-family:Arial,Helvetica,sans-serif; font-weight:900; font-size:13pt; letter-spacing:1.5px; padding-top:10px; color:#111; }
.hdr-right{ text-align:right; font-size:8pt; color:#444; line-height:1.5; white-space:nowrap; }
.hdr-line{ border-top:2.5px solid #cc0000; margin-bottom:14px; }
/* FOOTER */
.ftr{ margin-top:auto; border-top:1px solid #aaa; padding-top:5px; text-align:center; font-size:8pt; color:#555; }
/* META LINE */
.meta{ display:flex; justify-content:space-between; align-items:baseline; margin-bottom:16px; font-size:11.5pt; }
/* CLIENT BLOCK */
.client{ margin-bottom:18px; font-size:11.5pt; line-height:1.7; }
/* BODY TEXT */
p{ margin:0 0 9px; }
ul{ margin:6px 0 12px 24px; padding:0; }
li{ margin-bottom:5px; }
/* SECTION TITLE */
.sec-title{ text-align:center; font-weight:900; font-family:Arial,Helvetica,sans-serif; font-size:12pt; text-transform:uppercase; letter-spacing:.5px; border-bottom:2px solid #111; padding-bottom:4px; margin:16px 0 10px; }
/* TABLE */
table{ width:100%; border-collapse:collapse; margin:6px 0 10px; font-size:11pt; }
th,td{ border:1px solid #111; padding:6px 9px; vertical-align:middle; }
th{ background:#f0f0f0; font-weight:900; font-family:Arial,Helvetica,sans-serif; font-size:10.5pt; text-align:center; }
.num{ text-align:right; white-space:nowrap; }
.ctr{ text-align:center; }
.bold-row td{ font-weight:900; }
.total-row td{ background:#ffffaa; font-weight:900; font-size:12pt; }
.note{ text-align:center; font-weight:900; font-family:Arial,Helvetica,sans-serif; font-size:10.5pt; margin:6px 0 14px; }
/* MAP */
.map-wrap{ position:relative; width:100%; border:1px solid #bbb; overflow:hidden; margin:0 0 14px; background:#f5f5f5; aspect-ratio: ${mapWidth}/${mapHeight}; max-height:300px; }
.map-img{ position:absolute; inset:0; width:100%; height:100%; object-fit:fill; display:block; }
.map-lbl{ position:absolute; pointer-events:none; font-size:7px; font-weight:800; white-space:nowrap; background:rgba(255,255,255,.85); padding:1px 3px; border-radius:8px; transform-origin:center; }
/* PHOTOS */
.photo-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
.photo-card{ border:1px solid #ccc; padding:6px; break-inside:avoid; }
.photo-img{ width:100%; height:200px; object-fit:cover; display:block; }
.photo-lbl{ text-align:center; font-size:9.5pt; color:#555; padding-top:5px; }
/* INFO BOX */
.info-box{ border:1px solid #ccc; background:#f9f9f9; padding:9px 12px; margin-bottom:12px; font-size:10.5pt; }
/* COMMERCIAL CONDITIONS */
.cond-table td:first-child{ width:34%; font-weight:900; }
/* SIGNATURE */
.sig{ margin-top:28px; }
.sig-space{ height:68px; }
.sig-line{ border-top:1px solid #111; padding-top:6px; display:inline-block; min-width:320px; }
/* INCLUDES LIST */
.includes li{ margin-bottom:6px; }
/* NO BREAK */
table,tr,td,th,.photo-card,.map-wrap,.sig{ break-inside:avoid; page-break-inside:avoid; }
img{ max-width:100%; }
</style></head><body>

<!-- ═══════════════════════════════════════════════════════════ PAGE 1 - COVER -->
<div class="page">
  ${HDR}
  <div class="meta">
    <span>Envigado, ${escapeHtml(fmtL(c.fecha||today()))}</span>
    <span><strong>COTIZACIÓN No. ${escapeHtml(c.numero||'')}</strong></span>
  </div>
  <div class="client">
    <p><strong>SEÑORES:</strong></p>
    <p><strong>${escapeHtml((c.cliente||'').toUpperCase())}</strong></p>
    ${c.obra ? `<p>ATENCIÓN: &nbsp;${escapeHtml(c.obra.toUpperCase())}</p>` : ''}
    ${c.telefono ? `<p>TELÉFONO: ${escapeHtml(c.telefono)}</p>` : ''}
    ${c.ciudad ? `<p>${escapeHtml(c.ciudad.toUpperCase())}</p>` : ''}
  </div>

  <p>Cordial saludo.</p>
  <br/>
  <p>${introParrafo}</p>
  <br/>
  ${reqBlock}
  ${esObraBlanca ? '' : `
  <p>${defTrabajo}</p>
  <p>${defPuntos}</p>
  <p>${defLinea}</p>
  <ul>${defBullets}</ul>
  `}
  ${multiPropBlock}
  ${FTR}
</div>

<!-- ═══════════════════════════════════════════════════════════ PAGE 2 - MAP + PHOTOS -->
${(quoteMapSrc || fotosCotizacion.length) ? `
<div class="page">
  ${HDR}
  ${quoteMapSrc ? `<div class="sec-title">PROYECCIÓN DE LÍNEAS DE VIDA</div>${mapBlock}` : ''}
  ${fotosBlock}
  ${FTR}
</div>` : ''}

<!-- ═══════════════════════════════════════════════════════════ PAGE 3 - PROPUESTA ECONÓMICA -->
<div class="page">
  ${HDR}
  <div class="sec-title">${propTitle}</div>
  <table>
    <thead><tr><th style="text-align:left">DESCRIPCIÓN</th><th>CANTIDAD</th><th>UNIDAD</th><th>VALOR</th><th>SUBTOTAL</th></tr></thead>
    <tbody>
      ${itemRows}
      <tr class="bold-row"><td colspan="4">SUBTOTAL</td><td class="num">${fmt(sub)}</td></tr>
      <tr><td colspan="4">ADMINISTRACIÓN</td><td class="num">$ &nbsp;- -</td></tr>
      <tr><td colspan="4">IMPREVISTOS</td><td class="num">$ &nbsp;- -</td></tr>
      <tr><td colspan="4">UTILIDADES (${Number(c.util||10).toFixed(0)} % VALOR DE LA OBRA)</td><td class="num">${fmt(ut)}</td></tr>
      <tr><td colspan="4">IVA (19 % VALOR DE LAS UTILIDADES)</td><td class="num">${fmt(iva)}</td></tr>
      <tr class="total-row"><td colspan="4">TOTAL</td><td class="num">${fmt(tot)}</td></tr>
    </tbody>
  </table>
  <div class="note">EL IVA ES EL 19 % SOBRE LAS UTILIDADES</div>

  <div class="sec-title">CONDICIONES COMERCIALES</div>
  <table class="cond-table"><tbody>
    <tr><td><strong>FORMA DE PAGO</strong></td><td>${escapeHtml(c.formaPago||'50% ANTICIPO, 50% CONCLUIR LABORES')}</td></tr>
    <tr><td><strong>TIEMPO DE EJECUCIÓN</strong></td><td>${escapeHtml(c.tiempoEjec||'10 DÍAS')}</td></tr>
    <tr><td><strong>VALIDEZ DE LA OFERTA</strong></td><td>${escapeHtml(`${c.val||30} DÍAS A PARTIR DE LA FECHA DE ENTREGA DE ESTA COTIZACIÓN`)}</td></tr>
    <tr><td><strong>CERTIFICACIÓN</strong></td><td>SE ENTREGA CON EL PAGO TOTAL</td></tr>
  </tbody></table>

  <p>Todo el personal que labora en la empresa se encuentra afiliado a ARL, Salud y Pensiones. Llevamos todos los elementos personales de seguridad necesarios para efectuar dicho trabajo. Realizamos todas las reparaciones de los daños que puedan surgir durante la ejecución de dicho trabajo y se entregan todas las pólizas exigidas por el contratante.</p>

  <div class="sig">
    <p>Cordialmente,</p>
    <div class="sig-space"></div>
    <div class="sig-line">
      <strong>ING. JHON JAIME SEPÚLVEDA LONDOÑO</strong><br/>
      MP. 05256-409949<br/>
      GERENTE GENERAL<br/>
      Tel: 315 288 95 41
    </div>
  </div>
  ${FTR}
</div>

<!-- ═══════════════════════════════════════════════════════════ PAGE 4 - INCLUYE + TABLA TÉCNICA -->
<div class="page">
  ${HDR}
  <div class="sec-title">ESTA COTIZACIÓN INCLUYE</div>
  <ul class="includes">
    <li>Tuercas y arandelas en acero galvanizado y/o inoxidable certificado.</li>
    <li>Los elementos utilizados en la instalación son certificados de fábrica, los cuales se adjuntan en la entrega de documentación de certificados.</li>
    <li>Transporte de materiales y de personal hasta el sitio de trabajo.</li>
    <li>Se entregan todos los certificados de acuerdo a la Resolución 4272 de trabajo seguro en alturas.</li>
    <li>Recertificación sin costo al año siguiente de la instalación.</li>
    <li>Esta propuesta incluye el coordinador para trabajo seguro en alturas de tiempo completo en la obra.</li>
  </ul>

  <p>Todo el personal que labora en la empresa se encuentra afiliado a ARL, salud y pensiones. Llevamos todos los elementos personales de seguridad necesarios para efectuar dicho trabajo. Realizamos todas las reparaciones de los daños que puedan surgir durante la ejecución de dicho trabajo y se entregan todas las pólizas exigidas por el contratante.</p>

  <div class="sec-title">SISTEMA NO CONTINUO EN ACERO GALVANIZADO</div>
  <table>
    <thead><tr><th style="width:22%;text-align:left">ELEMENTO</th><th style="text-align:left">CARACTERÍSTICA</th></tr></thead>
    <tbody>
      <tr><td><strong>Soporte lateral e intermedio</strong></td><td>Este elemento está diseñado para ser usado en sistemas de líneas de vida horizontales de tipo continuo. El componente soporta regularmente el cable de acero para que una sección libre de cable no supere la luz máxima permitida. Este soporte intermedio permite el uso de un carro deslizador para evitar el uso de eslinga en Y por parte del trabajador y evitar que el colaborador se desconecte.</td></tr>
      <tr><td><strong>Tensor</strong></td><td>Este elemento está diseñado para ser usado en sistemas de líneas de vida horizontales. En sus extremos el tensor se asegura al cable de la línea de vida y a un absorbedor de energía respectivamente. Su función es tensionar la línea de vida para que, en el momento de una caída, la distancia de caída del trabajador sea mínima.</td></tr>
      <tr><td><strong>Empalmes y fijaciones</strong></td><td>Fabricados en aluminio. Resistentes a la corrosión y oxidación. Se utilizan para empalmar dos cables y fijar barandillas de cables.</td></tr>
      <tr><td><strong>Guardacables</strong></td><td>Fabricado en acero con acabado galvanizado resistente a la corrosión. Protegen contra el desgaste y deformación del cable, alargando su vida útil.</td></tr>
      <tr><td><strong>Cable de acero</strong></td><td>Se fabrica bajo un diseño que permite absorber el desgaste y los esfuerzos causados por el contacto con poleas, tambores y otras superficies, así como las tensiones estáticas y dinámicas. Se compone por alambres de acero, estirados en frío, trenzados en espiral, formando unidades denominadas torones.</td></tr>
    </tbody>
  </table>
  ${FTR}
</div>

${showVerticalAppendix ? `
<div class="page" style="padding:0">
  <img src="${articoLineaVidaVertical}" style="width:100%;height:auto;display:block;" alt="Anexo técnico línea de vida vertical"/>
  ${FTR}
</div>` : ''}

</body></html>'''

content = content[:idx_start] + NEW_FN + content[idx_end:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done! buildCotizacionPrintHtml replaced.")
