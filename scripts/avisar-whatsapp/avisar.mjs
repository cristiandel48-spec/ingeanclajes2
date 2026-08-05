// Envia por WhatsApp Web los avisos que exporta la pantalla de Horarios.
//
// COMO FUNCIONA: abre un Chrome de verdad con Playwright, entra a WhatsApp Web
// con la sesion ya iniciada y escribe el mensaje en el chat de cada persona.
// La sesion se guarda en una carpeta local, asi que el codigo QR solo hay que
// escanearlo la primera vez.
//
// ANTES DE USARLO, DOS ADVERTENCIAS QUE NO SON MENORES:
//
// 1. Automatizar WhatsApp Web va contra las condiciones de uso de WhatsApp.
//    El castigo habitual es el bloqueo del numero. Si bloquean este, se pierde
//    el WhatsApp con el que la empresa habla con clientes y trabajadores.
//    Conviene usar una linea aparte, no la principal.
//
// 2. WhatsApp Web cambia por dentro sin avisar. Los selectores de aqui abajo
//    funcionan hoy; el dia que Meta cambie su pagina, el script deja de
//    encontrar el cuadro de texto y hay que retocarlos. No es un "se instala y
//    se olvida".
//
// USO:
//   node avisar.mjs avisos-2026-08-05.json
//   node avisar.mjs avisos-2026-08-05.json --prueba   (no envia, solo muestra)

import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const AQUI = dirname(fileURLToPath(import.meta.url));
// La sesion de WhatsApp vive aqui. Es como el perfil de un navegador: si se
// borra esta carpeta, toca volver a escanear el QR.
const CARPETA_SESION = join(AQUI, ".sesion-whatsapp");

// Espera entre un mensaje y el siguiente. No es capricho: WhatsApp Web tiene
// que cargar el chat entero antes de poder escribir, y mandar siete seguidos
// sin respirar hace que se pierdan mensajes por la mitad.
const ESPERA_MIN = 6000;
const ESPERA_MAX = 11000;

const pausa = (ms) => new Promise((seguir) => setTimeout(seguir, ms));
const esperaVariable = () => ESPERA_MIN + Math.random() * (ESPERA_MAX - ESPERA_MIN);

function leerAvisos(ruta) {
  const datos = JSON.parse(readFileSync(resolve(ruta), "utf8"));
  const avisos = Array.isArray(datos?.avisos) ? datos.avisos : [];
  if (!avisos.length) throw new Error("El archivo no trae ningún aviso.");
  for (const aviso of avisos) {
    if (!aviso.telefono || !aviso.mensaje) {
      throw new Error(`Aviso incompleto para "${aviso.nombre || "?"}": falta teléfono o mensaje.`);
    }
  }
  return { fecha: datos.fecha, avisos };
}

async function confirmar(pregunta) {
  const consola = createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = (await consola.question(pregunta)).trim().toLowerCase();
  consola.close();
  return respuesta === "s" || respuesta === "si" || respuesta === "sí";
}

/** Envia un mensaje. Devuelve null si salio bien, o el motivo del fallo. */
async function enviarUno(pagina, aviso) {
  const url = `https://web.whatsapp.com/send?phone=${aviso.telefono}&text=${encodeURIComponent(aviso.mensaje)}`;
  await pagina.goto(url, { waitUntil: "domcontentloaded" });

  // El cuadro de escribir. Se busca por varios lados porque WhatsApp cambia el
  // atributo cada tanto; con el primero que aparezca basta.
  const cuadro = pagina.locator([
    'footer div[contenteditable="true"][data-tab]',
    'div[contenteditable="true"][role="textbox"]',
  ].join(", ")).last();

  try {
    await cuadro.waitFor({ state: "visible", timeout: 60000 });
  } catch {
    // El aviso de numero invalido sale como una ventana en medio de la pantalla.
    const texto = await pagina.locator("body").innerText().catch(() => "");
    if (/no está en WhatsApp|isn't on WhatsApp|inválido|invalid/i.test(texto)) {
      return "el número no tiene WhatsApp";
    }
    return "no cargó el chat (¿sesión caída? vuelve a escanear el QR)";
  }

  await cuadro.click();
  // Un respiro: si se pulsa Enter en cuanto aparece el cuadro, a veces el texto
  // todavia no se ha volcado del enlace y se manda un mensaje vacio.
  await pausa(1200);

  const escrito = (await cuadro.innerText().catch(() => "")).trim();
  if (!escrito) return "el mensaje no llegó a escribirse en el chat";

  await pagina.keyboard.press("Enter");

  // Se confirma que salio: mientras el mensaje esta en camino WhatsApp muestra
  // el reloj, y al llegar cambia a la palomita. Con cualquiera de los dos ya
  // salio del cuadro de texto.
  try {
    await pagina.locator('span[data-icon="msg-time"], span[data-icon="msg-check"], span[data-icon="msg-dblcheck"]')
      .last().waitFor({ state: "visible", timeout: 20000 });
  } catch {
    return "se escribió pero no se confirmó el envío";
  }
  return null;
}

async function principal() {
  const [ruta, ...banderas] = process.argv.slice(2);
  if (!ruta) {
    console.error("Falta el archivo. Uso: node avisar.mjs avisos-2026-08-05.json [--prueba]");
    process.exit(1);
  }
  const soloPrueba = banderas.includes("--prueba");

  const { fecha, avisos } = leerAvisos(ruta);
  console.log(`\nAvisos del ${fecha || "día"}: ${avisos.length}\n`);
  for (const aviso of avisos) {
    console.log(`  · ${aviso.nombre} — +${aviso.telefono}`);
  }

  if (soloPrueba) {
    console.log("\n--prueba: no se envía nada. Este es el mensaje del primero:\n");
    console.log("─".repeat(60));
    console.log(avisos[0].mensaje);
    console.log("─".repeat(60));
    return;
  }

  if (!await confirmar(`\n¿Enviar estos ${avisos.length} mensajes? (s/n) `)) {
    console.log("Cancelado. No se envió nada.");
    return;
  }

  const navegador = await chromium.launchPersistentContext(CARPETA_SESION, {
    headless: false, // A la vista: hay que poder escanear el QR y ver qué pasa.
    viewport: { width: 1280, height: 800 },
  });

  try {
    const pagina = navegador.pages()[0] || await navegador.newPage();
    await pagina.goto("https://web.whatsapp.com", { waitUntil: "domcontentloaded" });

    console.log("\nSi sale el código QR, escanéalo con el celular. Esperando a que abra…");
    await pagina.locator('#pane-side, [data-testid="chat-list"]')
      .first().waitFor({ state: "visible", timeout: 180000 });
    console.log("Sesión abierta.\n");

    const fallidos = [];
    for (const [i, aviso] of avisos.entries()) {
      process.stdout.write(`[${i + 1}/${avisos.length}] ${aviso.nombre}… `);
      const problema = await enviarUno(pagina, aviso);
      if (problema) {
        console.log(`FALLÓ: ${problema}`);
        fallidos.push({ ...aviso, problema });
      } else {
        console.log("enviado");
      }
      if (i < avisos.length - 1) await pausa(esperaVariable());
    }

    console.log(`\nListo: ${avisos.length - fallidos.length} de ${avisos.length} enviados.`);
    if (fallidos.length) {
      console.log("\nA estos hay que avisarles a mano:");
      for (const f of fallidos) console.log(`  · ${f.nombre} (+${f.telefono}) — ${f.problema}`);
    }
  } finally {
    await navegador.close();
  }
}

principal().catch((error) => {
  console.error("\nSe cortó el envío:", error.message);
  process.exit(1);
});
