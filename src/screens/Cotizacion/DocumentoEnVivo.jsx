import { useEffect, useRef, useState } from "react";
import { buildCotizacionPrintHtml } from "../../lib/cotizacionPrint";

// Ancho real de una hoja carta a 96 ppp. El documento se genera a ese ancho,
// asi que para que quepa en el panel se reduce con zoom.
const ANCHO_HOJA = 816;

// Vista previa del documento tal como saldra impreso. Usa la MISMA plantilla
// del PDF, no una version resumida: lo que se ve aqui es exactamente lo que se
// imprime. Sirve para los dos casos: mientras se escribe la cotizacion y al
// abrir una guardada con "Ver".
export default function DocumentoEnVivo({
  cotizacion,
  firmaImg = "",
  alto = "calc(100vh - 220px)",
  titulo = "Documento como se imprimirá",
  nota = "Se actualiza al escribir",
  sticky = true,
}) {
  const contenedorRef = useRef(null);
  // Referencia siempre fresca: el efecto se dispara por contenido, pero debe
  // generar el documento con el objeto completo (imagenes incluidas).
  const cotizacionRef = useRef(cotizacion);
  const firmaRef = useRef(firmaImg);
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
  useEffect(() => { cotizacionRef.current = cotizacion; firmaRef.current = firmaImg; });

  // Regenerar el documento es costoso, asi que se espera a que la persona
  // deje de escribir. La PRIMERA vez no se espera: al abrir "Ver" el documento
  // debe aparecer de una, no medio segundo despues.
  const yaHayDocumento = html !== "";
  useEffect(() => {
    const generar = () => {
      try {
        setHtml(buildCotizacionPrintHtml(cotizacionRef.current, { firmaImg: firmaRef.current }));
        setError(null);
      } catch (e) {
        console.error("No se pudo generar la vista previa:", e);
        setError(e);
      }
    };
    if (!yaHayDocumento) {
      generar();
      return undefined;
    }
    const id = setTimeout(generar, 450);
    return () => clearTimeout(id);
    // yaHayDocumento solo distingue el primer render; no debe reprogramar nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, firmaImg]);

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
        position: sticky ? "sticky" : "static",
        top: 0,
        border: "1px solid #eaecf0",
        borderRadius: 12,
        overflow: "hidden",
        background: "#e8eaee",
        minWidth: 0,
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, padding: "9px 14px", background: "#fff",
        borderBottom: "1px solid #eaecf0",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#667085" }}>
          {titulo}
        </div>
        <div style={{ fontSize: 10.5, color: "#98a2b3" }}>
          {html ? nota : "Generando…"}
        </div>
      </div>

      {error ? (
        <div style={{ padding: 20, fontSize: 12.5, color: "#cc0000", background: "#fff" }}>
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
