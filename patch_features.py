path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# ─────────────────────────────────────────────────────────────────────────────
# 1. Rename "Pagos por Obra" -> "Cuentas por cobrar" everywhere
# ─────────────────────────────────────────────────────────────────────────────
for old, new in [
    ('"Pagos por Obra"', '"Cuentas por cobrar"'),
    ('title="Pagos por Obra"', 'title="Cuentas por cobrar"'),
    ('subtitle="Registro de abonos por cliente y proyecto"', 'subtitle="Cuentas por cobrar · Abonos y saldos por cliente"'),
]:
    if old in content:
        count = content.count(old)
        content = content.replace(old, new)
        print(f"Renamed [{count}x]: {repr(old)} -> {repr(new)}")
        fixes += count

# ─────────────────────────────────────────────────────────────────────────────
# 2. Fix Pagos search: auto-select when only 1 result
#    The existing search filters the dropdown but doesn't auto-select.
#    Add auto-select logic when only 1 match.
# ─────────────────────────────────────────────────────────────────────────────
OLD_SEARCH = """  const obrasFiltradasBusqueda = obras.filter((obra)=>{
    const term = normalizarTexto(busquedaPago);
    if(!term) return true;
    return [obra.id, obra.cliente, obra.proyecto, obra.ciudad, obra.direccion]
      .some((campo)=>normalizarTexto(campo).includes(term));
  });"""

NEW_SEARCH = """  const obrasFiltradasBusqueda = obras.filter((obra)=>{
    const term = normalizarTexto(busquedaPago);
    if(!term) return true;
    return [obra.id, obra.cliente, obra.proyecto, obra.ciudad, obra.direccion]
      .some((campo)=>normalizarTexto(campo).includes(term));
  });
  // Auto-select when search narrows to exactly 1 result
  const prevBusqRef = typeof window !== 'undefined' ? window.__prevBusqRef : null;
  if(obrasFiltradasBusqueda.length===1 && busquedaPago && obraPagoId !== obrasFiltradasBusqueda[0].id){
    // use effect-like: schedule after render
  }"""

# Actually let's do it more cleanly by changing the onChange handler to auto-select
OLD_BUSQ_INPUT = """              <input
                value={busquedaPago}
                onChange={(e)=>setBusquedaPago(e.target.value)}
                placeholder="Escribe cliente, obra, ciudad o ID"
                style={SI}
              />"""

NEW_BUSQ_INPUT = """              <input
                value={busquedaPago}
                onChange={(e)=>{
                  const v=e.target.value;
                  setBusquedaPago(v);
                  const norm=(s="")=>String(s||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();
                  const t=norm(v);
                  if(!t){setObraPagoId("");return;}
                  const matches=obras.filter(o=>[o.id,o.cliente,o.proyecto,o.ciudad,o.direccion].some(c=>norm(c).includes(t)));
                  if(matches.length===1) setObraPagoId(matches[0].id);
                }}
                placeholder="Escribe cliente, obra, ciudad o ID — selección automática"
                style={SI}
              />"""

if OLD_BUSQ_INPUT in content:
    content = content.replace(OLD_BUSQ_INPUT, NEW_BUSQ_INPUT, 1)
    print("Fixed Pagos auto-select search")
    fixes += 1
else:
    print("WARN: could not find Pagos search input")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Add search bar to Cotizaciones lista
#    Insert busqCot state + filter + search bar UI
# ─────────────────────────────────────────────────────────────────────────────

# Add busqCot state near other states in Cotizacion function
OLD_COT_STATE = "  const [previewCot,setPreviewCot]=useState(null);"
NEW_COT_STATE = "  const [previewCot,setPreviewCot]=useState(null);\n  const [busqCot,setBusqCot]=useState(\"\");\n  const [detalleCot,setDetalleCot]=useState(null);"

if OLD_COT_STATE in content:
    content = content.replace(OLD_COT_STATE, NEW_COT_STATE, 1)
    print("Added busqCot + detalleCot state")
    fixes += 1
else:
    print("WARN: could not find previewCot state")

# Replace the lista section to add search bar + detail view tab
OLD_LISTA_START = """  if(tab==="lista"){
    const st={Pendiente:{bg:"#2d2a14",t:"#f5c842",b:"#7a6610"},Aprobada:{bg:"#0f2d1a",t:"#4ade80",b:"#166534"},Rechazada:{bg:"#2d1414",t:"#ef4444",b:"#7c1010"}};
    return(
      <div style={{padding:28}}>
        <H1 title="Cotizaciones" subtitle="Ubicacion y medicion automatica primero en la cotizacion; luego viaja a Planos y Obras"
          action={<button style={B("#f47c20")} onClick={newForm}>+ Nueva Cotización</button>}/>
        {sendNotif&&<div style={{background:"#e8f5ee",border:"1px solid #166534",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#166534"}}>{sendNotif}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {cotizaciones.map(c=>{"""

