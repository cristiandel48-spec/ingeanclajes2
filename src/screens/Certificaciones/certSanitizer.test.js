import { describe, expect, it } from "vitest";
import {
  esDireccionDeObra,
  limpiarDireccionFiscal,
  buscarDireccionFiscalCliente,
  sanitizarTextoSistema,
  sanitizarCertificado,
} from "./certSanitizer";

describe("certSanitizer", () => {
  const mockClientes = [
    {
      id: "CL-100",
      nombre: "LUIS JAVIER GALEANO MURILLO",
      nit: "71705357-9",
      direccion: "CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA",
      ciudad: "Envigado",
    },
    {
      id: "CL-200",
      nombre: "EPM ESP",
      nit: "890.904.996-1",
      direccion: "Carrera 58 # 42 - 125, Medellín",
      ciudad: "Medellín",
    },
    {
      id: "CL-300",
      nombre: "CLIENTE SIN DIRECCION S.A.S",
      nit: "900.888.777-1",
      direccion: "",
      ciudad: "Caucasia",
    },
  ];

  const mockObras = [
    {
      id: "OB-045",
      cliente: "LUIS JAVIER GALEANO MURILLO",
      nit: "71705357-9",
      proyecto: "COM CAUCASIA EPM",
      nombre: "COM CAUCASIA EPM",
      direccion: "CAUCASIA EPM",
      ciudad: "Caucasia",
    },
  ];

  describe("limpiarDireccionFiscal", () => {
    it("desduplica direcciones que se repitieron varias veces", () => {
      const repetida =
        "CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA";
      const limpia = limpiarDireccionFiscal(repetida);
      expect(limpia).toBe("CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA");
    });

    it("corrige número desprendido al inicio como '75, CALLE 40 SUR...'", () => {
      const corrupta =
        "75, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA";
      const limpia = limpiarDireccionFiscal(corrupta);
      expect(limpia).toContain("CALLE 40 SUR NO 24 E");
      expect(limpia).toContain("ENVIGADO");
      expect(limpia).not.toMatch(/^75,/);
    });

    it("respeta una dirección única y bien formateada", () => {
      const buena = "CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA";
      expect(limpiarDireccionFiscal(buena)).toBe(buena);
    });
  });

  describe("esDireccionDeObra", () => {
    it("identifica 'CAUCASIA EPM' y variantes como nombre de obra", () => {
      expect(esDireccionDeObra("CAUCASIA EPM", mockObras[0])).toBe(true);
      expect(esDireccionDeObra("caucasia epm", mockObras[0])).toBe(true);
      expect(esDireccionDeObra("COM CAUCASIA EPM", mockObras[0])).toBe(true);
      expect(esDireccionDeObra("Caucasia", mockObras[0])).toBe(true);
    });

    it("no confunde una dirección real con nombre de obra", () => {
      expect(esDireccionDeObra("CALLE 40 SUR NO 24 E - 75, ENVIGADO", mockObras[0])).toBe(false);
      expect(esDireccionDeObra("Carrera 58 # 42 - 125", mockObras[0])).toBe(false);
    });
  });

  describe("buscarDireccionFiscalCliente", () => {
    it("encuentra la dirección fiscal en clientes para la obra", () => {
      const dir = buscarDireccionFiscalCliente(mockClientes, mockObras[0]);
      expect(dir).toBe("CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA");
    });

    it("nunca retorna el nombre de obra o 'CAUCASIA EPM'", () => {
      const dir = buscarDireccionFiscalCliente(mockClientes, {
        id: "OB-999",
        cliente: "CLIENTE DESCONOCIDO",
        direccion: "CAUCASIA EPM",
        proyecto: "CAUCASIA EPM",
      });
      expect(dir).toBe("");
    });
  });

  describe("sanitizarTextoSistema - caso exacto del usuario", () => {
    const textoDelUsuario =
      "CERTIFICA que los sistemas de protección contra caídas consistentes en: treinta (30) anclajes artico acero galvanizado, instalados en la sede COM CAUCASIA EPM, ubicada en 75, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, a solicitud de LUIS JAVIER GALEANO MURILLO (NIT: 71705357-9), fueron inspeccionados y verificados técnicamente, encontrándose estructuralmente conformes, operativos y aptos para trabajo seguro en alturas, cumpliendo a cabalidad con los requisitos de la Resolución 4272 de 2021 del Ministerio del Trabajo y los estándares de ingeniería aplicables.";

    it("cambia 'la sede' por 'la obra'", () => {
      const res = sanitizarTextoSistema(textoDelUsuario, "CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA", "COM CAUCASIA EPM");
      expect(res).toContain("instalados en la obra COM CAUCASIA EPM");
      expect(res).not.toContain("la sede");
    });

    it("elimina las 3 repeticiones y deja una sola dirección fiscal limpia", () => {
      const res = sanitizarTextoSistema(textoDelUsuario, "CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA", "COM CAUCASIA EPM");
      expect(res).toContain("ubicada en la CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA");
      // Contar apariciones de ENVIGADO en todo el texto (debe ser exactamente 1)
      const count = (res.match(/ENVIGADO/g) || []).length;
      expect(count).toBe(1);
    });

    it("es 100% idempotente: no duplica en pases sucesivos", () => {
      let res = textoDelUsuario;
      for (let i = 0; i < 5; i++) {
        res = sanitizarTextoSistema(res, "CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA", "COM CAUCASIA EPM");
      }
      expect(res).toContain("instalados en la obra COM CAUCASIA EPM");
      const count = (res.match(/ENVIGADO/g) || []).length;
      expect(count).toBe(1);
    });
  });

  describe("sanitizarCertificado", () => {
    it("sanea un certificado con dirección triplicada a una sola dirección limpia y con 'la obra'", () => {
      const certViejo = {
        id: "CERT-001",
        obraId: "OB-045",
        cliente: "LUIS JAVIER GALEANO MURILLO",
        nit: "71705357-9",
        lugar: "COM CAUCASIA EPM",
        direccion: "75, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA",
        sistema:
          "CERTIFICA que los sistemas de protección contra caídas consistentes en: treinta (30) anclajes, instalados en la sede COM CAUCASIA EPM, ubicada en 75, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, a solicitud de LUIS JAVIER GALEANO MURILLO (NIT: 71705357-9), fueron inspeccionados...",
      };

      const certSaneado = sanitizarCertificado(certViejo, { clientes: mockClientes, obras: mockObras });
      expect(certSaneado.direccion).toBe("CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA");
      expect(certSaneado.sistema).toContain("instalados en la obra COM CAUCASIA EPM");
      expect(certSaneado.sistema).toContain("CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA");
      const count = (certSaneado.sistema.match(/ENVIGADO/g) || []).length;
      expect(count).toBe(1);
    });
  });
});
