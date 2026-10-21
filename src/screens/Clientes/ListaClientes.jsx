// Directorio de clientes, con el mismo estilo de la lista de cotizaciones:
// pestañas con conteo, buscador y orden fijos arriba al bajar, y una tabla con
// sus columnas. Antes usaba el listado comun de bordes naranja y tres botones
// de color por fila; se veia distinto al resto.
//
// Las pestañas separan los clientes con obras, los que estan en seguimiento y
// los inactivos. Al tocar una fila se edita la ficha; Unificar y Eliminar
// estan en el menu «···», que se usan poco y no deben distraer.
//
// AQUI NO VAN CIFRAS: este es el directorio -quien es el cliente y como se le
// ubica-. Lo facturado y lo que debe se consultan en Cuentas por cobrar y en
// el informe financiero, que es donde tienen contexto.
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { BarraFija, Button, CABECERA_FIJA, Icono, StatusPill } from "../../components/ui";

const ORDENES = [
  { key: "nombre",   label: "Nombre A–Z",    comparar: (a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es") },
  { key: "obras",    label: "Más obras",     comparar: (a, b) => (b.obrasTotal || 0) - (a.obrasTotal || 0) },
  { key: "reciente", label: "Más recientes", comparar: (a, b) => String(b.id || "").localeCompare(String(a.id || ""), "es", { numeric: true }) },
];

const PESTANAS = [
  { key: "todos",       label: "Todos",          cumple: () => true },
  { key: "conObras",    label: "Con obras",      cumple: (c) => (c.obrasTotal || 0) > 0 },
  { key: "seguimiento", label: "En seguimiento", cumple: (c) => c.estado === "En seguimiento" },
  { key: "inactivos",   label: "Inactivos",      cumple: (c) => c.estado === "Inactivo" },
];

const COLUMNAS = "minmax(220px, 2fr) 130px minmax(160px, 1.3fr) 170px 120px 110px";

export default function ListaClientes({ clientes = [], acciones = {} }) {
  const isMobile = useIsMobile();
  const [busqueda, setBusqueda] = useState("");
  const [pestana, setPestana] = useState("todos");
  const [orden, setOrden] = useState("nombre");
  const campoBusquedaRef = useRef(null);

  // Ctrl+K / Cmd+K lleva al buscador, como en las demas listas.
  useEffect(() => {
    const alPulsar = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        campoBusquedaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, []);

  const conteos = useMemo(
    () => Object.fromEntries(PESTANAS.map((p) => [p.key, clientes.filter(p.cumple).length])),
    [clientes]
  );

  const filtrados = useMemo(() => {
    const regla = PESTANAS.find((p) => p.key === pestana) || PESTANAS[0];
    const q = busqueda.trim().toLowerCase();
    const res = clientes.filter((c) => {
      if (!regla.cumple(c)) return false;
      if (!q) return true;
      return [c.nombre, c.nit, c.contacto, c.telefono, c.ciudad, c.email]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    const comparar = (ORDENES.find((o) => o.key === orden) || ORDENES[0]).comparar;
    return res.sort(comparar);
  }, [clientes, pestana, busqueda, orden]);

  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <BarraFija>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: 12,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "var(--surface-subtle, #f5f5f7)",
              padding: 3,
              borderRadius: 12,
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
              overflowX: "auto",
              maxWidth: "100%",
            }}
          >
            {PESTANAS.map((p) => (
              <BotonSegmentado
                key={p.key}
                activo={pestana === p.key}
                onClick={() => setPestana(p.key)}
                label={`${p.label} (${conteos[p.key]})`}
              />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "0 0 300px" }}>
              <span
                style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--text-tertiary)", pointerEvents: "none", display: "flex",
                }}
              >
                <Icono nombre="buscar" size={14} />
              </span>
              <input
                ref={campoBusquedaRef}
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, NIT, contacto o ciudad…"
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  borderRadius: 10,
                  border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
                  background: "var(--surface, #ffffff)",
                  color: "var(--text-primary)",
                  fontSize: 12.5,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              aria-label="Ordenar"
              style={{
                background: "var(--surface, #ffffff)",
                border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
                borderRadius: 10,
                padding: "7px 10px",
                fontSize: 12,
                color: "var(--text-primary)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {ORDENES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </BarraFija>

      {filtrados.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 20px",
            background: "var(--surface, #ffffff)",
            borderRadius: 16,
            border: "1px dashed var(--border, rgba(0,0,0,0.1))",
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
            {clientes.length ? "Ningún cliente coincide" : "No hay clientes registrados todavía"}
          </div>
          <p style={{ fontSize: 13, margin: "6px 0 0" }}>
            {clientes.length
              ? "Prueba con otra búsqueda u otra pestaña."
              : "Se van creando solos al hacer cotizaciones y obras, o puedes añadirlos con «Nuevo cliente»."}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            borderRadius: 16,
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            // Sin overflow: recortaria el menu «···» de las ultimas filas y
            // no dejaria pegar los titulos al bajar. Las esquinas de arriba
            // las redondea la cabecera.
          }}
        >
          {!isMobile && (
            <div
              style={{
                ...CABECERA_FIJA,
                borderRadius: "16px 16px 0 0",
                display: "grid",
                gridTemplateColumns: COLUMNAS,
                padding: "10px 16px",
                background: "var(--surface-subtle, #fbfbfd)",
                borderBottom: "1px solid var(--border, rgba(0,0,0,0.08))",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--text-tertiary)",
              }}
            >
              <span>Cliente</span>
              <span>NIT</span>
              <span>Contacto</span>
              <span>Documentos</span>
              <span>Estado</span>
              <span style={{ textAlign: "right" }}>Acciones</span>
            </div>
          )}
          {filtrados.map((c) => (
            <FilaCliente key={c.id} c={c} acciones={acciones} compacta={isMobile} />
          ))}
        </div>
      )}
    </div>
  );
}

