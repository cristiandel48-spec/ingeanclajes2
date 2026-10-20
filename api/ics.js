// Funcion de Vercel: entrega un compromiso de la Agenda como archivo .ics.
//
// Para Apple Calendar. El boton de Google Calendar solo sirve con una cuenta
// de Google; en el iPhone y el Mac, un enlace que devuelve text/calendar abre
// directamente «Agregar al calendario» en la app Calendario de Apple.
//
// Los datos vienen en la direccion (los arma compromisoAParams). No consulta
// la base ni guarda nada: solo convierte esos datos al formato de calendario,
// escapados y con largo limitado.

import { generarIcsCompromiso, paramsACompromiso, tituloCompromiso } from "../src/lib/icsCompromiso.js";

export default function handler(req, res) {
  const compromiso = paramsACompromiso(req.query || {});

  if (!/^\d{4}-\d{2}-\d{2}$/.test(compromiso.fecha)) {
    res.status(400).setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send("Falta la fecha del compromiso.");
    return;
  }

  const ics = generarIcsCompromiso(compromiso, [], "PUBLISH");
  const nombre = tituloCompromiso(compromiso)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^\w -]/g, "").trim().slice(0, 60) || "compromiso";

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="${nombre}.ics"`);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(ics);
}
