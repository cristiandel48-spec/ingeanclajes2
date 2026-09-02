import { useMemo, useState } from "react";
import LBL from "./ui/LBL";
import { SI } from "../styles/tokens";
import { DEPARTAMENTOS_COLOMBIA, parsearUbicacion } from "../data/colombiaUbicaciones";

export default function SelectorCiudadColombia({
  label = "Ciudad / Ubicación",
  valor = "",
  onChange,
  ayuda,
  wrapStyle,
}) {
  const parsed = useMemo(() => parsearUbicacion(valor), [valor]);
  const [forzarManual, setForzarManual] = useState(false);
  const [deptoSeleccionado, setDeptoSeleccionado] = useState(null);

  const depto = deptoSeleccionado || parsed.departamento || "Antioquia";
  const muni = parsed.municipio || "";
  const esManual = forzarManual || parsed.manual;

  const deptoActual = useMemo(() => {
    return DEPARTAMENTOS_COLOMBIA.find((d) => d.nombre === depto) || DEPARTAMENTOS_COLOMBIA[0];
  }, [depto]);

  const alCambiarDepto = (nuevoDepto) => {
    setDeptoSeleccionado(nuevoDepto);
    setForzarManual(false);
    const depObj = DEPARTAMENTOS_COLOMBIA.find((d) => d.nombre === nuevoDepto);
    const primerMuni = depObj?.municipios?.[0] || "";

    const deptoNorm = nuevoDepto.toUpperCase();
    const muniNorm = primerMuni.toUpperCase();
    const resultado = primerMuni ? `${muniNorm} - ${deptoNorm}` : deptoNorm;
    onChange(resultado);
  };

  const alCambiarMuni = (e) => {
    const val = e.target.value;
    if (val === "__MANUAL__") {
      setForzarManual(true);
      return;
    }
    setForzarManual(false);
    setDeptoSeleccionado(depto);

    const deptoNorm = depto.toUpperCase();
    const muniNorm = val.toUpperCase();
    const resultado = val ? `${muniNorm} - ${deptoNorm}` : "";
    onChange(resultado);
  };

  const alEscribirManual = (e) => {
    const val = e.target.value.toUpperCase();
    onChange(val);
  };

  return (
    <div style={{ ...wrapStyle, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <LBL>{label}</LBL>
        {esManual ? (
          <button
            type="button"
            onClick={() => {
              setForzarManual(false);
              const p = parsearUbicacion(valor);
              alCambiarDepto(p.departamento || "Antioquia");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#f47c20",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            ↺ Volver al selector
          </button>
        ) : null}
      </div>

      {esManual ? (
        <input
          type="text"
          value={valor || ""}
          onChange={alEscribirManual}
          placeholder="Ej: SABANETA - ANTIOQUIA"
          style={{ ...SI, fontSize: 13 }}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 8 }}>
          {/* Selector de Departamento */}
          <div>
            <select
              value={depto}
              onChange={(e) => alCambiarDepto(e.target.value)}
              style={{
                ...SI,
                fontSize: 12.5,
                background: "#f8fafc",
                borderColor: "#cbd5e1",
                cursor: "pointer",
              }}
              title="Departamento"
            >
              {DEPARTAMENTOS_COLOMBIA.map((d) => (
                <option key={d.nombre} value={d.nombre}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Municipio */}
          <div>
            <select
              value={muni}
              onChange={alCambiarMuni}
              style={{
                ...SI,
                fontSize: 12.5,
                fontWeight: 600,
                borderColor: muni ? "#f47c20" : "#cbd5e1",
                background: "#fff",
                cursor: "pointer",
              }}
              title="Municipio / Ciudad"
            >
              <option value="">— Elegir municipio —</option>
              {deptoActual.municipios.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="__MANUAL__">✏️ Escribir a mano…</option>
            </select>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <div style={{ fontSize: 10.5, color: "#94a3b8", lineHeight: 1.3 }}>
          {ayuda || (valor ? `Ubicación: ${valor}` : "Inicia en Antioquia. Selecciona el municipio y se completa solo.")}
        </div>
      </div>
    </div>
  );
}
