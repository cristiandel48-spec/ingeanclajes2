import ActaEntregaObra from "./ActaEntregaObra";
import Av from "../../components/ui/Av";
import Badge from "../../components/ui/Badge";
import BitacoraObra from "./BitacoraObra";
import FototecaObra from "./FototecaObra";
import MaterialesDespachoObra from "./MaterialesDespachoObra";
import LBL from "../../components/ui/LBL";
import NuevoEmpleadoRapido from "../../components/NuevoEmpleadoRapido";
import { useEffect, useRef, useState } from "react";
import { useAccionesPantalla, useTituloPantalla } from "../../context/accionesPantalla";
import { B, CD, PAL, SI, ST } from "../../styles/tokens";
import { TIPO } from "../../styles/designTokens";
import { Button, Card, Icono, Input, SegmentedControl, StatusPill } from "../../components/ui";
import { fmt, fmtD, today } from "../../lib/format";
import { obraEstaCerrada } from "../../lib/flujoObra";
import { calcularAvanceObra } from "../../lib/bitacoraObra";
import { esAdmin, puedeCrearPersonal, puedeVerDinero } from "../../lib/permisos";
import { siguienteIdUnico } from "../../lib/identificadores";
import { resolverAutorGuardado } from "../../lib/autorAuditoria";
import { getTextosDocumento } from "../../lib/cotizacionTextos";
import { getQuoteProposals } from "../../lib/cotizaciones";
import { clientesConQuienRecibe, obraTieneQuienRecibe, quienRecibeDeCliente } from "../../lib/quienRecibe";
import ModalQuienRecibe from "../../components/ModalQuienRecibe";

function extraerObjetoCotizacion(texto = "") {
  if (!texto) return "";
  let limpio = String(texto).trim();

  // 1. Quitar saludo inicial típico si existe
  limpio = limpio.replace(/^agradecemos\s+la\s+oportunidad\s+de\s+presentarles\s+nuestra\s+propuesta\s+para\s+/i, "");
  limpio = limpio.replace(/^nuestra\s+propuesta\s+para\s+/i, "");
  limpio = limpio.replace(/^propuesta\s+para\s+/i, "");

  // 2. Quitar coletilla final típica si existe
  limpio = limpio.replace(/\s+para\s+trabajo\s+seguro\s+en\s+alturas\.?$/i, "");
  limpio = limpio.replace(/\s+para\s+trabajo\s+en\s+alturas\.?$/i, "");
  limpio = limpio.replace(/\s+en\s+la\s+obra\s+.*?\.?$/i, "");

  // Quitar puntos finales repetidos o sueltos
  limpio = limpio.replace(/\.+$/, "").trim();

  return limpio;
}

