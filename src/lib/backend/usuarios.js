// Acceso a las cuentas del equipo.
//
// Leer es directo contra la tabla (las politicas RLS dejan ver a los
// companeros de empresa). Crear y modificar pasa por la funcion de borde
// gestionar-usuarios, porque exige la llave de servicio.

import { getSupabaseClient } from "./supabaseClient";
import { resolveTenantId } from "./dataService";

// Nombre de la funcion de borde. En Supabase, la direccion de una funcion se
// fija al crearla y despues no se puede cambiar: renombrarla en el panel solo
// cambia la etiqueta que se ve, no la URL. Si la funcion quedo publicada con
// otro nombre, se indica aqui con VITE_SUPABASE_FUNCION_USUARIOS en vez de
// tener que borrarla y volverla a crear.
const FUNCION = import.meta.env.VITE_SUPABASE_FUNCION_USUARIOS || "gestionar-usuarios";

export async function getTenantIdActual() {
  const supabase = getSupabaseClient();
  return resolveTenantId(supabase, import.meta.env.VITE_SUPABASE_TENANT_SLUG);
}

// Membresia de quien tiene la sesion abierta: define su rol y a que modulos
// entra. Si no hay sesion o no hay membresia, devuelve null.
export async function getMiMembresia() {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const tenantId = await getTenantIdActual();
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role, nombre, email, modulos, activo")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    email: data.email || user.email || "",
    tenantId,
  };
}

// Que version de los Terminos acepto quien tiene la sesion abierta.
// Devuelve { version, aceptadoEn }, o null si la base todavia no tiene las
// columnas (migracion 061 sin aplicar): en ese caso la pantalla de aceptacion
// no se muestra, porque no habria donde guardar la respuesta y dejaria a
// todos por fuera del sistema.
//
// Recibe el id del usuario y NO llama a supabase.auth: esto se usa al validar
// la sesion, que corre dentro del aviso de cambio de sesion de Supabase, y
// llamar ahi a auth.getUser() deja la sesion trabada para siempre (la
// pantalla de arranque no pasaba de la barra). Tambien tiene un tope de
// tiempo: si la base no contesta, no se bloquea la entrada.
export async function leerAceptacionTerminos(userId) {
  if (!userId) return null;
  const supabase = getSupabaseClient();
  const consulta = supabase
    .from("memberships")
    .select("terminos_version, terminos_aceptados_en")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  const tope = new Promise((resolver) => setTimeout(() => resolver({ data: null, error: { message: "sin respuesta en 8 s" } }), 8000));
  const { data, error } = await Promise.race([consulta, tope]);
  if (error) {
    console.warn("No se pudo leer la aceptacion de terminos:", error.message);
    return null;
  }
  return { version: data?.terminos_version || "", aceptadoEn: data?.terminos_aceptados_en || null };
}

export async function aceptarTerminos(version) {
  const supabase = getSupabaseClient();
  const navegador = typeof navigator !== "undefined" ? navigator.userAgent : null;
  const { data, error } = await supabase.rpc("aceptar_terminos", { p_version: version, p_navegador: navegador });
  if (error) throw error;
  return data;
}

// Apagado remoto del sistema (migracion 067). El estado vive en
// app.estado_sistema y solo lo cambia el dueño, con una funcion de la base
// que mira el correo de la sesion. Mientras esta apagado, la base no entrega
// datos a nadie mas: esto solo sirve para mostrar la pantalla adecuada.
export async function leerBloqueoSistema() {
  const supabase = getSupabaseClient();
  const tenantId = await getTenantIdActual();
  const { data, error } = await supabase
    .from("estado_sistema")
    .select("bloqueado")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) {
    // Sin la migracion 067 todavia no existe la tabla: no hay apagado.
    if (error.code === "PGRST205" || error.code === "42P01") return { bloqueado: false };
    throw error;
  }
  return { bloqueado: Boolean(data?.bloqueado) };
}

export async function cambiarBloqueoSistema(bloqueado) {
  const supabase = getSupabaseClient();
  const tenantId = await getTenantIdActual();
  const { error } = await supabase.rpc("cambiar_bloqueo_sistema", {
    p_tenant: tenantId,
    p_bloqueado: Boolean(bloqueado),
  });
  if (error) throw error;
  return Boolean(bloqueado);
}

export async function listarUsuarios() {
  const supabase = getSupabaseClient();
  const tenantId = await getTenantIdActual();

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role, nombre, email, modulos, activo, created_at, ultima_conexion")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error) {
    // Si la columna ultima_conexion todavía no fue migrada en la base, hace fallback seguro
    if (error.code === "PGRST204" || error.code === "42703" || String(error.message || "").includes("ultima_conexion")) {
      const fallback = await supabase
        .from("memberships")
        .select("user_id, role, nombre, email, modulos, activo, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      if (fallback.error) throw fallback.error;
      return fallback.data ?? [];
    }
    throw error;
  }
  return data ?? [];
}

