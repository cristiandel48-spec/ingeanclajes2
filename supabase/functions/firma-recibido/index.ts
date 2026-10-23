// Firma de recibido del cliente (migracion 076).
//
// Acciones:
//
//   Con sesion del equipo:
//     enviar        guarda el PDF, le saca la huella y manda el enlace al cliente
//     anular        deja sin efecto un envio que no se ha firmado
//
//   Sin sesion (las usa la pagina publica que abre el cliente con su enlace):
//     abrir         datos del documento y enlace temporal al PDF; registra la apertura
//     pedir-codigo  manda un codigo de 6 digitos al correo al que se envio
//     firmar        comprueba el codigo y guarda la firma
//
// Todo se escribe con la llave de servicio: el navegador nunca toca la tabla.
// La pagina publica solo conoce su token, que es aleatorio de 128 bits.
//
// Desplegar con:  supabase functions deploy firma-recibido
// Usa los mismos secretos SMTP_USUARIO y SMTP_CLAVE que gestionar-usuarios.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const VIGENCIA_CODIGO_MIN = 10;
const MAX_INTENTOS_CODIGO = 5;
const MAX_CODIGOS_POR_ENVIO = 6;
const ESPERA_ENTRE_CODIGOS_S = 60;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_FIRMA_CARACTERES = 400_000;

// ── Utilidades ───────────────────────────────────────────────────────────────

const ORIGENES = (Deno.env.get("ORIGENES_PERMITIDOS") ??
  "https://ingeanclajes2.vercel.app,http://localhost:5173,http://127.0.0.1:5173")
  .split(",").map((o) => o.trim()).filter(Boolean);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function responder(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const error = (mensaje: string, status = 400) => responder({ error: mensaje }, status);

function conOrigenPermitido(manejar: (req: Request) => Response | Promise<Response>) {
  return async (req: Request) => {
    const origen = req.headers.get("origin") ?? "";
    const respuesta = await manejar(req);
    const cabeceras = new Headers(respuesta.headers);
    cabeceras.set("Access-Control-Allow-Origin", ORIGENES.includes(origen) ? origen : ORIGENES[0]);
    cabeceras.set("Vary", "Origin");
    return new Response(respuesta.body, { status: respuesta.status, headers: cabeceras });
  };
}

// Un salto de linea en el asunto permitiria colar cabeceras en el correo.
const linea = (v: unknown, max: number) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const texto = (v: unknown, max: number) => String(v ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);

function escapeHtml(v: string) {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const correoValido = (v: string) => /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/.test(v);
const enmascarar = (correo: string) => correo.replace(/^(.)[^@]*(@.*)$/, "$1***$2");

async function sha256Hex(datos: Uint8Array | string) {
  const bytes = typeof datos === "string" ? new TextEncoder().encode(datos) : datos;
  const huella = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(huella), (b) => b.toString(16).padStart(2, "0")).join("");
}

function codigoSeisDigitos() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(n[0] % 1_000_000).padStart(6, "0");
}

// La IP real llega en la cabecera del proxy de Supabase.
function ipDe(req: Request) {
  return linea(
    req.headers.get("cf-connecting-ip") ||
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0] ||
      req.headers.get("x-real-ip") || "",
    64,
  ) || null;
}
const agenteDe = (req: Request) => linea(req.headers.get("user-agent"), 300) || null;

// El enlace del correo solo puede llevar al propio sistema.
function direccionApp(propuesta: unknown) {
  const fija = String(Deno.env.get("APP_URL") ?? "").trim();
  if (fija) {
    try { return new URL(fija).origin; } catch { /* mal configurada */ }
  }
  try {
    const u = new URL(String(propuesta ?? ""));
    if (ORIGENES.includes(u.origin)) return u.origin;
  } catch { /* no es una direccion */ }
  return ORIGENES[0];
}

const fechaCo = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "long", timeStyle: "short" });

// ── Correo ───────────────────────────────────────────────────────────────────

