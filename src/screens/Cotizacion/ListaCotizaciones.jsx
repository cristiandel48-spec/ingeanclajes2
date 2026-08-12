// Listado de cotizaciones con buscador, filtros, orden y dos vistas.
//
// Mismo aspecto que el listado de obras (ListaObras), para que las dos
// pantallas se manejen igual, con dos cosas propias de aqui:
//
//   · FILTRO DE FECHA de dos formas. Los atajos -ultimos 7 dias, este
//     trimestre- responden a "¿que he cotizado ultimamente?", y las dos
//     casillas de calendario a "las de julio". Usar una desactiva la otra:
//     puestas a la vez se contradicen y no saldria nada.
//   · EMPIEZA EN VISTA DE LISTA. Una cotizacion se busca en un renglon, no
//     mirando tarjetas: asi caben mas de un vistazo.
//
// AQUI NO SE VEN CIFRAS, igual que en el listado de obras. Es una pantalla de
// buscar y abrir documentos, y el valor de cada propuesta se ve al abrirla o
// en el informe financiero, que es donde tiene contexto.
import { useEffect, useMemo, useRef, useState } from "react";
import Badge from "../../components/ui/Badge";
import { CD, SI } from "../../styles/tokens";
import { fmtD } from "../../lib/format";
import { normalizarMayusculas, normalizarRazonSocial } from "../../lib/normalizarEntrada";

const C = {
  borde: "#eef0f3", bordeFuerte: "#e2e8f0", tinta: "#1a1a2e", suave: "#475569",
  apagado: "#64748b", tenue: "#94a3b8", relleno: "#f8fafc", rellenoFuerte: "#eef0f3",
  acento: "#f47c20", acentoFuerte: "#cc0000", acentoSuave: "#fff3e8",
};

const RANGOS = [
  { key: "7d",   label: "Últimos 7 días",  dias: 7 },
  { key: "30d",  label: "Últimos 30 días", dias: 30 },
  { key: "90d",  label: "Este trimestre",  dias: 90 },
  { key: "anio", label: "Este año",        dias: 365 },
];

const ORDENES = [
  { key: "recientes", label: "Más recientes" },
  { key: "antiguas",  label: "Más antiguas" },
  { key: "cliente",   label: "Cliente A–Z" },
  { key: "numero",    label: "Número" },
];

