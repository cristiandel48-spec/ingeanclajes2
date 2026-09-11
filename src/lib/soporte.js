// Servicio de soporte técnico, chat e incidencias en tiempo real.
// Soporta Supabase con fallback automático y persistente a almacenamiento local
// para que funcione inmediatamente aun antes de aplicar la migración SQL.

import { getSupabaseClient, isSupabaseConfigured } from "./backend/supabaseClient";
import { getTenantIdActual } from "./backend/usuarios";

const LOCAL_STORAGE_KEY_TICKETS = "ingeanclajes_soporte_tickets_v1";
const LOCAL_STORAGE_KEY_MENSAJES = "ingeanclajes_soporte_mensajes_v1";

export const TICKETS_SEED = [
  {
    id: "ticket-camila",
    numero: 106,
    usuario_nombre: "Camila Sepúlveda",
    usuario_email: "camilasepulveda@ingeanclajes.com",
    asunto: "Coordinación de pagos, facturas y anticipos",
    obra_nombre: "General / Administración",
    obra_id: null,
    prioridad: "alta",
    estado: "en_curso",
    ultimo_mensaje: "Hola Cristian, ya tengo listos los comprobantes de egreso para revisar.",
    creado_en: new Date(Date.now() - 3600000).toISOString(),
    actualizado_en: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "seed-ticket-104",
    numero: 104,
    usuario_nombre: "Roberto Gómez",
    usuario_email: "rgomez@torrenorte.com",
    asunto: "Fallo anclaje de fachada - Obra Norte",
    obra_nombre: "Torre Norte",
    obra_id: "OB-001",
    prioridad: "alta",
    estado: "en_curso",
    ultimo_mensaje: "Hola Roberto. Sí, hasta 6cm de tolerancia horizontal está contemplado.",
    creado_en: new Date(Date.now() - 3600000 * 2).toISOString(),
    actualizado_en: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: "seed-ticket-105",
    numero: 105,
    usuario_nombre: "María Torres",
    usuario_email: "mtorres@inversionesandes.com",
    asunto: "Duda cotización pernos M16 y tiempos de entrega",
    obra_nombre: "Inversiones Los Andes",
    obra_id: "OB-003",
    prioridad: "media",
    estado: "pendiente",
    ultimo_mensaje: "¿Tienen disponibilidad de 400 unidades de pernos expansivos para este viernes?",
    creado_en: new Date(Date.now() - 3600000).toISOString(),
    actualizado_en: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "seed-ticket-101",
    numero: 101,
    usuario_nombre: "Carlos Ruiz",
    usuario_email: "cruiz@bolivar.com.co",
    asunto: "Certificado de calidad lote B de anclajes químicos",
    obra_nombre: "Constructora Bolívar",
    obra_id: "OB-002",
    prioridad: "baja",
    estado: "resuelto",
    ultimo_mensaje: "Certificado enviado exitosamente al correo de calidad.",
    creado_en: new Date(Date.now() - 86400000 * 2).toISOString(),
    actualizado_en: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MENSAJES_SEED = {
  "ticket-camila": [
    {
      id: "msg-c1",
      ticket_id: "ticket-camila",
      remitente_nombre: "Camila Sepúlveda",
      remitente_id: "camila",
      es_admin: true,
      texto: "Hola Cristian, ¿revisamos el pago del anticipo de la Torre Norte para autorizar la compra de los anclajes?",
      creado_en: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "msg-c2",
      ticket_id: "ticket-camila",
      remitente_nombre: "Cristian Flórez",
      remitente_id: "cristian",
      es_admin: true,
      texto: "Hola Camila, sí. La cotización fue aprobada ayer con el 50% de anticipo. Procedamos con la orden de compra.",
      creado_en: new Date(Date.now() - 2400000).toISOString(),
    },
    {
      id: "msg-c3",
      ticket_id: "ticket-camila",
      remitente_nombre: "Camila Sepúlveda",
      remitente_id: "camila",
      es_admin: true,
      texto: "Perfecto Cristian, ya tengo listos los comprobantes de egreso para revisar.",
      creado_en: new Date(Date.now() - 1800000).toISOString(),
    },
  ],
  "seed-ticket-104": [
    {
      id: "msg-1",
      ticket_id: "seed-ticket-104",
      remitente_nombre: "Roberto Gómez",
      es_admin: false,
      texto: "Hola Ing., estamos instalando los anclajes del nivel 4 en Torre Norte pero el taladro encontró una armadura no prevista en el plano. ¿Podemos desplazar 5cm el anclaje o se requiere recalcular la placa?",
      creado_en: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "msg-2",
      ticket_id: "seed-ticket-104",
      remitente_nombre: "Ingeanclajes Soporte",
      es_admin: true,
      texto: "Hola Roberto. Sí, hasta 6cm de tolerancia horizontal está contemplado en la memoria de cálculo para perno M16 con resina epóxica. Asegúrense de mantener la profundidad de perforación mínima de 120mm.",
      creado_en: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "msg-3",
      ticket_id: "seed-ticket-104",
      remitente_nombre: "Roberto Gómez",
      es_admin: false,
      texto: "Excelente, procedemos con esa indicación. Ya verificamos profundidad y quedó limpia la perforación. Gracias.",
      creado_en: new Date(Date.now() - 600000).toISOString(),
    },
  ],
  "seed-ticket-105": [
    {
      id: "msg-4",
      ticket_id: "seed-ticket-105",
      remitente_nombre: "María Torres",
      es_admin: false,
      texto: "Buenas tardes, ¿tienen disponibilidad de 400 unidades de pernos expansivos para este viernes? Requerimos confirmar antes de emitir la orden.",
      creado_en: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  "seed-ticket-101": [
    {
      id: "msg-5",
      ticket_id: "seed-ticket-101",
      remitente_nombre: "Carlos Ruiz",
      es_admin: false,
      texto: "Buen día. ¿Nos podrían compartir el certificado de calibración y calidad del lote B entregado la semana pasada?",
      creado_en: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "msg-6",
      ticket_id: "seed-ticket-101",
      remitente_nombre: "Ingeanclajes Calidad",
      es_admin: true,
      texto: "Buen día Carlos. Acabamos de adjuntar y enviar el certificado firmado con la trazabilidad del lote al correo registrado.",
      creado_en: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

function getLocalTickets() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_TICKETS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const tieneCamila = parsed.some((t) => t.id === "ticket-camila" || (t.usuario_nombre && t.usuario_nombre.toLowerCase().includes("camila")));
        if (!tieneCamila && TICKETS_SEED[0]) {
          parsed.unshift(TICKETS_SEED[0]);
          saveLocalTickets(parsed);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error leyendo tickets de localStorage:", e);
  }
  return TICKETS_SEED;
}

function saveLocalTickets(tickets) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_TICKETS, JSON.stringify(tickets));
  } catch (e) {
    console.warn("Error guardando tickets en localStorage:", e);
  }
}

function getLocalMensajes(ticketId) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MENSAJES);
    const store = raw ? JSON.parse(raw) : { ...MENSAJES_SEED };
    if (!store[ticketId] && MENSAJES_SEED[ticketId]) {
      store[ticketId] = MENSAJES_SEED[ticketId];
      localStorage.setItem(LOCAL_STORAGE_KEY_MENSAJES, JSON.stringify(store));
    }
    return store[ticketId] || [];
  } catch (e) {
    console.warn("Error leyendo mensajes de localStorage:", e);
    return MENSAJES_SEED[ticketId] || [];
  }
}

