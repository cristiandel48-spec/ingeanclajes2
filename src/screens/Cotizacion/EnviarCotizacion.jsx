// Envío de la cotización al cliente por correo, desde la cuenta de la empresa.
//
// El correo NO sale solo: se muestra el destinatario, el asunto y el mensaje
// para revisarlos, y sale cuando la persona pulsa Enviar. Va a un cliente, con
// el precio de un trabajo: mandarlo por accidente sería un problema comercial.
import { useState } from "react";
import { blobABase64, generarCotizacionPdf } from "../../lib/cotizacionPdf";
import { enviarCotizacionPorCorreo } from "../../lib/backend/usuarios";
import { fmt } from "../../lib/format";
import { comoFrase, comoNombre, primerNombre } from "../../lib/texto";
import { asuntoSeguro } from "../../lib/asuntoCorreo";
import { getQuotePrintableProposals } from "../../lib/cotizaciones";
import LBL from "../../components/ui/LBL";
import { B, SI } from "../../styles/tokens";

// El nombre de la empresa va en el asunto: en la bandeja del cliente, un
// "Cotización C-26115" a secas no dice de quién viene y se pierde.
function asuntoPorDefecto(c) {
  const obra = comoNombre(c?.obra || c?.cliente || "");
  return asuntoSeguro(
    [`Cotizacion ${c?.numero || ""}`.trim(), "Ingeanclajes", obra].filter(Boolean).join(" - ")
  );
}

// Detalle de la propuesta activa: qué se cotiza, cuánto y a qué precio. Sin
// esto el correo solo daba un total, y el cliente tenía que abrir el adjunto
// para saber qué estaba comprando.
function detallePropuesta(c) {
  const propuestas = getQuotePrintableProposals(c);
  const activa = propuestas.find((p) => p.id === c?.propuestaActivaId) || propuestas[0];
  if (!activa?.items?.length) return [];

  const lineas = activa.items.map((item) => {
    const cant = Number(item.cant) || 0;
    const vu = Number(item.vu) || 0;
    return `· ${cant} ${item.unit || "und"} de ${comoFrase(item.desc)} — ${fmt(vu)} c/u — ${fmt(cant * vu)}`;
  });

  return [
    "Detalle de la propuesta:",
    ...lineas,
    "",
    `Subtotal: ${fmt(activa.sub)}`,
    `Utilidad (${activa.quote?.util ?? 10}%): ${fmt(activa.ut)}`,
    `IVA (19% sobre la utilidad): ${fmt(activa.iva)}`,
    `Valor total: ${fmt(activa.tot)}`,
  ];
}

function mensajePorDefecto(c) {
  const saludo = primerNombre(c?.contacto);
  const obra = comoNombre(c?.obra || "");
  const detalle = detallePropuesta(c);

  return [
    saludo ? `${saludo}, buen día.` : "Buen día.",
    "",
    `Adjunto encontrará la cotización ${c?.numero || ""} para ${obra || "su solicitud"}.`,
    "",
    ...(detalle.length ? [...detalle, ""] : []),
    `La propuesta tiene una validez de ${c?.val || 30} días.` +
      (c?.tiempoEjec ? ` El tiempo de ejecución estimado es de ${comoFrase(c.tiempoEjec)}.` : ""),
    ...(c?.formaPago ? ["", `Forma de pago: ${comoFrase(c.formaPago)}.`] : []),
    "",
    "Quedamos atentos a sus comentarios y a cualquier ajuste que necesite.",
    "",
    "Cordialmente,",
    "Ingeanclajes S.A.S.",
  ].join("\n");
}

