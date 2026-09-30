// Servicio de soporte técnico, chat e incidencias en tiempo real.
// Soporta Supabase con fallback automático y persistente a almacenamiento local
// para que funcione inmediatamente aun antes de aplicar la migración SQL.

import { getSupabaseClient, isSupabaseConfigured } from "./backend/supabaseClient";
import { getTenantIdActual } from "./backend/usuarios";

const LOCAL_STORAGE_KEY_TICKETS = "ingeanclajes_soporte_tickets_v2";
const LOCAL_STORAGE_KEY_MENSAJES = "ingeanclajes_soporte_mensajes_v2";

export const TICKETS_SEED = [];
export const MENSAJES_SEED = {};

/**
 * Identifica si un ticket pertenece a las plantillas o mensajes de ejemplo anteriores
 */
export function esTicketEjemplo(t) {
  if (!t) return false;
  const id = String(t.id || "");
  const asunto = String(t.asunto || "").toLowerCase();
  const nombre = String(t.usuario_nombre || "").toLowerCase();
  return (
    id.startsWith("seed-") ||
    id === "ticket-camila" ||
    asunto.includes("fallo anclaje de fachada") ||
    asunto.includes("duda cotización pernos m16") ||
    asunto.includes("certificado de calidad lote b") ||
    asunto.includes("coordinación de pagos, facturas") ||
    nombre.includes("roberto gómez") ||
    nombre.includes("maría torres") ||
    nombre.includes("carlos ruiz")
  );
}

/**
 * Limpia cualquier residuo de tickets de ejemplo en el almacenamiento local del navegador
 */
export function limpiarStorageEjemplos() {
  try {
    localStorage.removeItem("ingeanclajes_soporte_tickets_v1");
    localStorage.removeItem("ingeanclajes_soporte_mensajes_v1");
    localStorage.removeItem("ticket-camila");
    localStorage.removeItem("seed-ticket-104");
    localStorage.removeItem("seed-ticket-105");
    localStorage.removeItem("seed-ticket-101");

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_TICKETS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const limpios = parsed.filter((t) => !esTicketEjemplo(t));
        localStorage.setItem(LOCAL_STORAGE_KEY_TICKETS, JSON.stringify(limpios));
      }
    }
  } catch (e) {
    // silencioso
  }
}

function getLocalTickets() {
  try {
    limpiarStorageEjemplos();
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_TICKETS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((t) => !esTicketEjemplo(t));
      }
    }
  } catch (e) {
    console.warn("Error leyendo tickets de localStorage:", e);
  }
  return [];
}

function saveLocalTickets(tickets) {
  try {
    const limpios = (tickets || []).filter((t) => !esTicketEjemplo(t));
    localStorage.setItem(LOCAL_STORAGE_KEY_TICKETS, JSON.stringify(limpios));
  } catch (e) {
    console.warn("Error guardando tickets en localStorage:", e);
  }
}

function getLocalMensajes(ticketId) {
  if (!ticketId || String(ticketId).startsWith("seed-") || ticketId === "ticket-camila") {
    return [];
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MENSAJES);
    const store = raw ? JSON.parse(raw) : {};
    return store[ticketId] || [];
  } catch (e) {
    console.warn("Error leyendo mensajes de localStorage:", e);
    return [];
  }
}

function saveLocalMensaje(ticketId, nuevoMensaje) {
  if (!ticketId || String(ticketId).startsWith("seed-") || ticketId === "ticket-camila") {
    return;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MENSAJES);
    const store = raw ? JSON.parse(raw) : {};
    if (!store[ticketId]) store[ticketId] = [];
    store[ticketId].push(nuevoMensaje);
    localStorage.setItem(LOCAL_STORAGE_KEY_MENSAJES, JSON.stringify(store));
  } catch (e) {
    console.warn("Error guardando mensaje en localStorage:", e);
  }
}

/**
 * Valida si una cadena tiene formato de UUID estándar de PostgreSQL / Supabase
 */
export function esUuidValido(val) {
  if (!val || typeof val !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.trim());
}

/**
 * Resuelve el UUID real de un ticket en Supabase a partir de su ID local
 */
