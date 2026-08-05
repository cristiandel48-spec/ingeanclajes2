// Elementos y formulario por defecto de certificaciones
import { today } from "../../lib/format";

export const CERT_ELEMENTOS_DEFAULT = [
  "Perno Grado 8 B7 Ø 5/8",
  "Arandela Ø 5/8",
  "Tuerca Ø 5/8",
  "Cable diámetro 5/16\" (8mm) galvanizado",
  "Tensor cable",
  "Soportes laterales e intermedios",
];

export const RECERT_ELEMENTOS_DEFAULT = [
  "Limpieza sistema completo",
  "Verificación ajuste tuercas y pernos",
  "Laca protectora anticorrosiva en todos los puntos",
  "Tensado de cables",
];

export const CERT_ELEMENTOS_BY_SISTEMA = {
  "Líneas de vida horizontales": [
    "Perno Grado 8 B7 Ø 5/8",
    "Arandela Ø 5/8",
    "Tuerca Ø 5/8",
    "Cable diámetro 5/16\" (8mm) galvanizado",
    "Guardacables",
    "Tensor cable",
    "Soportes laterales e intermedios",
  ],
  "Puntos de anclaje": [
    "Perno Grado 8 B7 Ø 5/8",
    "Arandela Ø 5/8",
    "Tuerca Ø 5/8",
    "Punto de anclaje ARTICO acero galvanizado",
    "Epóxico ProAnchor Elite ESP",
  ],
  "Escalera fija": [
    "Peldaños acero galvanizado",
    "Largueros perfil L",
    "Pernos de fijación",
    "Guardacuerpo lateral",
    "Línea de vida vertical integrada",
  ],
  "Línea de vida vertical": [
    "Cable de acero Ø 8mm galvanizado",
    "Absorbedor de caída",
    "Dispositivo deslizante",
    "Anclaje superior e inferior",
    "Tensor y guardacables",
  ],
};

export const getCertDefaultElements = (tipo="Certificación", tipoSistema="", fallback=[])=>{
  if (Array.isArray(fallback) && fallback.length) return [...fallback];
  if (tipo === "Recertificación") return [...RECERT_ELEMENTOS_DEFAULT];
  if (tipoSistema && CERT_ELEMENTOS_BY_SISTEMA[tipoSistema]) return [...CERT_ELEMENTOS_BY_SISTEMA[tipoSistema]];
  return [...CERT_ELEMENTOS_DEFAULT];
};

// ── Texto del sistema certificado ──────────────────────────────────────────
//
// Se escribia a mano, y en la practica se copiaba del certificado anterior:
// quedaban certificaciones que decian "recertificacion", con el cliente y la
// direccion de otra obra. Ahora el parrafo se arma con lo que se elige en el
// encabezado y se puede retocar despues.

// Como se nombra cada sistema y en que se mide.
const SISTEMAS = {
  "Puntos de anclaje": {
    nombra: (n)=> n === 1 ? "un punto de anclaje" : `${n} puntos de anclaje`,
    cadaUno: "cada punto de anclaje",
    remate: "para su acabado final se pintaron con anticorrosivo y se instalaron las placas de identificación correspondientes a cada punto",
  },
  "Líneas de vida horizontales": {
    nombra: (n)=> n === 1 ? "un metro de línea de vida horizontal" : `${n} metros de línea de vida horizontal`,
    cadaUno: "cada anclaje estructural",
    remate: "se tensionó el cable y se verificó el ajuste de todos los soportes laterales e intermedios",
  },
  "Línea de vida vertical": {
    nombra: (n)=> n === 1 ? "un metro de línea de vida vertical" : `${n} metros de línea de vida vertical`,
    cadaUno: "cada anclaje superior e inferior",
    remate: "se verificó el desplazamiento del dispositivo deslizante y el estado del absorbedor de caída",
  },
  "Escalera fija": {
    nombra: (n)=> n === 1 ? "una escalera fija con línea de vida vertical" : `${n} escaleras fijas con línea de vida vertical`,
    cadaUno: "cada punto de fijación",
    remate: "se verificó el ajuste de peldaños, largueros y guardacuerpo lateral",
  },
};

const SISTEMA_GENERICO = {
  // Sin numero -que es lo normal desde que la cantidad no se escribe a mano-
  // se habla del sistema en singular y sin cifra. El detalle exacto ya va en
  // el "Alcance certificado", que sale de la cotizacion.
  nombra: (n)=> !n
    ? "el sistema de protección contra caídas"
    : n === 1 ? "un sistema de protección contra caídas" : `${n} sistemas de protección contra caídas`,
  cadaUno: "cada punto de anclaje",
  remate: "se verificó el estado general de todos los componentes",
};

