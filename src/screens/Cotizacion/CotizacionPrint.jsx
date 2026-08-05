import PrintHeader from "../../components/print/PrintHeader";
import StaticMapPreview from "../../components/maps/StaticMapPreview";
import { fmt, fmtL } from "../../lib/format";
import { getQuotePrintableProposals } from "../../lib/cotizaciones";
export default function CotizacionPrint({c}){
  if(!c) return null;
  const propuestas = getQuotePrintableProposals(c);
  const textoInicial = String(c.textoInicial || "").trim();
  const mapQuery = c.coords || `${c.obra||""} ${c.ciudad||""}`.trim();

  return(
    <div
      id="pz"
      className="doc-shell"
      style={{
        width:"216mm",
        minHeight:"279mm",
        maxWidth:"216mm",
        margin:"0 auto",
        background:"#fff",
        color:"#111",
        fontFamily:"'Aptos','Segoe UI',sans-serif",
        fontSize:12,
        lineHeight:1.45,
        border:"1px solid #d6dde6",
        boxShadow:"0 10px 30px rgba(15,23,42,0.08)",
        padding:"14mm 16mm 16mm 16mm",
      }}
    >
      <div style={{marginBottom:14}}><PrintHeader dual={false}/></div>
      <div style={{textAlign:"center",fontSize:10,fontWeight:700,letterSpacing:3,marginBottom:16}}>ESPECIALISTAS EN ANCLAJES</div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,fontSize:12}}><div>Envigado, {fmtL(c.fecha)}</div><div><strong>COTIZACION No. {c.numero}</strong></div></div>
      <div style={{marginBottom:12}}>
        <div><strong>SEÑOR:</strong> {(c.cliente||"").toUpperCase()}</div>
        {c.obra&&<div><strong>OBRA:</strong> {(c.obra||"").toUpperCase()}</div>}
        {c.telefono&&<div><strong>TELÉFONO:</strong> {c.telefono}</div>}
        {c.ciudad&&<div><strong>{(c.ciudad||"").toUpperCase()}</strong></div>}
      </div>
      {textoInicial && (
        <div style={{background:"#fafafa",border:"1px solid #d0d5dd",borderRadius:6,padding:"12px 14px",marginBottom:16}}>
          <div style={{whiteSpace:"pre-wrap"}}>{textoInicial}</div>
        </div>
      )}
      {propuestas.map((propuesta, idx)=>{
        const propMapSrc = propuesta.mapImg || null;
        return (
        <div key={propuesta.id} style={{marginTop:idx===0?0:24,paddingTop:idx===0?0:20,borderTop:idx===0?"none":"2px solid #eaecf0",pageBreakBefore:idx===0?"auto":"always"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:12,marginBottom:4}}>
            <div style={{fontWeight:800,textTransform:"uppercase",fontSize:16,color:"#101828"}}>{propuesta.nombre}</div>
            <div style={{fontWeight:800,color:"#cc0000",fontSize:15}}>{fmt(propuesta.tot)}</div>
          </div>
          <div style={{fontSize:11,color:"#667085",marginBottom:10}}>{propuesta.tipoLabel}</div>

          {propuesta.requerimientoCliente && (
            <div style={{background:"#fafafa",border:"1px solid #d0d5dd",borderRadius:6,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontWeight:800,textTransform:"uppercase",marginBottom:8}}>Necesidad del cliente</div>
              <div style={{whiteSpace:"pre-wrap"}}>{propuesta.requerimientoCliente}</div>
            </div>
          )}

          {propuesta.alcancePropuesta && (
            <div style={{background:"#f2f4f7",border:"1px solid #fdba74",borderRadius:6,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontWeight:800,textTransform:"uppercase",marginBottom:8}}>Alcance de la propuesta</div>
              <div style={{whiteSpace:"pre-wrap"}}>{propuesta.alcancePropuesta}</div>
            </div>
          )}

          {propuesta.fotos.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontWeight:800,textTransform:"uppercase",marginBottom:8}}>Registro fotográfico</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {propuesta.fotos.map((foto,fotoIdx)=>(
                  <div key={foto.id||fotoIdx} style={{border:"1px solid #d0d5dd",borderRadius:6,overflow:"hidden",background:"#fff"}}>
                    <img src={foto.src} alt={foto.label||"Foto " + (fotoIdx+1)} style={{width:"100%",height:"auto",display:"block"}}/>
                    <div style={{padding:"8px 10px",fontSize:11,color:"#475467",textAlign:"center"}}>{foto.label||"Foto " + (fotoIdx+1)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {propMapSrc && (
            <div style={{marginBottom:16,textAlign:"center"}}>
              <div style={{fontWeight:800,textTransform:"uppercase",marginBottom:8,textAlign:"left"}}>Medición satelital</div>
              <StaticMapPreview src={propMapSrc} segments={propuesta.measurements} query={mapQuery} mapView={propuesta.quote.geoMapView||c.geoMapView} alt="Mapa" maxHeight={360} border="1px solid #eaecf0" borderRadius={4} />
            </div>
          )}

          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.3,marginBottom:14}}>
            <thead><tr>{["Descripción","Cantidad","Unidad","Valor","Subtotal"].map((h,i)=><th key={h} style={{border:"1px solid #222",padding:"7px 8px",background:"#f7f7f7",textAlign:i>0?"right":"left"}}>{h}</th>)}</tr></thead>
            <tbody>
              {propuesta.items.map((it,i)=><tr key={i}><td style={{border:"1px solid #222",padding:"7px 8px"}}>{it.desc}</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{it.cant}</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{it.unit}</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{fmt(it.vu)}</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{fmt((Number(it.cant)||0)*(Number(it.vu)||0))}</td></tr>)}
              <tr><td colSpan={4} style={{border:"1px solid #222",padding:"7px 8px",fontWeight:700}}>SUBTOTAL</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right",fontWeight:700}}>{fmt(propuesta.sub)}</td></tr>
              <tr><td colSpan={4} style={{border:"1px solid #222",padding:"7px 8px"}}>UTILIDADES ({propuesta.quote.util||10}% VALOR DE LA OBRA)</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{fmt(propuesta.ut)}</td></tr>
              <tr><td colSpan={4} style={{border:"1px solid #222",padding:"7px 8px"}}>IVA (19% VALOR DE LAS UTILIDADES)</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{fmt(propuesta.iva)}</td></tr>
              <tr><td colSpan={4} style={{border:"1px solid #222",padding:"7px 8px",background:"#fff369",fontWeight:800}}>TOTAL</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right",background:"#fff369",fontWeight:800}}>{fmt(propuesta.tot)}</td></tr>
            </tbody>
          </table>
        </div>
        );
      })}
    </div>
  );
}

// =+
// PLANOS — con medición sobre imagen satelital
// ======================================================

