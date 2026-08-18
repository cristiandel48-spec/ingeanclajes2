// Los mensajes sueltos que guarda la Edge Function, vistos como conversaciones.
//
// En la base cada fila es UN mensaje entrante con lo que se le respondio. Para
// atender a alguien lo que sirve es el hilo completo de ese telefono, no los
// mensajes desperdigados, asi que se agrupan aqui.
//
// Va aparte de lib/whatsapp.js, que es otra cosa: aquel abre WhatsApp Web con
// un texto escrito para que una persona lo mande a mano -el aviso de turno-, y
// esto es la conversacion que atendio el sistema.

// Como se ve un telefono colombiano que llega de WhatsApp: 573104472219.
export function telefonoLegible(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  const diez = digitos.slice(-10);
  if (diez.length !== 10) return String(valor || "");
  return `${diez.slice(0, 3)} ${diez.slice(3, 6)} ${diez.slice(6)}`;
}

export const ESTADOS_MENSAJE = ["recibido", "procesando", "respondido", "fallido", "ignorado"];

// Un mensaje que llego y no se le pudo contestar es el unico que pide que
// alguien haga algo. Los ignorados -audios, o por encima del tope- ya se
// contestaron o se descartaron a proposito.
export function pideAtencion(mensaje) {
  return mensaje?.estado === "fallido" || mensaje?.estado === "recibido";
}

/**
 * Agrupa los mensajes por telefono. Devuelve las conversaciones de la mas
 * reciente a la menos, y dentro de cada una los mensajes del mas viejo al mas
 * nuevo, que es como se lee una conversacion.
 */
export function agruparEnConversaciones(mensajes = []) {
  const porTelefono = new Map();

  for (const mensaje of Array.isArray(mensajes) ? mensajes : []) {
    if (!mensaje?.telefono) continue;
    const clave = String(mensaje.telefono);
    if (!porTelefono.has(clave)) porTelefono.set(clave, []);
    porTelefono.get(clave).push(mensaje);
  }

  const conversaciones = [];
  for (const [telefono, lista] of porTelefono) {
    const enOrden = [...lista].sort(
      (a, b) => new Date(a.recibido_en) - new Date(b.recibido_en),
    );
    const ultimo = enOrden[enOrden.length - 1];

    conversaciones.push({
      telefono,
      // El nombre del perfil puede venir vacio en unos mensajes y no en otros:
      // se queda el primero que lo traiga.
      nombre: enOrden.find((m) => m.perfil_nombre)?.perfil_nombre || "",
      mensajes: enOrden,
      cuantos: enOrden.length,
      ultimoEn: ultimo?.recibido_en || null,
      ultimoTexto: ultimo?.texto || "",
      estado: ultimo?.estado || "",
      sinAtender: enOrden.some(pideAtencion),
      // Si de esta conversacion salio una cotizacion, se puede ir a verla.
      cotizacionId: enOrden.map((m) => m.cotizacion_id).filter(Boolean).pop() || null,
    });
  }

  return conversaciones.sort(
    (a, b) => new Date(b.ultimoEn || 0) - new Date(a.ultimoEn || 0),
  );
}
