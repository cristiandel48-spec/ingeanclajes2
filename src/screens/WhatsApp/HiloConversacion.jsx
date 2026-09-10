import { B, CD, ST } from "../../styles/tokens";
import { fmtD } from "../../lib/format";
import { telefonoLegible } from "../../lib/whatsappCrm";
import { abrirWhatsApp } from "../../lib/whatsapp";

// La conversacion de un telefono, leida de arriba abajo.
//
// Cada fila guardada es un mensaje del cliente CON la respuesta que se le dio,
// asi que el hilo se arma de dos en dos. No es un chat en vivo: es el registro
// de lo que paso, para que quien atienda sepa que se le prometio antes de
// llamar.

const BURBUJA = {
  base: {
    maxWidth: "78%", padding: "9px 12px", borderRadius: 12, fontSize: 12.5,
    lineHeight: 1.5, whiteSpace: "pre-line", position: "relative",
  },
  cliente: { alignSelf: "flex-start", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-main)" },
  nuestra: { alignSelf: "flex-end", background: "rgba(37, 211, 102, 0.18)", border: "1px solid rgba(37, 211, 102, 0.35)", color: "var(--text-main)" },
};

const hora = (valor) => {
  if (!valor) return "";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(new Date(valor));
  } catch { return ""; }
};

export default function HiloConversacion({ conversacion, ejemplo = false, onVolver }) {
  const { telefono, nombre, mensajes = [] } = conversacion;

  return (
    <div style={{ padding: "14px 28px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18,
        background: "var(--surface)", borderRadius: 14, padding: "14px 18px", border: "1px solid var(--border)" }}>
        <button onClick={onVolver}
          style={{ ...B("var(--surface-subtle)", "var(--text-muted)"), border: "1px solid var(--border)", padding: "8px 14px", fontSize: 13, flexShrink: 0 }}>
          ← Volver
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-main)" }}>
            {nombre || telefonoLegible(telefono)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {telefonoLegible(telefono)} · {mensajes.length} {mensajes.length === 1 ? "mensaje" : "mensajes"}
          </div>
        </div>
        {/* Para seguir la conversacion a mano: abre WhatsApp con ese numero.
            En el ejemplo no se enseña: el telefono es inventado y abriria un
            chat con un numero que no existe. */}
        {ejemplo ? (
          <div style={{ background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", color: "#818cf8",
            borderRadius: 9, padding: "7px 12px", fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>
            Conversación de ejemplo
          </div>
        ) : (
          <button
            style={{ ...B("#25D366", "#fff"), fontSize: 12, padding: "8px 14px", flexShrink: 0 }}
            onClick={() => {
              const fallo = abrirWhatsApp(telefono, "");
              if (fallo) window.alert(fallo);
            }}>
            Escribirle por WhatsApp
          </button>
        )}
      </div>

      <div style={{ ...CD, background: "var(--surface-subtle)" }}>
        <div style={{ ...ST, marginBottom: 14 }}>Conversación</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mensajes.map((m) => (
            <div key={m.wa_message_id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ ...BURBUJA.base, ...BURBUJA.cliente }}>
                {m.texto || <em style={{ color: "var(--text-muted)" }}>Mandó algo que no es texto (audio, foto o ubicación)</em>}
                <span style={{ display: "block", textAlign: "right", fontSize: 9.5,
                  color: "var(--text-muted)", marginTop: 3 }}>
                  {fmtD(m.recibido_en)} {hora(m.recibido_en)}
                </span>
              </div>

              {m.respuesta && (
                <div style={{ ...BURBUJA.base, ...BURBUJA.nuestra }}>
                  {m.respuesta}
                  <span style={{ display: "block", textAlign: "right", fontSize: 9.5,
                    color: "var(--green-700, #4ade80)", marginTop: 3 }}>
                    respondido por el sistema
                  </span>
                </div>
              )}

              {/* Lo que hay que mirar: llego y no se le pudo contestar. */}
              {m.estado === "fallido" && (
                <div style={{ alignSelf: "flex-end", maxWidth: "78%", background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", borderRadius: 10,
                  padding: "8px 12px", fontSize: 11.5, lineHeight: 1.5 }}>
                  <strong>No se le pudo responder.</strong> Este cliente escribió y no recibió nada:
                  conviene llamarlo.
                  {m.error && (
                    <div style={{ marginTop: 4, fontSize: 10.5, color: "#fca5a5", fontFamily: "Consolas, monospace" }}>
                      {m.error}
                    </div>
                  )}
                </div>
              )}

              {m.estado === "recibido" && (
                <div style={{ alignSelf: "center", fontSize: 11, color: "#fbbf24" }}>
                  En cola, todavía sin responder.
                </div>
              )}

              {m.cotizacion_id && (
                <div style={{ alignSelf: "center", fontSize: 11, color: "var(--green-700, #4ade80)",
                  background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 8,
                  padding: "5px 10px" }}>
                  De aquí salió la cotización <strong>{m.cotizacion_id}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
