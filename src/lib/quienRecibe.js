// Quien recibe los documentos de una obra (migracion 077).
//
// Es la persona del cliente a la que se le envian los informes para firma de
// recibido: casi siempre el residente o el interventor de esa obra. Se pide
// una vez por obra -antes del primer registro de bitacora-, se copia de la
// cotizacion al aprobarla y se mantiene igual al directorio de clientes, que
// es de donde salen los informes y las certificaciones: si el cliente ya tiene
// contacto, la obra lo toma; si se escribe en la obra, actualiza al cliente.

import { normalizarCorreo, normalizarDocumento, normalizarMayusculas, normalizarNombrePropio, normalizarRazonSocial, normalizarTelefono } from "./normalizarEntrada";
import { siguienteIdUnico } from "./identificadores";

export function correoValido(valor) {
  return /^[^@\s,;<>]+@[^@\s,;<>]+\.[a-z]{2,}$/i.test(normalizarCorreo(valor));
}

/** Si la obra ya tiene a quien enviarle los informes. */
export const obraTieneQuienRecibe = (obra) => correoValido(obra?.recibeEmail);

// La forma juridica se escribe o no segun el dia: la obra decia «INTECKNO» y
// la ficha «INTECKNO S.A.S», y para el programa eran dos clientes distintos.
// Entonces el acta salia sin NIT y sin correo de facturacion teniendolos
// guardados, porque no encontraba la ficha.
const FORMAS_JURIDICAS = new Set(["SAS", "SA", "LTDA", "EU", "SCA", "CIA", "ESP", "BIC", "Y", "E"]);

