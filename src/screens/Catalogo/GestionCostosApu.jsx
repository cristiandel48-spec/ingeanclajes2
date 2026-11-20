import { useMemo, useState } from "react";
import { CD, SI, ST } from "../../styles/tokens";
import { fmt } from "../../lib/format";
import { confirmar } from "../../lib/dialogos";
import {
  CATEGORIAS_INSUMO,
  INSUMOS_DEFAULT,
  MARGEN_MINIMO_DEFAULT,
  MODOS_RECETA,
  RECETAS_DEFAULT,
  buscarRecetaDeServicio,
  calcularCostoUnitarioServicio,
  calcularLineasDesdeRecetas,
  claveServicio,
  guardarConfigCostos,
  obtenerConfigCostos,
} from "../../lib/costosCotizacion";
import { filasDesdeSemilla, filasEditables } from "../../lib/catalogo";

const UNIDADES_INSUMO = ["Und", "ML", "Metro", "Kg", "M2", "Galón", "Kit", "Día", "Viaje", "Global"];

function slugInsumo(nombre = "") {
  const base = String(nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28);
  return `${base || "insumo"}_${Date.now().toString(36).slice(-4)}`;
}

/**
 * Pestaña 2 de Catálogo (solo administradores):
 * Administración de precios de compra de materiales, mano de obra y logística.
 */
