// Tokens de estilo compartidos por todas las pantallas.
//
// ══ LA PALETA SON TRES DECISIONES ══
//
//   1. NEUTRO   la base, el 90% de la pantalla. Una sola escala de grises.
//   2. TINTA    el color de accion: botones principales, menu activo, titulos.
//   3. ROJO     el acento de marca. Se usa POCO a proposito: un color que sale
//               en todas partes deja de identificar a nadie.
//
// Antes habia 174 tonos distintos y catorce familias peleandose por ser la
// principal -rojo, naranja, azul marino, azul, violeta, dos verdes, amarillo-,
// y tres sistemas de gris conviviendo. El boton principal era naranja, la barra
// azul marino y el logo rojo: ninguno mandaba.
//
// LA REGLA: el color se gana, no se reparte. Si en una pantalla hay dos cosas
// en color, ninguna destaca.
//
// OJO: esto es la interfaz de PANTALLA. Los documentos que se imprimen
// -cotizacion, informe, certificado- tienen su propio estilo y no se tocan
// desde aqui.

// ── 1. Neutro: una escala CALIDA ───────────────────────────────────────────
//
// Beige y crema en vez de gris azulado. Es el mismo numero de colores -no se
// añade ninguno-, pero cambia la temperatura de toda la aplicacion: el fondo
// deja de ser gris frio y el negro deja de ser azulado, que era lo que hacia
// que se viera duro.
//
// Las tarjetas siguen en blanco puro sobre el fondo crema: asi se despegan
// solas y no hace falta cargarlas de sombra.
export const N = {
  tinta:     "#2b2622", // titulos y texto principal · negro calido, no azulado
  grafito:   "#574e44", // texto secundario
  gris:      "#756a5e", // texto de apoyo, rotulos
  claro:     "#a2988a", // texto deshabilitado, marcas de agua
  borde:     "#e8dfd2", // lineas y bordes
  bordeFuerte:"#d9cdbb",// borde de boton de contorno
  superficie:"#f4eee4", // badges neutros, fondos suaves · el beige
  papel:     "#fbf8f3", // fondo de pagina · crema
  blanco:    "#ffffff", // tarjetas
};

// ── 2. Tinta: el color de accion ───────────────────────────────────────────
// Los botones principales van en casi negro, no en naranja. El negro se lee
// como caro; el naranja, como oferta. Ademas deja libre al rojo para que
// signifique algo.
//
// Es un negro CALIDO (#2b2622, con marron dentro) y no un negro azulado: sobre
// un fondo beige, el negro frio se ve como un agujero.
export const ACCION = N.tinta;
export const ACCION_HOVER = "#3e3730";

// ── 3. Rojo Ingeanclajes: el acento de marca ───────────────────────────────
// El del logo. Reservado para la marca y para lo que destruye datos.
export const MARCA = "#cc0000";
export const MARCA_TENUE = "#f9e9e4"; // tenue y calido, para que case con el beige
export const MARCA_BORDE = "#eec7bd";

// Señales de estado. Solo como TEXTO o punto pequeño, nunca como fondo de un
// boton ni de una tarjeta: ahi es donde ensuciaban.
export const OK = "#027a48";
export const AVISO = "#b54708";

export const FONT = "'Inter',system-ui,sans-serif";

export const BRAND = {
  primary: ACCION, primaryTint: N.superficie, primaryDeep: ACCION_HOVER,
  bg: N.papel, surface: N.blanco, surfaceTint: N.superficie,
  text: N.tinta, muted: N.gris, divider: N.borde,
};

// Badges de estado. Neutro por defecto; el color solo donde hay que actuar.
// Antes eran siete combinaciones, con un violeta que no salia en ningun otro
// sitio de la aplicacion.
export const EC = {
  "En Obra":    { bg: N.superficie, text: "#344054" },
  "Cotización": { bg: N.superficie, text: N.gris },
  "Pagado":     { bg: N.superficie, text: "#344054" },
  "Pendiente":  { bg: N.superficie, text: N.gris },
  "Finalizado": { bg: N.superficie, text: N.gris },
  "Vigente":    { bg: N.superficie, text: "#344054" },
  "Vencida":    { bg: MARCA_TENUE,  text: MARCA },
};

// Avatares. Antes rotaban ocho colores -rojo, azul, verde, violeta, naranja,
// rosa, cian, gris- y en una lista de personal salian todos a la vez: es lo que
// mas ensuciaba Horarios y Nomina. Ahora son iniciales grises sobre superficie
// neutra; el array se conserva porque las pantallas indexan por posicion.
export const PAL = Array(8).fill(N.superficie);
export const PAL_TEXTO = "#475467";

// Tipos de linea del plano. Aqui el color SI tiene funcion -distinguir un
// trazo de otro en un dibujo tecnico-, asi que se conservan cuatro, pero
// apagados para que convivan con el resto.
export const TC = { LVH: "#475467", LVV: "#027a48", CON: "#b54708", ESC: MARCA };

export const SI = {
  background: N.blanco, border: `1px solid ${N.borde}`, borderRadius: 10,
  color: N.tinta, padding: "9px 12px", fontSize: 13.5, width: "100%",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

export const B = (bg, c = "#fff") => ({
  background: bg, color: c, border: "none", borderRadius: 10,
  padding: "9px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
  fontFamily: "inherit", whiteSpace: "nowrap",
});

/** Boton secundario: blanco con borde. Sustituye a los rellenos de color. */
export const B2 = () => ({
  ...B(N.blanco, "#344054"), border: `1px solid ${N.bordeFuerte}`,
});

// Una sombra sutil en vez de dos superpuestas: la sombra marcada es de lo que
// mas rapido hace ver "plantilla" un producto.
export const CD = {
  background: N.blanco, border: `1px solid ${N.borde}`, borderRadius: 14,
  padding: 24, boxShadow: "0 1px 2px rgba(16,24,40,.04)",
};

// Peso 600 y no 700: el 700 repartido por la interfaz es la causa de que se
// vea gritada.
export const ST = { fontSize: 15, fontWeight: 600, color: N.tinta, marginBottom: 14 };

export const hasBrokenEncoding = (value="") => /[ðâÃÂŸ]/.test(String(value || ""));
export const buildCardBadge = (icon="", label="") => {
  const iconText = String(icon || "").trim();
  if(iconText && !hasBrokenEncoding(iconText)) return iconText;

  return String(label || "NA")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g,"")
    .split(/\s+/)
    .map((word)=>word.replace(/[^A-Za-z0-9]/g,""))
    .filter(Boolean)
    .slice(0,2)
    .map((word)=>word[0]?.toUpperCase() || "")
    .join("") || "NA";
};
