import Badge from "../../components/ui/Badge";
import ListaPagos from "./ListaPagos";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import BuscadorCliente from "../../components/BuscadorCliente";
import ReciboCajaMediaCarta, { generarHtmlMediaCarta } from "./ReciboCajaMediaCarta";
import { openPrintTab } from "../../lib/cotizacionPrint";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";
import {
  CONCEPTOS_RETEFUENTE,
  CONCEPTOS_RETEIVA,
  CONCEPTOS_RETEICA,
  CONCEPTOS_OTRAS,
  CUENTAS_RETENCION,
  calcularRetencionesRecibo,
} from "../../lib/retencionesRecibo";
import { useState, useMemo } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmt, today } from "../../lib/format";

export default function Pagos({ ctx }) {
  const {
    obras = [],
    setObras,
    pagos = [],
    setPagos,
    clientes = [],
    cotizaciones = [],
    empresaConfig = [],
    membresia,
  } = ctx;

  const [nombreCliente, setNombreCliente] = useState("");
  const [clienteObj, setClienteObj] = useState(null);
  const [obraPagoId, setObraPagoId] = useState("");
  const [guardandoRecibo, setGuardandoRecibo] = useState(false);
  const [vistaPago, setVistaPago] = useState("registro");
  const [reciboParaImprimir, setReciboParaImprimir] = useState(null);

  // Datos base del recibo de caja
  const [reciboCaja, setReciboCaja] = useState({
    tipo: "Abono a obra",
    monto: "",
    fecha: today(),
    metodo: "Transferencia",
    notas: "",
  });

  // Retenciones practicadas por el cliente (amarradas a cuentas PUC)
  const [reteFuenteConcepto, setReteFuenteConcepto] = useState("obra_2"); // 2.0% contratos construcción
  const [reteFuenteTarifa, setReteFuenteTarifa] = useState(2.0);
  const [reteFuenteManual, setReteFuenteManual] = useState(false);
  const [reteFuenteValor, setReteFuenteValor] = useState(0);

  const [reteIcaConcepto, setReteIcaConcepto] = useState("ica_69"); // 6.9 por mil Envigado/Medellín
  const [reteIcaTarifa, setReteIcaTarifa] = useState(6.9);
  const [reteIcaManual, setReteIcaManual] = useState(false);
  const [reteIcaValor, setReteIcaValor] = useState(0);

  const [reteIvaConcepto, setReteIvaConcepto] = useState("ninguna");
  const [reteIvaTarifa, setReteIvaTarifa] = useState(0);
  const [reteIvaManual, setReteIvaManual] = useState(false);
  const [reteIvaValor, setReteIvaValor] = useState(0);

  const [otrasConcepto, setOtrasConcepto] = useState("ninguna");
  const [otrasTarifa, setOtrasTarifa] = useState(0);
  const [otrasManual, setOtrasManual] = useState(false);
  const [otrasValor, setOtrasValor] = useState(0);

  const [mostrarRetenciones, setMostrarRetenciones] = useState(true);

  const normalizarTexto = (valor = "") =>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  // Consolida todos los clientes conocidos de clientes, cotizaciones y obras con su NIT
  const clientesConocidos = useMemo(() => {
    const mapa = new Map();
    const registrar = (datos) => {
      const nombre = normalizarRazonSocial(datos.nombre);
      if (!nombre) return;
      const previo = mapa.get(nombre) || {};
      const contacto = normalizarRazonSocial(datos.contacto) === nombre ? "" : (datos.contacto || "");
      mapa.set(nombre, {
        nombre,
        nit: previo.nit || datos.nit || "",
        contacto: previo.contacto || contacto,
        contactoEmail: previo.contactoEmail || datos.contactoEmail || "",
        telefono: previo.telefono || datos.telefono || "",
        ciudad: previo.ciudad || datos.ciudad || "",
        direccion: previo.direccion || datos.direccion || "",
      });
    };
    (clientes || []).forEach((c) => registrar({ nombre: c.nombre, nit: c.nit, contacto: c.contacto, contactoEmail: c.email, telefono: c.telefono, ciudad: c.ciudad, direccion: c.direccion }));
    (cotizaciones || []).forEach((c) => registrar({ nombre: c.cliente, nit: c.nit, contacto: c.contacto, contactoEmail: c.contactoEmail, telefono: c.telefono, ciudad: c.ciudad, direccion: c.direccion }));
    (obras || []).forEach((o) => registrar({ nombre: o.cliente, nit: o.nit, telefono: o.tel, ciudad: o.ciudad, direccion: o.direccion }));
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [clientes, cotizaciones, obras]);

  // Cálculo automático de retenciones y valores netos
  const retencionesCalc = useMemo(() => {
    const base = Math.round(Number(reciboCaja.monto || 0));
    return calcularRetencionesRecibo({
      base,
      reteFuente: { concepto: reteFuenteConcepto, tarifa: reteFuenteTarifa, valor: reteFuenteValor, manual: reteFuenteManual },
      reteIva: { concepto: reteIvaConcepto, tarifa: reteIvaTarifa, valor: reteIvaValor, manual: reteIvaManual },
      reteIca: { concepto: reteIcaConcepto, tarifa: reteIcaTarifa, valor: reteIcaValor, manual: reteIcaManual },
      otras: { concepto: otrasConcepto, tarifa: otrasTarifa, valor: otrasValor, manual: otrasManual },
    });
  }, [
    reciboCaja.monto,
    reteFuenteConcepto,
    reteFuenteTarifa,
    reteFuenteValor,
    reteFuenteManual,
    reteIvaConcepto,
    reteIvaTarifa,
    reteIvaValor,
    reteIvaManual,
    reteIcaConcepto,
    reteIcaTarifa,
    reteIcaValor,
    reteIcaManual,
    otrasConcepto,
    otrasTarifa,
    otrasValor,
    otrasManual,
  ]);

  const pagosNormalizados = useMemo(() => {
    return (Array.isArray(pagos) ? pagos : []).map((pago) => ({
      ...pago,
      monto: Number(pago?.monto ?? pago?.valor ?? 0),
      valor: Number(pago?.monto ?? pago?.valor ?? 0),
      valorNeto: Number(pago?.valorNeto ?? pago?.monto ?? 0),
      metodo: pago?.metodo ?? pago?.medio ?? "",
      medio: pago?.metodo ?? pago?.medio ?? "",
      tipo: pago?.tipo ?? pago?.referencia ?? "Recibo de caja",
      estado: pago?.estado ?? "Pagado",
      fecha: pago?.fecha || today(),
    }));
  }, [pagos]);

  // Filtra obras por el cliente seleccionado o por búsqueda de texto
  const obrasDelCliente = useMemo(() => {
    const term = normalizarTexto(nombreCliente).trim();
    const nitTerm = (clienteObj?.nit || "").replace(/\D/g, "");
    if (!term && !nitTerm) return obras;

    const filtradas = obras.filter((obra) => {
      const obCli = normalizarTexto(obra.cliente);
      const matchNom = obCli.includes(term) || term.includes(obCli);
      const obNit = (obra.nit || "").replace(/\D/g, "");
      const matchNit = nitTerm && obNit && obNit === nitTerm;
      return matchNom || matchNit;
    });

    return filtradas.length > 0 ? filtradas : obras;
  }, [obras, nombreCliente, clienteObj]);

  const obraSeleccionada = obras.find((obra) => obra.id === obraPagoId) || null;

  const alElegirCliente = (c) => {
    setNombreCliente(c.nombre);
    setClienteObj(c);
    const cNit = (c.nit || "").replace(/\D/g, "");
    const cNom = normalizarTexto(c.nombre);
    const obrasMatch = obras.filter((o) => {
      const oNit = (o.nit || "").replace(/\D/g, "");
      const oNom = normalizarTexto(o.cliente);
      return (cNit && oNit && cNit === oNit) || oNom.includes(cNom) || cNom.includes(oNom);
    });

    if (obrasMatch.length === 1) {
      setObraPagoId(obrasMatch[0].id);
    } else if (obrasMatch.length > 1) {
      const conSaldo = obrasMatch.find((o) => Number(o.saldo || 0) > 0) || obrasMatch[0];
      setObraPagoId(conSaldo.id);
    }
  };

  const alElegirObra = (id) => {
    setObraPagoId(id);
    if (id) {
      const obra = obras.find((o) => o.id === id);
      if (obra) {
        if (!nombreCliente) {
          setNombreCliente(obra.cliente || "");
        }
        if (!clienteObj || !clienteObj.nit) {
          const cMatch = clientesConocidos.find((c) =>
            normalizarTexto(c.nombre) === normalizarTexto(obra.cliente) ||
            (obra.nit && c.nit && c.nit.replace(/\D/g, "") === obra.nit.replace(/\D/g, ""))
          );
          if (cMatch) {
            setClienteObj(cMatch);
          } else {
            setClienteObj({
              nombre: obra.cliente || "",
              nit: obra.nit || "",
              ciudad: obra.ciudad || "",
              direccion: obra.direccion || "",
              telefono: obra.tel || "",
            });
          }
        }
      }
    }
  };

  // Manejo de cambio de conceptos de retención con cálculo automático
  const alCambiarReteFuente = (id) => {
    setReteFuenteConcepto(id);
    const c = CONCEPTOS_RETEFUENTE.find((item) => item.id === id);
    if (c && c.tarifa !== null) {
      setReteFuenteTarifa(c.tarifa);
      setReteFuenteManual(false);
    }
  };

  const alCambiarReteIca = (id) => {
    setReteIcaConcepto(id);
    const c = CONCEPTOS_RETEICA.find((item) => item.id === id);
    if (c && c.tarifa !== null) {
      setReteIcaTarifa(c.tarifa);
      setReteIcaManual(false);
    }
  };

  const alCambiarReteIva = (id) => {
    setReteIvaConcepto(id);
    const c = CONCEPTOS_RETEIVA.find((item) => item.id === id);
    if (c && c.tarifa !== null) {
      setReteIvaTarifa(c.tarifa);
      setReteIvaManual(false);
    }
  };

  const alCambiarOtras = (id) => {
    setOtrasConcepto(id);
    const c = CONCEPTOS_OTRAS.find((item) => item.id === id);
    if (c && c.tarifa !== null) {
      setOtrasTarifa(c.tarifa);
      setOtrasManual(false);
    }
  };

  const actualizarSaldoObra = (obraId, montoAbono) => {
    if (!obraId || !Number.isFinite(montoAbono) || montoAbono <= 0) return;
    setObras((prev) => prev.map((obra) => {
      if (obra.id !== obraId) return obra;
      const pagadoActual = Number(obra.pagado || 0);
      const totalActual = Number(obra.total || 0);
      const nuevoPagado = pagadoActual + montoAbono;
      const nuevoSaldo = Math.max(0, totalActual - nuevoPagado);
      return {
        ...obra,
        pagado: nuevoPagado,
        saldo: nuevoSaldo,
      };
    }));
  };

  const devolverSaldoObra = (obraId, montoAbono) => {
    if (!obraId || !Number.isFinite(montoAbono) || montoAbono <= 0) return;
    setObras((prev) => prev.map((obra) => {
      if (obra.id !== obraId) return obra;
      const totalActual = Number(obra.total || 0);
      const nuevoPagado = Math.max(0, Number(obra.pagado || 0) - montoAbono);
      const nuevoSaldo = Math.max(0, totalActual - nuevoPagado);
      return {
        ...obra,
        pagado: nuevoPagado,
        saldo: nuevoSaldo,
      };
    }));
  };

  const eliminarPago = (pago) => {
    const obra = obras.find((o) => o.id === pago.obraId);
    const monto = Number(pago.monto || 0);
    const aviso =
      `¿Eliminar este recibo de caja?

` +
      `${pago.id} · ${fmt(monto)}
` +
      `Cliente: ${pago.cliente || obra?.cliente || "General"}
` +
      `Obra: ${pago.obraId}${obra?.proyecto ? ` · ${obra.proyecto}` : ""}
` +
      (pago.fecha ? `Fecha: ${pago.fecha}
` : "") +
      `
` +
      (pago.estado === "Pagado"
        ? `Ese dinero se le devolverá al saldo pendiente de la obra.

`
        : `Estaba sin cobrar, así que el saldo de la obra no cambia.

`) +
      `Esto no se puede deshacer.`;
    if (!window.confirm(aviso)) return;

    if (pago.estado === "Pagado") devolverSaldoObra(pago.obraId, monto);
    setPagos((prev) => prev.filter((p) => p.id !== pago.id));
  };

  const cobrar = (id) => {
    const pagoActual = pagosNormalizados.find((p) => p.id === id);
    if (!pagoActual || pagoActual.estado === "Pagado") return;
    setTimeout(() => {
      actualizarSaldoObra(pagoActual.obraId, Number(pagoActual.monto || 0));
      setPagos((prev) => prev.map((p) => p.id === id ? {
        ...p,
        estado: "Pagado",
        fecha: today(),
        metodo: p.metodo ?? p.medio ?? "Transferencia",
      } : p));
    }, 500);
  };

  const generarConsecutivoRC = () => {
    const maxNum = (pagos || []).reduce((max, p) => {
      const idStr = String(p.id || p.consecutivo || "");
      const match = idStr.match(/RC-(\d+)/i);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `RC-${String(maxNum + 1).padStart(4, "0")}`;
  };

  const guardarRecibo = () => {
    const montoBruto = retencionesCalc.montoBruto;
    if (!obraPagoId || !Number.isFinite(montoBruto) || montoBruto <= 0) return;

    const idRC = generarConsecutivoRC();
    const saldoAnterior = Number(obraSeleccionada?.saldo || 0);
    const nuevoSaldo = Math.max(0, saldoAnterior - montoBruto);

    const clienteFinal = clienteObj?.nombre || obraSeleccionada?.cliente || nombreCliente || "Cliente Ingeanclajes";
    const nitFinal = clienteObj?.nit || obraSeleccionada?.nit || "";

    const nuevoPago = {
      id: idRC,
      consecutivo: idRC,
      obraId: obraPagoId,
      cliente: clienteFinal,
      nit: nitFinal,
      tipo: reciboCaja.tipo?.trim() || "Abono a obra",
      monto: montoBruto,
      valor: montoBruto,
      valorBruto: montoBruto,
      valorNeto: retencionesCalc.montoNeto,
      totalRetenciones: retencionesCalc.totalRetenciones,
      valorRetFuente: retencionesCalc.reteFuente.valor,
      valorReteIva: retencionesCalc.reteIva.valor,
      valorReteIca: retencionesCalc.reteIca.valor,
      valorOtrasRet: retencionesCalc.otras.valor,
      retenciones: retencionesCalc,
      fecha: reciboCaja.fecha || today(),
      estado: "Pagado",
      metodo: reciboCaja.metodo || "Transferencia",
      medio: reciboCaja.metodo || "Transferencia",
      notas: (reciboCaja.notas || "").trim(),
      saldoAnterior,
      saldoNuevo,
      totalObra: Number(obraSeleccionada?.total || 0),
      elaboradoPor: membresia?.nombre || "Administración Ingeanclajes",
    };

    setGuardandoRecibo(true);
    setPagos((prev) => [nuevoPago, ...prev]);
    actualizarSaldoObra(obraPagoId, montoBruto);

    // Abrir modal de impresión Media Carta de inmediato
    setReciboParaImprimir(nuevoPago);

    // Limpiar formulario a valores por defecto
    setReciboCaja({
      tipo: "Abono a obra",
      monto: "",
      fecha: today(),
      metodo: "Transferencia",
      notas: "",
    });
    setReteFuenteManual(false);
    setReteIcaManual(false);
    setReteIvaManual(false);
    setOtrasManual(false);

    setTimeout(() => setGuardandoRecibo(false), 350);
  };

  const limpiarFormulario = () => {
    setNombreCliente("");
    setClienteObj(null);
    setObraPagoId("");
    setReciboCaja({
      tipo: "Abono a obra",
      monto: "",
      fecha: today(),
      metodo: "Transferencia",
      notas: "",
    });
    setReteFuenteConcepto("obra_2");
    setReteFuenteTarifa(2.0);
    setReteFuenteManual(false);
    setReteIcaConcepto("ica_69");
    setReteIcaTarifa(6.9);
    setReteIcaManual(false);
    setReteIvaConcepto("ninguna");
    setReteIvaTarifa(0);
    setReteIvaManual(false);
    setOtrasConcepto("ninguna");
    setOtrasTarifa(0);
    setOtrasManual(false);
  };

  const saldoProyectado = obraSeleccionada
    ? Math.max(0, Number(obraSeleccionada.saldo || 0) - Number(retencionesCalc.montoBruto || 0))
    : 0;

  return (
    <div style={{ padding: "14px 28px 28px" }}>
      {/* 1. Barra de Navegación de Recibos de Caja (Alineada y moderna) */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
          background: "var(--surface, #ffffff)",
          padding: "8px 12px",
          borderRadius: 12,
          border: "1px solid var(--border, #e2e8f0)",
          boxShadow: "var(--shadow, 0 1px 3px rgba(0,0,0,0.05))",
        }}
      >
        <button
          type="button"
          onClick={() => setVistaPago("registro")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            border: vistaPago === "registro" ? "1.5px solid #cc0000" : "1.5px solid var(--border, #e2e8f0)",
            background: vistaPago === "registro" ? "#cc0000" : "var(--surface, #ffffff)",
            color: vistaPago === "registro" ? "#ffffff" : "var(--text-main, #334155)",
            boxShadow: vistaPago === "registro" ? "0 4px 12px rgba(204,0,0,0.2)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: 16 }}>🧾</span>
          <span>1. Registrar Recibo de Caja</span>
        </button>

        <button
          type="button"
          onClick={() => setVistaPago("historial")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            border: vistaPago === "historial" ? "1.5px solid #003B71" : "1.5px solid var(--border, #e2e8f0)",
            background: vistaPago === "historial" ? "#003B71" : "var(--surface, #ffffff)",
            color: vistaPago === "historial" ? "#ffffff" : "var(--text-main, #334155)",
            boxShadow: vistaPago === "historial" ? "0 4px 12px rgba(0,59,113,0.2)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: 16 }}>📋</span>
          <span>2. Historial de Recibos</span>
          <span
            style={{
              fontSize: 11,
              background: vistaPago === "historial" ? "rgba(255,255,255,0.25)" : "var(--border, #f1f5f9)",
              color: vistaPago === "historial" ? "#ffffff" : "var(--text-muted, #475569)",
              padding: "2px 8px",
              borderRadius: 999,
              fontWeight: 800,
            }}
          >
            {pagosNormalizados.length}
          </span>
        </button>
      </div>

      {/* 2. Formulario de Registro de Recibo de Caja */}
      {vistaPago === "registro" && (
        <div
          style={{
            ...CD,
            marginBottom: 22,
            border: "1px solid var(--border, #fed7aa)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={ST}>Registrar Recibo de Caja (Comprobante de Ingreso)</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#cc0000", fontFamily: "Consolas, monospace" }}>
              Próximo consecutivo: {generarConsecutivoRC()}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.95fr", gap: 20, alignItems: "start" }}>
            <div style={{ display: "grid", gap: 14 }}>
              {/* Buscador de Cliente por NIT o Razón Social como en Cotizaciones */}
              <div>
                <BuscadorCliente
                  label="Cliente / Razón Social (Buscar por NIT o Nombre) *"
                  valor={nombreCliente}
                  clientes={clientesConocidos}
                  onEscribir={(v) => {
                    setNombreCliente(v);
                  }}
                  onElegir={alElegirCliente}
                  ayuda="Escribe el NIT o razón social para desplegar los clientes registrados y autocompletar su información."
                />

                {clienteObj?.nit && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 4,
                      background: "var(--surface-subtle, #f8fafc)",
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--border, #e2e8f0)",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--text-muted, #64748b)", fontWeight: 600 }}>NIT / C.C.:</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-main, #0f172a)", fontFamily: "Consolas, monospace" }}>
                      {clienteObj.nit}
                    </span>
                    {clienteObj.ciudad && (
                      <span style={{ fontSize: 11, color: "var(--text-muted, #475569)", marginLeft: "auto" }}>
                        📍 {clienteObj.ciudad}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Selector de Obra vinculada */}
              <div>
                <LBL>Obra / Proyecto a abonar *</LBL>
                <select
                  value={obraPagoId}
                  onChange={(e) => alElegirObra(e.target.value)}
                  style={SI}
                >
                  <option value="">Seleccionar obra o proyecto...</option>
                  {obrasDelCliente.map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.id} · {obra.cliente} · {obra.proyecto} {Number(obra.saldo || 0) > 0 ? `(Pendiente: ${fmt(Number(obra.saldo))})` : "(Al día)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor del Abono Bruto a Cartera y Fecha */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                <div>
                  <LBL>Valor bruto del abono a la obra (Base de retención) *</LBL>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={reciboCaja.monto}
                    onChange={(e) => setReciboCaja({ ...reciboCaja, monto: e.target.value })}
                    placeholder="Ej. 10000000"
                    style={{ ...SI, fontSize: 15, fontWeight: 700 }}
                  />
                  <div style={{ fontSize: 11, color: "var(--color-primario, #003B71)", marginTop: 4, fontWeight: 600 }}>
                    {Number(reciboCaja.monto || 0) > 0
                      ? `Abono a cartera: ${fmt(Number(reciboCaja.monto || 0))}`
                      : "Ingresa el valor total que se abonará a la deuda"}
                  </div>
                </div>
                <div>
                  <LBL>Fecha de recaudo *</LBL>
                  <input
                    type="date"
                    value={reciboCaja.fecha}
                    onChange={(e) => setReciboCaja({ ...reciboCaja, fecha: e.target.value })}
                    style={SI}
                  />
                </div>
              </div>

              {/* SECCIÓN ESPECIAL: RETENCIONES QUE PRACTICA EL CLIENTE */}
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1.5px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed rgba(245, 158, 11, 0.4)", paddingBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>🛡️</span>
                    <strong style={{ fontSize: 12.5, color: "#f59e0b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Retenciones practicadas por el cliente (Anticipo de Impuestos a favor)
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostrarRetenciones(!mostrarRetenciones)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#f59e0b",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {mostrarRetenciones ? "Ocultar opciones ▲" : "Mostrar opciones ▼"}
                  </button>
                </div>

                {mostrarRetenciones && (
                  <div style={{ display: "grid", gap: 10 }}>
                    {/* 1. ReteFuente (Cuenta 135515) */}
                    <div style={{ background: "var(--surface, #ffffff)", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border, #fef3c7)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-main, #78350f)" }}>
                          1. Retención en la fuente (Renta)
                        </span>
                        <span style={{ fontSize: 10, background: "rgba(3, 105, 161, 0.15)", color: "#38bdf8", padding: "1px 7px", borderRadius: 4, fontWeight: 800, fontFamily: "Consolas, monospace" }}>
                          Cuenta PUC: 135515
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center" }}>
                        <select
                          value={reteFuenteConcepto}
                          onChange={(e) => alCambiarReteFuente(e.target.value)}
                          style={{ ...SI, fontSize: 11.5, padding: "5px 8px" }}
                        >
                          {CONCEPTOS_RETEFUENTE.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <div style={{ textAlign: "right", fontFamily: "Consolas, monospace", fontWeight: 800, color: retencionesCalc.reteFuente.valor > 0 ? "#f59e0b" : "var(--text-muted, #64748b)", fontSize: 12.5 }}>
                          -{fmt(retencionesCalc.reteFuente.valor)}
                        </div>
                      </div>
                      {reteFuenteConcepto === "personalizada" && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted, #78350f)" }}>Tarifa %:</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={reteFuenteTarifa}
                            onChange={(e) => setReteFuenteTarifa(Number(e.target.value))}
                            style={{ ...SI, width: 80, padding: "3px 6px", fontSize: 11 }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 2. ReteICA (Cuenta 135518) */}
                    <div style={{ background: "var(--surface, #ffffff)", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border, #fef3c7)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-main, #78350f)" }}>
                          2. Retención de Industria y Comercio (ReteICA)
                        </span>
                        <span style={{ fontSize: 10, background: "rgba(3, 105, 161, 0.15)", color: "#38bdf8", padding: "1px 7px", borderRadius: 4, fontWeight: 800, fontFamily: "Consolas, monospace" }}>
                          Cuenta PUC: 135518
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center" }}>
                        <select
                          value={reteIcaConcepto}
                          onChange={(e) => alCambiarReteIca(e.target.value)}
                          style={{ ...SI, fontSize: 11.5, padding: "5px 8px" }}
                        >
                          {CONCEPTOS_RETEICA.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <div style={{ textAlign: "right", fontFamily: "Consolas, monospace", fontWeight: 800, color: retencionesCalc.reteIca.valor > 0 ? "#f59e0b" : "var(--text-muted, #64748b)", fontSize: 12.5 }}>
                          -{fmt(retencionesCalc.reteIca.valor)}
                        </div>
                      </div>
                      {reteIcaConcepto === "personalizada" && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted, #78350f)" }}>Tarifa por mil (‰):</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={reteIcaTarifa}
                            onChange={(e) => setReteIcaTarifa(Number(e.target.value))}
                            style={{ ...SI, width: 80, padding: "3px 6px", fontSize: 11 }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 3. ReteIVA (Cuenta 135517) */}
                    <div style={{ background: "var(--surface, #ffffff)", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border, #fef3c7)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-main, #78350f)" }}>
                          3. Retención de IVA (ReteIVA)
                        </span>
                        <span style={{ fontSize: 10, background: "rgba(3, 105, 161, 0.15)", color: "#38bdf8", padding: "1px 7px", borderRadius: 4, fontWeight: 800, fontFamily: "Consolas, monospace" }}>
                          Cuenta PUC: 135517
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center" }}>
                        <select
                          value={reteIvaConcepto}
                          onChange={(e) => alCambiarReteIva(e.target.value)}
                          style={{ ...SI, fontSize: 11.5, padding: "5px 8px" }}
                        >
                          {CONCEPTOS_RETEIVA.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <div style={{ textAlign: "right", fontFamily: "Consolas, monospace", fontWeight: 800, color: retencionesCalc.reteIva.valor > 0 ? "#f59e0b" : "var(--text-muted, #64748b)", fontSize: 12.5 }}>
                          -{fmt(retencionesCalc.reteIva.valor)}
                        </div>
                      </div>
                      {reteIvaConcepto === "manual" && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted, #78350f)" }}>Valor manual en pesos ($):</span>
                          <input
                            type="number"
                            min="0"
                            value={reteIvaValor}
                            onChange={(e) => {
                              setReteIvaValor(Number(e.target.value));
                              setReteIvaManual(true);
                            }}
                            style={{ ...SI, width: 120, padding: "3px 6px", fontSize: 11 }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 4. Otras Deducciones / Estampillas (Cuenta 135595) */}
                    <div style={{ background: "var(--surface, #ffffff)", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border, #fef3c7)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-main, #78350f)" }}>
                          4. Otras deducciones / Estampillas
                        </span>
                        <span style={{ fontSize: 10, background: "rgba(3, 105, 161, 0.15)", color: "#38bdf8", padding: "1px 7px", borderRadius: 4, fontWeight: 800, fontFamily: "Consolas, monospace" }}>
                          Cuenta PUC: 135595
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, alignItems: "center" }}>
                        <select
                          value={otrasConcepto}
                          onChange={(e) => alCambiarOtras(e.target.value)}
                          style={{ ...SI, fontSize: 11.5, padding: "5px 8px" }}
                        >
                          {CONCEPTOS_OTRAS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <div style={{ textAlign: "right", fontFamily: "Consolas, monospace", fontWeight: 800, color: retencionesCalc.otras.valor > 0 ? "#f59e0b" : "var(--text-muted, #64748b)", fontSize: 12.5 }}>
                          -{fmt(retencionesCalc.otras.valor)}
                        </div>
                      </div>
                      {otrasConcepto === "manual" && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted, #78350f)" }}>Valor manual ($):</span>
                          <input
                            type="number"
                            min="0"
                            value={otrasValor}
                            onChange={(e) => {
                              setOtrasValor(Number(e.target.value));
                              setOtrasManual(true);
                            }}
                            style={{ ...SI, width: 120, padding: "3px 6px", fontSize: 11 }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Resumen contable de liquidación */}
                <div style={{ background: "rgba(245, 158, 11, 0.12)", padding: "8px 12px", borderRadius: 8, display: "grid", gap: 4, border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-main, #78350f)" }}>
                    <span>Valor Bruto Abonado a Cartera (Cuenta 130505):</span>
                    <strong style={{ fontFamily: "Consolas, monospace" }}>{fmt(retencionesCalc.montoBruto)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#f97316" }}>
                    <span>(-) Total Retenciones Practicadas (Cuentas 1355):</span>
                    <strong style={{ fontFamily: "Consolas, monospace" }}>-{fmt(retencionesCalc.totalRetenciones)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#22c55e", borderTop: "1.5px solid rgba(245, 158, 11, 0.3)", paddingTop: 4, marginTop: 2 }}>
                    <span style={{ fontWeight: 800 }}>(=) Valor Neto que ingresa a Caja/Bancos (Cuenta 111005):</span>
                    <strong style={{ fontFamily: "Consolas, monospace", fontSize: 15, fontWeight: 900 }}>{fmt(retencionesCalc.montoNeto)}</strong>
                  </div>
                </div>
              </div>

              {/* Tipo y Método */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <LBL>Concepto del ingreso</LBL>
                  <input
                    value={reciboCaja.tipo}
                    onChange={(e) => setReciboCaja({ ...reciboCaja, tipo: e.target.value })}
                    placeholder="Abono a obra / anticipo 50% / saldo"
                    style={SI}
                  />
                </div>
                <div>
                  <LBL>Forma de pago</LBL>
                  <select
                    value={reciboCaja.metodo}
                    onChange={(e) => setReciboCaja({ ...reciboCaja, metodo: e.target.value })}
                    style={SI}
                  >
                    <option value="Transferencia">Transferencia bancaria</option>
                    <option value="Consignación">Consignación</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="PSE">PSE / Pasarela</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              {/* Notas y soporte */}
              <div>
                <LBL>Notas o soporte de pago</LBL>
                <textarea
                  value={reciboCaja.notas}
                  onChange={(e) => setReciboCaja({ ...reciboCaja, notas: e.target.value })}
                  rows={2}
                  placeholder="Referencia de transferencia, número de aprobación bancaria o soporte"
                  style={{ ...SI, minHeight: 60, resize: "vertical" }}
                />
              </div>

              {/* Botones de acción */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={guardarRecibo}
                  disabled={!obraPagoId || retencionesCalc.montoBruto <= 0 || guardandoRecibo}
                  style={{
                    ...B("#cc0000"),
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 800,
                    opacity: (!obraPagoId || retencionesCalc.montoBruto <= 0 || guardandoRecibo) ? 0.6 : 1,
                    cursor: (!obraPagoId || retencionesCalc.montoBruto <= 0 || guardandoRecibo) ? "not-allowed" : "pointer",
                  }}
                >
                  <span>💾</span>
                  <span>{guardandoRecibo ? "Guardando..." : "Guardar e Imprimir Recibo"}</span>
                </button>
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  style={B("var(--btn-cancelar-bg, #f1f5f9)", "var(--btn-cancelar-txt, #475569)")}
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Panel lateral con resumen del estado de cuenta de la obra */}
            <div
              style={{
                background: "var(--surface-subtle, #fff7ed)",
                border: "1px solid var(--border, #fed7aa)",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#ea580c",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                Estado de Cuenta de la Obra
              </div>

              {obraSeleccionada ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted, #64748b)", fontFamily: "Consolas, monospace" }}>
                      {obraSeleccionada.id}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main, #1a1a2e)" }}>
                      {obraSeleccionada.cliente}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted, #475569)", fontWeight: 500 }}>
                      {obraSeleccionada.proyecto}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted, #64748b)", textTransform: "uppercase", fontWeight: 600 }}>
                        Total Contrato
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-main, #1a1a2e)" }}>
                        {fmt(Number(obraSeleccionada.total || 0))}
                      </div>
                    </div>
                    <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted, #64748b)", textTransform: "uppercase", fontWeight: 600 }}>
                        Cobrado hasta hoy
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#16a34a" }}>
                        {fmt(Number(obraSeleccionada.pagado || 0))}
                      </div>
                    </div>
                    <div
                      style={{
                        background: "var(--surface, #fff)",
                        border: "1.5px solid var(--border, #fed7aa)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        gridColumn: "span 2",
                      }}
                    >
                      <div style={{ fontSize: 10, color: "#ea580c", textTransform: "uppercase", fontWeight: 700 }}>
                        Saldo Pendiente Actual
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 900,
                          color: Number(obraSeleccionada.saldo || 0) > 0 ? "#ea580c" : "#16a34a",
                        }}
                      >
                        {fmt(Number(obraSeleccionada.saldo || 0))}
                      </div>
                    </div>

                    {retencionesCalc.montoBruto > 0 && (
                      <div
                        style={{
                          background: "rgba(16, 185, 129, 0.08)",
                          border: "1px dashed rgba(16, 185, 129, 0.3)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          gridColumn: "span 2",
                        }}
                      >
                        <div style={{ fontSize: 10, color: "#10b981", textTransform: "uppercase", fontWeight: 700 }}>
                          Nuevo Saldo tras este Recibo
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: saldoProyectado > 0 ? "#ea580c" : "#10b981" }}>
                          {fmt(saldoProyectado)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted, #15803d)", marginTop: 4 }}>
                          Se descuentan {fmt(retencionesCalc.montoBruto)} del saldo (Neto recibido: {fmt(retencionesCalc.montoNeto)} + Retenciones reconocidas: {fmt(retencionesCalc.totalRetenciones)})
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)", lineHeight: 1.6, borderTop: "1px solid var(--border, #fed7aa)", paddingTop: 8 }}>
                    Ciudad: <strong style={{ color: "var(--text-main, #334155)" }}>{obraSeleccionada.ciudad || "No registrada"}</strong><br />
                    Dirección: <strong style={{ color: "var(--text-main, #334155)" }}>{obraSeleccionada.direccion || "No registrada"}</strong>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--text-muted, #64748b)", lineHeight: 1.6 }}>
                  Busca al cliente por su <strong>NIT</strong> o razón social para filtrar sus obras y proyectos.
                  Al seleccionar una obra, se calculará el saldo anterior y el nuevo saldo del recibo de caja.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Listado e Historial de Recibos de Caja */}
      <ListaPagos
        pagos={pagosNormalizados}
        obras={obras}
        acciones={{
          cobrar: (p) => cobrar(p.id),
          eliminar: (p) => eliminarPago(p),
          imprimir: (p) => setReciboParaImprimir(p),
        }}
      />

      {/* 4. Modal de Vista Previa e Impresión en Formato Media Carta (IA-FT-05) */}
      {reciboParaImprimir && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setReciboParaImprimir(null);
          }}
        >
          <div
            style={{
              background: "var(--surface, #ffffff)",
              borderRadius: 12,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              width: "100%",
              maxWidth: 820,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid var(--border, #cbd5e1)",
            }}
          >
            {/* Cabecera del Modal */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 20px",
                background: "#0f172a",
                color: "#ffffff",
                borderBottom: "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>🧾</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.5 }}>
                    RECIBO DE CAJA {reciboParaImprimir.id}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    Formato Oficial Media Carta (8.5" × 5.5" / 216 mm × 140 mm) · IA-FT-05
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    const ob = obras.find((o) => o.id === reciboParaImprimir.obraId);
                    const cl = clientesConocidos.find((c) =>
                      normalizarTexto(c.nombre) === normalizarTexto(reciboParaImprimir.cliente || ob?.cliente)
                    );
                    const html = generarHtmlMediaCarta(
                      reciboParaImprimir,
                      ob,
                      cl || { nombre: reciboParaImprimir.cliente, nit: reciboParaImprimir.nit },
                      empresaConfig,
                      reciboParaImprimir.elaboradoPor || membresia?.nombre || "Administración Ingeanclajes"
                    );
                    openPrintTab(html, `Recibo de Caja ${reciboParaImprimir.id}`);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#cc0000",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(204,0,0,0.4)",
                  }}
                >
                  <span>🖨️</span>
                  <span>Imprimir Media Carta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReciboParaImprimir(null)}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    fontSize: 16,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Cerrar vista previa"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Documento Recibo de Caja Media Carta */}
            <div style={{ padding: "18px 20px", overflowY: "auto", background: "var(--bg-app, #f8fafc)" }}>
              <ReciboCajaMediaCarta
                recibo={reciboParaImprimir}
                obra={obras.find((o) => o.id === reciboParaImprimir.obraId)}
                cliente={
                  clientesConocidos.find((c) =>
                    normalizarTexto(c.nombre) === normalizarTexto(reciboParaImprimir.cliente)
                  ) || { nombre: reciboParaImprimir.cliente, nit: reciboParaImprimir.nit }
                }
                empresaConfig={empresaConfig}
                elaboradoPor={reciboParaImprimir.elaboradoPor || membresia?.nombre || "Administración Ingeanclajes"}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
