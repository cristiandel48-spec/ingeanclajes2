import { useEffect, useMemo, useRef, useState } from "react";
import { CAPA, ESPACIO, RADIO, TIPO } from "../styles/designTokens";

// Un campo para poner a UNA persona, con la lista del personal al lado.
//
// POR QUE NO EL <datalist> DEL NAVEGADOR: filtra las sugerencias por lo que ya
// hay escrito en el campo. En cuanto el acta trae un nombre -que es lo normal,
// porque sale de la ejecucion de la obra-, abrir la lista mostraba ese unico
// nombre y nada mas. Parecia que la lista estaba vacia o rota. Ademas la pinta
// cada navegador a su manera y en el telefono casi no se ve.
//
// Aqui la flecha abre SIEMPRE la lista completa, escribir en el campo la va
// filtrando, y quien estuvo en esta obra sale primero y marcado: casi siempre
// es a quien se busca. Se puede escribir un nombre que no este en la lista,
// que es lo que hacia falta para la gente que entra de refuerzo.

const sinTildes = (texto) =>
  String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function SelectorPersona({
  label,
  ayuda,
  obligatorio = false,
  value = "",
  onChange,
  onBlur,
  disabled = false,
  personas = [],
  placeholder = "",
}) {
  const [abierto, setAbierto] = useState(false);
  // Al abrir con la flecha se ve todo el personal; al escribir, solo lo que
  // coincide. Si filtrara siempre tendriamos el problema del <datalist>.
  const [filtrando, setFiltrando] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const caja = useRef(null);
  const campo = useRef(null);

  const visibles = useMemo(() => {
    const orden = [...personas].sort((a, b) => {
      if (a.enLaObra !== b.enLaObra) return a.enLaObra ? -1 : 1;
      return String(a.nombre || "").localeCompare(String(b.nombre || ""));
    });
    const q = sinTildes(value).trim();
    if (!filtrando || !q) return orden;
    return orden.filter((p) => sinTildes(p.nombre).includes(q) || sinTildes(p.cargo).includes(q));
  }, [personas, value, filtrando]);

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (ev) => {
      if (caja.current && !caja.current.contains(ev.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const elegir = (persona) => {
    onChange(persona.nombre);
    setAbierto(false);
    setFiltrando(false);
    campo.current?.focus();
  };

  const alTeclear = (ev) => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      if (!abierto) { setAbierto(true); setFiltrando(false); return; }
      const paso = ev.key === "ArrowDown" ? 1 : -1;
      setResaltado((i) => Math.max(0, Math.min(visibles.length - 1, i + paso)));
      return;
    }
    if (ev.key === "Enter" && abierto && visibles[resaltado]) {
      ev.preventDefault();
      elegir(visibles[resaltado]);
      return;
    }
    if (ev.key === "Escape" && abierto) {
      ev.preventDefault();
      setAbierto(false);
    }
  };

  const enLaObra = personas.filter((p) => p.enLaObra).length;

  return (
    <div className="ui-field" ref={caja} style={{ position: "relative" }}>
      {label && (
        <label className="ui-label" htmlFor={`sp-${label}`}>
          {label}
          {obligatorio && <span className="ui-label__req" aria-hidden="true">*</span>}
        </label>
      )}

      <div style={{ position: "relative" }}>
        <input
          id={`sp-${label}`}
          ref={campo}
          className="ui-input"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={abierto}
          aria-autocomplete="list"
          style={{ paddingRight: 38 }}
          onChange={(ev) => {
            onChange(ev.target.value);
            setFiltrando(true);
            setAbierto(true);
            setResaltado(0);
          }}
          onBlur={onBlur}
          onKeyDown={alTeclear}
        />
        {!disabled && personas.length > 0 && (
          <button
            type="button"
            aria-label={abierto ? "Cerrar la lista del personal" : "Ver todo el personal"}
            onClick={() => {
              setAbierto((v) => !v);
              setFiltrando(false);
              setResaltado(0);
            }}
            style={{
              position: "absolute", right: 1, top: 1, bottom: 1, width: 34,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: 0, cursor: "pointer",
              color: "var(--text-tertiary)", borderRadius: RADIO.control,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}

        {abierto && (
          <div
            role="listbox"
            style={{
              position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)",
              zIndex: CAPA.menu, maxHeight: 264, overflowY: "auto",
              background: "var(--surface)", border: "1px solid var(--separator)",
              borderRadius: RADIO.control, boxShadow: "var(--sombra-lg)", padding: ESPACIO.xs,
            }}
          >
            {visibles.length === 0 && (
              <div style={{ ...TIPO.callout, color: "var(--text-tertiary)", padding: "10px 12px" }}>
                Nadie del personal coincide. Puedes dejarlo escrito a mano.
              </div>
            )}
            {visibles.map((p, i) => {
              const activo = i === resaltado;
              const elegido = sinTildes(p.nombre) === sinTildes(value);
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={elegido}
                  onMouseEnter={() => setResaltado(i)}
                  onClick={() => elegir(p)}
                  style={{
                    display: "flex", alignItems: "center", gap: ESPACIO.sm, width: "100%",
                    textAlign: "left", padding: "7px 10px", border: 0, cursor: "pointer",
                    borderRadius: RADIO.chip, fontFamily: "inherit",
                    background: activo ? "var(--fill)" : "transparent",
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: "block", ...TIPO.footnote,
                      color: "var(--text-primary)", fontWeight: elegido ? 700 : 500,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {p.nombre}
                    </span>
                    {p.cargo && (
                      <span style={{ display: "block", ...TIPO.caption, color: "var(--text-tertiary)", fontWeight: 400, marginTop: 1 }}>
                        {p.cargo}
                      </span>
                    )}
                  </span>
                  {p.enLaObra && (
                    <span style={{
                      ...TIPO.caption, color: "var(--text-secondary)", background: "var(--fill)",
                      borderRadius: RADIO.pildora, padding: "2px 8px", flexShrink: 0, fontWeight: 500,
                    }}>
                      en esta obra
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {(ayuda || enLaObra > 0) && (
        <div className="ui-help">
          {ayuda || `${enLaObra} ${enLaObra === 1 ? "persona tuvo" : "personas tuvieron"} turno en esta obra.`}
        </div>
      )}
    </div>
  );
}
