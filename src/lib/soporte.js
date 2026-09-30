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

let ticketsMemoriaCache = [];

/**
 * Normaliza cadenas para comparaciones seguras de nombres o correos sin tildes ni mayúsculas
 */
function normalizar(val) {
  return (val || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Extrae metadatos del creador y restaura la obra original de manera compatible
 */
export function parsearTicket(t) {
  if (!t) return null;
  let creadorId = t.creador_id || null;
  let creadorEmail = t.creador_email || null;
  let creadorNombre = t.creador_nombre || null;
  let obraRealId = t.obra_id || null;

  if (t.obra_id && typeof t.obra_id === "string") {
    if (t.obra_id.startsWith("meta:")) {
      try {
        const meta = JSON.parse(t.obra_id.slice(5));
        creadorId = meta.cId || meta.creadorId || creadorId;
        creadorEmail = meta.cEmail || meta.creadorEmail || creadorEmail;
        creadorNombre = meta.cNom || meta.creadorNombre || creadorNombre;
        obraRealId = meta.obraOriginal || meta.obraId || null;
      } catch {
        // no era JSON
      }
    } else if (t.obra_id.startsWith("{") && t.obra_id.endsWith("}")) {
      try {
        const meta = JSON.parse(t.obra_id);
        creadorId = meta.cId || meta.creadorId || creadorId;
        creadorEmail = meta.cEmail || meta.creadorEmail || creadorEmail;
        creadorNombre = meta.cNom || meta.creadorNombre || creadorNombre;
        obraRealId = meta.obraOriginal || meta.obraId || null;
      } catch {
        // no era JSON
      }
    }
  }

  return {
    ...t,
    obra_id: obraRealId,
    creador_id: creadorId,
    creador_email: creadorEmail,
    creador_nombre: creadorNombre,
  };
}

/**
 * Determina con estricta confidencialidad si un chat/ticket es visible para el usuario actual.
 * Cada chat 1 a 1 solo es visible para su creador y su destinatario.
 */
export function esTicketVisibleParaUsuario(ticket, membresia) {
  if (!ticket) return false;
  if (esTicketEjemplo(ticket)) return false;
  if (!membresia) return false;

  const miId = normalizar(membresia.user_id || membresia.userId || membresia.id);
  const miEmail = normalizar(membresia.email);
  const miNombre = normalizar(membresia.nombre);

  // Datos del destinatario (a quién va dirigido el ticket)
  const destId = normalizar(ticket.usuario_id);
  const destEmail = normalizar(ticket.usuario_email);
  const destNombre = normalizar(ticket.usuario_nombre);

  // 1. ¿Soy el destinatario?
  const soyDestinatario = Boolean(
    (miId && destId && miId === destId) ||
    (miEmail && destEmail && miEmail === destEmail) ||
    (miNombre && destNombre && (miNombre === destNombre || destNombre.includes(miNombre) || miNombre.includes(destNombre))) ||
    (destId === "camila" && (miEmail.includes("camila") || miNombre.includes("camila"))) ||
    (destId === "cristian" && (miEmail.includes("cristian") || miNombre.includes("cristian")))
  );

  if (soyDestinatario) return true;

  // Datos del creador (quién inició la conversación)
  const creadorId = normalizar(ticket.creador_id);
  const creadorEmail = normalizar(ticket.creador_email);
  const creadorNombre = normalizar(ticket.creador_nombre);

  // 2. ¿Soy el creador del ticket?
  const soyCreador = Boolean(
    (miId && creadorId && miId === creadorId) ||
    (miEmail && creadorEmail && miEmail === creadorEmail) ||
    (miNombre && creadorNombre && (miNombre === creadorNombre || creadorNombre.includes(miNombre) || miNombre.includes(creadorNombre))) ||
    (creadorId === "cristian" && (miEmail.includes("cristian") || miNombre.includes("cristian"))) ||
    (creadorId === "camila" && (miEmail.includes("camila") || miNombre.includes("camila")))
  );

  if (soyCreador) return true;

  // 3. Canal de Soporte General
  const esSoporteGeneral = destId === "soporte" || destNombre.includes("soporte") || destEmail.includes("soporte");
  if (esSoporteGeneral && (membresia.role === "admin" || miEmail.includes("cristian"))) {
    return true;
  }

  // 4. Compatibilidad con tickets legacy previos a la migración
  const esCristianActual = miEmail.includes("cristian") || miNombre.includes("cristian") || miEmail === "cristiandel48@gmail.com";
  if (esCristianActual && !creadorEmail && !creadorId) {
    // Cristian fue quien inició los tickets previos como administrador
    return true;
  }

  // En cualquier otro caso, este chat es confidencial entre sus dos participantes y NO debe mostrarse
  return false;
}

/**
 * Obtiene el nombre del interlocutor con quien está hablando el usuario actual
 */
export function obtenerNombreInterlocutor(ticket, membresia) {
  if (!ticket) return "Usuario";
  const miEmail = normalizar(membresia?.email);
  const miNombre = normalizar(membresia?.nombre);
  const miId = normalizar(membresia?.user_id || membresia?.userId || membresia?.id);

  const destNombre = ticket.usuario_nombre || "Usuario";
  const destEmail = normalizar(ticket.usuario_email);
  const destId = normalizar(ticket.usuario_id);

  const creadorNombre = ticket.creador_nombre || "Cristian Flórez";
  const creadorEmail = normalizar(ticket.creador_email);
  const creadorId = normalizar(ticket.creador_id);

  // Si yo soy el destinatario, mi interlocutor es el creador
  const soyDestinatario = Boolean(
    (miId && destId && miId === destId) ||
    (miEmail && destEmail && miEmail === destEmail) ||
    (miNombre && destNombre && (miNombre === destNombre || normalizar(destNombre).includes(miNombre) || miNombre.includes(normalizar(destNombre)))) ||
    (destId === "camila" && (miEmail.includes("camila") || miNombre.includes("camila")))
  );

  if (soyDestinatario) {
    return creadorNombre;
  }

  return destNombre;
}

function getLocalTickets() {
  try {
    limpiarStorageEjemplos();
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_TICKETS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((t) => !esTicketEjemplo(t)).map(parsearTicket);
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
          const reales = data.filter((t) => !esTicketEjemplo(t)).map(parsearTicket);

          if (reales.length === 0) {
            // Si la base de datos está completamente vacía (limpiada por SQL),
            // limpiamos la memoria y storage local para reflejar la bandeja vacía inmediatamente.
            try {
              localStorage.removeItem(LOCAL_STORAGE_KEY_TICKETS);
              localStorage.removeItem(LOCAL_STORAGE_KEY_MENSAJES);
            } catch {}
            ticketsMemoriaCache = [];
            return [];
          }

          saveLocalTickets(reales);
          ticketsMemoriaCache = reales;
          return reales;
        }
      }
    } catch (e) {
      console.info("Usando almacenamiento local de tickets mientras se sincroniza con Supabase:", e.message);
    }
  }
  const locales = getLocalTickets();
  ticketsMemoriaCache = locales;
  return locales;
}

