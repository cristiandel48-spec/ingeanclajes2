import { useState } from "react";
import AvisoFlujo from "../../components/AvisoFlujo";
import BotonDictado from "../../components/ui/BotonDictado";
import LBL from "../../components/ui/LBL";
import { B, SI } from "../../styles/tokens";
import { armarCotizacionDesdeTexto } from "../../lib/asistenteCotizacion";
import { dictadoDisponible } from "../../hooks/useDictado";
import { fmt } from "../../lib/format";

// Panel para armar el borrador de una cotizacion hablando.
//
// Nada se aplica solo: la IA propone, se muestra lo que entendio y la persona
// decide. Es a proposito. Un modelo puede oir mal un nombre o una cantidad, y
// una cotizacion es un documento que se le manda a un cliente.
//
// Los precios NO los pone la IA: los items se cruzan contra el catalogo del
// sistema y de ahi salen el valor unitario y la unidad.

export default function DictarCotizacion({ onAplicar, onCerrar }) {
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [propuesta, setPropuesta] = useState(null);

  const interpretar = async () => {
    setCargando(true);
    setError("");
    setPropuesta(null);
    try {
      setPropuesta(await armarCotizacionDesdeTexto(texto));
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setCargando(false);
    }
  };

  const totalPropuesto = (propuesta?.items ?? []).reduce((suma, i) => suma + i.vu * i.cant, 0);

  return (
    <div style={{ background: "#fff", border: "1px solid #cc0000", borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#2b2622" }}>🎤 Armar cotización hablando</div>
        <button onClick={onCerrar} style={{ ...B("#f4eee4", "#574e44"), fontSize: 12, padding: "6px 12px" }}>Cerrar</button>
      </div>

      <AvisoFlujo tono="info" titulo="Di los datos como se los contarías a un compañero">
        Por ejemplo: <em>«Cotización para Constructora Vélez, en Medellín, contacto Isabel Céspedes.
        Son 120 metros de línea de vida horizontal en la cubierta y 4 puntos de anclaje epóxico»</em>.
        <div style={{ marginTop: 5 }}>
          Lo que se entienda se muestra abajo para que <strong>lo revises antes de aplicarlo</strong>.
          Si dices un precio («a 100 mil cada uno») se usa ese; si no dices nada, se toma el del
          catálogo. Los nombres propios y los números conviene verificarlos siempre: el dictado los
          equivoca con frecuencia.
        </div>
      </AvisoFlujo>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <LBL>Lo que quieres cotizar</LBL>
        {dictadoDisponible() && <BotonDictado valor={texto} onChange={setTexto} titulo="Dictar" />}
      </div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        placeholder="Toca el micrófono y habla, o escribe aquí directamente."
        spellCheck
        lang="es"
        style={{ ...SI, resize: "vertical", marginBottom: 10 }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={interpretar} disabled={cargando || !texto.trim()} style={{ ...B("#2b2622"), opacity: cargando || !texto.trim() ? 0.6 : 1 }}>
          {cargando ? "Interpretando…" : "Interpretar lo dictado"}
        </button>
        {texto && !cargando && (
          <button onClick={() => { setTexto(""); setPropuesta(null); setError(""); }} style={{ ...B("#f4eee4", "#574e44"), fontSize: 12 }}>
            Borrar y empezar de nuevo
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: "#f9e9e4", border: "1px solid #eec7bd", color: "#cc0000", borderRadius: 10, padding: "11px 14px", fontSize: 12.5, marginTop: 12, lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      {propuesta && (
        <div style={{ background: "#fbf8f3", border: "1px solid #e8dfd2", borderRadius: 12, padding: 16, marginTop: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#2b2622", marginBottom: 10 }}>Esto es lo que se entendió</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>
            {[
              ["Cliente", propuesta.cliente],
              ["Contacto", propuesta.contacto],
              ["Ciudad", propuesta.ciudad],
              ["Obra", propuesta.obra],
              ["Teléfono", propuesta.telefono],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", border: "1px solid #f4eee4" }}>
                <div style={{ fontSize: 9.5, color: "#a2988a", textTransform: "uppercase", marginBottom: 2 }}>{etiqueta}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: valor ? "#2b2622" : "#d9cdbb" }}>{valor || "no se dijo"}</div>
              </div>
            ))}
          </div>

          {propuesta.alcance && (
            <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #f4eee4", marginBottom: 12 }}>
              <div style={{ fontSize: 9.5, color: "#a2988a", textTransform: "uppercase", marginBottom: 3 }}>Descripción propuesta</div>
              <div style={{ fontSize: 12, color: "#574e44", lineHeight: 1.55 }}>{propuesta.alcance}</div>
            </div>
          )}

          <div style={{ fontSize: 11, color: "#756a5e", marginBottom: 6 }}>
            Servicios reconocidos ({propuesta.items.length}) · si dictaste un precio manda ese;
            si no, el del catálogo
          </div>
          {propuesta.items.length === 0 ? (
            <div style={{ background: "#f4eee4", border: "1px solid #e8dfd2", color: "#B54708", borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
              No se reconoció ningún servicio del catálogo. Puedes aplicar los datos del cliente y
              agregar los ítems a mano.
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #f4eee4", overflow: "hidden" }}>
              {propuesta.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 12px", borderBottom: i < propuesta.items.length - 1 ? "1px solid #fbf8f3" : "none", fontSize: 12 }}>
                  <span style={{ color: "#2b2622" }}>
                    {item.desc}
                    {/* Se avisa cuando el precio no es el de siempre: un valor
                        dictado por error se veria igual que uno correcto. */}
                    {item.precioDictado && (
                      <span style={{ color: "#B54708", fontSize: 10.5, display: "block", marginTop: 2 }}>
                        precio dictado {fmt(item.vu)} · en catálogo {fmt(item.vuCatalogo)}
                      </span>
                    )}
                  </span>
                  <span style={{ color: "#756a5e", whiteSpace: "nowrap" }}>{item.cant} {item.unit} · {fmt(item.vu * item.cant)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", background: "#f4eee4", fontSize: 12.5, fontWeight: 700 }}>
                <span style={{ color: "#756a5e" }}>Subtotal estimado</span>
                <span style={{ color: "#cc0000" }}>{fmt(totalPropuesto)}</span>
              </div>
            </div>
          )}

          {propuesta.avisos.length > 0 && (
            <div style={{ background: "#f4eee4", border: "1px solid #e8dfd2", borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: "#B54708", marginTop: 10, lineHeight: 1.55 }}>
              <strong>Revisa esto:</strong>
              <ul style={{ margin: "5px 0 0", paddingLeft: 16 }}>
                {propuesta.avisos.map((aviso, i) => <li key={i}>{aviso}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={() => onAplicar(propuesta)} style={B("#2b2622", "#ffffff")}>
              Aplicar a la cotización
            </button>
            <button onClick={() => setPropuesta(null)} style={{ ...B("#f4eee4", "#574e44"), fontSize: 12 }}>
              Descartar
            </button>
            <div style={{ fontSize: 10.5, color: "#a2988a", alignSelf: "center", flex: "1 1 200px" }}>
              Al aplicar solo se rellenan los campos vacíos y se agregan los ítems. Nada se envía al cliente.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
