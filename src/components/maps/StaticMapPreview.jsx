import { getStaticMapDimensions, getStaticMapLabelData } from "../../lib/maps";
export default function StaticMapPreview({ src, segments=[], query="", mapView=null, alt="Mapa automático", maxHeight=null, border="1px solid #eaecf0", borderRadius=8 }){
  if(!src) return null;
  const labels = getStaticMapLabelData(segments, query, mapView);
  const { width, height } = getStaticMapDimensions(mapView);
  return(
    <div style={{position:"relative",width:"100%",aspectRatio:`${width} / ${height}`,maxHeight:maxHeight||undefined,border,borderRadius,overflow:"hidden"}}>
      <img src={src} alt={alt} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"fill",display:"block"}} />
      {labels.map(label=>(
        <div
          key={label.id}
          style={{
            position:"absolute",
            left:label.left,
            top:label.top,
            transform:`translate(-50%, -50%) rotate(${label.angle}deg)`,
            pointerEvents:"none",
            textAlign:"center",
            fontFamily:"Aptos, Segoe UI, Arial, sans-serif",
            fontWeight:800,
            lineHeight:1,
            color:label.color,
            textShadow:"-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0 0 8px rgba(255,255,255,0.96)",
            background:"rgba(255,255,255,0.72)",
            padding:"1px 4px",
            borderRadius:999,
            whiteSpace:"nowrap",
          }}
        >
          <div style={{fontSize:8.5}}>{label.title} · {label.value}</div>
        </div>
      ))}
    </div>
  );
}

