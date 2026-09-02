import { useEffect, useRef, useState } from "react";
import LBL from "./ui/LBL";
import { SI } from "../styles/tokens";
import { normalizarRazonSocial } from "../lib/normalizarEntrada";

// Selector y buscador inteligente de clientes existentes.
//
// Permite desplegar la lista completa con un solo clic o con el botón ▾ para que
// no se creen clientes duplicados por variaciones de ortografía.
// También permite escribir para filtrar en tiempo real por nombre, NIT, contacto o ciudad.

const sinTildes = (texto) =>
  String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

export default function BuscadorCliente({ label = "Empresa", valor, clientes = [], onEscribir, onElegir, ayuda }) {
  const [abierto, setAbierto] = useState(false);
  const [forzarTodos, setForzarTodos] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const caja = useRef(null);
  const inputRef = useRef(null);

  const busqueda = sinTildes(valor).trim();
  const clienteSeleccionado = clientes.find((c) => sinTildes(c.nombre) === busqueda);

  // Filtro de clientes: muestra todos si está vacío, si se forzó con la flecha o si
  // coincide exactamente con el cliente ya seleccionado.
  const encontrados = (() => {
    if (forzarTodos || !busqueda || clienteSeleccionado) {
      return clientes;
    }
    return clientes.filter((c) => {
      const nom = sinTildes(c.nombre);
      const nit = sinTildes(c.nit);
      const con = sinTildes(c.contacto);
      const ciu = sinTildes(c.ciudad);
      return nom.includes(busqueda) || nit.includes(busqueda) || con.includes(busqueda) || ciu.includes(busqueda);
    });
  })();

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (evento) => {
      if (!caja.current?.contains(evento.target)) {
        setAbierto(false);
        setForzarTodos(false);
      }
    };
    document.addEventListener("mousedown", alTocarFuera);
    return () => document.removeEventListener("mousedown", alTocarFuera);
  }, [abierto]);

  const elegir = (cliente) => {
    onElegir(cliente);
    setAbierto(false);
    setForzarTodos(false);
  };

  const alDesenfocar = () => {
    const normalizado = normalizarRazonSocial(valor);
    onEscribir(normalizado);
    if (normalizado) {
      // Si el texto escrito coincide exactamente con un cliente existente, autoasociarlo
      const match = clientes.find((c) =>
        sinTildes(c.nombre) === sinTildes(normalizado) ||
        (c.nit && sinTildes(c.nit) === sinTildes(normalizado))
      );
      if (match) {
        onElegir(match);
      }
    }
  };

  const alTeclear = (evento) => {
    if (!abierto) {
      if (evento.key === "ArrowDown" || evento.key === "Enter") {
        setAbierto(true);
        setForzarTodos(true);
        return;
      }
    }
    if (!encontrados.length) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setResaltado((i) => (i + 1) % encontrados.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setResaltado((i) => (i - 1 + encontrados.length) % encontrados.length);
    } else if (evento.key === "Enter") {
      if (encontrados[resaltado]) {
        evento.preventDefault();
        elegir(encontrados[resaltado]);
      }
    } else if (evento.key === "Escape") {
      setAbierto(false);
      setForzarTodos(false);
    }
  };

  return (
    <div ref={caja} style={{ position: "relative" }}>
      <LBL>{label}</LBL>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          ref={inputRef}
          value={valor ?? ""}
          onChange={(e) => {
            onEscribir(e.target.value);
            setAbierto(true);
            setForzarTodos(false);
            setResaltado(0);
          }}
          onFocus={() => {
            setAbierto(true);
          }}
          onClick={() => {
            setAbierto(true);
          }}
          onBlur={alDesenfocar}
          onKeyDown={alTeclear}
          placeholder="Escribe o despliega la lista"
          autoCapitalize="characters"
          autoComplete="off"
          style={{
            ...SI,
            paddingRight: valor ? 60 : 38,
            borderColor: abierto ? "#f47c20" : undefined,
            boxShadow: abierto ? "0 0 0 3px rgba(244,124,32,0.12)" : undefined,
          }}
        />

        {/* Botón para limpiar campo */}
        {valor && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEscribir("");
              setForzarTodos(true);
              setAbierto(true);
              inputRef.current?.focus();
            }}
            title="Limpiar"
            style={{
              position: "absolute",
              right: 32,
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 16,
              padding: "4px 6px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}

        {/* Botón desplegable ▾ */}
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setForzarTodos(true);
            setAbierto((prev) => !prev);
            inputRef.current?.focus();
          }}
          title={abierto ? "Cerrar lista" : "Desplegar lista de clientes"}
          style={{
            position: "absolute",
            right: 8,
            background: abierto ? "#fff3e8" : "none",
            border: abierto ? "1px solid #fed7aa" : "1px solid transparent",
            borderRadius: 6,
            color: abierto ? "#f47c20" : "#64748b",
            cursor: "pointer",
            fontSize: 13,
            padding: "4px 7px",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all .15s ease",
          }}
        >
          {abierto ? "▲" : "▼"}
        </button>
      </div>

      {abierto && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10,
          marginTop: 4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)",
          maxHeight: 290, overflowY: "auto",
        }}>
          <div style={{
            padding: "7px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
            fontSize: 11.5, fontWeight: 700, color: "#475569", display: "flex",
            justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 2,
          }}>
            <span>
              {busqueda && !forzarTodos && !clienteSeleccionado
                ? `Resultados encontrados (${encontrados.length})`
                : `Clientes guardados (${clientes.length})`}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 500, color: "#94a3b8" }}>
              Toca para autocompletar
            </span>
          </div>

          {encontrados.length === 0 ? (
            <div style={{ padding: "14px 16px", background: "#fffaf0", color: "#92400e", fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: "#b54708", marginBottom: 4 }}>
                ⚠️ No hay ningún cliente registrado con "{valor}"
              </div>
              <div style={{ lineHeight: 1.4 }}>
                Al guardar se creará como un cliente nuevo. Para evitar duplicados, verifica si ya existe con otro nombre en el listado.
              </div>
            </div>
          ) : (
            encontrados.map((c, i) => {
              const esElSeleccionado = sinTildes(c.nombre) === busqueda;
              return (
                <button
                  key={c.id || c.nombre + i}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); elegir(c); }}
                  onMouseEnter={() => setResaltado(i)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    width: "100%", textAlign: "left", padding: "9px 12px", border: "none",
                    cursor: "pointer",
                    background: esElSeleccionado ? "#fff7ed" : i === resaltado ? "#f1f5f9" : "#fff",
                    borderBottom: i < encontrados.length - 1 ? "1px solid #f1f5f9" : "none",
                    borderLeft: esElSeleccionado ? "3px solid #f47c20" : i === resaltado ? "3px solid #cbd5e1" : "3px solid transparent",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: esElSeleccionado ? 700 : 600, color: esElSeleccionado ? "#b54708" : "#1a1a2e" }}>
                      {c.nombre}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {[c.nit && `NIT ${c.nit}`, c.ciudad, c.contacto].filter(Boolean).join(" · ") || "Sin datos guardados"}
                    </div>
                  </div>
                  {esElSeleccionado && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#c2410c", background: "#ffedd5", border: "1px solid #fed7aa", padding: "2px 7px", borderRadius: 999, flexShrink: 0 }}>
                      ✓ Elegido
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {ayuda && <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4 }}>{ayuda}</div>}
    </div>
  );
}

