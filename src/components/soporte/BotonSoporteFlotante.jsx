import { useState, useEffect, useRef, useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import {
  cargarTickets,
  cargarMensajes,
  enviarMensaje,
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
import { SI, B } from "../../styles/tokens";
import SelectorEmojis from "./SelectorEmojis";
import AdjuntoMensaje from "./AdjuntoMensaje";
import BarraAdjuntoPrevia from "./BarraAdjuntoPrevia";
import { procesarArchivoAdjunto, serializarAdjunto } from "../../lib/soporteAdjuntos";

function formatHoraCorta(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

export default function BotonSoporteFlotante() {
  const isMobile = useIsMobile();
  const ctx = useAppData();
  const { membresia, scr, setScr } = ctx || {};
  const [abierto, setAbierto] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [vista, setVista] = useState("lista"); // 'lista' | 'chat' | 'nuevo'
  const [tickets, setTickets] = useState([]);
  const [ticketActivoId, setTicketActivoId] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoTexto, setNuevoTexto] = useState("");
  const [totalNoLeidos, setTotalNoLeidos] = useState(0);
  const [ticketsConNoLeidosMap, setTicketsConNoLeidosMap] = useState({});
  const autoAbiertoRef = useRef(false);

  const [usuariosDisponibles, setUsuariosDisponibles] = useState([]);
  const [destinatario, setDestinatario] = useState("camila");
  const [nombreDestinatario, setNombreDestinatario] = useState("Camila Sepúlveda");
  const [asunto, setAsunto] = useState("");
  const [obra, setObra] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Estados para emojis y adjuntos (archivos / capturas) en widget flotante
  const [adjuntoStaged, setAdjuntoStaged] = useState(null);
  const [selectorEmojisOpen, setSelectorEmojisOpen] = useState(false);
  const [procesandoAdjunto, setProcesandoAdjunto] = useState(false);
  const fileInputRef = useRef(null);
  const inputTextoRef = useRef(null);

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
    const miEmail = (membresia?.email || "").toLowerCase().trim();
    const miNombre = (membresia?.nombre || "").toLowerCase().trim();

    const esYo = (u) => {
      const uEmail = (u.email || "").toLowerCase().trim();
      const uNom = (u.nombre || "").toLowerCase().trim();
      if (miEmail && uEmail && miEmail === uEmail) return true;
      if (miNombre && uNom && (miNombre === uNom || miNombre.includes(uNom) || uNom.includes(miNombre))) return true;
      return false;
    };

    (usuariosDisponibles || []).forEach((u) => {
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
          list.push(item);
          ids.add(nom.toLowerCase());
          if (u.email) ids.add(u.email.toLowerCase());
        }
      }
    });

    const defaults = [
      { id: "camila", nombre: "Camila Sepúlveda", email: "sistemasingeanclajes@gmail.com", rol: "Administrador" },
      { id: "cristian", nombre: "Cristian Flórez", email: "cristiandel48@gmail.com", rol: "Administrador" },
      { id: "miguel", nombre: "Miguel Arenas", email: "ingeanclajes.civil@gmail.com", rol: "Coordinador" },
      { id: "paola_escobar", nombre: "Paola Escobar", email: "ingeanclajessgssst@gmail.com", rol: "Coordinador" },
      { id: "paola_cadavid", nombre: "Paola Andrea Cadavid", email: "aux.contableingeanclajes@gmail.com", rol: "Operativo" },
      { id: "erika", nombre: "Erika Gonzalez", email: "ingeanclajessas@gmail.com", rol: "Operativo" },
    ];

    defaults.forEach((def) => {
      if (!esYo(def) && !ids.has(def.nombre.toLowerCase()) && !ids.has(def.email.toLowerCase())) {
        list.push(def);
        ids.add(def.nombre.toLowerCase());
        if (def.email) ids.add(def.email.toLowerCase());
      }
    });

    return list;
  }, [usuariosDisponibles, membresia]);

  // Asignar el destinatario por defecto al primer contacto disponible que no sea yo mismo
  useEffect(() => {
    if (opcionesDestinatarios.length > 0) {
      const actualExiste = opcionesDestinatarios.some((u) => String(u.id) === String(destinatario));
      if (!actualExiste) {
        const primerContacto = opcionesDestinatarios[0];
        setDestinatario(primerContacto.id);
        setNombreDestinatario(primerContacto.nombre);
      }
    }
  }, [opcionesDestinatarios, destinatario]);

  // Carga inicial y polling periódico continuo de tickets (cada 8s) incluso cerrado
  useEffect(() => {
    cargarTickets().then((data) => {
      setTickets((data || []).filter((t) => !esTicketEjemplo(t)));
    });

    const interval = setInterval(async () => {
      try {
        const data = await cargarTickets();
        if (data && data.length >= 0) {
          setTickets(data.filter((t) => !esTicketEjemplo(t)));
        }
      } catch {
        // polling silencioso
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Filtrar estrictamente tickets visibles para este usuario (confidencialidad total)
  const ticketsVisibles = useMemo(() => {
    return tickets.filter((t) => esTicketVisibleParaUsuario(t, membresia));
  }, [tickets, membresia]);

  // Si el ticket activo actual no pertenece a mis tickets visibles, volver a la lista
  useEffect(() => {
    if (ticketActivoId && ticketsVisibles.length > 0) {
      const existe = ticketsVisibles.some((t) => t.id === ticketActivoId);
      if (!existe) {
        setTicketActivoId(null);
        setVista("lista");
      }
    }
  }, [ticketsVisibles, ticketActivoId]);

  // Escuchar evento para abrir el chat directamente a un ticket específico
  useEffect(() => {
    const handleAbrirTicket = (e) => {
      const targetId = e.detail?.ticketId || e.detail?.ticket_id;
      if (targetId) {
        setTicketActivoId(targetId);
        setVista("chat");
        setAbierto(true);
        setMinimizado(false);
      } else {
        setAbierto(true);
        setMinimizado(false);
      }
    };
    window.addEventListener("abrir-chat-ticket", handleAbrirTicket);
    return () => window.removeEventListener("abrir-chat-ticket", handleAbrirTicket);
  }, []);

  // Escuchar eliminación de tickets en tiempo real
  useEffect(() => {
    const handleTicketEliminado = (e) => {
      const { ticketId, targetUuid } = e.detail || {};
      setTickets((prev) => prev.filter((t) => t.id !== ticketId && t.id !== targetUuid));
      if (ticketActivoId === ticketId || ticketActivoId === targetUuid) {
        setTicketActivoId(null);
        setMensajes([]);
        setVista("lista");
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
            setVista("lista");
          }
        }
      };
    }

    return () => {
      window.removeEventListener("notificacion-ticket-eliminado", handleTicketEliminado);
      if (bc) bc.close();
    };
  }, [ticketActivoId]);

  // Verificar y auto-abrir si hay mensajes no leídos para este usuario al iniciar sesión
  const refrescarNoLeidos = async (forzarApertura = false) => {
    if (!membresia) return;
    try {
      const info = await obtenerMensajesNoLeidos(membresia);
      if (info) {
        setTotalNoLeidos(info.totalNoLeidos);
        const map = {};
        (info.ticketsConNoLeidos || []).forEach((item) => {
          map[item.ticket.id] = item.cantidad;
        });
        setTicketsConNoLeidosMap(map);

        // Si hay mensajes no leídos dirigidos a este usuario -> Abrir automáticamente la ventana del chat
        if (info.totalNoLeidos > 0 && info.ticketMasReciente) {
          if (!autoAbiertoRef.current || forzarApertura) {
            autoAbiertoRef.current = true;
            setTicketActivoId(info.ticketMasReciente.id);
            setVista("chat");
            setAbierto(true);
            setMinimizado(false);
            try {
              reproducirSonidoNotificacion({ volumen: 0.45 });
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn("Aviso verificando no leídos:", e);
    }
  };

  // Auto-apertura al iniciar sesión / montar si hay mensajes no leídos
  useEffect(() => {
    refrescarNoLeidos();

    const interval = setInterval(() => {
      refrescarNoLeidos();
    }, 4500);

    return () => clearInterval(interval);
  }, [membresia]);

  // Marcar mensajes como leídos cuando el usuario tiene la conversación abierta en pantalla
  useEffect(() => {
    if (!abierto || minimizado || vista !== "chat" || !ticketActivoId || !membresia) return;

    const timer = setTimeout(() => {
      marcarMensajesComoLeidos(ticketActivoId, membresia).then(() => {
        setMensajes((prev) =>
          prev.map((m) => (!esMiMensaje(m, membresia) ? { ...m, leido: true } : m))
        );
        setTicketsConNoLeidosMap((prev) => {
          const next = { ...prev };
          delete next[ticketActivoId];
          return next;
        });
        setTotalNoLeidos((prev) => Math.max(0, prev - (ticketsConNoLeidosMap[ticketActivoId] || 1)));
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [abierto, minimizado, vista, ticketActivoId, membresia, mensajes.length]);

  // Escuchar cuando se marcan como leídos desde otra pestaña o pantalla
  useEffect(() => {
    const handleLeidos = (e) => {
      const tId = e.detail?.ticketId;
      if (tId) {
        setTicketsConNoLeidosMap((prev) => {
          const next = { ...prev };
          delete next[tId];
          return next;
        });
        if (ticketActivoId === tId) {
          cargarMensajes(ticketActivoId).then((data) => {
            if (data) setMensajes(data);
          });
        }
      }
    };
    window.addEventListener("notificacion-mensajes-leidos", handleLeidos);

    let bc = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("ingeanclajes_canal_mensajes");
      bc.onmessage = (event) => {
        if (event.data?.tipo === "mensajes-leidos" && event.data?.ticketId === ticketActivoId) {
          cargarMensajes(ticketActivoId).then((data) => {
            if (data) setMensajes(data);
          });
        }
      };
    }

    return () => {
      window.removeEventListener("notificacion-mensajes-leidos", handleLeidos);
      if (bc) bc.close();
    };
  }, [ticketActivoId]);

  // Escuchar mensajes entrantes en tiempo real disparados por NotificadorMensajesGlobal
  useEffect(() => {
    const handleNuevoMsg = (e) => {
      const msg = e.detail;
      if (!msg) return;

      // Si el mensaje no fue enviado por mí, auto-abrir de inmediato la ventana del chat
      if (!esMiMensaje(msg, membresia)) {
        const tId = msg.ticket_id || msg.ticketId;
        if (tId) {
          setTicketActivoId(tId);
          setVista("chat");
          setAbierto(true);
          setMinimizado(false);
          try {
            reproducirSonidoNotificacion({ volumen: 0.45 });
          } catch {}
        }
      }

      // Si corresponde al ticket abierto, agregarlo al chat de inmediato
      if (ticketActivoId && (msg.ticket_id === ticketActivoId || msg.ticketId === ticketActivoId)) {
        setMensajes((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg].sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en));
        });
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
      }

      // Refrescar lista de tickets y contador de no leídos
      cargarTickets().then((data) => {
        if (data) setTickets(data.filter((t) => !esTicketEjemplo(t)));
      });
      refrescarNoLeidos();
    };

    window.addEventListener("notificacion-mensaje-recibido", handleNuevoMsg);
    return () => window.removeEventListener("notificacion-mensaje-recibido", handleNuevoMsg);
  }, [ticketActivoId, membresia]);

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

    const desuscribir = suscribirChatTicket(
      ticketActivoId,
      (nuevo) => {
        if (montado) {
          setMensajes((prev) => {
            if (prev.some((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
        }
      },
      (actualizado) => {
        if (montado && actualizado) {
          setMensajes((prev) =>
            prev.map((m) => (m.id === actualizado.id ? { ...m, ...actualizado } : m))
          );
        }
      }
    );

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
            const algunCambioLeido = data.some((m) => {
              const prevM = prev.find((p) => p.id === m.id);
              return prevM && Boolean(prevM.leido) !== Boolean(m.leido);
            });

            if (nuevos.length === 0 && !algunCambioLeido && prev.length === data.length) return prev;
            if (nuevos.length > 0) {
              setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
            }
            return data;
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
        if (data && data.length >= 0) {
          setTickets(data.filter((t) => !esTicketEjemplo(t)));
        }
      } catch {
        // polling silencioso
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [abierto]);

  const ticketActivo = ticketsVisibles.find((t) => t.id === ticketActivoId);

  // Manejo de pegado directo de capturas de pantalla (Ctrl+V) en widget flotante
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          setProcesandoAdjunto(true);
          try {
            const res = await procesarArchivoAdjunto(file, `captura_${Date.now()}.png`);
            setAdjuntoStaged(res);
          } catch (err) {
            alert(err.message || "Error al procesar la captura de pantalla");
          } finally {
            setProcesandoAdjunto(false);
          }
          break;
        }
      }
    }
  };

  // Manejo de selección de archivo o imagen desde el botón de clip
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcesandoAdjunto(true);
    try {
      const res = await procesarArchivoAdjunto(file);
      setAdjuntoStaged(res);
    } catch (err) {
      alert(err.message || "Error al procesar el archivo adjunto");
    } finally {
      setProcesandoAdjunto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Manejo de inserción de emoji en el mensaje
  const handleSeleccionarEmoji = (emoji) => {
    setNuevoTexto((prev) => prev + emoji);
    setSelectorEmojisOpen(false);
    if (inputTextoRef.current) {
      inputTextoRef.current.focus();
    }
  };

  const handleEnviarChat = async (e) => {
    e?.preventDefault();
    const texto = nuevoTexto.trim();
    if ((!texto && !adjuntoStaged) || !ticketActivoId || enviando || procesandoAdjunto) return;

    setEnviando(true);
    try {
      const remitente = membresia?.nombre || "Cristian Flórez";
      const esAdmin = membresia?.role === "admin";
      const textoFinal = texto || (adjuntoStaged?.esImagen ? "🖼️ Captura de pantalla" : "📎 Archivo adjunto");
      const adjuntoSerializado = adjuntoStaged ? serializarAdjunto(adjuntoStaged) : null;

      const guardado = await enviarMensaje({
        ticketId: ticketActivoId,
        texto: textoFinal,
        remitenteNombre: remitente,
        remitenteId: membresia?.user_id || null,
        esAdmin,
        adjuntoUrl: adjuntoSerializado,
      });

      if (guardado.ticket_id && guardado.ticket_id !== ticketActivoId) {
        setTicketActivoId(guardado.ticket_id);
      }

      setMensajes((prev) => {
        if (prev.some((m) => m.id === guardado.id)) return prev;
        return [...prev, guardado];
      });
      setNuevoTexto("");
      setAdjuntoStaged(null);
      setSelectorEmojisOpen(false);

      // Actualizar estado del ticket en la lista
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketActivoId || (guardado.ticket_id && t.id === guardado.ticket_id)
            ? {
                ...t,
                id: guardado.ticket_id || t.id,
                ultimo_mensaje: textoFinal,
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
        creadorNombre: membresia?.nombre || "Cristian Flórez",
        creadorEmail: membresia?.email || "cristiandel48@gmail.com",
        creadorId: membresia?.user_id || membresia?.userId || null,
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
        setVista("lista");
      }
    } catch (err) {
      console.error("Error al eliminar conversación:", err);
      alert("No se pudo eliminar la conversación. Inténtalo de nuevo.");
    }
  };

  return (
    <div style={
      isMobile && abierto && !minimizado
        ? {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100dvh",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Inter', system-ui, sans-serif",
          }
        : {
            position: "fixed",
            bottom: "calc(16px + env(safe-area-inset-bottom))",
            right: "calc(16px + env(safe-area-inset-right))",
            zIndex: 9999,
            fontFamily: "'Inter', system-ui, sans-serif",
          }
    }>
      {/* Barra Minimizada Acoplada */}
      {abierto && minimizado && (
        <div
          onClick={() => setMinimizado(false)}
          style={{
            position: "absolute",
            bottom: 56,
            right: 0,
            width: isMobile ? "calc(100vw - 32px)" : 320,
            maxWidth: "calc(100vw - 32px)",
            height: 44,
            backgroundColor: "#E0342A",
            color: "#ffffff",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 10px 25px -5px rgba(224, 52, 42, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            cursor: "pointer",
            animation: "fadeIn 0.15s ease",
            userSelect: "none",
          }}
          title="Clic para restaurar y continuar chateando"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{vista === "chat" ? (ticketActivo?.asunto || "Chat de Soporte") : "Mensajes y Soporte"}</span>
                {totalNoLeidos > 0 && (
                  <span style={{ backgroundColor: "#ffffff", color: "#E0342A", borderRadius: 8, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>
                    {totalNoLeidos} sin leer
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, opacity: 0.9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {vista === "chat" ? `Con ${obtenerNombreInterlocutor(ticketActivo, membresia)}` : "Clic para expandir"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMinimizado(false)}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "#fff",
                borderRadius: 5,
                padding: "3px 7px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
              title="Restaurar / Expandir"
            >
              <span>🗖</span>
            </button>
            <button
              onClick={() => {
                setMinimizado(false);
                setAbierto(false);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 15,
                cursor: "pointer",
                padding: "0 4px",
                display: "flex",
                alignItems: "center",
              }}
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Ventana Flotante Emergente (Expandida) */}
      {abierto && !minimizado && (
        <div
          style={
            isMobile
              ? {
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: "100vw",
                  height: "100dvh",
                  maxWidth: "100vw",
                  maxHeight: "100dvh",
                  backgroundColor: "var(--surface, #ffffff)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  zIndex: 100000,
                  boxSizing: "border-box",
                }
              : {
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
                }
          }
        >
          {/* Cabecera del Widget */}
          <div
            style={{
              paddingTop: isMobile ? "calc(10px + env(safe-area-inset-top))" : "12px",
              paddingBottom: "12px",
              paddingLeft: "14px",
              paddingRight: "14px",
              backgroundColor: "#E0342A",
              color: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1, overflow: "hidden" }}>
              {/* Botón Flecha para Regresar al Menú o a la Lista */}
              <button
                onClick={() => {
                  if (vista !== "lista") {
                    setVista("lista");
                  } else {
                    setAbierto(false);
                    setMinimizado(false);
                  }
                }}
                style={{
                  background: "rgba(255,255,255,0.22)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  flexShrink: 0,
                }}
                title={vista !== "lista" ? "Volver a la lista de chats" : "Regresar al menú principal"}
              >
                <span>←</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>
                  {vista !== "lista" ? "Atrás" : "Menú"}
                </span>
              </button>

              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {vista === "chat" ? (ticketActivo?.asunto || "Chat de Soporte") : "Mensajes y Soporte"}
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {vista === "chat" ? `Con ${obtenerNombreInterlocutor(ticketActivo, membresia)}` : "Habla con Camila o el equipo"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              {!isMobile && membresia?.role === "admin" && (
                <button
                  onClick={() => {
                    setAbierto(false);
                    setMinimizado(false);
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
              {/* Botón Eliminar conversación */}
              {vista === "chat" && ticketActivo && (
                <button
                  onClick={() => handleEliminarTicket(ticketActivo.id)}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    color: "#fff",
                    borderRadius: 6,
                    width: 26,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 12,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
                  title="Eliminar conversación"
                  aria-label="Eliminar conversación"
                >
                  🗑️
                </button>
              )}
              {/* Botón Minimizar */}
              <button
                onClick={() => setMinimizado(true)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#fff",
                  borderRadius: 6,
                  width: 26,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: 1,
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.35)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
                title="Minimizar chat"
                aria-label="Minimizar chat"
              >
                —
              </button>
              {/* Botón Cerrar */}
              <button
                onClick={() => {
                  setAbierto(false);
                  setMinimizado(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "0 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Cerrar chat"
                aria-label="Cerrar chat"
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
                {ticketsVisibles.length === 0 ? (
                  <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-muted, #667085)", fontSize: 12.5 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                    <div style={{ fontWeight: 700, color: "var(--text-main, #101828)", marginBottom: 4, fontSize: 13 }}>
                      Bandeja limpia
                    </div>
                    No hay conversaciones activas. Haz clic en <strong>+ Nueva Conversación</strong> para iniciar un chat privado.
                  </div>
                ) : (
                  ticketsVisibles.map((t) => {
                    const interlocutor = obtenerNombreInterlocutor(t, membresia);
                    const esCamila = interlocutor.toLowerCase().includes("camila");
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
                            {esCamila ? "💼" : "👤"} {interlocutor}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {ticketsConNoLeidosMap[t.id] > 0 && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  backgroundColor: "#FEE4E2",
                                  color: "#B42318",
                                  border: "1px solid #FDA29B",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                🔴 {ticketsConNoLeidosMap[t.id]} nuevo{ticketsConNoLeidosMap[t.id] > 1 ? "s" : ""}
                              </span>
                            )}
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEliminarTicket(t.id);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-muted, #667085)",
                                cursor: "pointer",
                                padding: "2px 4px",
                                fontSize: 11,
                                borderRadius: 4,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
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
                    const esMio = esMiMensaje(m, membresia);

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
                          <div style={{ fontSize: 9.5, opacity: 0.85, marginBottom: 2, display: "flex", justifyContent: "space-between", gap: 6 }}>
                            <span>{esMio ? "Tú" : m.remitente_nombre}</span>
                            <span>{formatHoraCorta(m.creado_en)}</span>
                          </div>
                          {m.texto && <div style={{ wordBreak: "break-word" }}>{m.texto}</div>}
                          {m.adjunto_url && (
                            <AdjuntoMensaje adjuntoRaw={m.adjunto_url} esMio={esMio} />
                          )}
                          {esMio && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: 3,
                                marginTop: 3,
                                fontSize: 9.5,
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 2,
                                  fontWeight: 700,
                                  color: m.leido ? "#67e8f9" : "rgba(255, 255, 255, 0.72)",
                                }}
                                title={m.leido ? "Visto" : "Enviado · Pendiente de lectura"}
                              >
                                {m.leido ? (
                                  <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="17 6 8.5 17 3.5 12" />
                                      <polyline points="21.5 10 13 21 11 19" />
                                    </svg>
                                    <span>Visto</span>
                                  </>
                                ) : (
                                  <>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>Enviado</span>
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Previsualización del archivo o captura adjunta */}
              <BarraAdjuntoPrevia
                adjunto={adjuntoStaged}
                onQuitar={() => setAdjuntoStaged(null)}
                subiendo={procesandoAdjunto}
              />

              {/* Input Chat */}
              <form
                onSubmit={handleEnviarChat}
                style={{
                  padding: isMobile ? "10px 12px calc(12px + env(safe-area-inset-bottom))" : "8px 10px",
                  borderTop: "1px solid var(--border, #eaecf0)",
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  backgroundColor: "var(--surface, #ffffff)",
                  position: "relative",
                }}
              >
                {/* Selector de Emojis */}
                {selectorEmojisOpen && (
                  <SelectorEmojis
                    onSeleccionar={handleSeleccionarEmoji}
                    onCerrar={() => setSelectorEmojisOpen(false)}
                    posicion="arriba"
                  />
                )}

                {/* Input de archivo oculto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={() => setSelectorEmojisOpen((prev) => !prev)}
                  style={{
                    background: selectorEmojisOpen ? "var(--surface-subtle, #f2f4f7)" : "transparent",
                    border: "1px solid var(--border, #eaecf0)",
                    borderRadius: 6,
                    padding: "4px 6px",
                    fontSize: 15,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                  title="Insertar emojis"
                >
                  😀
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: adjuntoStaged ? "rgba(224, 52, 42, 0.1)" : "transparent",
                    border: "1px solid var(--border, #eaecf0)",
                    borderRadius: 6,
                    padding: "4px 6px",
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: adjuntoStaged ? "#E0342A" : "var(--text-muted, #667085)",
                    lineHeight: 1,
                  }}
                  title="Adjuntar archivo o imagen"
                >
                  📎
                </button>

                <input
                  ref={inputTextoRef}
                  type="text"
                  placeholder="Mensaje o pega captura (Ctrl+V)..."
                  value={nuevoTexto}
                  onChange={(e) => setNuevoTexto(e.target.value)}
                  onPaste={handlePaste}
                  disabled={enviando || procesandoAdjunto}
                  style={{ ...SI, flex: 1, padding: "7px 10px", fontSize: 12 }}
                />

                <button
                  type="submit"
                  disabled={enviando || procesandoAdjunto || (!nuevoTexto.trim() && !adjuntoStaged)}
                  style={{
                    ...B("#E0342A"),
                    padding: "6px 12px",
                    fontSize: 12,
                    opacity: enviando || procesandoAdjunto || (!nuevoTexto.trim() && !adjuntoStaged) ? 0.6 : 1,
                    cursor: enviando || procesandoAdjunto || (!nuevoTexto.trim() && !adjuntoStaged) ? "not-allowed" : "pointer",
                  }}
                >
                  {enviando || procesandoAdjunto ? "..." : "➤"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Botón Circular Flotante */}
      {(!isMobile || !abierto || minimizado) && (
        <button
          onClick={() => {
            if (minimizado) {
              setMinimizado(false);
              setAbierto(true);
            } else {
              setAbierto((prev) => !prev);
            }
          }}
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
          title={minimizado ? "Restaurar chat" : abierto ? "Cerrar chat" : "Mensajes y soporte"}
        >
          {abierto && !minimizado ? "✕" : "💬"}
          {(!abierto || minimizado) && totalNoLeidos > 0 ? (
            <span
              style={{
                position: "absolute",
                top: -5,
                right: -5,
                minWidth: 19,
                height: 19,
                padding: "0 4px",
                backgroundColor: "#E0342A",
                border: "2px solid #ffffff",
                borderRadius: 10,
                color: "#ffffff",
                fontSize: 10.5,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
              }}
            >
              {totalNoLeidos}
            </span>
          ) : (
            (!abierto || minimizado) && ticketsVisibles.some((t) => t.estado === "pendiente" || t.estado === "en_curso") && (
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
            )
          )}
        </button>
      )}
    </div>
  );
}