function BotonSegmentado({ activo, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 13px",
        borderRadius: 9,
        fontSize: 12,
        fontWeight: activo ? 700 : 500,
        color: activo ? "var(--text-primary)" : "var(--text-secondary)",
        background: activo ? "var(--surface, #ffffff)" : "transparent",
        boxShadow: activo ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
        border: "none",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function FilaCliente({ c, acciones, compacta }) {
  const [encima, setEncima] = useState(false);
  const nombre = normalizarRazonSocial(c.nombre);
  const donde = [c.ciudad, c.direccion].filter(Boolean).join(" · ");
  const contacto = [c.contacto, c.telefono].filter(Boolean).join(" · ");
  const documentos = [
    c.obrasTotal ? `${c.obrasTotal} ${c.obrasTotal === 1 ? "obra" : "obras"}` : "",
    c.cotizacionesTotal ? `${c.cotizacionesTotal} cot` : "",
    c.certificacionesTotal ? `${c.certificacionesTotal} cert` : "",
  ].filter(Boolean).join(" · ");

  const texto2 = { fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  const accionesFila = (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2 }} onClick={(e) => e.stopPropagation()}>
      <Button variante="texto" tam="sm" onClick={() => acciones.editar?.(c)}>Editar</Button>
      <MenuMas
        opciones={[
          { label: "Unificar con…", title: "Pasar sus obras y documentos a otro cliente y borrar esta ficha", onClick: () => acciones.unificar?.(c) },
          { label: "Eliminar", peligro: true, onClick: () => acciones.eliminar?.(c) },
        ]}
      />
    </div>
  );

  return (
    <div
      onClick={() => acciones.editar?.(c)}
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      style={{
        display: compacta ? "flex" : "grid",
        gridTemplateColumns: compacta ? undefined : COLUMNAS,
        flexDirection: compacta ? "column" : undefined,
        gap: compacta ? 4 : 0,
        alignItems: compacta ? "stretch" : "center",
        padding: "11px 16px",
        borderBottom: "1px solid var(--border, rgba(0,0,0,0.06))",
        background: encima ? "var(--surface-subtle, #f5f5f7)" : "transparent",
        cursor: "pointer",
        fontSize: 12.5,
      }}
    >
      <div style={{ minWidth: 0, paddingRight: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {nombre}
        </div>
        {donde && <div style={{ ...texto2, fontSize: 11.5, marginTop: 1 }}>{donde}</div>}
      </div>
      {compacta ? (
        <>
          {(c.nit || contacto) && <div style={texto2}>{[c.nit, contacto].filter(Boolean).join(" · ")}</div>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <StatusPill estado={c.estado || "Activo"} />
              {documentos && <span style={texto2}>{documentos}</span>}
            </div>
            {accionesFila}
          </div>
        </>
      ) : (
        <>
          <span style={{ ...texto2, fontVariantNumeric: "tabular-nums" }}>{c.nit || "—"}</span>
          <span style={{ ...texto2, paddingRight: 10 }}>{contacto || "—"}</span>
          <span style={texto2}>{documentos || "—"}</span>
          <span><StatusPill estado={c.estado || "Activo"} /></span>
          {accionesFila}
        </>
      )}
    </div>
  );
}

// Menu chico para las acciones que se usan poco. Se cierra al tocar fuera o
// con Escape.
function MenuMas({ opciones }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alTocarFuera = (e) => { if (!ref.current?.contains(e.target)) setAbierto(false); };
    const alTeclear = (e) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Button
        variante="tertiary"
        tam="sm"
        soloIcono
        icono="puntos"
        aria-label="Más acciones"
        aria-expanded={abierto}
        style={{ color: "var(--text-secondary)" }}
        onClick={() => setAbierto((v) => !v)}
      />
      {abierto && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 30,
            minWidth: 150,
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, rgba(0,0,0,0.1))",
            borderRadius: 10,
            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.25)",
            padding: 4,
          }}
        >
          {opciones.map((o) => (
            <button
              key={o.label}
              type="button"
              role="menuitem"
              title={o.title}
              onClick={() => { setAbierto(false); o.onClick(); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 10px",
                border: "none",
                borderRadius: 7,
                background: "transparent",
                color: o.peligro ? "var(--danger-text, #b91c1c)" : "var(--text-primary)",
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle, #f5f5f7)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
