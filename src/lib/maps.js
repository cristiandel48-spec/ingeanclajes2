// Utilidades de mapas y mediciones.
//
// Ya no hay nada de Google aqui. La medicion y la imagen del documento se hacen
// con mosaicos publicos (ver lib/mapaEstatico.js y components/maps/MedidorMapa):
// no hacen falta ni cuenta, ni clave, ni tarjeta.

export const LEAFLET_CSS_ID = "leaflet-cdn-css";
export const LEAFLET_JS_ID = "leaflet-cdn-js";
let leafletLoaderPromise = null;

export function parseLatLngValue(value){
  const raw=(value||"").trim();
  if(!raw) return null;
  const plain = raw.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if(plain) return {lat:parseFloat(plain[1]), lng:parseFloat(plain[2]), label: raw};
  const atMatch = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|z)/);
  if(atMatch) return {lat:parseFloat(atMatch[1]), lng:parseFloat(atMatch[2]), label: raw};
  const qMatch = raw.match(/[?&]q=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
  if(qMatch) return {lat:parseFloat(qMatch[1]), lng:parseFloat(qMatch[2]), label: raw};
  const llMatch = raw.match(/[?&](?:ll|center)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
  if(llMatch) return {lat:parseFloat(llMatch[1]), lng:parseFloat(llMatch[2]), label: raw};
  return null;
}

export function loadLeafletAssets(){
  if(typeof window === "undefined") return Promise.resolve(null);
  if(window.L) return Promise.resolve(window.L);
  if(leafletLoaderPromise) return leafletLoaderPromise;
  leafletLoaderPromise = new Promise((resolve,reject)=>{
    const finish = ()=> window.L ? resolve(window.L) : reject(new Error("Leaflet no cargó"));
    if(!document.getElementById(LEAFLET_CSS_ID)){
      const link=document.createElement("link");
      link.id=LEAFLET_CSS_ID;
      link.rel="stylesheet";
      link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const existing=document.getElementById(LEAFLET_JS_ID);
    if(existing){
      existing.addEventListener("load", finish, {once:true});
      existing.addEventListener("error", ()=>reject(new Error("No fue posible cargar Leaflet")), {once:true});
      return;
    }
    const script=document.createElement("script");
    script.id=LEAFLET_JS_ID;
    script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async=true;
    script.onload=finish;
    script.onerror=()=>reject(new Error("No fue posible cargar Leaflet"));
    document.body.appendChild(script);
  });
  return leafletLoaderPromise;
}

export function getStaticMapCenter(segments=[], query="", mapView=null){
  if(mapView?.center && Number.isFinite(mapView.center.lat) && Number.isFinite(mapView.center.lng)){
    return {lat:Number(mapView.center.lat), lng:Number(mapView.center.lng)};
  }
  const parsed = parseLatLngValue(query||"");
  if(parsed) return {lat:parsed.lat, lng:parsed.lng};
  const valid = (segments||[]).filter(seg=>seg?.start && seg?.end);
  if(valid.length){
    const total = valid.reduce((acc,seg)=>({
      lat: acc.lat + Number(seg.start.lat||0) + Number(seg.end.lat||0),
      lng: acc.lng + Number(seg.start.lng||0) + Number(seg.end.lng||0),
    }), {lat:0, lng:0});
    return {lat: total.lat/(valid.length*2), lng: total.lng/(valid.length*2)};
  }
  return null;
}

export function latLngToWorldPoint(lat, lng, zoom){
  const siny = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  const scale = 256 * Math.pow(2, zoom);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale,
  };
}

export function latLngToImagePixel(lat, lng, center, zoom, width, height){
  const world = latLngToWorldPoint(lat, lng, zoom);
  const worldCenter = latLngToWorldPoint(center.lat, center.lng, zoom);
  return {
    x: world.x - worldCenter.x + width / 2,
    y: world.y - worldCenter.y + height / 2,
  };
}


export function buildStaticMapLabelData(segments, center, zoom, width, height){
  return (segments || []).map((seg, idx) => {
    if(!seg?.start || !seg?.end) return null;
    const startPx = latLngToImagePixel(Number(seg.start.lat), Number(seg.start.lng), center, zoom, width, height);
    const endPx = latLngToImagePixel(Number(seg.end.lat), Number(seg.end.lng), center, zoom, width, height);
    const dx = endPx.x - startPx.x;
    const dy = endPx.y - startPx.y;
    const x = (startPx.x + endPx.x) / 2;
    const y = (startPx.y + endPx.y) / 2;
    const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const angle = rawAngle > 90 || rawAngle < -90 ? rawAngle + 180 : rawAngle;
    return {
      id: seg.id || `seg-${idx}`,
      x,
      y,
      angle,
      color: seg.tipo === "CON" ? "#EAB308" : seg.tipo === "LVV" ? "#22C55E" : seg.tipo === "ESC" ? "#F97316" : "#2563EB",
      title: String(seg.label || `LINEA ${idx+1}`),
      value: `${Number(seg.ml || 0).toFixed(2)} m`,
    };
  }).filter(Boolean);
}

export function getStaticMapDimensions(mapView=null, options={}){
  return {
    width: Math.min(640, Math.max(320, Math.round(options.width || mapView?.width || 640))),
    height: Math.min(640, Math.max(240, Math.round(options.height || mapView?.height || 420))),
  };
}

export function getStaticMapLabelData(segments=[], query="", mapView=null, options={}){
  const { width, height } = getStaticMapDimensions(mapView, options);
  const center = getStaticMapCenter(segments, query, mapView);
  if(!center) return [];
  const zoom = Number.isFinite(mapView?.zoom) ? Number(mapView.zoom) : (Array.isArray(segments) && segments.length ? 20 : 19);
  return buildStaticMapLabelData(segments, center, zoom, width, height).map(label=>({
    ...label,
    left: `${(label.x / width) * 100}%`,
    top: `${(label.y / height) * 100}%`,
  }));
}

export function measurementTypeLabel(tipo){
  return tipo === "LVV" ? "Línea de vida vertical" : tipo === "CON" ? "Conexión" : tipo === "ESC" ? "Escalera" : tipo === "PAN" ? "Punto de anclaje" : "Línea horizontal";
}

export function measurementUnitFromType(tipo){
  return tipo === "ESC" ? "ML" : "ML";
}


export function buildMeasurementNarrative(list=[]){
  if(!Array.isArray(list) || !list.length) return "";
  return list.map((seg,idx)=>`${seg.label || `LINEA ${idx+1}`} de ${Number(seg.ml||0).toFixed(2)} ${measurementUnitFromType(seg.tipo)}`).join(', ');
}

export function measurementsToQuoteItems(list=[]){
  return (list||[]).map((seg,idx)=>({
    id: Date.now() + idx,
    desc: seg.label || `LÍNEA ${idx+1}`,
    cant: Number(seg.ml||0).toFixed(2),
    unit: measurementUnitFromType(seg.tipo),
    vu: seg.tipo === "LVV" ? 320000 : seg.tipo === "ESC" ? 1200000 : seg.tipo === "CON" ? 280000 : 280000,
  }));
}