export default function ObraDetalle({obraId,ctx,onVolver}){
  const {obras,setObras,empleados,cotizaciones,cuentas,setCuentas,proveedores,ordenesCompra=[],horarios,setHorarios,irAPantalla,membresia,asegurarDetalle,clientes=[],setClientes}=ctx;
  // Si la obra no tiene a quien enviarle los informes pero la ficha del
  // cliente si, la obra lo toma sola: el directorio de clientes es de donde
  // salen los informes y las certificaciones.
  const obraParaContacto = obras.find((o) => o.id === obraId);
  const contactoDelCliente = obraParaContacto && !obraTieneQuienRecibe(obraParaContacto)
    ? quienRecibeDeCliente(clientes, obraParaContacto)
    : null;
  useEffect(() => {
    if (!contactoDelCliente) return;
    setObras((p) => p.map((o) => (o.id === obraId && !obraTieneQuienRecibe(o) ? {
      ...o,
      recibeNombre: contactoDelCliente.nombre,
      recibeEmail: contactoDelCliente.email,
      tel: o.tel || contactoDelCliente.telefono,
    } : o)));
  }, [obraId, contactoDelCliente?.email]); // eslint-disable-line react-hooks/exhaustive-deps
  // { motivo, seguir }: la ventana de quien recibe los informes. `seguir` es
  // lo que se queria hacer (abrir la jornada) y se hace al guardar.
  const [pidiendoQuienRecibe,setPidiendoQuienRecibe]=useState(null);
  // Las cifras de la obra son confidenciales: quien organiza el trabajo no ve
  // cuanto se cobro ni el jornal de sus companeros.
  const verDinero=puedeVerDinero(membresia);
  // Obra entregada: se consulta, no se edita. La reabre un administrador.
  const bloqueada = obraEstaCerrada(obras.find((o)=>o.id===obraId)) && !esAdmin(membresia);
  const [detTab,setDetTab]=useState("avance");
  const [gastoForm,setGastoForm]=useState({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
  const [nuevoEmp,setNuevoEmp]=useState(false);
  const [showGasto,setShowGasto]=useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const oAct=obras.find(o=>o.id===obraId);

  // Asegura la descarga automática de las fotos y bitácora completa desde la nube
  useEffect(() => {
    if (!obraId || !asegurarDetalle) return;
    const o = obras.find((x) => x.id === obraId);
    if (o && o.__parcial !== false) {
      asegurarDetalle("obras", obraId);
    }
  }, [obraId, oAct?.__parcial, asegurarDetalle]);

  // Volver, Crear informe y Certificar van en la barra de arriba, que no se
  // mueve al bajar por la bitacora. Por la ref llaman a la version vigente.
  const accionesObraRef = useRef({});
  useEffect(() => { accionesObraRef.current = { onVolver, irAPantalla }; });
  useAccionesPantalla(
    oAct ? (
      <div style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "nowrap" }}>
        <Button variante="texto" tam="sm" icono="flechaIzq" onClick={() => accionesObraRef.current.onVolver()}>
          Obras
        </Button>
        <Button
          variante="texto"
          tam="sm"
          onClick={() => accionesObraRef.current.irAPantalla("informes", { obraId })}
          title="Crear informe de actividades para esta obra"
        >
          Crear informe
        </Button>
        <Button
          variante="oscuro"
          tam="sm"
          style={{ marginLeft: 6 }}
          onClick={() => accionesObraRef.current.irAPantalla("certificaciones", { obraId })}
          title="Crear certificación de calidad para esta obra"
        >
          Certificar
          <span style={{ opacity: 0.6, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
            {oAct.avance >= 90 ? "Listo" : `${oAct.avance}%`}
          </span>
        </Button>
      </div>
    ) : null,
    [obraId, Boolean(oAct), oAct?.avance]
  );
  useTituloPantalla(oAct ? `Obra ${oAct.id}` : null);

  if(!oAct)return null;

  const gastosObra=cuentas.filter(c=>c.obraId===obraId);
  const totalGastos=gastosObra.reduce((s,c)=>s+c.monto,0);
  const ordenesObra=ordenesCompra.filter(o=>o.obraId===obraId);
  const ordenesAprobadasObra=ordenesObra.filter(o=>o.estadoAprobacion==="Aprobada");
  const totalOrdenesAprobadas=ordenesAprobadasObra.reduce((s,o)=>s+(Number(o.total)||0),0);
  const horariosObra=horarios.filter(h=>h.obraId===obraId);
  const idsHorarios=horariosObra.map(h=>h.empleadoId).filter(Boolean);
  const empObra=[...new Set([...(oAct.empleados||[]), ...idsHorarios])];
  const cotVinc=cotizaciones.find(c=>c.id===oAct.cotizacionId);
  const cotProps = cotVinc ? getQuoteProposals(cotVinc) : [];
  const cotTextos = cotVinc ? getTextosDocumento(cotVinc) : null;
  const saludoTexto = cotTextos?.saludo || "";
  const objetoLimpio = extraerObjetoCotizacion(saludoTexto);
  const itemsCot = cotProps.flatMap((p) => (Array.isArray(p.items) ? p.items : []));

  const diasMap={};
  horariosObra.forEach(h=>{if(!diasMap[h.empleadoId])diasMap[h.empleadoId]=new Set();diasMap[h.empleadoId].add(h.fecha);});
  const totalDias=Object.values(diasMap).reduce((s,set)=>s+set.size,0);
  const nomObraTotal=empObra.reduce((s,eid)=>{
    const e=empleados.find(x=>x.id===eid);
    if(!e)return s;
    const dias=diasMap[eid]?diasMap[eid].size:0;
    return s+Math.round((Number(e.salario)||0)/26)*dias;
  },0);

  const guardarGasto=()=>{
    if(!gastoForm.concepto)return;
    const id=siguienteIdUnico(cuentas,"CP");
    setCuentas(p=>[...p,{id,...gastoForm,obraId,estado:"Pendiente"}]);
    setGastoForm({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
    setShowGasto(false);
  };

  // Marca o desmarca que la documentacion ya se le mando al cliente.
  const alternarEnvio = () => {
    const nuevo = !oAct.enviadoAlCliente;
    const ahoraIso = new Date().toISOString();
    const autorActual = resolverAutorGuardado(membresia, oAct.modificadoPorNombre);
    setObras(p => p.map(o => o.id === obraId ? {
      ...o,
      enviadoAlCliente: nuevo,
      fechaEnvioCliente: nuevo ? (o.fechaEnvioCliente || ahoraIso) : null,
      modificadoPor: membresia?.userId || null,
      modificadoPorNombre: autorActual || o.modificadoPorNombre || "Camila Sepúlveda",
      modificadoEn: ahoraIso,
    } : o));
  };

  // Guarda quien recibe en la obra y lo sube al directorio de clientes.
  const guardarQuienRecibe = ({ nombre, email, telefono }) => {
    const ahoraIso = new Date().toISOString();
    const autorActual = resolverAutorGuardado(membresia, oAct.modificadoPorNombre);
    setObras(p => p.map(o => o.id === obraId ? {
      ...o,
      recibeNombre: nombre,
      recibeEmail: email,
      tel: telefono || o.tel,
      modificadoPor: membresia?.userId || null,
      modificadoPorNombre: autorActual || o.modificadoPorNombre,
      modificadoEn: ahoraIso,
    } : o));
    setClientes?.((prev) => clientesConQuienRecibe(prev, oAct, { nombre, email, telefono }));
    const seguir = pidiendoQuienRecibe?.seguir;
    setPidiendoQuienRecibe(null);
    seguir?.();
  };

  const estadoAvance = oAct.avance === 100 ? "Finalizado" : oAct.avance >= 90 ? "Listo para certificar" : "En Ejecución";
  // { avance, inicial, jornadas, fecha }: el inicial mas lo que suman las jornadas.
  const avanceBitacora = calcularAvanceObra(oAct.avanceInicial, oAct.bitacora);

  return(
    <div
      style={{
        padding: isMobile ? "14px 16px 28px" : "20px 28px 32px",
        maxWidth: 1240,
        margin: "0 auto",
        boxSizing: "border-box",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* Cabecera al estilo de apple.com: sin tarjeta, el cliente como
          titulo grande y los datos de la obra en gris debajo. Las acciones
          estan en la barra de arriba. */}
      <div style={{ marginBottom: 16 }}>
        <div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              title={oAct.cliente}
              style={{
                margin: 0,
                fontSize: isMobile ? 16 : 17,
                fontWeight: 700,
                lineHeight: 1.3,
                letterSpacing: "-0.015em",
                color: "var(--text-primary)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                overflowWrap: "anywhere",
              }}
            >
              {oAct.cliente}
            </h1>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.4 }}>
              {[oAct.proyecto, oAct.ciudad, oAct.direccion].filter(Boolean).join(" · ")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <StatusPill estado={oAct.estado} />
              <button
                type="button"
                onClick={alternarEnvio}
                title={
                  oAct.enviadoAlCliente
                    ? `Documentación enviada al cliente${oAct.fechaEnvioCliente ? ` (${fmtD(oAct.fechaEnvioCliente)})` : ""}. Toca para cambiar.`
                    : "Marcar la documentación como enviada al cliente"
                }
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
              >
                <StatusPill tono={oAct.enviadoAlCliente ? "exito" : "neutro"}>
                  {oAct.enviadoAlCliente ? "Documentación enviada" : "Sin enviar"}
                </StatusPill>
              </button>
              <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                {oAct.id} · {fmtD(oAct.fechaInicio)} → {fmtD(oAct.fechaFin) || "En curso"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cotizacion de referencia: lo contratado, para tenerlo a la vista
          mientras se ejecuta y se certifica. */}
      {cotVinc && (
        <Card ajustado style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: (objetoLimpio || itemsCot.length) ? 16 : 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ ...TIPO.eyebrow, color: "var(--text-tertiary)" }}>Cotización de referencia</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                  {cotVinc.numero}
                </span>
                {cotVinc.fecha && (
                  <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                    Aprobada el {fmtD(cotVinc.fecha)}
                  </span>
                )}
                <StatusPill tono="exito">Vinculada</StatusPill>
              </div>
            </div>
            <Button
              variante="tertiary"
              tam="sm"
              iconoDerecha="flechaDer"
              onClick={() => irAPantalla("cotizacion", { cotizacionId: cotVinc.id })}
              title="Abrir la cotización en Cotizaciones"
            >
              Ver cotización
            </Button>
          </div>

          {(objetoLimpio || itemsCot.length > 0) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: (!isMobile && objetoLimpio && itemsCot.length > 0) ? "minmax(260px, 1fr) minmax(320px, 1.35fr)" : "1fr",
                gap: isMobile ? 20 : 32,
                alignItems: "start",
                borderTop: "1px solid var(--separator)",
                paddingTop: 16,
              }}
            >
              {objetoLimpio && (
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4 }}>
                    Objeto del contrato
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: "var(--text-primary)" }}>
                    {objetoLimpio}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginTop: 10, fontSize: 11, color: "var(--text-tertiary)" }}>
                    <span>Resolución 4272 de 2021 · ANSI Z359</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-secondary)" }}>
                      <Icono nombre="check" size={13} /> Conforme
                    </span>
                  </div>
                </div>
              )}

              {itemsCot.length > 0 && (
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-tertiary)" }}>Ítems contratados</span>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                      {itemsCot.length} {itemsCot.length === 1 ? "actividad" : "actividades"}
                    </span>
                  </div>
                  <div>
                    {itemsCot.map((it, idx) => {
                      const cant = Number(it.cant) || 1;
                      const desc = it.desc || it.descripcion || "Sin descripción";
                      const unidad = it.unit || it.unidad || "Global";
                      return (
                        <div
                          key={it.id || idx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "64px minmax(0,1fr)",
                            gap: 12,
                            padding: "8px 0",
                            borderTop: idx === 0 ? "none" : "1px solid var(--separator)",
                            alignItems: "baseline",
                          }}
                        >
                          <span style={{ fontSize: 12.5, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                            <strong style={{ fontWeight: 600 }}>{cant}</strong>{" "}
                            <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{unidad}</span>
                          </span>
                          <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--text-primary)" }}>{desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}


      {/* A quien se le envian los informes para firma de recibido. Sin el
          no se puede registrar avance: se avisa aqui antes de llegar ahi. */}
      <Card ajustado style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...TIPO.eyebrow, color: "var(--text-tertiary)" }}>Quién recibe los informes</div>
            {obraTieneQuienRecibe(oAct) ? (
              <div style={{ marginTop: 4, fontSize: 13.5, color: "var(--text-primary)" }}>
                <strong style={{ fontWeight: 600 }}>{oAct.recibeNombre || "Sin nombre"}</strong>
                <span style={{ color: "var(--text-secondary)" }}> · {oAct.recibeEmail}{oAct.tel ? ` · ${oAct.tel}` : ""}</span>
                <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>
                  Igual que en el directorio de clientes: si lo cambias aquí, se actualiza allá.
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <StatusPill tono="aviso">Falta el correo</StatusPill>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Se necesita para registrar avance y enviar los informes a firma.
                </span>
              </div>
            )}
          </div>
          {!bloqueada && (
            <Button variante={obraTieneQuienRecibe(oAct) ? "tertiary" : "secondary"} tam="sm"
              onClick={() => setPidiendoQuienRecibe({ motivo: "", seguir: null })}>
              {obraTieneQuienRecibe(oAct) ? "Cambiar" : "Agregar"}
            </Button>
          )}
        </div>
      </Card>

      {pidiendoQuienRecibe && (
        <ModalQuienRecibe
          obra={oAct}
          sugerido={quienRecibeDeCliente(clientes, oAct)}
          motivo={pidiendoQuienRecibe.motivo}
          onGuardar={guardarQuienRecibe}
          onCerrar={() => setPidiendoQuienRecibe(null)}
        />
      )}

      {/* Avance: la cifra grande, como un precio en apple.com, y la barra
          para moverlo debajo. */}
      <Card ajustado style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Avance de la obra</span>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {oAct.avance}%
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StatusPill tono={oAct.avance === 100 ? "exito" : oAct.avance >= 90 ? "info" : "acento"}>{estadoAvance}</StatusPill>
            {bloqueada && <StatusPill tono="neutro">Obra cerrada</StatusPill>}
          </div>
        </div>
        {/* El avance solo se cambia en las jornadas de «Avance diario»: es el
            inicial mas lo que suma cada una. Aqui solo se muestra, con de
            donde sale el numero. */}
        <div
          role="progressbar"
          aria-label="Avance de la obra"
          aria-valuenow={oAct.avance}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ marginTop: 12, height: 6, borderRadius: 999, background: "var(--fill)", overflow: "hidden" }}
        >
          <div style={{ width: `${oAct.avance}%`, height: "100%", borderRadius: 999, background: "var(--text-primary)", transition: "width .3s ease" }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-tertiary)" }}>
          {avanceBitacora.fecha
            ? `${avanceBitacora.inicial > 0 ? `Avance inicial ${avanceBitacora.inicial}% + jornadas ${avanceBitacora.jornadas}%` : `Suma de las jornadas`}, la última del ${fmtD(avanceBitacora.fecha)}. `
            : avanceBitacora.inicial > 0 ? `Avance con el que entró la obra. ` : ""}
          Para cambiarlo, registra el avance de la jornada en «Avance diario».
        </div>
      </Card>

      {/* Quedan las tres que se usan. Materiales y Despacho, Gastos, Nomina y
          Horario estaban ahi sin usarse; el codigo de esas vistas sigue mas
          abajo por si vuelven a hacer falta. */}
      <div style={{ marginBottom: 16 }}>
        <SegmentedControl
          etiqueta="Secciones de la obra"
          valor={detTab}
          onChange={setDetTab}
          opciones={[
            { id: "avance", label: "Avance diario" },
            { id: "fototeca", label: "Fototeca y ZIP" },
            { id: "personal", label: "Personal", cuenta: empObra.length },
            { id: "acta", label: "Acta de entrega", cuenta: (oAct.actas || []).length || undefined },
          ]}
        />
      </div>

      {/* TAB AVANCE Y FOTOS (bitacora que alimenta el informe) */}
      {/* Mientras las fotos no hayan llegado no se deja editar: un cambio
          hecho ahora se perderia al guardar, porque el registro esta a medias. */}
      {detTab==="avance"&&(
        <BitacoraObra obra={oAct} setObras={setObras}
          bloqueada={bloqueada || oAct.__parcial===true}
          cargandoFotos={oAct.__parcial===true}
          personalAsignado={empObra.length}
          onIrAPersonal={()=>setDetTab("personal")}
          sinQuienRecibe={!obraTieneQuienRecibe(oAct) && !contactoDelCliente}
          onPedirQuienRecibe={(seguir)=>setPidiendoQuienRecibe({
            motivo:"Antes de registrar el avance falta el correo de quien recibe: sin él, el informe de actividades no se le puede enviar al cliente para que firme el recibido.",
            seguir,
          })}/>
      )}

      {/* TAB MATERIALES Y DESPACHO DE BODEGA */}
      {detTab==="materiales"&&(
        <MaterialesDespachoObra
          obra={oAct}
          cotizacion={cotVinc}
          itemsCot={itemsCot}
          setObras={setObras}
          irAPantalla={irAPantalla}
          bloqueada={bloqueada}
        />
      )}

      {/* TAB FOTOTECA Y DESCARGA EN ZIP */}
      {detTab==="fototeca"&&(
        <FototecaObra obra={oAct} ctx={ctx}/>
      )}

      {/* TAB ACTA DE ENTREGA (FORM-SST-89) */}
      {detTab==="acta"&&(
        <ActaEntregaObra obra={oAct} ctx={ctx} setObras={setObras} bloqueada={bloqueada}/>
      )}

      {/* TAB PERSONAL */}
      {detTab==="personal"&&(
        <Card ajustado>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div>
              <h2 style={{ ...TIPO.headline, margin: 0, color: "var(--text-primary)" }}>Personal en obra</h2>
              <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>
                {empObra.length === 0 ? "Nadie asignado todavía" : `${empObra.length} ${empObra.length === 1 ? "persona" : "personas"}`}
              </div>
            </div>
            {puedeCrearPersonal(membresia) && !nuevoEmp && !bloqueada && (
              <Button variante="secondary" tam="sm" icono="mas" onClick={()=>setNuevoEmp(true)}>
                Registrar trabajador
              </Button>
            )}
          </div>

          {nuevoEmp && (
            <NuevoEmpleadoRapido
              ctx={ctx}
              obraId={obraId}
              onCerrar={()=>setNuevoEmp(false)}
              onCreado={(id,info)=>{
                setNuevoEmp(false);
                window.alert(
                  (info?.reactivado
                    ? `${info.nombre} se reactivó y quedó asignado a esta obra.`
                    : `${info?.nombre} quedó registrado y asignado a esta obra.`) +
                  "\n\nYa puedes asignarle turnos en Horarios. En Personal se le completan salario y contrato."
                );
              }}
            />
          )}
          {empObra.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:12,marginBottom:16}}>
              {empObra.map((eid,idx)=>{
                const emp=empleados.find(x=>x.id===eid);
                if(!emp)return null;
                const diasEmp=diasMap[eid]?diasMap[eid].size:0;
                const jornal=Math.round((Number(emp.salario)||0)/26);
                return(
                  <div key={eid} style={{background:"var(--surface-subtle)",borderRadius:14,padding:"14px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <Av init={emp.avatar} color={PAL[idx%PAL.length]} size={38}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{emp.nombre}</div>
                        <div style={{fontSize:11,color:"var(--text-secondary)"}}>
                          {String(emp.cargo || "Sin cargo").toUpperCase()}{emp.tel ? ` · ${emp.tel}` : ""}
                        </div>
                      </div>
                      {!bloqueada&&(
                        <Button
                          variante="texto"
                          tam="sm"
                          title="Quitar de esta obra"
                          onClick={()=>{
                            const autorActual = resolverAutorGuardado(membresia);
                            const ahoraIso = new Date().toISOString();
                            setObras(p=>p.map(o=>o.id===obraId?{
                              ...o,
                              empleados:(o.empleados||[]).filter(id=>id!==eid),
                              modificadoPor: membresia?.userId || null,
                              modificadoPorNombre: autorActual || o.modificadoPorNombre || "Camila Sepúlveda",
                              modificadoEn: ahoraIso,
                            }:o));
                            if(setHorarios) setHorarios(p=>p.filter(h=>!(h.obraId===obraId && h.empleadoId===eid)));
                          }}
                        >
                          Quitar
                        </Button>
                      )}
                    </div>
                    {/* El jornal y la cuenta bancaria del companero son datos
                        confidenciales: sin permiso solo se ven los dias. */}
                    <div style={{display:"grid",gridTemplateColumns:verDinero?"1fr 1fr 1fr":"1fr",gap:8,marginTop:12}}>
                      {[["Días en obra",diasEmp+" d"],...(verDinero?[["Jornal/día",fmt(jornal)],["Costo obra",fmt(jornal*diasEmp)]]:[])].map(([k,v])=>(
                        <div key={k}>
                          <div style={{fontSize:10.5,color:"var(--text-tertiary)"}}>{k}</div>
                          <div style={{fontSize:12.5,fontWeight:600,color:"var(--text-primary)",fontVariantNumeric:"tabular-nums",marginTop:2}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {verDinero&&(
                      <div style={{marginTop:10,fontSize:11,color:"var(--text-tertiary)"}}>
                        {emp.banco} · {emp.tipoCuenta} · <span style={{fontVariantNumeric:"tabular-nums"}}>{emp.numeroCuenta||"—"}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!bloqueada&&(
            <Input
              label="Asignar empleado a esta obra"
              como="select"
              value=""
              onChange={ev=>{
                const v=ev.target.value;
                if(!v || empObra.includes(v))return;
                const autorActual = resolverAutorGuardado(membresia);
                const ahoraIso = new Date().toISOString();
                setObras(p=>p.map(o=>o.id===obraId?{
                  ...o,
                  empleados:[...(o.empleados||[]),v],
                  modificadoPor: membresia?.userId || null,
                  modificadoPorNombre: autorActual || o.modificadoPorNombre || "Camila Sepúlveda",
                  modificadoEn: ahoraIso,
                }:o));
              }}
            >
              <option value="">Selecciona un empleado...</option>
              {empleados.filter(emp=>!empObra.includes(emp.id)).map(emp=>(
                <option key={emp.id} value={emp.id}>{emp.nombre} · {String(emp.cargo || "").toUpperCase()}</option>
              ))}
            </Input>
          )}
        </Card>
      )}

      {/* TAB GASTOS */}
      {detTab==="gastos"&&verDinero&&(
        <div style={CD}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={ST}>Gastos y cuentas por pagar</div>
            <button
              style={{
                background: "#FFFAEB",
                color: "#B54708",
                border: "1px solid rgba(181, 71, 8, 0.35)",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={()=>setShowGasto(!showGasto)}
            >
              + Agregar gasto
            </button>
          </div>
          {showGasto&&(
            <div style={{background:"var(--surface-subtle, #f8fafc)",border:"1px solid var(--border, #e2e8f0)",borderRadius:10,padding:16,marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><LBL>Proveedor</LBL>
                  <select value={gastoForm.proveedorId} onChange={e=>setGastoForm({...gastoForm,proveedorId:e.target.value})} style={SI}>
                    {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div><LBL>N° Factura</LBL><input value={gastoForm.factura} onChange={e=>setGastoForm({...gastoForm,factura:e.target.value})} placeholder="FV-2026-0001" style={SI}/></div>
                <div style={{gridColumn:"span 2"}}><LBL>Concepto</LBL><input value={gastoForm.concepto} onChange={e=>setGastoForm({...gastoForm,concepto:e.target.value})} placeholder="Descripción del gasto" style={SI}/></div>
                <div><LBL>Monto ($)</LBL><input type="number" value={gastoForm.monto} onChange={e=>setGastoForm({...gastoForm,monto:parseFloat(e.target.value)||0})} style={SI}/></div>
                <div><LBL>Fecha factura</LBL><input type="date" value={gastoForm.fecha} onChange={e=>setGastoForm({...gastoForm,fecha:e.target.value})} style={SI}/></div>
                <div><LBL>Fecha vencimiento</LBL><input type="date" value={gastoForm.fechaVence} onChange={e=>setGastoForm({...gastoForm,fechaVence:e.target.value})} style={SI}/></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button
                  style={{
                    background: "#ecfdf5",
                    color: "#047857",
                    border: "1px solid #a7f3d0",
                    borderRadius: 8,
                    fontSize: 12,
                    padding: "7px 14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={guardarGasto}
                >
                  Guardar gasto
                </button>
                <button
                  style={{
                    background: "var(--surface-subtle, #f2f4f7)",
                    color: "var(--text-muted, #475467)",
                    border: "1px solid var(--border, #eaecf0)",
                    borderRadius: 8,
                    fontSize: 12,
                    padding: "7px 14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={()=>setShowGasto(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {gastosObra.length===0&&!showGasto&&<div style={{textAlign:"center",padding:24,color:"var(--text-subtle, #94a3b8)",fontSize:13}}>Sin gastos registrados aún</div>}
          {gastosObra.map(c=>{
            const prov=proveedores.find(p=>p.id===c.proveedorId);
            const vencida=c.estado==="Pendiente"&&c.fechaVence&&c.fechaVence<today();
            return(
              <div key={c.id} style={{background:"var(--surface-subtle, #f8fafc)",borderRadius:10,padding:"12px 14px",marginBottom:8,border:"1px solid " + (vencida?"#fca5a5":c.estado==="Pagado"?"#4ade80":"var(--border, #e2e8f0)")}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div><div style={{fontSize:13,fontWeight:600,color:"var(--text-main)"}}>{c.concepto}</div><div style={{fontSize:11,color:"var(--text-muted, #64748b)"}}>{prov?.nombre} · {c.factura}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:"var(--text-main, #101828)",fontVariantNumeric:"tabular-nums"}}>{fmt(c.monto)}</div><Badge estado={vencida?"Vencida":c.estado}/></div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"var(--text-subtle, #94a3b8)"}}>
                  <span>Vence: {fmtD(c.fechaVence)||"—"}</span>
                  {c.estado==="Pendiente"&&<button onClick={()=>setCuentas(p=>p.map(x=>x.id===c.id?{...x,estado:"Pagado"}:x))} style={{background:"rgba(16, 185, 129, 0.15)",border:"1px solid #4ade80",color:"#34d399",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>✓ Pagar</button>}
                </div>
              </div>
            );
          })}
          {/* SECCIÓN ÓRDENES DE COMPRA VINCULADAS */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1.5px dashed var(--border, #cbd5e1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #0f172a)" }}>
                Órdenes de compra vinculadas a esta obra ({ordenesObra.length})
              </div>
              <button
                type="button"
                onClick={() => irAPantalla("proveedores")}
                style={{
                  background: "rgba(2, 132, 199, 0.08)",
                  color: "#0284c7",
                  border: "1px solid rgba(186, 230, 253, 0.7)",
                  borderRadius: 8,
                  fontSize: 11.5,
                  padding: "6px 12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Ver en Causación ↗
              </button>
            </div>

            {ordenesObra.length === 0 ? (
              <div style={{ textAlign: "center", padding: 14, color: "var(--text-subtle, #94a3b8)", fontSize: 12, background: "var(--surface-subtle, #f8fafc)", borderRadius: 8 }}>
                No hay órdenes de compra emitidas para esta obra todavía.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {ordenesObra.map((oc) => (
                  <div key={oc.id} style={{ background: "var(--surface-subtle, #f8fafc)", borderRadius: 8, padding: "10px 14px", border: "1px solid var(--border, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ color: "#38bdf8", fontSize: 12.5 }}>{oc.id}</strong>
                        <span style={{ fontSize: 11, color: "var(--text-muted, #64748b)" }}>Doc: {oc.documentoOrigen}</span>
                        {oc.estadoAprobacion === "Aprobada" ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(134, 239, 172, 0.4)", padding: "1px 6px", borderRadius: 4 }}>
                            ✓ Aprobada (Camila Sepúlveda)
                          </span>
                        ) : oc.estadoAprobacion === "Rechazada" ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#f87171", background: "rgba(220, 38, 38, 0.15)", border: "1px solid rgba(252, 165, 165, 0.4)", padding: "1px 6px", borderRadius: 4 }}>
                            ✕ Rechazada
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#fb923c", background: "rgba(234, 88, 12, 0.15)", border: "1px solid rgba(254, 215, 170, 0.4)", padding: "1px 6px", borderRadius: 4 }}>
                            ⏳ Pendiente Aprobación
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-main, #475569)", marginTop: 3 }}>
                        {oc.proveedorNombre} · Solicitado por: {oc.solicitante}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #0f172a)" }}>{fmt(oc.total)}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted, #64748b)" }}>Estado: {oc.estadoFacturacion}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "var(--surface-subtle, #f1f5f9)", borderRadius: 8, padding: "12px 16px", marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center", fontSize: 12 }}>
            <div>
              <div style={{ color: "var(--text-muted, #64748b)", marginBottom: 3 }}>Facturas causadas</div>
              <div style={{ fontWeight: 700, color: "var(--text-main, #101828)", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{fmt(totalGastos)}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted, #64748b)", marginBottom: 3 }}>Órdenes aprobadas</div>
              <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 14 }}>{fmt(totalOrdenesAprobadas)}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted, #64748b)", marginBottom: 3 }}>Costo comprometido</div>
              <div style={{ fontWeight: 800, color: "var(--text-main, #0f172a)", fontSize: 15 }}>{fmt(totalGastos + totalOrdenesAprobadas)}</div>
            </div>
          </div>
          {oAct.total>0&&<div style={{background:(totalGastos+totalOrdenesAprobadas)/oAct.total<0.4?"#dcfce7":"#fff7ed",borderRadius:8,padding:"10px 14px",marginTop:8,fontSize:11,color:"#475569"}}>Compromiso total = <strong style={{color:(totalGastos+totalOrdenesAprobadas)/oAct.total<0.4?"#166534":"#c2410c"}}>{Math.round(((totalGastos+totalOrdenesAprobadas)/oAct.total)*100)}%</strong> del ingreso de la obra</div>}
        </div>
      )}

      {/* TAB NÓMINA */}
      {detTab==="nomina"&&verDinero&&(
        <div style={CD}>
          <div style={ST}>Nómina proporcional por obra</div>
          {empObra.length===0&&<div style={{textAlign:"center",padding:24,color:"var(--text-subtle, #94a3b8)",fontSize:13}}>Sin personal asignado</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            {empObra.map((eid,idx)=>{
              const emp=empleados.find(x=>x.id===eid);
              if(!emp)return null;
              const diasEmp=diasMap[eid]?diasMap[eid].size:0;
              const jornal=Math.round((Number(emp.salario)||0)/26);
              const subtotal=jornal*diasEmp;
              const ded=Math.round(subtotal*0.04);
              return(
                <div key={eid} style={{background:"var(--surface-subtle, #f8fafc)",borderRadius:10,padding:"14px 16px",border:"1px solid var(--border, #e2e8f0)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <Av init={emp.avatar} color={PAL[idx%PAL.length]} size={34}/>
                    <div><div style={{fontSize:13,fontWeight:700,color:"var(--text-main)"}}>{emp.nombre}</div><div style={{fontSize:11,color:"var(--text-muted, #64748b)"}}>{String(emp.cargo || "").toUpperCase()}</div></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                    {[["Días",diasEmp+"d","#60a5fa"],["Jornal",fmt(jornal),"#34d399"],["Bruto",fmt(subtotal),"#f59e0b"],["Neto",fmt(subtotal-ded),"var(--text-main, #101828)"]].map(([k,v,c])=>(
                      <div key={k} style={{background:"var(--surface, #fff)",borderRadius:6,padding:"8px",textAlign:"center",border:"1px solid var(--border, #f1f5f9)"}}>
                        <div style={{color:"var(--text-subtle, #94a3b8)",fontSize:9,marginBottom:3}}>{k}</div>
                        <div style={{fontWeight:700,color:c,fontSize:11}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:8,fontSize:10,color:"var(--text-subtle, #94a3b8)"}}>🏦 {emp.banco} · {emp.tipoCuenta} · <span style={{fontVariantNumeric: "tabular-nums"}}>{emp.numeroCuenta||"—"}</span></div>
                </div>
              );
            })}
          </div>
          {empObra.length>0&&(
            <div style={{background:"var(--surface-subtle, #f1f5f9)",borderRadius:10,padding:"14px 16px",border:"1px solid var(--border, #e2e8f0)"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,textAlign:"center",fontSize:12}}>
                <div><div style={{color:"var(--text-muted, #64748b)",marginBottom:4}}>Total días trabajados</div><div style={{fontWeight:700,color:"#60a5fa",fontSize:18}}>{totalDias}</div></div>
                <div><div style={{color:"var(--text-muted, #64748b)",marginBottom:4}}>Nómina total obra</div><div style={{fontWeight:700,color:"var(--text-main, #101828)",fontSize:18,fontVariantNumeric:"tabular-nums"}}>{fmt(nomObraTotal)}</div></div>
                <div><div style={{color:"var(--text-muted, #64748b)",marginBottom:4}}>% del ingreso</div><div style={{fontWeight:700,color:oAct.total>0&&nomObraTotal/oAct.total<0.3?"#34d399":"#fb923c",fontSize:18}}>{oAct.total>0?Math.round(nomObraTotal/oAct.total*100):0}%</div></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB HORARIO */}
      {detTab==="horario"&&(
        <div style={CD}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div style={ST}>📅 Horario y turnos en esta obra</div>
            <button
              onClick={()=>irAPantalla("horarios")}
              style={{
                background: "var(--surface-subtle, #f2f4f7)",
                color: "var(--text-muted, #475467)",
                border: "1px solid var(--border, #eaecf0)",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Ir a Horarios ↗
            </button>
          </div>
          {horariosObra.length===0&&<div style={{textAlign:"center",padding:24,color:"var(--text-subtle, #94a3b8)",fontSize:13}}>Sin turnos registrados todavía.</div>}
          {horariosObra.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(h=>{
            const emp=empleados.find(x=>x.id===h.empleadoId);
            const idx=empleados.findIndex(x=>x.id===h.empleadoId);
            return(
              <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,background:"var(--surface-subtle, #f8fafc)",borderRadius:10,padding:"10px 14px",marginBottom:8,border:"1px solid var(--border, #e2e8f0)"}}>
                <Av init={emp?.avatar||"?"} color={PAL[idx%PAL.length]} size={32}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text-main)"}}>{emp?.nombre||"—"}</div>
                  <div style={{fontSize:11,color:"var(--text-muted, #475569)"}}>{h.tarea}</div>
                </div>
                <div style={{textAlign:"right",fontSize:11}}>
                  <div style={{color:"var(--text-muted, #64748b)",fontWeight:500}}>{fmtD(h.fecha)}</div>
                  <div style={{color:"var(--text-main, #101828)",fontWeight:600}}>{h.turno}</div>
                </div>
              </div>
            );
          })}
          {horariosObra.length>0&&(
            <div style={{background:"var(--surface-subtle, #f1f5f9)",borderRadius:8,padding:"10px 14px",marginTop:8,fontSize:12,color:"var(--text-muted, #64748b)"}}>
              {horariosObra.length} turno(s) · {new Set(horariosObra.map(h=>h.empleadoId)).size} persona(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ======================================================
// CERTIFICACIONES
// ======================================================

