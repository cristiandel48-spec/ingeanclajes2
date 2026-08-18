import { useRef, useState } from "react";
import AvisoFlujo from "../../components/AvisoFlujo";
import { B, SI } from "../../styles/tokens";
import { armarCotizacionDesdeTexto } from "../../lib/asistenteCotizacion";
import { agruparCatalogo } from "../../lib/catalogo";
import { useAppData } from "../../context/AppDataContext";
import { TIPOS_ACEPTADOS, datosSueltos, leerTextoDeArchivo, marcarFragmentos } from "../../lib/leerDocumento";
import { fmt } from "../../lib/format";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

// Arma una cotizacion a partir del documento que manda el cliente.
//
// Es el mismo trato que con el dictado: la IA propone y la persona decide. La
// diferencia es de donde sale el texto -de un PDF en vez de la voz- y que aqui
// se ve el documento al lado, para poder comparar renglon por renglon.
//
// Lo que NO hace, a proposito:
//   - No guarda nada. Rellena el formulario y ya; guardar sigue siendo manual.
//   - No pone precios del documento. Salen del catalogo, como en el dictado.
//   - No inventa datos que no estaban: lo que falte se queda vacio.

const COLORES = {
  cliente: "#fef08a",   // datos de quien escribe
  item: "#bbf7d0",      // lo que si esta en el catalogo
  fuera: "#fed7aa",     // lo que pidio y no se maneja
};

