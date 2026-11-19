import { useMemo, useState } from "react";
import { useAppData } from "../../context/AppDataContext";
import { puedeVerCostosInternos } from "../../lib/permisos";
import {
  CATEGORIAS_INSUMO,
  calcularCosteoPropuesta,
  calcularLineasDesdeRecetas,
  huellaItemsPropuesta,
  obtenerConfigCostos,
} from "../../lib/costosCotizacion";
import { estimarCostosConIa } from "../../lib/asistenteCotizacion";
import { fmt } from "../../lib/format";
import { SI } from "../../styles/tokens";
import IndicadorAnalizandoIa from "../../components/ui/IndicadorAnalizandoIa";

const ESTILOS_ESTADO = {
  optimo: {
    bg: "#ECFDF3",
    border: "#ABEFC6",
    text: "#027A48",
    label: "Margen saludable",
  },
  ajustado: {
    bg: "#FFFAEB",
    border: "#FEDF89",
    text: "#B54708",
    label: "Margen ajustado",
  },
  critico: {
    bg: "#FEF3F2",
    border: "#FECDCA",
    text: "#B42318",
    label: "Margen bajo",
  },
  perdida: {
    bg: "#FEF3F2",
    border: "#FDA29B",
    text: "#B42318",
    label: "Pérdida estimada",
  },
  sin_venta: {
    bg: "var(--surface-subtle, #f2f4f7)",
    border: "var(--border, #e2e8f0)",
    text: "var(--text-muted, #667085)",
    label: "Sin precio de venta",
  },
};

function etiquetaModo(modo) {
  if (modo === "ia") return "Estimado con IA";
  if (modo === "personalizado") return "Ajustado a mano";
  return "Automático (APU)";
}

/**
 * Panel confidencial de Materiales, Costo y Ganancia dentro del editor de propuestas.
 * - Visible ÚNICAMENTE para administradores (Cristian y Camila).
 * - Nunca se renderiza en la vista previa ni en el PDF enviado al cliente.
 */
