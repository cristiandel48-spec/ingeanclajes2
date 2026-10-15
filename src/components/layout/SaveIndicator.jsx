import { useAppData } from "../../context/AppDataContext";
import { StatusPill } from "../ui";
import { TIPO } from "../../styles/designTokens";

// Muestra si los cambios estan guardados en la nube. Es la senal que faltaba:
// antes un fallo de red solo quedaba en la consola del navegador.
//
// Es una StatusPill del kit, igual que «En línea» y «Mañana»: los tres decian
// lo mismo -un punto de color y una palabra- con tres formas distintas.
export default function SaveIndicator({ compact = false }) {
  const { saveState, lastSavedAt, hasPendingChanges, loadError, saveError, reintentarGuardado } = useAppData();

  // El motivo real del fallo: sin esto habia que abrir la consola del
  // navegador para saber por que no guardaba.
  const motivo = String(saveError?.message || saveError || "").trim();
  const motivoCarga = String(loadError?.message || loadError || "").trim();

  const hora = lastSavedAt
    ? lastSavedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    : null;

  let estado;
  if (loadError) {
    // Tras una carga fallida la app queda con datos de ejemplo y el backend
    // bloquea el guardado a proposito. La unica salida es recargar.
    estado = {
      tono: "peligro",
      texto: "Sin conexión — recarga la página",
      detalle: "No se pudieron cargar los datos. Lo que ves no es información real y no se está guardando.",
      accion: () => window.location.reload(),
      // Sin esto el aviso decia «sin conexion» y nada mas, y habia que abrir la
      // consola del navegador para saber si fue el token, la red o la base.
      motivo: motivoCarga,
    };
  } else if (saveState === "error") {
    estado = {
      tono: "peligro",
      texto: "Cambios sin guardar",
      detalle: motivo
        ? `${motivo} · Reintentando automáticamente. Toca para reintentar ahora.`
        : "Reintentando automáticamente. Toca para reintentar ahora.",
      accion: reintentarGuardado,
      motivo,
    };
  } else if (saveState === "saving") {
    estado = { tono: "neutro", texto: "Guardando…" };
  } else if (hasPendingChanges) {
    estado = { tono: "aviso", texto: "Cambios pendientes" };
  } else if (saveState === "saved") {
    estado = { tono: "exito", texto: hora ? `Guardado ${hora}` : "Guardado" };
  } else {
    return null;
  }

  const esError = estado.tono === "peligro";

  // Cuando falla, el motivo se muestra debajo del indicador: la persona que
  // usa la app no va a abrir la consola del navegador.
  if (esError && estado.motivo && !compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
        <Pastilla estado={estado} esError={esError} compact={compact} />
        <div style={{
          ...TIPO.caption, color: "var(--danger-text)", maxWidth: 320, textAlign: "right",
          overflow: "hidden",
          // Hasta tres renglones: en una sola linea los mensajes largos se
          // cortaban justo donde estaba el dato que hacia falta.
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
        }}>
          {estado.motivo}
        </div>
      </div>
    );
  }

  return <Pastilla estado={estado} esError={esError} compact={compact} />;
}

function Pastilla({ estado, esError, compact }) {
  const titulo = estado.detalle ? `${estado.texto}. ${estado.detalle}` : estado.texto;
  const pastilla = (
    // En el telefono queda solo el punto: el texto no cabe junto al resto de
    // la barra. El estado sigue anunciandose por el titulo y aria-label.
    <StatusPill tono={estado.tono} aria-label={estado.texto}>
      {compact ? "" : estado.texto}
    </StatusPill>
  );

  if (!esError || !estado.accion) {
    return (
      <span title={titulo} aria-live="polite" style={{ flexShrink: 0, display: "flex" }}>
        {pastilla}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={estado.accion}
      title={titulo}
      aria-live="polite"
      style={{
        background: "none", border: "none", padding: 0, margin: 0,
        cursor: "pointer", flexShrink: 0, display: "flex", borderRadius: 999,
      }}
    >
      {pastilla}
    </button>
  );
}
