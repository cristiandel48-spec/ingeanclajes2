// Acceso a las cuentas del equipo.
//
// Leer es directo contra la tabla (las politicas RLS dejan ver a los
// companeros de empresa). Crear y modificar pasa por la funcion de borde
// gestionar-usuarios, porque exige la llave de servicio.

import { getSupabaseClient } from "./supabaseClient";
import { resolveTenantId } from "./dataService";

const FUNCION = "gestionar-usuarios";

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
    try {
      const cuerpo = await error.context?.json();
      if (cuerpo?.error) detalle = cuerpo.error;
    } catch { /* la respuesta no era JSON */ }

    if (/not found|does not exist|404/i.test(detalle)) {
      throw new Error(
        "La función «gestionar-usuarios» no está publicada en Supabase. " +
        "Míralo en docs/USUARIOS-Y-PERMISOS.md."
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