export default function PanelCosteoInterno({
  propuesta,
  onChangePropuesta,
  cl = {},
  tituloCotizacion = "",
  saludoCotizacion = "",
  observacionesCot = "",
}) {
  const { membresia, empresaConfig, irAPantalla } = useAppData();
  const autorizado = puedeVerCostosInternos(membresia);

  const configCostos = useMemo(() => obtenerConfigCostos(empresaConfig), [empresaConfig]);
  const costeo = useMemo(
    () => calcularCosteoPropuesta(propuesta, configCostos),
    [propuesta, configCostos]
  );

  const [abierto, setAbierto] = useState(true);
  const [estimandoIa, setEstimandoIa] = useState(false);
  const [errorIa, setErrorIa] = useState("");
  const [mostrandoAgregar, setMostrandoAgregar] = useState(false);
  const [nuevoInsumoId, setNuevoInsumoId] = useState("");
  const [nuevoItem, setNuevoItem] = useState({
    nombre: "",
    categoria: "material",
    unidad: "Und",
    cant: 1,
    costoUnitario: 0,
  });

  // Seguridad estricta: si no es administrador, no renderizar absolutamente nada.
  if (!autorizado) return null;

  const itemsPropuesta = Array.isArray(propuesta?.items) ? propuesta.items : [];
  const estado = ESTILOS_ESTADO[costeo.estadoMargen] || ESTILOS_ESTADO.sin_venta;

  const guardarLineasPersonalizadas = (nuevasLineas, extras = {}) => {
    const limpias = nuevasLineas.map((l, idx) => ({
      id: l.id || `cos-${Date.now()}-${idx + 1}`,
      insumoId: l.insumoId || null,
      nombre: String(l.nombre || "").trim() || "Insumo",
      categoria: l.categoria || "material",
      unidad: String(l.unidad || "Und").trim() || "Und",
      cant: Math.max(0, Number(l.cant) || 0),
      costoUnitario: Math.max(0, Math.round(Number(l.costoUnitario) || 0)),
      origen: l.origen || "manual",
      nota: String(l.nota || "").trim(),
    }));
    onChangePropuesta({
      costeoInterno: {
        modo: extras.modo || "personalizado",
        lineas: limpias,
        huellaItems: huellaItemsPropuesta(itemsPropuesta),
        resumenIa: extras.resumenIa !== undefined ? extras.resumenIa : costeo.resumenIa,
        avisosIa: extras.avisosIa !== undefined ? extras.avisosIa : costeo.avisosIa,
        actualizadoEn: new Date().toISOString(),
      },
    });
  };

  const editarLinea = (idLinea, campo, valor) => {
    const siguientes = costeo.lineas.map((l) =>
      l.id === idLinea
        ? {
            ...l,
            [campo]: valor,
            origen: l.origen === "ia" ? "ia" : "manual",
          }
        : l
    );
    guardarLineasPersonalizadas(siguientes, {
      modo: costeo.modo === "ia" ? "ia" : "personalizado",
    });
  };

  const eliminarLinea = (idLinea) => {
    const siguientes = costeo.lineas.filter((l) => l.id !== idLinea);
    guardarLineasPersonalizadas(siguientes, { modo: "personalizado" });
  };

  const recalcularDesdeRecetas = () => {
    setErrorIa("");
    onChangePropuesta({ costeoInterno: null });
  };

  const seleccionarInsumoCatalogo = (insumoId) => {
    setNuevoInsumoId(insumoId);
    if (!insumoId) return;
    const encontrado = (configCostos.insumos || []).find((ins) => ins.id === insumoId);
    if (encontrado) {
      setNuevoItem({
        nombre: encontrado.nombre,
        categoria: encontrado.categoria,
        unidad: encontrado.unidad,
        cant: 1,
        costoUnitario: encontrado.costoUnitario,
      });
    }
  };

  const agregarLineaManual = () => {
    if (!String(nuevoItem.nombre || "").trim()) return;
    const nueva = {
      id: `man-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      insumoId: nuevoInsumoId || null,
      nombre: nuevoItem.nombre.trim(),
      categoria: nuevoItem.categoria || "material",
      unidad: String(nuevoItem.unidad || "Und").trim() || "Und",
      cant: Math.max(0.1, Number(nuevoItem.cant) || 1),
      costoUnitario: Math.max(0, Math.round(Number(nuevoItem.costoUnitario) || 0)),
      origen: "manual",
      nota: "Agregado manualmente",
    };
    guardarLineasPersonalizadas([...costeo.lineas, nueva], { modo: "personalizado" });
    setNuevoInsumoId("");
    setNuevoItem({ nombre: "", categoria: "material", unidad: "Und", cant: 1, costoUnitario: 0 });
    setMostrandoAgregar(false);
  };

  const ejecutarIa = async ({ soloFaltantes = false } = {}) => {
    if (estimandoIa) return;
    setErrorIa("");
    setEstimandoIa(true);
    try {
      const itemsAEstimar = soloFaltantes && costeo.itemsSinReceta.length > 0
        ? costeo.itemsSinReceta
        : itemsPropuesta;

      const resultado = await estimarCostosConIa({
        titulo: tituloCotizacion || propuesta?.nombre || "",
        saludo: saludoCotizacion || "",
        incluyeTexto: propuesta?.incluyeTexto || "",
        observaciones: observacionesCot || "",
        obra: cl?.obra || "",
        ciudad: cl?.ciudad || "",
        alcance: propuesta?.alcance || "",
        requerimientoCliente: propuesta?.requerimientoCliente || "",
        items: itemsAEstimar,
        configCostos,
        soloSinReceta: Boolean(soloFaltantes && costeo.itemsSinReceta.length > 0),
      });

      let lineasFinales = resultado.lineas;
      if (soloFaltantes && costeo.itemsSinReceta.length > 0 && costeo.itemsConReceta.length > 0) {
        // Conservamos los ítems con receta fija y sumamos lo estimado por la IA para las reformas
        const baseRecetas = calcularLineasDesdeRecetas(itemsPropuesta, configCostos).lineas;
        const combinadas = baseRecetas.map((l) => ({ ...l }));
        for (const iaLinea of resultado.lineas) {
          const existente = iaLinea.insumoId
            ? combinadas.find((c) => c.insumoId && c.insumoId === iaLinea.insumoId)
            : null;
          if (existente) {
            existente.cant = Math.round((Number(existente.cant || 0) + Number(iaLinea.cant || 0)) * 10) / 10;
            existente.nota = [existente.nota, `IA: ${iaLinea.nota || "reforma"}`].filter(Boolean).join(" · ");
          } else {
            combinadas.push(iaLinea);
          }
        }
        lineasFinales = combinadas;
      }

      guardarLineasPersonalizadas(lineasFinales, {
        modo: "ia",
        resumenIa: resultado.resumen || "",
        avisosIa: resultado.avisos || [],
      });
    } catch (err) {
      setErrorIa(err?.message || "No se pudo completar la estimación con IA.");
    } finally {
      setEstimandoIa(false);
    }
  };

  const hayItemsValidos = itemsPropuesta.some((it) => String(it?.desc || "").trim() && Number(it?.cant || 0) > 0);
  const puedeEstimarIa =
    hayItemsValidos ||
    Boolean(String(propuesta?.requerimientoCliente || "").trim()) ||
    Boolean(String(saludoCotizacion || "").trim()) ||
    Boolean(String(tituloCotizacion || "").trim());

  return (
    <div
      style={{
        marginTop: 16,
        marginBottom: 16,
        borderRadius: 14,
        border: "1px solid rgba(15, 23, 42, 0.14)",
        background: "linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, var(--surface, #ffffff) 100%)",
        boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.06)",
        overflow: "hidden",
      }}
    >
      {estimandoIa && <IndicadorAnalizandoIa flotante texto="Analizando con IA…" />}
      {/* Cabecera colapsable */}
      <div
        onClick={() => setAbierto((v) => !v)}
        style={{
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          cursor: "pointer",
          background: "rgba(15, 23, 42, 0.03)",
          borderBottom: abierto ? "1px solid var(--border, #e2e8f0)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".05em",
              padding: "2px 8px",
              borderRadius: 999,
              background: "#101828",
              color: "#ffffff",
            }}
          >
            Solo interno · No sale en PDF
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #101828)" }}>
            Materiales, costo y ganancia
          </span>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 6,
              background: costeo.modo === "ia" ? "#EEF4FF" : "var(--surface, #ffffff)",
              color: costeo.modo === "ia" ? "#1D4ED8" : "var(--text-muted, #475467)",
              border: "1px solid var(--border, #d0d5dd)",
            }}
          >
            {etiquetaModo(costeo.modo)}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted, #475467)", fontVariantNumeric: "tabular-nums" }}>
            Tu costo: <strong style={{ color: "var(--text-main, #101828)" }}>{fmt(costeo.costoTotal)}</strong>
          </span>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 999,
              background: estado.bg,
              color: estado.text,
              border: `1px solid ${estado.border}`,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {costeo.ingresoNeto > 0
              ? `${costeo.gananciaNeta >= 0 ? "+" : ""}${fmt(costeo.gananciaNeta)} (${costeo.margenPct}%)`
              : estado.label}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted, #667085)", fontWeight: 700 }}>
            {abierto ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {abierto && (
        <div style={{ padding: "14px 16px 16px" }}>
          {/* Tarjetas KPI financieras */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #667085)", letterSpacing: ".04em" }}>
                Ingreso neto (sin IVA)
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-main, #101828)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                {fmt(costeo.ingresoNeto)}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-subtle, #667085)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                Total cliente c/IVA: {fmt(costeo.ventaTotal)}
              </div>
            </div>

            <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #667085)", letterSpacing: ".04em" }}>
                Tu costo estimado
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-main, #101828)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                {fmt(costeo.costoTotal)}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-subtle, #667085)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                Mat. {fmt(costeo.costoMateriales)} · M.O. {fmt(costeo.costoManoObra)} · Log. {fmt(costeo.costoLogistica)}
              </div>
            </div>

            <div style={{ background: estado.bg, border: `1px solid ${estado.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: estado.text, letterSpacing: ".04em" }}>
                Ganancia neta
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: estado.text, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                {costeo.gananciaNeta >= 0 ? fmt(costeo.gananciaNeta) : `-${fmt(Math.abs(costeo.gananciaNeta))}`}
              </div>
              <div style={{ fontSize: 10.5, color: estado.text, marginTop: 2, opacity: 0.9 }}>
                {estado.label}
              </div>
            </div>

            <div style={{ background: estado.bg, border: `1px solid ${estado.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: estado.text, letterSpacing: ".04em" }}>
                Margen real
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: estado.text, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                {costeo.ingresoNeto > 0 ? `${costeo.margenPct}%` : "—"}
              </div>
              <div style={{ fontSize: 10.5, color: estado.text, marginTop: 2, opacity: 0.9 }}>
                Meta mínima: {costeo.margenMinimoPct}%
              </div>
            </div>
          </div>

          {/* Alerta de ítems sin receta fija (reformas / trabajos a medida) */}
          {costeo.itemsSinReceta.length > 0 && costeo.modo === "auto" && (
            <div
              style={{
                background: "#EEF4FF",
                border: "1px solid #B2DDFF",
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 12, color: "#1849A9", flex: 1, minWidth: 220 }}>
                <strong>
                  {costeo.itemsSinReceta.length === 1
                    ? "1 ítem a medida / reforma sin receta fija:"
                    : `${costeo.itemsSinReceta.length} ítems a medida / reformas sin receta fija:`}
                </strong>{" "}
                {costeo.itemsSinReceta.map((i) => i.desc).join(" · ")}
                <div style={{ fontSize: 11, marginTop: 2, opacity: 0.9 }}>
                  Aún no están sumados en tu costo. Usa la IA para estimar sus materiales, mano de obra y costos de compra.
                </div>
              </div>
              <button
                type="button"
                disabled={estimandoIa}
                onClick={() => ejecutarIa({ soloFaltantes: costeo.itemsConReceta.length > 0 })}
                style={{
                  background: "#1D4ED8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 13px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: estimandoIa ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {estimandoIa
                  ? "Calculando con IA…"
                  : costeo.itemsConReceta.length > 0
                  ? "✨ Estimar faltantes con IA"
                  : "✨ Estimar materiales y costo con IA"}
              </button>
            </div>
          )}

          {/* Aviso si los ítems de la propuesta cambiaron tras guardar un ajuste manual o IA */}
          {costeo.itemsCambiaron && (
            <div
              style={{
                background: "#FFFAEB",
                border: "1px solid #FEDF89",
                borderRadius: 10,
                padding: "8px 12px",
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                fontSize: 12,
                color: "#B54708",
              }}
            >
              <span>
                Los ítems o cantidades de esta propuesta cambiaron desde el último ajuste de costos.
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={recalcularDesdeRecetas}
                  style={{
                    background: "#ffffff",
                    color: "#B54708",
                    border: "1px solid #F5B546",
                    borderRadius: 7,
                    padding: "4px 10px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Recalcular recetas
                </button>
                <button
                  type="button"
                  disabled={estimandoIa}
                  onClick={() => ejecutarIa({ soloFaltantes: false })}
                  style={{
                    background: "#B54708",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 7,
                    padding: "4px 10px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: estimandoIa ? "wait" : "pointer",
                  }}
                >
                  {estimandoIa ? "Estimando…" : "Re-estimar con IA"}
                </button>
              </div>
            </div>
          )}

          {/* Resumen y avisos de la IA */}
          {(costeo.resumenIa || costeo.avisosIa.length > 0) && (
            <div
              style={{
                background: "var(--surface-subtle, #f8fafc)",
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: 9,
                padding: "8px 12px",
                marginBottom: 12,
                fontSize: 11.5,
                color: "var(--text-muted, #475467)",
                lineHeight: 1.5,
              }}
            >
              {costeo.resumenIa && (
                <div>
                  <strong style={{ color: "var(--text-main, #101828)" }}>Nota técnica IA:</strong> {costeo.resumenIa}
                </div>
              )}
              {costeo.avisosIa.map((av, idx) => (
                <div key={idx} style={{ marginTop: 2 }}>• {av}</div>
              ))}
            </div>
          )}

          {errorIa && (
            <div
              style={{
                background: "#FEF3F2",
                border: "1px solid #FECDCA",
                color: "#B42318",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 12,
                fontSize: 12,
              }}
            >
              {errorIa}
            </div>
          )}

          {/* Barra de herramientas */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!puedeEstimarIa || estimandoIa}
                onClick={() => ejecutarIa({ soloFaltantes: false })}
                title="Analiza todos los ítems y el alcance con IA para sugerir materiales, mano de obra y costos de compra"
                style={{
                  background: !puedeEstimarIa ? "#f2f4f7" : "#101828",
                  color: !puedeEstimarIa ? "#98a2b3" : "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: !puedeEstimarIa || estimandoIa ? "default" : "pointer",
                }}
              >
                {estimandoIa ? "Analizando con IA…" : "✨ Analizar con IA"}
              </button>

              <button
                type="button"
                onClick={() => setMostrandoAgregar((v) => !v)}
                style={{
                  background: "var(--surface, #ffffff)",
                  color: "var(--text-main, #101828)",
                  border: "1px solid var(--border, #d0d5dd)",
                  borderRadius: 8,
                  padding: "6px 11px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {mostrandoAgregar ? "Cerrar formulario" : "+ Agregar material / gasto"}
              </button>

              {costeo.modo !== "auto" && (
                <button
                  type="button"
                  onClick={recalcularDesdeRecetas}
                  title="Descarta ajustes manuales/IA y vuelve al cálculo automático por recetas del catálogo"
                  style={{
                    background: "transparent",
                    color: "var(--text-muted, #475467)",
                    border: "1px solid var(--border, #d0d5dd)",
                    borderRadius: 8,
                    padding: "6px 11px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ↺ Volver a recetas APU
                </button>
              )}
            </div>

            {irAPantalla && (
              <button
                type="button"
                onClick={() => irAPantalla("catalogo", { subtab: "insumos" })}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#1D4ED8",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "4px 2px",
                }}
              >
                Editar precios de compra y recetas ↗
              </button>
            )}
          </div>

          {/* Formulario rápido para añadir un insumo o gasto */}
          {mostrandoAgregar && (
            <div
              style={{
                background: "var(--surface, #ffffff)",
                border: "1px solid #B2DDFF",
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-main, #101828)", marginBottom: 8 }}>
                Agregar material, jornada o gasto a esta propuesta
              </div>
              <div style={{ marginBottom: 8 }}>
                <select
                  value={nuevoInsumoId}
                  onChange={(e) => seleccionarInsumoCatalogo(e.target.value)}
                  style={{ ...SI, fontSize: 12, padding: "6px 8px" }}
                >
                  <option value="">— Elegir del catálogo de insumos (o escribir uno personalizado abajo) —</option>
                  {CATEGORIAS_INSUMO.map((cat) => (
                    <optgroup key={cat.id} label={cat.label}>
                      {(configCostos.insumos || [])
                        .filter((ins) => ins.categoria === cat.id)
                        .map((ins) => (
                          <option key={ins.id} value={ins.id}>
                            {ins.nombre} ({ins.unidad} · {fmt(ins.costoUnitario)})
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.1fr .65fr .7fr 1.1fr auto", gap: 8, alignItems: "end" }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted, #667085)", marginBottom: 3 }}>Nombre</div>
                  <input
                    value={nuevoItem.nombre}
                    onChange={(e) => setNuevoItem((p) => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej. Alquiler de andamio certificado"
                    style={{ ...SI, fontSize: 12, padding: "5px 8px" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted, #667085)", marginBottom: 3 }}>Rubro</div>
                  <select
                    value={nuevoItem.categoria}
                    onChange={(e) => setNuevoItem((p) => ({ ...p, categoria: e.target.value }))}
                    style={{ ...SI, fontSize: 12, padding: "5px 6px" }}
                  >
                    {CATEGORIAS_INSUMO.map((c) => (
                      <option key={c.id} value={c.id}>{c.corto}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted, #667085)", marginBottom: 3 }}>Cant.</div>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={nuevoItem.cant}
                    onChange={(e) => setNuevoItem((p) => ({ ...p, cant: Math.max(0, Number(e.target.value) || 0) }))}
                    style={{ ...SI, fontSize: 12, padding: "5px 6px", textAlign: "center" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted, #667085)", marginBottom: 3 }}>Unidad</div>
                  <input
                    value={nuevoItem.unidad}
                    onChange={(e) => setNuevoItem((p) => ({ ...p, unidad: e.target.value }))}
                    placeholder="Und"
                    style={{ ...SI, fontSize: 12, padding: "5px 6px", textAlign: "center" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted, #667085)", marginBottom: 3 }}>Costo unit. (COP)</div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={Number(nuevoItem.costoUnitario) ? Number(nuevoItem.costoUnitario).toLocaleString("es-CO") : ""}
                    onChange={(e) => {
                      const dig = e.target.value.replace(/\D/g, "");
                      setNuevoItem((p) => ({ ...p, costoUnitario: dig ? parseInt(dig, 10) : 0 }));
                    }}
                    placeholder="0"
                    style={{ ...SI, fontSize: 12, padding: "5px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={agregarLineaManual}
                  style={{
                    background: "#0071e3",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 7,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

          {/* Tabla editable de insumos, mano de obra y logística */}
          {costeo.lineas.length === 0 ? (
            <div
              style={{
                background: "var(--surface, #ffffff)",
                border: "1px dashed var(--border, #cbd5e1)",
                borderRadius: 10,
                padding: "18px 14px",
                textAlign: "center",
                fontSize: 12,
                color: "var(--text-muted, #667085)",
              }}
            >
              {hayItemsValidos
                ? "Los ítems actuales no tienen receta fija configurada. Pulsa «✨ Calcular todo con IA» o agrega los insumos manualmente."
                : "Agrega ítems arriba en el Detalle económico y aquí aparecerán automáticamente los materiales, mano de obra, costo y ganancia."}
            </div>
          ) : (
            <div
              style={{
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: 10,
                overflowX: "auto",
                background: "var(--surface, #ffffff)",
              }}
            >
              <div style={{ minWidth: 620 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2.8fr 0.65fr 0.65fr 1.05fr 1.05fr 28px",
                    gap: 8,
                    padding: "8px 10px",
                    background: "var(--surface-subtle, #f8fafc)",
                    borderBottom: "1px solid var(--border, #e2e8f0)",
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                    color: "var(--text-muted, #475467)",
                  }}
                >
                  <span>Material / Mano de obra / Gasto</span>
                  <span style={{ textAlign: "center" }}>Cant.</span>
                  <span style={{ textAlign: "center" }}>Unidad</span>
                  <span style={{ textAlign: "right" }}>Tu costo unit.</span>
                  <span style={{ textAlign: "right" }}>Subtotal costo</span>
                  <span />
                </div>

                {CATEGORIAS_INSUMO.map((cat) => {
                  const grupo = costeo.lineas.filter((l) => l.categoria === cat.id);
                  if (!grupo.length) return null;
                  const subtotalGrupo = grupo.reduce((s, l) => s + l.subtotal, 0);
                  return (
                    <div key={cat.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 10px",
                          background: "rgba(15, 23, 42, 0.025)",
                          borderTop: "1px solid var(--border, #eaecf0)",
                          borderBottom: "1px solid var(--border, #f2f4f7)",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-main, #344054)",
                        }}
                      >
                        <span>{cat.label}</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(subtotalGrupo)}</span>
                      </div>

                      {grupo.map((linea) => (
                        <div
                          key={linea.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "2.8fr 0.65fr 0.65fr 1.05fr 1.05fr 28px",
                            gap: 8,
                            alignItems: "center",
                            padding: "6px 10px",
                            borderBottom: "1px solid var(--border, #f2f4f7)",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <input
                              value={linea.nombre}
                              onChange={(e) => editarLinea(linea.id, "nombre", e.target.value)}
                              style={{ ...SI, fontSize: 12, padding: "4px 7px", fontWeight: 600 }}
                            />
                            {linea.nota && (
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "var(--text-subtle, #667085)",
                                  marginTop: 2,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={linea.nota}
                              >
                                {linea.nota}
                              </div>
                            )}
                          </div>

                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={linea.cant}
                            onChange={(e) => editarLinea(linea.id, "cant", Math.max(0, parseFloat(e.target.value) || 0))}
                            style={{ ...SI, fontSize: 12, padding: "4px 6px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}
                          />

                          <input
                            value={linea.unidad}
                            onChange={(e) => editarLinea(linea.id, "unidad", e.target.value)}
                            style={{ ...SI, fontSize: 11.5, padding: "4px 6px", textAlign: "center" }}
                          />

                          <input
                            type="text"
                            inputMode="numeric"
                            value={Number(linea.costoUnitario) ? Number(linea.costoUnitario).toLocaleString("es-CO") : ""}
                            onChange={(e) => {
                              const dig = e.target.value.replace(/\D/g, "");
                              editarLinea(linea.id, "costoUnitario", dig ? parseInt(dig, 10) : 0);
                            }}
                            placeholder="0"
                            style={{ ...SI, fontSize: 12, padding: "4px 7px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                          />

                          <div
                            style={{
                              textAlign: "right",
                              fontSize: 12,
                              fontWeight: 700,
                              color: "var(--text-main, #101828)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {fmt(linea.subtotal)}
                          </div>

                          <button
                            type="button"
                            title="Quitar línea"
                            onClick={() => eliminarLinea(linea.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#98a2b3",
                              cursor: "pointer",
                              fontSize: 15,
                              padding: 0,
                              lineHeight: 1,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#d92d20"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "#98a2b3"; }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ fontSize: 10.5, color: "var(--text-subtle, #667085)", marginTop: 8, lineHeight: 1.45 }}>
            Confidencial solo para administradores: nunca aparece en el PDF ni en la vista previa del cliente. Al aprobar la cotización, la lista de materiales (sin precios) se carga automáticamente en la bodega de la obra.
          </div>
        </div>
      )}
    </div>
  );
}
