import { describe, expect, it } from "vitest";
import {
  esDireccionDeObra,
  esListaDeSedesDeObra,
  limpiarDireccionFiscal,
  buscarDireccionFiscalCliente,
  sanitizarTextoSistema,
  sanitizarCertificado,
} from "./certSanitizer";
import { construirTextoSistema } from "./certConfig";
import { normalizarTextoCertificacion } from "../../lib/normalizarEntrada";
import { redactarSistemasDesdeCotizacion, formatearItemParaCertificado } from "../../lib/certificacionTexto";
import { corregirOrtografiaLocal } from "../../lib/correctorTexto";
import { renderTextoSistema } from "./renderTextoSistema";

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

    it("no repite 'a solicitud' cuando cliente u obra tienen paréntesis (caso MALL SANTANA) tras múltiples pasadas", () => {
      const cotMallSantana = {
        id: "COT-26200",
        numero: "C-26200",
        items: [
          { cant: 1, unit: "UND", desc: "RECERTIFICACIÓN ANUAL PUNTOS DE ANCLAJE" },
        ],
      };
      const redactado = redactarSistemasDesdeCotizacion(cotMallSantana);
      expect(redactado.texto).toBe("puntos de anclaje");
      expect(redactado.texto).not.toMatch(/recertificaci[oó]n/i);

      let texto = construirTextoSistema({
        tipo: "Recertificación",
        cliente: "CONSTRUCTORA CONCONCRETO COLOMBIA (MALL SANTANA)",
        nit: "890942766-4",
        direccion: "CL 50A #86 - 52",
        lugar: "MALL SANTANA (ETAPA 1)",
        detalle: redactado.texto,
      });

      let cert = {
        id: "CERT-26200",
        tipo: "Recertificación",
        cliente: "CONSTRUCTORA CONCONCRETO COLOMBIA (MALL SANTANA)",
        nit: "890942766-4",
        direccion: "CL 50A #86 - 52",
        lugar: "MALL SANTANA (ETAPA 1)",
        sistema: texto,
      };

      for (let i = 0; i < 10; i++) {
        cert = sanitizarCertificado(cert, { clientes: [], obras: [] });
        cert = { ...cert, sistema: normalizarTextoCertificacion(cert.sistema) };
      }

      const ocurrenciasSolicitud = cert.sistema.match(/a\s+solicitud/gi) || [];
      const ocurrenciasDireccion = cert.sistema.match(/con\s+direcci[oó]n/gi) || [];
      const ocurrenciasInstalados = cert.sistema.match(/instalad[ao]s?\s+en/gi) || [];

      expect(ocurrenciasSolicitud).toHaveLength(1);
      expect(ocurrenciasDireccion).toHaveLength(1);
      expect(ocurrenciasInstalados).toHaveLength(1);
      expect(cert.sistema).toContain(
        "RECERTIFICA que los sistemas de protección contra caídas consistentes en: puntos de anclaje, instalados en la obra MALL SANTANA (ETAPA 1), a solicitud de CONSTRUCTORA CONCONCRETO COLOMBIA (MALL SANTANA) (NIT: 890942766-4), con dirección CL 50A #86 - 52, fueron inspeccionados"
      );

      // Verifica también que renderTextoSistema renderice sin duplicar texto
      const nodos = renderTextoSistema(cert);
      const textoRenderizado = Array.isArray(nodos)
        ? nodos.map((n) => (typeof n === "string" ? n : n?.props?.children || "")).join("")
        : String(nodos || "");
      expect(textoRenderizado.match(/a\s+solicitud/gi) || []).toHaveLength(1);
    });

    it("repara automáticamente certificados ya guardados con 'a solicitud, a solicitud, a solicitud de ...' y prefijos redundantes", () => {
      const certCorrupto = {
        id: "CERT-CORRUPTO",
        tipo: "Recertificación",
        cliente: "CONSTRUCTORA CONCONCRETO COLOMBIA (MALL SANTANA)",
        nit: "890942766-4",
        direccion: "CL 50A #86 - 52",
        lugar: "",
        sistema:
          "RECERTIFICA que los sistemas de protección contra caídas consistentes en: un (1) recertificación anual puntos de anclaje, a solicitud, a solicitud, a solicitud, a solicitud de CONSTRUCTORA CONCONCRETO COLOMBIA (MALL SANTANA) (NIT: 890942766-4), con dirección CL 50A #86 - 52, fueron inspeccionados y verificados técnicamente, encontrándose estructuralmente conformes, operativos y aptos para trabajo seguro en alturas, cumpliendo a cabalidad con los requisitos de la Resolución 4272 de 2021 del Ministerio del Trabajo y los estándares de ingeniería aplicables.",
      };

      const reparado = sanitizarCertificado(certCorrupto, { clientes: [], obras: [] });
      expect(reparado.sistema.match(/a\s+solicitud/gi) || []).toHaveLength(1);
      expect(reparado.sistema).not.toMatch(/un\s*\(1\)\s*recertificaci[oó]n/i);
      expect(reparado.sistema).toContain(
        "consistentes en: puntos de anclaje, a solicitud de CONSTRUCTORA CONCONCRETO COLOMBIA (MALL SANTANA) (NIT: 890942766-4), con dirección CL 50A #86 - 52, fueron inspeccionados"
      );

      // Idempotencia tras reparar
      const segundaPasada = sanitizarCertificado(reparado, { clientes: [], obras: [] });
      expect(segundaPasada.sistema).toBe(reparado.sistema);
    });

    it("no duplica 'más', 'adicionales' ni corta descripciones con 'para cubierta' en múltiples pasadas", () => {
      let texto = construirTextoSistema({
        tipo: "Certificación",
        cliente: "EMPRESA EJEMPLO S.A.S",
        nit: "900123456-7",
        direccion: "CRA 43A # 10 - 20",
        lugar: "PLANTA NORTE",
        detalle: "dos (2) escaleras fijas para cubierta; tres (3) líneas de vida verticales en acero inoxidable",
      });

      for (let i = 0; i < 6; i++) {
        texto = normalizarTextoCertificacion(texto);
      }

      expect(texto).toContain("dos (2) escaleras fijas para cubierta; más tres (3) líneas de vida verticales en acero inoxidable");
      expect(texto).not.toMatch(/m[aá]s\s+m[aá]s/i);
      expect(texto.match(/a\s+solicitud/gi) || []).toHaveLength(1);
    });

    it("suma ítems idénticos en cotización y no antepone cantidad duplicada si ya viene formateada", () => {
      expect(formatearItemParaCertificado({ cant: 1, desc: "cuatro (4) puntos de anclaje certificados" })).toBe(
        "cuatro (4) puntos de anclaje certificados"
      );
      const cotDuplicada = {
        items: [
          { cant: 4, unit: "UND", desc: "SUMINISTRO E INSTALACIÓN DE PUNTOS DE ANCLAJE ARTICO" },
          { cant: 6, unit: "UND", desc: "SUMINISTRO E INSTALACIÓN DE PUNTOS DE ANCLAJE ARTICO" },
        ],
      };
      const res = redactarSistemasDesdeCotizacion(cotDuplicada);
      expect(res.texto).toBe("diez (10) puntos de anclaje artico");
      expect(res.cantidadTotal).toBe(10);
    });

    it("corregirOrtografiaLocal respeta palabras ya tildadas, verbos y repara tildes duplicadas", () => {
      expect(corregirOrtografiaLocal("Se inspeccionó y tensionó en óptimos ángulos; suministró soporte para validar")).toBe(
        "Se inspeccionó y tensionó en óptimos ángulos; suministró soporte para validar"
      );
      expect(corregirOrtografiaLocal("óóptimos inspecciónó")).toBe("óptimos inspeccionó");
    });
  });
});
