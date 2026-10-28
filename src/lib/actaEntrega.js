// El acta de entrega de obra (FORM-SST-89), armada por el programa.
//
// POR QUE: hasta ahora la llenaba a mano en la obra quien entrega -el lider
// de proyecto o la coordinadora SST-, con los mismos datos que el programa ya
// tiene guardados: el cliente, la cotizacion, las fechas de la bitacora y la
// gente que estuvo. Copiarlos a mano en una hoja impresa se equivoca, se moja
// y se pierde; y cuando el cliente reclama meses despues, no hay con que
// responder.
//
// QUE HACE ESTE ARCHIVO: con la obra, su cotizacion, sus informes, sus
// horarios y el personal, devuelve el acta ya diligenciada. Todo lo que
// devuelve es EDITABLE en la pantalla: esto es el punto de partida, no la
// ultima palabra. En la obra siempre pasa algo que el programa no sabe.
//
// DONDE SE GUARDA: dentro de la obra, en `obra.actas` (migracion 081). Es un
// documento de la obra, como la bitacora, no una entidad aparte.

import { today } from "./format";
import { siguienteIdUnico } from "./identificadores";
import { normalizarBitacora } from "./bitacoraObra";
import { esItemAdministrativo, limpiarPrefijoComercial } from "./certificacionTexto";
import { normalizarMayusculas, normalizarNombrePropio } from "./normalizarEntrada";

/**
 * @typedef {Object} SistemaEntregado
 * @property {number} cantidad
 * @property {string} unidad       ML, Und, Kg…
 * @property {string} descripcion  tal como se cotizo
 */

/**
 * @typedef {Object} ActaEntrega
 * @property {string} id                    consecutivo, el «N° de orden de trabajo»
 * @property {string} obraId
 * @property {string} fecha                 cuando se levanta el acta
 * @property {string} contratante
 * @property {string} nit
 * @property {string} telefono
 * @property {string} correoFacturacion
 * @property {string} correoAdministrativo
 * @property {string} contactoAdministrativo
 * @property {string} direccionObra
 * @property {string} objetivo
 * @property {string} areasIntervenidas
 * @property {string} fechaInicio
 * @property {string} fechaEntrega
 * @property {SistemaEntregado[]} sistemas
 * @property {"galvanizado"|"inoxidable"|""} acero
 * @property {string[]} colaboradores
 * @property {string} coordinadorAlturas
 * @property {string} liderProyecto
 * @property {string} descripcion
 * @property {string} observaciones
 * @property {string} recibeNombre
 * @property {string} recibeDocumento
 * @property {string} recibeCargo
 * @property {string} firmaLider  firma escaneada de quien entrega, para esta acta
 */

// La observacion que va en todas las actas. Esta copiada de las que ya se
// entregaron: el sistema se entrega bueno, y si despues lo golpean hay que
// avisar antes de volver a usarlo. Es editable, pero rara vez hay que cambiarla.
export const ACTA_OBSERVACIONES_POR_DEFECTO =
  "El sistema queda en óptimas condiciones para el debido uso. En caso de ser impactado o de presentar " +
  "fallas, informar inmediatamente a Ingeanclajes S.A.S. antes de volver a utilizarlo.";

const texto = (v) => String(v ?? "").trim();

/** Las actas de una obra, siempre un arreglo y siempre con sus campos. */
export function normalizarActas(obra) {
  const lista = Array.isArray(obra?.actas) ? obra.actas : [];
  return lista.filter(Boolean).map((a) => ({
    ...actaVacia(obra?.id),
    ...a,
    sistemas: Array.isArray(a.sistemas) ? a.sistemas : [],
    colaboradores: Array.isArray(a.colaboradores) ? a.colaboradores.filter(Boolean) : [],
  }));
}

/** Devuelve true si la obra ya tiene al menos un acta de entrega registrada. */
export function tieneActaEntrega(obra) {
  return normalizarActas(obra).length > 0;
}

// Lo que se le dice a quien intenta certificar o hacer el informe sin el acta
// firmada. Esta aqui y no en cada pantalla para que las tres digan lo mismo.
export const AVISO_ACTA_SIN_FIRMAR =
  "Pídele al coordinador de SST o al encargado de la obra que haga el acta de entrega con el cliente "
  + "y se la haga firmar. Sin el acta firmada no se puede certificar ni hacer el informe de actividades.";

export const AVISO_ACTA_EN_OBRA =
  "Haz el acta de entrega y hazla firmar del cliente, para que se puedan hacer el informe de actividades "
  + "y la certificación.";

/**
 * Un acta esta CONCLUIDA cuando existe y el cliente la firmo. Crearla no
 * basta: lo que cierra la entrega es la firma de quien recibe.
 *
 * @param {object} obra
 * @param {Record<string,string>} estadosFirma  { [actaId]: estado }, de
 *   useEstadosFirmaActas. Lo que no este ahi se da por no firmado.
 */
