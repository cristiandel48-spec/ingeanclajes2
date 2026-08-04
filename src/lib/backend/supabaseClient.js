import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let cached = null;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu .env."
    );
  }

  if (cached) return cached;

  cached = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: "app" },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cached;
}

// Con la app abierta en varias pestañas, todas intentan renovar el mismo
// token de sesion a la vez. La libreria las coordina con un cerrojo del
// navegador, y cuando una le quita el turno a otra lanza:
//
//   Lock "lock:sb-...-auth-token" was released because another request stole it
//
// No es un fallo de verdad -la otra pestaña hizo el trabajo- pero llegaba
// hasta la pantalla como "Sin conexion", y la app se bloqueaba entera.
export function esChoqueEntrePestanas(error) {
  const texto = String(error?.message || error || "").toLowerCase();
  return texto.includes("lock:sb-") ||
    (texto.includes("lock") && texto.includes("stole it"));
}

/**
 * Reintenta cuando el fallo es solo el cerrojo entre pestañas. Se espera un
 * poco entre intentos: lo que hay que dejar es que la otra pestaña termine.
 */
export async function reintentandoSiChocanPestanas(tarea, intentos = 3) {
  let ultimo;
  for (let i = 0; i < intentos; i += 1) {
    try {
      return await tarea();
    } catch (error) {
      if (!esChoqueEntrePestanas(error)) throw error;
      ultimo = error;
      await new Promise((seguir) => setTimeout(seguir, 250 * (i + 1)));
    }
  }
  throw ultimo;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSessionUser() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}