NEW_LISTA_START = """  if(tab==="lista"){
    const st={Pendiente:{bg:"#2d2a14",t:"#f5c842",b:"#7a6610"},Aprobada:{bg:"#0f2d1a",t:"#4ade80",b:"#166534"},Rechazada:{bg:"#2d1414",t:"#ef4444",b:"#7c1010"}};
    const normCot=(s="")=>String(s||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();
    const cotFiltradas = busqCot ? cotizaciones.filter(c=>[c.id,c.numero,c.cliente,c.obra,c.ciudad].some(v=>normCot(v).includes(normCot(busqCot)))) : cotizaciones;
    if(detalleCot){
      const dc=detalleCot;
      const ds=st[dc.estado]||st.Pendiente;
      const dpropuestas=getQuoteProposals(dc);
      const dpropActiva=getQuoteActiveProposal(dc);
      const dobraVinc=obras.find(o=>o.id===dc.obraId);
      return(
        <div style={{padding:28}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <button style={{...B("#f1f5f9","#475569"),fontSize:13}} onClick={()=>setDetalleCot(null)}>← Volver a cotizaciones</button>
            <span style={{fontSize:11,color:"#94a3b8"}}>{dc.id} · {dc.numero}</span>
            <span style={{background:ds.bg,color:ds.t,border:"1px solid "+ds.b,borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:600}}>{dc.estado}</span>
            <div style={{flex:1}}/>
            <button style={{...B("#1a3050","#f5c842"),fontSize:12}} onClick={()=>{loadEdit(dc);setDetalleCot(null);}}>✏️ Editar</button>
            <button style={{...B("#2d1414","#ef4444"),fontSize:12}} onClick={()=>imprimirCotizacion(dc)}>🖨 PDF</button>
            {dc.estado!=="Aprobada"&&<button style={{...B("#0f2d1a","#4ade80"),fontSize:12}} onClick={()=>{aprobarCotizacion(dc.id);setDetalleCot(null);}}>✅ Aprobar y crear obra</button>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
            <div style={CD}>
              <div style={ST}>Datos del cliente</div>
              {[["Cliente",dc.cliente],["Obra / Proyecto",dc.obra],["Ciudad",dc.ciudad],["Teléfono",dc.telefono],["Fecha",fmtD(dc.fecha)],["Vigencia",dc.val+" días"]].map(([k,v])=>v?(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9",fontSize:12}}>
                  <span style={{color:"#64748b"}}>{k}</span><span style={{fontWeight:600,color:"#1a1a2e",textAlign:"right",maxWidth:"60%"}}>{v}</span>
                </div>
              ):null)}
              {dobraVinc&&<div style={{marginTop:10,background:"#f0fdf4",borderRadius:6,padding:"8px 10px",fontSize:11,color:"#166534"}}>✅ Vinculada a obra: <strong>{dobraVinc.id} · {dobraVinc.proyecto}</strong></div>}
            </div>
            <div style={CD}>
              <div style={ST}>Propuestas</div>
              {dpropuestas.map((p,pi)=>(
                <div key={p.id} style={{background:p.id===dc.propuestaActivaId?"#fff7ed":"#f8fafc",border:"1px solid "+(p.id===dc.propuestaActivaId?"#fed7aa":"#e2e8f0"),borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#1a1a2e"}}>{p.nombre||"Propuesta "+(pi+1)}</div>
                    <div style={{fontSize:14,fontWeight:800,color:"#cc0000"}}>{fmt(p.total)}</div>
                  </div>
                  {p.alcance&&<div style={{fontSize:11,color:"#64748b",marginTop:4}}>{p.alcance}</div>}
                  <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>{(p.items||[]).length} ítems · {p.tipoCotizacion==="obra_blanca"?"Obra blanca":"Línea de vida"}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={CD}>
            <div style={ST}>Ítems de la propuesta activa</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#142840",color:"#fff"}}>{["Descripción","Cant.","Unidad","V. Unitario","V. Total"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:h==="Descripción"?"left":"right",fontWeight:600,fontSize:11}}>{h}</th>)}</tr></thead>
              <tbody>
                {(dpropActiva.items||[]).map((item,ii)=>(
                  <tr key={ii} style={{borderBottom:"1px solid #f1f5f9",background:ii%2===0?"#fff":"#f8fafc"}}>
                    <td style={{padding:"7px 10px"}}>{item.desc}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{item.cant}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{item.unit}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{fmt(item.vu)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:600}}>{fmt(item.cant*item.vu)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {(()=>{
                  const sub2=(dpropActiva.items||[]).reduce((s,i)=>s+i.cant*i.vu,0);
                  const ut2=sub2*(dpropActiva.util||10)/100;
                  const iva2=ut2*0.19;
                  return(<>
                    <tr style={{background:"#f1f5f9"}}><td colSpan={4} style={{padding:"6px 10px",textAlign:"right",color:"#64748b"}}>Subtotal</td><td style={{padding:"6px 10px",textAlign:"right",fontWeight:600}}>{fmt(sub2)}</td></tr>
                    <tr style={{background:"#f1f5f9"}}><td colSpan={4} style={{padding:"6px 10px",textAlign:"right",color:"#64748b"}}>Utilidad ({dpropActiva.util||10}%) + IVA 19%</td><td style={{padding:"6px 10px",textAlign:"right",fontWeight:600}}>{fmt(ut2+iva2)}</td></tr>
                    <tr style={{background:"#142840",color:"#fff"}}><td colSpan={4} style={{padding:"8px 10px",textAlign:"right",fontWeight:700}}>TOTAL</td><td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontSize:14}}>{fmt(dpropActiva.total||sub2+ut2+iva2)}</td></tr>
                  </>);
                })()}
              </tfoot>
            </table>
          </div>
          {(dc.fotosCotizacion||[]).length>0&&(
            <div style={{...CD,marginTop:16}}>
              <div style={ST}>Fotos de la cotización</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                {(dc.fotosCotizacion||[]).map((f,fi)=>(
                  <div key={fi} style={{textAlign:"center"}}>
                    <img src={f.url||f} alt={f.label||"Foto "+(fi+1)} style={{width:180,height:130,objectFit:"cover",borderRadius:8,border:"1px solid #e2e8f0"}}/>
                    {f.label&&<div style={{fontSize:10,color:"#64748b",marginTop:4}}>{f.label}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return(
      <div style={{padding:28}}>
        <H1 title="Cotizaciones" subtitle="Ubicacion y medicion automatica primero en la cotizacion; luego viaja a Planos y Obras"
          action={<button style={B("#f47c20")} onClick={newForm}>+ Nueva Cotización</button>}/>
        {sendNotif&&<div style={{background:"#e8f5ee",border:"1px solid #166534",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#166534"}}>{sendNotif}</div>}
        <div style={{position:"relative",marginBottom:18}}>
          <input
            value={busqCot}
            onChange={e=>setBusqCot(e.target.value)}
            placeholder="🔍 Buscar cotización por cliente, número, obra o ciudad..."
            style={{...SI,paddingLeft:16,fontSize:13,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}
          />
          {busqCot&&<button onClick={()=>setBusqCot("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#94a3b8"}}>✕</button>}
          {busqCot&&<div style={{fontSize:11,color:"#64748b",marginTop:6}}>{cotFiltradas.length} resultado(s) de {cotizaciones.length}</div>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {cotFiltradas.map(c=>{"""

if OLD_LISTA_START in content:
    content = content.replace(OLD_LISTA_START, NEW_LISTA_START, 1)
    print("Added cotizaciones search + detail view")
    fixes += 1
else:
    print("WARN: could not find cotizaciones lista start")
    # Try to find it
    idx = content.find('if(tab==="lista"){')
    if idx >= 0:
        print(f"  Found lista at {idx}, showing context:")
        print(repr(content[idx:idx+300]))

# Update the "Ver" button to open detail view instead of modal
OLD_VER_BTN = '                  <button style={{...B("#dbeafe","#1e40af"),fontSize:11,padding:"6px 12px"}} onClick={()=>setPreviewCot(c)}>Ver</button>'
NEW_VER_BTN = '                  <button style={{...B("#dbeafe","#1e40af"),fontSize:11,padding:"6px 12px"}} onClick={()=>setDetalleCot(c)}>👁 Ver detalle</button>'

if OLD_VER_BTN in content:
    content = content.replace(OLD_VER_BTN, NEW_VER_BTN, 1)
    print("Changed Ver button to open detail view")
    fixes += 1
else:
    print("WARN: could not find Ver button")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {fixes}")
print("Done!")
