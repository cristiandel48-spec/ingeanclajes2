// Plantillas inteligentes de cotizacion.
//
// Cada tipo de trabajo se cotiza casi siempre con los mismos servicios: una
// linea camionera lleva postes, dados, cable, carros, autorretractiles,
// diseno y certificacion; una escalera lleva sus metros de altura. Antes eso
// se buscaba item por item en el catalogo y se calculaba a mano.
//
// Aqui la persona da las medidas que ya conoce (metros, altura, cantidad) y
// la plantilla arma los items con sus cantidades. Los PRECIOS no salen de
// aqui: cada item se busca por su nombre en el catalogo vigente, asi que si
// se cambia un precio en «Catalogo y precios» la plantilla usa el nuevo.
//
// Lo que sale es un borrador con la misma forma que el del dictado, y entra a
// la cotizacion por la misma puerta: solo agrega items, no pisa nada.
//
// LAS REGLAS DE CANTIDAD son puntos de partida y viven solo en este archivo.
// Si en obra se trabaja distinto (otra separacion entre postes, por ejemplo),
// se cambia aqui o se ajusta el campo en la pantalla antes de aplicar.

import { itemsPlanos } from "./catalogo";
import { ITEMS_DB } from "../data/seed";

// La plantilla nombra cada servicio exacto, asi que se busca por nombre exacto
// (sin tildes ni mayusculas). No se usa la busqueda aproximada del dictado: si
// faltaba «ESCALERA TIPO GATO CON LINEA DE VIDA VERTICAL» en el catalogo, esa
// busqueda la cambiaba por «LINEA DE VIDA VERTICAL», otro servicio y otro
// precio, sin avisar.
const normal = (t) =>
  String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
function buscarExacto(desc, catalogo) {
  const buscado = normal(desc);
  return itemsPlanos(catalogo?.length ? catalogo : ITEMS_DB).find((i) => normal(i.desc) === buscado) || null;
}

const num = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
// Las cantidades de cotizacion van con un decimal como mucho: 12,5 ML.
const redondear = (n) => Math.round(n * 10) / 10;
const fmtCant = (n) => String(redondear(n)).replace(".", ",");

const TIPOS_ANCLAJE = [
  { id: "PUNTO DE ANCLAJE EPOXICO", label: "Epóxico" },
  { id: "PUNTO DE ANCLAJE SOLDADO", label: "Soldado" },
  { id: "PUNTO DE ANCLAJE EN FACHADA", label: "En fachada" },
  { id: "ANCLAJE ARTICO ACERO GALVANIZADO", label: "Ártico galvanizado" },
  { id: "ANCLAJE ARTICO ACERO INOXIDABLE", label: "Ártico inoxidable" },
];

const CERTIFICACION = "CERTIFICACION SISTEMA ANTICAIDA";
const COORDINADOR = "COORDINADOR SST EN OBRA";

// Campos opcionales que se repiten en varias plantillas.
const campoCertificacion = (defecto = false) => ({
  id: "certificacion", label: "Certificación del sistema como ítem aparte", tipo: "si_no", defecto,
  ayuda: "La propuesta ya dice que entrega certificados. Márcalo solo si el cliente la pide cobrada aparte.",
});
const campoCoordinador = {
  id: "diasCoordinador", label: "Días de coordinador SST cobrados aparte", tipo: "numero", unidad: "días", defecto: 0,
  ayuda: "Déjalo en 0 si el coordinador va incluido, como dice la propuesta estándar.",
};
const lineasOpcionales = (v) => [
  v.certificacion && { desc: CERTIFICACION, cant: 1 },
  num(v.diasCoordinador) && { desc: COORDINADOR, cant: num(v.diasCoordinador) },
];