function saveLocalMensaje(ticketId, nuevoMensaje) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MENSAJES);
    const store = raw ? JSON.parse(raw) : { ...MENSAJES_SEED };
    if (!store[ticketId]) store[ticketId] = [];
    store[ticketId].push(nuevoMensaje);
    localStorage.setItem(LOCAL_STORAGE_KEY_MENSAJES, JSON.stringify(store));
  } catch (e) {
    console.warn("Error guardando mensaje en localStorage:", e);
  }
}

/**
 * Carga la lista de tickets. Intenta Supabase; si no existe la tabla o falla, usa local.
 */
export async function cargarTickets() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const tenantId = await getTenantIdActual();
      const { data, error } = await supabase
        .from("soporte_tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("actualizado_en", { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.info("Usando almacenamiento local de tickets mientras se aplica la migración:", e.message);
    }
  }
  return getLocalTickets();
}

/**
 * Carga los mensajes de un ticket determinado.
 */
export async function cargarMensajes(ticketId) {
  if (isSupabaseConfigured() && !ticketId.startsWith("seed-")) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("soporte_mensajes")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("creado_en", { ascending: true });

      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn("Fallo cargando mensajes desde Supabase, usando local:", e);
    }
  }
  return getLocalMensajes(ticketId);
}

/**
 * Crea un nuevo ticket de soporte.
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
      const tenantId = await getTenantIdActual();

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
            usuario_id: usuarioId,
            ultimo_mensaje: mensajeInicial,
          },
        ])
        .select()
        .single();

      if (!ticketError && ticketData) {
        nuevoTicket = ticketData;
        if (mensajeInicial) {
          await supabase.from("soporte_mensajes").insert([
            {
              tenant_id: tenantId,
              ticket_id: nuevoTicket.id,
              remitente_nombre: usuarioNombre,
              remitente_id: usuarioId,
              es_admin: false,
              texto: mensajeInicial,
            },
          ]);
        }
        return nuevoTicket;
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
 * Envía un mensaje a un ticket existente.
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

  if (isSupabaseConfigured() && !ticketId.startsWith("seed-") && !ticketId.startsWith("ticket-")) {
    try {
      const supabase = getSupabaseClient();
      const tenantId = await getTenantIdActual();

      const { data, error } = await supabase
        .from("soporte_mensajes")
        .insert([
          {
            tenant_id: tenantId,
            ticket_id: ticketId,
            remitente_nombre: remitenteNombre,
            remitente_id: remitenteId,
            es_admin: esAdmin,
            texto,
            adjunto_url: adjuntoUrl,
            creado_en: ahora,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        // Actualizar ticket
        await supabase
          .from("soporte_tickets")
          .update({
            ultimo_mensaje: texto,
            actualizado_en: ahora,
            ...(esAdmin ? { estado: "en_curso" } : {}),
          })
          .eq("id", ticketId);

        return data;
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
    es_admin: esAdmin,
    texto,
    adjunto_url: adjuntoUrl,
    creado_en: ahora,
  };

  saveLocalMensaje(ticketId, nuevoMsg);

  // Actualizar ultimo mensaje del ticket local
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

  return nuevoMsg;
}

/**
 * Cambia el estado de un ticket ('pendiente' | 'en_curso' | 'resuelto')
 */
export async function cambiarEstadoTicket(ticketId, nuevoEstado) {
  const ahora = new Date().toISOString();

  if (isSupabaseConfigured() && !ticketId.startsWith("seed-") && !ticketId.startsWith("ticket-")) {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from("soporte_tickets")
        .update({ estado: nuevoEstado, actualizado_en: ahora })
        .eq("id", ticketId);
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

/**
 * Suscribe a eventos en tiempo real para un ticket específico.
 */
export function suscribirChatTicket(ticketId, onNuevoMensaje) {
  if (!isSupabaseConfigured() || ticketId.startsWith("seed-") || ticketId.startsWith("ticket-")) {
    return () => {};
  }

  try {
    const supabase = getSupabaseClient();
    const canal = supabase
      .channel(`chat-ticket-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "app",
          table: "soporte_mensajes",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          if (payload.new && onNuevoMensaje) {
            onNuevoMensaje(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  } catch (e) {
    console.warn("No se pudo iniciar canal Realtime de chat:", e);
    return () => {};
  }
}
