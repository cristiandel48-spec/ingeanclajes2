import { describe, expect, it, vi } from "vitest";
import {
  esCertificacionEscalera,
  PRUEBAS_ESCALERAS_ANSI,
  CAPACIDAD_CARGA_ESCALERA,
  buildCertForm,
  getCertDefaultElements,
} from "./certConfig";

vi.mock("../../lib/pdfHojas", async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    pdfDeHojas: vi.fn(async () => new Blob(["%PDF-1.4"], { type: "application/pdf" })),
  };
});

describe("Certificación de Escaleras", () => {
  it("detecta correctamente una certificación de escaleras (siempre fijo en formato 3 hojas)", () => {
    expect(esCertificacionEscalera({ tipo: "Certificación de Escaleras" })).toBe(true);
    expect(esCertificacionEscalera({ tipo: "Certificación de Escaleras", formatoEscalera: false })).toBe(true);
    expect(esCertificacionEscalera({ tipoSistema: "Escalera fija" })).toBe(true);
    expect(esCertificacionEscalera({ tipoSistema: "Escalera fija", formatoEscalera: false })).toBe(true);
    expect(esCertificacionEscalera({ formatoEscalera: true })).toBe(true);
    expect(
      esCertificacionEscalera({
        sistema: "INGEANCLAJES SAS CERTIFICA 1 ESCALERA DE 5.5 METROS A UN COSTADO DE LA CANCHA EL SALADO CON SU RESPECTIVA LINEA DE VIDA VERTICAL.",
      })
    ).toBe(true);
  });

  it("no confunde líneas de vida o puntos de anclaje con escaleras", () => {
    expect(esCertificacionEscalera({ tipo: "Certificación", tipoSistema: "Líneas de vida horizontales" })).toBe(false);
    expect(esCertificacionEscalera({ tipo: "Certificación", tipoSistema: "Puntos de anclaje" })).toBe(false);
    expect(esCertificacionEscalera({ formatoEscalera: false })).toBe(false);
  });

  it("contiene las 15 pruebas de desempeño de la norma ANSI ASC A14.5-2017", () => {
    expect(PRUEBAS_ESCALERAS_ANSI).toHaveLength(15);
    expect(PRUEBAS_ESCALERAS_ANSI[0]).toEqual({
      numeral: "8.3.1",
      descripcion: "Prueba de flexión horizontal",
      resultado: "Conforme",
    });
    expect(PRUEBAS_ESCALERAS_ANSI[14]).toEqual({
      numeral: "8.7.3",
      descripcion: "Prueba cíclica de carga a rieles laterales",
      resultado: "Conforme",
    });
  });

  it("tiene la capacidad de carga correcta para Escalera Tipo Gato", () => {
    expect(CAPACIDAD_CARGA_ESCALERA).toEqual({
      tipo: "TIPO GATO",
      prueba: "Capacidad de carga",
      requisito: "300 lb – 136 kg",
      cargaPrueba: "1200 lb – 544,3 kg",
    });
  });

  it("inicializa el formulario de escaleras con formato y normativa ANSI", () => {
    const form = buildCertForm({ tipo: "Certificación de Escaleras" });
    expect(form.formatoEscalera).toBe(true);
    expect(form.normativa).toContain("ANSI ASC A14.5-2017");
    expect(form.tipoEscalera).toBe("TIPO GATO");
    expect(form.cargaPrueba).toBe("1200 lb – 544,3 kg");
    expect(form.garantiaAnos).toBe(2);
  });

  it("entrega los elementos por defecto específicos de escaleras fijas", () => {
    const elems = getCertDefaultElements("Certificación de Escaleras", "Escalera fija");
    expect(elems).toContain("Peldaños en acero galvanizado antideslizante");
    expect(elems).toContain("Largueros perfil estructural");
    expect(elems).toContain("Guardacuerpo de protección (jaula de seguridad)");
    expect(elems).toContain("Línea de vida vertical cable de acero Ø 8mm");
  });

  it("genera el PDF de 3 páginas delegando hojas múltiples a pdfDeHojas sin fallar por progreso", async () => {
    const { generarDocumentoPdf } = await import("../../lib/documentoPdf");
    const { pdfDeHojas } = await import("../../lib/pdfHojas");

    const nodoMock = {
      outerHTML: '<div id="pz" data-bleed-left="true" class="doc-shell-multi"><div class="doc-page page">1</div><div class="doc-page page">2</div><div class="doc-page page">3</div></div>',
      getAttribute: (attr) => (attr === "data-bleed-left" ? "true" : null),
      querySelectorAll: () => [{}, {}, {}],
    };

    const resultado = await generarDocumentoPdf(nodoMock, "Certificacion CERT-040");
    expect(pdfDeHojas).toHaveBeenCalledTimes(1);
    expect(resultado.nombre).toBe("Certificacion CERT-040.pdf");
    expect(resultado.blob).toBeInstanceOf(Blob);
  });
});
