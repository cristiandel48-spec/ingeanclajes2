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
// Los tramos medidos en el plano entran como items separados -«Linea de vida
// horizontal 1», «2», «3»...-, y en el correo salian diez renglones seguidos
// del mismo servicio al mismo precio. Se juntan en uno solo con los metros
// sumados, que es lo que el cliente quiere leer. El desglose tramo por tramo
// sigue estando en el PDF adjunto, que es su sitio.
//
// Solo se juntan si coinciden el servicio, la unidad Y el precio: dos cosas
// distintas nunca se suman.
const sinNumeroFinal = (desc) => String(desc || "").replace(/\s+\d+\s*$/, "").trim();

function agruparItems(items) {
  const grupos = new Map();
  for (const item of items ?? []) {
    const desc = sinNumeroFinal(item.desc);
    const unit = item.unit || "und";
    const vu = Number(item.vu) || 0;
    const clave = `${desc.toLowerCase()}|${unit}|${vu}`;
    const previo = grupos.get(clave);
    const cant = Number(item.cant) || 0;
    if (previo) previo.cant += cant;
    else grupos.set(clave, { desc, unit, vu, cant });
  }
  return [...grupos.values()];
}

// 120.75 -> "120,75"; 4 -> "4". Sin decimales de relleno.
const cantidadLegible = (n) =>
  Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 });

function propuestaActiva(c) {
  const propuestas = getQuotePrintableProposals(c);
  return propuestas.find((p) => p.id === c?.propuestaActivaId) || propuestas[0] || null;
}

function detallePropuesta(c) {
  const activa = propuestaActiva(c);
  if (!activa?.items?.length) return [];

  const lineas = agruparItems(activa.items).map((item) => (
    `· ${cantidadLegible(item.cant)} ${item.unit} de ${comoFrase(item.desc)}` +
    ` — ${fmt(item.vu)} c/u — ${fmt(item.cant * item.vu)}`
  ));

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

// Las mismas cifras, pero sin convertir a texto: el correo las pinta en una
// tabla y necesita los números, no los renglones. El texto de arriba sigue
// yendo como alternativa en texto plano, para quien lea el correo sin formato.
function detalleParaCorreo(c) {
  const activa = propuestaActiva(c);
  if (!activa?.items?.length) return null;

  return {
    saludo: primerNombre(c?.contacto) ? `${primerNombre(c.contacto)}, buen día` : "Buen día",
    obra: comoNombre(c?.obra || ""),
    items: agruparItems(activa.items).map((i) => ({
      desc: comoFrase(i.desc), cant: i.cant, unit: i.unit, vu: i.vu,
    })),
    subtotal: activa.sub,
    utilidad: activa.ut,
    utilidadPct: activa.quote?.util ?? 10,
    iva: activa.iva,
    total: activa.tot,
    validez: c?.val || 30,
    tiempoEjec: c?.tiempoEjec ? comoFrase(c.tiempoEjec) : "",
    formaPago: c?.formaPago ? comoFrase(c.formaPago) : "",
  };
}

// El mensaje es editable, y el correo con formato lo arma la función a partir
// de las cifras: si alguien agrega una línea a mano -«el lunes paso por la
// obra»- se perdería. Se rescata comparando con lo que propuso el programa;
// lo que no reconoce, viaja aparte y sale destacado antes de la tabla.
function notaEscritaAMano(mensaje, original) {
  const propuestas = new Set(original.split("\n").map((l) => l.trim()).filter(Boolean));
  return mensaje
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !propuestas.has(l))
    .join("\n");
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
  const [mensajeOriginal] = useState(() => mensajePorDefecto(cotizacion));
  const [mensaje, setMensaje] = useState(mensajeOriginal);
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
        detalle: {
          ...(detalleParaCorreo(cotizacion) || {}),
          nota: notaEscritaAMano(mensaje, mensajeOriginal),
        },
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
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#101828" }}>
              Cotización enviada
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "#667085", lineHeight: 1.6 }}>
              Salió a <strong style={{ color: "#101828" }}>{para}</strong> con el PDF adjunto,
              desde el correo de la empresa.
            </p>
            <button onClick={onCerrar} style={{ ...B("#4ade80", "#0f2d1a"), width: "100%", justifyContent: "center" }}>
              Cerrar
            </button>
          </>
        ) : (
          <>
            <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#101828" }}>
              Enviar la cotización al cliente
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#667085", lineHeight: 1.5 }}>
              Revisa el mensaje. Sale desde el correo de la empresa con el PDF adjunto.
            </p>

            <div style={{ marginBottom: 12 }}>
              <LBL>Para</LBL>
              <input type="email" value={para} onChange={(e) => setPara(e.target.value)}
                placeholder="isabel@empresa.com" style={SI} />
              {!cotizacion?.contactoEmail && (
                <div style={{ fontSize: 10.5, color: "#b45309", marginTop: 4 }}>
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
                background: "#f0f6ff", border: "1px solid #bfd8ff", color: "#1e40af",
                borderRadius: 10, padding: "10px 12px", fontSize: 12.5, marginBottom: 12,
              }}>
                {estado}
              </div>
            )}

            {error && (
              <div style={{
                background: "#fef3f2", border: "1px solid #fecdca", color: "#b42318",
                borderRadius: 10, padding: "10px 12px", fontSize: 12.5, marginBottom: 12, lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={enviar} disabled={ocupado}
                style={{ ...B("#f47c20"), flex: 1, justifyContent: "center", opacity: ocupado ? .7 : 1 }}>
                {ocupado ? "Enviando…" : "Enviar al cliente"}
              </button>
              <button onClick={onCerrar} disabled={ocupado} style={B("#f1f5f9", "#475569")}>
                Cancelar
              </button>
            </div>

            <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 10, lineHeight: 1.5 }}>
              El PDF se arma en el momento y puede tardar unos segundos si la cotización trae fotos.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