export function VistaInsumosCostos({ empresaConfig, setEmpresaConfig, isMobile }) {
  const config = useMemo(() => obtenerConfigCostos(empresaConfig), [empresaConfig]);
  const [filtroCat, setFiltroCat] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const persistir = (patch) => {
    setEmpresaConfig((prev) => guardarConfigCostos(prev, { ...config, ...patch }));
  };

  const cambiarInsumo = (id, campo, valor) => {
    const siguientes = config.insumos.map((ins) =>
      ins.id === id ? { ...ins, [campo]: valor } : ins
    );
    persistir({ insumos: siguientes });
  };

  const agregarInsumo = () => {
    const cat = filtroCat === "todos" ? "material" : filtroCat;
    const nuevo = {
      id: slugInsumo("nuevo"),
      nombre: "Nuevo insumo",
      categoria: cat,
      unidad: cat === "mano_obra" ? "Día" : cat === "logistica" ? "Viaje" : "Und",
      costoUnitario: 0,
    };
    persistir({ insumos: [...config.insumos, nuevo] });
  };

  const eliminarInsumo = async (ins) => {
    if (
      !(await confirmar({
        titulo: "Eliminar insumo",
        mensaje: `¿Eliminar «${ins.nombre}» de la lista de costos de compra? También se quitará de cualquier receta que lo use.`,
        textoConfirmar: "Eliminar",
        destructivo: true,
      }))
    ) {
      return;
    }
    const siguientesInsumos = config.insumos.filter((i) => i.id !== ins.id);
    const siguientesRecetas = {};
    for (const [k, reglas] of Object.entries(config.recetas)) {
      siguientesRecetas[k] = reglas.filter((r) => r.insumoId !== ins.id);
    }
    persistir({ insumos: siguientesInsumos, recetas: siguientesRecetas });
  };

  const restaurarBase = async () => {
    if (
      !(await confirmar({
        titulo: "Restaurar insumos sugeridos",
        mensaje:
          "Se agregarán los insumos base que falten sin borrar los que ya creaste, y se restaurarán los precios de compra referenciales de los insumos base. ¿Continuar?",
        textoConfirmar: "Restaurar",
      }))
    ) {
      return;
    }
    const idsBase = new Set(INSUMOS_DEFAULT.map((i) => i.id));
    const propios = config.insumos.filter((i) => !idsBase.has(i.id));
    persistir({
      insumos: [...INSUMOS_DEFAULT.map((i) => ({ ...i })), ...propios],
      margenMinimoPct: MARGEN_MINIMO_DEFAULT,
    });
  };

  const q = busqueda.trim().toLowerCase();
  const visibles = config.insumos.filter((ins) => {
    if (filtroCat !== "todos" && ins.categoria !== filtroCat) return false;
    if (!q) return true;
    return ins.nombre.toLowerCase().includes(q) || ins.unidad.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Barra superior: margen mínimo y acciones */}
      <div
        style={{
          ...CD,
          marginBottom: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #101828)" }}>
            Costos internos de compra (COP)
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted, #667085)", marginTop: 2 }}>
            Actualiza aquí lo que te cuesta comprar cada metro de cable, punto de anclaje, cartucho epóxico, jornada de técnico/coordinador o viaje. Solo lo ven administradores.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-main, #101828)", fontWeight: 600 }}>
            <span>Alerta margen menor a:</span>
            <input
              type="number"
              min="5"
              max="80"
              value={config.margenMinimoPct}
              onChange={(e) => persistir({ margenMinimoPct: Math.max(5, Math.min(80, Number(e.target.value) || 25)) })}
              style={{ ...SI, width: 62, padding: "4px 6px", fontSize: 12, textAlign: "center" }}
            />
            <span>%</span>
          </label>

          {/* Lo que se lleva la empresa por existir: arriendo, administracion,
              impuestos, garantias. Se descuenta de la utilidad bruta de cada
              cotizacion. En 0 no se descuenta nada. */}
          <label
            title="Porcentaje del ingreso (sin IVA) que se va en gastos fijos de la empresa: arriendo, administración, impuestos, garantías. Se descuenta de la utilidad bruta de cada cotización."
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-main, #101828)", fontWeight: 600 }}
          >
            <span>Técnicos por cuadrilla:</span>
            <input
              type="number"
              min="1"
              max="10"
              title="Cuántos técnicos van juntos a una obra. Con ese dato se calculan los días en sitio, y un viaje y un kit de consumibles por cada día."
              value={config.tecnicosPorCuadrilla ?? 2}
              onChange={(e) => persistir({ tecnicosPorCuadrilla: Math.max(1, Math.min(10, Math.round(Number(e.target.value)) || 2)) })}
              style={{ ...SI, width: 54, padding: "4px 6px", fontSize: 12, textAlign: "center" }}
            />
            <span style={{ marginLeft: 8 }}>Gastos indirectos:</span>
            <input
              type="number"
              min="0"
              max="60"
              value={config.indirectosPct ?? 0}
              onChange={(e) => persistir({ indirectosPct: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })}
              style={{ ...SI, width: 62, padding: "4px 6px", fontSize: 12, textAlign: "center" }}
            />
            <span>%</span>
          </label>

          <button
            type="button"
            onClick={restaurarBase}
            style={{
              background: "var(--surface-subtle, #f2f4f7)",
              color: "var(--text-muted, #475467)",
              border: "1px solid var(--border, #d0d5dd)",
              borderRadius: 8,
              padding: "6px 11px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Restaurar sugeridos
          </button>

          <button
            type="button"
            onClick={agregarInsumo}
            style={{
              background: "#101828",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "7px 13px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Nuevo insumo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={CD}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "todos", label: `Todos (${config.insumos.length})` },
              ...CATEGORIAS_INSUMO.map((c) => ({
                id: c.id,
                label: `${c.corto} (${config.insumos.filter((i) => i.categoria === c.id).length})`,
              })),
            ].map((op) => {
              const activo = filtroCat === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setFiltroCat(op.id)}
                  style={{
                    background: activo ? "#101828" : "var(--surface-subtle, #f2f4f7)",
                    color: activo ? "#ffffff" : "var(--text-muted, #475467)",
                    border: "1px solid " + (activo ? "#101828" : "var(--border, #e2e8f0)"),
                    borderRadius: 999,
                    padding: "5px 12px",
                    fontSize: 11.5,
                    fontWeight: activo ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {op.label}
                </button>
              );
            })}
          </div>

          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cable, anclaje, técnico…"
            style={{ ...SI, width: isMobile ? "100%" : 240, fontSize: 12, padding: "6px 10px" }}
          />
        </div>

        <div style={{ overflowX: "auto", width: "100%" }}>
          <div style={{ minWidth: 660 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2.6fr 1.2fr .8fr 1.15fr 36px",
                gap: 8,
                padding: "8px 10px",
                background: "var(--surface-subtle, #f5f5f7)",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "var(--text-muted, #667085)",
                textTransform: "uppercase",
              }}
            >
              <span>Insumo / Mano de obra / Gasto</span>
              <span>Rubro</span>
              <span>Unidad</span>
              <span style={{ textAlign: "right" }}>Tu costo compra (COP)</span>
              <span />
            </div>

            {visibles.map((ins) => (
              <div
                key={ins.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2.6fr 1.2fr .8fr 1.15fr 36px",
                  gap: 8,
                  padding: "7px 10px",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border, rgba(0, 0, 0, 0.06))",
                }}
              >
                <input
                  value={ins.nombre}
                  onChange={(e) => cambiarInsumo(ins.id, "nombre", e.target.value)}
                  style={{ ...SI, fontSize: 12, padding: "5px 8px", fontWeight: 600 }}
                />

                <select
                  value={ins.categoria}
                  onChange={(e) => cambiarInsumo(ins.id, "categoria", e.target.value)}
                  style={{ ...SI, fontSize: 12, padding: "5px 6px" }}
                >
                  {CATEGORIAS_INSUMO.map((c) => (
                    <option key={c.id} value={c.id}>{c.corto}</option>
                  ))}
                </select>

                <select
                  value={ins.unidad}
                  onChange={(e) => cambiarInsumo(ins.id, "unidad", e.target.value)}
                  style={{ ...SI, fontSize: 12, padding: "5px 6px" }}
                >
                  {[...new Set([...UNIDADES_INSUMO, ins.unidad].filter(Boolean))].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={Number(ins.costoUnitario) ? Number(ins.costoUnitario).toLocaleString("es-CO") : ""}
                    onChange={(e) => {
                      const dig = e.target.value.replace(/\D/g, "");
                      cambiarInsumo(ins.id, "costoUnitario", dig ? parseInt(dig, 10) : 0);
                    }}
                    placeholder="0"
                    style={{
                      ...SI,
                      fontSize: 12,
                      padding: "5px 8px",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 600,
                    }}
                  />
                  <div style={{ fontSize: 10.5, color: "var(--text-muted, #667085)", textAlign: "right", marginTop: 1 }}>
                    {fmt(ins.costoUnitario)}
                  </div>
                </div>

                <button
                  type="button"
                  title="Eliminar insumo"
                  onClick={() => eliminarInsumo(ins)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#98a2b3",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#d92d20"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#98a2b3"; }}
                >
                  ×
                </button>
              </div>
            ))}

            {visibles.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--text-muted, #667085)" }}>
                No hay insumos que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Pestaña 3 de Catálogo (solo administradores):
 * Editor de Recetas (APU) por servicio del catálogo + simulador en vivo.
 */
export function VistaRecetasApu({ catalogoItems, empresaConfig, setEmpresaConfig, isMobile }) {
  const config = useMemo(() => obtenerConfigCostos(empresaConfig), [empresaConfig]);

  const servicios = useMemo(() => {
    const reales = filasEditables(catalogoItems);
    const fuente = reales.length > 0 ? reales : filasDesdeSemilla();
    return fuente.filter((s) => String(s?.descripcion || "").trim());
  }, [catalogoItems]);

  const [claveActiva, setClaveActiva] = useState(() =>
    servicios[0] ? claveServicio(servicios[0].descripcion) : Object.keys(RECETAS_DEFAULT)[0] || ""
  );
  const [cantSimulacion, setCantSimulacion] = useState(10);

  const servicioActivo = useMemo(
    () => servicios.find((s) => claveServicio(s.descripcion) === claveActiva) || servicios[0] || null,
    [servicios, claveActiva]
  );

  const claveServicioActual = servicioActivo ? claveServicio(servicioActivo.descripcion) : claveActiva;

  // Reglas exactas guardadas para este servicio (o match por alias si aún no se personalizó)
  const matchActual = useMemo(() => {
    if (!claveServicioActual) return null;
    if (Array.isArray(config.recetas[claveServicioActual])) {
      return { clave: claveServicioActual, reglas: config.recetas[claveServicioActual], exacta: true };
    }
    const alias = buscarRecetaDeServicio(servicioActivo?.descripcion || claveServicioActual, config.recetas);
    return alias ? { ...alias, exacta: false } : { clave: claveServicioActual, reglas: [], exacta: true };
  }, [claveServicioActual, config.recetas, servicioActivo]);

  const reglas = useMemo(() => matchActual?.reglas || [], [matchActual]);

  const guardarReglasServicio = (nuevasReglas) => {
    if (!claveServicioActual) return;
    const siguientesRecetas = {
      ...config.recetas,
      [claveServicioActual]: nuevasReglas,
    };
    setEmpresaConfig((prev) => guardarConfigCostos(prev, { ...config, recetas: siguientesRecetas }));
  };

  const cambiarRegla = (idx, campo, valor) => {
    const siguientes = reglas.map((r, i) => (i === idx ? { ...r, [campo]: valor } : r));
    guardarReglasServicio(siguientes);
  };

  const agregarRegla = () => {
    const primerInsumo = config.insumos[0]?.id || "cable_acero_516";
    guardarReglasServicio([...reglas, { insumoId: primerInsumo, modo: "por_unidad", valor: 1 }]);
  };

  const eliminarRegla = (idx) => {
    guardarReglasServicio(reglas.filter((_, i) => i !== idx));
  };

  const restaurarRecetasBase = async () => {
    if (
      !(await confirmar({
        titulo: "Restaurar recetas (APU) sugeridas",
        mensaje: "Se volverán a cargar las recetas técnicas por defecto para todos los servicios estándar. ¿Continuar?",
        textoConfirmar: "Restaurar",
      }))
    ) {
      return;
    }
    setEmpresaConfig((prev) =>
      guardarConfigCostos(prev, {
        ...config,
        recetas: { ...config.recetas, ...RECETAS_DEFAULT },
      })
    );
  };

  const mapaInsumos = useMemo(
    () => new Map(config.insumos.map((ins) => [ins.id, ins])),
    [config.insumos]
  );

  // Simulación rápida con la cantidad que escriba el admin
  const simulacion = useMemo(() => {
    if (!servicioActivo) return null;
    const c = Math.max(1, Number(cantSimulacion) || 1);
    const configSim = {
      ...config,
      recetas: {
        ...config.recetas,
        [claveServicioActual]: reglas,
      },
    };
    const { lineas } = calcularLineasDesdeRecetas(
      [{ desc: servicioActivo.descripcion, cant: c, unit: servicioActivo.unidad, vu: servicioActivo.precioBase }],
      configSim
    );
    const costoTotal = lineas.reduce((s, l) => s + l.subtotal, 0);
    const ventaTotal = Math.round(c * (Number(servicioActivo.precioBase) || 0));
    const ganancia = ventaTotal - costoTotal;
    const margen = ventaTotal > 0 ? Number(((ganancia / ventaTotal) * 100).toFixed(1)) : null;
    return { cant: c, lineas, costoTotal, ventaTotal, ganancia, margen };
  }, [servicioActivo, cantSimulacion, config, claveServicioActual, reglas]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "320px minmax(0, 1fr)",
        gap: 14,
        alignItems: "start",
      }}
    >
      {/* Lista de servicios del catálogo */}
      <div style={{ ...CD, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main, #101828)" }}>
            Servicios ({servicios.length})
          </span>
          <button
            type="button"
            onClick={restaurarRecetasBase}
            style={{
              background: "transparent",
              border: "none",
              color: "#1D4ED8",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Restaurar base
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: isMobile ? 260 : 620, overflowY: "auto" }}>
          {servicios.map((srv) => {
            const k = claveServicio(srv.descripcion);
            const activo = k === claveServicioActual;
            const resumen = calcularCostoUnitarioServicio(srv, config);
            return (
              <button
                key={srv.id || k}
                type="button"
                onClick={() => {
                  setClaveActiva(k);
                  const u = String(srv.unidad || "").toLowerCase();
                  setCantSimulacion(u === "ml" || u === "metro" ? 20 : u === "kg" ? 100 : 4);
                }}
                style={{
                  textAlign: "left",
                  padding: "9px 10px",
                  borderRadius: 9,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: activo ? "#101828" : "var(--surface-subtle, #f8fafc)",
                  color: activo ? "#ffffff" : "var(--text-main, #101828)",
                  border: "1px solid " + (activo ? "#101828" : "var(--border, #e2e8f0)"),
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.35 }}>
                  {srv.descripcion}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 4,
                    fontSize: 10.5,
                    opacity: activo ? 0.9 : 0.8,
                  }}
                >
                  <span>
                    {srv.unidad} · Venta {fmt(srv.precioBase || 0)}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: activo
                        ? "#86efac"
                        : resumen.tieneReceta
                        ? "#027A48"
                        : "#B54708",
                    }}
                  >
                    {resumen.tieneReceta
                      ? resumen.margenPct != null
                        ? `${resumen.margenPct}%`
                        : "Con APU"
                      : "Sin APU"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor de la receta del servicio seleccionado */}
      <div style={CD}>
        {!servicioActivo ? (
          <div style={{ fontSize: 13, color: "var(--text-muted, #667085)" }}>
            Selecciona un servicio a la izquierda para editar su receta (APU).
          </div>
        ) : (
          <>
            <div style={{ ...ST, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-main, #101828)" }}>
                  {servicioActivo.descripcion}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 400, color: "var(--text-muted, #667085)", marginTop: 2 }}>
                  Unidad: <strong>{servicioActivo.unidad}</strong> · Precio venta catálogo: <strong>{fmt(servicioActivo.precioBase || 0)}</strong>
                  {!matchActual?.exacta && " · (Usando receta equivalente; al editar se guarda propia para este servicio)"}
                </div>
              </div>
              <button
                type="button"
                onClick={agregarRegla}
                style={{
                  background: "#101828",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Agregar insumo
              </button>
            </div>

            {/* Tabla de ingredientes de la receta */}
            {reglas.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  border: "1px dashed var(--border, #cbd5e1)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--text-muted, #667085)",
                  marginBottom: 14,
                }}
              >
                Este servicio todavía no tiene receta (APU). Pulsa «+ Agregar insumo» para definir qué materiales, mano de obra y transporte requiere automáticamente.
              </div>
            ) : (
              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <div style={{ minWidth: 600 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2.2fr 1.35fr .75fr 1fr 30px",
                      gap: 8,
                      padding: "7px 8px",
                      background: "var(--surface-subtle, #f5f5f7)",
                      borderRadius: 8,
                      fontSize: 10.5,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--text-muted, #667085)",
                    }}
                  >
                    <span>Insumo / Mano de obra</span>
                    <span>Cómo se calcula</span>
                    <span style={{ textAlign: "center" }}>Cant. / N</span>
                    <span style={{ textAlign: "right" }}>Costo unit.</span>
                    <span />
                  </div>

                  {reglas.map((regla, idx) => {
                    const ins = mapaInsumos.get(regla.insumoId);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2.2fr 1.35fr .75fr 1fr 30px",
                          gap: 8,
                          padding: "7px 8px",
                          alignItems: "center",
                          borderBottom: "1px solid var(--border, #f2f4f7)",
                        }}
                      >
                        <select
                          value={regla.insumoId}
                          onChange={(e) => cambiarRegla(idx, "insumoId", e.target.value)}
                          style={{ ...SI, fontSize: 12, padding: "5px 6px" }}
                        >
                          {CATEGORIAS_INSUMO.map((cat) => (
                            <optgroup key={cat.id} label={cat.label}>
                              {config.insumos
                                .filter((i) => i.categoria === cat.id)
                                .map((i) => (
                                  <option key={i.id} value={i.id}>
                                    {i.nombre} ({i.unidad})
                                  </option>
                                ))}
                            </optgroup>
                          ))}
                        </select>

                        <select
                          value={regla.modo}
                          onChange={(e) => cambiarRegla(idx, "modo", e.target.value)}
                          style={{ ...SI, fontSize: 11.5, padding: "5px 6px" }}
                        >
                          {MODOS_RECETA.map((m) => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </select>

                        <div>
                          <input
                            type="number"
                            min="0.05"
                            step="0.05"
                            value={regla.valor}
                            onChange={(e) => cambiarRegla(idx, "valor", Math.max(0, Number(e.target.value) || 0))}
                            style={{ ...SI, fontSize: 12, padding: "5px 6px", textAlign: "center" }}
                          />
                          <div style={{ fontSize: 10, color: "var(--text-subtle, #667085)", textAlign: "center", marginTop: 1 }}>
                            {regla.modo === "fijo"
                              ? `Fijo`
                              : regla.modo === "cada_n"
                              ? `1 cada ${regla.valor}`
                              : `× ${servicioActivo.unidad}`}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {ins ? `${fmt(ins.costoUnitario)} / ${ins.unidad}` : "—"}
                        </div>

                        <button
                          type="button"
                          title="Quitar de la receta"
                          onClick={() => eliminarRegla(idx)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#98a2b3",
                            cursor: "pointer",
                            fontSize: 16,
                            padding: 0,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Simulador rápido en vivo */}
            {simulacion && (
              <div
                style={{
                  background: "var(--surface-subtle, #f8fafc)",
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "var(--text-main, #101828)" }}>
                    <span>Simular cotización de:</span>
                    <input
                      type="number"
                      min="1"
                      value={cantSimulacion}
                      onChange={(e) => setCantSimulacion(Math.max(1, Number(e.target.value) || 1))}
                      style={{ ...SI, width: 70, padding: "4px 6px", fontSize: 12, textAlign: "center" }}
                    />
                    <span>{servicioActivo.unidad}</span>
                  </div>

                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                    <span>Venta: <strong>{fmt(simulacion.ventaTotal)}</strong></span>
                    <span>Tu costo: <strong>{fmt(simulacion.costoTotal)}</strong></span>
                    <span style={{ color: simulacion.ganancia >= 0 ? "#027A48" : "#B42318", fontWeight: 700 }}>
                      Ganancia: {fmt(simulacion.ganancia)}
                      {simulacion.margen != null ? ` (${simulacion.margen}%)` : ""}
                    </span>
                  </div>
                </div>

                {simulacion.lineas.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {simulacion.lineas.map((l) => (
                      <span
                        key={l.id}
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "var(--surface, #ffffff)",
                          border: "1px solid var(--border, #e2e8f0)",
                          color: "var(--text-main, #344054)",
                        }}
                      >
                        <strong>{l.cant} {l.unidad}</strong> {l.nombre} · {fmt(l.subtotal)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
