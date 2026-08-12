// Listado de obras con buscador, filtros, orden y dos vistas.
//
// Sale de un componente que trajo Cristian (ObrasSection.jsx). Se conserva su
// estructura -buscador, pestañas de estado, panel de filtros, ordenamiento,
// cuadricula o lista, resumen de resultados y estado vacio- y se le cambian
// tres cosas para que encaje aqui:
//
//   1. LOS COLORES son los de la aplicacion (naranja y rojo), no el azul que
//      traia. El cliente ya pidio una vez volver a sus colores, asi que meter
//      un azul nuevo solo en esta pantalla desentonaria con el resto.
//   2. LA TIPOGRAFIA es la de la aplicacion. El original pedia cargar dos
//      fuentes de Google, que es una descarga mas y cambiaria el aspecto solo
//      de esta pantalla.
//   3. LA TARJETA conserva lo que ya se podia hacer desde aqui: mover el
//      avance con la barra, cambiar el estado y ver cuanta gente y cuantas
//      fotos hay. Eso no estaba en el componente nuevo y quitarlo habria sido
//      perder trabajo que ya funcionaba.
//
// El filtro por "responsable" del original no se puede hacer: las obras no
// guardan un responsable. En su lugar hay uno por registro de avance, que
// responde a algo que si se pregunta a diario: que obras van a dar un informe
// vacio porque nadie subio fotos.
import { useEffect, useMemo, useRef, useState } from "react";
import Badge from "../../components/ui/Badge";
import { CD, SI } from "../../styles/tokens";
import { ESTADOS_OBRA } from "../../lib/flujoObra";
import { resumenBitacora } from "../../lib/bitacoraObra";
import { fmtD } from "../../lib/format";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

const C = {
  borde: "#eef0f3",
  bordeFuerte: "#e2e8f0",
  tinta: "#1a1a2e",
  suave: "#475569",
  apagado: "#64748b",
  tenue: "#94a3b8",
  relleno: "#f8fafc",
  rellenoFuerte: "#eef0f3",
  acento: "#f47c20",
  acentoFuerte: "#cc0000",
  acentoSuave: "#fff3e8",
};

const AVANCE = [
  { key: "sin",   label: "Sin iniciar (0%)", test: (v) => v === 0 },
  { key: "bajo",  label: "1–49%",            test: (v) => v > 0 && v < 50 },
  { key: "medio", label: "50–99%",           test: (v) => v >= 50 && v < 100 },
  { key: "full",  label: "Terminadas",       test: (v) => v === 100 },
];

const FECHAS = [
  { key: "7d",  label: "Últimos 7 días",  dias: 7 },
  { key: "30d", label: "Últimos 30 días", dias: 30 },
  { key: "90d", label: "Este trimestre",  dias: 90 },
];

const REGISTRO = [
  { key: "con", label: "Con fotos de avance" },
  { key: "sin", label: "Sin fotos de avance" },
];

const ORDENES = [
  { key: "recientes",   label: "Más recientes" },
  { key: "antiguas",    label: "Más antiguas" },
  { key: "avance-desc", label: "Mayor avance" },
  { key: "avance-asc",  label: "Menor avance" },
  { key: "nombre",      label: "Cliente A–Z" },
];

