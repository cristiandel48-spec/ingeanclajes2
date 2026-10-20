import { useState, useEffect } from "react";
import { B, SI } from "../../styles/tokens";
import { getFestivoColombia } from "../../lib/festivosColombia";
import { SUGERENCIAS_FECHAS_ESPECIALES } from "../../lib/agendaEspecial";
import { confirmar } from "../../lib/dialogos";
import { today } from "../../lib/format";

const ICONOS_DISPONIBLES = [
  { id: "⭐", label: "Estrellita" },
  { id: "💖", label: "Corazón" },
  { id: "✨", label: "Destello" },
  { id: "🌹", label: "Rosa" },
  { id: "🥂", label: "Brindis" },
  { id: "🎂", label: "Pastel" },
];

export default function ModalEstrellitaEspecial({
  abierto,
  onCerrar,
  fechaInicial,
  itemEdicion = null,
  onGuardar,
  onEliminar,
}) {
  const [fecha, setFecha] = useState("");
  const [titulo, setTitulo] = useState("");
  const [notas, setNotas] = useState("");
  const [hora, setHora] = useState("");
  const [icono, setIcono] = useState("⭐");

  useEffect(() => {
    if (abierto) {
      if (itemEdicion) {
        setFecha(itemEdicion.fecha || fechaInicial || "");
        setTitulo(itemEdicion.titulo || "");
        setNotas(itemEdicion.notas || "");
        setHora(itemEdicion.hora || "");
        setIcono(itemEdicion.icono || "⭐");
      } else {
        setFecha(fechaInicial || today());
        setTitulo("");
        setNotas("");
        setHora("");
        setIcono("⭐");
      }
    }
  }, [abierto, fechaInicial, itemEdicion]);

  if (!abierto) return null;

  const festivo = getFestivoColombia(fecha);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      alert("Por favor ingresa un título o motivo para esta fecha especial.");
      return;
    }

    onGuardar({
      id: itemEdicion?.id,
      fecha,
      titulo: titulo.trim(),
      notas: notas.trim(),
      hora: hora.trim(),
      icono,
    });
  };

  const handleEliminar = async () => {
    // Sin «Guardando…»: onEliminar vuelve a preguntar y es el que borra.
    if (await confirmar({ titulo: "¿Deseas quitar esta estrellita y fecha especial?", textoConfirmar: "Quitar", destructivo: true, conGuardando: false })) {
      onEliminar(itemEdicion.id);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 16,
      }}
      onClick={onCerrar}
    >
      <div
        style={{
          background: "var(--surface, #ffffff)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 520,
          padding: "26px 28px",
          boxShadow:
            "0 25px 50px -12px rgba(245, 158, 11, 0.25), 0 20px 25px -5px rgba(0, 0, 0, 0.15)",
          border: "1.5px solid #fde68a",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con toque dorado romántico */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "linear-gradient(135deg, #fef08a, #f59e0b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.35)",
                flexShrink: 0,
              }}
            >
              {icono}
            </div>
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#b45309",
                  background: "#fef3c7",
                  border: "1px solid #fde68a",
                  padding: "2px 8px",
                  borderRadius: 20,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 3,
                }}
              >
                <span>⭐</span>
                <span>Detalle Privado para Camila</span>
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                }}
              >
                {itemEdicion ? "Editar Fecha Especial" : "Poner Estrellita en el Calendario"}
              </h3>
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
              color: "var(--text-muted, #94a3b8)",
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Notificación de Privacidad */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(254, 243, 199, 0.4), rgba(255, 251, 235, 0.8))",
            border: "1px solid rgba(251, 191, 36, 0.45)",
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>🔒</span>
          <div style={{ fontSize: 11.5, color: "#92400e", lineHeight: 1.4 }}>
            <strong>Privacidad garantizada:</strong> Esta fecha con estrellita{" "}
            <strong>solo le saldrá a Camila Sepúlveda</strong> y a ti (Cristian Flores). Ningún otro
            usuario o empleado de la empresa podrá verla.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Fecha y Hora */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
            <div>
              <label
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--text-muted, #64748b)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                FECHA ESPECIAL
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={{ ...SI, fontWeight: 700 }}
                required
              />
              {festivo && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: "#b91c1c",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span>🇨🇴</span>
                  <span>Festivo: {festivo.nombreCorto || festivo.nombre}</span>
                </div>
              )}
            </div>

            <div>
              <label
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--text-muted, #64748b)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                HORA / MOMENTO
              </label>
              <input
                type="text"
                placeholder="Ej. 8:00 PM o Todo el día"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                style={SI}
              />
            </div>
          </div>

          {/* Selector de Icono / Símbolo */}
          <div>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--text-muted, #64748b)",
                display: "block",
                marginBottom: 6,
              }}
            >
              ÍCONO EN EL CALENDARIO
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ICONOS_DISPONIBLES.map((ic) => (
                <button
                  key={ic.id}
                  type="button"
                  onClick={() => setIcono(ic.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 10,
                    border: icono === ic.id ? "2px solid #f59e0b" : "1px solid var(--border, #e2e8f0)",
                    background: icono === ic.id ? "#fef3c7" : "var(--surface, #ffffff)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: icono === ic.id ? 700 : 500,
                    color: icono === ic.id ? "#92400e" : "var(--text-muted, #64748b)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{ic.id}</span>
                  <span style={{ fontSize: 11.5 }}>{ic.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Título y Sugerencias */}
          <div>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--text-muted, #64748b)",
                display: "block",
                marginBottom: 4,
              }}
            >
              MOTIVO / TÍTULO DE LA FECHA ESPECIAL
            </label>
            <input
              type="text"
              placeholder="Ej: Nuestro Aniversario ❤️, Cumpleaños Camila 🎂"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              style={{ ...SI, fontWeight: 700, fontSize: 14 }}
              required
            />

            {/* Sugerencias Rápidas */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
              {SUGERENCIAS_FECHAS_ESPECIALES.map((sug) => (
                <button
                  key={sug.label}
                  type="button"
                  onClick={() => setTitulo(sug.titulo)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: 8,
                    border: "1px solid var(--border, #e2e8f0)",
                    background: titulo === sug.titulo ? "#fef3c7" : "var(--surface-subtle, #f8fafc)",
                    color: titulo === sug.titulo ? "#b45309" : "var(--text-muted, #64748b)",
                    cursor: "pointer",
                  }}
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mensaje o Dedicatoria para Camila */}
          <div>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--text-muted, #64748b)",
                display: "block",
                marginBottom: 4,
              }}
            >
              MENSAJE O DEDICATORIA PARA CAMILA (OPCIONAL)
            </label>
            <textarea
              placeholder="Escribe unas palabras o sorpresa para Camila cuando abra este día..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              style={{ ...SI, resize: "vertical", fontSize: 13, lineHeight: 1.45 }}
            />
          </div>

          {/* Botones de acción */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
              paddingTop: 14,
              borderTop: "1px solid var(--border, #f1f5f9)",
            }}
          >
            {itemEdicion ? (
              <button
                type="button"
                onClick={handleEliminar}
                style={{
                  background: "transparent",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✕ Quitar estrellita
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={onCerrar}
                style={{
                  ...B("var(--surface-subtle, #f1f5f9)", "var(--text-muted, #64748b)"),
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 10,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 18px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(245, 158, 11, 0.35)",
                }}
              >
                <span>⭐</span>
                <span>{itemEdicion ? "Guardar Cambios" : "Guardar Estrellita"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