/**
 * Obtiene un ticket por su ID buscando en caché en memoria, almacenamiento o Supabase
 */
export async function obtenerTicketPorId(ticketId) {
  if (!ticketId) return null;
  const enCache = ticketsMemoriaCache.find((t) => t.id === ticketId);
  if (enCache) return enCache;

  const tickets = await cargarTickets();
  const match = tickets.find((t) => t.id === ticketId);
  if (match) return match;

  if (isSupabaseConfigured() && esUuidValido(ticketId)) {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("soporte_tickets")
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();
      if (data) return parsearTicket(data);
    } catch {
      // ignore
    }
  }
  return null;
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
 * Crea un nuevo ticket de soporte garantizando tipos UUID válidos y metadatos de autor.
 */
export async function crearTicket({
  asunto,
  obraNombre = "",
  obraId = null,
  prioridad = "media",
  usuarioNombre = "Usuario",
  usuarioEmail = "",
  usuarioId = null,
  creadorNombre = null,
  creadorId = null,
  creadorEmail = null,
  mensajeInicial = "",
}) {
  let nuevoTicket = null;

  // Empaquetar metadatos del creador en obra_id para que no dependa de nuevas columnas en la BD
  const metaCreador = {
    cId: creadorId || null,
    cEmail: creadorEmail || null,
    cNom: creadorNombre || null,
    obraOriginal: obraId || null,
  };
  const obraIdConMeta = `meta:${JSON.stringify(metaCreador)}`;

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
              obra_id: obraIdConMeta,
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
          nuevoTicket = parsearTicket(ticketData);
          nuevoTicket.creador_id = creadorId;
          nuevoTicket.creador_email = creadorEmail;
          nuevoTicket.creador_nombre = creadorNombre;

          if (mensajeInicial) {
            let remitenteUuid = esUuidValido(creadorId) ? creadorId.trim() : null;
            if (!remitenteUuid) {
              const { data: authData } = await supabase.auth.getUser().catch(() => ({}));
              if (authData?.user?.id && esUuidValido(authData.user.id)) {
                remitenteUuid = authData.user.id;
              }
            }

            const { data: msgData } = await supabase.from("soporte_mensajes").insert([
              {
                tenant_id: tenantId,
                ticket_id: nuevoTicket.id,
                remitente_nombre: creadorNombre || "Cristian Flórez",
                remitente_id: remitenteUuid,
                es_admin: true,
                texto: mensajeInicial,
              },
            ]).select().single();

            if (msgData) {
              saveLocalMensaje(nuevoTicket.id, msgData);
              emitirMensajeEnviadoLocal(msgData);
            }
          }

          // Mantener copia local actualizada y memoria cache
          const ticketsLocales = getLocalTickets().filter((t) => t.id !== nuevoTicket.id);
          saveLocalTickets([nuevoTicket, ...ticketsLocales]);
          ticketsMemoriaCache = [nuevoTicket, ...ticketsMemoriaCache.filter((t) => t.id !== nuevoTicket.id)];

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
    creador_id: creadorId,
    creador_email: creadorEmail,
    creador_nombre: creadorNombre,
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
  ticketsMemoriaCache = [nuevoTicket, ...ticketsMemoriaCache.filter((t) => t.id !== nuevoTicket.id)];

  if (mensajeInicial) {
    const msgLocal = {
      id: "msg-" + Date.now(),
      ticket_id: nuevoTicket.id,
      remitente_nombre: creadorNombre || "Cristian Flórez",
      remitente_id: creadorId || null,
      es_admin: true,
      texto: mensajeInicial,
      creado_en: new Date().toISOString(),
    };
    saveLocalMensaje(nuevoTicket.id, msgLocal);
    emitirMensajeEnviadoLocal(msgLocal);
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
  const msgConMarca = { ...mensaje, _enviadoPorMi: true };
  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel("ingeanclajes_canal_mensajes");
      bc.postMessage({ tipo: "nuevo-mensaje", mensaje: msgConMarca });
      bc.close();
    }
  } catch {
    // ignore
  }
  window.dispatchEvent(
    new CustomEvent("notificacion-mensaje-recibido", { detail: msgConMarca })
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

/**
 * Elimina una conversación y sus mensajes asociados tanto en Supabase como localmente.
 * Notifica a través de CustomEvent y BroadcastChannel para refrescar la interfaz al instante.
 */
export async function eliminarTicket(ticketId) {
  if (!ticketId) return false;

  let targetUuid = ticketId;
  if (isSupabaseConfigured()) {
    try {
      const resUuid = await resolverTicketUuid(ticketId);
      if (esUuidValido(resUuid)) {
        targetUuid = resUuid;
      }
      const supabase = getSupabaseClient();
      if (esUuidValido(targetUuid)) {
        // Eliminar mensajes asociados primero
        await supabase
          .from("soporte_mensajes")
          .delete()
          .eq("ticket_id", targetUuid);

        // Eliminar el ticket
        const { error } = await supabase
          .from("soporte_tickets")
          .delete()
          .eq("id", targetUuid);

        if (error) {
          console.warn("Aviso al eliminar ticket en Supabase:", error);
        }
      }
    } catch (e) {
      console.warn("Fallo eliminando ticket en Supabase:", e);
    }
  }

  // Limpiar del almacenamiento local (localStorage)
  try {
    const rawT = localStorage.getItem(LOCAL_STORAGE_KEY_TICKETS);
    if (rawT) {
      const parsed = JSON.parse(rawT);
      if (Array.isArray(parsed)) {
        const limpios = parsed.filter(
          (t) => t.id !== ticketId && t.id !== targetUuid
        );
        localStorage.setItem(LOCAL_STORAGE_KEY_TICKETS, JSON.stringify(limpios));
      }
    }

    const rawM = localStorage.getItem(LOCAL_STORAGE_KEY_MENSAJES);
    if (rawM) {
      const store = JSON.parse(rawM);
      delete store[ticketId];
      if (targetUuid && targetUuid !== ticketId) {
        delete store[targetUuid];
      }
      localStorage.setItem(LOCAL_STORAGE_KEY_MENSAJES, JSON.stringify(store));
    }
  } catch (e) {
    console.warn("Error limpiando ticket de localStorage:", e);
  }

  // Actualizar caché en memoria
  ticketsMemoriaCache = ticketsMemoriaCache.filter(
    (t) => t.id !== ticketId && t.id !== targetUuid
  );

  // Emitir eventos para que todas las pestañas y vistas se actualicen al instante
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("notificacion-ticket-eliminado", {
          detail: { ticketId, targetUuid },
        })
      );

      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("ingeanclajes_canal_mensajes");
        bc.postMessage({ tipo: "ticket-eliminado", ticketId, targetUuid });
        bc.close();
      }
    }
  } catch {
    // silencioso
  }

  return true;
}

/**
 * Limpia totalmente cualquier conversación y mensaje local de prueba o historial
 */
export function limpiarTodoSoporteLocal() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_TICKETS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_MENSAJES);
    localStorage.removeItem("ingeanclajes_soporte_tickets_v1");
    localStorage.removeItem("ingeanclajes_soporte_mensajes_v1");
    ticketsMemoriaCache = [];
  } catch {
    // silencioso
  }
}