async function enviarCorreo({ para, asunto, texto: plano, html }: {
  para: string; asunto: string; texto: string; html: string;
}) {
  const usuario = Deno.env.get("SMTP_USUARIO");
  const password = Deno.env.get("SMTP_CLAVE");
  if (!usuario || !password) return { enviado: false, motivo: "Faltan los secretos SMTP_USUARIO y SMTP_CLAVE." };

  const cliente = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_SERVIDOR") ?? "smtp.gmail.com",
      port: Number(Deno.env.get("SMTP_PUERTO") ?? 465),
      tls: true,
      auth: { username: usuario, password },
    },
  });
  try {
    await cliente.send({ from: `Ingeanclajes <${usuario}>`, to: para, subject: asunto, content: plano, html });
    return { enviado: true };
  } catch (fallo) {
    return { enviado: false, motivo: String((fallo as Error)?.message ?? fallo) };
  } finally {
    try { await cliente.close(); } catch { /* ya estaba cerrada */ }
  }
}

function marco(numero: string, cuerpo: string) {
  return '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"></head>'
    + '<body style="margin:0;padding:0;background:#f1f3f4">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f3f4">'
    + '<tr><td align="center" style="padding:22px 12px">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;font-family:Inter,Arial,Helvetica,sans-serif">'
    + '<tr><td style="background:#111111;padding:16px 22px">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td>'
    + '<div style="color:#ffffff;font-size:17px;font-weight:bold">INGEANCLAJES</div>'
    + '<div style="color:#bdbdbd;font-size:8px;letter-spacing:2px;margin-top:2px">ESPECIALISTAS EN ANCLAJES</div>'
    + '</td><td align="right" style="color:#ffffff;font-size:12px">' + escapeHtml(numero) + '</td></tr></table></td></tr>'
    + '<tr><td style="padding:24px 22px;color:#1d1d1f;font-size:14px;line-height:1.6">' + cuerpo + '</td></tr>'
    + '<tr><td style="border-top:1px solid #e8eaed;padding:14px 22px;color:#80868b;font-size:11px;line-height:1.7">'
    + '<strong style="color:#5f6368">Ingeanclajes S.A.S</strong> &middot; NIT 900193965-4<br>'
    + 'Calle 38 Sur # 36 &ndash; 48, Envigado &middot; PBX 448 26 86 &middot; Cel. 315 288 9541'
    + '</td></tr></table></td></tr></table></body></html>';
}

const boton = (href: string, rotulo: string) =>
  `<p style="margin:22px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">${escapeHtml(rotulo)}</a></p>`;

// ── Servidor ─────────────────────────────────────────────────────────────────

const ACCIONES_PUBLICAS = ["abrir", "pedir-codigo", "firmar"];

