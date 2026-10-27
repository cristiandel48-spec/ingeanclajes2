import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

// Asunto sin tildes, simbolos ni emojis, y corto (<= 72 chars).
// Previene que denomailer rompa la cabecera MIME y el correo se vea como texto plano con los headers crudos.
function asuntoSeguro(valor: unknown, maximo = 72) {
  const plano = String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[·•–—]/g, "-")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plano.length <= maximo) return plano;
  const corte = plano.slice(0, maximo);
  const espacio = corte.lastIndexOf(" ");
  return (espacio > maximo * 0.6 ? corte.slice(0, espacio) : corte).trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return responder({ error: "Método no permitido" }, 405);
  }

  const usuario = Deno.env.get("SMTP_USUARIO");
  const password = Deno.env.get("SMTP_CLAVE");
  if (!usuario || !password) {
    return responder({ error: "Faltan los secretos SMTP_USUARIO y SMTP_CLAVE." }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return responder({ error: "Cuerpo JSON inválido." }, 400);
  }

  const destinatarios: string[] = Array.isArray(body.destinatarios)
    ? body.destinatarios
    : [body.para].filter(Boolean);

  if (!destinatarios.length) {
    return responder({ error: "Se requiere al menos un destinatario." }, 400);
  }

  const asunto = asuntoSeguro(body.asunto || "Instructivo Acta de Entrega FORM-SST-89");
  const texto = String(body.texto || "");
  const html = String(body.html || "");
  const adjuntos = Array.isArray(body.adjuntos) ? body.adjuntos : (body.adjunto ? [body.adjunto] : []);

  const cliente = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_SERVIDOR") ?? "smtp.gmail.com",
      port: Number(Deno.env.get("SMTP_PUERTO") ?? 465),
      tls: true,
      auth: { username: usuario, password },
    },
  });

  const resultados: any[] = [];

  try {
    for (const para of destinatarios) {
      try {
        console.log(`Enviando correo a ${para}...`);
        await cliente.send({
          from: `Ingeanclajes <${usuario}>`,
          to: para,
          subject: asunto,
          content: texto,
          ...(html ? { html } : {}),
          ...(adjuntos.length ? {
            attachments: adjuntos.map((a: any) => ({
              filename: a.nombre || a.filename || "adjunto.pdf",
              encoding: "base64",
              content: a.base64 || a.content,
              contentType: a.tipo || a.contentType || "application/pdf",
            })),
          } : {}),
        });
        resultados.push({ para, enviado: true });
        console.log(`Correo enviado exitosamente a ${para}`);
      } catch (err: any) {
        console.error(`Error enviando a ${para}:`, err);
        resultados.push({ para, enviado: false, error: err.message || String(err) });
      }
    }
  } finally {
    try { await cliente.close(); } catch { /* conexion cerrada */ }
  }

  const todosOk = resultados.every((r) => r.enviado);
  return responder({
    ok: todosOk,
    resultados,
  }, todosOk ? 200 : 207);
});