export async function resolverTicketUuid(ticketId) {
  if (!ticketId || String(ticketId).startsWith("seed-") || ticketId === "ticket-camila") return null;
  if (esUuidValido(ticketId)) return ticketId;
  if (!isSupabaseConfigured()) return ticketId;

  try {
    const supabase = getSupabaseClient();
    const tenantId = await getTenantIdActual().catch(() => null);
    if (!tenantId) return ticketId;

    const { data: ticketsDb } = await supabase
      .from("soporte_tickets")
      .select("id, asunto, usuario_nombre")
      .eq("tenant_id", tenantId)
      .order("actualizado_en", { ascending: false });

    if (ticketsDb && ticketsDb.length > 0) {
      const validos = ticketsDb.filter((t) => !esTicketEjemplo(t));
      const match = validos.find(
        (t) =>
          t.id === ticketId ||
          (t.asunto && t.asunto.toLowerCase() === ticketId.toLowerCase())
      );

      if (match) return match.id;
    }
  } catch (e) {
    console.warn("No se pudo resolver UUID del ticket:", e);
  }
  return ticketId;
}

/**
 * Carga la lista de tickets reales desde Supabase o localStorage.
 * No genera ni añade mensajes o conversaciones de ejemplo.
 */
export async function cargarTickets() {
  limpiarStorageEjemplos();

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const tenantId = await getTenantIdActual().catch(() => null);

      if (tenantId) {
        const { data, error } = await supabase
          .from("soporte_tickets")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("actualizado_en", { ascending: false });

        if (!error && data) {
          // Filtrar tickets de ejemplo
          const reales = data.filter((t) => !esTicketEjemplo(t));

          // Purgar de la base de datos cualquier ticket de ejemplo remanente
          const ejemplosEnDb = data.filter((t) => esTicketEjemplo(t));
          if (ejemplosEnDb.length > 0) {
            for (const ej of ejemplosEnDb) {
              if (esUuidValido(ej.id)) {
                supabase.from("soporte_tickets").delete().eq("id", ej.id).catch(() => {});
              }
            }
          }

          saveLocalTickets(reales);
          return reales;
        }
      }
    } catch (e) {
      console.info("Usando almacenamiento local de tickets mientras se sincroniza con Supabase:", e.message);
    }
  }
  return getLocalTickets();
}

/**
 * Carga los mensajes de un ticket determinado desde Supabase o localStorage.
 */
export async function cargarMensajes(ticketId) {
  if (!ticketId) return [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const targetId = await resolverTicketUuid(ticketId);

      if (esUuidValido(targetId)) {
        const { data, error } = await supabase
          .from("soporte_mensajes")
          .select("*")
          .eq("ticket_id", targetId)
          .order("creado_en", { ascending: true });

        if (!error && data) {
          return data;
        }
      }
    } catch (e) {
      console.warn("Fallo cargando mensajes desde Supabase, usando local:", e);
    }
  }
  return getLocalMensajes(ticketId);
}

/**
 * Crea un nuevo ticket de soporte garantizando tipos UUID válidos.
 */