const enMilis = (f) => {
  const t = new Date(f || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

function Resaltable({ as = "div", estiloHover, style, children, ...resto }) {
  const [encima, setEncima] = useState(false);
  const Tag = as;
  return (
    <Tag {...resto}
      onMouseEnter={(e) => { setEncima(true); resto.onMouseEnter && resto.onMouseEnter(e); }}
      onMouseLeave={(e) => { setEncima(false); resto.onMouseLeave && resto.onMouseLeave(e); }}
      style={{ ...style, ...(encima ? estiloHover : null) }}>{children}</Tag>
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
    <button onClick={onClick} style={{ height: 30, padding: "0 11px", borderRadius: 8,
      border: `1.5px solid ${activa ? C.acento : C.bordeFuerte}`,
      background: activa ? C.acentoSuave : "#fff", color: activa ? "#b45309" : C.suave,
      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>
  );
}

export default function ListaCotizaciones({ cotizaciones, acciones }) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("Todas");
  const [rango, setRango] = useState(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [obra, setObra] = useState("todas");
  const [orden, setOrden] = useState("recientes");
  // Empieza en lista: una cotizacion se busca leyendo renglones.
  const [vista, setVista] = useState("lista");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const campoBusqueda = useRef(null);
  // La hora se lee UNA vez, al abrir: dentro del calculo haria que el
  // resultado cambiara solo, sin que nadie toque nada.
  const [ahora] = useState(() => Date.now());

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

  const estadosPresentes = useMemo(() => {
    const vistos = new Set((cotizaciones || []).map((c) => String(c.estado || "").trim()).filter(Boolean));
    // Pendiente y Aprobada salen siempre, aunque hoy no haya ninguna, para
    // que las pestañas no bailen segun lo que haya cargado.
    ["Pendiente", "Aprobada"].forEach((e) => vistos.add(e));
    return [...vistos].sort((a, b) => a.localeCompare(b, "es"));
  }, [cotizaciones]);

  const obrasPresentes = useMemo(() => (
    [...new Set((cotizaciones || []).map((c) => String(c.obra || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "es"))
  ), [cotizaciones]);

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const desdeRango = rango ? ahora - RANGOS.find((r) => r.key === rango).dias * 864e5 : null;

    const filtradas = (cotizaciones || []).filter((c) => {
      if (texto) {
        const donde = [c.numero, c.id, c.cliente, c.obra, c.ciudad]
          .filter(Boolean).join(" ").toLowerCase();
        if (!donde.includes(texto)) return false;
      }
      if (estado !== "Todas" && c.estado !== estado) return false;
      if (obra !== "todas" && String(c.obra || "").trim() !== obra) return false;
      if (desdeRango !== null && enMilis(c.fecha) < desdeRango) return false;
      if (desde && String(c.fecha || "") < desde) return false;
      if (hasta && String(c.fecha || "") > hasta) return false;
      return true;
    });

    const criterio = {
      recientes: (a, b) => enMilis(b.fecha) - enMilis(a.fecha) || String(b.id).localeCompare(String(a.id)),
      antiguas: (a, b) => enMilis(a.fecha) - enMilis(b.fecha),
      cliente: (a, b) => String(a.cliente || "").localeCompare(String(b.cliente || ""), "es"),
      numero: (a, b) => String(a.numero || a.id).localeCompare(String(b.numero || b.id), "es", { numeric: true }),
    };
    return [...filtradas].sort(criterio[orden]);
  }, [cotizaciones, busqueda, estado, obra, rango, desde, hasta, orden, ahora]);

  const puestos = (estado !== "Todas" ? 1 : 0) + (obra !== "todas" ? 1 : 0)
    + (rango ? 1 : 0) + (desde || hasta ? 1 : 0);

  const etiquetas = [];
  if (estado !== "Todas") etiquetas.push({ t: `Estado: ${estado}`, quitar: () => setEstado("Todas") });
  if (obra !== "todas") etiquetas.push({ t: `Obra: ${obra}`, quitar: () => setObra("todas") });
  if (rango) etiquetas.push({ t: RANGOS.find((r) => r.key === rango).label, quitar: () => setRango(null) });
  if (desde || hasta) {
    etiquetas.push({
      t: `Del ${desde ? fmtD(desde) : "principio"} al ${hasta ? fmtD(hasta) : "hoy"}`,
      quitar: () => { setDesde(""); setHasta(""); },
    });
  }

  const limpiarTodo = () => {
    setBusqueda(""); setEstado("Todas"); setObra("todas"); setRango(null); setDesde(""); setHasta("");
  };
  const cuantas = (e) => (cotizaciones || []).filter((c) => e === "Todas" || c.estado === e).length;

  return (
    <div style={{ ...CD, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 18px 14px", display: "flex", flexDirection: "column", gap: 12,
        borderBottom: `1px solid ${C.borde}` }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Buscador refCampo={campoBusqueda} valor={busqueda} alCambiar={setBusqueda} />

          <Resaltable as="button" onClick={() => setFiltrosAbiertos((v) => !v)}
            estiloHover={{ borderColor: C.acento }}
            style={{ height: 42, padding: "0 14px", borderRadius: 10,
              border: `1.5px solid ${filtrosAbiertos ? C.tinta : C.bordeFuerte}`,
              background: filtrosAbiertos ? C.tinta : "#fff",
              color: filtrosAbiertos ? "#fff" : C.suave,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}>
            Filtros
            {puestos > 0 && (
              <span style={{ background: C.acento, color: "#fff", fontSize: 11, fontWeight: 700,
                minWidth: 18, height: 18, borderRadius: 999, display: "flex", alignItems: "center",
                justifyContent: "center", padding: "0 5px" }}>{puestos}</span>
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
            {[["lista", "☰", "Lista"], ["cuadricula", "▦", "Cuadrícula"]].map(([clave, icono, titulo]) => (
              <button key={clave} title={titulo} onClick={() => setVista(clave)}
                style={{ width: 34, height: 34, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14,
                  background: vista === clave ? "#fff" : "transparent",
                  color: vista === clave ? C.tinta : "#8a94a6",
                  boxShadow: vista === clave ? "0 1px 3px rgba(16,24,40,.16)" : "none" }}>{icono}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          {["Todas", ...estadosPresentes].map((e) => {
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
                <span style={{ fontSize: 11, fontWeight: 700, color: activa ? "#fff" : C.apagado,
                  background: activa ? "rgba(255,255,255,.18)" : C.relleno, borderRadius: 999,
                  padding: "1px 6px", fontVariantNumeric: "tabular-nums" }}>{cuantas(e)}</span>
              </Resaltable>
            );
          })}
        </div>

        {filtrosAbiertos && (
          <div style={{ border: `1px solid ${C.borde}`, background: C.relleno, borderRadius: 12,
            padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1.1fr 1fr", gap: 18 }}>
            <GrupoFiltro titulo="Fecha">
              {RANGOS.map((r) => (
                <Pastilla key={r.key} activa={rango === r.key}
                  onClick={() => { setRango(rango === r.key ? null : r.key); setDesde(""); setHasta(""); }}>
                  {r.label}
                </Pastilla>
              ))}
            </GrupoFiltro>
            <GrupoFiltro titulo="…o entre dos fechas">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="date" value={desde}
                  onChange={(e) => { setDesde(e.target.value); setRango(null); }}
                  style={{ ...SI, fontSize: 12, padding: "6px 8px", width: 142 }} />
                <span style={{ fontSize: 12, color: C.tenue }}>a</span>
                <input type="date" value={hasta}
                  onChange={(e) => { setHasta(e.target.value); setRango(null); }}
                  style={{ ...SI, fontSize: 12, padding: "6px 8px", width: 142 }} />
              </div>
            </GrupoFiltro>
            <GrupoFiltro titulo="Obra">
              <select value={obra} onChange={(e) => setObra(e.target.value)}
                style={{ ...SI, fontSize: 12, padding: "6px 8px" }}>
                <option value="todas">Todas las obras</option>
                {obrasPresentes.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </GrupoFiltro>
          </div>
        )}

        {puestos > 0 && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.tenue }}>Filtrando por</span>
            {etiquetas.map((et) => (
              <span key={et.t} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 28,
                padding: "0 5px 0 11px", borderRadius: 999, background: C.acentoSuave,
                border: "1px solid #ffd9bd", color: "#b45309", fontSize: 12, fontWeight: 600 }}>
                {et.t}
                <button onClick={et.quitar} style={{ border: "none", background: "#ffe4cc", color: "#b45309",
                  width: 19, height: 19, borderRadius: "50%", fontSize: 10, cursor: "pointer",
                  lineHeight: 1 }}>✕</button>
              </span>
            ))}
            <button onClick={limpiarTodo} style={{ border: "none", background: "transparent", color: C.apagado,
              fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline",
              textUnderlineOffset: 3, fontFamily: "inherit" }}>Limpiar todo</button>
          </div>
        )}
      </div>

      {/* Cuantas salieron. Sin sumar valores: esta pantalla es para buscar y
          abrir documentos, y las cifras se ven al abrirlos. */}
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.borde}`, fontSize: 13, color: C.apagado }}>
        <strong style={{ color: C.tinta, fontVariantNumeric: "tabular-nums" }}>{lista.length}</strong>{" "}
        {lista.length === 1 ? "cotización" : "cotizaciones"} {busqueda || puestos ? "encontradas" : "en total"}
      </div>

      {lista.length > 0 && (
        <div style={{ padding: 16, display: "grid",
          gridTemplateColumns: vista === "cuadricula" ? "repeat(auto-fill,minmax(340px,1fr))" : "minmax(0,1fr)",
          gap: 12 }}>
          {lista.map((c) => <Tarjeta key={c.id} cotizacion={c} acciones={acciones} />)}
        </div>
      )}

      {lista.length === 0 && (
        <div style={{ padding: "44px 20px 52px", display: "flex", flexDirection: "column", alignItems: "center",
          gap: 8, textAlign: "center" }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: C.tinta }}>
            {cotizaciones?.length ? "Ninguna cotización coincide" : "Todavía no hay cotizaciones"}
          </div>
          <div style={{ fontSize: 13, color: C.apagado, maxWidth: 400 }}>
            {cotizaciones?.length
              ? "Ninguna coincide con la búsqueda o los filtros puestos."
              : "Crea la primera con el botón de arriba."}
          </div>
          {(busqueda || puestos > 0) && (
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
      <input ref={refCampo} value={valor} onChange={(e) => alCambiar(e.target.value)}
        onFocus={() => setEnfocado(true)} onBlur={() => setEnfocado(false)}
        placeholder="Buscar por número, cliente, obra o ciudad…"
        style={{ ...SI, height: 42, padding: "0 84px 0 13px",
          border: `1.5px solid ${enfocado ? C.acento : C.bordeFuerte}`,
          background: enfocado ? "#fff" : C.relleno,
          boxShadow: enfocado ? "0 0 0 3px rgba(244,124,32,.14)" : "none" }} />
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

const boton = (fondo, color, extra = {}) => ({
  background: fondo, color, border: "none", borderRadius: 8, padding: "5px 10px",
  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", ...extra,
});

function Tarjeta({ cotizacion: c, acciones }) {
  const aprobada = c.estado === "Aprobada";
  const alPulsar = (fn) => (e) => { e.stopPropagation(); fn(c); };

  return (
    <Resaltable as="article"
      onClick={() => acciones.ver(c)}
      estiloHover={{ borderColor: C.acentoFuerte, boxShadow: "0 12px 28px -16px rgba(15,23,42,.30)" }}
      style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 14, background: "#fff",
        padding: "14px 15px 12px", display: "flex", flexDirection: "column", gap: 11,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: aprobada ? "#12B76A" : C.acento }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: C.tenue }}>
            {c.numero || c.id}{c.fecha ? ` · ${fmtD(c.fecha)}` : ""}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: C.tinta }}>
            {normalizarRazonSocial(c.cliente)}
          </div>
          {c.obra && <div style={{ fontSize: 12, color: C.suave }}>{normalizarMayusculas(c.obra)}</div>}
          {c.ciudad && <div style={{ fontSize: 11.5, color: C.tenue, marginTop: 1 }}>{normalizarMayusculas(c.ciudad)}</div>}
        </div>
        <Badge estado={c.estado} />
      </div>

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", paddingTop: 9,
        borderTop: `1px solid ${C.borde}` }}>
        <button style={boton("#dbeafe", "#1e40af")} onClick={alPulsar(acciones.ver)}>Ver</button>
        <button style={boton("#1a3050", "#f5c842")} onClick={alPulsar(acciones.editar)}>Editar</button>
        {!aprobada
          ? <button style={boton("#0f2d1a", "#4ade80", { border: "1px solid #166534" })}
              onClick={alPulsar(acciones.aprobar)}>Aprobar y crear obra</button>
          : <button style={boton("#fff", "#b54708", { border: "1.5px solid #fde3c4" })}
              title="Devuelve la cotización a Pendiente. La obra solo se borra si está sin empezar y tú lo confirmas."
              onClick={alPulsar(acciones.desaprobar)}>↩ Desaprobar</button>}
        <button style={boton("#2d1414", "#ef4444")} onClick={alPulsar(acciones.pdf)}>PDF</button>
        <button style={boton("#f47c20", "#fff")} onClick={alPulsar(acciones.enviar)}>Enviar al cliente</button>
        <button style={boton("#fff", "#ef4444", { border: "1.5px solid #ef4444" })}
          onClick={alPulsar(acciones.eliminar)}>🗑</button>
      </div>
    </Resaltable>
  );
}
