// Quien recibe los documentos de una obra (migracion 077).
//
// Es la persona del cliente a la que se le envian los informes para firma de
// recibido: casi siempre el residente o el interventor de esa obra. Se pide
// una vez por obra -antes del primer registro de bitacora-, se copia de la
// cotizacion al aprobarla y se sube al directorio de clientes.

import { normalizarCorreo, normalizarDocumento, normalizarNombrePropio, normalizarRazonSocial } from "./normalizarEntrada";
import { siguienteIdUnico } from "./identificadores";

export function correoValido(valor) {
  return /^[^@\s,;<>]+@[^@\s,;<>]+\.[a-z]{2,}$/i.test(normalizarCorreo(valor));
}

/** Si la obra ya tiene a quien enviarle los informes. */
export const obraTieneQuienRecibe = (obra) => correoValido(obra?.recibeEmail);

function buscarCliente(clientes, obra) {
  const nit = obra?.nit ? normalizarDocumento(obra.nit) : "";
  const nombre = normalizarRazonSocial(obra?.cliente || "");
  return (clientes || []).findIndex((c) =>
    (nit && c.nit && normalizarDocumento(c.nit) === nit) ||
    (nombre && normalizarRazonSocial(c.nombre || "") === nombre)
  );
}

/**
 * La lista de clientes con el correo de quien recibe ya puesto.
 *
 * - Si el cliente no tiene correo, se le pone este (y el contacto, si falta).
 * - Si ya tiene uno distinto, NO se cambia: el de la obra queda en la obra.
 *   Un cliente grande tiene una persona por obra, y pisar el correo general
 *   con el del residente de turno haria mas daño que bien.
 * - Si el cliente no esta en el directorio, se agrega.
 *
 * Devuelve la misma lista si no hay nada que cambiar.
 */
export function clientesConQuienRecibe(clientes, obra, { nombre, email }) {
  const correo = normalizarCorreo(email);
  if (!correoValido(correo) || !obra?.cliente) return clientes;
  const lista = Array.isArray(clientes) ? clientes : [];
  const i = buscarCliente(lista, obra);

  if (i >= 0) {
    const c = lista[i];
    if (normalizarCorreo(c.email)) return lista;
    return lista.map((x, j) => (j === i
      ? { ...x, email: correo, contacto: x.contacto || normalizarNombrePropio(nombre || "") }
      : x));
  }

  return [...lista, {
    id: siguienteIdUnico(lista, "CLI"),
    nombre: normalizarRazonSocial(obra.cliente),
    nit: obra.nit ? normalizarDocumento(obra.nit) : "",
    telefono: obra.tel || "",
    ciudad: obra.ciudad || "",
    direccion: obra.direccion || "",
    contacto: normalizarNombrePropio(nombre || ""),
    email: correo,
    estado: "Activo",
    notas: "",
  }];
}

/**
 * A quien proponer el envio a firma de un informe, en este orden: quien
 * recibe en la obra, el contacto de la cotizacion y el del directorio.
 */
export function destinatarioDeInforme({ obra, cotizacion, clientes }) {
  if (correoValido(obra?.recibeEmail)) {
    return { email: normalizarCorreo(obra.recibeEmail), nombre: obra.recibeNombre || "", origen: "obra" };
  }
  if (correoValido(cotizacion?.contactoEmail)) {
    return { email: normalizarCorreo(cotizacion.contactoEmail), nombre: cotizacion.contacto || "", origen: "cotizacion" };
  }
  const i = obra ? buscarCliente(clientes, obra) : -1;
  const c = i >= 0 ? clientes[i] : null;
  if (correoValido(c?.email)) {
    return { email: normalizarCorreo(c.email), nombre: c.contacto || "", origen: "cliente" };
  }
  return { email: "", nombre: "", origen: "" };
}
