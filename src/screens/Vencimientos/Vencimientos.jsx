import CertificacionDetalle from "../Certificaciones/CertificacionDetalle";
import H1 from "../../components/ui/H1";
import { calcularVencimientos, colorVencimiento, etiquetaVencimiento, GRUPOS_VENCIMIENTO } from "../../lib/vencimientos";
import LBL from "../../components/ui/LBL";
import { RECERT_ELEMENTOS_DEFAULT } from "../Certificaciones/certConfig";
import { useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmtD, today } from "../../lib/format";
import { printCurrentPz } from "../../lib/print";
export default function Vencimientos({ctx}){
  const {certs,setCerts,obras}=ctx;
  const hoy=new Date();

  const [recertForm,setRecertForm]=useState(null);   // cert base para generar recertificación
  const [recertData,setRecertData]=useState({});      // datos editables del nuevo cert
  const [imprimiendo,setImprimiendo]=useState(null);  // cert para imprimir
  const [guardado,setGuardado]=useState(null);        // confirmación

  const abrirRecert=(c)=>{
    // Pre-llena el formulario con los datos del certificado original
    setRecertData({
      obraId: c.obraId,
      tipo: "Recertificación",
      numero: "R-" + (new Date().getFullYear()) + "-" + (String(certs.length+1).padStart(3,"0")),
      fecha: today(),
      cliente: c.cliente,
      nit: c.nit||"",
      direccion: c.direccion||"",
      sistema: c.sistema,
      normativa: c.normativa||"Resolución 4272 de 2021",
      ingeniero: c.ingeniero||"ING. JHON JAIME SEPULVEDA LONDOÑO",
      matricula: c.matricula||"MP. 05256-409949",
      proxMant: "",
      elementos: [...RECERT_ELEMENTOS_DEFAULT],
      certOrigenId: c.id,
    });
    setRecertForm(c);
  };

  const guardarRecert=()=>{
    if(!recertData.fecha||!recertData.proxMant)return;
    const newId="CERT-" + (String(certs.length+1).padStart(3,"0"));
    const nuevaCert={id:newId,...recertData,estado:"Vigente"};
    // Marca la cert anterior como "Recertificado" y guarda nueva fecha
    setCerts(p=>[
      ...p.map(x=>x.id===recertForm.id?{...x,estado:"Recertificado",proxMant:recertData.proxMant}:x),
      nuevaCert
    ]);
    setGuardado(newId);
    setImprimiendo(nuevaCert);
    setRecertForm(null);
    setRecertData({});
    setTimeout(()=>setGuardado(null),4000);
  };

  // Las reglas de vencimiento viven en lib/vencimientos.js para que el
  // Dashboard avise con los mismos umbrales.
  const lista = calcularVencimientos(certs, hoy);
  const colorV = colorVencimiento;
  const labelV = etiquetaVencimiento;
  const grupos = GRUPOS_VENCIMIENTO;

  const certParaImpresion=imprimiendo?certs.find(x=>x.id===imprimiendo.id)||imprimiendo:null;

  return(
    <div style={{padding:28}}>
      <H1 title="Vencimientos de Certificaciones" subtitle="Control de mantenimientos y renovaciones · Res. 4272/2021"/>

      {/* Confirmación */}
      {guardado&&(
        <div style={{background:"#f2f4f7",border:"1px solid #101828",borderRadius:10,padding:"12px 18px",marginBottom:20,fontSize:13,color:"#027a48",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>OK</span>
          <span>Recertificación <strong>{guardado}</strong> creada exitosamente. La certificación original fue marcada como <strong>Recertificado</strong>.</span>
        </div>
      )}

      {/* Modal de recertificación */}
      {recertForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
          <div style={{background:"#fff",borderRadius:16,padding:32,width:"100%",maxWidth:580,boxShadow:"0 20px 60px rgba(0,0,0,0.35)",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:"#101828"}}>Generar Recertificación</div>
                <div style={{fontSize:12,color:"#667085",marginTop:4}}>Basada en: {recertForm.numero} · {recertForm.cliente}</div>
              </div>
              <button onClick={()=>setRecertForm(null)} style={{background:"#f2f4f7",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#475467",fontSize:13}}>Cerrar</button>
            </div>

            {/* Info del cert original */}
            <div style={{background:"#fafafa",borderRadius:10,padding:12,marginBottom:20,border:"1px solid #eaecf0",fontSize:12}}>
              <div style={{color:"#667085",marginBottom:4}}>Certificado original</div>
              <div style={{fontWeight:700,color:"#101828"}}>{recertForm.cliente} · {recertForm.numero}</div>
              <div style={{color:"#475467"}}>{recertForm.sistema}</div>
              <div style={{color:"#cc0000",marginTop:4}}>Vencía: {fmtD(recertForm.proxMant)||"sin fecha"}</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div><LBL>N° Recertificación</LBL><input value={recertData.numero||""} onChange={e=>setRecertData(p=>({...p,numero:e.target.value}))} style={SI}/></div>
              <div><LBL>Fecha de recertificación</LBL><input type="date" value={recertData.fecha||""} onChange={e=>setRecertData(p=>({...p,fecha:e.target.value}))} style={SI}/></div>
              <div><LBL>Cliente</LBL><input value={recertData.cliente||""} onChange={e=>setRecertData(p=>({...p,cliente:e.target.value}))} style={SI}/></div>
              <div><LBL>NIT</LBL><input value={recertData.nit||""} onChange={e=>setRecertData(p=>({...p,nit:e.target.value}))} style={SI}/></div>
              <div style={{gridColumn:"span 2"}}><LBL>Dirección de la obra</LBL><input value={recertData.direccion||""} onChange={e=>setRecertData(p=>({...p,direccion:e.target.value}))} style={SI}/></div>
              <div style={{gridColumn:"span 2"}}><LBL>Sistema recertificado</LBL><textarea value={recertData.sistema||""} onChange={e=>setRecertData(p=>({...p,sistema:e.target.value}))} rows={2} style={{...SI,resize:"vertical"}}/></div>
              <div style={{gridColumn:"span 2",background:"#f2f4f7",borderRadius:8,padding:12,border:"1px solid #eaecf0"}}>
                <LBL>Próximo mantenimiento (obligatorio)</LBL>
                <input type="date" value={recertData.proxMant||""} onChange={e=>setRecertData(p=>({...p,proxMant:e.target.value}))} style={{...SI,border:"1px solid #eaecf0"}}/>
                {recertData.proxMant&&<div style={{fontSize:11,color:"#101828",marginTop:6}}>Próximo mantenimiento: <strong>{fmtD(recertData.proxMant)}</strong></div>}
              </div>
            </div>

            {!recertData.proxMant&&<div style={{background:"#feecec",borderRadius:6,padding:"8px 12px",fontSize:11,color:"#cc0000",marginBottom:12}}>Debes asignar la fecha del próximo mantenimiento para guardar.</div>}

            <div style={{display:"flex",gap:10}}>
              <button style={{...B("#101828"),flex:1,justifyContent:"center"}} onClick={guardarRecert}>
                Crear Recertificación
              </button>
              <button style={{...B("#f2f4f7","#475467"),flex:1,justifyContent:"center"}} onClick={()=>setRecertForm(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {certParaImpresion&&(
        <CertificacionDetalle
          cert={certParaImpresion}
          onVolver={()=>setImprimiendo(null)}
          onImprimir={(cert)=>printCurrentPz("Certificación " + (cert?.numero || cert?.id || ""))}
          subtitle="Vista previa completa del certificado o recertificación."
        />
      )}

      {!certParaImpresion&&(
        <>
          {/* ── GRUPOS POR ESTADO ── */}
          {grupos.map(g=>{
            const items=lista.filter(c=>g.filtro(c.diasRestantes));
            if(!items.length)return null;
            return(
              <div key={g.titulo} style={{...CD,marginBottom:20,borderLeft:"4px solid " + (g.color)}}>
                <div style={{...ST,color:g.color,borderBottomColor:g.color+"33"}}>{g.titulo}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  {items.map(c=>{
                    const cActual=certs.find(x=>x.id===c.id)||c;
                    const dActual=(()=>{
                      if(!cActual.proxMant)return null;
                      const d=new Date(cActual.proxMant+"T12:00:00");
                      return Math.round((d-hoy)/(1000*60*60*24));
                    })();
                    const ob=obras.find(o=>o.id===cActual.obraId);
                    return(
                      <div key={cActual.id}
                        style={{background:"#fafafa",borderRadius:10,padding:"14px 16px",border:"1px solid " + (colorV(dActual)) + "44",cursor:dActual!==null&&dActual<0?"pointer":"default",transition:"box-shadow 0.15s"}}
                        onClick={dActual!==null&&dActual<0?(()=>abrirRecert(cActual)):undefined}
                        onMouseEnter={dActual!==null&&dActual<0?(e=>e.currentTarget.style.boxShadow="0 0 0 3px #ef444433"):undefined}
                        onMouseLeave={dActual!==null&&dActual<0?(e=>e.currentTarget.style.boxShadow="none"):undefined}
                        title={dActual!==null&&dActual<0?"Clic para recertificar":undefined}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                          <div>
                            <div style={{fontSize:10,color:"#667085"}}>{cActual.id} · {cActual.numero}</div>
                            <div style={{fontSize:14,fontWeight:700,color:"#101828",marginTop:2}}>{cActual.cliente}</div>
                            <div style={{fontSize:11,color:"#475467"}}>{cActual.tipo}</div>
                            {dActual!==null&&dActual<0&&(
                              <div style={{background:"#ef444422",border:"1px solid #eaecf0",borderRadius:6,padding:"3px 8px",marginTop:6,fontSize:10,color:"#cc0000",fontWeight:700,display:"inline-block"}}>
                                Clic para recertificar
                              </div>
                            )}
                          </div>
                          <div style={{background:colorV(dActual)+"22",border:"2px solid " + (colorV(dActual)),borderRadius:10,padding:"8px 12px",textAlign:"center",minWidth:72}}>
                            <div style={{fontSize:20,fontWeight:900,color:colorV(dActual),lineHeight:1}}>
                              {dActual===null?"—":dActual<0?Math.abs(dActual):dActual}
                            </div>
                            <div style={{fontSize:9,color:colorV(dActual),fontWeight:600,marginTop:2}}>
                              {dActual===null?"sin fecha":dActual<0?"días vencida":"días restantes"}
                            </div>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                          <div style={{background:"#fff",borderRadius:6,padding:"7px 10px"}}>
                            <div style={{fontSize:9,color:"#667085"}}>Certificado</div>
                            <div style={{fontSize:11,fontWeight:600}}>{fmtD(cActual.fecha)}</div>
                          </div>
                          <div style={{background:"#fff",borderRadius:6,padding:"7px 10px"}}>
                            <div style={{fontSize:9,color:"#667085"}}>Próx. mantenimiento</div>
                            <div style={{fontSize:11,fontWeight:600,color:colorV(dActual)}}>{fmtD(cActual.proxMant)||"—"}</div>
                          </div>
                        </div>
                        <div style={{fontSize:11,color:"#475467",marginBottom:8,lineHeight:1.4}}>{cActual.sistema}</div>
                        {ob&&<div style={{fontSize:10,color:"#667085",marginBottom:10}}>{ob.direccion||ob.ciudad}</div>}
                        <div style={{background:colorV(dActual)+"18",border:"1px solid " + (colorV(dActual)) + "44",borderRadius:8,padding:"6px 10px",textAlign:"center",marginBottom:10}}>
                          <div style={{fontSize:12,fontWeight:700,color:colorV(dActual)}}>{labelV(dActual)}</div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button
                            style={{...B(dActual!==null&&dActual<0?"#7c1010":"#cc0000"),fontSize:11,padding:"7px 10px",flex:1,justifyContent:"center",border:dActual!==null&&dActual<0?"2px solid #cc0000":"none"}}
                            onClick={(event)=>{event.stopPropagation();abrirRecert(cActual);}}>
                            {dActual!==null&&dActual<0 ? "Recertificar ahora" : "Generar recertificación"}
                          </button>
                          <button
                            style={{...B("#f2f4f7","#027a48"),border:"1px solid #101828",fontSize:11,padding:"7px 10px",flex:"0 0 auto",justifyContent:"center"}}
                            onClick={(event)=>{event.stopPropagation();setImprimiendo(cActual);}}>
                            Ver PDF
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── SIN FECHA ── */}
          {lista.filter(c=>c.diasRestantes===null).length>0&&(
            <div style={{...CD,borderLeft:"4px solid #667085"}}>
              <div style={{...ST,color:"#667085"}}>Sin fecha de mantenimiento asignada</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {lista.filter(c=>c.diasRestantes===null).map(c=>(
                  <div key={c.id} style={{background:"#fafafa",borderRadius:10,padding:"14px 16px",border:"1px solid #eaecf0"}}>
                    <div style={{fontSize:10,color:"#667085"}}>{c.id} · {c.numero}</div>
                    <div style={{fontSize:14,fontWeight:700}}>{c.cliente}</div>
                    <div style={{fontSize:11,color:"#475467",marginBottom:12}}>{c.tipo} · {fmtD(c.fecha)}</div>
                    <div style={{display:"flex",gap:6}}>
                      <button style={{...B("#101828"),fontSize:11,flex:1,justifyContent:"center"}} onClick={()=>abrirRecert(c)}>
                        Generar recertificación
                      </button>
                      <button style={{...B("#f2f4f7","#027a48"),border:"1px solid #101828",fontSize:11,flex:"0 0 auto",justifyContent:"center"}} onClick={()=>setImprimiendo(c)}>
                        Ver PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