export const PLANTILLAS = [
  {
    id: "linea_horizontal",
    nombre: "Línea de vida horizontal",
    tipo: "linea_vida",
    resumen: "Cable en cubierta o fachada, con anclajes y tramos de conexión si los hay.",
    campos: [
      { id: "metros", label: "Metros de línea", tipo: "numero", unidad: "ML", defecto: 20, obligatorio: true },
      { id: "metrosConexion", label: "Metros de conexión o transversal", tipo: "numero", unidad: "ML", defecto: 0 },
      { id: "anclajes", label: "Puntos de anclaje adicionales", tipo: "numero", unidad: "Und", defecto: 0 },
      { id: "tipoAnclaje", label: "Tipo de anclaje", tipo: "opcion", opciones: TIPOS_ANCLAJE, defecto: TIPOS_ANCLAJE[0].id,
        visible: (v) => num(v.anclajes) > 0 },
      campoCertificacion(),
      campoCoordinador,
    ],
    armar: (v) => ({
      lineas: [
        { desc: "LINEA DE VIDA HORIZONTAL", cant: num(v.metros) },
        num(v.metrosConexion) && { desc: "LINEA DE VIDA CONEXION / TRANSVERSAL", cant: num(v.metrosConexion) },
        num(v.anclajes) && { desc: v.tipoAnclaje, cant: num(v.anclajes) },
        ...lineasOpcionales(v),
      ],
      alcance:
        `Suministro e instalación de ${fmtCant(num(v.metros))} ML de línea de vida horizontal certificada` +
        (num(v.anclajes) ? `, con ${fmtCant(num(v.anclajes))} punto(s) de anclaje` : "") +
        ", para trabajo seguro en alturas según la Resolución 4272 de 2021.",
    }),
  },
  {
    id: "linea_vertical",
    nombre: "Línea de vida vertical",
    tipo: "linea_vida_vertical",
    resumen: "Para ascenso por escalera, torre o estructura existente.",
    campos: [
      { id: "metros", label: "Altura a cubrir", tipo: "numero", unidad: "ML", defecto: 6, obligatorio: true },
      campoCertificacion(),
      campoCoordinador,
    ],
    armar: (v) => ({
      lineas: [{ desc: "LINEA DE VIDA VERTICAL", cant: num(v.metros) }, ...lineasOpcionales(v)],
      alcance:
        `Suministro e instalación de ${fmtCant(num(v.metros))} ML de línea de vida vertical certificada ` +
        "para ascenso seguro, según la Resolución 4272 de 2021.",
    }),
  },
  {
    id: "escalera",
    nombre: "Escalera",
    tipo: "escaleras",
    resumen: "Escalera fija, tipo gato o marinera, por metro de altura.",
    campos: [
      { id: "altura", label: "Altura de la escalera", tipo: "numero", unidad: "m", defecto: 6, obligatorio: true },
      { id: "modelo", label: "Modelo", tipo: "opcion", defecto: "ESCALERA TIPO GATO CON LINEA DE VIDA VERTICAL", opciones: [
        { id: "ESCALERA TIPO GATO CON LINEA DE VIDA VERTICAL", label: "Tipo gato con línea de vida" },
        { id: "ESCALERA FIJA CON LINEA DE VIDA VERTICAL", label: "Fija con línea de vida" },
        { id: "ESCALERA TIPO GATO", label: "Tipo gato sin línea" },
        { id: "ESCALERA MARINERA", label: "Marinera" },
      ] },
      campoCertificacion(),
      campoCoordinador,
    ],
    armar: (v) => ({
      lineas: [{ desc: v.modelo, cant: num(v.altura) }, ...lineasOpcionales(v)],
      alcance:
        `Fabricación, suministro e instalación de ${fmtCant(num(v.altura))} m de ${String(v.modelo || "").toLowerCase()}, ` +
        "certificada para trabajo seguro en alturas.",
    }),
  },
  {
    id: "puntos_anclaje",
    nombre: "Puntos de anclaje",
    tipo: "puntos_anclaje",
    resumen: "Anclajes sueltos para conexión de arnés.",
    campos: [
      { id: "cantidad", label: "Cantidad de puntos", tipo: "numero", unidad: "Und", defecto: 4, obligatorio: true },
      { id: "tipoAnclaje", label: "Tipo de anclaje", tipo: "opcion", opciones: TIPOS_ANCLAJE, defecto: TIPOS_ANCLAJE[0].id },
      campoCertificacion(),
      campoCoordinador,
    ],
    armar: (v) => ({
      lineas: [{ desc: v.tipoAnclaje, cant: num(v.cantidad) }, ...lineasOpcionales(v)],
      alcance:
        `Suministro e instalación de ${fmtCant(num(v.cantidad))} punto(s) de anclaje certificados ` +
        "para conexión de sistemas de protección contra caídas.",
    }),
  },
  {
    id: "linea_camionera",
    nombre: "Línea de vida camionera",
    tipo: "linea_vida_camionera",
    resumen: "Postes cuello de cisne con cable, carros y autorretráctiles. Calcula postes y dados por ti.",
    campos: [
      { id: "metros", label: "Metros de línea", tipo: "numero", unidad: "ML", defecto: 24, obligatorio: true },
      { id: "separacion", label: "Separación entre postes", tipo: "numero", unidad: "m", defecto: 12,
        ayuda: "Con esto se calculan los postes y sus dados: uno en cada extremo y uno por tramo." },
      { id: "puestos", label: "Personas trabajando a la vez", tipo: "numero", unidad: "Und", defecto: 1,
        ayuda: "Cada una lleva su carro deslizante y su línea autorretráctil." },
      { id: "diseno", label: "Diseño y memoria de cálculo", tipo: "si_no", defecto: true },
      { id: "certificacion", label: "Certificación de la línea camionera", tipo: "si_no", defecto: true },
    ],
    armar: (v) => {
      const metros = num(v.metros);
      const separacion = num(v.separacion) || 12;
      const postes = metros ? Math.ceil(metros / separacion) + 1 : 0;
      const puestos = num(v.puestos);
      return {
        lineas: [
          { desc: "POSTE TIPO CUELLO DE CISNE CON PEDESTAL", cant: postes },
          { desc: "DADO DE CIMENTACION EN CONCRETO PARA POSTE", cant: postes },
          { desc: "LINEA DE VIDA CAMIONERA EN CABLE DE ACERO GALVANIZADO", cant: metros },
          puestos && { desc: "CARRO DESLIZANTE PARA LINEA DE VIDA CAMIONERA", cant: puestos },
          puestos && { desc: "LINEA AUTORRETRACTIL PARA LINEA DE VIDA CAMIONERA", cant: puestos },
          v.diseno && { desc: "DISEÑO Y MEMORIA DE CALCULO DE LINEA DE VIDA CAMIONERA", cant: 1 },
          v.certificacion && { desc: "CERTIFICACION DE LINEA DE VIDA CAMIONERA", cant: 1 },
        ],
        alcance:
          `Diseño, suministro e instalación de ${fmtCant(metros)} ML de línea de vida camionera sobre ` +
          `${postes} poste(s) tipo cuello de cisne con dado de cimentación, para ${fmtCant(puestos || 1)} ` +
          "persona(s) trabajando a la vez sobre los vehículos.",
        notas: [`${postes} postes y ${postes} dados: un poste cada ${fmtCant(separacion)} m más el del extremo.`],
      };
    },
  },
  {
    id: "cubierta_completa",
    nombre: "Cubierta completa",
    tipo: "sistemas_completos",
    resumen: "Sistema anticaídas de cubierta, con pasarela y barandilla si se necesitan.",
    campos: [
      { id: "pasarela", label: "Metros de pasarela", tipo: "numero", unidad: "ML", defecto: 0 },
      { id: "barandilla", label: "Metros de barandilla en cable", tipo: "numero", unidad: "ML", defecto: 0 },
      campoCoordinador,
    ],
    armar: (v) => ({
      lineas: [
        { desc: "SISTEMA ANTICAIDA CUBIERTA (COMPLETO)", cant: 1 },
        num(v.pasarela) && { desc: "PASARELA DE SEGURIDAD EN CUBIERTA", cant: num(v.pasarela) },
        num(v.barandilla) && { desc: "BARANDILLA DE PROTECCION EN CABLE", cant: num(v.barandilla) },
        num(v.diasCoordinador) && { desc: COORDINADOR, cant: num(v.diasCoordinador) },
      ],
      alcance:
        "Suministro e instalación de sistema anticaídas completo para cubierta" +
        (num(v.pasarela) ? `, con ${fmtCant(num(v.pasarela))} ML de pasarela de seguridad` : "") +
        (num(v.barandilla) ? ` y ${fmtCant(num(v.barandilla))} ML de barandilla en cable` : "") +
        ".",
    }),
  },
  {
    id: "recertificacion",
    nombre: "Recertificación",
    tipo: "servicios",
    resumen: "Recertificación de líneas existentes, por metro o como servicio anual.",
    campos: [
      { id: "modo", label: "Cómo se cobra", tipo: "opcion", defecto: "metro", opciones: [
        { id: "metro", label: "Por metro de línea" },
        { id: "global", label: "Recertificación anual (global)" },
      ] },
      { id: "metros", label: "Metros de línea a recertificar", tipo: "numero", unidad: "ML", defecto: 20,
        visible: (v) => v.modo !== "global" },
      { id: "inspeccion", label: "Inspección y diagnóstico", tipo: "si_no", defecto: false },
    ],
    armar: (v) => ({
      lineas: [
        v.modo === "global"
          ? { desc: "RECERTIFICACION ANUAL", cant: 1 }
          : { desc: "RECERTIFICACION LINEA DE VIDA", cant: num(v.metros) },
        v.inspeccion && { desc: "INSPECCION Y DIAGNOSTICO", cant: 1 },
      ],
      alcance: v.modo === "global"
        ? "Inspección, mantenimiento y recertificación anual del sistema de protección contra caídas."
        : `Inspección, mantenimiento y recertificación de ${fmtCant(num(v.metros))} ML de línea de vida.`,
    }),
  },
];

