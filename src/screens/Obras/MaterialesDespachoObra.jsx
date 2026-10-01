import { useState } from "react";
import { generarDesgloseMateriales, generarRemisionDespachoHtml } from "../../lib/materialesObra";
import { CD, ST, SI } from "../../styles/tokens";

export default function MaterialesDespachoObra({
  obra,
  cotizacion,
  itemsCot = [],
  setObras,
  irAPantalla,
  bloqueada = false,
}) {
  // Inicializar o cargar desde la obra guardada
  const [datos, setDatos] = useState(() => {
    if (obra?.materialesDespacho?.entregables?.length || obra?.materialesDespacho?.insumos?.length) {
      return obra.materialesDespacho;
    }
    return generarDesgloseMateriales(itemsCot);
  });

  const [nuevoInsumo, setNuevoInsumo] = useState({
    nombre: "",
    cant: 1,
    unidad: "Und",
    categoria: "Consumibles y Herramientas",
  });
  const [mostrandoNuevo, setMostrandoNuevo] = useState(false);

  const guardarCambios = (nuevosDatos) => {
    setDatos(nuevosDatos);
    setObras((prev) =>
      prev.map((o) =>
        o.id === obra.id ? { ...o, materialesDespacho: nuevosDatos } : o
      )
    );
  };

  const cambiarEstadoEntregable = (id, nuevoEstado) => {
    if (bloqueada) return;
    const entregables = datos.entregables.map((e) =>
      e.id === id ? { ...e, estado: nuevoEstado } : e
    );
    guardarCambios({ ...datos, entregables });
  };

  const toggleVerificadoInsumo = (id) => {
    if (bloqueada) return;
    const insumos = datos.insumos.map((m) =>
      m.id === id
        ? {
            ...m,
            verificado: !m.verificado,
            estado: !m.verificado ? "Despachado a Obra" : "En Bodega",
          }
        : m
    );
    guardarCambios({ ...datos, insumos });
  };

  const cambiarEstadoInsumo = (id, nuevoEstado) => {
    if (bloqueada) return;
    const insumos = datos.insumos.map((m) =>
      m.id === id
        ? {
            ...m,
            estado: nuevoEstado,
            verificado: nuevoEstado === "Despachado a Obra" || nuevoEstado === "En Obra",
          }
        : m
    );
    guardarCambios({ ...datos, insumos });
  };

  const marcarTodoDespachado = () => {
    if (bloqueada) return;
    const entregables = datos.entregables.map((e) => ({
      ...e,
      estado: e.estado === "Pendiente" ? "Despachado" : e.estado,
    }));
    const insumos = datos.insumos.map((m) => ({
      ...m,
      verificado: true,
      estado: "Despachado a Obra",
    }));
    guardarCambios({ entregables, insumos });
  };

  const agregarInsumoPersonalizado = () => {
    if (!nuevoInsumo.nombre.trim()) return;
    const nuevo = {
      id: `custom-${Date.now()}`,
      ...nuevoInsumo,
      cant: Math.max(1, Number(nuevoInsumo.cant) || 1),
      estado: "En Bodega",
      verificado: false,
      esPersonalizado: true,
    };
    guardarCambios({
      ...datos,
      insumos: [...datos.insumos, nuevo],
    });
    setNuevoInsumo({
      nombre: "",
      cant: 1,
      unidad: "Und",
      categoria: "Consumibles y Herramientas",
    });
    setMostrandoNuevo(false);
  };

  const eliminarInsumo = (id) => {
    if (bloqueada) return;
    guardarCambios({
      ...datos,
      insumos: datos.insumos.filter((m) => m.id !== id),
    });
  };

  const imprimirRemision = () => {
    const html = generarRemisionDespachoHtml({
      obra,
      cotizacion,
      materialesDespacho: datos,
    });
    const ventana = window.open("", "_blank");
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
      ventana.focus();
      setTimeout(() => {
        ventana.print();
      }, 300);
    }
  };

  const totalInsumos = datos.insumos.length;
  const insumosDespachados = datos.insumos.filter((m) => m.verificado || m.estado === "Despachado a Obra" || m.estado === "En Obra").length;
  const pctDespacho = totalInsumos > 0 ? Math.round((insumosDespachados / totalInsumos) * 100) : 0;

  return (
    <div style={CD}>
      {/* Barra superior de control y métricas */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={ST}>📦 Materiales y Lista de Despacho (Bodega)</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted, #64748b)", marginTop: 2 }}>
            Control de insumos de ingeniería, postes, cables y fijaciones químicas calculados desde la cotización{" "}
            {cotizacion?.numero && <strong>{cotizacion.numero}</strong>}.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {!bloqueada && (
            <>
              <button
                type="button"
                onClick={marcarTodoDespachado}
                style={{
                  background: "var(--surface-subtle, #f2f4f7)",
                  color: "#166534",
                  border: "1px solid #bbf7d0",
                  borderRadius: 7,
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
                title="Marcar todos los insumos como listos y despachados a obra"
              >
                🚚 Despachar todo
              </button>
              <button
                type="button"
                onClick={() => setMostrandoNuevo(!mostrandoNuevo)}
                style={{
                  background: "#FFFAEB",
                  color: "#B54708",
                  border: "1px solid #FCD34D",
                  borderRadius: 7,
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                ➕ Añadir material
              </button>
            </>
          )}

          <button
            type="button"
            onClick={imprimirRemision}
            style={{
              background: "#0f172a",
              color: "#ffffff",
              border: "1px solid #0f172a",
              borderRadius: 7,
              fontSize: 11.5,
              fontWeight: 700,
              padding: "6px 14px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
            title="Imprimir remisión oficial de salida de almacén"
          >
            <span>🖨️</span>
            <span>Imprimir Remisión</span>
          </button>
        </div>
      </div>

      {/* Tarjeta resumen de avance de despacho */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--surface-subtle, #f8fafc)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 8,
          padding: "10px 16px",
          marginBottom: 16,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <span style={{ fontSize: 11, color: "var(--text-muted, #64748b)" }}>Alistamiento de Bodega:</span>
            <div style={{ fontSize: 14, fontWeight: 800, color: pctDespacho === 100 ? "#16a34a" : "#b45309" }}>
              {pctDespacho}% completado ({insumosDespachados} de {totalInsumos} insumos)
            </div>
          </div>
        </div>

        {cotizacion?.id && (
          <button
            type="button"
            onClick={() => irAPantalla("cotizacion", { cotizacionId: cotizacion.id })}
            style={{
              background: "#fff",
              color: "#b45309",
              border: "1px solid #fde68a",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Ver cotización {cotizacion.numero} ↗
          </button>
        )}
      </div>

      {/* Formulario rápido para añadir insumo manual */}
      {mostrandoNuevo && !bloqueada && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #fcd34d",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>
            Registrar material adicional no contemplado en cotización
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr auto", gap: 8, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 10.5, color: "#64748b" }}>Material o Insumo</label>
              <input
                value={nuevoInsumo.nombre}
                onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, nombre: e.target.value })}
                placeholder="Ej. Broca SDS 5/8, Sellador Loctite..."
                style={{ ...SI, padding: "5px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10.5, color: "#64748b" }}>Cantidad</label>
              <input
                type="number"
                min="1"
                value={nuevoInsumo.cant}
                onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, cant: e.target.value })}
                style={{ ...SI, padding: "5px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10.5, color: "#64748b" }}>Unidad</label>
              <input
                value={nuevoInsumo.unidad}
                onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, unidad: e.target.value })}
                placeholder="Und, ML..."
                style={{ ...SI, padding: "5px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10.5, color: "#64748b" }}>Categoría</label>
              <select
                value={nuevoInsumo.categoria}
                onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, categoria: e.target.value })}
                style={{ ...SI, padding: "5px 8px", fontSize: 12 }}
              >
                <option>Cables y Accesorios</option>
                <option>Estructuras y Postes</option>
                <option>Fijación y Anclajes</option>
                <option>Señalización y Placas</option>
                <option>Consumibles y Herramientas</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={agregarInsumoPersonalizado}
                style={{
                  background: "#b45309",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setMostrandoNuevo(false)}
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 1: ENTREGABLES Y SISTEMAS COTIZADOS */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main, #1e293b)", marginBottom: 8 }}>
          1. Sistemas a Instalar (Entregables Contratados)
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: "var(--surface-subtle, #f8fafc)", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "6px 10px", textAlign: "left", width: 50, color: "#64748b" }}>Cant.</th>
                <th style={{ padding: "6px 10px", textAlign: "left", width: 70, color: "#64748b" }}>Unidad</th>
                <th style={{ padding: "6px 10px", textAlign: "left", color: "#64748b" }}>Descripción del Sistema</th>
                <th style={{ padding: "6px 10px", textAlign: "left", width: 140, color: "#64748b" }}>Estado de Instalación</th>
              </tr>
            </thead>
            <tbody>
              {datos.entregables.map((ent) => (
                <tr key={ent.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#92400e" }}>{ent.cant}</td>
                  <td style={{ padding: "6px 10px", color: "#475569" }}>{ent.unidad}</td>
                  <td style={{ padding: "6px 10px", color: "var(--text-main, #1e293b)", fontWeight: 500 }}>
                    {ent.descripcion}
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <select
                      value={ent.estado}
                      disabled={bloqueada}
                      onChange={(e) => cambiarEstadoEntregable(ent.id, e.target.value)}
                      style={{
                        padding: "3px 6px",
                        fontSize: 11,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background:
                          ent.estado === "Instalado"
                            ? "#dcfce7"
                            : ent.estado === "Despachado"
                            ? "#f3e8ff"
                            : ent.estado === "En alistamiento"
                            ? "#e0f2fe"
                            : "#fef9c3",
                        color:
                          ent.estado === "Instalado"
                            ? "#15803d"
                            : ent.estado === "Despachado"
                            ? "#6b21a8"
                            : ent.estado === "En alistamiento"
                            ? "#0369a1"
                            : "#854d0e",
                        fontWeight: 600,
                      }}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En alistamiento">En alistamiento</option>
                      <option value="Despachado">Despachado</option>
                      <option value="Instalado">Instalado en obra</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 2: INSUMOS TÉCNICOS ESTIMADOS DE BODEGA */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main, #1e293b)", marginBottom: 8 }}>
          2. Insumos Técnicos y Salida de Bodega (Almacén)
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: "var(--surface-subtle, #f8fafc)", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "6px 10px", textAlign: "center", width: 40, color: "#64748b" }}>Desp.</th>
                <th style={{ padding: "6px 10px", textAlign: "left", width: 50, color: "#64748b" }}>Cant.</th>
                <th style={{ padding: "6px 10px", textAlign: "left", width: 65, color: "#64748b" }}>Unidad</th>
                <th style={{ padding: "6px 10px", textAlign: "left", width: 140, color: "#64748b" }}>Categoría</th>
                <th style={{ padding: "6px 10px", textAlign: "left", color: "#64748b" }}>Material / Insumo</th>
                <th style={{ padding: "6px 10px", textAlign: "left", width: 130, color: "#64748b" }}>Estado</th>
                {!bloqueada && <th style={{ padding: "6px 10px", width: 35 }}></th>}
              </tr>
            </thead>
            <tbody>
              {datos.insumos.map((m) => {
                const listo = m.verificado || m.estado === "Despachado a Obra" || m.estado === "En Obra";
                return (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: listo ? "rgba(240, 253, 244, 0.4)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(m.verificado)}
                        disabled={bloqueada}
                        onChange={() => toggleVerificadoInsumo(m.id)}
                        style={{ cursor: bloqueada ? "default" : "pointer" }}
                      />
                    </td>
                    <td style={{ padding: "6px 10px", fontWeight: 700, color: "#0f172a" }}>{m.cant}</td>
                    <td style={{ padding: "6px 10px", color: "#64748b" }}>{m.unidad}</td>
                    <td style={{ padding: "6px 10px", color: "#64748b", fontSize: 10.5 }}>{m.categoria}</td>
                    <td style={{ padding: "6px 10px", color: "var(--text-main, #1e293b)" }}>
                      <span style={{ fontWeight: 600 }}>{m.nombre}</span>
                      {m.esPersonalizado && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 9.5,
                            background: "#fef3c7",
                            color: "#92400e",
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          Manual
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      <select
                        value={m.estado || "En Bodega"}
                        disabled={bloqueada}
                        onChange={(e) => cambiarEstadoInsumo(m.id, e.target.value)}
                        style={{
                          padding: "3px 6px",
                          fontSize: 11,
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          background:
                            m.estado === "Despachado a Obra" || m.estado === "En Obra"
                              ? "#dcfce7"
                              : "#f8fafc",
                          color:
                            m.estado === "Despachado a Obra" || m.estado === "En Obra"
                              ? "#15803d"
                              : "#334155",
                          fontWeight: 600,
                        }}
                      >
                        <option value="En Bodega">En Bodega</option>
                        <option value="Despachado a Obra">Despachado a Obra</option>
                        <option value="En Obra">Recibido en Obra</option>
                      </select>
                    </td>
                    {!bloqueada && (
                      <td style={{ padding: "6px 10px", textAlign: "center" }}>
                        {m.esPersonalizado && (
                          <button
                            type="button"
                            onClick={() => eliminarInsumo(m.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              fontSize: 13,
                            }}
                            title="Eliminar insumo manual"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
