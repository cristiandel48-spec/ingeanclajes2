// Arma el estimado que se manda por WhatsApp cuando el modo es «preliminar».
//
// Se apoya en lo que ya existe: el interprete es la funcion «armar-cotizacion»
// -la misma que usa el boton de dictar-, asi que las instrucciones de la IA
// viven en un solo sitio. Aqui solo se cruza lo que devolvio contra el
// catalogo de la base y se arma el mensaje.
//
// LA REGLA DE SIEMPRE: la descripcion, la unidad y el precio salen del
// CATALOGO, nunca del modelo. Lo que la IA aporta es la cantidad y saber de
// que servicio se esta hablando.

export type ItemCatalogo = {
  id: string;
  descripcion: string;
  unidad: string;
  precio_base: number;
};

export type LineaEstimado = {
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio: number;
  total: number;
};

// El catalogo esta escrito sin tildes ("LINEA DE VIDA HORIZONTAL") y la IA
// responde con la ortografia correcta. Comparando letra a letra no coincidian.
const sinTildes = (texto: string) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const VACIAS = new Set(["DE", "DEL", "LA", "EL", "LOS", "LAS", "EN", "Y", "CON", "A", "PARA"]);
const palabras = (texto: string) => sinTildes(texto).split(" ").filter((p) => p && !VACIAS.has(p));

// La gente pide en plural -«cuatro puntos de anclaje epoxicos»- y el catalogo
// esta en singular -«PUNTO DE ANCLAJE EPOXICO»-. Comparando palabras enteras
// no coincidia ni una y el servicio se descartaba entero.
//
// Basta con que una empiece por la otra, exigiendo cuatro letras para no
// emparejar por casualidad palabras cortas que solo comparten el principio.
const MISMA_RAIZ = 4;
const coincide = (a: string, b: string) =>
  a === b ||
  (a.length >= MISMA_RAIZ && b.startsWith(a)) ||
  (b.length >= MISMA_RAIZ && a.startsWith(b));

// Mismo emparejamiento que hace la pantalla en src/lib/asistenteCotizacion.js.
// Esta repetido porque aquello corre en el navegador y esto en Deno; si se
// cambia uno hay que cambiar el otro.
export function buscarEnCatalogo(desc: string, catalogo: ItemCatalogo[]) {
  const buscado = sinTildes(desc);
  if (!buscado) return null;

  const exacto = catalogo.find((item) => sinTildes(item.descripcion) === buscado);
  if (exacto) return exacto;

  // Se queda el del catalogo cuyas palabras esten todas en lo que se pidio, y
  // entre esos el mas especifico. "linea de vida horizontal en cubierta"
  // encuentra "LINEA DE VIDA HORIZONTAL", y "linea de vida" a secas no
  // encuentra ninguna de las dos: no se adivina si es horizontal o vertical.
  const pedidas = palabras(desc);
  const candidatos = catalogo
    .map((item) => ({ item, suyas: palabras(item.descripcion) }))
    .filter(({ suyas }) => suyas.length && suyas.every((p) => pedidas.some((q) => coincide(p, q))))
    .sort((a, b) => b.suyas.length - a.suyas.length);

  return candidatos[0]?.item ?? null;
}

// Los mismos numeros que el documento impreso: utilidad sobre el subtotal, e
// IVA solo sobre la utilidad. (src/lib/cotizaciones.js)
export const UTILIDAD_PCT = 10;

export function calcularTotales(lineas: LineaEstimado[], utilidadPct = UTILIDAD_PCT) {
  const subtotal = lineas.reduce((suma, l) => suma + l.total, 0);
  const utilidad = subtotal * (utilidadPct / 100);
  const iva = utilidad * 0.19;
  return {
    subtotal: Math.round(subtotal),
    utilidad: Math.round(utilidad),
    iva: Math.round(iva),
    total: Math.round(subtotal + utilidad + iva),
  };
}

// 33600000 -> "$ 33.600.000"
export const pesos = (valor: number) =>
  "$ " + Math.round(valor).toLocaleString("es-CO", { maximumFractionDigits: 0 });

/**
 * Cruza lo que entendio la IA con el catalogo.
 * Devuelve las lineas que si se pueden cotizar y las que no, por separado.
 */
export function armarLineas(
  items: Array<{ desc?: string; cant?: number }>,
  catalogo: ItemCatalogo[],
) {
  const lineas: LineaEstimado[] = [];
  const fuera: string[] = [];

  for (const item of items ?? []) {
    const real = buscarEnCatalogo(String(item?.desc ?? ""), catalogo);
    if (!real) {
      if (item?.desc) fuera.push(String(item.desc));
      continue;
    }
    const cantidad = Number(item?.cant) > 0 ? Number(item.cant) : 1;
    const precio = Number(real.precio_base) || 0;
    lineas.push({
      descripcion: real.descripcion,
      unidad: real.unidad,
      cantidad,
      precio,
      total: cantidad * precio,
    });
  }

  return { lineas, fuera };
}

/** El mensaje tal como lo va a leer el cliente en su telefono. */
export function redactarEstimado(opciones: {
  saludo: string;
  nombre: string | null;
  lineas: LineaEstimado[];
  fuera: string[];
  telefonoEmpresa: string;
}) {
  const { saludo, nombre, lineas, fuera, telefonoEmpresa } = opciones;
  const totales = calcularTotales(lineas);
  const quien = nombre ? `, ${nombre}` : "";

  const partes: string[] = [
    `${saludo}${quien} 👋`,
    "",
    "Recibimos su solicitud. Este es un estimado con nuestros precios de lista:",
    "",
  ];

  for (const linea of lineas) {
    partes.push(`*${linea.descripcion}*`);
    partes.push(`${linea.cantidad} ${linea.unidad} × ${pesos(linea.precio)} = ${pesos(linea.total)}`);
  }

  partes.push(
    "",
    `Subtotal: ${pesos(totales.subtotal)}`,
    `Utilidad (${UTILIDAD_PCT}%): ${pesos(totales.utilidad)}`,
    `IVA (19% sobre la utilidad): ${pesos(totales.iva)}`,
    `*TOTAL: ${pesos(totales.total)}*`,
    "",
    "Incluye transporte de materiales y personal, certificados de fábrica y recertificación gratis al año siguiente.",
  );

  if (fuera.length) {
    partes.push(
      "",
      `Sobre ${fuera.map((f) => `«${f}»`).join(" y ")}: eso lo revisa un asesor y se lo confirma aparte.`,
    );
  }

  partes.push(
    "",
    "⚠️ Son valores preliminares, sujetos a visita técnica. La cotización en firme la confirma un asesor.",
    "",
    "¿Quiere que agendemos la visita? Responda SÍ y lo llamamos hoy mismo.",
    "",
    `Ingeanclajes S.A.S · ${telefonoEmpresa}`,
  );

  return partes.join("\n");
}
