// Verificacion publica de los certificados por QR.
//
// El QR ya no lleva los datos del certificado: lleva un codigo aleatorio y la
// pagina de verificacion los pide a la base (migracion 062). Lo que se ve al
// escanearlo es lo que esta guardado, no lo que diga la direccion.
//
// Los QR que ya se imprimieron llevan folio y cliente en la direccion. Esos
// se buscan en la base exigiendo que coincidan los dos.

import { getSupabaseClient, isSupabaseConfigured } from "./backend/supabaseClient";

const BASE_PUBLICA = "https://ingeanclajes2.vercel.app";

// 32 caracteres hexadecimales: 128 bits, imposible de adivinar.
export function nuevoCodigoVerificacion() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Direccion que va en el QR. Sin codigo (certificado guardado antes de la
// migracion), se cae al formato viejo con folio y cliente, que la pagina
// tambien comprueba contra la base.
export function enlaceVerificacion(cert) {
  const origen =
    typeof window !== "undefined" && window.location?.origin && !window.location.origin.includes("localhost")
      ? window.location.origin
      : BASE_PUBLICA;
  const params = new URLSearchParams();
  if (cert?.codigoVerificacion) {
    params.set("v", "2");
    params.set("k", cert.codigoVerificacion);
  } else {
    params.set("v", "1");
    params.set("f", cert?.numero || cert?.id || "");
    if (cert?.cliente) params.set("c", cert.cliente);
  }
  return `${origen}/?${params.toString()}`;
}

/**
 * Busca en la base el certificado del QR escaneado.
 * Devuelve { estado: "encontrado", cert } | { estado: "no-encontrado" } | { estado: "error" }.
 */
export async function consultarCertificado(searchParams) {
  if (!isSupabaseConfigured()) return { estado: "error" };
  const slug = import.meta.env.VITE_SUPABASE_TENANT_SLUG;
  const codigo = searchParams.get("k");
  const folio = searchParams.get("f") || searchParams.get("folio");
  const cliente = searchParams.get("c") || searchParams.get("cliente");

  let consulta;
  if (codigo) {
    consulta = getSupabaseClient().rpc("verificar_certificado", { p_slug: slug, p_codigo: codigo });
  } else if (folio && cliente) {
    consulta = getSupabaseClient().rpc("verificar_certificado_folio", {
      p_slug: slug, p_folio: folio, p_cliente: cliente,
    });
  } else {
    return { estado: "no-encontrado" };
  }

  const { data, error } = await consulta;
  if (error) {
    console.warn("No se pudo verificar el certificado:", error.message);
    return { estado: "error" };
  }
  const fila = Array.isArray(data) ? data[0] : data;
  return fila ? { estado: "encontrado", cert: fila } : { estado: "no-encontrado" };
}