export const plantillaPorId = (id) => PLANTILLAS.find((p) => p.id === id) || null;

/** Los valores con los que arranca el formulario de una plantilla. */
export function valoresIniciales(plantilla) {
  return Object.fromEntries((plantilla?.campos ?? []).map((c) => [c.id, c.defecto]));
}

/** Los campos que se muestran con los valores de ahora. */
export function camposVisibles(plantilla, valores) {
  return (plantilla?.campos ?? []).filter((c) => !c.visible || c.visible(valores));
}

/** Lo que falta para poder armar: los obligatorios en cero o vacios. */
export function camposFaltantes(plantilla, valores) {
  return camposVisibles(plantilla, valores).filter((c) => c.obligatorio && !num(valores?.[c.id]));
}

/**
 * Arma el borrador de una plantilla contra el catalogo vigente.
 *
 * Devuelve la misma forma que el dictado ({ items, fuera, avisos, alcance })
 * mas `tipo`, el tipo de sistema que le corresponde a la propuesta.
 */
export function armarDesdePlantilla(plantilla, valores, catalogo) {
  if (!plantilla) return { tipo: "", alcance: "", items: [], fuera: [], avisos: [], notas: [] };
  const { lineas = [], alcance = "", notas = [] } = plantilla.armar(valores || {}) || {};

  const items = [];
  const fuera = [];
  const sinPrecio = [];

  for (const linea of lineas) {
    if (!linea || !linea.desc || !(linea.cant > 0)) continue;
    const real = buscarExacto(linea.desc, catalogo);
    if (!real) {
      fuera.push({ desc: linea.desc, cant: redondear(linea.cant) });
      continue;
    }
    const vu = Number(real.vu) || 0;
    if (!vu) sinPrecio.push(real.desc);
    items.push({
      desc: real.desc,
      unit: real.unit,
      cant: redondear(linea.cant),
      vu,
      vuCatalogo: vu,
      precioDictado: false,
      textoOriginal: linea.desc,
    });
  }

  const avisos = [];
  if (sinPrecio.length) {
    avisos.push(
      `${sinPrecio.length === 1 ? "Este servicio no tiene" : "Estos servicios no tienen"} precio en el catálogo: ` +
      `${sinPrecio.join(", ")}. Ponlo en «Catálogo y precios» o escríbelo en la cotización.`,
    );
  }
  if (fuera.length) {
    avisos.push(
      `${fuera.length} servicio(s) de la plantilla no están en el catálogo o están apagados y quedaron fuera: ` +
      `${fuera.map((f) => f.desc).join(", ")}.`,
    );
  }

  return { tipo: plantilla.tipo, alcance, items, fuera, avisos, notas };
}
