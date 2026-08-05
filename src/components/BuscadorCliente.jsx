import { useEffect, useRef, useState } from "react";
import LBL from "./ui/LBL";
import { SI } from "../styles/tokens";
import { normalizarRazonSocial } from "../lib/normalizarEntrada";

// Busca un cliente que ya exista y trae sus datos.
//
// Se hizo a mano en vez de usar el <datalist> del navegador: ese solo
// sugiere por el principio de la palabra, se ve distinto en cada navegador y
// no avisa cuando se elige una opcion. Aqui basta con escribir "TAX" para que
// aparezca "TAXINDIVIDUAL", y al tocarlo se rellena todo de una.

const sinTildes = (texto) =>
  String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

export default function BuscadorCliente({ label = "Empresa", valor, clientes, onEscribir, onElegir, ayuda }) {
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const caja = useRef(null);

  const busqueda = sinTildes(valor);
  // Coincide en cualquier parte del nombre: "COMERCIAL" encuentra "CENTRO
  // COMERCIAL SANDIEGO", que buscando solo por el principio se perderia.
  const encontrados = busqueda.length >= 2
    ? clientes.filter((c) => sinTildes(c.nombre).includes(busqueda)).slice(0, 8)
    : [];

  // Un clic fuera cierra la lista; si no, se queda flotando sobre el resto.
  useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (evento) => {
      if (!caja.current?.contains(evento.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", alTocarFuera);
    return () => document.removeEventListener("mousedown", alTocarFuera);
  }, [abierto]);

  const elegir = (cliente) => {
    onElegir(cliente);
    setAbierto(false);
  };

  const alTeclear = (evento) => {
    if (!abierto || !encontrados.length) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setResaltado((i) => (i + 1) % encontrados.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setResaltado((i) => (i - 1 + encontrados.length) % encontrados.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      elegir(encontrados[resaltado] || encontrados[0]);
    } else if (evento.key === "Escape") {
      setAbierto(false);
    }
  };

  return (
    <div ref={caja} style={{ position: "relative" }}>
      <LBL>{label}</LBL>
      <input
        value={valor ?? ""}
        onChange={(e) => {
          onEscribir(e.target.value);
          setAbierto(true);
          setResaltado(0);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => onEscribir(normalizarRazonSocial(valor))}
        onKeyDown={alTeclear}
        placeholder="Escribe y elige de la lista"
        autoCapitalize="characters"
        autoComplete="off"
        style={SI}
      />

      {abierto && encontrados.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30,
          background: "#fff", border: "1px solid #d9cdbb", borderRadius: 8,
          marginTop: 3, boxShadow: "0 8px 20px rgba(16,24,40,.12)",
          maxHeight: 260, overflowY: "auto",
        }}>
          {encontrados.map((c, i) => (
            <button
              key={c.nombre}
              type="button"
              // onMouseDown y no onClick: el clic quita el foco del campo
              // antes de llegar aqui, y la lista se cerraba sin elegir nada.
              onMouseDown={(e) => { e.preventDefault(); elegir(c); }}
              onMouseEnter={() => setResaltado(i)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 11px", border: "none", cursor: "pointer",
                background: i === resaltado ? "#f4eee4" : "#fff",
                borderBottom: i < encontrados.length - 1 ? "1px solid #f4eee4" : "none",
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#2b2622" }}>{c.nombre}</div>
              <div style={{ fontSize: 10.5, color: "#756a5e", marginTop: 1 }}>
                {[c.nit && `NIT ${c.nit}`, c.ciudad, c.contacto].filter(Boolean).join(" · ") || "sin datos guardados"}
              </div>
            </button>
          ))}
        </div>
      )}

      {ayuda && <div style={{ fontSize: 10.5, color: "#a2988a", marginTop: 3 }}>{ayuda}</div>}
    </div>
  );
}