/** El nombre de una empresa sin puntuacion ni forma juridica: «INTECKNO». */
export function claveRazonSocial(valor) {
  const palabras = normalizarRazonSocial(valor || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  // Se quitan por el final: «CONSTRUCTORA SAS» pierde SAS, pero «SAS» sola
  // -si alguien llamo asi a su empresa- se queda como esta.
  while (palabras.length > 1 && FORMAS_JURIDICAS.has(palabras[palabras.length - 1])) palabras.pop();
  return palabras.join(" ");
}

function buscarCliente(clientes, obra) {
  const lista = clientes || [];
  // 1. El NIT es lo unico que identifica al cliente sin lugar a dudas.
  const nit = obra?.nit ? normalizarDocumento(obra.nit) : "";
  if (nit) {
    const i = lista.findIndex((c) => c?.nit && normalizarDocumento(c.nit) === nit);
    if (i >= 0) return i;
  }
  // 2. El nombre tal como esta escrito.
  const nombre = normalizarRazonSocial(obra?.cliente || "");
  if (nombre) {
    const i = lista.findIndex((c) => normalizarRazonSocial(c?.nombre || "") === nombre);
    if (i >= 0) return i;
  }
  // 3. El nombre sin la forma juridica, que es donde se perdian.
  const clave = claveRazonSocial(obra?.cliente);
  if (clave.length >= 3) {
    const i = lista.findIndex((c) => claveRazonSocial(c?.nombre) === clave);
    if (i >= 0) return i;
  }
  return -1;
}

/** La ficha del directorio de clientes que corresponde a la obra. */
export function clienteDeObra(clientes, obra) {
  const i = obra ? buscarCliente(clientes, obra) : -1;
  return i >= 0 ? clientes[i] : null;
}

/**
 * Quien recibe segun el directorio de clientes: contacto, correo, telefono,
 * documento y cargo de la ficha del cliente.
 */
export function quienRecibeDeCliente(clientes, obra) {
  const c = clienteDeObra(clientes, obra);
  if (!c) return null;
  if (!correoValido(c?.email) && !c?.contacto) return null;
  return {
    nombre: c.contacto || "",
    email: normalizarCorreo(c.email || ""),
    telefono: c.telefono || "",
    documento: c.contactoCedula || c.contacto_cedula || "",
    cargo: c.contactoCargo || c.contacto_cargo || "",
  };
}

/**
 * El directorio de clientes con el contacto que se puso en la obra o en el acta.
 *
 * El directorio es de donde salen los informes y las certificaciones, asi que
 * lo que se escribe en la obra lo actualiza: contacto, cedula, cargo, correo y
 * telefono. Si el cliente no esta en el directorio, se agrega.
 *
 * Devuelve la misma lista si no hay nada que cambiar.
 */
export function clientesConQuienRecibe(clientes, obra, { nombre, email, telefono, documento, cargo } = {}) {
  if (!obra?.cliente) return clientes;
  const lista = Array.isArray(clientes) ? clientes : [];
  const i = buscarCliente(lista, obra);
  const contacto = normalizarNombrePropio(nombre || "");
  const tel = normalizarTelefono(telefono || "");
  const correo = normalizarCorreo(email || "");
  const doc = normalizarDocumento(documento || "");
  const car = normalizarMayusculas(cargo || "");

  if (!correoValido(correo) && !contacto && !doc && !car) return clientes;

  if (i >= 0) {
    const c = lista[i];
    const actualizado = {
      ...c,
      email: correoValido(correo) ? correo : (c.email || ""),
      contacto: contacto || c.contacto || "",
      contactoCedula: doc || c.contactoCedula || c.contacto_cedula || "",
      contactoCargo: car || c.contactoCargo || c.contacto_cargo || "",
      telefono: tel || c.telefono || "",
    };
    if (
      actualizado.email === (c.email || "") &&
      actualizado.contacto === (c.contacto || "") &&
      actualizado.contactoCedula === (c.contactoCedula || c.contacto_cedula || "") &&
      actualizado.contactoCargo === (c.contactoCargo || c.contacto_cargo || "") &&
      actualizado.telefono === (c.telefono || "")
    ) {
      return lista;
    }
    return lista.map((x, j) => (j === i ? actualizado : x));
  }

  return [...lista, {
    id: siguienteIdUnico(lista, "CLI"),
    nombre: normalizarRazonSocial(obra.cliente),
    nit: obra.nit ? normalizarDocumento(obra.nit) : "",
    telefono: tel || obra.tel || "",
    ciudad: obra.ciudad || "",
    direccion: obra.direccion || "",
    contacto,
    contactoCedula: doc,
    contactoCargo: car,
    email: correoValido(correo) ? correo : "",
    estado: "Activo",
    notas: "",
  }];
}

/**
 * Las obras de un cliente con el contacto nuevo de su ficha.
 *
 * Al cambiar el contacto en el directorio, cada obra de ese cliente que tenia
 * el contacto anterior -o ninguno- pasa al nuevo. La que tiene a otra persona
 * puesta a proposito se deja como esta.
 */
export function obrasConContactoDeCliente(obras, anterior, nuevo) {
  const correoNuevo = normalizarCorreo(nuevo?.email);
  if (!correoValido(correoNuevo)) return obras;
  const correoViejo = normalizarCorreo(anterior?.email);
  const nombres = new Set([anterior?.nombre, nuevo?.nombre].map((n) => normalizarRazonSocial(n || "")).filter(Boolean));
  const nit = nuevo?.nit || anterior?.nit ? normalizarDocumento(nuevo?.nit || anterior?.nit) : "";
  let cambio = false;
  const resultado = (obras || []).map((o) => {
    const esDelCliente = (nit && o.nit && normalizarDocumento(o.nit) === nit) || nombres.has(normalizarRazonSocial(o.cliente || ""));
    if (!esDelCliente) return o;
    const actual = normalizarCorreo(o.recibeEmail);
    if (actual && actual !== correoViejo) return o;
    if (actual === correoNuevo && (o.recibeNombre || "") === (nuevo.contacto || o.recibeNombre || "")) return o;
    cambio = true;
    return {
      ...o,
      recibeEmail: correoNuevo,
      recibeNombre: nuevo.contacto || o.recibeNombre || "",
      tel: (!o.tel || o.tel === anterior?.telefono) && nuevo.telefono ? nuevo.telefono : o.tel,
    };
  });
  return cambio ? resultado : obras;
}
/**
 * Celular para mandar la firma por WhatsApp: el de la obra, el de la
 * cotizacion o el del directorio de clientes.
 */
export function celularDeInforme({ obra, cotizacion, clientes }) {
  const i = obra ? buscarCliente(clientes, obra) : -1;
  return String(obra?.tel || cotizacion?.telefono || (i >= 0 ? clientes[i].telefono : "") || "").trim();
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
