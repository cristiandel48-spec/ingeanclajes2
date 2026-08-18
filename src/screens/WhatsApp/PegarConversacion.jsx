import { useState } from "react";
import AvisoFlujo from "../../components/AvisoFlujo";
import { useAppData } from "../../context/AppDataContext";
import { B, SI } from "../../styles/tokens";
import { fmt } from "../../lib/format";
import { armarCotizacionDesdeTexto } from "../../lib/asistenteCotizacion";
import { agruparCatalogo } from "../../lib/catalogo";
import {
  leerConversacion, participantes, telefonoEnTexto, textoParaInterpretar,
} from "../../lib/conversacionWhatsApp";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

// Pegar una conversacion de WhatsApp y sacar de ahi la cotizacion.
//
// Sirve mientras el numero no este conectado a Meta -que es el tramite lento- y
// sigue sirviendo despues, para los chats que lleguen al celular personal de
// alguien o para los que ya existen y la API no entrega.
//
// El trato es el mismo de siempre: la IA propone y la persona decide. De aqui
// no sale ninguna cotizacion guardada; sale el formulario relleno.

export default function PegarConversacion({ onCerrar }) {
  const { catalogoItems, clientes, cotizaciones, setCotDraft, irAPantalla } = useAppData();
  const catalogo = agruparCatalogo(catalogoItems);

  const [pegado, setPegado] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [propuesta, setPropuesta] = useState(null);

  const mensajes = leerConversacion(pegado);
  const quienes = participantes(mensajes);

  const interpretar = async () => {
    setCargando(true);
    setError("");
    setPropuesta(null);
    try {
      // Se manda la conversacion ya limpia: sin horas ni avisos del sistema,
      // para que los numeros del reloj no se confundan con las cantidades.
      const armada = await armarCotizacionDesdeTexto(textoParaInterpretar(mensajes), catalogo);
      setPropuesta({
        ...armada,
        telefono: armada.telefono || telefonoEnTexto(pegado),
      });
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setCargando(false);
    }
  };

  // Si ya es cliente, se usa su ficha en vez de abrir otra.
  const yaRegistrado = propuesta?.cliente
    ? (clientes || []).find((c) =>
        normalizarRazonSocial(c.nombre) === normalizarRazonSocial(propuesta.cliente))
    : null;

  // Si de esta misma conversacion ya se hizo una cotizacion, conviene decirlo
  // antes de hacer otra.
  const yaCotizado = propuesta?.cliente
    ? (cotizaciones || []).filter((c) =>
        normalizarRazonSocial(c.cliente) === normalizarRazonSocial(propuesta.cliente)).length
    : 0;

  const subtotal = (propuesta?.items ?? []).reduce((suma, i) => suma + i.vu * i.cant, 0);

  const crear = () => {
    setCotDraft({
      cliente: propuesta.cliente,
      contacto: propuesta.contacto,
      ciudad: propuesta.ciudad,
      obra: propuesta.obra,
      telefono: propuesta.telefono,
      alcance: propuesta.alcance,
      items: propuesta.items,
      nit: yaRegistrado?.nit ?? "",
      contactoEmail: yaRegistrado?.email ?? "",
      direccion: yaRegistrado?.direccion ?? "",
    });
    irAPantalla("cotizacion");
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #25D366", borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>💬 Pegar una conversación</div>
        <button onClick={onCerrar} style={{ ...B("#f1f5f9", "#475569"), fontSize: 12, padding: "6px 12px" }}>Cerrar</button>
      </div>

      {!propuesta && (
        <AvisoFlujo tono="info" titulo="Copia el chat y pégalo aquí">
          En WhatsApp, abre la conversación → <strong>Exportar chat → Sin archivos adjuntos</strong>,
          y pega el texto. También sirve seleccionar los mensajes en WhatsApp Web y copiarlos.
          <div style={{ marginTop: 5 }}>
            Se quitan las horas y los avisos de WhatsApp antes de interpretar, para que la hora de
            un mensaje no acabe tomándose por una cantidad.
          </div>
        </AvisoFlujo>
      )}

      <textarea
        value={pegado}
        onChange={(e) => { setPegado(e.target.value); setPropuesta(null); }}
        rows={propuesta ? 4 : 9}
        placeholder={"12/8/26, 8:12 a. m. - María Gómez: Buenos días, necesito cotización\n12/8/26, 8:13 a. m. - María Gómez: Son 120 metros de línea de vida horizontal"}
        spellCheck={false}
        style={{ ...SI, resize: "vertical", marginBottom: 8, fontSize: 12.5, lineHeight: 1.5 }}
      />

      {pegado.trim() && (
        <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 10 }}>
          {mensajes.length} mensaje{mensajes.length === 1 ? "" : "s"}
          {quienes.length > 0 && ` · ${quienes.map((p) => p.quien).join(" y ")}`}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={interpretar} disabled={cargando || !mensajes.length}
          style={{ ...B("#25D366", "#fff"), opacity: cargando || !mensajes.length ? 0.6 : 1 }}>
          {cargando ? "Interpretando…" : "Interpretar la conversación"}
        </button>
        {pegado && !cargando && (
          <button onClick={() => { setPegado(""); setPropuesta(null); setError(""); }}
            style={{ ...B("#f1f5f9", "#475569"), fontSize: 12 }}>Borrar</button>
        )}
      </div>

      {error && (
        <div style={{ background: "#FEF3F2", border: "1px solid #FECDCA", color: "#B42318",
          borderRadius: 10, padding: "11px 14px", fontSize: 12.5, marginTop: 12, lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      {propuesta && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginTop: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a2e", marginBottom: 10 }}>
            Esto es lo que se entendió
          </div>

          {yaRegistrado && (
            <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 9,
              padding: "8px 11px", fontSize: 11.5, color: "#166534", marginBottom: 10, lineHeight: 1.5 }}>
              <strong>Ya es cliente</strong> ({yaRegistrado.id}). Se usará su ficha, con su NIT y su dirección.
              {yaCotizado > 0 && ` Tiene ${yaCotizado} cotización(es) anterior(es).`}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>
            {[
              ["Cliente", propuesta.cliente],
              ["Contacto", propuesta.contacto],
              ["Ciudad", propuesta.ciudad],
              ["Obra", propuesta.obra],
              ["Teléfono", propuesta.telefono],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 9.5, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 }}>{etiqueta}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: valor ? "#1a1a2e" : "#cbd5e1" }}>
                  {valor || "no se dijo"}
                </div>
              </div>
            ))}
          </div>

          {propuesta.items.length === 0 ? (
            <div style={{ background: "#FFFAF0", border: "1px solid #FDE3C4", color: "#B54708",
              borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
              No se reconoció ningún servicio del catálogo en la conversación. Puedes crear la
              cotización igual con los datos del cliente y agregar los ítems a mano.
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #f1f5f9", overflow: "hidden" }}>
              {propuesta.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10,
                  padding: "8px 12px", borderBottom: "1px solid #f8fafc", fontSize: 12 }}>
                  <span style={{ color: "#1a1a2e" }}>
                    {item.desc}
                    {item.textoOriginal && (
                      <span style={{ color: "#94a3b8", fontSize: 10.5, display: "block", marginTop: 2, fontStyle: "italic" }}>
                        de: «{item.textoOriginal}»
                      </span>
                    )}
                  </span>
                  <span style={{ color: "#64748b", whiteSpace: "nowrap" }}>
                    {item.cant} {item.unit} · {fmt(item.vu * item.cant)}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px",
                background: "#f1f5f9", fontSize: 12.5, fontWeight: 700 }}>
                <span style={{ color: "#64748b" }}>Subtotal</span>
                <span style={{ color: "#cc0000" }}>{fmt(subtotal)}</span>
              </div>
            </div>
          )}

          {propuesta.fuera?.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8,
              padding: "10px 12px", fontSize: 11.5, color: "#78350f", marginTop: 10, lineHeight: 1.55 }}>
              <strong>Pidió algo que no está en el catálogo:</strong>{" "}
              {propuesta.fuera.map((f) => `«${f.desc}»`).join(", ")}. No se le pone precio; si se
              cotiza, se agrega a mano.
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={crear} style={B("#4ade80", "#0f2d1a")}>Crear la cotización</button>
            <button onClick={() => setPropuesta(null)} style={{ ...B("#f1f5f9", "#475569"), fontSize: 12 }}>
              Descartar
            </button>
            <div style={{ fontSize: 10.5, color: "#94a3b8", flex: "1 1 200px", lineHeight: 1.5 }}>
              Se abre el formulario con todo esto puesto. <strong>Nada se guarda hasta que le des
              Guardar</strong> allí.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
