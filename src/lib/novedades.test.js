import { beforeEach, describe, expect, it } from "vitest";
import { NOVEDADES, VERSION_NOVEDADES, novedadesDe, novedadesPendientes } from "./novedades";

const camila = (meta = {}) => ({ id: "u-camila", email: "camilascadavid@gmail.com", user_metadata: meta });
const otro = (meta = {}) => ({ id: "u-otro", email: "tecnico@ingeanclajes.com", user_metadata: { nombre: "Juan Gómez", ...meta } });

describe("novedades", () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* sin almacenamiento en la prueba */ }
  });

  it("a Camila le sale la de eliminar certificaciones aunque ya viera las generales", () => {
    const r = novedadesDe(camila({ novedades_vistas: VERSION_NOVEDADES }));
    expect(r.generales).toHaveLength(0);
    expect(r.personales.map((n) => n.id)).toContain("2026-10-23-eliminar-certificaciones");
  });

  it("una vez vista ya no le sale", () => {
    const u = camila({ novedades_vistas: VERSION_NOVEDADES, novedades_personales_vistas: ["2026-10-23-eliminar-certificaciones"] });
    expect(novedadesPendientes(u)).toBe(false);
  });

  it("a los demas no les sale la de Camila", () => {
    expect(novedadesDe(otro()).personales).toHaveLength(0);
    expect(novedadesDe(otro()).generales).toBe(NOVEDADES);
    expect(novedadesPendientes(otro({ novedades_vistas: VERSION_NOVEDADES }))).toBe(false);
  });
});
