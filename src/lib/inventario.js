// Lógica de negocio pura del módulo de Inventario.
//
// Vive fuera de los componentes para poder probar totales, filtros, búsqueda
// sin tildes, alertas de calibración y exportación sin montar interfaz.

import { toIsoDate } from "./dates";
import { today } from "./format";

export const CATEGORIAS_INVENTARIO = [
  "Herramienta eléctrica",
  "Herramienta manual",
  "Equipo de medición",
  "Cómputo y oficina",
  "Protección personal (EPP)",
  "Vehículos",
  "Mobiliario",
  "Otro",
];

export const ESTADO_DADO_DE_BAJA = "Dado de baja";

export const ESTADOS_INVENTARIO = [
  "En uso",
  "En bodega",
  "En mantenimiento",
  "Dañado",
  ESTADO_DADO_DE_BAJA,
];

export const ESTADOS_ATENCION = ["En mantenimiento", "Dañado"];

export const TIPOS_RESPONSABLE = [
  { id: "texto", label: "Ubicación libre" },
  { id: "empleado", label: "Empleado" },
  { id: "obra", label: "Obra" },
];

export const ORDENES_INVENTARIO = [
  { key: "nombre", label: "Nombre A–Z" },
  { key: "valor_desc", label: "Mayor valor total" },
  { key: "valor_asc", label: "Menor valor total" },
  { key: "fecha_desc", label: "Compra más reciente" },
  { key: "calibracion_asc", label: "Calibración más próxima" },
];

export const UMBRAL_ALERTA_CALIBRACION = 30;

const TONO_POR_ESTADO = {
  "En uso": "exito",
  "En bodega": "info",
  "En mantenimiento": "aviso",
  "Dañado": "peligro",
  "Dado de baja": "neutro",
};

export function tonoEstadoBien(estado) {
  return TONO_POR_ESTADO[estado] || "neutro";
}

// Colores tomados exclusivamente de los tokens del tema para mantener
// contraste y modo oscuro automático en las barras y puntos de categoría.
const COLOR_POR_CATEGORIA = {
  "Equipo de medición": "var(--info)",
  "Herramienta eléctrica": "var(--accent)",
  "Cómputo y oficina": "var(--success)",
  "Protección personal (EPP)": "var(--warning)",
  "Herramienta manual": "var(--info-text)",
  "Vehículos": "var(--danger)",
  "Mobiliario": "var(--success-text)",
  "Otro": "var(--text-tertiary)",
};

export function colorCategoriaBien(categoria) {
  return COLOR_POR_CATEGORIA[categoria] || "var(--text-tertiary)";
}

/**
 * Normaliza un texto para comparaciones de búsqueda ignorando mayúsculas,
 * espacios repetidos y tildes/diacríticos («dinamómetro» === «dinamometro»).
 */