export function actaEntregaConcluida(obra, estadosFirma = {}) {
  return normalizarActas(obra).some((a) => estadosFirma?.[a.id] === "firmado");
}

/**
 * Por que no se puede certificar ni hacer el informe, o "" si si se puede.
 *
 * @returns {"sin-acta"|"sin-firma"|""}
 */
export function motivoActaPendiente(obra, estadosFirma = {}) {
  if (!tieneActaEntrega(obra)) return "sin-acta";
  return actaEntregaConcluida(obra, estadosFirma) ? "" : "sin-firma";
}

/** El aviso completo para ese motivo, con el numero de la obra delante. */
export function textoActaPendiente(obra, estadosFirma = {}) {
  const motivo = motivoActaPendiente(obra, estadosFirma);
  if (!motivo) return "";
  const cual = obra?.id ? `La obra ${obra.id}` : "Esta obra";
  const que = motivo === "sin-acta"
    ? "no tiene acta de entrega."
    : "tiene el acta de entrega sin firmar por el cliente.";
  return `${cual} ${que} ${AVISO_ACTA_SIN_FIRMAR}`;
}

/** Todas las actas de todas las obras, para numerar la siguiente sin repetir. */
export function todasLasActas(obras) {
  return (Array.isArray(obras) ? obras : []).flatMap((o) => normalizarActas(o));
}

function actaVacia(obraId = "") {
  return {
    id: "",
    obraId,
    fecha: today(),
    contratante: "",
    nit: "",
    telefono: "",
    correoFacturacion: "",
    correoAdministrativo: "",
    contactoAdministrativo: "",
    direccionObra: "",
    objetivo: "",
    areasIntervenidas: "",
    fechaInicio: "",
    fechaEntrega: "",
    sistemas: [],
    acero: "",
    colaboradores: [],
    coordinadorAlturas: "",
    liderProyecto: "",
    descripcion: "",
    observaciones: ACTA_OBSERVACIONES_POR_DEFECTO,
    recibeNombre: "",
    recibeDocumento: "",
    recibeCargo: "",
    // La firma de quien entrega. Se sube en el acta, que es cuando se sabe
    // quien la firma: el lider de proyecto cambia de obra en obra. Vacia, la
    // hoja sale con la firma de la empresa, que es como salia antes.
    firmaLider: "",
  };
}

// ── De la cotizacion: que se entrega ────────────────────────────────────────

/** Los items de la propuesta que se aprobo (o la primera, si no hay activa). */
function itemsDeCotizacion(cotizacion) {
  if (!cotizacion) return [];
  if (Array.isArray(cotizacion.propuestas) && cotizacion.propuestas.length) {
    const activa = cotizacion.propuestas.find((p) => p.id === cotizacion.propuestaActivaId)
      || cotizacion.propuestas[0];
    if (Array.isArray(activa?.items) && activa.items.length) return activa.items;
  }
  return Array.isArray(cotizacion.items) ? cotizacion.items : [];
}

/**
 * Los sistemas que se entregan, con su cantidad y su unidad.
 *
 * Deja fuera los viaticos, las polizas y los cursos: el acta dice que quedo
 * instalado, no que se cobro. Si dos items son el mismo sistema -pasa cuando
 * se cotizan por separado dos tramos de linea de vida- se suman en uno.
 */
export function sistemasDeCotizacion(cotizacion) {
  const acumulado = new Map();
  for (const it of itemsDeCotizacion(cotizacion)) {
    const descripcion = texto(it?.desc || it?.descripcion || it?.nombre);
    if (!descripcion || esItemAdministrativo(descripcion)) continue;
    const unidad = texto(it?.unit || it?.unidad) || "Und";
    const cantidad = Math.max(1, Math.round(Number(it?.cant ?? it?.cantidad ?? 1)));
    const clave = `${descripcion.toLowerCase()}|${unidad.toLowerCase()}`;
    const previo = acumulado.get(clave);
    if (previo) previo.cantidad += cantidad;
    else acumulado.set(clave, { cantidad, unidad, descripcion: normalizarMayusculas(descripcion) });
  }
  return [...acumulado.values()];
}

/**
 * El acero del sistema: galvanizado o inoxidable.
 *
 * Es una casilla del formato y sale de como se cotizo. El inoxidable se dice
 * siempre -es mas caro y el cliente lo pide a proposito-; cuando no se dice
 * nada, es galvanizado, que es lo que se instala por defecto.
 */
export function aceroDeCotizacion(cotizacion) {
  const todo = itemsDeCotizacion(cotizacion)
    .map((it) => texto(it?.desc || it?.descripcion || it?.nombre))
    .join(" ");
  if (!todo) return "";
  if (/\binox(idable)?\b|\bAISI\b|\b(304|316)\b|\bA4\b/i.test(todo)) return "inoxidable";
  return "galvanizado";
}

