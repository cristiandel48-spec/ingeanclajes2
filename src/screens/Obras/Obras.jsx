import { useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmt, fmtD, today } from "../../lib/format";
import { getQuoteApprovalAccountingSnapshot } from "../../lib/cotizaciones";
export default function Obras({ctx}){
  const {obras,setObras,empleados,cotizaciones,cuentas,setCuentas,proveedores,horarios}=ctx;
  const [sel,setSel]=useState(null);
  const [detTab,setDetTab]=useState("personal");
  const [showNO,setShowNO]=useState(false);
  const [nob,setNob]=useState({cliente:"",tel:"",proyecto:"",ciudad:"",direccion:"",fechaInicio:today(),fechaFin:"",total:0,cotizacionId:""});
  const [gastoForm,setGastoForm]=useState({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
  const [showGasto,setShowGasto]=useState(false);

  const updAv=(id,v)=>setObras(p=>p.map(o=>o.id===id?{...o,avance:Math.min(100,Math.max(0,v))}:o));
  const updEst=(id,e)=>setObras(p=>p.map(o=>o.id===id?{...o,estado:e}:o));

  const guardarObra=()=>{
    if(!nob.cliente.trim())return;
    const id="OB-" + (String(obras.length+1).padStart(3,"0"));
    const cotizacionVinculada = nob.cotizacionId ? cotizaciones.find((cotizacion)=>cotizacion.id===nob.cotizacionId) : null;
    const snapshot = cotizacionVinculada ? getQuoteApprovalAccountingSnapshot(cotizacionVinculada) : null;
    const totalObra = snapshot?.totalObra ?? Number(nob.total || 0);
    setObras(p=>[...p,{
      ...nob,
      id,
      nit:"",
      coords:"",
      estado:"En Obra",
      avance:0,
      total:totalObra,
      pagado:0,
      saldo:totalObra,
      costos:0,
      empleados:[],
      trazos:[],
      anclajes:[],
      subtotalCotizacion:snapshot?.subtotalCotizacion ?? 0,
      utilidadCotizacion:snapshot?.utilidadCotizacion ?? 0,
      baseIngresoContable:snapshot?.baseIngresoContable ?? totalObra,
      ivaGeneradoCotizacion:snapshot?.ivaGeneradoCotizacion ?? 0,
    }]);
    if(nob.cotizacionId){
      ctx.setCotizaciones(p=>p.map(c=>c.id===nob.cotizacionId?{...c,estado:"Aprobada",obraId:id}:c));
    }
    setNob({cliente:"",tel:"",proyecto:"",ciudad:"",direccion:"",fechaInicio:today(),fechaFin:"",total:0,cotizacionId:""});
    setShowNO(false);
  };

  const guardarGasto=()=>{
    if(!sel||!gastoForm.concepto)return;
    const id="CP-" + (String(cuentas.length+1).padStart(3,"0"));
    setCuentas(p=>[...p,{id,...gastoForm,obraId:sel.id,estado:"Pendiente"}]);
    setGastoForm({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
    setShowGasto(false);
  };

  // Si hay obra seleccionada, mostramos pantalla completa de esa obra
  if(sel){
    return <ObraDetalle obraId={sel.id} ctx={ctx} onVolver={()=>setSel(null)}/>;
  }

  return(
    <div style={{padding:28}}>
      <H1 title="Ejecución de Obra" subtitle="Gestión completa: personal, gastos, nómina y tiempo por obra"
        action={<button style={B("#cc0000")} onClick={()=>setShowNO(!showNO)}>+ Nueva Obra</button>}/>

      {showNO&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #cc0000"}}>
          <div style={ST}>Nueva Obra</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <div><LBL>Cliente</LBL><input value={nob.cliente} onChange={e=>setNob({...nob,cliente:e.target.value})} placeholder="Nombre del cliente" style={SI}/></div>
            <div><LBL>Teléfono</LBL><input value={nob.tel} onChange={e=>setNob({...nob,tel:e.target.value})} placeholder="3001234567" style={SI}/></div>
            <div><LBL>Proyecto / Descripción</LBL><input value={nob.proyecto} onChange={e=>setNob({...nob,proyecto:e.target.value})} placeholder="Ej: Líneas de vida cubierta" style={SI}/></div>
            <div><LBL>Ciudad</LBL><input value={nob.ciudad} onChange={e=>setNob({...nob,ciudad:e.target.value})} placeholder="Ej: Medellín, Antioquia" style={SI}/></div>
            <div><LBL>Dirección</LBL><input value={nob.direccion} onChange={e=>setNob({...nob,direccion:e.target.value})} placeholder="Dirección de la obra" style={SI}/></div>
            <div><LBL>Valor total ($)</LBL><input type="number" value={nob.total} onChange={e=>setNob({...nob,total:parseFloat(e.target.value)||0})} style={SI}/></div>
            <div><LBL>Fecha inicio</LBL><input type="date" value={nob.fechaInicio} onChange={e=>setNob({...nob,fechaInicio:e.target.value})} style={SI}/></div>
            <div><LBL>Fecha fin estimada</LBL><input type="date" value={nob.fechaFin} onChange={e=>setNob({...nob,fechaFin:e.target.value})} style={SI}/></div>
            <div><LBL>Vincular cotización (opcional)</LBL>
              <select value={nob.cotizacionId} onChange={e=>setNob({...nob,cotizacionId:e.target.value})} style={SI}>
                <option value="">Sin cotización</option>
                {cotizaciones.filter(c=>!c.obraId).map(c=><option key={c.id} value={c.id}>{c.numero} · {c.cliente}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={guardarObra} style={B("#cc0000")}>✅ Crear Obra</button>
            <button onClick={()=>setShowNO(false)} style={B("#f1f5f9","#475569")}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {obras.map(o=>{
          const cotVinc=cotizaciones.find(c=>c.id===o.cotizacionId);
          const gastosObra=cuentas.filter(c=>c.obraId===o.id).reduce((s,c)=>s+c.monto,0);
          return(
            <div key={o.id} style={{...CD,border:"1px solid #e2e8f0",cursor:"pointer",transition:"all 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#cc0000"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#e2e8f0"}
              onClick={()=>{setSel(o);setDetTab("personal");}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>{o.id} · {fmtD(o.fechaInicio)}</div>
                  <div style={{fontSize:15,fontWeight:700,marginTop:2,color:"#1a1a2e"}}>{o.cliente}</div>
                  <div style={{fontSize:12,color:"#475569"}}>{o.proyecto}</div>
                  {cotVinc&&<div style={{fontSize:10,color:"#b45309",marginTop:2}}>📄 {o.cotizacionId}</div>}
                </div>
                <Badge estado={o.estado}/>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:4}}>
                  <span>Avance</span><span style={{color:o.avance===100?"#166534":"#f47c20",fontWeight:600}}>{o.avance}%</span>
                </div>
                <div style={{height:5,background:"#e2e8f0",borderRadius:3}}>
                  <div style={{width:(o.avance) + "%",height:"100%",background:o.avance===100?"#4ade80":"#f47c20",borderRadius:3}}/>
                </div>
                <input type="range" min={0} max={100} value={o.avance}
                  onChange={e=>updAv(o.id,Number(e.target.value))}
                  style={{width:"100%",marginTop:4,accentColor:"#f47c20"}}
                  onClick={e=>e.stopPropagation()}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:10}}>
                {[["Total",fmt(o.total),"#1a1a2e"],["Cobrado",fmt(o.pagado),"#166534"],["Saldo",fmt(o.saldo),o.saldo>0?"#c2410c":"#166534"],["Gastos",fmt(gastosObra),"#7c3aed"]].map(([k,v,c])=>(
                  <div key={k} style={{background:"#f8fafc",borderRadius:6,padding:"6px 8px",border:"1px solid #f1f5f9"}}>
                    <div style={{fontSize:8,color:"#94a3b8",textTransform:"uppercase",marginBottom:2}}>{k}</div>
                    <div style={{fontSize:11,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <select value={o.estado} onChange={e=>{e.stopPropagation();updEst(o.id,e.target.value);}}
                  style={{...SI,fontSize:11,padding:"5px 8px",flex:1}} onClick={e=>e.stopPropagation()}>
                  {["Cotización","En Obra","Finalizado","Pagado"].map(s=><option key={s}>{s}</option>)}
                </select>
                <span style={{fontSize:11,color:"#94a3b8",flexShrink:0}}>{(o.empleados||[]).length} 👷</span>
                <span style={{fontSize:11,color:"#cc0000",fontWeight:600,flexShrink:0}}>Ver →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DETALLE COMPLETO DE UNA OBRA ──

