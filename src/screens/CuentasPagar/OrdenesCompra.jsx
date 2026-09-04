import React, { useState, useMemo } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmt, today } from "../../lib/format";
import { puedeAprobarOrdenCompra } from "../../lib/permisos";
import Badge from "../../components/ui/Badge";
import LBL from "../../components/ui/LBL";

// Formatea moneda con decimales exactos al estilo ERP: $ 7.567.436,10
function fmtMonedaErp(valor) {
  const num = Number(valor || 0);
  return "$ " + num.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function obtenerTimestampActual() {
  const ahora = new Date();
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, "0");
  const dd = String(ahora.getDate()).padStart(2, "0");
  const hh = String(ahora.getHours()).padStart(2, "0");
  const min = String(ahora.getMinutes()).padStart(2, "0");
  const ss = String(ahora.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

export default function OrdenesCompra({
  ordenesCompra = [],
  setOrdenesCompra,
  proveedores = [],
  obras = [],
  cuentas = [],
  setCuentas,
  membresia = null,
  onIrACausacion,
}) {
  const esAprobador = puedeAprobarOrdenCompra(membresia);

  // Estados para filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroAprobacion, setFiltroAprobacion] = useState("todos");
  const [filtroFacturacion, setFiltroFacturacion] = useState("todos");
  const [filtroObra, setFiltroObra] = useState("todos");

  // Modales
  const [showNuevaOrden, setShowNuevaOrden] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [showModalRechazar, setShowModalRechazar] = useState(false);
  const [showModalCausar, setShowModalCausar] = useState(false);
  const [numFacturaCausacion, setNumFacturaCausacion] = useState("");

  // Estado del formulario de nueva orden
  const [form, setForm] = useState({
    obraId: obras[0]?.id || "",
    proveedorId: proveedores[0]?.id || "",
    solicitante: membresia?.nombre ? `${membresia.nombre} (Solicitante)` : "Residente de Obra",
    comprador: "María Camila Sepúlveda",
    documentoOrigen: "",
    fecha: today(),
    fechaEntregaEsperada: today(),
    observaciones: "",
    aplicaIva: true,
    tarifaIva: 19,
    items: [
      { desc: "", cant: 1, unit: "UND", vu: 0, total: 0 },
    ],
  });

  // Genera el siguiente ID de orden (e.g. OC02719)
  const generarSiguienteId = () => {
    const nums = ordenesCompra
      .map((o) => {
        const m = String(o.id || "").match(/OC(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 2718;
    return `OC${String(max + 1).padStart(5, "0")}`;
  };

  // Genera número de Documento Origen sugerido (OP/xxxxx)
  const generarDocumentoOrigen = (obraId) => {
    const randomNum = Math.floor(54000 + Math.random() * 9000);
    return `OP/${randomNum}`;
  };

  const abrirNuevaOrden = () => {
    const selObraId = obras[0]?.id || "";
    setForm({
      obraId: selObraId,
      proveedorId: proveedores[0]?.id || "",
      solicitante: membresia?.nombre ? `${membresia.nombre} (Solicitante)` : "Carlos Restrepo (Residente)",
      comprador: "María Camila Sepúlveda",
      documentoOrigen: generarDocumentoOrigen(selObraId),
      fecha: today(),
      fechaEntregaEsperada: today(),
      observaciones: "",
      aplicaIva: true,
      tarifaIva: 19,
      items: [
        { desc: "Cable de acero 8mm 7x19 galvanizado alma de acero", cant: 50, unit: "ML", vu: 18500, total: 925000 },
      ],
    });
    setShowNuevaOrden(true);
  };

  // Cálculo de subtotales del formulario
  const subtotalForm = useMemo(() => {
    return form.items.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  }, [form.items]);

  const ivaForm = useMemo(() => {
    if (!form.aplicaIva) return 0;
    return Math.round(subtotalForm * (form.tarifaIva / 100));
  }, [subtotalForm, form.aplicaIva, form.tarifaIva]);

  const totalForm = useMemo(() => {
    return subtotalForm + ivaForm;
  }, [subtotalForm, ivaForm]);

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };
      if (field === "cant" || field === "vu") {
        const cant = field === "cant" ? Number(value || 0) : Number(item.cant || 0);
        const vu = field === "vu" ? Number(value || 0) : Number(item.vu || 0);
        item.total = Math.round(cant * vu);
      }
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const agregarItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { desc: "", cant: 1, unit: "UND", vu: 0, total: 0 }],
    }));
  };

  const eliminarItem = (index) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const guardarNuevaOrden = (e) => {
    e.preventDefault();
    const provSel = proveedores.find((p) => p.id === form.proveedorId);
    const obraSel = obras.find((o) => o.id === form.obraId);

    if (!form.items.some((it) => it.desc.trim() && it.total > 0)) {
      alert("Por favor agregue al menos un ítem con descripción y valor.");
      return;
    }

    const nuevaOrden = {
      id: generarSiguienteId(),
      fecha: obtenerTimestampActual(),
      fechaEntregaEsperada: form.fechaEntregaEsperada || today(),
      proveedorId: form.proveedorId,
      proveedorNombre: provSel?.nombre || "Proveedor General",
      solicitante: form.solicitante.trim() || "Residente de Obra",
      comprador: form.comprador.trim() || "María Camila Sepúlveda",
      obraId: form.obraId,
      obraNombre: obraSel ? `${obraSel.nombre} — ${obraSel.cliente || ""}` : "Obra General",
      documentoOrigen: form.documentoOrigen.trim() || `OP/${Math.floor(54000 + Math.random() * 9000)}`,
      items: form.items.filter((it) => it.desc.trim()),
      subtotal: subtotalForm,
      iva: ivaForm,
      total: totalForm,
      estadoAprobacion: "Pendiente",
      aprobadoPor: "",
      aprobadoEn: "",
      motivoRechazo: "",
      estadoFacturacion: "Nada por facturar",
      facturaVinculadaId: "",
      observaciones: form.observaciones.trim(),
    };

    setOrdenesCompra((prev) => [nuevaOrden, ...prev]);
    setShowNuevaOrden(false);
  };

  // Acciones de Aprobación
  const aprobarOrden = (orden) => {
    const confirmacion = window.confirm(
      `¿Confirmas la APROBACIÓN de la orden ${orden.id}?\n\n` +
      `Proveedor: ${orden.proveedorNombre}\n` +
      `Total: ${fmtMonedaErp(orden.total)}\n` +
      `Aprobador: María Camila Sepúlveda`
    );
    if (!confirmacion) return;

    const fechaAprobacion = obtenerTimestampActual();
    setOrdenesCompra((prev) =>
      prev.map((o) =>
        o.id === orden.id
          ? {
              ...o,
              estadoAprobacion: "Aprobada",
              aprobadoPor: "María Camila Sepúlveda",
              aprobadoEn: fechaAprobacion,
              estadoFacturacion: o.estadoFacturacion === "Nada por facturar" ? "Para facturar" : o.estadoFacturacion,
            }
          : o
      )
    );

    if (ordenDetalle?.id === orden.id) {
      setOrdenDetalle((prev) => ({
        ...prev,
        estadoAprobacion: "Aprobada",
        aprobadoPor: "María Camila Sepúlveda",
        aprobadoEn: fechaAprobacion,
        estadoFacturacion: prev.estadoFacturacion === "Nada por facturar" ? "Para facturar" : prev.estadoFacturacion,
      }));
    }
  };

  const ejecutarRechazoOrden = () => {
    if (!motivoRechazo.trim()) {
      alert("Por favor ingrese el motivo del rechazo para que el solicitante pueda corregirlo.");
      return;
    }

    const fechaRechazo = obtenerTimestampActual();
    setOrdenesCompra((prev) =>
      prev.map((o) =>
        o.id === ordenDetalle.id
          ? {
              ...o,
              estadoAprobacion: "Rechazada",
              aprobadoPor: "María Camila Sepúlveda",
              aprobadoEn: fechaRechazo,
              motivoRechazo: motivoRechazo.trim(),
            }
          : o
      )
    );

    setOrdenDetalle((prev) => ({
      ...prev,
      estadoAprobacion: "Rechazada",
      aprobadoPor: "María Camila Sepúlveda",
      aprobadoEn: fechaRechazo,
      motivoRechazo: motivoRechazo.trim(),
    }));

    setShowModalRechazar(false);
    setMotivoRechazo("");
  };

  // Acción para causar la factura correspondiente a la Orden de Compra
  const ejecutarCausacionOrden = () => {
    if (!numFacturaCausacion.trim()) {
      alert("Por favor ingresa el número de la factura enviada por el proveedor.");
      return;
    }

    const orden = ordenDetalle;
    if (!orden) return;

    const nuevaCuentaId = "CXP-" + Math.floor(1000 + Math.random() * 9000);
    const nuevaCuenta = {
      id: nuevaCuentaId,
      proveedorId: orden.proveedorId,
      obraId: orden.obraId,
      factura: numFacturaCausacion.trim(),
      concepto: `Compra según Orden ${orden.id} - ${orden.items[0]?.desc || "Materiales de obra"}`,
      tipoOperacion: "compras",
      subtotal: Number(orden.subtotal || 0),
      tarifaIva: orden.iva > 0 ? 19 : 0,
      valorIva: Number(orden.iva || 0),
      conceptoRetFuente: "compras",
      baseRetFuente: Number(orden.subtotal || 0),
      tarifaRetFuente: 2.5,
      valorRetFuente: Number((Number(orden.subtotal || 0) * 0.025).toFixed(2)),
      aplicaReteiva: false,
      baseReteiva: 0,
      tarifaReteiva: 0,
      valorReteiva: 0,
      municipioReteica: "Envigado",
      codigoIca: "",
      baseReteica: 0,
      tarifaReteica: 0,
      valorReteica: 0,
      valorBrutoFactura: Number(orden.total || 0),
      valorTotalRetenciones: Number((Number(orden.subtotal || 0) * 0.025).toFixed(2)),
      valorTotalPagar: Number((Number(orden.total || 0) - Number(orden.subtotal || 0) * 0.025).toFixed(2)),
      saldoPendienteActual: Number((Number(orden.total || 0) - Number(orden.subtotal || 0) * 0.025).toFixed(2)),
      montoPagado: 0,
      monto: Number(orden.total || 0),
      fecha: today(),
      fechaVence: orden.fechaEntregaEsperada || today(),
      estado: "Pendiente",
      ordenCompraId: orden.id,
      pagosHistorial: [],
    };

    if (setCuentas) {
      setCuentas((prev) => [nuevaCuenta, ...prev]);
    }

    setOrdenesCompra((prev) =>
      prev.map((o) =>
        o.id === orden.id
          ? {
              ...o,
              estadoFacturacion: "Facturado",
              facturaVinculadaId: nuevaCuentaId,
              numFacturaProveedor: numFacturaCausacion.trim(),
            }
          : o
      )
    );

    setOrdenDetalle((prev) => ({
      ...prev,
      estadoFacturacion: "Facturado",
      facturaVinculadaId: nuevaCuentaId,
      numFacturaProveedor: numFacturaCausacion.trim(),
    }));

    setShowModalCausar(false);
    setNumFacturaCausacion("");
    alert(`Factura ${numFacturaCausacion.trim()} causada exitosamente en Contabilidad vinculada a la Orden ${orden.id}.`);
  };

  const eliminarOrden = (id) => {
    if (!window.confirm(`¿Estás seguro de eliminar la orden de compra ${id}?`)) return;
    setOrdenesCompra((prev) => prev.filter((o) => o.id !== id));
    if (ordenDetalle?.id === id) setOrdenDetalle(null);
  };

  // Filtrado de la lista
  const ordenesFiltradas = useMemo(() => {
    return ordenesCompra.filter((o) => {
      const q = busqueda.toLowerCase().trim();
      const matchQ =
        !q ||
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.proveedorNombre && o.proveedorNombre.toLowerCase().includes(q)) ||
        (o.solicitante && o.solicitante.toLowerCase().includes(q)) ||
        (o.comprador && o.comprador.toLowerCase().includes(q)) ||
        (o.documentoOrigen && o.documentoOrigen.toLowerCase().includes(q)) ||
        (o.obraNombre && o.obraNombre.toLowerCase().includes(q));

      const matchAprob =
        filtroAprobacion === "todos" || o.estadoAprobacion === filtroAprobacion;

      const matchFact =
        filtroFacturacion === "todos" || o.estadoFacturacion === filtroFacturacion;

      const matchObra =
        filtroObra === "todos" || o.obraId === filtroObra;

      return matchQ && matchAprob && matchFact && matchObra;
    });
  }, [ordenesCompra, busqueda, filtroAprobacion, filtroFacturacion, filtroObra]);

  // Métricas
  const totalOrdenes = ordenesCompra.length;
  const pendientesAprobacion = ordenesCompra.filter((o) => o.estadoAprobacion === "Pendiente").length;
  const aprobadas = ordenesCompra.filter((o) => o.estadoAprobacion === "Aprobada").length;
  const montoComprometido = ordenesCompra
    .filter((o) => o.estadoAprobacion === "Aprobada")
    .reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  return (
    <div>
      {/* Banner de bienvenida y control para María Camila Sepúlveda */}
      {esAprobador && pendientesAprobacion > 0 && (
        <div style={{
          background: "linear-gradient(90deg, #eff6ff 0%, #f0fdf4 100%)",
          border: "1px solid #bfdbfe",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🛡️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a" }}>
                Panel de Aprobación de Órdenes de Compra — María Camila Sepúlveda
              </div>
              <div style={{ fontSize: 11.5, color: "#3b82f6" }}>
                Tienes <strong>{pendientesAprobacion}</strong> orden(es) pendiente(s) de revisión y autorización presupuestal.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFiltroAprobacion("Pendiente")}
            style={{
              ...B("#2563eb", "#ffffff"),
              padding: "6px 12px",
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 6,
            }}
          >
            Ver pendientes por aprobar
          </button>
        </div>
      )}

      {/* Barra de Filtros y Acciones */}
      <div style={{ ...CD, marginBottom: 16, padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 300px" }}>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar por referencia (OC...), proveedor, solicitante, documento origen..."
              style={{ ...SI, width: "100%", fontSize: 12.5 }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={abrirNuevaOrden}
              style={{
                ...B("#cc0000", "#ffffff"),
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 4px rgba(204,0,0,0.2)",
              }}
            >
              <span>+</span>
              <span>Nueva Orden de Compra</span>
            </button>
          </div>
        </div>

        {/* Filtros secundarios */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", fontSize: 11.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#64748b", fontWeight: 600 }}>Aprobación:</span>
            <select
              value={filtroAprobacion}
              onChange={(e) => setFiltroAprobacion(e.target.value)}
              style={{ ...SI, padding: "4px 8px", fontSize: 11.5, width: "auto" }}
            >
              <option value="todos">Todos los estados</option>
              <option value="Pendiente">⏳ Pendiente</option>
              <option value="Aprobada">✓ Aprobada</option>
              <option value="Rechazada">✕ Rechazada</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#64748b", fontWeight: 600 }}>Facturación:</span>
            <select
              value={filtroFacturacion}
              onChange={(e) => setFiltroFacturacion(e.target.value)}
              style={{ ...SI, padding: "4px 8px", fontSize: 11.5, width: "auto" }}
            >
              <option value="todos">Todos los estados</option>
              <option value="Nada por facturar">Nada por facturar</option>
              <option value="Para facturar">Para facturar</option>
              <option value="Facturado">Facturado</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#64748b", fontWeight: 600 }}>Obra:</span>
            <select
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              style={{ ...SI, padding: "4px 8px", fontSize: 11.5, width: "auto", maxWidth: 220 }}
            >
              <option value="todos">Todas las obras</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>

          {(busqueda || filtroAprobacion !== "todos" || filtroFacturacion !== "todos" || filtroObra !== "todos") && (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setFiltroAprobacion("todos");
                setFiltroFacturacion("todos");
                setFiltroObra("todos");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#cc0000",
                fontSize: 11.5,
                cursor: "pointer",
                textDecoration: "underline",
                padding: "2px 6px",
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE ÓRDENES DE COMPRA (Estructura idéntica al ERP) */}
      <div style={{
        ...CD,
        padding: 0,
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "11px 14px", fontWeight: 700 }}>Referencia</th>
                <th style={{ padding: "11px 14px", fontWeight: 700 }}>Fecha</th>
                <th style={{ padding: "11px 14px", fontWeight: 700 }}>Entrega esperada</th>
                <th style={{ padding: "11px 14px", fontWeight: 700 }}>Proveedor</th>
                <th style={{ padding: "11px 14px", fontWeight: 700 }}>Comprador / Solicitante</th>
                <th style={{ padding: "11px 14px", fontWeight: 700 }}>Documento Origen</th>
                <th style={{ padding: "11px 14px", fontWeight: 700, textAlign: "right" }}>Total</th>
                <th style={{ padding: "11px 14px", fontWeight: 700, textAlign: "center" }}>Aprobación</th>
                <th style={{ padding: "11px 14px", fontWeight: 700, textAlign: "center" }}>Estado de facturación</th>
                <th style={{ padding: "11px 14px", fontWeight: 700, textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: "36px 14px", textAlign: "center", color: "#94a3b8" }}>
                    No se encontraron órdenes de compra con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                ordenesFiltradas.map((orden, idx) => {
                  const esFilaPar = idx % 2 === 1;
                  const aprobada = orden.estadoAprobacion === "Aprobada";
                  const pendiente = orden.estadoAprobacion === "Pendiente";
                  const rechazada = orden.estadoAprobacion === "Rechazada";

                  return (
                    <tr
                      key={orden.id}
                      style={{
                        background: esFilaPar ? "#fbfcfe" : "#ffffff",
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Referencia */}
                      <td style={{ padding: "12px 14px", fontWeight: 800 }}>
                        <button
                          type="button"
                          onClick={() => setOrdenDetalle(orden)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#0284c7",
                            fontWeight: 800,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          {orden.id}
                        </button>
                      </td>

                      {/* Fecha */}
                      <td style={{ padding: "12px 14px", color: "#334155", whiteSpace: "nowrap" }}>
                        {orden.fecha || "—"}
                      </td>

                      {/* Entrega esperada */}
                      <td style={{ padding: "12px 14px", color: "#475569", whiteSpace: "nowrap" }}>
                        {orden.fechaEntregaEsperada || "—"}
                      </td>

                      {/* Proveedor */}
                      <td style={{ padding: "12px 14px", color: "#0f172a", fontWeight: 600 }}>
                        {orden.proveedorNombre}
                      </td>

                      {/* Comprador / Solicitante */}
                      <td style={{ padding: "12px 14px", color: "#334155" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{orden.comprador || "María Camila Sepúlveda"}</div>
                        <div style={{ fontSize: 10.5, color: "#64748b" }}>Sol: {orden.solicitante || "Residente"}</div>
                      </td>

                      {/* Documento Origen */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#475569" }}>
                          {orden.documentoOrigen || "—"}
                        </div>
                        {orden.obraNombre && (
                          <div style={{ fontSize: 10, color: "#0284c7", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={orden.obraNombre}>
                            🏗️ {orden.obraNombre}
                          </div>
                        )}
                      </td>

                      {/* Total */}
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {fmtMonedaErp(orden.total)}
                      </td>

                      {/* Aprobación */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        {aprobada ? (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#166534",
                            background: "#dcfce7",
                            border: "1px solid #86efac",
                            padding: "3px 8px",
                            borderRadius: 6,
                          }} title={`Aprobada por ${orden.aprobadoPor || "María Camila Sepúlveda"} en ${orden.aprobadoEn || ""}`}>
                            ✓ Aprobada
                          </span>
                        ) : rechazada ? (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#991b1b",
                            background: "#fee2e2",
                            border: "1px solid #fca5a5",
                            padding: "3px 8px",
                            borderRadius: 6,
                          }} title={orden.motivoRechazo || "Orden rechazada"}>
                            ✕ Rechazada
                          </span>
                        ) : (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#c2410c",
                            background: "#ffedd5",
                            border: "1px solid #fed7aa",
                            padding: "3px 8px",
                            borderRadius: 6,
                          }} title="Requiere aprobación de María Camila Sepúlveda">
                            ⏳ Pendiente (M. Camila)
                          </span>
                        )}
                      </td>

                      {/* Estado de facturación */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        {orden.estadoFacturacion === "Facturado" ? (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#065f46",
                            background: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            padding: "3px 8px",
                            borderRadius: 6,
                          }}>
                            Facturado
                          </span>
                        ) : orden.estadoFacturacion === "Para facturar" ? (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#0369a1",
                            background: "#e0f2fe",
                            border: "1px solid #7dd3fc",
                            padding: "3px 8px",
                            borderRadius: 6,
                          }}>
                            Para facturar
                          </span>
                        ) : (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#475569",
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            padding: "3px 8px",
                            borderRadius: 6,
                          }}>
                            Nada por facturar
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: "12px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setOrdenDetalle(orden)}
                            style={{
                              ...B("#f1f5f9", "#334155"),
                              fontSize: 11,
                              padding: "4px 8px",
                              borderRadius: 5,
                            }}
                            title="Ver detalle completo de la orden"
                          >
                            Ver
                          </button>

                          {/* Botón directo de aprobación para Camila Sepúlveda */}
                          {esAprobador && pendiente && (
                            <button
                              type="button"
                              onClick={() => aprobarOrden(orden)}
                              style={{
                                ...B("#16a34a", "#ffffff"),
                                fontSize: 11,
                                padding: "4px 8px",
                                borderRadius: 5,
                                fontWeight: 700,
                              }}
                              title="Aprobar orden como María Camila Sepúlveda"
                            >
                              ✓ Aprobar
                            </button>
                          )}

                          {/* Causación directa */}
                          {aprobada && orden.estadoFacturacion !== "Facturado" && (
                            <button
                              type="button"
                              onClick={() => {
                                setOrdenDetalle(orden);
                                setShowModalCausar(true);
                              }}
                              style={{
                                ...B("#0284c7", "#ffffff"),
                                fontSize: 11,
                                padding: "4px 8px",
                                borderRadius: 5,
                                fontWeight: 700,
                              }}
                              title="Causar factura electrónica correspondiente a esta orden"
                            >
                              🧾 Causar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Resumen inferior de la tabla */}
        <div style={{
          padding: "10px 16px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          fontSize: 11.5,
          color: "#64748b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}>
          <div>Mostrando {ordenesFiltradas.length} de {ordenesCompra.length} órdenes registradas</div>
          <div style={{ fontWeight: 700, color: "#1e293b" }}>
            Total visible: {fmtMonedaErp(ordenesFiltradas.reduce((s, o) => s + Number(o.total || 0), 0))}
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* MODAL: NUEVA ORDEN DE COMPRA                           */}
      {/* ======================================================= */}
      {showNuevaOrden && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 9999,
          backdropFilter: "blur(3px)",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 12,
            maxWidth: 820,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            border: "1px solid #e2e8f0",
          }}>
            <div style={{
              padding: "16px 22px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc",
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  📦 Nueva Solicitud / Orden de Compra
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                  Requiere aprobación posterior por María Camila Sepúlveda
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNuevaOrden(false)}
                style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardarNuevaOrden} style={{ padding: 22 }}>
              {/* Encabezado del Formulario */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <LBL>Obra destino (Cargar costo)</LBL>
                  <select
                    value={form.obraId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        obraId: selId,
                        documentoOrigen: prev.documentoOrigen || generarDocumentoOrigen(selId),
                      }));
                    }}
                    style={SI}
                    required
                  >
                    <option value="">Seleccione la obra...</option>
                    {obras.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nombre} ({o.cliente || "Cliente"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <LBL>Proveedor</LBL>
                  <select
                    value={form.proveedorId}
                    onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}
                    style={SI}
                    required
                  >
                    <option value="">Seleccione el proveedor...</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.nit ? `· NIT ${p.nit}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <LBL>Documento Origen (Requisición/OP)</LBL>
                  <input
                    type="text"
                    value={form.documentoOrigen}
                    onChange={(e) => setForm({ ...form, documentoOrigen: e.target.value })}
                    placeholder="Ej. OP/54776"
                    style={SI}
                    required
                  />
                </div>

                <div>
                  <LBL>Solicitante en obra</LBL>
                  <input
                    type="text"
                    value={form.solicitante}
                    onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
                    placeholder="Nombre y rol del solicitante"
                    style={SI}
                    required
                  />
                </div>

                <div>
                  <LBL>Comprador / Responsable</LBL>
                  <input
                    type="text"
                    value={form.comprador}
                    onChange={(e) => setForm({ ...form, comprador: e.target.value })}
                    placeholder="María Camila Sepúlveda"
                    style={SI}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                <div>
                  <LBL>Fecha de solicitud</LBL>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    style={SI}
                    required
                  />
                </div>

                <div>
                  <LBL>Fecha entrega esperada en obra</LBL>
                  <input
                    type="date"
                    value={form.fechaEntregaEsperada}
                    onChange={(e) => setForm({ ...form, fechaEntregaEsperada: e.target.value })}
                    style={SI}
                    required
                  />
                </div>
              </div>

              {/* Tabla de Ítems */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                    📋 Materiales y Servicios Requeridos
                  </div>
                  <button
                    type="button"
                    onClick={agregarItem}
                    style={{
                      ...B("#003B71", "#ffffff"),
                      fontSize: 11,
                      padding: "5px 10px",
                      borderRadius: 6,
                    }}
                  >
                    + Agregar ítem
                  </button>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                        <th style={{ padding: "8px 10px", textAlign: "left" }}>Descripción del producto / servicio</th>
                        <th style={{ padding: "8px 10px", width: 70 }}>Cant.</th>
                        <th style={{ padding: "8px 10px", width: 80 }}>Unidad</th>
                        <th style={{ padding: "8px 10px", width: 120 }}>Valor unitario</th>
                        <th style={{ padding: "8px 10px", width: 120, textAlign: "right" }}>Total</th>
                        <th style={{ padding: "8px 10px", width: 40, textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 8px" }}>
                            <input
                              type="text"
                              value={item.desc}
                              onChange={(e) => handleItemChange(idx, "desc", e.target.value)}
                              placeholder="Descripción del material, calibre, referencia..."
                              style={{ ...SI, width: "100%", padding: "5px 8px" }}
                              required
                            />
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={item.cant}
                              onChange={(e) => handleItemChange(idx, "cant", e.target.value)}
                              style={{ ...SI, width: "100%", padding: "5px 8px", textAlign: "center" }}
                              required
                            />
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <select
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                              style={{ ...SI, width: "100%", padding: "5px 6px" }}
                            >
                              <option value="UND">UND</option>
                              <option value="ML">ML</option>
                              <option value="Metro">Metro</option>
                              <option value="GL">Galón</option>
                              <option value="Global">Global</option>
                              <option value="KG">KG</option>
                            </select>
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={item.vu}
                              onChange={(e) => handleItemChange(idx, "vu", e.target.value)}
                              style={{ ...SI, width: "100%", padding: "5px 8px" }}
                              required
                            />
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                            {fmtMonedaErp(item.total)}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>
                            {form.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => eliminarItem(idx)}
                                style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13 }}
                                title="Eliminar fila"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales y opciones tributarias */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 18, alignItems: "start" }}>
                <div>
                  <LBL>Observaciones y lugar de entrega</LBL>
                  <textarea
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    placeholder="Instrucciones de entrega, persona que recibe en obra, condiciones especiales..."
                    rows="3"
                    style={{ ...SI, width: "100%", resize: "vertical" }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#334155", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={form.aplicaIva}
                        onChange={(e) => setForm({ ...form, aplicaIva: e.target.checked })}
                      />
                      <span>Aplicar IVA 19%</span>
                    </label>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: "#64748b" }}>Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>{fmtMonedaErp(subtotalForm)}</span>
                  </div>
                  {form.aplicaIva && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: "#64748b" }}>IVA (19%):</span>
                      <span style={{ fontWeight: 600 }}>{fmtMonedaErp(ivaForm)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: "1.5px solid #cbd5e1", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800 }}>
                    <span style={{ color: "#0f172a" }}>Total Orden:</span>
                    <span style={{ color: "#cc0000" }}>{fmtMonedaErp(totalForm)}</span>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowNuevaOrden(false)}
                  style={{ ...B("#f1f5f9", "#475569"), padding: "9px 16px", fontSize: 12 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ ...B("#cc0000", "#ffffff"), padding: "9px 18px", fontSize: 12, fontWeight: 700 }}
                >
                  Guardar y Enviar a Aprobación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: DETALLE Y APROBACIÓN POR MARÍA CAMILA SEPÚLVEDA */}
      {/* ======================================================= */}
      {ordenDetalle && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 9999,
          backdropFilter: "blur(3px)",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 12,
            maxWidth: 820,
            width: "100%",
            maxHeight: "92vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            border: "1px solid #e2e8f0",
          }}>
            {/* Cabecera del Detalle */}
            <div style={{
              padding: "16px 24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    Orden de Compra {ordenDetalle.id}
                  </span>
                  {ordenDetalle.estadoAprobacion === "Aprobada" ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#166534", background: "#dcfce7", border: "1px solid #86efac", padding: "2px 8px", borderRadius: 6 }}>
                      ✓ Aprobada
                    </span>
                  ) : ordenDetalle.estadoAprobacion === "Rechazada" ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5", padding: "2px 8px", borderRadius: 6 }}>
                      ✕ Rechazada
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", background: "#ffedd5", border: "1px solid #fed7aa", padding: "2px 8px", borderRadius: 6 }}>
                      ⏳ Pendiente de Aprobación
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                  Doc. Origen: <strong>{ordenDetalle.documentoOrigen}</strong> · Creada: {ordenDetalle.fecha}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrdenDetalle(null)}
                style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Bloque de Información General */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 20, background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}>
                <div>
                  <div style={{ marginBottom: 6 }}><strong style={{ color: "#0f172a" }}>🏢 Obra Vinculada:</strong> {ordenDetalle.obraNombre || "—"}</div>
                  <div style={{ marginBottom: 6 }}><strong style={{ color: "#0f172a" }}>🏭 Proveedor:</strong> {ordenDetalle.proveedorNombre}</div>
                  <div><strong style={{ color: "#0f172a" }}>👤 Solicitante en Obra:</strong> {ordenDetalle.solicitante}</div>
                </div>
                <div>
                  <div style={{ marginBottom: 6 }}><strong style={{ color: "#0f172a" }}>💼 Comprador:</strong> {ordenDetalle.comprador}</div>
                  <div style={{ marginBottom: 6 }}><strong style={{ color: "#0f172a" }}>📅 Entrega esperada:</strong> {ordenDetalle.fechaEntregaEsperada}</div>
                  <div><strong style={{ color: "#0f172a" }}>🧾 Facturación:</strong> {ordenDetalle.estadoFacturacion} {ordenDetalle.numFacturaProveedor ? `(Factura: ${ordenDetalle.numFacturaProveedor})` : ""}</div>
                </div>
              </div>

              {/* Estado de Aprobación y Trazabilidad */}
              <div style={{
                background: ordenDetalle.estadoAprobacion === "Aprobada" ? "#f0fdf4" : ordenDetalle.estadoAprobacion === "Rechazada" ? "#fef2f2" : "#fffbeb",
                border: `1px solid ${ordenDetalle.estadoAprobacion === "Aprobada" ? "#bbf7d0" : ordenDetalle.estadoAprobacion === "Rechazada" ? "#fecaca" : "#fde68a"}`,
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: ordenDetalle.estadoAprobacion === "Aprobada" ? "#166534" : ordenDetalle.estadoAprobacion === "Rechazada" ? "#991b1b" : "#92400e" }}>
                  {ordenDetalle.estadoAprobacion === "Aprobada"
                    ? `✓ Aprobada oficialmente por María Camila Sepúlveda`
                    : ordenDetalle.estadoAprobacion === "Rechazada"
                    ? `✕ Rechazada por María Camila Sepúlveda`
                    : `⏳ Pendiente de revisión y aprobación por María Camila Sepúlveda`}
                </div>
                {ordenDetalle.aprobadoEn && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    Fecha y hora de decisión: {ordenDetalle.aprobadoEn}
                  </div>
                )}
                {ordenDetalle.motivoRechazo && (
                  <div style={{ fontSize: 11.5, color: "#b91c1c", marginTop: 4, background: "#fff", padding: "6px 10px", borderRadius: 6, border: "1px solid #fecaca" }}>
                    <strong>Motivo de rechazo:</strong> {ordenDetalle.motivoRechazo}
                  </div>
                )}
              </div>

              {/* Tabla de Ítems */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                  Detalle de ítems cotizados
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #e2e8f0" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Descripción</th>
                      <th style={{ padding: "8px 10px", width: 70, textAlign: "center" }}>Cant.</th>
                      <th style={{ padding: "8px 10px", width: 70, textAlign: "center" }}>Unidad</th>
                      <th style={{ padding: "8px 10px", width: 120, textAlign: "right" }}>Valor Unitario</th>
                      <th style={{ padding: "8px 10px", width: 130, textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ordenDetalle.items || []).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 10px", color: "#1e293b" }}>{it.desc}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.cant}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: "#64748b" }}>{it.unit}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtMonedaErp(it.vu)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>{fmtMonedaErp(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                      <td colSpan="4" style={{ padding: "8px 10px", textAlign: "right", color: "#64748b" }}>Subtotal:</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmtMonedaErp(ordenDetalle.subtotal)}</td>
                    </tr>
                    {ordenDetalle.iva > 0 && (
                      <tr style={{ background: "#f8fafc" }}>
                        <td colSpan="4" style={{ padding: "8px 10px", textAlign: "right", color: "#64748b" }}>IVA:</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmtMonedaErp(ordenDetalle.iva)}</td>
                      </tr>
                    )}
                    <tr style={{ background: "#f1f5f9", fontWeight: 800 }}>
                      <td colSpan="4" style={{ padding: "10px", textAlign: "right", color: "#0f172a", fontSize: 13 }}>TOTAL:</td>
                      <td style={{ padding: "10px", textAlign: "right", color: "#cc0000", fontSize: 14 }}>{fmtMonedaErp(ordenDetalle.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Observaciones */}
              {ordenDetalle.observaciones && (
                <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 8, fontSize: 11.5, color: "#475569", marginBottom: 20 }}>
                  <strong>Observaciones:</strong> {ordenDetalle.observaciones}
                </div>
              )}

              {/* Botones de Aprobación y Acciones */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                <div>
                  {ordenDetalle.estadoAprobacion !== "Aprobada" && (
                    <button
                      type="button"
                      onClick={() => eliminarOrden(ordenDetalle.id)}
                      style={{ ...B("#fee2e2", "#ef4444"), border: "1px solid #fca5a5", fontSize: 11.5, padding: "6px 12px" }}
                    >
                      🗑 Eliminar orden
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* Si está pendiente y el usuario tiene permisos de aprobación */}
                  {esAprobador && ordenDetalle.estadoAprobacion === "Pendiente" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowModalRechazar(true)}
                        style={{ ...B("#fff", "#dc2626"), border: "1px solid #dc2626", fontSize: 12, padding: "8px 14px", fontWeight: 600 }}
                      >
                        ✕ Rechazar con motivo
                      </button>
                      <button
                        type="button"
                        onClick={() => aprobarOrden(ordenDetalle)}
                        style={{ ...B("#16a34a", "#ffffff"), fontSize: 12, padding: "8px 16px", fontWeight: 700 }}
                      >
                        ✓ Aprobar Orden (María Camila Sepúlveda)
                      </button>
                    </>
                  )}

                  {/* Si ya está aprobada y no facturada */}
                  {ordenDetalle.estadoAprobacion === "Aprobada" && ordenDetalle.estadoFacturacion !== "Facturado" && (
                    <button
                      type="button"
                      onClick={() => setShowModalCausar(true)}
                      style={{ ...B("#0284c7", "#ffffff"), fontSize: 12, padding: "8px 16px", fontWeight: 700 }}
                    >
                      🧾 Causar Factura en Contabilidad
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{ ...B("#f1f5f9", "#334155"), fontSize: 12, padding: "8px 14px" }}
                  >
                    🖨️ Imprimir OC
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrdenDetalle(null)}
                    style={{ ...B("#0f172a", "#ffffff"), fontSize: 12, padding: "8px 16px" }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: MOTIVO DE RECHAZO                               */}
      {/* ======================================================= */}
      {showModalRechazar && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 10000,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 10,
            maxWidth: 500,
            width: "100%",
            padding: 20,
            border: "1px solid #fca5a5",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>
              ✕ Rechazar Orden de Compra {ordenDetalle?.id}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
              Indica la razón por la cual no se aprueba esta compra para que el solicitante en obra pueda corregirla:
            </div>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Ej: Precios unitarios superiores al presupuesto cotizado; verificar con proveedor alternativo..."
              rows="4"
              style={{ ...SI, width: "100%", marginBottom: 14 }}
              autoFocus
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowModalRechazar(false)}
                style={{ ...B("#f1f5f9", "#475569"), padding: "7px 14px", fontSize: 12 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarRechazoOrden}
                style={{ ...B("#dc2626", "#ffffff"), padding: "7px 14px", fontSize: 12, fontWeight: 700 }}
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: CAUSAR FACTURA EN CONTABILIDAD                  */}
      {/* ======================================================= */}
      {showModalCausar && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 10000,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 10,
            maxWidth: 520,
            width: "100%",
            padding: 22,
            border: "1px solid #7dd3fc",
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0369a1", marginBottom: 6 }}>
              🧾 Causar Factura de Proveedor — Orden {ordenDetalle?.id}
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 14 }}>
              Esta acción vinculará formalmente la factura del proveedor con la orden de compra aprobada por María Camila Sepúlveda, registrando la cuenta por pagar en Causación.
            </div>

            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12 }}>
              <div><strong>Proveedor:</strong> {ordenDetalle?.proveedorNombre}</div>
              <div><strong>Obra:</strong> {ordenDetalle?.obraNombre}</div>
              <div><strong>Monto a Causar:</strong> {fmtMonedaErp(ordenDetalle?.total)}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <LBL>Número de Factura Electrónica del Proveedor</LBL>
              <input
                type="text"
                value={numFacturaCausacion}
                onChange={(e) => setNumFacturaCausacion(e.target.value)}
                placeholder="Ej. FE-8492 o FACT-2026-001"
                style={{ ...SI, width: "100%" }}
                autoFocus
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowModalCausar(false)}
                style={{ ...B("#f1f5f9", "#475569"), padding: "8px 14px", fontSize: 12 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarCausacionOrden}
                style={{ ...B("#0284c7", "#ffffff"), padding: "8px 16px", fontSize: 12, fontWeight: 700 }}
              >
                Causar Factura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
