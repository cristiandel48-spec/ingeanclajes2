import { describe, expect, it } from "vitest";
import { normalizarCelular, urlWhatsApp, urlWhatsAppOElegirContacto } from "./whatsapp";
import { mensajeWhatsAppFirma } from "./firmaRecibido";

describe("el celular para wa.me", () => {
  it("acepta como lo escribe la gente y le pone el indicativo", () => {
    expect(normalizarCelular("319 231 5246")).toBe("573192315246");
    expect(normalizarCelular("+57 319 231 5246")).toBe("573192315246");
    expect(normalizarCelular("573192315246")).toBe("573192315246");
  });

  it("lo que no es un celular no se convierte en una direccion rota", () => {
    expect(normalizarCelular("1234")).toBe("");
    expect(normalizarCelular("")).toBe("");
    expect(urlWhatsApp("1234", "hola")).toBeNull();
  });
});

// El acta y el informe se mandan a firma con «Enviar y abrir WhatsApp»: se
// crea el envio y se abre WhatsApp con el
// enlace ya escrito. Esto comprueba la direccion que se abre, que es lo unico
// que se puede comprobar sin enviar de verdad.
describe("el enlace de WhatsApp para firmar", () => {
  const enlace = "https://ingeanclajes.pages.dev/firma/abc123";
  const mensaje = mensajeWhatsAppFirma({
    tipo: "acta", nombre: "Wilson Alzate", numero: "ACT-006", proyecto: "LA PILONA AVECEDO", enlace,
  });

  it("el mensaje saluda por el nombre y lleva el enlace", () => {
    expect(mensaje).toContain("Wilson, buen día.");
    // «el acta», no «la acta»: femenina, pero con articulo masculino por
    // empezar por «a» tonica. Esto se le manda escrito al cliente.
    expect(mensaje).toContain("Le enviamos el acta de entrega de obra ACT-006 de LA PILONA AVECEDO.");
    expect(mensaje).not.toContain("la acta");
    expect(mensaje).toContain(enlace);
    // Desde ae179fc se firma en el mismo enlace: no se le promete un codigo
    // que nunca le va a llegar.
    expect(mensaje).toContain("Solo tiene que abrir el enlace");
    expect(mensaje).not.toContain("código");
  });

  it("la cotizacion sigue siendo femenina", () => {
    const m = mensajeWhatsAppFirma({ tipo: "cotizacion", numero: "C-26115", enlace });
    expect(m).toContain("Le enviamos la cotización C-26115.");
  });

  it("con celular abre el chat de esa persona", () => {
    const url = urlWhatsAppOElegirContacto("3192315246", mensaje);
    expect(url.startsWith("https://wa.me/573192315246?text=")).toBe(true);
    // El enlace de firma tiene que llegar entero, sin romperse en la direccion.
    expect(decodeURIComponent(url.split("?text=")[1])).toBe(mensaje);
  });

  it("sin celular deja elegir el contacto en vez de no abrir nada", () => {
    const url = urlWhatsAppOElegirContacto("", mensaje);
    expect(url.startsWith("https://api.whatsapp.com/send?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1])).toBe(mensaje);
  });
});