/**
 * Registra un latido (heartbeat) de actividad del usuario en app.memberships
 */
export async function registrarActividadUsuario() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("registrar_actividad");
    if (error) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          await supabase
            .from("memberships")
            .update({ ultima_conexion: new Date().toISOString() })
            .eq("user_id", authData.user.id);
        }
      } catch {}
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

// Llama a la funcion de borde con la sesion de quien esta usando la app.
async function invocar(accion, datos = {}) {
  const supabase = getSupabaseClient();
  const tenantId = await getTenantIdActual();

  const { data, error } = await supabase.functions.invoke(FUNCION, {
    // appUrl viaja para que el correo de bienvenida traiga el enlace al
    // sistema sin tener que configurar el dominio en ningun lado.
    body: { accion, tenantId, appUrl: window.location.origin, ...datos },
  });

  // Cuando la funcion responde con un codigo de error, supabase-js lo entrega
  // como FunctionsHttpError y el motivo util viene en el cuerpo.
  if (error) {
    let detalle = error.message;
    const estado = error.context?.status ?? null;

    // El motivo util viaja en el CUERPO de la respuesta; error.message solo
    // dice "Edge Function returned a non-2xx status code", que no sirve para
    // nada. El cuerpo se lee una sola vez, asi que se clona antes por si hay
    // que reintentar como texto plano (una excepcion no controlada en la
    // funcion no devuelve JSON).
    const respuesta = error.context;
    if (respuesta && typeof respuesta.clone === "function") {
      try {
        const cuerpo = await respuesta.clone().json();
        // La funcion responde {error}, pero el portal de Supabase rechaza
        // antes con {message, code}. Mirar solo "error" dejaba esos rechazos
        // sin explicacion.
        const motivo = cuerpo?.error || cuerpo?.message || cuerpo?.msg;
        if (motivo) detalle = cuerpo?.code ? `${motivo} [${cuerpo.code}]` : motivo;
      } catch {
        try {
          const texto = (await respuesta.clone().text()).trim();
          if (texto) detalle = texto.slice(0, 300);
        } catch { /* el cuerpo ya no se puede leer */ }
      }
    }

    // Sin el codigo no hay forma de saber si fue permisos, sesion o un fallo
    // interno, y el mensaje solo se ve en pantalla.
    if (estado && !/\(\d{3}\)$/.test(detalle)) detalle = `${detalle} (${estado})`;

    // supabase-js no distingue "la funcion no existe" de "no hubo red": las
    // dos llegan como "Failed to send a request to the Edge Function". Como en
    // la practica casi siempre es lo primero, se explica lo que hay que hacer
    // en vez de dejar el mensaje original en ingles.
    const noLlego = /failed to send a request/i.test(detalle);
    if (estado === 404 || noLlego || /not found|does not exist/i.test(detalle)) {
      throw new Error(
        "No se pudo contactar la función «" + FUNCION + "» de Supabase. " +
        "Suele ser porque todavía no está publicada: revisa que aparezca con ese " +
        "nombre exacto en Supabase → Edge Functions, y que la URL que aparece " +
        "ahí termine igual (el nombre visible y la dirección son distintos). " +
        "Los pasos están en " +
        "docs/USUARIOS-Y-PERMISOS.md. Si ya está publicada, revisa tu conexión."
      );
    }
    throw new Error(detalle);
  }

  if (data?.error) throw new Error(data.error);
  return data;
}

// Enviar una cotización al cliente no es administrar usuarios, pero comparte
// la misma función porque necesita las credenciales del correo de la empresa,
// que solo viven en el servidor. La función deja hacerlo a cualquier miembro
// activo, no solo a un administrador.
export const enviarCotizacionPorCorreo = (datos) => invocar("enviar-cotizacion", datos);
export const enviarColillaPorCorreo = (datos) => invocar("enviar-cotizacion", datos);

export const crearUsuario = (datos) => invocar("crear", datos);
export const actualizarUsuario = (datos) => invocar("actualizar", datos);
export const desactivarUsuario = (userId) => invocar("desactivar", { userId });
export const reactivarUsuario = (userId) => invocar("reactivar", { userId });
export const eliminarUsuario = (userId) => invocar("eliminar", { userId });
export const cambiarClave = (userId, clave, extra = {}) =>
  invocar("clave", { userId, clave, ...extra });
