import { useState, useRef, useEffect } from "react";
import CertificacionDocumento from "./CertificacionDocumento";
import { esCertificacionEscalera } from "./certConfig";
import { printCurrentPz } from "../../lib/print";
import { fmtD } from "../../lib/format";
import { descargarDocumentoPdf } from "../../lib/documentoPdf";
import { nombreDocumento } from "../../lib/nombreArchivo";
import { useIsMobile } from "../../hooks/useMediaQuery";

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
      ? { label: "Sin fecha programada", bg: "rgba(148, 163, 184, 0.12)", color: "#64748b" }
      : diasHastaVencer < 0
      ? { label: `Venció hace ${Math.abs(diasHastaVencer)} días`, bg: "rgba(239, 68, 68, 0.12)", color: "#dc2626" }
      : diasHastaVencer <= 30
      ? { label: `Vence en ${diasHastaVencer} días`, bg: "rgba(245, 158, 11, 0.12)", color: "#d97706" }
      : { label: `Vigente · Inspección en ${diasHastaVencer}d`, bg: "rgba(16, 185, 129, 0.12)", color: "#059669" };

  return (
    <div style={{ padding: isMobile ? "8px 10px 16px" : "8px 18px 16px" }}>
      {/* Barra de Título y Acciones IDÉNTICA al módulo de Cotizaciones */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 10,
          padding: "2px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "var(--text-h1, #101828)", lineHeight: 1.2 }}>
            {cert.tipo || "Certificación"} {cert.numero || cert.id}
          </h1>
          <span style={{ fontSize: 12, color: "var(--text-muted, #667085)" }}>
            {subtitle}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {typeof onVolver === "function" && !accionesEnBarra && (
            <button
              type="button"
              style={{
                background: "var(--surface-subtle, #f2f4f7)",
                color: "var(--text-main, #101828)",
                border: "1px solid var(--border, #eaecf0)",
                borderRadius: 6,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
              onClick={onVolver}
              title="Volver al listado"
            >
              ← Volver
            </button>
          )}

          {/* Botón para Minimizar / Maximizar */}
          <button
            type="button"
            onClick={() => setPreviewExpandido((prev) => !prev)}
            title={previewExpandido ? "Minimizar horizontalmente" : "Maximizar horizontalmente"}
            style={{
              background: previewExpandido ? "#1d1d1f" : "var(--surface-subtle, #f2f4f7)",
              color: previewExpandido ? "#ffffff" : "var(--text-main, #101828)",
              border: `1px solid ${previewExpandido ? "#1d1d1f" : "var(--border, #eaecf0)"}`,
              borderRadius: 6,
              padding: isMobile ? "5px 9px" : "5px 11px",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>↔</span>
            <span>{previewExpandido ? "Minimizar" : "Maximizar"}</span>
          </button>

          {/* Controles de vista: Ajustar a pantalla o 100% Lectura */}
          <button
            type="button"
            onClick={() => setModo("auto")}
            title="Ajusta el documento al ancho de la pantalla"
            style={{
              background: modo === "auto" ? "var(--btn-guardar-bg, #cc0000)" : "var(--btn-cancelar-bg, #f1f5f9)",
              color: modo === "auto" ? "#ffffff" : "var(--btn-cancelar-txt, #475569)",
              border: `1px solid ${modo === "auto" ? "var(--btn-guardar-bg, #cc0000)" : "var(--border, #cbd5e1)"}`,
              borderRadius: 6,
              padding: isMobile ? "5px 9px" : "5px 11px",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>Ajustar ({Math.round(escala * 100)}%)</span>
          </button>
          <button
            type="button"
            onClick={() => setModo("real")}
            title="Muestra el documento al 100% de tamaño real"
            style={{
              background: modo === "real" ? "var(--btn-guardar-bg, #cc0000)" : "var(--btn-cancelar-bg, #f1f5f9)",
              color: modo === "real" ? "#ffffff" : "var(--btn-cancelar-txt, #475569)",
              border: `1px solid ${modo === "real" ? "var(--btn-guardar-bg, #cc0000)" : "var(--border, #cbd5e1)"}`,
              borderRadius: 6,
              padding: isMobile ? "5px 9px" : "5px 11px",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>100% Lectura</span>
          </button>

          {!accionesEnBarra && typeof onEditar === "function" && (
            <button
              type="button"
              style={{
                background: "transparent",
                color: "var(--text-muted, #475467)",
                border: "1px solid var(--border, #eaecf0)",
                borderRadius: 6,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => onEditar(cert)}
            >
              Editar
            </button>
          )}

          {/* Botón Descargar PDF idéntico al de Cotizaciones (señalado en amarillo) */}
          {!accionesEnBarra && (<>
          <button
            type="button"
            style={{
              background: "var(--surface-subtle, #f2f4f7)",
              color: "var(--text-main, #101828)",
              border: "1px solid var(--border, #eaecf0)",
              borderRadius: 6,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: descargando ? "wait" : "pointer",
            }}
            disabled={descargando}
            onClick={descargarPdf}
          >
            {descargando ? "Generando…" : "Descargar PDF"}
          </button>

          <button
            type="button"
            style={{
              background: "var(--surface-subtle, #f2f4f7)",
              color: "var(--text-main, #101828)",
              border: "1px solid var(--border, #eaecf0)",
              borderRadius: 6,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={imprimir}
          >
            Imprimir / PDF
          </button>
          </>)}
        </div>
      </div>

      {/* Dossier Técnico Oficial Card */}
      <div
        style={{
          maxWidth: previewExpandido ? "100%" : "1060px",
          margin: "0 auto 16px",
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: 14,
          padding: "14px 20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
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
                background: "rgba(224, 52, 42, 0.1)",
                color: "#E0342A",
                fontSize: 10.5,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 6,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Dossier Técnico Oficial
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-subtle, #64748b)" }}>
              Folio {cert.numero || cert.id || "S/N"}
            </span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-main, #0f172a)", lineHeight: 1.3 }}>
            {cert.cliente || "Certificación Técnica"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-subtle, #64748b)", marginTop: 3 }}>
            {cert.lugar ? `${cert.lugar} · ` : ""}
            {cert.tipo || "Certificación"} emitida el {fmtD(cert.fecha)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              background: "var(--bg-subtle, #f8fafc)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: 10,
              padding: "8px 14px",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-subtle, #94a3b8)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Normativa de Conformidad
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main, #334155)", marginTop: 2 }}>
              {esMultiHoja ? "ANSI ASC A14.5 · NTC 17025 · Res. 4272" : "Res. 4272 / ANSI Z359"}
            </div>
          </div>

          <div
            style={{
              background: estadoVigencia.bg,
              border: `1px solid ${estadoVigencia.color}30`,
              borderRadius: 10,
              padding: "8px 14px",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: estadoVigencia.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Próximo Mantenimiento
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: estadoVigencia.color, marginTop: 2 }}>
              {cert.proxMant ? fmtD(cert.proxMant) : "No asignado"}
              <span style={{ display: "block", fontSize: 10.5, fontWeight: 600, opacity: 0.85 }}>
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
            boxShadow: esMultiHoja ? "none" : "0 8px 30px rgba(15, 23, 42, 0.12)",
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
