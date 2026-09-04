import { useEffect, useMemo, useRef, useState } from "react";
import { buildCotizacionPrintHtml } from "../../lib/cotizacionPrint";

// Ancho real de una hoja carta a 96 ppp (8.5 x 96 = 816 px)
const ANCHO_HOJA = 816;

// Vista previa responsiva del documento tal como saldrá impreso.
// Compatible 100% con navegadores móviles (Android Chrome, iOS Safari) y escritorio.
export default function DocumentoEnVivo({
  cotizacion,
  firmaImg = "",
  sello = null,
  alto = "calc(100dvh - 200px)",
  titulo = "Documento como se imprimirá",
  nota = "Se actualiza al escribir",
  sticky = true,
}) {
  const contenedorRef = useRef(null);
  const [modo, setModo] = useState("auto"); // "auto" (ajustar a pantalla) o "real" (100% tamaño lectura)
  const [escala, setEscala] = useState(1);
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
    typeof v === "string" && v.length > 200 ? `${v.length}:${v.slice(0, 40)}` : v
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

  // Medir ancho disponible para escala automática
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const medir = () => {
      const ancho = el.clientWidth;
      if (ancho > 0) {
        const factor = Math.max(0.25, Math.min(1, (ancho - 16) / ANCHO_HOJA));
        setEscala(factor);
      }
    };
    medir();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", medir);
      return () => window.removeEventListener("resize", medir);
    }
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const escalaEfectiva = modo === "real" ? 1 : escala;

  const htmlAjustado = useMemo(() => {
    if (!html) return "";
    const cssInyectado = `
      <style>
        html {
          background: #e8eaee;
          margin: 0;
          padding: 0;
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
          overflow-x: ${escalaEfectiva === 1 ? "auto" : "hidden"};
          -webkit-overflow-scrolling: touch;
        }
        body {
          background: #e8eaee;
          padding: ${escalaEfectiva === 1 ? "18px 14px 36px" : "12px 0 24px"};
          margin: 0;
          min-height: 100vh;
          box-sizing: border-box;
          ${escalaEfectiva !== 1 ? `
            width: ${ANCHO_HOJA}px;
            margin: 0 auto;
            transform: scale(${escalaEfectiva});
            transform-origin: top center;
          ` : `
            min-width: ${ANCHO_HOJA + 28}px;
            display: flex;
            flex-direction: column;
            align-items: center;
          `}
        }
        .page {
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.16);
          margin: 0 auto 18px !important;
        }
      </style>
    `;

    return html.includes("</head>")
      ? html.replace("</head>", `${cssInyectado}</head>`)
      : `${html}${cssInyectado}`;
  }, [html, escalaEfectiva]);

  return (
    <div
      ref={contenedorRef}
      style={{
        position: sticky ? "sticky" : "static",
        top: 0,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        overflow: "hidden",
        background: "#e8eaee",
        minWidth: 0,
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, padding: "8px 12px", background: "#fff",
        borderBottom: "1px solid #e2e8f0", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#64748b" }}>
            {titulo}
          </div>
          <div style={{ fontSize: 10.5, color: "#94a3b8" }}>
            {html ? nota : "Generando…"}
          </div>
        </div>

        {/* Controles de vista: Ajustar a pantalla o 100% Lectura */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => setModo("auto")}
            title="Ajusta el documento al ancho completo de tu pantalla"
            style={{
              background: modo === "auto" ? "#1e293b" : "#f1f5f9",
              color: modo === "auto" ? "#fff" : "#475569",
              border: `1px solid ${modo === "auto" ? "#1e293b" : "#cbd5e1"}`,
              borderRadius: 6, padding: "4px 8px", fontSize: 10.5, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Ajustar
          </button>
          <button
            type="button"
            onClick={() => setModo("real")}
            title="Muestra el documento al 100% de tamaño para lectura cómoda con desplazamiento táctil"
            style={{
              background: modo === "real" ? "#1e293b" : "#f1f5f9",
              color: modo === "real" ? "#fff" : "#475569",
              border: `1px solid ${modo === "real" ? "#1e293b" : "#cbd5e1"}`,
              borderRadius: 6, padding: "4px 8px", fontSize: 10.5, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            100% Lectura
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ padding: 20, fontSize: 12.5, color: "#b42318", background: "#fff" }}>
          No se pudo generar la vista previa. Revisa que los ítems tengan cantidad y valor.
        </div>
      ) : (
        <iframe
          key={`${cotizacion?.id || cotizacion?.numero || "prev"}-${modo}`}
          title="Vista previa de la cotización"
          srcDoc={htmlAjustado}
          style={{
            display: "block",
            width: "100%",
            height: alto,
            border: 0,
            background: "#e8eaee",
            WebkitOverflowScrolling: "touch",
          }}
        />
      )}
    </div>
  );
}
