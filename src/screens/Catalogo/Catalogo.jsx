import { useState } from "react";
import AvisoFlujo from "../../components/AvisoFlujo";
import H1 from "../../components/ui/H1";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmt } from "../../lib/format";
import { filasDesdeSemilla, filasEditables } from "../../lib/catalogo";
import { esAdmin } from "../../lib/permisos";
import { siguienteIdUnico } from "../../lib/identificadores";
import { normalizarMayusculas } from "../../lib/normalizarEntrada";

// Los servicios que se cotizan y su precio.
//
// Antes vivian en el codigo (src/data/seed.js) y cambiar un precio obligaba a
// publicar una version del programa. Ahora estan en la base: se cambian aqui y
// los usan al instante el editor de cotizaciones, el dictado, el importador de
// documentos y la automatizacion de WhatsApp.
//
// SOLO EL ADMINISTRADOR EDITA. Un precio mal puesto se va derecho a una
// cotizacion y de ahi a un cliente; no es algo que deba poder cambiar quien
// entra a registrar el avance de una obra. Los demas lo consultan.

const UNIDADES = ["ML", "Und", "Metro", "Global", "Dia"];

export default function Catalogo({ ctx }) {
  const { catalogoItems, setCatalogoItems, membresia } = ctx;
  const puedeEditar = esAdmin(membresia);
  const filas = filasEditables(catalogoItems);
  const [nuevo, setNuevo] = useState(false);

  const cambiar = (id, campo, valor) =>
    setCatalogoItems((prev) => (prev || []).map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));

  const agregar = () => {
    const id = siguienteIdUnico(catalogoItems || [], "CAT");
    setCatalogoItems((prev) => [...(prev || []), {
      id, categoria: "Servicios", descripcion: "", unidad: "Und", precioBase: 0, disponible: true,
    }]);
    setNuevo(true);
  };

  // La primera vez, para no teclear los dieciocho servicios a mano.
  const sembrar = () => {
    if (!window.confirm(
      "Se van a cargar los servicios con los que venía el programa, con sus precios actuales.\n\n" +
      "Solo se agregan los que falten; no se toca nada de lo que ya esté aquí.\n\n¿Continuar?"
    )) return;
    setCatalogoItems((prev) => {
      const actuales = prev || [];
      const yaEstan = new Set(actuales.map((f) => String(f.descripcion || "").trim().toUpperCase()));
      const faltan = filasDesdeSemilla()
        .filter((f) => !yaEstan.has(f.descripcion.toUpperCase()))
        // Se renumeran para no chocar con los ids que ya existan.
        .map((f, i) => ({ ...f, id: `CAT-${String(actuales.length + i + 1).padStart(3, "0")}` }));
      return [...actuales, ...faltan];
    });
  };

  useAccionesPantalla(
    puedeEditar ? (
      <div style={{ display: "flex", gap: 7 }}>
        {filas.length === 0 && (
          <button style={{ ...B("#f1f5f9", "#475569"), fontSize: 12.5, padding: "8px 14px" }}
            onClick={sembrar}>Cargar los de siempre</button>
        )}
        <button style={{ ...B("#f47c20"), fontSize: 12.5, padding: "8px 16px", fontWeight: 700 }}
          onClick={agregar}>+ Nuevo servicio</button>
      </div>
    ) : null,
    [puedeEditar, filas.length]
  );

  const activos = filas.filter((f) => f.disponible !== false).length;

  return (
    <div style={{ padding: "14px 28px 28px" }}>
      <AvisoFlujo tono="info" titulo="De aquí salen todos los precios">
        Lo que se cambie aquí lo usan al instante el editor de cotizaciones, el dictado, la
        importación de documentos y las respuestas de WhatsApp. <strong>No hace falta publicar
        nada.</strong>
        <div style={{ marginTop: 5 }}>
          Las cotizaciones ya guardadas <strong>no cambian</strong>: cada una conserva el precio con
          el que se hizo. Un cambio aquí solo afecta a lo que se cotice de ahora en adelante.
        </div>
      </AvisoFlujo>

      {!puedeEditar && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10,
          padding: "10px 14px", fontSize: 12, color: "#475569", marginBottom: 14 }}>
          Puedes consultar los precios, pero solo un administrador los cambia.
        </div>
      )}

      {filas.length === 0 ? (
        <div style={{ ...CD, textAlign: "center", padding: 34 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>
            El catálogo todavía está vacío
          </div>
          <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>
            Mientras esté vacío se usan los servicios con los que venía el programa, así que nada
            deja de funcionar. {puedeEditar
              ? "Con «Cargar los de siempre» los traes aquí para poder editarlos."
              : "Un administrador puede cargarlos para poder editarlos."}
          </div>
        </div>
      ) : (
        <div style={CD}>
          <div style={{ ...ST, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span>Servicios y precios</span>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
              {activos} activo{activos === 1 ? "" : "s"} de {filas.length}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2.4fr .8fr 1.1fr .7fr",
            gap: 8, padding: "7px 10px", background: "#f8fafc", borderRadius: 8,
            fontSize: 9.5, fontWeight: 800, letterSpacing: .4, color: "#94a3b8", textTransform: "uppercase" }}>
            <span>Categoría</span><span>Servicio</span><span>Unidad</span><span>Precio</span><span>Activo</span>
          </div>

          {filas.map((fila) => (
            <div key={fila.id} style={{ display: "grid", gridTemplateColumns: "1.1fr 2.4fr .8fr 1.1fr .7fr",
              gap: 8, padding: "7px 10px", alignItems: "center", borderBottom: "1px solid #f8fafc",
              opacity: fila.disponible === false ? .55 : 1 }}>
              <input value={fila.categoria || ""} disabled={!puedeEditar}
                onChange={(e) => cambiar(fila.id, "categoria", e.target.value)}
                style={{ ...SI, fontSize: 11.5, padding: "5px 8px" }} />

              <input value={fila.descripcion || ""} disabled={!puedeEditar}
                onChange={(e) => cambiar(fila.id, "descripcion", e.target.value)}
                onBlur={(e) => cambiar(fila.id, "descripcion", normalizarMayusculas(e.target.value))}
                placeholder="Nombre del servicio, como sale impreso"
                style={{ ...SI, fontSize: 11.5, padding: "5px 8px", fontWeight: 600 }} />

              <select value={fila.unidad || "Und"} disabled={!puedeEditar}
                onChange={(e) => cambiar(fila.id, "unidad", e.target.value)}
                style={{ ...SI, fontSize: 11.5, padding: "5px 6px" }}>
                {[...new Set([...UNIDADES, fila.unidad].filter(Boolean))].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>

              <div>
                <input type="number" min="0" step="1000" value={fila.precioBase ?? 0}
                  disabled={!puedeEditar}
                  onChange={(e) => cambiar(fila.id, "precioBase", Number(e.target.value) || 0)}
                  style={{ ...SI, fontSize: 11.5, padding: "5px 8px", textAlign: "right",
                    fontVariantNumeric: "tabular-nums" }} />
                <div style={{ fontSize: 9.5, color: "#94a3b8", textAlign: "right", marginTop: 1 }}>
                  {fmt(Number(fila.precioBase) || 0)}
                </div>
              </div>

              {/* Un servicio que se deja de prestar se APAGA, no se borra: las
                  cotizaciones viejas siguen diciendo de donde salio su precio. */}
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569" }}>
                <input type="checkbox" checked={fila.disponible !== false} disabled={!puedeEditar}
                  onChange={(e) => cambiar(fila.id, "disponible", e.target.checked)} />
                {fila.disponible === false ? "No" : "Sí"}
              </label>
            </div>
          ))}

          {nuevo && (
            <div style={{ fontSize: 11.5, color: "#166534", background: "#ecfdf5",
              border: "1px solid #a7f3d0", borderRadius: 8, padding: "8px 11px", marginTop: 10 }}>
              Servicio agregado al final. Ponle nombre y precio; se guarda solo.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
