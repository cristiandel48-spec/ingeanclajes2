// Estilos globales del armazon: scrollbars, impresion y correcciones
// especificas de Safari en iOS (zoom al enfocar inputs, rebote del scroll,
// alto real de la ventana y area segura del notch).

export default function GlobalStyles({ divider }) {
  const css = `
    :root {
      --bg-app: #f6f7f9;
      --surface: #ffffff;
      --surface-card: #ffffff;
      --surface-hover: #fffdfb;
      --surface-subtle: #f8fafc;
      --text-main: #101828;
      --text-h1: #101828;
      --text-muted: #667085;
      --text-subtle: #94a3b8;
      --border: #eef0f3;
      --border-strong: #e2e8f0;
      --input-bg: #ffffff;
      --input-color: #101828;
      --input-border: #eaecf0;
      --input-placeholder: #94a3b8;
      --c-tinta: #1a1a2e;
      --c-suave: #475569;
      --c-apagado: #64748b;
      --c-tenue: #64748b;
      --c-relleno: #f8fafc;
      --c-relleno-fuerte: #eef0f3;
      --c-borde: #eef0f3;
      --c-borde-fuerte: #e2e8f0;
      --c-acento-suave: #fff3e8;
      --c-tag-bg: #fff3e8;
      --c-tag-text: #cc6600;
      --btn-ver-bg: #dbeafe;
      --btn-ver-text: #1e40af;
      --btn-ver-border: transparent;
      --btn-cancelar-bg: #f1f5f9;
      --btn-cancelar-text: #475569;
      color-scheme: light;
    }

    .app-shell[data-theme="dark"] {
      --bg-app: #0f1115;
      --surface: #181a20;
      --surface-card: #181a20;
      --surface-hover: #20242e;
      --surface-subtle: #20232b;
      --text-main: #f0f2f5;
      --text-h1: #f0f2f5;
      --text-muted: #98a1b0;
      --text-subtle: #6b7280;
      --border: #2a2d36;
      --border-strong: #333846;
      --input-bg: #20232b;
      --input-color: #f0f2f5;
      --input-border: #2a2d36;
      --input-placeholder: #8a94a6;
      --c-tinta: #f0f2f5;
      --c-suave: #cbd5e1;
      --c-apagado: #98a1b0;
      --c-tenue: #98a1b0;
      --c-relleno: #20232b;
      --c-relleno-fuerte: #262b35;
      --c-borde: #2a2d36;
      --c-borde-fuerte: #333846;
      --c-acento-suave: rgba(244,124,32,.18);
      --c-tag-bg: rgba(244,124,32,.15);
      --c-tag-text: #fb923c;
      --btn-ver-bg: #1e3a8a;
      --btn-ver-text: #93c5fd;
      --btn-ver-border: #2563eb;
      --btn-cancelar-bg: #262b35;
      --btn-cancelar-text: #cbd5e1;
      color-scheme: dark;
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

    body {
      margin: 0;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
      /* Sin rebote elastico al llegar al final en iOS. */
      overscroll-behavior-y: none;
    }

    /* Sin destello gris al tocar botones en iOS. */
    button, a, [role="button"] { -webkit-tap-highlight-color: transparent; }

    button, input, select, textarea { font-family: inherit; }

    /* Scroll suave y con inercia en iOS. */
    .app-scroll {
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
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
    }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${divider}; border-radius: 8px; }
    ::-webkit-scrollbar-thumb:hover { background: #b9bfc9; }

    @media (max-width: 900px) {
      /* Safari en iOS hace zoom al enfocar un campo con texto menor a 16px.
         Se fuerza 16px solo en pantallas tactiles pequenas. */
      input, select, textarea { font-size: 16px !important; }

      /* Las tablas anchas ya vienen envueltas en un contenedor con
         overflow-x:auto y su propio min-width. Solo se suaviza el
         desplazamiento; poner display:block en la tabla romperia la
         alineacion entre el encabezado y las filas. */
      table { -webkit-overflow-scrolling: touch; }
    }

    /* ---- Telefono ----------------------------------------------------
       Las pantallas usan rejillas de 2 y 3 columnas escritas en el propio
       componente. En un telefono de 360 px eso deja columnas de 60 px: las
       etiquetas no caben y el texto se monta. Aqui se colapsan a una sola
       columna. Hace falta !important porque los estilos son en linea. */
    @media (max-width: 760px) {
      /* Neutraliza el doble margen horizontal acumulado en teléfonos */
      main > div[style*="padding: 28px"],
      main > div[style*="padding:28px"],
      main > div[style*="padding: 14px 28px 28px"],
      main > div[style*="padding:14px 28px 28px"] {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      /* Colapsa formularios a 1 columna sin tocar los documentos impresos ni cuadrículas especiales */
      main [style*="grid-template-columns"]:not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(.tabla-items):not(.no-collapse-grid) {
        grid-template-columns: 1fr !important;
      }

      /* Permite salto de línea en grupos de botones y formularios sin romper encabezados ni documentos */
      main [style*="display: flex"]:not([data-no-wrap]):not([style*="nowrap"]):not(.doc-shell):not(.doc-shell *):not(#pz):not(#pz *):not(.print-header-root):not(.print-header-root *) {
        flex-wrap: wrap;
      }

      /* Los campos de texto ocupan todo el ancho, excluyendo controles especiales y deslizadores */
      main input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not(.no-full-width),
      main select:not(.no-full-width),
      main textarea:not(.no-full-width) {
        width: 100% !important;
      }
      main img:not(.no-responsive-img) { max-width: 100%; }

      /* Varias pantallas tienen tablas sin contenedor desplazable, y una
         tabla de 7 columnas no cabe en un telefono. Con :has se hace
         desplazable el contenedor que la envuelve, sin tocar cada pantalla
         ni alterar la maquetacion interna de la tabla. */
      main div:has(> table) {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
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
