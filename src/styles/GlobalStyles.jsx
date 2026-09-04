// Estilos globales del armazon: scrollbars, impresion y correcciones
// especificas de Safari en iOS (zoom al enfocar inputs, rebote del scroll,
// alto real de la ventana y area segura del notch).

export default function GlobalStyles({ divider }) {
  const css = `
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
        width: auto !important; max-width: none !important; margin: 0 !important;
        padding: 0 !important; border: none !important; border-radius: 0 !important;
        box-shadow: none !important; background: #fff !important; overflow: visible !important;
      }
      .no-print { display: none !important; }
      .print-avoid-break, table, tr, td, th { break-inside: avoid; page-break-inside: avoid; }
    }

    @media (prefers-reduced-motion: reduce) {
      * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
    }
  `;

  return <style>{css}</style>;
}