export async function crearTicket({
  asunto,
  obraNombre = "",
  obraId = null,
  prioridad = "media",
  usuarioNombre = "Usuario",
  usuarioEmail = "",
  usuarioId = null,
  mensajeInicial = "",
}) {
  let nuevoTicket = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const tenantId = await getTenantIdActual().catch(() => null);

      if (tenantId) {
        // Sanitizar usuarioId para que nunca cause error de sintaxis UUID en Postgres
        const usuarioIdUuid = esUuidValido(usuarioId) ? usuarioId.trim() : null;

        const { data: ticketData, error: ticketError } = await supabase
          .from("soporte_tickets")
          .insert([
            {
              tenant_id: tenantId,
              asunto,
              obra_nombre: obraNombre,
              obra_id: obraId,
              prioridad,
              estado: "pendiente",
              usuario_nombre: usuarioNombre,
              usuario_email: usuarioEmail,
              usuario_id: usuarioIdUuid,
              ultimo_mensaje: mensajeInicial,
            },
          ])
          .select()
          .single();

        if (!ticketError && ticketData) {
          nuevoTicket = ticketData;

          if (mensajeInicial) {
            let remitenteUuid = usuarioIdUuid;
            if (!remitenteUuid) {
              const { data: authData } = await supabase.auth.getUser().catch(() => ({}));
              if (authData?.user?.id && esUuidValido(authData.user.id)) {
                remitenteUuid = authData.user.id;
              }
            }

            await supabase.from("soporte_mensajes").insert([
              {
                tenant_id: tenantId,
                ticket_id: nuevoTicket.id,
                remitente_nombre: usuarioNombre,
                remitente_id: remitenteUuid,
                es_admin: false,
                texto: mensajeInicial,
              },
            ]);
          }

          // Mantener copia local actualizada
          const ticketsLocales = getLocalTickets().filter((t) => t.id !== nuevoTicket.id);
          saveLocalTickets([nuevoTicket, ...ticketsLocales]);

          return nuevoTicket;
        } else if (ticketError) {
          console.warn("Error creando ticket en Supabase:", ticketError);
        }
      }
    } catch (e) {
      console.warn("No se pudo crear en Supabase, guardando local:", e);
    }
  }

  // Fallback Local
  const tickets = getLocalTickets();
  const maxNum = tickets.reduce((max, t) => Math.max(max, t.numero || 100), 105);
  nuevoTicket = {
    id: "ticket-" + Date.now(),
    numero: maxNum + 1,
    asunto,
    obra_nombre: obraNombre,
    obra_id: obraId,
    prioridad,
    estado: "pendiente",
    usuario_nombre: usuarioNombre,
    usuario_email: usuarioEmail,
    usuario_id: usuarioId,
    ultimo_mensaje: mensajeInicial,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  };

  const actualizados = [nuevoTicket, ...tickets];
  saveLocalTickets(actualizados);

  if (mensajeInicial) {
    saveLocalMensaje(nuevoTicket.id, {
      id: "msg-" + Date.now(),
      ticket_id: nuevoTicket.id,
      remitente_nombre: usuarioNombre,
      es_admin: false,
      texto: mensajeInicial,
      creado_en: new Date().toISOString(),
    });
  }

  return nuevoTicket;
}

/**
 * Envía un mensaje a un ticket existente sincronizando con Supabase y persistiendo en tiempo real.
 */
export async function enviarMensaje({
  ticketId,
  texto,
  remitenteNombre = "Ingeanclajes",
  remitenteId = null,
  esAdmin = true,
  adjuntoUrl = null,
}) {
  const ahora = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const tenantId = await getTenantIdActual().catch(() => null);

      if (tenantId) {
        let targetTicketId = await resolverTicketUuid(ticketId);

        // Si aún no es un UUID válido, intentar crearlo o emparejarlo en Supabase
        if (!esUuidValido(targetTicketId)) {
          const { data: ticketsDb } = await supabase
            .from("soporte_tickets")
            .select("id, asunto, usuario_nombre")
            .eq("tenant_id", tenantId)
            .order("actualizado_en", { ascending: false });

          const match = ticketsDb?.find(
            (t) =>
              !esTicketEjemplo(t) &&
              (t.id === ticketId || (t.asunto && t.asunto.toLowerCase() === ticketId.toLowerCase()))
          );

          if (match) {
            targetTicketId = match.id;
          } else {
            const { data: nuevoT } = await supabase
              .from("soporte_tickets")
              .insert([
                {
                  tenant_id: tenantId,
                  asunto: "Conversación de Soporte",
                  obra_nombre: "General",
                  prioridad: "media",
                  estado: "en_curso",
                  usuario_nombre: remitenteNombre,
                  ultimo_mensaje: texto,
                },
              ])
              .select()
              .single();

            if (nuevoT) {
              targetTicketId = nuevoT.id;
            }
          }
        }

        if (esUuidValido(targetTicketId)) {
          // Resolver UUID válido de remitente
          let validRemitenteId = esUuidValido(remitenteId) ? remitenteId.trim() : null;
          if (!validRemitenteId) {
            try {
              const { data: authData } = await supabase.auth.getUser();
              if (authData?.user?.id && esUuidValido(authData.user.id)) {
                validRemitenteId = authData.user.id;
              }
            } catch {
              // sin sesión auth directa
            }
          }

          const { data, error } = await supabase
            .from("soporte_mensajes")
            .insert([
              {
                tenant_id: tenantId,
                ticket_id: targetTicketId,
                remitente_nombre: remitenteNombre,
                remitente_id: validRemitenteId,
                es_admin: Boolean(esAdmin),
                texto,
                adjunto_url: adjuntoUrl,
                creado_en: ahora,
              },
            ])
            .select()
            .single();

          if (!error && data) {
            // Actualizar ticket (el trigger trg_soporte_mensaje_insert también actualiza en DB)
            await supabase
              .from("soporte_tickets")
              .update({
                ultimo_mensaje: texto,
                actualizado_en: ahora,
                ...(esAdmin ? { estado: "en_curso" } : {}),
              })
              .eq("id", targetTicketId);

            // Guardar copia local de respaldo
            saveLocalMensaje(targetTicketId, data);
            emitirMensajeEnviadoLocal(data);
            return data;
          } else if (error) {
            console.warn("Error insertando mensaje en Supabase:", error);
          }
        }
      }
    } catch (e) {
      console.warn("Error enviando mensaje por Supabase, guardando local:", e);
    }
  }

  // Fallback Local
  const nuevoMsg = {
    id: "msg-" + Date.now(),
    ticket_id: ticketId,
    remitente_nombre: remitenteNombre,
    remitente_id: remitenteId,
    es_admin: esAdmin,
    texto,
    adjunto_url: adjuntoUrl,
    creado_en: ahora,
  };

  saveLocalMensaje(ticketId, nuevoMsg);

  // Actualizar ticket local
  const tickets = getLocalTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index !== -1) {
    tickets[index] = {
      ...tickets[index],
      ultimo_mensaje: texto,
      actualizado_en: ahora,
      estado: esAdmin && tickets[index].estado === "pendiente" ? "en_curso" : tickets[index].estado,
    };
    saveLocalTickets(tickets);
  }

  emitirMensajeEnviadoLocal(nuevoMsg);
  return nuevoMsg;
}

