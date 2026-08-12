import { useMemo, useState } from "react";
import { CD, SI, ST } from "../styles/tokens";

// Quien hizo cada cotizacion y quien fue el ultimo en tocarla.
//
// El dato no lo pone esta pantalla ni ninguna otra: lo escribe un disparador
// de la base con el usuario de la sesion (migracion 030). Asi queda registrado
// venga el cambio de donde venga, y no se puede falsear desde el cliente.
//
// ALCANCE: solo el ultimo cambio. Si dos personas editan la misma cotizacion,
// aqui se ve la segunda; la primera no se guarda en ningun sitio.

const fechaHora = (valor) => {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export default function AuditoriaCotizaciones({ ctx }) {
  const { cotizaciones } = ctx;
  const [busqueda, setBusqueda] = useState("");
  const [verTodas, setVerTodas] = useState(false);

  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (cotizaciones || [])
      .filter((c) => {
        if (!texto) return true;
        return [c.numero, c.id, c.cliente, c.obra, c.creadoPorNombre, c.modificadoPorNombre]
          .some((v) => String(v || "").toLowerCase().includes(texto));
      })
      // La ultima tocada, primero: es lo que se suele venir a mirar.
      .sort((a, b) => String(b.modificadoEn || "").localeCompare(String(a.modificadoEn || "")));
  }, [cotizaciones, busqueda]);

  const visibles = verTodas ? filas : filas.slice(0, 15);

  // Las cotizaciones de antes de la migracion no tienen autor: nadie lo
  // estaba guardando y no hay de donde sacarlo.
  const sinRegistro = (cotizaciones || []).filter((c) => !c.creadoPorNombre && !c.modificadoPorNombre).length;

  return (
    <div style={{ ...CD, marginTop: 18 }}>
      <div style={ST}>Auditoría de cotizaciones</div>
      <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 12 }}>
        Quién creó cada cotización y quién fue el último en modificarla. Lo registra la base de
        datos con el usuario de la sesión, así que queda constancia venga el cambio de donde venga.
      </div>

      {sinRegistro > 0 && (
        <div style={{ fontSize: 11.5, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a",
          borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          Hay {sinRegistro} {sinRegistro === 1 ? "cotización anterior" : "cotizaciones anteriores"} sin
          autor registrado. No es un fallo: son de antes de que esto existiera y no hay de dónde sacarlo.
          Las que se creen o se editen a partir de ahora sí quedan registradas.
        </div>
      )}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por número, cliente, obra o persona…"
        style={{ ...SI, marginBottom: 12 }}
      />

      {!filas.length ? (
        <div style={{ fontSize: 12, color: "#64748b", padding: "10px 0" }}>
          {busqueda ? "Ninguna cotización coincide con esa búsqueda." : "Todavía no hay cotizaciones."}
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 720 }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Cotización</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Cliente</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>La creó</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Cuándo</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Último cambio</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Cuándo</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 ? "#fff" : "#fcfcfd", borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{c.numero || c.id}</td>
                    <td style={{ padding: "8px 10px", color: "#334155" }}>{c.cliente || "—"}</td>
                    <td style={{ padding: "8px 10px", color: c.creadoPorNombre ? "#334155" : "#94a3b8" }}>
                      {c.creadoPorNombre || "no registrado"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#64748b" }}>{fechaHora(c.creadoEn) || "—"}</td>
                    <td style={{ padding: "8px 10px", color: c.modificadoPorNombre ? "#334155" : "#94a3b8" }}>
                      {c.modificadoPorNombre || "no registrado"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#64748b" }}>{fechaHora(c.modificadoEn) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filas.length > 15 && (
            <button
              onClick={() => setVerTodas((v) => !v)}
              style={{ background: "none", border: "none", color: "#f47c20", cursor: "pointer",
                fontSize: 11.5, marginTop: 10, padding: 0 }}>
              {verTodas ? "Ver solo las últimas 15" : `Ver las ${filas.length} cotizaciones`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
