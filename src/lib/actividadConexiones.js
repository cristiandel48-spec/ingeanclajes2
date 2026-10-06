// Gestión unificada de estados de conexión y última actividad de usuarios.
//
// Integra:
// 1. Supabase Realtime Presence (conexiones vivas por WebSocket).
// 2. Caché persistente de últimas conexiones (localStorage y app.empresa_config en la nube).
// 3. Trazabilidad de documentos: coteja la última actividad real en cotizaciones,
//    informes, obras, certificaciones y horarios para garantizar que nunca se reporte
//    desactualizado si el usuario guardó cambios o cotizó hoy.
// 4. Formateo amigable en español de Colombia (ej. "Hoy a las 11:32 a. m.").

import { formatearUltimaConexion } from "./seguridadSesion";
import { detectarDispositivo } from "./backend/presencia";
import { normalizarNombrePersona } from "./autorAuditoria";

export const CLAVE_CACHE_CONEXIONES = "erp_cache_ultimas_conexiones";

/**
 * Lee la memoria local de conexiones.
 */
export function cargarCacheUltimasConexionesLocal() {
  try {
    const raw = localStorage.getItem(CLAVE_CACHE_CONEXIONES);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === "object") return data;
    }
  } catch {}
  return {};
}

/**
 * Guarda en memoria local de conexiones.
 */
export function guardarCacheUltimasConexionesLocal(cache) {
  try {
    if (cache && typeof cache === "object") {
      localStorage.setItem(CLAVE_CACHE_CONEXIONES, JSON.stringify(cache));
    }
  } catch {}
}

/**
 * Extrae ultimasConexiones almacenadas en empresaConfig de la nube.
 */
export function obtenerUltimasConexionesDeEmpresa(empresaConfig) {
  if (!empresaConfig) return {};
  const lista = Array.isArray(empresaConfig) ? empresaConfig : [empresaConfig];
  const row = lista.find((r) => r?.id === "empresa") || lista[0];
  return (
    row?.ultimasConexiones ||
    row?.controlDocumental?.ultimasConexiones ||
    {}
  );
}

/**
 * Combina dos mapas de conexiones tomando la fecha más reciente para cada usuario.
 */
export function mezclarUltimasConexiones(base = {}, novedades = {}) {
  const resultado = { ...base };
  if (!novedades || typeof novedades !== "object") return resultado;

  Object.entries(novedades).forEach(([clave, info]) => {
    if (!info) return;
    const previo = resultado[clave];
    if (!previo) {
      resultado[clave] = { ...info };
      return;
    }

    const tPrevio = previo.onlineAt ? new Date(previo.onlineAt).getTime() : 0;
    const tNuevo = info.onlineAt ? new Date(info.onlineAt).getTime() : 0;

    if (tNuevo >= tPrevio) {
      resultado[clave] = {
        ...previo,
        ...info,
        onlineAt: info.onlineAt || previo.onlineAt,
        dispositivo: info.dispositivo || previo.dispositivo || "Computador",
      };
    }
  });

  return resultado;
}

/**
 * Comprueba si un autor coincide con un usuario dado (por id, email o nombre).
 */
export function esMismoUsuario(identificador, usuario) {
  if (!identificador || !usuario) return false;
  const str = String(identificador).trim().toLowerCase();
  const uId = String(usuario.user_id || usuario.id || "").trim().toLowerCase();
  const uEmail = String(usuario.email || "").trim().toLowerCase();
  const uNombre = String(usuario.nombre || "").trim().toLowerCase();

  if (uId && str === uId) return true;
  if (uEmail && str === uEmail) return true;

  // Comparación por nombre normalizado
  if (uNombre) {
    const normUser = normalizarNombrePersona(uNombre, "").toLowerCase();
    const normTarget = normalizarNombrePersona(str, "").toLowerCase();
    if (normUser && normTarget && (normUser === normTarget || normUser.includes(normTarget) || normTarget.includes(normUser))) {
      return true;
    }
    if (uNombre.includes("camila") && str.includes("camila")) return true;
    if (uNombre.includes("cristian") && str.includes("cristian")) return true;
  }

  return false;
}

/**
 * Inspecciona colecciones (cotizaciones, informes, obras, certs, horarios)
 * para encontrar el timestamp más reciente generado por este usuario.
 */
