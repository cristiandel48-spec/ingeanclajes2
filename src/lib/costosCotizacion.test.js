import { describe, expect, it } from "vitest";
import {
  ID_CONFIG_COSTOS_APU,
  calcularCosteoPropuesta,
  calcularCostoUnitarioServicio,
  calcularLineasDesdeRecetas,
  costeoAMaterialesDespacho,
  esObraFueraDeLaCiudad,
  revisarCoherenciaCosteo,
  estimarCostosHeuristico,
  guardarConfigCostos,
  huellaItemsPropuesta,
  obtenerConfigCostos,
} from "./costosCotizacion";
import { buildQuoteProposal } from "./cotizaciones";
import { buildCotizacionPrintHtml } from "./cotizacionPrint";
import { puedeVerCostosInternos } from "./permisos";

describe("Motor de costos internos, insumos y recetas (APU)", () => {
  it("calcula automáticamente cable, postes, accesorios, mano de obra y costo para una línea de vida horizontal", () => {
    const propuesta = {
      sinAiu: false,
      util: 10,
      items: [
        { id: 1, desc: "LINEA DE VIDA HORIZONTAL", cant: 20, unit: "ML", vu: 280000 },
      ],
    };

    const res = calcularCosteoPropuesta(propuesta);
    expect(res.modo).toBe("auto");
    expect(res.itemsConReceta).toHaveLength(1);
    expect(res.itemsSinReceta).toHaveLength(0);

    const cable = res.lineas.find((l) => l.insumoId === "cable_acero_516");
    const postes = res.lineas.find((l) => l.insumoId === "poste_terminal");
    const tecnicos = res.lineas.find((l) => l.insumoId === "tecnico_alturas");
    const transporte = res.lineas.find((l) => l.insumoId === "transporte_obra");

    // 20 ML + 15% de holgura = 23 ML
    expect(cable?.cant).toBe(23);
    expect(postes?.cant).toBe(2);
    expect(tecnicos?.cant).toBe(2);
    expect(transporte?.cant).toBe(1);

    expect(res.costoMateriales).toBeGreaterThan(0);
    expect(res.costoManoObra).toBeGreaterThan(0);
    expect(res.costoLogistica).toBeGreaterThan(0);
    expect(res.costoTotal).toBe(res.costoMateriales + res.costoManoObra + res.costoLogistica);

    // Con AIU 10%: ventaSubtotal = 5.600.000, utilidad = 560.000 => ingresoNeto sin IVA = 6.160.000
    expect(res.ventaSubtotal).toBe(5600000);
    expect(res.ingresoNeto).toBe(6160000);
    expect(res.gananciaNeta).toBe(res.ingresoNeto - res.costoTotal);
    expect(res.estadoMargen).toBe("optimo");
  });

  it("calcula puntos de anclaje epóxico y consolida insumos cuando hay varios servicios en la misma propuesta", () => {
    const { lineas, itemsSinReceta } = calcularLineasDesdeRecetas([
      { id: 1, desc: "LINEA DE VIDA HORIZONTAL", cant: 10, unit: "ML", vu: 280000 },
      { id: 2, desc: "PUNTO DE ANCLAJE EPOXICO", cant: 4, unit: "Und", vu: 380000 },
    ]);

    expect(itemsSinReceta).toHaveLength(0);
    const placas = lineas.filter((l) => l.insumoId === "placa_identificacion");
    expect(placas).toHaveLength(1);
    // 1 placa de la línea horizontal + 4 placas de los puntos de anclaje = 5
    expect(placas[0].cant).toBe(5);

    const anclajes = lineas.find((l) => l.insumoId === "punto_anclaje_epoxico");
    expect(anclajes?.cant).toBe(4);
  });

  it("detecta reformas o ítems a medida sin receta fija y permite estimación heurística de respaldo", () => {
    const items = [
      { id: 1, desc: "REFORMA INTEGRAL DE PLATAFORMA Y CAMBIO DE TEJAS EN BODEGA", cant: 12, unit: "M2", vu: 250000 },
    ];

    const res = calcularCosteoPropuesta({ sinAiu: true, items });
    expect(res.itemsConReceta).toHaveLength(0);
    expect(res.itemsSinReceta).toHaveLength(1);
    expect(res.lineas).toHaveLength(0);

    const est = estimarCostosHeuristico({
      titulo: "Reforma de cubierta en bodega",
      items,
    });
    expect(est.lineas.length).toBeGreaterThanOrEqual(4);
    expect(est.lineas.some((l) => l.categoria === "material")).toBe(true);
    expect(est.lineas.some((l) => l.categoria === "mano_obra")).toBe(true);
    expect(est.lineas.some((l) => l.categoria === "logistica")).toBe(true);
  });

  it("respeta ajustes manuales/IA guardados en costeoInterno y detecta cambios en los ítems", () => {
    const itemsIniciales = [
      { id: 1, desc: "REFORMA FACHADA NORTE", cant: 1, unit: "Global", vu: 4000000 },
    ];
    const propuesta = {
      sinAiu: true,
      items: itemsIniciales,
      costeoInterno: {
        modo: "ia",
        huellaItems: huellaItemsPropuesta(itemsIniciales),
        resumenIa: "Estimación de reforma de fachada",
        lineas: [
          { id: "l1", nombre: "Materiales reforma", categoria: "material", unidad: "Global", cant: 1, costoUnitario: 2000000 },
          { id: "l2", nombre: "Técnicos 4 días", categoria: "mano_obra", unidad: "Día", cant: 4, costoUnitario: 180000 },
          { id: "l3", nombre: "Transporte", categoria: "logistica", unidad: "Viaje", cant: 2, costoUnitario: 140000 },
        ],
      },
    };

    const res1 = calcularCosteoPropuesta(propuesta);
    expect(res1.modo).toBe("ia");
    expect(res1.itemsCambiaron).toBe(false);
    expect(res1.costoTotal).toBe(3000000);
    // Sin AIU (IVA pleno): el ingreso neto es el subtotal sin IVA ($4.000.000)
    expect(res1.ingresoNeto).toBe(4000000);
    expect(res1.gananciaNeta).toBe(1000000);
    expect(res1.margenPct).toBe(25);
    expect(res1.estadoMargen).toBe("optimo");

    // Si el usuario cambia la cantidad después de estimar, se avisa
    const res2 = calcularCosteoPropuesta({
      ...propuesta,
      items: [{ id: 1, desc: "REFORMA FACHADA NORTE", cant: 2, unit: "Global", vu: 4000000 }],
    });
    expect(res2.itemsCambiaron).toBe(true);
  });

  it("persiste insumos y recetas en empresaConfig sin alterar la fila empresa ni las firmas de coordinadores", () => {
    const inicial = [
      { id: "empresa", firmaImg: "data:image/png;base64,abc", controlDocumental: { cotizacion: { codigo: "GC-01" } } },
      { id: "firma_coord:richard-buelvas", firmaNombre: "Richard Buelvas", firmaCargo: "COORDINADOR SST" },
    ];

    const cfgBase = obtenerConfigCostos(inicial);
    expect(cfgBase.personalizada).toBe(false);

    const insumosEditados = cfgBase.insumos.map((ins) =>
      ins.id === "cable_acero_516" ? { ...ins, costoUnitario: 22500 } : ins
    );

    const actualizado = guardarConfigCostos(inicial, {
      ...cfgBase,
      margenMinimoPct: 30,
      insumos: insumosEditados,
    });

    // Conserva intactas las demás filas
    expect(actualizado.find((r) => r.id === "empresa")?.firmaImg).toBe("data:image/png;base64,abc");
    expect(actualizado.find((r) => r.id === "firma_coord:richard-buelvas")?.firmaNombre).toBe("Richard Buelvas");
    expect(actualizado.some((r) => r.id === ID_CONFIG_COSTOS_APU)).toBe(true);

    const leido = obtenerConfigCostos(actualizado);
    expect(leido.personalizada).toBe(true);
    expect(leido.margenMinimoPct).toBe(30);
    expect(leido.insumos.find((i) => i.id === "cable_acero_516")?.costoUnitario).toBe(22500);
  });

  it("calcula el costo unitario de referencia para el catálogo de servicios", () => {
    const res = calcularCostoUnitarioServicio({
      descripcion: "LINEA DE VIDA HORIZONTAL",
      unidad: "ML",
      precioBase: 280000,
    });
    expect(res.tieneReceta).toBe(true);
    expect(res.cantReferencia).toBe(15);
    expect(res.costoUnitario).toBeGreaterThan(50000);
    expect(res.costoUnitario).toBeLessThan(280000);
    expect(res.margenPct).toBeGreaterThan(20);
  });

  it("preserva costeoInterno en buildQuoteProposal y NUNCA lo expone en el PDF/HTML del cliente ni en Bodega de obra", () => {
    const marcaSecreta = "SECRETO_COSTO_INTERNO_998877";
    const propuesta = buildQuoteProposal({
      id: "prop-1",
      nombre: "Propuesta A",
      tipoCotizacion: "linea_vida",
      items: [{ id: 1, desc: "LINEA DE VIDA HORIZONTAL", cant: 20, unit: "ML", vu: 280000 }],
      costeoInterno: {
        modo: "personalizado",
        resumenIa: marcaSecreta,
        lineas: [
          { id: "m1", insumoId: "cable_acero_516", nombre: 'Cable de acero 5/16"', categoria: "material", unidad: "ML", cant: 23, costoUnitario: 18000 },
          { id: "mo1", insumoId: "tecnico_alturas", nombre: "Jornada técnico alturas", categoria: "mano_obra", unidad: "Día", cant: 2, costoUnitario: 180000 },
          { id: "tr1", insumoId: "transporte_obra", nombre: "Transporte de personal", categoria: "logistica", unidad: "Viaje", cant: 1, costoUnitario: 140000 },
        ],
      },
    });

    expect(propuesta.costeoInterno?.resumenIa).toBe(marcaSecreta);

    // 1. El HTML de impresión / PDF para el cliente NO debe contener nada de costeoInterno
    const htmlCliente = buildCotizacionPrintHtml({
      numero: "C-99999",
      cliente: "CLIENTE PRUEBA S.A.S.",
      obra: "BODEGA CENTRAL",
      ciudad: "MEDELLÍN",
      fecha: "2026-11-19",
      propuestas: [propuesta],
      propuestaActivaId: propuesta.id,
      items: propuesta.items,
    });
    expect(htmlCliente).not.toContain(marcaSecreta);
    expect(htmlCliente).not.toContain("costeoInterno");
    expect(htmlCliente).not.toContain("Tu costo estimado");

    // 2. El despacho a bodega lleva cantidades físicas de material, pero SIN costos ni mano de obra ni transporte
    const despacho = costeoAMaterialesDespacho(propuesta);
    expect(despacho.entregables).toHaveLength(1);
    expect(despacho.insumos).toHaveLength(1);
    expect(despacho.insumos[0].nombre).toContain("Cable");
    expect(despacho.insumos[0].cant).toBe(23);
    expect(despacho.insumos[0]).not.toHaveProperty("costoUnitario");
    expect(despacho.insumos[0]).not.toHaveProperty("subtotal");
  });

  it("restringe el acceso a costos internos únicamente a administradores (Cristian y Camila)", () => {
    expect(puedeVerCostosInternos({ role: "admin", activo: true })).toBe(true);
    expect(puedeVerCostosInternos({ role: "manager", nombre: "María Camila Sepúlveda", activo: true })).toBe(true);
    expect(puedeVerCostosInternos({ role: "operator", email: "cristiandel48@gmail.com", activo: true })).toBe(true);

    // Otros roles NO ven costos internos
    expect(puedeVerCostosInternos({ role: "manager", nombre: "Coordinador Obra", activo: true })).toBe(false);
    expect(puedeVerCostosInternos({ role: "operator", nombre: "Técnico Alturas", activo: true })).toBe(false);
    expect(puedeVerCostosInternos({ role: "viewer", nombre: "Consulta", activo: true })).toBe(false);
    expect(puedeVerCostosInternos({ role: "contador", nombre: "Contador Externo", activo: true })).toBe(false);
    expect(puedeVerCostosInternos({ role: "admin", activo: false })).toBe(false);
    expect(puedeVerCostosInternos(null)).toBe(false);
  });

  it("expande el sistema completo para Línea de Vida Camionera integral sin duplicar postes cuando se cotizan aparte", () => {
    // 1. Cotizada como un solo ítem integral (sin postes aparte, por $40.000.000)
    const integral = calcularCosteoPropuesta({
      sinAiu: false,
      util: 10,
      items: [
        { id: 1, desc: "CAMINADERO", cant: 1, unit: "Metro", vu: 350000 },
        { id: 2, desc: "LÍNEA DE VIDA CAMIONERA EN CABLE DE ACERO", cant: 1, unit: "ML", vu: 40000000 },
      ],
    });
    expect(integral.itemsSinReceta).toHaveLength(0);
    expect(integral.lineas.find((l) => l.insumoId === "poste_cuello_cisne")?.cant).toBe(2);
    expect(integral.lineas.find((l) => l.insumoId === "dado_concreto")?.cant).toBe(2);
    expect(integral.lineas.find((l) => l.insumoId === "carro_camionera")?.cant).toBe(1);
    expect(integral.lineas.find((l) => l.insumoId === "autorretractil")?.cant).toBe(1);
    expect(integral.lineas.find((l) => l.insumoId === "pasarela_rejilla")?.cant).toBe(1);
    expect(integral.costoTotal).toBeGreaterThan(10000000);

    // 2. Cotizada desglosada (con postes cuello de cisne como ítem separado): NO duplica postes
    const desglosada = calcularCosteoPropuesta({
      sinAiu: false,
      util: 10,
      items: [
        { id: 1, desc: "POSTE TIPO CUELLO DE CISNE CON PEDESTAL", cant: 2, unit: "Und", vu: 4500000 },
        { id: 2, desc: "LINEA DE VIDA CAMIONERA EN CABLE DE ACERO GALVANIZADO", cant: 18, unit: "ML", vu: 250000 },
      ],
    });
    expect(desglosada.lineas.find((l) => l.insumoId === "poste_cuello_cisne")?.cant).toBe(2);
    expect(desglosada.lineas.find((l) => l.insumoId === "cable_acero_38")?.cant).toBe(20.7);
  });

  it("desglosa todos los componentes de un sistema TPO / Latchways Constant Force / ManSafe / guaya retráctil de 1079.2 ML con margen realista", () => {
    const saludo =
      "Agradecemos la oportunidad de presentarles nuestra propuesta de Suministro e instalación de sistema de línea de vida de (1079.20ml) en cubiertas con membrana TPO Ref. Constant Force de Latchways, equivalente o superior. Incluye tensores, conjunto de torniquete, manguito de compresión y estribo, soporte de esquina 90°, soporte variable, anilla en d, sujeción de cable, soportes laterales e intermedios certificados, guaya móvil retráctil, man safe's, pieza intermedia de proximidad, sistema de mordaza, módulos de fijación, postes, sellos";
    const items = [
      { id: 1, desc: saludo.toUpperCase(), cant: 1079.2, unit: "ML", vu: 360000 },
    ];
    const est = estimarCostosHeuristico({ saludo, items });

    const nombres = est.lineas.map((l) => l.nombre.toLowerCase()).join(" | ");
    expect(nombres).toContain("cable acero inoxidable");
    expect(nombres).toContain("constant force");
    expect(nombres).toContain("esquina 90");
    expect(nombres).toContain("torniquete");
    expect(nombres).toContain("anilla en d");
    expect(nombres).toContain("mansafe");
    expect(nombres).toContain("autorretráctil");
    expect(nombres).toContain("tpo");
    expect(nombres).toContain("memoria de cálculo");

    const costeo = calcularCosteoPropuesta({
      sinAiu: false,
      util: 10,
      items,
      costeoInterno: { modo: "ia", lineas: est.lineas },
    });
    // Con todos los componentes reales (postes, sellos TPO, herrajes, ManSafe, guaya retráctil, 44+ días cuadrilla),
    // el margen debe ser realista (~35% - 65%), nunca un falso 90.7%
    expect(costeo.costoTotal).toBeGreaterThan(150000000);
    expect(costeo.margenPct).toBeLessThan(65);
    expect(costeo.margenPct).toBeGreaterThan(20);
  });

  it("calcula costos realistas para estructuras metálicas con plataforma para aires acondicionados", () => {
    const res = calcularCosteoPropuesta({
      sinAiu: false,
      util: 10,
      items: [
        { id: 1, desc: "ESTRUCTURA METÁLICA CON PLATAFORMA PARA AIRES ACONDICIONADOS", cant: 7, unit: "ML", vu: 8000000 },
      ],
    });
    expect(res.itemsSinReceta).toHaveLength(0);
    expect(res.lineas.find((l) => l.insumoId === "acero_estructural")?.cant).toBe(1680);
    expect(res.costoTotal).toBeGreaterThan(20000000);
    expect(res.margenPct).toBeLessThan(70);
    expect(res.margenPct).toBeGreaterThan(25);
  });

  it("no encierra 'RECERTIFICACIÓN ANUAL L.V.H-L.V.V (1 Global)' en el costo fijo de $555.000 y marca análisis automático con IA", () => {
    const propuesta = {
      sinAiu: false,
      util: 10,
      items: [
        { id: 1, desc: "RECERTIFICACIÓN ANUAL L.V.H-L.V.V", cant: 1, unit: "Global", vu: 2800000 },
      ],
    };

    const res = calcularCosteoPropuesta(propuesta);
    expect(res.requiereIaAuto).toBe(true);
    expect(res.itemsGenericosGlobales).toHaveLength(1);

    // Incluso en el respaldo heurístico local, debe estimar múltiples placas, pintura,
    // consumibles y cuadrilla realista en vez de quedarse pegado en $555.000
    const heur = estimarCostosHeuristico({
      titulo: "RECERTIFICACIÓN ANUAL L.V.H-L.V.V",
      items: propuesta.items,
    });
    const costoHeur = heur.lineas.reduce((s, l) => s + l.subtotal, 0);
    expect(costoHeur).toBeGreaterThan(600000);
    expect(heur.lineas.find((l) => l.insumoId === "placa_identificacion")?.cant).toBeGreaterThanOrEqual(2);
    expect(heur.lineas.some((l) => l.insumoId === "pintura_anticorrosiva")).toBe(true);
    expect(heur.lineas.some((l) => l.insumoId === "consumibles_instalacion")).toBe(true);
  });

  it("no desvía a RECERTIFICACION ANUAL un trabajo nuevo que mencione recertificación en su texto", () => {
    const res = calcularCosteoPropuesta({
      sinAiu: true,
      items: [
        { id: 1, desc: "INSTALACION DE PANELES EN POSTES CON RECERTIFICACION ANUAL", cant: 1, unit: "Global", vu: 2750000 },
      ],
    });
    expect(res.itemsConReceta).toHaveLength(0);
    expect(res.itemsSinReceta).toHaveLength(1);
    expect(res.requiereIaAuto).toBe(true);
  });
});

