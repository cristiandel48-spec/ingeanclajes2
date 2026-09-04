import Av from "../../components/ui/Av";
import AvisoFlujo from "../../components/AvisoFlujo";
import Badge from "../../components/ui/Badge";
import BitacoraObra from "./BitacoraObra";
import LBL from "../../components/ui/LBL";
import NuevoEmpleadoRapido from "../../components/NuevoEmpleadoRapido";
import { useState } from "react";
import { B, CD, PAL, SI, ST } from "../../styles/tokens";
import GuiaFlujoObra from "./GuiaFlujoObra";
import { fmt, fmtD, today } from "../../lib/format";
import { resumenBitacora } from "../../lib/bitacoraObra";
import { estadoSegunAvance, obraEstaCerrada } from "../../lib/flujoObra";
import { esAdmin, puedeCrearPersonal, puedeVerDinero } from "../../lib/permisos";
import { siguienteIdUnico } from "../../lib/identificadores";
export default function ObraDetalle({obraId,ctx,onVolver}){
  const {obras,setObras,empleados,cotizaciones,cuentas,setCuentas,proveedores,ordenesCompra=[],setOrdenesCompra,horarios,setHorarios,irAPantalla,membresia}=ctx;
  // Las cifras de la obra son confidenciales: quien organiza el trabajo no ve
  // cuanto se cobro ni el jornal de sus companeros.
  const verDinero=puedeVerDinero(membresia);
  // Obra entregada: se consulta, no se edita. La reabre un administrador.
  const bloqueada = obraEstaCerrada(obras.find((o)=>o.id===obraId)) && !esAdmin(membresia);
  const [detTab,setDetTab]=useState("bitacora");
  const [gastoForm,setGastoForm]=useState({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
  const [nuevoEmp,setNuevoEmp]=useState(false);
  const [showGasto,setShowGasto]=useState(false);

  const oAct=obras.find(o=>o.id===obraId);
  if(!oAct)return null;

  const gastosObra=cuentas.filter(c=>c.obraId===obraId);
  const totalGastos=gastosObra.reduce((s,c)=>s+c.monto,0);
  const ordenesObra=ordenesCompra.filter(o=>o.obraId===obraId);
  const ordenesAprobadasObra=ordenesObra.filter(o=>o.estadoAprobacion==="Aprobada");
  const totalOrdenesAprobadas=ordenesAprobadasObra.reduce((s,o)=>s+(Number(o.total)||0),0);
  const horariosObra=horarios.filter(h=>h.obraId===obraId);
  const idsHorarios=horariosObra.map(h=>h.empleadoId).filter(Boolean);
  const empObra=[...new Set([...(oAct.empleados||[]), ...idsHorarios])];
  const cotVinc=cotizaciones.find(c=>c.id===oAct.cotizacionId);
  const resumenAvance=resumenBitacora(oAct.bitacora);

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
    const id=siguienteIdUnico(cuentas,"CP");
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
        </div>
      </div>

      <GuiaFlujoObra
        obra={oAct}
        empleadosAsignados={empObra.length}
        registrosAvance={resumenAvance.registros}
        fotosAvance={resumenAvance.fotos}
        verDinero={verDinero}
        onVerAvance={()=>setDetTab("avance")}
        onCrearInforme={()=>irAPantalla("informes",{obraId:oAct.id})}
        onCrearCertificacion={()=>irAPantalla("certificaciones",{obraId:oAct.id})}
      />

      {/* Avance */}
      <div style={{...CD,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>Avance de la obra</span>
          <span style={{fontSize:18,fontWeight:700,color:oAct.avance===100?"#166534":"#f47c20"}}>{oAct.avance}%</span>
        </div>
        <div style={{height:10,background:"#f1f5f9",borderRadius:5,marginBottom:8}}>
          <div style={{width:(oAct.avance) + "%",height:"100%",background:oAct.avance===100?"#4ade80":"#f47c20",borderRadius:5,transition:"width 0.3s"}}/>
        </div>
        <input type="range" min={0} max={100} value={oAct.avance} disabled={bloqueada}
          title={bloqueada?"Obra finalizada: el avance ya no se cambia.":undefined}
          onChange={e=>{
            const avance=Number(e.target.value);
            setObras(p=>p.map(o=>o.id===obraId?{...o,avance,estado:estadoSegunAvance(avance,o.estado)}:o));
          }}
          style={{width:"100%",accentColor:"#f47c20",
            opacity:bloqueada?0.5:1,cursor:bloqueada?"not-allowed":"pointer"}}/>
        {bloqueada&&(
          <div style={{fontSize:11,color:"#166534",background:"#ecfdf5",border:"1px solid #a7f3d0",
            borderRadius:8,padding:"7px 11px",marginTop:8,lineHeight:1.5}}>
            🔒 <strong>Obra finalizada.</strong> Los informes y certificados ya emitidos se apoyan en
            estos datos, así que no se modifican. Si hay que corregir algo, un administrador puede
            reabrirla. El registro de pagos sí sigue disponible.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {[
          ["avance","📸 Avance y fotos"],
          ["personal","👷 Personal"],
          // Gastos y Nomina llevan cifras: solo para quien puede verlas.
          ...(verDinero?[["gastos","🧾 Gastos"],["nomina","💰 Nómina"]]:[]),
          ["horario","📅 Horario"],
        ].map(([id,lb])=>(
          <button key={id} onClick={()=>setDetTab(id)}
            style={{...B(detTab===id?"#cc0000":"#f1f5f9",detTab===id?"#fff":"#475569"),fontSize:12,padding:"8px 16px",border:"1px solid " + (detTab===id?"#cc0000":"#e2e8f0")}}>
            {lb}
          </button>
        ))}
      </div>

      {/* TAB AVANCE Y FOTOS (bitacora que alimenta el informe) */}
      {/* Mientras las fotos no hayan llegado no se deja editar: un cambio
          hecho ahora se perderia al guardar, porque el registro esta a medias. */}
      {detTab==="avance"&&(
        <BitacoraObra obra={oAct} setObras={setObras}
          bloqueada={bloqueada || oAct.__parcial===true}
          cargandoFotos={oAct.__parcial===true}/>
      )}

      {/* TAB PERSONAL */}
      {detTab==="personal"&&(
        <div style={CD}>
          <div style={ST}>👷 Personal en obra</div>
          <AvisoFlujo
            tono="info"
            titulo="Quién trabajó en esta obra"
            accion={puedeCrearPersonal(membresia) && !nuevoEmp && !bloqueada ? (
              <button
                onClick={()=>setNuevoEmp(true)}
                style={{...B("#cc0000"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}
              >
                + Registrar trabajador
              </button>
            ) : null}
          >
            El personal que asignes aquí es el que sale en la tabla «Personal en obra» del informe
            de actividades, con sus turnos. ¿No aparece la persona en la lista? Regístrala aquí
            mismo con el botón: queda disponible al instante y Nómina completa después el salario
            y el contrato. Los turnos se cargan solos desde <strong>Horarios</strong>.
          </AvisoFlujo>

          {nuevoEmp && (
            <NuevoEmpleadoRapido
              ctx={ctx}
              obraId={obraId}
              onCerrar={()=>setNuevoEmp(false)}
              onCreado={(id,info)=>{
                setNuevoEmp(false);
                window.alert(
                  (info?.reactivado
                    ? `${info.nombre} se reactivó y quedó asignado a esta obra.`
                    : `${info?.nombre} quedó registrado y asignado a esta obra.`) +
                  "\n\nYa puedes asignarle turnos en Horarios. Nómina revisará su salario y contrato."
                );
              }}
            />
          )}
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
                    {!bloqueada&&(
                      <button onClick={()=>{
                        setObras(p=>p.map(o=>o.id===obraId?{...o,empleados:(o.empleados||[]).filter(id=>id!==eid)}:o));
                        if(setHorarios) setHorarios(p=>p.filter(h=>!(h.obraId===obraId && h.empleadoId===eid)));
                      }}
                        style={{background:"#fee2e2",border:"1px solid #fca5a5",color:"#cc0000",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                    )}
                  </div>
                  {/* El jornal y la cuenta bancaria del companero son datos
                      confidenciales: sin permiso solo se ven los dias. */}
                  <div style={{display:"grid",gridTemplateColumns:verDinero?"1fr 1fr 1fr":"1fr",gap:6,fontSize:10}}>
                    {[["Días en obra",diasEmp+"d","#1d4ed8"],...(verDinero?[["Jornal/día",fmt(jornal),"#166534"],["Costo obra",fmt(jornal*diasEmp),"#7c3aed"]]:[])].map(([k,v,c])=>(
                      <div key={k} style={{background:"#fff",borderRadius:5,padding:"6px 8px",textAlign:"center",border:"1px solid #f1f5f9"}}>
                        <div style={{color:"#94a3b8",marginBottom:2,fontSize:9}}>{k}</div>
                        <div style={{fontWeight:700,color:c,fontSize:12}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {verDinero&&<div style={{marginTop:8,fontSize:10,color:"#94a3b8"}}>🏦 {emp.banco} · {emp.tipoCuenta} · <span style={{fontFamily:"monospace"}}>{emp.numeroCuenta||"—"}</span></div>}
                </div>
              );
            })}
          </div>
          <div style={bloqueada?{display:"none"}:undefined}>
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
      {detTab==="gastos"&&verDinero&&(
        <div style={CD}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={ST}>🧾 Gastos y cuentas por pagar</div>
            <button style={B("#cc0000")} onClick={()=>setShowGasto(!showGasto)}>+ Agregar gasto</button>
          </div>
          <AvisoFlujo tono="info" titulo="Todo gasto que cargues aquí queda cruzado con esta obra">
            Sirve para saber cuánto costó realmente la obra frente a lo que se cobró. El gasto se
            crea también en <strong>Cuentas por pagar</strong>, no hay que registrarlo dos veces.
            Si el proveedor no aparece en la lista, créalo primero en <strong>Proveedores</strong>.
          </AvisoFlujo>
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
          {/* SECCIÓN ÓRDENES DE COMPRA VINCULADAS */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1.5px dashed #cbd5e1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                📦 Órdenes de compra vinculadas a esta obra ({ordenesObra.length})
              </div>
              <button
                type="button"
                onClick={() => irAPantalla("proveedores")}
                style={{ ...B("#0284c7", "#fff"), fontSize: 11, padding: "5px 10px" }}
              >
                Ver en Causación ↗
              </button>
            </div>

            {ordenesObra.length === 0 ? (
              <div style={{ textAlign: "center", padding: 14, color: "#94a3b8", fontSize: 12, background: "#f8fafc", borderRadius: 8 }}>
                No hay órdenes de compra emitidas para esta obra todavía.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {ordenesObra.map((oc) => (
                  <div key={oc.id} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ color: "#0284c7", fontSize: 12.5 }}>{oc.id}</strong>
                        <span style={{ fontSize: 11, color: "#64748b" }}>Doc: {oc.documentoOrigen}</span>
                        {oc.estadoAprobacion === "Aprobada" ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#166534", background: "#dcfce7", border: "1px solid #86efac", padding: "1px 6px", borderRadius: 4 }}>
                            ✓ Aprobada (Camila Sepúlveda)
                          </span>
                        ) : oc.estadoAprobacion === "Rechazada" ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5", padding: "1px 6px", borderRadius: 4 }}>
                            ✕ Rechazada
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#c2410c", background: "#ffedd5", border: "1px solid #fed7aa", padding: "1px 6px", borderRadius: 4 }}>
                            ⏳ Pendiente Aprobación
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>
                        {oc.proveedorNombre} · Solicitado por: {oc.solicitante}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{fmt(oc.total)}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>Estado: {oc.estadoFacturacion}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "#f1f5f9", borderRadius: 8, padding: "12px 16px", marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center", fontSize: 12 }}>
            <div>
              <div style={{ color: "#64748b", marginBottom: 3 }}>Facturas causadas</div>
              <div style={{ fontWeight: 700, color: "#cc0000", fontSize: 14 }}>{fmt(totalGastos)}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", marginBottom: 3 }}>Órdenes aprobadas</div>
              <div style={{ fontWeight: 700, color: "#0284c7", fontSize: 14 }}>{fmt(totalOrdenesAprobadas)}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", marginBottom: 3 }}>Costo comprometido</div>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 15 }}>{fmt(totalGastos + totalOrdenesAprobadas)}</div>
            </div>
          </div>
          {oAct.total>0&&<div style={{background:(totalGastos+totalOrdenesAprobadas)/oAct.total<0.4?"#dcfce7":"#fff7ed",borderRadius:8,padding:"10px 14px",marginTop:8,fontSize:11,color:"#475569"}}>Compromiso total = <strong style={{color:(totalGastos+totalOrdenesAprobadas)/oAct.total<0.4?"#166534":"#c2410c"}}>{Math.round(((totalGastos+totalOrdenesAprobadas)/oAct.total)*100)}%</strong> del ingreso de la obra</div>}
        </div>
      )}

      {/* TAB NÓMINA */}
      {detTab==="nomina"&&verDinero&&(
        <div style={CD}>
          <div style={ST}>💰 Nómina proporcional por obra</div>
          <AvisoFlujo tono="info" titulo="Cuánto de la nómina se le carga a esta obra">
            Es un cálculo automático, no hay nada que llenar: días trabajados × jornal diario
            (salario ÷ 26 días). Los <strong>días salen de los turnos de Horarios</strong>, así que
            si aquí sale 0 días es porque no se han asignado turnos a esa persona en esta obra.
            Esta cifra es informativa; la nómina que se paga se liquida en el módulo de Nómina.
          </AvisoFlujo>
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
          <AvisoFlujo
            tono="info"
            titulo="Los turnos se asignan desde el módulo de Horarios"
            accion={
              <button
                onClick={()=>irAPantalla("horarios")}
                style={{...B("#f1f5f9","#475569"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}
              >
                Ir a Horarios
              </button>
            }
          >
            Aquí solo se ven. Cada turno que asignes en Horarios le llega al trabajador por WhatsApp
            y además alimenta dos cosas de esta obra: los <strong>días trabajados</strong> de la
            pestaña Nómina y la columna <strong>turno</strong> del informe de actividades.
          </AvisoFlujo>
          {horariosObra.length===0&&<div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>Sin turnos registrados todavía.</div>}
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

