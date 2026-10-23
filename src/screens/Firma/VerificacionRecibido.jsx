import { useEffect, useState } from "react";
import logoIngeanclajes from "../../assets/logo-ingeanclajes.jpeg";
import { FUENTE } from "../../styles/designTokens";
import { verificarFirma } from "../../lib/firmaRecibido";
import { fechaHoraCo } from "../../lib/constanciaRecibido";

// Pagina que abre el QR de la constancia de recepcion (?recibido=<codigo>).
// Todo lo que muestra viene de la base: la direccion solo dice que buscar.

const C = { tinta: "#1d1d1f", gris: "#6e6e73", suave: "#e8e8ed", fondo: "#f5f5f7", ok: "#1f7a3d", aviso: "#9a6700", error: "#b3261e" };

const BANNER = {
  firmado: { color: C.ok, titulo: "Recibido firmado", detalle: "El cliente firmó el recibido de este documento." },
  pendiente: { color: C.aviso, titulo: "Pendiente de firma", detalle: "El documento se envió, pero el cliente todavía no ha firmado." },
  anulado: { color: C.error, titulo: "Envío anulado", detalle: "Este envío fue anulado por Ingeanclajes." },
  "no-encontrado": { color: C.error, titulo: "Constancia no encontrada", detalle: "Este código no corresponde a ninguna constancia de Ingeanclajes." },
  error: { color: C.gris, titulo: "No se pudo verificar ahora", detalle: "Revise su conexión e intente de nuevo." },
  cargando: { color: C.gris, titulo: "Verificando…", detalle: "Consultando el registro de Ingeanclajes." },
};

function Fila({ rotulo, children }) {
  if (!children) return null;
  return (
    <div style={{ padding: "9px 0", borderTop: `1px solid ${C.suave}` }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: C.gris, textTransform: "uppercase", letterSpacing: "0.04em" }}>{rotulo}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, wordBreak: "break-word" }}>{children}</div>
    </div>
  );
}

export default function VerificacionRecibido() {
  const [r, setR] = useState({ estado: "cargando" });

  useEffect(() => {
    let activo = true;
    const codigo = new URLSearchParams(window.location.search).get("recibido") || "";
    verificarFirma(codigo)
      .catch(() => ({ estado: "error" }))
      .then((res) => { if (activo) setR(res); });
    return () => { activo = false; };
  }, []);

  const f = r.firma;
  const clave = f ? (f.estado === "firmado" ? "firmado" : f.estado === "anulado" ? "anulado" : "pendiente") : r.estado;
  const banner = BANNER[clave];

  return (
    <div style={{ minHeight: "100vh", background: C.fondo, fontFamily: FUENTE, color: C.tinta, padding: "22px 16px 48px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <img src={logoIngeanclajes} alt="Ingeanclajes" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "contain", background: "#fff", border: `1px solid ${C.suave}` }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>INGEANCLAJES S.A.S.</div>
            <div style={{ fontSize: 12, color: C.gris }}>Verificación de constancia de recepción</div>
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${C.suave}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderTop: `4px solid ${banner.color}` }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: banner.color }}>{banner.titulo}</div>
            <div style={{ fontSize: 13.5, color: C.gris, marginTop: 3 }}>{banner.detalle}</div>
          </div>

          {f && (
            <div style={{ padding: "0 18px 12px" }}>
              <Fila rotulo="Documento">{[f.titulo, f.documento_numero].filter(Boolean).join(" · ")}</Fila>
              <Fila rotulo="Cliente">{f.cliente}</Fila>
              <Fila rotulo="Enviado">{f.enviado_en && `${fechaHoraCo(f.enviado_en)} a ${f.para_email}`}</Fila>
              <Fila rotulo="Abierto por primera vez">{f.abierto_en && fechaHoraCo(f.abierto_en)}</Fila>
              <Fila rotulo="Firmado">{f.firmado_en && fechaHoraCo(f.firmado_en)}</Fila>
              <Fila rotulo="Firmó">
                {f.firmante_nombre && [f.firmante_nombre, f.firmante_documento, f.firmante_cargo, f.firmante_empresa].filter(Boolean).join(" · ")}
              </Fila>
              <Fila rotulo="Huella SHA-256 del documento">
                <span style={{ fontSize: 12, fontWeight: 500 }}>{f.pdf_sha256}</span>
              </Fila>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", fontSize: 11.5, color: C.gris, lineHeight: 1.6, marginTop: 14 }}>
          Los datos provienen del registro de Ingeanclajes S.A.S. · PBX (604) 448 26 86
        </div>
      </div>
    </div>
  );
}
