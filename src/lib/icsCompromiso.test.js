import { describe, expect, it } from "vitest";
import { onRequest } from "../../functions/api/ics.js";
import { compromisoAParams } from "./icsCompromiso.js";

describe("Pages Function /api/ics (Cloudflare)", () => {
  it("entrega un archivo .ics valido con cabeceras de calendario y seguridad", async () => {
    const params = compromisoAParams({
      id: "ag-101",
      fecha: "2026-10-28",
      hora: "09:30 AM",
      tipo: "visita",
      obra: "Torre Norte",
      ciudad: "Bogotá",
      cliente: "Constructora Ejemplo",
    });

    const request = new Request(`https://ingeanclajes.pages.dev/api/ics?${params.toString()}`);
    const res = await onRequest({ request });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toContain('filename="Visita a obra - Torre Norte.ics"');
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");

    const cuerpo = await res.text();
    expect(cuerpo).toContain("BEGIN:VCALENDAR");
    expect(cuerpo).toContain("METHOD:PUBLISH");
    expect(cuerpo).toContain("SUMMARY:Visita a obra - Torre Norte");
    expect(cuerpo).toContain("END:VCALENDAR");
  });

  it("responde 200 sin cuerpo a peticiones HEAD de Apple Calendar", async () => {
    const request = new Request("https://ingeanclajes.pages.dev/api/ics?f=2026-10-28&o=Obra", {
      method: "HEAD",
    });
    const res = await onRequest({ request });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    expect(await res.text()).toBe("");
  });

  it("rechaza con 400 cuando falta una fecha valida", async () => {
    const request = new Request("https://ingeanclajes.pages.dev/api/ics?o=SinFecha");
    const res = await onRequest({ request });

    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Falta la fecha");
  });

  it("responde 405 a metodos no permitidos", async () => {
    const request = new Request("https://ingeanclajes.pages.dev/api/ics?f=2026-10-28", {
      method: "POST",
    });
    const res = await onRequest({ request });
    expect(res.status).toBe(405);
  });
});
