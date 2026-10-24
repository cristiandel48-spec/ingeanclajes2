// Direccion publica de respaldo cuando se genera un enlace externo (QR de
// certificados, recibido firmado o calendario de Apple) desde localhost.
// Si en el futuro se conecta un dominio propio, basta con definir VITE_APP_URL
// o actualizar URL_PRODUCCION aqui.
export const URL_PRODUCCION =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL?.trim()) ||
  "https://ingeanclajes.pages.dev";

export function obtenerOrigenPublico() {
  if (
    typeof window !== "undefined" &&
    window.location?.origin &&
    !/localhost|127\.0\.0\.1/.test(window.location.origin)
  ) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return URL_PRODUCCION.replace(/\/+$/, "");
}
