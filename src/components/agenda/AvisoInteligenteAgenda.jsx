import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../../context/AppDataContext";
import {
  reproducirSonidoNotificacion,
  mostrarNotificacionEscritorio,
} from "../../lib/sonidoNotificacion";
import { B } from "../../styles/tokens";

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_COMPLETO = [
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
];

function formatFechaLarga(isoStr) {
  if (!isoStr) return "";
  const [y, m, d] = isoStr.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  const diaSemana = DIAS_COMPLETO[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1];
  return `${diaSemana}, ${d} de ${MESES[m - 1]} de ${y}`;
}

const TIPOS_COMPROMISO = {
  visita: {
    label: "Visita a Obra",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fde68a",
  },
  llamada: {
    label: "Llamada",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#dbeafe",
  },
  reunion: {
    label: "Reunión",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ede9fe",
  },
  coordinacion: {
    label: "Coordinación",
    color: "#059669",
    bg: "#ecfdf5",
    border: "#d1fae5",
  },
};

function IconoTipo({ tipo, size = 15 }) {
  if (tipo === "visita") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  }
  if (tipo === "llamada") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }
  if (tipo === "reunion") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export default function AvisoInteligenteAgenda({ onIrAAgenda }) {
  const { agenda } = useAppData();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoCierre, setModoCierre] = useState(false);
  const [accionConfirmarCierre, setAccionConfirmarCierre] = useState(null);

  const hoyIso = useMemo(() => toIso(new Date()), []);
  const mananaIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toIso(d);
  }, []);

  // Compromisos de mañana no completados
  const compromisosManana = useMemo(() => {
    if (!Array.isArray(agenda)) return [];
    return agenda
      .filter((item) => item.fecha === mananaIso && item.estado !== "completado")
      .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
  }, [agenda, mananaIso]);

  // Compromisos de hoy aún pendientes (por si hay trabajo por cerrar hoy)
  const compromisosHoyPendientes = useMemo(() => {
    if (!Array.isArray(agenda)) return [];
    return agenda.filter((item) => item.fecha === hoyIso && item.estado !== "completado");
  }, [agenda, hoyIso]);

  // Escuchar evento personalizado para abrir el modal desde cualquier lugar (Topbar, menú, etc.)
  useEffect(() => {
    const handleAbrirAviso = (e) => {
      if (e.detail?.modo === "cierre_sesion") {
        setModoCierre(true);
        setAccionConfirmarCierre(() => e.detail?.onConfirmar);
      } else {
        setModoCierre(false);
        setAccionConfirmarCierre(null);
      }
      setModalAbierto(true);
      reproducirSonidoNotificacion({ volumen: 0.25 });
    };

    window.addEventListener("abrir-aviso-agenda-manana", handleAbrirAviso);
    return () => window.removeEventListener("abrir-aviso-agenda-manana", handleAbrirAviso);
  }, []);

  // Auto-disparo inteligente: En la tarde (a partir de las 13:00) o al final de la jornada,
  // si hay compromisos mañana y aún no se ha mostrado hoy el recordatorio.
  useEffect(() => {
    if (compromisosManana.length === 0) return;

    const claveVisto = `agenda_aviso_manana_visto_${hoyIso}`;
    const yaVistoHoy = localStorage.getItem(claveVisto);

    const horaActual = new Date().getHours();
    // Se activa a partir de las 13:00 (1:00 PM) para recordar el día de mañana
    const esMomentoAviso = horaActual >= 13;

    if (esMomentoAviso && !yaVistoHoy) {
      const timer = setTimeout(() => {
        setModoCierre(false);
        setAccionConfirmarCierre(null);
        setModalAbierto(true);
        reproducirSonidoNotificacion({ volumen: 0.25 });

        // Notificación de escritorio si está en otra pestaña o minimizado
        const primerCompromiso = compromisosManana[0];
        mostrarNotificacionEscritorio({
          titulo: "📅 Agenda de mañana · Ingeanclajes",
          cuerpo: `Recuerda: Mañana tienes ${compromisosManana.length} compromiso(s). El primero a las ${primerCompromiso.hora || "primera hora"} en ${primerCompromiso.obra || primerCompromiso.titulo}.`,
          alHacerClic: () => {
            onIrAAgenda?.();
          },
        });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [compromisosManana, hoyIso, onIrAAgenda]);

  const marcarComoVisto = () => {
    try {
      localStorage.setItem(`agenda_aviso_manana_visto_${hoyIso}`, "true");
    } catch {
      // Ignorar si localStorage está restringido
    }
  };

  const cerrarModal = () => {
    marcarComoVisto();
    setModalAbierto(false);
    setModoCierre(false);
    setAccionConfirmarCierre(null);
  };

  const irAAgendaCompleta = () => {
    cerrarModal();
    onIrAAgenda?.();
  };

  const confirmarSalida = () => {
    marcarComoVisto();
    setModalAbierto(false);
    if (typeof accionConfirmarCierre === "function") {
      accionConfirmarCierre();
    }
  };

  const enviarWhatsApp = (item) => {
    const telLimpio = String(item.telefono || "").replace(/[^0-9]/g, "");
    if (!telLimpio) return;
    const telConPais = telLimpio.startsWith("57") ? telLimpio : `57${telLimpio}`;
    const texto = encodeURIComponent(
      `Hola ${item.contacto || "buen día"}, te escribo de Ingeanclajes para confirmar nuestro compromiso de mañana a las ${item.hora || ""}: ${item.obra || item.titulo}.`
    );
    window.open(`https://wa.me/${telConPais}?text=${texto}`, "_blank");
  };

  const abrirWaze = (item) => {
    const destino = encodeURIComponent(`${item.obra || item.titulo} ${item.ciudad || ""}`);
    window.open(`https://waze.com/ul?q=${destino}&navigate=yes`, "_blank");
  };

  if (!modalAbierto || compromisosManana.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeInModal 0.2s ease-out",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          background: "var(--surface, #ffffff)",
          borderRadius: 20,
          border: "1px solid var(--border, #e2e8f0)",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          boxSizing: "border-box",
        }}
      >
        {/* Encabezado elegante */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border, #f1f5f9)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            background: modoCierre ? "#fff7ed" : "var(--surface-subtle, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: modoCierre ? "#ffedd5" : "#eff6ff",
                color: modoCierre ? "#ea580c" : "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <circle cx="12" cy="15" r="2" />
              </svg>
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: modoCierre ? "#ea580c" : "var(--text-muted, #64748b)",
                }}
              >
                {modoCierre ? "Antes de cerrar sesión" : "Aviso Inteligente de Agenda"}
              </div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  margin: "2px 0 0",
                  color: "var(--text-main, #0f172a)",
                }}
              >
                {compromisosManana.length === 1
                  ? "Tienes 1 compromiso para mañana"
                  : `Tienes ${compromisosManana.length} compromisos para mañana`}
              </h2>
              <div style={{ fontSize: 12.5, color: "var(--text-muted, #64748b)", marginTop: 2 }}>
                {formatFechaLarga(mananaIso)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={cerrarModal}
            aria-label="Cerrar recordatorio"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "var(--text-muted, #94a3b8)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>

        {/* Mensaje de contexto */}
        <div style={{ padding: "12px 24px 8px" }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-main, #334155)", lineHeight: 1.5 }}>
            {modoCierre
              ? "Antes de salir de la plataforma, ten presente tu itinerario de mañana temprano:"
              : "Revisa los compromisos programados para mañana para que puedas coordinar rutas, traslados o llamadas a tiempo:"}
          </p>
        </div>

        {/* Lista de citas de mañana */}
        <div
          style={{
            padding: "8px 24px 16px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxHeight: 340,
          }}
        >
          {compromisosManana.map((item) => {
            const conf = TIPOS_COMPROMISO[item.tipo] || TIPOS_COMPROMISO.visita;

            return (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 14,
                  padding: 14,
                  background: "var(--surface, #ffffff)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                {/* Cabecera del compromiso */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: conf.bg,
                      color: conf.color,
                    }}
                  >
                    <IconoTipo tipo={item.tipo} size={12} />
                    {conf.label}
                  </span>

                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--text-main, #0f172a)",
                      background: "var(--surface-subtle, #f1f5f9)",
                      padding: "2px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {item.hora || "Sin hora fijada"}
                  </span>
                </div>

                {/* Título de la obra / cliente */}
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-main, #0f172a)" }}>
                  {item.obra || item.titulo}
                </div>
                {item.cliente && (
                  <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginTop: 2 }}>
                    {item.cliente} {item.ciudad ? `· ${item.ciudad}` : ""}
                  </div>
                )}

                {/* Contacto */}
                {(item.contacto || item.telefono) && (
                  <div
                    style={{
                      fontSize: 11.5,
                      marginTop: 8,
                      padding: "5px 8px",
                      background: "var(--surface-subtle, #f8fafc)",
                      borderRadius: 6,
                      color: "var(--text-muted, #475569)",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "var(--text-main, #0f172a)" }}>
                      {item.contacto || "Contacto"}:
                    </span>{" "}
                    {item.telefono && (
                      <span style={{ color: "#2563eb", fontWeight: 600 }}>{item.telefono}</span>
                    )}
                  </div>
                )}

                {/* Requerimiento SST */}
                {item.requerimientoSst && (
                  <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginTop: 4 }}>
                    SST: {item.requerimientoSst}
                  </div>
                )}

                {/* Botones de acción directa */}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {item.telefono && (
                    <button
                      type="button"
                      onClick={() => enviarWhatsApp(item)}
                      style={{
                        ...B("#25D366"),
                        fontSize: 11,
                        padding: "4px 8px",
                        borderRadius: 6,
                      }}
                    >
                      WhatsApp
                    </button>
                  )}

                  {(item.obra || item.ciudad) && item.tipo === "visita" && (
                    <button
                      type="button"
                      onClick={() => abrirWaze(item)}
                      style={{
                        ...B("var(--surface-subtle, #f1f5f9)", "var(--text-main, #0f172a)"),
                        border: "1px solid var(--border, #e2e8f0)",
                        fontSize: 11,
                        padding: "4px 8px",
                        borderRadius: 6,
                      }}
                    >
                      Waze
                    </button>
                  )}


                  {item.linkReunion && (
                    <a
                      href={item.linkReunion}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...B("#7c3aed"),
                        fontSize: 11,
                        padding: "4px 8px",
                        borderRadius: 6,
                        textDecoration: "none",
                      }}
                    >
                      Unirse
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Compromisos de hoy pendientes advertencia sutil */}
        {compromisosHoyPendientes.length > 0 && (
          <div
            style={{
              padding: "8px 24px",
              background: "#fef3c7",
              borderTop: "1px solid #fde68a",
              borderBottom: "1px solid #fde68a",
              fontSize: 11.5,
              color: "#92400e",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>⚠️</span>
            <span>
              Nota: Aún tienes {compromisosHoyPendientes.length} compromiso(s) pendiente(s) de hoy por marcar como realizados.
            </span>
          </div>
        )}

        {/* Barra de acciones inferior */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border, #f1f5f9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "var(--surface-subtle, #f8fafc)",
          }}
        >
          <button
            type="button"
            onClick={irAAgendaCompleta}
            style={{
              ...B("var(--surface, #ffffff)", "var(--text-main, #0f172a)"),
              border: "1px solid var(--border, #cbd5e1)",
              fontSize: 12.5,
              padding: "7px 14px",
            }}
          >
            Ver Agenda completa
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            {modoCierre ? (
              <>
                <button
                  type="button"
                  onClick={cerrarModal}
                  style={{
                    ...B("var(--surface, #ffffff)", "var(--text-muted, #475569)"),
                    border: "1px solid var(--border, #cbd5e1)",
                    fontSize: 12.5,
                    padding: "7px 14px",
                  }}
                >
                  Seguir en el sistema
                </button>
                <button
                  type="button"
                  onClick={confirmarSalida}
                  style={{
                    ...B("#ea580c"),
                    fontSize: 12.5,
                    padding: "7px 14px",
                  }}
                >
                  Cerrar sesión ahora
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={cerrarModal}
                style={{
                  ...B("#0f172a"),
                  fontSize: 12.5,
                  padding: "7px 16px",
                }}
              >
                Entendido, gracias
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
