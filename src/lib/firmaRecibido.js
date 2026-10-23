// Firma de recibido del cliente: lo que la aplicacion le pide a la funcion
// «firma-recibido» y a la base (migracion 076).
//
// El equipo envia el documento y ve en que va (enviado, abierto, firmado). El
// cliente abre su enlace sin cuenta, pide un codigo a su correo y firma. Toda
// escritura pasa por la funcion; aqui solo se llama y se lee.

import { getSupabaseClient, isSupabaseConfigured } from "./backend/supabaseClient";
import { getTenantIdActual } from "./backend/usuarios";

const FUNCION = import.meta.env.VITE_SUPABASE_FUNCION_FIRMA || "firma-recibido";

// Las columnas que la aplicacion puede leer. El token del enlace no esta: con
// el cualquiera del equipo podria firmar en nombre del cliente.
const COLUMNAS = [
  "id", "tipo_documento", "documento_id", "documento_numero", "titulo", "cliente",
  "para_email", "para_nombre", "enviado_por_email", "enviado_en", "vence_en",
  "codigo_verificacion", "pdf_ruta", "pdf_sha256", "pdf_nombre", "estado",
  "abierto_en", "abierto_ip", "veces_abierto", "firmado_en", "firmante_nombre",
  "firmante_documento", "firmante_cargo", "firmante_empresa", "firmante_email",
  "firmante_observaciones", "firma_imagen", "firma_ip", "firma_agente",
  "texto_aceptado", "anulado_en", "eventos",
].join(",");

