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

export async function listarUsuarios() {
  const supabase = getSupabaseClient();
  const tenantId = await getTenantIdActual();

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role, nombre, email, modulos, activo, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Llama a la funcion de borde con la sesion de quien esta usando la app.
async function invocar(accion, datos = {}) {
  const supabase = getSupabaseClient();
  const tenantId = await getTenantIdActual();

  const { data, error } = await supabase.functions.invoke(FUNCION, {
    body: { accion, tenantId, ...datos },
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
        if (cuerpo?.error) detalle = cuerpo.error;
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

export const crearUsuario = (datos) => invocar("crear", datos);
export const actualizarUsuario = (datos) => invocar("actualizar", datos);
export const desactivarUsuario = (userId) => invocar("desactivar", { userId });
export const reactivarUsuario = (userId) => invocar("reactivar", { userId });
export const eliminarUsuario = (userId) => invocar("eliminar", { userId });
export const cambiarClave = (userId, clave) => invocar("clave", { userId, clave });
