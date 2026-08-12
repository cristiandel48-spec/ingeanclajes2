import { useState } from "react";
import { corregirTexto, diferencias } from "../../lib/correctorTexto";

// Boton que repasa la ortografia de un campo de texto.
//
// NO CORRIGE SOLO. Enseña lo que cambiaria -en rojo lo que quita, en verde lo
// que pone- y espera a que se acepte. Estos textos salen impresos en
// cotizaciones y certificaciones que se entregan firmadas: quien firma tiene
// que poder ver que le tocaron antes de que se aplique.
//
// Se pone al lado de la etiqueta del campo, como el boton de dictar.

export default function BotonCorregir({ valor, onChange, titulo = "Revisar ortografía", compacto = false }) {
  const [trabajando, setTrabajando] = useState(false);
  const [propuesta, setPropuesta] = useState(null);
  const [error, setError] = useState("");
  const [sinCambios, setSinCambios] = useState(false);

  const hayTexto = String(valor || "").trim().length > 0;

  const revisar = async () => {
    if (!hayTexto || trabajando) return;
    setTrabajando(true);
    setError("");
    setSinCambios(false);
    try {
      const { corregido, cambios, aviso } = await corregirTexto(valor);
      if (aviso) setError(aviso);
      else if (!cambios) setSinCambios(true);
      else setPropuesta(corregido);
    } catch (fallo) {
      setError(fallo.message || "No se pudo revisar el texto.");
    } finally {
      setTrabajando(false);
    }
  };

  const aplicar = () => { onChange(propuesta); setPropuesta(null); };

  return (
    <>
      <button
        type="button"
        onClick={revisar}
        disabled={!hayTexto || trabajando}
        title={hayTexto ? titulo : "Escribe algo primero"}
        style={{
          background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
          borderRadius: 7, padding: compacto ? "3px 8px" : "4px 10px",
          fontSize: compacto ? 10.5 : 11, fontWeight: 600, fontFamily: "inherit",
          cursor: hayTexto && !trabajando ? "pointer" : "default",
          opacity: hayTexto ? 1 : 0.5, whiteSpace: "nowrap",
        }}
      >
        {trabajando ? "Revisando…" : "Ortografía"}
      </button>

      {sinCambios && (
        <span style={{ fontSize: 10.5, color: "#166534", marginLeft: 6 }}>
          Sin errores
          <button type="button" onClick={() => setSinCambios(false)}
            style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer",
              fontSize: 10.5, marginLeft: 4 }}>✕</button>
        </span>
      )}

      {error && (
        <span style={{ fontSize: 10.5, color: "#b42318", marginLeft: 6 }}>
          {error}
          <button type="button" onClick={() => setError("")}
            style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer",
              fontSize: 10.5, marginLeft: 4 }}>✕</button>
        </span>
      )}

      {propuesta !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setPropuesta(null)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, maxWidth: 760, width: "100%",
              maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 24px 60px -20px rgba(15,23,42,.5)" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #eef0f3" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#101828" }}>Revisión de ortografía</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                En <span style={{ background: "#fee4e2", textDecoration: "line-through" }}>rojo</span> lo que
                se quita y en <span style={{ background: "#dcfce7" }}>verde</span> lo que se pone. Nada
                cambia hasta que lo aceptes.
              </div>
            </div>

            <div style={{ padding: "14px 20px", overflowY: "auto", fontSize: 13, lineHeight: 1.7,
              whiteSpace: "pre-wrap", color: "#101828", flex: 1 }}>
              {diferencias(valor, propuesta).map((parte, i) => {
                if (parte.tipo === "igual") return <span key={i}>{parte.texto}</span>;
                if (parte.tipo === "quitado") {
                  return <span key={i} style={{ background: "#fee4e2", color: "#b42318",
                    textDecoration: "line-through" }}>{parte.texto}</span>;
                }
                return <span key={i} style={{ background: "#dcfce7", color: "#166534" }}>{parte.texto}</span>;
              })}
            </div>

            <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #eef0f3",
              display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setPropuesta(null)}
                style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
                  borderRadius: 9, padding: "8px 16px", fontSize: 12.5, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit" }}>Dejarlo como está</button>
              <button type="button" onClick={aplicar}
                style={{ background: "#f47c20", color: "#fff", border: "1px solid #f47c20",
                  borderRadius: 9, padding: "8px 18px", fontSize: 12.5, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit" }}>Aplicar corrección</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