Deno.serve(conOrigenPermitido(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return error("Método no permitido.", 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const tabla = () => admin.schema("app").from("firmas_documento");

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return error("El cuerpo de la petición no es JSON válido.");
  }
  const accion = String(cuerpo.accion ?? "");
  const ahora = new Date();
  const ip = ipDe(req);
  const agente = agenteDe(req);
  const evento = (nombre: string, detalle: Record<string, unknown> = {}) =>
    ({ evento: nombre, en: ahora.toISOString(), ip, agente, ...detalle });

  try {
    // ── Acciones publicas: el token del enlace es la llave ──────────────────
    if (ACCIONES_PUBLICAS.includes(accion)) {
      const token = linea(cuerpo.token, 64);
      if (!/^[a-f0-9]{32}$/.test(token)) return error("El enlace no es válido.", 404);

      const { data: f, error: errF } = await tabla().select("*").eq("token", token).maybeSingle();
      if (errF) return error(errF.message, 500);
      if (!f) return error("El enlace no es válido.", 404);
      if (f.estado === "anulado") return error("Este envío fue anulado por Ingeanclajes. Pide que te lo envíen de nuevo.", 410);

      const vencido = f.estado !== "firmado" && new Date(f.vence_en) < ahora;
      const eventos = Array.isArray(f.eventos) ? f.eventos.slice(-200) : [];

      if (accion === "abrir") {
        const cambios: Record<string, unknown> = {
          veces_abierto: (f.veces_abierto ?? 0) + 1,
          eventos: [...eventos, evento("abierto")],
        };
        if (!f.abierto_en) Object.assign(cambios, { abierto_en: ahora.toISOString(), abierto_ip: ip, abierto_agente: agente });
        if (f.estado === "enviado") cambios.estado = "abierto";
        const { error: errAbrir } = await tabla().update(cambios).eq("id", f.id);
        if (errAbrir) console.warn("No se pudo registrar la apertura:", errAbrir.message);

        const { data: firmado } = await admin.storage.from("firmas").createSignedUrl(f.pdf_ruta, 60 * 60);
        return responder({
          ok: true,
          vencido,
          documento: {
            tipo: f.tipo_documento,
            numero: f.documento_numero,
            titulo: f.titulo,
            cliente: f.cliente,
            paraNombre: f.para_nombre,
            paraEmail: enmascarar(f.para_email),
            enviadoEn: f.enviado_en,
            venceEn: f.vence_en,
            pdfUrl: firmado?.signedUrl ?? null,
            pdfNombre: f.pdf_nombre,
            pdfSha256: f.pdf_sha256,
          },
          firma: f.estado === "firmado" ? constanciaDe({ ...f, ...cambios }) : null,
        });
      }

      if (f.estado === "firmado") return error("Este documento ya fue firmado.", 409);
      if (vencido) return error("El enlace venció. Pide a Ingeanclajes que te lo envíen de nuevo.", 410);

      if (accion === "pedir-codigo") {
        if ((f.codigos_enviados ?? 0) >= MAX_CODIGOS_POR_ENVIO) {
          return error("Ya se enviaron demasiados códigos para este documento. Comunícate con Ingeanclajes.", 429);
        }
        if (f.codigo_enviado_en && ahora.getTime() - new Date(f.codigo_enviado_en).getTime() < ESPERA_ENTRE_CODIGOS_S * 1000) {
          return error("Espera un minuto antes de pedir otro código.", 429);
        }
        const codigo = codigoSeisDigitos();
        const enviado = await enviarCorreo({
          para: f.para_email,
          asunto: linea(`Código para firmar el recibido ${f.documento_numero ?? ""}`, 200),
          texto: `Tu código para firmar el recibido del documento ${f.documento_numero ?? ""} es: ${codigo}\n\nVence en ${VIGENCIA_CODIGO_MIN} minutos. Si no lo pediste, ignora este correo.`,
          html: marco(f.documento_numero ?? "", `
            <p>Tu código para firmar el recibido de <strong>${escapeHtml(f.titulo ?? "el documento")}</strong> es:</p>
            <p style="font-size:30px;font-weight:bold;letter-spacing:8px;margin:18px 0">${codigo}</p>
            <p style="color:#5f6368;font-size:12px">Vence en ${VIGENCIA_CODIGO_MIN} minutos. Si no lo pediste, ignora este correo.</p>`),
        });
        if (!enviado.enviado) return error(enviado.motivo || "No se pudo enviar el código.", 500);

        const { error: errCodigo } = await tabla().update({
          codigo_hash: await sha256Hex(`${token}:${codigo}`),
          codigo_vence_en: new Date(ahora.getTime() + VIGENCIA_CODIGO_MIN * 60_000).toISOString(),
          codigo_intentos: 0,
          codigos_enviados: (f.codigos_enviados ?? 0) + 1,
          codigo_enviado_en: ahora.toISOString(),
          eventos: [...eventos, evento("codigo-enviado", { a: enmascarar(f.para_email) })],
        }).eq("id", f.id);
        if (errCodigo) return error(errCodigo.message, 500);
        return responder({ ok: true, a: enmascarar(f.para_email), vigenciaMin: VIGENCIA_CODIGO_MIN });
      }

      if (accion === "firmar") {
        const codigo = linea(cuerpo.codigo, 6);
        const nombre = linea(cuerpo.nombre, 120);
        const documento = linea(cuerpo.documento, 30);
        const cargo = linea(cuerpo.cargo, 120);
        const empresa = linea(cuerpo.empresa, 160);
        const observaciones = texto(cuerpo.observaciones, 1500);
        const firmaImagen = String(cuerpo.firmaImagen ?? "");
        const textoAceptado = texto(cuerpo.textoAceptado, 600);

        if (!f.codigo_hash || !f.codigo_vence_en) return error("Primero pide el código que llega a tu correo.");
        if (new Date(f.codigo_vence_en) < ahora) return error("El código venció. Pide uno nuevo.");
        if ((f.codigo_intentos ?? 0) >= MAX_INTENTOS_CODIGO) return error("Demasiados intentos con este código. Pide uno nuevo.", 429);
        if (!/^\d{6}$/.test(codigo) || (await sha256Hex(`${token}:${codigo}`)) !== f.codigo_hash) {
          await tabla().update({
            codigo_intentos: (f.codigo_intentos ?? 0) + 1,
            eventos: [...eventos, evento("codigo-incorrecto")],
          }).eq("id", f.id);
          return error("El código no coincide. Revisa el último correo que te llegó.");
        }
        if (nombre.length < 3) return error("Escribe tu nombre completo.");
        if (!/^[A-Za-z0-9.\- ]{4,30}$/.test(documento)) return error("Escribe tu número de documento.");
        if (cuerpo.acepta !== true) return error("Marca la casilla de recibido para poder firmar.");
        if (!firmaImagen.startsWith("data:image/png;base64,") || firmaImagen.length > MAX_FIRMA_CARACTERES) {
          return error("Dibuja tu firma en el recuadro.");
        }
        if (!textoAceptado) return error("Falta el texto de recibido.");

        const cambios = {
          estado: "firmado",
          firmado_en: ahora.toISOString(),
          firmante_nombre: nombre,
          firmante_documento: documento,
          firmante_cargo: cargo || null,
          firmante_empresa: empresa || null,
          firmante_email: f.para_email,
          firmante_observaciones: observaciones || null,
          firma_imagen: firmaImagen,
          firma_ip: ip,
          firma_agente: agente,
          texto_aceptado: textoAceptado,
          // El codigo es de un solo uso.
          codigo_hash: null,
          eventos: [...eventos, evento("codigo-verificado"), evento("firmado", { nombre })],
        };
        // Solo se firma si sigue sin firmar: dos pestañas a la vez no firman dos veces.
        const { data: guardado, error: errFirma } = await tabla()
          .update(cambios).eq("id", f.id).neq("estado", "firmado").select("*").maybeSingle();
        if (errFirma) return error(errFirma.message, 500);
        if (!guardado) return error("Este documento ya fue firmado.", 409);

        // Avisos. Si alguno falla, la firma ya quedo: solo se registra.
        const appUrl = direccionApp(cuerpo.appUrl);
        const verificar = `${appUrl}/?recibido=${guardado.codigo_verificacion}`;
        const copia = `${appUrl}/?firmar=${token}`;
        const resumen = `
          <p><strong>Documento:</strong> ${escapeHtml(f.titulo ?? "")} (${escapeHtml(f.documento_numero ?? "")})<br>
          <strong>Firmado por:</strong> ${escapeHtml(nombre)} · ${escapeHtml(documento)}${cargo ? " · " + escapeHtml(cargo) : ""}<br>
          <strong>Fecha:</strong> ${escapeHtml(fechaCo(cambios.firmado_en))}</p>
          ${observaciones ? `<p><strong>Observaciones:</strong><br>${escapeHtml(observaciones).replace(/\n/g, "<br>")}</p>` : ""}`;
        const avisos = [
          enviarCorreo({
            para: f.para_email,
            asunto: linea(`Recibido firmado: ${f.titulo ?? ""} ${f.documento_numero ?? ""}`, 200),
            texto: `Quedó registrada tu firma de recibido del documento ${f.documento_numero ?? ""}.\n\nDescarga tu copia con la constancia: ${copia}\nVerificación: ${verificar}`,
            html: marco(f.documento_numero ?? "", `<p>Quedó registrada tu firma de recibido.</p>${resumen}
              ${boton(copia, "Descargar copia firmada")}
              <p style="color:#5f6368;font-size:12px">La constancia se puede verificar en ${escapeHtml(verificar)}</p>`),
          }),
        ];
        if (f.enviado_por_email && correoValido(f.enviado_por_email)) {
          avisos.push(enviarCorreo({
            para: f.enviado_por_email,
            asunto: linea(`El cliente firmó el recibido ${f.documento_numero ?? ""}`, 200),
            texto: `${nombre} firmó el recibido del documento ${f.documento_numero ?? ""}.\nVerificación: ${verificar}`,
            html: marco(f.documento_numero ?? "", `<p>El cliente firmó el recibido.</p>${resumen}${boton(verificar, "Ver la constancia")}`),
          }));
        }
        for (const r of await Promise.all(avisos)) {
          if (!r.enviado) console.warn("No salió un aviso de firma:", r.motivo);
        }

        return responder({ ok: true, firma: constanciaDe(guardado) });
      }
    }

    // ── Acciones del equipo: exigen sesion de un miembro activo ────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const comoUsuario = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: sesion } = await comoUsuario.auth.getUser();
    const quien = sesion?.user;
    if (!quien) return error("Falta la sesión.", 401);

    const tenantId = String(cuerpo.tenantId ?? "");
    if (!tenantId) return error("Falta la empresa.");
    const { data: propia } = await admin.schema("app").from("memberships")
      .select("role, activo").eq("tenant_id", tenantId).eq("user_id", quien.id).maybeSingle();
    if (!propia?.activo) return error("Tu cuenta no tiene acceso activo en esta empresa.", 403);
    if (propia.role === "viewer") return error("Tu rol es de consulta: no puede enviar documentos al cliente.", 403);

    if (accion === "enviar") {
      const tipo = ["informe", "cotizacion", "certificado"].includes(String(cuerpo.tipo)) ? String(cuerpo.tipo) : "informe";
      const documentoId = linea(cuerpo.documentoId, 80);
      const numero = linea(cuerpo.numero, 80) || documentoId;
      const titulo = linea(cuerpo.titulo, 200) || "Documento";
      const cliente = linea(cuerpo.cliente, 200);
      const para = linea(cuerpo.para, 254).toLowerCase();
      const paraNombre = linea(cuerpo.paraNombre, 120);
      const mensaje = texto(cuerpo.mensaje, 3000);
      const pdfNombre = linea(cuerpo.pdfNombre, 140).replace(/[^\p{L}\p{N} _().-]/gu, "") || `${numero}.pdf`;
      const pdfBase64 = String(cuerpo.pdfBase64 ?? "");

      if (!documentoId) return error("Falta el documento.");
      if (!correoValido(para)) return error("El correo del cliente no es válido.");

      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
      } catch {
        return error("El PDF no llegó completo.");
      }
      if (bytes.length > MAX_PDF_BYTES) return error("El PDF pesa más de 20 MB. Quita algunas fotos.");
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return error("El archivo no es un PDF válido.");

      const id = crypto.randomUUID();
      const ruta = `${tenantId}/${id}.pdf`;
      const huella = await sha256Hex(bytes);

      const { error: errSubir } = await admin.storage.from("firmas")
        .upload(ruta, bytes, { contentType: "application/pdf", upsert: false });
      if (errSubir) return error(`No se pudo guardar el PDF: ${errSubir.message}`, 500);

      const { data: fila, error: errFila } = await tabla().insert({
        id,
        tenant_id: tenantId,
        tipo_documento: tipo,
        documento_id: documentoId,
        documento_numero: numero,
        titulo,
        cliente: cliente || null,
        para_email: para,
        para_nombre: paraNombre || null,
        enviado_por: quien.id,
        enviado_por_email: quien.email ?? null,
        pdf_ruta: ruta,
        pdf_sha256: huella,
        pdf_bytes: bytes.length,
        pdf_nombre: pdfNombre.endsWith(".pdf") ? pdfNombre : `${pdfNombre}.pdf`,
        eventos: [evento("enviado", { por: quien.email ?? null, a: para })],
      }).select("id, token, codigo_verificacion").single();
      if (errFila) {
        await admin.storage.from("firmas").remove([ruta]);
        return error(errFila.message, 500);
      }

      const enlace = `${direccionApp(cuerpo.appUrl)}/?firmar=${fila.token}`;
      const saludo = paraNombre ? `${escapeHtml(paraNombre.split(" ")[0])}, buen día.` : "Buen día.";
      const enviado = await enviarCorreo({
        para,
        asunto: linea(`${titulo} ${numero} - firma de recibido - Ingeanclajes`, 200),
        texto: `${paraNombre ? paraNombre.split(" ")[0] + ", buen día." : "Buen día."}\n\n${mensaje || `Le enviamos el ${titulo.toLowerCase()} ${numero}.`}\n\nPara revisarlo y firmar el recibido entre a: ${enlace}\n\nEl enlace vence en 30 días.\n\nCordialmente,\nIngeanclajes S.A.S.`,
        html: marco(numero, `
          <p>${saludo}</p>
          <p>${escapeHtml(mensaje || `Le enviamos el ${titulo.toLowerCase()} ${numero}${cliente ? " de " + cliente : ""}.`).replace(/\n/g, "<br>")}</p>
          <p>Desde el enlace puede revisar el documento y firmar el recibido. Le llegará un código a este correo para confirmar que es usted.</p>
          ${boton(enlace, "Revisar y firmar el recibido")}
          <p style="color:#5f6368;font-size:12px">El enlace vence en 30 días. Si el botón no abre, copie esta dirección: ${escapeHtml(enlace)}</p>
          <p>Cordialmente,<br>Ingeanclajes S.A.S.</p>`),
      });
      if (!enviado.enviado) {
        await tabla().update({ estado: "anulado", anulado_en: ahora.toISOString(), eventos: [evento("correo-fallido", { motivo: enviado.motivo })] }).eq("id", id);
        return error(enviado.motivo || "No se pudo enviar el correo.", 500);
      }

      const { error: errRegistro } = await admin.schema("app").from("correos_enviados").insert({
        tenant_id: tenantId, user_id: quien.id, email_autor: quien.email ?? null,
        para, asunto: `${titulo} ${numero} - firma de recibido`, tipo: "firma-recibido", adjunto: null,
      });
      if (errRegistro) console.warn("No se pudo registrar el correo:", errRegistro.message);

      return responder({ ok: true, id, enlace });
    }

    if (accion === "anular") {
      const id = linea(cuerpo.id, 40);
      const { data: f } = await tabla().select("id, estado, eventos").eq("id", id).eq("tenant_id", tenantId).maybeSingle();
      if (!f) return error("No se encontró el envío.", 404);
      if (f.estado === "firmado") return error("Ya está firmado: no se puede anular.", 409);
      const { error: errAnular } = await tabla().update({
        estado: "anulado",
        anulado_en: ahora.toISOString(),
        anulado_por_email: quien.email ?? null,
        eventos: [...(f.eventos ?? []), evento("anulado", { por: quien.email ?? null })],
      }).eq("id", id);
      if (errAnular) return error(errAnular.message, 500);
      return responder({ ok: true });
    }

    return error("Acción no válida.");
  } catch (fallo) {
    console.error("firma-recibido:", fallo);
    return error("Ocurrió un error inesperado. Intenta de nuevo.", 500);
  }
}));

// Lo que necesita la constancia, con los mismos nombres que usa la aplicacion
// (lib/constanciaRecibido.js).
// deno-lint-ignore no-explicit-any
function constanciaDe(f: any) {
  return {
    tipo: f.tipo_documento,
    numero: f.documento_numero,
    titulo: f.titulo,
    cliente: f.cliente,
    paraEmail: f.para_email,
    enviadoEn: f.enviado_en,
    enviadoPor: f.enviado_por_email,
    abiertoEn: f.abierto_en,
    abiertoIp: f.abierto_ip,
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
    pdfSha256: f.pdf_sha256,
    pdfNombre: f.pdf_nombre,
    codigoVerificacion: f.codigo_verificacion,
    eventos: f.eventos ?? [],
  };
}
