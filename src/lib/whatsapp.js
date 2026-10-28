// Envío de mensajes por WhatsApp con el enlace wa.me: abre WhatsApp Web en el
// computador o la aplicación en el celular, con el texto ya escrito. La persona
// revisa y pulsa enviar; no se manda nada sola.

// wa.me exige el número en dígitos puros y con indicativo de país. La gente lo
// escribe como quiere -"+57 311 745 4736", "311-745-4736", "57 3117454736"- y
// antes eso producía direcciones rotas como wa.me/57+57 311 745 4736.
export function normalizarCelular(valor, indicativo = "57") {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  if (!digitos) return "";

  // Ya viene con el indicativo del país.
  if (digitos.startsWith(indicativo) && digitos.length === indicativo.length + 10) {
    return digitos;
  }
  // Celular colombiano suelto: 10 dígitos que empiezan por 3.
  if (digitos.length === 10) return indicativo + digitos;
  // Otro país o formato largo: se respeta lo que escribieron.
  if (digitos.length > 10) return digitos;

  // Menos de 10 dígitos no es un celular; mejor avisar que abrir algo roto.
  return "";
}

export function urlWhatsApp(numero, mensaje) {
  const tel = normalizarCelular(numero);
  if (!tel) return null;
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Como urlWhatsApp, pero sin celular NO devuelve null: abre WhatsApp con el
 * mensaje escrito para que la persona elija a quien mandarselo.
 *
 * Es lo que hace falta al enviar un documento a firma: muchas veces la obra
 * no tiene el celular guardado y aun asi se quiere mandar el enlace.
 */
export function urlWhatsAppOElegirContacto(numero, mensaje) {
  return urlWhatsApp(numero, mensaje)
    || `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
}

// Devuelve el motivo si no se pudo abrir, o null si todo bien.
export function abrirWhatsApp(numero, mensaje) {
  const url = urlWhatsApp(numero, mensaje);
  if (!url) {
    return String(numero ?? "").trim()
      ? `El número "${numero}" no parece un celular válido.`
      : "Esta persona no tiene celular registrado.";
  }
  window.open(url, "_blank", "noopener");
  return null;
}
