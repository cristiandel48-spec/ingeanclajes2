import { useMemo, useRef, useState, useEffect } from "react";
import { CD } from "../../styles/tokens";
import { confirmar } from "../../lib/dialogos";

// Lista de chequeo personal estilo Recordatorios de Apple. Cada usuario ve
// solo la suya (la nube filtra por dueño); al marcar una tarea se tacha sola.

const NARANJA = "#f47c20";

function hoyIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "2026-04-09" -> "09/04"
function fechaCorta(iso) {
  if (!iso || iso.length < 10) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function nuevoId() {
  return `TP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const ESTILOS = `
.mt-fila { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 11px 6px; border-radius: 10px; transition: background .15s ease; }
.mt-fila + .mt-fila::before { content: ""; position: absolute; top: 0; left: 40px; right: 6px; height: 1px; background: var(--border, #eaecf0); }
.mt-fila:hover { background: var(--surface-subtle, #f6f7f9); }
.mt-fila:hover::before, .mt-fila:hover + .mt-fila::before { opacity: 0; }
.mt-check { flex-shrink: 0; width: 22px; height: 22px; margin-top: 1px; border-radius: 50%; border: 1.5px solid var(--text-muted, #98a2b3); background: transparent; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; transition: background .2s ease, border-color .2s ease, transform .2s cubic-bezier(.34,1.56,.64,1); }
.mt-check:hover { border-color: ${NARANJA}; }
.mt-check:active { transform: scale(.88); }
.mt-check svg { opacity: 0; transform: scale(.4); transition: opacity .18s ease, transform .25s cubic-bezier(.34,1.56,.64,1); }
.mt-hecha .mt-check { background: ${NARANJA}; border-color: ${NARANJA}; }
.mt-hecha .mt-check svg { opacity: 1; transform: scale(1); }
.mt-cuerpo { flex: 1; min-width: 0; font-size: 15px; line-height: 1.45; color: var(--text-main, #101828); cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; }
.mt-fecha { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--text-muted, #667085); margin-right: 6px; transition: color .25s ease; }
.mt-texto { background-image: linear-gradient(currentColor, currentColor); background-repeat: no-repeat; background-position: 0 58%; background-size: 0% 1.5px; -webkit-box-decoration-break: clone; box-decoration-break: clone; transition: background-size .38s cubic-bezier(.4,0,.2,1), color .25s ease; word-break: break-word; }
.mt-hecha .mt-texto { background-size: 100% 1.5px; color: var(--text-muted, #98a2b3); }
.mt-hecha .mt-fecha { color: var(--text-muted, #98a2b3); opacity: .75; }
.mt-acciones { display: flex; gap: 2px; opacity: 0; transition: opacity .15s ease; }
.mt-fila:hover .mt-acciones, .mt-fila:focus-within .mt-acciones { opacity: 1; }
@media (hover: none) { .mt-acciones { opacity: 1; } }
.mt-icono { width: 28px; height: 28px; border-radius: 8px; border: none; background: transparent; color: var(--text-muted, #98a2b3); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: background .15s ease, color .15s ease; }
.mt-icono:hover { background: var(--surface, #fff); color: var(--text-main, #101828); box-shadow: 0 1px 2px rgba(0,0,0,.06); }
.mt-icono.peligro:hover { color: #e0342a; }
.mt-composer { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--surface-subtle, #f6f7f9); border: 1px solid transparent; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
.mt-composer:focus-within { background: var(--surface, #fff); border-color: rgba(244,124,32,.45); box-shadow: 0 0 0 4px rgba(244,124,32,.12); }
.mt-composer input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 15px; color: var(--text-main, #101828); font-family: inherit; }
.mt-edicion { width: 100%; box-sizing: border-box; font-size: 15px; line-height: 1.45; font-family: inherit; color: var(--text-main, #101828); background: var(--surface, #fff); border: 1px solid rgba(244,124,32,.5); box-shadow: 0 0 0 3px rgba(244,124,32,.12); border-radius: 8px; padding: 2px 8px; outline: none; }
.mt-seg { display: inline-flex; padding: 2px; border-radius: 9px; background: var(--surface-subtle, #f1f3f5); border: 1px solid var(--border, rgba(0,0,0,.06)); }
.mt-seg button { border: none; background: transparent; padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: 7px; cursor: pointer; color: var(--text-muted, #667085); font-family: inherit; transition: all .15s ease; }
.mt-seg button.activo { background: var(--surface, #fff); color: var(--text-main, #101828); box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 0 0 .5px rgba(0,0,0,.04); }
.mt-entrada { animation: mtEntrada .28s cubic-bezier(.2,.8,.2,1); }
@keyframes mtEntrada { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.mt-toast { animation: mtToast .25s cubic-bezier(.2,.8,.2,1); }
@media (max-width: 600px) {
  .mt-card { padding: 20px 14px 12px !important; }
  .mt-titulo { font-size: 26px !important; }
  .mt-cuerpo, .mt-composer input, .mt-edicion { font-size: 16px; }
}
@keyframes mtToast { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
`;

function IconoCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function AnilloProgreso({ hechas, total }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const pct = total ? hechas / total : 0;
  return (
    <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
      <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--border, #eaecf0)" strokeWidth="5" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={NARANJA}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset .5s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--text-main, #101828)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {Math.round(pct * 100)}%
      </div>
    </div>
  );
}

function FilaTarea({ tarea, onToggle, onGuardarTexto, onEliminar }) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(tarea.texto);

  const empezarEdicion = () => {
    setBorrador(tarea.texto);
    setEditando(true);
  };

  const terminarEdicion = (guardar) => {
    if (guardar) {
      const limpio = borrador.trim();
      if (limpio && limpio !== tarea.texto) onGuardarTexto(tarea.id, limpio);
    }
    setEditando(false);
  };

  return (
    <div className={`mt-fila mt-entrada${tarea.completada ? " mt-hecha" : ""}`}>
      <button
        type="button"
        className="mt-check"
        onClick={() => onToggle(tarea.id)}
        aria-label={tarea.completada ? "Marcar como pendiente" : "Marcar como realizada"}
        aria-pressed={tarea.completada}
      >
        <IconoCheck />
      </button>

      {editando ? (
        <input
          className="mt-edicion"
          autoFocus
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onBlur={() => terminarEdicion(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") terminarEdicion(true);
            if (e.key === "Escape") terminarEdicion(false);
          }}
        />
      ) : (
        <div className="mt-cuerpo" onClick={() => onToggle(tarea.id)} title="Clic para marcar o desmarcar">
          {tarea.fecha && <span className="mt-fecha">{fechaCorta(tarea.fecha)}:</span>}
          <span className="mt-texto">{tarea.texto}</span>
        </div>
      )}

      {!editando && (
        <div className="mt-acciones">
          <button type="button" className="mt-icono" onClick={empezarEdicion} title="Editar" aria-label="Editar tarea">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button type="button" className="mt-icono peligro" onClick={() => onEliminar(tarea.id)} title="Eliminar" aria-label="Eliminar tarea">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function MisTareas({ ctx }) {
  const lista = ctx?.tareasPersonales;
  const tareas = useMemo(() => (Array.isArray(lista) ? lista : []), [lista]);
  const setTareas = (updater) => {
    if (typeof ctx?.setTareasPersonales === "function") ctx.setTareasPersonales(updater);
  };

  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState("todas"); // "todas" | "pendientes" | "completadas"
  const [deshacer, setDeshacer] = useState(null); // { tareas, indice, mensaje }
  const timerDeshacer = useRef(null);
  const inputRef = useRef(null);

  // Listas desplegables (Secciones colapsables de tareas)
  const [secciones, setSecciones] = useState(() => {
    try {
      const guardadas = localStorage.getItem("ingeanclajes_secciones_personales");
      if (guardadas) return JSON.parse(guardadas);
    } catch { /* sin almacenamiento del navegador: se sigue igual */ }
    return ["General"];
  });
  const [seccionActiva, setSeccionActiva] = useState("General");
  const [seccionesColapsadas, setSeccionesColapsadas] = useState({});
  const [menuPlusAbierto, setMenuPlusAbierto] = useState(false);
  const [modalSeccion, setModalSeccion] = useState(false);
  const [nombreNuevaSeccion, setNombreNuevaSeccion] = useState("");
  const inputNuevaSeccionRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem("ingeanclajes_secciones_personales", JSON.stringify(secciones));
    } catch { /* sin almacenamiento del navegador: se sigue igual */ }
  }, [secciones]);

  const todasLasSecciones = useMemo(() => {
    const s = new Set(secciones);
    tareas.forEach((t) => {
      if (t.seccion) s.add(t.seccion);
    });
    if (!s.has("General")) s.add("General");
    return Array.from(s);
  }, [secciones, tareas]);

  const toggleColapsarSeccion = (sec) => {
    setSeccionesColapsadas((prev) => ({
      ...prev,
      [sec]: !prev[sec],
    }));
  };

  const crearSeccion = (nombre) => {
    const limpio = (nombre || "").trim();
    if (!limpio) return;
    if (!secciones.includes(limpio)) {
      setSecciones((prev) => [...prev, limpio]);
    }
    setSeccionActiva(limpio);
    setNombreNuevaSeccion("");
    setModalSeccion(false);
  };

  const eliminarSeccion = async (sec) => {
    if (sec === "General") return;
    if (!(await confirmar(`¿Eliminar la lista desplegable "${sec}"?\n\nLas tareas pasarán a General.`))) return;
    setTareas((prev) =>
      (prev || []).map((t) => (t.seccion === sec ? { ...t, seccion: "General" } : t))
    );
    setSecciones((prev) => prev.filter((s) => s !== sec));
    if (seccionActiva === sec) setSeccionActiva("General");
  };

  useEffect(() => () => clearTimeout(timerDeshacer.current), []);

  const nombre = ctx?.membresia?.nombre || ctx?.authUserEmail || "";
  const hechas = tareas.filter((t) => t.completada).length;
  const pendientes = tareas.length - hechas;

  const visibles = useMemo(() => {
    if (filtro === "pendientes") return tareas.filter((t) => !t.completada);
    if (filtro === "completadas") return tareas.filter((t) => t.completada);
    return tareas;
  }, [tareas, filtro]);

  const ofrecerDeshacer = (eliminadas, mensaje) => {
    clearTimeout(timerDeshacer.current);
    setDeshacer({ eliminadas, mensaje });
    timerDeshacer.current = setTimeout(() => setDeshacer(null), 6000);
  };

  const agregar = (e, seccionDestino) => {
    e?.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    const sec = seccionDestino || seccionActiva || "General";
    setTareas((prev) => [
      ...(prev || []),
      {
        id: nuevoId(),
        texto: limpio,
        fecha: hoyIso(),
        completada: false,
        completadaEn: null,
        seccion: sec,
      },
    ]);
    setTexto("");
    if (filtro === "completadas") setFiltro("todas");
    inputRef.current?.focus();
  };

  const toggle = (id) => {
    setTareas((prev) =>
      (prev || []).map((t) =>
        t.id === id
          ? { ...t, completada: !t.completada, completadaEn: t.completada ? null : new Date().toISOString() }
          : t
      )
    );
  };

  const guardarTexto = (id, nuevo) => {
    setTareas((prev) => (prev || []).map((t) => (t.id === id ? { ...t, texto: nuevo } : t)));
  };

  const eliminar = (id) => {
    const indice = tareas.findIndex((t) => t.id === id);
    if (indice < 0) return;
    const tarea = tareas[indice];
    setTareas((prev) => (prev || []).filter((t) => t.id !== id));
    ofrecerDeshacer([{ tarea, indice }], "Tarea eliminada");
  };

  const limpiarCompletadas = () => {
    const eliminadas = tareas
      .map((tarea, indice) => ({ tarea, indice }))
      .filter(({ tarea }) => tarea.completada);
    if (!eliminadas.length) return;
    setTareas((prev) => (prev || []).filter((t) => !t.completada));
    ofrecerDeshacer(
      eliminadas,
      eliminadas.length === 1 ? "1 tarea completada eliminada" : `${eliminadas.length} tareas completadas eliminadas`
    );
  };

  const restaurar = () => {
    if (!deshacer) return;
    setTareas((prev) => {
      const lista = [...(prev || [])];
      // Se reinsertan de menor a mayor indice para que cada una vuelva a su sitio.
      for (const { tarea, indice } of deshacer.eliminadas) {
        if (lista.some((t) => t.id === tarea.id)) continue;
        lista.splice(Math.min(indice, lista.length), 0, tarea);
      }
      return lista;
    });
    clearTimeout(timerDeshacer.current);
    setDeshacer(null);
  };

  return (
    <div style={{ width: "100%", padding: "4px 0 24px" }}>
    <div className="mt-card" style={{ ...CD, padding: "28px 28px 20px", maxWidth: 860, margin: "0 auto", width: "100%" }}>
      <style>{ESTILOS}</style>

      {/* Encabezado */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 22 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: NARANJA,
            }}
          >
            Lista personal
          </div>
          <h2
            className="mt-titulo"
            style={{
              whiteSpace: "nowrap",
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              margin: "2px 0 0",
              color: "var(--text-main, #101828)",
              lineHeight: 1.1,
            }}
          >
            Mis tareas
          </h2>
          <div style={{ fontSize: 13, color: "var(--text-muted, #667085)", marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              {nombre ? `${nombre} · ` : ""}Solo tú ves esta lista
            </span>
          </div>
        </div>

        {tareas.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-main, #101828)", fontVariantNumeric: "tabular-nums" }}>
                {hechas}
                <span style={{ color: "var(--text-muted, #98a2b3)", fontWeight: 600 }}> / {tareas.length}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted, #667085)", fontWeight: 500 }}>
                {pendientes === 0 ? "Todo al día" : `${pendientes} pendiente${pendientes === 1 ? "" : "s"}`}
              </div>
            </div>
            <AnilloProgreso hechas={hechas} total={tareas.length} />
          </div>
        )}
      </div>

      {/* Nueva tarea */}
      <div style={{ position: "relative" }}>
        <form className="mt-composer" onSubmit={agregar}>
          <button
            type="button"
            onClick={() => setMenuPlusAbierto(!menuPlusAbierto)}
            title="Opciones de listas desplegables"
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: NARANJA,
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: "none",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <input
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={`Nueva tarea en ${seccionActiva}…`}
            enterKeyHint="done"
            aria-label="Nueva tarea"
          />

          {todasLasSecciones.length > 1 && (
            <select
              value={seccionActiva}
              onChange={(e) => setSeccionActiva(e.target.value)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-muted, #667085)",
                background: "rgba(0,0,0,0.04)",
                border: "none",
                borderRadius: 8,
                padding: "5px 8px",
                outline: "none",
                cursor: "pointer",
              }}
              title="Lista desplegable donde se guardará"
            >
              {todasLasSecciones.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          )}

          {texto.trim() && (
            <button
              type="submit"
              style={{
                border: "none",
                background: NARANJA,
                color: "#fff",
                fontWeight: 600,
                fontSize: 12.5,
                borderRadius: 8,
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 1px 2px rgba(244,124,32,.3)",
              }}
            >
              Agregar
            </button>
          )}
        </form>

        {/* Menú Desplegable flotante del botón (+) */}
        {menuPlusAbierto && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "100%",
              marginTop: 6,
              background: "#ffffff",
              border: "1px solid var(--border, rgba(0,0,0,0.1))",
              borderRadius: 14,
              boxShadow: "0 12px 30px -4px rgba(0,0,0,0.15)",
              padding: 6,
              zIndex: 9999,
              width: 270,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted, #86868b)", textTransform: "uppercase", padding: "4px 8px 6px", letterSpacing: "0.05em" }}>
              Opciones de Tareas
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuPlusAbierto(false);
                inputRef.current?.focus();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--text-main, #101828)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f7")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span>☑️</span>
              <span>Añadir tarea normal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuPlusAbierto(false);
                setModalSeccion(true);
                setTimeout(() => inputNuevaSeccionRef.current?.focus(), 80);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--text-main, #101828)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f7")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span>📂</span>
              <div>
                <div>Nueva lista desplegable</div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted, #667085)", fontWeight: 400 }}>
                  Categoría colapsable con flecha ▶
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Filtros y Acción Nueva Lista Desplegable */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", margin: "18px 0 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {tareas.length > 0 && (
            <div className="mt-seg" role="tablist">
              {[
                { id: "todas", label: `Todas ${tareas.length}` },
                { id: "pendientes", label: `Pendientes ${pendientes}` },
                { id: "completadas", label: `Completadas ${hechas}` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filtro === f.id}
                  className={filtro === f.id ? "activo" : ""}
                  onClick={() => setFiltro(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setModalSeccion(true);
              setTimeout(() => inputNuevaSeccionRef.current?.focus(), 80);
            }}
            style={{
              border: "1px dashed var(--border, rgba(0,0,0,0.15))",
              background: "transparent",
              color: "var(--text-main, #101828)",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              padding: "5px 10px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-subtle, #f5f5f7)";
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--border, rgba(0,0,0,0.15))";
            }}
          >
            <span>+</span>
            <span>Nueva lista desplegable</span>
          </button>
        </div>

        {hechas > 0 && (
          <button
            type="button"
            onClick={limpiarCompletadas}
            style={{
              border: "none",
              background: "transparent",
              color: NARANJA,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              padding: "4px 2px",
            }}
          >
            Limpiar completadas
          </button>
        )}
      </div>

      {/* Lista de Tareas organizada en Listas Desplegables */}
      {tareas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "44px 16px 30px" }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 14px",
              borderRadius: 16,
              background: "rgba(244,124,32,.1)",
              color: NARANJA,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main, #101828)" }}>Tu lista está vacía</div>
          <p style={{ fontSize: 13, color: "var(--text-muted, #667085)", margin: "4px 0 0" }}>
            Anota lo que tienes que hacer hoy. Puedes crear listas desplegables para agruparlas.
          </p>
        </div>
      ) : visibles.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", fontSize: 13, color: "var(--text-muted, #667085)" }}>
          {filtro === "pendientes" ? "No tienes tareas pendientes. ¡Buen trabajo!" : "Aún no has completado ninguna tarea."}
        </div>
      ) : (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
          {todasLasSecciones.map((sec) => {
            const tareasSec = visibles.filter((t) => (t.seccion || "General") === sec);
            const totalSec = tareas.filter((t) => (t.seccion || "General") === sec).length;
            const hechasSec = tareas.filter((t) => (t.seccion || "General") === sec && t.completada).length;
            const colapsada = !!seccionesColapsadas[sec];

            // Si hay filtro activo y la sección no tiene tareas visibles, no mostrarla en esa vista
            if (filtro !== "todas" && tareasSec.length === 0) return null;

            return (
              <div
                key={sec}
                style={{
                  border: "1px solid var(--border, rgba(0, 0, 0, 0.07))",
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "var(--surface, #ffffff)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                {/* Encabezado colapsable de la Lista Desplegable */}
                <div
                  onClick={() => toggleColapsarSeccion(sec)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    background: "var(--surface-subtle, #f8f9fa)",
                    cursor: "pointer",
                    userSelect: "none",
                    borderBottom: colapsada ? "none" : "1px solid var(--border, rgba(0,0,0,0.05))",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-subtle, #f8f9fa)")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted, #667085)",
                        display: "inline-block",
                        transform: colapsada ? "none" : "rotate(90deg)",
                        transition: "transform 0.15s ease",
                      }}
                    >
                      ▶
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #101828)" }}>
                      {sec}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: "var(--text-muted, #667085)",
                        background: "rgba(0,0,0,0.05)",
                        padding: "1px 6px",
                        borderRadius: 999,
                      }}
                    >
                      {hechasSec}/{totalSec}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setSeccionActiva(sec);
                        inputRef.current?.focus();
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: NARANJA,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: "2px 6px",
                        borderRadius: 6,
                      }}
                      title={`Escribir tarea en ${sec}`}
                    >
                      + Tarea
                    </button>
                    {sec !== "General" && (
                      <button
                        type="button"
                        onClick={() => eliminarSeccion(sec)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "var(--text-muted, #98a2b3)",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: "1px 5px",
                        }}
                        title="Eliminar esta lista desplegable"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenido de la Lista Desplegable (Tareas) */}
                {!colapsada && (
                  <div style={{ padding: "4px 8px 8px" }}>
                    {tareasSec.length === 0 ? (
                      <div style={{ padding: "12px 10px", fontSize: 12, color: "var(--text-muted, #98a2b3)", textAlign: "center", fontStyle: "italic" }}>
                        Sin tareas en esta lista. Haz clic en '+ Tarea' arriba para añadir una.
                      </div>
                    ) : (
                      tareasSec.map((t) => (
                        <FilaTarea key={t.id} tarea={t} onToggle={toggle} onGuardarTexto={guardarTexto} onEliminar={eliminar} />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Apple para Crear Nueva Lista Desplegable */}
      {modalSeccion && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setModalSeccion(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 18,
              padding: "24px 24px 20px",
              width: "100%",
              maxWidth: 400,
              boxShadow: "0 20px 50px -10px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em" }}>
                Nueva Lista Desplegable
              </div>
              <div style={{ fontSize: 12.5, color: "#86868b", marginTop: 4 }}>
                Crea una sección colapsable (con flecha ▶) para organizar tus tareas en grupos.
              </div>
            </div>

            <input
              ref={inputNuevaSeccionRef}
              value={nombreNuevaSeccion}
              onChange={(e) => setNombreNuevaSeccion(e.target.value)}
              placeholder="Ej. Logros del ciclo, Obra, Compras..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  crearSeccion(nombreNuevaSeccion);
                } else if (e.key === "Escape") {
                  setModalSeccion(false);
                }
              }}
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                color: "#1d1d1f",
                outline: "none",
                background: "#f5f5f7",
                width: "100%",
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setModalSeccion(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#6e6e73",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => crearSeccion(nombreNuevaSeccion)}
                style={{
                  background: NARANJA,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(244,124,32,0.3)",
                }}
              >
                Crear Lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deshacer */}
      {deshacer && (
        <div
          className="mt-toast"
          role="status"
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 12px 10px 18px",
            borderRadius: 999,
            background: "rgba(16, 24, 40, 0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 12px 30px -8px rgba(0,0,0,.35)",
            maxWidth: "92vw",
          }}
        >
          <span>{deshacer.mensaje}</span>
          <button
            type="button"
            onClick={restaurar}
            style={{
              border: "none",
              background: "rgba(255,255,255,.14)",
              color: "#ffb37a",
              fontWeight: 700,
              fontSize: 12.5,
              borderRadius: 999,
              padding: "5px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Deshacer
          </button>
          </div>
        )}
      </div>
    </div>
  );
}
