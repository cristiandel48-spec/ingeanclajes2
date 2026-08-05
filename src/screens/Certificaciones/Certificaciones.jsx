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
import { siguienteIdUnico } from "../../lib/identificadores";
import { getQuoteActiveProposal, normalizeQuoteItems } from "../../lib/cotizaciones";
// Informes de una obra. Si se indica uno concreto, solo ese.
const informesFuente = (informes, obraId, informeId = "")=>{
  if(!obraId) return [];
  const elegido = informeId ? (informes||[]).find((i)=>i?.id===informeId) : null;
  return elegido && elegido.obraId===obraId
    ? [elegido]
    : (informes||[]).filter((i)=>i?.obraId===obraId);
};

// La fecha del trabajo: el fin del periodo del informe, o su fecha de emision.
const fechaDesdeInformes = (informes, obraId, informeId = "")=>{
  const fechas = informesFuente(informes, obraId, informeId)
    .map((i)=>String(i.periodoFin || i.fechaInforme || "").trim())
    .filter(Boolean)
    .sort();
  return fechas.length ? fechas[fechas.length-1] : "";
};

// Lo anotado en las observaciones de esos informes, sin repetir.
const observacionesDesdeInformes = (informes, obraId, informeId = "")=>{
  const textos = informesFuente(informes, obraId, informeId)
    .flatMap((i)=>(i.actividades||[]).map((a)=>String(a?.observaciones||"").trim()))
    .filter(Boolean);
  return [...new Set(textos)].join(". ");
};