export function normalizarTextoBusqueda(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function limpiarTexto(valor) {
  return String(valor ?? "").trim().replace(/\s+/g, " ");
}

function numeroNoNegativo(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function crearBienVacio() {
  return {
    nombre: "",
    categoria: CATEGORIAS_INVENTARIO[0],
    marca: "",
    modelo: "",
    serial: "",
    cantidad: 1,
    fechaCompra: "",
    valorCompra: "",
    valorActual: "",
    estado: "En bodega",
    responsableTipo: "texto",
    empleadoId: "",
    obraId: "",
    ubicacion: "",
    fechaCalibracion: "",
    motivoBaja: "",
    fechaBaja: "",
    foto: "",
    tieneFoto: false,
    notas: "",
  };
}

/**
 * Normaliza los campos de un bien antes de guardarlo en estado / nube.
 * Limpia referencias cruzadas de responsable según `responsableTipo` y
 * descarta los datos de baja si el bien se reactiva a otro estado.
 */
export function normalizarBien(datos = {}) {
  const categoria = CATEGORIAS_INVENTARIO.includes(datos.categoria)
    ? datos.categoria
    : "Otro";
  const estado = ESTADOS_INVENTARIO.includes(datos.estado)
    ? datos.estado
    : "En bodega";

  const cantidadNum = Math.floor(Number(datos.cantidad));
  const cantidad = Number.isFinite(cantidadNum) && cantidadNum >= 1 ? cantidadNum : 1;

  const valorActual = numeroNoNegativo(datos.valorActual) ?? 0;
  const valorCompra = numeroNoNegativo(datos.valorCompra);

  const tipoValido = ["texto", "empleado", "obra"].includes(datos.responsableTipo)
    ? datos.responsableTipo
    : (datos.empleadoId ? "empleado" : datos.obraId ? "obra" : "texto");

  const empleadoId = tipoValido === "empleado" ? String(datos.empleadoId || "").trim() : "";
  const obraId = tipoValido === "obra" ? String(datos.obraId || "").trim() : "";
  const ubicacion = limpiarTexto(datos.ubicacion);

  const esBaja = estado === ESTADO_DADO_DE_BAJA;
  const motivoBaja = esBaja ? limpiarTexto(datos.motivoBaja) : "";
  const fechaBaja = esBaja ? (String(datos.fechaBaja || "").trim() || today()) : "";

  const foto = typeof datos.foto === "string" ? datos.foto.trim() : "";
  // Si el registro sigue parcial (la foto no se bajó aún), respetamos tieneFoto
  // para no perder la marca visual del listado al editar otros campos.
  const tieneFoto = Boolean(foto) || Boolean(datos.__parcial && datos.tieneFoto);

  return {
    ...datos,
    nombre: limpiarTexto(datos.nombre),
    categoria,
    marca: limpiarTexto(datos.marca),
    modelo: limpiarTexto(datos.modelo),
    serial: limpiarTexto(datos.serial),
    cantidad,
    fechaCompra: String(datos.fechaCompra || "").trim(),
    valorCompra,
    valorActual,
    estado,
    responsableTipo: tipoValido,
    empleadoId,
    obraId,
    ubicacion,
    fechaCalibracion: String(datos.fechaCalibracion || "").trim(),
    motivoBaja,
    fechaBaja,
    foto,
    tieneFoto,
    notas: String(datos.notas ?? "").trim(),
  };
}

/** Valida los campos obligatorios y rangos del formulario de alta/edición. */
export function validarBien(datos = {}) {
  const errores = {};

  if (!limpiarTexto(datos.nombre)) {
    errores.nombre = "Escribe el nombre o descripción del bien.";
  }

  if (!CATEGORIAS_INVENTARIO.includes(datos.categoria)) {
    errores.categoria = "Selecciona una categoría válida.";
  }

  const cantidad = Number(datos.cantidad);
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    errores.cantidad = "La cantidad debe ser un entero mayor o igual a 1.";
  }

  const rawValorActual = datos.valorActual;
  if (rawValorActual === "" || rawValorActual === null || rawValorActual === undefined) {
    errores.valorActual = "Indica el valor actual estimado por unidad en COP.";
  } else {
    const n = Number(rawValorActual);
    if (!Number.isFinite(n) || n < 0) {
      errores.valorActual = "El valor actual debe ser un número mayor o igual a 0.";
    }
  }

  const rawValorCompra = datos.valorCompra;
  if (rawValorCompra !== "" && rawValorCompra !== null && rawValorCompra !== undefined) {
    const n = Number(rawValorCompra);
    if (!Number.isFinite(n) || n < 0) {
      errores.valorCompra = "El valor de compra no puede ser negativo.";
    }
  }

  if (datos.responsableTipo === "empleado" && !String(datos.empleadoId || "").trim()) {
    errores.empleadoId = "Selecciona un empleado responsable.";
  }

  if (datos.responsableTipo === "obra" && !String(datos.obraId || "").trim()) {
    errores.obraId = "Selecciona la obra donde está asignado el bien.";
  }

  if (datos.estado === ESTADO_DADO_DE_BAJA && !limpiarTexto(datos.motivoBaja)) {
    errores.motivoBaja = "Indica el motivo por el cual se da de baja.";
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}

/** Valor total del renglón: cantidad × valor actual por unidad. */
export function valorTotalBien(bien) {
  const cant = Math.max(0, Number(bien?.cantidad) || 0);
  const unit = Math.max(0, Number(bien?.valorActual) || 0);
  return cant * unit;
}

/**
 * Evalúa la fecha de próxima calibración o vencimiento del bien.
 * Los bienes dados de baja nunca generan alerta.
 */
export function estadoCalibracion(bien, hoy = new Date()) {
  if (!bien?.fechaCalibracion || bien.estado === ESTADO_DADO_DE_BAJA) {
    return { nivel: "ninguna", diasRestantes: null, etiqueta: "" };
  }

  const fechaTexto = String(bien.fechaCalibracion).trim();
  const fecha = new Date(/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto) ? `${fechaTexto}T12:00:00` : fechaTexto);
  if (Number.isNaN(fecha.getTime())) {
    return { nivel: "ninguna", diasRestantes: null, etiqueta: "" };
  }

  const ref = new Date(hoy);
  ref.setHours(12, 0, 0, 0);
  const diasRestantes = Math.round((fecha - ref) / 86400000);

  if (diasRestantes < 0) {
    const atraso = Math.abs(diasRestantes);
    return {
      nivel: "vencida",
      diasRestantes,
      etiqueta: `Vencida hace ${atraso} ${atraso === 1 ? "día" : "días"}`,
    };
  }
  if (diasRestantes === 0) {
    return { nivel: "proxima", diasRestantes: 0, etiqueta: "Vence hoy" };
  }
  if (diasRestantes === 1) {
    return { nivel: "proxima", diasRestantes: 1, etiqueta: "Vence mañana" };
  }
  if (diasRestantes <= UMBRAL_ALERTA_CALIBRACION) {
    return { nivel: "proxima", diasRestantes, etiqueta: `En ${diasRestantes} días` };
  }
  return { nivel: "vigente", diasRestantes, etiqueta: `En ${diasRestantes} días` };
}

export function requiereAtencionCalibracion(bien, hoy = new Date()) {
  const { nivel } = estadoCalibracion(bien, hoy);
  return nivel === "vencida" || nivel === "proxima";
}

/**
 * Resuelve el nombre visible del responsable o ubicación usando las listas
 * vivas del contexto (sin duplicar empleados ni obras dentro del inventario).
 */
export function resolverResponsable(bien, { empleados = [], obras = [] } = {}) {
  const tipo = bien?.responsableTipo || (bien?.empleadoId ? "empleado" : bien?.obraId ? "obra" : "texto");
  const ubicacion = limpiarTexto(bien?.ubicacion);

  if (tipo === "empleado" && bien?.empleadoId) {
    const emp = (empleados || []).find((e) => e?.id === bien.empleadoId);
    const principal = emp?.nombre || bien.empleadoId;
    const detalle = ubicacion || emp?.cargo || "";
    return {
      tipo: "empleado",
      etiquetaTipo: "Empleado",
      principal,
      detalle,
      texto: [principal, ubicacion].filter(Boolean).join(" · "),
    };
  }

  if (tipo === "obra" && bien?.obraId) {
    const obra = (obras || []).find((o) => o?.id === bien.obraId);
    const principal = obra
      ? [obra.id, obra.proyecto || obra.cliente].filter(Boolean).join(" · ")
      : bien.obraId;
    const detalle = ubicacion || obra?.ciudad || "";
    return {
      tipo: "obra",
      etiquetaTipo: "Obra",
      principal,
      detalle,
      texto: [principal, ubicacion].filter(Boolean).join(" · "),
    };
  }

  return {
    tipo: "texto",
    etiquetaTipo: "Ubicación",
    principal: ubicacion,
    detalle: "",
    texto: ubicacion,
  };
}

/**
 * Métricas del encabezado. Los bienes dados de baja se cuentan aparte para no
 * inflar el valor actual del inventario ni generar falsas alertas.
 */
export function calcularResumenInventario(bienes = [], hoy = new Date()) {
  const lista = Array.isArray(bienes) ? bienes : [];
  let activos = 0;
  let unidadesActivas = 0;
  let dadosDeBaja = 0;
  let valorTotalActual = 0;
  let valorTotalCompra = 0;
  let enMantenimiento = 0;
  let danados = 0;
  let calibracionVencida = 0;
  let calibracionProxima = 0;

  for (const bien of lista) {
    if (!bien) continue;
    if (bien.estado === ESTADO_DADO_DE_BAJA) {
      dadosDeBaja += 1;
      continue;
    }

    activos += 1;
    const cant = Math.max(0, Number(bien.cantidad) || 0);
    unidadesActivas += cant;
    valorTotalActual += valorTotalBien(bien);
    if (bien.valorCompra !== null && bien.valorCompra !== undefined && bien.valorCompra !== "") {
      valorTotalCompra += cant * Math.max(0, Number(bien.valorCompra) || 0);
    }

    if (bien.estado === "En mantenimiento") enMantenimiento += 1;
    if (bien.estado === "Dañado") danados += 1;

    const cal = estadoCalibracion(bien, hoy);
    if (cal.nivel === "vencida") calibracionVencida += 1;
    else if (cal.nivel === "proxima") calibracionProxima += 1;
  }

  return {
    totalRegistros: lista.length,
    activos,
    unidadesActivas,
    dadosDeBaja,
    valorTotalActual,
    valorTotalCompra,
    enMantenimiento,
    danados,
    enAtencion: enMantenimiento + danados,
    calibracionVencida,
    calibracionProxima,
    conAlertaCalibracion: calibracionVencida + calibracionProxima,
  };
}

/**
 * Agrupa y suma el valor actual por categoría. Excluye dados de baja por
 * defecto para reflejar el patrimonio vigente, salvo cuando se pide incluirlos.
 */
export function subtotalesPorCategoria(bienes = [], { incluirDadosDeBaja = false } = {}) {
  const lista = Array.isArray(bienes) ? bienes : [];
  const mapa = new Map();

  for (const bien of lista) {
    if (!bien) continue;
    if (!incluirDadosDeBaja && bien.estado === ESTADO_DADO_DE_BAJA) continue;

    const cat = bien.categoria || "Otro";
    const actual = mapa.get(cat) || { categoria: cat, registros: 0, unidades: 0, valorTotal: 0 };
    actual.registros += 1;
    actual.unidades += Math.max(0, Number(bien.cantidad) || 0);
    actual.valorTotal += valorTotalBien(bien);
    mapa.set(cat, actual);
  }

  const filas = [...mapa.values()];
  const totalGeneral = filas.reduce((acc, f) => acc + f.valorTotal, 0);

  return filas
    .map((f) => ({
      ...f,
      porcentaje: totalGeneral > 0 ? Math.round((f.valorTotal / totalGeneral) * 1000) / 10 : 0,
    }))
    .sort((a, b) => {
      if (b.valorTotal !== a.valorTotal) return b.valorTotal - a.valorTotal;
      return CATEGORIAS_INVENTARIO.indexOf(a.categoria) - CATEGORIAS_INVENTARIO.indexOf(b.categoria);
    });
}

function fechaComparable(bien) {
  const f = String(bien?.fechaCompra || bien?.creadoEn || "").trim();
  if (!f) return 0;
  const t = new Date(/^\d{4}-\d{2}-\d{2}$/.test(f) ? `${f}T12:00:00` : f).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Filtra y ordena el inventario. La búsqueda ignora tildes y busca por código,
 * nombre, marca, línea/modelo, número de serie y ubicación/responsable.
 */
export function filtrarYOrdenarInventario(
  bienes = [],
  {
    busqueda = "",
    categoria = "Todas",
    estado = "Todos",
    soloAtencion = false,
    soloCalibracion = false,
    orden = "nombre",
  } = {},
  contextos = {},
  hoy = new Date()
) {
  const lista = Array.isArray(bienes) ? bienes : [];
  const q = normalizarTextoBusqueda(busqueda);

  const filtrados = lista.filter((bien) => {
    if (!bien) return false;
    if (categoria && categoria !== "Todas" && bien.categoria !== categoria) return false;
    if (estado && estado !== "Todos" && bien.estado !== estado) return false;
    if (soloAtencion && !ESTADOS_ATENCION.includes(bien.estado)) return false;
    if (soloCalibracion && !requiereAtencionCalibracion(bien, hoy)) return false;

    if (q) {
      const resp = resolverResponsable(bien, contextos);
      const bolsa = normalizarTextoBusqueda([
        bien.id,
        bien.nombre,
        bien.marca,
        bien.modelo,
        bien.serial,
        resp.texto,
      ].filter(Boolean).join(" "));
      if (!bolsa.includes(q)) return false;
    }

    return true;
  });

  const copia = [...filtrados];
  copia.sort((a, b) => {
    if (orden === "valor_desc") {
      const dif = valorTotalBien(b) - valorTotalBien(a);
      return dif !== 0 ? dif : String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    }
    if (orden === "valor_asc") {
      const dif = valorTotalBien(a) - valorTotalBien(b);
      return dif !== 0 ? dif : String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    }
    if (orden === "fecha_desc") {
      const dif = fechaComparable(b) - fechaComparable(a);
      return dif !== 0 ? dif : String(b.id || "").localeCompare(String(a.id || ""), "es", { numeric: true });
    }
    if (orden === "calibracion_asc") {
      const ca = estadoCalibracion(a, hoy).diasRestantes;
      const cb = estadoCalibracion(b, hoy).diasRestantes;
      if (ca === null && cb === null) return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
      if (ca === null) return 1;
      if (cb === null) return -1;
      return ca - cb;
    }
    return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
  });

  return copia;
}

/**
 * Cambia el estado de un bien a «Dado de baja» conservando el registro y
 * anotando el motivo y la fecha.
 */
export function darDeBajaBien(bien, motivo, fecha = today()) {
  const motivoLimpio = limpiarTexto(motivo);
  if (!motivoLimpio) {
    throw new Error("El motivo de baja es obligatorio.");
  }
  return {
    ...bien,
    estado: ESTADO_DADO_DE_BAJA,
    motivoBaja: motivoLimpio,
    fechaBaja: String(fecha || "").trim() || today(),
  };
}

// ── Exportación (Excel .xlsx y CSV) ─────────────────────────────────────────

const COLUMNAS_EXPORT = [
  "Código",
  "Nombre",
  "Categoría",
  "Marca",
  "Modelo / línea",
  "Serial",
  "Cantidad",
  "Valor actual unitario (COP)",
  "Valor total actual (COP)",
  "Valor compra (COP)",
  "Fecha compra",
  "Estado",
  "Responsable / ubicación",
  "Próxima calibración / vencimiento",
  "Alerta calibración",
  "Motivo de baja",
  "Notas",
];

function filaExportacion(bien, contextos, hoy) {
  const resp = resolverResponsable(bien, contextos);
  const cal = estadoCalibracion(bien, hoy);
  const alerta = cal.nivel === "vencida" || cal.nivel === "proxima" ? cal.etiqueta : "";

  return [
    bien.id || "",
    bien.nombre || "",
    bien.categoria || "",
    bien.marca || "",
    bien.modelo || "",
    bien.serial || "",
    Number(bien.cantidad) || 0,
    Number(bien.valorActual) || 0,
    valorTotalBien(bien),
    bien.valorCompra === null || bien.valorCompra === undefined || bien.valorCompra === ""
      ? ""
      : Number(bien.valorCompra),
    bien.fechaCompra || "",
    bien.estado || "",
    resp.texto || "",
    bien.fechaCalibracion || "",
    alerta,
    bien.motivoBaja || "",
    bien.notas || "",
  ];
}

/**
 * Construye las hojas para `construirXlsx` (src/lib/xlsxSimple.js): listado de
 * bienes y hoja aparte con subtotales por categoría.
 */
export function hojasExcelInventario(bienes = [], contextos = {}, hoy = new Date()) {
  const lista = Array.isArray(bienes) ? bienes : [];
  const enc = (v) => ({ v, s: "encabezado" });
  const neg = (v) => ({ v, s: "negrita" });
  const fechaIso = toIsoDate(hoy instanceof Date ? hoy : new Date(hoy)) || today();
  const resumen = calcularResumenInventario(lista, hoy);
  const soloBajas = lista.length > 0 && lista.every((b) => b?.estado === ESTADO_DADO_DE_BAJA);
  const subtotales = subtotalesPorCategoria(lista, { incluirDadosDeBaja: soloBajas });

  const filasBienes = lista.map((bien) => {
    const fila = filaExportacion(bien, contextos, hoy);
    // Fechas en formato de celda de fecha de Excel cuando vienen en ISO.
    if (fila[10]) fila[10] = { v: fila[10], s: "fecha" };
    if (fila[13]) fila[13] = { v: fila[13], s: "fecha" };
    return fila;
  });

  const hojaListado = {
    nombre: "Inventario",
    anchos: [12, 32, 24, 16, 18, 20, 10, 22, 22, 18, 14, 18, 30, 18, 20, 26, 32],
    filasFijas: 4,
    filas: [
      [{ v: "Inventario de bienes — Ingeanclajes S.A.S.", s: "titulo" }],
      [{ v: `Exportado el ${fechaIso} · ${lista.length} registro(s) · Valor activos: $ ${Math.round(resumen.valorTotalActual).toLocaleString("es-CO")}`, s: "tenue" }],
      [],
      COLUMNAS_EXPORT.map(enc),
      ...filasBienes,
    ],
  };

  const totalCategorias = subtotales.reduce((acc, s) => acc + s.valorTotal, 0);
  const totalRegistrosCat = subtotales.reduce((acc, s) => acc + s.registros, 0);
  const totalUnidadesCat = subtotales.reduce((acc, s) => acc + s.unidades, 0);

  const hojaCategorias = {
    nombre: "Por categoría",
    anchos: [28, 14, 14, 24, 14],
    filasFijas: 4,
    filas: [
      [{ v: "Subtotales por categoría", s: "titulo" }],
      [{ v: soloBajas ? "Incluye bienes dados de baja (filtro activo)" : "Bienes activos (excluye dados de baja)", s: "tenue" }],
      [],
      ["Categoría", "Bienes", "Unidades", "Valor total actual (COP)", "% del total"].map(enc),
      ...subtotales.map((s) => [s.categoria, s.registros, s.unidades, s.valorTotal, `${s.porcentaje}%`]),
      [neg("Total"), neg(totalRegistrosCat), neg(totalUnidadesCat), neg(totalCategorias), neg(totalCategorias > 0 ? "100%" : "0%")],
    ],
  };

  return [hojaListado, hojaCategorias];
}

function escaparCeldaCsv(valor) {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  if (/[",\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/** Genera CSV UTF-8 con BOM para que Excel en Windows respete tildes y eñes. */
export function generarCsvInventario(bienes = [], contextos = {}, hoy = new Date()) {
  const lista = Array.isArray(bienes) ? bienes : [];
  const lineas = [
    COLUMNAS_EXPORT.map(escaparCeldaCsv).join(","),
    ...lista.map((bien) => filaExportacion(bien, contextos, hoy).map(escaparCeldaCsv).join(",")),
  ];
  return `\uFEFF${lineas.join("\r\n")}`;
}
