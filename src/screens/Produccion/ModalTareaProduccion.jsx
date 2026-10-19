import { useState, useEffect } from "react";
import { abrirWhatsApp } from "../../lib/whatsapp";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { confirmar } from "../../lib/dialogos";

export default function ModalTareaProduccion({
  tarea,
  abierto,
  onCerrar,
  onGuardar,
  onEliminar,
  obras = [],
  empleados = [],
  usuarioActual = "Camila",
}) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    responsable: "Paola",
    asignadoPor: usuarioActual || "Camila",
    obraId: "general",
    obraNombre: "Oficina / General",
    prioridad: "normal",
    estado: "por_hacer",
    fechaLimite: new Date().toISOString().split("T")[0],
    checklist: [],
  });

  const [nuevoItemChecklist, setNuevoItemChecklist] = useState("");

  useEffect(() => {
    if (tarea) {
      setForm({
        ...tarea,
        checklist: Array.isArray(tarea.checklist) ? [...tarea.checklist] : [],
      });
    } else {
      setForm({
        titulo: "",
        descripcion: "",
        responsable: "Paola",
        asignadoPor: usuarioActual || "Camila",
        obraId: (obras && obras[0]?.id) || "general",
        obraNombre: (obras && (obras[0]?.nombre || obras[0]?.cliente)) || "Oficina / General",
        prioridad: "normal",
        estado: "por_hacer",
        fechaLimite: new Date().toISOString().split("T")[0],
        checklist: [],
      });
    }
  }, [tarea, abierto, obras, usuarioActual]);

  if (!abierto) return null;

  // Lista de posibles responsables combinando los estándar (Paola, Camila) y los empleados de nómina/obra
  const listaResponsables = Array.from(
    new Set([
      "Paola",
      "Camila",
      "Carlos Restrepo",
      ...empleados.map((e) => e.nombre || e.nombreCompleto).filter(Boolean),
    ])
  );

  const handleObraChange = (e) => {
    const val = e.target.value;
    if (val === "general") {
      setForm((p) => ({ ...p, obraId: "general", obraNombre: "Oficina / General" }));
    } else {
      const encontrada = (obras || []).find((o) => o.id === val);
      setForm((p) => ({
        ...p,
        obraId: val,
        obraNombre: encontrada?.nombre || encontrada?.cliente || val,
      }));
    }
  };

  const handleAgregarChecklist = () => {
    if (!nuevoItemChecklist.trim()) return;
    setForm((p) => ({
      ...p,
      checklist: [
        ...(p.checklist || []),
        { id: `c-${Date.now()}`, texto: nuevoItemChecklist.trim(), hecha: false },
      ],
    }));
    setNuevoItemChecklist("");
  };

  const toggleChecklistItem = (id) => {
    setForm((p) => ({
      ...p,
      checklist: (p.checklist || []).map((item) =>
        item.id === id ? { ...item, hecha: !item.hecha } : item
      ),
    }));
  };

  const eliminarChecklistItem = (id) => {
    setForm((p) => ({
      ...p,
      checklist: (p.checklist || []).filter((item) => item.id !== id),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      alert("Por favor ingresa un título para la tarea.");
      return;
    }
    onGuardar({
      ...form,
      id: form.id || `TAR-${Date.now().toString().slice(-4)}`,
      fechaActualizacion: new Date().toISOString(),
      fechaCreacion: form.fechaCreacion || new Date().toISOString(),
    });
  };

  const notificarPorWhatsApp = () => {
    const texto = `Hola ${form.responsable}, tienes una tarea asignada en Ingeanclajes:
*${form.titulo}*
Obra: ${form.obraNombre || form.obraId}
Fecha límite: ${form.fechaLimite || "Inmediato"}
Prioridad: ${form.prioridad.toUpperCase()}
${form.descripcion ? `Detalles: ${form.descripcion}` : ""}`;
    abrirWhatsApp("", texto);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 20,
      }}
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface, #ffffff)",
          borderRadius: isMobile ? "20px 20px 0 0" : 20,
          width: "100%",
          maxWidth: 580,
          maxHeight: isMobile ? "92vh" : "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--border, rgba(0,0,0,0.08))",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--border, rgba(0,0,0,0.08))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--surface-subtle, #fbfbfd)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-subtle, #86868b)",
              }}
            >
              TAREAS CON EL EQUIPO
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>
              {tarea ? "Editar Tarea del Equipo" : "Asignar Tarea al Equipo"}
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "var(--text-subtle, #86868b)",
              padding: "4px 8px",
              borderRadius: 8,
            }}
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Título de la Tarea */}
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted, #6e6e73)", marginBottom: 6 }}>
              Título de la Tarea *
            </label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ej: Pedir cotización de pernos o Radicar informe Creafam"
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                border: "1px solid var(--border, rgba(0,0,0,0.12))",
                background: "var(--surface, #ffffff)",
                color: "var(--text-main, #1d1d1f)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Responsable y Obra */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted, #6e6e73)", marginBottom: 6 }}>
                Asignar a (Colaborador)
              </label>

              {/* Píldoras rápidas de asignación directa */}
              <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
                {["Paola", "Carlos Restrepo", "Camila"].map((nombre) => {
                  const sel = form.responsable === nombre;
                  return (
                    <button
                      key={nombre}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, responsable: nombre }))}
                      style={{
                        background: sel ? "#1d1d1f" : "var(--surface-subtle, #f5f5f7)",
                        color: sel ? "#ffffff" : "var(--text-main, #1d1d1f)",
                        border: `1px solid ${sel ? "#1d1d1f" : "var(--border, rgba(0,0,0,0.12))"}`,
                        borderRadius: 16,
                        padding: "3px 8px",
                        fontSize: 11,
                        fontWeight: sel ? 700 : 500,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span>{nombre === "Paola" ? "👩‍💼" : nombre === "Camila" ? "👩‍💻" : "👨‍🔧"}</span>
                      <span>{nombre}</span>
                    </button>
                  );
                })}
              </div>

              <select
                value={form.responsable}
                onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: "1px solid var(--border, rgba(0,0,0,0.12))",
                  background: "var(--surface, #ffffff)",
                  color: "var(--text-main, #1d1d1f)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                {listaResponsables.map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted, #6e6e73)", marginBottom: 6 }}>
                Obra Vinculada
              </label>
              <select
                value={form.obraId}
                onChange={handleObraChange}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  fontSize: 13,
                  borderRadius: 10,
                  border: "1px solid var(--border, rgba(0,0,0,0.12))",
                  background: "var(--surface, #ffffff)",
                  color: "var(--text-main, #1d1d1f)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="general">🏢 Oficina / General (Sin obra)</option>
                {(obras || []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} · {o.nombre || o.cliente}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha Límite, Prioridad y Estado */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted, #6e6e73)", marginBottom: 6 }}>
                Fecha Límite
              </label>

              {/* Atajos de fecha rápida */}
              <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
                {[
                  { label: "Hoy", dias: 0 },
                  { label: "Mañana", dias: 1 },
                  { label: "+3 días", dias: 3 },
                  { label: "+1 semana", dias: 7 },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + s.dias * 86400000);
                      setForm((p) => ({ ...p, fechaLimite: d.toISOString().split("T")[0] }));
                    }}
                    style={{
                      background: "var(--surface-subtle, #f5f5f7)",
                      border: "1px solid var(--border, rgba(0,0,0,0.08))",
                      borderRadius: 6,
                      padding: "2px 6px",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-muted, #6e6e73)",
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <input
                type="date"
                value={form.fechaLimite}
                onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 12.5,
                  borderRadius: 10,
                  border: "1px solid var(--border, rgba(0,0,0,0.12))",
                  background: "var(--surface, #ffffff)",
                  color: "var(--text-main, #1d1d1f)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted, #6e6e73)", marginBottom: 6 }}>
                Prioridad
              </label>
              <select
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 12.5,
                  borderRadius: 10,
                  border: "1px solid var(--border, rgba(0,0,0,0.12))",
                  background: "var(--surface, #ffffff)",
                  color: "var(--text-main, #1d1d1f)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="normal">Normal</option>
                <option value="alta">⚡ Alta</option>
                <option value="urgente">🔥 Urgente / Crítica</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted, #6e6e73)", marginBottom: 6 }}>
                Estado
              </label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 12.5,
                  borderRadius: 10,
                  border: "1px solid var(--border, rgba(0,0,0,0.12))",
                  background: "var(--surface, #ffffff)",
                  color: "var(--text-main, #1d1d1f)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="por_hacer">Por Hacer</option>
                <option value="en_proceso">⚡ En Ejecución</option>
                <option value="en_revision">👀 En Revisión</option>
                <option value="completada">Completada</option>
              </select>
            </div>
          </div>

          {/* Instrucciones y Detalles */}
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted, #6e6e73)", marginBottom: 6 }}>
              Instrucciones / Observaciones
            </label>
            <textarea
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Escribe detalles claros, especificaciones o contactos para el colaborador..."
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: 13,
                lineHeight: 1.45,
                borderRadius: 10,
                border: "1px solid var(--border, rgba(0,0,0,0.12))",
                background: "var(--surface, #ffffff)",
                color: "var(--text-main, #1d1d1f)",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Checklist / Subtareas */}
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted, #6e6e73)", marginBottom: 6 }}>
              Checklist / Pasos de verificación
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                value={nuevoItemChecklist}
                onChange={(e) => setNuevoItemChecklist(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAgregarChecklist();
                  }
                }}
                placeholder="Agregar paso (ej: Verificar fotos, Entregar factura)..."
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  fontSize: 12.5,
                  borderRadius: 8,
                  border: "1px solid var(--border, rgba(0,0,0,0.12))",
                  background: "var(--surface, #ffffff)",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={handleAgregarChecklist}
                style={{
                  background: "var(--surface-subtle, #f5f5f7)",
                  border: "1px solid var(--border, rgba(0,0,0,0.12))",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Añadir
              </button>
            </div>

            {Array.isArray(form.checklist) && form.checklist.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  background: "var(--surface-subtle, #f9f9fb)",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid var(--border, rgba(0,0,0,0.06))",
                }}
              >
                {form.checklist.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      fontSize: 12.5,
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(item.hecha)}
                        onChange={() => toggleChecklistItem(item.id)}
                        style={{ accentColor: "#1d1d1f" }}
                      />
                      <span
                        style={{
                          textDecoration: item.hecha ? "line-through" : "none",
                          color: item.hecha ? "var(--text-subtle, #86868b)" : "var(--text-main, #1d1d1f)",
                        }}
                      >
                        {item.texto}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => eliminarChecklistItem(item.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-subtle, #86868b)",
                        fontSize: 11,
                        cursor: "pointer",
                        padding: "2px 4px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botonera de Acciones del Modal */}
          <div
            style={{
              paddingTop: 14,
              borderTop: "1px solid var(--border, rgba(0,0,0,0.08))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {tarea && onEliminar && (
                <button
                  type="button"
                  onClick={async () => {
                    if (await confirmar({ titulo: "¿Seguro que deseas eliminar esta tarea?", textoConfirmar: "Eliminar", destructivo: true })) {
                      onEliminar(tarea.id);
                    }
                  }}
                  style={{
                    background: "#fef2f2",
                    color: "#b91c1c",
                    border: "1px solid #fecaca",
                    borderRadius: 10,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Eliminar
                </button>
              )}
              <button
                type="button"
                onClick={notificarPorWhatsApp}
                title="Abrir WhatsApp para compartir esta tarea"
                style={{
                  background: "#ecfdf5",
                  color: "#047857",
                  border: "1px solid #a7f3d0",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>WhatsApp</span>
              </button>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onCerrar}
                style={{
                  background: "var(--surface, #ffffff)",
                  color: "var(--text-main, #101828)",
                  border: "1px solid var(--border, rgba(0,0,0,0.12))",
                  borderRadius: 10,
                  padding: "8px 16px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: "#1d1d1f",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 20px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              >
                {tarea ? "Guardar Cambios" : "✓ Asignar Tarea al Equipo"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