export function obtenerUltimaActividadDocumentos(usuario, colecciones = {}) {
  if (!usuario) return null;
  const { cotizaciones = [], informes = [], obras = [], certs = [], horarios = [] } = colecciones;

  let maxTs = 0;
  let docEncontrado = null;
  const ahora = Date.now() + 60000; // margen de 1 min

  const procesarItem = (item, coleccionNombre) => {
    if (!item) return;

    const coincideCreador =
      esMismoUsuario(item.creadoPor, usuario) ||
      esMismoUsuario(item.creadoPorNombre, usuario);

    const coincideModificador =
      esMismoUsuario(item.modificadoPor, usuario) ||
      esMismoUsuario(item.modificadoPorNombre, usuario);

    if (!coincideCreador && !coincideModificador) return;

    const fechasCandidatas = [
      coincideModificador ? item.modificadoEn : null,
      coincideModificador ? item.updated_at : null,
      coincideCreador ? item.creadoEn : null,
      coincideCreador ? item.fecha : null,
      coincideCreador ? item.created_at : null,
    ];

    for (const f of fechasCandidatas) {
      if (!f) continue;
      const t = new Date(f).getTime();
      if (!Number.isNaN(t) && t > 0 && t <= ahora && t > maxTs) {
        maxTs = t;
        docEncontrado = {
          fecha: new Date(t).toISOString(),
          coleccion: coleccionNombre,
          id: item.id || item.numero,
        };
      }
    }
  };

  (cotizaciones || []).forEach((c) => procesarItem(c, "cotizacion"));
  (informes || []).forEach((i) => procesarItem(i, "informe"));
  (obras || []).forEach((o) => procesarItem(o, "obra"));
  (certs || []).forEach((c) => procesarItem(c, "certificacion"));
  (horarios || []).forEach((h) => procesarItem(h, "horario"));

  return docEncontrado;
}

/**
 * Resuelve el estado de conexión final y veraz de un usuario combinando:
 * - WebSocket Presence (activa en este instante)
 * - Caché de últimas conexiones (última vez visto en WebSocket)
 * - Actividad en documentos (última vez que guardó o creó algo hoy)
 * - Base de datos PostgreSQL (u.ultima_conexion, u.created_at)
 */
export function resolverEstadoConexionUsuario(usuario, {
  usuariosEnLinea = {},
  ultimasConexiones = {},
  colecciones = {},
  membresiaActual = null,
} = {}) {
  if (!usuario) {
    return {
      estaEnLinea: false,
      esMiUsuario: false,
      dispositivo: "Computador",
      fechaConexionRaw: null,
      textoUltimaConexion: "Sin registro previo",
      etiquetaEstado: "Desconectado · Sin registro previo",
    };
  }

  const uId = usuario.user_id || usuario.id;
  const uEmail = (usuario.email || "").toLowerCase().trim();
  const miUserId = membresiaActual?.user_id;
  const miEmail = (membresiaActual?.email || "").toLowerCase().trim();

  const esMiUsuario = Boolean(
    (miUserId && uId === miUserId) ||
    (miEmail && uEmail && miEmail === uEmail)
  );

  const conexionPresencia =
    usuariosEnLinea?.[uId] ||
    (uEmail && usuariosEnLinea?.[uEmail]) ||
    null;

  const estaEnLinea = esMiUsuario || Boolean(conexionPresencia);

  const cachedInfo =
    ultimasConexiones?.[uId] ||
    (uEmail && ultimasConexiones?.[uEmail]) ||
    null;

  const actividadDoc = obtenerUltimaActividadDocumentos(usuario, colecciones);

  // Determinar dispositivo efectivo
  const dispositivo = esMiUsuario
    ? detectarDispositivo()
    : (conexionPresencia?.dispositivo || cachedInfo?.dispositivo || "Computador");

  // Recolectar timestamps válidos ordenados cronológicamente
  const ahora = Date.now() + 60000;
  const candidatos = [];

  const agregarCandidato = (valor) => {
    if (!valor) return;
    const t = new Date(valor).getTime();
    if (!Number.isNaN(t) && t > 0 && t <= ahora) {
      candidatos.push({ ts: t, iso: new Date(t).toISOString() });
    }
  };

  if (estaEnLinea) {
    agregarCandidato(conexionPresencia?.onlineAt || new Date().toISOString());
  }
  if (cachedInfo?.onlineAt) {
    agregarCandidato(cachedInfo.onlineAt);
  }
  if (actividadDoc?.fecha) {
    agregarCandidato(actividadDoc.fecha);
  }
  if (usuario.ultima_conexion) {
    agregarCandidato(usuario.ultima_conexion);
  }
  if (usuario.created_at) {
    agregarCandidato(usuario.created_at);
  }

  candidatos.sort((a, b) => b.ts - a.ts);
  const fechaConexionRaw = candidatos.length > 0 ? candidatos[0].iso : null;

  const textoUltimaConexion = estaEnLinea
    ? "Conectado ahora"
    : formatearUltimaConexion(fechaConexionRaw);

  const etiquetaEstado = estaEnLinea
    ? `🟢 En línea · ${dispositivo}`
    : `Desconectado · Última vez: ${textoUltimaConexion}`;

  return {
    estaEnLinea,
    esMiUsuario,
    dispositivo,
    fechaConexionRaw,
    textoUltimaConexion,
    etiquetaEstado,
    actividadDoc,
  };
}
