import { B, CD, ST } from "../../styles/tokens";
import { fmt, fmtD } from "../../lib/format";
import { getQuoteActiveProposal } from "../../lib/cotizaciones";
export default function Dashboard({ctx,go}){
  const {obras,cotizaciones}=ctx;
  const saldoPendiente = obras.reduce((sum, obra)=>sum + Number(obra.saldo || 0), 0);
  const recientes = [...cotizaciones].sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||""))).slice(0,4);

  return(
    <div style={{padding:28}}>
      <H1
        title="Dashboard"
        subtitle="Resumen comercial, operativo y financiero de Ingeanclajes"
        action={<div style={{display:"flex",gap:10}}><button style={B("#f47c20")} onClick={()=>go("cotizacion")}>+ Nueva Cotización</button><button style={B("#dbeafe","#1e40af")} onClick={()=>go("clientes")}>Clientes</button></div>}
      />
      <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:18}}>
        <div style={CD}>
          <div style={ST}>Cotizaciones recientes</div>
          <div style={{display:"grid",gap:10}}>
            {recientes.map((cotizacion)=>{
              const activa = getQuoteActiveProposal(cotizacion);
              return(
                <div key={cotizacion.id} style={{border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:11,color:"#64748b"}}>{cotizacion.numero} · {fmtD(cotizacion.fecha)}</div>
                    <div style={{fontSize:16,fontWeight:700,color:"#1a1a2e"}}>{cotizacion.cliente}</div>
                    <div style={{fontSize:12,color:"#475569"}}>{cotizacion.obra}</div>
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{activa.nombre} · {fmt(Number(activa.total || 0))}</div>
                  </div>
                  <button style={{...B("#f1f5f9","#475569"),fontSize:12,padding:"7px 12px"}} onClick={()=>go("cotizacion")}>Abrir módulo</button>
                </div>
              );
            })}
          </div>
        </div>
        <div style={CD}>
          <div style={ST}>Alertas rápidas</div>
          <div style={{display:"grid",gap:12,fontSize:13,color:"#475569"}}>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",marginBottom:4}}>Cobro pendiente</div>
              <div style={{fontSize:24,fontWeight:800,color:Number(saldoPendiente)>0?"#cc0000":"#166534"}}>{fmt(Number(saldoPendiente || 0))}</div>
            </div>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",marginBottom:4}}>Siguiente enfoque</div>
              <div>Usa el módulo de cotizaciones para armar alternativas A/B/C y deja una propuesta activa como base para obra y PDF.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

