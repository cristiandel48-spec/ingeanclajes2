import { useEffect, useMemo, useRef, useState } from "react";
import { buildCotizacionPrintHtml } from "../../lib/cotizacionPrint";
import { useIsMobile } from "../../hooks/useMediaQuery";

// Ancho real de una hoja carta a 96 ppp (8.5 x 96 = 816 px)
const ANCHO_HOJA = 816;

// Vista previa responsiva del documento tal como saldrá impreso.
// Compatible 100% con navegadores móviles (Android Chrome/Brave, iOS Safari) y escritorio.
export default function DocumentoEnVivo({
  cotizacion,
  firmaImg = "",
  sello = null,
  alto = "calc(100dvh - 200px)",
  titulo = "Documento como se imprimirá",
  nota = "Se actualiza al escribir",
  sticky = true,
}) {
  const isMobile = useIsMobile();
  const contenedorRef = useRef(null);
  const [modo, setModo] = useState("auto"); // "auto" (ajustar a pantalla) o "real" (100% tamaño lectura)
  
  // Escala inicial inteligente según viewport para que en móviles arranque ajustado sin salto
  const [escala, setEscala] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth) {
      const margen = window.innerWidth <= 600 ? 20 : 40;
      return Math.max(0.2, Math.min(1, (window.innerWidth - margen) / ANCHO_HOJA));
    }
    return 1;
  });
  const [error, setError] = useState(null);

  // Inicializar el html
  const [html, setHtml] = useState(() => {
    try {
      return buildCotizacionPrintHtml(cotizacion, { firmaImg, sello });
    } catch (e) {
      console.error("Error al generar vista previa inicial:", e);
      return "";
    }
  });

  const clave = JSON.stringify(cotizacion, (_k, v) =>
    typeof v === "string" && v.length > 200 ? `${v.length}:${v.slice(0, 20)}:${v.slice(-20)}` : v
  );

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setHtml(buildCotizacionPrintHtml(cotizacion, { firmaImg, sello }));
        setError(null);
      } catch (e) {
        console.error("No se pudo generar la vista previa:", e);
        setError(e);
      }
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, firmaImg, sello]);

  // Medir ancho disponible para escala automática con ResizeObserver
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const medir = () => {
      const ancho = el.clientWidth;
      if (ancho > 0) {
        // En móviles dejamos margen de 12px para que la hoja quede centrada con borde visible
        const factor = Math.max(0.2, Math.min(1, (ancho - 12) / ANCHO_HOJA));
        setEscala(factor);
      }
    };
    medir();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", medir);
      window.addEventListener("orientationchange", medir);
      return () => {
        window.removeEventListener("resize", medir);
        window.removeEventListener("orientationchange", medir);
      };
    }
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const escalaEfectiva = modo === "real" ? 1 : Number(escala.toFixed(4));

  const htmlAjustado = useMemo(() => {
    if (!html) return "";
    const cssInyectado = `
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
      <style>
        html {
          background: #e8eaee;
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
          overflow-x: ${escalaEfectiva === 1 ? "auto" : "hidden"};
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        body {
          background: #e8eaee;
          margin: 0 auto;
          padding: ${escalaEfectiva === 1 ? "18px 12px 40px" : "12px 0 32px"};
          min-height: 100%;
          box-sizing: border-box;
          width: ${escalaEfectiva === 1 ? "max-content" : "100%"};
          min-width: ${escalaEfectiva === 1 ? "100%" : "auto"};
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow-x: ${escalaEfectiva === 1 ? "auto" : "hidden"};
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .page {
          zoom: ${escalaEfectiva};
          margin: 0 auto 16px !important;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.16) !important;
          background: #ffffff !important;
        }
        @supports not (zoom: 1) {
          .page {
            transform: scale(${escalaEfectiva});
            transform-origin: top center;
            margin-bottom: calc(-1 * (11in * (1 - ${escalaEfectiva})) + 16px) !important;
          }
        }
      </style>
      <script>
        (function() {
          function autoAjustar() {
            var m = "${modo}";
            if (m !== "auto") return;
            var w = document.documentElement.clientWidth || window.innerWidth;
            if (!w || w <= 0) return;
            var factor = Math.min(1, Math.max(0.2, (w - 12) / 816));
            var pages = document.querySelectorAll('.page');
            for (var i = 0; i < pages.length; i++) {
              pages[i].style.zoom = factor;
            }
          }
          window.addEventListener('resize', autoAjustar);
          window.addEventListener('orientationchange', autoAjustar);
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoAjustar);
          } else {
            autoAjustar();
          }
          setTimeout(autoAjustar, 60);
          setTimeout(autoAjustar, 250);
        })();
      </script>
    `;

    return html.includes("</head>")
      ? html.replace("</head>", `${cssInyectado}</head>`)
      : `${html}${cssInyectado}`;
  }, [html, escalaEfectiva, modo]);

  return (
    <div
      ref={contenedorRef}
      style={{
        position: sticky ? "sticky" : "static",
        top: 0,
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--bg-app, #e8eaee)",
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, padding: isMobile ? "6px 10px" : "8px 12px", background: "var(--surface, #fff)",
        borderBottom: "1px solid var(--border, #e2e8f0)", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-muted, #64748b)" }}>
            {titulo}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-subtle, #94a3b8)" }}>
            {html ? nota : "Generando…"}
          </div>
        </div>

        {/* Controles de vista: Ajustar a pantalla o 100% Lectura */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={() => setModo("auto")}
            title="Ajusta el documento al ancho completo de tu pantalla para ver la página entera"
            style={{
              background: modo === "auto" ? "var(--btn-guardar-bg, #cc0000)" : "var(--btn-cancelar-bg, #f1f5f9)",
              color: modo === "auto" ? "#fff" : "var(--btn-cancelar-txt, #475569)",
              border: `1px solid ${modo === "auto" ? "var(--btn-guardar-bg, #cc0000)" : "var(--border, #cbd5e1)"}`,
              borderRadius: 6,
              padding: isMobile ? "5px 9px" : "4px 10px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>📱</span>
            <span>Ajustar ({Math.round(escala * 100)}%)</span>
          </button>
          <button
            type="button"
            onClick={() => setModo("real")}
            title="Muestra el documento al 100% de tamaño para lectura cómoda deslizando con el dedo"
            style={{
              background: modo === "real" ? "var(--btn-guardar-bg, #cc0000)" : "var(--btn-cancelar-bg, #f1f5f9)",
              color: modo === "real" ? "#fff" : "var(--btn-cancelar-txt, #475569)",
              border: `1px solid ${modo === "real" ? "var(--btn-guardar-bg, #cc0000)" : "var(--border, #cbd5e1)"}`,
              borderRadius: 6,
              padding: isMobile ? "5px 9px" : "4px 10px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>🔍</span>
            <span>100% Lectura</span>
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ padding: 20, fontSize: 12.5, color: "#f87171", background: "var(--surface, #fff)" }}>
          No se pudo generar la vista previa. Revisa que los ítems tengan cantidad y valor.
        </div>
      ) : (
        <iframe
          key={`${cotizacion?.id || cotizacion?.numero || "prev"}-${modo}-${Math.round(escalaEfectiva * 100)}`}
          title="Vista previa de la cotización"
          srcDoc={htmlAjustado}
          style={{
            display: "block",
            width: "100%",
            maxWidth: "100%",
            height: alto,
            maxHeight: alto,
            border: 0,
            background: "var(--bg-app, #e8eaee)",
            WebkitOverflowScrolling: "touch",
          }}
        />
      )}
    </div>
  );
}
