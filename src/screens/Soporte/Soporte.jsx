import { useState, useEffect, useRef, useMemo } from "react";
import H1 from "../../components/ui/H1";
import { BRAND, B, CD, SI } from "../../styles/tokens";
import {
  cargarTickets,
  cargarMensajes,
  enviarMensaje,
  cambiarEstadoTicket,
  crearTicket,
  eliminarTicket,
  suscribirChatTicket,
  esTicketEjemplo,
  esTicketVisibleParaUsuario,
  obtenerNombreInterlocutor,
  obtenerMensajesNoLeidos,
  marcarMensajesComoLeidos,
  esMiMensaje,
} from "../../lib/soporte";
import { listarUsuarios } from "../../lib/backend/usuarios";
import { reproducirSonidoNotificacion } from "../../lib/sonidoNotificacion";
import { useIsMobile } from "../../hooks/useMediaQuery";

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
  const isMobile = useIsMobile();
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

  // Lista de usuarios para seleccionar
  const [listaUsuarios, setListaUsuarios] = useState([]);

  // Formulario nueva conversación
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("camila");
  const [nuevoNombre, setNuevoNombre] = useState("Camila Sepúlveda");
  const [nuevoEmail, setNuevoEmail] = useState("sistemasingeanclajes@gmail.com");
  const [nuevoUserId, setNuevoUserId] = useState("camila");
  const [esOtroUsuario, setEsOtroUsuario] = useState(false);

  const [nuevoAsunto, setNuevoAsunto] = useState("");
  const [nuevoObra, setNuevoObra] = useState("");
  const [esOtraObra, setEsOtraObra] = useState(false);
  const [nuevoPrioridad, setNuevoPrioridad] = useState("media");
  const [nuevoMsgInicial, setNuevoMsgInicial] = useState("");

  const chatEndRef = useRef(null);

  // Cargar usuarios del equipo
  useEffect(() => {
    let montado = true;
    async function loadUsers() {
      try {
        const u = await listarUsuarios();
        if (montado && u && u.length > 0) {
          setListaUsuarios(u);
        }
      } catch (e) {
        console.warn("No se pudo listar usuarios:", e);
      }
    }
    loadUsers();
    return () => {
      montado = false;
    };
  }, []);

  // Combinar usuarios de la base de datos priorizando UUIDs reales de auth.users y excluyendo al usuario actual
  const opcionesUsuarios = useMemo(() => {
    const combinados = [];
    const idsRegistrados = new Set();
    const miEmail = (membresia?.email || "").toLowerCase().trim();
    const miNombre = (membresia?.nombre || "").toLowerCase().trim();

    const esYo = (u) => {
      const uEmail = (u.email || "").toLowerCase().trim();
      const uNom = (u.nombre || "").toLowerCase().trim();
      if (miEmail && uEmail && miEmail === uEmail) return true;
      if (miNombre && uNom && (miNombre === uNom || miNombre.includes(uNom) || uNom.includes(miNombre))) return true;
      return false;
    };

    // 1. Usuarios reales de la base de datos (con su auth.users UUID)
    (listaUsuarios || []).forEach((u) => {
      const nom = u.nombre || u.email;
      const idReal = u.user_id || u.id;
      if (nom && idReal) {
        const item = {
          id: idReal,
          nombre: nom,
          email: u.email || "",
          rol: u.role || "Equipo Ingeanclajes",
        };
        if (!esYo(item)) {
          combinados.push(item);
          idsRegistrados.add(nom.toLowerCase());
          if (u.email) idsRegistrados.add(u.email.toLowerCase());
        }
      }
    });

    // 2. Usuarios base del sistema (los 6 usuarios registrados en Usuarios y Permisos)
    const base = [
      { id: "camila", nombre: "Camila Sepúlveda", email: "sistemasingeanclajes@gmail.com", rol: "Administrador" },
      { id: "cristian", nombre: "Cristian Flórez", email: "cristiandel48@gmail.com", rol: "Administrador" },
      { id: "miguel", nombre: "Miguel Arenas", email: "ingeanclajes.civil@gmail.com", rol: "Coordinador" },
      { id: "paola_escobar", nombre: "Paola Escobar", email: "ingeanclajessgssst@gmail.com", rol: "Coordinador" },
      { id: "paola_cadavid", nombre: "Paola Andrea Cadavid", email: "aux.contableingeanclajes@gmail.com", rol: "Operativo" },
      { id: "erika", nombre: "Erika Gonzalez", email: "ingeanclajessas@gmail.com", rol: "Operativo" },
    ];
    base.forEach((b) => {
      if (!esYo(b) && !idsRegistrados.has(b.nombre.toLowerCase()) && !idsRegistrados.has(b.email.toLowerCase())) {
        combinados.push(b);
        idsRegistrados.add(b.nombre.toLowerCase());
        idsRegistrados.add(b.email.toLowerCase());
      }
    });

    return combinados;
  }, [listaUsuarios, membresia]);

  const [ticketsConNoLeidosMap, setTicketsConNoLeidosMap] = useState({});

  // Cargar tickets al montar priorizando el ticket con mensajes no leídos
  useEffect(() => {
    let montado = true;
    async function load() {
      setCargando(true);
      const data = await cargarTickets();
      let ticketSeleccionado = null;

      if (membresia) {
        try {
          const info = await obtenerMensajesNoLeidos(membresia);
          if (info) {
            const map = {};
            (info.ticketsConNoLeidos || []).forEach((item) => {
              map[item.ticket.id] = item.cantidad;
            });
            setTicketsConNoLeidosMap(map);
            if (info.ticketMasReciente) {
              ticketSeleccionado = info.ticketMasReciente.id;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (montado) {
        const limpios = (data || []).filter((t) => !esTicketEjemplo(t));
        setTickets(limpios);
        if (!ticketActivoId) {
          setTicketActivoId(ticketSeleccionado || limpios[0]?.id || null);
        }
        setCargando(false);
      }
    }
    load();
    return () => {
      montado = false;
    };
  }, [membresia]);

  // Marcar como leídos cuando el usuario tiene la conversación abierta en la pantalla completa
  useEffect(() => {
    if (!ticketActivoId || !membresia) return;

    const timer = setTimeout(() => {
      marcarMensajesComoLeidos(ticketActivoId, membresia).then(() => {
        setMensajes((prev) => prev.map((m) => ({ ...m, leido: true })));
        setTicketsConNoLeidosMap((prev) => {
          const next = { ...prev };
          delete next[ticketActivoId];
          return next;
        });
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [ticketActivoId, membresia, mensajes.length]);

  // Cargar mensajes cuando cambia el ticket activo y escuchar cambios Realtime
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

    const handleNuevoGlobal = (e) => {
      const msg = e.detail;
      if (!msg || !montado) return;
      if (ticketActivoId && (msg.ticket_id === ticketActivoId || msg.ticketId === ticketActivoId)) {
        setMensajes((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg].sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en));
        });
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      }
      cargarTickets().then((ts) => {
        if (ts && montado) setTickets(ts.filter((t) => !esTicketEjemplo(t)));
      });
    };

    window.addEventListener("notificacion-mensaje-recibido", handleNuevoGlobal);

    return () => {
      montado = false;
      desuscribir();
      window.removeEventListener("notificacion-mensaje-recibido", handleNuevoGlobal);
    };
  }, [ticketActivoId]);

  // Polling periódico de mensajes (cada 3.5s) como salvaguarda ante desconexiones de Realtime
  useEffect(() => {
    if (!ticketActivoId) return;

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
        // error de polling silencioso
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [ticketActivoId]);

  // Polling periódico de tickets (cada 8s) para ver nuevos mensajes o estados en otras conversaciones
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await cargarTickets();
        if (data && data.length >= 0) {
          setTickets(data.filter((t) => !esTicketEjemplo(t)));
        }
      } catch {
        // error de polling silencioso
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Escuchar eliminación de tickets en tiempo real
  useEffect(() => {
    const handleTicketEliminado = (e) => {
      const { ticketId, targetUuid } = e.detail || {};
      setTickets((prev) => prev.filter((t) => t.id !== ticketId && t.id !== targetUuid));
      if (ticketActivoId === ticketId || ticketActivoId === targetUuid) {
        setTicketActivoId(null);
        setMensajes([]);
      }
    };

    window.addEventListener("notificacion-ticket-eliminado", handleTicketEliminado);

    let bc = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("ingeanclajes_canal_mensajes");
      bc.onmessage = (event) => {
        if (event.data?.tipo === "ticket-eliminado") {
          const { ticketId, targetUuid } = event.data;
          setTickets((prev) => prev.filter((t) => t.id !== ticketId && t.id !== targetUuid));
          if (ticketActivoId === ticketId || ticketActivoId === targetUuid) {
            setTicketActivoId(null);
            setMensajes([]);
          }
        }
      };
    }

    return () => {
      window.removeEventListener("notificacion-ticket-eliminado", handleTicketEliminado);
      if (bc) bc.close();
    };
  }, [ticketActivoId]);

  // Filtrar estrictamente tickets visibles para este usuario (confidencialidad total)
  const ticketsVisibles = useMemo(() => {
    return tickets.filter((t) => esTicketVisibleParaUsuario(t, membresia));
  }, [tickets, membresia]);

  useEffect(() => {
    if (ticketActivoId && ticketsVisibles.length > 0) {
      const existe = ticketsVisibles.some((t) => t.id === ticketActivoId);
      if (!existe) {
        setTicketActivoId(ticketsVisibles[0]?.id || null);
      }
    } else if (!ticketActivoId && ticketsVisibles.length > 0) {
      setTicketActivoId(ticketsVisibles[0]?.id || null);
    }
  }, [ticketsVisibles, ticketActivoId]);

  const ticketActivo = useMemo(() => {
    return ticketsVisibles.find((t) => t.id === ticketActivoId) || null;
  }, [ticketsVisibles, ticketActivoId]);

  // Filtrado de tickets
  const ticketsFiltrados = useMemo(() => {
    return ticketsVisibles.filter((t) => {
      const matchEstado = filtroEstado === "todos" || t.estado === filtroEstado;
      const q = busqueda.toLowerCase().trim();
      const interlocutor = obtenerNombreInterlocutor(t, membresia).toLowerCase();
      const matchBusqueda =
        !q ||
        (t.asunto || "").toLowerCase().includes(q) ||
        (t.usuario_nombre || "").toLowerCase().includes(q) ||
        interlocutor.includes(q) ||
        (t.obra_nombre || "").toLowerCase().includes(q) ||
        String(t.numero || "").includes(q);
      return matchEstado && matchBusqueda;
    });
  }, [ticketsVisibles, filtroEstado, busqueda, membresia]);

  // Contadores
  const stats = useMemo(() => {
    return {
      total: ticketsVisibles.length,
      pendiente: ticketsVisibles.filter((t) => t.estado === "pendiente").length,
      en_curso: ticketsVisibles.filter((t) => t.estado === "en_curso").length,
      resuelto: ticketsVisibles.filter((t) => t.estado === "resuelto").length,
    };
  }, [ticketsVisibles]);

  // Abrir modal con Camila seleccionada por defecto
  const abrirModalNuevo = () => {
    const defecto =
      opcionesUsuarios.find(
        (u) =>
          u.nombre?.toLowerCase().includes("camila") ||
          (u.email && u.email.toLowerCase().includes("camila")) ||
          u.id === "camila"
      ) || opcionesUsuarios[0];

    if (defecto) {
      setUsuarioSeleccionado(defecto.id);
      setNuevoNombre(defecto.nombre);
      setNuevoEmail(defecto.email);
      setNuevoUserId(defecto.id);
      setEsOtroUsuario(false);
    }
    setNuevoAsunto("");
    setNuevoObra("");
    setEsOtraObra(false);
    setNuevoMsgInicial("");
    setModalNuevoOpen(true);
  };

  const handleCambiarUsuario = (val) => {
    setUsuarioSeleccionado(val);
    if (val === "otro") {
      setEsOtroUsuario(true);
      setNuevoNombre("");
      setNuevoEmail("");
      setNuevoUserId(null);
    } else {
      setEsOtroUsuario(false);
      const enc = opcionesUsuarios.find((u) => String(u.id) === String(val));
      if (enc) {
        setNuevoNombre(enc.nombre);
        setNuevoEmail(enc.email);
        setNuevoUserId(enc.id);
      }
    }
  };

  const handleCambiarObra = (val) => {
    if (val === "otra") {
      setEsOtraObra(true);
      setNuevoObra("");
    } else {
      setEsOtraObra(false);
      setNuevoObra(val);
    }
  };

  // Enviar mensaje en el chat
  const handleEnviarMensaje = async (e) => {
    e?.preventDefault();
    const texto = nuevoMensaje.trim();
    if (!texto || !ticketActivoId || enviando) return;

    setEnviando(true);
    const remitenteNombre = membresia?.nombre || "Cristian Flórez";
    const esAdmin = membresia?.role === "admin";

    try {
      const guardado = await enviarMensaje({
        ticketId: ticketActivoId,
        texto,
        remitenteNombre,
        remitenteId: membresia?.user_id || null,
        esAdmin,
      });

      // Si el ticketId fue migrado o asignado a un UUID en Supabase
      if (guardado.ticket_id && guardado.ticket_id !== ticketActivoId) {
        setTicketActivoId(guardado.ticket_id);
      }

      setMensajes((prev) => {
        if (prev.some((m) => m.id === guardado.id)) return prev;
        return [...prev, guardado];
      });
      setNuevoMensaje("");

      // Actualizar la lista de tickets localmente
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

  // Eliminar conversación y mensajes
  const handleEliminarTicket = async (id) => {
    if (!id) return;
    const ok = window.confirm("¿Estás seguro de que deseas eliminar esta conversación? Esta acción no se puede deshacer.");
    if (!ok) return;

    try {
      await eliminarTicket(id);
      setTickets((prev) => prev.filter((t) => t.id !== id));
      if (ticketActivoId === id) {
        setTicketActivoId(null);
        setMensajes([]);
      }
    } catch (err) {
      console.error("Error al eliminar conversación:", err);
      alert("No se pudo eliminar la conversación. Inténtalo de nuevo.");
    }
  };

  // Crear nueva conversación / ticket desde el modal
  const handleCrearNuevoTicket = async (e) => {
    e.preventDefault();
    if (!nuevoAsunto.trim()) return;

    const destinatarioNombre = nuevoNombre.trim() || "Usuario";
    const res = await crearTicket({
      asunto: nuevoAsunto.trim(),
      obraNombre: nuevoObra.trim(),
      prioridad: nuevoPrioridad,
      usuarioNombre: destinatarioNombre,
      usuarioEmail: nuevoEmail.trim(),
      usuarioId: nuevoUserId,
      creadorNombre: membresia?.nombre || "Cristian Flórez",
      creadorEmail: membresia?.email || "cristiandel48@gmail.com",
      creadorId: membresia?.user_id || membresia?.userId || null,
      mensajeInicial: nuevoMsgInicial.trim(),
    });

    if (res) {
      setTickets((prev) => [res, ...prev.filter((t) => t.id !== res.id)]);
      setTicketActivoId(res.id);
      if (nuevoMsgInicial.trim()) {
        const msgs = await cargarMensajes(res.id);
        setMensajes(msgs);
      } else {
        setMensajes([]);
      }
    }

    setModalNuevoOpen(false);
    setNuevoAsunto("");
    setNuevoObra("");
    setNuevoMsgInicial("");
  };

  return (
    <div style={{ padding: isMobile ? (ticketActivoId ? "6px 4px 14px" : "14px 10px 24px") : "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Encabezado (se oculta en móvil si hay chat activo para maximizar pantalla) */}
      {(!isMobile || !ticketActivoId) && (
        <>
          <H1
            title="Mensajes y Soporte"
            subtitle="Comunicación directa entre el equipo (Camila, Cristian), residentes de obra y clientes"
            action={
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => reproducirSonidoNotificacion()}
                  style={{ ...B("var(--surface-subtle)", "var(--text-main)"), border: "1px solid var(--border)", fontSize: 12, padding: "8px 14px" }}
                  title="Probar sonido de notificación del computador"
                >
                  🔊 Probar timbre
                </button>
                <button onClick={abrirModalNuevo} style={B("#E0342A")}>
                  <span>+</span> Nueva conversación
                </button>
              </div>
            }
          />

          {/* Tarjetas de Resumen */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(180px, 1fr))",
              gap: isMobile ? 8 : 14,
              marginBottom: 16,
            }}
          >
            <div style={{ ...CD, padding: isMobile ? "10px 14px" : "14px 18px" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted, #667085)", fontWeight: 600 }}>CONVERSACIONES</div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "var(--text-main, #101828)", marginTop: 2 }}>
                {stats.total}
              </div>
            </div>
            <div style={{ ...CD, padding: isMobile ? "10px 14px" : "14px 18px", borderLeft: "4px solid #F79009" }}>
              <div style={{ fontSize: 11, color: "#B54708", fontWeight: 600 }}>PENDIENTES</div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#B54708", marginTop: 2 }}>
                {stats.pendiente}
              </div>
            </div>
            <div style={{ ...CD, padding: isMobile ? "10px 14px" : "14px 18px", borderLeft: "4px solid #175CD3" }}>
              <div style={{ fontSize: 11, color: "#175CD3", fontWeight: 600 }}>EN CURSO</div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#175CD3", marginTop: 2 }}>
                {stats.en_curso}
              </div>
            </div>
            <div style={{ ...CD, padding: isMobile ? "10px 14px" : "14px 18px", borderLeft: "4px solid #12B76A" }}>
              <div style={{ fontSize: 11, color: "#027A48", fontWeight: 600 }}>RESUELTOS</div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#027A48", marginTop: 2 }}>
                {stats.resuelto}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Layout Principal: 2 Columnas en desktop / 1 Columna en móvil */}
      <div
        style={{
          display: isMobile ? "flex" : "grid",
          flexDirection: "column",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(320px, 380px) 1fr",
          gap: 16,
          height: isMobile
            ? (ticketActivoId ? "calc(100dvh - 100px)" : "calc(100dvh - 270px)")
            : "calc(100vh - 270px)",
          minHeight: isMobile ? (ticketActivoId ? 480 : 380) : 520,
        }}
      >
        {/* Columna Izquierda: Lista de Tickets / Conversaciones */}
        {(!isMobile || !ticketActivoId) && (
          <div
            style={{
              ...CD,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flex: 1,
            }}
          >
          {/* Barra de Filtro y Búsqueda */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border, #eaecf0)" }}>
            <input
              type="text"
              placeholder="🔍 Buscar por persona, asunto, obra..."
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
                      background: activo ? "#E0342A" : "var(--surface-subtle, #f2f4f7)",
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
                Cargando conversaciones…
              </div>
            ) : ticketsFiltrados.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted, #667085)", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                <div style={{ fontWeight: 700, color: "var(--text-main, #101828)", marginBottom: 4, fontSize: 14 }}>
                  {tickets.length === 0 ? "Bandeja limpia" : "Sin resultados"}
                </div>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5 }}>
                  {tickets.length === 0
                    ? 'No hay conversaciones registradas. Haz clic en "+ Nueva Conversación" para iniciar un chat.'
                    : "No se encontraron conversaciones con los filtros aplicados."}
                </p>
              </div>
            ) : (
              ticketsFiltrados.map((ticket) => {
                const activo = ticket.id === ticketActivoId;
                const badge = BADGES[ticket.estado] || BADGES.pendiente;
                const interlocutor = obtenerNombreInterlocutor(ticket, membresia);
                const esCamila = interlocutor.toLowerCase().includes("camila");

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
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #101828)", display: "flex", alignItems: "center", gap: 6 }}>
                        {esCamila ? "💼" : "👤"} {interlocutor}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted, #667085)" }}>
                          {formatFechaRelativa(ticket.actualizado_en || ticket.creado_en)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminarTicket(ticket.id);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted, #667085)",
                            cursor: "pointer",
                            padding: "2px 5px",
                            fontSize: 12,
                            borderRadius: 4,
                            display: "inline-flex",
                            alignItems: "center",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#E0342A";
                            e.currentTarget.style.background = "rgba(224, 52, 42, 0.08)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--text-muted, #667085)";
                            e.currentTarget.style.background = "transparent";
                          }}
                          title="Eliminar conversación"
                        >
                          🗑️
                        </button>
                      </div>
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

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {ticketsConNoLeidosMap[ticket.id] > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              backgroundColor: "#FEE4E2",
                              color: "#B42318",
                              border: "1px solid #FDA29B",
                              padding: "2px 6px",
                              borderRadius: 6,
                            }}
                          >
                            🔴 {ticketsConNoLeidosMap[ticket.id]} nuevo{ticketsConNoLeidosMap[ticket.id] > 1 ? "s" : ""}
                          </span>
                        )}
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
                  </div>
                );
              })
            )}
          </div>
        </div>
        )}

        {/* Columna Derecha: Hilo de Chat */}
        {(!isMobile || Boolean(ticketActivoId)) && (
          <div
            style={{
              ...CD,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flex: 1,
            }}
          >
            {ticketActivo ? (
              <>
                {/* Cabecera del Chat */}
                <div
                  style={{
                    padding: isMobile ? "10px 14px" : "12px 20px",
                    borderBottom: "1px solid var(--border, #eaecf0)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    backgroundColor: "var(--surface, #ffffff)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 200px" }}>
                    {isMobile && (
                      <button
                        onClick={() => setTicketActivoId(null)}
                        style={{
                          border: "1px solid var(--border, #eaecf0)",
                          background: "var(--surface-subtle, #f2f4f7)",
                          color: "var(--text-main, #101828)",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          flexShrink: 0,
                        }}
                        title="Volver a la lista de conversaciones"
                      >
                        ← Volver
                      </button>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, margin: 0, color: "var(--text-main, #101828)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ticketActivo.asunto}
                        </h3>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            backgroundColor: (BADGES[ticketActivo.estado] || BADGES.pendiente).bg,
                            color: (BADGES[ticketActivo.estado] || BADGES.pendiente).text,
                            padding: "2px 7px",
                            borderRadius: 6,
                          }}
                        >
                          {(BADGES[ticketActivo.estado] || BADGES.pendiente).label}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted, #667085)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Con: <strong>{obtenerNombreInterlocutor(ticketActivo, membresia)}</strong>
                        {ticketActivo.obra_nombre && ` · ${ticketActivo.obra_nombre}`}
                      </div>
                    </div>
                  </div>

                  {/* Acciones de estado */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
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
                      ↺ Reabrir conversación
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
                  <button
                    onClick={() => handleEliminarTicket(ticketActivo.id)}
                    style={{
                      border: "1px solid #FDA29B",
                      background: "rgba(240, 68, 56, 0.08)",
                      color: "#B42318",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#FEE4E2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(240, 68, 56, 0.08)";
                    }}
                    title="Eliminar esta conversación por completo"
                  >
                    🗑️ Eliminar conversación
                  </button>
                </div>
              </div>

              {/* Mensajes del Chat */}
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
                    Inicia la conversación escribiendo un mensaje abajo.
                  </div>
                ) : (
                  mensajes.map((msg) => {
                    const miId = membresia?.user_id;
                    const miNombre = (membresia?.nombre || "").trim().toLowerCase();
                    const miEmail = (membresia?.email || "").trim().toLowerCase();
                    const msgNombre = (msg.remitente_nombre || "").trim().toLowerCase();
                    const msgEmail = (msg.remitente_email || "").trim().toLowerCase();

                    // Identificar si el mensaje fue enviado por el usuario actual
                    const esMio = Boolean(
                      (miId && msg.remitente_id && msg.remitente_id === miId) ||
                      (miEmail && msgEmail && miEmail === msgEmail) ||
                      (miNombre && msgNombre && (msgNombre.includes(miNombre) || miNombre.includes(msgNombre))) ||
                      (!miId && msg.remitente_id === "cristian")
                    );

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: esMio ? "flex-end" : "flex-start",
                          width: "100%",
                        }}
                      >
                        <div style={{ maxWidth: "75%" }}>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted, #667085)",
                              marginBottom: 4,
                              textAlign: esMio ? "right" : "left",
                              fontWeight: 600,
                            }}
                          >
                            {esMio ? `Tú (${msg.remitente_nombre || "Yo"})` : msg.remitente_nombre} · {formatFechaRelativa(msg.creado_en)}
                          </div>
                          <div
                            style={{
                              padding: "12px 16px",
                              borderRadius: 14,
                              borderTopRightRadius: esMio ? 2 : 14,
                              borderTopLeftRadius: esMio ? 14 : 2,
                              backgroundColor: esMio ? "#E0342A" : "var(--surface, #ffffff)",
                              color: esMio ? "#ffffff" : "var(--text-main, #101828)",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                              fontSize: 13.5,
                              lineHeight: 1.5,
                              border: esMio ? "none" : "1px solid var(--border, #eaecf0)",
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
                  padding: isMobile ? "10px 12px calc(12px + env(safe-area-inset-bottom))" : "14px 18px",
                  borderTop: "1px solid var(--border, #eaecf0)",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  backgroundColor: "var(--surface, #ffffff)",
                }}
              >
                <input
                  type="text"
                  placeholder={`Escribe un mensaje para ${ticketActivo.usuario_nombre}...`}
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  disabled={enviando}
                  style={{ ...SI, flex: 1, padding: isMobile ? "9px 12px" : "10px 14px", fontSize: isMobile ? 13 : 14 }}
                />
                <button
                  type="submit"
                  disabled={enviando || !nuevoMensaje.trim()}
                  style={{
                    ...B("#E0342A"),
                    padding: isMobile ? "9px 14px" : "10px 18px",
                    fontSize: isMobile ? 13 : 14,
                    opacity: enviando || !nuevoMensaje.trim() ? 0.6 : 1,
                    cursor: enviando || !nuevoMensaje.trim() ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {enviando ? "..." : "Enviar ➤"}
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
                Selecciona una conversación para chatear
              </h3>
              <p style={{ fontSize: 13, maxWidth: 360, marginTop: 6 }}>
                Comunícate directamente con Camila Sepúlveda, ingenieros residentes o clientes.
              </p>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Modal Nueva Conversación / Incidencia */}
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
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-main, #101828)" }}>
                  Nueva Conversación / Incidencia
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-muted, #667085)", margin: "4px 0 0" }}>
                  Selecciona a Camila o a cualquier miembro del equipo para hablar
                </p>
              </div>
              <button
                onClick={() => setModalNuevoOpen(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted, #667085)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearNuevoTicket} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* SELECTOR DE USUARIO DESTINATARIO */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5, color: "var(--text-main, #101828)" }}>
                  Hablar con (Destinatario o Reportante) *
                </label>
                <select
                  value={usuarioSeleccionado}
                  onChange={(e) => handleCambiarUsuario(e.target.value)}
                  style={{ ...SI, fontWeight: 600, color: "var(--text-main, #101828)" }}
                >
                  <optgroup label="Equipo Ingeanclajes">
                    {opcionesUsuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.nombre} {u.rol ? `(${u.rol})` : ""}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Otros">
                    <option value="otro">✍️ Escribir otro nombre o cliente manualmente...</option>
                  </optgroup>
                </select>

                {esOtroUsuario && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      required
                      placeholder="Escribe el nombre de la persona o cliente..."
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      style={SI}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* ASUNTO */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--text-main, #101828)" }}>
                  Asunto o Tema de la Conversación *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Revisión de pagos, cotización Torre Norte, anticipos..."
                  value={nuevoAsunto}
                  onChange={(e) => setNuevoAsunto(e.target.value)}
                  style={SI}
                />
              </div>

              {/* OBRA Y PRIORIDAD */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-main, #101828)" }}>
                    Obra Relacionada (Opcional)
                  </label>
                  <select
                    value={esOtraObra ? "otra" : nuevoObra}
                    onChange={(e) => handleCambiarObra(e.target.value)}
                    style={SI}
                  >
                    <option value="">General / Ninguna</option>
                    {(obras || []).map((o) => (
                      <option key={o.id || o.obra} value={o.nombre || o.obra}>
                        {o.nombre || o.obra} {o.cliente ? `(${o.cliente})` : ""}
                      </option>
                    ))}
                    <option value="otra">✍️ Otra obra...</option>
                  </select>
                  {esOtraObra && (
                    <input
                      type="text"
                      placeholder="Nombre de la obra..."
                      value={nuevoObra}
                      onChange={(e) => setNuevoObra(e.target.value)}
                      style={{ ...SI, marginTop: 6 }}
                    />
                  )}
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
                    <option value="media">Media - Atención normal</option>
                    <option value="alta">Alta - Importante / Urgente</option>
                    <option value="urgente">Urgente - Bloqueo crítico</option>
                  </select>
                </div>
              </div>

              {/* MENSAJE INICIAL */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-main, #101828)" }}>
                  Primer mensaje / Detalle
                </label>
                <textarea
                  rows={3}
                  placeholder={`Escribe aquí el mensaje inicial para ${nuevoNombre || "el destinatario"}...`}
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
                  Iniciar Conversación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