/**
 * El objetivo del proyecto: lo contratado, dicho en una linea.
 *
 * Son las descripciones de los sistemas sin el prefijo de facturacion
 * («suministro, transporte e instalacion de»), que en el acta no aporta: lo
 * que se entrega es el punto de anclaje, no el transporte.
 */
export function objetivoDeCotizacion(cotizacion) {
  const nombres = sistemasDeCotizacion(cotizacion)
    .map((s) => normalizarMayusculas(limpiarPrefijoComercial(s.descripcion)))
    .filter(Boolean);
  return [...new Set(nombres)].join(" · ");
}

// ── De la obra: cuando, quien y que se hizo ─────────────────────────────────

/** Primera y ultima fecha en que se trabajo, segun la bitacora y los turnos. */
export function fechasDeTrabajo(obra, horarios = []) {
  const deBitacora = normalizarBitacora(obra?.bitacora).map((r) => r.fecha);
  const deHorarios = (Array.isArray(horarios) ? horarios : [])
    .filter((h) => h?.obraId === obra?.id)
    .map((h) => h?.fecha);
  const fechas = [...deBitacora, ...deHorarios].filter(Boolean).sort();
  return { inicio: fechas[0] || "", fin: fechas[fechas.length - 1] || "" };
}

// Quien coordina las alturas y quien lidera el proyecto se reconocen por su
// cargo en Personal. No son una columna de la obra: la misma persona lidera
// unas obras y en otras va de instalador, y el cargo es lo que hay escrito.
const ES_COORDINADOR = /COORDINAD/i;
const ES_LIDER = /L[IÍ]DER|LIDER|SUPERVISOR|RESIDENTE/i;

/** La gente que estuvo en la obra, repartida en sus tres casillas del acta. */
export function personalDeObra(obra, horarios = [], empleados = []) {
  const deHorarios = (Array.isArray(horarios) ? horarios : [])
    .filter((h) => h?.obraId === obra?.id)
    .map((h) => h?.empleadoId);
  const ids = [...new Set([...(obra?.empleados || []), ...deHorarios].filter(Boolean))];
  const gente = ids
    .map((id) => (Array.isArray(empleados) ? empleados : []).find((e) => e?.id === id))
    .filter(Boolean);

  // Coordinadores pueden ser varios -en una obra grande van dos-, asi que
  // salen todos los que tengan ese cargo, separados por punto medio, que es
  // como se leen tambien los colaboradores en la hoja impresa. El lider de
  // proyecto es uno solo: es quien firma la entrega.
  const coordinadores = gente.filter((e) => ES_COORDINADOR.test(texto(e.cargo)));
  const lider = gente.find((e) => ES_LIDER.test(texto(e.cargo)));
  const mandos = new Set([...coordinadores.map((e) => e.id), lider?.id].filter(Boolean));

  return {
    coordinadorAlturas: coordinadores.map((e) => normalizarNombrePropio(e.nombre)).join(" · "),
    liderProyecto: normalizarNombrePropio(lider?.nombre || ""),
    // Los dos que firman no se repiten en la lista de colaboradores: en el
    // formato de papel van en casillas distintas.
    colaboradores: gente.filter((e) => !mandos.has(e.id)).map((e) => normalizarNombrePropio(e.nombre)),
  };
}

/**
 * Lo que se hizo, segun lo que ya se escribio en la obra.
 *
 * Primero los informes de actividades de esa obra, que es la redaccion que ya
 * reviso quien firma; si no hay, las descripciones de la bitacora, que es de
 * donde sale el informe de todas formas.
 *
 * OJO: fuera de la pantalla de Informes los informes vienen a medias -sus
 * actividades y sus fotos son columnas pesadas y no se traen al arrancar-,
 * asi que lo normal aqui es que el texto salga de la bitacora, que si esta
 * completa. No es un problema: es el mismo trabajo contado igual, y de todos
 * modos se revisa antes de entregar.
 *
 * Sin nada escrito se devuelve vacio y hay que redactarlo: el acta dice lo
 * que de verdad se hizo, y eso no se inventa.
 */
export function descripcionDelTrabajo(obra, informes = []) {
  const deInformes = (Array.isArray(informes) ? informes : [])
    .filter((i) => i?.obraId === obra?.id)
    .flatMap((i) => (Array.isArray(i.actividades) && i.actividades.length
      ? i.actividades
      : [{ descripcion: i.descripcion }]))
    .map((a) => texto(a?.descripcion))
    .filter(Boolean);
  if (deInformes.length) return [...new Set(deInformes)].join("\n\n");

  const deBitacora = normalizarBitacora(obra?.bitacora)
    .map((r) => texto(r.descripcion))
    .filter(Boolean);
  return [...new Set(deBitacora)].join("\n\n");
}

