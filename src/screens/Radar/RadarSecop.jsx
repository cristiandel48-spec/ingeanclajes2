import { useEffect, useState } from "react";
import { consultarSecop, consultarDocumentosProceso } from "../../lib/secopRadar";
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

const INSTANCIAS = [
  { id: "licitacion", label: "🟢 En licitación (Ofertas abiertas)", desc: "Abiertas para presentar propuestas" },
  { id: "todas", label: "🌐 Todas las instancias (Sin filtro)", desc: "Muestra todo el universo contractual" },
  { id: "borrador", label: "📝 Pre-pliegos (Observaciones / Borrador)", desc: "Fase previa de pliegos borradores" },
  { id: "evaluacion", label: "🔍 En evaluación de ofertas", desc: "Propuestas radicadas en revisión técnica" },
  { id: "adjudicado", label: "🏆 Adjudicados (Con contratista)", desc: "Procesos finalizados con ganador" },
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

export default function RadarSecop({ clientes = [], setClientes, irAPantalla, setCotDraft }) {
  const [query, setQuery] = useState("cubiertas");
  const [departamento, setDepartamento] = useState("Antioquia");
  const [anio, setAnio] = useState("2026");
  const [instancia, setInstancia] = useState("licitacion");
  const [orden, setOrden] = useState("reciente");
  const [limite, setLimite] = useState(30);
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [buscado, setBuscado] = useState(false);

  // Estados para modal de documentos y pliegos oficiales
  const [procesoSeleccionadoDocs, setProcesoSeleccionadoDocs] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [cargandoDocs, setCargandoDocs] = useState(false);

  const ejecutarBusqueda = async (
    q = query,
    d = departamento,
    a = anio,
    inst = instancia
  ) => {
    setCargando(true);
    setError(null);
    setBuscado(true);
    try {
      const data = await consultarSecop({
        query: q,
        departamento: d,
        anio: a,
        instancia: inst,
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
    ejecutarBusqueda("cubiertas", "Antioquia", "2026", "licitacion");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirDocumentos = async (item) => {
    setProcesoSeleccionadoDocs(item);
    setDocumentos([]);
    setCargandoDocs(true);
    try {
      const docs = await consultarDocumentosProceso(item.portafolio);
      setDocumentos(docs);
    } catch (e) {
      console.warn("Aviso cargando documentos del proceso:", e);
      setDocumentos([]);
    } finally {
      setCargandoDocs(false);
    }
  };

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
    // 1. Guardar como prospecto en clientes si no existe aún
    if (!clienteRegistrado(item.entidad, item.nit)) {
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
    }

    // 2. Pre-cargar el borrador de cotización en el contexto
    if (setCotDraft) {
      setCotDraft({
        cliente: item.entidad.toUpperCase(),
        nit: item.nit || "",
        ciudad: item.ciudad || item.departamento || "Medellín",
        obra: item.objeto ? item.objeto.slice(0, 120) : "Licitación SECOP II",
        direccion: item.ciudad ? `${item.ciudad}, ${item.departamento}` : (item.departamento || ""),
        alcance: `Proceso SECOP II: ${item.objeto}\nPresupuesto referencial: ${item.valorTexto}\nEnlace: ${item.urlSecop || "Ver SECOP"}`,
        items: [],
      });
    }

    // 3. Navegar directamente al módulo de Cotizaciones
    if (irAPantalla) {
      irAPantalla("cotizacion");
    }
  };

  // Ordenamiento en memoria garantizado
  const resultadosOrdenados = [...resultados].sort((a, b) => {
    if (orden === "valor_desc") {
      return (b.valor || b.valorAdjudicado || 0) - (a.valor || a.valorAdjudicado || 0);
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
            Filtros y Búsqueda de Procesos SECOP II
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted, #64748b)" }}>
            Conectado a la base de datos nacional oficial de <strong>datos.gov.co</strong>
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
                  ejecutarBusqueda(t.query, departamento, anio, instancia);
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
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.1fr 0.9fr 1.4fr auto auto", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #64748b)" }}>Palabra clave o concepto</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej. cubiertas, lineas de vida, alturas, anclajes..."
              style={{ ...SI, padding: "7px 10px", fontSize: 12.5 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") ejecutarBusqueda(query, departamento, anio, instancia);
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #64748b)" }}>Departamento</label>
            <select
              value={departamento}
              onChange={(e) => {
                setDepartamento(e.target.value);
                ejecutarBusqueda(query, e.target.value, anio, instancia);
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
                ejecutarBusqueda(query, departamento, e.target.value, instancia);
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

          {/* Selector de Instancia / Fase del Proceso */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>Instancia / Fase del proceso</label>
            <select
              value={instancia}
              onChange={(e) => {
                const val = e.target.value;
                setInstancia(val);
                ejecutarBusqueda(query, departamento, anio, val);
              }}
              style={{
                ...SI,
                padding: "7px 10px",
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: instancia === "licitacion" ? "#f0fdf4" : instancia === "adjudicado" ? "#fffbeb" : "#ffffff",
                borderColor: instancia === "licitacion" ? "#86efac" : instancia === "adjudicado" ? "#fde68a" : "#cbd5e1",
              }}
            >
              {INSTANCIAS.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #64748b)" }}>Límite</label>
            <select
              value={limite}
              onChange={(e) => setLimite(Number(e.target.value))}
              style={{ ...SI, padding: "7px 10px", fontSize: 12.5, width: 70 }}
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>

          <button
            type="button"
            disabled={cargando}
            onClick={() => ejecutarBusqueda(query, departamento, anio, instancia)}
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
              <span>Instancia: <strong>{INSTANCIAS.find((i) => i.id === instancia)?.label || instancia}</strong> · </span>
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
            Conectando con la base de datos de <strong>datos.gov.co</strong> y consultando procesos…
          </div>
        )}

        {error && !cargando && (
          <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 12 }}>
            <strong>Aviso:</strong> {error}
          </div>
        )}

        {!cargando && !error && buscado && resultadosOrdenados.length === 0 && (
          <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: 12.5 }}>
            No se encontraron procesos para <strong>«{query}»</strong> en <strong>{departamento}</strong> ({anio}) en la instancia seleccionada. Prueba cambiando a <em>«Todas las instancias»</em> o <em>Todos los departamentos</em>.
          </div>
        )}

        {!cargando && resultadosOrdenados.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {resultadosOrdenados.map((item) => {
              const registrado = clienteRegistrado(item.entidad, item.nit);
              const transcurrido = tiempoTranscurrido(item.fechaPublicacion);
              const esAdjudicado = item.adjudicado === "Sí" || item.estadoProc === "Adjudicado" || Boolean(item.proveedorAdjudicado);

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
                        {item.referencia && item.referencia !== "Sin referencia" && (
                          <span style={{ fontSize: 10.5, color: "#1e40af", background: "#dbeafe", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                            Ref: {item.referencia}
                          </span>
                        )}
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
                        {item.duracionTexto && (
                          <span style={{ fontSize: 11, color: "#475569", background: "#f1f5f9", padding: "3px 8px", borderRadius: 6 }}>
                            ⏱️ Plazo: <strong>{item.duracionTexto}</strong>
                          </span>
                        )}
                        {item.respuestasOfertas > 0 && (
                          <span style={{ fontSize: 11, color: "#0369a1", background: "#e0f2fe", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>
                            👥 {item.respuestasOfertas} oferta(s) radicada(s)
                          </span>
                        )}
                        {item.fechaUltima && item.fechaUltima !== item.fechaPublicacion && (
                          <span style={{ fontSize: 10.5, color: "#64748b" }}>
                            (Última act.: {formatearFecha(item.fechaUltima)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Presupuesto y Estado */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: esAdjudicado ? "#065f46" : "#b45309" }}>
                        {item.valorTexto}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: esAdjudicado ? "#854d0e" : "#15803d",
                          background: esAdjudicado ? "#fef9c3" : "#dcfce7",
                          border: `1px solid ${esAdjudicado ? "#fef08a" : "#bbf7d0"}`,
                          padding: "2px 8px",
                          borderRadius: 4,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {esAdjudicado ? "🏆" : "🟢"} {item.fase || item.estado || "En licitación"}
                      </span>
                    </div>
                  </div>

                  {/* Detalle si fue adjudicado a un contratista */}
                  {esAdjudicado && item.proveedorAdjudicado && (
                    <div
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#fefce8",
                        border: "1px solid #fef08a",
                        borderRadius: 6,
                        fontSize: 11.5,
                        color: "#713f12",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      <div>
                        🏆 <strong>Contratista adjudicado:</strong> {item.proveedorAdjudicado}
                        {item.nitProveedorAdjudicado && <span> (NIT: {item.nitProveedorAdjudicado})</span>}
                      </div>
                      {item.valorAdjudicadoTexto && (
                        <div>
                          <strong>Valor contratado:</strong> {item.valorAdjudicadoTexto}
                        </div>
                      )}
                    </div>
                  )}

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

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {/* BOTÓN PARA VER Y DESCARGAR DOCUMENTOS / PLIEGOS */}
                      <button
                        type="button"
                        onClick={() => abrirDocumentos(item)}
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          borderRadius: 6,
                          padding: "5px 12px",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        }}
                        title="Ver y descargar pliegos, estudios previos, formatos y anexos técnicos oficiales"
                      >
                        📁 Ver Documentos y Pliegos
                      </button>

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
                          Expediente SECOP II ↗
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

      {/* MODAL DE DOCUMENTOS Y PLIEGOS OFICIALES DEL PROCESO */}
      {procesoSeleccionadoDocs && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setProcesoSeleccionadoDocs(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 750,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado del Modal */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "2px 8px", borderRadius: 4 }}>
                    📁 Documentos y Pliegos Oficiales
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
                    Ref: {procesoSeleccionadoDocs.referencia}
                  </span>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a" }}>
                  {procesoSeleccionadoDocs.entidad}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#64748b",
                    marginTop: 3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: 1.4,
                  }}
                >
                  {procesoSeleccionadoDocs.objeto}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProcesoSeleccionadoDocs(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 22,
                  lineHeight: 1,
                  cursor: "pointer",
                  color: "#64748b",
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Contenido / Lista de Documentos */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {cargandoDocs ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                  Consultando documentos y anexos oficiales en el repositorio de SECOP II…
                </div>
              ) : documentos.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: 10, border: "1px dashed #cbd5e1" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📑</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
                    Documentos disponibles en el expediente de SECOP II
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", maxWidth: 500, margin: "0 auto 16px", lineHeight: 1.5 }}>
                    Los pliegos de condiciones, estudios previos y formatos de propuesta están cargados en la sala digital oficial del proceso. Puedes abrirlos y descargarlos directamente:
                  </p>
                  {procesoSeleccionadoDocs.urlSecop && (
                    <a
                      href={procesoSeleccionadoDocs.urlSecop}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...B("#0f172a"),
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "9px 18px",
                        fontSize: 12.5,
                        textDecoration: "none",
                        borderRadius: 8,
                      }}
                    >
                      Abrir carpeta de documentos en SECOP II ↗
                    </a>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                      {documentos.length} archivo(s) oficial(es) registrado(s):
                    </span>
                    {procesoSeleccionadoDocs.urlSecop && (
                      <a
                        href={procesoSeleccionadoDocs.urlSecop}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11.5, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
                      >
                        Ver expediente completo en SECOP II ↗
                      </a>
                    )}
                  </div>

                  {documentos.map((doc) => {
                    const esPdf = doc.extension === "pdf";
                    const esExcel = ["xlsx", "xls", "csv"].includes(doc.extension);
                    const esWord = ["docx", "doc"].includes(doc.extension);
                    const icono = esPdf ? "📕" : esExcel ? "📊" : esWord ? "📘" : "🗂️";

                    return (
                      <div
                        key={doc.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
                          <span style={{ fontSize: 22 }}>{icono}</span>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>
                              {doc.nombre}
                            </div>
                            <div style={{ fontSize: 10.5, color: "#64748b", display: "flex", gap: 8, marginTop: 2 }}>
                              <span>Tipo: <strong>.{doc.extension.toUpperCase()}</strong></span>
                              {doc.tamanoTexto && <span>· Tamaño: <strong>{doc.tamanoTexto}</strong></span>}
                              {doc.fechaCarga && <span>· Fecha: {formatearFecha(doc.fechaCarga)}</span>}
                            </div>
                          </div>
                        </div>

                        <a
                          href={doc.urlDescarga}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: "#0284c7",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 11.5,
                            fontWeight: 700,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                          }}
                        >
                          ⬇️ Descargar / Ver
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pie del Modal */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "#64748b" }}>
                Documentos oficiales provistos por la Agencia Nacional de Contratación Pública (Colombia Compra Eficiente)
              </span>
              <button
                type="button"
                onClick={() => setProcesoSeleccionadoDocs(null)}
                style={{
                  ...B("transparent"),
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  padding: "6px 14px",
                  fontSize: 12,
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
