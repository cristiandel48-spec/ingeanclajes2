// Estilos globales del armazon: tokens del sistema de diseño, animaciones
// compartidas, foco de teclado, scrollbars, impresion y correcciones
// especificas de Safari en iOS (zoom al enfocar inputs, rebote del scroll,
// alto real de la ventana y area segura del notch).
//
// Los colores NO se escriben aqui: vienen de styles/designTokens.js, que es la
// unica fuente del sistema.

import { tokensCss } from "./designTokens";
import { componentesCss } from "./componentesCss";

export default function GlobalStyles({ divider }) {
  const css = `
${tokensCss}
${componentesCss}

    /* ── Animaciones compartidas ─────────────────────────────────────────
       Estas cinco se invocaban en una docena de sitios sin estar definidas en
       ninguna parte, asi que el indicador de guardado no giraba y los dialogos
       no tenian entrada: simplemente aparecian de golpe. */
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes fadeInModal {
      from { opacity: 0; transform: scale(.98); }
      to   { opacity: 1; transform: none; }
    }
    @keyframes fadeInMenu {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: none; }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: none; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Foco de teclado ─────────────────────────────────────────────────
       No habia ninguna regla de foco en todo el proyecto y si 30 reglas que
       lo apagaban, asi que quien navega con el tabulador no sabia nunca donde
       estaba. :focus-visible solo se enciende con teclado, no al hacer clic,
       por eso no ensucia el uso con raton. */
    :focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      border-radius: 4px;
    }
    /* Gana a los outline:none escritos en linea en campos y botones. */
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible,
    button:focus-visible,
    a:focus-visible,
    [tabindex]:focus-visible {
      outline: 2px solid var(--accent) !important;
      outline-offset: 2px;
    }

    .app-shell[data-theme="dark"] input::placeholder,
    .app-shell[data-theme="dark"] textarea::placeholder {
      color: #8a94a6 !important;
      opacity: 1;
    }

    .app-shell[data-theme="dark"] select option {
      background: #181a20 !important;
      color: #f0f2f5 !important;
    }

    /* Títulos y textos en modo oscuro */
    .app-shell[data-theme="dark"] h1:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] h2:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] h3:not(.doc-shell *):not(#pz *) {
      color: #f0f2f5 !important;
    }

    /* Tablas y encabezados */
    .app-shell[data-theme="dark"] th:not(.doc-shell th):not(#pz th) {
      color: #cbd5e1 !important;
    }
    .app-shell[data-theme="dark"] td:not(.doc-shell td):not(#pz td) {
      color: #f0f2f5;
    }

    /* Tarjetas y fondos blancos */
    .app-shell[data-theme="dark"] article:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *),
    .app-shell[data-theme="dark"] [style*="background: #fff"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(img),
    .app-shell[data-theme="dark"] [style*="background:#fff"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(img),
    .app-shell[data-theme="dark"] [style*="background: #ffffff"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(img),
    .app-shell[data-theme="dark"] [style*="background:#ffffff"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(img),
    .app-shell[data-theme="dark"] [style*="background: rgb(255, 255, 255)"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(img),
    .app-shell[data-theme="dark"] [style*="background:rgb(255, 255, 255)"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(img),
    .app-shell[data-theme="dark"] [style*="background-color: rgb(255, 255, 255)"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(img),
    .app-shell[data-theme="dark"] [style*="background-color:rgb(255, 255, 255)"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(img),
    .app-shell[data-theme="dark"] [style*="background: rgb(255,255,255)"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(img),
    .app-shell[data-theme="dark"] [style*="background-color: rgb(255,255,255)"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(img) {
      background: var(--surface-card, #181a20) !important;
      border-color: var(--border, #2a2d36) !important;
    }

    .app-shell[data-theme="dark"] [style*="background: #f8fafc"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="background:#f8fafc"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="rgb(248, 250, 252)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="background: #f1f5f9"]:not(.doc-shell *):not(#pz *):not(button),
    .app-shell[data-theme="dark"] [style*="background:#f1f5f9"]:not(.doc-shell *):not(#pz *):not(button),
    .app-shell[data-theme="dark"] [style*="rgb(241, 245, 249)"]:not(.doc-shell *):not(#pz *):not(button) {
      background: var(--surface-subtle, #20232b) !important;
      border-color: var(--border, #2a2d36) !important;
    }

    /* Bordes sutiles en modo oscuro */
    .app-shell[data-theme="dark"] [style*="border: 1px solid #e2e8f0"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="border:1px solid #e2e8f0"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="rgb(226, 232, 240)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="border: 1px solid #eef0f3"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="border:1px solid #eef0f3"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="rgb(238, 240, 243)"]:not(.doc-shell *):not(#pz *) {
      border-color: var(--border, #2a2d36) !important;
    }

    /* Textos oscuros en línea para legibilidad en modo oscuro */
    .app-shell[data-theme="dark"] [style*="color: #1a1a2e"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:#1a1a2e"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(26, 26, 46)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:rgb(26, 26, 46)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(26,26,46)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: #101828"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:#101828"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(16, 24, 40)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:rgb(16, 24, 40)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(16,24,40)"]:not(.doc-shell *):not(#pz *) {
      color: #f0f2f5 !important;
    }

    .app-shell[data-theme="dark"] [style*="color: #475569"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:#475569"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(71, 85, 105)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:rgb(71, 85, 105)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(71,85,105)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: #64748b"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:#64748b"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(100, 116, 139)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:rgb(100, 116, 139)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(100,116,139)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: #667085"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:#667085"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(102, 112, 133)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:rgb(102, 112, 133)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(102,112,133)"]:not(.doc-shell *):not(#pz *) {
      color: #cbd5e1 !important;
    }

    .app-shell[data-theme="dark"] [style*="color: #94a3b8"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:#94a3b8"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(148, 163, 184)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:rgb(148, 163, 184)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: rgb(148,163,184)"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color: #9aa2b1"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="color:#9aa2b1"]:not(.doc-shell *):not(#pz *) {
      color: #98a1b0 !important;
    }

    /* Botones y chips con contraste en modo oscuro */
    .app-shell[data-theme="dark"] [style*="background: #dbeafe"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="background:#dbeafe"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="rgb(219, 234, 254)"]:not(.doc-shell *):not(#pz *) {
      background: #1e3a8a !important;
      color: #93c5fd !important;
      border: 1px solid #2563eb !important;
    }

    .app-shell[data-theme="dark"] [style*="background: #f1f5f9"]:is(button):not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="background:#f1f5f9"]:is(button):not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="rgb(241, 245, 249)"]:is(button):not(.doc-shell *):not(#pz *) {
      background: #262b35 !important;
      color: #cbd5e1 !important;
      border: 1px solid #333846 !important;
    }

    .app-shell[data-theme="dark"] [style*="background: #fff3e8"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="background:#fff3e8"]:not(.doc-shell *):not(#pz *) {
      background: rgba(244,124,32,0.18) !important;
      color: #fb923c !important;
      border-color: rgba(244,124,32,0.3) !important;
    }

    .app-shell[data-theme="dark"] [style*="background: #fff7ed"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="background:#fff7ed"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="rgb(255, 247, 237)"]:not(.doc-shell *):not(#pz *) {
      background: rgba(245, 158, 11, 0.12) !important;
      border-color: rgba(245, 158, 11, 0.3) !important;
    }

    .app-shell[data-theme="dark"] [style*="#fed7aa"]:not(.doc-shell *):not(#pz *),
    .app-shell[data-theme="dark"] [style*="rgb(254, 215, 170)"]:not(.doc-shell *):not(#pz *) {
      background: var(--surface, #181a20) !important;
      border-color: rgba(245, 158, 11, 0.35) !important;
    }

    /* Badges de estado en modo oscuro */
    .app-shell[data-theme="dark"] .ui-badge {
      border: 1px solid transparent;
    }
    .app-shell[data-theme="dark"] .ui-badge[data-estado="En Obra"] {
      background: rgba(59, 130, 246, 0.2) !important;
      color: #93c5fd !important;
      border-color: rgba(59, 130, 246, 0.4) !important;
    }
    .app-shell[data-theme="dark"] .ui-badge[data-estado="Cotización"],
    .app-shell[data-theme="dark"] .ui-badge[data-estado="Vencida"] {
      background: rgba(239, 68, 68, 0.2) !important;
      color: #fca5a5 !important;
      border-color: rgba(239, 68, 68, 0.4) !important;
    }
    .app-shell[data-theme="dark"] .ui-badge[data-estado="Pagado"],
    .app-shell[data-theme="dark"] .ui-badge[data-estado="Vigente"],
    .app-shell[data-theme="dark"] .ui-badge[data-estado="Cobrado"],
    .app-shell[data-theme="dark"] .ui-badge[data-estado="Activo"] {
      background: rgba(34, 197, 94, 0.2) !important;
      color: #86efac !important;
      border-color: rgba(34, 197, 94, 0.4) !important;
    }
    .app-shell[data-theme="dark"] .ui-badge[data-estado="Pendiente"] {
      background: rgba(245, 158, 11, 0.2) !important;
      color: #fde047 !important;
      border-color: rgba(245, 158, 11, 0.4) !important;
    }
    .app-shell[data-theme="dark"] .ui-badge[data-estado="Borrador"] {
      background: rgba(148, 163, 184, 0.2) !important;
      color: #cbd5e1 !important;
      border-color: rgba(148, 163, 184, 0.4) !important;
    }
    .app-shell[data-theme="dark"] .ui-badge[data-estado="Finalizado"] {
      background: rgba(168, 85, 247, 0.2) !important;
      color: #d8b4fe !important;
      border-color: rgba(168, 85, 247, 0.4) !important;
    }

    *, *::before, *::after { box-sizing: border-box; }

    html {
      /* Evita que iOS reescale la tipografia al girar el telefono. */
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    html, body, #root {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      max-width: 100vw;
      overflow-x: hidden !important;
      overflow-y: hidden;
      /* Sin rebote elastico al llegar al final en iOS. */
      overscroll-behavior-y: none;
      font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    *, *::before, *::after {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    button, input, select, textarea { font-family: inherit; }

    /* Scroll suave y con inercia en iOS. */
    .app-scroll {
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      overflow-x: hidden !important;
    }

    /* Alto real de la ventana. En iOS "100vh" incluye la barra de
       direcciones y deja contenido cortado; 100dvh la descuenta.
       El orden importa: el navegador se queda con la ultima que entiende. */
    .app-shell {
      width: 100%;
      max-width: 100vw;
      height: 100vh;
      height: -webkit-fill-available;
      height: 100dvh;
      overflow: hidden;
      overflow-x: hidden !important;
    }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${divider}; border-radius: 8px; }
    ::-webkit-scrollbar-thumb:hover { background: #b9bfc9; }

    @media (max-width: 900px) {
      /* Safari en iOS hace zoom al enfocar un campo con texto menor a 16px.
         Se fuerza 16px solo en pantallas tactiles pequenas. */
      input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
      select:not(.no-full-width),
      textarea {
        font-size: 16px !important;
      }

      /* Las tablas anchas ya vienen envueltas en un contenedor con
         overflow-x:auto y su propio min-width. Solo se suaviza el
         desplazamiento; poner display:block en la tabla romperia la
         alineacion entre el encabezado y las filas. */
      table { -webkit-overflow-scrolling: touch; }
    }

    select.no-full-width,
    .select-ordenar {
      width: auto !important;
      max-width: 150px !important;
      font-size: 12.5px !important;
      line-height: normal !important;
      height: 28px !important;
      padding: 0 4px !important;
      box-sizing: border-box !important;
    }

    /* ---- Telefono ----------------------------------------------------
       Las pantallas usan rejillas de 2 y 3 columnas escritas en el propio
       componente. En un telefono de 360 px eso deja columnas de 60 px: las
       etiquetas no caben y el texto se monta. Aqui se colapsan a una sola
       columna. Hace falta !important porque los estilos son en linea. */
    @media (max-width: 768px) {
      /* Optimización táctil: respuesta inmediata al toque */
      button, a, input, select, textarea {
        touch-action: manipulation;
      }

      /* Modales y paneles fijos restringidos al ancho visual del móvil */
      [style*="position: fixed"]:not(#soporte-widget-root):not(.app-shell * aside) {
        max-width: 100vw !important;
        box-sizing: border-box !important;
      }

      /* Neutraliza el doble margen horizontal acumulado en teléfonos en cualquier pantalla */
      main > div,
      main > section,
      main > article {
        padding-left: 0 !important;
        padding-right: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Colapsa formularios a 1 columna sin tocar documentos, calendarios ni cuadrículas protegidas */
      main [style*="grid-template-columns"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(.tabla-items):not(.no-collapse-grid):not(.fototeca-grid):not(.calendario-grid):not(.calendario-semana):not(.calendario-dias):not(.grid-2-col) {
        grid-template-columns: 1fr !important;
      }

      /* Rejilla de calendario mensual: exactamente 7 columnas en móvil */
      .calendario-semana,
      .calendario-dias,
      .calendario-grid {
        grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
      }

      /* Rejilla de 2 columnas protegida para móviles */
      .grid-2-col {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      /* Galería de fotos en móvil: 2 columnas limpias */
      .fototeca-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 10px !important;
      }

      /* Permite salto de línea en grupos de botones y formularios sin romper tarjetas ni encabezados */
      main [style*="display: flex"]:not([data-no-wrap]):not([style*="nowrap"]):not(.no-wrap):not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(.print-header-root):not(.print-header-root *):not(article > div):not(article [style*="space-between"]) {
        flex-wrap: wrap;
      }

      .no-wrap {
        flex-wrap: nowrap !important;
      }

      /* Protección estricta contra desbordamientos en tarjetas y flexbox */
      main article {
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      main article > div {
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Los campos de texto ocupan todo el ancho, excluyendo controles especiales y deslizadores */
      main input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not(.no-full-width),
      main select:not(.no-full-width),
      main textarea:not(.no-full-width) {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Evita que cualquier select o input se quede trabado con min-width fijo excesivo */
      main select:not(.keep-min-width),
      main input:not(.keep-min-width) {
        min-width: 0 !important;
      }

      main img:not(.no-responsive-img) {
        max-width: 100% !important;
        height: auto;
      }

      /* Evita desbordamiento horizontal en tarjetas y contenedores */
      main article,
      main [style*="border-radius"] {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Ajuste de padding de tarjetas en móviles para ganar espacio útil */
      main [style*="border-radius: 16px"][style*="padding: 20px"],
      main [style*="border-radius: 16px"][style*="padding:20px"] {
        padding: 14px 12px !important;
      }

      /* Oculta atajo de teclado Cmd+K / Ctrl+K en móviles */
      .kbd-ctrl-k,
      [data-kbd-shortcut] {
        display: none !important;
      }

      /* Margen inferior para que el botón de soporte flotante nunca tape controles ni sliders */
      main {
        padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px)) !important;
      }

      /* Pestañas de estado horizontales deslizables suavemente con el dedo */
      .pills-scroll-container {
        display: flex !important;
        flex-wrap: nowrap !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: none !important;
        padding-bottom: 4px !important;
        max-width: 100% !important;
      }
      .pills-scroll-container::-webkit-scrollbar {
        display: none !important;
      }
      .pills-scroll-container > * {
        flex-shrink: 0 !important;
      }

      /* Varias pantallas tienen tablas sin contenedor desplazable:
         hacemos desplazable con inercia táctil cualquier contenedor que envuelva tablas */
      main *:has(> table):not(.doc-shell *):not(#pz *) {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        max-width: 100% !important;
      }

      /* Contenedor protector para documentos tipo hoja Carta en pantallas móviles */
      .doc-paper-wrapper {
        width: 100%;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        padding-bottom: 16px;
      }
      .doc-paper-wrapper > #pz,
      .doc-paper-wrapper > .doc-shell {
        min-width: 620px;
        margin: 0 auto;
      }

      /* La tabla de items es lo unico que conserva sus columnas: apilarla
         perderia la relacion entre cantidad, valor y subtotal. Se desplaza
         de lado dentro de su marco. */
      .tabla-items {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch;
      }
      .tabla-items > * {
        min-width: 520px;
      }
      .tabla-items [style*="grid-template-columns"] {
        grid-template-columns: 3fr 0.7fr 0.8fr 1.15fr 1.15fr 28px !important;
      }
    }

    @media print {
      @page { size: Letter; margin: 12mm; }
      html, body {
        margin: 0 !important; padding: 0 !important; background: #fff !important;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      body * { visibility: hidden !important; }
      #pz, #pz * { visibility: visible !important; }
      #pz {
        position: relative !important; left: auto !important; top: auto !important;
        width: 100% !important; max-width: none !important; margin: 0 auto !important;
        padding: 0 !important; border: none !important; border-radius: 0 !important;
        box-shadow: none !important; background: #fff !important; overflow: visible !important;
      }
      .no-print { display: none !important; }
      .print-modal-parent {
        position: static !important;
        display: block !important;
        max-height: none !important;
        overflow: visible !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .print-avoid-break, table, tr, td, th { break-inside: avoid; page-break-inside: avoid; }
    }

    @media (prefers-reduced-motion: reduce) {
      * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
    }
  `;

  return <style>{css}</style>;
}
