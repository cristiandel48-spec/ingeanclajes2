import Badge from "../../components/ui/Badge";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import SC from "../../components/ui/SC";
import { useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmt, fmtK } from "../../lib/format";
import { printCurrentPz } from "../../lib/print";
export default function Financiero({ctx}){
  const {obras,cuentas,empleados}=ctx;
  const [obraFiltro,setObraFiltro]=useState("todas");
  const nomMes=empleados.filter(e=>e.activo).reduce((s,e)=>s+e.salario+200000,0);

  const obrasData=obras.map(o=>{
    const ingresos=o.total;
    const cobrado=o.pagado;
    const costosDir=cuentas.filter(c=>c.obraId===o.id).reduce((s,c)=>s+c.monto,0);
    const utilBruta=ingresos-costosDir;
    const margenBruto=ingresos>0?Math.round(utilBruta/ingresos*100):0;
    return{...o,ingresos,cobrado,costosDir,utilBruta,margenBruto};
  });

  const sel=obraFiltro==="todas"?obrasData:obrasData.filter(o=>o.id===obraFiltro);
  const totIng=sel.reduce((s,o)=>s+o.ingresos,0);
  const totCob=sel.reduce((s,o)=>s+o.cobrado,0);
  const totCost=sel.reduce((s,o)=>s+o.costosDir,0);
  const totUtil=totIng-totCost;
  const margenGlobal=totIng>0?Math.round(totUtil/totIng*100):0;

  return(
    <div style={{padding:28}}>
      <H1 title="Informe Financiero" subtitle="Rentabilidad, costos e ingresos por obra"/>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:24}}>
        <div><LBL>Filtrar por obra</LBL>
          <select value={obraFiltro} onChange={e=>setObraFiltro(e.target.value)} style={{...SI,width:"auto"}}>
            <option value="todas">Todas las obras</option>
            {obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}
          </select>
        </div>
        <button style={{...B("#f47c20"),marginTop:16}} onClick={()=>printCurrentPz("Informe financiero " + (obraFiltro))}>🖨️ Imprimir informe</button>
      </div>

      <div id="pz" className="doc-shell">
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
          <SC label="Ingresos totales" value={fmtK(totIng)} color="#4ade80" icon="💰" sub="facturado"/>
          <SC label="Cobrado" value={fmtK(totCob)} color="#60b4ff" icon="✅" sub={(totIng>0?Math.round(totCob/totIng*100):0) + "% del total"}/>
          <SC label="Costos directos" value={fmtK(totCost)} color="#fb923c" icon="🧾" sub="proveedores"/>
          <SC label="Margen bruto" value={(margenGlobal) + "%"} color={margenGlobal>25?"#4ade80":margenGlobal>10?"#f5c842":"#ef4444"} icon="📊" sub={fmt(totUtil)}/>
        </div>

        <div style={{...CD,marginBottom:20}}>
          <div style={ST}>Detalle financiero por obra</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f1f5f9"}}>{["Obra","Cliente","Ingresos","Cobrado","Saldo","Costos Dir.","Util. Bruta","Margen %","Estado"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:["Ingresos","Cobrado","Saldo","Costos Dir.","Util. Bruta","Margen %"].includes(h)?"right":"left",color:"#64748b",fontWeight:500,fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {sel.map((o,i)=>(
                <tr key={o.id} style={{borderBottom:"1px solid #e2e8f0",background:i%2===0?"#ffffff":"#f8fafc"}}>
                  <td style={{padding:"10px 12px",color:"#60b4ff",fontSize:11}}>{o.id}</td>
                  <td style={{padding:"10px 12px",fontSize:12,fontWeight:500}}>{o.cliente}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:"#4ade80",fontWeight:600}}>{fmt(o.ingresos)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:"#60b4ff"}}>{fmt(o.cobrado)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:o.saldo>0?"#fb923c":"#4ade80"}}>{fmt(o.saldo)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:"#fb923c"}}>{fmt(o.costosDir)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:o.utilBruta>0?"#4ade80":"#ef4444"}}>{fmt(o.utilBruta)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right"}}>
                    <span style={{fontWeight:700,color:o.margenBruto>25?"#4ade80":o.margenBruto>10?"#f5c842":"#ef4444"}}>{o.margenBruto}%</span>
                  </td>
                  <td style={{padding:"10px 12px"}}><Badge estado={o.estado}/></td>
                </tr>
              ))}
              <tr style={{background:"#f1f5f9",fontWeight:700}}>
                <td colSpan={2} style={{padding:"10px 12px",color:"#cc0000"}}>TOTALES</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:"#4ade80"}}>{fmt(totIng)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:"#60b4ff"}}>{fmt(totCob)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:totIng-totCob>0?"#fb923c":"#4ade80"}}>{fmt(totIng-totCob)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:"#fb923c"}}>{fmt(totCost)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:totUtil>0?"#4ade80":"#ef4444"}}>{fmt(totUtil)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:margenGlobal>25?"#4ade80":margenGlobal>10?"#f5c842":"#ef4444"}}>{margenGlobal}%</td>
                <td/>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
          <div style={CD}>
            <div style={ST}>Rentabilidad por obra</div>
            {sel.map(o=>(
              <div key={o.id} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                  <span style={{color:"#1a1a2e",fontWeight:500}}>{o.cliente}</span>
                  <span style={{color:o.margenBruto>25?"#4ade80":o.margenBruto>10?"#f5c842":"#ef4444",fontWeight:700}}>{o.margenBruto}%</span>
                </div>
                <div style={{height:8,background:"#e2e8f0",borderRadius:4}}>
                  <div style={{width:(Math.max(0,Math.min(100,o.margenBruto))) + "%",height:"100%",background:o.margenBruto>25?"#4ade80":o.margenBruto>10?"#f5c842":"#ef4444",borderRadius:4}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b",marginTop:3}}>
                  <span>Ingreso: {fmt(o.ingresos)}</span><span>Costo: {fmt(o.costosDir)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={CD}>
            <div style={ST}>Estructura de costos</div>
            <div style={{marginBottom:14}}>
              {[["Costos proveedores",totCost,"#fb923c"],["Nómina mensual estimada",nomMes,"#c084fc"],["Saldo pendiente cobrar",totIng-totCob,"#f5c842"],["Utilidad bruta estimada",totUtil,"#4ade80"]].map(([k,v,c])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #e2e8f0",fontSize:13}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:2,background:c,flexShrink:0}}/><span style={{color:"#475569"}}>{k}</span></div>
                  <span style={{fontWeight:700,color:c}}>{fmt(v)}</span>
                </div>
              ))}
            </div>
            <div style={{background:"#f1f5f9",borderRadius:8,padding:"12px 14px",fontSize:12,color:"#64748b",lineHeight:1.7}}>
              <div style={{fontWeight:600,color:"#1a1a2e",marginBottom:6}}>Indicadores clave</div>
              <div>💰 Margen bruto global: <strong style={{color:margenGlobal>25?"#4ade80":"#f5c842"}}>{margenGlobal}%</strong></div>
              <div>📦 Obras activas: <strong style={{color:"#60b4ff"}}>{obras.filter(o=>o.estado==="En Obra").length}</strong></div>
              <div>💸 Por cobrar: <strong style={{color:"#fb923c"}}>{fmt(obras.reduce((s,o)=>s+o.saldo,0))}</strong></div>
              <div>🧾 Cuentas x pagar: <strong style={{color:"#c084fc"}}>{fmt(ctx.cuentas.filter(c=>c.estado==="Pendiente").reduce((s,c)=>s+c.monto,0))}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// NÓMINA
// ======================================================