export default function Certificaciones({ctx}){
  const {certs,setCerts,obras,clientes,cotizaciones,informes,intencion,limpiarIntencion,irAPantalla}=ctx;
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
  const [form,setForm]=useState(()=>{
    // La fecha del informe TAMBIEN al montar, no solo al elegir obra a mano.
    const fechaObra = fechaDesdeInformes(ctx.informes, obraInicial?.id);
    return buildCertForm({
      elementos:getCertDefaultElements("Certificación"),
      obraId: obraInicial?.id || "",
      cliente: obraInicial?.cliente || "",
      direccion: obraInicial?.direccion || obraInicial?.ciudad || "",
      nit: buscarNit(obraInicial),
      ...(fechaObra ? {fecha:fechaObra} : {}),
    });
  });

  // Se descarta al salir, para que al volver por el menu no se reabra.
  useEffect(()=>()=>limpiarIntencion(),[limpiarIntencion]);
  const [nuevoElem,setNuevoElem]=useState("");

  // Una obra puede tener VARIOS informes -una sede por informe- y de cada uno
  // sale su propia certificacion. Por eso se elige de cual se toman los datos
  // en vez de juntarlos todos: certificar "San Blas" y "Medellin" en el mismo
  // documento seria decir que se hizo en un sitio lo que se hizo en otro.
  const informesDeObra = (obraId)=>
    (informes||[]).filter((inf)=>inf?.obraId===obraId);

  // El informe elegido en el formulario, si hay mas de uno.
  const [informeRef,setInformeRef]=useState("");

  // Lo que se cotizo para esta obra: el detalle de los items.
  //
  // Es la fuente mas fiable de QUE se certifica, porque es lo que se vendio y
  // lo que se cobra. Antes habia que abrir la cotizacion para verlo, y la
  // cantidad se escribia a mano mirando ese documento.
  //
  // El camino es obra → cotizacionId → cotizacion → propuesta activa → items.
  const itemsDeLaObra = (obraId)=>{
    const obra = (obras||[]).find((o)=>o.id===obraId);
    if(!obra?.cotizacionId) return [];
    const cot = (cotizaciones||[]).find((c)=>c.id===obra.cotizacionId);
    if(!cot) return [];
    return normalizeQuoteItems(getQuoteActiveProposal(cot).items?.length
      ? {...cot, items:getQuoteActiveProposal(cot).items}
      : cot);
  };

  // Solo las descripciones, sin cantidades ni unidades: es lo que se lee en el
  // certificado. "Global" es una unidad para cotizar, no algo que se instale.
  const descripcionesDeItems = (items)=>{
    const nombres = [...new Set((items||[])
      .map((it)=>String(it?.desc||"").trim())
      .filter(Boolean))];
    if(nombres.length <= 1) return nombres[0] || "";
    return `${nombres.slice(0,-1).join(", ")} y ${nombres[nombres.length-1]}`;
  };

  // "26 UND · RECERTIFICACION ANUAL PUNTOS DE ANCLAJES" — para el aviso de
  // pantalla, donde si conviene ver la cantidad y la unidad.
  const detalleDeItems = (items)=>(items||[])
    .filter((it)=>String(it?.desc||"").trim())
    .map((it)=>{
      const cant = Number(it.cant||0);
      const unidad = String(it.unit||"").trim();
      const medida = cant ? `${cant % 1 === 0 ? cant : cant.toFixed(2)}${unidad?` ${unidad}`:""} · ` : "";
      return `${medida}${String(it.desc).trim()}`;
    })
    .join("; ");

  // La cantidad del certificado: la suma de lo cotizado.
  const cantidadDeLaObra = (obraId)=>{
    const total = itemsDeLaObra(obraId).reduce((s,it)=>s + (Number(it.cant)||0), 0);
    return total ? String(total % 1 === 0 ? total : total.toFixed(2)) : "";
  };

  // Lo que se anoto en el informe de actividades de esta misma obra.
  //
  // La observacion del informe -"1 linea de vida horizontal de 7 m
  // perimetral"- es justo lo que dice QUE se esta certificando. Estaba escrita
  // en un documento y hacia falta en el otro, asi que habia que abrir el
  // informe para comprobar que el certificado cubria lo instalado.
  //
  // Se unen por el numero de obra, que es lo que tienen en comun.
  const observacionesDeObra = (obraId)=>observacionesDesdeInformes(informes, obraId, informeRef);

  // La fecha del certificado sale del informe de actividades de esa obra.
  //
  // Se certifica lo que se termino de hacer, y esa fecha esta en el periodo del
  // informe. Antes el certificado nacia con la fecha de hoy, que es la de
  // escribirlo, no la del trabajo: si se certificaba una semana despues, el
  // documento decia una fecha en la que no se hizo nada.
  //
  // Se toma el FIN del periodo -el ultimo dia trabajado- y, si hay varios
  // informes de la obra, el mas reciente.
  const fechaDeLaObra = (obraId)=>fechaDesdeInformes(informes, obraId, informeRef);

  // Lo que se escribe como "Alcance certificado".
  //
  // Manda el detalle de la cotizacion, que es lo que se vendio y se cobra. La
  // nota del informe se suma detras solo si aporta algo que los items no digan
  // ya, para no repetir lo mismo con otras palabras.
  const alcanceCompleto = (obraId)=>{
    const cotizado = detalleDeItems(itemsDeLaObra(obraId));
    const anotado = observacionesDeObra(obraId);
    if(!cotizado) return anotado;
    if(!anotado) return cotizado;
    const yaEsta = cotizado.toLowerCase().includes(anotado.toLowerCase().replace(/\.+$/, ""));
    return yaEsta ? cotizado : `${cotizado}. ${anotado}`;
  };

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
          nit:siguiente.nit,
          direccion:siguiente.direccion,
          fechaLarga:fmtL(siguiente.fecha),
          lugar:siguiente.lugar,
          detalle:descripcionesDeItems(itemsDeLaObra(siguiente.obraId)),
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
      nit:form.nit,
      direccion:form.direccion,
      fechaLarga:fmtL(form.fecha),
      lugar:form.lugar,
      detalle:descripcionesDeItems(itemsDeLaObra(form.obraId)),
    });
    if(!texto){
      window.alert("Para armar el texto hace falta el cliente. Elige la obra y se completa solo.");
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
    setInformeRef("");
    // La cantidad y la fecha tambien se traen de una: son los dos datos que se
    // copiaban a mano de la cotizacion y del informe.
    const cant = cantidadDeLaObra(obra?.id);
    const fechaObra = fechaDeLaObra(obra?.id);
    setForm(buildCertForm({
      tipo,
      elementos:getCertDefaultElements(tipo),
      obraId: obra?.id || "",
      cliente: obra?.cliente || "",
      direccion: obra?.direccion || obra?.ciudad || "",
      nit: buscarNit(obra),
      ...(cant ? {cantidad:cant} : {}),
      ...(fechaObra ? {fecha:fechaObra} : {}),
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
      : {id:siguienteIdUnico(certs,"CERT"),estado:"Vigente",...form};
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
            <button style={B("#f47c20")} onClick={()=>abrirNuevaCertificacion("Certificación")}>+ Nueva Certificación</button>
            <button style={{...B("#4ade80","#0f2d1a"),border:"1px solid #166534"}} onClick={()=>abrirNuevaCertificacion("Recertificación")}>+ Nueva Recertificación</button>
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
              style={{...B("#f47c20"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}
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
        <div style={{...CD,marginBottom:20,border:"1px solid #cc0000"}}>
          <div style={ST}>{editId ? "Editar Certificación / Recertificación" : "Nueva Certificación / Recertificación"}</div>

          {obraDelForm && faltantesObra.length>0 && (
            <AvisoFlujo
              tono="falta"
              titulo={`La obra ${obraDelForm.id} todavía no está lista para certificar`}
              accion={
                <button
                  onClick={()=>irAPantalla("obras",{obraId:obraDelForm.id})}
                  style={{...B("#f1f5f9","#475569"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}
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
            <div><LBL>Obra asociada</LBL>{!obras.length && <div style={{fontSize:10.5,color:"#b45309",marginBottom:4}}>No hay obras. Aprueba una cotización para crear la obra.</div>}<select value={form.obraId} onChange={e=>{const id=e.target.value;setInformeRef("");const o=obras.find(x=>x.id===id);const cant=cantidadDeLaObra(id);const f=fechaDeLaObra(id);aplicarCambio({obraId:id,cliente:o?.cliente||"",direccion:o?.direccion||o?.ciudad||"",nit:buscarNit(o),...(cant?{cantidad:cant}:{}),...(f?{fecha:f}:{})});}} style={SI}>{obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
            {/* Una obra con varias sedes lleva un informe por sede, y de cada
                uno sale su propia certificacion. Aqui se elige cual. */}
            {informesDeObra(form.obraId).length > 1 && (
              <div style={{gridColumn:"span 2"}}>
                <LBL>¿De cuál informe?</LBL>
                <select
                  value={informeRef}
                  onChange={e=>{
                    const id=e.target.value;
                    setInformeRef(id);
                    const inf=(informes||[]).find((x)=>x.id===id);
                    if(!inf) return;
                    // La sede de ese informe manda sobre la direccion de la obra:
                    // es la que tiene que salir en el certificado.
                    aplicarCambio({
                      ...(inf.localizacion ? {direccion:inf.localizacion} : {}),
                      ...(inf.periodoFin || inf.fechaInforme ? {fecha:inf.periodoFin || inf.fechaInforme} : {}),
                    });
                  }}
                  style={SI}
                >
                  <option value="">Todos los informes de la obra</option>
                  {informesDeObra(form.obraId).map((inf)=>(
                    <option key={inf.id} value={inf.id}>
                      {inf.id} · {inf.proyecto || inf.localizacion || "sin nombre"}
                      {inf.periodoFin ? ` · hasta ${fmtD(inf.periodoFin)}` : ""}
                    </option>
                  ))}
                </select>
                <div style={{fontSize:10.5,color:"#94a3b8",marginTop:3,lineHeight:1.45}}>
                  Esta obra tiene {informesDeObra(form.obraId).length} informes. Elige uno y el
                  certificado toma su sede, su fecha y lo que se hizo ahí. Haz una certificación
                  por cada informe.
                </div>
              </div>
            )}
            <div><LBL>Tipo</LBL><select value={form.tipo} onChange={e=>{
              const t=e.target.value;
              aplicarCambio({tipo:t,elementos:getCertDefaultElements(t, form.tipoSistema)});
            }} style={SI}>{["Certificación","Recertificación"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><LBL>Número</LBL><input value={form.numero} onChange={e=>setForm({...form,numero:e.target.value})} placeholder="C-2026-001" style={SI}/></div>
            <div>
              <LBL>Fecha</LBL>
              <input type="date" value={form.fecha} onChange={e=>aplicarCambio({fecha:e.target.value})} style={SI}/>
              {/* De donde salio, para que se note que no es la de hoy sino la
                  del trabajo, y se pueda cambiar sabiendo lo que se cambia. */}
              {fechaDeLaObra(form.obraId) && (
                <div style={{fontSize:10,color: form.fecha===fechaDeLaObra(form.obraId) ? "#166534" : "#b45309", marginTop:3, lineHeight:1.4}}>
                  {form.fecha===fechaDeLaObra(form.obraId)
                    ? <>Es el fin del período del informe de {form.obraId}.</>
                    : <>El informe de {form.obraId} termina el {fmtD(fechaDeLaObra(form.obraId))}.</>}
                </div>
              )}
            </div>
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
          {/* El sitio concreto dentro del edificio. Se escribe aqui porque no
              esta en ningun otro documento: se intento sacarlo de las
              observaciones del informe y salia "instalados en 1 LINEA DE VIDA
              HORIZONTAL DE 7 M PERIMETRAL", que dice que se hizo, no donde. */}
          <div style={{marginBottom:12}}>
            <LBL>¿Dónde se instaló?</LBL>
            <input
              value={form.lugar || ""}
              onChange={e=>aplicarCambio({lugar:e.target.value})}
              placeholder="El cuarto de ascensores · La cubierta del bloque 2 · La fachada norte…"
              style={SI}
            />
            <div style={{fontSize:10.5,color:"#94a3b8",marginTop:3}}>
              Sale en el certificado: «instalados en <strong>{(form.lugar||"…").toUpperCase()}</strong>».
              Déjalo vacío si no aplica y esa parte no se imprime.
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <LBL>Sistema certificado</LBL>
              <button onClick={rehacerTexto} style={{...B("#f1f5f9","#475569"),fontSize:11,padding:"5px 11px"}}>
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
            <div style={{fontSize:10.5,color:"#94a3b8",marginTop:3}}>
              {form.sistemaAuto===false
                ? "Lo estás escribiendo a mano, así que ya no se rehace solo. Usa el botón para volver al texto automático."
                : "Se actualiza solo con lo que elijas arriba. En cuanto lo edites, deja de hacerlo."}
            </div>
            {/* De donde sale el alcance, para que no parezca que se lo invento
                el sistema y se pueda ir a corregirlo a su sitio. */}
            {alcanceCompleto(form.obraId) && (
              <div style={{fontSize:10.5,color:"#166534",marginTop:5,lineHeight:1.5}}>
                Se arma con lo que ya hay en {form.obraId}:
                {detalleDeItems(itemsDeLaObra(form.obraId)) && <> <strong>qué se instaló</strong> de los ítems de su cotización</>}
                {detalleDeItems(itemsDeLaObra(form.obraId)) && observacionesDeObra(form.obraId) && <>,</>}
                {observacionesDeObra(form.obraId) && <> <strong>dónde</strong> de las observaciones del informe</>}
                , y el NIT y la dirección del cliente. Si algo no cuadra, corrígelo ahí y vuelve a
                armar el texto.
              </div>
            )}
          </div>
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

      {/* Se esconde mientras se esta llenando una certificacion: la pantalla se
          dedica al formulario y no a las que ya estan hechas. */}
      {!sel&&!nueva&&(
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