export function emitirMensajeEnviadoLocal(mensaje) {
  if (typeof window === "undefined" || !mensaje) return;
  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel("ingeanclajes_canal_mensajes");
      bc.postMessage({ tipo: "nuevo-mensaje", mensaje });
      bc.close();
    }
  } catch {
    // ignore
  }
  window.dispatchEvent(
    new CustomEvent("notificacion-mensaje-recibido", { detail: mensaje })
  );
}

/**
 * Cambia el estado de un ticket ('pendiente' | 'en_curso' | 'resuelto')
 */
export async function cambiarEstadoTicket(ticketId, nuevoEstado) {
  const ahora = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const targetId = await resolverTicketUuid(ticketId);
      if (esUuidValido(targetId)) {
        await supabase
          .from("soporte_tickets")
          .update({ estado: nuevoEstado, actualizado_en: ahora })
          .eq("id", targetId);
      }
    } catch (e) {
      console.warn("Error actualizando estado en Supabase:", e);
    }
  }

  // Actualizar local
  const tickets = getLocalTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index !== -1) {
    tickets[index] = {
      ...tickets[index],
      estado: nuevoEstado,
      actualizado_en: ahora,
    };
    saveLocalTickets(tickets);
  }
}

function iniciarCanalRealtime(targetUuid, onNuevoMensaje) {
  try {
    const supabase = getSupabaseClient();
    const canal = supabase
      .channel(`chat-ticket-${targetUuid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "app",
          table: "soporte_mensajes",
          filter: `ticket_id=eq.${targetUuid}`,
        },
        (payload) => {
          if (payload.new && onNuevoMensaje) {
            onNuevoMensaje(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(canal);
      } catch {
        // ignore
      }
    };
  } catch (e) {
    console.warn("No se pudo iniciar canal Realtime de chat:", e);
    return () => {};
  }
}

/**
 * Suscribe a eventos en tiempo real para un ticket específico.
 */
export function suscribirChatTicket(ticketId, onNuevoMensaje) {
  if (!isSupabaseConfigured() || !ticketId) {
    return () => {};
  }

  if (esUuidValido(ticketId)) {
    return iniciarCanalRealtime(ticketId, onNuevoMensaje);
  }

  let cancelado = false;
  let canalRemover = null;

  resolverTicketUuid(ticketId).then((uuid) => {
    if (!cancelado && esUuidValido(uuid)) {
      canalRemover = iniciarCanalRealtime(uuid, onNuevoMensaje);
    }
  });

  return () => {
    cancelado = true;
    if (canalRemover) canalRemover();
  };
}

