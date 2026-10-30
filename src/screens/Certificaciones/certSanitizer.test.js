import { describe, expect, it } from "vitest";
import {
  esDireccionDeObra,
  esListaDeSedesDeObra,
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
    it("quita municipio y departamento dejando una sola dirección limpia", () => {
      const repetida =
        "CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA";
      expect(limpiarDireccionFiscal(repetida)).toBe("CALLE 40 SUR NO 24 E - 75");
      expect(limpiarDireccionFiscal("Carrera 58 # 42 - 125, Medellín")).toBe("Carrera 58 # 42 - 125");
      expect(limpiarDireccionFiscal("DIAGONAL 50B #43-64 - ITAGÜÍ - ANTIOQUIA")).toBe("DIAGONAL 50B #43-64");
    });

    it("corrige número desprendido al inicio y quita municipio/departamento", () => {
      const corrupta =
        "75, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA";
      const limpia = limpiarDireccionFiscal(corrupta);
      expect(limpia).toBe("CALLE 40 SUR NO 24 E - 75");
      expect(limpia).not.toContain("ENVIGADO");
      expect(limpia).not.toContain("ANTIOQUIA");
    });

    it("deja solo una dirección si vienen varias separadas por coma, conservando complemento interior si aplica", () => {
      expect(limpiarDireccionFiscal("CRA 43A # 1-50, CALLE 10 # 20-30, MEDELLÍN")).toBe("CRA 43A # 1-50");
      expect(limpiarDireccionFiscal("CALLE 10 # 43E-20, BODEGA 39, MEDELLÍN, ANTIOQUIA")).toBe("CALLE 10 # 43E-20, BODEGA 39");
    });

    it("descarta listados múltiples de sedes o peajes sin nomenclatura vial", () => {
      const peajes = "TORCA, EL BOTE, LA MESA, IBAGUE, LA VIRGINIA, SAN BERNARDINO, LA ESMERALDA, MIRAFLORES";
      expect(esListaDeSedesDeObra(peajes)).toBe(true);
      expect(limpiarDireccionFiscal(peajes)).toBe("");
    });
  });

  describe("esDireccionDeObra", () => {
    it("identifica 'CAUCASIA EPM' y listados de sedes como dirección de obra", () => {
      expect(esDireccionDeObra("CAUCASIA EPM", mockObras[0])).toBe(true);
      expect(esDireccionDeObra("caucasia epm", mockObras[0])).toBe(true);
      expect(esDireccionDeObra("COM CAUCASIA EPM", mockObras[0])).toBe(true);
      expect(esDireccionDeObra("Caucasia", mockObras[0])).toBe(true);
      expect(
        esDireccionDeObra(
          "TORCA, EL BOTE, LA MESA, IBAGUE, LA VIRGINIA, SAN BERNARDINO, LA ESMERALDA, MIRAFLORES",
          mockObras[0]
        )
      ).toBe(true);
    });

    it("no confunde una dirección real con nombre de obra", () => {
      expect(esDireccionDeObra("CALLE 40 SUR NO 24 E - 75", mockObras[0])).toBe(false);
      expect(esDireccionDeObra("Carrera 58 # 42 - 125", mockObras[0])).toBe(false);
    });
  });

  describe("buscarDireccionFiscalCliente", () => {
    it("encuentra la dirección del cliente en la tabla clientes sin municipio ni departamento", () => {
      const dir = buscarDireccionFiscalCliente(mockClientes, mockObras[0]);
      expect(dir).toBe("CALLE 40 SUR NO 24 E - 75");
    });

    it("nunca retorna el nombre de obra ni listados múltiples de frentes", () => {
      const dir = buscarDireccionFiscalCliente(mockClientes, {
        id: "OB-999",
        cliente: "CLIENTE DESCONOCIDO",
        direccion: "CAUCASIA EPM",
        proyecto: "CAUCASIA EPM",
      });
      expect(dir).toBe("");
    });
  });

  describe("sanitizarTextoSistema", () => {
    const textoDelUsuario =
      "CERTIFICA que los sistemas de protección contra caídas consistentes en: treinta (30) anclajes artico acero galvanizado, instalados en la sede COM CAUCASIA EPM, ubicada en 75, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, a solicitud de LUIS JAVIER GALEANO MURILLO (NIT: 71705357-9), fueron inspeccionados y verificados técnicamente, encontrándose estructuralmente conformes, operativos y aptos para trabajo seguro en alturas, cumpliendo a cabalidad con los requisitos de la Resolución 4272 de 2021 del Ministerio del Trabajo y los estándares de ingeniería aplicables.";

    it("cambia 'la sede' por 'la obra' y deja una sola dirección sin municipio ni departamento", () => {
      const res = sanitizarTextoSistema(textoDelUsuario, "CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA", "COM CAUCASIA EPM");
      expect(res).toContain(
        "instalados en la obra COM CAUCASIA EPM, a solicitud de LUIS JAVIER GALEANO MURILLO (NIT: 71705357-9), con dirección CALLE 40 SUR NO 24 E - 75, fueron inspeccionados"
      );
      expect(res).not.toContain("la sede");
      expect(res).not.toContain("ENVIGADO");
      expect(res).not.toContain("ANTIOQUIA");
    });

    it("maneja direcciones con Diagonal sin anteponer 'en la'", () => {
      const textoDiagonal =
        "CERTIFICA que los sistemas de protección contra caídas consistentes en: treinta (30) líneas de vida horizontales, instalados en la obra BODEGA 39 CENTRAL DE EMPRESAS Y NEGOCIOS, a solicitud de PRODUCTOS ALIMENTICIOS SOL DE ORIENTE (NIT: 811035319-7), con dirección en la DIAGONAL 50B #43-64, fueron inspeccionados...";
      const res = sanitizarTextoSistema(textoDiagonal, "DIAGONAL 50B #43-64", "BODEGA 39 CENTRAL DE EMPRESAS Y NEGOCIOS");
      expect(res).toContain("con dirección DIAGONAL 50B #43-64");
      expect(res).not.toContain("en la DIAGONAL");
    });

    it("es 100% idempotente: no duplica en pases sucesivos", () => {
      let res = textoDelUsuario;
      for (let i = 0; i < 5; i++) {
        res = sanitizarTextoSistema(res, "CALLE 40 SUR NO 24 E - 75, ENVIGADO, ANTIOQUIA", "COM CAUCASIA EPM");
      }
      expect(res).toContain(
        "instalados en la obra COM CAUCASIA EPM, a solicitud de LUIS JAVIER GALEANO MURILLO (NIT: 71705357-9), con dirección CALLE 40 SUR NO 24 E - 75, fueron inspeccionados"
      );
    });
  });

  describe("sanitizarCertificado", () => {
    it("sanea un certificado dejando una sola dirección de la tabla clientes sin municipio ni departamento", () => {
      const certViejo = {
        id: "CERT-001",
        obraId: "OB-045",
        cliente: "LUIS JAVIER GALEANO MURILLO",
        nit: "71705357-9",
        lugar: "COM CAUCASIA EPM",
        direccion: "75, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA",
        sistema:
          "CERTIFICA que los sistemas de protección contra caídas consistentes en: treinta (30) anclajes, instalados en la sede COM CAUCASIA EPM, ubicada en 75, CALLE 40 SUR NO 24 E, ENVIGADO, ANTIOQUIA, a solicitud de LUIS JAVIER GALEANO MURILLO (NIT: 71705357-9), fueron inspeccionados...",
      };

      const certSaneado = sanitizarCertificado(certViejo, { clientes: mockClientes, obras: mockObras });
      expect(certSaneado.direccion).toBe("CALLE 40 SUR NO 24 E - 75");
      expect(certSaneado.sistema).toContain(
        "instalados en la obra COM CAUCASIA EPM, a solicitud de LUIS JAVIER GALEANO MURILLO (NIT: 71705357-9), con dirección CALLE 40 SUR NO 24 E - 75, fueron inspeccionados"
      );
    });
  });
});
