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

// Correo de bienvenida. Sale desde la cuenta de la empresa, configurada como
// secretos de la funcion (SMTP_USUARIO y SMTP_CLAVE). Si no estan puestos, la
// creacion del usuario NO falla: solo se avisa que no se pudo enviar.
async function enviarBienvenida({ nombre, email, clave }: {
  nombre: string;
  email: string;
  clave: string;
}) {
  const usuario = Deno.env.get("SMTP_USUARIO");
  const password = Deno.env.get("SMTP_CLAVE");
  if (!usuario || !password) {
    return { enviado: false, motivo: "Faltan los secretos SMTP_USUARIO y SMTP_CLAVE." };
  }

  const trato = nombre ? nombre.split(" ")[0] : "Hola";
  const asunto = "Tu acceso al sistema de Ingeanclajes";

  const texto = [
    `${trato},`,
    "",
    "Te creamos una cuenta en el sistema de gestión de Ingeanclajes.",
    "",
    `Usuario: ${email}`,
    `Contraseña provisional: ${clave}`,
    "",
    "IMPORTANTE: cambia esta contraseña la primera vez que entres. Mientras no",
    "lo hagas, queda escrita en este correo y cualquiera que abra tu bandeja",
    "podría entrar al sistema con ella.",
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
      <p style="background:#FFFAF0;border:1px solid #FDE3C4;border-radius:8px;padding:12px 14px;color:#B54708">
        <strong>Cambia esta contraseña la primera vez que entres.</strong> Mientras no lo hagas,
        queda escrita en este correo y cualquiera que abra tu bandeja podría entrar al sistema con ella.
      </p>
      <p style="color:#667085;font-size:13px">Si no esperabas este mensaje, avísanos y damos de baja la cuenta.</p>
      <p style="color:#667085;font-size:13px">Ingeanclajes S.A.S.</p>
    </div>
  `;

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
      to: email,
      subject: asunto,
      content: texto,
      html,
    });
    return { enviado: true };
  } finally {
    // Sin esto la funcion queda esperando a que cierre la conexion.
    try { await cliente.close(); } catch { /* ya estaba cerrada */ }
  }
}

function escapeHtml(v: string) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
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
  if (!propia || !propia.activo || propia.role !== "admin") {
    return error("Solo un administrador de la empresa puede administrar usuarios.", 403);
  }

  const email = String(cuerpo.email ?? "").trim().toLowerCase();
  const nombre = String(cuerpo.nombre ?? "").trim();
  const rol = String(cuerpo.rol ?? "operator");
  const modulos = Array.isArray(cuerpo.modulos) ? (cuerpo.modulos as string[]) : null;
  const clave = String(cuerpo.clave ?? "");
  const userId = String(cuerpo.userId ?? "");

  const ROLES = ["admin", "manager", "operator", "viewer"];
  if (["crear", "actualizar"].includes(accion) && !ROLES.includes(rol)) {
    return error("Rol no válido.");
  }

  // Un admin no se restringe por modulos.
  const modulosFinales = rol === "admin" ? null : (modulos ?? []);

  try {
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
          correo = await enviarBienvenida({ nombre, email, clave });
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
          correo = await enviarBienvenida({ nombre, email, clave });
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
