import { describe, expect, it } from "vitest";
import {
  aceroDeCotizacion,
  construirActa,
  datosDeEjecucion,
  descripcionDelTrabajo,
  faltantesDelActa,
  fechasDeTrabajo,
  normalizarActas,
  objetivoDeCotizacion,
  personalDeObra,
  sistemasDeCotizacion,
  tieneActaEntrega,
} from "./actaEntrega";
import { buildActaPrintHtml } from "./actaEntregaPrint";
import { clientesConQuienRecibe } from "./quienRecibe";

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

  it("si hay dos coordinadores salen los dos, no solo el primero", () => {
    const conDos = [
      ...empleados,
      { id: "EMP-4", nombre: "richard buelvas", cargo: "COORDINADOR DE ALTURAS" },
    ];
    const enObra = { ...obra, empleados: ["EMP-1", "EMP-2", "EMP-3", "EMP-4"] };
    const personal = personalDeObra(enObra, [], conDos);
    expect(personal.coordinadorAlturas).toBe("Paola Escobar · Richard Buelvas");
    // Ninguno de los dos se repite abajo como colaborador.
    expect(personal.colaboradores).toEqual(["William Álvarez"]);
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

  it("el NIT o la cedula salen de la obra, del cliente o de la cotizacion", () => {
    const sinNit = { ...obra, nit: "" };
    const armarCon = ({ cliente, cot }) => construirActa({
      obra: sinNit, cotizacion: cot, cliente, empleados, obras: [],
    }).nit;

    // Lo que trae la obra manda sobre lo demas.
    expect(armar().nit).toBe("900.111.222-3");
    // Si la obra no lo trae, se busca en la ficha del cliente…
    expect(armarCon({ cliente: { nit: "71.624.880" }, cot: cotizacion })).toBe("71.624.880");
    // …y si tampoco, en la cotizacion de la que salio la obra.
    expect(armarCon({ cliente: null, cot: { ...cotizacion, nit: "811035319-7" } })).toBe("811035319-7");
    // Sin ningun dato guardado no se inventa nada.
    expect(armarCon({ cliente: null, cot: cotizacion })).toBe("");
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

// ── De la obra a la hoja que firma el cliente ───────────────────────────────
//
// Lo de arriba comprueba cada paso por separado. Esto comprueba la CADENA
// entera, que es de lo que depende poder fiarse del acta: lo que el equipo
// dejo escrito trabajando -quien tuvo turno, que se hizo cada jornada, que se
// cotizo- tiene que aparecer, con esas mismas palabras, en la hoja impresa.
describe("lo que se registro en la obra llega a la hoja impresa", () => {
  const obraEnEjecucion = {
    id: "OB-045",
    cliente: "Productos Alimenticios Sol de Oriente S.A.S",
    nit: "811035319-7",
    cotizacionId: "COT-077",
    empleados: ["EMP-1", "EMP-3"],
    bitacora: [
      { fecha: "2026-10-12", descripcion: "Se ancló la escalera con epóxico y se dejó fraguar." },
      { fecha: "2026-10-14", descripcion: "Se instaló la línea de vida vertical de 9 metros." },
    ],
  };

  const equipo = [
    { id: "EMP-1", nombre: "jamer rincón", cargo: "LIDER DE PROYECTO" },
    { id: "EMP-3", nombre: "paola escobar", cargo: "COORDINADORA DE ALTURAS" },
    { id: "EMP-9", nombre: "alguien de otra obra", cargo: "INSTALADOR" },
  ];

  // El turno de William en esta obra esta en Horarios, no en la obra: asi es
  // como entra la gente que se suma un dia sin quedar asignada.
  const horarios = [
    { obraId: "OB-045", fecha: "2026-10-13", empleadoId: "EMP-4" },
    { obraId: "OB-999", fecha: "2026-10-13", empleadoId: "EMP-9" },
  ];
  const equipoConTurno = [...equipo, { id: "EMP-4", nombre: "william álvarez", cargo: "INSTALADOR" }];

  const cotizacion = {
    id: "COT-077",
    items: [{ desc: "Suministro e instalación de línea de vida vertical", unit: "ML", cant: 9 }],
  };

  const hoja = () => {
    const acta = construirActa({
      obra: obraEnEjecucion,
      cotizacion,
      informes: [{ obraId: "OB-999", descripcion: "Trabajo de otra obra." }],
      horarios,
      empleados: equipoConTurno,
      obras: [],
    });
    return { acta, html: buildActaPrintHtml(acta, { empresaConfig: [], firmaImg: "" }) };
  };

  it("quien ejecuto el trabajo sale en el acta y en la hoja", () => {
    const { acta, html } = hoja();
    expect(acta.liderProyecto).toBe("Jamer Rincón");
    expect(acta.coordinadorAlturas).toBe("Paola Escobar");
    expect(acta.colaboradores).toEqual(["William Álvarez"]);
    for (const nombre of ["Jamer Rincón", "Paola Escobar", "William Álvarez"]) {
      expect(html).toContain(nombre);
    }
    // Y quien firma la entrega es el lider de proyecto, no otro.
    expect(html).toMatch(/Entrega conforme[\s\S]*Jamer Rincón[\s\S]*Líder de proyecto/);
  });

  it("lo que se escribio en cada jornada sale en la descripcion", () => {
    const { html } = hoja();
    expect(html).toContain("Se ancló la escalera con epóxico y se dejó fraguar.");
    expect(html).toContain("Se instaló la línea de vida vertical de 9 metros.");
  });

  it("cada jornada va en su propio parrafo, que es lo que deja partir la hoja", () => {
    const { html } = hoja();
    expect(html).toContain('data-divisible="1"');
    expect((html.match(/data-parte="parrafo"/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it("lo cotizado sale en la tabla de lo entregado, con su cantidad", () => {
    const { html } = hoja();
    expect(html).toMatch(/<td[^>]*>9<\/td>/);
    expect(html).toContain("ML");
    expect(html).toContain("LÍNEA DE VIDA VERTICAL");
    expect(html).toContain("PRODUCTOS ALIMENTICIOS SOL DE ORIENTE S.A.S");
  });

  it("no se cuela nada de otra obra", () => {
    const { html } = hoja();
    expect(html).not.toContain("Trabajo de otra obra.");
    expect(html).not.toContain("Alguien de Otra Obra");
  });

  it("traer de la ejecucion devuelve lo mismo con que se armo el acta", () => {
    const { acta } = hoja();
    const traido = datosDeEjecucion({ obra: obraEnEjecucion, informes: [], horarios, empleados: equipoConTurno });
    expect(traido.liderProyecto).toBe(acta.liderProyecto);
    expect(traido.coordinadorAlturas).toBe(acta.coordinadorAlturas);
    expect(traido.colaboradores).toEqual(acta.colaboradores);
    expect(traido.descripcion).toBe(acta.descripcion);
  });
});

// El cargo de quien recibe se escribe UNA vez, en la ventana de «quien recibe
// los informes de esta obra», y de ahi tiene que llegar hasta la casilla CARGO
// de la hoja que firma el cliente. Esto comprueba ese camino.
describe("el cargo de quien recibe llega hasta la hoja firmada", () => {
  const obraInteckno = { id: "OB-050", cliente: "Inteckno S.A.S", proyecto: "La Pilona Avecedo" };

  it("lo que guarda la ventana queda en la ficha del cliente", () => {
    const clientes = clientesConQuienRecibe([], obraInteckno, {
      nombre: "Wilson Alzate",
      email: "profesionalsst@inteckno.com",
      telefono: "3192315246",
      cargo: "profesional sst",
    });
    expect(clientes[0].contacto).toBe("Wilson Alzate");
    // Se guarda en mayusculas, como va en el formato.
    expect(clientes[0].contactoCargo).toBe("PROFESIONAL SST");
  });

  it("de la ficha del cliente pasa al acta y de ahi a la casilla CARGO", () => {
    const cliente = { contacto: "Wilson Alzate", contactoCargo: "PROFESIONAL SST" };
    const acta = construirActa({ obra: obraInteckno, cliente, obras: [] });
    expect(acta.recibeNombre).toBe("Wilson Alzate");
    expect(acta.recibeCargo).toBe("PROFESIONAL SST");
    expect(buildActaPrintHtml(acta, { empresaConfig: [] })).toContain("CARGO: PROFESIONAL SST");
  });

  it("lo que diga la obra manda sobre la ficha del cliente", () => {
    const acta = construirActa({
      obra: { ...obraInteckno, recibeNombre: "Wilson Alzate", recibeCargo: "INTERVENTOR" },
      cliente: { contacto: "Otro Contacto", contactoCargo: "PROFESIONAL SST" },
      obras: [],
    });
    expect(acta.recibeCargo).toBe("INTERVENTOR");
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
