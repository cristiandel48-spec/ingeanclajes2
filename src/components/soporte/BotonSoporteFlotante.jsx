import { useState, useEffect, useRef, useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import {
  cargarTickets,
  cargarMensajes,
  enviarMensaje,
  crearTicket,
  suscribirChatTicket,
} from "../../lib/soporte";
import { listarUsuarios } from "../../lib/backend/usuarios";
import { SI, B } from "../../styles/tokens";

export default function BotonSoporteFlotante() {
  const ctx = useAppData();
  const { membresia, scr, setScr } = ctx || {};
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState("lista"); // 'lista' | 'chat' | 'nuevo'
  const [tickets, setTickets] = useState([]);
  const [ticketActivoId, setTicketActivoId] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoTexto, setNuevoTexto] = useState("");

  const [usuariosDisponibles, setUsuariosDisponibles] = useState([]);
  const [destinatario, setDestinatario] = useState("camila");
  const [nombreDestinatario, setNombreDestinatario] = useState("Camila Sepúlveda");
  const [asunto, setAsunto] = useState("");
  const [obra, setObra] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);

  const chatEndRef = useRef(null);

  // Si el usuario ya está en la pantalla completa de soporte, no mostramos el botón flotante
  const enPantallaSoporte = scr === "soporte";

  // Cargar usuarios del equipo para resolver IDs reales
  useEffect(() => {
    listarUsuarios().then((u) => {
      if (u && u.length > 0) setUsuariosDisponibles(u);
    }).catch(() => {});
  }, []);

  const opcionesDestinatarios = useMemo(() => {
    const list = [];
    const ids = new Set();

    (usuariosDisponibles || []).forEach((u) => {
      const nom = u.nombre || u.email;
      const idReal = u.user_id || u.id;
      if (nom && idReal) {
        list.push({
          id: idReal,
          nombre: nom,
          email: u.email || "",
          rol: u.role || "Equipo Ingeanclajes",
        });
        ids.add(nom.toLowerCase());
        if (u.email) ids.add(u.email.toLowerCase());
      }
    });

    const defaults = [
      { id: "camila", nombre: "Camila Sepúlveda", email: "camilasepulveda@ingeanclajes.com", rol: "Administración / Finanzas" },
      { id: "cristian", nombre: "Cristian Flórez", email: "cristiandel48@gmail.com", rol: "Administrador / Desarrollo" },
    ];

    defaults.forEach((def) => {
      if (!ids.has(def.nombre.toLowerCase()) && !ids.has(def.email.toLowerCase())) {
        list.push(def);
        ids.add(def.nombre.toLowerCase());
      }
    });

    return list;
  }, [usuariosDisponibles]);

  // Asignar el destinatario por defecto al usuario de Camila (con su UUID si existe)
  useEffect(() => {
    if (opcionesDestinatarios.length > 0 && (!destinatario || destinatario === "camila")) {
      const def = opcionesDestinatarios.find(
        (u) =>
          u.nombre?.toLowerCase().includes("camila") ||
          (u.email && u.email.toLowerCase().includes("camila")) ||
          u.id === "camila"
      ) || opcionesDestinatarios[0];

      if (def) {
        setDestinatario(def.id);
        setNombreDestinatario(def.nombre);
      }
    }
  }, [opcionesDestinatarios]);

  useEffect(() => {
    if (abierto) {
      cargarTickets().then((data) => setTickets(data));
    }
  }, [abierto]);

  // Cargar mensajes y escuchar cambios Realtime
  useEffect(() => {
    if (!ticketActivoId) return;
    let montado = true;
    cargarMensajes(ticketActivoId).then((data) => {
      if (montado) {
        setMensajes(data);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
      }
    });

    const desuscribir = suscribirChatTicket(ticketActivoId, (nuevo) => {
      if (montado) {
        setMensajes((prev) => {
          if (prev.some((m) => m.id === nuevo.id)) return prev;
          return [...prev, nuevo];
        });
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
      }
    });

    return () => {
      montado = false;
      desuscribir();
    };
  }, [ticketActivoId]);

  // Polling periódico de mensajes cada 3.5s si el chat está abierto
  useEffect(() => {
    if (!abierto || !ticketActivoId || vista !== "chat") return;

    const interval = setInterval(async () => {
      try {
        const data = await cargarMensajes(ticketActivoId);
        if (data && data.length > 0) {
          setMensajes((prev) => {
            const idsPrev = new Set(prev.map((m) => m.id));
            const nuevos = data.filter((m) => !idsPrev.has(m.id));
            if (nuevos.length === 0) return prev;
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
            return [...prev, ...nuevos].sort(
              (a, b) => new Date(a.creado_en) - new Date(b.creado_en)
            );
          });
        }
      } catch {
        // polling silencioso
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [abierto, ticketActivoId, vista]);

  // Polling periódico de tickets cada 8s mientras el widget esté abierto
  useEffect(() => {
    if (!abierto) return;

    const interval = setInterval(async () => {
      try {
        const data = await cargarTickets();
        if (data && data.length > 0) {
          setTickets(data);
        }
      } catch {
        // polling silencioso
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [abierto]);

  const ticketActivo = tickets.find((t) => t.id === ticketActivoId);

  const handleEnviarChat = async (e) => {
    e?.preventDefault();
    const texto = nuevoTexto.trim();
    if (!texto || !ticketActivoId || enviando) return;

    setEnviando(true);
    try {
      const remitente = membresia?.nombre || "Cristian Flórez";
      const esAdmin = membresia?.role === "admin";
      const guardado = await enviarMensaje({
        ticketId: ticketActivoId,
        texto,
        remitenteNombre: remitente,
        remitenteId: membresia?.user_id || null,
        esAdmin,
      });

      if (guardado.ticket_id && guardado.ticket_id !== ticketActivoId) {
        setTicketActivoId(guardado.ticket_id);
      }

      setMensajes((prev) => {
        if (prev.some((m) => m.id === guardado.id)) return prev;
        return [...prev, guardado];
      });
      setNuevoTexto("");

      // Actualizar estado del ticket en la lista
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketActivoId || (guardado.ticket_id && t.id === guardado.ticket_id)
            ? {
                ...t,
                id: guardado.ticket_id || t.id,
                ultimo_mensaje: texto,
                actualizado_en: new Date().toISOString(),
                estado: t.estado === "pendiente" ? "en_curso" : t.estado,
              }
            : t
        )
      );

      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch (err) {
      console.error("Error enviando en widget flotante:", err);
    } finally {
      setEnviando(false);
    }
  };

  const handleCrearTicket = async (e) => {
    e.preventDefault();
    if (!asunto.trim() || enviando) return;

    setEnviando(true);
    try {
      const targetUser = opcionesDestinatarios.find((u) => String(u.id) === String(destinatario));
      const res = await crearTicket({
        asunto: asunto.trim(),
        obraNombre: obra.trim(),
        usuarioNombre: nombreDestinatario || targetUser?.nombre || "Usuario",
        usuarioEmail: targetUser?.email || (destinatario === "camila" ? "camilasepulveda@ingeanclajes.com" : ""),
        usuarioId: destinatario,
        mensajeInicial: detalle.trim(),
      });

      if (res) {
        setTickets((prev) => [res, ...prev.filter((t) => t.id !== res.id)]);
        setTicketActivoId(res.id);
        if (detalle.trim()) {
          const msgs = await cargarMensajes(res.id);
          setMensajes(msgs);
        } else {
          setMensajes([]);
        }
      }
      setVista("chat");
      setAsunto("");
      setObra("");
      setDetalle("");
    } catch (err) {
      console.error("Error creando ticket:", err);
    } finally {
      setEnviando(false);
    }
  };

  if (enPantallaSoporte) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "calc(16px + env(safe-area-inset-bottom))",
      right: "calc(16px + env(safe-area-inset-right))",
      zIndex: 9999,
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      {/* Ventana Flotante Emergente */}
      {abierto && (
        <div
          style={{
            position: "absolute",
            bottom: 56,
            right: 0,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            height: 480,
            maxHeight: "calc(100dvh - 84px)",
            backgroundColor: "var(--surface, #ffffff)",
            borderRadius: 16,
            border: "1px solid var(--border, #eaecf0)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {/* Cabecera del Widget */}
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#E0342A",
              color: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {vista !== "lista" && (
                <button
                  onClick={() => setVista("lista")}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    color: "#fff",
                    borderRadius: 6,
                    padding: "3px 8px",
                    cursor: "pointer",
                    fontSize: 12,
                    marginRight: 2,
                  }}
                  title="Volver a la lista"
                >
                  ←
                </button>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {vista === "chat" ? (ticketActivo?.asunto || "Chat de Soporte") : "Mensajes y Soporte"}
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.9 }}>
                  {vista === "chat" ? (`Con ${ticketActivo?.usuario_nombre || "Usuario"}`) : "Habla con Camila o el equipo"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {membresia?.role === "admin" && (
                <button
                  onClick={() => {
                    setAbierto(false);
                    setScr("soporte");
                  }}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    color: "#fff",
                    borderRadius: 6,
                    padding: "3px 8px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                  title="Abrir panel completo"
                >
                  Pantalla Completa ↗
                </button>
              )}
              <button
                onClick={() => setAbierto(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "0 4px",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Cuerpo según la vista */}
          {vista === "lista" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border, #eaecf0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main, #101828)" }}>Conversaciones</span>
                <button
                  onClick={() => setVista("nuevo")}
                  style={{
                    background: "#E0342A",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Nueva Conversación
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
                {tickets.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted, #667085)", fontSize: 12.5 }}>
                    No hay conversaciones aún. Haz clic en <strong>+ Nueva Conversación</strong> para hablar con Camila o el equipo.
                  </div>
                ) : (
                  tickets.map((t) => {
                    const esCamila = (t.usuario_nombre || "").toLowerCase().includes("camila");
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setTicketActivoId(t.id);
                          setVista("chat");
                        }}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--border, #eaecf0)",
                          marginBottom: 8,
                          cursor: "pointer",
                          backgroundColor: "var(--surface-subtle, #f9fafb)",
                          transition: "all 0.12s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main, #101828)", display: "flex", alignItems: "center", gap: 4 }}>
                            {esCamila ? "💼" : "👤"} {t.usuario_nombre}
                          </span>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: 4,
                              backgroundColor: t.estado === "resuelto" ? "#ECFDF3" : "#FEF0C7",
                              color: t.estado === "resuelto" ? "#027A48" : "#B54708",
                            }}
                          >
                            {t.estado === "resuelto" ? "Resuelto" : "En curso"}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-main, #101828)", marginBottom: 2 }}>
                          {t.asunto}
                        </div>
                        <p style={{ fontSize: 11, color: "var(--text-muted, #667085)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.ultimo_mensaje || "Toca para abrir el chat..."}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {vista === "nuevo" && (
            <form onSubmit={handleCrearTicket} style={{ flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, display: "block", marginBottom: 3, color: "var(--text-main, #101828)" }}>
                  Hablar con *
                </label>
                <select
                  value={destinatario}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDestinatario(val);
                    const enc = opcionesDestinatarios.find((u) => String(u.id) === String(val));
                    if (enc) {
                      setNombreDestinatario(enc.nombre);
                    } else if (val === "soporte") {
                      setNombreDestinatario("Ingeanclajes Soporte");
                    }
                  }}
                  style={{ ...SI, padding: "7px 10px", fontSize: 12, fontWeight: 600 }}
                >
                  <optgroup label="Equipo Ingeanclajes">
                    {opcionesDestinatarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.nombre} {u.rol ? `(${u.rol})` : ""}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Canal General">
                    <option value="soporte">🛠️ Soporte Técnico General</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 3, color: "var(--text-main, #101828)" }}>
                  Asunto o Tema *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Revisión de pagos, cotizaciones, etc."
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  style={{ ...SI, padding: "8px 10px", fontSize: 12.5 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 3, color: "var(--text-main, #101828)" }}>
                  Obra o cotización (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Torre Norte / OB-001"
                  value={obra}
                  onChange={(e) => setObra(e.target.value)}
                  style={{ ...SI, padding: "8px 10px", fontSize: 12.5 }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 3, color: "var(--text-main, #101828)" }}>
                  Mensaje inicial
                </label>
                <textarea
                  rows={3}
                  placeholder={`Escribe tu mensaje para ${nombreDestinatario}...`}
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                  style={{ ...SI, padding: "8px 10px", fontSize: 12.5, resize: "none", height: 75 }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setVista("lista")}
                  style={{ flex: 1, background: "transparent", border: "1px solid var(--border, #eaecf0)", borderRadius: 8, padding: "8px", fontSize: 12, cursor: "pointer", color: "var(--text-muted, #667085)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || !asunto.trim()}
                  style={{ flex: 1, ...B("#E0342A"), justifyContent: "center", fontSize: 12, padding: "8px" }}
                >
                  {enviando ? "Enviando..." : "Iniciar Chat"}
                </button>
              </div>
            </form>
          )}

          {vista === "chat" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10, backgroundColor: "var(--bg-app, #f9fafb)" }}>
                {mensajes.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-muted, #667085)", fontSize: 12, margin: "auto" }}>
                    Escribe tu mensaje a continuación. Te responderemos aquí mismo.
                  </div>
                ) : (
                  mensajes.map((m) => {
                    const miId = membresia?.user_id;
                    const miNombre = (membresia?.nombre || "").trim().toLowerCase();
                    const miEmail = (membresia?.email || "").trim().toLowerCase();
                    const msgNombre = (m.remitente_nombre || "").trim().toLowerCase();
                    const msgEmail = (m.remitente_email || "").trim().toLowerCase();

                    const esMio = Boolean(
                      (miId && m.remitente_id && m.remitente_id === miId) ||
                      (miEmail && msgEmail && miEmail === msgEmail) ||
                      (miNombre && msgNombre && (msgNombre.includes(miNombre) || miNombre.includes(msgNombre))) ||
                      (!miId && m.remitente_id === "cristian")
                    );

                    return (
                      <div
                        key={m.id}
                        style={{
                          display: "flex",
                          justifyContent: esMio ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "82%",
                            padding: "8px 12px",
                            borderRadius: 12,
                            fontSize: 12,
                            lineHeight: 1.4,
                            backgroundColor: esMio ? "#E0342A" : "var(--surface, #ffffff)",
                            color: esMio ? "#ffffff" : "var(--text-main, #101828)",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            border: esMio ? "none" : "1px solid var(--border, #eaecf0)",
                          }}
                        >
                          <div style={{ fontSize: 9.5, opacity: 0.8, marginBottom: 2 }}>
                            {esMio ? "Tú" : m.remitente_nombre}
                          </div>
                          <div>{m.texto}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Chat */}
              <form
                onSubmit={handleEnviarChat}
                style={{
                  padding: "8px 10px",
                  borderTop: "1px solid var(--border, #eaecf0)",
                  display: "flex",
                  gap: 6,
                  backgroundColor: "var(--surface, #ffffff)",
                }}
              >
                <input
                  type="text"
                  placeholder="Escribe tu mensaje..."
                  value={nuevoTexto}
                  onChange={(e) => setNuevoTexto(e.target.value)}
                  style={{ ...SI, flex: 1, padding: "7px 10px", fontSize: 12 }}
                />
                <button
                  type="submit"
                  disabled={enviando || !nuevoTexto.trim()}
                  style={{ ...B("#E0342A"), padding: "6px 12px", fontSize: 12 }}
                >
                  ➤
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Botón Circular Flotante */}
      <button
        onClick={() => setAbierto((prev) => !prev)}
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          backgroundColor: "#E0342A",
          color: "#ffffff",
          border: "none",
          boxShadow: "0 4px 14px rgba(224, 52, 42, 0.45)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          transition: "transform 0.15s ease",
          position: "relative",
        }}
        title="Mensajes y soporte"
      >
        {abierto ? "✕" : "💬"}
        {!abierto && tickets.some((t) => t.estado === "pendiente" || t.estado === "en_curso") && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 11,
              height: 11,
              backgroundColor: "#12B76A",
              border: "2px solid #ffffff",
              borderRadius: "50%",
            }}
          />
        )}
      </button>
    </div>
  );
}
