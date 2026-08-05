import AvisoFlujo from "../../components/AvisoFlujo";
import Badge from "../../components/ui/Badge";
import CertificacionDetalle from "./CertificacionDetalle";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useEffect, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { buildCertForm, construirTextoSistema, getCertDefaultElements } from "./certConfig";
import { fmt, fmtD, fmtL } from "../../lib/format";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";
import { getEstadoFlujoObra } from "../../lib/flujoObra";
import { printCurrentPz } from "../../lib/print";
export default function Certificaciones({ctx}){
  const {certs,setCerts,obras,clientes,cotizaciones,intencion,limpiarIntencion,irAPantalla}=ctx;
  const [sel,setSel]=useState(null);
  // Obra que llega desde el detalle de obra ("Crear certificación").
  const obraSolicitada = intencion?.pantalla==="certificaciones" ? intencion.obraId : null;
  const obraInicial = obras.find((x)=>x.id===obraSolicitada) || obras[0] || null;
  // El NIT no se escribe a mano: ya esta en algun lado del sistema. Se busca
  // en la propia obra, luego en la ficha del cliente y por ultimo en la
  // cotizacion que dio origen a la obra. Se compara por razon social
  // acomodada, para que "Proco Inc" encuentre a "PROCO INC".
  const buscarNit=(obra,clienteTexto)=>{
    if(obra?.nit) return obra.nit;
    const nombre=normalizarRazonSocial(clienteTexto || obra?.cliente || "");
    if(!nombre) return "";

    const ficha=(clientes||[]).find((c)=>normalizarRazonSocial(c.nombre)===nombre);
    if(ficha?.nit) return ficha.nit;

    const vinculada=obra?.cotizacionId
      ? (cotizaciones||[]).find((c)=>c.id===obra.cotizacionId)
      : null;
    if(vinculada?.nit) return vinculada.nit;

    const porNombre=(cotizaciones||[]).find((c)=>normalizarRazonSocial(c.cliente)===nombre && c.nit);
    return porNombre?.nit || "";
  };

  const [nueva,setNueva]=useState(()=>Boolean(obraSolicitada));
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(()=>buildCertForm({
    elementos:getCertDefaultElements("Certificación"),
    obraId: obraInicial?.id || "",
    cliente: obraInicial?.cliente || "",
    direccion: obraInicial?.direccion || obraInicial?.ciudad || "",
    nit: buscarNit(obraInicial),
  }));

  // Se descarta al salir, para que al volver por el menu no se reabra.
  useEffect(()=>()=>limpiarIntencion(),[limpiarIntencion]);
  const [nuevoElem,setNuevoElem]=useState("");

  // Cambia algo del encabezado -tipo, sistema, cantidad, cliente, dirección o
  // fecha- y el párrafo se rehace. Solo mientras nadie lo haya editado a mano:
  // en cuanto se toca, manda lo escrito y esto deja de pisarlo.
  const aplicarCambio=(patch)=>{
    setForm((prev)=>{
      const siguiente={...prev,...patch};
      if(siguiente.sistemaAuto!==false){
        const texto=construirTextoSistema({
          tipo:siguiente.tipo,
          tipoSistema:siguiente.tipoSistema,
          cantidad:siguiente.cantidad,
          cliente:siguiente.cliente,
          direccion:siguiente.direccion,
          fechaLarga:fmtL(siguiente.fecha),
        });
        if(texto) siguiente.sistema=texto;
      }
      return siguiente;
    });
  };

  const rehacerTexto=()=>{
    const texto=construirTextoSistema({
      tipo:form.tipo,
      tipoSistema:form.tipoSistema,
      cantidad:form.cantidad,
      cliente:form.cliente,
      direccion:form.direccion,
      fechaLarga:fmtL(form.fecha),
    });
    if(!texto){
      window.alert("Para armar el texto hacen falta la cantidad y el cliente.");
      return;
    }
    setForm((prev)=>({...prev,sistema:texto,sistemaAuto:true}));
  };

  // Al abrir una certificacion nueva se preselecciona la primera obra real
  // y se traen sus datos, para no tener que reescribir cliente y direccion.
  const abrirNuevaCertificacion = (tipo="Certificación", obraId=null)=>{
    const obra = obras.find((x)=>x.id===obraId) || obras[0] || null;
    setEditId(null);
    setNuevoElem("");
    setForm(buildCertForm({
      tipo,
      elementos:getCertDefaultElements(tipo),
      obraId: obra?.id || "",
      cliente: obra?.cliente || "",
      direccion: obra?.direccion || obra?.ciudad || "",
      nit: buscarNit(obra),
    }));
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

  // Estado de la obra elegida en el formulario, para avisar en el momento
  // justo si todavia no esta lista para certificar.
  const obraDelForm = obras.find((o)=>o.id===form.obraId) || null;
  const flujo = obraDelForm ? getEstadoFlujoObra(obraDelForm) : null;
  const faltantesObra = [];
  if(flujo && !flujo.estaTerminada) faltantesObra.push(`la obra va en ${flujo.avance}% y no está marcada como finalizada`);
  if(flujo && !flujo.estaPagada) faltantesObra.push(`queda un saldo por cobrar de ${fmt(flujo.saldo)}`);

  return(
    <div style={{padding:28}}>
      <H1 title="Certificaciones" subtitle="Certificados y recertificaciones de sistemas anticaídas · Res. 4272/2021"
        action={
          <div style={{display:"flex",gap:8}}>
            <button style={B("#2b2622")} onClick={()=>abrirNuevaCertificacion("Certificación")}>+ Nueva Certificación</button>
            <button style={{...B("#2b2622","#ffffff"),border:"1px solid #027a48"}} onClick={()=>abrirNuevaCertificacion("Recertificación")}>+ Nueva Recertificación</button>
          </div>
        }/>

      {obras.length===0 ? (
        <AvisoFlujo
          tono="falta"
          titulo="Primero hay que aprobar la obra"
          pasos={[
            "Ve a Cotizaciones y abre la cotización que el cliente aceptó.",
            "Dale «Aprobar». El sistema crea la obra solo, con el mismo número.",
            "Cuando terminen el trabajo, vuelve aquí y genera el certificado.",
          ]}
          accion={
            <button
              onClick={()=>irAPantalla("cotizacion")}
              style={{...B("#2b2622"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}
            >
              Ir a Cotizaciones
            </button>
          }
        >
          Todavía no hay obras en el sistema, y el certificado se genera a partir de una obra.
        </AvisoFlujo>
      ) : (
        <AvisoFlujo
          tono="info"
          titulo="Recuerda: el certificado sale de una obra aprobada"
        >
          No hay que escribir nada dos veces. Al aprobar la cotización se crea la obra,
          y el certificado toma de ahí el cliente, la dirección y el trabajo hecho.
        </AvisoFlujo>
      )}

      {nueva&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #e8dfd2"}}>
          <div style={ST}>{editId ? "Editar Certificación / Recertificación" : "Nueva Certificación / Recertificación"}</div>

          {obraDelForm && faltantesObra.length>0 && (
            <AvisoFlujo
              tono="falta"
              titulo={`La obra ${obraDelForm.id} todavía no está lista para certificar`}
              accion={
                <button
                  onClick={()=>irAPantalla("obras",{obraId:obraDelForm.id})}
                  style={{...B("#f4eee4","#574e44"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}
                >
                  Abrir la obra
                </button>
              }
            >
              Puedes seguir y guardarla igual, pero ten en cuenta que {faltantesObra.join(" y ")}.
              Según las condiciones de la cotización, el certificado se entrega con el pago total.
            </AvisoFlujo>
          )}
          {obraDelForm && faltantesObra.length===0 && (
            <AvisoFlujo tono="listo" titulo={`La obra ${obraDelForm.id} está terminada y pagada`}>
              Todo en orden para entregar el certificado.
            </AvisoFlujo>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
            <div><LBL>Tipo</LBL><select value={form.tipo} onChange={e=>{
              const t=e.target.value;
              aplicarCambio({tipo:t,elementos:getCertDefaultElements(t, form.tipoSistema)});
            }} style={SI}>{["Certificación","Recertificación"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><LBL>Tipo de sistema</LBL><select value={form.tipoSistema||""} onChange={e=>{
              const s=e.target.value;
              aplicarCambio({tipoSistema:s,elementos:getCertDefaultElements(form.tipo, s)});
            }} style={SI}>
              <option value="">Seleccionar tipo de sistema...</option>
              {["Líneas de vida horizontales","Puntos de anclaje","Escalera fija","Línea de vida vertical"].map(s=><option key={s}>{s}</option>)}
            </select></div>
            <div><LBL>Cantidad</LBL>
              <input type="number" min={0} value={form.cantidad ?? ""} onChange={e=>aplicarCambio({cantidad:e.target.value})} placeholder="26" style={SI}/>
              <div style={{fontSize:10.5,color:"#a2988a",marginTop:3}}>
                {form.tipoSistema?.includes("línea") || form.tipoSistema?.includes("Línea")
                  ? "Metros instalados."
                  : "Cuántos puntos o unidades se certifican."}
              </div>
            </div>
            <div><LBL>Número</LBL><input value={form.numero} onChange={e=>setForm({...form,numero:e.target.value})} placeholder="C-2026-001" style={SI}/></div>
            <div><LBL>Fecha</LBL><input type="date" value={form.fecha} onChange={e=>aplicarCambio({fecha:e.target.value})} style={SI}/></div>
            <div><LBL>Obra asociada</LBL>{!obras.length && <div style={{fontSize:10.5,color:"#b54708",marginBottom:4}}>No hay obras. Aprueba una cotización para crear la obra.</div>}<select value={form.obraId} onChange={e=>{const o=obras.find(x=>x.id===e.target.value);aplicarCambio({obraId:e.target.value,cliente:o?.cliente||"",direccion:o?.direccion||o?.ciudad||"",nit:buscarNit(o)});}} style={SI}>{obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
            <div><LBL>Cliente</LBL><input value={form.cliente} onChange={e=>aplicarCambio({cliente:e.target.value})} onBlur={e=>{
              const nombre=normalizarRazonSocial(e.target.value);
              // Si el NIT esta vacio se busca el de ese cliente; si ya hay uno
              // escrito no se pisa, que puede ser una sede o un caso especial.
              const nit=form.nit || buscarNit(null,nombre);
              aplicarCambio({cliente:nombre,nit});
            }} style={SI}/></div>
            <div><LBL>NIT</LBL><input value={form.nit} onChange={e=>setForm({...form,nit:e.target.value})} style={SI}/></div>
            <div style={{gridColumn:"span 2"}}><LBL>Dirección de la obra</LBL><input value={form.direccion} onChange={e=>aplicarCambio({direccion:e.target.value})} style={SI}/></div>
            <div><LBL>Próximo mantenimiento</LBL><input type="date" value={form.proxMant} onChange={e=>setForm({...form,proxMant:e.target.value})} style={SI}/></div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <LBL>Sistema certificado</LBL>
              <button onClick={rehacerTexto} style={{...B("#f4eee4","#574e44"),fontSize:11,padding:"5px 11px"}}>
                ↻ Rehacer con los datos de arriba
              </button>
            </div>
            <textarea
              value={form.sistema}
              onChange={e=>setForm({...form,sistema:e.target.value,sistemaAuto:false})}
              rows={4}
              placeholder="Se arma solo al llenar el tipo, el sistema, la cantidad y el cliente. También puedes escribirlo a mano."
              spellCheck lang="es"
              style={{...SI,resize:"vertical"}}
            />
            <div style={{fontSize:10.5,color:"#a2988a",marginTop:3}}>
              {form.sistemaAuto===false
                ? "Lo estás escribiendo a mano, así que ya no se rehace solo. Usa el botón para volver al texto automático."
                : "Se actualiza solo con lo que elijas arriba. En cuanto lo edites, deja de hacerlo."}
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <LBL>Elementos utilizados</LBL>
            {form.elementos.map((el,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                <input value={el} onChange={e=>setForm({...form,elementos:form.elementos.map((x,j)=>j===i?e.target.value:x)})} style={{...SI,fontSize:12}} />
                <button onClick={()=>setForm({...form,elementos:form.elementos.filter((_,j)=>j!==i)})} style={{background:"#f9e9e4",border:"none",color:"#cc0000",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:14,flexShrink:0}}>×</button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:6}}>
              <input value={nuevoElem} onChange={e=>setNuevoElem(e.target.value)} placeholder="Agregar elemento..." style={{...SI,fontSize:12}}/>
              <button onClick={()=>{if(nuevoElem){setForm({...form,elementos:[...form.elementos,nuevoElem]});setNuevoElem("");}}} style={{...B("#f4eee4","#2b2622"),border:"1px dashed #cc0000",flexShrink:0}}>+</button>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button style={B("#2b2622","#ffffff")} onClick={guardar}>{editId ? "Guardar cambios" : "Guardar certificación"}</button>
            <button style={B("#f4eee4","#574e44")} onClick={()=>{setNueva(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Se esconde mientras se esta llenando una certificacion: la pantalla se
          dedica al formulario y no a las que ya estan hechas. */}
      {!sel&&!nueva&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,alignContent:"start"}}>
          {certs.map(c=>(
            <div key={c.id} style={{...CD,border:"1px solid " + (sel?.id===c.id?"#2b2622":"#e8dfd2"),cursor:"pointer"}} onClick={()=>setSel(c)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:11,color:"#756a5e"}}>{c.id} · {c.numero}</div>
                  <div style={{fontSize:14,fontWeight:700,marginTop:2}}>{c.cliente}</div>
                  <div style={{fontSize:11,color:"#574e44"}}>{c.tipo}</div>
                </div>
                <Badge estado={c.estado}/>
              </div>
              <div style={{fontSize:11,color:"#756a5e",marginBottom:6}}>{c.direccion}</div>
              <div style={{fontSize:11,color:"#574e44",marginBottom:10,lineHeight:1.5}}>{c.sistema}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div style={{background:"#f4eee4",borderRadius:6,padding:"6px 10px"}}><div style={{fontSize:9,color:"#756a5e"}}>Fecha certif.</div><div style={{fontSize:12,fontWeight:600,color:"#2b2622"}}>{fmtD(c.fecha)}</div></div>
                <div style={{background:"#f4eee4",borderRadius:6,padding:"6px 10px"}}><div style={{fontSize:9,color:"#756a5e"}}>Próx. mantto.</div><div style={{fontSize:12,fontWeight:600,color:"#fb923c"}}>{fmtD(c.proxMant)||"-"}</div></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={{...B("#2b2622"),flex:1,justifyContent:"center",fontSize:12}} onClick={e=>{e.stopPropagation();setSel(c);}}>Ver</button>
                <button style={{...B("#f4eee4","#574e44"),flex:1,justifyContent:"center",fontSize:12}} onClick={e=>{e.stopPropagation();editarCertificacion(c);}}>Editar</button>
                <button style={{...B("#f4eee4","#027a48"),flex:1,justifyContent:"center",fontSize:12}} onClick={e=>{e.stopPropagation();imprimir(c);}}>Imprimir</button>
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

