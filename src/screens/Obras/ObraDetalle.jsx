import Av from "../../components/ui/Av";
import Badge from "../../components/ui/Badge";
import LBL from "../../components/ui/LBL";
import { useState } from "react";
import { B, CD, PAL, SI, ST } from "../../styles/tokens";
import { fmt, fmtD, today } from "../../lib/format";
export default function ObraDetalle({obraId,ctx,onVolver}){
  const {obras,setObras,empleados,cotizaciones,cuentas,setCuentas,proveedores,horarios,irAPantalla}=ctx;
  const [detTab,setDetTab]=useState("personal");
  const [gastoForm,setGastoForm]=useState({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
  const [showGasto,setShowGasto]=useState(false);

  const oAct=obras.find(o=>o.id===obraId);
  if(!oAct)return null;

  const gastosObra=cuentas.filter(c=>c.obraId===obraId);
  const totalGastos=gastosObra.reduce((s,c)=>s+c.monto,0);
  const horariosObra=horarios.filter(h=>h.obraId===obraId);
  const empObra=oAct.empleados||[];
  const cotVinc=cotizaciones.find(c=>c.id===oAct.cotizacionId);

  const diasMap={};
  horariosObra.forEach(h=>{if(!diasMap[h.empleadoId])diasMap[h.empleadoId]=new Set();diasMap[h.empleadoId].add(h.fecha);});
  const totalDias=Object.values(diasMap).reduce((s,set)=>s+set.size,0);
  const nomObraTotal=empObra.reduce((s,eid)=>{
    const e=empleados.find(x=>x.id===eid);
    if(!e)return s;
    const dias=diasMap[eid]?diasMap[eid].size:0;
    return s+Math.round(e.salario/26)*dias;
  },0);

  const guardarGasto=()=>{
    if(!gastoForm.concepto)return;
    const id="CP-" + (String(cuentas.length+1).padStart(3,"0"));
    setCuentas(p=>[...p,{id,...gastoForm,obraId,estado:"Pendiente"}]);
    setGastoForm({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
    setShowGasto(false);
  };

  return(
    <div style={{padding:28}}>
      {/* Barra superior */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24,background:"#fff",borderRadius:14,padding:"16px 20px",border:"1px solid #e2e8f0",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
        <button onClick={onVolver} style={{...B("#f1f5f9","#475569"),padding:"8px 16px",fontSize:13,flexShrink:0}}>← Volver</button>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:"#94a3b8"}}>{oAct.id} · {fmtD(oAct.fechaInicio)} → {fmtD(oAct.fechaFin)||"En curso"}</div>
          <div style={{fontSize:20,fontWeight:700,color:"#1a1a2e",lineHeight:1.2}}>{oAct.cliente}</div>
          <div style={{fontSize:13,color:"#475569"}}>{oAct.proyecto} · 📍 {oAct.ciudad}</div>
          {oAct.direccion&&<div style={{fontSize:11,color:"#94a3b8"}}>{oAct.direccion}</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
          <Badge estado={oAct.estado}/>
          {cotVinc&&<div style={{fontSize:11,color:"#b45309"}}>📄 {cotVinc.numero}</div>}
          {/* Continuación del flujo: llevan a la pantalla correspondiente con
              esta obra ya cargada, sin buscarla en el desplegable. */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <button
              onClick={()=>irAPantalla("informes",{obraId:oAct.id})}
              title={`Crear un informe de actividades para ${oAct.id}`}
              style={{...B("#dbeafe","#1e40af"),fontSize:11,padding:"6px 12px"}}
            >
              Crear informe
            </button>
            <button
              onClick={()=>irAPantalla("certificaciones",{obraId:oAct.id})}
              title={`Crear una certificación para ${oAct.id}`}
              style={{...B("#dcfce7","#15803d"),fontSize:11,padding:"6px 12px"}}
            >
              Crear certificación
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:24}}>
        {[
          ["💰 Ingreso total",fmt(oAct.total),"#166534"],
          ["✅ Cobrado",fmt(oAct.pagado),"#1d4ed8"],
          ["? Saldo",fmt(oAct.saldo),oAct.saldo>0?"#c2410c":"#166534"],
          ["🧾 Gastos",fmt(totalGastos),"#7c3aed"],
          ["👷 Personal",(empObra.length) + " pers.","#0891b2"],
          ["📅 Días obra",(totalDias) + " días","#b45309"],
        ].map(([k,v,c])=>(
          <div key={k} style={{background:"#fff",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0",textAlign:"center"}}>
            <div style={{fontSize:10,color:"#94a3b8",marginBottom:6}}>{k}</div>
            <div style={{fontSize:16,fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Avance */}
      <div style={{...CD,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>Avance de la obra</span>
          <span style={{fontSize:18,fontWeight:700,color:oAct.avance===100?"#166534":"#f47c20"}}>{oAct.avance}%</span>
        </div>
        <div style={{height:10,background:"#f1f5f9",borderRadius:5,marginBottom:8}}>
          <div style={{width:(oAct.avance) + "%",height:"100%",background:oAct.avance===100?"#4ade80":"#f47c20",borderRadius:5,transition:"width 0.3s"}}/>
        </div>
        <input type="range" min={0} max={100} value={oAct.avance}
          onChange={e=>setObras(p=>p.map(o=>o.id===obraId?{...o,avance:Number(e.target.value)}:o))}
          style={{width:"100%",accentColor:"#f47c20"}}/>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {[["personal","👷 Personal"],["gastos","🧾 Gastos"],["nomina","💰 Nómina"],["horario","📅 Horario"]].map(([id,lb])=>(
          <button key={id} onClick={()=>setDetTab(id)}
            style={{...B(detTab===id?"#cc0000":"#f1f5f9",detTab===id?"#fff":"#475569"),fontSize:12,padding:"8px 16px",border:"1px solid " + (detTab===id?"#cc0000":"#e2e8f0")}}>
            {lb}
          </button>
        ))}
      </div>

      {/* TAB PERSONAL */}
      {detTab==="personal"&&(
        <div style={CD}>
          <div style={ST}>👷 Personal en obra</div>
          {empObra.length===0&&(
            <div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13,background:"#f8fafc",borderRadius:10,border:"1px dashed #e2e8f0",marginBottom:12}}>
              Sin empleados asignados aún
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            {empObra.map((eid,idx)=>{
              const emp=empleados.find(x=>x.id===eid);
              if(!emp)return null;
              const diasEmp=diasMap[eid]?diasMap[eid].size:0;
              const jornal=Math.round(emp.salario/26);
              return(
                <div key={eid} style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <Av init={emp.avatar} color={PAL[idx%PAL.length]} size={36}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700}}>{emp.nombre}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>{emp.cargo}</div>
                      <div style={{fontSize:10,color:"#94a3b8"}}>📱 {emp.tel}</div>
                    </div>
                    <button onClick={()=>setObras(p=>p.map(o=>o.id===obraId?{...o,empleados:(o.empleados||[]).filter(id=>id!==eid)}:o))}
                      style={{background:"#fee2e2",border:"1px solid #fca5a5",color:"#cc0000",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:10}}>
                    {[["Días en obra",diasEmp+"d","#1d4ed8"],["Jornal/día",fmt(jornal),"#166534"],["Costo obra",fmt(jornal*diasEmp),"#7c3aed"]].map(([k,v,c])=>(
                      <div key={k} style={{background:"#fff",borderRadius:5,padding:"6px 8px",textAlign:"center",border:"1px solid #f1f5f9"}}>
                        <div style={{color:"#94a3b8",marginBottom:2,fontSize:9}}>{k}</div>
                        <div style={{fontWeight:700,color:c,fontSize:12}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:8,fontSize:10,color:"#94a3b8"}}>🏦 {emp.banco} · {emp.tipoCuenta} · <span style={{fontFamily:"monospace"}}>{emp.numeroCuenta||"—"}</span></div>
                </div>
              );
            })}
          </div>
          <div>
            <LBL>➕ Asignar empleado a esta obra</LBL>
            <select value="" onChange={ev=>{
              const v=ev.target.value;
              if(!v)return;
              if(!empObra.includes(v))
                setObras(p=>p.map(o=>o.id===obraId?{...o,empleados:[...(o.empleados||[]),v]}:o));
            }} style={{...SI,border:"2px solid #cc0000",fontSize:12}}>
              <option value="">Selecciona un empleado...</option>
              {empleados.filter(emp=>!empObra.includes(emp.id)).map(emp=>(
                <option key={emp.id} value={emp.id}>{emp.nombre} · {emp.cargo}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* TAB GASTOS */}
      {detTab==="gastos"&&(
        <div style={CD}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={ST}>🧾 Gastos y cuentas por pagar</div>
            <button style={B("#cc0000")} onClick={()=>setShowGasto(!showGasto)}>+ Agregar gasto</button>
          </div>
          {showGasto&&(
            <div style={{background:"#f8fafc",border:"1px solid #cc000033",borderRadius:10,padding:16,marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><LBL>Proveedor</LBL>
                  <select value={gastoForm.proveedorId} onChange={e=>setGastoForm({...gastoForm,proveedorId:e.target.value})} style={SI}>
                    {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div><LBL>N° Factura</LBL><input value={gastoForm.factura} onChange={e=>setGastoForm({...gastoForm,factura:e.target.value})} placeholder="FV-2026-0001" style={SI}/></div>
                <div style={{gridColumn:"span 2"}}><LBL>Concepto</LBL><input value={gastoForm.concepto} onChange={e=>setGastoForm({...gastoForm,concepto:e.target.value})} placeholder="Descripción del gasto" style={SI}/></div>
                <div><LBL>Monto ($)</LBL><input type="number" value={gastoForm.monto} onChange={e=>setGastoForm({...gastoForm,monto:parseFloat(e.target.value)||0})} style={SI}/></div>
                <div><LBL>Fecha factura</LBL><input type="date" value={gastoForm.fecha} onChange={e=>setGastoForm({...gastoForm,fecha:e.target.value})} style={SI}/></div>
                <div><LBL>Fecha vencimiento</LBL><input type="date" value={gastoForm.fechaVence} onChange={e=>setGastoForm({...gastoForm,fechaVence:e.target.value})} style={SI}/></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={B("#cc0000")} onClick={guardarGasto}>✅ Guardar gasto</button>
                <button style={B("#f1f5f9","#475569")} onClick={()=>setShowGasto(false)}>Cancelar</button>
              </div>
            </div>
          )}
          {gastosObra.length===0&&!showGasto&&<div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>Sin gastos registrados aún</div>}
          {gastosObra.map(c=>{
            const prov=proveedores.find(p=>p.id===c.proveedorId);
            const vencida=c.estado==="Pendiente"&&c.fechaVence&&c.fechaVence<today();
            return(
              <div key={c.id} style={{background:"#f8fafc",borderRadius:10,padding:"12px 14px",marginBottom:8,border:"1px solid " + (vencida?"#fca5a5":c.estado==="Pagado"?"#bbf7d0":"#e2e8f0")}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div><div style={{fontSize:13,fontWeight:600}}>{c.concepto}</div><div style={{fontSize:11,color:"#64748b"}}>{prov?.nombre} · {c.factura}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:"#cc0000"}}>{fmt(c.monto)}</div><Badge estado={vencida?"Vencida":c.estado}/></div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"#94a3b8"}}>
                  <span>Vence: {fmtD(c.fechaVence)||"—"}</span>
                  {c.estado==="Pendiente"&&<button onClick={()=>setCuentas(p=>p.map(x=>x.id===c.id?{...x,estado:"Pagado"}:x))} style={{background:"#dcfce7",border:"1px solid #4ade80",color:"#166534",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>✓ Pagar</button>}
                </div>
              </div>
            );
          })}
          <div style={{background:"#f1f5f9",borderRadius:8,padding:"12px 16px",marginTop:8,display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600}}>
            <span style={{color:"#64748b"}}>Total gastos</span>
            <span style={{color:"#cc0000"}}>{fmt(totalGastos)}</span>
          </div>
          {oAct.total>0&&<div style={{background:totalGastos/oAct.total<0.4?"#dcfce7":"#fff7ed",borderRadius:8,padding:"10px 14px",marginTop:6,fontSize:11,color:"#475569"}}>Gastos = <strong style={{color:totalGastos/oAct.total<0.4?"#166534":"#c2410c"}}>{Math.round(totalGastos/oAct.total*100)}%</strong> del ingreso total</div>}
        </div>
      )}

      {/* TAB NÓMINA */}
      {detTab==="nomina"&&(
        <div style={CD}>
          <div style={ST}>💰 Nómina proporcional por obra</div>
          <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:11,color:"#475569",border:"1px solid #e2e8f0"}}>Cálculo: días trabajados × jornal diario (salario ÷ 26 días)</div>
          {empObra.length===0&&<div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>Sin personal asignado</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            {empObra.map((eid,idx)=>{
              const emp=empleados.find(x=>x.id===eid);
              if(!emp)return null;
              const diasEmp=diasMap[eid]?diasMap[eid].size:0;
              const jornal=Math.round(emp.salario/26);
              const subtotal=jornal*diasEmp;
              const ded=Math.round(subtotal*0.04);
              return(
                <div key={eid} style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <Av init={emp.avatar} color={PAL[idx%PAL.length]} size={34}/>
                    <div><div style={{fontSize:13,fontWeight:700}}>{emp.nombre}</div><div style={{fontSize:11,color:"#64748b"}}>{emp.cargo}</div></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                    {[["Días",diasEmp+"d","#1d4ed8"],["Jornal",fmt(jornal),"#166534"],["Bruto",fmt(subtotal),"#b45309"],["Neto",fmt(subtotal-ded),"#cc0000"]].map(([k,v,c])=>(
                      <div key={k} style={{background:"#fff",borderRadius:6,padding:"8px",textAlign:"center",border:"1px solid #f1f5f9"}}>
                        <div style={{color:"#94a3b8",fontSize:9,marginBottom:3}}>{k}</div>
                        <div style={{fontWeight:700,color:c,fontSize:11}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:8,fontSize:10,color:"#94a3b8"}}>🏦 {emp.banco} · {emp.tipoCuenta} · <span style={{fontFamily:"monospace"}}>{emp.numeroCuenta||"—"}</span></div>
                </div>
              );
            })}
          </div>
          {empObra.length>0&&(
            <div style={{background:"#f1f5f9",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,textAlign:"center",fontSize:12}}>
                <div><div style={{color:"#64748b",marginBottom:4}}>Total días trabajados</div><div style={{fontWeight:700,color:"#1d4ed8",fontSize:18}}>{totalDias}</div></div>
                <div><div style={{color:"#64748b",marginBottom:4}}>Nómina total obra</div><div style={{fontWeight:700,color:"#cc0000",fontSize:18}}>{fmt(nomObraTotal)}</div></div>
                <div><div style={{color:"#64748b",marginBottom:4}}>% del ingreso</div><div style={{fontWeight:700,color:oAct.total>0&&nomObraTotal/oAct.total<0.3?"#166534":"#c2410c",fontSize:18}}>{oAct.total>0?Math.round(nomObraTotal/oAct.total*100):0}%</div></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB HORARIO */}
      {detTab==="horario"&&(
        <div style={CD}>
          <div style={ST}>📅 Horario y turnos en esta obra</div>
          {horariosObra.length===0&&<div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>Sin turnos registrados. Ve a <strong>Horarios</strong> para agregar.</div>}
          {horariosObra.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(h=>{
            const emp=empleados.find(x=>x.id===h.empleadoId);
            const idx=empleados.findIndex(x=>x.id===h.empleadoId);
            return(
              <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,background:"#f8fafc",borderRadius:10,padding:"10px 14px",marginBottom:8,border:"1px solid #e2e8f0"}}>
                <Av init={emp?.avatar||"?"} color={PAL[idx%PAL.length]} size={32}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{emp?.nombre||"—"}</div>
                  <div style={{fontSize:11,color:"#475569"}}>{h.tarea}</div>
                </div>
                <div style={{textAlign:"right",fontSize:11}}>
                  <div style={{color:"#64748b",fontWeight:500}}>{fmtD(h.fecha)}</div>
                  <div style={{color:"#cc0000",fontWeight:700}}>{h.turno}</div>
                </div>
              </div>
            );
          })}
          {horariosObra.length>0&&(
            <div style={{background:"#f1f5f9",borderRadius:8,padding:"10px 14px",marginTop:8,fontSize:12,color:"#64748b"}}>
              {horariosObra.length} turno(s) · {new Set(horariosObra.map(h=>h.empleadoId)).size} persona(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ======================================================
// CERTIFICACIONES
// ======================================================

