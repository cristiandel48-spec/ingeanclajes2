import { useEffect, useRef, useState } from "react";
import { buildCotizacionPrintHtml } from "../../lib/cotizacionPrint";

// Ancho real de una hoja carta a 96 ppp. El documento se genera a ese ancho,
// asi que para que quepa en el panel se reduce con zoom.
const ANCHO_HOJA = 816;

// Vista previa del documento tal como saldra impreso, actualizada mientras se
// escribe. Usa la MISMA plantilla del PDF, no una version resumida: lo que se
// ve aqui es exactamente lo que se imprime.
export default function DocumentoEnVivo({ cotizacion, alto = "calc(100vh - 220px)" }) {
  const contenedorRef = useRef(null);
  // Referencia siempre fresca: el efecto se dispara por contenido, pero debe
  // generar el documento con el objeto completo (imagenes incluidas).
  const cotizacionRef = useRef(cotizacion);
  const [html, setHtml] = useState("");
  const [escala, setEscala] = useState(1);
  const [error, setError] = useState(null);

  // La cotizacion llega como objeto nuevo en cada render, asi que compararla
  // por identidad reiniciaria el temporizador aunque no haya cambiado nada.
  // Se compara por contenido, resumiendo los textos largos (imagenes en base64)
  // para que la comparacion sea barata.
  const clave = JSON.stringify(cotizacion, (_k, v) =>
    typeof v === "string" && v.length > 200 ? `${v.length}:${v.slice(0, 40)}` : v
  );

  // Se actualiza tras cada commit, nunca durante el render.
  useEffect(() => { cotizacionRef.current = cotizacion; });

  // Regenerar el documento es costoso, asi que se espera a que la persona
  // deje de escribir.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setHtml(buildCotizacionPrintHtml(cotizacionRef.current));
        setError(null);
      } catch (e) {
        console.error("No se pudo generar la vista previa:", e);
        setError(e);
      }
    }, 450);
    return () => clearTimeout(id);
  }, [clave]);

  // Ajusta el zoom al ancho disponible del panel.
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const medir = () => {
      const ancho = el.clientWidth;
      if (ancho > 0) setEscala(Math.min(1, ancho / (ANCHO_HOJA + 24)));
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

  // Se inyecta el zoom y un fondo de "mesa de trabajo" sin tocar la plantilla.
  const htmlAjustado = html
    ? html.replace(
        "</head>",
        `<style>
          html { zoom: ${escala}; }
          body { background: #e8eaee; padding: 14px 0 24px; }
          .page { box-shadow: 0 2px 14px rgba(15,23,42,.18); margin: 0 auto 16px; }
        </style></head>`
      )
    : "";

  return (
    <div
      ref={contenedorRef}
      style={{
        position: "sticky",
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
        gap: 10, padding: "9px 14px", background: "#fff",
        borderBottom: "1px solid #e2e8f0",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#64748b" }}>
          Documento como se imprimirá
        </div>
        <div style={{ fontSize: 10.5, color: "#94a3b8" }}>
          {html ? "Se actualiza al escribir" : "Generando…"}
        </div>
      </div>

      {error ? (
        <div style={{ padding: 20, fontSize: 12.5, color: "#b42318", background: "#fff" }}>
          No se pudo generar la vista previa. Revisa que los ítems tengan cantidad y valor.
        </div>
      ) : (
        <iframe
          title="Vista previa de la cotización"
          srcDoc={htmlAjustado}
          sandbox="allow-same-origin"
          style={{ display: "block", width: "100%", height: alto, border: 0, background: "#e8eaee" }}
        />
      )}
    </div>
  );
}
