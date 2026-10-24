// Funcion de Cloudflare Pages (/api/ics): entrega un compromiso de la Agenda
// como archivo .ics.
//
// Para Apple Calendar. El boton de Google Calendar solo sirve con una cuenta
// de Google; en el iPhone y el Mac, un enlace que devuelve text/calendar abre
// directamente «Agregar al calendario» en la app Calendario de Apple.
//
// Los datos vienen en la direccion (los arma compromisoAParams). No consulta
// la base ni guarda nada: solo convierte esos datos al formato de calendario,
// escapados y con largo limitado.

import { generarIcsCompromiso, paramsACompromiso, tituloCompromiso } from "../../src/lib/icsCompromiso.js";

const CABECERAS_SEGURIDAD = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

export function onRequest(context) {
  const { request } = context;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Método no permitido.", {
      status: 405,
      headers: {
        ...CABECERAS_SEGURIDAD,
        Allow: "GET, HEAD",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const url = new URL(request.url);
  const compromiso = paramsACompromiso(url.searchParams);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(compromiso.fecha)) {
    return new Response("Falta la fecha del compromiso.", {
      status: 400,
      headers: {
        ...CABECERAS_SEGURIDAD,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const ics = generarIcsCompromiso(compromiso, [], "PUBLISH");
  const nombre = tituloCompromiso(compromiso)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w -]/g, "").trim().slice(0, 60) || "compromiso";

  return new Response(request.method === "HEAD" ? null : ics, {
    status: 200,
    headers: {
      ...CABECERAS_SEGURIDAD,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${nombre}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
