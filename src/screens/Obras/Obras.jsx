import AvisoFlujo from "../../components/AvisoFlujo";
import Badge from "../../components/ui/Badge";
import CampoTexto from "../../components/ui/CampoTexto";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import ObraDetalle from "./ObraDetalle";
import { useEffect, useState } from "react";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import { B, CD, SI, ST } from "../../styles/tokens";
import { today } from "../../lib/format";
import { getQuoteApprovalAccountingSnapshot } from "../../lib/cotizaciones";
import { ESTADOS_OBRA, estadoSegunAvance, obraEstaCerrada } from "../../lib/flujoObra";
import { esAdmin } from "../../lib/permisos";
import ListaObras from "./ListaObras";
import { avisoCelular, normalizarMayusculas, normalizarRazonSocial, normalizarTelefono } from "../../lib/normalizarEntrada";

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
  const {obras,setObras,cotizaciones,intencion,limpiarIntencion,membresia,asegurarDetalle}=ctx;
  // Una obra entregada la reabre solo un administrador. Aqui se decide una
  // vez y baja a la lista y al detalle.
  const puedeDesbloquear = esAdmin(membresia);
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

  // Comprueba el bloqueo aunque la pantalla ya lo esconda: la funcion
  // se puede seguir llamando desde otro sitio, y el dato es el mismo.
  const updEst=(id,e)=>setObras(p=>p.map((o)=>{
    if(o.id!==id) return o;
    if(obraEstaCerrada(o) && !puedeDesbloquear) return o;
    return {...o,estado:e};
  }));

  const guardarObra=()=>{
    if(!nob.cliente.trim()){
      window.alert("Falta el nombre del cliente. Es lo único obligatorio para crear la obra.");
      return;
    }
    const clienteLimpio=normalizarRazonSocial(nob.cliente);
    const yaExiste=obras.find((o)=>normalizarRazonSocial(o.cliente)===clienteLimpio && normalizarMayusculas(o.proyecto)===normalizarMayusculas(nob.proyecto));
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
      proyecto:normalizarMayusculas(nob.proyecto),
      ciudad:normalizarMayusculas(nob.ciudad),
      direccion:normalizarMayusculas(nob.direccion),
      tel:normalizarTelefono(nob.tel),
      id,
      nit:"",
      coords:"",
      estado:estadoSegunAvance(nob.avance,nob.estado || "En Obra"),
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

  // El boton de crear vive en la barra de arriba, no en un titulo propio.
  // `setShowNO` no cambia entre renders, asi que se puede llamar directo sin
  // guardarlo en una referencia.
  useAccionesPantalla(
    sel ? null : (
      <button
        style={{
          background:"#cc0000", color:"#fff", border:"1px solid #cc0000", borderRadius:9,
          padding:"8px 16px", fontSize:12.5, fontWeight:700, cursor:"pointer",
          fontFamily:"inherit", whiteSpace:"nowrap",
        }}
        onClick={()=>setShowNO((v)=>!v)}
      >+ Nueva Obra</button>
    ),
    [sel]
  );

  // Si hay obra seleccionada, mostramos pantalla completa de esa obra
  if(sel){
    return <ObraDetalle obraId={sel.id} ctx={ctx} onVolver={()=>setSel(null)}/>;
  }

  return(
    <div style={{padding:"14px 28px 28px"}}>

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
              normalizar={normalizarMayusculas} placeholder="Ej: Líneas de vida cubierta" autoCapitalize="characters"/>
            <CampoTexto label="Ciudad" valor={nob.ciudad} onChange={v=>setNob({...nob,ciudad:v})}
              normalizar={normalizarMayusculas} placeholder="Ej: Medellín, Antioquia" autoCapitalize="characters"/>
            <CampoTexto label="Dirección" valor={nob.direccion} onChange={v=>setNob({...nob,direccion:v})}
              normalizar={normalizarMayusculas} placeholder="Dirección de la obra" autoCapitalize="characters"/>
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
                {ESTADOS_OBRA.map(s=><option key={s}>{s}</option>)}
              </select>
              <div style={{fontSize:10.5,color:"#94a3b8",marginTop:3}}>Si está trabajándose ahora, déjalo en «En Obra».</div>
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

      <ListaObras
        obras={obras}
        cotizaciones={cotizaciones}
        onAbrir={(o)=>{ setSel(o); asegurarDetalle("obras", o.id); }}
        onCambiarEstado={updEst}
        puedeDesbloquear={puedeDesbloquear}
      />
    </div>
  );
}

// ── DETALLE COMPLETO DE UNA OBRA ──

