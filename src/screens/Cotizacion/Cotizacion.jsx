import Badge from "../../components/ui/Badge";
import CotizacionPrint from "./CotizacionPrint";
import DocumentoEnVivo from "./DocumentoEnVivo";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import GoogleMeasureWorkspace from "../../components/maps/GoogleMeasureWorkspace";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useEffect, useRef, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { DEFAULT_COT_FORMA_PAGO, DEFAULT_COT_INCLUYE_PUNTOS_ANCLAJE, DEFAULT_COT_TIEMPO_EJEC, ITEMS_DB } from "../../data/seed";
import { buildGoogleStaticMapUrl, measurementsToQuoteItems } from "../../lib/maps";
import { buildQuoteProposal, createQuoteProposalId, getQuoteActiveProposal, getQuoteApprovalAccountingSnapshot, getQuoteProposalLabel, getQuoteProposals, hasAnchorPointsService, normalizeProposalItems, normalizeQuoteItems } from "../../lib/cotizaciones";
import { fmt, scrollAppToTop, today } from "../../lib/format";
import { normalizeEntityKey, openCotizacionPrint } from "../../lib/cotizacionPrint";
export default function Cotizacion({ctx}){
  const {cotizaciones,setCotizaciones,obras,setObras}=ctx;
  const [tab,setTab]=useState("lista");
  const [previewCot,setPreviewCot]=useState(null);
  // Vista previa del documento junto al formulario, para revisar los textos
  // completos mientras se edita.
  const [verDocumento,setVerDocumento]=useState(false);
  const cabeEnDosColumnas=useMediaQuery("(min-width: 1250px)");
  const [busqueda,setBusqueda]=useState("");
  const [filtroObraCot,setFiltroObraCot]=useState("todas");
  const [editCot,setEditCot]=useState(null);
  const [cot,setCot]=useState("");
  const [fecha,setFecha]=useState(today());
  const [val,setVal]=useState(30);
  const [cl,setCl]=useState({nombre:"",contacto:"",obra:"",telefono:"",ciudad:"",coords:""});
  const [textoInicial,setTextoInicial]=useState("");
  const [observacionesCot,setObservacionesCot]=useState("");
  const [propuestas,setPropuestas]=useState([buildQuoteProposal({id:createQuoteProposalId("new"),nombre:getQuoteProposalLabel(0),formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,util:10,items:[],incluyeTexto:""},0)]);
  const [propuestaActivaId,setPropuestaActivaId]=useState(null);
  const [nombrePropuesta,setNombrePropuesta]=useState(getQuoteProposalLabel(0));
  const [alcancePropuesta,setAlcancePropuesta]=useState("");
  const [tipoCotizacion,setTipoCotizacion]=useState("linea_vida");
  const [requerimientoCliente,setRequerimientoCliente]=useState("");
  const [incluyeTexto,setIncluyeTexto]=useState("");
  const [formaPago,setFormaPago]=useState(DEFAULT_COT_FORMA_PAGO);
  const [tiempoEjec,setTiempoEjec]=useState(DEFAULT_COT_TIEMPO_EJEC);
  const [util,setUtil]=useState(10);
  const [items,setItems]=useState([]);
  const [nid,setNid]=useState(1);
  const [geoMediciones,setGeoMediciones]=useState([]);
  const [geoMapView,setGeoMapView]=useState(null);
  const [medicionAutomaticaActiva,setMedicionAutomaticaActiva]=useState(false);
  const [showDB,setShowDB]=useState(false);
  const [dbCat,setDbCat]=useState(0);
  const [fotosActivaPropuesta,setFotosActivaPropuesta]=useState([]);
  const fotosRef=useRef();

  const getNextCotizacionNumero = (list = []) => {
    const maxAnc = (Array.isArray(list) ? list : []).reduce((max, cotizacion) => {
      const numero = String(cotizacion?.numero || '').trim().toUpperCase();
      const match = numero.match(/^ANC\s*-?\s*(\d+)$/);
      if (!match) return max;
      return Math.max(max, Number(match[1] || 0));
    }, 0);

    return `ANC${String(maxAnc + 1).padStart(3, "0")}`;
  };

  const autoMapImg = buildGoogleStaticMapUrl(geoMediciones, cl.coords || `${cl.obra||""} ${cl.ciudad||""}`.trim(), geoMapView);
  const sub = items.reduce((sum,item)=>sum + (Number(item.cant)||0)*(Number(item.vu)||0),0);
  const ut = sub * (Number(util)||0) / 100;
  const iva = ut * 0.19;
  const tot = sub + ut + iva;

  const proposalFromState = ()=>buildQuoteProposal({id:propuestaActivaId || createQuoteProposalId(editCot || "draft"),nombre:nombrePropuesta,alcance:alcancePropuesta,tipoCotizacion,requerimientoCliente,incluyeTexto,formaPago,tiempoEjec,util,items,fotos:fotosActivaPropuesta,geoMediciones,geoMapView,mapImg:autoMapImg || null,medicionAutomatica:medicionAutomaticaActiva,total:Math.round(tot)},0);
  const proposalSnapshot = proposalFromState();
  const propuestasSnapshot = (propuestas.length ? propuestas : [proposalSnapshot]).map((propuesta,index)=>buildQuoteProposal(propuesta.id===proposalSnapshot.id?proposalSnapshot:propuesta,index));

  // Misma forma que el objeto que se guarda, pero armado en vivo desde el
  // formulario: alimenta la vista previa sin necesidad de guardar antes.
  const cotizacionEnVivo = {
    id: editCot || "PREVIEW",
    numero: cot,
    fecha,
    val,
    cliente: cl.nombre,
    contacto: cl.contacto,
    obra: cl.obra,
    telefono: cl.telefono,
    ciudad: cl.ciudad,
    coords: cl.coords,
    textoInicial: textoInicial.trim(),
    observaciones: observacionesCot.trim(),
    items: proposalSnapshot.items,
    util: proposalSnapshot.util,
    total: proposalSnapshot.total,
    formaPago: proposalSnapshot.formaPago,
    tiempoEjec: proposalSnapshot.tiempoEjec,
    mapImg: proposalSnapshot.mapImg || autoMapImg || null,
    geoMediciones: proposalSnapshot.geoMediciones || geoMediciones,
    geoMapView: proposalSnapshot.geoMapView || geoMapView,
    tipoCotizacion: proposalSnapshot.tipoCotizacion,
    requerimientoCliente: proposalSnapshot.requerimientoCliente,
    incluyeTexto: proposalSnapshot.incluyeTexto || "",
    propuestaNombre: proposalSnapshot.nombre,
    propuestaAlcance: proposalSnapshot.alcance,
    propuestas: propuestasSnapshot,
    propuestaActivaId: proposalSnapshot.id,
    fotosCotizacion: proposalSnapshot.fotos || [],
    estado: "Pendiente",
  };

  useEffect(()=>{
    const propuestaActual = {
      nombre: nombrePropuesta,
      alcance: alcancePropuesta,
      requerimientoCliente,
      items,
    };
    if (hasAnchorPointsService(propuestaActual) && !String(incluyeTexto || "").trim()) {
      setIncluyeTexto(DEFAULT_COT_INCLUYE_PUNTOS_ANCLAJE);
    }
  }, [nombrePropuesta, alcancePropuesta, requerimientoCliente, items, incluyeTexto]);

  const applyProposal = (propuesta)=>{
    const p = buildQuoteProposal(propuesta,0);
    const nextItems = normalizeProposalItems(p.items);
    setPropuestaActivaId(p.id);
    setNombrePropuesta(p.nombre);
    setAlcancePropuesta(p.alcance || "");
    setTipoCotizacion(p.tipoCotizacion || "linea_vida");
    setRequerimientoCliente(p.requerimientoCliente || "");
    setIncluyeTexto(String(p.incluyeTexto || ""));
    setFormaPago(p.formaPago || DEFAULT_COT_FORMA_PAGO);
    setTiempoEjec(p.tiempoEjec || DEFAULT_COT_TIEMPO_EJEC);
    setUtil(Number(p.util || 10));
    setItems(nextItems);
    setNid(nextItems.length + 1);
    setFotosActivaPropuesta(p.fotos || []);
    setGeoMediciones(Array.isArray(p.geoMediciones) ? p.geoMediciones : []);
    setGeoMapView(p.geoMapView || null);
    setMedicionAutomaticaActiva(Boolean(p.medicionAutomatica || (Array.isArray(p.geoMediciones) && p.geoMediciones.length)));
  };

  const hydrate = (source={})=>{
    const all = getQuoteProposals(source);
    const active = all.find((propuesta)=>propuesta.id===source.propuestaActivaId) || all[0];
    setCot(source.numero || `P-${34155 + cotizaciones.length}`);
    setFecha(source.fecha || today());
    setVal(source.val || 30);
    setCl({nombre:source.cliente || "",contacto:source.contacto || "",obra:source.obra || "",telefono:source.telefono || "",ciudad:source.ciudad || "",coords:source.coords || ""});
    setTextoInicial(source.textoInicial || "");
    setObservacionesCot(source.observaciones || "");
    setGeoMediciones(source.geoMediciones || []);
    setGeoMapView(source.geoMapView || null);
    setPropuestas(all);
    // Para datos viejos sin fotos por propuesta, migrar fotosCotizacion a la propuesta activa
    const activeConFotos = {
      ...active,
      fotos: (active.fotos && active.fotos.length) ? active.fotos : (source.fotosCotizacion || []),
      geoMediciones: (active.geoMediciones && active.geoMediciones.length) ? active.geoMediciones : (source.geoMediciones || []),
      geoMapView: active.geoMapView || source.geoMapView || null,
      mapImg: active.mapImg || source.mapImg || null,
      incluyeTexto: active.incluyeTexto || "",
      medicionAutomatica: Boolean(active.medicionAutomatica || (active.geoMediciones && active.geoMediciones.length) || (source.geoMediciones && source.geoMediciones.length)),
    };
    applyProposal(activeConFotos);
  };

  const syncPropuestas = ()=>{
    const current = proposalFromState();
    const base = propuestas.length ? propuestas : [current];
    const next = (base.some((propuesta)=>propuesta.id===current.id) ? base.map((propuesta)=>propuesta.id===current.id?current:propuesta) : [...base,current]).map((propuesta,index)=>buildQuoteProposal(propuesta,index));
    setPropuestas(next);
    setPropuestaActivaId(current.id);
    return { current, next };
  };

  const nuevaCotizacion = ()=>{
    setEditCot(null);
    setPreviewCot(null);
    hydrate({numero:getNextCotizacionNumero(cotizaciones),fecha:today(),val:30,cliente:"",obra:"",telefono:"",ciudad:"",coords:"",geoMediciones:[],geoMapView:null,fotosCotizacion:[],propuestas:[buildQuoteProposal({id:createQuoteProposalId("new"),nombre:getQuoteProposalLabel(0),formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,util:10,items:[],geoMediciones:[],geoMapView:null,mapImg:null,medicionAutomatica:false,incluyeTexto:""},0)]});
    setTab("form");
  };

  const persistCotizacion = ({volverALista=true}={})=>{
    const { current, next } = syncPropuestas();
    const finalItems = normalizeQuoteItems({items:current.items,geoMediciones,propuestas:next});
    const totalActiva = Math.round((finalItems.reduce((sum,item)=>sum + (Number(item.cant)||0)*(Number(item.vu)||0),0)) * (1 + (Number(current.util || 10) / 100) * 1.19));
    const activa = buildQuoteProposal({...current,items:finalItems,total:totalActiva}, next.findIndex((propuesta)=>propuesta.id===current.id));
    const propuestasFinales = next.map((propuesta)=>propuesta.id===activa.id?activa:buildQuoteProposal(propuesta));
    const prev = editCot ? cotizaciones.find((cotizacion)=>cotizacion.id===editCot) : null;
    const data = {id:editCot || `COT-${String(cotizaciones.length+1).padStart(3,"0")}`,numero:cot,fecha,val,cliente:cl.nombre,contacto:cl.contacto,obra:cl.obra,telefono:cl.telefono,ciudad:cl.ciudad,coords:cl.coords,textoInicial:textoInicial.trim(),observaciones:observacionesCot.trim(),items:activa.items,util:activa.util,total:activa.total,formaPago:activa.formaPago,tiempoEjec:activa.tiempoEjec,mapImg:activa.mapImg || autoMapImg || null,geoMediciones:activa.geoMediciones || geoMediciones,geoMapView:activa.geoMapView || geoMapView,tipoCotizacion:activa.tipoCotizacion,requerimientoCliente:activa.requerimientoCliente,incluyeTexto:activa.incluyeTexto || "",propuestaNombre:activa.nombre,propuestaAlcance:activa.alcance,propuestas:propuestasFinales,propuestaActivaId:activa.id,fotosCotizacion:activa.fotos||[],estado:prev?.estado || "Pendiente",obraId:prev?.obraId || null};
    setCotizaciones((prevList)=>editCot ? prevList.map((cotizacion)=>cotizacion.id===editCot?{...cotizacion,...data}:cotizacion) : [...prevList,data]);
    setPropuestas(propuestasFinales);
    setEditCot(data.id);
    if(volverALista) setTab("lista");
    return data;
  };

  const guardarCotizacion = ()=>persistCotizacion({volverALista:true});

  const guardarCotizacionYSubir = ()=>{
    const saved = persistCotizacion({volverALista:false});
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        scrollAppToTop("smooth");
      });
    });
    return saved;
  };

  const aprobarCotizacion = (cotId)=>{
    const base = cotizaciones.find((cotizacion)=>cotizacion.id===cotId);
    const snapshot = base ? getQuoteApprovalAccountingSnapshot(base) : null;
    const cotizacion = snapshot?.cotizacion || null;
    if(!cotizacion || !snapshot) return;
    const obraId = `OB-${String(obras.length+1).padStart(3,"0")}`;
    setObras((prev)=>[...prev,{
      id:obraId,
      cliente:cotizacion.cliente,
      nit:"",
      tel:cotizacion.telefono,
      proyecto:cotizacion.obra,
      ciudad:cotizacion.ciudad,
      direccion:"",
      coords:cotizacion.coords || "",
      estado:"En Obra",
      avance:0,
      total:snapshot.totalObra,
      pagado:0,
      saldo:snapshot.totalObra,
      costos:0,
      fechaInicio:today(),
      fechaFin:"",
      empleados:[],
      trazos:[],
      anclajes:[],
      imgSat:cotizacion.mapImg || null,
      geoMediciones:cotizacion.geoMediciones || [],
      geoMapView:cotizacion.geoMapView || null,
      cotizacionId:cotizacion.id,
      subtotalCotizacion:snapshot.subtotalCotizacion,
      utilidadCotizacion:snapshot.utilidadCotizacion,
      baseIngresoContable:snapshot.baseIngresoContable,
      ivaGeneradoCotizacion:snapshot.ivaGeneradoCotizacion,
    }]);
    setCotizaciones((prev)=>prev.map((item)=>item.id===cotId?{...item,estado:"Aprobada",obraId}:item));
  };

  const term = normalizeEntityKey(busqueda || "");
  const obrasFiltroCotizacion = Array.from(new Set(
    cotizaciones
      .map((cotizacion)=>String(cotizacion.obra || "").trim())
      .filter(Boolean)
  )).sort((a,b)=>a.localeCompare(b,"es"));
  const cotizacionesFiltradas = cotizaciones.filter((cotizacion)=>{
    if(filtroObraCot!=="todas" && String(cotizacion.obra || "").trim()!==filtroObraCot) return false;
    if(!term) return true;
    const activa = getQuoteActiveProposal(cotizacion);
    return [cotizacion.id,cotizacion.numero,cotizacion.cliente,cotizacion.obra,cotizacion.ciudad,activa.nombre].some((value)=>normalizeEntityKey(value || "").includes(term));
  });

  if(tab==="lista"){
    if(previewCot){
      return <div style={{padding:28}}><H1 title={`Cotización ${previewCot.numero || previewCot.id}`} subtitle="Vista completa del documento comercial" action={<div style={{display:"flex",gap:10}}><button style={B("#f1f5f9","#475569")} onClick={()=>setPreviewCot(null)}>Volver</button><button style={B("#dbeafe","#1e40af")} onClick={()=>{setEditCot(previewCot.id);hydrate(previewCot);setTab("form");setPreviewCot(null);}}>Editar</button><button style={B("#f47c20")} onClick={()=>openCotizacionPrint(previewCot)}>Imprimir PDF</button></div>}/><CotizacionPrint c={previewCot}/></div>;
    }
    return (
      <div style={{padding:28}}>
        <H1 title="Cotizaciones" subtitle="Ubicación, medición y propuestas comerciales por cliente" action={<button style={B("#f47c20")} onClick={nuevaCotizacion}>+ Nueva Cotización</button>}/>
        <div style={{...CD,marginBottom:18,padding:"18px 22px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <div style={{minWidth:240}}>
              <div style={{fontSize:13,letterSpacing:2,textTransform:"uppercase",color:"#cc0000",fontWeight:800}}>Historial de cotizaciones</div>
              <div style={{width:210,height:1,background:"#dbe4f0",marginTop:14}}/>
              <div style={{fontSize:12,color:"#64748b",marginTop:12}}>{cotizacionesFiltradas.length} registro(s) visibles</div>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
              <input
                value={busqueda}
                onChange={(e)=>setBusqueda(e.target.value)}
                placeholder="Buscar cliente, obra o número"
                style={{...SI,width:300,minHeight:44,padding:"10px 14px"}}
              />
              <select
                value={filtroObraCot}
                onChange={(e)=>setFiltroObraCot(e.target.value)}
                style={{...SI,width:260,minHeight:44,padding:"10px 14px"}}
              >
                <option value="todas">Todas las obras</option>
                {obrasFiltroCotizacion.map((obra)=><option key={obra} value={obra}>{obra}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{...CD,padding:0,overflow:"hidden"}}>
          <div style={{padding:"18px 18px 10px 18px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:12,letterSpacing:1.2,textTransform:"uppercase",color:"#b91c1c",fontWeight:800}}>Listado de cotizaciones</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:4}}>Vista ejecutiva compacta por cliente, obra y propuesta activa</div>
            </div>
            <div style={{fontSize:12,color:"#64748b"}}>{cotizacionesFiltradas.length} registro(s)</div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,minWidth:760}}>
              <thead>
                <tr style={{background:"#f8fafc"}}>
                  {[
                    "Número",
                    "Cliente",
                    "Estado",
                    "Acciones",
                  ].map((label)=>(
                    <th key={label} style={{textAlign:"left",padding:"10px 12px",fontSize:10,color:"#64748b",fontWeight:800,borderBottom:"1px solid #e2e8f0",whiteSpace:"nowrap",letterSpacing:0.3}}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cotizacionesFiltradas.map((cotizacion)=>{
                  return (
                    <tr key={cotizacion.id} style={{background:"#fff"}}>
                      <td style={{padding:"11px 12px",borderBottom:"1px solid #e2e8f0",verticalAlign:"top"}}>
                        <div style={{fontWeight:800,color:"#2563eb",fontSize:11}}>{cotizacion.numero || cotizacion.id}</div>
                        <div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>{cotizacion.id}</div>
                      </td>
                      <td style={{padding:"11px 12px",borderBottom:"1px solid #e2e8f0",verticalAlign:"top"}}>
                        <div style={{fontWeight:700,color:"#0f172a",fontSize:11}}>{cotizacion.cliente}</div>
                        {cotizacion.ciudad ? <div style={{fontSize:10,color:"#64748b",marginTop:3}}>{cotizacion.ciudad}</div> : null}
                      </td>
                      <td style={{padding:"11px 12px",borderBottom:"1px solid #e2e8f0",verticalAlign:"top"}}>
                        <Badge estado={cotizacion.estado}/>
                      </td>
                      <td style={{padding:"11px 12px",borderBottom:"1px solid #e2e8f0",verticalAlign:"top",minWidth:260}}>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <button style={{...B("#dbeafe","#1e40af"),fontSize:10,padding:"5px 10px"}} onClick={()=>setPreviewCot(cotizacion)}>Ver</button>
                          <button style={{...B("#1a3050","#f5c842"),fontSize:10,padding:"5px 10px"}} onClick={()=>{setEditCot(cotizacion.id);hydrate(cotizacion);setTab("form");}}>Editar</button>
                          {cotizacion.estado!=="Aprobada" && <button style={{...B("#0f2d1a","#4ade80"),border:"1px solid #166534",fontSize:10,padding:"5px 10px"}} onClick={()=>aprobarCotizacion(cotizacion.id)}>Aprobar y crear obra</button>}
                          <button style={{...B("#2d1414","#ef4444"),fontSize:10,padding:"5px 10px"}} onClick={()=>openCotizacionPrint(cotizacion)}>PDF</button>
                          <button
                            style={{...B("#fff","#ef4444"),border:"1.5px solid #ef4444",fontSize:10,padding:"5px 10px"}}
                            onClick={()=>{
                              if(!window.confirm(`¿Eliminar la cotización "${cotizacion.numero || cotizacion.id}" de ${cotizacion.cliente || "este cliente"}? Esta acción no se puede deshacer.`)) return;
                              setCotizaciones((prev)=>prev.filter((c)=>c.id!==cotizacion.id));
                            }}
                          >🗑 Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!cotizacionesFiltradas.length && (
                  <tr>
                    <td colSpan={9} style={{padding:"28px 16px",textAlign:"center",color:"#64748b"}}>No hay cotizaciones para mostrar con este filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:28}}>
      <H1
        title={editCot?"Editar Cotización":"Nueva Cotización"}
        subtitle="Construye propuestas comerciales para una misma obra"
        action={
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button style={B("#f1f5f9","#475569")} onClick={()=>setTab("lista")}>Volver a lista</button>
            <button
              style={verDocumento ? B("#111827") : B("#f1f5f9","#475569")}
              onClick={()=>setVerDocumento(v=>!v)}
              title="Muestra el documento completo tal como se imprimirá, mientras editas"
            >
              {verDocumento ? "Ocultar documento" : "Ver documento"}
            </button>
            <button style={{...B("#dbeafe","#1e40af"),justifyContent:"center"}} onClick={()=>{const saved=guardarCotizacion();if(saved){setPreviewCot(saved);setTab("lista");}}}>Guardar y ver</button>
            <button style={{...B("#f47c20"),justifyContent:"center"}} onClick={guardarCotizacion}>{editCot?"Actualizar":"Guardar"}</button>
          </div>
        }
      />

      <div style={{
        display:"grid",
        // En pantallas anchas el documento va al lado; en angostas, el boton
        // alterna entre formulario y documento para no apilar dos cosas largas.
        gridTemplateColumns: verDocumento && cabeEnDosColumnas ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)",
        gap:18,
        alignItems:"start",
      }}>
      <div style={{minWidth:0, display: verDocumento && !cabeEnDosColumnas ? "none" : "block"}}>

      {/* Identificación */}
      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>Identificación</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <div><LBL>N° Cotización</LBL><input value={cot} onChange={e=>setCot(e.target.value)} style={SI}/></div>
          <div><LBL>Fecha</LBL><input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={SI}/></div>
          <div><LBL>Válida (días)</LBL><input type="number" value={val} onChange={e=>setVal(Number(e.target.value))} style={SI}/></div>
        </div>
      </div>

      {/* Cliente */}
      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>Cliente</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><LBL>Empresa</LBL><input value={cl.nombre} onChange={e=>setCl({...cl,nombre:e.target.value})} style={SI}/></div>
          <div><LBL>Contacto</LBL><input value={cl.contacto} onChange={e=>setCl({...cl,contacto:e.target.value})} style={SI}/></div>
          <div><LBL>Obra</LBL><input value={cl.obra} onChange={e=>setCl({...cl,obra:e.target.value})} style={SI}/></div>
          <div><LBL>Teléfono</LBL><input value={cl.telefono} onChange={e=>setCl({...cl,telefono:e.target.value})} style={SI}/></div>
          <div><LBL>Ciudad</LBL><input value={cl.ciudad} onChange={e=>setCl({...cl,ciudad:e.target.value})} style={SI}/></div>
        </div>
      </div>

      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>Texto inicial del documento</div>
        <textarea
          value={textoInicial}
          onChange={e=>setTextoInicial(e.target.value)}
          placeholder={"Ej: Presentamos la cotización para la instalación de puntos de anclaje o línea de vida sobre la cubierta del Éxito de Niquia en Bello."}
          style={{...SI,minHeight:110,resize:"vertical",lineHeight:1.6}}
        />
        <div style={{fontSize:11,color:"#64748b",marginTop:8}}>
          Este texto saldrá al inicio del PDF y de la vista previa. Lo puedes redactar manualmente para cada cliente.
        </div>
      </div>

      {/* Selector de propuestas */}
      <div style={{...CD,marginBottom:14,border:"2px solid #142840"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={ST}>Propuestas</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{const next=[...propuestasSnapshot,buildQuoteProposal({id:createQuoteProposalId(String(propuestasSnapshot.length+1)),nombre:getQuoteProposalLabel(propuestasSnapshot.length),formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,util:10,items:[],incluyeTexto:""},propuestasSnapshot.length)];setPropuestas(next);applyProposal(next[next.length-1]);}} style={{...B("#f47c20"),fontSize:11,padding:"5px 14px"}}>+ Nueva</button>
            <button onClick={()=>{const next=[...propuestasSnapshot,buildQuoteProposal({...proposalSnapshot,id:createQuoteProposalId(String(propuestasSnapshot.length+1)),nombre:`${proposalSnapshot.nombre} copia`},propuestasSnapshot.length)];setPropuestas(next);applyProposal(next[next.length-1]);}} style={{...B("#dbeafe","#1e40af"),fontSize:11,padding:"5px 14px"}}>Duplicar</button>
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {propuestasSnapshot.map((propuesta)=>{
            const esActiva = propuesta.id===propuestaActivaId;
            return (
              <div key={propuesta.id} style={{flex:"1 1 180px",position:"relative",borderRadius:12,border:`2px solid ${esActiva?"#f47c20":"#dbe5f0"}`,background:esActiva?"#fff7ed":"#f8fafc",overflow:"hidden"}}>
                <div onClick={()=>{setPropuestas(propuestasSnapshot);applyProposal(propuesta);}} style={{textAlign:"left",padding:"12px 14px 10px",cursor:"pointer"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#1a1a2e",marginBottom:3,paddingRight:22}}>{propuesta.nombre}</div>
                  <div style={{fontSize:10,color:"#64748b",marginBottom:5}}>{propuesta.tipoCotizacion==="obra_blanca"?"Obra blanca":propuesta.tipoCotizacion==="puntos_anclaje"?"Puntos de anclaje":"Línea de vida"}</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#cc0000"}}>{fmt(Number(esActiva?tot:propuesta.total)||0)}</div>
                </div>
                {propuestasSnapshot.length > 1 && (
                  <button
                    title="Eliminar propuesta"
                    onClick={(e)=>{
                      e.stopPropagation();
                      if(!window.confirm(`¿Eliminar "${propuesta.nombre}"? Esta acción no se puede deshacer.`)) return;
                      const next = propuestasSnapshot.filter(p=>p.id!==propuesta.id);
                      setPropuestas(next);
                      if(esActiva) applyProposal(next[0]);
                    }}
                    style={{position:"absolute",top:6,right:6,background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,width:20,height:20,cursor:"pointer",fontSize:13,lineHeight:1,padding:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}
                  >×</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Propuesta activa */}
      <div style={{...CD,marginBottom:14,border:"2px solid #f47c20"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#f47c20",textTransform:"uppercase",letterSpacing:1,marginBottom:18}}>Propuesta activa</div>

        {/* 1. Nombre y tipo */}
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:12,marginBottom:18}}>
          <div><LBL>Nombre de la propuesta</LBL><input value={nombrePropuesta} onChange={e=>setNombrePropuesta(e.target.value)} style={SI}/></div>
          <div>
            <LBL>Tipo</LBL>
            <div style={{display:"flex",gap:8}}>
              {[["linea_vida","Línea de vida"],["puntos_anclaje","Puntos de anclaje"],["obra_blanca","Obra blanca"]].map(([v,l])=>(
                <button key={v} onClick={()=>setTipoCotizacion(v)} style={{...B(tipoCotizacion===v?"#f47c20":"#142840",tipoCotizacion===v?"#fff":"#7da5c8"),flex:1,justifyContent:"center",border:"2px solid "+(tipoCotizacion===v?"#f47c20":"#1a3050"),fontSize:11,fontWeight:700,padding:"7px 4px"}}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Descripción / texto comercial */}
        <div style={{marginBottom:18}}>
          <LBL>Descripción / texto de la propuesta</LBL>
          <textarea value={alcancePropuesta} onChange={e=>setAlcancePropuesta(e.target.value)} placeholder="Describe el servicio, materiales y alcance de esta propuesta..." style={{...SI,minHeight:130,resize:"vertical",lineHeight:1.7}}/>
        </div>

        {tipoCotizacion==="obra_blanca"&&(
          <div style={{marginBottom:18}}>
            <LBL>Necesidad del cliente</LBL>
            <textarea value={requerimientoCliente} onChange={e=>setRequerimientoCliente(e.target.value)} style={{...SI,minHeight:100,resize:"vertical",lineHeight:1.5}}/>
          </div>
        )}

        <div style={{marginBottom:18}}>
          <LBL>Esta cotización incluye</LBL>
          <textarea value={incluyeTexto} onChange={e=>setIncluyeTexto(e.target.value)} placeholder="Texto predeterminado editable" style={{...SI,minHeight:120,resize:"vertical",lineHeight:1.6}}/>
        </div>

        {/* 3. Fotos */}
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>Fotos de la propuesta</span>
            <span style={{fontSize:10,color:"#94a3b8"}}>Se imprimen en el PDF</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {fotosActivaPropuesta.map((f,i)=>(
              <div key={f.id} style={{borderRadius:8,overflow:"hidden",border:"1px solid #e2e8f0",background:"#f8fafc"}}>
                <div style={{background:"#fff",padding:6}}>
                  <img src={f.src} alt={f.label||`Foto ${i+1}`} style={{width:"100%",height:"auto",display:"block",borderRadius:4}}/>
                </div>
                <div style={{padding:"6px 8px",display:"flex",gap:4,alignItems:"center"}}>
                  <input value={f.label||""} onChange={e=>setFotosActivaPropuesta(prev=>prev.map(item=>item.id===f.id?{...item,label:e.target.value}:item))} placeholder={`Foto ${i+1}`} style={{...SI,fontSize:11,padding:"3px 6px",flex:1}}/>
                  <button onClick={()=>setFotosActivaPropuesta(prev=>prev.filter(item=>item.id!==f.id))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,width:22,height:22,cursor:"pointer",fontSize:14,flexShrink:0,lineHeight:1}}>×</button>
                </div>
              </div>
            ))}
            <div onClick={()=>fotosRef.current.click()} style={{border:"2px dashed #f47c20",borderRadius:10,minHeight:140,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"#fff8f3",color:"#f47c20",fontWeight:600,gap:6}}>
              <span style={{fontSize:24,lineHeight:1}}>+</span>
              <span style={{fontSize:12}}>Agregar foto</span>
            </div>
          </div>
          <input ref={fotosRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{Array.from(e.target.files||[]).forEach(file=>{const r=new FileReader();r.onload=(ev)=>setFotosActivaPropuesta(prev=>[...prev,{id:Date.now()+Math.random(),src:ev.target.result,label:""}]);r.readAsDataURL(file);});e.target.value="";}}/>
        </div>

        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>Medición automática con Google Maps</span>
            <div style={{display:"flex",gap:8}}>
              <button
                type="button"
                onClick={()=>setMedicionAutomaticaActiva((prev)=>!prev)}
                style={{...B(medicionAutomaticaActiva?"#166534":"#dbeafe",medicionAutomaticaActiva?"#ecfdf5":"#1e40af"),fontSize:11,padding:"5px 12px",border:"1px solid " + (medicionAutomaticaActiva?"#166534":"#93c5fd")}}
              >
                {medicionAutomaticaActiva ? "Desactivar medición" : "Activar medición"}
              </button>
              {autoMapImg && (
                <button
                  type="button"
                  onClick={()=>setFotosActivaPropuesta((prev)=>[...prev,{id:Date.now()+Math.random(),src:autoMapImg,label:"Mapa Google Maps"}])}
                  style={{...B("#fff7ed","#c2410c"),fontSize:11,padding:"5px 12px",border:"1px solid #fdba74"}}
                >
                  Agregar mapa como foto
                </button>
              )}
            </div>
          </div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>
            Esta medición queda amarrada solo a la propuesta activa. Si cambias a otra propuesta, tendrá su propio mapa y sus propios tramos.
          </div>
          {medicionAutomaticaActiva ? (
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:14}}>
              <GoogleMeasureWorkspace queryValue={cl.coords||`${cl.obra||""} ${cl.ciudad||""}`.trim()} onQueryChange={(value)=>setCl({...cl,coords:value})} measurements={geoMediciones} onChange={setGeoMediciones} mapView={geoMapView} onMapViewChange={setGeoMapView}/>
            </div>
          ) : (
            <div style={{background:"#f8fafc",border:"1px dashed #cbd5e1",borderRadius:12,padding:"18px 16px",fontSize:12,color:"#64748b",textAlign:"center"}}>
              Activa la medición automática si esta propuesta necesita mapa satelital o tramos medidos con Google Maps.
            </div>
          )}
        </div>

        {/* 4. Detalle económico */}
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>Detalle económico</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{const nuevos=measurementsToQuoteItems(geoMediciones);setItems(nuevos.map((item,index)=>({...item,id:index+1})));setNid(nuevos.length+1);}} style={{...B("#dbeafe","#1e40af"),fontSize:11,padding:"5px 12px"}}>Jalar mediciones</button>
              <button onClick={()=>setShowDB(!showDB)} style={{...B(showDB?"#1a3050":"transparent","#f47c20"),border:"1px solid #cc0000",fontSize:11,padding:"5px 12px"}}>{showDB?"Cerrar catálogo":"Catálogo"}</button>
            </div>
          </div>

          {showDB&&(
            <div style={{background:"#f8fafc",borderRadius:10,padding:16,marginBottom:14,border:"1px solid #f47c2044"}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{ITEMS_DB.map((cat,i)=><button key={i} onClick={()=>setDbCat(i)} style={{...B(dbCat===i?"#f47c20":"#142840",dbCat===i?"#fff":"#7da5c8"),border:`1px solid ${dbCat===i?"#f47c20":"#1a3050"}`,fontSize:11,padding:"5px 12px"}}>{cat.categoria}</button>)}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{ITEMS_DB[dbCat].items.map((it,i)=><div key={i} style={{background:"#f1f5f9",borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#1a1a2e",marginBottom:2}}>{it.desc}</div><div style={{fontSize:11,color:"#475569"}}>{it.unit} · {fmt(it.vu)}</div></div><button onClick={()=>{setItems(prev=>[...prev,{id:nid,desc:it.desc,cant:1,unit:it.unit,vu:it.vu}]);setNid(prev=>prev+1);}} style={{...B("#f47c20"),padding:"5px 12px",fontSize:12,flexShrink:0}}>+</button></div>)}</div>
            </div>
          )}

          {/* Tabla de ítems */}
          <div style={{border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden",marginBottom:10}}>
            <div style={{display:"grid",gridTemplateColumns:"3fr 0.65fr 0.75fr 1.1fr 1.1fr 28px",background:"#1a2840",color:"#94a3b8",fontSize:10,textTransform:"uppercase",padding:"9px 12px",letterSpacing:0.5}}>
              <span>Descripción</span><span>Cant.</span><span>Unidad</span><span>Valor unit.</span><span style={{textAlign:"right"}}>Subtotal</span><span/>
            </div>
            {items.map((it,idx)=>(
              <div key={it.id} style={{display:"grid",gridTemplateColumns:"3fr 0.65fr 0.75fr 1.1fr 1.1fr 28px",alignItems:"center",padding:"5px 10px",background:idx%2===0?"#f8fafc":"#fff",borderTop:"1px solid #f1f5f9"}}>
                <input value={it.desc} onChange={e=>setItems(prev=>prev.map(item=>item.id===it.id?{...item,desc:e.target.value}:item))} style={{...SI,fontSize:12,padding:"5px 7px"}}/>
                <input type="number" value={it.cant} onChange={e=>setItems(prev=>prev.map(item=>item.id===it.id?{...item,cant:parseFloat(e.target.value)||0}:item))} style={{...SI,fontSize:12,padding:"5px 7px"}}/>
                <input value={it.unit} onChange={e=>setItems(prev=>prev.map(item=>item.id===it.id?{...item,unit:e.target.value}:item))} style={{...SI,fontSize:12,padding:"5px 7px"}}/>
                <input type="number" value={it.vu} onChange={e=>setItems(prev=>prev.map(item=>item.id===it.id?{...item,vu:parseFloat(e.target.value)||0}:item))} style={{...SI,fontSize:12,padding:"5px 7px"}}/>
                <div style={{textAlign:"right",fontSize:12,fontWeight:600,color:"#cc0000",paddingRight:4}}>{fmt(it.cant*it.vu)}</div>
                <button onClick={()=>setItems(prev=>prev.filter(item=>item.id!==it.id))} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>×</button>
              </div>
            ))}
            {items.length===0&&<div style={{padding:"18px 12px",textAlign:"center",fontSize:12,color:"#94a3b8"}}>Sin ítems — agrega desde catálogo o manualmente</div>}
          </div>

          <button onClick={()=>{setItems(prev=>[...prev,{id:nid,desc:"",cant:1,unit:"ML",vu:0}]);setNid(prev=>prev+1);}} style={{...B("#fff3e8","#f47c20"),border:"1px dashed #cc0000",width:"100%",justifyContent:"center",marginBottom:16,fontSize:12}}>+ Agregar ítem manual</button>

          {/* Tabla de totales */}
          <div style={{border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
            {[["SUBTOTAL",sub],["ADMINISTRACIÓN",0],["IMPREVISTOS",0],["UTILIDAD "+util+"%",ut],["IVA SOBRE LA UTILIDAD (19%)",iva]].map(([lbl,v])=>(
              <div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"9px 14px",borderBottom:"1px solid #f1f5f9",fontSize:12,color:"#475569"}}>
                <span>{lbl}</span><span style={{fontWeight:500,color:"#1a1a2e"}}>{v?fmt(v):"$  -"}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px",background:"#1a2840"}}>
              <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>TOTAL</span>
              <span style={{fontSize:15,fontWeight:700,color:"#f47c20"}}>{fmt(tot)}</span>
            </div>
            <div style={{padding:"6px 14px",fontSize:10,color:"#94a3b8",textAlign:"center",background:"#f8fafc"}}>EL IVA ES EL 19% DE LA UTILIDAD</div>
          </div>

          <div style={{marginTop:12,display:"grid",gridTemplateColumns:"120px 1fr",gap:12,alignItems:"end"}}>
            <div><LBL>Utilidad %</LBL><input type="number" value={util} onChange={e=>setUtil(Number(e.target.value))} style={SI}/></div>
            <div style={{fontSize:11,color:"#64748b",paddingBottom:10}}>Ajusta el porcentaje de utilidad para recalcular el total</div>
          </div>
        </div>

        {/* 5. Condiciones comerciales */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:4,borderTop:"1px solid #f1f5f9"}}>
          <div><LBL>Forma de pago</LBL><input value={formaPago} onChange={e=>setFormaPago(e.target.value)} style={SI}/></div>
          <div><LBL>Tiempo de ejecución</LBL><input value={tiempoEjec} onChange={e=>setTiempoEjec(e.target.value)} style={SI}/></div>
        </div>
        <div style={{marginTop:12}}>
          <LBL>Observaciones / condiciones adicionales</LBL>
          <textarea
            value={observacionesCot}
            onChange={e=>setObservacionesCot(e.target.value)}
            placeholder="Ej: El pago se realiza contra entrega de acta parcial. Incluye transporte de materiales..."
            style={{...SI,minHeight:80,resize:"vertical",lineHeight:1.6}}
          />
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Este texto aparece en las condiciones comerciales del PDF</div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <button
            type="button"
            onClick={guardarCotizacionYSubir}
            style={{...B("#f47c20"),fontSize:11,padding:"7px 16px"}}
          >
            Guardar
          </button>
        </div>
      </div>

      </div>

      {verDocumento && (
        <DocumentoEnVivo
          cotizacion={cotizacionEnVivo}
          alto={cabeEnDosColumnas ? "calc(100vh - 210px)" : "calc(100vh - 260px)"}
        />
      )}
      </div>
    </div>
  );
}

// ======================================================
// HELPERS
// ======================================================

