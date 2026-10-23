import { describe, expect, it } from "vitest";
import { certificacionRepetida, informeRepetido } from "./duplicados";

const HOY = "2026-10-23";

describe("certificaciones repetidas", () => {
  const vigente = { id: "CERT-035", obraId: "OB-044", tipo: "Certificación", proxMant: "2027-09-18", estado: "Vigente", sistema: "CERTIFICA ... en la sede CAUCASIA" };

  it("no deja certificar otra vez la misma obra mientras la anterior está vigente", () => {
    expect(certificacionRepetida([vigente], { obraId: "OB-044", tipo: "Recertificación" }, { hoy: HOY })?.id).toBe("CERT-035");
    expect(certificacionRepetida([vigente], { obraId: "OB-044", lugar: "Caucasia" }, { hoy: HOY })?.id).toBe("CERT-035");
  });

  it("deja editar la misma, certificar otra sede y recertificar cuando venció", () => {
    expect(certificacionRepetida([vigente], { obraId: "OB-044" }, { editId: "CERT-035", hoy: HOY })).toBeNull();
    expect(certificacionRepetida([vigente], { obraId: "OB-044", lugar: "Tenerife #43" }, { hoy: HOY })).toBeNull();
    expect(certificacionRepetida([{ ...vigente, proxMant: "2026-01-01" }], { obraId: "OB-044" }, { hoy: HOY })).toBeNull();
    expect(certificacionRepetida([{ ...vigente, estado: "Recertificado" }], { obraId: "OB-044" }, { hoy: HOY })).toBeNull();
    expect(certificacionRepetida([vigente], { obraId: "OB-045" }, { hoy: HOY })).toBeNull();
  });
});

describe("informes repetidos", () => {
  const inf = { id: "INF-034", obraId: "OB-044", proyecto: "COM CAUCASIA", periodoInicio: "2026-09-16", periodoFin: "2026-09-18" };

  it("no deja otro informe de la misma obra y sede con período cruzado", () => {
    expect(informeRepetido([inf], { obraId: "OB-044", proyecto: "COM CAUCASIA", periodoInicio: "2026-09-18", periodoFin: "2026-09-30" })?.id).toBe("INF-034");
  });

  it("deja otro período, otra sede o editar el mismo", () => {
    expect(informeRepetido([inf], { obraId: "OB-044", proyecto: "COM CAUCASIA", periodoInicio: "2026-09-19", periodoFin: "2026-09-30" })).toBeNull();
    expect(informeRepetido([inf], { obraId: "OB-044", proyecto: "SEDE NORTE", periodoInicio: "2026-09-16", periodoFin: "2026-09-18" })).toBeNull();
    expect(informeRepetido([inf], { ...inf }, { editId: "INF-034" })).toBeNull();
  });
});
