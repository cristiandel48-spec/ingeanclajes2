import { useState, useEffect, useRef, useMemo } from "react";
import H1 from "../../components/ui/H1";
import { BRAND, B, CD, SI } from "../../styles/tokens";
import {
  cargarTickets,
  cargarMensajes,
  enviarMensaje,
  cambiarEstadoTicket,
  crearTicket,
  suscribirChatTicket,
} from "../../lib/soporte";

const ESTADOS = {
  todos: "Todos",
  pendiente: "Pendientes",
  en_curso: "En curso",
  resuelto: "Resueltos",
};

const BADGES = {
  pendiente: { bg: "#FEF0C7", text: "#B54708", border: "#FEDF89", label: "Pendiente" },
  en_curso: { bg: "#EFF8FF", text: "#175CD3", border: "#B2DDFF", label: "En curso" },
  resuelto: { bg: "#ECFDF3", text: "#027A48", border: "#A6F4C5", label: "Resuelto" },
};

function formatFechaRelativa(isoString) {
  if (!isoString) return "";
  try {
    const fecha = new Date(isoString);
    const ahora = new Date();
    const diffMs = ahora - fecha;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Justo ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    if (diffDias === 1) return "Ayer";
    if (diffDias < 7) return `Hace ${diffDias} d`;
    return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

export default function Soporte({ ctx }) {
  const { membresia, obras = [] } = ctx || {};
  const [tickets, setTickets] = useState([]);
  const [ticketActivoId, setTicketActivoId] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);

  // Formulario nuevo ticket
  const [nuevoAsunto, setNuevoAsunto] = useState("");
  const [nuevoObra, setNuevoObra] = useState("");
  const [nuevoPrioridad, setNuevoPrioridad] = useState("media");
  const [nuevoMsgInicial, setNuevoMsgInicial] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");

  const chatEndRef = useRef(null);

  // Cargar tickets al montar
  useEffect(() => {
    let montado = true;
    async function load() {
      setCargando(true);
      const data = await cargarTickets();
      if (montado) {
        setTickets(data);
        if (data.length > 0 && !ticketActivoId) {
          setTicketActivoId(data[0].id);
        }
        setCargando(false);
      }
    }
    load();
    return () => {
      montado = false;
    };
  }, []);

  // Cargar mensajes cuando cambia el ticket activo
  useEffect(() => {
    if (!ticketActivoId) {
      setMensajes([]);
      return;
    }
    let montado = true;
    async function loadMsg() {
      const data = await cargarMensajes(ticketActivoId);
      if (montado) {
        setMensajes(data);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
    loadMsg();

    const desuscribir = suscribirChatTicket(ticketActivoId, (nuevo) => {
      if (montado) {
        setMensajes((prev) => {
          if (prev.some((m) => m.id === nuevo.id)) return prev;
          return [...prev, nuevo];
        });
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    });

    return () => {
      montado = false;
      desuscribir();
    };
  }, [ticketActivoId]);

  const ticketActivo = useMemo(() => {
    return tickets.find((t) => t.id === ticketActivoId) || null;
  }, [tickets, ticketActivoId]);

  // Filtrado de tickets
  const ticketsFiltrados = useMemo(() => {
    return tickets.filter((t) => {
      const matchEstado = filtroEstado === "todos" || t.estado === filtroEstado;
      const q = busqueda.toLowerCase().trim();
      const matchBusqueda =
        !q ||
        (t.asunto || "").toLowerCase().includes(q) ||
        (t.usuario_nombre || "").toLowerCase().includes(q) ||
        (t.obra_nombre || "").toLowerCase().includes(q) ||
        String(t.numero || "").includes(q);
      return matchEstado && matchBusqueda;
    });
  }, [tickets, filtroEstado, busqueda]);

  // Contadores
  const stats = useMemo(() => {
    return {
      total: tickets.length,
      pendiente: tickets.filter((t) => t.estado === "pendiente").length,
      en_curso: tickets.filter((t) => t.estado === "en_curso").length,
      resuelto: tickets.filter((t) => t.estado === "resuelto").length,
    };
  }, [tickets]);

  // Enviar mensaje en el chat
  const handleEnviarMensaje = async (e) => {
    e?.preventDefault();
    const texto = nuevoMensaje.trim();
    if (!texto || !ticketActivoId || enviando) return;

    setEnviando(true);
    const remitenteNombre = membresia?.nombre || "Ingeanclajes Soporte";
    const esAdmin = true;

    try {
      const guardado = await enviarMensaje({
        ticketId: ticketActivoId,
        texto,
        remitenteNombre,
        remitenteId: membresia?.user_id || null,
        esAdmin,
      });

      setMensajes((prev) => [...prev, guardado]);
      setNuevoMensaje("");

      // Actualizar la lista de tickets localmente
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketActivoId
            ? {
                ...t,
                ultimo_mensaje: texto,
                actualizado_en: new Date().toISOString(),
                estado: t.estado === "pendiente" ? "en_curso" : t.estado,
              }
            : t
        )
      );

      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    } finally {
      setEnviando(false);
    }
  };

  // Cambiar estado de un ticket
  const handleCambiarEstado = async (nuevoEstado) => {
    if (!ticketActivoId) return;
    await cambiarEstadoTicket(ticketActivoId, nuevoEstado);
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketActivoId
          ? { ...t, estado: nuevoEstado, actualizado_en: new Date().toISOString() }
          : t
      )
    );
  };

  // Crear nuevo ticket desde el modal
  const handleCrearNuevoTicket = async (e) => {
    e.preventDefault();
    if (!nuevoAsunto.trim()) return;

    const creador = nuevoNombre.trim() || membresia?.nombre || "Usuario";
    const res = await crearTicket({
      asunto: nuevoAsunto.trim(),
      obraNombre: nuevoObra.trim(),
      prioridad: nuevoPrioridad,
      usuarioNombre: creador,
      usuarioEmail: membresia?.email || "",
      usuarioId: membresia?.user_id || null,
      mensajeInicial: nuevoMsgInicial.trim(),
    });

    setTickets((prev) => [res, ...prev]);
    setTicketActivoId(res.id);
    setModalNuevoOpen(false);
    setNuevoAsunto("");
    setNuevoObra("");
    setNuevoMsgInicial("");
    setNuevoNombre("");
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Encabezado */}
      <H1
        title="Soporte e Incidencias"
        subtitle="Atención de problemas técnicos de obra, dudas de cotización y consultas en tiempo real"
        action={
          <button
            onClick={() => setModalNuevoOpen(true)}
            style={B("#E0342A")}
          >
            <span>+</span> Nueva incidencia
          </button>
        }
      />

      {/* Tarjetas de Resumen */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div style={{ ...CD, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted, #667085)", fontWeight: 600 }}>TOTAL TICKETS</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-main, #101828)", marginTop: 4 }}>
            {stats.total}
          </div>
        </div>
        <div style={{ ...CD, padding: "14px 18px", borderLeft: "4px solid #F79009" }}>
          <div style={{ fontSize: 12, color: "#B54708", fontWeight: 600 }}>PENDIENTES</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#B54708", marginTop: 4 }}>
            {stats.pendiente}
          </div>
        </div>
        <div style={{ ...CD, padding: "14px 18px", borderLeft: "4px solid #175CD3" }}>
          <div style={{ fontSize: 12, color: "#175CD3", fontWeight: 600 }}>EN CURSO</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#175CD3", marginTop: 4 }}>
            {stats.en_curso}
          </div>
        </div>
        <div style={{ ...CD, padding: "14px 18px", borderLeft: "4px solid #12B76A" }}>
          <div style={{ fontSize: 12, color: "#027A48", fontWeight: 600 }}>RESUELTOS</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#027A48", marginTop: 4 }}>
            {stats.resuelto}
          </div>
        </div>
      </div>

      {/* Layout Principal: 2 Columnas (Bandeja y Chat) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 380px) 1fr",
          gap: 16,
          height: "calc(100vh - 270px)",
          minHeight: 520,
        }}
      >
        {/* Columna Izquierda: Lista de Tickets */}
        <div
          style={{
            ...CD,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Barra de Filtro y Búsqueda */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border, #eaecf0)" }}>
            <input
              type="text"
              placeholder="🔍 Buscar por cliente, asunto, obra..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ ...SI, padding: "8px 12px", fontSize: 13 }}
            />

            {/* Pestañas de estado */}
            <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto" }}>
              {Object.entries(ESTADOS).map(([key, label]) => {
                const activo = filtroEstado === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFiltroEstado(key)}
                    style={{
                      border: "none",
                      background: activo ? "var(--accent-bg, #E0342A)" : "var(--surface-subtle, #f2f4f7)",
                      color: activo ? "#fff" : "var(--text-muted, #667085)",
                      borderRadius: 8,
                      padding: "5px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista scrolleable */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {cargando ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted, #667085)", fontSize: 13 }}>
                Cargando incidencias…
              </div>
            ) : ticketsFiltrados.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted, #667085)", fontSize: 13 }}>
                No se encontraron tickets con los filtros aplicados.
              </div>
            ) : (
              ticketsFiltrados.map((ticket) => {
                const activo = ticket.id === ticketActivoId;
                const badge = BADGES[ticket.estado] || BADGES.pendiente;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setTicketActivoId(ticket.id)}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--border, #eaecf0)",
                      cursor: "pointer",
                      backgroundColor: activo
                        ? "var(--surface-active, rgba(224, 52, 42, 0.06))"
                        : "transparent",
                      borderLeft: activo ? "4px solid #E0342A" : "4px solid transparent",
                      transition: "background-color 0.12s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #101828)" }}>
                        {ticket.usuario_nombre}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted, #667085)" }}>
                        {formatFechaRelativa(ticket.actualizado_en || ticket.creado_en)}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "var(--text-main, #101828)",
                        marginBottom: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ticket.asunto}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted, #667085)",
                        marginBottom: 8,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ticket.ultimo_mensaje || "Sin mensajes"}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted, #667085)",
                          backgroundColor: "var(--surface-subtle, #f2f4f7)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        #{ticket.numero} {ticket.obra_nombre ? `· ${ticket.obra_nombre}` : ""}
                      </span>

                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          padding: "2px 7px",
                          borderRadius: 6,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Hilo de Chat */}
        <div
          style={{
            ...CD,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {ticketActivo ? (
            <>
              {/* Cabecera del Chat */}
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--border, #eaecf0)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  backgroundColor: "var(--surface, #ffffff)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "var(--text-main, #101828)" }}>
                      {ticketActivo.asunto}
                    </h3>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: (BADGES[ticketActivo.estado] || BADGES.pendiente).bg,
                        color: (BADGES[ticketActivo.estado] || BADGES.pendiente).text,
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {(BADGES[ticketActivo.estado] || BADGES.pendiente).label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted, #667085)", marginTop: 2 }}>
                    Cliente: <strong>{ticketActivo.usuario_nombre}</strong>
                    {ticketActivo.obra_nombre && ` · Obra: ${ticketActivo.obra_nombre}`}
                    {ticketActivo.usuario_email && ` · ${ticketActivo.usuario_email}`}
                  </div>
                </div>

                {/* Acciones de estado */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {ticketActivo.estado === "resuelto" ? (
                    <button
                      onClick={() => handleCambiarEstado("en_curso")}
                      style={{
                        border: "1px solid var(--border, #eaecf0)",
                        background: "transparent",
                        color: "var(--text-main, #101828)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ↺ Reabrir incidencia
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCambiarEstado("resuelto")}
                      style={{
                        border: "1px solid #12B76A",
                        background: "rgba(18, 183, 106, 0.1)",
                        color: "#027A48",
                        borderRadius: 8,
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ✓ Marcar como resuelto
                    </button>
                  )}
                </div>
              </div>

              {/* Mensajes */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  backgroundColor: "var(--bg-app, #f9fafb)",
                }}
              >
                {mensajes.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-muted, #667085)", margin: "auto", fontSize: 13 }}>
                    No hay mensajes en esta conversación aún. Escribe abajo para responder.
                  </div>
                ) : (
                  mensajes.map((msg) => {
                    const esPropio = msg.es_admin;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: esPropio ? "flex-end" : "flex-start",
                          width: "100%",
                        }}
                      >
                        <div style={{ maxWidth: "75%" }}>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted, #667085)",
                              marginBottom: 4,
                              textAlign: esPropio ? "right" : "left",
                              fontWeight: 600,
                            }}
                          >
                            {msg.remitente_nombre} {esPropio ? "(Administrador)" : ""} · {formatFechaRelativa(msg.creado_en)}
                          </div>
                          <div
                            style={{
                              padding: "12px 16px",
                              borderRadius: 14,
                              borderTopRightRadius: esPropio ? 2 : 14,
                              borderTopLeftRadius: esPropio ? 14 : 2,
                              backgroundColor: esPropio ? "#E0342A" : "var(--surface, #ffffff)",
                              color: esPropio ? "#ffffff" : "var(--text-main, #101828)",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                              fontSize: 13.5,
                              lineHeight: 1.5,
                              border: esPropio ? "none" : "1px solid var(--border, #eaecf0)",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {msg.texto}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Caja de entrada de texto */}
              <form
                onSubmit={handleEnviarMensaje}
                style={{
                  padding: "14px 18px",
                  borderTop: "1px solid var(--border, #eaecf0)",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  backgroundColor: "var(--surface, #ffffff)",
                }}
              >
                <input
                  type="text"
                  placeholder="Escribe una respuesta para el usuario..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  disabled={enviando}
                  style={{ ...SI, flex: 1, padding: "10px 14px" }}
                />
                <button
                  type="submit"
                  disabled={enviando || !nuevoMensaje.trim()}
                  style={{
                    ...B("#E0342A"),
                    opacity: enviando || !nuevoMensaje.trim() ? 0.6 : 1,
                    cursor: enviando || !nuevoMensaje.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {enviando ? "Enviando…" : "Enviar ➤"}
                </button>
              </form>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                flexDirection: "column",
                color: "var(--text-muted, #667085)",
                padding: 40,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 38, marginBottom: 12 }}>💬</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-main, #101828)" }}>
                Selecciona una incidencia para ver los mensajes
              </h3>
              <p style={{ fontSize: 13, maxWidth: 360, marginTop: 6 }}>
                Podrás responder las inquietudes de los residentes de obra, clientes o colaboradores directamente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Incidencia */}
      {modalNuevoOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(16, 24, 40, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              ...CD,
              maxWidth: 520,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 24px -4px rgba(16, 24, 40, 0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-main, #101828)" }}>
                Registrar Nueva Incidencia
              </h3>
              <button
                onClick={() => setModalNuevoOpen(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted, #667085)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearNuevoTicket} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-main, #101828)" }}>
                  Asunto o Problema *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Fallo en pernos de anclaje fachada norte"
                  value={nuevoAsunto}
                  onChange={(e) => setNuevoAsunto(e.target.value)}
                  style={SI}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-main, #101828)" }}>
                    Nombre del Reportante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Ing. Roberto Gómez"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    style={SI}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-main, #101828)" }}>
                    Obra Relacionada (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Torre Norte / OB-001"
                    value={nuevoObra}
                    onChange={(e) => setNuevoObra(e.target.value)}
                    style={SI}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-main, #101828)" }}>
                  Prioridad
                </label>
                <select
                  value={nuevoPrioridad}
                  onChange={(e) => setNuevoPrioridad(e.target.value)}
                  style={SI}
                >
                  <option value="baja">Baja - Consulta general</option>
                  <option value="media">Media - Inconveniente no bloqueante</option>
                  <option value="alta">Alta - Afecta el avance de obra</option>
                  <option value="urgente">Urgente - Bloqueo crítico o riesgo</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-main, #101828)" }}>
                  Descripción detallada del problema
                </label>
                <textarea
                  rows={3}
                  placeholder="Explica qué ocurrió, medidas tomadas o dudas específicas..."
                  value={nuevoMsgInicial}
                  onChange={(e) => setNuevoMsgInicial(e.target.value)}
                  style={{ ...SI, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setModalNuevoOpen(false)}
                  style={{
                    border: "1px solid var(--border, #eaecf0)",
                    background: "transparent",
                    borderRadius: 10,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-muted, #667085)",
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" style={B("#E0342A")}>
                  Crear Incidencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
