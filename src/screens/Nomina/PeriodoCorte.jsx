// Selector del corte de nómina, en formato de barra fina.
//
// Antes era una tarjeta grande entre los pasos y el contenido: ocupaba media
// pantalla, quedaba flotando sin pertenecer a nada y repetía en tres casillas
// lo que cabe en una línea.
//
// En el paso de Empleados se muestra en modo solo lectura: ahí no se está
// preparando el corte, pero las tarjetas sí traen cifras del periodo ("días
// corte", "salario corte", "neto"), y sin decir de qué quincena son quedarían
// en el aire.

const barra = {
  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
  background: "#f8fafc", border: "1px solid #e8edf4", borderRadius: 11,
  padding: "7px 12px", marginBottom: 14,
};

const etiqueta = {
  fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
  textTransform: "uppercase", color: "#94a3b8",
};

const control = {
  background: "#fff", border: "1px solid #dbe4f0", borderRadius: 8,
  padding: "5px 8px", fontSize: 12, color: "#142840",
  fontFamily: "inherit", outline: "none", minHeight: 30,
};

export default function PeriodoCorte({
  mes, onMes, corte, onCorte, periodo, soloLectura = false,
  estaGenerada = false, modoEdicion = false, onGuardar = null, onEditar = null, onVerHistorial = null, totalHistorial = 0,
}) {
  if (soloLectura) {
    return (
      <div style={{ ...barra, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={etiqueta}>Cifras del corte</span>
          <strong style={{ fontSize: 12.5, color: "#142840" }}>{periodo.label}</strong>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>· {periodo.diasReferencia} días</span>
          {estaGenerada && (
            <span style={{
              background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0",
              borderRadius: 6, padding: "2px 7px", fontSize: 10.5, fontWeight: 700
            }}>
              ✓ Guardada
            </span>
          )}
        </div>
        {onVerHistorial && (
          <button
            type="button"
            onClick={onVerHistorial}
            style={{
              background: "#fff", color: "#334155", border: "1px solid #cbd5e1",
              borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer"
            }}
          >
            📜 Consultar historial de nóminas {totalHistorial > 0 ? `(${totalHistorial})` : ""}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={barra}>
      <span style={etiqueta}>Corte</span>

      <input
        type="month"
        value={mes}
        onChange={(e) => onMes(e.target.value)}
        style={{ ...control, width: 145 }}
        aria-label="Mes de nómina"
      />

      <select
        value={corte}
        onChange={(e) => onCorte(e.target.value)}
        style={control}
        aria-label="Quincena"
      >
        <option value="primera">1 al 15</option>
        <option value="segunda">{`16 al ${periodo.endIso.slice(-2)}`}</option>
      </select>

      {/* Estado del corte */}
      {estaGenerada && !modoEdicion && (
        <span style={{
          background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0",
          borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700,
          display: "inline-flex", alignItems: "center", gap: 4
        }}>
          ✓ Guardada
        </span>
      )}

      {modoEdicion && (
        <span style={{
          background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a",
          borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700,
          display: "inline-flex", alignItems: "center", gap: 4
        }}>
          ✏️ Editando corte
        </span>
      )}

      {!estaGenerada && !modoEdicion && (
        <span style={{
          background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0",
          borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600,
        }}>
          Borrador
        </span>
      )}

      {/* Botón rápido de Guardar nómina */}
      {(!estaGenerada || modoEdicion) && onGuardar && (
        <button
          type="button"
          onClick={onGuardar}
          style={{
            background: "#166534", color: "#4ade80", border: "1px solid #14532d",
            borderRadius: 7, padding: "4px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4
          }}
          title="Guardar y congelar la nómina de este corte"
        >
          💾 Guardar nómina
        </button>
      )}

      {/* Botón Editar nómina (si hubo equivocación) */}
      {estaGenerada && !modoEdicion && onEditar && (
        <button
          type="button"
          onClick={onEditar}
          style={{
            background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
            borderRadius: 7, padding: "4px 11px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4
          }}
          title="Si hubo un error, pulsa aquí para editar y corregir la nómina"
        >
          ✏️ Editar nómina
        </button>
      )}

      {/* Botón Consultar historial de nóminas */}
      {onVerHistorial && (
        <button
          type="button"
          onClick={onVerHistorial}
          style={{
            background: "#fff", color: "#1e293b", border: "1px solid #cbd5e1",
            borderRadius: 7, padding: "4px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 5
          }}
          title="Ver todos los cortes de nómina generados y archivados"
        >
          📜 Consultar historial {totalHistorial > 0 ? `(${totalHistorial})` : ""}
        </button>
      )}

      <span style={{ fontSize: 11.5, color: "#64748b", marginLeft: "auto" }}>
        {periodo.label} · {periodo.diasReferencia} días
      </span>
    </div>
  );
}
