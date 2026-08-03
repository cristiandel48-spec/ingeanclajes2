import Badge from "../../components/ui/Badge";
import CampoTexto from "../../components/ui/CampoTexto";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmt } from "../../lib/format";
import { avisoCelular, avisoCorreo, normalizarCorreo, normalizarDocumento, normalizarFrase, normalizarNombrePropio, normalizarTelefono } from "../../lib/normalizarEntrada";
export default function ClientesDB({ctx}){
  const {clientes,setClientes,obras,cotizaciones,certs,setObras,setCotizaciones,setCerts}=ctx;
  const clienteBase={nombre:"",nit:"",telefono:"",ciudad:"",direccion:"",contacto:"",email:"",estado:"Activo",notas:""};
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(clienteBase);

  const fuentesBrutas=[
    ...obras.map(o=>({
      nombre:o.cliente||"",
      nit:o.nit||"",
      telefono:o.tel||"",
      ciudad:o.ciudad||"",
      direccion:o.direccion||"",
      contacto:o.cliente||"",
      email:"",
      estado:"Activo",
      notas:o.proyecto?"Obra registrada: " + (o.proyecto):"",
    })),
    ...cotizaciones.map(c=>({
      nombre:c.cliente||"",
      nit:"",
      telefono:c.telefono||"",
      ciudad:c.ciudad||"",
      direccion:"",
      contacto:c.cliente||"",
      email:"",
      estado:"Activo",
      notas:c.obra?"Cotización " + (c.numero||"") + " · " + (c.obra):"Cotización " + (c.numero||""),
    })),
    ...certs.map(c=>({
      nombre:c.cliente||"",
      nit:c.nit||"",
      telefono:"",
      ciudad:"",
      direccion:c.direccion||"",
      contacto:c.cliente||"",
      email:"",
      estado:"Activo",
      notas:c.tipo?(c.tipo) + " " + (c.numero||""):"",
    })),
  ].filter(c=>String(c.nombre||"").trim());

  const fuentesMap=new Map();
  fuentesBrutas.forEach(item=>{
    const key=String(item.nombre||"").trim().toLowerCase();
    if(!key) return;
    const prev=fuentesMap.get(key) || {nombre:item.nombre,nit:"",telefono:"",ciudad:"",direccion:"",contacto:"",email:"",estado:"Activo",notas:""};
    fuentesMap.set(key,{
      ...prev,
      nombre:prev.nombre || item.nombre,
      nit:prev.nit || item.nit || "",
      telefono:prev.telefono || item.telefono || "",
      ciudad:prev.ciudad || item.ciudad || "",
      direccion:prev.direccion || item.direccion || "",
      contacto:prev.contacto || item.contacto || "",
      email:prev.email || item.email || "",
      estado:prev.estado || item.estado || "Activo",
      notas:prev.notas || item.notas || "",
    });
  });
  const sugeridos=[...fuentesMap.values()];

  const clientesData=clientes.map(c=>{
    const obrasCli=obras.filter(o=>o.cliente===c.nombre);
    const cotCli=cotizaciones.filter(q=>q.cliente===c.nombre);
    const certCli=certs.filter(x=>x.cliente===c.nombre);
    return {
      ...c,
      obrasActivas:obrasCli.filter(o=>o.estado==="En Obra").length,
      obrasTotal:obrasCli.length,
      cotizacionesTotal:cotCli.length,
      certificacionesTotal:certCli.length,
      totalFacturado:obrasCli.reduce((s,o)=>s+Number(o.total||0),0),
      saldoPendiente:obrasCli.reduce((s,o)=>s+Number(o.saldo||0),0),
    };
  }).sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||"")));

  const sinRegistrar=sugeridos.filter(s=>!clientes.some(c=>String(c.nombre||"").trim().toLowerCase()===String(s.nombre||"").trim().toLowerCase()));

  const totalFacturado=clientesData.reduce((s,c)=>s+c.totalFacturado,0);
  const saldoPendiente=clientesData.reduce((s,c)=>s+c.saldoPendiente,0);

  const resetCliente=()=>{
    setForm(clienteBase);
    setEditId(null);
    setShowForm(false);
  };

  const guardarCliente=()=>{
    if(!form.nombre.trim()){
      window.alert("Falta el nombre o razón social del cliente.");
      return;
    }
    // Se acomoda tambien aqui: quien pega el dato y guarda de una no dispara
    // el arreglo del campo, y estos textos salen impresos.
    const payload={
      nombre:normalizarNombrePropio(form.nombre),
      nit:normalizarDocumento(form.nit),
      telefono:normalizarTelefono(form.telefono),
      ciudad:normalizarNombrePropio(form.ciudad),
      direccion:normalizarFrase(form.direccion),
      contacto:normalizarNombrePropio(form.contacto),
      email:normalizarCorreo(form.email),
      estado:form.estado.trim() || "Activo",
      notas:normalizarFrase(form.notas),
    };

    const repetido=clientes.find(c=>c.id!==editId && normalizarNombrePropio(c.nombre)===payload.nombre);
    if(repetido && !window.confirm(`Ya existe un cliente llamado ${payload.nombre} (${repetido.id}).\n\n¿Aun así quieres crearlo otra vez?`)) return;

    if(editId){
      const anterior=clientes.find(c=>c.id===editId);
      setClientes(prev=>prev.map(c=>c.id===editId?{...c,...payload}:c));

      if(anterior && anterior.nombre!==payload.nombre){
        setObras(prev=>prev.map(o=>o.cliente===anterior.nombre?{...o,cliente:payload.nombre,nit:payload.nit||o.nit,tel:payload.telefono||o.tel,ciudad:payload.ciudad||o.ciudad,direccion:payload.direccion||o.direccion}:o));
        setCotizaciones(prev=>prev.map(c=>c.cliente===anterior.nombre?{...c,cliente:payload.nombre,telefono:payload.telefono||c.telefono,ciudad:payload.ciudad||c.ciudad}:c));
        setCerts(prev=>prev.map(c=>c.cliente===anterior.nombre?{...c,cliente:payload.nombre,nit:payload.nit||c.nit,direccion:payload.direccion||c.direccion}:c));
      }
    }else{
      const id="CLI-" + (String(clientes.length+1).padStart(3,"0"));
      setClientes(prev=>[...prev,{id,...payload}]);
    }

    resetCliente();
  };

  const editarCliente=(cli)=>{
    setEditId(cli.id);
    setForm({
      nombre:cli.nombre||"",
      nit:cli.nit||"",
      telefono:cli.telefono||"",
      ciudad:cli.ciudad||"",
      direccion:cli.direccion||"",
      contacto:cli.contacto||"",
      email:cli.email||"",
      estado:cli.estado||"Activo",
      notas:cli.notas||"",
    });
    setShowForm(true);
  };

  const importarClientes=()=>{
    if(!sinRegistrar.length) return;
    setClientes(prev=>[
      ...prev,
      ...sinRegistrar.map((c,idx)=>({
        id:"CLI-" + (String(prev.length+idx+1).padStart(3,"0")),
        ...c,
      }))
    ]);
  };

  return(
    <div style={{padding:28}}>
      <H1
        title="Clientes"
        subtitle="Base de datos comercial con historial de obras, saldo y contactos"
        action={
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {sinRegistrar.length>0&&(
              <button style={B("#dbeafe","#1d4ed8")} onClick={importarClientes}>
                ⬇ Importar {sinRegistrar.length} sugerido(s)
              </button>
            )}
            <button style={B("#cc0000")} onClick={()=>{setShowForm(v=>!v); if(showForm) resetCliente();}}>
              + Cliente
            </button>
          </div>
        }
      />


      {showForm&&(
        <div style={{...CD,marginBottom:18,border:"1px solid #cc0000"}}>
          <div style={ST}>{editId?"Editar cliente":"Nuevo cliente"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <CampoTexto label="Nombre / razón social" valor={form.nombre} onChange={v=>setForm({...form,nombre:v})}
              normalizar={normalizarNombrePropio} placeholder="Nombre del cliente" autoCapitalize="words"
              ayuda="Sale impreso en cotizaciones y certificados."/>
            <CampoTexto label="NIT" valor={form.nit} onChange={v=>setForm({...form,nit:v})}
              normalizar={normalizarDocumento} placeholder="900.123.456-7" spellCheck={false}/>
            <CampoTexto label="Contacto" valor={form.contacto} onChange={v=>setForm({...form,contacto:v})}
              normalizar={normalizarNombrePropio} placeholder="Persona de contacto" autoCapitalize="words"/>
            <CampoTexto label="Teléfono" valor={form.telefono} onChange={v=>setForm({...form,telefono:v})}
              normalizar={normalizarTelefono} revisar={avisoCelular} placeholder="3001234567" inputMode="tel" spellCheck={false}/>
            <CampoTexto label="Ciudad" valor={form.ciudad} onChange={v=>setForm({...form,ciudad:v})}
              normalizar={normalizarNombrePropio} placeholder="Medellín, Antioquia" autoCapitalize="words"/>
            <div>
              <LBL>Estado</LBL>
              <select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})} style={SI}>
                <option value="Activo">Activo</option>
                <option value="En seguimiento">En seguimiento</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <CampoTexto label="Dirección" valor={form.direccion} onChange={v=>setForm({...form,direccion:v})}
              normalizar={normalizarFrase} placeholder="Dirección principal" wrapStyle={{gridColumn:"span 2"}}/>
            <CampoTexto label="Email" valor={form.email} onChange={v=>setForm({...form,email:v})}
              normalizar={normalizarCorreo} revisar={avisoCorreo} placeholder="correo@cliente.com"
              inputMode="email" autoCapitalize="off" spellCheck={false}
              ayuda="A este correo se envían las cotizaciones."/>
            <div style={{gridColumn:"span 3"}}>
              <LBL>Notas</LBL>
              <textarea value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})}
                onBlur={e=>{const v=normalizarFrase(e.target.value);if(v!==form.notas)setForm({...form,notas:v});}}
                rows={3} placeholder="Observaciones comerciales, sedes, condiciones, etc." spellCheck lang="es"
                style={{...SI,minHeight:86,resize:"vertical"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={B("#cc0000")} onClick={guardarCliente}>{editId?"Guardar cambios":"Crear cliente"}</button>
            <button style={B("#f1f5f9","#475569")} onClick={resetCliente}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={CD}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={ST}>Directorio de clientes</div>
          <div style={{fontSize:11,color:"#64748b"}}>Datos comerciales + relación con obras, cotizaciones y certificaciones</div>
        </div>

        {clientesData.length===0 ? (
          <div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>No hay clientes registrados todavía</div>
        ) : (
          <div style={{display:"grid",gap:12}}>
            {clientesData.map(c=>(
              <div key={c.id} style={{background:"#f8fafc",borderRadius:10,padding:"16px 18px",border:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:"#1a1a2e"}}>{c.nombre}</div>
                    <div style={{fontSize:11,color:"#64748b",marginTop:3}}>
                      {c.nit || "Sin NIT"} · {c.contacto || "Sin contacto"} · {c.telefono || "Sin teléfono"}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <Badge estado={c.estado || "Activo"}/>
                    <button style={{...B("#f1f5f9","#475569"),padding:"7px 12px",fontSize:11}} onClick={()=>editarCliente(c)}>Editar</button>
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr 1fr",gap:10,fontSize:11,color:"#475569"}}>
                  <div><strong style={{color:"#1a1a2e"}}>Ciudad / dirección</strong><br/>{c.ciudad || "Sin ciudad"}{c.direccion?" · " + (c.direccion):""}</div>
                  <div><strong style={{color:"#1a1a2e"}}>Email</strong><br/>{c.email || "Sin email"}</div>
                  <div><strong style={{color:"#1a1a2e"}}>Obras / cotizaciones</strong><br/>{c.obrasTotal} obra(s) · {c.cotizacionesTotal} cotización(es)</div>
                  <div><strong style={{color:"#1a1a2e"}}>Certificaciones</strong><br/>{c.certificacionesTotal} registro(s)</div>
                </div>

                <div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,flexWrap:"wrap",gap:10}}>
                  <div style={{color:"#64748b",maxWidth:"70%"}}>
                    {c.notas || "Sin notas registradas"}
                  </div>
                  <div style={{display:"flex",gap:18,alignItems:"center"}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:"#94a3b8"}}>Facturado</div>
                      <div style={{fontWeight:800,color:"#166534"}}>{fmt(c.totalFacturado)}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:"#94a3b8"}}>Saldo</div>
                      <div style={{fontWeight:800,color:c.saldoPendiente?"#c2410c":"#166534"}}>{c.saldoPendiente?fmt(c.saldoPendiente):"Al día"}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