const enMilis = (fecha) => {
  const t = new Date(fecha || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** Botón que se ilumina al pasar por encima, sin necesitar hoja de estilos. */
function Resaltable({ as = "div", estiloHover, style, children, ...resto }) {
  const [encima, setEncima] = useState(false);
  const Etiqueta = as;
  return (
    <Etiqueta
      {...resto}
      onMouseEnter={(e) => { setEncima(true); resto.onMouseEnter && resto.onMouseEnter(e); }}
      onMouseLeave={(e) => { setEncima(false); resto.onMouseLeave && resto.onMouseLeave(e); }}
      style={{ ...style, ...(encima ? estiloHover : null) }}
    >
      {children}
    </Etiqueta>
  );
}

export default function ListaObras({ obras, cotizaciones, onAbrir, onCambiarAvance, onCambiarEstado }) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("Todas");
  const [avance, setAvance] = useState(null);
  const [fecha, setFecha] = useState(null);
  const [registro, setRegistro] = useState(null);
  const [orden, setOrden] = useState("recientes");
  const [vista, setVista] = useState("cuadricula");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const campoBusqueda = useRef(null);
  // La hora se toma UNA vez, al abrir la pantalla. Leerla dentro del calculo
  // hace que el resultado cambie solo, sin que nadie haya tocado nada.
  const [ahora] = useState(() => Date.now());

  // Ctrl+K lleva al buscador, como en el resto de programas.
  useEffect(() => {
    const alPulsar = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        campoBusqueda.current?.focus();
      }
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, []);

  // Las fotos de avance se cuentan una vez por obra y no en cada filtro.
  const fotosPorObra = useMemo(() => {
    const mapa = new Map();
    (obras || []).forEach((o) => mapa.set(o.id, resumenBitacora(o.bitacora)));
    return mapa;
  }, [obras]);

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const desdeMilis = fecha ? ahora - FECHAS.find((f) => f.key === fecha).dias * 864e5 : null;

    const filtradas = (obras || []).filter((o) => {
      if (texto) {
        const donde = [o.cliente, o.id, o.proyecto, o.ciudad, o.direccion, o.cotizacionId]
          .filter(Boolean).join(" ").toLowerCase();
        if (!donde.includes(texto)) return false;
      }
      if (estado !== "Todas" && o.estado !== estado) return false;
      if (avance) {
        const tramo = AVANCE.find((a) => a.key === avance);
        if (tramo && !tramo.test(Number(o.avance) || 0)) return false;
      }
      if (desdeMilis !== null && enMilis(o.fechaInicio) < desdeMilis) return false;
      if (registro) {
        const tieneFotos = (fotosPorObra.get(o.id)?.fotos || 0) > 0;
        if (registro === "con" && !tieneFotos) return false;
        if (registro === "sin" && tieneFotos) return false;
      }
      return true;
    });

    const criterio = {
      recientes: (a, b) => enMilis(b.fechaInicio) - enMilis(a.fechaInicio) || String(b.id).localeCompare(String(a.id)),
      antiguas: (a, b) => enMilis(a.fechaInicio) - enMilis(b.fechaInicio),
      "avance-desc": (a, b) => (b.avance || 0) - (a.avance || 0),
      "avance-asc": (a, b) => (a.avance || 0) - (b.avance || 0),
      nombre: (a, b) => String(a.cliente || "").localeCompare(String(b.cliente || ""), "es"),
    };
    return [...filtradas].sort(criterio[orden]);
  }, [obras, busqueda, estado, avance, fecha, registro, orden, fotosPorObra, ahora]);

  const filtrosPuestos = [avance, fecha, registro].filter(Boolean).length + (estado !== "Todas" ? 1 : 0);

  const etiquetas = [];
  if (estado !== "Todas") etiquetas.push({ label: `Estado: ${estado}`, quitar: () => setEstado("Todas") });
  if (avance) etiquetas.push({ label: AVANCE.find((a) => a.key === avance).label, quitar: () => setAvance(null) });
  if (fecha) etiquetas.push({ label: FECHAS.find((f) => f.key === fecha).label, quitar: () => setFecha(null) });
  if (registro) etiquetas.push({ label: REGISTRO.find((r) => r.key === registro).label, quitar: () => setRegistro(null) });

  const limpiarTodo = () => { setBusqueda(""); setEstado("Todas"); setAvance(null); setFecha(null); setRegistro(null); };

  const promedio = lista.length
    ? Math.round(lista.reduce((t, o) => t + (Number(o.avance) || 0), 0) / lista.length)
    : 0;
  const cuantasCon = (e) => (obras || []).filter((o) => e === "Todas" || o.estado === e).length;

  return (
    <div style={{ ...CD, padding: 0, overflow: "hidden" }}>
      {/* ── buscador y controles ── */}
      <div style={{ padding: "16px 18px 14px", display: "flex", flexDirection: "column", gap: 12,
        borderBottom: `1px solid ${C.borde}` }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Buscador refCampo={campoBusqueda} valor={busqueda} alCambiar={setBusqueda} />

          <Resaltable
            as="button"
            onClick={() => setFiltrosAbiertos((v) => !v)}
            estiloHover={{ borderColor: C.acento }}
            style={{ height: 42, padding: "0 14px", borderRadius: 10,
              border: `1.5px solid ${filtrosAbiertos ? C.tinta : C.bordeFuerte}`,
              background: filtrosAbiertos ? C.tinta : "#fff",
              color: filtrosAbiertos ? "#fff" : C.suave,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}>
            Filtros
            {filtrosPuestos > 0 && (
              <span style={{ background: C.acento, color: "#fff", fontSize: 11, fontWeight: 700,
                minWidth: 18, height: 18, borderRadius: 999, display: "flex", alignItems: "center",
                justifyContent: "center", padding: "0 5px" }}>{filtrosPuestos}</span>
            )}
          </Resaltable>

          <div style={{ display: "flex", alignItems: "center", gap: 6, height: 42, padding: "0 6px 0 12px",
            borderRadius: 10, border: `1.5px solid ${C.bordeFuerte}`, background: "#fff" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.tenue, whiteSpace: "nowrap" }}>Ordenar</span>
            <select value={orden} onChange={(e) => setOrden(e.target.value)}
              style={{ height: 32, border: "none", background: "transparent", fontSize: 13, fontWeight: 600,
                color: C.tinta, outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {ORDENES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", padding: 4, gap: 3, background: C.rellenoFuerte, borderRadius: 10,
            height: 42, alignItems: "center" }}>
            {[["cuadricula", "▦", "Cuadrícula"], ["lista", "☰", "Lista"]].map(([clave, icono, titulo]) => (
              <button key={clave} title={titulo} onClick={() => setVista(clave)}
                style={{ width: 34, height: 34, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14,
                  background: vista === clave ? "#fff" : "transparent",
                  color: vista === clave ? C.tinta : "#8a94a6",
                  boxShadow: vista === clave ? "0 1px 3px rgba(16,24,40,.16)" : "none" }}>{icono}</button>
            ))}
          </div>
        </div>

        {/* pestañas de estado */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          {["Todas", ...ESTADOS_OBRA].map((e) => {
            const activa = estado === e;
            return (
              <Resaltable key={e} as="button" onClick={() => setEstado(e)}
                estiloHover={{ borderColor: activa ? C.tinta : "#c3cad8" }}
                style={{ height: 31, padding: "0 12px", borderRadius: 999,
                  border: `1.5px solid ${activa ? C.tinta : C.bordeFuerte}`,
                  background: activa ? C.tinta : "#fff", color: activa ? "#fff" : C.suave,
                  fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
                {e}
                <span style={{ fontSize: 11, fontWeight: 700,
                  color: activa ? "#fff" : C.apagado,
                  background: activa ? "rgba(255,255,255,.18)" : C.relleno,
                  borderRadius: 999, padding: "1px 6px", fontVariantNumeric: "tabular-nums" }}>
                  {cuantasCon(e)}
                </span>
              </Resaltable>
            );
          })}
        </div>

        {/* panel de filtros */}
        {filtrosAbiertos && (
          <div style={{ border: `1px solid ${C.borde}`, background: C.relleno, borderRadius: 12,
            padding: "14px 16px", display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 18 }}>
            <GrupoFiltro titulo="Avance">
              {AVANCE.map((a) => (
                <Pastilla key={a.key} activa={avance === a.key}
                  onClick={() => setAvance(avance === a.key ? null : a.key)}>{a.label}</Pastilla>
              ))}
            </GrupoFiltro>
            <GrupoFiltro titulo="Inicio">
              {FECHAS.map((f) => (
                <Pastilla key={f.key} activa={fecha === f.key}
                  onClick={() => setFecha(fecha === f.key ? null : f.key)}>{f.label}</Pastilla>
              ))}
            </GrupoFiltro>
            <GrupoFiltro titulo="Registro de avance">
              {REGISTRO.map((r) => (
                <Pastilla key={r.key} activa={registro === r.key}
                  onClick={() => setRegistro(registro === r.key ? null : r.key)}>{r.label}</Pastilla>
              ))}
            </GrupoFiltro>
          </div>
        )}

        {/* lo que está filtrando ahora mismo */}
        {filtrosPuestos > 0 && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.tenue }}>Filtrando por</span>
            {etiquetas.map((et) => (
              <span key={et.label} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 28,
                padding: "0 5px 0 11px", borderRadius: 999, background: C.acentoSuave,
                border: `1px solid #ffd9bd`, color: "#b45309", fontSize: 12, fontWeight: 600 }}>
                {et.label}
                <button onClick={et.quitar} style={{ border: "none", background: "#ffe4cc", color: "#b45309",
                  width: 19, height: 19, borderRadius: "50%", fontSize: 10, cursor: "pointer", lineHeight: 1 }}>✕</button>
              </span>
            ))}
            <button onClick={limpiarTodo} style={{ border: "none", background: "transparent", color: C.apagado,
              fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline",
              textUnderlineOffset: 3, fontFamily: "inherit" }}>Limpiar todo</button>
          </div>
        )}
      </div>

      {/* ── cuántas salieron ── */}
      <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${C.borde}` }}>
        <div style={{ fontSize: 13, color: C.apagado }}>
          <strong style={{ color: C.tinta, fontVariantNumeric: "tabular-nums" }}>{lista.length}</strong>{" "}
          {lista.length === 1 ? "obra" : "obras"} {busqueda || filtrosPuestos ? "encontradas" : "en total"}
        </div>
        <div style={{ fontSize: 12, color: C.tenue, fontWeight: 600 }}>
          Avance promedio <span style={{ color: C.tinta, fontVariantNumeric: "tabular-nums" }}>{promedio}%</span>
        </div>
      </div>

      {/* ── las obras ── */}
      {lista.length > 0 && (
        <div style={{ padding: 16, display: "grid",
          gridTemplateColumns: vista === "cuadricula" ? "repeat(auto-fill,minmax(320px,1fr))" : "minmax(0,1fr)",
          gap: 12 }}>
          {lista.map((o) => (
            <TarjetaObra
              key={o.id}
              obra={o}
              cotizacion={(cotizaciones || []).find((c) => c.id === o.cotizacionId)}
              resumen={fotosPorObra.get(o.id)}
              onAbrir={() => onAbrir(o)}
              onCambiarAvance={onCambiarAvance}
              onCambiarEstado={onCambiarEstado}
            />
          ))}
        </div>
      )}

      {lista.length === 0 && (
        <div style={{ padding: "44px 20px 52px", display: "flex", flexDirection: "column", alignItems: "center",
          gap: 8, textAlign: "center" }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: C.tinta }}>
            {obras?.length ? "Ninguna obra coincide" : "Todavía no hay obras"}
          </div>
          <div style={{ fontSize: 13, color: C.apagado, maxWidth: 400 }}>
            {obras?.length
              ? "Ninguna obra coincide con la búsqueda o los filtros puestos."
              : "Las obras se crean al aprobar una cotización, o a mano con el botón de arriba."}
          </div>
          {(busqueda || filtrosPuestos > 0) && (
            <button onClick={limpiarTodo} style={{ marginTop: 6, height: 36, padding: "0 16px", borderRadius: 10,
              border: "none", background: C.acentoFuerte, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit" }}>Limpiar búsqueda y filtros</button>
          )}
        </div>
      )}
    </div>
  );
}

function Buscador({ valor, alCambiar, refCampo }) {
  const [enfocado, setEnfocado] = useState(false);
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 280 }}>
      <input
        ref={refCampo}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        placeholder="Buscar por cliente, proyecto, número de obra, ciudad o cotización…"
        style={{ ...SI, height: 42, padding: "0 84px 0 13px",
          border: `1.5px solid ${enfocado ? C.acento : C.bordeFuerte}`,
          background: enfocado ? "#fff" : C.relleno,
          boxShadow: enfocado ? "0 0 0 3px rgba(244,124,32,.14)" : "none" }}
      />
      <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        display: "flex", alignItems: "center", gap: 7 }}>
        {valor.length > 0 && (
          <button onClick={() => alCambiar("")} style={{ border: "none", background: C.rellenoFuerte,
            color: C.suave, width: 22, height: 22, borderRadius: "50%", fontSize: 12, cursor: "pointer",
            lineHeight: 1 }}>✕</button>
        )}
        <kbd style={{ fontSize: 10.5, color: C.tenue, background: C.rellenoFuerte,
          border: `1px solid ${C.bordeFuerte}`, borderRadius: 5, padding: "2px 6px" }}>Ctrl K</kbd>
      </div>
    </div>
  );
}

function GrupoFiltro({ titulo, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
        color: C.tenue }}>{titulo}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Pastilla({ activa, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ height: 30, padding: "0 11px", borderRadius: 8,
        border: `1.5px solid ${activa ? C.acento : C.bordeFuerte}`,
        background: activa ? C.acentoSuave : "#fff",
        color: activa ? "#b45309" : C.suave,
        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>
  );
}

// La tarjeta conserva lo que ya se hacia desde el listado: mover el avance,
// cambiar el estado y ver de un vistazo cuanta gente y cuantas fotos hay.
function TarjetaObra({ obra: o, cotizacion, resumen, onAbrir, onCambiarAvance, onCambiarEstado }) {
  const avance = Number(o.avance) || 0;
  const color = avance === 100 ? "#4ade80" : C.acento;
  const fotos = resumen?.fotos || 0;

  return (
    <Resaltable
      as="article"
      onClick={onAbrir}
      estiloHover={{ borderColor: C.acentoFuerte, boxShadow: "0 12px 28px -16px rgba(15,23,42,.30)" }}
      style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 14, background: "#fff",
        padding: "14px 15px 12px", display: "flex", flexDirection: "column", gap: 11,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: C.tenue }}>{o.id} · {fmtD(o.fechaInicio)}</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: C.tinta }}>
            {normalizarRazonSocial(o.cliente)}
          </div>
          {o.proyecto && <div style={{ fontSize: 12, color: C.suave }}>{o.proyecto}</div>}
          {o.ciudad && <div style={{ fontSize: 11.5, color: C.tenue, marginTop: 1 }}>{o.ciudad}</div>}
          {cotizacion && <div style={{ fontSize: 10.5, color: "#b45309", marginTop: 2 }}>📄 {o.cotizacionId}</div>}
        </div>
        <Badge estado={o.estado} />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.apagado,
          marginBottom: 4 }}>
          <span>Avance</span>
          <span style={{ color: avance === 100 ? "#166534" : C.acento, fontWeight: 600,
            fontVariantNumeric: "tabular-nums" }}>{avance}%</span>
        </div>
        <div style={{ height: 5, background: C.bordeFuerte, borderRadius: 3 }}>
          <div style={{ width: avance + "%", height: "100%", background: color, borderRadius: 3,
            transition: "width .4s ease" }} />
        </div>
        <input type="range" min={0} max={100} value={avance}
          onChange={(e) => onCambiarAvance(o.id, Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", marginTop: 4, accentColor: C.acento }} />
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <select value={o.estado}
          onChange={(e) => { e.stopPropagation(); onCambiarEstado(o.id, e.target.value); }}
          onClick={(e) => e.stopPropagation()}
          style={{ ...SI, fontSize: 11, padding: "5px 8px", flex: 1 }}>
          {[...new Set([...ESTADOS_OBRA, o.estado].filter(Boolean))].map((s) => <option key={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 11, color: C.tenue, flexShrink: 0 }}>{(o.empleados || []).length} 👷</span>
        <span
          title={fotos ? "Fotos de avance cargadas para el informe" : "Sin fotos de avance: el informe saldría vacío"}
          style={{ fontSize: 11, color: fotos ? C.tenue : "#b54708", flexShrink: 0 }}>
          {fotos} 📸
        </span>
        <span style={{ fontSize: 11, color: C.acentoFuerte, fontWeight: 600, flexShrink: 0 }}>Ver →</span>
      </div>
    </Resaltable>
  );
}
