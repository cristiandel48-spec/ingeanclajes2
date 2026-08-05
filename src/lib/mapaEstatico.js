import { parseLatLngValue } from "./maps";
// Mapa satelital sin Google: se arma pegando los mosaicos que sirven los
// proveedores libres y se dibujan encima las mediciones.
//
// POR QUE EXISTE: la imagen del mapa que va en la cotizacion se pedia a la
// Static Maps API de Google, que cobra y exige tarjeta. Cuando la facturacion
// del proyecto se cerro, el recuadro del mapa empezo a salir vacio en todos los
// documentos. Esto no depende de ninguna cuenta ni clave: los mosaicos son
// publicos y solo piden que se les cite.
//
// COMO FUNCIONA: un mapa web es una cuadricula de imagenes de 256x256 px. Con
// la latitud, la longitud y el zoom se calcula cuales tocan, se descargan y se
// pintan en un lienzo. Es lo mismo que hace cualquier mapa por dentro.

import { latLngToImagePixel, latLngToWorldPoint } from "./maps";

const LADO_MOSAICO = 256;

// Satelital de Esri: libre citando la fuente. Ojo al orden de la ruta, que va
// {z}/{y}/{x} y no {z}/{x}/{y} como casi todos los demas.
const SATELITE = {
  url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  credito: "Imágenes: Esri, Maxar, Earthstar Geographics",
  zoomMaximo: 19,
};

const CALLES = {
  url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  credito: "© OpenStreetMap",
  zoomMaximo: 19,
};

export const CAPAS = { satelite: SATELITE, calles: CALLES };

/**
 * Distancia entre dos puntos, en metros (formula del semiverseno).
 *
 * Antes la calculaba la libreria de geometria de Google. Es una cuenta de seis
 * lineas y no hacia falta cargar una API entera -ni pagarla- para tenerla.
 */
export function distanciaEnMetros(a, b) {
  if (!a || !b) return 0;
  const RADIO_TIERRA = 6378137;
  const aRad = (g) => (g * Math.PI) / 180;
  const dLat = aRad(Number(b.lat) - Number(a.lat));
  const dLng = aRad(Number(b.lng) - Number(a.lng));
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRad(Number(a.lat))) * Math.cos(aRad(Number(b.lat))) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA * Math.asin(Math.min(1, Math.sqrt(s)));
}

const COLOR_TRAZO = (tipo) =>
  tipo === "CON" ? "#EAB308" : tipo === "LVV" ? "#22C55E" : tipo === "ESC" ? "#F97316" : "#3B82F6";

/** Carga una imagen para poder dibujarla en el lienzo. */
function cargarMosaico(url) {
  return new Promise((listo) => {
    const img = new Image();
    // Sin esto el lienzo queda "manchado" y el navegador prohibe exportarlo:
    // toDataURL lanzaria un error de seguridad y no habria imagen que guardar.
    img.crossOrigin = "anonymous";
    img.onload = () => listo(img);
    // Un mosaico que no llega no puede tumbar el mapa entero: se deja el hueco.
    img.onerror = () => listo(null);
    img.src = url;
  });
}

/**
 * Devuelve una imagen del mapa lista para guardar, en formato dataURL.
 *
 * @param {{lat:number,lng:number}} centro
 * @param {number} zoom
 * @param {number} ancho   en pixeles de pantalla
 * @param {number} alto
 * @param {Array}  segmentos  mediciones a dibujar encima
 * @param {"satelite"|"calles"} capa
 */
