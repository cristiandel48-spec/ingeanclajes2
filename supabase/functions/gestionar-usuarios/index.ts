// Crear y administrar las cuentas del equipo desde la propia aplicacion.
//
// Crear un usuario de Supabase exige la llave de servicio, que jamas puede
// viajar al navegador. Por eso vive aqui: el navegador llama a esta funcion
// con su sesion normal, y la funcion comprueba que quien llama sea admin de
// la empresa antes de hacer nada.
//
// Acciones: crear | actualizar | desactivar | reactivar | eliminar | clave
//
// Desplegar desde el panel de Supabase (Edge Functions > Deploy a new
// function) o con:  supabase functions deploy gestionar-usuarios

import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Direccion del sistema para el enlace del correo. Se acepta solo http/https:
// asi nadie puede colar un "javascript:" u otro esquema en un mensaje que sale
// a nombre de la empresa.
function direccionSegura(valor: unknown): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  try {
    const u = new URL(texto);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : "";
  } catch {
    return "";
  }
}

// Envio generico por SMTP desde la cuenta de la empresa. Devuelve el motivo
// en vez de lanzar, para que quien llama decida si es un fallo grave o solo un
// aviso que no salio.
async function enviarCorreo({ para, asunto, texto, html, adjunto }: {
  para: string;
  asunto: string;
  texto: string;
  html?: string;
  adjunto?: { nombre: string; base64: string; tipo: string } | null;
}) {
  const usuario = Deno.env.get("SMTP_USUARIO");
  const password = Deno.env.get("SMTP_CLAVE");
  if (!usuario || !password) {
    return { enviado: false, motivo: "Faltan los secretos SMTP_USUARIO y SMTP_CLAVE." };
  }

  const cliente = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_SERVIDOR") ?? "smtp.gmail.com",
      port: Number(Deno.env.get("SMTP_PUERTO") ?? 465),
      tls: true,
      auth: { username: usuario, password },
    },
  });

  try {
    await cliente.send({
      from: `Ingeanclajes <${usuario}>`,
      to: para,
      subject: asunto,
      content: texto,
      ...(html ? { html } : {}),
      ...(adjunto ? {
        attachments: [{
          filename: adjunto.nombre,
          encoding: "base64",
          content: adjunto.base64,
          contentType: adjunto.tipo,
        }],
      } : {}),
    });
    return { enviado: true };
  } finally {
    // Sin esto la funcion queda esperando a que cierre la conexion.
    try { await cliente.close(); } catch { /* ya estaba cerrada */ }
  }
}

