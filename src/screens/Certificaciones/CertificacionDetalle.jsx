import { useState, useRef, useEffect } from "react";
import CertificacionDocumento from "./CertificacionDocumento";
import { esCertificacionEscalera } from "./certConfig";
import { printCurrentPz } from "../../lib/print";
import { fmtD } from "../../lib/format";
import { descargarDocumentoPdf } from "../../lib/documentoPdf";
import { nombreDocumento } from "../../lib/nombreArchivo";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { B } from "../../styles/tokens";

export default function CertificacionDetalle({
  cert,
  onVolver,
  onEditar,
  onImprimir,
  onDescargarPdf,
  subtitle = "Vista completa del documento oficial",
  // Certificaciones pone Volver, Editar, Imprimir y Descargar PDF en la barra
  // de arriba; aqui quedan solo los controles de vista.
  accionesEnBarra = false,
}) {
  const isMobile = useIsMobile();
  const contenedorRef = useRef(null);
  const [modo, setModo] = useState("auto"); // "auto" (ajustar a pantalla) o "real" (100% lectura)
  const [escala, setEscala] = useState(1);
  const [descargando, setDescargando] = useState(false);
  const [previewExpandido, setPreviewExpandido] = useState(false);

  // Medir ancho para auto-ajuste responsivo
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const medir = () => {
      const ancho = el.clientWidth;
      if (ancho > 0) {
        const factor = Math.min(1.2, Math.max(0.2, (ancho - 16) / 816));
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

  if (!cert) return null;

  const esMultiHoja = esCertificacionEscalera(cert);

  const imprimir = () => {
    if (typeof onImprimir === "function") {
      onImprimir(cert);
      return;
    }
    printCurrentPz(`${cert.tipo || "Certificación"} ${cert.numero || cert.id || ""}`.trim());
  };

  const descargarPdf = async () => {
    if (typeof onDescargarPdf === "function") {
      onDescargarPdf(cert);
      return;
    }
    if (descargando) return;
    setDescargando(true);
    try {
      let nodo = document.getElementById("pz");
      const tope = Date.now() + 1200;
      while (Date.now() < tope && (!nodo || !nodo.querySelector('img[alt="QR Validación"]'))) {
        await new Promise((r) => setTimeout(r, 50));
        nodo = document.getElementById("pz");
      }
      if (!nodo) {
        alert("No se encontró el documento para generar el PDF.");
        return;
      }
      await descargarDocumentoPdf(
        nodo,
        nombreDocumento(cert.tipo || "Certificación", [cert.numero || cert.id, cert.lugar, cert.cliente])
      );
    } catch (e) {
      console.error("Error al descargar PDF:", e);
      alert("No se pudo generar el PDF. Puedes imprimirlo con el botón de Imprimir.");
    } finally {
      setDescargando(false);
    }
  };

  const escalaEfectiva = modo === "real" ? 1 : Number(escala.toFixed(4));

  const diasHastaVencer = cert.proxMant
    ? Math.ceil((new Date(cert.proxMant + "T00:00:00") - new Date()) / 86400000)
    : null;
  const estadoVigencia =
    diasHastaVencer === null
      ? { label: "Sin fecha programada", bg: "var(--fill)", color: "var(--text-secondary)" }
      : diasHastaVencer < 0
      ? { label: `Venció hace ${Math.abs(diasHastaVencer)} días`, bg: "var(--danger-bg)", color: "var(--danger-text)" }
      : diasHastaVencer <= 30
      ? { label: `Vence en ${diasHastaVencer} días`, bg: "var(--warning-bg)", color: "var(--warning-text)" }
      : { label: `Vigente · Inspección en ${diasHastaVencer} d`, bg: "var(--success-bg)", color: "var(--success-text)" };

  return (
    <div style={{ padding: isMobile ? "8px 10px 16px" : "8px 18px 16px" }}>
      {/* Barra superior minimalista estilo Apple */}
      <div
        style={{
          maxWidth: previewExpandido ? "100%" : "1060px",
          margin: "0 auto 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "2px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em", margin: 0, color: "var(--text-primary)", lineHeight: 1.2 }}>
            {cert.tipo || "Certificación"} {cert.numero || cert.id}
          </h1>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            {subtitle}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {typeof onVolver === "function" && !accionesEnBarra && (
            <button
              type="button"
              style={{ ...B("var(--fill)", "var(--text-primary)"), fontSize: 12, padding: "6px 13px" }}
              onClick={onVolver}
              title="Volver al listado"
            >
              ← Volver
            </button>
          )}

          {/* Control segmentado Apple: Ajustar / 100% */}
          <div
            style={{
              background: "var(--fill)",
              padding: 3,
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setModo("auto")}
              title="Ajusta el documento al ancho de la pantalla"
              style={{
                background: modo === "auto" ? "var(--surface)" : "transparent",
                color: modo === "auto" ? "var(--text-primary)" : "var(--text-secondary)",
                border: "none",
                borderRadius: 7,
                padding: isMobile ? "4px 9px" : "5px 11px",
                fontSize: 11.5,
                fontWeight: modo === "auto" ? 600 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: modo === "auto" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Ajustar ({Math.round(escala * 100)}%)
            </button>
            <button
              type="button"
              onClick={() => setModo("real")}
              title="Muestra el documento al 100% de tamaño real"
              style={{
                background: modo === "real" ? "var(--surface)" : "transparent",
                color: modo === "real" ? "var(--text-primary)" : "var(--text-secondary)",
                border: "none",
                borderRadius: 7,
                padding: isMobile ? "4px 9px" : "5px 11px",
                fontSize: 11.5,
                fontWeight: modo === "real" ? 600 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: modo === "real" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
              }}
            >
              100% Lectura
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPreviewExpandido((prev) => !prev)}
            title={previewExpandido ? "Minimizar horizontalmente" : "Maximizar horizontalmente"}
            style={{
              ...B(previewExpandido ? "#1d1d1f" : "var(--fill)", "#ffffff"),
              fontSize: 11.5,
              padding: isMobile ? "5px 10px" : "6px 12px",
            }}
          >
            {previewExpandido ? "Minimizar" : "Maximizar"}
          </button>

          {!accionesEnBarra && typeof onEditar === "function" && (
            <button
              type="button"
              style={{ ...B("var(--fill)", "var(--text-primary)"), fontSize: 12, padding: "6px 13px" }}
              onClick={() => onEditar(cert)}
            >
              Editar
            </button>
          )}

          {!accionesEnBarra && (
            <>
              <button
                type="button"
                style={{
                  ...B("#1d1d1f", "#ffffff"),
                  fontSize: 12,
                  padding: "6px 14px",
                  cursor: descargando ? "wait" : "pointer",
                }}
                disabled={descargando}
                onClick={descargarPdf}
              >
                {descargando ? "Generando…" : "Descargar PDF"}
              </button>

              <button
                type="button"
                style={{ ...B("var(--fill)", "var(--text-primary)"), fontSize: 12, padding: "6px 13px" }}
                onClick={imprimir}
              >
                Imprimir
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tarjeta resumen minimalista estilo Apple */}
      <div
        style={{
          maxWidth: previewExpandido ? "100%" : "1060px",
          margin: "0 auto 16px",
          background: "var(--surface)",
          borderRadius: 18,
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          transition: "max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Folio {cert.numero || cert.id || "S/N"}
            </span>
          </div>
          <div style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.015em", color: "var(--text-primary)", lineHeight: 1.3 }}>
            {cert.cliente || "Certificación Técnica"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 3 }}>
            {cert.lugar ? `${cert.lugar} · ` : ""}
            {cert.tipo || "Certificación"} emitida el {fmtD(cert.fecha)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              background: "var(--fill)",
              borderRadius: 12,
              padding: "8px 14px",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Normativa
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
              {esMultiHoja ? "ANSI ASC A14.5 · NTC 17025 · Res. 4272" : "Res. 4272 / ANSI Z359"}
            </div>
          </div>

          <div
            style={{
              background: estadoVigencia.bg,
              borderRadius: 12,
              padding: "8px 14px",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 600, color: estadoVigencia.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Próximo mantenimiento
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: estadoVigencia.color, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              {cert.proxMant ? fmtD(cert.proxMant) : "No asignado"}
              <span style={{ display: "block", fontSize: 10.5, fontWeight: 500, opacity: 0.85 }}>
                {estadoVigencia.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenedor Responsivo del Documento */}
      <div
        ref={contenedorRef}
        className="doc-paper-wrapper"
        style={{
          width: "100%",
          maxWidth: previewExpandido ? "100%" : "1060px",
          margin: "0 auto",
          overflowX: escalaEfectiva === 1 ? "auto" : "hidden",
          padding: isMobile ? "8px 0 24px" : "12px 0 32px",
          display: "flex",
          justifyContent: "center",
          WebkitOverflowScrolling: "touch",
          transition: "max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          style={{
            width: 816,
            minWidth: 816,
            zoom: escalaEfectiva,
            boxShadow: esMultiHoja ? "none" : "0 8px 28px rgba(15, 23, 42, 0.08)",
            borderRadius: 4,
            background: esMultiHoja ? "transparent" : "#ffffff",
          }}
        >
          <CertificacionDocumento cert={cert} />
        </div>
      </div>
    </div>
  );
}
