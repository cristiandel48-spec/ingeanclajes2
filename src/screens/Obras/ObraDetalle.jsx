import Av from "../../components/ui/Av";
import Badge from "../../components/ui/Badge";
import IconoPalomita from "../../components/ui/IconoPalomita";
import BitacoraObra from "./BitacoraObra";
import FototecaObra from "./FototecaObra";
import MaterialesDespachoObra from "./MaterialesDespachoObra";
import LBL from "../../components/ui/LBL";
import NuevoEmpleadoRapido from "../../components/NuevoEmpleadoRapido";
import { useEffect, useState } from "react";
import { B, CD, PAL, SI, ST } from "../../styles/tokens";
import GuiaFlujoObra from "./GuiaFlujoObra";
import { fmt, fmtD, today } from "../../lib/format";
import { resumenBitacora } from "../../lib/bitacoraObra";
import { estadoSegunAvance, obraEstaCerrada } from "../../lib/flujoObra";
import { esAdmin, puedeCrearPersonal, puedeVerDinero } from "../../lib/permisos";
import { siguienteIdUnico } from "../../lib/identificadores";
import { resolverAutorGuardado } from "../../lib/autorAuditoria";
import { getTextosDocumento } from "../../lib/cotizacionTextos";
import { getQuoteProposals } from "../../lib/cotizaciones";

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
  const {obras,setObras,empleados,cotizaciones,cuentas,setCuentas,proveedores,ordenesCompra=[],horarios,setHorarios,irAPantalla,membresia,asegurarDetalle}=ctx;
  // Las cifras de la obra son confidenciales: quien organiza el trabajo no ve
  // cuanto se cobro ni el jornal de sus companeros.
  const verDinero=puedeVerDinero(membresia);
  // Obra entregada: se consulta, no se edita. La reabre un administrador.
  const bloqueada = obraEstaCerrada(obras.find((o)=>o.id===obraId)) && !esAdmin(membresia);
  const [detTab,setDetTab]=useState("avance");
  const [gastoForm,setGastoForm]=useState({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
  const [nuevoEmp,setNuevoEmp]=useState(false);
  const [showGasto,setShowGasto]=useState(false);
  const [mostrarGuia,setMostrarGuia]=useState(false);
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
  const resumenAvance=resumenBitacora(oAct.bitacora);

  const diasMap={};
  horariosObra.forEach(h=>{if(!diasMap[h.empleadoId])diasMap[h.empleadoId]=new Set();diasMap[h.empleadoId].add(h.fecha);});
  const totalDias=Object.values(diasMap).reduce((s,set)=>s+set.size,0);
  const nomObraTotal=empObra.reduce((s,eid)=>{
    const e=empleados.find(x=>x.id===eid);
    if(!e)return s;
    const dias=diasMap[eid]?diasMap[eid].size:0;
    return s+Math.round(e.salario/26)*dias;
  },0);

  const guardarGasto=()=>{
    if(!gastoForm.concepto)return;
    const id=siguienteIdUnico(cuentas,"CP");
    setCuentas(p=>[...p,{id,...gastoForm,obraId,estado:"Pendiente"}]);
    setGastoForm({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
    setShowGasto(false);
  };

  return(
    <div
      style={{
        padding: isMobile ? "14px 16px" : "24px 28px",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* Barra superior de la Obra - Estilo Apple Studio */}
      <div
        style={{
          display: "flex",
          // En columna siempre: el nombre del cliente va en su propia fila,
          // a todo el ancho. Con el nombre metido en la columna izquierda,
          // los botones de la derecha -que no ceden ancho- le dejaban unos
          // 500px, y un cliente de obra publica se partia en cinco lineas
          // teniendo media pantalla vacia al lado.
          flexDirection: "column",
          alignItems: "stretch",
          gap: 12,
          marginBottom: 16,
          background: "var(--surface, #ffffff)",
          borderRadius: 16,
          padding: isMobile ? "14px 16px" : "16px 22px",
          border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
          boxShadow: "0 4px 16px -2px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        {/* Nombre del cliente, a todo el ancho y a dos lineas como maximo. */}
        <div
          title={oAct.cliente}
          style={{
            // Contenido, no cartel: al ocupar una sola linea ya se lee como
            // el titulo de la pantalla sin necesidad de pesar mas.
            fontSize: isMobile ? 14 : 15,
            fontWeight: 700,
            color: "var(--text-main, #1d1d1f)",
            lineHeight: 1.3,
            letterSpacing: "-0.015em",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            overflowWrap: "anywhere",
          }}
        >
          {oAct.cliente}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
        {/* Izquierda: Volver + Badges + Metadatos */}
        <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 12, minWidth: 0, flex: 1 }}>
          <button
            onClick={onVolver}
            style={{
              background: "#ffffff",
              color: "var(--text-main, #1d1d1f)",
              border: "1px solid var(--border, #d2d2d7)",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 12px",
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              transition: "all 0.15s ease",
            }}
          >
            ← Obras
          </button>
          {!isMobile && <div style={{ width: 1, height: 32, background: "var(--border, #e5e5ea)", flexShrink: 0 }} />}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Badge estado={oAct.estado} />
              <button
                type="button"
                onClick={() => {
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
                }}
                title={
                  oAct.enviadoAlCliente
                    ? `Documentación enviada al cliente${oAct.fechaEnvioCliente ? ` (${fmtD(oAct.fechaEnvioCliente)})` : ""}. Clic para cambiar.`
                    : "Marcar como documentación enviada"
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 9px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                  border: oAct.enviadoAlCliente ? "1px solid #a7f3d0" : "1px dashed #cbd5e1",
                  background: oAct.enviadoAlCliente ? "#ecfdf5" : "var(--surface-subtle, #f8fafc)",
                  color: oAct.enviadoAlCliente ? "#047857" : "#64748b",
                  transition: "all .16s ease",
                }}
              >
                {oAct.enviadoAlCliente ? (
                  <>
                    <span>Documentación Enviada</span>
                    <IconoPalomita size={14} color="#047857" />
                  </>
                ) : (
                  <>
                    <span>Sin enviar</span>
                    <span style={{ fontSize: 10, lineHeight: 1, color: "#94a3b8" }}>○</span>
                  </>
                )}
              </button>
              {cotVinc && (
                <span
                  onClick={() => irAPantalla("cotizacion", { cotizacionId: cotVinc.id })}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "monospace",
                    color: "var(--text-main, #1d1d1f)",
                    background: "var(--surface-subtle, #f5f5f7)",
                    border: "1px solid var(--border, #d2d2d7)",
                    borderRadius: 6,
                    padding: "2px 7px",
                    cursor: "pointer",
                  }}
                  title="Clic para ver la cotización de referencia completa"
                >
                  <span style={{ color: "#0071e3" }}>{cotVinc.numero}</span> ↗
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--text-muted, #6e6e73)",
                marginTop: 4,
                whiteSpace: isMobile ? "normal" : "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.4,
              }}
              title={`${oAct.id} · ${fmtD(oAct.fechaInicio)} → ${fmtD(oAct.fechaFin) || "En curso"} · ${oAct.proyecto} · 📍 ${oAct.ciudad}${oAct.direccion ? ` · ${oAct.direccion}` : ""}`}
            >
              <strong style={{ fontFamily: "monospace", color: "var(--text-main, #1d1d1f)", fontWeight: 600 }}>{oAct.id}</strong> · {fmtD(oAct.fechaInicio)} → {fmtD(oAct.fechaFin) || "En curso"} · {oAct.proyecto} · 📍 {oAct.ciudad}{oAct.direccion ? ` · ${oAct.direccion}` : ""}
            </div>
          </div>
        </div>

        {/* Derecha: Botones de acción (cuadrícula 2x2 limpia en móvil para que nunca se desborden) */}
        <div
          className={isMobile ? "grid-2-col no-collapse-grid" : ""}
          style={{
            display: isMobile ? "grid" : "flex",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "none",
            gap: 8,
            width: isMobile ? "100%" : "auto",
            flexShrink: 0,
            alignItems: "center",
          }}
        >
          {/* Botón CERTIFICAR en estilo Apple Dark Button */}
          <button
            onClick={() => irAPantalla("certificaciones", { obraId: oAct.id })}
            style={{
              background: "#1d1d1f",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              fontSize: 12,
              padding: isMobile ? "9px 10px" : "7px 14px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              transition: "all 0.15s ease",
              width: isMobile ? "100%" : "auto",
              boxSizing: "border-box",
            }}
            title="Crear certificación de calidad para esta obra"
          >
            <span>📜</span>
            <span>Certificar</span>
            <span style={{ fontSize: 10, background: "rgba(255,255,255,0.2)", padding: "1px 5px", borderRadius: 4, fontWeight: 500 }}>
              {oAct.avance >= 90 ? "Listo" : `${oAct.avance}%`}
            </span>
          </button>

          {/* Botón CREAR INFORME en blanco Apple */}
          <button
            onClick={() => irAPantalla("informes", { obraId: oAct.id })}
            style={{
              background: "#ffffff",
              color: "var(--text-main, #1d1d1f)",
              border: "1px solid var(--border, #d2d2d7)",
              borderRadius: 10,
              fontSize: 12,
              padding: isMobile ? "9px 10px" : "7px 13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              transition: "all 0.15s ease",
              width: isMobile ? "100%" : "auto",
              boxSizing: "border-box",
            }}
            title="Crear informe de actividades para esta obra"
          >
            <span>📄</span>
            <span>Crear informe</span>
          </button>

          {/* Botón FOTOTECA Y ZIP */}
          <button
            onClick={() => setDetTab("fototeca")}
            style={{
              background: detTab === "fototeca" ? "#1d1d1f" : "#ffffff",
              color: detTab === "fototeca" ? "#ffffff" : "var(--text-main, #1d1d1f)",
              border: detTab === "fototeca" ? "1px solid #1d1d1f" : "1px solid var(--border, #d2d2d7)",
              borderRadius: 10,
              fontSize: 12,
              padding: isMobile ? "9px 10px" : "7px 13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              transition: "all 0.15s ease",
              width: isMobile ? "100%" : "auto",
              boxSizing: "border-box",
            }}
            title="Ver todas las fotos de la obra y descargar en ZIP"
          >
            <span>📸</span>
            <span>Fototeca y ZIP</span>
          </button>

          {/* Botón TAREAS CON EL EQUIPO */}
          <button
            onClick={() => irAPantalla("produccion", { obraId: oAct.id })}
            style={{
              background: "#ffffff",
              color: "var(--text-main, #1d1d1f)",
              border: "1px solid var(--border, #d2d2d7)",
              borderRadius: 10,
              fontSize: 12,
              padding: isMobile ? "9px 10px" : "7px 13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              transition: "all 0.15s ease",
              width: isMobile ? "100%" : "auto",
              boxSizing: "border-box",
            }}
            title="Ver o asignar tareas con el equipo para esta obra"
          >
            <span>👥</span>
            <span>Tareas con el equipo</span>
          </button>

          {/* Botón QUÉ SIGUE */}
          <button
            onClick={() => setMostrarGuia(!mostrarGuia)}
            style={{
              background: mostrarGuia ? "var(--surface-subtle, #e5e5ea)" : "var(--surface-subtle, #f5f5f7)",
              color: "var(--text-main, #1d1d1f)",
              border: "1px solid var(--border, #e5e5ea)",
              borderRadius: 10,
              fontSize: 12,
              padding: isMobile ? "9px 10px" : "7px 12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "all 0.15s ease",
              width: isMobile ? "100%" : "auto",
              boxSizing: "border-box",
            }}
            title={mostrarGuia ? "Ocultar qué sigue" : "Mostrar guía de flujo y qué sigue en esta obra"}
          >
            <span>💡</span>
            <span>{mostrarGuia ? "Ocultar qué sigue" : "Qué sigue"}</span>
          </button>
        </div>
        </div>
      </div>

      {/* Cotización de Referencia: Objeto e Ítems (Sin amarillos, idéntico a Crear Cotización) */}
      {cotVinc && (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 14,
            boxShadow: "0 4px 16px -2px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          {/* Fila superior: Referencia y Botón para ir a la cotización */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: (objetoLimpio || itemsCot.length) ? 12 : 0,
              paddingBottom: 10,
              borderBottom: "1px solid var(--border, #f2f2f7)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted, #6e6e73)" }}>
                Cotización de Referencia
              </span>
              <span
                onClick={() => irAPantalla("cotizacion", { cotizacionId: cotVinc.id })}
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: "#ffffff",
                  background: "#1d1d1f",
                  borderRadius: 6,
                  padding: "2px 8px",
                  cursor: "pointer",
                }}
                title="Abrir cotización"
              >
                {cotVinc.numero}
              </span>
              {cotVinc.fecha && (
                <span style={{ fontSize: 11.5, color: "var(--text-muted, #86868b)" }}>
                  · Aprobada el {fmtD(cotVinc.fecha)}
                </span>
              )}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#047857",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                Vinculada
              </span>
            </div>

            <button
              onClick={() => irAPantalla("cotizacion", { cotizacionId: cotVinc.id })}
              style={{
                background: "#ffffff",
                color: "#0071e3",
                border: "1px solid var(--border, #d2d2d7)",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 600,
                padding: "4px 10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.15s ease",
              }}
              title="Abrir cotización en pantalla de cotizaciones"
            >
              <span>Ver cotización comercial completa</span>
              <span>↗</span>
            </button>
          </div>

          {/* Fila con Objeto a la izquierda e Ítems a la derecha */}
          {(objetoLimpio || itemsCot.length > 0) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: (!isMobile && objetoLimpio && itemsCot.length > 0) ? "minmax(280px, 1fr) minmax(340px, 1.35fr)" : "1fr",
                gap: 12,
                alignItems: "stretch",
              }}
            >
              {/* Objeto contratado (Sin marcas amarillas, fondo suave con tipografía nítida) */}
              {objetoLimpio && (
                <div
                  style={{
                    background: "var(--surface-subtle, #fbfbfd)",
                    border: "1px solid var(--border, #e5e5ea)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-main, #1d1d1f)", marginBottom: 6 }}>
                      🎯 Objeto del Contrato a Certificar
                    </div>
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid var(--border, #e5e5ea)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 12,
                        color: "var(--text-main, #1d1d1f)",
                        lineHeight: 1.5,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                      }}
                    >
                      {objetoLimpio}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted, #6e6e73)", marginTop: 8, display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border, #f2f2f7)", paddingTop: 6 }}>
                    <span>Resolución 4272 de 2021 · ANSI Z359</span>
                    <span style={{ fontWeight: 600, color: "var(--text-main, #1d1d1f)" }}>✓ Conforme</span>
                  </div>
                </div>
              )}

              {/* Detalle de ítems (Sin valores monetarios: solo Cant, Unidad y Descripción) */}
              {itemsCot.length > 0 && (
                <div
                  style={{
                    border: "1px solid var(--border, #e5e5ea)",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#ffffff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                >
                  <div style={{ background: "var(--surface-subtle, #fbfbfd)", padding: "7px 12px", borderBottom: "1px solid var(--border, #e5e5ea)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-main, #1d1d1f)" }}>
                      Ítems Contratados a Certificar
                    </span>
                    <span style={{ fontSize: 10.5, color: "var(--text-muted, #86868b)" }}>
                      {itemsCot.length} actividad(es)
                    </span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border, #e5e5ea)", background: "var(--surface-subtle, #f5f5f7)" }}>
                          <th style={{ padding: "6px 10px", color: "var(--text-muted, #6e6e73)", fontWeight: 600, width: "50px" }}>Cant.</th>
                          <th style={{ padding: "6px 10px", color: "var(--text-muted, #6e6e73)", fontWeight: 600, width: "70px" }}>Unidad</th>
                          <th style={{ padding: "6px 10px", color: "var(--text-muted, #6e6e73)", fontWeight: 600 }}>Descripción técnica del trabajo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsCot.map((it, idx) => {
                          const cant = Number(it.cant) || 1;
                          const desc = it.desc || it.descripcion || "Sin descripción";
                          const unidad = it.unit || it.unidad || "Global";
                          return (
                            <tr key={it.id || idx} style={{ borderBottom: idx < itemsCot.length - 1 ? "1px solid var(--border, #f2f2f7)" : "none" }}>
                              <td style={{ padding: "6px 10px", fontWeight: 700, fontFamily: "monospace", color: "var(--text-main, #1d1d1f)" }}>{cant}</td>
                              <td style={{ padding: "6px 10px", color: "var(--text-muted, #6e6e73)" }}>{unidad}</td>
                              <td style={{ padding: "6px 10px", color: "var(--text-main, #1d1d1f)", fontWeight: 500 }}>
                                {desc}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mostrarGuia && (
        <GuiaFlujoObra
          obra={oAct}
          empleadosAsignados={empObra.length}
          registrosAvance={resumenAvance.registros}
          fotosAvance={resumenAvance.fotos}
          verDinero={verDinero}
          onVerAvance={()=>setDetTab("avance")}
          onCrearInforme={()=>irAPantalla("informes",{obraId:oAct.id})}
          onCrearCertificacion={()=>irAPantalla("certificaciones",{obraId:oAct.id})}
        />
      )}

      {/* Barra de Avance interactiva estilo Apple Studio */}
      <div
        style={{
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
          borderRadius: 14,
          padding: "10px 16px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 170 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>
            Avance de la obra:
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 800, fontFamily: "monospace", color: "var(--text-main, #1d1d1f)" }}>
            {oAct.avance}%
          </span>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 5,
              background: oAct.avance === 100 ? "#ecfdf5" : oAct.avance >= 90 ? "#eff6ff" : "var(--surface-subtle, #f5f5f7)",
              color: oAct.avance === 100 ? "#047857" : oAct.avance >= 90 ? "#1d4ed8" : "var(--text-muted, #6e6e73)",
              border: oAct.avance === 100 ? "1px solid #a7f3d0" : oAct.avance >= 90 ? "1px solid #bfdbfe" : "1px solid #e5e5ea",
            }}
          >
            {oAct.avance === 100 ? "✓ Finalizado" : oAct.avance >= 90 ? "Listo para Certificar" : "En Ejecución"}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 160, display: "flex", alignItems: "center" }}>
          <input
            type="range"
            min={0}
            max={100}
            value={oAct.avance}
            disabled={bloqueada}
            title={bloqueada ? "Obra finalizada: el avance ya no se cambia." : undefined}
            onChange={e => {
              const avance = Number(e.target.value);
              const autorActual = resolverAutorGuardado(membresia);
              const ahoraIso = new Date().toISOString();
              setObras(p => p.map(o => o.id === obraId ? {
                ...o,
                avance,
                estado: estadoSegunAvance(avance, o.estado),
                modificadoPor: membresia?.userId || null,
                modificadoPorNombre: autorActual || o.modificadoPorNombre || "Camila Sepúlveda",
                modificadoEn: ahoraIso,
              } : o));
            }}
            style={{
              width: "100%",
              height: 6,
              accentColor: "#1d1d1f",
              cursor: bloqueada ? "not-allowed" : "pointer",
            }}
          />
        </div>
        {bloqueada && (
          <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>
            🔒 Finalizada
          </span>
        )}
      </div>

      {/* Selector Segmentado de Pestañas (Estilo Apple macOS Studio) */}
      <div
        style={{
          display: "inline-flex",
          background: "var(--surface-subtle, #e5e5ea)",
          padding: 3,
          borderRadius: 10,
          gap: 2,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        {/* Quedan las cuatro que se usan. Materiales y Despacho, Gastos,
            Nomina y Horario estaban ahi sin usarse: cuatro pestañas de
            siete que solo servian para alargar la fila y hacer dudar sobre
            cual es la que importa. El codigo de esas vistas sigue en su
            sitio por si vuelven a hacer falta. */}
        {[
          ["avance", "📸 Avance diario (Bitácora)"],
          ["fototeca", "🖼️ Fototeca y ZIP"],
          ["personal", "👷 Personal"],
        ].map(([id, lb]) => {
          const activo = detTab === id;
          return (
            <button
              key={id}
              onClick={() => setDetTab(id)}
              style={{
                background: activo ? "#ffffff" : "transparent",
                color: activo ? "#1d1d1f" : "#6e6e73",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: activo ? 600 : 500,
                padding: "6px 14px",
                cursor: "pointer",
                boxShadow: activo ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {lb}
            </button>
          );
        })}
      </div>

      {/* TAB AVANCE Y FOTOS (bitacora que alimenta el informe) */}
      {/* Mientras las fotos no hayan llegado no se deja editar: un cambio
          hecho ahora se perderia al guardar, porque el registro esta a medias. */}
      {detTab==="avance"&&(
        <BitacoraObra obra={oAct} setObras={setObras}
          bloqueada={bloqueada || oAct.__parcial===true}
          cargandoFotos={oAct.__parcial===true}/>
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

      {/* TAB PERSONAL */}
      {detTab==="personal"&&(
        <div style={CD}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div style={ST}>👷 Personal en obra</div>
            {puedeCrearPersonal(membresia) && !nuevoEmp && !bloqueada && (
              <button
                onClick={()=>setNuevoEmp(true)}
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
              >
                + Registrar trabajador
              </button>
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
                  "\n\nYa puedes asignarle turnos en Horarios. Nómina revisará su salario y contrato."
                );
              }}
            />
          )}
          {empObra.length===0&&(
            <div style={{textAlign:"center",padding:24,color:"var(--text-subtle, #94a3b8)",fontSize:13,background:"var(--surface-subtle, #f8fafc)",borderRadius:10,border:"1px dashed var(--border, #e2e8f0)",marginBottom:12}}>
              Sin empleados asignados aún
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            {empObra.map((eid,idx)=>{
              const emp=empleados.find(x=>x.id===eid);
              if(!emp)return null;
              const diasEmp=diasMap[eid]?diasMap[eid].size:0;
              const jornal=Math.round(emp.salario/26);
              return(
                <div key={eid} style={{background:"var(--surface-subtle, #f8fafc)",borderRadius:10,padding:"14px 16px",border:"1px solid var(--border, #e2e8f0)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <Av init={emp.avatar} color={PAL[idx%PAL.length]} size={36}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text-main)"}}>{emp.nombre}</div>
                      <div style={{fontSize:11,color:"var(--text-muted, #64748b)"}}>{String(emp.cargo || "").toUpperCase()}</div>
                      <div style={{fontSize:10,color:"var(--text-subtle, #94a3b8)"}}>📱 {emp.tel}</div>
                    </div>
                    {!bloqueada&&(
                      <button onClick={()=>{
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
                        style={{background:"rgba(220, 38, 38, 0.15)",border:"1px solid rgba(248, 113, 113, 0.4)",color:"#f87171",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                    )}
                  </div>
                  {/* El jornal y la cuenta bancaria del companero son datos
                      confidenciales: sin permiso solo se ven los dias. */}
                  <div style={{display:"grid",gridTemplateColumns:verDinero?"1fr 1fr 1fr":"1fr",gap:6,fontSize:10}}>
                    {[["Días en obra",diasEmp+"d","#60a5fa"],...(verDinero?[["Jornal/día",fmt(jornal),"#34d399"],["Costo obra",fmt(jornal*diasEmp),"#a78bfa"]]:[])].map(([k,v,c])=>(
                      <div key={k} style={{background:"var(--surface, #fff)",borderRadius:5,padding:"6px 8px",textAlign:"center",border:"1px solid var(--border, #f1f5f9)"}}>
                        <div style={{color:"var(--text-subtle, #94a3b8)",marginBottom:2,fontSize:9}}>{k}</div>
                        <div style={{fontWeight:700,color:c,fontSize:12}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {verDinero&&<div style={{marginTop:8,fontSize:10,color:"var(--text-subtle, #94a3b8)"}}>🏦 {emp.banco} · {emp.tipoCuenta} · <span style={{fontFamily:"monospace"}}>{emp.numeroCuenta||"—"}</span></div>}
                </div>
              );
            })}
          </div>
          <div style={bloqueada?{display:"none"}:undefined}>
            <LBL>➕ Asignar empleado a esta obra</LBL>
            <select value="" onChange={ev=>{
              const v=ev.target.value;
              if(!v)return;
              if(!empObra.includes(v)) {
                const autorActual = resolverAutorGuardado(membresia);
                const ahoraIso = new Date().toISOString();
                setObras(p=>p.map(o=>o.id===obraId?{
                  ...o,
                  empleados:[...(o.empleados||[]),v],
                  modificadoPor: membresia?.userId || null,
                  modificadoPorNombre: autorActual || o.modificadoPorNombre || "Camila Sepúlveda",
                  modificadoEn: ahoraIso,
                }:o));
              }
            }} style={{...SI,fontSize:12}}>
              <option value="">Selecciona un empleado...</option>
              {empleados.filter(emp=>!empObra.includes(emp.id)).map(emp=>(
                <option key={emp.id} value={emp.id}>{emp.nombre} · {String(emp.cargo || "").toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* TAB GASTOS */}
      {detTab==="gastos"&&verDinero&&(
        <div style={CD}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={ST}>🧾 Gastos y cuentas por pagar</div>
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
                  ✅ Guardar gasto
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
                📦 Órdenes de compra vinculadas a esta obra ({ordenesObra.length})
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
          <div style={ST}>💰 Nómina proporcional por obra</div>
          {empObra.length===0&&<div style={{textAlign:"center",padding:24,color:"var(--text-subtle, #94a3b8)",fontSize:13}}>Sin personal asignado</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            {empObra.map((eid,idx)=>{
              const emp=empleados.find(x=>x.id===eid);
              if(!emp)return null;
              const diasEmp=diasMap[eid]?diasMap[eid].size:0;
              const jornal=Math.round(emp.salario/26);
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
                  <div style={{marginTop:8,fontSize:10,color:"var(--text-subtle, #94a3b8)"}}>🏦 {emp.banco} · {emp.tipoCuenta} · <span style={{fontFamily:"monospace"}}>{emp.numeroCuenta||"—"}</span></div>
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