export default function EnviarCotizacion({ cotizacion, firmaImg = "", onCerrar }) {
  const [para, setPara] = useState(cotizacion?.contactoEmail || "");
  const [asunto, setAsunto] = useState(asuntoPorDefecto(cotizacion));
  const [mensaje, setMensaje] = useState(mensajePorDefecto(cotizacion));
  const [estado, setEstado] = useState("");     // texto de avance
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async () => {
    if (!para.trim()) return setError("Escribe el correo del cliente.");
    setOcupado(true);
    setError("");
    try {
      setEstado("Preparando el documento…");
      const { blob, nombre } = await generarCotizacionPdf(cotizacion, {
        firmaImg,
        onProgreso: (hoja, total) => setEstado(`Generando el PDF · hoja ${hoja} de ${total}`),
      });

      setEstado("Enviando el correo…");
      await enviarCotizacionPorCorreo({
        para: para.trim(),
        // Se limpia otra vez al enviar, no solo al proponerlo: el campo es
        // editable y una tilde escrita a mano rompe las cabeceras del correo.
        asunto: asuntoSeguro(asunto),
        mensaje,
        pdfBase64: await blobABase64(blob),
        nombreArchivo: nombre,
        numero: cotizacion?.numero || "",
      });

      setEnviado(true);
    } catch (e) {
      setError(e.message || "No se pudo enviar el correo.");
    } finally {
      setOcupado(false);
      setEstado("");
    }
  };

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget && !ocupado) onCerrar(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200, background: "rgba(9,11,16,.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, padding: "24px 24px 22px",
        width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
        boxSizing: "border-box", boxShadow: "0 24px 60px -20px rgba(16,24,40,.3)",
      }}>
        {enviado ? (
          <>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#2b2622" }}>
              Cotización enviada
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "#756a5e", lineHeight: 1.6 }}>
              Salió a <strong style={{ color: "#2b2622" }}>{para}</strong> con el PDF adjunto,
              desde el correo de la empresa.
            </p>
            <button onClick={onCerrar} style={{ ...B("#2b2622", "#ffffff"), width: "100%", justifyContent: "center" }}>
              Cerrar
            </button>
          </>
        ) : (
          <>
            <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#2b2622" }}>
              Enviar la cotización al cliente
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#756a5e", lineHeight: 1.5 }}>
              Revisa el mensaje. Sale desde el correo de la empresa con el PDF adjunto.
            </p>

            <div style={{ marginBottom: 12 }}>
              <LBL>Para</LBL>
              <input type="email" value={para} onChange={(e) => setPara(e.target.value)}
                placeholder="isabel@empresa.com" style={SI} />
              {!cotizacion?.contactoEmail && (
                <div style={{ fontSize: 10.5, color: "#b54708", marginTop: 4 }}>
                  Esta cotización no tiene correo guardado. Escríbelo aquí y agrégalo también
                  en el formulario para la próxima.
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <LBL>Asunto</LBL>
              <input value={asunto} onChange={(e) => setAsunto(e.target.value)} style={SI} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <LBL>Mensaje</LBL>
              <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)}
                style={{ ...SI, minHeight: 190, resize: "vertical", lineHeight: 1.6 }} />
            </div>

            {estado && (
              <div style={{
                background: "#f0f6ff", border: "1px solid #bfd8ff", color: "#574e44",
                borderRadius: 10, padding: "10px 12px", fontSize: 12.5, marginBottom: 12,
              }}>
                {estado}
              </div>
            )}

            {error && (
              <div style={{
                background: "#f9e9e4", border: "1px solid #eec7bd", color: "#cc0000",
                borderRadius: 10, padding: "10px 12px", fontSize: 12.5, marginBottom: 12, lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={enviar} disabled={ocupado}
                style={{ ...B("#2b2622"), flex: 1, justifyContent: "center", opacity: ocupado ? .7 : 1 }}>
                {ocupado ? "Enviando…" : "Enviar al cliente"}
              </button>
              <button onClick={onCerrar} disabled={ocupado} style={B("#f4eee4", "#574e44")}>
                Cancelar
              </button>
            </div>

            <div style={{ fontSize: 10.5, color: "#a2988a", marginTop: 10, lineHeight: 1.5 }}>
              El PDF se arma en el momento y puede tardar unos segundos si la cotización trae fotos.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