// Correo de bienvenida. Sale desde la cuenta de la empresa, configurada como
// secretos de la funcion (SMTP_USUARIO y SMTP_CLAVE). Si no estan puestos, la
// creacion del usuario NO falla: solo se avisa que no se pudo enviar.
async function enviarBienvenida({ nombre, email, clave, appUrl }: {
  nombre: string;
  email: string;
  clave: string;
  appUrl: string;
}) {
  const trato = nombre ? nombre.split(" ")[0] : "Hola";
  const asunto = "Tu acceso al sistema de Ingeanclajes";

  const texto = [
    `${trato},`,
    "",
    "Te creamos una cuenta en el sistema de gestión de Ingeanclajes.",
    "",
    ...(appUrl ? [`Entra aquí: ${appUrl}`, ""] : []),
    `Usuario: ${email}`,
    `Contraseña provisional: ${clave}`,
    "",
    "IMPORTANTE: cambia esta contraseña la primera vez que entres. Mientras no",
    "lo hagas, queda escrita en este correo y cualquiera que abra tu bandeja",
    "podría entrar al sistema con ella.",
    "",
    "Para cambiarla: entra al sistema, haz clic en tu correo arriba a la derecha",
    "y elige «Cambiar mi contraseña».",
    "",
    "Si no esperabas este mensaje, avísanos y damos de baja la cuenta.",
    "",
    "Ingeanclajes S.A.S.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1E1E1E;line-height:1.6;max-width:520px">
      <p>${escapeHtml(trato)},</p>
      <p>Te creamos una cuenta en el sistema de gestión de <strong>Ingeanclajes</strong>.</p>
      <table cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #e2e8f0;border-radius:8px">
        <tr><td style="padding:14px 18px">
          <div style="font-size:12px;color:#777;text-transform:uppercase;letter-spacing:.06em">Usuario</div>
          <div style="font-size:16px;font-weight:700">${escapeHtml(email)}</div>
          <div style="font-size:12px;color:#777;text-transform:uppercase;letter-spacing:.06em;margin-top:12px">Contraseña provisional</div>
          <div style="font-size:16px;font-weight:700">${escapeHtml(clave)}</div>
        </td></tr>
      </table>
      ${appUrl ? `
        <p style="margin:0 0 18px">
          <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#E0342A;color:#fff;text-decoration:none;padding:13px 26px;border-radius:9px;font-weight:700;font-size:15px">
            Entrar al sistema
          </a>
        </p>
        <p style="margin:0 0 18px;font-size:12.5px;color:#667085">
          O copia esta dirección en el navegador: <br/>
          <span style="color:#1E1E1E">${escapeHtml(appUrl)}</span>
        </p>
      ` : ""}
      <p style="background:#FFFAF0;border:1px solid #FDE3C4;border-radius:8px;padding:12px 14px;color:#B54708">
        <strong>Cambia esta contraseña la primera vez que entres.</strong> Mientras no lo hagas,
        queda escrita en este correo y cualquiera que abra tu bandeja podría entrar al sistema con ella.
      </p>
      <p>
        <strong>Para cambiarla:</strong> entra al sistema, haz clic en tu correo arriba a la derecha
        y elige <strong>«Cambiar mi contraseña»</strong>.
      </p>
      <p style="color:#667085;font-size:13px">Si no esperabas este mensaje, avísanos y damos de baja la cuenta.</p>
      <p style="color:#667085;font-size:13px">Ingeanclajes S.A.S.</p>
    </div>
  `;

  // El correo viaja en "quoted-printable", donde un espacio al final de linea
  // se escribe =20. La sangria de la plantilla dejaba lineas de puros espacios
  // y algunos clientes las mostraban tal cual, con los =20 a la vista. Se
  // compacta a una sola linea para que no quede ninguno.
  const htmlCompacto = html.replace(/\s*\n\s*/g, " ").trim();

  return enviarCorreo({ para: email, asunto, texto, html: htmlCompacto });
}

function escapeHtml(v: string) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

// ── El correo de la cotizacion ──────────────────────────────────────────────
//
// Antes se armaba partiendo el mensaje por renglones y metiendo cada uno en un
// <p> con margen, y las lineas en blanco en <p>&nbsp;</p>. El resultado eran
// huecos enormes, sin logo, sin alineacion y con las cifras sueltas: parecia
// un borrador, no una propuesta de treinta millones.
//
// Se arma con TABLAS y estilos en linea, no con clases ni flex: los clientes
// de correo -Gmail, Outlook, el de iPhone- descartan las hojas de estilo y
// entienden poco CSS. Lo que aqui parece anticuado es lo unico que se ve igual
// en todos.
//
// EL ENCABEZADO NO LLEVA IMAGEN A PROPOSITO: Gmail esconde las imagenes hasta
// que el destinatario pulsa «mostrar», asi que un logo saldria como un
// recuadro roto en el primer vistazo, que es el que cuenta. El nombre
// compuesto con tipografia se ve siempre.

const pesosCo = (valor: unknown) => {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "";
  return "$ " + Math.round(n).toLocaleString("es-CO", { maximumFractionDigits: 0 });
};

// La misma cuenta que hace el PDF, copiada tal cual: entero sin decimales,
// y con decimales a dos cifras. Tiene que dar la misma cadena, porque el
// cliente ve los dos documentos y una cantidad escrita distinta en cada uno
// parece un error de la cotizacion.
const cantidadPdf = (valor: unknown) => {
  const n = Number(valor) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, "");
};

type DetalleCotizacion = {
  saludo?: string;
  obra?: string;
  nota?: string;
  items?: Array<{ desc?: string; cant?: number; unit?: string; vu?: number }>;
  subtotal?: number;
  utilidad?: number;
  utilidadPct?: number;
  iva?: number;
  total?: number;
  validez?: number | string;
  tiempoEjec?: string;
  formaPago?: string;
};

const GRIS = "#5f6368";
const TINTA = "#202124";
const BORDE_SUAVE = "#e8eaed";

// Fila de totales: ocupa las cuatro primeras columnas y deja la cifra en la
// quinta, igual que en la tabla del PDF.
function filaTotal(k: string, v: string, fuerte = false) {
  const fondo = fuerte ? "#f1f3f4" : "#fafbfc";
  const tam = fuerte ? "14px" : "12.5px";
  const peso = fuerte ? "700" : "400";
  const color = fuerte ? TINTA : GRIS;
  const borde = fuerte ? "border-top:1.5px solid #dadce0;" : "";
  return '<tr><td colspan="4" style="' + borde + 'background:' + fondo + ';padding:8px 12px;color:'
    + color + ';font-size:' + tam + ';font-weight:' + peso + '">' + escapeHtml(k) + '</td>'
    + '<td align="right" style="' + borde + 'background:' + fondo + ';padding:8px 12px;color:'
    + (fuerte ? TINTA : GRIS) + ';font-size:' + tam + ';font-weight:' + (fuerte ? "700" : "600")
    + ';white-space:nowrap">' + escapeHtml(v) + '</td></tr>';
}

function celdaCondicion(k: string, v: string) {
  return '<td width="33%" valign="top" style="padding:0 4px">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f9fa;border-radius:6px">'
    + '<tr><td style="padding:10px 12px">'
    + '<div style="font-size:9.5px;letter-spacing:.5px;text-transform:uppercase;color:' + GRIS + '">' + escapeHtml(k) + '</div>'
    + '<div style="font-size:12.5px;color:' + TINTA + ';font-weight:600;margin-top:3px;line-height:1.4">' + escapeHtml(v) + '</div>'
    + '</td></tr></table></td>';
}

function htmlCotizacion(numero: string, mensaje: string, d: DetalleCotizacion | null) {
  const items = (d?.items ?? []).filter((i) => i && i.desc);

  // Las mismas cinco columnas de la tabla del PDF, en el mismo orden y con los
  // mismos anchos: descripcion, cantidad, unidad, valor unitario y subtotal.
  // El cliente abre el adjunto y encuentra lo mismo que acaba de leer.
  const celda = (contenido: string, al: string, extra = "") =>
    '<td align="' + al + '" style="padding:9px 10px;border-bottom:1px solid ' + BORDE_SUAVE
    + ';font-size:12px;' + extra + '">' + contenido + '</td>';

  const filas = items.map((i) => (
    '<tr>'
    + celda(escapeHtml(String(i.desc).toUpperCase()), "left", "color:" + TINTA)
    + celda(escapeHtml(cantidadPdf(i.cant)), "center", "color:" + GRIS + ";white-space:nowrap")
    + celda(escapeHtml(String(i.unit ?? "UND")), "center", "color:" + GRIS)
    + celda(escapeHtml(pesosCo(i.vu)), "right", "color:" + GRIS + ";white-space:nowrap")
    + celda(escapeHtml(pesosCo(Number(i.cant ?? 0) * Number(i.vu ?? 0))), "right",
      "color:" + TINTA + ";font-weight:700;white-space:nowrap")
    + '</tr>'
  )).join("");

  const encabezado = (t: string, al: string, ancho: string) =>
    '<th align="' + al + '" width="' + ancho + '" style="padding:8px 10px;background:#f8f9fa;'
    + 'border-bottom:1px solid ' + BORDE_SUAVE + ';font-size:9.5px;letter-spacing:.6px;'
    + 'text-transform:uppercase;color:' + GRIS + ';font-weight:700">' + t + '</th>';

  const tabla = filas
    ? '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:4px 0 18px"><tr>'
      + encabezado("Descripción", "left", "44%")
      + encabezado("Cant.", "center", "10%")
      + encabezado("Unidad", "center", "12%")
      + encabezado("V. unitario", "right", "17%")
      + encabezado("Subtotal", "right", "17%")
      + '</tr>' + filas
      // Los totales van dentro de la misma tabla, como en el PDF: asi las
      // cifras caen bajo la columna de subtotales y no en un recuadro aparte.
      + (Number(d?.total)
        ? (d?.subtotal ? filaTotal("Subtotal", pesosCo(d.subtotal)) : "")
          + (d?.utilidad
            ? filaTotal("Utilidades (" + (d.utilidadPct ?? 10) + "% del valor de la obra)", pesosCo(d.utilidad))
            : "")
          + (d?.iva ? filaTotal("IVA (19% sobre utilidades)", pesosCo(d.iva)) : "")
          + filaTotal("Total propuesta", pesosCo(d?.total), true)
        : "")
      + '</table>'
    : "";

  const condiciones = (d?.validez || d?.tiempoEjec || d?.formaPago)
    ? '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 18px"><tr>'
      + (d?.validez ? celdaCondicion("Validez", d.validez + " días") : "")
      + (d?.tiempoEjec ? celdaCondicion("Tiempo de ejecución", String(d.tiempoEjec)) : "")
      + (d?.formaPago ? celdaCondicion("Forma de pago", String(d.formaPago)) : "")
      + '</tr></table>'
    : "";

  // Lo que la persona escribio de su puno y letra. Va destacado y antes de las
  // cifras: si alguien se tomo el trabajo de escribirlo, es lo mas importante
  // del correo.
  const nota = String(d?.nota ?? "").trim()
    ? '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 18px">'
      + '<tr><td style="border-left:3px solid #f47c20;padding:2px 0 2px 12px;font-size:14px;'
      + 'line-height:1.6;color:' + TINTA + ';white-space:pre-line">'
      + escapeHtml(String(d?.nota).trim()) + '</td></tr></table>'
    : "";

  // Sin datos -una version vieja de la pantalla abierta en otra maquina- se
  // muestra el texto tal cual, pero dentro del mismo marco: sigue viendose
  // mejor que antes y el correo sale igual.
  const cuerpo = Number(d?.total)
    ? '<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:' + TINTA + '">'
      + escapeHtml(d?.saludo || "Buen día") + '.</p>'
      + '<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:' + TINTA + '">Adjunto encontrará la cotización'
      + (d?.obra ? " para <strong>" + escapeHtml(String(d.obra)) + "</strong>" : "") + '.</p>'
      + nota + tabla + condiciones
      + '<p style="margin:0;font-size:14px;line-height:1.6;color:' + TINTA + '">Quedamos atentos a sus comentarios y a cualquier ajuste que necesite.</p>'
    : '<div style="font-size:14px;line-height:1.6;color:' + TINTA + ';white-space:pre-line">' + escapeHtml(mensaje) + '</div>';

  return '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"></head>'
    + '<body style="margin:0;padding:0;background:#f1f3f4">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f3f4">'
    + '<tr><td align="center" style="padding:22px 12px">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif">'
    + '<tr><td style="background:#111111;padding:16px 22px">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td>'
    + '<div style="color:#ffffff;font-size:17px;font-weight:bold;letter-spacing:-.3px">INGEANCLAJES</div>'
    + '<div style="color:#bdbdbd;font-size:8px;letter-spacing:2px;margin-top:2px">ESPECIALISTAS EN ANCLAJES</div>'
    + '</td><td align="right" style="color:#ffffff;font-size:12px;font-family:Courier New,monospace">'
    + escapeHtml(numero) + '</td></tr></table></td></tr>'
    + '<tr><td style="padding:22px">' + cuerpo + '</td></tr>'
    + '<tr><td style="border-top:1px solid ' + BORDE_SUAVE + ';padding:14px 22px;color:#80868b;font-size:11px;line-height:1.7">'
    + '<strong style="color:#5f6368">Ingeanclajes S.A.S</strong> &middot; NIT 900193965-4<br>'
    + 'Calle 38 Sur # 36 &ndash; 48, Envigado &middot; PBX 448 26 86 &middot; Cel. 315 288 9541<br>'
    + 'www.ingeanclajessas.com'
    + '</td></tr></table></td></tr></table></body></html>';
}

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

function error(mensaje: string, status = 400) {
  return responder({ error: mensaje }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return error("Método no permitido.", 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // 1) Quien llama. Se usa su propio token, nunca el de servicio.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return error("Falta la sesión.", 401);

  const comoUsuario = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: sesion, error: errSesion } = await comoUsuario.auth.getUser();
  if (errSesion || !sesion?.user) return error("Sesión inválida.", 401);
  const quienLlama = sesion.user;

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return error("El cuerpo de la petición no es JSON válido.");
  }

  const accion = String(cuerpo.accion ?? "");
  const tenantId = String(cuerpo.tenantId ?? "");
  if (!tenantId) return error("Falta la empresa.");

  // 2) Solo un admin de ESA empresa puede administrar el equipo. Se consulta
  //    con la llave de servicio para no depender de las politicas RLS.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: propia, error: errPropia } = await admin
    .schema("app")
    .from("memberships")
    .select("role, activo")
    .eq("tenant_id", tenantId)
    .eq("user_id", quienLlama.id)
    .maybeSingle();

  if (errPropia) return error(errPropia.message, 500);
  if (!propia || !propia.activo) {
    return error("Tu cuenta no tiene acceso activo en esta empresa.", 403);
  }

  // Enviar una cotizacion es trabajo comercial de cualquiera del equipo.
  // Administrar cuentas, no: eso sigue siendo exclusivo del administrador.
  const ACCIONES_DE_ADMIN = ["crear", "actualizar", "desactivar", "reactivar", "eliminar", "clave"];
  if (ACCIONES_DE_ADMIN.includes(accion) && propia.role !== "admin") {
    return error("Solo un administrador de la empresa puede administrar usuarios.", 403);
  }

  const email = String(cuerpo.email ?? "").trim().toLowerCase();
  const nombre = String(cuerpo.nombre ?? "").trim();
  const rol = String(cuerpo.rol ?? "operator");
  const modulos = Array.isArray(cuerpo.modulos) ? (cuerpo.modulos as string[]) : null;
  const clave = String(cuerpo.clave ?? "");
  const userId = String(cuerpo.userId ?? "");

  // La direccion del sistema para el correo. El secreto APP_URL manda; si no
  // esta puesto se usa la que informa el navegador, para no tener que
  // configurar nada cuando cambia el dominio.
  const appUrl = direccionSegura(Deno.env.get("APP_URL")) || direccionSegura(cuerpo.appUrl);

  const ROLES = ["admin", "manager", "operator", "viewer"];
  if (["crear", "actualizar"].includes(accion) && !ROLES.includes(rol)) {
    return error("Rol no válido.");
  }

  // Un admin no se restringe por modulos.
  const modulosFinales = rol === "admin" ? null : (modulos ?? []);

  try {
    if (accion === "enviar-cotizacion") {
      const para = String(cuerpo.para ?? "").trim();
      const asunto = String(cuerpo.asunto ?? "").trim();
      const mensaje = String(cuerpo.mensaje ?? "");
      const pdfBase64 = String(cuerpo.pdfBase64 ?? "");
      const nombreArchivo = String(cuerpo.nombreArchivo ?? "Cotizacion.pdf");

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para)) {
        return error("El correo del cliente no es válido.");
      }
      if (!asunto) return error("Escribe un asunto para el correo.");
      if (!mensaje.trim()) return error("Escribe el mensaje para el cliente.");

      // Gmail rechaza por encima de 25 MB. Se corta antes para poder explicarlo
      // en vez de devolver un error del servidor de correo.
      const bytesAprox = Math.floor(pdfBase64.length * 0.75);
      if (bytesAprox > 20 * 1024 * 1024) {
        return error("El PDF pesa más de 20 MB. Quita algunas fotos de la cotización.");
      }

      // `detalle` trae las cifras aparte para poder pintarlas en una tabla. El
      // `mensaje` sigue viajando y es lo que se envia como texto plano, para
      // quien lee el correo sin formato. Todo se escapa: lo escribe una
      // persona en un campo de texto.
      const detalle = (cuerpo.detalle ?? null) as DetalleCotizacion | null;
      const numero = String(cuerpo.numero ?? "").trim();
      const html = htmlCotizacion(numero, mensaje, detalle);

      const resultado = await enviarCorreo({
        para,
        asunto,
        texto: mensaje,
        html,
        adjunto: pdfBase64
          ? { nombre: nombreArchivo, base64: pdfBase64, tipo: "application/pdf" }
          : null,
      });

      if (!resultado.enviado) return error(resultado.motivo || "No se pudo enviar el correo.", 500);
      return responder({ ok: true, para });
    }

    if (accion === "crear") {
      if (!email) return error("Escribe el correo de la persona.");
      if (clave.length < 8) return error("La contraseña debe tener al menos 8 caracteres.");

      // Si el correo ya tiene cuenta, se reutiliza en vez de fallar: puede
      // ser alguien que ya trabaja en otra empresa del sistema.
      let nuevoId = "";
      const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
        email,
        password: clave,
        email_confirm: true,
        user_metadata: { nombre },
      });

      if (errCrear) {
        const yaExiste = /already been registered|already exists|duplicate/i.test(errCrear.message);
        if (!yaExiste) return error(errCrear.message, 400);

        const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const encontrado = lista?.users?.find((u) => u.email?.toLowerCase() === email);
        if (!encontrado) return error("El correo ya está registrado pero no se pudo ubicar.", 409);
        nuevoId = encontrado.id;
      } else {
        nuevoId = creado.user.id;
      }

      const { error: errMembresia } = await admin
        .schema("app")
        .from("memberships")
        .upsert(
          {
            tenant_id: tenantId,
            user_id: nuevoId,
            role: rol,
            nombre,
            email,
            modulos: modulosFinales,
            activo: true,
          },
          { onConflict: "tenant_id,user_id" }
        );

      if (errMembresia) return error(errMembresia.message, 500);

      // El correo es lo ultimo y nunca tumba la creacion: la cuenta ya existe
      // y quedarse sin avisar es mucho mejor que dejarla a medias.
      let correo: { enviado: boolean; motivo?: string } = { enviado: false, motivo: "No se solicitó." };
      if (cuerpo.enviarCorreo !== false) {
        try {
          correo = await enviarBienvenida({ nombre, email, clave, appUrl });
        } catch (e) {
          correo = { enviado: false, motivo: e instanceof Error ? e.message : "Error al enviar." };
        }
      }

      return responder({ ok: true, userId: nuevoId, correo });
    }

    if (!userId) return error("Falta indicar la persona.");

    // Nadie puede dejarse a si mismo sin administracion y bloquear la empresa.
    const seModificaASiMismo = userId === quienLlama.id;
    if (seModificaASiMismo && ["desactivar", "eliminar"].includes(accion)) {
      return error("No puedes quitarte tu propio acceso.");
    }
    if (seModificaASiMismo && accion === "actualizar" && rol !== "admin") {
      return error("No puedes quitarte a ti mismo el rol de administrador.");
    }

    if (accion === "actualizar") {
      const { error: err } = await admin
        .schema("app")
        .from("memberships")
        .update({ role: rol, nombre, modulos: modulosFinales })
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);
      if (err) return error(err.message, 500);
      return responder({ ok: true });
    }

    if (accion === "desactivar" || accion === "reactivar") {
      const { error: err } = await admin
        .schema("app")
        .from("memberships")
        .update({ activo: accion === "reactivar" })
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);
      if (err) return error(err.message, 500);
      return responder({ ok: true });
    }

    if (accion === "clave") {
      if (clave.length < 8) return error("La contraseña debe tener al menos 8 caracteres.");
      const { error: err } = await admin.auth.admin.updateUserById(userId, { password: clave });
      if (err) return error(err.message, 500);

      // Cambiarle la clave a alguien sin avisarle lo deja fuera del sistema
      // sin saber por que, asi que se le manda igual que al crearla.
      let correo: { enviado: boolean; motivo?: string } = { enviado: false, motivo: "No se solicitó." };
      if (cuerpo.enviarCorreo !== false && email) {
        try {
          correo = await enviarBienvenida({ nombre, email, clave, appUrl });
        } catch (e) {
          correo = { enviado: false, motivo: e instanceof Error ? e.message : "Error al enviar." };
        }
      }

      return responder({ ok: true, correo });
    }

    if (accion === "eliminar") {
      // Se quita el acceso a ESTA empresa. La cuenta en si no se borra: puede
      // pertenecer a otra empresa y borrarla destruiria ese acceso tambien.
      const { error: err } = await admin
        .schema("app")
        .from("memberships")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);
      if (err) return error(err.message, 500);
      return responder({ ok: true });
    }

    return error("Acción desconocida.");
  } catch (e) {
    return error(e instanceof Error ? e.message : "Error inesperado.", 500);
  }
});
