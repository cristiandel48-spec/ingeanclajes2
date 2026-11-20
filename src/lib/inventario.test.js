import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calcularResumenInventario,
  CATEGORIAS_INVENTARIO,
  colorCategoriaBien,
  darDeBajaBien,
  ESTADO_DADO_DE_BAJA,
  estadoCalibracion,
  filtrarYOrdenarInventario,
  generarCsvInventario,
  hojasExcelInventario,
  normalizarBien,
  normalizarTextoBusqueda,
  requiereAtencionCalibracion,
  resolverResponsable,
  subtotalesPorCategoria,
  tonoEstadoBien,
  validarBien,
  valorTotalBien,
} from "./inventario";
import { siguienteIdUnico } from "./identificadores";
import {
  entidadesSinPermiso,
  modulosPermitidos,
  puedeEscribirTabla,
  tieneAccesoTabla,
} from "./permisos";
import { createDataService } from "./backend/dataService";
import { PREFIJO_FOTO } from "./backend/fotosStorage";
import { fotoFalsa, storageFalso } from "./backend/__pruebas__/fotos";
import { construirXlsx } from "./xlsxSimple";

const HOY = new Date("2026-11-20T12:00:00");

const EMPLEADOS = [
  { id: "EMP-001", nombre: "Carlos Ramírez", cargo: "TÉCNICO ALTURAS", activo: true },
  { id: "EMP-002", nombre: "Laura Gómez", cargo: "COORDINADORA SST", activo: true },
];

const OBRAS = [
  { id: "OB-010", proyecto: "Línea de vida bodega sur", cliente: "ACME S.A.S.", ciudad: "Medellín" },
  { id: "OB-012", proyecto: "Puntos de anclaje cubierta", cliente: "Logística Norte", ciudad: "Envigado" },
];

const BIENES_MUESTRA = [
  {
    id: "INV-001",
    nombre: "Taladro percutor inalámbrico",
    categoria: "Herramienta eléctrica",
    marca: "DeWalt",
    modelo: "DCD996",
    serial: "DW-44510",
    cantidad: 1,
    fechaCompra: "2025-03-10",
    valorCompra: 1450000,
    valorActual: 1100000,
    estado: "En uso",
    responsableTipo: "obra",
    obraId: "OB-012",
    empleadoId: "",
    ubicacion: "Frente norte",
    fechaCalibracion: "",
    notas: "Incluye dos baterías",
  },
  {
    id: "INV-002",
    nombre: "Dinamómetro digital 25 kN",
    categoria: "Equipo de medición",
    marca: "Hydrajaws",
    modelo: "M2000",
    serial: "HJ-9981",
    cantidad: 1,
    fechaCompra: "2024-06-15",
    valorCompra: 8500000,
    valorActual: 7200000,
    estado: "En uso",
    responsableTipo: "empleado",
    empleadoId: "EMP-002",
    obraId: "",
    ubicacion: "Maletín de pruebas",
    fechaCalibracion: "2026-12-05", // faltan 15 días -> próxima
    notas: "Certificado ONAC",
  },
  {
    id: "INV-003",
    nombre: "Casco dieléctrico tipo II",
    categoria: "Protección personal (EPP)",
    marca: "3M",
    modelo: "H-700",
    serial: "",
    cantidad: 6,
    fechaCompra: "2025-01-20",
    valorCompra: 95000,
    valorActual: 80000,
    estado: "En bodega",
    responsableTipo: "texto",
    empleadoId: "",
    obraId: "",
    ubicacion: "Bodega Envigado",
    fechaCalibracion: "2026-11-10", // vencida hace 10 días
    notas: "",
  },
  {
    id: "INV-004",
    nombre: "Portátil ingeniería",
    categoria: "Cómputo y oficina",
    marca: "Lenovo",
    modelo: "ThinkPad E14",
    serial: "LN-7712",
    cantidad: 1,
    fechaCompra: "2026-02-01",
    valorCompra: 3600000,
    valorActual: 3100000,
    estado: "En mantenimiento",
    responsableTipo: "texto",
    empleadoId: "",
    obraId: "",
    ubicacion: "Servicio técnico",
    fechaCalibracion: "2027-06-01", // al día
    notas: "Cambio de teclado",
  },
  {
    id: "INV-005",
    nombre: "Pulidora 4½ pulgadas",
    categoria: "Herramienta eléctrica",
    marca: "Bosch",
    modelo: "GWS 850",
    serial: "BS-1002",
    cantidad: 1,
    fechaCompra: "2023-05-01",
    valorCompra: 420000,
    valorActual: 200000,
    estado: "Dañado",
    responsableTipo: "texto",
    empleadoId: "",
    obraId: "",
    ubicacion: "Bodega Envigado",
    fechaCalibracion: "",
    notas: "Rotor quemado",
  },
  {
    id: "INV-006",
    nombre: "Arnés multipropósito viejo",
    categoria: "Protección personal (EPP)",
    marca: "Arseg",
    modelo: "10051",
    serial: "AR-001",
    cantidad: 2,
    fechaCompra: "2020-01-10",
    valorCompra: 300000,
    valorActual: 150000,
    estado: ESTADO_DADO_DE_BAJA,
    responsableTipo: "texto",
    empleadoId: "",
    obraId: "",
    ubicacion: "Bodega Envigado",
    fechaCalibracion: "2025-01-10", // vencida, pero dado de baja no alerta
    motivoBaja: "Fin de vida útil de 5 años",
    fechaBaja: "2026-02-15",
    notas: "",
  },
];

