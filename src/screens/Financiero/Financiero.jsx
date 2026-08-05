import Badge from "../../components/ui/Badge";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import SC from "../../components/ui/SC";
import { useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmt, fmtK } from "../../lib/format";
import { printCurrentPz } from "../../lib/print";
export default function Financiero({ctx}){
  const {obras,pagos,cuentas,empleados}=ctx;
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
        <button style={{...B("#2b2622"),marginTop:16}} onClick={()=>printCurrentPz("Informe financiero " + (obraFiltro))}>🖨️ Imprimir informe</button>
      </div>

      <div id="pz" className="doc-shell">
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
          <SC label="Ingresos totales" value={fmtK(totIng)} color="#2b2622" icon="💰" sub="facturado"/>
          <SC label="Cobrado" value={fmtK(totCob)} color="#60b4ff" icon="✅" sub={(totIng>0?Math.round(totCob/totIng*100):0) + "% del total"}/>
          <SC label="Costos directos" value={fmtK(totCost)} color="#fb923c" icon="🧾" sub="proveedores"/>
          <SC label="Margen bruto" value={(margenGlobal) + "%"} color={margenGlobal>25?"#2b2622":margenGlobal>10?"#b54708":"#cc0000"} icon="📊" sub={fmt(totUtil)}/>
        </div>

        <div style={{...CD,marginBottom:20}}>
          <div style={ST}>Detalle financiero por obra</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f4eee4"}}>{["Obra","Cliente","Ingresos","Cobrado","Saldo","Costos Dir.","Util. Bruta","Margen %","Estado"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:["Ingresos","Cobrado","Saldo","Costos Dir.","Util. Bruta","Margen %"].includes(h)?"right":"left",color:"#756a5e",fontWeight:500,fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {sel.map((o,i)=>(
                <tr key={o.id} style={{borderBottom:"1px solid #e8dfd2",background:i%2===0?"#ffffff":"#fbf8f3"}}>
                  <td style={{padding:"10px 12px",color:"#60b4ff",fontSize:11}}>{o.id}</td>
                  <td style={{padding:"10px 12px",fontSize:12,fontWeight:500}}>{o.cliente}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:"#2b2622",fontWeight:600}}>{fmt(o.ingresos)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:"#60b4ff"}}>{fmt(o.cobrado)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:o.saldo>0?"#fb923c":"#2b2622"}}>{fmt(o.saldo)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:"#fb923c"}}>{fmt(o.costosDir)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:o.utilBruta>0?"#2b2622":"#cc0000"}}>{fmt(o.utilBruta)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right"}}>
                    <span style={{fontWeight:700,color:o.margenBruto>25?"#2b2622":o.margenBruto>10?"#b54708":"#cc0000"}}>{o.margenBruto}%</span>
                  </td>
                  <td style={{padding:"10px 12px"}}><Badge estado={o.estado}/></td>
                </tr>
              ))}
              <tr style={{background:"#f4eee4",fontWeight:700}}>
                <td colSpan={2} style={{padding:"10px 12px",color:"#2b2622"}}>TOTALES</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:"#2b2622"}}>{fmt(totIng)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:"#60b4ff"}}>{fmt(totCob)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:totIng-totCob>0?"#fb923c":"#2b2622"}}>{fmt(totIng-totCob)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:"#fb923c"}}>{fmt(totCost)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:totUtil>0?"#2b2622":"#cc0000"}}>{fmt(totUtil)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:margenGlobal>25?"#2b2622":margenGlobal>10?"#b54708":"#cc0000"}}>{margenGlobal}%</td>
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
                  <span style={{color:"#2b2622",fontWeight:500}}>{o.cliente}</span>
                  <span style={{color:o.margenBruto>25?"#2b2622":o.margenBruto>10?"#b54708":"#cc0000",fontWeight:700}}>{o.margenBruto}%</span>
                </div>
                <div style={{height:8,background:"#e8dfd2",borderRadius:4}}>
                  <div style={{width:(Math.max(0,Math.min(100,o.margenBruto))) + "%",height:"100%",background:o.margenBruto>25?"#2b2622":o.margenBruto>10?"#b54708":"#cc0000",borderRadius:4}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#756a5e",marginTop:3}}>
                  <span>Ingreso: {fmt(o.ingresos)}</span><span>Costo: {fmt(o.costosDir)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={CD}>
            <div style={ST}>Estructura de costos</div>
            <div style={{marginBottom:14}}>
              {[["Costos proveedores",totCost,"#fb923c"],["Nómina mensual estimada",nomMes,"#c084fc"],["Saldo pendiente cobrar",totIng-totCob,"#b54708"],["Utilidad bruta estimada",totUtil,"#2b2622"]].map(([k,v,c])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #e8dfd2",fontSize:13}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:2,background:c,flexShrink:0}}/><span style={{color:"#574e44"}}>{k}</span></div>
                  <span style={{fontWeight:700,color:c}}>{fmt(v)}</span>
                </div>
              ))}
            </div>
            <div style={{background:"#f4eee4",borderRadius:8,padding:"12px 14px",fontSize:12,color:"#756a5e",lineHeight:1.7}}>
              <div style={{fontWeight:600,color:"#2b2622",marginBottom:6}}>Indicadores clave</div>
              <div>💰 Margen bruto global: <strong style={{color:margenGlobal>25?"#2b2622":"#b54708"}}>{margenGlobal}%</strong></div>
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

