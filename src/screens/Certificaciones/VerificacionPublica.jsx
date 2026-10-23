import { useEffect, useState } from "react";
import { fmtL } from "../../lib/format";
import { consultarCertificado } from "../../lib/verificacionCertificados";
import logoIngeanclajes from "../../assets/logo-ingeanclajes.jpeg";
import { FUENTE } from "../../styles/designTokens";

// Pagina que abre el QR del certificado. Se ve sin iniciar sesion.
//
// Antes leia todos los datos de la direccion y los mostraba como «validos»
// sin consultar nada: un enlace armado a mano pasaba por certificado real.
// Ahora todo lo que se muestra viene de la base; la direccion solo dice que
// certificado buscar.

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// vigente | vencido | anulado | emitido (sin fecha de proxima inspeccion)
function estadoDe(cert) {
  if (/anulad|revocad/i.test(String(cert?.estado || ""))) return "anulado";
  if (!cert?.prox_mant) return "emitido";
  return cert.prox_mant < hoyIso() ? "vencido" : "vigente";
}

const BANNER = {
  vigente: {
    fondo: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    icono: "🛡️ ✓",
    titulo: "Certificación auténtica y vigente",
    detalle: "Este certificado está registrado en el sistema de Ingeanclajes",
  },
  emitido: {
    fondo: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    icono: "🛡️ ✓",
    titulo: "Certificación auténtica",
    detalle: "Este certificado está registrado en el sistema de Ingeanclajes",
  },
  vencido: {
    fondo: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
    icono: "⚠️",
    titulo: "Certificación vencida",
    detalle: "El certificado es auténtico, pero su vigencia ya expiró",
  },
  anulado: {
    fondo: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    icono: "⛔",
    titulo: "Certificación anulada",
    detalle: "Este certificado fue anulado y no tiene validez",
  },
  "no-encontrado": {
    fondo: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    icono: "⚠️",
    titulo: "Certificado no encontrado",
    detalle: "Este código no corresponde a ningún certificado emitido por Ingeanclajes",
  },
  error: {
    fondo: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    icono: "⚠️",
    titulo: "No se pudo verificar ahora",
    detalle: "Revisa tu conexión e intenta de nuevo, o valida por WhatsApp",
  },
  cargando: {
    fondo: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    icono: "⏳",
    titulo: "Verificando certificado…",
    detalle: "Consultando el registro oficial de Ingeanclajes",
  },
};

const ROTULO = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 2 };

