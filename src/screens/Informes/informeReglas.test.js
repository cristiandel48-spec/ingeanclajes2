import { describe, expect, it } from "vitest";
import {
  construirActividadDesdeItemCot,
  evaluarGuardadoInforme,
  firmaContenidoActividades,
} from "./informeReglas";
import { siguienteIdUnico } from "../../lib/identificadores";

describe("Informes múltiples por obra y sin bloqueos", () => {
  const informeBase = {
    id: "INF-001",
    obraId: "OB-011",
    proyecto: "BODEGA CENTRAL",
    periodoInicio: "2026-10-01",
    periodoFin: "2026-10-30",
    actividades: [
      {
        titulo: "ESCALERA FIJA TIPO GATO",
        actividadesRealizadas: "Instalación de escalera fija.",
        descripcion: "Montaje estructural.",
        observaciones: "1 escalera fija",
      },
    ],
  };

  it("permite crear múltiples informes para la misma obra, proyecto y período cuando registran actividades distintas sin interrumpir ni bloquear", () => {
    const nuevoForm = {
      obraId: "OB-011",
      proyecto: "BODEGA CENTRAL",
      periodoInicio: "2026-10-01",
      periodoFin: "2026-10-30",
      actividades: [
        construirActividadDesdeItemCot(
          { desc: "LÍNEA DE VIDA HORIZONTAL", cant: 30, unit: "Metro" },
          "C-26138",
          "2026-10-28"
        ),
      ],
    };

    const res = evaluarGuardadoInforme({
      informes: [informeBase],
      form: nuevoForm,
      editId: null,
      recibeEmail: "",
    });

    expect(res.formatoCorreoInvalido).toBe(false);
    expect(res.requiereConfirmarDuplicado).toBe(false);
    expect(res.informeSimilar).toBeNull();
    expect(siguienteIdUnico([informeBase], "INF")).toBe("INF-002");
  });

  it("no bloquea el guardado cuando la obra no tiene acta de entrega ni correo de quien recibe", () => {
    const res = evaluarGuardadoInforme({
      informes: [],
      form: {
        obraId: "OB-099", // obra sin acta ni correo
        proyecto: "PLANTA SUR",
        periodoInicio: "2026-10-15",
        periodoFin: "2026-10-20",
        actividades: [{ titulo: "INSPECCIÓN ANUAL", actividadesRealizadas: "Revisión", descripcion: "Ok", observaciones: "" }],
      },
      editId: null,
      recibeEmail: "",
    });

    expect(res.formatoCorreoInvalido).toBe(false);
    expect(res.requiereConfirmarDuplicado).toBe(false);
  });

  it("solo valida formato de correo si el usuario escribió un correo mal formado", () => {
    const invalido = evaluarGuardadoInforme({
      informes: [],
      form: { obraId: "OB-011" },
      recibeEmail: "residente@",
    });
    expect(invalido.formatoCorreoInvalido).toBe(true);

    const valido = evaluarGuardadoInforme({
      informes: [],
      form: { obraId: "OB-011" },
      recibeEmail: "residente@obra.com",
    });
    expect(valido.formatoCorreoInvalido).toBe(false);
  });

  it("cuando el contenido, proyecto y período son idénticos, solicita confirmación opcional pero nunca impone bloqueo duro", () => {
    const clon = {
      obraId: "OB-011",
      proyecto: "BODEGA CENTRAL",
      periodoInicio: "2026-10-01",
      periodoFin: "2026-10-30",
      actividades: [...informeBase.actividades],
    };

    const res = evaluarGuardadoInforme({
      informes: [informeBase],
      form: clon,
      editId: null,
      recibeEmail: "",
    });

    expect(res.formatoCorreoInvalido).toBe(false);
    expect(res.requiereConfirmarDuplicado).toBe(true);
    expect(res.informeSimilar?.id).toBe("INF-001");
  });

  it("construirActividadDesdeItemCot genera textos limpios y diferenciables por ítem", () => {
    const a1 = construirActividadDesdeItemCot({ desc: "Escalera fija", cant: 1, unit: "Und" }, "C-100", "2026-10-30");
    const a2 = construirActividadDesdeItemCot({ desc: "Puntos de anclaje", cant: 12, unit: "Und" }, "C-100", "2026-10-30");
    expect(a1.titulo).toBe("Escalera fija");
    expect(a1.observaciones).toContain("1 Und · Escalera fija");
    expect(firmaContenidoActividades([a1])).not.toBe(firmaContenidoActividades([a2]));
  });
});
