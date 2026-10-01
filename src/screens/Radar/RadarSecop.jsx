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

const ANIOS = [
  { id: "2026", label: "2026 (Año en curso)" },
  { id: "2025", label: "2025" },
  { id: "Todos", label: "Histórico completo" },
];

function formatearFecha(iso) {
  if (!iso) return "No informada";
  try {
    const partes = String(iso).split("T")[0].split("-");
    if (partes.length === 3) {
      const [yyyy, mm, dd] = partes;
      return `${dd}/${mm}/${yyyy}`;
    }
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso).slice(0, 10) : d.toLocaleDateString("es-CO");
  } catch {
    return String(iso).slice(0, 10);
  }
}

function tiempoTranscurrido(iso) {
  if (!iso) return "";
  try {
    const ahora = new Date();
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const diffDias = Math.floor((ahora - d) / (1000 * 60 * 60 * 24));
    if (diffDias <= 0) return "Hoy";
    if (diffDias === 1) return "Ayer";
    if (diffDias > 1 && diffDias < 30) return `hace ${diffDias} días`;
    if (diffDias >= 30 && diffDias < 365) return `hace ${Math.floor(diffDias / 30)} meses`;
    return "";
  } catch {
    return "";
  }
}

export default function RadarSecop({ clientes = [], setClientes, irAPantalla }) {
  const [query, setQuery] = useState("cubiertas");
  const [departamento, setDepartamento] = useState("Antioquia");
  const [anio, setAnio] = useState("2026");
  const [soloEnLicitacion, setSoloEnLicitacion] = useState(true);
  const [orden, setOrden] = useState("reciente");
  const [limite, setLimite] = useState(30);
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [buscado, setBuscado] = useState(false);

  const ejecutarBusqueda = async (
    q = query,
    d = departamento,
    a = anio,
    enLic = soloEnLicitacion
  ) => {
    setCargando(true);
    setError(null);
    setBuscado(true);
    try {
      const data = await consultarSecop({
        query: q,
        departamento: d,
        anio: a,
        soloEnLicitacion: enLic,
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
    ejecutarBusqueda("cubiertas", "Antioquia", "2026", true);
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
      notas: `Detectado en SECOP II (${formatearFecha(item.fechaPublicacion)}). Proceso: ${item.objeto}. Presupuesto: ${item.valorTexto}. Enlace: ${item.urlSecop || "Ver SECOP"}`,
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

  // Ordenamiento en memoria garantizado
  const resultadosOrdenados = [...resultados].sort((a, b) => {
    if (orden === "valor_desc") {
      return (b.valor || 0) - (a.valor || 0);
    }
    const msA = a.fechaPublicacion ? new Date(a.fechaPublicacion).getTime() : 0;
    const msB = b.fechaPublicacion ? new Date(b.fechaPublicacion).getTime() : 0;
    return msB - msA; // Más reciente primero
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Panel de Filtros y Búsqueda */}
      <div style={CD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #1e293b)" }}>
            Filtros y Búsqueda de Licitaciones
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted, #64748b)" }}>
            Conectado a la base de datos nacional de <strong>datos.gov.co</strong>
          </span>
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
                  ejecutarBusqueda(t.query, departamento, anio, soloEnLicitacion);
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

        {/* Formulario de filtros */}
        <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 1fr auto auto", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #64748b)" }}>Palabra clave o concepto</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej. cubiertas, lineas de vida, alturas, anclajes..."
              style={{ ...SI, padding: "7px 10px", fontSize: 12.5 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") ejecutarBusqueda(query, departamento, anio, soloEnLicitacion);
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #64748b)" }}>Departamento</label>
            <select
              value={departamento}
              onChange={(e) => {
                setDepartamento(e.target.value);
                ejecutarBusqueda(query, e.target.value, anio, soloEnLicitacion);
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
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #64748b)" }}>Vigencia / Año</label>
            <select
              value={anio}
              onChange={(e) => {
                setAnio(e.target.value);
                ejecutarBusqueda(query, departamento, e.target.value, soloEnLicitacion);
              }}
              style={{ ...SI, padding: "7px 10px", fontSize: 12.5 }}
            >
              {ANIOS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #64748b)" }}>Límite</label>
            <select
              value={limite}
              onChange={(e) => setLimite(Number(e.target.value))}
              style={{ ...SI, padding: "7px 10px", fontSize: 12.5, width: 75 }}
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>

          <button
            type="button"
            disabled={cargando}
            onClick={() => ejecutarBusqueda(query, departamento, anio, soloEnLicitacion)}
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
            {cargando ? "Buscando…" : "🔍 Buscar"}
          </button>
        </div>

        {/* Filtro rápido: Solo en licitación */}
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border, #f1f5f9)", display: "flex", alignItems: "center", gap: 16 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-main, #334155)" }}>
            <input
              type="checkbox"
              checked={soloEnLicitacion}
              onChange={(e) => {
                const val = e.target.checked;
                setSoloEnLicitacion(val);
                ejecutarBusqueda(query, departamento, anio, val);
              }}
              style={{ width: 16, height: 16, accentColor: "#16a34a", cursor: "pointer" }}
            />
            <span>🟢 Mostrar únicamente procesos <strong>en licitación / abiertos</strong> (sin adjudicar)</span>
          </label>
        </div>
      </div>

      {/* Resultados de la búsqueda */}
      <div style={CD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-main, #1e293b)" }}>
              Procesos encontrados {resultadosOrdenados.length > 0 && `(${resultadosOrdenados.length})`}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted, #64748b)", marginTop: 2 }}>
              {departamento && departamento !== "Todos" && (
                <span>Ubicación: <strong>{departamento}</strong> · </span>
              )}
              <span>Vigencia: <strong>{anio}</strong> · </span>
              <span>Búsqueda: <strong>«{query}»</strong></span>
            </div>
          </div>

          {/* Selector de Orden */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted, #475569)" }}>
              Ordenar por:
            </label>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              style={{
                ...SI,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                height: 32,
                background: "#f8fafc",
                borderColor: "#cbd5e1",
              }}
            >
              <option value="reciente">📅 Más recientes primero (Fecha)</option>
              <option value="valor_desc">💰 Mayor presupuesto</option>
            </select>
          </div>
        </div>

        {cargando && (
          <div style={{ padding: "36px 20px", textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: 13 }}>
            Conectando con la base de datos de <strong>datos.gov.co</strong> y buscando licitaciones activas…
          </div>
        )}

        {error && !cargando && (
          <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 12 }}>
            <strong>Aviso:</strong> {error}
          </div>
        )}

        {!cargando && !error && buscado && resultadosOrdenados.length === 0 && (
          <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: 12.5 }}>
            No se encontraron licitaciones activas para <strong>«{query}»</strong> en <strong>{departamento}</strong> ({anio}). Prueba con <em>Todos los departamentos</em> o términos como <em>«alturas»</em> o <em>«cubiertas»</em>.
          </div>
        )}

        {!cargando && resultadosOrdenados.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {resultadosOrdenados.map((item) => {
              const registrado = clienteRegistrado(item.entidad, item.nit);
              const transcurrido = tiempoTranscurrido(item.fechaPublicacion);

              return (
                <div
                  key={item.id}
                  style={{
                    background: "var(--surface-subtle, #f8fafc)",
                    border: "1px solid var(--border, #e2e8f0)",
                    borderRadius: 10,
                    padding: "14px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* Encabezado del proceso */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text-main, #0f172a)" }}>
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

                      {/* Fecha de publicación destacada con tiempo transcurrido */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: "#1d4ed8",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            padding: "3px 9px",
                            borderRadius: 6,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          📅 Publicado: {formatearFecha(item.fechaPublicacion)}
                          {transcurrido && (
                            <span style={{ color: "#2563eb", fontWeight: 600 }}>
                              · {transcurrido}
                            </span>
                          )}
                        </span>
                        {item.fechaUltima && item.fechaUltima !== item.fechaPublicacion && (
                          <span style={{ fontSize: 10.5, color: "#64748b" }}>
                            (Última act.: {formatearFecha(item.fechaUltima)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Presupuesto y Estado */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#b45309" }}>
                        {item.valorTexto}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: "#15803d",
                          background: "#dcfce7",
                          border: "1px solid #bbf7d0",
                          padding: "2px 8px",
                          borderRadius: 4,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        🟢 {item.fase || item.estado || "En licitación"}
                      </span>
                    </div>
                  </div>

                  {/* Descripción / Objeto de la licitación */}
                  <div style={{ fontSize: 12.5, color: "var(--text-main, #334155)", lineHeight: 1.55 }}>
                    <strong>Objeto:</strong> {item.objeto}
                  </div>

                  {/* Barra inferior de acciones y detalles */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 2,
                      paddingTop: 8,
                      borderTop: "1px solid #e2e8f0",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      <span>Modalidad: <strong>{item.modalidad || item.tipoContrato || "Convocatoria pública"}</strong></span>
                      {item.tipoContrato && item.modalidad && (
                        <span> · Tipo: <strong>{item.tipoContrato}</strong></span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {item.urlSecop && (
                        <a
                          href={item.urlSecop}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: "#fff",
                            color: "#334155",
                            border: "1px solid #cbd5e1",
                            borderRadius: 6,
                            padding: "5px 11px",
                            fontSize: 11.5,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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
                          padding: "5px 12px",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                        title="Crear una cotización en el sistema precargando los datos de esta entidad"
                      >
                        📄 Cotizar
                      </button>

                      {registrado ? (
                        <span style={{ fontSize: 11.5, color: "#16a34a", fontWeight: 700, padding: "5px 8px" }}>
                          ✓ En tu lista
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => agregarComoProspecto(item)}
                          style={{
                            background: "#0f172a",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "5px 12px",
                            fontSize: 11.5,
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
