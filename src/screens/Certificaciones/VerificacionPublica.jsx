import { fmtL } from "../../lib/format";
import logoIngeanclajes from "../../assets/logo-ingeanclajes.jpeg";

export default function VerificacionPublica() {
  const params = new URLSearchParams(window.location.search);

  const folio = params.get("f") || params.get("folio") || "CERT-S/N";
  const cliente = params.get("c") || params.get("cliente") || "Cliente no especificado";
  const nit = params.get("n") || params.get("nit") || "";
  const lugar = params.get("l") || params.get("lugar") || "";
  const fecha = params.get("fe") || params.get("fecha") || "";
  const proxMant = params.get("vm") || params.get("vigencia") || "";
  const tipo = params.get("t") || params.get("tipo") || "Certificación";
  const ingeniero = params.get("ing") || "ING. JHON JAIME SEPULVEDA LONDOÑO";
  const cargo = params.get("cargo") || "Gerente General";
  const matricula = params.get("mp") || "05256-409949";
  const normativa = params.get("norm") || "Resolución 4272 de 2021 & ANSI Z359";

  const hoy = new Date();
  let estadoVigente = true;
  let diasRestantes = null;
  if (proxMant) {
    const fVenc = new Date(proxMant + "T00:00:00");
    diasRestantes = Math.ceil((fVenc - hoy) / 86400000);
    if (diasRestantes < 0) estadoVigente = false;
  }

  const msgWa = encodeURIComponent(
    `Hola Ingeanclajes, estoy validando la autenticidad de la ${tipo} Oficial Folio: ${folio} a nombre de ${cliente} (NIT: ${nit || "N/A"}).`
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0f172a 0%, #1e293b 160px, #f8fafc 160px, #f8fafc 100%)",
      fontFamily: "'Aptos', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: "20px 14px 40px",
      color: "#0f172a",
      boxSizing: "border-box"
    }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        
        {/* Encabezado Superior */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, color: "#ffffff" }}>
          {logoIngeanclajes ? (
            <img src={logoIngeanclajes} alt="Ingeanclajes" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "contain", background: "#fff", padding: 2 }} />
          ) : (
            <div style={{ width: 46, height: 46, borderRadius: 10, background: "#e0342a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>ING</div>
          )}
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
          <div style={{
            background: estadoVigente
              ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
              : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
            color: "#ffffff",
            padding: "16px 20px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>
              {estadoVigente ? "🛡️ ✓" : "⚠️"}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {estadoVigente ? "Certificación Oficial Válida" : "Certificación Vencida"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 3 }}>
              {estadoVigente
                ? "Documento técnico homologado bajo normativa de seguridad"
                : "La vigencia anual de esta certificación ha expirado"}
            </div>
          </div>

          {/* Cuerpo con datos del documento */}
          <div style={{ padding: "20px 20px" }}>
            
            {/* Folio Destacado */}
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
                <div style={{ fontSize: 18, fontWeight: 900, color: "#e0342a", fontFamily: "monospace" }}>{folio}</div>
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

            {/* Ficha de Información */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Titular / Cliente</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a" }}>{cliente}</div>
                {nit && <div style={{ fontSize: 12, color: "#475569", marginTop: 1 }}>NIT: <strong>{nit}</strong></div>}
              </div>

              {lugar && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Ubicación / Sede</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{lugar}</div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #edf2f7" }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Emisión</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                    {fecha ? fmtL(fecha) : "Fecha oficial"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Próx. Inspección</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: estadoVigente ? "#059669" : "#dc2626", marginTop: 2 }}>
                    {proxMant ? fmtL(proxMant) : "12 meses"}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Normativa Técnica Aplicada</div>
                <div style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.4 }}>
                  {normativa}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Ingeniero Responsable</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a" }}>{ingeniero}</div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>{cargo} · Matrícula: <strong>{matricula}</strong></div>
              </div>

            </div>

          </div>

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
                📞 PBX (604) 448 26 86
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
            El uso de este sistema certifica que los elementos instalados cumplen con las normas técnicas vigentes.
          </div>
        </div>

      </div>
    </div>
  );
}
