import { describe, expect, it } from "vitest";
import {
  aplicarCoordinadorAPersonal,
  claveCoordinador,
  detectarCoordinadorEnSesion,
  extraerCoordinadorDeInforme,
  getFirmaCoordinador,
  guardarFirmaCoordinador,
  obtenerOpcionesCoordinadores,
  personalVisibleEnInforme,
  quitarFirmaCoordinador,
  recordatorioFirmaPara,
} from "./firmasCoordinadores";
import { getControlDocumental } from "./controlDocumental";
import { getFirmaImg } from "./firmaEmpresa";
import { buildInformePrintHtml } from "./informePrint";

const FIRMA_JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

describe("firmasCoordinadores", () => {
  it("normaliza nombres con mayúsculas, tildes y espacios a una clave estable", () => {
    expect(claveCoordinador("Richard Buelvas")).toBe("richard-buelvas");
    expect(claveCoordinador("  RICHARD   BUELVAS ")).toBe("richard-buelvas");
    expect(claveCoordinador("Paola Escobar")).toBe("paola-escobar");
    expect(claveCoordinador("María José Pérez")).toBe("maria-jose-perez");
  });

  it("guarda la firma del coordinador en empresaConfig sin alterar la fila principal empresa", () => {
    const base = [
      {
        id: "empresa",
        firmaImg: FIRMA_JPEG,
        controlDocumental: {
          informe: { codigo: "IA-FT-02", version: "2", fecha: "2026-10-01" },
        },
      },
    ];

    const conRichard = guardarFirmaCoordinador(base, {
      nombre: "richard buelvas",
      cargo: "Coordinador SST",
      cedula: "1037600111",
      empleadoId: "EMP-04",
      firmaImg: FIRMA_JPEG,
    });

    expect(conRichard).toHaveLength(2);
    expect(getFirmaImg(conRichard)).toBe(FIRMA_JPEG);
    expect(getControlDocumental(conRichard).informe.codigo).toBe("IA-FT-02");

    const perfil = getFirmaCoordinador(conRichard, "RICHARD BUELVAS");
    expect(perfil).toMatchObject({
      nombre: "Richard Buelvas",
      cargo: "COORDINADOR SST",
      cedula: "1037600111",
      empleadoId: "EMP-04",
      firmaImg: FIRMA_JPEG,
    });

    const sinImagen = quitarFirmaCoordinador(conRichard, "Richard Buelvas");
    expect(getFirmaCoordinador(sinImagen, "Richard Buelvas")?.firmaImg).toBe("");
    expect(getFirmaCoordinador(sinImagen, "Richard Buelvas")?.cedula).toBe("1037600111");
  });

  it("auto-detecta al coordinador en el personal del informe y adjunta su firma guardada y cédula", () => {
    const empleados = [
      { id: "EMP-3", nombre: "Paola Escobar", cargo: "COORDINADORA DE ALTURAS", cedula: "1017200333", activo: true },
      { id: "EMP-4", nombre: "Richard Buelvas", cargo: "COORDINADOR SST", cedula: "1037600444", activo: true },
    ];
    const empresaConfig = guardarFirmaCoordinador([], {
      nombre: "Paola Escobar",
      cargo: "COORDINADORA SST",
      firmaImg: FIRMA_JPEG,
    });

    const informe = {
      id: "INF-010",
      personal: [
        { empleadoId: "EMP-1", nombre: "Juan Gómez", cargo: "INSTALADOR" },
        { empleadoId: "EMP-3", nombre: "Paola Escobar", cargo: "COORDINADORA DE ALTURAS" },
      ],
    };

    const coord = extraerCoordinadorDeInforme(informe, { empleados, empresaConfig });
    expect(coord).toMatchObject({
      nombre: "Paola Escobar",
      cedula: "1017200333",
      firmaImg: FIRMA_JPEG,
      tieneFirmaGuardada: true,
    });
  });

  it("persiste el coordinador dentro de personal sin duplicarlo ni mostrar marcadores solo-firma", () => {
    const cuadrilla = [{ empleadoId: "EMP-1", nombre: "Luis Ríos", cargo: "INSTALADOR" }];
    const conSoloFirma = aplicarCoordinadorAPersonal(cuadrilla, {
      nombre: "Richard Buelvas",
      cargo: "COORDINADOR SST",
      cedula: "1037600444",
    });

    expect(personalVisibleEnInforme(conSoloFirma)).toHaveLength(1);
    const extraido = extraerCoordinadorDeInforme({ personal: conSoloFirma });
    expect(extraido?.nombre).toBe("Richard Buelvas");
    expect(extraido?.cedula).toBe("1037600444");
  });

  it("incluye siempre a Richard Buelvas y Paola Escobar en las opciones rápidas sin duplicarlos", () => {
    const opciones = obtenerOpcionesCoordinadores({
      empleados: [
        { id: "EMP-4", nombre: "RICHARD BUELVAS", cargo: "COORDINADOR SST", cedula: "12345", activo: true },
      ],
      empresaConfig: guardarFirmaCoordinador([], { nombre: "Paola Escobar", firmaImg: FIRMA_JPEG }),
    });

    const nombres = opciones.map((o) => o.nombre);
    expect(nombres).toContain("Richard Buelvas");
    expect(nombres).toContain("Paola Escobar");
    expect(opciones.filter((o) => o.clave === "richard-buelvas")).toHaveLength(1);
    expect(opciones.find((o) => o.clave === "richard-buelvas")?.cedula).toBe("12345");
    expect(opciones.find((o) => o.clave === "paola-escobar")?.firmaImg).toBe(FIRMA_JPEG);
  });

  it("imprime el informe con la tarjeta del coordinador y su auto-firma JPEG", () => {
    const empresaConfig = guardarFirmaCoordinador([], {
      nombre: "Richard Buelvas",
      cargo: "COORDINADOR SST",
      cedula: "1037600444",
      firmaImg: FIRMA_JPEG,
    });

    const html = buildInformePrintHtml(
      {
        id: "INF-099",
        proyecto: "RIO SUR",
        cliente: "RIO SUR",
        fechaInforme: "2026-10-20",
        personal: aplicarCoordinadorAPersonal(
          [{ nombre: "Juan Gómez", cargo: "INSTALADOR" }],
          { nombre: "Richard Buelvas", cargo: "COORDINADOR SST", cedula: "1037600444" }
        ),
        actividades: [{ titulo: "Instalación de puntos de anclaje", descripcion: "Ejecutado en cubierta." }],
      },
      { empresaConfig, firmaImg: FIRMA_JPEG }
    );

    expect(html).toContain("Coordinador de Obra / SST");
    expect(html).toContain("Richard Buelvas");
    expect(html).toContain("C.C.: 1037600444");
    expect(html).toContain('alt="Firma del coordinador"');
    expect(html).toContain(FIRMA_JPEG);
  });

  describe("detectarCoordinadorEnSesion", () => {
    it("reconoce a Paola Escobar al iniciar sesión (sin firma aún y luego con firma guardada)", () => {
      const sinFirma = detectarCoordinadorEnSesion({
        membresia: { nombre: "Paola Escobar", email: "paola@ingeanclajessas.com", role: "operador" },
        empleados: [{ id: "EMP-3", nombre: "Paola Escobar", cargo: "COORDINADORA DE ALTURAS", cedula: "1017200333", activo: true }],
        empresaConfig: [],
      });

      expect(sinFirma).toMatchObject({
        clave: "paola-escobar",
        nombre: "Paola Escobar",
        cargo: "COORDINADORA DE ALTURAS",
        cedula: "1017200333",
        tieneFirmaGuardada: false,
      });

      const configConFirma = guardarFirmaCoordinador([], {
        nombre: "Paola Escobar",
        firmaImg: FIRMA_JPEG,
      });
      const conFirma = detectarCoordinadorEnSesion({
        membresia: { nombre: "Paola Escobar", email: "paola@ingeanclajessas.com" },
        empresaConfig: configConFirma,
      });
      expect(conFirma?.tieneFirmaGuardada).toBe(true);
      expect(conFirma?.firmaImg).toBe(FIRMA_JPEG);
    });

    it("reconoce a Richard Buelvas incluso solo por correo corporativo", () => {
      const detectado = detectarCoordinadorEnSesion({
        membresia: { nombre: "", email: "richard.buelvas@ingeanclajessas.com", role: "operador" },
        empresaConfig: [],
      });

      expect(detectado).toMatchObject({
        clave: "richard-buelvas",
        nombre: "Richard Buelvas",
        cargo: "COORDINADOR SST",
        tieneFirmaGuardada: false,
      });
    });

    it("el recordatorio de firma es solo para Richard Buelvas, con nombre corto o completo", () => {
      const sesionRichard = detectarCoordinadorEnSesion({
        membresia: { nombre: "Richard Buelvas", email: "sst@ejemplo.com", role: "manager" },
        empleados: [{ id: "E16", nombre: "Richard Javier Buelvas Mendoza", cargo: "COORDINADOR SST", activo: true }],
        empresaConfig: [],
      });
      expect(sesionRichard?.tieneFirmaGuardada).toBe(false);
      expect(recordatorioFirmaPara(sesionRichard)?.mensaje).toMatch(/Informe de Actividades/);
      expect(recordatorioFirmaPara("Richard Javier Buelvas Mendoza")?.persona).toBe("Richard Buelvas");

      expect(recordatorioFirmaPara("Paola Escobar")).toBeNull();
      expect(recordatorioFirmaPara({ nombre: "Arelis Quiñones Herrera" })).toBeNull();
      expect(recordatorioFirmaPara({ nombre: "Richard Gómez" })).toBeNull();
      expect(recordatorioFirmaPara(null)).toBeNull();
    });

    it("reconoce a cualquier otro empleado activo cuyo cargo sea Coordinador / SST", () => {
      const detectado = detectarCoordinadorEnSesion({
        membresia: { nombre: "Carlos Medina", email: "carlos@ingeanclajessas.com", role: "operador" },
        empleados: [{ id: "EMP-9", nombre: "Carlos Medina", cargo: "COORDINADOR SST", cedula: "98765432", activo: true }],
        empresaConfig: [],
      });

      expect(detectado).toMatchObject({
        clave: "carlos-medina",
        nombre: "Carlos Medina",
        cargo: "COORDINADOR SST",
        cedula: "98765432",
        tieneFirmaGuardada: false,
      });
    });

    it("no pide firma de coordinador a usuarios administrativos ni a instaladores", () => {
      expect(
        detectarCoordinadorEnSesion({
          membresia: { nombre: "Camila Sepúlveda", email: "camilascadavid@gmail.com", role: "admin" },
          empleados: [{ id: "EMP-1", nombre: "Juan Gómez", cargo: "INSTALADOR", activo: true }],
          empresaConfig: [],
        })
      ).toBeNull();

      expect(
        detectarCoordinadorEnSesion({
          membresia: { nombre: "Juan Gómez", email: "juan@ingeanclajessas.com", role: "operador" },
          empleados: [{ id: "EMP-1", nombre: "Juan Gómez", cargo: "INSTALADOR", activo: true }],
          empresaConfig: [],
        })
      ).toBeNull();
    });

    it("unifica nombres cortos y completos reales sin duplicar (Yesli Paola Escobar Sanchez y Richard Javier Buelvas Mendoza)", () => {
      const empleados = [
        { id: "EMP-3", nombre: "Yesli Paola Escobar Sanchez", cargo: "COORDINADORA SST", cedula: "1017200333", activo: true },
        { id: "EMP-4", nombre: "Richard Javier Buelvas Mendoza", cargo: "COORDINADOR SST", cedula: "1037600444", activo: true },
      ];
      const configConFirma = guardarFirmaCoordinador([], {
        nombre: "Paola Escobar",
        firmaImg: FIRMA_JPEG,
      });

      const opciones = obtenerOpcionesCoordinadores({ empleados, empresaConfig: configConFirma });
      expect(opciones).toHaveLength(2);
      const paola = opciones.find((o) => o.empleadoId === "EMP-3");
      const richard = opciones.find((o) => o.empleadoId === "EMP-4");
      expect(paola?.nombre).toBe("Yesli Paola Escobar Sanchez");
      expect(paola?.firmaImg).toBe(FIRMA_JPEG);
      expect(richard?.nombre).toBe("Richard Javier Buelvas Mendoza");

      // Guardar luego con el nombre completo actualiza la misma fila, no duplica
      const actualizada = guardarFirmaCoordinador(configConFirma, {
        nombre: "Yesli Paola Escobar Sanchez",
        cedula: "1017200333",
        empleadoId: "EMP-3",
        firmaImg: FIRMA_JPEG,
      });
      expect(actualizada).toHaveLength(1);
    });

    it("no deja la página 1 en blanco en informes con 7 técnicos y actividad extensa", () => {
      const html = buildInformePrintHtml({
        id: "INF-041",
        proyecto: "RIO SUR",
        cliente: "RIO SUR",
        localizacion: "MEDELLÍN - ANTIOQUIA",
        fechaInforme: "2026-11-13",
        periodoInicio: "2026-11-13",
        periodoFin: "2026-11-13",
        cotizacionNumero: "C-26211",
        personal: [
          { nombre: "Yesli Paola Escobar Sanchez", cargo: "COORDINADORA SST" },
          { nombre: "Richard Javier Buelvas Mendoza", cargo: "COORDINADOR SST" },
          { nombre: "Wladimir Celestino Areinamo", cargo: "SOLDADOR" },
          { nombre: "Leonardo Sarmiento", cargo: "SOLDADOR" },
          { nombre: "William Alvarez Marin", cargo: "INSTALADOR" },
          { nombre: "Reynaldo Fabio de Leon Ospino", cargo: "SOLDADOR" },
          { nombre: "Johnny Perdomo", cargo: "INSTALADOR" },
        ],
        actividades: [{
          titulo: "Instalación Puntos de Anclaje",
          fecha: "2026-11-13",
          actividadesRealizadas: "Se realizó el replanteo y la marcación de los puntos de anclaje de acuerdo con el diseño aprobado.",
          descripcion: "INSTALACIÓN DE DOS (2) PUNTOS DE ANCLAJE – TERRAZA LOCAL 313. ".repeat(10),
          observaciones: "Instalación completada.",
          fotos: Array.from({ length: 7 }, (_, i) => ({ img: FIRMA_JPEG, comentario: `Foto ${i + 1}` })),
        }],
      });
      const primeraPagina = html.split("</section>")[0];
      // La tabla de la actividad ACT-01 debe quedar en la página 1, no mandarse a página 2 dejando hueco blanco
      expect(primeraPagina).toContain("ACT-01");
      expect(primeraPagina).toContain("Instalación Puntos de Anclaje");
    });
  });
});