const enMayuscula = (texto)=>String(texto || "").trim().toUpperCase();


/**
 * Arma el parrafo del sistema certificado con los datos del encabezado.
 * Devuelve "" si falta lo minimo para que la frase tenga sentido.
 */
/**
 * El cuerpo de la frase que certifica.
 *
 * El documento lo envuelve: "CERTIFICA que ___ cumplen a cabalidad con la
 * Resolucion 4272...". Aqui se arma solo lo del medio, con los datos que ya
 * estan en el sistema:
 *
 *   5 puntos de anclaje NACIONALES ARTICO SAFE WORK instalados en EL CUARTO DE
 *   ASCENSORES con NIT: 901204204-0 (SRP CONSTRUCCIONES S.A.S) con DIRECCION:
 *   CALLE 11 SUR #29D 27 TERRAZAS DE SAN MICHEL
 *
 * De donde sale cada parte:
 *   cantidad y descripcion → los items de la cotizacion de la obra
 *   donde se instalo       → las observaciones del informe de actividades
 *   NIT y cliente          → la ficha del cliente o la obra
 *   direccion              → la obra
 *
 * Lo que no haya, simplemente no sale: la frase se arma con lo que hay en vez
 * de dejar huecos o poner "sin datos".
 */
export const construirTextoSistema = ({
  tipo = "Certificación",
  tipoSistema = "",
  cantidad = 0,
  cliente = "",
  nit = "",
  direccion = "",
  fecha = "",
  fechaLarga = "",
  // Lo que se anoto en el informe: donde se instalo.
  observaciones = "",
  // El detalle de los items de la cotizacion: que se instalo.
  detalle = "",
} = {})=>{
  if(!cliente.trim() && !nit.trim()) return "";

  const n = Number(cantidad) || 0;
  const sistema = SISTEMAS[tipoSistema] || SISTEMA_GENERICO;

  // Que se instalo. Manda el detalle de la cotizacion, que trae la marca y la
  // referencia exactas; si no hay, se cae al nombre generico del sistema.
  const que = String(detalle || "").trim()
    ? `${n ? `${n} ` : ""}${String(detalle).trim()}`
    : sistema.nombra(n);

  const partes = [que];

  const donde = String(observaciones || "").trim().replace(/\.+$/, "");
  if(donde) partes.push(`instalados en ${enMayuscula(donde)}`);

  if(String(nit || "").trim()){
    partes.push(`con NIT: ${String(nit).trim()}${cliente.trim() ? ` (${enMayuscula(cliente)})` : ""}`);
  }else if(cliente.trim()){
    partes.push(`de ${enMayuscula(cliente)}`);
  }

  if(String(direccion || "").trim()) partes.push(`con DIRECCION: ${enMayuscula(direccion)}`);

  // `tipo`, `fecha` y `fechaLarga` se siguen aceptando porque el formulario los
  // manda, pero esta redaccion no los usa: la fecha va en el encabezado del
  // documento y el tipo en su titulo.
  void tipo; void fecha; void fechaLarga;

  return partes.join(" ");
};

export const buildCertForm = (overrides={})=>{
  const tipo = overrides.tipo || "Certificación";
  const tipoSistema = overrides.tipoSistema || "";
  return {
    // Antes venia fijo en "OB-001": si esa obra no existia, el desplegable
    // mostraba otra pero se guardaba un id inexistente, y el cliente y la
    // direccion quedaban vacios. Ahora lo define quien abre el formulario.
    obraId: overrides.obraId ?? "",
    tipo,
    tipoSistema,
    numero: "",
    fecha: today(),
    cliente: "",
    nit: "",
    direccion: "",
    sistema: "",
    // Cuantos elementos se certifican: alimenta el parrafo automatico.
    cantidad: "",
    // Mientras nadie retoque el parrafo a mano, se rehace solo al cambiar el
    // encabezado. En cuanto se edita, manda lo escrito.
    sistemaAuto: true,
    normativa: "Resolución 4272 de 2021",
    ingeniero: "ING. JHON JAIME SEPULVEDA LONDOÑO",
    matricula: "MP. 05256-409949",
    proxMant: "",
    elementos: getCertDefaultElements(tipo, tipoSistema, overrides.elementos),
    ...overrides,
  };
};
