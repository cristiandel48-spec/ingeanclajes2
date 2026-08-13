import Badge from "../../components/ui/Badge";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmt, today } from "../../lib/format";
export default function Pagos({ctx}){
  const {obras,setObras,pagos,setPagos}=ctx;
  const [filtro,setFiltro]=useState("todas");
  const [pstep,setPstep]=useState(null);
  const [busquedaPago,setBusquedaPago]=useState("");
  const [obraPagoId,setObraPagoId]=useState("");
  const [guardandoAbono,setGuardandoAbono]=useState(false);
  const [vistaPago,setVistaPago]=useState("registro");
  const [abono,setAbono]=useState({
    tipo:"Abono manual",
    monto:"",
    fecha:today(),
    metodo:"Transferencia",
    notas:"",
  });

  const normalizarTexto = (valor="") =>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const pagosNormalizados = (Array.isArray(pagos) ? pagos : []).map((pago)=>({
    ...pago,
    monto:Number(pago?.monto ?? pago?.valor ?? 0),
    valor:Number(pago?.monto ?? pago?.valor ?? 0),
    metodo:pago?.metodo ?? pago?.medio ?? "",
    medio:pago?.metodo ?? pago?.medio ?? "",
    tipo:pago?.tipo ?? pago?.referencia ?? "Abono",
    estado:pago?.estado ?? "Pagado",
    fecha:pago?.fecha || today(),
  }));

  const obrasFiltradasBusqueda = obras.filter((obra)=>{
    const term = normalizarTexto(busquedaPago);
    if(!term) return true;
    return [obra.id, obra.cliente, obra.proyecto, obra.obra, obra.ciudad, obra.direccion]
      .some((campo)=>normalizarTexto(campo).includes(term));
  });

  const obraSeleccionada = obras.find((obra)=>obra.id===obraPagoId) || null;
  const pF = filtro==="todas" ? pagosNormalizados : pagosNormalizados.filter((p)=>p.obraId===filtro);
  const tCob = pagosNormalizados.filter((p)=>p.estado==="Pagado").reduce((s,p)=>s+Number(p.monto||0),0);
  const tPend = pagosNormalizados.filter((p)=>p.estado==="Pendiente").reduce((s,p)=>s+Number(p.monto||0),0);

  const actualizarSaldoObra = (obraId, montoAbono) => {
    if(!obraId || !Number.isFinite(montoAbono) || montoAbono<=0) return;
    setObras((prev)=>prev.map((obra)=>{
      if(obra.id!==obraId) return obra;
      const pagadoActual = Number(obra.pagado || 0);
      const totalActual = Number(obra.total || 0);
      const nuevoPagado = pagadoActual + montoAbono;
      const nuevoSaldo = Math.max(0, totalActual - nuevoPagado);
      return {
        ...obra,
        pagado:nuevoPagado,
        saldo:nuevoSaldo,
        estado:nuevoSaldo>0 ? obra.estado : "Pagado",
      };
    }));
  };

  const cobrar = (id) => {
    const pagoActual = pagosNormalizados.find((p)=>p.id===id);
    if(!pagoActual || pagoActual.estado==="Pagado") return;
    setPstep(id);
    setTimeout(()=>{
      actualizarSaldoObra(pagoActual.obraId, Number(pagoActual.monto || 0));
      setPagos((prev)=>prev.map((p)=>p.id===id ? {
        ...p,
        estado:"Pagado",
        fecha:today(),
        metodo:p.metodo ?? p.medio ?? "PSE",
      } : p));
      setPstep(null);
    }, 700);
  };

  const guardarAbonoManual = () => {
    const monto = Math.round(Number(abono.monto || 0));
    if(!obraPagoId || !Number.isFinite(monto) || monto<=0) return;
    const nuevoPago = {
      id:"PG-" + (Date.now()),
      obraId:obraPagoId,
      tipo:abono.tipo?.trim() || "Abono manual",
      monto,
      valor:monto,
      fecha:abono.fecha || today(),
      estado:"Pagado",
      metodo:abono.metodo || "Transferencia",
      medio:abono.metodo || "Transferencia",
      notas:(abono.notas || "").trim(),
    };
    setGuardandoAbono(true);
    setPagos((prev)=>[nuevoPago, ...prev]);
    actualizarSaldoObra(obraPagoId, monto);
    setFiltro(obraPagoId);
    setAbono({
      tipo:"Abono manual",
      monto:"",
      fecha:today(),
      metodo:"Transferencia",
      notas:"",
    });
    setTimeout(()=>setGuardandoAbono(false), 500);
  };

  return(
    <div style={{padding:"14px 28px 28px"}}>

      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <button
          type="button"
          onClick={()=>setVistaPago("registro")}
          style={{
            ...B(vistaPago==="registro" ? "#cc0000" : "#fff7ed", vistaPago==="registro" ? "#fff" : "#9a3412"),
            border:vistaPago==="registro" ? "1px solid #cc0000" : "1px solid #fed7aa",
          }}
        >
          Registrar abono
        </button>
        <button
          type="button"
          onClick={()=>setVistaPago("historial")}
          style={{
            ...B(vistaPago==="historial" ? "#003B71" : "#eff6ff", vistaPago==="historial" ? "#fff" : "#1d4ed8"),
            border:vistaPago==="historial" ? "1px solid #003B71" : "1px solid #bfdbfe",
          }}
        >
          Historial de pagos
        </button>
      </div>

      {vistaPago==="registro" && <div style={{...CD,marginBottom:20,border:"1px solid #fed7aa",boxShadow:"0 18px 40px rgba(244,124,32,0.08)"}}>
        <div style={ST}>Registrar abono manual</div>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:18,alignItems:"start"}}>
          <div style={{display:"grid",gap:12}}>
            <div>
              <LBL>Buscar cliente u obra</LBL>
              <input
                value={busquedaPago}
                onChange={(e)=>{
                  const v=e.target.value;
                  setBusquedaPago(v);
                  const t=normalizarTexto(v);
                  if(!t){setObraPagoId("");return;}
                  const matches=obras.filter((obra)=>[obra.id,obra.cliente,obra.proyecto,obra.obra,obra.ciudad,obra.direccion].some((campo)=>normalizarTexto(campo).includes(t)));
                  setObraPagoId(matches[0]?.id || "");
                }}
                placeholder="Escribe cliente, obra, ciudad o ID"
                style={SI}
              />
            </div>
            <div>
              <LBL>Seleccionar obra</LBL>
              <select value={obraPagoId} onChange={(e)=>setObraPagoId(e.target.value)} style={SI}>
                <option value="">Seleccionar obra...</option>
                {obrasFiltradasBusqueda.map((obra)=>(
                  <option key={obra.id} value={obra.id}>
                    {obra.id} · {obra.cliente} · {obra.proyecto}
                  </option>
                ))}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <LBL>Valor del abono</LBL>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={abono.monto}
                  onChange={(e)=>setAbono({...abono,monto:e.target.value})}
                  placeholder="Ej. 2000000"
                  style={SI}
                />
                <div style={{fontSize:11,color:"#64748b",marginTop:6}}>
                  {Number(abono.monto || 0)>0 ? fmt(Number(abono.monto || 0)) : "Ingresa el valor manual del abono"}
                </div>
              </div>
              <div>
                <LBL>Fecha del abono</LBL>
                <input
                  type="date"
                  value={abono.fecha}
                  onChange={(e)=>setAbono({...abono,fecha:e.target.value})}
                  style={SI}
                />
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <LBL>Tipo</LBL>
                <input
                  value={abono.tipo}
                  onChange={(e)=>setAbono({...abono,tipo:e.target.value})}
                  placeholder="Abono manual / anticipo / pago parcial"
                  style={SI}
                />
              </div>
              <div>
                <LBL>Método</LBL>
                <select value={abono.metodo} onChange={(e)=>setAbono({...abono,metodo:e.target.value})} style={SI}>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Consignación">Consignación</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="PSE">PSE</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <LBL>Notas</LBL>
              <textarea
                value={abono.notas}
                onChange={(e)=>setAbono({...abono,notas:e.target.value})}
                rows={3}
                placeholder="Referencia, observación del pago o soporte recibido"
                style={{...SI,minHeight:86,resize:"vertical"}}
              />
            </div>
            <div style={{display:"flex",gap:10}}>
              <button
                type="button"
                onClick={guardarAbonoManual}
                disabled={!obraPagoId || Number(abono.monto || 0)<=0 || guardandoAbono}
                style={{
                  ...B("#cc0000"),
                  opacity:(!obraPagoId || Number(abono.monto || 0)<=0 || guardandoAbono)?0.6:1,
                  cursor:(!obraPagoId || Number(abono.monto || 0)<=0 || guardandoAbono)?"not-allowed":"pointer",
                }}
              >
                {guardandoAbono ? "Guardando..." : "Guardar abono"}
              </button>
              <button
                type="button"
                onClick={()=>{
                  setBusquedaPago("");
                  setObraPagoId("");
                  setAbono({ tipo:"Abono manual", monto:"", fecha:today(), metodo:"Transferencia", notas:"" });
                }}
                style={B("#f1f5f9","#475569")}
              >
                Limpiar
              </button>
            </div>
          </div>

          <div style={{background:"linear-gradient(180deg,#fff7ed,#ffffff)",border:"1px solid #fed7aa",borderRadius:14,padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"#9a3412",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Obra seleccionada</div>
            {obraSeleccionada ? (
              <div style={{display:"grid",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:"#64748b"}}>{obraSeleccionada.id}</div>
                  <div style={{fontSize:20,fontWeight:700,color:"#1a1a2e"}}>{obraSeleccionada.cliente}</div>
                  <div style={{fontSize:13,color:"#475569"}}>{obraSeleccionada.proyecto}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase"}}>Total obra</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#1a1a2e"}}>{fmt(Number(obraSeleccionada.total || 0))}</div>
                  </div>
                  <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase"}}>Cobrado</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#166534"}}>{fmt(Number(obraSeleccionada.pagado || 0))}</div>
                  </div>
                  <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px",gridColumn:"span 2"}}>
                    <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase"}}>Saldo pendiente</div>
                    <div style={{fontSize:24,fontWeight:800,color:Number(obraSeleccionada.saldo||0)>0?"#c2410c":"#166534"}}>
                      {fmt(Number(obraSeleccionada.saldo || 0))}
                    </div>
                  </div>
                </div>
                <div style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>
                  Ciudad: <strong style={{color:"#334155"}}>{obraSeleccionada.ciudad || "No registrada"}</strong><br/>
                  Dirección: <strong style={{color:"#334155"}}>{obraSeleccionada.direccion || "No registrada"}</strong>
                </div>
              </div>
            ) : (
              <div style={{fontSize:13,color:"#64748b",lineHeight:1.6}}>
                Busca el cliente o la obra, selecciónala y luego registra el valor exacto del abono manual.
              </div>
            )}
          </div>
        </div>
      </div>}

      <div style={CD}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={ST}>Historial de pagos</div>
          <select value={filtro} onChange={e=>setFiltro(e.target.value)} style={{...SI,width:"auto",fontSize:12}}>
            <option value="todas">Todas las obras</option>
            {obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}
          </select>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:"#f1f5f9"}}>
              {["ID","Obra","Cliente","Tipo","Monto","Fecha","Método","Estado","Acción"].map(h=>(
                <th key={h} style={{padding:"9px 10px",textAlign:h==="Monto"?"right":"left",color:"#64748b",fontWeight:500,fontSize:11}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pF.map((p,i)=>{
              const ob=obras.find(o=>o.id===p.obraId);
              return(
                <tr key={p.id} style={{borderBottom:"1px solid #e2e8f0",background:i%2===0?"#ffffff":"#f8fafc"}}>
                  <td style={{padding:"10px 10px",color:"#60b4ff",fontSize:11}}>{p.id}</td>
                  <td style={{padding:"10px 10px",fontSize:11}}>{p.obraId}</td>
                  <td style={{padding:"10px 10px",fontSize:11,color:"#475569"}}>{ob?.cliente}</td>
                  <td style={{padding:"10px 10px",fontSize:11}}>{p.tipo}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontWeight:700,color:"#cc0000"}}>{fmt(Number(p.monto || 0))}</td>
                  <td style={{padding:"10px 10px",color:"#475569",fontSize:11}}>{p.fecha}</td>
                  <td style={{padding:"10px 10px",color:"#475569",fontSize:11}}>{p.metodo}</td>
                  <td style={{padding:"10px 10px"}}><Badge estado={p.estado}/></td>
                  <td style={{padding:"10px 10px"}}>
                    {p.estado==="Pendiente" && (
                      pstep===p.id
                        ? <span style={{fontSize:11,color:"#cc0000"}}>Procesando...</span>
                        : <button onClick={()=>cobrar(p.id)} style={{background:"#003B71",border:"1px solid #FFCD00",color:"#FFCD00",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>Marcar pagado</button>
                    )}
                    {p.estado==="Pagado" && <span style={{fontSize:11,color:"#166534",fontWeight:700}}>Conciliado</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

