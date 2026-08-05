// Utilidades de mapas y mediciones (Leaflet + Google Maps)

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

// Clave de Google Maps. Configúrala como VITE_GOOGLE_MAPS_KEY en .env (local) y en Vercel (producción).
// El valor por defecto es TEMPORAL para no romper producción mientras se define la variable;
// restringe la clave por referrer HTTP en Google Cloud Console y rótala (estuvo expuesta en el historial de git).
export const GOOGLE_MAPS_EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "AIzaSyDz60_QWwUzp_uK1czmH5ajxUbfTQB6C6A";

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
      color: seg.tipo === "CON" ? "#EAB308" : seg.tipo === "LVV" ? "#027a48" : seg.tipo === "ESC" ? "#F97316" : "#574e44",
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

export function buildGoogleStaticMapUrl(segments=[], query="", mapView=null, options={}){
  if(!GOOGLE_MAPS_EMBED_KEY) return "";
  const { width, height } = getStaticMapDimensions(mapView, options);
  const center = getStaticMapCenter(segments, query, mapView);
  if(!center) return "";
  const zoom = Number.isFinite(mapView?.zoom) ? Number(mapView.zoom) : (Array.isArray(segments) && segments.length ? 20 : 19);
  const base = "https://maps.googleapis.com/maps/api/staticmap";
  const params = new URLSearchParams();
  params.set("size", `${width}x${height}`);
  params.set("scale", "2");
  params.set("maptype", "satellite");
  params.set("format", "png");
  params.set("key", GOOGLE_MAPS_EMBED_KEY);
  params.set("center", `${center.lat},${center.lng}`);
  params.set("zoom", String(zoom));
  if(!Array.isArray(segments) || !segments.length) return `${base}?${params.toString()}`;
  (segments||[]).forEach((seg)=>{
    if(!seg?.start || !seg?.end) return;
    const color = seg.tipo === "CON" ? "0xEAB308FF" : seg.tipo === "LVV" ? "0x22C55EFF" : seg.tipo === "ESC" ? "0xF97316FF" : "0x3B82F6FF";
    const weight = seg.tipo === "CON" ? 4 : 5;
    params.append("path", `color:${color}|weight:${weight}|${Number(seg.start.lat)},${Number(seg.start.lng)}|${Number(seg.end.lat)},${Number(seg.end.lng)}`);
  });
  return `${base}?${params.toString()}`;
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

let googleMapsJsPromise = null;
export function loadGoogleMapsJsApi(){
  if(typeof window === "undefined") return Promise.reject(new Error("Google Maps solo está disponible en el navegador."));
  if(window.google?.maps) return Promise.resolve(window.google.maps);
  if(googleMapsJsPromise) return googleMapsJsPromise;
  googleMapsJsPromise = new Promise((resolve,reject)=>{
    const existing = document.getElementById("gmaps-js-api");
    const finish = ()=> window.google?.maps ? resolve(window.google.maps) : reject(new Error("Google Maps no cargó correctamente."));
    if(existing){
      existing.addEventListener("load", finish, {once:true});
      existing.addEventListener("error", ()=>reject(new Error("No fue posible cargar Google Maps.")), {once:true});
      return;
    }
    const script = document.createElement("script");
    script.id = "gmaps-js-api";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_EMBED_KEY)}&libraries=geometry&v=weekly`;
    script.onload = finish;
    script.onerror = ()=>reject(new Error("No fue posible cargar Google Maps."));
    document.body.appendChild(script);
  });
  return googleMapsJsPromise;
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

export function createMapLabelOverlay(gm, map, startPos, endPos, labelText, color){
  class SegmentLabelOverlay extends gm.OverlayView {
    constructor(){
      super();
      this.div = null;
    }
    onAdd(){
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.transform = "translate(-50%, -50%)";
      div.style.pointerEvents = "none";
      div.style.fontFamily = "Aptos, Segoe UI, Arial, sans-serif";
      div.style.fontSize = "14px";
      div.style.fontWeight = "700";
      div.style.lineHeight = "1.15";
      div.style.textAlign = "center";
      div.style.color = color;
      div.style.whiteSpace = "nowrap";
      div.style.textShadow = "-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0 0 8px rgba(255,255,255,0.95)";
      div.innerHTML = labelText;
      this.div = div;
      this.getPanes().overlayMouseTarget.appendChild(div);
    }
    draw(){
      if(!this.div) return;
      const projection = this.getProjection();
      if(!projection) return;
      const s = projection.fromLatLngToDivPixel(startPos);
      const e = projection.fromLatLngToDivPixel(endPos);
      if(!s || !e) return;
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const len = Math.max(Math.hypot(dx, dy), 1);
      const normalX = -dy / len;
      const normalY = dx / len;
      const offset = 22;
      const x = ((s.x + e.x) / 2) + (normalX * offset);
      const y = ((s.y + e.y) / 2) + (normalY * offset);
      this.div.style.left = `${x}px`;
      this.div.style.top = `${y}px`;
    }
    onRemove(){
      if(this.div?.parentNode) this.div.parentNode.removeChild(this.div);
      this.div = null;
    }
  }
  const overlay = new SegmentLabelOverlay();
  overlay.setMap(map);
  return overlay;
}

