import Badge from "../../components/ui/Badge";
import CampoTexto from "../../components/ui/CampoTexto";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import ObraDetalle from "./ObraDetalle";
import { useEffect, useState } from "react";
import { useSubirAlFormulario } from "../../hooks/useSubirAlFormulario";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import { B, CD, SI, ST } from "../../styles/tokens";
import { scrollAppToTop, today } from "../../lib/format";
import { getQuoteApprovalAccountingSnapshot } from "../../lib/cotizaciones";
import { ESTADOS_OBRA, estadoSegunAvance, obraEstaCerrada } from "../../lib/flujoObra";
import { esAdmin } from "../../lib/permisos";
import ListaObras from "./ListaObras";
import BuscadorCliente from "../../components/BuscadorCliente";
import { avisoCelular, avisoCorreo, normalizarCorreo, normalizarMayusculas, normalizarNombrePropio, normalizarRazonSocial, normalizarTelefono } from "../../lib/normalizarEntrada";
import { clientesConQuienRecibe } from "../../lib/quienRecibe";
import { resolverAutorGuardado } from "../../lib/autorAuditoria";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { confirmar } from "../../lib/dialogos";

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
  const isMobile = useIsMobile();
  const {obras,setObras,cotizaciones,horarios,intencion,limpiarIntencion,membresia,asegurarDetalle,clientes}=ctx;

  const clientesConocidos = (() => {
    const mapa = new Map();
    const registrar = (d) => {
      const nom = normalizarRazonSocial(d?.nombre || d?.cliente);
      if (!nom) return;
      mapa.set(nom, {
        nombre: nom,
        telefono: d.telefono || d.tel || "",
        ciudad: d.ciudad || "",
        direccion: d.direccion || "",
        contacto: d.contacto || d.recibeNombre || "",
        email: d.email || d.recibeEmail || d.contactoEmail || "",
      });
    };
    (clientes || []).forEach(registrar);
    (obras || []).forEach(registrar);
    (cotizaciones || []).forEach(registrar);
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  })();
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
  // «Nueva Obra» va en la barra de arriba y se pulsa con la lista ya bajada;
  // el formulario sale arriba de la lista, asi que se sube hasta el.
  const [formRef, subirAlFormulario] = useSubirAlFormulario();
  const alternarNuevaObra = ()=>{
    if(!showNO) subirAlFormulario();
    setShowNO((v)=>!v);
  };
  // El detalle de una obra reemplaza a la lista en el mismo <main>: al abrir
  // una de abajo se caia a media pagina. Empieza arriba.
  useEffect(()=>{
    if(sel) scrollAppToTop("auto");
  }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // `estado` y `avance` van en el formulario porque muchas obras se cargan al
  // sistema cuando ya llevan tiempo ejecutandose: arrancar siempre en 0% las
  // dejaba mal desde el primer dia.
  const [nob,setNob]=useState({cliente:"",tel:"",proyecto:"",ciudad:"",direccion:"",fechaInicio:today(),fechaFin:"",estado:"En Obra",avance:0,cotizacionId:"",recibeNombre:"",recibeEmail:""});

  // El avance ya no se cambia desde la lista: solo en las jornadas de la obra
  // (inicial + lo que suma cada una). El estado si.
  // Comprueba el bloqueo aunque la pantalla ya lo esconda: la funcion se
  // puede seguir llamando desde otro sitio, y el dato es el mismo.
  const updEst=(id,e)=>setObras(p=>p.map((o)=>{
    if(o.id!==id) return o;
    if(obraEstaCerrada(o) && !puedeDesbloquear) return o;
    const autorActual = resolverAutorGuardado(ctx?.membresia, o.modificadoPorNombre);
    return {
      ...o,
      estado:e,
      modificadoPorNombre: autorActual || o.modificadoPorNombre,
      modificadoEn: new Date().toISOString(),
    };
  }));
  const updEnviado=(id,valor)=>setObras(p=>p.map((o)=>{
    if(o.id!==id) return o;
    const nuevo = typeof valor === "boolean" ? valor : !o.enviadoAlCliente;
    const ahoraIso = new Date().toISOString();
    const autorActual = resolverAutorGuardado(ctx?.membresia, o.modificadoPorNombre);
    return {
      ...o,
      enviadoAlCliente: nuevo,
      fechaEnvioCliente: nuevo ? (o.fechaEnvioCliente || ahoraIso) : null,
      modificadoPor: ctx?.membresia?.userId || null,
      modificadoPorNombre: autorActual || o.modificadoPorNombre,
      modificadoEn: ahoraIso,
    };
  }));

  const guardarObra=async()=>{
    if(!nob.cliente.trim()){
      window.alert("Falta el nombre del cliente. Es lo único obligatorio para crear la obra.");
      return;
    }
    const clienteLimpio=normalizarRazonSocial(nob.cliente);
    const yaExiste=obras.find((o)=>normalizarRazonSocial(o.cliente)===clienteLimpio && normalizarMayusculas(o.proyecto)===normalizarMayusculas(nob.proyecto));
    if(yaExiste && !(await confirmar(`¿Crear otra obra de todos modos?\n\nYa hay una obra de ${clienteLimpio} con ese mismo proyecto (${yaExiste.id}).`))) return;
    const id=siguienteIdObra(obras);
    const cotizacionVinculada = nob.cotizacionId ? cotizaciones.find((cotizacion)=>cotizacion.id===nob.cotizacionId) : null;
    const snapshot = cotizacionVinculada ? getQuoteApprovalAccountingSnapshot(cotizacionVinculada) : null;
    // El valor sale de la cotizacion vinculada o queda en cero: en este
    // formulario no se piden cifras.
    const totalObra = snapshot?.totalObra ?? 0;
    const cobrado = 0;
    const autorActual = resolverAutorGuardado(ctx?.membresia);
    const ahoraIso = new Date().toISOString();
    // Quien recibe los informes: lo escrito, o el contacto de la cotizacion.
    const recibeNombre = normalizarNombrePropio(nob.recibeNombre || cotizacionVinculada?.contacto || "");
    const recibeEmail = normalizarCorreo(nob.recibeEmail || cotizacionVinculada?.contactoEmail || "");

    setObras(p=>[...p,{
      ...nob,
      // Igual que en el empleado: quien pega y guarda de una no dispara el
      // arreglo del campo, y estos textos salen impresos.
      cliente:normalizarRazonSocial(nob.cliente),
      proyecto:normalizarMayusculas(nob.proyecto),
      ciudad:normalizarMayusculas(nob.ciudad),
      direccion:normalizarMayusculas(nob.direccion),
      tel:normalizarTelefono(nob.tel),
      recibeNombre,
      recibeEmail,
      id,
      nit:"",
      coords:"",
      estado:estadoSegunAvance(nob.avance,nob.estado || "En Obra"),
      // El que trae al entrar al sistema queda como avance inicial: las
      // jornadas suman a partir de ahi.
      avance:Math.min(100,Math.max(0,Number(nob.avance || 0))),
      avanceInicial:Math.min(100,Math.max(0,Number(nob.avance || 0))),
      total:totalObra,
      pagado:cobrado,
      saldo:totalObra-cobrado,
      costos:0,
      empleados:[],
      trazos:[],
      anclajes:[],
      bitacora:[],
      enviadoAlCliente: false,
      fechaEnvioCliente: null,
      subtotalCotizacion:snapshot?.subtotalCotizacion ?? 0,
      utilidadCotizacion:snapshot?.utilidadCotizacion ?? 0,
      baseIngresoContable:snapshot?.baseIngresoContable ?? totalObra,
      ivaGeneradoCotizacion:snapshot?.ivaGeneradoCotizacion ?? 0,
      creadoPor: ctx?.membresia?.userId || null,
      creadoPorNombre: autorActual || "Camila Sepúlveda",
      creadoEn: ahoraIso,
      modificadoPor: ctx?.membresia?.userId || null,
      modificadoPorNombre: autorActual || "Camila Sepúlveda",
      modificadoEn: ahoraIso,
    }]);
    if(recibeEmail && ctx.setClientes){
      ctx.setClientes((prev)=>clientesConQuienRecibe(prev,{cliente:normalizarRazonSocial(nob.cliente),tel:normalizarTelefono(nob.tel),ciudad:normalizarMayusculas(nob.ciudad),direccion:normalizarMayusculas(nob.direccion)},{nombre:recibeNombre,email:recibeEmail}));
    }
    if(nob.cotizacionId){
      ctx.setCotizaciones(p=>p.map(c=>c.id===nob.cotizacionId?{...c,estado:"Aprobada",obraId:id}:c));
    }
    setNob({cliente:"",tel:"",proyecto:"",ciudad:"",direccion:"",fechaInicio:today(),fechaFin:"",estado:"En Obra",avance:0,cotizacionId:"",recibeNombre:"",recibeEmail:""});
    setShowNO(false);
  };

  // Botón superior de Nueva Obra (se integra en la barra superior junto al usuario e indicador de guardado)
  // Con una obra abierta la barra la llena ObraDetalle.
  useAccionesPantalla(
    sel ? undefined : (
      <button
        type="button"
        style={{
          background: showNO ? "rgba(220, 38, 38, 0.08)" : "#f47c20",
          color: showNO ? "#b91c1c" : "#ffffff",
          border: `1px solid ${showNO ? "rgba(220, 38, 38, 0.25)" : "#f47c20"}`,
          borderRadius: 8,
          padding: isMobile ? "6px 12px" : "7px 15px",
          fontSize: isMobile ? 12 : 12.5,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          boxShadow: showNO ? "none" : "0 1px 2px rgba(244, 124, 32, 0.25)",
        }}
        onClick={alternarNuevaObra}
      >
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{showNO ? "✕" : "+"}</span>
        <span>{showNO ? (isMobile ? "Cerrar" : "Cerrar formulario") : "Nueva Obra"}</span>
      </button>
    ),
    [sel, showNO, isMobile]
  );

  // Si hay obra seleccionada, mostramos pantalla completa de esa obra
  if(sel){
    return <ObraDetalle obraId={sel.id} ctx={ctx} onVolver={()=>setSel(null)}/>;
  }

  return(
    <div style={{padding: isMobile ? "10px 0 28px" : "14px 28px 28px", width: "100%", boxSizing: "border-box"}}>

      {showNO && (
        <div
          ref={formRef}
          style={{
            scrollMarginTop: 16,
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            borderRadius: 16,
            padding: isMobile ? "16px 14px" : "20px 24px",
            marginBottom: 20,
            boxShadow: "0 4px 16px -2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-main, #101828)", letterSpacing: "-0.01em" }}>
                Registrar Nueva Obra
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted, #667085)", marginTop: 2 }}>
                Ingresa los datos del proyecto y vincula una cotización comercial si corresponde.
              </div>
            </div>
            <span
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--text-muted, #667085)",
                background: "var(--surface-subtle, #f1f5f9)",
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid var(--border, rgba(0,0,0,0.08))",
              }}
            >
              Próximo código: {siguienteIdObra(obras)}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <BuscadorCliente
              label="Cliente"
              valor={nob.cliente}
              clientes={clientesConocidos}
              onEscribir={(v) => setNob({ ...nob, cliente: v })}
              onElegir={(c) => setNob({
                ...nob,
                cliente: c.nombre,
                tel: c.telefono || nob.tel,
                ciudad: c.ciudad || nob.ciudad,
                direccion: c.direccion || nob.direccion,
                recibeNombre: nob.recibeNombre || c.contacto || "",
                recibeEmail: nob.recibeEmail || c.email || "",
              })}
              ayuda="Toca o escribe para elegir un cliente existente y evitar duplicados."
            />
            <CampoTexto label="Teléfono" valor={nob.tel} onChange={v=>setNob({...nob,tel:v})}
              normalizar={normalizarTelefono} revisar={avisoCelular} placeholder="3001234567" inputMode="tel" spellCheck={false}/>
            <CampoTexto label="Proyecto / Descripción" valor={nob.proyecto} onChange={v=>setNob({...nob,proyecto:v})}
              normalizar={normalizarMayusculas} placeholder="Ej: Líneas de vida cubierta" autoCapitalize="characters"/>
            <CampoTexto label="Ciudad" valor={nob.ciudad} onChange={v=>setNob({...nob,ciudad:v})}
              normalizar={normalizarMayusculas} placeholder="Ej: Medellín, Antioquia" autoCapitalize="characters"/>
            <CampoTexto label="Dirección" valor={nob.direccion} onChange={v=>setNob({...nob,direccion:v})}
              normalizar={normalizarMayusculas} placeholder="Dirección de la obra" autoCapitalize="characters"/>
            <CampoTexto label="Quién recibe los informes" valor={nob.recibeNombre} onChange={v=>setNob({...nob,recibeNombre:v})}
              normalizar={normalizarNombrePropio} placeholder="Residente o interventor de la obra" autoComplete="off"/>
            <CampoTexto label="Correo de quien recibe" valor={nob.recibeEmail} onChange={v=>setNob({...nob,recibeEmail:v})}
              normalizar={normalizarCorreo} revisar={avisoCorreo} placeholder="residente@constructora.com" inputMode="email" spellCheck={false}
              ayuda="A este correo llegan los informes para firma de recibido. Se pide antes del primer registro de bitácora."/>            <div>
              <LBL>Fecha inicio</LBL>
              <input type="date" value={nob.fechaInicio} onChange={e=>setNob({...nob,fechaInicio:e.target.value})} style={SI}/>
              <div style={{fontSize:10.5,color:"var(--text-subtle, #94a3b8)",marginTop:3}}>La fecha real en que empezaron.</div>
            </div>
            <div>
              <LBL>Fecha fin estimada</LBL>
              <input type="date" value={nob.fechaFin} onChange={e=>setNob({...nob,fechaFin:e.target.value})} style={SI}/>
            </div>
            <div>
              <LBL>Estado actual</LBL>
              <select value={nob.estado} onChange={e=>setNob({...nob,estado:e.target.value})} style={SI}>
                {ESTADOS_OBRA.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <LBL>Avance con el que llega (%)</LBL>
              <input type="number" min={0} max={100} value={nob.avance} onChange={e=>setNob({...nob,avance:parseInt(e.target.value,10)||0})} style={SI}/>
            </div>
            <div style={{ gridColumn: isMobile ? "span 1" : "span 3" }}>
              <LBL>Vincular cotización comercial (opcional)</LBL>
              <select value={nob.cotizacionId} onChange={e=>setNob({...nob,cotizacionId:e.target.value})} style={SI}>
                <option value="">Sin cotización vinculada</option>
                {cotizaciones.filter(c=>!c.obraId).map(c=><option key={c.id} value={c.id}>{c.numero} · {c.cliente} {c.total ? `($${c.total.toLocaleString()})` : ""}</option>)}
              </select>
              <div style={{fontSize:10.5,color:"var(--text-subtle, #94a3b8)",marginTop:3}}>Si la vinculas, toma el valor total de la cotización y esa pasa a estado «Aprobada».</div>
            </div>
          </div>

          <div style={{display:"flex",gap:10,justifyContent:"flex-end",borderTop:"1px solid var(--border, rgba(0,0,0,0.06))",paddingTop:12}}>
            <button
              onClick={()=>setShowNO(false)}
              style={{
                background: "var(--surface-subtle, #f2f4f7)",
                color: "var(--text-muted, #475467)",
                border: "1px solid var(--border, #eaecf0)",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 15px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={guardarObra}
              style={{
                background: "#f47c20",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 18px",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(244, 124, 32, 0.25)",
                transition: "all 0.15s ease",
              }}
            >
              ✓ Crear Obra
            </button>
          </div>
        </div>
      )}

      <ListaObras
        obras={obras}
        cotizaciones={cotizaciones}
        horarios={horarios}
        onAbrir={(o)=>{ setSel(o); asegurarDetalle("obras", o.id); }}
        onCambiarEstado={updEst}
        onToggleEnviado={updEnviado}
        puedeDesbloquear={puedeDesbloquear}
      />
    </div>
  );
}

// ── DETALLE COMPLETO DE UNA OBRA ──