describe("Ajustes de rentabilidad", () => {
  const cant = (lineas, id) => lineas.find((l) => l.insumoId === id)?.cant;

  it("junta jornadas y viajes de toda la propuesta antes de redondear", () => {
    const tramos = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1, desc: "LINEA DE VIDA HORIZONTAL", cant: 12, unit: "ML", vu: 100000,
    }));
    const porTramos = calcularLineasDesdeRecetas(tramos).lineas;
    const enUno = calcularLineasDesdeRecetas([{ id: 1, desc: "LINEA DE VIDA HORIZONTAL", cant: 120, unit: "ML", vu: 100000 }]).lineas;

    // 120 ML son 8 jornadas y un viaje, se midan en uno o en diez renglones.
    expect(cant(porTramos, "tecnico_alturas")).toBe(8);
    expect(cant(porTramos, "tecnico_alturas")).toBe(cant(enUno, "tecnico_alturas"));
    expect(cant(porTramos, "coordinador_sst")).toBe(6);
    expect(cant(porTramos, "transporte_obra")).toBe(1);
    expect(cant(porTramos, "consumibles_instalacion")).toBe(1);
    // Los materiales si son por linea: dos postes terminales por cada tramo.
    expect(cant(porTramos, "poste_terminal")).toBe(20);
    expect(cant(enUno, "poste_terminal")).toBe(2);
  });

  it("no da por bueno el margen cuando el costo sale del precio de venta", () => {
    const items = [{ id: 1, desc: "SERVICIO ESPECIAL DE ASESORIA", cant: 1, unit: "Global", vu: 3000000 }];
    const est = estimarCostosHeuristico({ items });
    const derivadas = est.lineas.filter((l) => l.costoDesdePrecio);
    expect(derivadas).toHaveLength(1);

    const propuesta = { items, util: 10, costeoInterno: { modo: "personalizado", lineas: est.lineas } };
    const costeo = calcularCosteoPropuesta(propuesta);
    expect(costeo.margenConfiable).toBe(false);
    expect(costeo.estadoMargen).toBe("sin_confirmar");

    // Con el costo real escrito a mano, el margen vuelve a contar.
    const reales = est.lineas.map((l) => ({ ...l, costoDesdePrecio: false }));
    const confirmado = calcularCosteoPropuesta({ ...propuesta, costeoInterno: { modo: "personalizado", lineas: reales } });
    expect(confirmado.margenConfiable).toBe(true);
    expect(confirmado.estadoMargen).not.toBe("sin_confirmar");
  });

  it("descuenta los gastos indirectos configurados de la utilidad bruta", () => {
    const propuesta = { util: 10, items: [{ id: 1, desc: "PUNTO DE ANCLAJE EPOXICO", cant: 10, unit: "Und", vu: 400000 }] };
    const sin = calcularCosteoPropuesta(propuesta);
    expect(sin.indirectosPct).toBe(0);
    expect(sin.gananciaNeta).toBe(sin.utilidadBruta);

    const cfg = obtenerConfigCostos(guardarConfigCostos([], { indirectosPct: 15 }));
    expect(cfg.indirectosPct).toBe(15);
    const con = calcularCosteoPropuesta(propuesta, cfg);
    expect(con.utilidadBruta).toBe(sin.utilidadBruta);
    expect(con.costoIndirectos).toBe(Math.round(con.ingresoNeto * 0.15));
    expect(con.gananciaNeta).toBe(con.utilidadBruta - con.costoIndirectos);
    expect(con.margenPct).toBeLessThan(con.margenBrutoPct);
  });
});
describe("Revisión de coherencia del costeo", () => {
  const lineasRecert = [
    { nombre: "Cable de acero inoxidable 316 5/16", categoria: "material", cant: 30, costoUnitario: 45000, subtotal: 1350000 },
    { nombre: "Punto de anclaje epóxico 5.000 lb", categoria: "material", cant: 5, costoUnitario: 95000, subtotal: 475000 },
    { nombre: "Placa de identificación acero inoxidable", categoria: "material", cant: 5, costoUnitario: 35000, subtotal: 175000 },
    { nombre: "Jornada técnico instalador", categoria: "mano_obra", cant: 2, costoUnitario: 180000, subtotal: 360000 },
    { nombre: "Transporte de personal, equipos y materiales", categoria: "logistica", cant: 1, costoUnitario: 140000, subtotal: 140000 },
  ];
  const items = [{ desc: "MANTENIMIENTO Y RECERTIFICACIÓN DE TODO EL SISTEMA ANTICAIDAS", cant: 1, unit: "Global", vu: 4500000 }];

  it("avisa de materiales de instalación nueva en una recertificación", () => {
    const avisos = revisarCoherenciaCosteo({ lineas: lineasRecert }, { items, ciudad: "Medellín" });
    expect(avisos.map((a) => a.id)).toEqual(["revision-con-material-nuevo"]);
    expect(avisos[0].texto).toContain("Cable");
    expect(avisos[0].texto).not.toContain("Placa");
    expect(avisos[0].texto).toContain("1.825.000");
  });

  it("no avisa si el trabajo sí incluye suministro o reemplazo", () => {
    const conCambio = [{ desc: "RECERTIFICACIÓN Y REEMPLAZO DE CABLE DE LÍNEA DE VIDA", cant: 1, unit: "Global", vu: 4500000 }];
    expect(revisarCoherenciaCosteo({ lineas: lineasRecert }, { items: conCambio, ciudad: "Envigado" })).toEqual([]);
  });

  it("avisa de obra fuera del Valle de Aburrá sin viáticos y calla si ya están", () => {
    const fuera = revisarCoherenciaCosteo({ lineas: lineasRecert }, { items, ciudad: "Jardín, Antioquia" });
    expect(fuera.map((a) => a.id)).toContain("obra-fuera-sin-viaticos");

    const conViaticos = [...lineasRecert, { nombre: "Alojamiento y alimentación cuadrilla", categoria: "logistica", cant: 2, costoUnitario: 150000, subtotal: 300000 }];
    expect(revisarCoherenciaCosteo({ lineas: conViaticos }, { items, ciudad: "Jardín" }).map((a) => a.id)).not.toContain("obra-fuera-sin-viaticos");
  });

  it("sin ciudad no supone nada, y respeta los avisos descartados", () => {
    expect(esObraFueraDeLaCiudad("")).toBe(false);
    expect(esObraFueraDeLaCiudad("ITAGÜÍ")).toBe(false);
    expect(esObraFueraDeLaCiudad("Rionegro")).toBe(true);
    expect(revisarCoherenciaCosteo({ lineas: lineasRecert }, { items, ciudad: "Jardín", descartadas: ["revision-con-material-nuevo", "obra-fuera-sin-viaticos"] })).toEqual([]);
  });
});