export default function VerificacionPublica() {
  const [resultado, setResultado] = useState({ estado: "cargando" });

  useEffect(() => {
    let activo = true;
    consultarCertificado(new URLSearchParams(window.location.search))
      .catch(() => ({ estado: "error" }))
      .then((r) => { if (activo) setResultado(r); });
    return () => { activo = false; };
  }, []);

  const cert = resultado.estado === "encontrado" ? resultado.cert : null;
  const estado = cert ? estadoDe(cert) : resultado.estado;
  const banner = BANNER[estado];
  const folio = cert ? (cert.numero || cert.id) : "";
  const tipo = cert?.tipo || "Certificación";

  const msgWa = encodeURIComponent(
    cert
      ? `Hola Ingeanclajes, estoy validando la ${tipo} folio ${folio} a nombre de ${cert.cliente || ""}.`
      : `Hola Ingeanclajes, quiero validar un certificado. El enlace del QR es: ${window.location.href}`
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0f172a 0%, #1e293b 160px, #f8fafc 160px, #f8fafc 100%)",
      fontFamily: FUENTE,
      padding: "20px 14px 40px",
      color: "#0f172a",
      boxSizing: "border-box"
    }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>

        {/* Encabezado Superior */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, color: "#ffffff" }}>
          <img src={logoIngeanclajes} alt="Ingeanclajes" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "contain", background: "#fff", padding: 2 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.3 }}>INGEANCLAJES S.A.S.</div>
            <div style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 500 }}>NIT 900.193.965-4 · Validación Oficial</div>
          </div>
        </div>

        {/* Tarjeta Principal de Validación */}
        <div style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          marginBottom: 16
        }}>

          {/* Banner de Estado de Autenticidad */}
          <div style={{ background: banner.fondo, color: "#ffffff", padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{banner.icono}</div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {banner.titulo}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 3 }}>{banner.detalle}</div>
          </div>

          {/* Cuerpo con datos del documento: solo si la base lo encontro */}
          {cert && (
            <div style={{ padding: "20px 20px" }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 14,
                borderBottom: "1px dashed #cbd5e1",
                marginBottom: 16
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Folio Documental</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#e0342a", fontVariantNumeric: "tabular-nums" }}>{folio}</div>
                </div>
                <span style={{
                  background: "rgba(224, 52, 42, 0.08)",
                  color: "#e0342a",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: 6
                }}>
                  {tipo.toUpperCase()}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={ROTULO}>Titular / Cliente</div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a" }}>{cert.cliente || "—"}</div>
                  {cert.nit && <div style={{ fontSize: 12, color: "#475569", marginTop: 1 }}>NIT: <strong>{cert.nit}</strong></div>}
                </div>

                {cert.direccion && (
                  <div>
                    <div style={ROTULO}>Ubicación / Sede</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{cert.direccion}</div>
                  </div>
                )}

                {cert.sistema && (
                  <div>
                    <div style={ROTULO}>Sistema certificado</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{cert.sistema}</div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #edf2f7" }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Emisión</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                      {cert.fecha ? fmtL(cert.fecha) : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Próx. Inspección</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: estado === "vigente" ? "#059669" : estado === "emitido" ? "#0f172a" : "#dc2626", marginTop: 2 }}>
                      {cert.prox_mant ? fmtL(cert.prox_mant) : "—"}
                    </div>
                  </div>
                </div>

                {cert.normativa && (
                  <div>
                    <div style={ROTULO}>Normativa Técnica Aplicada</div>
                    <div style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.4 }}>{cert.normativa}</div>
                  </div>
                )}

                {cert.ingeniero && (
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                    <div style={ROTULO}>Ingeniero Responsable</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a" }}>{cert.ingeniero}</div>
                    {cert.matricula && (
                      <div style={{ fontSize: 11.5, color: "#64748b" }}>Matrícula: <strong>{cert.matricula}</strong></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Acciones de Contacto Oficial */}
          <div style={{
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}>
            <a
              href={`https://wa.me/573152889541?text=${msgWa}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#25D366",
                color: "#ffffff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "11px 16px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                boxShadow: "0 2px 6px rgba(37, 211, 102, 0.25)"
              }}
            >
              <span>💬</span> Validar vía WhatsApp Oficial
            </a>

            <div style={{ display: "flex", gap: 10 }}>
              <a
                href="tel:+576044482686"
                style={{
                  flex: 1,
                  background: "#ffffff",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  textDecoration: "none",
                  textAlign: "center",
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                PBX (604) 448 26 86
              </a>
              <a
                href="https://www.ingeanclajessas.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  background: "#ffffff",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  textDecoration: "none",
                  textAlign: "center",
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                🌐 ingeanclajessas.com
              </a>
            </div>
          </div>

        </div>

        {/* Pie Informativo Legal */}
        <div style={{ textAlign: "center", fontSize: 11, color: "#64748b", lineHeight: 1.5, padding: "0 8px" }}>
          <div>Certificación expedida por <strong>INGEANCLAJES S.A.S.</strong></div>
          <div>Calle 38 sur # 36 - 48, Envigado · Antioquia, Colombia</div>
          <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8" }}>
            Los datos mostrados provienen del registro oficial de certificados de Ingeanclajes.
          </div>
        </div>

      </div>
    </div>
  );
}
