import { useEffect, useRef, useState } from "react";
import { B, SI, ST } from "../../styles/tokens";
import { GOOGLE_MAPS_EMBED_KEY, createMapLabelOverlay, loadGoogleMapsJsApi, parseLatLngValue } from "../../lib/maps";
import { escapeXml } from "../../lib/html";
export default function GoogleMeasureWorkspace({ queryValue, onQueryChange, measurements, onChange, mapView, onMapViewChange }){
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const googleRef = useRef(null);
  const geocoderRef = useRef(null);
  const overlayRef = useRef([]);
  const tempMarkersRef = useRef([]);
  const mapClickRef = useRef(null);
  const idleListenerRef = useRef(null);
  const [status,setStatus] = useState("idle");
  const [error,setError] = useState("");
  const [measureMode,setMeasureMode] = useState(false);
  const [draft,setDraft] = useState(null);
  const [zoom,setZoom] = useState(20);

  const captureMapView = ()=>{
    if(!mapRef.current) return null;
    const center = mapRef.current.getCenter && mapRef.current.getCenter();
    if(!center) return null;
    const next = {
      center: { lat: center.lat(), lng: center.lng() },
      zoom: mapRef.current.getZoom ? mapRef.current.getZoom() : (mapView?.zoom || zoom),
      width: Math.min(640, Math.max(320, Math.round(mapNodeRef.current?.clientWidth || mapView?.width || 640))),
      height: Math.min(640, Math.max(240, Math.round(mapNodeRef.current?.clientHeight || mapView?.height || 420))),
    };
    onMapViewChange && onMapViewChange(next);
    return next;
  };

  const clearTemp = ()=>{
    tempMarkersRef.current.forEach(m=>m && m.setMap && m.setMap(null));
    tempMarkersRef.current = [];
    if(mapClickRef.current){
      googleRef.current?.maps.event.removeListener(mapClickRef.current);
      mapClickRef.current = null;
    }
  };

  const clearOverlays = ()=>{
    overlayRef.current.forEach(group=>{
      group.start?.setMap(null);
      group.end?.setMap(null);
      group.line?.setMap(null);
      group.label?.setMap(null);
    });
    overlayRef.current = [];
  };

  const computeMeters = (a,b)=>{
    if(!googleRef.current?.maps?.geometry?.spherical) return 0;
    return googleRef.current.maps.geometry.spherical.computeDistanceBetween(a,b);
  };

  const redraw = ()=>{
    if(!mapRef.current || !googleRef.current?.maps) return;
    clearOverlays();
    const gm = googleRef.current.maps;
    (measurements||[]).forEach(seg=>{
      const startPos = new gm.LatLng(seg.start.lat, seg.start.lng);
      const endPos = new gm.LatLng(seg.end.lat, seg.end.lng);
      const line = new gm.Polyline({
        map: mapRef.current,
        path: [startPos, endPos],
        geodesic: true,
        strokeColor: seg.tipo === "CON" ? "#eab308" : seg.tipo === "LVV" ? "#22c55e" : seg.tipo === "ESC" ? "#f97316" : "#3b82f6",
        strokeOpacity: 0.95,
        strokeWeight: 4,
      });
      const start = new gm.Marker({ map: mapRef.current, position: startPos, draggable: true });
      const end = new gm.Marker({ map: mapRef.current, position: endPos, draggable: true });
      const labelHtml = `${escapeXml(seg.label || "Tramo")}<br/>${Number(seg.ml||0).toFixed(2)} m`;
      const label = createMapLabelOverlay(gm, mapRef.current, startPos, endPos, labelHtml, seg.tipo === "CON" ? "#a16207" : seg.tipo === "LVV" ? "#15803d" : seg.tipo === "ESC" ? "#c2410c" : "#1d4ed8");
      const sync = ()=>{
        const s = start.getPosition();
        const e = end.getPosition();
        line.setPath([s,e]);
        const next = (measurements||[]).map(item=> item.id===seg.id ? ({
          ...item,
          start: {lat:s.lat(), lng:s.lng()},
          end: {lat:e.lat(), lng:e.lng()},
          ml: Number(computeMeters(s,e).toFixed(2)),
        }) : item);
        onChange(next);
      };
      start.addListener("dragend", sync);
      end.addListener("dragend", sync);
      overlayRef.current.push({start,end,line,label});
    });
  };

  const centerMap = async ()=>{
    if(!mapRef.current || !googleRef.current?.maps) return;
    const raw = (queryValue||"").trim();
    if(!raw) return;
    setStatus("loading");
    setError("");
    try{
      const parsed = parseLatLngValue(raw);
      if(parsed){
        mapRef.current.setCenter({lat: parsed.lat, lng: parsed.lng});
        mapRef.current.setZoom(mapView?.zoom || zoom);
      }else{
        const geocoder = geocoderRef.current || new googleRef.current.maps.Geocoder();
        geocoderRef.current = geocoder;
        const result = await geocoder.geocode({ address: raw });
        const first = Array.isArray(result?.results) ? result.results[0] : result?.results?.[0];
        if(!first?.geometry?.location) throw new Error("No encontré esa ubicación en Google Maps.");
        mapRef.current.setCenter(first.geometry.location);
        mapRef.current.setZoom(mapView?.zoom || zoom);
      }
      captureMapView();
      setStatus("ready");
    }catch(err){
      setStatus("error");
      setError(err?.message || "No fue posible centrar el mapa.");
    }
  };

  useEffect(()=>{
    let mounted = true;
    (async()=>{
      if(!GOOGLE_MAPS_EMBED_KEY){
        setStatus("error");
        setError("La API key de Google Maps no está configurada en este archivo.");
        return;
      }
      setStatus("loading");
      try{
        const maps = await loadGoogleMapsJsApi();
        if(!mounted || !mapNodeRef.current) return;
        googleRef.current = window.google;
        if(!mapRef.current){
          const fallback = mapView?.center || parseLatLngValue(queryValue || "") || {lat:6.2442,lng:-75.5812};
          mapRef.current = new maps.Map(mapNodeRef.current, {
            center: {lat: fallback.lat, lng: fallback.lng},
            zoom: mapView?.zoom || zoom,
            mapTypeId: "satellite",
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            gestureHandling: "greedy",
          });
        }
        if(idleListenerRef.current){ maps.event.removeListener(idleListenerRef.current); }
        idleListenerRef.current = mapRef.current.addListener("idle", ()=>{ captureMapView(); redraw(); });
        captureMapView();
        setStatus("ready");
      }catch(err){
        if(mounted){
          setStatus("error");
          setError(err?.message || "No fue posible cargar Google Maps.");
        }
      }
    })();
    return ()=>{ mounted = false; clearTemp(); clearOverlays(); if(idleListenerRef.current && googleRef.current?.maps){ googleRef.current.maps.event.removeListener(idleListenerRef.current); idleListenerRef.current = null; } };
  }, []);

  useEffect(()=>{ redraw(); }, [JSON.stringify(measurements||[])]);
  useEffect(()=>{ if(mapRef.current){ mapRef.current.setZoom(zoom); captureMapView(); } }, [zoom]);

  const startMeasurement = ()=>{
    if(!mapRef.current || !googleRef.current?.maps) return;
    clearTemp();
    setDraft(null);
    captureMapView();
    setMeasureMode(true);
    let first = null;
    mapClickRef.current = mapRef.current.addListener("click", (ev)=>{
      const gm = googleRef.current.maps;
      if(!first){
        first = ev.latLng;
        const mk = new gm.Marker({ map: mapRef.current, position: first });
        tempMarkersRef.current = [mk];
        return;
      }
      const second = ev.latLng;
      const mk2 = new gm.Marker({ map: mapRef.current, position: second });
      tempMarkersRef.current.push(mk2);
      captureMapView();
      setDraft({
        start: {lat:first.lat(), lng:first.lng()},
        end: {lat:second.lat(), lng:second.lng()},
        ml: Number(computeMeters(first, second).toFixed(2)),
        label: "",
        tipo: "LVH",
      });
      setMeasureMode(false);
      if(mapClickRef.current){
        googleRef.current.maps.event.removeListener(mapClickRef.current);
        mapClickRef.current = null;
      }
    });
  };

  const confirmDraft = ()=>{
    if(!draft?.label) return;
    const next = [...(measurements||[]), { ...draft, id: `gm-${Date.now()}` }];
    clearTemp();
    setDraft(null);
    onChange(next);
  };

  const removeMeasurement = (id)=> onChange((measurements||[]).filter(seg=>seg.id!==id));

  return (
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:20}}>
      <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:16,alignItems:"start",marginBottom:12}}>
        <div>
          <div style={ST}>Medición automática con Google Maps</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,marginBottom:10}}>
            <input value={queryValue} onChange={e=>onQueryChange(e.target.value)} placeholder="Coordenadas, dirección o enlace de Maps" style={SI} />
            <button onClick={centerMap} style={{...B("#f47c20"),fontSize:12}}>Ver aquí</button>
            <button onClick={startMeasurement} style={{...B(measureMode?"#4ade80":"#1a3050", measureMode?"#0f2d1a":"#60b4ff"),fontSize:12}}>{measureMode?"Esperando clics...":"Activar medición"}</button>
          </div>
          <div style={{fontSize:11,color:"#64748b",lineHeight:1.6}}>Haz clic en dos puntos del mapa y el sistema calcula la distancia real automáticamente en metros. Luego solo nombras el tramo y su tipo.</div>
        </div>
        <div style={{background:"#f8fafc",borderRadius:10,padding:"12px 14px",border:"1px solid #e2e8f0"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#1a1a2e",marginBottom:8}}>Estado</div>
          <div style={{fontSize:11,color: status==="error" ? "#991b1b" : "#475569",lineHeight:1.7}}>
            <div>• API: <strong>{GOOGLE_MAPS_EMBED_KEY ? "configurada" : "sin configurar"}</strong></div>
            <div>• Mapa: <strong>{status}</strong></div>
            <div>• Tramos: <strong>{(measurements||[]).length}</strong></div>
            {error && <div style={{color:"#991b1b"}}>• {error}</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:8}}>
            <button onClick={()=>setZoom(z=>Math.min(21,z+1))} style={{...B("#e0f2fe","#0369a1"),justifyContent:"center",fontSize:12,padding:"8px 0"}}>+</button>
            <button onClick={()=>setZoom(z=>Math.max(16,z-1))} style={{...B("#e0f2fe","#0369a1"),justifyContent:"center",fontSize:12,padding:"8px 0"}}>-</button>
          </div>
        </div>
      </div>

      <div ref={mapNodeRef} style={{height:420,borderRadius:12,overflow:"hidden",border:`2px solid ${measureMode?"#f47c20":"#e2e8f0"}`,marginBottom:12}} />

      {draft && (
        <div style={{background:"#fffbeb",border:"2px solid #f5c842",borderRadius:10,padding:16,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:"#b45309",marginBottom:12}}>Tramo detectado automáticamente</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:10,alignItems:"end"}}>
            <div><LBL>Metros calculados</LBL><input value={draft.ml} readOnly style={{...SI,background:"#fff7ed",fontWeight:700,color:"#c2410c"}} /></div>
            <div><LBL>Etiqueta</LBL><input value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})} placeholder="Ej: Cubierta norte" style={SI} /></div>
            <div><LBL>Tipo</LBL><select value={draft.tipo} onChange={e=>setDraft({...draft,tipo:e.target.value})} style={SI}>{[["LVH","Línea horizontal"],["LVV","Línea vertical"],["CON","Conexión"],["ESC","Escalera"],["PAN","Punto de anclaje"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={confirmDraft} style={B("#4ade80","#0f2d1a")}>Agregar</button>
              <button onClick={()=>{clearTemp(); setDraft(null);}} style={B("#fee2e2","#ef4444")}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {(measurements||[]).length>0 && (
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600,color:"#475569",marginBottom:8}}>Tramos medidos:</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {(measurements||[]).map(seg=>(
              <div key={seg.id} style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,border:"1px solid #e2e8f0"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#1a1a2e"}}>{seg.label}</div>
                  <div style={{fontSize:10,color:"#64748b"}}>{seg.tipo} · {Number(seg.ml||0).toFixed(2)} m</div>
                </div>
                <button onClick={()=>removeMeasurement(seg.id)} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:11}}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ======================================================
// COTIZACION
// ======================================================


// ======================================================
// APP ROOT
// ======================================================

