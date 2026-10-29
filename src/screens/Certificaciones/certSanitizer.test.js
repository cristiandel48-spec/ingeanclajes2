import { describe, expect, it } from "vitest";
import {
  esDireccionDeObra,
  buscarDireccionFiscalCliente,
  sanitizarTextoSistema,
  sanitizarCertificado,
  sanitizarListaCertificados,
} from "./certSanitizer";

describe("certSanitizer", () => {
  const mockClientes = [
    {
      id: "CL-100",
      nombre: "LUIS JAVIER GALEANO MURILLO",
      nit: "71.223.456",
      direccion: "Calle 50 # 40 - 20, Envigado",
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
      nit: "71.223.456",
      proyecto: "COM CAUCASIA",
      nombre: "COM CAUCASIA",
      direccion: "CAUCASIA EPM",
      ciudad: "Caucasia",
    },
  ];

  describe("esDireccionDeObra", () => {
    it("identifica 'CAUCASIA EPM' y variantes como nombre de obra", () => {
      expect(esDireccionDeObra("CAUCASIA EPM", mockObras[0])).toBe(true);
      expect(esDireccionDeObra("caucasia epm", mockObras[0])).toBe(true);
      expect(esDireccionDeObra("COM CAUCASIA", mockObras[0])).toBe(true);
      expect(esDireccionDeObra("Caucasia", mockObras[0])).toBe(true);
    });

    it("no confunde una dirección real con nombre de obra", () => {
      expect(esDireccionDeObra("Calle 50 # 40 - 20, Envigado", mockObras[0])).toBe(false);
      expect(esDireccionDeObra("Carrera 58 # 42 - 125", mockObras[0])).toBe(false);
    });
  });

  describe("buscarDireccionFiscalCliente", () => {
    it("encuentra la dirección fiscal en clientes para la obra", () => {
      const dir = buscarDireccionFiscalCliente(mockClientes, mockObras[0]);
      expect(dir).toBe("Calle 50 # 40 - 20, Envigado");
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

    it("retorna vacío si el cliente no tiene dirección en el directorio", () => {
      const dir = buscarDireccionFiscalCliente(mockClientes, null, "CLIENTE SIN DIRECCION S.A.S");
      expect(dir).toBe("");
    });
  });

  describe("sanitizarTextoSistema", () => {
    const textoConError =
      "CERTIFICA que los sistemas de protección contra caídas consistentes en: Línea de vida horizontal de 20 ML, instalados en la sede COM CAUCASIA, ubicada en la CAUCASIA EPM, a solicitud de LUIS JAVIER GALEANO MURILLO (NIT: 71.223.456), fueron inspeccionados y verificados técnicamente, encontrándose estructuralmente conformes, operativos y aptos para trabajo seguro en alturas, cumpliendo a cabalidad con los requisitos de la Resolución 4272 de 2021 del Ministerio del Trabajo y los estándares de ingeniería aplicables.";

    it("reemplaza 'ubicada en la CAUCASIA EPM' con la dirección fiscal real del cliente", () => {
      const resultado = sanitizarTextoSistema(textoConError, "Calle 50 # 40 - 20, Envigado", "COM CAUCASIA");
      expect(resultado).not.toContain("CAUCASIA EPM");
      expect(resultado).toContain("ubicada en la CALLE 50 # 40 - 20, ENVIGADO");
      expect(resultado).toContain("a solicitud de LUIS JAVIER GALEANO MURILLO");
    });

    it("elimina completamente la cláusula 'ubicada en...' si no hay dirección fiscal", () => {
      const resultado = sanitizarTextoSistema(textoConError, "", "COM CAUCASIA");
      expect(resultado).not.toContain("CAUCASIA EPM");
      expect(resultado).not.toContain("ubicada en");
      expect(resultado).toContain("instalados en la sede COM CAUCASIA, a solicitud de LUIS JAVIER GALEANO MURILLO");
    });

    it("elimina 'ubicada en la' huérfano", () => {
      const textoHuerfano =
        "CERTIFICA que los sistemas de protección contra caídas consistentes en: Línea de vida horizontal, instalados en la sede COM CAUCASIA, ubicada en la, a solicitud de LUIS JAVIER GALEANO MURILLO (NIT: 71.223.456), fueron inspeccionados y verificados técnicamente...";
      const resultado = sanitizarTextoSistema(textoHuerfano, "", "COM CAUCASIA");
      expect(resultado).not.toContain("ubicada en");
      expect(resultado).toContain("instalados en la sede COM CAUCASIA, a solicitud de LUIS JAVIER GALEANO MURILLO");
    });
  });

  describe("sanitizarCertificado", () => {
    it("sanea un certificado con dirección errónea a la dirección fiscal del cliente", () => {
      const certViejo = {
        id: "CERT-001",
        obraId: "OB-045",
        cliente: "LUIS JAVIER GALEANO MURILLO",
        nit: "71.223.456",
        lugar: "COM CAUCASIA",
        direccion: "CAUCASIA EPM",
        sistema:
          "CERTIFICA que los sistemas de protección contra caídas consistentes en: Línea de vida horizontal, instalados en la sede COM CAUCASIA, ubicada en la CAUCASIA EPM, a solicitud de LUIS JAVIER GALEANO MURILLO (NIT: 71.223.456), fueron inspeccionados y verificados técnicamente...",
      };

      const certSaneado = sanitizarCertificado(certViejo, { clientes: mockClientes, obras: mockObras });
      expect(certSaneado.direccion).toBe("Calle 50 # 40 - 20, Envigado");
      expect(certSaneado.sistema).toContain("CALLE 50 # 40 - 20, ENVIGADO");
      expect(certSaneado.sistema).not.toContain("CAUCASIA EPM");
    });

    it("deja la dirección vacía y limpia el texto si el cliente no tiene dirección fiscal", () => {
      const certSinDir = {
        id: "CERT-002",
        obraId: "OB-999",
        cliente: "CLIENTE SIN DIRECCION S.A.S",
        nit: "900.888.777-1",
        lugar: "COM CAUCASIA",
        direccion: "CAUCASIA EPM",
        sistema:
          "CERTIFICA que los sistemas de protección contra caídas consistentes en: Línea de vida horizontal, instalados en la sede COM CAUCASIA, ubicada en la CAUCASIA EPM, a solicitud de CLIENTE SIN DIRECCION S.A.S (NIT: 900.888.777-1), fueron inspeccionados y verificados técnicamente...",
      };

      const certSaneado = sanitizarCertificado(certSinDir, { clientes: mockClientes, obras: [] });
      expect(certSaneado.direccion).toBe("");
      expect(certSaneado.sistema).not.toContain("CAUCASIA EPM");
      expect(certSaneado.sistema).not.toContain("ubicada en");
    });
  });

  describe("sanitizarListaCertificados", () => {
    it("sanea una lista de certificados de una sola vez", () => {
      const lista = [
        {
          id: "CERT-001",
          obraId: "OB-045",
          cliente: "LUIS JAVIER GALEANO MURILLO",
          nit: "71.223.456",
          direccion: "CAUCASIA EPM",
          sistema: "CERTIFICA que ..., ubicada en la CAUCASIA EPM, a solicitud de LUIS JAVIER GALEANO MURILLO...",
        },
      ];
      const saneada = sanitizarListaCertificados(lista, { clientes: mockClientes, obras: mockObras });
      expect(saneada[0].direccion).toBe("Calle 50 # 40 - 20, Envigado");
    });
  });
});
