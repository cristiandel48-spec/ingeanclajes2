import { useAppData } from "../../context/AppDataContext";

// Muestra si los cambios estan guardados en la nube. Es la senal que faltaba:
// antes un fallo de red solo quedaba en la consola del navegador.
export default function SaveIndicator({ theme, compact = false }) {
  const { saveState, lastSavedAt, hasPendingChanges, loadError, reintentarGuardado } = useAppData();

  const hora = lastSavedAt
    ? lastSavedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    : null;

  let estado;
  if (loadError) {
    // Tras una carga fallida la app queda con datos de ejemplo y el backend
    // bloquea el guardado a proposito. La unica salida es recargar.
    estado = {
      tipo: "error",
      texto: "Sin conexión — recarga la página",
      detalle: "No se pudieron cargar los datos. Lo que ves no es información real y no se está guardando.",
      accion: () => window.location.reload(),
    };
  } else if (saveState === "error") {
    estado = {
      tipo: "error",
      texto: "Cambios sin guardar",
      detalle: "Reintentando automáticamente. Toca para reintentar ahora.",
      accion: reintentarGuardado,
    };
  } else if (saveState === "saving") {
    estado = { tipo: "activo", texto: "Guardando…" };
  } else if (hasPendingChanges) {
    estado = { tipo: "pendiente", texto: "Cambios pendientes" };
  } else if (saveState === "saved") {
    estado = { tipo: "ok", texto: hora ? `Guardado ${hora}` : "Guardado" };
  } else {
    return null;
  }

  const colores = {
    ok: { fg: "#067647", bg: "rgba(6,118,71,.10)" },
    activo: { fg: theme.muted, bg: theme.surfaceTint },
    pendiente: { fg: "#B54708", bg: "rgba(181,71,8,.10)" },
    error: { fg: "#B42318", bg: "rgba(180,35,24,.10)" },
  }[estado.tipo];

  const esError = estado.tipo === "error";

  return (
    <button
      onClick={estado.accion}
      title={estado.detalle ? `${estado.texto}. ${estado.detalle}` : estado.texto}
      aria-live="polite"
      style={{
        display: "flex", alignItems: "center", gap: 7,
        minHeight: 36, padding: compact ? "0 10px" : "0 12px",
        borderRadius: 999, border: "none",
        background: colores.bg, color: colores.fg,
        fontSize: 12, fontWeight: 600, fontFamily: "inherit",
        cursor: esError ? "pointer" : "default",
        whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: colores.fg,
        flexShrink: 0,
        opacity: estado.tipo === "activo" ? 0.5 : 1,
      }} />
      {!compact && <span>{estado.texto}</span>}
    </button>
  );
}
