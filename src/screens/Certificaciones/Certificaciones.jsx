import Badge from "../../components/ui/Badge";
import CertificacionDetalle from "./CertificacionDetalle";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { buildCertForm, getCertDefaultElements } from "./certConfig";
import { fmtD } from "../../lib/format";
import { printCurrentPz } from "../../lib/print";
export default function Certificaciones({ctx}){
  const {certs,setCerts,obras}=ctx;
  const [sel,setSel]=useState(null);
  const [nueva,setNueva]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(buildCertForm());
  const [nuevoElem,setNuevoElem]=useState("");

  const abrirNuevaCertificacion = (tipo="Certificación")=>{
    setEditId(null);
    setNuevoElem("");
    setForm(buildCertForm({tipo, elementos:getCertDefaultElements(tipo)}));
    setNueva(true);
  };

  const editarCertificacion = (cert)=>{
    setEditId(cert.id);
    setNuevoElem("");
    setForm(buildCertForm(cert));
    setNueva(true);
    setSel(cert);
  };

  const guardar=()=>{
    const c=editId
      ? {...form,id:editId,estado:form.estado||"Vigente"}
      : {id:"CERT-" + (String(certs.length+1).padStart(3,"0")),estado:"Vigente",...form};
    setCerts(prev=>editId ? prev.map(item=>item.id===editId?{...item,...c}:item) : [...prev,c]);
    setNueva(false);
    setSel(c);
    setEditId(null);
  };

  const imprimir=(c)=>{setSel(c);setTimeout(()=>printCurrentPz("Certificación " + (c?.numero || c?.id || "")),250);};

  return(
    <div style={{padding:28}}>
      <H1 title="Certificaciones" subtitle="Certificados y recertificaciones de sistemas anticaídas · Res. 4272/2021"
        action={
          <div style={{display:"flex",gap:8}}>
            <button style={B("#f47c20")} onClick={()=>abrirNuevaCertificacion("Certificación")}>+ Nueva Certificación</button>
            <button style={{...B("#4ade80","#0f2d1a"),border:"1px solid #166534"}} onClick={()=>abrirNuevaCertificacion("Recertificación")}>+ Nueva Recertificación</button>
          </div>
        }/>

      {nueva&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #cc0000"}}>
          <div style={ST}>{editId ? "Editar Certificación / Recertificación" : "Nueva Certificación / Recertificación"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
            <div><LBL>Tipo</LBL><select value={form.tipo} onChange={e=>{
              const t=e.target.value;
              setForm({...form,tipo:t,elementos:getCertDefaultElements(t, form.tipoSistema)});
            }} style={SI}>{["Certificación","Recertificación"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><LBL>Sistema certificado</LBL><select value={form.tipoSistema||""} onChange={e=>{
              const s=e.target.value;
              setForm({...form,tipoSistema:s,elementos:getCertDefaultElements(form.tipo, s)});
            }} style={SI}>
              <option value="">Seleccionar tipo de sistema...</option>
              {["Líneas de vida horizontales","Puntos de anclaje","Escalera fija","Línea de vida vertical"].map(s=><option key={s}>{s}</option>)}
            </select></div>
            <div><LBL>Número</LBL><input value={form.numero} onChange={e=>setForm({...form,numero:e.target.value})} placeholder="C-2026-001" style={SI}/></div>
            <div><LBL>Fecha</LBL><input type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})} style={SI}/></div>
            <div><LBL>Obra asociada</LBL><select value={form.obraId} onChange={e=>{const o=obras.find(x=>x.id===e.target.value);setForm({...form,obraId:e.target.value,cliente:o?.cliente||"",direccion:o?.direccion||""});}} style={SI}>{obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
            <div><LBL>Cliente</LBL><input value={form.cliente} onChange={e=>setForm({...form,cliente:e.target.value})} style={SI}/></div>
            <div><LBL>NIT</LBL><input value={form.nit} onChange={e=>setForm({...form,nit:e.target.value})} style={SI}/></div>
            <div style={{gridColumn:"span 2"}}><LBL>Dirección de la obra</LBL><input value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})} style={SI}/></div>
            <div><LBL>Próximo mantenimiento</LBL><input type="date" value={form.proxMant} onChange={e=>setForm({...form,proxMant:e.target.value})} style={SI}/></div>
          </div>
          <div style={{marginBottom:12}}><LBL>Sistema certificado</LBL><textarea value={form.sistema} onChange={e=>setForm({...form,sistema:e.target.value})} rows={2} placeholder="Ej: 23 Líneas de vida horizontales con sus conectoras instaladas sobre las cubiertas..." style={{...SI,resize:"vertical"}}/></div>
          <div style={{marginBottom:12}}>
            <LBL>Elementos utilizados</LBL>
            {form.elementos.map((el,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                <input value={el} onChange={e=>setForm({...form,elementos:form.elementos.map((x,j)=>j===i?e.target.value:x)})} style={{...SI,fontSize:12}} />
                <button onClick={()=>setForm({...form,elementos:form.elementos.filter((_,j)=>j!==i)})} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:14,flexShrink:0}}>×</button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:6}}>
              <input value={nuevoElem} onChange={e=>setNuevoElem(e.target.value)} placeholder="Agregar elemento..." style={{...SI,fontSize:12}}/>
              <button onClick={()=>{if(nuevoElem){setForm({...form,elementos:[...form.elementos,nuevoElem]});setNuevoElem("");}}} style={{...B("#fff3e8","#f47c20"),border:"1px dashed #cc0000",flexShrink:0}}>+</button>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button style={B("#4ade80","#0f2d1a")} onClick={guardar}>{editId ? "Guardar cambios" : "Guardar certificación"}</button>
            <button style={B("#f1f5f9","#475569")} onClick={()=>{setNueva(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}

      {!sel&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,alignContent:"start"}}>
          {certs.map(c=>(
            <div key={c.id} style={{...CD,border:"1px solid " + (sel?.id===c.id?"#f47c20":"#1a3050"),cursor:"pointer"}} onClick={()=>setSel(c)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:11,color:"#64748b"}}>{c.id} · {c.numero}</div>
                  <div style={{fontSize:14,fontWeight:700,marginTop:2}}>{c.cliente}</div>
                  <div style={{fontSize:11,color:"#475569"}}>{c.tipo}</div>
                </div>
                <Badge estado={c.estado}/>
              </div>
              <div style={{fontSize:11,color:"#64748b",marginBottom:6}}>{c.direccion}</div>
              <div style={{fontSize:11,color:"#475569",marginBottom:10,lineHeight:1.5}}>{c.sistema}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div style={{background:"#f1f5f9",borderRadius:6,padding:"6px 10px"}}><div style={{fontSize:9,color:"#64748b"}}>Fecha certif.</div><div style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>{fmtD(c.fecha)}</div></div>
                <div style={{background:"#f1f5f9",borderRadius:6,padding:"6px 10px"}}><div style={{fontSize:9,color:"#64748b"}}>Próx. mantto.</div><div style={{fontSize:12,fontWeight:600,color:"#fb923c"}}>{fmtD(c.proxMant)||"-"}</div></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={{...B("#f47c20"),flex:1,justifyContent:"center",fontSize:12}} onClick={e=>{e.stopPropagation();setSel(c);}}>Ver</button>
                <button style={{...B("#dbeafe","#1e40af"),flex:1,justifyContent:"center",fontSize:12}} onClick={e=>{e.stopPropagation();editarCertificacion(c);}}>Editar</button>
                <button style={{...B("#e8f5ee","#166534"),flex:1,justifyContent:"center",fontSize:12}} onClick={e=>{e.stopPropagation();imprimir(c);}}>Imprimir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sel&&(
        <CertificacionDetalle
          cert={sel}
          onVolver={()=>setSel(null)}
          onEditar={editarCertificacion}
          onImprimir={imprimir}
          subtitle="Vista previa completa para revisar, editar e imprimir."
        />
      )}
    </div>
  );
}

// ======================================================
// INFORMES DE ACTIVIDADES
// ======================================================

