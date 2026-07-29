// Textos fijos del documento de cotizacion.
// Antes estaban escritos dentro de la plantilla de impresion y no habia forma
// de revisarlos ni corregirlos. Ahora cada cotizacion guarda los suyos; si un
// campo queda vacio se usa el valor por defecto de aqui.

export const TEXTOS_DOCUMENTO_DEFAULT = {
  saludo:
    "Presentamos la cotización para la instalación de elementos para trabajo seguro en alturas.",

  // Si se deja vacio, el documento arma las definiciones automaticamente
  // segun el tipo de cotizacion (linea de vida, puntos de anclaje, obra blanca).
  marcoTecnico: "",

  sst:
    "INGEANCLAJES S.A.S. se encuentra comprometida con el cumplimiento de las directrices generales para la aplicación de la Resolución 4272 de 2021, garantizando la implementación del Sistema de Gestión de Seguridad y Salud en el Trabajo y manteniendo coherencia con la estrategia organizacional de la empresa, redundando en el mejoramiento de las condiciones de trabajo y calidad de vida de todas las personas, al evitar y minimizar los accidentes de trabajo, enfermedades laborales y fomentar una cultura preventiva y de autocuidado en los diferentes frentes de trabajo.",

  // Un paso por linea.
  proximosPasos: [
    "Confirmar aceptación por el medio de su preferencia.",
    "Pago del anticipo pactado para iniciar fabricación.",
    "Coordinación de visita técnica y cronograma de obra.",
    "Instalación, certificación y entrega de pólizas.",
  ].join("\n"),

  contactoTelefono: "Cel. 315 288 9541",
  contactoEmail: "comercial1ingeanclajes@gmail.com",

  firmaNombre: "Ing. Jhon Jaime Sepúlveda Londoño",
  firmaCargo: "Director Comercial",
  // Una linea por renglon debajo del cargo.
  firmaDetalle: ["MP. 05256-409949", "Tel. 315 288 9541"].join("\n"),
};

// Devuelve los textos de una cotizacion completados con los valores por
// defecto. Un campo en blanco cuenta como "usar el predeterminado", salvo
// marcoTecnico, donde vacio significa "usar las definiciones automaticas".
export function getTextosDocumento(cotizacion = {}) {
  const guardados = cotizacion?.textosDocumento || {};
  const resultado = { ...TEXTOS_DOCUMENTO_DEFAULT };

  for (const clave of Object.keys(TEXTOS_DOCUMENTO_DEFAULT)) {
    const valor = guardados[clave];
    if (typeof valor !== "string") continue;
    if (clave === "marcoTecnico") {
      resultado[clave] = valor;
      continue;
    }
    if (valor.trim()) resultado[clave] = valor;
  }

  return resultado;
}

// Convierte un texto de varias lineas en una lista de items no vacios.
export function lineasDeTexto(texto = "") {
  return String(texto || "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
}
