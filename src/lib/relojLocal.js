// La sesion de Supabase vence segun el reloj del computador, no el del
// servidor. Con la fecha u hora adelantada, la libreria da la sesion por
// vencida apenas se abre, las consultas salen sin usuario y la app termina
// diciendo «Tu cuenta no tiene acceso» aunque la cuenta este bien. Aqui se
// mide cuanto se aparta el reloj local para poder decirlo claramente.

// Por debajo de esto no se avisa: unos minutos de diferencia no rompen nada.
export const DESFASE_TOLERADO_MS = 5 * 60 * 1000;

// Devuelve (hora del servidor - hora local) en milisegundos, o null si no se
// pudo medir. La hora del servidor sale del encabezado Date de una peticion a
// la propia pagina: es del mismo origen, asi que el navegador deja leerlo.
export async function medirDesfaseReloj() {
  try {
    const antes = Date.now();
    const respuesta = await fetch(`${window.location.origin}/?reloj=${antes}`, {
      method: "HEAD",
      cache: "no-store",
    });
    const despues = Date.now();
    const fechaServidor = Date.parse(respuesta.headers.get("date") || "");
    if (Number.isNaN(fechaServidor)) return null;
    // El encabezado solo trae segundos; se compara contra la mitad del viaje.
    return fechaServidor - (antes + despues) / 2;
  } catch {
    // Sin red o sin encabezado: no se avisa nada antes que avisar mal.
    return null;
  }
}

export function relojDesfasado(desfaseMs) {
  return desfaseMs != null && Math.abs(desfaseMs) > DESFASE_TOLERADO_MS;
}
