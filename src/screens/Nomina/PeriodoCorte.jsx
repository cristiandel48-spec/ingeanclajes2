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
  background: "#fbf8f3", border: "1px solid #e8edf4", borderRadius: 11,
  padding: "7px 12px", marginBottom: 14,
};

const etiqueta = {
  fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
  textTransform: "uppercase", color: "#a2988a",
};

const control = {
  background: "#fff", border: "1px solid #dbe4f0", borderRadius: 8,
  padding: "5px 8px", fontSize: 12, color: "#2b2622",
  fontFamily: "inherit", outline: "none", minHeight: 30,
};

export default function PeriodoCorte({
  mes, onMes, corte, onCorte, periodo, soloLectura = false,
}) {
  if (soloLectura) {
    return (
      <div style={{ ...barra, justifyContent: "flex-end" }}>
        <span style={etiqueta}>Cifras del corte</span>
        <strong style={{ fontSize: 12.5, color: "#2b2622" }}>{periodo.label}</strong>
        <span style={{ fontSize: 11, color: "#a2988a" }}>· {periodo.diasReferencia} días</span>
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
        style={{ ...control, width: 150 }}
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

      <span style={{ fontSize: 11.5, color: "#756a5e", marginLeft: "auto" }}>
        {periodo.label} · {periodo.diasReferencia} días
      </span>
    </div>
  );
}