async function invocar(accion, datos = {}) {
  const { data, error } = await getSupabaseClient().functions.invoke(FUNCION, {
    body: { accion, appUrl: window.location.origin, ...datos },
  });
  if (error) {
    // El motivo util viaja en el cuerpo de la respuesta, no en error.message.
    let detalle = "";
    try {
      const cuerpo = await error.context?.clone?.().json();
      detalle = cuerpo?.error || cuerpo?.message || "";
    } catch { /* sin cuerpo JSON */ }
    if (!detalle && /failed to send a request/i.test(error.message)) {
      detalle = `No se pudo contactar la función «${FUNCION}» de Supabase. Revisa tu conexión o que esté publicada.`;
    }
    const fallo = new Error(detalle || error.message || "No se pudo completar la operación.");
    fallo.status = error.context?.status ?? null;
    throw fallo;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── Equipo ───────────────────────────────────────────────────────────────────

/** Envia el PDF al cliente con el enlace de firma. Devuelve { id, enlace }. */
//
// El PDF se sube directo al almacenamiento con un permiso de un solo uso que
// da la funcion, y despues se le pide enviar. Antes viajaba dentro de la
// peticion, y un informe con muchas fotos dejaba a la funcion sin memoria.
export async function enviarParaFirma({ tipo = "informe", documentoId, numero, titulo, cliente, para, paraNombre, mensaje, pdfBlob, pdfNombre }) {
  const tenantId = await getTenantIdActual();
  const { ruta, token } = await invocar("preparar-subida", { tenantId });
  const { error } = await getSupabaseClient().storage
    .from("firmas")
    .uploadToSignedUrl(ruta, token, pdfBlob, { contentType: "application/pdf" });
  if (error) throw new Error(`No se pudo subir el PDF: ${error.message}`);
  return invocar("enviar", { tenantId, tipo, documentoId, numero, titulo, cliente, para, paraNombre, mensaje, pdfNombre, ruta });
}

/** El enlace de un envio pendiente (para WhatsApp). Devuelve el texto. */
export async function enlaceDeEnvioFirma(id) {
  const tenantId = await getTenantIdActual();
  const { enlace } = await invocar("enlace", { tenantId, id });
  return enlace;
}

/** El mensaje de WhatsApp con el enlace de firma, listo para enviar. */
export function mensajeWhatsAppFirma({ nombre = "", numero = "", proyecto = "", enlace }) {
  const saludo = String(nombre || "").trim().split(/\s+/)[0];
  return [
    `${saludo ? `${saludo}, buen día.` : "Buen día."}`,
    "",
    `Le enviamos el informe de actividades ${numero}${proyecto ? ` de ${proyecto}` : ""}. Puede revisarlo y firmar el recibido aquí:`,
    enlace,
    "",
    "Para firmar le llega un código a su correo. Cualquier duda, por aquí estamos.",
    "",
    "Ingeanclajes S.A.S.",
  ].join("\n");
}

export async function anularEnvioFirma(id) {
  const tenantId = await getTenantIdActual();
  return invocar("anular", { tenantId, id });
}

/** Envios de un documento, del mas reciente al mas viejo. */
export async function listarEnviosFirma(tipo, documentoId) {
  if (!isSupabaseConfigured() || !documentoId) return [];
  const { data, error } = await getSupabaseClient()
    .from("firmas_documento")
    .select(COLUMNAS)
    .eq("tipo_documento", tipo)
    .eq("documento_id", documentoId)
    .order("enviado_en", { ascending: false });
  if (error) {
    // Sin la migracion 076 la tabla no existe: no es un fallo de la pantalla.
    if (/does not exist|relation|schema cache/i.test(error.message)) return [];
    throw error;
  }
  return (data || []).map(desdeFila);
}

// Si un documento tiene un envio firmado, ese manda; si no, el mas avanzado.
const PESO_ESTADO = { firmado: 3, abierto: 2, enviado: 1, anulado: 0 };

/** { [documentoId]: estado } de todos los documentos de un tipo. */
export async function listarEstadosFirma(tipo) {
  if (!isSupabaseConfigured()) return {};
  const { data, error } = await getSupabaseClient()
    .from("firmas_documento")
    .select("documento_id, estado")
    .eq("tipo_documento", tipo);
  if (error) {
    if (/does not exist|relation|schema cache/i.test(error.message)) return {};
    throw error;
  }
  const estados = {};
  for (const f of data || []) {
    const actual = estados[f.documento_id];
    if (!actual || PESO_ESTADO[f.estado] > PESO_ESTADO[actual]) estados[f.documento_id] = f.estado;
  }
  return estados;
}

/** El PDF que se envio, tal cual (para armar la copia con la constancia). */
export async function descargarPdfEnviado(ruta) {
  const { data, error } = await getSupabaseClient().storage.from("firmas").download(ruta);
  if (error) throw new Error("No se pudo descargar el PDF enviado.");
  return new Uint8Array(await data.arrayBuffer());
}

// La fila de la base con los nombres que usa la constancia (los mismos que
// devuelve la funcion).
function desdeFila(f) {
  return {
    id: f.id,
    estado: f.estado,
    tipo: f.tipo_documento,
    documentoId: f.documento_id,
    numero: f.documento_numero,
    titulo: f.titulo,
    cliente: f.cliente,
    paraEmail: f.para_email,
    paraNombre: f.para_nombre,
    enviadoEn: f.enviado_en,
    enviadoPor: f.enviado_por_email,
    venceEn: f.vence_en,
    abiertoEn: f.abierto_en,
    abiertoIp: f.abierto_ip,
    vecesAbierto: f.veces_abierto,
    anuladoEn: f.anulado_en,
    firmadoEn: f.firmado_en,
    firmanteNombre: f.firmante_nombre,
    firmanteDocumento: f.firmante_documento,
    firmanteCargo: f.firmante_cargo,
    firmanteEmpresa: f.firmante_empresa,
    firmanteEmail: f.firmante_email,
    firmanteObservaciones: f.firmante_observaciones,
    firmaImagen: f.firma_imagen,
    firmaIp: f.firma_ip,
    firmaAgente: f.firma_agente,
    textoAceptado: f.texto_aceptado,
    pdfRuta: f.pdf_ruta,
    pdfSha256: f.pdf_sha256,
    pdfNombre: f.pdf_nombre,
    codigoVerificacion: f.codigo_verificacion,
    eventos: f.eventos || [],
  };
}

// ── Cliente (pagina publica) ─────────────────────────────────────────────────

export const abrirFirma = (token) => invocar("abrir", { token });
export const pedirCodigoFirma = (token) => invocar("pedir-codigo", { token });
export const firmarRecibido = (token, datos) => invocar("firmar", { token, ...datos });

/** Verificacion publica del QR de la constancia. */
export async function verificarFirma(codigo) {
  if (!isSupabaseConfigured()) return { estado: "error" };
  const { data, error } = await getSupabaseClient().rpc("verificar_firma", { p_codigo: codigo });
  if (error) {
    console.warn("No se pudo verificar la firma:", error.message);
    return { estado: "error" };
  }
  const fila = Array.isArray(data) ? data[0] : data;
  return fila ? { estado: "encontrado", firma: fila } : { estado: "no-encontrado" };
}

// ── Textos ───────────────────────────────────────────────────────────────────

const NOMBRE_TIPO = { informe: "informe de actividades", cotizacion: "cotización", certificado: "certificado" };

/** Lo que el cliente acepta al firmar. Se guarda tal cual en la constancia. */
export function textoDeRecibido({ tipo = "informe", numero = "", titulo = "" } = {}) {
  const que = titulo || NOMBRE_TIPO[tipo] || "documento";
  return `Declaro que recibí de Ingeanclajes S.A.S. el ${que.toLowerCase()} ${numero}`.trim()
    + ", que conozco su contenido y que lo recibo a satisfacción, salvo lo que anoto en observaciones.";
}

// Los tonos son los de StatusPill.
export const ESTADO_FIRMA = {
  enviado: { rotulo: "Enviado, sin abrir", tono: "info" },
  abierto: { rotulo: "Abierto, sin firmar", tono: "aviso" },
  firmado: { rotulo: "Recibido firmado", tono: "exito" },
  anulado: { rotulo: "Anulado", tono: "neutro" },
};

export function enlaceVerificacionFirma(codigo) {
  const origen = typeof window !== "undefined" && !/localhost|127\.0\.0\.1/.test(window.location.origin)
    ? window.location.origin
    : "https://ingeanclajes2.vercel.app";
  return `${origen}/?recibido=${codigo}`;
}
