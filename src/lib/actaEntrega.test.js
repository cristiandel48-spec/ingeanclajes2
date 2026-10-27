import { describe, expect, it } from "vitest";
import {
  aceroDeCotizacion,
  construirActa,
  descripcionDelTrabajo,
  faltantesDelActa,
  fechasDeTrabajo,
  normalizarActas,
  objetivoDeCotizacion,
  personalDeObra,
  sistemasDeCotizacion,
  tieneActaEntrega,
} from "./actaEntrega";

const obra = {
  id: "OB-010",
  cliente: "Luis Javier Galeano Murillo",
  nit: "900.111.222-3",
  tel: "3007676316",
  proyecto: "Subestación EPM",
  ciudad: "Caucasia",
  cotizacionId: "COT-050",
  recibeNombre: "eduard zuñiga",
  recibeEmail: "eduard@epm.com.co",
  empleados: ["EMP-1", "EMP-2", "EMP-3"],
};

const empleados = [
  { id: "EMP-1", nombre: "jamer rincón", cargo: "LIDER DE PROYECTO" },
  { id: "EMP-2", nombre: "william álvarez", cargo: "INSTALADOR" },
  { id: "EMP-3", nombre: "paola escobar", cargo: "COORDINADORA DE ALTURAS" },
];

describe("lo que se entrega, segun la cotizacion", () => {
  it("suma los items iguales y deja fuera los gastos de la obra", () => {
    const cot = {
      items: [
        { desc: "SUMINISTRO E INSTALACIÓN DE PUNTO DE ANCLAJE", unit: "Und", cant: 20 },
        { desc: "Suministro e instalación de punto de anclaje", unit: "Und", cant: 10 },
        { desc: "VIÁTICOS Y TRANSPORTE", unit: "Global", cant: 1 },
      ],
    };
    expect(sistemasDeCotizacion(cot)).toEqual([
      { cantidad: 30, unidad: "Und", descripcion: "SUMINISTRO E INSTALACIÓN DE PUNTO DE ANCLAJE" },
    ]);
  });

  it("usa la propuesta que se aprobo, no la primera de la lista", () => {
    const cot = {
      propuestaActivaId: "P2",
      propuestas: [
        { id: "P1", items: [{ desc: "LINEA DE VIDA HORIZONTAL", unit: "ML", cant: 40 }] },
        { id: "P2", items: [{ desc: "LINEA DE VIDA VERTICAL", unit: "ML", cant: 12 }] },
      ],
    };
    // De paso se le pone la tilde que le falta: lo mismo que hacen la
    // cotizacion y el certificado con los nombres de los sistemas.
    expect(sistemasDeCotizacion(cot)).toEqual([
      { cantidad: 12, unidad: "ML", descripcion: "LÍNEA DE VIDA VERTICAL" },
    ]);
  });

  it("sin cotizacion no inventa nada", () => {
    expect(sistemasDeCotizacion(null)).toEqual([]);
    expect(aceroDeCotizacion(null)).toBe("");
    expect(objetivoDeCotizacion(null)).toBe("");
  });

  it("el acero inoxidable se dice; lo demas es galvanizado", () => {
    expect(aceroDeCotizacion({ items: [{ desc: "LÍNEA DE VIDA EN CABLE INOXIDABLE 316" }] })).toBe("inoxidable");
    expect(aceroDeCotizacion({ items: [{ desc: "PUNTO DE ANCLAJE EN ACERO AL CARBONO" }] })).toBe("galvanizado");
  });

  it("el objetivo pierde el prefijo de facturacion", () => {
    const cot = { items: [{ desc: "Suministro, transporte e instalación de puntos de anclaje", unit: "Und", cant: 30 }] };
    expect(objetivoDeCotizacion(cot)).toBe("PUNTOS DE ANCLAJE");
  });
});

