import AvisoFlujo from "../../components/AvisoFlujo";
import Badge from "../../components/ui/Badge";
import CertificacionDetalle from "./CertificacionDetalle";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useEffect, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { buildCertForm, construirTextoSistema, getCertDefaultElements, unAnoDespues } from "./certConfig";
import { fmt, fmtD, fmtL } from "../../lib/format";
import { normalizarRazonSocial, normalizarFrase, normalizarParrafos } from "../../lib/normalizarEntrada";
import { getEstadoFlujoObra } from "../../lib/flujoObra";
import { printCurrentPz } from "../../lib/print";
import { siguienteIdUnico } from "../../lib/identificadores";
import ListaCertificaciones from "./ListaCertificaciones";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import { resolverAutorGuardado, normalizarNombrePersona } from "../../lib/autorAuditoria";
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

// El nombre del proyecto del informe: "CREAFAM SEDE SAN BLAS". Es el DONDE
// del certificado, y distingue una sede de otra dentro de la misma obra.
const proyectoDesdeInformes = (informes, obraId, informeId = "")=>{
  const nombres = [...new Set(informesFuente(informes, obraId, informeId)
    .map((i)=>String(i.proyecto || "").trim())
    .filter(Boolean))];
  return nombres[0] || "";
};

// Lo que se hizo, tal como se anoto al registrar el avance de la obra:
// "Creafam san blas recertificacion 1 linea de vida". Sirve de respaldo
// cuando el informe no trae observaciones.
const actividadesDesdeInformes = (informes, obraId, informeId = "")=>{
  const titulos = [...new Set(informesFuente(informes, obraId, informeId)
    .flatMap((i)=>(i.actividades||[]).map((a)=>String(a?.titulo||"").trim()))
    .filter(Boolean))];
  return titulos.join("; ");
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
  // Al llegar desde el boton «Certificar» de un informe viene tambien de cual,
  // para no tener que elegirlo a mano cuando la obra tiene varios.
  const informeSolicitado = intencion?.pantalla==="certificaciones" ? (intencion.informeId || "") : "";
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

  // La direccion tambien sale de la ficha del cliente, no de la obra. En la
  // obra suele estar la sede concreta -"TENERIFE #43"- y en el certificado
  // tiene que ir la del cliente, que es a quien se le expide el documento.
  const buscarDireccionCliente=(obra,clienteTexto)=>{
    const nombre=normalizarRazonSocial(clienteTexto || obra?.cliente || "");
    if(nombre){
      const ficha=(clientes||[]).find((c)=>normalizarRazonSocial(c.nombre)===nombre);
      if(ficha?.direccion) return ficha.direccion;
      const vinculada=obra?.cotizacionId
        ? (cotizaciones||[]).find((c)=>c.id===obra.cotizacionId)
        : null;
      if(vinculada?.direccion) return vinculada.direccion;
    }
    return obra?.direccion || obra?.ciudad || "";
  };

  const [nueva,setNueva]=useState(()=>Boolean(obraSolicitada));
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(()=>{
    // La fecha del informe TAMBIEN al montar, no solo al elegir obra a mano.
    const fechaObra = fechaDesdeInformes(ctx.informes, obraInicial?.id, informeSolicitado);
    return buildCertForm({
      elementos:getCertDefaultElements("Certificación"),
      obraId: obraInicial?.id || "",
      cliente: obraInicial?.cliente || "",
      direccion: buscarDireccionCliente(obraInicial),
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
  const [informeRef,setInformeRef]=useState(informeSolicitado);

  const proyectoDeObra = (obraId)=>
    proyectoDesdeInformes(informes, obraId, informeRef)
    || String((obras||[]).find((o)=>o.id===obraId)?.proyecto || "").trim();

  // QUE se certifica: la observacion del informe -"1 linea de vida horizontal
  // de 7 m perimetral"-, que es la frase escrita a mano y en limpio. Si no la
  // hay, lo anotado en "¿Que se hizo?" al registrar el avance.
  //
  // NO sale de los items de la cotizacion: alli las lineas son de cobrar
  // -"CERTIFICACION SISTEMA ANTICAIDAS SAN BLAS", "1 Global"- y en un
  // certificado quedaban ilegibles.
  const queSeCertifica = (obraId)=>
    observacionesDesdeInformes(informes, obraId, informeRef)
    || actividadesDesdeInformes(informes, obraId, informeRef);

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

  // Cambia algo del encabezado -tipo, sistema, cantidad, cliente, dirección o
  // fecha- y el párrafo se rehace. Solo mientras nadie lo haya editado a mano:
  // en cuanto se toca, manda lo escrito y esto deja de pisarlo.
  const aplicarCambio=(patch, refInforme=informeRef)=>{
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
          normativa:siguiente.normativa,
          lugar:siguiente.lugar
            || proyectoDesdeInformes(informes, siguiente.obraId, refInforme)
            || String((obras||[]).find((o)=>o.id===siguiente.obraId)?.proyecto || "").trim(),
          detalle:observacionesDesdeInformes(informes, siguiente.obraId, refInforme)
            || actividadesDesdeInformes(informes, siguiente.obraId, refInforme),
        });
        if(texto) siguiente.sistema=texto;
      }
      // El proximo mantenimiento va pegado a la fecha del certificado -un año
      // justo, que es lo que promete el documento- mientras nadie lo haya
      // escrito a mano.
      if(patch.fecha!==undefined && siguiente.proxMantAuto!==false){
        siguiente.proxMant=unAnoDespues(siguiente.fecha);
      }
      return siguiente;
    });
  };

  const rehacerTexto=()=>{
    // Rehacer es volver a armarlo con los datos buenos, asi que la direccion
    // se vuelve a traer de la ficha del cliente en vez de usar la que quedo.
    const obraSel=obras.find((x)=>x.id===form.obraId);
    const direccionCliente=buscarDireccionCliente(obraSel, form.cliente) || form.direccion;
    const texto=construirTextoSistema({
      tipo:form.tipo,
      tipoSistema:form.tipoSistema,
      cantidad:form.cantidad,
      cliente:form.cliente,
      nit:form.nit,
      direccion:direccionCliente,
      fechaLarga:fmtL(form.fecha),
      normativa:form.normativa,
      lugar:form.lugar || proyectoDeObra(form.obraId),
      detalle:queSeCertifica(form.obraId),
    });
    if(!texto){
      window.alert("Para armar el texto hace falta el cliente. Elige la obra y se completa solo.");
      return;
    }
    setForm((prev)=>({...prev,direccion:direccionCliente,sistema:texto,sistemaAuto:true}));
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
    const fechaObra = fechaDeLaObra(obra?.id);
    setForm(buildCertForm({
      tipo,
      elementos:getCertDefaultElements(tipo),
      obraId: obra?.id || "",
      cliente: obra?.cliente || "",
      direccion: buscarDireccionCliente(obra),
      nit: buscarNit(obra),
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
    const prev = editId ? certs.find((item) => item.id === editId) : null;
    const miUserId = ctx?.membresia?.userId || null;
    const miNombre = resolverAutorGuardado(ctx?.membresia, prev?.modificadoPorNombre);
    const obraIdNormalizado = form.obraId || null;
    const c = {
      ...(editId
        ? { ...form, obraId: obraIdNormalizado, id: editId, estado: form.estado || "Vigente" }
        : { id: siguienteIdUnico(certs, "CERT"), estado: "Vigente", ...form, obraId: obraIdNormalizado }),
      creadoPor: prev?.creadoPor || miUserId,
      creadoPorNombre: prev?.creadoPorNombre ? normalizarNombrePersona(prev.creadoPorNombre, "Camila Sepúlveda") : (resolverAutorGuardado(ctx?.membresia) || "Camila Sepúlveda"),
      creadoEn: prev?.creadoEn || new Date().toISOString(),
      modificadoPor: miUserId,
      modificadoPorNombre: miNombre || resolverAutorGuardado(ctx?.membresia, prev?.modificadoPorNombre) || "Camila Sepúlveda",
      modificadoEn: new Date().toISOString(),
    };
    setCerts(prevList=>editId ? prevList.map(item=>item.id===editId?{...item,...c}:item) : [...prevList,c]);
    setNueva(false);
    setSel(c);
    setEditId(null);
  };

  // Los dos botones de crear viven en la barra de arriba, no en un titulo
  // propio. Se esconden mientras se llena una certificacion o se mira una: la
  // pantalla se dedica a eso.
  useAccionesPantalla(
    (sel || nueva) ? null : (
      <div style={{display:"flex",gap:7}}>
        <button
          style={{background:"#f47c20",color:"#fff",border:"1px solid #f47c20",borderRadius:9,
            padding:"8px 14px",fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}
          onClick={()=>abrirNuevaCertificacion("Certificación")}
        >+ Certificación</button>
        <button
          style={{background:"#0f2d1a",color:"#4ade80",border:"1px solid #166534",borderRadius:9,
            padding:"8px 14px",fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}
          onClick={()=>abrirNuevaCertificacion("Recertificación")}
        >+ Recertificación</button>
      </div>
    ),
    [sel, nueva]
  );

  const imprimir=(c)=>{setSel(c);setTimeout(()=>printCurrentPz("Certificación " + (c?.numero || c?.id || "")),250);};

  // Estado de la obra elegida en el formulario, para avisar en el momento
  // justo si todavia no esta lista para certificar.
  const obraDelForm = obras.find((o)=>o.id===form.obraId) || null;
  const flujo = obraDelForm ? getEstadoFlujoObra(obraDelForm) : null;
  const faltantesObra = [];
  if(flujo && !flujo.estaTerminada) faltantesObra.push(`la obra va en ${flujo.avance}% y no está marcada como finalizada`);
  if(flujo && !flujo.estaPagada) faltantesObra.push(`queda un saldo por cobrar de ${fmt(flujo.saldo)}`);

  return(
    <div style={{padding:"14px 28px 28px"}}>

      {obras.length===0 && (
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
      )}

      {nueva&&(
        <div style={{
          ...CD,
          marginBottom: 24,
          borderRadius: 14,
          border: "1px solid var(--border-color, #e2e8f0)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
          padding: 24,
          background: "var(--card-bg, #ffffff)"
        }}>
          {/* Protocol Header Card */}
          <div style={{
            background: "linear-gradient(135deg, rgba(224, 52, 42, 0.05) 0%, rgba(224, 52, 42, 0.01) 100%)",
            border: "1px solid rgba(224, 52, 42, 0.15)",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12
          }}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{
                  background: "#E0342A",
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 5,
                  textTransform: "uppercase",
                  letterSpacing: 0.8
                }}>
                  Protocolo Técnico Oficial
                </span>
                <span style={{fontSize:11.5,fontWeight:700,color:"var(--text-subtle, #64748b)"}}>
                  Resolución 4272 de 2021 & ANSI Z359
                </span>
              </div>
              <div style={{fontSize:16,fontWeight:800,color:"var(--text-main, #0f172a)"}}>
                {editId ? `Editar ${form.tipo || "Certificación"} ${form.numero || ""}` : `Nueva ${form.tipo || "Certificación"} de Seguridad`}
              </div>
            </div>

            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <div style={{
                background: "var(--card-bg, #ffffff)",
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 11,
                color: "var(--text-subtle, #64748b)",
                textAlign: "center"
              }}>
                <div style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase",color:"#94a3b8"}}>Validez Máxima</div>
                <div style={{fontWeight:800,color:"#059669"}}>12 Meses</div>
              </div>
              <div style={{
                background: "var(--card-bg, #ffffff)",
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 11,
                color: "var(--text-subtle, #64748b)",
                textAlign: "center"
              }}>
                <div style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase",color:"#94a3b8"}}>Folio Asignado</div>
                <div style={{fontWeight:800,color:"var(--text-main, #0f172a)"}}>{form.numero || "Auto / Manual"}</div>
              </div>
            </div>
          </div>

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
            <div><LBL>Obra asociada</LBL>{!obras.length && <div style={{fontSize:10.5,color:"#b45309",marginBottom:4}}>No hay obras. Aprueba una cotización para crear la obra.</div>}<select value={form.obraId} onChange={e=>{const id=e.target.value;setInformeRef("");const o=obras.find(x=>x.id===id);const f=fechaDeLaObra(id);aplicarCambio({obraId:id,cliente:o?.cliente||"",direccion:buscarDireccionCliente(o),nit:buscarNit(o),...(f?{fecha:f}:{})}, "");}} style={SI}>{obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
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
                    // El "instalados en" es el NOMBRE del proyecto del informe
                    // -"CREAFAM SEDE SAN BLAS"-, no su localizacion, que es la
                    // direccion de la sede y no pinta nada ahi.
                    //
                    // La direccion se vuelve a traer de la ficha del cliente:
                    // antes se pisaba con la del informe y en el documento
                    // salia la de la sede en vez de la del cliente.
                    const obraSel=obras.find((x)=>x.id===form.obraId);
                    aplicarCambio({
                      direccion:buscarDireccionCliente(obraSel, form.cliente),
                      lugar:proyectoDesdeInformes(informes, form.obraId, id),
                      ...(inf.periodoFin || inf.fechaInforme ? {fecha:inf.periodoFin || inf.fechaInforme} : {}),
                    }, id);
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
                <div style={{fontSize:10.5,color:"var(--text-subtle, #94a3b8)",marginTop:3,lineHeight:1.45}}>
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
                <div style={{fontSize:10,color: form.fecha===fechaDeLaObra(form.obraId) ? "#34d399" : "#f59e0b", marginTop:3, lineHeight:1.4}}>
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
            <div style={{gridColumn:"span 2"}}><LBL>Dirección del cliente</LBL><input value={form.direccion} onChange={e=>aplicarCambio({direccion:e.target.value})} onBlur={e=>{const v=normalizarFrase(e.target.value);if(v!==form.direccion)aplicarCambio({direccion:v});}} style={SI}/></div>
            <div>
              <LBL>Próximo mantenimiento</LBL>
              {/* Al escribirlo a mano deja de seguir a la fecha. */}
              <input type="date" value={form.proxMant}
                onChange={e=>setForm({...form,proxMant:e.target.value,proxMantAuto:false})} style={SI}/>
              <div style={{fontSize:10,color:form.proxMant?"#34d399":"#f59e0b",marginTop:3,lineHeight:1.4}}>
                {form.proxMant
                  ? (form.proxMantAuto!==false
                      ? "Propuesto a un año de la fecha, como dice el documento. Cámbialo si aplica otro plazo."
                      : "Fecha puesta a mano.")
                  : "Sin esta fecha la certificación no aparece en Vencimientos ni en las alertas."}
              </div>
            </div>
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
              onBlur={e=>{const v=normalizarFrase(e.target.value);if(v!==form.lugar)aplicarCambio({lugar:v});}}
              placeholder={proyectoDeObra(form.obraId) || "El cuarto de ascensores · La cubierta del bloque 2…"}
              style={SI}
            />
            <div style={{fontSize:10.5,color:"var(--text-subtle, #94a3b8)",marginTop:3}}>
              Sale en el certificado: «instalados en <strong>{(form.lugar||proyectoDeObra(form.obraId)||"…").toUpperCase()}</strong>».
              Vacío toma el nombre del proyecto del informe. Escribe aquí si quieres precisar el
              sitio: «el cuarto de ascensores», «la cubierta del bloque 2».
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <LBL>Sistema certificado</LBL>
              <button onClick={rehacerTexto} style={{...B("var(--btn-cancelar-bg, #f1f5f9)","var(--btn-cancelar-txt, #475569)"),fontSize:11,padding:"5px 11px"}}>
                ↻ Rehacer con los datos de arriba
              </button>
            </div>
            <textarea
              value={form.sistema}
              onChange={e=>setForm({...form,sistema:e.target.value,sistemaAuto:false})}
              onBlur={e=>{const v=normalizarParrafos(e.target.value);if(v!==form.sistema)setForm(p=>({...p,sistema:v}));}}
              rows={4}
              placeholder="Se arma solo al llenar el tipo, el sistema, la cantidad y el cliente. También puedes escribirlo a mano."
              spellCheck lang="es"
              style={{...SI,resize:"vertical"}}
            />
            <div style={{fontSize:10.5,color:"var(--text-subtle, #94a3b8)",marginTop:3}}>
              {form.sistemaAuto===false
                ? "Lo estás escribiendo a mano, así que ya no se rehace solo. Usa el botón para volver al texto automático."
                : "Se actualiza solo con lo que elijas arriba. En cuanto lo edites, deja de hacerlo."}
            </div>
            {/* De donde sale el alcance, para que no parezca que se lo invento
                el sistema y se pueda ir a corregirlo a su sitio. */}
            {queSeCertifica(form.obraId) && (
              <div style={{fontSize:10.5,color:"#34d399",marginTop:5,lineHeight:1.5}}>
                Se arma con lo registrado en la obra: <strong>qué se certifica</strong> de las
                observaciones del informe, <strong>dónde</strong> del nombre del proyecto, y el NIT
                y la dirección del cliente. Si algo no cuadra, corrígelo en el informe y vuelve a
                armar el texto.
              </div>
            )}
          </div>
          <div style={{marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <LBL>Elementos y Componentes Utilizados ({form.elementos.length})</LBL>
              <span style={{fontSize:11,color:"var(--text-subtle, #94a3b8)"}}>Componentes certificados instalados o inspeccionados</span>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
              {form.elementos.map((el,i)=>(
                <div key={i} style={{
                  display:"flex",
                  gap:10,
                  alignItems:"center",
                  background:"var(--bg-subtle, #f8fafc)",
                  border:"1px solid var(--border-color, #e2e8f0)",
                  borderRadius:8,
                  padding:"6px 10px"
                }}>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: "var(--text-subtle, #94a3b8)",
                    width: 24,
                    textAlign: "center",
                    flexShrink: 0
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <input
                    value={el}
                    onChange={e=>setForm({...form,elementos:form.elementos.map((x,j)=>j===i?e.target.value:x)})}
                    style={{...SI,fontSize:12.5,border:"none",background:"transparent",padding:"4px 0",boxShadow:"none"}}
                  />
                  <button
                    type="button"
                    onClick={()=>setForm({...form,elementos:form.elementos.filter((_,j)=>j!==i)})}
                    title="Eliminar elemento"
                    style={{
                      background:"rgba(239, 68, 68, 0.08)",
                      border:"1px solid rgba(239, 68, 68, 0.2)",
                      color:"#dc2626",
                      borderRadius:6,
                      width:28,
                      height:28,
                      cursor:"pointer",
                      fontSize:14,
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"center",
                      flexShrink:0
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:10}}>
              <input
                value={nuevoElem}
                onChange={e=>setNuevoElem(e.target.value)}
                onKeyDown={e=>{
                  if(e.key==="Enter"){
                    e.preventDefault();
                    if(nuevoElem.trim()){
                      setForm({...form,elementos:[...form.elementos,nuevoElem.trim()]});
                      setNuevoElem("");
                    }
                  }
                }}
                placeholder="Escribe un componente y presiona Enter para agregar..."
                style={{...SI,fontSize:12.5,flex:1}}
              />
              <button
                type="button"
                onClick={()=>{if(nuevoElem.trim()){setForm({...form,elementos:[...form.elementos,nuevoElem.trim()]});setNuevoElem("");}}}
                style={{
                  ...B("#E0342A","#ffffff"),
                  padding:"8px 16px",
                  fontSize:12,
                  fontWeight:700,
                  borderRadius:8,
                  flexShrink:0
                }}
              >
                + Agregar Elemento
              </button>
            </div>
          </div>
          <div style={{display:"flex",gap:12,marginTop:18,paddingTop:14,borderTop:"1px solid var(--border-color, #e2e8f0)"}}>
            <button
              style={{
                ...B("#E0342A","#ffffff"),
                padding:"10px 24px",
                fontSize:13,
                fontWeight:700,
                borderRadius:8,
                boxShadow:"0 2px 10px rgba(224,52,42,0.25)"
              }}
              onClick={guardar}
            >
              💾 {editId ? "Guardar cambios" : "Guardar certificación"}
            </button>
            <button
              style={{
                ...B("var(--btn-cancelar-bg, #f1f5f9)","var(--btn-cancelar-txt, #475569)"),
                padding:"10px 20px",
                fontSize:13,
                fontWeight:600,
                borderRadius:8
              }}
              onClick={()=>{setNueva(false);setEditId(null);}}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Se esconde mientras se esta llenando una certificacion: la pantalla se
          dedica al formulario y no a las que ya estan hechas. */}
      {!sel&&!nueva&&(
        <ListaCertificaciones
          certs={certs}
          acciones={{
            ver: (c)=>setSel(c),
            editar: (c)=>editarCertificacion(c),
            imprimir: (c)=>imprimir(c),
          }}
        />
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

