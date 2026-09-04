// Listado con buscador, filtros, orden y dos vistas.
//
// POR QUE EXISTE: la misma pantalla se repetia en cotizaciones y en obras, y
// hacian falta tres mas -certificaciones, informes y vencimientos-. Cinco
// copias del mismo codigo significan que un arreglo hay que hacerlo cinco
// veces y que las pantallas se van separando entre ellas. Aqui esta una vez,
// y cada modulo solo dice QUE datos tiene y COMO se pinta cada fila.
//
// LO QUE TRAE, igual en todas partes:
//   · buscador con Ctrl+K
//   · pestañas de estado con su conteo
//   · panel de filtros plegable, con lo que cada modulo le pase
//   · ordenamiento
//   · lista o cuadricula, empezando en lista
//   · aviso de que se esta filtrando, con boton de limpiar
//   · que decir cuando no hay nada
//
// NO LLEVA CIFRAS. Estas pantallas son para buscar y abrir documentos; el
// dinero se ve al abrirlos, o en cuentas por cobrar y el informe financiero,
// que es donde tiene contexto.
import { useEffect, useMemo, useRef, useState } from "react";
import { CD, SI } from "../styles/tokens";
import { C, RANGOS_FECHA, enMilis } from "./listadoEstilos";

/** Botón que se ilumina al pasar por encima, sin hoja de estilos. */
export function Resaltable({ as = "div", estiloHover, style, children, ...resto }) {
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

export function GrupoFiltro({ titulo, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
        color: C.tenue }}>{titulo}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

export function Pastilla({ activa, onClick, children }) {
  return (
    <button onClick={onClick} style={{ height: 30, padding: "0 11px", borderRadius: 8,
      border: `1.5px solid ${activa ? C.acento : C.bordeFuerte}`,
      background: activa ? C.acentoSuave : "#fff", color: activa ? "#b45309" : C.suave,
      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>
  );
}

/**
 * @param {object}   props
 * @param {Array}    props.datos          lo que hay que listar
 * @param {Function} props.buscarEn       (item) => texto donde busca el buscador
 * @param {string}   props.marcador       lo que dice el buscador cuando está vacío
 * @param {string}   props.nombre         "cotización" / "obra"… para los mensajes
 * @param {string}   props.nombrePlural
 * @param {Function} props.estadoDe       (item) => estado, para las pestañas
 * @param {Array}    props.estadosFijos   estados que salen aunque no haya ninguno
 * @param {Function} props.fechaDe        (item) => fecha, para el filtro de fecha
 * @param {Array}    props.ordenes        [{key,label,comparar}]
 * @param {Function} props.filtrosExtra   ({valores,poner}) => JSX del panel
 * @param {Function} props.aplicarExtra   (item, valores) => boolean
 * @param {Function} props.fila           (item, {compacta}) => JSX de cada fila
 * @param {JSX}      props.vacio          qué decir cuando no hay nada de nada
 */
export default function ListadoConFiltros({
  datos = [],
  buscarEn,
  marcador = "Buscar…",
  nombre = "registro",
  nombrePlural = "registros",
  estadoDe,
  estadosFijos = [],
  fechaDe,
  ordenes = [],
  filtrosExtra,
  aplicarExtra,
  fila,
  vacio,
  derecha,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("Todas");
  const [rango, setRango] = useState(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [extra, setExtra] = useState({});
  const [orden, setOrden] = useState(ordenes[0]?.key || "");
  // En móvil arranca en cuadrícula para que los botones y datos quepan con holgura; en escritorio en lista.
  const [vista, setVista] = useState(() => (
    typeof window !== "undefined" && window.innerWidth < 768 ? "cuadricula" : "lista"
  ));
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

  const estados = useMemo(() => {
    if (!estadoDe) return [];
    const vistos = new Set(datos.map((d) => String(estadoDe(d) || "").trim()).filter(Boolean));
    estadosFijos.forEach((e) => vistos.add(e));
    return [...vistos].sort((a, b) => a.localeCompare(b, "es"));
  }, [datos, estadoDe, estadosFijos]);

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const desdeRango = rango ? ahora - RANGOS_FECHA.find((r) => r.key === rango).dias * 864e5 : null;

    const filtrados = datos.filter((d) => {
      if (texto && buscarEn && !String(buscarEn(d) || "").toLowerCase().includes(texto)) return false;
      if (estadoDe && estado !== "Todas" && estadoDe(d) !== estado) return false;
      if (fechaDe) {
        const f = fechaDe(d);
        if (desdeRango !== null && enMilis(f) < desdeRango) return false;
        if (desde && String(f || "") < desde) return false;
        if (hasta && String(f || "") > hasta) return false;
      }
      if (aplicarExtra && !aplicarExtra(d, extra)) return false;
      return true;
    });

    const comparar = ordenes.find((o) => o.key === orden)?.comparar;
    return comparar ? [...filtrados].sort(comparar) : filtrados;
  }, [datos, busqueda, estado, rango, desde, hasta, extra, orden, ahora,
      buscarEn, estadoDe, fechaDe, aplicarExtra, ordenes]);

  const extrasPuestos = Object.values(extra).filter(Boolean).length;
  const puestos = (estado !== "Todas" ? 1 : 0) + (rango ? 1 : 0) + (desde || hasta ? 1 : 0) + extrasPuestos;

  const limpiarTodo = () => {
    setBusqueda(""); setEstado("Todas"); setRango(null); setDesde(""); setHasta(""); setExtra({});
  };
  const cuantos = (e) => datos.filter((d) => e === "Todas" || estadoDe(d) === e).length;
  const ponerExtra = (clave, valor) => setExtra((p) => ({ ...p, [clave]: valor }));

  return (
    <div style={{ ...CD, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px 11px", display: "flex", flexDirection: "column", gap: 9,
        borderBottom: `1px solid ${C.borde}` }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Buscador refCampo={campoBusqueda} valor={busqueda} alCambiar={setBusqueda} marcador={marcador} />

          <Resaltable as="button" onClick={() => setFiltrosAbiertos((v) => !v)}
            estiloHover={{ borderColor: C.acento }}
            style={{ height: 36, padding: "0 12px", borderRadius: 9,
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

          {ordenes.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 5px 0 11px",
              borderRadius: 9, border: `1.5px solid ${C.bordeFuerte}`, background: "#fff" }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.tenue, whiteSpace: "nowrap" }}>Ordenar</span>
              <select value={orden} onChange={(e) => setOrden(e.target.value)}
                style={{ height: 30, border: "none", background: "transparent", fontSize: 13, fontWeight: 600,
                  color: C.tinta, outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
                {ordenes.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: "flex", padding: 3, gap: 3, background: C.rellenoFuerte, borderRadius: 9,
            height: 36, alignItems: "center" }}>
            {[["lista", "☰", "Lista"], ["cuadricula", "▦", "Cuadrícula"]].map(([clave, icono, titulo]) => (
              <button key={clave} title={titulo} onClick={() => setVista(clave)}
                style={{ width: 30, height: 30, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13,
                  background: vista === clave ? "#fff" : "transparent",
                  color: vista === clave ? C.tinta : "#8a94a6",
                  boxShadow: vista === clave ? "0 1px 3px rgba(16,24,40,.16)" : "none" }}>{icono}</button>
            ))}
          </div>
        </div>

        {estadoDe && estados.length > 0 && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            {["Todas", ...estados].map((e) => {
              const activa = estado === e;
              return (
                <Resaltable key={e} as="button" onClick={() => setEstado(e)}
                  estiloHover={{ borderColor: activa ? C.tinta : "#c3cad8" }}
                  style={{ height: 28, padding: "0 11px", borderRadius: 999,
                    border: `1.5px solid ${activa ? C.tinta : C.bordeFuerte}`,
                    background: activa ? C.tinta : "#fff", color: activa ? "#fff" : C.suave,
                    fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
                  {e}
                  <span style={{ fontSize: 11, fontWeight: 700, color: activa ? "#fff" : C.apagado,
                    background: activa ? "rgba(255,255,255,.18)" : C.relleno, borderRadius: 999,
                    padding: "1px 6px", fontVariantNumeric: "tabular-nums" }}>{cuantos(e)}</span>
                </Resaltable>
              );
            })}
            {derecha && <span style={{ marginLeft: "auto" }}>{derecha(lista)}</span>}
          </div>
        )}

        {filtrosAbiertos && (
          <div style={{ border: `1px solid ${C.borde}`, background: C.relleno, borderRadius: 12,
            padding: "14px 16px", display: "grid",
            gridTemplateColumns: filtrosExtra ? "1fr 1.1fr 1fr" : "1fr 1.2fr", gap: 18 }}>
            {fechaDe && (
              <>
                <GrupoFiltro titulo="Fecha">
                  {RANGOS_FECHA.map((r) => (
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
              </>
            )}
            {filtrosExtra && filtrosExtra({ valores: extra, poner: ponerExtra })}
          </div>
        )}

        {puestos > 0 && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.tenue }}>Filtrando</span>
            <button onClick={limpiarTodo} style={{ border: "none", background: "transparent", color: C.apagado,
              fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline",
              textUnderlineOffset: 3, fontFamily: "inherit" }}>Limpiar todo</button>
          </div>
        )}
      </div>

      {lista.length > 0 && (
        <div style={{ padding: vista === "lista" ? "10px 14px 14px" : 14, display: "grid",
          gridTemplateColumns: vista === "cuadricula" ? "repeat(auto-fill,minmax(330px,1fr))" : "minmax(0,1fr)",
          gap: vista === "lista" ? 6 : 11 }}>
          {lista.map((d, i) => fila(d, { compacta: vista === "lista", indice: i }))}
        </div>
      )}

      {lista.length === 0 && (
        <div style={{ padding: "40px 20px 46px", display: "flex", flexDirection: "column", alignItems: "center",
          gap: 8, textAlign: "center" }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: C.tinta }}>
            {datos.length ? `Ninguna ${nombre} coincide` : (vacio?.titulo || `Todavía no hay ${nombrePlural}`)}
          </div>
          <div style={{ fontSize: 13, color: C.apagado, maxWidth: 420 }}>
            {datos.length
              ? "Ninguna coincide con la búsqueda o los filtros puestos."
              : (vacio?.texto || "")}
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

function Buscador({ valor, alCambiar, refCampo, marcador }) {
  const [enfocado, setEnfocado] = useState(false);
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
      <input ref={refCampo} value={valor} onChange={(e) => alCambiar(e.target.value)}
        onFocus={() => setEnfocado(true)} onBlur={() => setEnfocado(false)}
        placeholder={marcador}
        style={{ ...SI, height: 36, padding: "0 80px 0 12px", fontSize: 13,
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
