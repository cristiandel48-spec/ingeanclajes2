import { useMemo, useRef, useState, useEffect } from "react";
import { CD } from "../../styles/tokens";
import DocumentosEquipo from "../Produccion/DocumentosEquipo";

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
  const [modoVista, setModoVista] = useState("personal"); // "personal" | "equipo"
  const [deshacer, setDeshacer] = useState(null); // { tareas, indice, mensaje }
  const timerDeshacer = useRef(null);
  const inputRef = useRef(null);

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

  const agregar = (e) => {
    e?.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    setTareas((prev) => [
      ...(prev || []),
      { id: nuevoId(), texto: limpio, fecha: hoyIso(), completada: false, completadaEn: null },
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
      {/* Selector Superior Estilo Apple: Personal vs Equipo */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <div
          style={{
            display: "inline-flex",
            background: "var(--surface-subtle, #f1f3f5)",
            padding: 3,
            borderRadius: 12,
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            maxWidth: "100%",
            overflowX: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => setModoVista("personal")}
            style={{
              padding: "6px 16px",
              fontSize: 12.5,
              fontWeight: modoVista === "personal" ? 700 : 500,
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              background: modoVista === "personal" ? "#ffffff" : "transparent",
              color: modoVista === "personal" ? "#101828" : "#667085",
              boxShadow: modoVista === "personal" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            ✓ Mis Tareas Personales
          </button>
          <button
            type="button"
            onClick={() => setModoVista("equipo")}
            style={{
              padding: "6px 16px",
              fontSize: 12.5,
              fontWeight: modoVista === "equipo" ? 700 : 500,
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              background: modoVista === "equipo" ? "#ffffff" : "transparent",
              color: modoVista === "equipo" ? "#101828" : "#667085",
              boxShadow: modoVista === "equipo" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            📄 Documentos &amp; Tareas
          </button>
        </div>
      </div>

      {modoVista === "equipo" ? (
        <div style={{ maxWidth: 1360, margin: "0 auto", width: "100%" }}>
          <DocumentosEquipo
            obras={ctx?.obras}
            empleados={ctx?.empleados}
            usuarioActual={nombre || "Camila"}
            documentosExternos={ctx?.documentosEquipo}
            onActualizarDocumentos={ctx?.setDocumentosEquipo}
          />
        </div>
      ) : (
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
      <form className="mt-composer" onSubmit={agregar}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: NARANJA,
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <input
          ref={inputRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nueva tarea…"
          enterKeyHint="done"
          aria-label="Nueva tarea"
        />
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

      {/* Filtros */}
      {tareas.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", margin: "18px 0 6px" }}>
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
      )}

      {/* Lista */}
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
            Anota lo que tienes que hacer hoy. Al terminar una tarea, haz clic y quedará tachada.
          </p>
        </div>
      ) : visibles.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", fontSize: 13, color: "var(--text-muted, #667085)" }}>
          {filtro === "pendientes" ? "No tienes tareas pendientes. ¡Buen trabajo!" : "Aún no has completado ninguna tarea."}
        </div>
      ) : (
        <div style={{ marginTop: 4 }}>
          {visibles.map((t) => (
            <FilaTarea key={t.id} tarea={t} onToggle={toggle} onGuardarTexto={guardarTexto} onEliminar={eliminar} />
          ))}
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
      )}
    </div>
  );
}
