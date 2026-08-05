// Textos fijos del documento de cotizacion.
// Antes estaban escritos dentro de la plantilla de impresion y no habia forma
// de revisarlos ni corregirlos. Ahora cada cotizacion guarda los suyos; si un
// campo queda vacio se usa el valor por defecto de aqui.

export const TEXTOS_DOCUMENTO_DEFAULT = {
  // Titulo grande de la portada. Es editable porque no todas las cotizaciones
  // son de trabajo en alturas: tambien hay certificaciones, mantenimiento de
  // fachadas y obra blanca, y el documento salia diciendo lo mismo siempre.
  //
  // Un renglon por linea: se imprimen tal cual, para poder partir el titulo
  // donde convenga en vez de dejar que caiga solo.
  tituloPortada: ["Sistema de Anclajes Certificado", "para Trabajo en Alturas"].join("\n"),

  // Frase de apertura. El documento le agrega " en la obra X." cuando la
  // cotizacion tiene obra, asi que va SIN punto final.
  saludo:
    "Agradecemos la oportunidad de presentarles nuestra propuesta para el suministro e instalación de sistemas de protección contra caídas para trabajo seguro en alturas",

  // Cuerpo de la carta: quienes somos y que garantiza la propuesta. Salia
  // una sola frase suelta y la carta se veia vacia.
  presentacion: [
    "INGEANCLAJES S.A.S. es una empresa especializada en el diseño, fabricación e instalación de sistemas de protección contra caídas. Cada sistema se entrega certificado bajo la Resolución 4272 de 2021, con los certificados de fábrica de todos los elementos instalados y una recertificación anual sin costo.",
    "Nuestro personal está afiliado a ARL, salud y pensión, cuenta con los elementos de protección personal requeridos, y un coordinador de trabajo seguro en alturas acompaña la obra durante toda la ejecución. Entregamos las pólizas que exija el contratante y respondemos por los daños que puedan ocasionarse durante los trabajos.",
    "Quedamos atentos a cualquier inquietud sobre el alcance, los materiales o las condiciones comerciales de esta propuesta.",
  ].join("\n\n"),

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
  firmaCargo: "Gerente General",
  // Una linea por renglon debajo del cargo.
  firmaDetalle: ["MP. 05256-409949", "Tel. 315 288 9541"].join("\n"),
};

// Devuelve los textos de una cotizacion completados con los valores por
// defecto. Un campo en blanco cuenta como "usar el predeterminado", salvo
// marcoTecnico, donde vacio significa "usar las definiciones automaticas".
// El cargo de la firma estaba mal: figuraba como "Director Comercial" cuando
// quien firma es el gerente general. Las cotizaciones guardadas traen el valor
// viejo, y como no es una decision de cada documento sino un dato de la
// empresa, se corrige al leerlas en vez de dejar el error impreso.
//
// Solo se corrige si firma la misma persona: si algun dia firma un director
// comercial de verdad, su cargo se respeta.
const FIRMA_GERENTE = "ing. jhon jaime sepúlveda londoño";
const CARGO_ANTERIOR = "director comercial";

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

  const firmaEsDelGerente = resultado.firmaNombre.trim().toLowerCase() === FIRMA_GERENTE;
  if (firmaEsDelGerente && resultado.firmaCargo.trim().toLowerCase() === CARGO_ANTERIOR) {
    resultado.firmaCargo = TEXTOS_DOCUMENTO_DEFAULT.firmaCargo;
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
