import CertificacionDetalle from "../Certificaciones/CertificacionDetalle";
import H1 from "../../components/ui/H1";
import { calcularVencimientos } from "../../lib/vencimientos";
import ListaVencimientos from "./ListaVencimientos";
import LBL from "../../components/ui/LBL";
import { RECERT_ELEMENTOS_DEFAULT, unAnoDespues } from "../Certificaciones/certConfig";
import { useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmtD, today } from "../../lib/format";
import { printCurrentPz } from "../../lib/print";
import { siguienteIdUnico } from "../../lib/identificadores";
import { useIsMobile } from "../../hooks/useMediaQuery";
export default function Vencimientos({ctx}){
  const isMobile = useIsMobile();
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
      // Propuesto a un año, igual que en una certificacion nueva. Nacia vacio
      // y ademas bloqueaba el boton de guardar hasta que alguien lo llenara.
      proxMant: unAnoDespues(today()),
      elementos: [...RECERT_ELEMENTOS_DEFAULT],
      certOrigenId: c.id,
    });
    setRecertForm(c);
  };

  const guardarRecert=()=>{
    if(!recertData.fecha||!recertData.proxMant)return;
    const newId=siguienteIdUnico(certs,"CERT");
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

  const certParaImpresion=imprimiendo?certs.find(x=>x.id===imprimiendo.id)||imprimiendo:null;

  return(
    <div
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "14px 16px 28px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {!certParaImpresion && (
        <H1
          eyebrow="CONTROL Y VIGENCIA"
          title="Vencimientos de Certificaciones"
          subtitle={`${lista.length} certificación(es) en seguimiento · Control preventivo de mantenimiento y recertificaciones`}
        />
      )}

      {/* Confirmación */}
      {guardado&&(
        <div style={{background:"rgba(34, 197, 94, 0.15)",border:"1px solid rgba(34, 197, 94, 0.3)",borderRadius:10,padding:"12px 18px",marginBottom:20,fontSize:13,color:"var(--green-700, #4ade80)",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>OK</span>
          <span>Recertificación <strong>{guardado}</strong> creada exitosamente. La certificación original fue marcada como <strong>Recertificado</strong>.</span>
        </div>
      )}

      {/* Modal de recertificación */}
      {recertForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
          <div style={{background:"var(--surface, #ffffff)",border:"1px solid var(--border, rgba(0,0,0,0.08))",borderRadius:16,padding:isMobile ? 20 : 32,width:"100%",maxWidth:580,boxShadow:"0 20px 40px -8px rgba(0,0,0,0.25)",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,letterSpacing:"-0.015em",color:"var(--text-main, #101828)"}}>Generar Recertificación</div>
                <div style={{fontSize:12,color:"var(--text-muted, #667085)",marginTop:4}}>Basada en: {recertForm.numero} · {recertForm.cliente}</div>
              </div>
              <button onClick={()=>setRecertForm(null)} style={{...B("var(--surface-subtle, #f5f5f7)","var(--text-muted, #475467)"),border:"1px solid var(--border, rgba(0,0,0,0.08))",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12}}>✕ Cerrar</button>
            </div>

            {/* Info del cert original */}
            <div style={{background:"var(--surface-subtle, #f8fafc)",borderRadius:12,padding:14,marginBottom:20,border:"1px solid var(--border, rgba(0,0,0,0.08))",fontSize:12}}>
              <div style={{color:"var(--text-muted, #667085)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600,marginBottom:4}}>Certificado original</div>
              <div style={{fontWeight:700,color:"var(--text-main, #101828)"}}>{recertForm.cliente} · {recertForm.numero}</div>
              <div style={{color:"var(--text-muted, #667085)",marginTop:2}}>{recertForm.sistema}</div>
              <div style={{color:"#ef4444",marginTop:4,fontWeight:600}}>Vencía: {fmtD(recertForm.proxMant)||"sin fecha"}</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "1fr 1fr",gap:12,marginBottom:14}}>
              <div><LBL>N° Recertificación</LBL><input value={recertData.numero||""} onChange={e=>setRecertData(p=>({...p,numero:e.target.value}))} style={SI}/></div>
              <div><LBL>Fecha de recertificación</LBL><input type="date" value={recertData.fecha||""} onChange={e=>setRecertData(p=>({...p,fecha:e.target.value}))} style={SI}/></div>
              <div><LBL>Cliente</LBL><input value={recertData.cliente||""} onChange={e=>setRecertData(p=>({...p,cliente:e.target.value}))} style={SI}/></div>
              <div><LBL>NIT</LBL><input value={recertData.nit||""} onChange={e=>setRecertData(p=>({...p,nit:e.target.value}))} style={SI}/></div>
              <div style={{gridColumn:isMobile ? "auto" : "span 2"}}><LBL>Dirección de la obra</LBL><input value={recertData.direccion||""} onChange={e=>setRecertData(p=>({...p,direccion:e.target.value}))} style={SI}/></div>
              <div style={{gridColumn:isMobile ? "auto" : "span 2"}}><LBL>Sistema recertificado</LBL><textarea value={recertData.sistema||""} onChange={e=>setRecertData(p=>({...p,sistema:e.target.value}))} rows={2} style={{...SI,resize:"vertical"}}/></div>
              <div style={{gridColumn:isMobile ? "auto" : "span 2",background:"rgba(244, 124, 32, 0.08)",borderRadius:10,padding:12,border:"1px solid rgba(244, 124, 32, 0.25)"}}>
                <LBL>Próximo mantenimiento (obligatorio)</LBL>
                <input type="date" value={recertData.proxMant||""} onChange={e=>setRecertData(p=>({...p,proxMant:e.target.value}))} style={{...SI,border:"1px solid var(--border, rgba(0,0,0,0.14))"}}/>
                {recertData.proxMant&&<div style={{fontSize:11.5,color:"#15803d",marginTop:6,fontWeight:600}}>Próximo mantenimiento: {fmtD(recertData.proxMant)}</div>}
              </div>
            </div>

            {!recertData.proxMant&&<div style={{background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.25)",borderRadius:8,padding:"8px 12px",fontSize:11.5,color:"#dc2626",marginBottom:12}}>Debes asignar la fecha del próximo mantenimiento para guardar.</div>}

            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button style={{...B("#f47c20"),boxShadow:"0 1px 3px rgba(244, 124, 32, 0.25)",flex:1,justifyContent:"center"}} onClick={guardarRecert}>
                Crear Recertificación
              </button>
              <button style={{...B("var(--surface, #ffffff)","var(--text-main, #101828)"),border:"1px solid var(--border, rgba(0,0,0,0.12))",flex:1,justifyContent:"center"}} onClick={()=>setRecertForm(null)}>
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
          mostrarBotones={true}
          subtitle="Vista previa completa del certificado o recertificación."
        />
      )}

      {!certParaImpresion&&(
        <>
          {/* Los cuatro grupos de antes -vencidas, urgente, proximas, al
              dia- y el bloque de "sin fecha" son ahora las pestañas de
              arriba: se ve cuantas hay en cada uno sin bajar por los cuatro. */}
          <ListaVencimientos
            lista={lista}
            obras={obras}
            acciones={{
              recertificar: (c)=>abrirRecert(certs.find((x)=>x.id===c.id) || c),
              verPdf: (c)=>setImprimiendo(certs.find((x)=>x.id===c.id) || c),
            }}
          />
        </>
      )}
    </div>
  );
}

