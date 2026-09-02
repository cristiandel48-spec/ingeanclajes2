import { useMemo, useState } from "react";
import { B, SI } from "../../styles/tokens";

export default function ModalUnificarCliente({ clienteOrigen, clientesDisponibles = [], onCerrar, onUnificar }) {
  const [busqueda, setBusqueda] = useState("");
  const [destinoId, setDestinoId] = useState("");

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clientesDisponibles
      .filter((c) => c.id !== clienteOrigen.id)
      .filter((c) => {
        if (!q) return true;
        const nombre = String(c.nombre || "").toLowerCase();
        const nit = String(c.nit || "").toLowerCase();
        const ciudad = String(c.ciudad || "").toLowerCase();
        return nombre.includes(q) || nit.includes(q) || ciudad.includes(q);
      })
      .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));
  }, [clientesDisponibles, clienteOrigen.id, busqueda]);

  const destinoSeleccionado = useMemo(() => {
    return clientesDisponibles.find((c) => c.id === destinoId) || null;
  }, [clientesDisponibles, destinoId]);

  const handleConfirmar = () => {
    if (!destinoSeleccionado) {
      window.alert("Por favor selecciona el cliente destino que conservará los datos.");
      return;
    }
    onUnificar(clienteOrigen, destinoSeleccionado);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onCerrar}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          maxWidth: 620,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
              🔄 Unificar clientes duplicados
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
              Transfiere obras, cotizaciones y certificados a una sola ficha oficial
            </p>
          </div>
          <button
            onClick={onCerrar}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "#94a3b8",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* Tarjeta de cliente a eliminar / fusionar */}
          <div
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 18,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#be123c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Ficha que se eliminará (Origen):
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#9f1239", marginBottom: 6 }}>
              {clienteOrigen.nombre}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#881337" }}>
              <span>🏗️ <strong>{clienteOrigen.obrasTotal || 0}</strong> obra(s)</span>
              <span>📄 <strong>{clienteOrigen.cotizacionesTotal || 0}</strong> cotización(es)</span>
              <span>📜 <strong>{clienteOrigen.certificacionesTotal || 0}</strong> certificación(es)</span>
            </div>
          </div>

          {/* Selector de cliente destino */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
              Selecciona el cliente oficial que se queda (Destino):
            </label>

            <input
              type="text"
              placeholder="🔍 Buscar cliente por nombre, NIT o ciudad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                ...SI,
                marginBottom: 8,
                fontSize: 12.5,
                borderColor: "#cbd5e1",
              }}
            />

            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                background: "#fff",
              }}
            >
              {listaFiltrada.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", fontSize: 12.5, color: "#94a3b8" }}>
                  No se encontraron clientes con «{busqueda}»
                </div>
              ) : (
                listaFiltrada.map((c) => {
                  const sel = c.id === destinoId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setDestinoId(c.id)}
                      style={{
                        padding: "10px 14px",
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        background: sel ? "#eff6ff" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: sel ? 700 : 600, color: sel ? "#1d4ed8" : "#1e293b" }}>
                          {c.nombre}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          {c.nit ? `NIT: ${c.nit}` : "Sin NIT"} {c.ciudad ? `· ${c.ciudad}` : ""} {c.telefono ? `· 📱 ${c.telefono}` : ""}
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="clienteDestino"
                        checked={sel}
                        onChange={() => setDestinoId(c.id)}
                        style={{ marginLeft: 10, cursor: "pointer" }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Resumen de la unificación */}
          {destinoSeleccionado && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 12,
                color: "#166534",
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 3 }}>
                ✓ Resultado de la unificación:
              </div>
              <div>
                Todos los documentos de <strong>«{clienteOrigen.nombre}»</strong> se transferirán automáticamente a <strong>«{destinoSeleccionado.nombre}»</strong>. Si «{destinoSeleccionado.nombre}» no tenía NIT o teléfono, se autocompletará con los datos de «{clienteOrigen.nombre}».
              </div>
            </div>
          )}
        </div>

        {/* Pie del modal con acciones */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            background: "#f8fafc",
          }}
        >
          <button
            onClick={onCerrar}
            style={{
              ...B("#f1f5f9", "#475569"),
              fontSize: 13,
              padding: "8px 16px",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!destinoSeleccionado}
            style={{
              ...B("#cc0000"),
              fontSize: 13,
              padding: "8px 20px",
              opacity: destinoSeleccionado ? 1 : 0.5,
              cursor: destinoSeleccionado ? "pointer" : "not-allowed",
              fontWeight: 700,
            }}
          >
            🔄 Unificar y transferir
          </button>
        </div>
      </div>
    </div>
  );
}