export default function ImportarCotizacion({ onAplicar, onCerrar, clientes = [] }) {
  const { catalogoItems } = useAppData();
  const catalogo = agruparCatalogo(catalogoItems);
  const entrada = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [texto, setTexto] = useState("");
  const [paso, setPaso] = useState("");        // leyendo | interpretando
  const [error, setError] = useState("");
  const [propuesta, setPropuesta] = useState(null);
  const [sueltos, setSueltos] = useState({ nit: "", correo: "" });
  // Las cantidades se editan aqui antes de aplicar: es lo unico que de verdad
  // se puede leer mal, y corregirlo despues en la tabla es mas trabajoso.
  const [cantidades, setCantidades] = useState({});

  const limpiar = () => {
    setArchivo(null); setTexto(""); setError("");
    setPropuesta(null); setSueltos({ nit: "", correo: "" }); setCantidades({});
  };

  const procesar = async (file) => {
    limpiar();
    setArchivo(file);
    setError("");
    try {
      setPaso("leyendo");
      const { texto: leido } = await leerTextoDeArchivo(file);
      setTexto(leido);
      setSueltos(datosSueltos(leido));

      setPaso("interpretando");
      const armada = await armarCotizacionDesdeTexto(leido, catalogo);
      setPropuesta(armada);
      setCantidades(Object.fromEntries(armada.items.map((item, i) => [i, item.cant])));
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setPaso("");
    }
  };

  const alEscoger = (e) => {
    const file = e.target.files?.[0];
    // Se limpia para poder volver a escoger el mismo archivo despues.
    e.target.value = "";
    if (file) procesar(file);
  };

  const itemsFinales = (propuesta?.items ?? []).map((item, i) => ({
    ...item,
    cant: Number(cantidades[i]) > 0 ? Number(cantidades[i]) : item.cant,
  }));
  const subtotal = itemsFinales.reduce((suma, item) => suma + item.vu * item.cant, 0);

  // Si el cliente ya tiene ficha se usa esa, en vez de abrir una repetida.
  const yaRegistrado = propuesta?.cliente
    ? (clientes || []).find((c) =>
        normalizarRazonSocial(c.nombre) === normalizarRazonSocial(propuesta.cliente))
    : null;

  const partes = propuesta
    ? marcarFragmentos(texto, [
        { texto: propuesta.cliente, clase: "cliente" },
        { texto: propuesta.contacto, clase: "cliente" },
        { texto: sueltos.nit, clase: "cliente" },
        { texto: sueltos.correo, clase: "cliente" },
        ...propuesta.items.map((item) => ({ texto: item.textoOriginal, clase: "item" })),
        ...propuesta.fuera.map((item) => ({ texto: item.desc, clase: "fuera" })),
      ])
    : [];

  const aplicar = () => {
    // Si el cliente ya tiene ficha, lo que el documento no traiga se completa
    // con lo que hay guardado. La direccion sobre todo: casi nunca viene en la
    // solicitud y es la que viaja al certificado.
    onAplicar({
      ...propuesta,
      items: itemsFinales,
      nit: sueltos.nit || yaRegistrado?.nit || "",
      contactoEmail: sueltos.correo || yaRegistrado?.email || "",
      telefono: propuesta.telefono || yaRegistrado?.telefono || "",
      ciudad: propuesta.ciudad || yaRegistrado?.ciudad || "",
      direccion: yaRegistrado?.direccion || "",
    });
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #f47c20", borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>📄 Importar cotización con IA</div>
        <button onClick={onCerrar} style={{ ...B("#f1f5f9", "#475569"), fontSize: 12, padding: "6px 12px" }}>Cerrar</button>
      </div>

      {!propuesta && (
        <AvisoFlujo tono="info" titulo="Sube la solicitud que te mandó el cliente">
          Sirve el PDF que llega por correo o un archivo de texto. <strong>Se lee el texto que trae
          el archivo dentro</strong>, así que los números salen exactos y no cuesta nada.
          <div style={{ marginTop: 5 }}>
            Las fotos y los PDF escaneados todavía no: esos no tienen letras sino imagen, y
            necesitan otro modelo. Si el cliente te lo puede mandar en PDF, mejor.
          </div>
        </AvisoFlujo>
      )}

      <input ref={entrada} type="file" accept={TIPOS_ACEPTADOS} onChange={alEscoger} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => entrada.current?.click()} disabled={!!paso}
          style={{ ...B("#f47c20"), opacity: paso ? 0.6 : 1 }}>
          {archivo ? "Escoger otro archivo" : "Escoger archivo…"}
        </button>
        {archivo && (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {archivo.name}
            {texto && <span style={{ color: "#166534", fontWeight: 600 }}> · texto leído del archivo</span>}
          </span>
        )}
        {paso && (
          <span style={{ fontSize: 12, color: "#b45309", fontWeight: 600 }}>
            {paso === "leyendo" ? "Abriendo el documento…" : "Interpretando lo que pide…"}
          </span>
        )}
      </div>

      {error && (
        <div style={{ background: "#FEF3F2", border: "1px solid #FECDCA", color: "#B42318", borderRadius: 10, padding: "11px 14px", fontSize: 12.5, marginTop: 12, lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      {propuesta && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 14, marginTop: 14 }}>

          {/* ---------- el documento ---------- */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "9px 13px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>Lo que dice el documento</span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>resaltado = lo que se usó</span>
            </div>
            <div style={{ padding: "12px 14px", fontFamily: "Consolas, monospace", fontSize: 11, lineHeight: 1.7, color: "#334155", whiteSpace: "pre-wrap", maxHeight: 460, overflow: "auto" }}>
              {partes.map((parte, i) => (
                <span key={i} style={parte.clase
                  ? { background: COLORES[parte.clase], borderRadius: 2, padding: "1px 2px", color: "#0f172a" }
                  : undefined}>{parte.texto}</span>
              ))}
            </div>
          </div>

          {/* ---------- lo interpretado ---------- */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "9px 13px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>Lo que va a quedar en la cotización</span>
            </div>

            <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
              {yaRegistrado && (
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 9, padding: "8px 11px", fontSize: 11.5, color: "#166534", marginBottom: 10, lineHeight: 1.5 }}>
                  <strong>Este cliente ya está registrado</strong> como {yaRegistrado.id}. Se usará esa
                  ficha en vez de crear otra.
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Empresa", propuesta.cliente],
                  ["NIT", sueltos.nit],
                  ["Contacto", propuesta.contacto],
                  ["Teléfono", propuesta.telefono],
                  ["Ciudad", propuesta.ciudad],
                  ["Obra", propuesta.obra],
                  ["Correo", sueltos.correo],
                ].map(([etiqueta, valor]) => (
                  <div key={etiqueta}>
                    <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .3 }}>{etiqueta}</div>
                    <div style={{ fontSize: 11.5, fontWeight: valor ? 600 : 400, color: valor ? "#1a1a2e" : "#cbd5e1", fontStyle: valor ? "normal" : "italic", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 7px", marginTop: 2, background: "#fcfcfd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {valor || "no venía en el documento"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, fontWeight: 800, marginBottom: 8 }}>
                Ítems reconocidos ({itemsFinales.length})
              </div>
              {itemsFinales.length === 0 ? (
                <div style={{ background: "#FFFAF0", border: "1px solid #FDE3C4", color: "#B54708", borderRadius: 8, padding: "10px 12px", fontSize: 11.5 }}>
                  No se reconoció ningún servicio del catálogo. Puedes aplicar igual los datos del
                  cliente y agregar los ítems a mano.
                </div>
              ) : itemsFinales.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: i < itemsFinales.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {item.textoOriginal && (
                      <div style={{ fontSize: 10.5, color: "#94a3b8", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis" }}>
                        «{item.textoOriginal}»
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#166534" }}>{item.desc}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <input type="number" min="0" step="any" value={cantidades[i] ?? item.cant}
                      onChange={(e) => setCantidades((prev) => ({ ...prev, [i]: e.target.value }))}
                      title="Revisa esta cantidad"
                      style={{ ...SI, width: 68, padding: "3px 6px", fontSize: 12, fontWeight: 800, textAlign: "center", border: "1.5px solid #f59e0b", background: "#fffbeb" }} />
                    <span style={{ fontSize: 10.5, color: "#64748b", width: 42 }}>{item.unit}</span>
                    <span style={{ fontSize: 11.5, color: "#1a1a2e", fontWeight: 600, width: 92, textAlign: "right", whiteSpace: "nowrap" }}>
                      {fmt(item.vu * item.cant)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {propuesta.fuera.length > 0 && (
              <div style={{ margin: "12px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: "10px 13px" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
                  ⚠ Esto no está en tu catálogo, queda por fuera
                </div>
                {propuesta.fuera.map((item, i) => (
                  <div key={i} style={{ fontSize: 11.5, color: "#78350f", lineHeight: 1.55 }}>«{item.desc}»</div>
                ))}
                <div style={{ fontSize: 10.5, color: "#92400e", marginTop: 4 }}>
                  No se le pone precio ni entra en el total. Si lo vas a cotizar, agrégalo a mano.
                </div>
              </div>
            )}

            <div style={{ padding: "10px 14px", background: "#fafbfc", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800 }}>
              <span style={{ color: "#64748b" }}>Subtotal</span>
              <span style={{ color: "#cc0000" }}>{fmt(subtotal)}</span>
            </div>

            <div style={{ padding: "12px 14px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={aplicar} style={B("#4ade80", "#0f2d1a")}>Usar estos datos</button>
              <button onClick={limpiar} style={{ ...B("#f1f5f9", "#475569"), fontSize: 12 }}>Descartar</button>
              <div style={{ fontSize: 10.5, color: "#b45309", flex: "1 1 200px", lineHeight: 1.5 }}>
                <strong>Revisa las cantidades</strong> antes de aplicar. Al aplicar solo se rellenan
                los campos vacíos y se agregan los ítems; nada se guarda todavía.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
