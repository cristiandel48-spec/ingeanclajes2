import AvisoFlujo from "../../components/AvisoFlujo";
import Badge from "../../components/ui/Badge";
import CampoTexto from "../../components/ui/CampoTexto";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import ObraDetalle from "./ObraDetalle";
import { useEffect, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmt, fmtD, today } from "../../lib/format";
import { getQuoteApprovalAccountingSnapshot } from "../../lib/cotizaciones";
import { resumenBitacora } from "../../lib/bitacoraObra";
import { puedeVerDinero } from "../../lib/permisos";
import { avisoCelular, normalizarFrase, normalizarNombrePropio, normalizarRazonSocial, normalizarTelefono } from "../../lib/normalizarEntrada";

// Siguiente consecutivo de obra. Se calcula sobre el numero mas alto que ya
// existe, no sobre cuantas obras hay: al borrar una obra intermedia, contar
// filas repetia un id que ya estaba en uso y la obra nueva pisaba a la vieja.
const siguienteIdObra = (obras) => {
  const mayor = obras.reduce((max, o) => {
    const n = parseInt(String(o.id || "").replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return "OB-" + String(mayor + 1).padStart(3, "0");
};
export default function Obras({ctx}){
  const {obras,setObras,cotizaciones,cuentas,intencion,limpiarIntencion,membresia}=ctx;
  const verDinero = puedeVerDinero(membresia);
  // Se puede llegar aqui desde otra pantalla pidiendo una obra concreta, por
  // ejemplo desde el aviso de "esta obra no esta lista para certificar".
  const obraSolicitada = intencion?.pantalla==="obras" ? intencion.obraId : null;
  const [sel,setSel]=useState(()=>obras.find((o)=>o.id===obraSolicitada) || null);

  // Se descarta al salir, para que al volver por el menu no se reabra sola.
  useEffect(()=>()=>limpiarIntencion(),[limpiarIntencion]);
  const [showNO,setShowNO]=useState(false);
  // `estado` y `avance` van en el formulario porque muchas obras se cargan al
  // sistema cuando ya llevan tiempo ejecutandose: arrancar siempre en 0% las
  // dejaba mal desde el primer dia.
  const [nob,setNob]=useState({cliente:"",tel:"",proyecto:"",ciudad:"",direccion:"",fechaInicio:today(),fechaFin:"",estado:"En Obra",avance:0,cotizacionId:""});

  const updAv=(id,v)=>setObras(p=>p.map(o=>o.id===id?{...o,avance:Math.min(100,Math.max(0,v))}:o));
  const updEst=(id,e)=>setObras(p=>p.map(o=>o.id===id?{...o,estado:e}:o));

  const guardarObra=()=>{
    if(!nob.cliente.trim()){
      window.alert("Falta el nombre del cliente. Es lo único obligatorio para crear la obra.");
      return;
    }
    const clienteLimpio=normalizarRazonSocial(nob.cliente);
    const yaExiste=obras.find((o)=>normalizarRazonSocial(o.cliente)===clienteLimpio && normalizarFrase(o.proyecto)===normalizarFrase(nob.proyecto));
    if(yaExiste && !window.confirm(`Ya hay una obra de ${clienteLimpio} con ese mismo proyecto (${yaExiste.id}).\n\n¿Aun así quieres crear otra?`)) return;
    const id=siguienteIdObra(obras);
    const cotizacionVinculada = nob.cotizacionId ? cotizaciones.find((cotizacion)=>cotizacion.id===nob.cotizacionId) : null;
    const snapshot = cotizacionVinculada ? getQuoteApprovalAccountingSnapshot(cotizacionVinculada) : null;
    // El valor sale de la cotizacion vinculada o queda en cero: en este
    // formulario no se piden cifras.
    const totalObra = snapshot?.totalObra ?? 0;
    const cobrado = 0;
    setObras(p=>[...p,{
      ...nob,
      // Igual que en el empleado: quien pega y guarda de una no dispara el
      // arreglo del campo, y estos textos salen impresos.
      cliente:normalizarRazonSocial(nob.cliente),
      proyecto:normalizarFrase(nob.proyecto),
      ciudad:normalizarNombrePropio(nob.ciudad),
      direccion:normalizarFrase(nob.direccion),
      tel:normalizarTelefono(nob.tel),
      id,
      nit:"",
      coords:"",
      estado:nob.estado || "En Obra",
      avance:Math.min(100,Math.max(0,Number(nob.avance || 0))),
      total:totalObra,
      pagado:cobrado,
      saldo:totalObra-cobrado,
      costos:0,
      empleados:[],
      trazos:[],
      anclajes:[],
      bitacora:[],
      subtotalCotizacion:snapshot?.subtotalCotizacion ?? 0,
      utilidadCotizacion:snapshot?.utilidadCotizacion ?? 0,
      baseIngresoContable:snapshot?.baseIngresoContable ?? totalObra,
      ivaGeneradoCotizacion:snapshot?.ivaGeneradoCotizacion ?? 0,
    }]);
    if(nob.cotizacionId){
      ctx.setCotizaciones(p=>p.map(c=>c.id===nob.cotizacionId?{...c,estado:"Aprobada",obraId:id}:c));
    }
    setNob({cliente:"",tel:"",proyecto:"",ciudad:"",direccion:"",fechaInicio:today(),fechaFin:"",estado:"En Obra",avance:0,cotizacionId:""});
    setShowNO(false);
  };

  // Si hay obra seleccionada, mostramos pantalla completa de esa obra
  if(sel){
    return <ObraDetalle obraId={sel.id} ctx={ctx} onVolver={()=>setSel(null)}/>;
  }

  return(
    <div style={{padding:28}}>
      <H1 title="Ejecución de Obra" subtitle="Gestión completa: personal, gastos, nómina y tiempo por obra"
        action={<button style={B("#cc0000")} onClick={()=>setShowNO(!showNO)}>+ Nueva Obra</button>}/>

      <AvisoFlujo
        tono="info"
        titulo="Cómo funciona este módulo"
        pasos={[
          "Crea la obra: con «+ Nueva Obra» si ya está en ejecución, o aprobando una cotización (ahí se crea sola con sus valores).",
          "Abre la obra y asigna en «Personal» quién trabaja en ella. Si alguien no aparece, créalo primero en Nómina.",
          "Asigna los turnos desde Horarios: le llegan por WhatsApp y cuentan los días trabajados.",
          "En «Avance y fotos» registra cada día lo que se hizo, con fotos y comentarios.",
          "Con eso ya salen el informe de actividades y la certificación, sin volver a escribir nada.",
        ]}
      >
        La obra es el centro de todo: es donde se junta la información que después alimenta los
        documentos que se le entregan al cliente.
      </AvisoFlujo>

      {showNO&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #cc0000"}}>
          <div style={ST}>Nueva Obra</div>
          <AvisoFlujo tono="info" titulo="¿La obra ya está en ejecución?">
            Créala igual aquí. Pon la <strong>fecha real de inicio</strong>, el <strong>% de avance
            que lleva</strong> hoy y lo que ya se haya <strong>cobrado</strong>: así el sistema
            arranca con la realidad de la obra y no en ceros. Lo único obligatorio es el cliente,
            lo demás se puede completar después.
          </AvisoFlujo>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <CampoTexto label="Cliente" valor={nob.cliente} onChange={v=>setNob({...nob,cliente:v})}
              normalizar={normalizarRazonSocial} placeholder="Nombre del cliente" autoCapitalize="characters"
              ayuda="Sale impreso en la cotización y el certificado."/>
            <CampoTexto label="Teléfono" valor={nob.tel} onChange={v=>setNob({...nob,tel:v})}
              normalizar={normalizarTelefono} revisar={avisoCelular} placeholder="3001234567" inputMode="tel" spellCheck={false}/>
            <CampoTexto label="Proyecto / Descripción" valor={nob.proyecto} onChange={v=>setNob({...nob,proyecto:v})}
              normalizar={normalizarFrase} placeholder="Ej: Líneas de vida cubierta"/>
            <CampoTexto label="Ciudad" valor={nob.ciudad} onChange={v=>setNob({...nob,ciudad:v})}
              normalizar={normalizarNombrePropio} placeholder="Ej: Medellín, Antioquia" autoCapitalize="words"/>
            <CampoTexto label="Dirección" valor={nob.direccion} onChange={v=>setNob({...nob,direccion:v})}
              normalizar={normalizarFrase} placeholder="Dirección de la obra"/>
            {/* Aqui no se pregunta por plata. Quien registra la obra es quien
                organiza el trabajo -personal, turnos, fotos, avances- y las
                cifras son confidenciales. La obra nace en ceros; el valor entra
                solo al vincular la cotizacion, que la maneja quien cotiza. */}
            <div><LBL>Fecha inicio</LBL><input type="date" value={nob.fechaInicio} onChange={e=>setNob({...nob,fechaInicio:e.target.value})} style={SI}/>
              <div style={{fontSize:10.5,color:"#94a3b8",marginTop:3}}>La fecha real en que empezaron, aunque sea de meses atrás.</div>
            </div>
            <div><LBL>Fecha fin estimada</LBL><input type="date" value={nob.fechaFin} onChange={e=>setNob({...nob,fechaFin:e.target.value})} style={SI}/></div>
            <div><LBL>Estado actual</LBL>
              <select value={nob.estado} onChange={e=>setNob({...nob,estado:e.target.value})} style={SI}>
                {["Cotización","En Obra","Finalizado","Pagado"].map(s=><option key={s}>{s}</option>)}
              </select>
              <div style={{fontSize:10.5,color:"#94a3b8",marginTop:3}}>Si está trabajándose ahora, déjalo en «En Obra».</div>
            </div>
            <div><LBL>Avance que lleva hoy (%)</LBL><input type="number" min={0} max={100} value={nob.avance} onChange={e=>setNob({...nob,avance:parseInt(e.target.value,10)||0})} style={SI}/>
              <div style={{fontSize:10.5,color:"#94a3b8",marginTop:3}}>Al 100% (o en «Finalizado») ya se puede certificar.</div>
            </div>
            <div><LBL>Vincular cotización (opcional)</LBL>
              <select value={nob.cotizacionId} onChange={e=>setNob({...nob,cotizacionId:e.target.value})} style={SI}>
                <option value="">Sin cotización</option>
                {cotizaciones.filter(c=>!c.obraId).map(c=><option key={c.id} value={c.id}>{c.numero} · {c.cliente}</option>)}
              </select>
              <div style={{fontSize:10.5,color:"#94a3b8",marginTop:3}}>Si la vinculas, el valor total lo toma de la cotización y esa queda «Aprobada».</div>
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
          const avanceReg=resumenBitacora(o.bitacora);
          return(
            <div key={o.id} style={{...CD,border:"1px solid #e2e8f0",cursor:"pointer",transition:"all 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#cc0000"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#e2e8f0"}
              onClick={()=>setSel(o)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>{o.id} · {fmtD(o.fechaInicio)}</div>
                  <div style={{fontSize:15,fontWeight:700,marginTop:2,color:"#1a1a2e"}}>{normalizarRazonSocial(o.cliente)}</div>
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
              {verDinero&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:10}}>
                  {[["Total",fmt(o.total),"#1a1a2e"],["Cobrado",fmt(o.pagado),"#166534"],["Saldo",fmt(o.saldo),o.saldo>0?"#c2410c":"#166534"],["Gastos",fmt(gastosObra),"#7c3aed"]].map(([k,v,c])=>(
                    <div key={k} style={{background:"#f8fafc",borderRadius:6,padding:"6px 8px",border:"1px solid #f1f5f9"}}>
                      <div style={{fontSize:8,color:"#94a3b8",textTransform:"uppercase",marginBottom:2}}>{k}</div>
                      <div style={{fontSize:11,fontWeight:700,color:c}}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <select value={o.estado} onChange={e=>{e.stopPropagation();updEst(o.id,e.target.value);}}
                  style={{...SI,fontSize:11,padding:"5px 8px",flex:1}} onClick={e=>e.stopPropagation()}>
                  {["Cotización","En Obra","Finalizado","Pagado"].map(s=><option key={s}>{s}</option>)}
                </select>
                <span style={{fontSize:11,color:"#94a3b8",flexShrink:0}}>{(o.empleados||[]).length} 👷</span>
                <span
                  title={avanceReg.fotos?"Fotos de avance cargadas para el informe":"Sin fotos de avance: el informe saldría vacío"}
                  style={{fontSize:11,color:avanceReg.fotos?"#94a3b8":"#b54708",flexShrink:0}}
                >
                  {avanceReg.fotos} 📸
                </span>
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

