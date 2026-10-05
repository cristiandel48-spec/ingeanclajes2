import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { LOGO_INGEANCLAJES } from "../src/assets/embeddedImages.js";

async function main() {
  const fotoPath = "C:/Users/User/.gemini/antigravity/brain/e2eac55d-b121-49b2-87a6-e33e7a2c5aa4/.user_uploaded/media_1790873961751.png";
  let fotoSrc = "";
  if (fs.existsSync(fotoPath)) {
    const buf = fs.readFileSync(fotoPath);
    fotoSrc = `data:image/png;base64,${buf.toString("base64")}`;
  }

  // Generar QR en base64 para verificación
  const qrDataUrl = await QRCode.toDataURL("https://ingeanclajessas.com/verificar?cot=C-26122&nit=21872838-9", {
    margin: 1,
    width: 140,
    color: { dark: "#0f172a", light: "#ffffff" }
  });

  const headerHtml = `
    <div class="header">
      <img src="${LOGO_INGEANCLAJES}" class="logo" alt="Ingeanclajes" />
      <div class="header-right">
        <div>Ingeanclajes S.A.S. &middot; Cotización C-26122</div>
        <div class="header-sello">RESOLUCIÓN 4272 DE 2021 &middot; <b>SST CERTIFICADO</b></div>
      </div>
    </div>
  `;

  const footerHtml = `
    <div class="footer">
      <div class="footer-col footer-col-left">
        <div class="footer-label">Sede Principal</div>
        <div class="footer-main">Calle 38 Sur # 36 &ndash; 48</div>
        <div class="footer-sub">Envigado &middot; Antioquia</div>
      </div>
      <div class="footer-col footer-col-center">
        <div class="footer-label">Líneas de Atención</div>
        <div class="footer-main">PBX (604) 448 26 86</div>
        <div class="footer-sub">Cel. 315 288 9541</div>
      </div>
      <div class="footer-col footer-col-right">
        <div class="footer-label">Contacto Digital</div>
        <div class="footer-main">comercial1ingeanclajes@gmail.com</div>
        <div class="footer-sub footer-brand">www.ingeanclajessas.com</div>
      </div>
    </div>
  `;

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap" rel="stylesheet" />
  <title>Cotización C-26122 - Comercializadora de Papas - Nuevo Formato</title>
  <style>
    @page { size: Letter; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    :root { --texto: 11.2px; --titulo: 16.5px; }
    html, body { margin:0; padding:0; background:#334155; }
    body { font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; color:#1E1E1E; -webkit-font-smoothing:antialiased; }

    .page {
      width:8.5in;
      height:11in;
      margin:26px auto;
      background:#fff;
      break-after:page;
      page-break-after:always;
      position:relative;
      overflow:hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.45);
      border-radius: 2px;
    }
    .page:last-child { break-after:auto; page-break-after:auto; margin-bottom:40px; }
    .page-inner { position:relative; width:100%; height:100%; padding:9mm 9mm 0 9mm; }
    .page-content { display:block; padding:0 9mm 28mm 9mm; }

    h1, h2, h3 { margin:0; font-family:'Source Serif 4', Georgia, serif; font-weight:600; text-wrap:balance; }
    p { margin:0 0 2.8mm; font-size: var(--texto); line-height:1.55; text-align: justify; text-justify: inter-word; hyphens: auto; }

    .header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1E1E1E; padding-bottom:2.4mm; margin:0 9mm 5.5mm 9mm; }
    .logo { height:30px; width:auto; object-fit:contain; }
    .header-right { font-size: var(--texto); letter-spacing:.06em; text-transform:uppercase; color:#6B6B6B; font-weight:600; text-align:right; }
    .header-sello { font-family:Consolas,"Courier New",monospace; font-size:calc(var(--texto) * .92); letter-spacing:.02em; text-transform:none; color:#8A8A8A; font-weight:400; margin-top:2px; }
    .header-sello b { color:#cc0000; font-weight:700; }

    .footer {
      position:absolute;
      left:9mm; right:9mm; bottom:7mm;
      padding-top:2.4mm;
      border-top:1.5px solid #1E1E1E;
      display:grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap:4mm;
      background:#fff;
      line-height:1.35;
    }
    .footer-col-left { text-align:left; }
    .footer-col-center { text-align:center; border-left:1px solid #E2E8F0; border-right:1px solid #E2E8F0; padding:0 2mm; }
    .footer-col-right { text-align:right; }
    .footer-label { font-size:calc(var(--texto) * 1.05); font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:#0f172a; margin-bottom:2px; }
    .footer-main { font-weight:700; color:#0f172a; font-size:calc(var(--texto) * 1.22); }
    .footer-sub { font-weight:700; color:#1e293b; font-size:calc(var(--texto) * 1.13); }
    .footer-brand { color:#cc0000; font-weight:800; }

    .card-label { font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; color:#6B6B6B; font-weight:600; }
    .block-label { margin-bottom:2.4mm; }
    .centered { text-align:center; }
    .tnum { font-variant-numeric:tabular-nums; }
    .accent { color:#8A1518; }

    .doc-h2 { font-size: var(--titulo); line-height:1.3; text-align:center; margin:0 auto 4.5mm; max-width:170mm; }
    .doc-h3.con-espacio { margin-top:10mm; }
    .doc-h3 { font-size: var(--titulo); text-align:center; margin:0 0 4mm; }
    .doc-copy.junto { margin-bottom:0; }
    .doc-copy { font-size: var(--texto); line-height:1.6; color:#2A2A2A; max-width:160mm; margin:0 auto 2.8mm; text-align: justify; text-justify: inter-word; hyphens: auto; }

    /* PORTADA */
    .cover { padding-top:9mm; }
    .cover-header { display:flex; justify-content:center; padding-bottom:5.5mm; border-bottom:2px solid #1E1E1E; }
    .cover-logo { height:44px; width:auto; }
    .cover-firm { text-align:center; margin-top:5mm; }
    .cover-firm-name { font-size:18px; font-weight:800; color:#0f172a; letter-spacing:.07em; margin-bottom:2.5mm; }
    .cover-firm-nit { font-size:13px; font-weight:700; color:#1e293b; margin-bottom:2.5mm; }
    .cover-firm-nit span { background:#f8fafc; border:1.5px solid #cbd5e1; padding:2px 12px; border-radius:6px; letter-spacing:.04em; }
    .cover-firm-contact { font-size:12px; color:#475569; font-weight:500; letter-spacing:.01em; }
    .cover-title { margin-top:12mm; text-align:center; }
    .cover-kicker { font-size: var(--texto); letter-spacing:.18em; text-transform:uppercase; color:#6B6B6B; margin-bottom:4mm; font-weight:700; }
    .cover-title h1 { font-size: var(--titulo); line-height:1.3; text-align:center; text-transform:uppercase; max-width:150mm; margin:0 auto; }
    .meta-strip { margin-top:12mm; display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid #CCC; border-bottom:1px solid #CCC; padding:5.5mm 0; }
    .meta-cell { padding:0 4mm; border-right:1px solid #DDD; text-align:center; }
    .meta-cell.last { border-right:none; }
    .meta-label { font-size: var(--texto); letter-spacing:.08em; text-transform:uppercase; color:#777; margin-bottom:1.8mm; }
    .meta-value { font-size: var(--titulo); font-weight:700; }
    .cover-client { margin-top:9mm; text-align:center; }
    .cover-client-name { font-size: var(--titulo); font-weight:700; margin:2mm 0 1mm; font-family:'Source Serif 4', Georgia, serif; color:#1E1E1E; }
    .cover-client-nit { font-size: var(--titulo); font-weight:700; color:#1E1E1E; margin-top:0; margin-bottom:3.5mm; font-family:'Source Serif 4', Georgia, serif; letter-spacing:.02em; }
    .cover-client-grid { display:inline-grid; grid-template-columns:repeat(2,auto); gap:3.5mm 12mm; text-align:left; }
    .ccg-k { font-size: var(--texto); letter-spacing:.08em; text-transform:uppercase; color:#777; margin-bottom:.6mm; }
    .ccg-v { font-size: var(--titulo); font-weight:700; color:#1E1E1E; line-height:1.3; }
    .cover-foot { margin-top:10mm; padding-top:3.5mm; border-top:1px solid #DDD; display:flex; justify-content:space-between; align-items:center; gap:6mm; font-size: var(--texto); color:#777; }

    /* DEFINICIONES & CARTA */
    .def-list { border-top:1px solid #DDD; max-width:170mm; margin:0 auto; }
    .def-row { display:grid; grid-template-columns:44mm 1fr; gap:7mm; padding:4mm 0; border-bottom:1px solid #DDD; }
    .def-term { font-size: var(--titulo); font-weight:600; font-family:'Source Serif 4', Georgia, serif; }
    .def-body { font-size: var(--texto); line-height:1.6; color:#333; }
    .def-body p { font-size: var(--texto); margin:0 0 2mm; }
    .def-bullets { margin:0; padding-left:16px; font-size: var(--texto); line-height:1.6; color:#333; }
    .def-bullets li { margin-bottom:1mm; }

    /* NUEVO: TRUST BADGES NORMATIVOS */
    .trust-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin: 0 0 4mm;
      padding: 2.2mm 3mm;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .trust-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 9.5px;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      line-height: 1.25;
    }
    .trust-badge-icon {
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: #fee2e2;
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      flex-shrink: 0;
    }

    /* NUEVO: FOTO / PLANO EXPANDIDO */
    .photo-grid { display:grid; grid-template-columns:1fr; margin:0 0 4mm; }
    .photo-card {
      border:1px solid #CBD5E1;
      border-radius:6px;
      overflow:hidden;
      background:#ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .photo {
      display:block;
      width:100%;
      height: 130mm;
      object-fit:contain;
      object-position:center;
      background:#ffffff;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: auto;
    }
    .photo-caption {
      padding:4px 8px 5px;
      text-align:center;
      font-size: var(--texto);
      letter-spacing:.04em;
      text-transform:uppercase;
      color:#64748B;
      border-top:1px solid #E2E8F0;
      background:#FAFAFA;
      font-weight:600;
    }

    /* NUEVO: CRONOGRAMA DE 4 HITOS */
    .timeline-bar {
      margin: 0 0 4.5mm;
      padding: 2.5mm 3.5mm;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }
    .timeline-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #475569;
      margin-bottom: 2mm;
      text-align: center;
    }
    .timeline-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 5px;
      position: relative;
    }
    .timeline-step {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 5px 6px;
      text-align: center;
    }
    .timeline-step-num {
      font-size: 10px;
      font-weight: 800;
      color: #dc2626;
      margin-bottom: 1px;
    }
    .timeline-step-name {
      font-size: 10px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }
    .timeline-step-sub {
      font-size: 8.8px;
      color: #64748b;
      margin-top: 1px;
    }

    /* TABLA DE PRECIOS */
    .price-table { margin-top:2mm; }
    .table { width:100%; border-collapse:collapse; font-size: var(--texto); }
    .table th { background:#1E1E1E; color:#fff; padding:7px 9px; font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; font-weight:600; text-align:center; border:none; }
    .table th.t-left { text-align:left; }
    .table th.t-right { text-align:right; }
    .table td { border-bottom:1px solid #DDD; padding:7px 9px; vertical-align:middle; color:#1E1E1E; }
    .table .sub-row td { font-weight:600; }
    .table .soft-row td { color:#666; font-size: var(--texto); border-bottom:1px solid #EEE; padding:5px 9px; }
    .table .grand-total td { border-top:2px solid #1E1E1E; border-bottom:none; padding-top:10px; }
    .total-label { font-size: var(--texto); font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
    .total-amount { font-size: var(--titulo); color:#8A1518; font-weight:700; }
    .t-center { text-align:center; }
    .t-right { text-align:right; }
    .t-left { text-align:left; }
    .strong { font-weight:600; }

    /* CONDICIONES & CIERRE */
    .conditions-block { margin:5mm 0 0; }
    .conditions-grid { display:grid; grid-template-columns:1fr 1fr; border-top:1px solid #DDD; }
    .meta-card { padding:3.5mm 5mm 3.5mm 0; border-bottom:1px solid #DDD; }
    .meta-card.pad-left { padding-left:5mm; padding-right:0; border-left:1px solid #EEE; }
    .meta-strong { font-size: var(--titulo); font-weight:700; color:#1E1E1E; }

    /* NUEVO: TARJETAS COMERCIALES DE PAGO EN CONDICIONES */
    .payment-cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 4mm 0 2mm;
    }
    .pay-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 3mm 4mm;
      background: #f8fafc;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pay-card-pct {
      font-size: 20px;
      font-weight: 800;
      color: #dc2626;
      line-height: 1;
    }
    .pay-card-body {
      flex: 1;
    }
    .pay-card-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
    }
    .pay-card-desc {
      font-size: 9.8px;
      color: #64748b;
      margin-top: 1px;
    }

    .incluye-block { margin:4.5mm 0 0; }
    .incluye-list { border-top:1px solid #DDD; padding-top:2.5mm; }
    .incluye-item { position:relative; padding-left:5mm; margin-bottom:1.4mm; font-size: var(--texto); line-height:1.5; color:#2A2A2A; text-align:justify; }
    .incluye-item:last-child { margin-bottom:0; }
    .incluye-item::before { content:"–"; position:absolute; left:1.2mm; color:#6B6B6B; }

    .sst-block { margin:4.5mm 0 0; padding:2.5mm 3mm; background:#F7F7F6; border-left:3px solid #1E1E1E; }
    .sst-title { font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; color:#1E1E1E; font-weight:700; margin-bottom:1mm; }
    .sst-block p { margin:0; font-size: var(--texto); line-height:1.5; color:#444; }

    .signature-wrap {
      margin-top: 5mm;
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 6mm;
      align-items: end;
    }
    .steps-list { margin:0; padding-left:16px; font-size: var(--texto); line-height:1.55; color:#333; }
    .steps-list li { margin-bottom:1.2mm; }
    .contact-box { margin-top:3mm; padding-top:2mm; border-top:1px dashed #DDD; }
    .contact-line { font-size: var(--texto); color:#333; font-weight:600; line-height:1.4; }

    .sig-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 3mm 4mm;
      background: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sig-qr {
      width: 62px;
      height: 62px;
      flex-shrink: 0;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 2px;
    }
    .sig-info {
      flex: 1;
    }
    .sig-name { font-size: 13.5px; font-weight:700; font-family:'Source Serif 4', Georgia, serif; color:#0f172a; }
    .sig-role { font-size: 10.5px; font-weight:600; color:#475569; margin-top:1px; text-transform:uppercase; }
    .sig-meta { font-size: 10px; color:#64748b; margin-top:2px; line-height:1.4; }

    /* BARRA SUPERIOR VISOR */
    #visor-toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 99999;
      background: #0f172a;
      color: #fff;
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    @media print {
      body { background:#fff; }
      .page { margin:0; box-shadow:none; border-radius:0; }
      #visor-toolbar { display:none !important; }
    }
  </style>
</head>
<body>

  <!-- BARRA FLOTANTE -->
  <div id="visor-toolbar">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:15px;font-weight:700;letter-spacing:0.5px;">⭐ Cotización en Nuevo Formato Comercial</span>
      <span style="background:#dc2626;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;">C-26122</span>
      <span style="color:#94a3b8;font-size:12px;">Comercializadora de Papas (4 Páginas Completas con Todos los Textos)</span>
    </div>
    <div style="display:flex;gap:10px;">
      <button onclick="window.print()" style="background:#f47c20;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:12.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
        🖨 Imprimir / Guardar como PDF
      </button>
    </div>
  </div>

  <div style="height:40px;"></div>

  <!-- ========================================== -->
  <!-- PÁGINA 1: PORTADA OFICIAL                  -->
  <!-- ========================================== -->
  <section class="page">
    <div class="page-inner">
      <div class="page-content cover">
        <header class="cover-header">
          <img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" class="cover-logo" />
        </header>
        <div class="cover-firm">
          <div class="cover-firm-name">INGEANCLAJES S.A.S.</div>
          <div class="cover-firm-nit"><span>NIT 900.193.965-4</span></div>
          <div class="cover-firm-contact">Calle 38 Sur # 36 &ndash; 48, Envigado &middot; PBX: (604) 448 26 86 &middot; Cel: 315 288 9541</div>
        </div>
        <div class="cover-title">
          <div class="cover-kicker">Propuesta Comercial de Ingeniería</div>
          <h1>SISTEMA DE ANCLAJES CERTIFICADO PARA TRABAJO EN ALTURAS</h1>
        </div>
        <div class="meta-strip">
          <div class="meta-cell">
            <div class="meta-label">Cotización</div>
            <div class="meta-value tnum">C-26122</div>
          </div>
          <div class="meta-cell">
            <div class="meta-label">Emisión</div>
            <div class="meta-value">1 DE OCTUBRE DEL 2026</div>
          </div>
          <div class="meta-cell">
            <div class="meta-label">Validez</div>
            <div class="meta-value">30 días</div>
          </div>
          <div class="meta-cell last">
            <div class="meta-label">Valor total</div>
            <div class="meta-value tnum accent">$ 62.664.000</div>
          </div>
        </div>
        <div class="cover-client">
          <div class="meta-label">Cotización preparada para</div>
          <div class="cover-client-name">COMERCIALIZADORA DE PAPAS - MARIA OMAIRA ZULUAGA DE QUINTERO</div>
          <div class="cover-client-nit tnum">NIT 21872838-9</div>
          <div class="cover-client-grid">
            <div><div class="ccg-k">Obra / Sede</div><div class="ccg-v">COMERCIALIZADORA DE PAPAS</div></div>
            <div><div class="ccg-k">Ciudad / Dirección</div><div class="ccg-v">MEDELLIN &middot; CLL 85B #48-74</div></div>
            <div><div class="ccg-k">Contacto</div><div class="ccg-v">Maria Omaira Zuluaga de Quintero</div></div>
            <div><div class="ccg-k">Teléfono</div><div class="ccg-v tnum">312 456 7890</div></div>
          </div>
        </div>
        <div class="cover-foot">
          <span>Documento confidencial &middot; Uso exclusivo del destinatario</span>
          <span>ENVIGADO, 1 DE OCTUBRE DEL 2026</span>
        </div>
      </div>
      ${footerHtml}
    </div>
  </section>

  <!-- ========================================== -->
  <!-- PÁGINA 2: CARTA DE PRESENTACIÓN & DEFINICIONES -->
  <!-- ========================================== -->
  <section class="page">
    <div class="page-inner">
      ${headerHtml}
      <div class="page-content">
        <h2 class="doc-h2">Cordial saludo, COMERCIALIZADORA DE PAPAS - MARIA OMAIRA ZULUAGA DE QUINTERO</h2>
        
        <p class="doc-copy">Agradecemos la oportunidad de presentarles nuestra propuesta para el suministro e instalación de sistemas de protección contra caídas para trabajo seguro en alturas en la obra <strong>COMERCIALIZADORA DE PAPAS</strong>.</p>
        
        <p class="doc-copy junto">INGEANCLAJES S.A.S. es una empresa especializada en el diseño, fabricación e instalación de sistemas de protección contra caídas. Cada sistema se entrega certificado bajo la Resolución 4272 de 2021, con los certificados de fábrica de todos los elementos instalados y una recertificación anual sin costo.</p>
        <p class="doc-copy junto">Nuestro personal está afiliado a ARL, salud y pensión, cuenta con los elementos de protección personal requeridos, y un coordinador de trabajo seguro en alturas acompaña la obra durante toda la ejecución. Entregamos las pólizas que exija el contratante y respondemos por los daños que puedan ocasionarse durante los trabajos.</p>
        <p class="doc-copy junto">Quedamos atentos a cualquier inquietud sobre el alcance, los materiales o las condiciones comerciales de esta propuesta.</p>

        <h3 class="doc-h3 con-espacio">Definiciones que estructuran el alcance</h3>
        <div class="def-list">
          <div class="def-row">
            <div class="def-term">Línea de vida horizontal</div>
            <div class="def-body">
              <p>Sistema flexible o rígido diseñado para permitir el tránsito longitudinal seguro de los operarios en cubiertas, pasarelas y plataformas de mantenimiento.</p>
              <ul class="def-bullets">
                <li>Diseñadas e instaladas para resistir las fuerzas dinámicas generadas en una caída libre según Res. 4272 de 2021.</li>
                <li>Componentes en acero inoxidable y fijaciones estructurales de alta resistencia ensayadas en obra.</li>
                <li>Absorbedor de impacto integrado para minimizar la carga transmitida a la estructura base del edificio.</li>
              </ul>
            </div>
          </div>
          <div class="def-row">
            <div class="def-term">Punto de anclaje fijo</div>
            <div class="def-body">
              <p>Punto seguro de conexión al cual se asegura el trabajador para soportar las fuerzas de detención de caídas.</p>
              <ul class="def-bullets">
                <li>Capacidad mínima de rotura certificada de 5.000 lbf (22.2 kN) por persona conectada.</li>
                <li>Instalación mediante anclajes mecánicos o químicos epóxicos verificados mediante ensayo de tracción.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      ${footerHtml}
    </div>
  </section>

  <!-- ========================================== -->
  <!-- PÁGINA 3: PROPUESTA TÉCNICA CON NUEVO DISEÑO -->
  <!-- ========================================== -->
  <section class="page">
    <div class="page-inner">
      ${headerHtml}
      <div class="page-content">
        <h2 class="doc-h2">Estructura Metálica y Plataforma para Aires Acondicionados</h2>

        <!-- 1. TRUST BADGES NORMATIVOS -->
        <div class="trust-strip">
          <div class="trust-badge">
            <span class="trust-badge-icon">✓</span>
            <span>Res. 4272 / 2021</span>
          </div>
          <div class="trust-badge">
            <span class="trust-badge-icon">✓</span>
            <span>ANSI / OSHA</span>
          </div>
          <div class="trust-badge">
            <span class="trust-badge-icon">✓</span>
            <span>5.000 LBF (22.2 kN)</span>
          </div>
          <div class="trust-badge">
            <span class="trust-badge-icon">✓</span>
            <span>Ingeniería Avalada</span>
          </div>
        </div>

        <div class="content-block">
          <div class="card-label block-label">Alcance de esta propuesta</div>
          <p class="doc-copy">Fabricación, suministro e instalación de estructura metálica de soporte y pasarela técnica con plataforma de tránsito seguro para mantenimiento de unidades condensadoras de aire acondicionado en fachada y cubierta, incluyendo barandas perimetrales y puntos de anclaje de seguridad certificados bajo Resolución 4272 de 2021.</p>
        </div>

        <!-- 2. REGISTRO FOTOGRÁFICO / PLANO ISOMÉTRICO EXPANDIDO (130mm de alto) -->
        <div class="card-label block-label">Registro técnico y plano de la propuesta</div>
        <div class="photo-grid">
          <div class="photo-card">
            <img src="${fotoSrc}" alt="Plano Estructural, Isométrico y Fachada Frontal" class="photo" />
            <div class="photo-caption">Plano Estructural, Isométrico y Fachada Frontal &middot; Escala Técnica</div>
          </div>
        </div>

        <!-- 3. TIMELINE VISUAL DE 4 FASES -->
        <div class="timeline-bar">
          <div class="timeline-title">Fases del Trabajo &middot; Ejecución Garantizada</div>
          <div class="timeline-grid">
            <div class="timeline-step">
              <div class="timeline-step-num">FASE 1</div>
              <div class="timeline-step-name">Replanteo</div>
              <div class="timeline-step-sub">Perforación y anclajes</div>
            </div>
            <div class="timeline-step">
              <div class="timeline-step-num">FASE 2</div>
              <div class="timeline-step-name">Montaje</div>
              <div class="timeline-step-sub">Estructura y pasarela</div>
            </div>
            <div class="timeline-step">
              <div class="timeline-step-num">FASE 3</div>
              <div class="timeline-step-name">Pruebas</div>
              <div class="timeline-step-sub">Tracción dinamométrica</div>
            </div>
            <div class="timeline-step">
              <div class="timeline-step-num">FASE 4</div>
              <div class="timeline-step-name">Certificación</div>
              <div class="timeline-step-sub">Informe y aval legal</div>
            </div>
          </div>
        </div>

        <!-- 4. TABLA DE PRECIOS -->
        <div class="price-table">
          <table class="table">
            <thead>
              <tr>
                <th class="t-left" style="width:44%;">Descripción</th>
                <th style="width:10%;">Cant.</th>
                <th style="width:12%;">Unidad</th>
                <th class="t-right" style="width:17%;">V. unitario</th>
                <th class="t-right" style="width:17%;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ESTRUCTURA METÁLICA CON PLATAFORMA PARA AIRES ACONDICIONADOS</td>
                <td class="t-center tnum">7</td>
                <td class="t-center">ML</td>
                <td class="t-right tnum">$ 8.000.000</td>
                <td class="t-right tnum strong">$ 56.000.000</td>
              </tr>
              <tr class="sub-row">
                <td colspan="4">Subtotal</td>
                <td class="t-right tnum strong">$ 56.000.000</td>
              </tr>
              <tr class="soft-row">
                <td colspan="4">Utilidades (10% del valor de la obra)</td>
                <td class="t-right tnum">$ 5.600.000</td>
              </tr>
              <tr class="soft-row">
                <td colspan="4">IVA (19% sobre utilidades)</td>
                <td class="t-right tnum">$ 1.064.000</td>
              </tr>
              <tr class="grand-total">
                <td colspan="4" class="total-label">Total propuesta</td>
                <td class="t-right tnum total-amount">$ 62.664.000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      ${footerHtml}
    </div>
  </section>

  <!-- ========================================== -->
  <!-- PÁGINA 4: CONDICIONES, SST Y FIRMAS        -->
  <!-- ========================================== -->
  <section class="page">
    <div class="page-inner">
      ${headerHtml}
      <div class="page-content">
        
        <div class="card-label block-label centered">Condiciones comerciales de la propuesta</div>
        
        <!-- TARJETAS MODERNAS DE PAGO -->
        <div class="payment-cards-grid">
          <div class="pay-card">
            <div class="pay-card-pct">50%</div>
            <div class="pay-card-body">
              <div class="pay-card-title">Anticipo Comercial</div>
              <div class="pay-card-desc">Para inicio de fabricación, acopio de materiales y logística inicial.</div>
            </div>
          </div>
          <div class="pay-card">
            <div class="pay-card-pct">50%</div>
            <div class="pay-card-body">
              <div class="pay-card-title">Contra Entrega Final</div>
              <div class="pay-card-desc">A la conclusión de labores, con entrega de Informe y Certificado Legal.</div>
            </div>
          </div>
        </div>

        <div class="conditions-grid">
          <div class="meta-card">
            <div class="meta-label">Tiempo de ejecución</div>
            <div class="meta-strong">10 DÍAS HÁBILES (4 EN FABRICACIÓN, 6 EN MONTAJE)</div>
          </div>
          <div class="meta-card pad-left">
            <div class="meta-label">Validez de la oferta</div>
            <div class="meta-strong">30 días desde la entrega de esta cotización</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Certificación</div>
            <div class="meta-strong">Se entrega con el pago total</div>
          </div>
          <div class="meta-card pad-left">
            <div class="meta-label">Normativa aplicable</div>
            <div class="meta-strong">Resolución 4272 de 2021 &middot; MinTrabajo</div>
          </div>
        </div>

        <div class="incluye-block">
          <div class="card-label block-label">La propuesta incluye</div>
          <div class="incluye-list">
            <div class="incluye-item">Suministro de materiales estructurales certificados y anclajes de alta resistencia.</div>
            <div class="incluye-item">Mano de obra calificada con cursos de trabajo seguro en alturas vigentes y seguridad social completa.</div>
            <div class="incluye-item">Equipos de protección contra caídas y herramientas certificadas para la ejecución de la obra.</div>
            <div class="incluye-item">Ensayos de tracción y pruebas estáticas/dinámicas en sitio con dinamómetro certificado.</div>
            <div class="incluye-item">Pólizas de cumplimiento y responsabilidad civil extracontractual requeridas por el contratante.</div>
            <div class="incluye-item">Informe técnico de actividades con registro fotográfico y Certificado legal bajo Resolución 4272 de 2021.</div>
          </div>
        </div>

        <div class="sst-block">
          <div class="sst-title">Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST)</div>
          <p>INGEANCLAJES S.A.S. se encuentra comprometida con el cumplimiento de las directrices generales para la aplicación de la Resolución 4272 de 2021, garantizando la implementación del Sistema de Gestión de Seguridad y Salud en el Trabajo y manteniendo coherencia con la estrategia organizacional de la empresa, redundando en el mejoramiento de las condiciones de trabajo y calidad de vida de todas las personas, al evitar y minimizar los accidentes de trabajo, enfermedades laborales y fomentar una cultura preventiva y de autocuidado en los diferentes frentes de trabajo.</p>
        </div>

        <div class="signature-wrap">
          <div>
            <div class="card-label block-label">Próximos pasos para inicio</div>
            <ol class="steps-list">
              <li>Confirmar aceptación por el medio de su preferencia.</li>
              <li>Pago del anticipo pactado para iniciar fabricación.</li>
              <li>Coordinación de visita técnica y cronograma de obra.</li>
              <li>Instalación, certificación y entrega de pólizas.</li>
            </ol>
            <div class="contact-box">
              <div class="meta-label">Líneas directas de atención</div>
              <div class="contact-line">Cel. 315 288 9541 &middot; PBX: (604) 448 26 86</div>
              <div class="contact-line">comercial1ingeanclajes@gmail.com</div>
            </div>
          </div>
          <div>
            <div class="card-label block-label">Firma y Certificación de Ingeniería</div>
            <div class="sig-box">
              <img src="${qrDataUrl}" alt="QR Verificación" class="sig-qr" />
              <div class="sig-info">
                <div class="sig-name">Ing. Jhon Jaime Sepúlveda Londoño</div>
                <div class="sig-role">Gerente General</div>
                <div class="sig-meta">Matrícula Prof. 05256-409949<br />INGEANCLAJES S.A.S. &middot; NIT 900.193.965-4</div>
              </div>
            </div>
          </div>
        </div>

      </div>
      ${footerHtml}
    </div>
  </section>

</body>
</html>`;

  const outputPath = "C:/Users/User/.gemini/antigravity/brain/e2eac55d-b121-49b2-87a6-e33e7a2c5aa4/cotizacion_nuevo_formato_completa.html";
  fs.writeFileSync(outputPath, html, "utf-8");
  console.log("Nuevo formato completo generado con éxito en:", outputPath);
}

main().catch(console.error);
