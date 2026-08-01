// Correo de confirmación que sale al aprobar una cotización.
//
// Va solo, sin diálogo ni pasos extra: aprobar ya es la decisión, y volver a
// preguntar "¿mandamos el correo?" sobra.
//
// No lleva adjunto: el cliente ya recibió la cotización antes. Esto es el
// acuse de que quedó aceptada y de qué sigue.

import { asuntoSeguro } from "./asuntoCorreo";
import { comoFrase, comoNombre, primerNombre } from "./texto";
import { fmt } from "./format";

export function asuntoAprobacion(c) {
  return asuntoSeguro(
    [`Cotizacion ${c?.numero || ""} aprobada`.trim(), "Ingeanclajes"].filter(Boolean).join(" - ")
  );
}

export function mensajeAprobacion(c, { obraId } = {}) {
  const saludo = primerNombre(c?.contacto);
  const obra = comoNombre(c?.obra || "");

  return [
    saludo ? `${saludo}, buen día.` : "Buen día.",
    "",
    `Confirmamos la aprobación de la cotización ${c?.numero || ""}` +
      (obra ? ` para ${obra}` : "") +
      (c?.total ? `, por un valor de ${fmt(c.total)}.` : "."),
    "",
    "Gracias por la confianza. Ya abrimos la orden de trabajo y nos ponemos en marcha.",
    ...(obraId ? ["", `Número de obra: ${obraId}. Con él puede consultarnos el avance en cualquier momento.`] : []),
    ...(c?.tiempoEjec ? ["", `Tiempo de ejecución estimado: ${comoFrase(c.tiempoEjec)}.`] : []),
    ...(c?.formaPago ? ["", `Forma de pago acordada: ${comoFrase(c.formaPago)}.`] : []),
    "",
    "Nos comunicaremos para coordinar la fecha de inicio y los permisos de ingreso.",
    "",
    "Cordialmente,",
    "Ingeanclajes S.A.S.",
  ].join("\n");
}
