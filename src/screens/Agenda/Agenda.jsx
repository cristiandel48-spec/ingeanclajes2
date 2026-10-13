import { useState, useMemo } from "react";
import H1 from "../../components/ui/H1";
import { B, CD, SI } from "../../styles/tokens";
import { EJEMPLOS } from "../../data/ejemplos";
import { abrirWhatsApp } from "../../lib/whatsapp";

// Meses y días en español
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS_COMPLETO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

function parseIso(isoStr) {
  if (!isoStr) return new Date();
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatFechaLarga(isoStr) {
  if (!isoStr) return "";
  const d = parseIso(isoStr);
  const diaSemana = DIAS_COMPLETO[d.getDay() === 0 ? 6 : d.getDay() - 1];
  return `${diaSemana}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

// Configuración visual refinada estilo Apple (sin emojis, usando colores armónicos)
const TIPOS_COMPROMISO = {
  visita: {
    label: "Visita a Obra",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fde68a",
    dot: "#f59e0b",
  },
  llamada: {
    label: "Llamada",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#dbeafe",
    dot: "#3b82f6",
  },
  reunion: {
    label: "Reunión",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ede9fe",
    dot: "#8b5cf6",
  },
  coordinacion: {
    label: "Coordinación",
    color: "#059669",
    bg: "#ecfdf5",
    border: "#d1fae5",
    dot: "#10b981",
  },
};

// Iconos vectoriales minimalistas (estilo Apple SF Symbols)
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

export default function Agenda({ ctx }) {
  const hoyIso = useMemo(() => toIso(new Date()), []);

  // Fuente de datos
  const compromisos = useMemo(() => {
    const lista = ctx?.agenda;
    if (Array.isArray(lista) && lista.length > 0) return lista;
    return EJEMPLOS.agenda || [];
  }, [ctx?.agenda]);

  const setCompromisos = (updater) => {
    if (typeof ctx?.setAgenda === "function") {
      ctx.setAgenda(updater);
    }
  };

  // Estados principales
  const [vista, setVista] = useState("mes"); // "mes" | "agenda"
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyIso);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  // Control del mes visible
  const [calMes, setCalMes] = useState(() => {
    const ahora = new Date();
    return { anio: ahora.getFullYear(), mes: ahora.getMonth() };
  });

  // Modal de creación / edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemEdicion, setItemEdicion] = useState(null);

  const [formTipo, setFormTipo] = useState("visita");
  const [formTitulo, setFormTitulo] = useState("");
  const [formObra, setFormObra] = useState("");
  const [formCliente, setFormCliente] = useState("");
  const [formCiudad, setFormCiudad] = useState("");
  const [formFecha, setFormFecha] = useState(hoyIso);
  const [formHora, setFormHora] = useState("10:00 AM");
  const [formContacto, setFormContacto] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formNotas, setFormNotas] = useState("");
  const [formSst, setFormSst] = useState("");
  const [formLink, setFormLink] = useState("");

  // Mapeo de eventos por fecha
  const eventosPorFecha = useMemo(() => {
    const map = {};
    compromisos.forEach((item) => {
      if (!item.fecha) return;
      if (!map[item.fecha]) map[item.fecha] = [];
      map[item.fecha].push(item);
    });
    return map;
  }, [compromisos]);

  // Cuadrícula del mes
  const celdasMes = useMemo(() => {
    const primerDia = new Date(calMes.anio, calMes.mes, 1);
    const ultimoDia = new Date(calMes.anio, calMes.mes + 1, 0);

    let inicioSemana = primerDia.getDay() - 1;
    if (inicioSemana === -1) inicioSemana = 6;

    const totalDias = ultimoDia.getDate();
    const celdas = [];

    // Días previos
    const diasMesAnterior = new Date(calMes.anio, calMes.mes, 0).getDate();
    for (let i = inicioSemana - 1; i >= 0; i--) {
      celdas.push({
        numero: diasMesAnterior - i,
        otroMes: true,
        iso: null,
      });
    }

    // Días del mes
    for (let d = 1; d <= totalDias; d++) {
      const fecha = new Date(calMes.anio, calMes.mes, d);
      const iso = toIso(fecha);
      celdas.push({
        numero: d,
        otroMes: false,
        iso,
        esHoy: iso === hoyIso,
        esSeleccionado: iso === fechaSeleccionada,
      });
    }

    // Días siguientes hasta completar filas de 7
    let siguiente = 1;
    while (celdas.length % 7 !== 0) {
      celdas.push({
        numero: siguiente++,
        otroMes: true,
        iso: null,
      });
    }

    return celdas;
  }, [calMes, hoyIso, fechaSeleccionada]);

  // Filtrado de compromisos
  const compromisosFiltrados = useMemo(() => {
    return compromisos.filter((item) => {
      if (filtroTipo !== "todos" && item.tipo !== filtroTipo) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const texto = `${item.titulo || ""} ${item.obra || ""} ${item.cliente || ""} ${item.contacto || ""} ${item.notas || ""}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [compromisos, filtroTipo, busqueda]);

  // Compromisos del día seleccionado
  const eventosDelDia = useMemo(() => {
    return compromisosFiltrados.filter((c) => c.fecha === fechaSeleccionada);
  }, [compromisosFiltrados, fechaSeleccionada]);

  // Conteo de tareas pendientes de hoy
  const estadisticas = useMemo(() => {
    const pendientes = compromisos.filter((c) => c.fecha === hoyIso && c.estado !== "completado");
    return {
      visitas: pendientes.filter((c) => c.tipo === "visita").length,
      llamadas: pendientes.filter((c) => c.tipo === "llamada").length,
      reuniones: pendientes.filter((c) => c.tipo === "reunion").length,
      coordinaciones: pendientes.filter((c) => c.tipo === "coordinacion").length,
      totalHoy: pendientes.length,
    };
  }, [compromisos, hoyIso]);

  // Acciones
  const toggleCompletado = (id) => {
    setCompromisos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: c.estado === "completado" ? "pendiente" : "completado" } : c))
    );
  };

  const eliminarCompromiso = (id) => {
    if (window.confirm("¿Deseas eliminar este compromiso?")) {
      setCompromisos((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const abrirNuevoModal = (tipoInicial = "visita") => {
    setItemEdicion(null);
    setFormTipo(tipoInicial);
    setFormTitulo("");
    setFormObra("");
    setFormCliente("");
    setFormCiudad("");
    setFormFecha(fechaSeleccionada);
    setFormHora("10:00 AM");
    setFormContacto("");
    setFormTelefono("");
    setFormNotas("");
    setFormSst("");
    setFormLink("");
    setModalAbierto(true);
  };

  const abrirEditarModal = (item) => {
    setItemEdicion(item);
    setFormTipo(item.tipo || "visita");
    setFormTitulo(item.titulo || "");
    setFormObra(item.obra || "");
    setFormCliente(item.cliente || "");
    setFormCiudad(item.ciudad || "");
    setFormFecha(item.fecha || hoyIso);
    setFormHora(item.hora || "10:00 AM");
    setFormContacto(item.contacto || "");
    setFormTelefono(item.telefono || "");
    setFormNotas(item.notas || "");
    setFormSst(item.requerimientoSst || "");
    setFormLink(item.linkReunion || "");
    setModalAbierto(true);
  };

  const guardarCompromiso = (e) => {
    e.preventDefault();
    if (!formTitulo.trim() && !formObra.trim()) {
      alert("Por favor ingresa un título o el nombre de la obra.");
      return;
    }

    const payload = {
      id: itemEdicion?.id || `AG-${Date.now()}`,
      tipo: formTipo,
      titulo: formTitulo.trim() || `${TIPOS_COMPROMISO[formTipo]?.label || "Compromiso"} - ${formObra.trim()}`,
      obra: formObra.trim(),
      cliente: formCliente.trim(),
      ciudad: formCiudad.trim(),
      fecha: formFecha,
      hora: formHora.trim(),
      contacto: formContacto.trim(),
      telefono: formTelefono.trim(),
      notas: formNotas.trim(),
      requerimientoSst: formSst.trim(),
      linkReunion: formLink.trim(),
      estado: itemEdicion?.estado || "pendiente",
      prioridad: itemEdicion?.prioridad || "normal",
    };

    setCompromisos((prev) => {
      if (itemEdicion) {
        return prev.map((c) => (c.id === itemEdicion.id ? payload : c));
      }
      return [payload, ...prev];
    });

    setModalAbierto(false);
  };

  const enviarWhatsApp = (c) => {
    let msg = "";
    if (c.tipo === "visita") {
      msg = `Hola ${c.contacto || "Ingeniero(a)"}, te saluda Camila Sepúlveda de Ingeanclajes S.A.S. Te confirmo nuestra visita técnica programada para la obra ${c.obra || ""} a las ${c.hora || ""}.`;
    } else if (c.tipo === "llamada") {
      msg = `Hola ${c.contacto || ""}, te escribe Camila Sepúlveda de Ingeanclajes sobre la obra ${c.obra || ""}. ¿A qué hora nos podemos comunicar hoy?`;
    } else {
      msg = `Hola ${c.contacto || ""}, te escribe Camila Sepúlveda de Ingeanclajes sobre ${c.titulo || c.obra || "nuestro compromiso"}.`;
    }
    const err = abrirWhatsApp(c.telefono, msg);
    if (err) alert(err);
  };

  const abrirWaze = (c) => {
    const q = encodeURIComponent(`${c.obra || ""} ${c.ciudad || ""}`);
    window.open(`https://waze.com/ul?q=${q}`, "_blank", "noopener");
  };

  const mesSiguiente = () => {
    setCalMes((prev) => (prev.mes === 11 ? { anio: prev.anio + 1, mes: 0 } : { ...prev, mes: prev.mes + 1 }));
  };

  const mesAnterior = () => {
    setCalMes((prev) => (prev.mes === 0 ? { anio: prev.anio - 1, mes: 11 } : { ...prev, mes: prev.mes - 1 }));
  };

  const irAHoy = () => {
    const ahora = new Date();
    setCalMes({ anio: ahora.getFullYear(), mes: ahora.getMonth() });
    setFechaSeleccionada(hoyIso);
  };

  return (
    <div style={{ padding: "0 0 24px 0", maxWidth: 1400, margin: "0 auto" }}>
      {/* Cabecera Principal */}
      <H1
        title="Agenda & Visitas"
        subtitle="Control de visitas técnicas a obras, llamadas de seguimiento y comités para Camila Sepúlveda"
        action={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Selector de Vista Segmentado estilo Apple */}
            <div
              style={{
                display: "inline-flex",
                background: "var(--surface-subtle, #f1f5f9)",
                padding: 3,
                borderRadius: 10,
                border: "1px solid var(--border, #e2e8f0)",
              }}
            >
              <button
                type="button"
                onClick={() => setVista("mes")}
                style={{
                  padding: "6px 14px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: vista === "mes" ? "var(--surface, #ffffff)" : "transparent",
                  color: vista === "mes" ? "var(--text-main, #0f172a)" : "var(--text-muted, #64748b)",
                  boxShadow: vista === "mes" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Calendario
              </button>
              <button
                type="button"
                onClick={() => setVista("agenda")}
                style={{
                  padding: "6px 14px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: vista === "agenda" ? "var(--surface, #ffffff)" : "transparent",
                  color: vista === "agenda" ? "var(--text-main, #0f172a)" : "var(--text-muted, #64748b)",
                  boxShadow: vista === "agenda" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Lista de Tareas
              </button>
            </div>

            <button
              type="button"
              style={B("#f47c20")}
              onClick={() => abrirNuevoModal("visita")}
            >
              + Nuevo compromiso
            </button>
          </div>
        }
      />

      {/* Franja de Resumen Superior y Filtros */}
      <div
        style={{
          ...CD,
          padding: "14px 20px",
          marginBottom: 20,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        {/* Estadísticas rápidas de hoy */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #0f172a)" }}>
            Hoy para atender:
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: TIPOS_COMPROMISO.visita.bg,
                color: TIPOS_COMPROMISO.visita.color,
                border: `1px solid ${TIPOS_COMPROMISO.visita.border}`,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: TIPOS_COMPROMISO.visita.dot }} />
              {estadisticas.visitas} Visitas
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: TIPOS_COMPROMISO.llamada.bg,
                color: TIPOS_COMPROMISO.llamada.color,
                border: `1px solid ${TIPOS_COMPROMISO.llamada.border}`,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: TIPOS_COMPROMISO.llamada.dot }} />
              {estadisticas.llamadas} Llamadas
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: TIPOS_COMPROMISO.reunion.bg,
                color: TIPOS_COMPROMISO.reunion.color,
                border: `1px solid ${TIPOS_COMPROMISO.reunion.border}`,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: TIPOS_COMPROMISO.reunion.dot }} />
              {estadisticas.reuniones} Reuniones
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: TIPOS_COMPROMISO.coordinacion.bg,
                color: TIPOS_COMPROMISO.coordinacion.color,
                border: `1px solid ${TIPOS_COMPROMISO.coordinacion.border}`,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: TIPOS_COMPROMISO.coordinacion.dot }} />
              {estadisticas.coordinaciones} Coordinaciones
            </span>
          </div>
        </div>

        {/* Buscador minimalista y filtros de tipo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: "1 1 320px", justifyContent: "flex-end" }}>
          <div style={{ position: "relative", minWidth: 200, maxWidth: 280, flex: 1 }}>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar obra, cliente..."
              style={{
                ...SI,
                fontSize: 12.5,
                padding: "7px 28px 7px 10px",
                borderRadius: 8,
              }}
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted, #94a3b8)",
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: "todos", label: "Todos" },
              { id: "visita", label: "Visitas" },
              { id: "llamada", label: "Llamadas" },
              { id: "reunion", label: "Reuniones" },
              { id: "coordinacion", label: "Coordinación" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroTipo(f.id)}
                style={{
                  padding: "6px 11px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "1px solid var(--border, #e2e8f0)",
                  cursor: "pointer",
                  background: filtroTipo === f.id ? "var(--text-main, #0f172a)" : "var(--surface, #ffffff)",
                  color: filtroTipo === f.id ? "#ffffff" : "var(--text-muted, #64748b)",
                  transition: "all 0.15s ease",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VISTA 1: CALENDARIO MENSUAL ESTILO APPLE CON PANEL LATERAL DE DETALLE */}
      {/* ==================================================================== */}
      {vista === "mes" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.8fr) minmax(360px, 1.2fr)", gap: 20 }}>
          {/* Columna Izquierda: Calendario Mensual Apple */}
          <div style={{ ...CD, padding: 20 }}>
            {/* Navegación del mes */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--text-main, #0f172a)" }}>
                  {MESES[calMes.mes]}
                </h2>
                <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text-muted, #94a3b8)" }}>
                  {calMes.anio}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={mesAnterior}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid var(--border, #e2e8f0)",
                    background: "var(--surface, #ffffff)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-main, #0f172a)",
                  }}
                  title="Mes anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={irAHoy}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border, #e2e8f0)",
                    background: "var(--surface, #ffffff)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-main, #0f172a)",
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={mesSiguiente}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid var(--border, #e2e8f0)",
                    background: "var(--surface, #ffffff)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-main, #0f172a)",
                  }}
                  title="Mes siguiente"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Cabecera de días de la semana */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted, #94a3b8)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                paddingBottom: 10,
                borderBottom: "1px solid var(--border, #e2e8f0)",
                marginBottom: 8,
              }}
            >
              {DIAS_CORTO.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Cuadrícula de días */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {celdasMes.map((c, idx) => {
                if (c.otroMes) {
                  return (
                    <div
                      key={idx}
                      style={{
                        minHeight: 88,
                        padding: "6px 8px",
                        borderRadius: 10,
                        background: "var(--surface-subtle, #f8fafc)",
                        opacity: 0.4,
                        border: "1px solid transparent",
                      }}
                    >
                      <span style={{ fontSize: 11.5, color: "var(--text-muted, #94a3b8)" }}>{c.numero}</span>
                    </div>
                  );
                }

                const evts = eventosPorFecha[c.iso] || [];
                const esHoy = c.esHoy;
                const esSeleccionado = c.esSeleccionado;

                return (
                  <div
                    key={idx}
                    onClick={() => setFechaSeleccionada(c.iso)}
                    style={{
                      minHeight: 88,
                      padding: "6px 8px",
                      borderRadius: 10,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.12s ease",
                      background: esSeleccionado
                        ? "var(--surface, #ffffff)"
                        : "var(--surface, #ffffff)",
                      border: esSeleccionado
                        ? "2px solid #0f172a"
                        : "1px solid var(--border, #e2e8f0)",
                      boxShadow: esSeleccionado ? "0 4px 12px rgba(15,23,42,0.08)" : "none",
                    }}
                  >
                    {/* Número del día */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: esHoy || esSeleccionado ? 800 : 600,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: esHoy ? "#f47c20" : "transparent",
                          color: esHoy ? "#ffffff" : "var(--text-main, #0f172a)",
                        }}
                      >
                        {c.numero}
                      </span>

                      {evts.length > 0 && (
                        <div style={{ display: "flex", gap: 3 }}>
                          {evts.slice(0, 3).map((e) => (
                            <span
                              key={e.id}
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: TIPOS_COMPROMISO[e.tipo]?.dot || "#0f172a",
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chips de eventos en el día */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
                      {evts.slice(0, 2).map((e) => {
                        const conf = TIPOS_COMPROMISO[e.tipo] || TIPOS_COMPROMISO.visita;
                        return (
                          <div
                            key={e.id}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 5px",
                              borderRadius: 4,
                              background: conf.bg,
                              color: conf.color,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={`${e.hora || ""} ${e.obra || e.titulo}`}
                          >
                            {e.hora ? `${e.hora} ` : ""}{e.obra || e.titulo}
                          </div>
                        );
                      })}
                      {evts.length > 2 && (
                        <span style={{ fontSize: 9.5, color: "var(--text-muted, #94a3b8)", fontWeight: 700 }}>
                          +{evts.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Detalle de Compromisos del Día Seleccionado */}
          <div style={{ ...CD, padding: 20, display: "flex", flexDirection: "column", height: "fit-content" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 14,
                borderBottom: "1px solid var(--border, #e2e8f0)",
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #94a3b8)" }}>
                  Compromisos del día
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: "2px 0 0", color: "var(--text-main, #0f172a)" }}>
                  {formatFechaLarga(fechaSeleccionada)}
                </h3>
              </div>

              <button
                type="button"
                style={{
                  ...B("var(--surface-subtle, #f1f5f9)", "var(--text-main, #0f172a)"),
                  border: "1px solid var(--border, #e2e8f0)",
                  fontSize: 12,
                  padding: "6px 10px",
                }}
                onClick={() => abrirNuevoModal("visita")}
              >
                + Agregar
              </button>
            </div>

            {/* Listado de compromisos para el día seleccionado */}
            {eventosDelDia.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  background: "var(--surface-subtle, #f8fafc)",
                  borderRadius: 12,
                  border: "1px dashed var(--border, #cbd5e1)",
                }}
              >
                <div style={{ color: "var(--text-muted, #94a3b8)", marginBottom: 8 }}>
                  <IconoTipo tipo="coordinacion" size={28} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #0f172a)" }}>
                  Sin compromisos para esta fecha
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted, #64748b)", margin: "4px 0 14px" }}>
                  Camila no tiene visitas ni llamadas registradas para este día.
                </p>
                <button
                  type="button"
                  style={{ ...B("#f47c20"), fontSize: 12, padding: "7px 14px" }}
                  onClick={() => abrirNuevoModal("visita")}
                >
                  + Programar compromiso
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {eventosDelDia.map((item) => {
                  const conf = TIPOS_COMPROMISO[item.tipo] || TIPOS_COMPROMISO.visita;
                  const completado = item.estado === "completado";

                  return (
                    <div
                      key={item.id}
                      style={{
                        border: "1px solid var(--border, #e2e8f0)",
                        borderRadius: 12,
                        padding: 14,
                        background: completado ? "var(--surface-subtle, #f8fafc)" : "var(--surface, #ffffff)",
                        opacity: completado ? 0.65 : 1,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Cabecera del item */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main, #0f172a)" }}>
                            {item.hora}
                          </span>
                        </div>

                        {/* Botones de acción */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => toggleCompletado(item.id)}
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 6,
                              border: "1px solid var(--border, #e2e8f0)",
                              cursor: "pointer",
                              background: completado ? "#ecfdf5" : "var(--surface, #ffffff)",
                              color: completado ? "#047857" : "var(--text-muted, #64748b)",
                            }}
                          >
                            {completado ? "✓ Realizada" : "Completar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirEditarModal(item)}
                            style={{
                              padding: "4px 6px",
                              fontSize: 11,
                              borderRadius: 6,
                              border: "1px solid var(--border, #e2e8f0)",
                              background: "var(--surface, #ffffff)",
                              cursor: "pointer",
                              color: "var(--text-muted, #64748b)",
                            }}
                            title="Editar"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarCompromiso(item.id)}
                            style={{
                              padding: "4px 6px",
                              fontSize: 11,
                              borderRadius: 6,
                              border: "1px solid var(--border, #e2e8f0)",
                              background: "var(--surface, #ffffff)",
                              cursor: "pointer",
                              color: "#ef4444",
                            }}
                            title="Eliminar"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Título de obra y cliente */}
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main, #0f172a)" }}>
                        {item.obra || item.titulo}
                      </div>
                      {item.cliente && (
                        <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginTop: 2 }}>
                          {item.cliente} {item.ciudad ? `· ${item.ciudad}` : ""}
                        </div>
                      )}

                      {/* Contacto y Notas */}
                      {(item.contacto || item.telefono) && (
                        <div
                          style={{
                            fontSize: 11.5,
                            marginTop: 8,
                            padding: "6px 10px",
                            background: "var(--surface-subtle, #f8fafc)",
                            borderRadius: 6,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <span style={{ color: "var(--text-muted, #64748b)" }}>Contacto: </span>
                            <span style={{ fontWeight: 600, color: "var(--text-main, #0f172a)" }}>{item.contacto || "N/A"}</span>
                            {item.telefono && (
                              <span style={{ marginLeft: 8, color: "#2563eb", fontWeight: 600 }}>{item.telefono}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {item.notas && (
                        <div style={{ fontSize: 11.5, color: "var(--text-muted, #475569)", marginTop: 6, lineHeight: 1.4 }}>
                          {item.notas}
                        </div>
                      )}

                      {item.requerimientoSst && (
                        <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginTop: 4 }}>
                          SST: {item.requerimientoSst}
                        </div>
                      )}

                      {/* Botones de acción rápida: WhatsApp & Waze */}
                      <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border, #f1f5f9)" }}>
                        {item.telefono && (
                          <button
                            type="button"
                            onClick={() => enviarWhatsApp(item)}
                            style={{
                              ...B("#25D366"),
                              fontSize: 11.5,
                              padding: "5px 10px",
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
                              fontSize: 11.5,
                              padding: "5px 10px",
                              borderRadius: 6,
                            }}
                          >
                            Abrir Waze
                          </button>
                        )}
                        {item.linkReunion && (
                          <a
                            href={item.linkReunion}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              ...B("#7c3aed"),
                              fontSize: 11.5,
                              padding: "5px 10px",
                              borderRadius: 6,
                              textDecoration: "none",
                            }}
                          >
                            Unirse a Reunión
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VISTA 2: LISTA DE TAREAS Y SEGUIMIENTO (CRONOGRAMA LINEAL) */}
      {/* ==================================================================== */}
      {vista === "agenda" && (
        <div style={{ ...CD, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--text-main, #0f172a)" }}>
              Cronograma de Compromisos ({compromisosFiltrados.length})
            </h3>
            <button
              type="button"
              style={{ ...B("#f47c20"), fontSize: 12, padding: "6px 12px" }}
              onClick={() => abrirNuevoModal("visita")}
            >
              + Nuevo compromiso
            </button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {compromisosFiltrados.map((item) => {
              const conf = TIPOS_COMPROMISO[item.tipo] || TIPOS_COMPROMISO.visita;
              const completado = item.estado === "completado";

              return (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid var(--border, #e2e8f0)",
                    borderRadius: 12,
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    background: completado ? "var(--surface-subtle, #f8fafc)" : "var(--surface, #ffffff)",
                    opacity: completado ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: 1 }}>
                    {/* Badge de Fecha */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 54,
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: "var(--surface-subtle, #f1f5f9)",
                        border: "1px solid var(--border, #e2e8f0)",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted, #64748b)", textTransform: "uppercase" }}>
                        {item.fecha ? MESES[parseIso(item.fecha).getMonth()].slice(0, 3) : "N/A"}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main, #0f172a)" }}>
                        {item.fecha ? parseIso(item.fecha).getDate() : "-"}
                      </span>
                    </div>

                    {/* Detalle */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 7px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: conf.bg,
                            color: conf.color,
                          }}
                        >
                          <IconoTipo tipo={item.tipo} size={11} />
                          {conf.label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted, #64748b)" }}>
                          {item.hora}
                        </span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main, #0f172a)", marginTop: 2 }}>
                        {item.obra || item.titulo}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>
                        {item.cliente} {item.ciudad ? `· ${item.ciudad}` : ""} {item.contacto ? `· Contacto: ${item.contacto}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {item.telefono && (
                      <button
                        type="button"
                        onClick={() => enviarWhatsApp(item)}
                        style={{
                          ...B("#25D366"),
                          fontSize: 11.5,
                          padding: "6px 10px",
                          borderRadius: 6,
                        }}
                      >
                        WhatsApp
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleCompletado(item.id)}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: "1px solid var(--border, #e2e8f0)",
                        cursor: "pointer",
                        background: completado ? "#ecfdf5" : "var(--surface, #ffffff)",
                        color: completado ? "#047857" : "var(--text-muted, #64748b)",
                      }}
                    >
                      {completado ? "✓ Realizada" : "Marcar realizada"}
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirEditarModal(item)}
                      style={{
                        padding: "6px 8px",
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border, #e2e8f0)",
                        background: "var(--surface, #ffffff)",
                        cursor: "pointer",
                      }}
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarCompromiso(item.id)}
                      style={{
                        padding: "6px 8px",
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border, #e2e8f0)",
                        background: "var(--surface, #ffffff)",
                        cursor: "pointer",
                        color: "#ef4444",
                      }}
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL CREAR / EDITAR COMPROMISO ESTILO APPLE */}
      {/* ==================================================================== */}
      {modalAbierto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setModalAbierto(false)}
        >
          <div
            style={{
              background: "var(--surface, #ffffff)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 540,
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid var(--border, #e2e8f0)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-main, #0f172a)" }}>
                {itemEdicion ? "Editar Compromiso" : "Nuevo Compromiso para Camila"}
              </h3>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 16,
                  cursor: "pointer",
                  color: "var(--text-muted, #94a3b8)",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardarCompromiso} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Selector de Tipo de Compromiso */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted, #64748b)", display: "block", marginBottom: 6 }}>
                  TIPO DE COMPROMISO
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {Object.entries(TIPOS_COMPROMISO).map(([tipoKey, conf]) => (
                    <button
                      key={tipoKey}
                      type="button"
                      onClick={() => setFormTipo(tipoKey)}
                      style={{
                        padding: "8px 6px",
                        fontSize: 11.5,
                        fontWeight: 600,
                        borderRadius: 8,
                        border: formTipo === tipoKey ? `2px solid ${conf.color}` : "1px solid var(--border, #e2e8f0)",
                        background: formTipo === tipoKey ? conf.bg : "var(--surface, #ffffff)",
                        color: formTipo === tipoKey ? conf.color : "var(--text-muted, #64748b)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <IconoTipo tipo={tipoKey} size={14} />
                      {conf.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título y Obra */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted, #64748b)", display: "block", marginBottom: 4 }}>
                    OBRA / PROYECTO
                  </label>
                  <input
                    type="text"
                    value={formObra}
                    onChange={(e) => setFormObra(e.target.value)}
                    placeholder="Ej. Edificio Samanes"
                    style={SI}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted, #64748b)", display: "block", marginBottom: 4 }}>
                    CLIENTE / EMPRESA
                  </label>
                  <input
                    type="text"
                    value={formCliente}
                    onChange={(e) => setFormCliente(e.target.value)}
                    placeholder="Ej. Constructora Capital"
                    style={SI}
                  />
                </div>
              </div>

              {/* Fecha y Hora */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted, #64748b)", display: "block", marginBottom: 4 }}>
                    FECHA
                  </label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    style={SI}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted, #64748b)", display: "block", marginBottom: 4 }}>
                    HORA
                  </label>
                  <input
                    type="text"
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    placeholder="Ej. 10:00 AM"
                    style={SI}
                  />
                </div>
              </div>

              {/* Contacto y Celular */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted, #64748b)", display: "block", marginBottom: 4 }}>
                    CONTACTO / RESIDENTE
                  </label>
                  <input
                    type="text"
                    value={formContacto}
                    onChange={(e) => setFormContacto(e.target.value)}
                    placeholder="Ej. Ing. Juan Buitrago"
                    style={SI}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted, #64748b)", display: "block", marginBottom: 4 }}>
                    CELULAR (WHATSAPP)
                  </label>
                  <input
                    type="text"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    placeholder="Ej. 3160240823"
                    style={SI}
                  />
                </div>
              </div>

              {/* Notas y Requisitos SST */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted, #64748b)", display: "block", marginBottom: 4 }}>
                  OBJETIVO DE LA VISITA / NOTAS TÉCNICAS
                </label>
                <textarea
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  placeholder="Detalles sobre anclajes, líneas de vida o temas a coordinar..."
                  rows={2}
                  style={{ ...SI, resize: "vertical" }}
                />
              </div>

              {formTipo === "visita" && (
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted, #64748b)", display: "block", marginBottom: 4 }}>
                    REQUERIMIENTOS SST / PERMISOS DE INGRESO
                  </label>
                  <input
                    type="text"
                    value={formSst}
                    onChange={(e) => setFormSst(e.target.value)}
                    placeholder="Ej. ARL vigente, cartas de acceso, curso de alturas"
                    style={SI}
                  />
                </div>
              )}

              {formTipo === "reunion" && (
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted, #64748b)", display: "block", marginBottom: 4 }}>
                    ENLACE DE REUNIÓN VIRTUAL (MEET / TEAMS)
                  </label>
                  <input
                    type="text"
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    style={SI}
                  />
                </div>
              )}

              {/* Botones de acción del modal */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  style={{
                    ...B("var(--surface-subtle, #f1f5f9)", "var(--text-muted, #64748b)"),
                    border: "1px solid var(--border, #e2e8f0)",
                  }}
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" style={B("#f47c20")}>
                  {itemEdicion ? "Guardar Cambios" : "Guardar Compromiso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
