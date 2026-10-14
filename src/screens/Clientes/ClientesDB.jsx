import Badge from "../../components/ui/Badge";
import CampoTexto from "../../components/ui/CampoTexto";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useEffect, useRef, useState } from "react";
import ListaClientes from "./ListaClientes";
import ModalUnificarCliente from "./ModalUnificarCliente";
import SelectorCiudadColombia from "../../components/SelectorCiudadColombia";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import { B, CD, SI, ST } from "../../styles/tokens";
import { avisoCelular, avisoCorreo, normalizarCorreo, normalizarDocumento, normalizarFrase, normalizarMayusculas, normalizarNombrePropio, normalizarRazonSocial, normalizarTelefono } from "../../lib/normalizarEntrada";
import { siguienteIdUnico } from "../../lib/identificadores";
import { useIsMobile } from "../../hooks/useMediaQuery";
export default function ClientesDB({ctx}){
  const isMobile = useIsMobile();
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
    if(!form.nombre?.trim()){
      window.alert("Falta el nombre o razón social del cliente.");
      return;
    }
    if(!form.direccion?.trim()){
      window.alert("La dirección es obligatoria para registrar al cliente.");
      return;
    }
    // Se acomoda tambien aqui: quien pega el dato y guarda de una no dispara
    // el arreglo del campo, y estos textos salen impresos.
    const payload={
      nombre:normalizarRazonSocial(form.nombre),
      nit:form.nit?.trim() ? normalizarDocumento(form.nit) : "",
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
    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
      {sinRegistrar.length > 0 && (
        <button
          style={{
            background: "var(--surface, #ffffff)",
            color: "var(--text-main, #101828)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
            borderRadius: 8,
            padding: "7px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
          onClick={() => importarRef.current()}
        >
          ⬇ Importar {sinRegistrar.length} sugerido(s)
        </button>
      )}
      <button
        style={{
          background: showForm ? "var(--surface, #ffffff)" : "#f47c20",
          color: showForm ? "var(--text-main, #101828)" : "#ffffff",
          border: showForm ? "1px solid var(--border, rgba(0, 0, 0, 0.12))" : "none",
          borderRadius: 8,
          padding: "7px 14px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
        onClick={() => nuevoRef.current()}
      >
        {showForm ? "✕ Cerrar" : "+ Cliente"}
      </button>
    </div>,
    [sinRegistrar.length, showForm]
  );

  return (
    <div
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "14px 16px 28px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <H1
        eyebrow="DIRECTORIO COMERCIAL"
        title="Clientes y Contratistas"
        subtitle={`${clientesData.length} cliente(s) registrado(s) · Base de datos centralizada de clientes y terceros`}
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {sinRegistrar.length > 0 && (
              <button
                style={{
                  background: "var(--surface, #ffffff)",
                  color: "var(--text-main, #101828)",
                  border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
                  borderRadius: 10,
                  padding: "7px 13px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={importarClientes}
              >
                <span>⬇</span>
                <span>Importar {sinRegistrar.length} sugeridos</span>
              </button>
            )}
            <button
              style={{
                background: showForm ? "var(--surface, #ffffff)" : "#f47c20",
                color: showForm ? "var(--text-main, #101828)" : "#ffffff",
                border: showForm ? "1px solid var(--border, rgba(0, 0, 0, 0.12))" : "none",
                borderRadius: 10,
                padding: "7px 15px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={() => {
                setShowForm((v) => !v);
                if (showForm) resetCliente();
              }}
            >
              <span>{showForm ? "✕" : "+"}</span>
              <span>{showForm ? "Cerrar formulario" : "Nuevo cliente"}</span>
            </button>
          </div>
        }
      />

      {showForm && (
        <div
          style={{
            ...CD,
            marginBottom: 20,
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            boxShadow: "0 4px 20px -4px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={ST}>{editId ? "Editar cliente" : "Nuevo cliente"}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <CampoTexto label="Nombre / razón social" obligatorio={true} valor={form.nombre} onChange={v=>setForm({...form,nombre:v})}
              normalizar={normalizarRazonSocial} placeholder="Nombre del cliente" autoCapitalize="characters"
              ayuda="Sale impreso en cotizaciones y certificados."/>
            <CampoTexto label="NIT / Cédula" valor={form.nit} onChange={v=>setForm({...form,nit:v})}
              normalizar={normalizarDocumento} placeholder="900.123.456-7" spellCheck={false}
              ayuda="Opcional. Identificación tributaria o personal."/>
            <CampoTexto label="Contacto" valor={form.contacto} onChange={v=>setForm({...form,contacto:v})}
              normalizar={normalizarNombrePropio} placeholder="Persona de contacto" autoCapitalize="words"/>
            <CampoTexto label="Teléfono" valor={form.telefono} onChange={v=>setForm({...form,telefono:v})}
              normalizar={normalizarTelefono} revisar={avisoCelular} placeholder="3001234567" inputMode="tel" spellCheck={false}/>
            <SelectorCiudadColombia
              label="Ciudad / Ubicación"
              valor={form.ciudad}
              onChange={v=>setForm({...form,ciudad:v})}
              ayuda="Inicia en Antioquia. Selecciona el municipio y se completa automáticamente."
            />
            <div>
              <LBL>Estado</LBL>
              <select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})} style={SI}>
                <option value="Activo">Activo</option>
                <option value="En seguimiento">En seguimiento</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <CampoTexto label="Dirección" obligatorio={true} valor={form.direccion} onChange={v=>setForm({...form,direccion:v})}
              normalizar={normalizarMayusculas} placeholder="Dirección principal" autoCapitalize="characters" wrapStyle={{gridColumn: isMobile ? "auto" : "span 2"}}
              ayuda="Obligatorio. Domicilio principal del cliente."/>
            <CampoTexto label="Email" valor={form.email} onChange={v=>setForm({...form,email:v})}
              normalizar={normalizarCorreo} revisar={avisoCorreo} placeholder="correo@cliente.com"
              inputMode="email" autoCapitalize="off" spellCheck={false}
              ayuda="A este correo se envían las cotizaciones."/>
            <div style={{gridColumn: isMobile ? "auto" : "1 / -1"}}>
              <LBL>Notas</LBL>
              <textarea value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})}
                onBlur={e=>{const v=normalizarFrase(e.target.value);if(v!==form.notas)setForm({...form,notas:v});}}
                rows={3} placeholder="Observaciones comerciales, sedes, condiciones, etc." spellCheck lang="es"
                style={{...SI,minHeight:86,resize:"vertical"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button style={{...B("#f47c20"),boxShadow:"0 1px 3px rgba(244, 124, 32, 0.25)"}} onClick={guardarCliente}>
              {editId?"Guardar cambios":"Crear cliente"}
            </button>
            <button style={{...B("var(--surface, #ffffff)","var(--text-main, #101828)"),border:"1px solid var(--border, rgba(0, 0, 0, 0.12))"}} onClick={resetCliente}>
              Cancelar
            </button>
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