export async function componerMapaEstatico({
  centro,
  zoom = 18,
  ancho = 640,
  alto = 420,
  segmentos = [],
  capa = "satelite",
  calidad = 0.82,
} = {}) {
  if (!centro || !Number.isFinite(centro.lat) || !Number.isFinite(centro.lng)) return "";

  const fuente = CAPAS[capa] || SATELITE;
  // Se dibuja al doble de tamaño para que no se vea borroso al imprimir. Pedir
  // un zoom mas es exactamente eso: el doble de detalle.
  const zoomBase = Math.max(1, Math.min(fuente.zoomMaximo, Math.round(zoom)));
  const zoomDibujo = Math.min(fuente.zoomMaximo, zoomBase + 1);
  const escala = Math.pow(2, zoomDibujo - zoomBase);
  const anchoPx = Math.round(ancho * escala);
  const altoPx = Math.round(alto * escala);

  const lienzo = document.createElement("canvas");
  lienzo.width = anchoPx;
  lienzo.height = altoPx;
  const pincel = lienzo.getContext("2d");
  pincel.fillStyle = "#e9e5df";
  pincel.fillRect(0, 0, anchoPx, altoPx);

  // Esquina superior izquierda del recorte, en pixeles del mundo entero.
  const mundoCentro = latLngToWorldPoint(centro.lat, centro.lng, zoomDibujo);
  const x0 = mundoCentro.x - anchoPx / 2;
  const y0 = mundoCentro.y - altoPx / 2;

  const desdeX = Math.floor(x0 / LADO_MOSAICO);
  const desdeY = Math.floor(y0 / LADO_MOSAICO);
  const hastaX = Math.floor((x0 + anchoPx) / LADO_MOSAICO);
  const hastaY = Math.floor((y0 + altoPx) / LADO_MOSAICO);
  const totalMosaicos = Math.pow(2, zoomDibujo);

  const pendientes = [];
  for (let tx = desdeX; tx <= hastaX; tx += 1) {
    for (let ty = desdeY; ty <= hastaY; ty += 1) {
      // Fuera del mundo por arriba o por abajo no hay nada que pedir; a los
      // lados el mapa da la vuelta.
      if (ty < 0 || ty >= totalMosaicos) continue;
      const x = ((tx % totalMosaicos) + totalMosaicos) % totalMosaicos;
      pendientes.push({
        url: fuente.url(zoomDibujo, x, ty),
        izquierda: tx * LADO_MOSAICO - x0,
        arriba: ty * LADO_MOSAICO - y0,
      });
    }
  }

  const imagenes = await Promise.all(pendientes.map((m) => cargarMosaico(m.url)));
  imagenes.forEach((img, i) => {
    if (!img) return;
    pincel.drawImage(img, pendientes[i].izquierda, pendientes[i].arriba, LADO_MOSAICO, LADO_MOSAICO);
  });

  // Las mediciones, encima de la foto.
  const aPixel = (punto) =>
    latLngToImagePixel(Number(punto.lat), Number(punto.lng), centro, zoomDibujo, anchoPx, altoPx);

  (segmentos || []).forEach((seg) => {
    if (!seg?.start || !seg?.end) return;
    const a = aPixel(seg.start);
    const b = aPixel(seg.end);

    // Un reborde blanco debajo: sobre una foto aerea, una linea de color sola
    // se pierde en cuanto pasa por encima de algo claro.
    pincel.lineCap = "round";
    pincel.strokeStyle = "rgba(255,255,255,.85)";
    pincel.lineWidth = 9 * escala;
    pincel.beginPath(); pincel.moveTo(a.x, a.y); pincel.lineTo(b.x, b.y); pincel.stroke();

    pincel.strokeStyle = COLOR_TRAZO(seg.tipo);
    pincel.lineWidth = 5 * escala;
    pincel.beginPath(); pincel.moveTo(a.x, a.y); pincel.lineTo(b.x, b.y); pincel.stroke();

    [a, b].forEach((p) => {
      pincel.beginPath();
      pincel.arc(p.x, p.y, 5 * escala, 0, Math.PI * 2);
      pincel.fillStyle = "#ffffff";
      pincel.fill();
      pincel.lineWidth = 2.5 * escala;
      pincel.strokeStyle = COLOR_TRAZO(seg.tipo);
      pincel.stroke();
    });
  });

  // El credito es obligatorio: los mosaicos son libres, no anonimos.
  const alturaCredito = 18 * escala;
  pincel.fillStyle = "rgba(255,255,255,.82)";
  pincel.fillRect(0, altoPx - alturaCredito, anchoPx, alturaCredito);
  pincel.fillStyle = "#3f3f46";
  pincel.font = `${11 * escala}px system-ui, sans-serif`;
  pincel.textBaseline = "middle";
  pincel.fillText(fuente.credito, 8 * escala, altoPx - alturaCredito / 2);

  // JPEG y no PNG: la imagen se guarda dentro de la cotizacion y en PNG pesa
  // varias veces mas, que es justo lo que ya nos tumbo la base una vez.
  return lienzo.toDataURL("image/jpeg", calidad);
}

/** Genera la imagen del mapa que se guarda con la cotización. */
export async function imagenDelMapa(mediciones = [], mapView = null, consulta = "") {
  const centro = mapView?.center
    || (() => { const p = parseLatLngValue(consulta || ""); return p ? { lat: p.lat, lng: p.lng } : null; })()
    || (() => {
      const validos = (mediciones || []).filter((s) => s?.start && s?.end);
      if (!validos.length) return null;
      const t = validos.reduce((a, s) => ({
        lat: a.lat + Number(s.start.lat) + Number(s.end.lat),
        lng: a.lng + Number(s.start.lng) + Number(s.end.lng),
      }), { lat: 0, lng: 0 });
      return { lat: t.lat / (validos.length * 2), lng: t.lng / (validos.length * 2) };
    })();

  if (!centro) return "";
  return componerMapaEstatico({
    centro,
    zoom: Number.isFinite(mapView?.zoom) ? Number(mapView.zoom) : 18,
    ancho: mapView?.width || 640,
    alto: mapView?.height || 420,
    segmentos: mediciones,
  });
}
