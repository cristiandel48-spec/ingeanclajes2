import Badge from "../../components/ui/Badge";
import CampoTexto from "../../components/ui/CampoTexto";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useEffect, useRef, useState } from "react";
import ListaClientes from "./ListaClientes";
import ModalUnificarCliente from "./ModalUnificarCliente";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import { B, CD, SI, ST } from "../../styles/tokens";
import { avisoCelular, avisoCorreo, normalizarCorreo, normalizarDocumento, normalizarFrase, normalizarMayusculas, normalizarNombrePropio, normalizarRazonSocial, normalizarTelefono } from "../../lib/normalizarEntrada";
import { siguienteIdUnico } from "../../lib/identificadores";
export default function ClientesDB({ctx}){
  const {clientes,setClientes,obras,cotizaciones,certs,setObras,setCotizaciones,setCerts}=ctx;
  const clienteBase={nombre:"",nit:"",telefono:"",ciudad:"",direccion:"",contacto:"",email:"",estado:"Activo",notas:""};
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(clienteBase);
  const [clienteAUnificar,setClienteAUnificar]=useState(null);

  const fuentesBrutas=[
    ...obras.map(o=>({
      nombre:o.cliente||"",
      nit:o.nit||"",
      telefono:o.tel||"",
      ciudad:o.ciudad||"",
      direccion:o.direccion||"",
      contacto:"",
      email:"",
      estado:"Activo",
      notas:o.proyecto?"Obra registrada: " + (o.proyecto):"",
    })),
    ...cotizaciones.map(c=>({
      nombre:c.cliente||"",
      nit:c.nit||"",
      telefono:c.telefono||"",
      ciudad:c.ciudad||"",
      direccion:c.direccion||"",
      contacto:c.contacto||"",
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
      contacto:"",
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
    };
  }).sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||"")));

  const sinRegistrar=sugeridos.filter(s=>!clientes.some(c=>String(c.nombre||"").trim().toLowerCase()===String(s.nombre||"").trim().toLowerCase()));


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
      nombre:normalizarRazonSocial(form.nombre),
      nit:normalizarDocumento(form.nit),
      telefono:normalizarTelefono(form.telefono),
      ciudad:normalizarMayusculas(form.ciudad),
      direccion:normalizarMayusculas(form.direccion),
      contacto:normalizarNombrePropio(form.contacto),
      email:normalizarCorreo(form.email),
      estado:form.estado.trim() || "Activo",
      notas:normalizarFrase(form.notas),
    };

    const repetido=clientes.find(c=>c.id!==editId && normalizarRazonSocial(c.nombre)===payload.nombre);
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
      const id=siguienteIdUnico(clientes,"CLI");
      setClientes(prev=>[...prev,{id,...payload}]);
    }

    resetCliente();
  };

  // Unifica dos fichas del mismo tercero. Pasa cuando el nombre se escribio
  // distinto -"SANDIEDO" por "SANDIEGO"- y el sistema las tomo por clientes
  // distintos: cada una se quedo con parte de las obras y las cotizaciones.
  // Unifica dos fichas del mismo tercero. Abre el modal interactivo con buscador.
  const unificarCliente=(cli)=>{
    const otros=clientesData.filter(c=>c.id!==cli.id);
    if(!otros.length){
      window.alert("No hay otro cliente registrado con el que se pueda unificar.");
      return;
    }
    setClienteAUnificar(cli);
  };

  const ejecutarUnificacion=(origen, destino)=>{
    if(!origen || !destino || origen.id === destino.id) return;
    const viejo=origen.nombre;
    const nuevo=destino.nombre;

    const coincideNombre=(nombre)=>{
      if(!nombre) return false;
      const n1 = normalizarRazonSocial(nombre);
      const n2 = normalizarRazonSocial(viejo);
      if(n1 && n2 && n1 === n2) return true;
      return String(nombre).trim().toLowerCase() === String(viejo).trim().toLowerCase();
    };

    setObras(prev=>prev.map(o=>coincideNombre(o.cliente)?{...o,cliente:nuevo}:o));
    setCotizaciones(prev=>prev.map(c=>coincideNombre(c.cliente)?{...c,cliente:nuevo}:c));
    setCerts(prev=>prev.map(c=>coincideNombre(c.cliente)?{...c,cliente:nuevo}:c));

    // Lo que le falte al que se queda se completa con lo de la ficha que se va.
    setClientes(prev=>prev
      .map(c=>c.id!==destino.id ? c : {
        ...c,
        nit:c.nit || origen.nit || "",
        telefono:c.telefono || origen.telefono || "",
        ciudad:c.ciudad || origen.ciudad || "",
        direccion:c.direccion || origen.direccion || "",
        contacto:c.contacto || origen.contacto || "",
        email:c.email || origen.email || "",
        notas:[c.notas,origen.notas].filter(Boolean).join(" · "),
      })
      .filter(c=>c.id!==origen.id)
    );

    setClienteAUnificar(null);
  };

  const eliminarCliente=(cli)=>{
    const atado=cli.obrasTotal+cli.cotizacionesTotal+cli.certificacionesTotal;
    if(atado>0){
      window.alert(
        `«${cli.nombre}» tiene ${cli.obrasTotal} obra(s), ${cli.cotizacionesTotal} cotización(es) y ` +
        `${cli.certificacionesTotal} certificación(es).\n\n` +
        "Si borras la ficha, esos documentos se quedan con el nombre y vuelve a aparecer como " +
        "cliente sugerido. Usa «Unificar» para pasarlos a otro cliente."
      );
      return;
    }
    if(!window.confirm(`¿Eliminar la ficha de «${cli.nombre}»?\n\nNo tiene obras ni documentos asociados.`)) return;
    setClientes(prev=>prev.filter(c=>c.id!==cli.id));
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

  // El id se saca del numero mas alto que ya existe, no de cuantos clientes
  // hay. Contando bastaba con haber borrado uno para que el id nuevo cayera
  // encima de otro que seguia ahi -con dos CLI-003 en la lista-, y al guardar
  // Postgres rechazaba el lote entero: «ON CONFLICT DO UPDATE command cannot
  // affect row a second time». Se perdia el guardado completo, no solo el
  // cliente repetido.
  const importarClientes=()=>{
    if(!sinRegistrar.length) return;
    setClientes(prev=>{
      // Se van acumulando para que los importados de un mismo golpe tampoco
      // choquen entre ellos.
      const nuevos=[];
      for(const c of sinRegistrar){
        nuevos.push({ id:siguienteIdUnico([...prev,...nuevos],"CLI"), ...c });
      }
      return [...prev,...nuevos];
    });
  };

  const importarRef = useRef(null);
  const nuevoRef = useRef(null);
  useEffect(()=>{
    importarRef.current = importarClientes;
    nuevoRef.current = ()=>{ setShowForm((v)=>!v); if(showForm) resetCliente(); };
  });

  // Los botones viven en la barra de arriba, no en un titulo propio.
  useAccionesPantalla(
    <div style={{display:"flex",gap:7}}>
      {sinRegistrar.length>0 && (
        <button
          style={{background:"#dbeafe",color:"#1d4ed8",border:"1px solid #bfdbfe",borderRadius:9,
            padding:"8px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}
          onClick={()=>importarRef.current()}
        >⬇ Importar {sinRegistrar.length} sugerido(s)</button>
      )}
      <button
        style={{background:"#cc0000",color:"#fff",border:"1px solid #cc0000",borderRadius:9,
          padding:"8px 16px",fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}
        onClick={()=>nuevoRef.current()}
      >+ Cliente</button>
    </div>,
    [sinRegistrar.length]
  );

  return(
    <div style={{padding:28}}>


      {showForm&&(
        <div style={{...CD,marginBottom:18,border:"1px solid #cc0000"}}>
          <div style={ST}>{editId?"Editar cliente":"Nuevo cliente"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <CampoTexto label="Nombre / razón social" valor={form.nombre} onChange={v=>setForm({...form,nombre:v})}
              normalizar={normalizarRazonSocial} placeholder="Nombre del cliente" autoCapitalize="characters"
              ayuda="Sale impreso en cotizaciones y certificados."/>
            <CampoTexto label="NIT" valor={form.nit} onChange={v=>setForm({...form,nit:v})}
              normalizar={normalizarDocumento} placeholder="900.123.456-7" spellCheck={false}/>
            <CampoTexto label="Contacto" valor={form.contacto} onChange={v=>setForm({...form,contacto:v})}
              normalizar={normalizarNombrePropio} placeholder="Persona de contacto" autoCapitalize="words"/>
            <CampoTexto label="Teléfono" valor={form.telefono} onChange={v=>setForm({...form,telefono:v})}
              normalizar={normalizarTelefono} revisar={avisoCelular} placeholder="3001234567" inputMode="tel" spellCheck={false}/>
            <CampoTexto label="Ciudad" valor={form.ciudad} onChange={v=>setForm({...form,ciudad:v})}
              normalizar={normalizarMayusculas} placeholder="Medellín, Antioquia" autoCapitalize="characters"/>
            <div>
              <LBL>Estado</LBL>
              <select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})} style={SI}>
                <option value="Activo">Activo</option>
                <option value="En seguimiento">En seguimiento</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <CampoTexto label="Dirección" valor={form.direccion} onChange={v=>setForm({...form,direccion:v})}
              normalizar={normalizarMayusculas} placeholder="Dirección principal" autoCapitalize="characters" wrapStyle={{gridColumn:"span 2"}}/>
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

      <ListaClientes
        clientes={clientesData}
        acciones={{
          editar: (c)=>editarCliente(c),
          unificar: (c)=>unificarCliente(c),
          eliminar: (c)=>eliminarCliente(c),
        }}
      />

      {clienteAUnificar && (
        <ModalUnificarCliente
          clienteOrigen={clienteAUnificar}
          clientesDisponibles={clientesData}
          onCerrar={()=>setClienteAUnificar(null)}
          onUnificar={ejecutarUnificacion}
        />
      )}
    </div>
  );
}

