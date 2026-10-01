import { useEffect, useState } from "react";
import { consultarSecop } from "../../lib/secopRadar";
import { CD, ST, SI, B } from "../../styles/tokens";
import { siguienteIdUnico } from "../../lib/identificadores";

const TERMINOS_RAPIDOS = [
  { label: "🏗️ Cubiertas", query: "cubiertas" },
  { label: "🧗 Líneas de vida", query: "lineas de vida" },
  { label: "🏢 Mantenimiento cubiertas", query: "mantenimiento cubiertas" },
  { label: "⚠️ Trabajo en alturas", query: "alturas" },
  { label: "⚓ Puntos de anclaje", query: "puntos de anclaje" },
  { label: "🌧️ Impermeabilización", query: "impermeabilizacion" },
];

const DEPARTAMENTOS = [
  "Antioquia",
  "Distrito Capital de Bogotá",
  "Cundinamarca",
  "Valle del Cauca",
  "Santander",
  "Atlántico",
  "Caldas",
  "Risaralda",
  "Todos",
];

export default function RadarSecop({ clientes = [], setClientes, irAPantalla }) {
  const [query, setQuery] = useState("cubiertas");
  const [departamento, setDepartamento] = useState("Antioquia");
  const [limite, setLimite] = useState(20);
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [buscado, setBuscado] = useState(false);

  const ejecutarBusqueda = async (q = query, d = departamento) => {
    setCargando(true);
    setError(null);
    setBuscado(true);
    try {
      const data = await consultarSecop({
        query: q,
        departamento: d,
        limite,
      });
      setResultados(data);
    } catch (err) {
      setError(err?.message || "No se pudo conectar con el servidor de datos públicos.");
      setResultados([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    ejecutarBusqueda("cubiertas", "Antioquia");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clienteRegistrado = (entidad, nit) => {
    const eNorm = String(entidad || "").trim().toLowerCase();
    const nNorm = String(nit || "").replace(/\D/g, "");
    return clientes.some((c) => {
      const nomMatch = String(c.nombre || "").trim().toLowerCase() === eNorm;
      const nitMatch = nNorm && String(c.nit || "").replace(/\D/g, "") === nNorm;
      return nomMatch || nitMatch;
    });
  };

  const agregarComoProspecto = (item) => {
    if (clienteRegistrado(item.entidad, item.nit)) {
      window.alert(`«${item.entidad}» ya está en tu lista de clientes.`);
      return;
    }

    const id = siguienteIdUnico(clientes, "CLI");
    const nuevo = {
      id,
      nombre: item.entidad.toUpperCase(),
      nit: item.nit || "",
      telefono: "",
      ciudad: item.ciudad || item.departamento || "Medellín",
      direccion: `Sede principal - ${item.ciudad || item.departamento || ""}`,
      contacto: "Gerencia / Contratación",
      email: "",
      estado: "En seguimiento",
      notas: `Detectado en SECOP II. Proceso: ${item.objeto}. Presupuesto: ${item.valorTexto}. Enlace: ${item.urlSecop || "Ver SECOP"}`,
    };

    setClientes((prev) => [...prev, nuevo]);
    window.alert(`«${item.entidad}» quedó guardado como prospecto en tu lista de Clientes.`);
  };

  const cotizarDirecto = (item) => {
    if (!irAPantalla) return;
    irAPantalla("cotizacion", {
      cliente: item.entidad.toUpperCase(),
      nit: item.nit || "",
      ciudad: item.ciudad || item.departamento || "Medellín",
      obra: item.objeto.slice(0, 90),
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Panel de Filtros y Búsqueda */}
      <div style={CD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div>
            <div style={ST}>🛰️ Radar de Licitaciones y Obras del Estado (SECOP II)</div>
            <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginTop: 2 }}>
              Monitorea en tiempo real todas las convocatorias públicas de cubiertas, líneas de vida y obras del país desde la API de <strong>datos.gov.co</strong>.
            </div>
          </div>
        </div>

        {/* Términos rápidos */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {TERMINOS_RAPIDOS.map((t) => {
            const activo = query.toLowerCase() === t.query.toLowerCase();
            return (
              <button
                key={t.query}
                type="button"
                onClick={() => {
                  setQuery(t.query);
                  ejecutarBusqueda(t.query, departamento);
                }}
                style={{
                  background: activo ? "#FFFAEB" : "var(--surface-subtle, #f8fafc)",
                  color: activo ? "#B54708" : "var(--text-main, #334155)",
                  border: activo ? "1px solid #FCD34D" : "1px solid var(--border, #e2e8f0)",
                  borderRadius: 7,
                  fontSize: 11.5,
                  fontWeight: activo ? 700 : 500,
                  padding: "5px 11px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Formulario de búsqueda avanzada */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr auto auto", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #64748b)" }}>Palabra clave o concepto a buscar</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej. cubiertas, lineas de vida, alturas, anclajes..."
              style={{ ...SI, padding: "7px 10px", fontSize: 12.5 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") ejecutarBusqueda(query, departamento);
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #64748b)" }}>Departamento</label>
            <select
              value={departamento}
              onChange={(e) => {
                setDepartamento(e.target.value);
                ejecutarBusqueda(query, e.target.value);
              }}
              style={{ ...SI, padding: "7px 10px", fontSize: 12.5 }}
            >
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #64748b)" }}>Límite</label>
            <select
              value={limite}
              onChange={(e) => setLimite(Number(e.target.value))}
              style={{ ...SI, padding: "7px 10px", fontSize: 12.5, width: 80 }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <button
            type="button"
            disabled={cargando}
            onClick={() => ejecutarBusqueda(query, departamento)}
            style={{
              background: "#0f172a",
              color: "#fff",
              border: "1px solid #0f172a",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: cargando ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 38,
            }}
          >
            {cargando ? "Buscando…" : "🔍 Buscar en SECOP II"}
          </button>
        </div>
      </div>

      {/* Resultados de la búsqueda */}
      <div style={CD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main, #1e293b)" }}>
            Procesos encontrados {resultados.length > 0 && `(${resultados.length})`}
          </div>
          {departamento && departamento !== "Todos" && (
            <span style={{ fontSize: 11, color: "var(--text-muted, #64748b)" }}>
              Filtrado por: <strong>{departamento}</strong> · Término: <strong>«{query}»</strong>
            </span>
          )}
        </div>

        {cargando && (
          <div style={{ padding: "36px 20px", textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: 13 }}>
            Conectando con la base de datos de <strong>datos.gov.co</strong> y buscando licitaciones…
          </div>
        )}

        {error && !cargando && (
          <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 12 }}>
            <strong>Aviso:</strong> {error}
          </div>
        )}

        {!cargando && !error && buscado && resultados.length === 0 && (
          <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: 12.5 }}>
            No se encontraron procesos activos para <strong>«{query}»</strong> en <strong>{departamento}</strong>. Prueba seleccionando <em>Todos los departamentos</em> o usando otro término como <em>«alturas»</em> o <em>«cubiertas»</em>.
          </div>
        )}

        {!cargando && resultados.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {resultados.map((item) => {
              const registrado = clienteRegistrado(item.entidad, item.nit);

              return (
                <div
                  key={item.id}
                  style={{
                    background: "var(--surface-subtle, #f8fafc)",
                    border: "1px solid var(--border, #e2e8f0)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {/* Encabezado del proceso */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-main, #0f172a)" }}>
                          🏛️ {item.entidad}
                        </span>
                        {item.nit && (
                          <span style={{ fontSize: 10.5, color: "#64748b", background: "#e2e8f0", padding: "1px 6px", borderRadius: 4 }}>
                            NIT: {item.nit}
                          </span>
                        )}
                        <span style={{ fontSize: 10.5, color: "#166534", background: "#dcfce7", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                          📍 {item.ciudad ? `${item.ciudad}, ${item.departamento}` : item.departamento}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#b45309" }}>
                        {item.valorTexto}
                      </span>
                      <span style={{ fontSize: 10.5, color: "#475569", background: "#f1f5f9", padding: "2px 7px", borderRadius: 4 }}>
                        {item.estado}
                      </span>
                    </div>
                  </div>

                  {/* Descripción / Objeto del contrato */}
                  <div style={{ fontSize: 12, color: "var(--text-main, #334155)", lineHeight: 1.5 }}>
                    <strong>Objeto:</strong> {item.objeto}
                  </div>

                  {/* Barra inferior de acciones */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 10.5, color: "#94a3b8" }}>
                      Tipo: {item.tipoContrato}
                    </div>

                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {item.urlSecop && (
                        <a
                          href={item.urlSecop}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: "#fff",
                            color: "#475569",
                            border: "1px solid #cbd5e1",
                            borderRadius: 6,
                            padding: "4px 9px",
                            fontSize: 11,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          Ver en SECOP II ↗
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => cotizarDirecto(item)}
                        style={{
                          background: "#FFFAEB",
                          color: "#B54708",
                          border: "1px solid #FCD34D",
                          borderRadius: 6,
                          padding: "4px 9px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                        title="Crear una cotización en el sistema precargando los datos de esta entidad"
                      >
                        📄 Cotizar
                      </button>

                      {registrado ? (
                        <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, padding: "4px 8px" }}>
                          ✓ En tu lista
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => agregarComoProspecto(item)}
                          style={{
                            background: "#1e293b",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          title="Guardar esta entidad como prospecto en tu directorio de clientes"
                        >
                          ➕ Guardar prospecto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