/**
 * Lo que la obra ya sabe de su propia ejecucion, en las casillas del acta.
 *
 * Es lo que el equipo dejo escrito trabajando -quien tuvo turno, que se hizo
 * en cada jornada, que se redacto en los informes-, no algo que haya que
 * volver a elegir a mano en una lista. El acta se crea con esto y se puede
 * volver a traer cuando la obra avanza (boton «Traer de la ejecucion»).
 */
export function datosDeEjecucion({ obra, informes = [], horarios = [], empleados = [] }) {
  return {
    ...personalDeObra(obra, horarios, empleados),
    descripcion: descripcionDelTrabajo(obra, informes),
  };
}

// ── El acta completa ────────────────────────────────────────────────────────

/**
 * El acta de entrega ya diligenciada con lo que el programa sabe.
 *
 * @param {object} fuentes
 * @param {object} fuentes.obra
 * @param {object} [fuentes.cotizacion]  la vinculada a la obra
 * @param {object} [fuentes.cliente]     su ficha del directorio
 * @param {Array}  [fuentes.informes]
 * @param {Array}  [fuentes.horarios]
 * @param {Array}  [fuentes.empleados]
 * @param {Array}  [fuentes.obras]       todas, para numerar el acta
 * @returns {ActaEntrega}
 */
export function construirActa({ obra, cotizacion = null, cliente = null, informes = [], horarios = [], empleados = [], obras = [] }) {
  const fechas = fechasDeTrabajo(obra, horarios);
  const ejecucion = datosDeEjecucion({ obra, informes, horarios, empleados });

  return {
    ...actaVacia(obra?.id),
    id: siguienteIdUnico(todasLasActas(obras), "ACT"),
    // La razon social de la ficha manda sobre lo que se escribio en la obra:
    // el acta la firma el cliente y ahi va su nombre legal completo
    // -«INTECKNO S.A.S», no «INTECKNO»-, que es el que esta en el directorio.
    contratante: normalizarMayusculas(cliente?.nombre || obra?.cliente || ""),
    // El NIT -o la cedula, cuando el contratante es una persona- se busca en
    // los tres sitios donde puede estar escrito. La obra no siempre lo trae:
    // cuando se crea desde la cotizacion aprobada queda en la cotizacion, y
    // cuando el cliente ya estaba en el directorio, en su ficha. Antes solo
    // se miraba la obra y la casilla salia en blanco teniendolo guardado.
    nit: texto(obra?.nit || cliente?.nit || cotizacion?.nit),
    telefono: texto(obra?.tel || cliente?.telefono),
    correoFacturacion: texto(cliente?.email),
    correoAdministrativo: texto(obra?.recibeEmail || cliente?.email),
    contactoAdministrativo: normalizarNombrePropio(obra?.recibeNombre || cliente?.contacto || ""),
    direccionObra: normalizarMayusculas([obra?.proyecto, obra?.direccion, obra?.ciudad].filter(Boolean).join(", ")),
    objetivo: objetivoDeCotizacion(cotizacion),
    fechaInicio: texto(obra?.fechaInicio) || fechas.inicio,
    fechaEntrega: texto(obra?.fechaFin) || fechas.fin || today(),
    sistemas: sistemasDeCotizacion(cotizacion),
    acero: aceroDeCotizacion(cotizacion),
    ...ejecucion,
    recibeNombre: normalizarNombrePropio(obra?.recibeNombre || cliente?.contacto || ""),
    recibeDocumento: texto(obra?.recibeDocumento || cliente?.contactoCedula || cliente?.contacto_cedula || ""),
    recibeCargo: texto(obra?.recibeCargo || cliente?.contactoCargo || cliente?.contacto_cargo || ""),
  };
}

// Lo que no se puede deducir y hay que escribir en la obra. El acta se puede
// imprimir sin ello -a veces se completa a mano delante del cliente-, pero se
// avisa antes, que es lo que hacia falta cuando se llenaba en papel.
const OBLIGATORIOS = [
  ["contratante", "el contratante"],
  ["objetivo", "el objetivo del proyecto"],
  ["areasIntervenidas", "las áreas intervenidas"],
  ["fechaEntrega", "la fecha de entrega"],
  ["descripcion", "la descripción del trabajo realizado"],
  ["liderProyecto", "el líder de proyecto"],
];

/** Los campos del acta que estan en blanco, dichos como se leen en la hoja. */
export function faltantesDelActa(acta) {
  const faltan = OBLIGATORIOS.filter(([campo]) => !texto(acta?.[campo])).map(([, rotulo]) => rotulo);
  if (!acta?.sistemas?.length) faltan.push("los sistemas entregados");
  return faltan;
}
