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
  nombra: (n)=> n === 1 ? "un sistema de protección contra caídas" : `${n} sistemas de protección contra caídas`,
  cadaUno: "cada punto de anclaje",
  remate: "se verificó el estado general de todos los componentes",
};

const enMayuscula = (texto)=>String(texto || "").trim().toUpperCase();

/**
 * Arma el parrafo del sistema certificado con los datos del encabezado.
 * Devuelve "" si falta lo minimo para que la frase tenga sentido.
 */
export const construirTextoSistema = ({
  tipo = "Certificación",
  tipoSistema = "",
  cantidad = 0,
  cliente = "",
  direccion = "",
  fecha = "",
  fechaLarga = "",
  // Lo que se anoto en las observaciones del informe de actividades de esa
  // misma obra: "1 linea de vida horizontal de 7 m perimetral". Es la frase que
  // dice QUE se esta certificando, y quien firma necesita verla en el
  // certificado, no ir a buscarla al informe.
  observaciones = "",
} = {})=>{
  const n = Number(cantidad) || 0;
  if(!n || !cliente.trim()) return "";

  const sistema = SISTEMAS[tipoSistema] || SISTEMA_GENERICO;
  const esRecert = tipo === "Recertificación";
  const lugar = direccion.trim()
    ? `en las instalaciones de ${enMayuscula(cliente)}, ubicadas en ${enMayuscula(direccion)}`
    : `en las instalaciones de ${enMayuscula(cliente)}`;
  const cuando = (fechaLarga || fecha) ? ` El ${fechaLarga || fecha}` : " El día de la visita";

  // El alcance va al final y en su propia frase: es lo que se busca de un
  // vistazo cuando hay que comprobar que el certificado cubre lo instalado.
  const alcance = String(observaciones || "").trim();
  const cierre = alcance
    ? ` Alcance certificado: ${alcance.replace(/\.+$/, "")}.`
    : "";

  if(esRecert){
    return (
      `Se realizó la recertificación de ${sistema.nombra(n)} ${lugar}.` +
      `${cuando} se realizaron las correspondientes pruebas de carga o presión, que permiten medir ` +
      `la resistencia de ${sistema.cadaUno} para cumplir con las 5.000 lb requeridas. ` +
      `A cada punto se le realizó su mantenimiento correspondiente y ${sistema.remate}.` +
      cierre
    );
  }

  return (
    `Se realizó la instalación de ${sistema.nombra(n)} ${lugar}.` +
    `${cuando} se realizaron las correspondientes pruebas de carga o presión, que permiten medir ` +
    `la resistencia de ${sistema.cadaUno} para cumplir con las 5.000 lb requeridas. ` +
    `Adicionalmente, ${sistema.remate}.` +
    cierre
  );
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