describe("lo que sabe la obra", () => {
  it("las fechas salen de la bitacora y de los turnos", () => {
    const conBitacora = { ...obra, bitacora: [{ fecha: "2026-09-17" }, { fecha: "2026-09-16" }] };
    const horarios = [
      { obraId: "OB-010", fecha: "2026-09-18" },
      { obraId: "OB-999", fecha: "2026-12-01" },
    ];
    expect(fechasDeTrabajo(conBitacora, horarios)).toEqual({ inicio: "2026-09-16", fin: "2026-09-18" });
  });

  it("el coordinador y el lider salen de su cargo y no se repiten como colaboradores", () => {
    expect(personalDeObra(obra, [], empleados)).toEqual({
      coordinadorAlturas: "Paola Escobar",
      liderProyecto: "Jamer Rincón",
      colaboradores: ["William Álvarez"],
    });
  });

  it("la descripcion prefiere los informes y, si no hay, la bitacora", () => {
    const informes = [{ obraId: "OB-010", actividades: [{ descripcion: "Se instalaron 30 puntos de anclaje." }] }];
    expect(descripcionDelTrabajo(obra, informes)).toBe("Se instalaron 30 puntos de anclaje.");

    const conBitacora = { ...obra, bitacora: [{ fecha: "2026-09-16", descripcion: "Replanteo de los puntos." }] };
    expect(descripcionDelTrabajo(conBitacora, [])).toBe("Replanteo de los puntos.");
    expect(descripcionDelTrabajo(obra, [])).toBe("");
  });

  it("no toma los informes ni los turnos de otras obras", () => {
    expect(descripcionDelTrabajo(obra, [{ obraId: "OB-999", descripcion: "Otra obra." }])).toBe("");
  });
});

describe("el acta armada", () => {
  const cotizacion = {
    id: "COT-050",
    items: [{ desc: "Suministro e instalación de puntos de anclaje", unit: "Und", cant: 30 }],
  };

  const armar = (obras = []) => construirActa({
    obra: { ...obra, bitacora: [{ fecha: "2026-09-16", descripcion: "Se instalaron los puntos." }] },
    cotizacion,
    cliente: { email: "facturacion@epm.com.co", telefono: "6044482686", contacto: "Jhorman Ojeda" },
    horarios: [{ obraId: "OB-010", fecha: "2026-09-18" }],
    empleados,
    obras,
  });

  it("trae lo que la obra y la cotizacion ya saben", () => {
    const acta = armar();
    expect(acta).toMatchObject({
      obraId: "OB-010",
      contratante: "LUIS JAVIER GALEANO MURILLO",
      nit: "900.111.222-3",
      telefono: "3007676316",
      correoFacturacion: "facturacion@epm.com.co",
      correoAdministrativo: "eduard@epm.com.co",
      objetivo: "PUNTOS DE ANCLAJE",
      acero: "galvanizado",
      fechaInicio: "2026-09-16",
      fechaEntrega: "2026-09-18",
      liderProyecto: "Jamer Rincón",
      coordinadorAlturas: "Paola Escobar",
      recibeNombre: "Eduard Zuñiga",
    });
    expect(acta.sistemas).toEqual([{ cantidad: 30, unidad: "Und", descripcion: "SUMINISTRO E INSTALACIÓN DE PUNTOS DE ANCLAJE" }]);
    expect(acta.descripcion).toBe("Se instalaron los puntos.");
    expect(acta.observaciones).toContain("óptimas condiciones");
  });

  it("el consecutivo no pisa a un acta que ya existe, ni siquiera de otra obra", () => {
    const yaHay = [
      { id: "OB-001", actas: [{ id: "ACT-001" }] },
      { id: "OB-002", actas: [{ id: "ACT-002" }] },
    ];
    expect(armar(yaHay).id).toBe("ACT-003");
    expect(armar([]).id).toBe("ACT-001");
  });

  it("avisa de lo que no puede deducir", () => {
    const acta = armar();
    // Las areas intervenidas no salen de ningun dato guardado: hay que
    // escribirlas en la obra. Lo demas lo trajo la cotizacion.
    expect(faltantesDelActa(acta)).toEqual(["las áreas intervenidas"]);
    expect(faltantesDelActa({ sistemas: [] })).toContain("el contratante");
  });
});

describe("las actas guardadas en la obra", () => {
  it("una obra sin actas devuelve una lista vacia", () => {
    expect(normalizarActas({ id: "OB-001" })).toEqual([]);
    expect(normalizarActas(null)).toEqual([]);
  });

  it("un acta guardada a medias se completa con los campos que faltan", () => {
    const [acta] = normalizarActas({ id: "OB-001", actas: [{ id: "ACT-007", contratante: "EPM" }] });
    expect(acta.id).toBe("ACT-007");
    expect(acta.sistemas).toEqual([]);
    expect(acta.colaboradores).toEqual([]);
    expect(acta.recibeCargo).toBe("");
  });

  it("tieneActaEntrega detecta correctamente si la obra tiene o no acta", () => {
    expect(tieneActaEntrega(null)).toBe(false);
    expect(tieneActaEntrega({ id: "OB-001" })).toBe(false);
    expect(tieneActaEntrega({ id: "OB-001", actas: [] })).toBe(false);
    expect(tieneActaEntrega({ id: "OB-001", actas: [{ id: "ACT-001" }] })).toBe(true);
  });
});