describe("códigos automáticos y normalización", () => {
  it("genera consecutivos INV-001, INV-002 sin reutilizar códigos ocupados", () => {
    expect(siguienteIdUnico([], "INV")).toBe("INV-001");
    expect(siguienteIdUnico([{ id: "INV-001" }, { id: "INV-004" }], "INV")).toBe("INV-005");
  });

  it("normaliza búsqueda ignorando tildes, ñ y mayúsculas", () => {
    expect(normalizarTextoBusqueda("  Dinamómetro   Eléctrico  ")).toBe("dinamometro electrico");
    expect(normalizarTextoBusqueda("Dañado")).toBe("danado");
  });

  it("normalizarBien limpia vínculos cruzados y datos de baja al reactivar", () => {
    const activo = normalizarBien({
      nombre: "  Taladro  Bosch  ",
      categoria: "Herramienta eléctrica",
      cantidad: "2",
      valorActual: "500000",
      valorCompra: "",
      estado: "En bodega",
      responsableTipo: "empleado",
      empleadoId: "EMP-001",
      obraId: "OB-010", // debe limpiarse porque el tipo es empleado
      motivoBaja: "Motivo viejo",
      fechaBaja: "2026-01-01",
    });

    expect(activo.nombre).toBe("Taladro Bosch");
    expect(activo.cantidad).toBe(2);
    expect(activo.valorActual).toBe(500000);
    expect(activo.valorCompra).toBeNull();
    expect(activo.empleadoId).toBe("EMP-001");
    expect(activo.obraId).toBe("");
    expect(activo.motivoBaja).toBe("");
    expect(activo.fechaBaja).toBe("");
  });

  it("conserva tieneFoto cuando un registro parcial se guarda sin haber descargado la foto", () => {
    const parcial = normalizarBien({
      nombre: "Dinamómetro",
      categoria: "Equipo de medición",
      valorActual: 5000000,
      foto: "",
      tieneFoto: true,
      __parcial: true,
    });
    expect(parcial.tieneFoto).toBe(true);
  });

  it("valida campos obligatorios y motivo de baja", () => {
    const vacio = validarBien({ nombre: "", categoria: "Inventada", cantidad: 0, valorActual: "" });
    expect(vacio.valido).toBe(false);
    expect(vacio.errores.nombre).toBeTruthy();
    expect(vacio.errores.categoria).toBeTruthy();
    expect(vacio.errores.cantidad).toBeTruthy();
    expect(vacio.errores.valorActual).toBeTruthy();

    const bajaSinMotivo = validarBien({
      nombre: "Casco",
      categoria: "Protección personal (EPP)",
      cantidad: 1,
      valorActual: 50000,
      estado: ESTADO_DADO_DE_BAJA,
      motivoBaja: "   ",
    });
    expect(bajaSinMotivo.valido).toBe(false);
    expect(bajaSinMotivo.errores.motivoBaja).toBeTruthy();

    const ok = validarBien({
      nombre: "Casco",
      categoria: CATEGORIAS_INVENTARIO[4],
      cantidad: 3,
      valorActual: 0,
      estado: "En bodega",
    });
    expect(ok.valido).toBe(true);
  });

  it("asigna tonos semánticos esperados a cada estado y tokens de tema a cada categoría", () => {
    expect(tonoEstadoBien("En uso")).toBe("exito");
    expect(tonoEstadoBien("En bodega")).toBe("info");
    expect(tonoEstadoBien("En mantenimiento")).toBe("aviso");
    expect(tonoEstadoBien("Dañado")).toBe("peligro");
    expect(tonoEstadoBien(ESTADO_DADO_DE_BAJA)).toBe("neutro");
    for (const cat of CATEGORIAS_INVENTARIO) {
      expect(colorCategoriaBien(cat)).toMatch(/^var\(--/);
    }
  });
});

describe("calibración y vencimientos", () => {
  it("marca vencida, hoy, mañana, exactamente 30 días y vigente (>30 días)", () => {
    expect(estadoCalibracion({ fechaCalibracion: "2026-11-19" }, HOY)).toEqual({
      nivel: "vencida",
      diasRestantes: -1,
      etiqueta: "Vencida hace 1 día",
    });
    expect(estadoCalibracion({ fechaCalibracion: "2026-11-20" }, HOY).etiqueta).toBe("Vence hoy");
    expect(estadoCalibracion({ fechaCalibracion: "2026-11-21" }, HOY).etiqueta).toBe("Vence mañana");
    expect(estadoCalibracion({ fechaCalibracion: "2026-12-20" }, HOY).nivel).toBe("proxima");
    expect(requiereAtencionCalibracion({ fechaCalibracion: "2026-12-20" }, HOY)).toBe(true);
    expect(estadoCalibracion({ fechaCalibracion: "2026-12-21" }, HOY).nivel).toBe("vigente");
    expect(requiereAtencionCalibracion({ fechaCalibracion: "2026-12-21" }, HOY)).toBe(false);
  });

  it("no alerta sobre bienes dados de baja aunque tengan fecha vencida", () => {
    const baja = BIENES_MUESTRA.find((b) => b.id === "INV-006");
    expect(estadoCalibracion(baja, HOY).nivel).toBe("ninguna");
    expect(requiereAtencionCalibracion(baja, HOY)).toBe(false);
  });
});

describe("totales, subtotales por categoría y responsable", () => {
  it("calcula cantidad × valor actual por renglón", () => {
    expect(valorTotalBien({ cantidad: 6, valorActual: 80000 })).toBe(480000);
    expect(valorTotalBien({ cantidad: 1, valorActual: 7200000 })).toBe(7200000);
  });

  it("resume bienes activos, valor total, atención y calibraciones sin contar dados de baja", () => {
    const r = calcularResumenInventario(BIENES_MUESTRA, HOY);
    expect(r.activos).toBe(5);
    expect(r.unidadesActivas).toBe(10); // 1 + 1 + 6 + 1 + 1
    expect(r.dadosDeBaja).toBe(1);
    // 1.100.000 + 7.200.000 + 480.000 + 3.100.000 + 200.000 = 12.080.000
    expect(r.valorTotalActual).toBe(12080000);
    expect(r.enMantenimiento).toBe(1);
    expect(r.danados).toBe(1);
    expect(r.enAtencion).toBe(2);
    expect(r.calibracionVencida).toBe(1); // cascos
    expect(r.calibracionProxima).toBe(1); // dinamómetro
    expect(r.conAlertaCalibracion).toBe(2);
  });

  it("calcula subtotales por categoría ordenados de mayor a menor valor", () => {
    const subs = subtotalesPorCategoria(BIENES_MUESTRA);
    expect(subs.map((s) => s.categoria)).toEqual([
      "Equipo de medición",
      "Cómputo y oficina",
      "Herramienta eléctrica",
      "Protección personal (EPP)",
    ]);
    const electrica = subs.find((s) => s.categoria === "Herramienta eléctrica");
    expect(electrica.registros).toBe(2);
    expect(electrica.valorTotal).toBe(1300000);
    // EPP activo solo incluye los 6 cascos (480k), no el arnés dado de baja (300k).
    const epp = subs.find((s) => s.categoria === "Protección personal (EPP)");
    expect(epp.valorTotal).toBe(480000);

    const conBajas = subtotalesPorCategoria(BIENES_MUESTRA, { incluirDadosDeBaja: true });
    expect(conBajas.find((s) => s.categoria === "Protección personal (EPP)").valorTotal).toBe(780000);
  });

  it("resuelve empleado, obra y ubicación libre desde el contexto vivo", () => {
    const ctx = { empleados: EMPLEADOS, obras: OBRAS };
    const rEmp = resolverResponsable(BIENES_MUESTRA[1], ctx);
    expect(rEmp.principal).toBe("Laura Gómez");
    expect(rEmp.texto).toBe("Laura Gómez · Maletín de pruebas");

    const rObra = resolverResponsable(BIENES_MUESTRA[0], ctx);
    expect(rObra.principal).toBe("OB-012 · Puntos de anclaje cubierta");
    expect(rObra.texto).toContain("Frente norte");

    const rTexto = resolverResponsable(BIENES_MUESTRA[2], ctx);
    expect(rTexto.principal).toBe("Bodega Envigado");
  });
});

describe("búsqueda sin tildes, filtros y ordenamiento", () => {
  const ctx = { empleados: EMPLEADOS, obras: OBRAS };

  it("busca ignorando tildes por nombre, marca, serial y código", () => {
    expect(filtrarYOrdenarInventario(BIENES_MUESTRA, { busqueda: "dinamometro" }, ctx, HOY).map((b) => b.id)).toEqual(["INV-002"]);
    expect(filtrarYOrdenarInventario(BIENES_MUESTRA, { busqueda: "dieléctrico" }, ctx, HOY).map((b) => b.id)).toEqual(["INV-003"]);
    expect(filtrarYOrdenarInventario(BIENES_MUESTRA, { busqueda: "dielectrico" }, ctx, HOY).map((b) => b.id)).toEqual(["INV-003"]);
    expect(filtrarYOrdenarInventario(BIENES_MUESTRA, { busqueda: "dewalt" }, ctx, HOY).map((b) => b.id)).toEqual(["INV-001"]);
    expect(filtrarYOrdenarInventario(BIENES_MUESTRA, { busqueda: "HJ-9981" }, ctx, HOY).map((b) => b.id)).toEqual(["INV-002"]);
    expect(filtrarYOrdenarInventario(BIENES_MUESTRA, { busqueda: "inv-004" }, ctx, HOY).map((b) => b.id)).toEqual(["INV-004"]);
  });

  it("filtra por categoría, estado, atención y calibración próxima", () => {
    expect(
      filtrarYOrdenarInventario(BIENES_MUESTRA, { categoria: "Herramienta eléctrica" }, ctx, HOY).map((b) => b.id).sort()
    ).toEqual(["INV-001", "INV-005"]);

    expect(
      filtrarYOrdenarInventario(BIENES_MUESTRA, { estado: "En uso" }, ctx, HOY).map((b) => b.id).sort()
    ).toEqual(["INV-001", "INV-002"]);

    expect(
      filtrarYOrdenarInventario(BIENES_MUESTRA, { soloAtencion: true }, ctx, HOY).map((b) => b.id).sort()
    ).toEqual(["INV-004", "INV-005"]);

    expect(
      filtrarYOrdenarInventario(BIENES_MUESTRA, { soloCalibracion: true }, ctx, HOY).map((b) => b.id).sort()
    ).toEqual(["INV-002", "INV-003"]);
  });

  it("ordena por nombre, valor y fecha de compra / calibración", () => {
    const porValorDesc = filtrarYOrdenarInventario(BIENES_MUESTRA, { orden: "valor_desc" }, ctx, HOY);
    expect(porValorDesc[0].id).toBe("INV-002"); // 7.2M
    expect(porValorDesc[1].id).toBe("INV-004"); // 3.1M

    const porFechaDesc = filtrarYOrdenarInventario(BIENES_MUESTRA, { orden: "fecha_desc" }, ctx, HOY);
    expect(porFechaDesc[0].id).toBe("INV-004"); // 2026-02-01

    const porCal = filtrarYOrdenarInventario(BIENES_MUESTRA, { orden: "calibracion_asc" }, ctx, HOY);
    expect(porCal[0].id).toBe("INV-003"); // vencida hace 10d
    expect(porCal[1].id).toBe("INV-002"); // en 15d
    expect(porCal[2].id).toBe("INV-004"); // 2027
  });

  it("dar de baja cambia estado sin borrar y exige motivo", () => {
    expect(() => darDeBajaBien(BIENES_MUESTRA[0], "  ")).toThrow();
    const baja = darDeBajaBien(BIENES_MUESTRA[0], "Extravío en obra", "2026-11-20");
    expect(baja.id).toBe("INV-001");
    expect(baja.estado).toBe(ESTADO_DADO_DE_BAJA);
    expect(baja.motivoBaja).toBe("Extravío en obra");
    expect(baja.fechaBaja).toBe("2026-11-20");
  });
});

describe("exportación a Excel y CSV", () => {
  const ctx = { empleados: EMPLEADOS, obras: OBRAS };

  it("genera dos hojas Excel válidas (listado y subtotales por categoría)", async () => {
    const hojas = hojasExcelInventario(BIENES_MUESTRA, ctx, HOY);
    expect(hojas).toHaveLength(2);
    expect(hojas[0].nombre).toBe("Inventario");
    expect(hojas[1].nombre).toBe("Por categoría");
    // Encabezados + 6 bienes
    expect(hojas[0].filas.length).toBe(4 + BIENES_MUESTRA.length);
    // Verifica que genera un archivo .xlsx binario real sin errores.
    const zipBytes = await construirXlsx(hojas, "uint8array");
    expect(zipBytes.length).toBeGreaterThan(500);
    // Cabecera PK de un archivo ZIP/XLSX
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
  });

  it("genera CSV con BOM UTF-8 y escapa comas y comillas", () => {
    const conComa = { ...BIENES_MUESTRA[0], notas: 'Incluye "maletín", 2 baterías' };
    const csv = generarCsvInventario([conComa], ctx, HOY);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Incluye ""maletín"", 2 baterías"');
    expect(csv).toContain("OB-012 · Puntos de anclaje cubierta · Frente norte");
  });
});

describe("permisos por módulo de inventario", () => {
  const ADMIN = { role: "admin", activo: true, email: "admin@empresa.co", modulos: null };
  const CONTADOR = { role: "contador", activo: true, email: "c@empresa.co", modulos: [] };
  const CON_INV = { role: "operator", activo: true, email: "o@empresa.co", modulos: ["obras", "inventario"] };
  const SIN_INV = { role: "operator", activo: true, email: "o2@empresa.co", modulos: ["obras"] };
  const CONSULTA_INV = { role: "viewer", activo: true, email: "v@empresa.co", modulos: ["inventario"] };

  it("respeta lectura, escritura y visibilidad en menú según rol y módulos", () => {
    expect(modulosPermitidos(ADMIN)).toContain("inventario");
    expect(modulosPermitidos(CON_INV)).toContain("inventario");
    expect(modulosPermitidos(SIN_INV)).not.toContain("inventario");
    expect(modulosPermitidos(CONSULTA_INV)).toContain("inventario");

    expect(tieneAccesoTabla(CON_INV, "inventario")).toBe(true);
    expect(puedeEscribirTabla(CON_INV, "inventario")).toBe(true);
    expect(entidadesSinPermiso(CON_INV)).not.toContain("inventario");

    expect(tieneAccesoTabla(SIN_INV, "inventario")).toBe(false);
    expect(puedeEscribirTabla(SIN_INV, "inventario")).toBe(false);
    expect(entidadesSinPermiso(SIN_INV)).toContain("inventario");

    // Rol Consulta con el módulo puede ver/leer, pero no modificar ni borrar.
    expect(tieneAccesoTabla(CONSULTA_INV, "inventario")).toBe(true);
    expect(puedeEscribirTabla(CONSULTA_INV, "inventario")).toBe(false);
    expect(entidadesSinPermiso(CONSULTA_INV)).toContain("inventario");

    expect(puedeEscribirTabla(ADMIN, "inventario")).toBe(true);
    expect(puedeEscribirTabla(CONTADOR, "inventario")).toBe(true);
  });
});

describe("fotos de inventario en Supabase Storage (sin base64 en arranque)", () => {
  const TENANT = "t1";

  function baseFalsaInventario(storage) {
    const db = { inventario: [] };
    const selects = [];
    let reloj = 1;

    class Consulta {
      constructor(tabla) {
        this.tabla = tabla;
        this.op = "select";
        this.cols = "*";
        this.filtros = [];
        this.devuelve = false;
      }
      select(cols = "*") {
        if (this.op === "select") {
          this.cols = cols;
          selects.push(cols);
        } else {
          this.devuelve = true;
        }
        return this;
      }
      insert(filas) { this.op = "insert"; this.payload = filas; return this; }
      update(fila) { this.op = "update"; this.payload = fila; return this; }
      eq(c, v) { this.filtros.push((f) => f[c] === v); return this; }
      order() { return this; }
      range() { return this; }
      maybeSingle() { this.una = true; return this; }
      then(ok, mal) { return Promise.resolve(this.ejecutar()).then(ok, mal); }

      ejecutar() {
        const filas = db[this.tabla];
        const coincide = (f) => this.filtros.every((fn) => fn(f));
        const salida = (data) => ({ data: this.una ? (data[0] ?? null) : data, error: null });

        if (this.op === "select") {
          const data = filas.filter(coincide).map((f) => {
            if (this.cols === "*") return { ...f };
            const proyectada = {};
            for (const c of this.cols.split(",").map((s) => s.trim())) {
              if (c in f) proyectada[c] = f[c];
            }
            return proyectada;
          });
          return salida(data);
        }
        if (this.op === "insert") {
          const nuevas = [].concat(this.payload).map((n) => ({
            ...n,
            tiene_foto: Boolean(n.foto),
            updated_at: `v${reloj++}`,
          }));
          filas.push(...nuevas);
          return this.devuelve ? salida(nuevas) : { data: null, error: null };
        }
        if (this.op === "update") {
          const tocadas = [];
          filas.forEach((f, i) => {
            if (!coincide(f)) return;
            const mezclada = { ...f, ...this.payload, updated_at: `v${reloj++}` };
            mezclada.tiene_foto = Boolean(mezclada.foto);
            filas[i] = mezclada;
            tocadas.push(mezclada);
          });
          return salida(tocadas);
        }
        throw new Error(`Operación no soportada: ${this.op}`);
      }
    }

    return {
      db,
      selects,
      supabase: { from: (t) => new Consulta(t), storage },
    };
  }

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("sube la foto a Storage, la omite al listar al arrancar y la descarga al abrir el detalle", async () => {
    const storage = storageFalso();
    const { db, selects, supabase } = baseFalsaInventario(storage);
    const foto = fotoFalsa(4);

    // 1. Alta con foto: sube al bucket y la fila guarda solo la referencia sb-foto:...
    const svcEscritura = createDataService({ supabase, tenantId: TENANT });
    await svcEscritura.insertMany("inventario", [{
      id: "INV-001",
      nombre: "Dinamómetro 25 kN",
      categoria: "Equipo de medición",
      cantidad: 1,
      valorActual: 7200000,
      estado: "En uso",
      foto,
    }]);

    expect(storage.archivos.size).toBe(1);
    expect(db.inventario[0].foto.startsWith(`${PREFIJO_FOTO}${TENANT}/`)).toBe(true);
    expect(db.inventario[0].foto.startsWith("data:")).toBe(false);

    // 2. Arranque en otra sesión: list() NO pide la columna foto ni descarga de Storage.
    const svcArranque = createDataService({ supabase, tenantId: TENANT });
    const listado = await svcArranque.list("inventario");
    expect(selects[0].split(",")).not.toContain("foto");
    expect(selects[0].split(",")).toContain("tiene_foto");
    expect(listado[0].__parcial).toBe(true);
    expect(listado[0].tieneFoto).toBe(true);
    expect(listado[0].foto).toBe("");

    // 3. Editar un registro parcial (sin bajar la foto) NO borra la foto en la base.
    await svcArranque.actualizarConVersion("inventario", [{
      ...listado[0],
      estado: "En mantenimiento",
    }]);
    expect(db.inventario[0].estado).toBe("En mantenimiento");
    expect(db.inventario[0].foto.startsWith(`${PREFIJO_FOTO}${TENANT}/`)).toBe(true);

    // 4. Al abrir el detalle, la foto se descarga de Storage y vuelve intacta.
    const detalle = await svcArranque.cargarDetalle("inventario", "INV-001");
    expect(detalle.foto).toBe(foto);
    expect(detalle.tieneFoto).toBe(true);
  });
});
