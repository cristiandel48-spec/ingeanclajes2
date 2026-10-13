import { useState, useMemo } from "react";
import { EJEMPLOS } from "../../data/ejemplos";

// Constantes y utilidades de fechas
const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_SEMANA_CORTO = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const DIAS_SEMANA_COMPLETO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIso(isoStr) {
  if (!isoStr) return new Date();
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Obtener el lunes de la semana de una fecha
function getLunesDeSemana(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Configuración de tipos con diseño Apple
const TIPO_CONFIG = {
  visita: {
    label: "Visita a Obra",
    icon: "🚗",
    badgeBg: "rgba(255, 149, 0, 0.12)",
    badgeColor: "#d97706",
    dotColor: "#ff9500",
    borderActive: "#ff9500",
  },
  llamada: {
    label: "Llamada de Seguimiento",
    icon: "📞",
    badgeBg: "rgba(0, 113, 227, 0.12)",
    badgeColor: "#0071e3",
    dotColor: "#0071e3",
    borderActive: "#0071e3",
  },
  reunion: {
    label: "Reunión / Comité",
    icon: "🤝",
    badgeBg: "rgba(175, 82, 222, 0.12)",
    badgeColor: "#af52de",
    dotColor: "#af52de",
    borderActive: "#af52de",
  },
  coordinacion: {
    label: "Coordinar en Obra",
    icon: "📋",
    badgeBg: "rgba(52, 199, 89, 0.12)",
    badgeColor: "#22a049",
    dotColor: "#34c759",
    borderActive: "#34c759",
  },
};

export default function Agenda({ ctx }) {
  const hoyIso = toIsoDate(new Date());

  // Lista de compromisos (desde ctx con fallback a ejemplos)
  const compromisos = useMemo(() => {
    const lista = ctx?.agenda;
    if (Array.isArray(lista) && lista.length > 0) {
      return lista;
    }
    return EJEMPLOS.agenda || [];
  }, [ctx?.agenda]);

  const setCompromisos = (nextOrUpdater) => {
    if (typeof ctx?.setAgenda === "function") {
      ctx.setAgenda(nextOrUpdater);
    }
  };

  // Estado de vista y selección
  const [viewMode, setViewMode] = useState("bento"); // "bento" | "fullcal"
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyIso);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  // Estado del calendario mensual
  const [calMes, setCalMes] = useState(() => {
    const ahora = new Date();
    return { anio: ahora.getFullYear(), mes: ahora.getMonth() };
  });

  // Modal de creación / edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemEnEdicion, setItemEnEdicion] = useState(null);

  // Formulario del modal
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
  const [formModalidad, setFormModalidad] = useState("presencial");
  const [formLink, setFormLink] = useState("");

  // Fecha seleccionada como Date
  const fechaSelDate = useMemo(() => parseIso(fechaSeleccionada), [fechaSeleccionada]);

  // Días de la semana para la tira semanal superior
  const diasSemana = useMemo(() => {
    const lunes = getLunesDeSemana(fechaSelDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return {
        iso: toIsoDate(d),
        diaNum: d.getDate(),
        nombreCorto: DIAS_SEMANA_CORTO[i],
        esHoy: toIsoDate(d) === hoyIso,
        esSeleccionado: toIsoDate(d) === fechaSeleccionada,
      };
    });
  }, [fechaSelDate, fechaSeleccionada, hoyIso]);

  // Cuadrícula del mes actual (para mini-calendario y calendario completo)
  const matrizMes = useMemo(() => {
    const primerDia = new Date(calMes.anio, calMes.mes, 1);
    const ultimoDia = new Date(calMes.anio, calMes.mes + 1, 0);

    let primerDiaSemana = primerDia.getDay() - 1;
    if (primerDiaSemana === -1) primerDiaSemana = 6; // domingo

    const totalDias = ultimoDia.getDate();
    const celdas = [];

    // Días del mes anterior para rellenar
    const ultimoDiaMesAnterior = new Date(calMes.anio, calMes.mes, 0).getDate();
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      celdas.push({
        num: ultimoDiaMesAnterior - i,
        otroMes: true,
        iso: null,
      });
    }

    // Días del mes actual
    for (let dia = 1; dia <= totalDias; dia++) {
      const fechaDia = new Date(calMes.anio, calMes.mes, dia);
      const iso = toIsoDate(fechaDia);
      celdas.push({
        num: dia,
        otroMes: false,
        iso,
        esHoy: iso === hoyIso,
        esSeleccionado: iso === fechaSeleccionada,
      });
    }

    // Rellenar hasta múltiplo de 7
    let siguienteDia = 1;
    while (celdas.length % 7 !== 0) {
      celdas.push({
        num: siguienteDia++,
        otroMes: true,
        iso: null,
      });
    }

    return celdas;
  }, [calMes, hoyIso, fechaSeleccionada]);

  // Mapeo de eventos por fecha ISO para los puntos de colores del calendario
  const eventosPorFecha = useMemo(() => {
    const map = {};
    compromisos.forEach((item) => {
      if (!item.fecha) return;
      if (!map[item.fecha]) map[item.fecha] = [];
      map[item.fecha].push(item);
    });
    return map;
  }, [compromisos]);

  // Filtrado de compromisos según búsqueda y tipo
  const compromisosFiltrados = useMemo(() => {
    return compromisos.filter((c) => {
      if (filtroTipo !== "todos" && c.tipo !== filtroTipo) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const texto = `${c.titulo || ""} ${c.obra || ""} ${c.cliente || ""} ${c.contacto || ""} ${c.notas || ""}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [compromisos, filtroTipo, busqueda]);

  // Compromisos del día seleccionado
  const compromisosDelDia = useMemo(() => {
    return compromisosFiltrados.filter((c) => c.fecha === fechaSeleccionada);
  }, [compromisosFiltrados, fechaSeleccionada]);

  // Segmentación para el Bento Grid
  const visitasDelDia = useMemo(() => compromisosDelDia.filter((c) => c.tipo === "visita"), [compromisosDelDia]);
  const llamadasDelDia = useMemo(() => compromisosDelDia.filter((c) => c.tipo === "llamada"), [compromisosDelDia]);
  const reunionesDelDia = useMemo(() => compromisosDelDia.filter((c) => c.tipo === "reunion"), [compromisosDelDia]);
  const coordinacionesDelDia = useMemo(() => compromisosDelDia.filter((c) => c.tipo === "coordinacion"), [compromisosDelDia]);

  // Conteo de tareas de hoy
  const conteoHoy = useMemo(() => {
    const itemsHoy = compromisos.filter((c) => c.fecha === hoyIso && c.estado !== "completado");
    return {
      visitas: itemsHoy.filter((c) => c.tipo === "visita").length,
      llamadas: itemsHoy.filter((c) => c.tipo === "llamada").length,
      reuniones: itemsHoy.filter((c) => c.tipo === "reunion").length,
      coordinaciones: itemsHoy.filter((c) => c.tipo === "coordinacion").length,
    };
  }, [compromisos, hoyIso]);

  // Acciones sobre compromisos
  const toggleEstado = (id) => {
    setCompromisos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: c.estado === "completado" ? "pendiente" : "completado" } : c))
    );
  };

  const eliminarCompromiso = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este compromiso?")) {
      setCompromisos((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const abrirNuevoModal = (tipoPredefinido = "visita") => {
    setItemEnEdicion(null);
    setFormTipo(tipoPredefinido);
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
    setFormModalidad("presencial");
    setFormLink("");
    setModalAbierto(true);
  };

  const abrirEditarModal = (item) => {
    setItemEnEdicion(item);
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
    setFormModalidad(item.modalidad || "presencial");
    setFormLink(item.linkReunion || "");
    setModalAbierto(true);
  };

  const guardarModal = (e) => {
    e.preventDefault();
    if (!formTitulo.trim() && !formObra.trim()) {
      alert("Por favor ingresa al menos un título o el nombre de la obra.");
      return;
    }

    const nuevo = {
      id: itemEnEdicion?.id || `AG-${Date.now()}`,
      tipo: formTipo,
      titulo: formTitulo.trim() || (formTipo === "visita" ? `Visita a ${formObra}` : `Compromiso`),
      obra: formObra.trim(),
      cliente: formCliente.trim(),
      ciudad: formCiudad.trim(),
      fecha: formFecha,
      hora: formHora.trim(),
      contacto: formContacto.trim(),
      telefono: formTelefono.trim(),
      notas: formNotas.trim(),
      requerimientoSst: formSst.trim(),
      modalidad: formModalidad,
      linkReunion: formLink.trim(),
      estado: itemEnEdicion?.estado || "pendiente",
      prioridad: itemEnEdicion?.prioridad || "alta",
    };

    setCompromisos((prev) => {
      if (itemEnEdicion) {
        return prev.map((c) => (c.id === itemEnEdicion.id ? nuevo : c));
      }
      return [nuevo, ...prev];
    });

    setModalAbierto(false);
  };

  // Construir link directo de WhatsApp
  const openWhatsApp = (item) => {
    const rawTel = (item.telefono || "").replace(/[^0-9]/g, "");
    if (!rawTel) {
      alert("Este contacto no tiene un teléfono celular registrado.");
      return;
    }
    const tel = rawTel.length === 10 ? `57${rawTel}` : rawTel;
    let mensaje = "";
    if (item.tipo === "visita") {
      mensaje = `Hola ${item.contacto || "Ingeniero(a)"}, te saluda Camila Sepúlveda de Ingeanclajes S.A.S. Te confirmo nuestra visita técnica programada para hoy a las ${item.hora || ""} en la obra ${item.obra || ""}.`;
    } else if (item.tipo === "llamada") {
      mensaje = `Hola ${item.contacto || ""}, te escribe Camila Sepúlveda de Ingeanclajes S.A.S sobre la obra ${item.obra || ""}. ¿A qué hora te puedo llamar para coordinar detalles?`;
    } else {
      mensaje = `Hola ${item.contacto || ""}, te escribe Camila Sepúlveda de Ingeanclajes sobre ${item.titulo || ""}.`;
    }
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  const openWaze = (item) => {
    const q = encodeURIComponent(`${item.obra || ""} ${item.ciudad || ""}`);
    window.open(`https://waze.com/ul?q=${q}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] p-4 md:p-8 font-sans antialiased">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER SUPERIOR ESTILO APPLE */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#e5e5ea]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#0071e3]/10 text-[#0071e3] mb-2">
              <span>✨ Ingeanclajes • Agenda & Operaciones</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1d1d1f]">
              Agenda & Coordinación
            </h1>
            <p className="text-sm text-[#86868b] mt-1">
              Visitas a obras, llamadas a clientes y coordinación de proyectos para Camila Sepúlveda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Segmented Control Apple */}
            <div className="inline-flex p-1 bg-[#e5e5ea] rounded-xl shadow-inner">
              <button
                onClick={() => setViewMode("bento")}
                className={`px-3.5 py-1.5 text-xs md:text-sm rounded-lg transition-all ${
                  viewMode === "bento"
                    ? "bg-white text-[#1d1d1f] font-semibold shadow-sm"
                    : "text-[#86868b] hover:text-[#1d1d1f]"
                }`}
              >
                Bento con Mini-Calendario
              </button>
              <button
                onClick={() => setViewMode("fullcal")}
                className={`px-3.5 py-1.5 text-xs md:text-sm rounded-lg transition-all ${
                  viewMode === "fullcal"
                    ? "bg-white text-[#1d1d1f] font-semibold shadow-sm"
                    : "text-[#86868b] hover:text-[#1d1d1f]"
                }`}
              >
                Calendario Mensual Completo
              </button>
            </div>

            <button
              onClick={() => abrirNuevoModal("visita")}
              className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs md:text-sm font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span className="text-base leading-none">+</span> Nuevo Compromiso
            </button>
          </div>
        </div>

        {/* RESUMEN PERSONAL DE CAMILA */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-[#e5e5ea] shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#0071e3] to-[#40c8e0] text-white font-bold flex items-center justify-center text-sm shadow-sm">
              CS
            </div>
            <div>
              <div className="text-[11px] text-[#86868b] font-medium">Coordinación Operativa</div>
              <h2 className="text-base md:text-lg font-bold text-[#1d1d1f]">Camila Sepúlveda</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f7] rounded-xl text-xs font-semibold text-[#1d1d1f]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff9500]"></span>
              {conteoHoy.visitas} Visitas Hoy
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f7] rounded-xl text-xs font-semibold text-[#1d1d1f]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3]"></span>
              {conteoHoy.llamadas} Llamadas
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f7] rounded-xl text-xs font-semibold text-[#1d1d1f]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#af52de]"></span>
              {conteoHoy.reuniones} Reuniones
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f7] rounded-xl text-xs font-semibold text-[#1d1d1f]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34c759]"></span>
              {conteoHoy.coordinaciones} Coordinaciones
            </div>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA Y FILTROS ESTILO APPLE */}
        <div className="bg-white rounded-2xl p-4 border border-[#e5e5ea] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Campo de búsqueda */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#86868b]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por obra, cliente, contacto o notas..."
              className="w-full pl-10 pr-9 py-2 bg-[#f5f5f7] border border-transparent rounded-xl text-xs md:text-sm text-[#1d1d1f] placeholder-[#86868b] focus:bg-white focus:border-[#0071e3] focus:outline-none transition-all"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-[#86868b] hover:text-[#1d1d1f]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Chips de filtro por tipo */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "todos", label: "Todos", icon: "✨" },
              { id: "visita", label: "Visitas", icon: "🚗" },
              { id: "llamada", label: "Llamadas", icon: "📞" },
              { id: "reunion", label: "Reuniones", icon: "🤝" },
              { id: "coordinacion", label: "Coordinación", icon: "📋" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroTipo(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  filtroTipo === f.id
                    ? "bg-[#1d1d1f] text-white shadow-xs"
                    : "bg-[#f5f5f7] text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e5e5ea]"
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TIRA SEMANAL DESLIZANTE DE APPLE (iOS CALENDAR STRIP) */}
        <div className="bg-white rounded-2xl p-4 border border-[#e5e5ea] shadow-sm">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#86868b]">Semana en curso</span>
              <span className="text-xs font-semibold text-[#1d1d1f] bg-[#e5e5ea] px-2 py-0.5 rounded-md">
                {NOMBRES_MESES[fechaSelDate.getMonth()]} {fechaSelDate.getFullYear()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(fechaSelDate);
                  d.setDate(d.getDate() - 7);
                  setFechaSeleccionada(toIsoDate(d));
                }}
                className="p-1 rounded-lg hover:bg-[#f5f5f7] text-xs font-bold text-[#86868b]"
                title="Semana anterior"
              >
                ‹ Anterior
              </button>
              <button
                onClick={() => setFechaSeleccionada(hoyIso)}
                className="text-xs font-bold text-[#0071e3] hover:underline px-1"
              >
                Hoy
              </button>
              <button
                onClick={() => {
                  const d = new Date(fechaSelDate);
                  d.setDate(d.getDate() + 7);
                  setFechaSeleccionada(toIsoDate(d));
                }}
                className="p-1 rounded-lg hover:bg-[#f5f5f7] text-xs font-bold text-[#86868b]"
                title="Semana siguiente"
              >
                Siguiente ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {diasSemana.map((d) => {
              const evts = eventosPorFecha[d.iso] || [];
              const tieneVisita = evts.some((e) => e.tipo === "visita");
              const tieneLlamada = evts.some((e) => e.tipo === "llamada");
              const tieneReunion = evts.some((e) => e.tipo === "reunion");
              const tieneCoord = evts.some((e) => e.tipo === "coordinacion");

              return (
                <button
                  key={d.iso}
                  onClick={() => setFechaSeleccionada(d.iso)}
                  className={`flex flex-col items-center py-2.5 px-1 rounded-2xl transition-all cursor-pointer ${
                    d.esSeleccionado
                      ? "bg-[#0071e3] text-white shadow-md"
                      : "hover:bg-[#f5f5f7] text-[#86868b]"
                  }`}
                >
                  <span className={`text-[11px] font-semibold ${d.esSeleccionado ? "text-white/80" : ""}`}>
                    {d.nombreCorto}
                  </span>
                  <span
                    className={`text-base font-bold mt-1 ${
                      d.esSeleccionado ? "text-white" : d.esHoy ? "text-[#0071e3]" : "text-[#1d1d1f]"
                    }`}
                  >
                    {d.diaNum}
                  </span>
                  <div className="flex gap-1 mt-1.5 h-1.5">
                    {tieneVisita && (
                      <span className={`w-1.5 h-1.5 rounded-full ${d.esSeleccionado ? "bg-[#ff9500]" : "bg-[#ff9500]"}`} />
                    )}
                    {tieneLlamada && (
                      <span className={`w-1.5 h-1.5 rounded-full ${d.esSeleccionado ? "bg-white" : "bg-[#0071e3]"}`} />
                    )}
                    {tieneReunion && (
                      <span className={`w-1.5 h-1.5 rounded-full ${d.esSeleccionado ? "bg-purple-200" : "bg-[#af52de]"}`} />
                    )}
                    {tieneCoord && (
                      <span className={`w-1.5 h-1.5 rounded-full ${d.esSeleccionado ? "bg-green-200" : "bg-[#34c759]"}`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* VISTA 1: BENTO GRID CON MINI-CALENDARIO APPLE */}
        {/* ============================================================== */}
        {viewMode === "bento" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* BENTO CARD 1: MINI-CALENDARIO MENSUAL APPLE (4 cols) */}
            <div className="md:col-span-4 bg-white rounded-2xl p-6 border border-[#e5e5ea] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0071e3] flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
                      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                    </svg>
                    {NOMBRES_MESES[calMes.mes]} {calMes.anio}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setCalMes((prev) => {
                          const m = prev.mes === 0 ? 11 : prev.mes - 1;
                          const a = prev.mes === 0 ? prev.anio - 1 : prev.anio;
                          return { anio: a, mes: m };
                        })
                      }
                      className="w-6 h-6 rounded-lg hover:bg-[#f5f5f7] flex items-center justify-center text-xs text-[#86868b]"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setCalMes((prev) => {
                          const m = prev.mes === 11 ? 0 : prev.mes + 1;
                          const a = prev.mes === 11 ? prev.anio + 1 : prev.anio;
                          return { anio: a, mes: m };
                        })
                      }
                      className="w-6 h-6 rounded-lg hover:bg-[#f5f5f7] flex items-center justify-center text-xs text-[#86868b]"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#86868b] mb-2">
                  <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
                </div>

                <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-xs font-semibold text-[#1d1d1f]">
                  {matrizMes.map((c, idx) => {
                    if (c.otroMes) {
                      return (
                        <span key={idx} className="text-gray-300 py-1">
                          {c.num}
                        </span>
                      );
                    }
                    const evts = eventosPorFecha[c.iso] || [];
                    const tieneEvts = evts.length > 0;

                    return (
                      <button
                        key={idx}
                        onClick={() => setFechaSeleccionada(c.iso)}
                        className={`py-1 rounded-lg transition-all relative flex flex-col items-center justify-center ${
                          c.esSeleccionado
                            ? "bg-[#0071e3] text-white font-bold shadow-sm"
                            : c.esHoy
                            ? "border border-[#0071e3] text-[#0071e3] font-bold"
                            : "hover:bg-[#f5f5f7]"
                        }`}
                      >
                        <span>{c.num}</span>
                        {tieneEvts && (
                          <span
                            className={`w-1 h-1 rounded-full mt-0.5 ${
                              c.esSeleccionado ? "bg-white" : "bg-[#ff9500]"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#e5e5ea] mt-4 flex items-center justify-between text-[11px] font-semibold text-[#86868b]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#ff9500]"></span> Visitas
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#0071e3]"></span> Llamadas
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#af52de]"></span> Reuniones
                </span>
              </div>
            </div>

            {/* BENTO CARD 2: VISITAS A OBRA DEL DÍA (8 cols) */}
            <div className="md:col-span-8 bg-gradient-to-br from-white to-[#fbfbfd] rounded-2xl p-6 border border-[#e5e5ea] shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#ff9500]/10 text-[#d97706] flex items-center gap-1.5">
                    🚗 Visitas a Obra ({visitasDelDia.length})
                  </span>
                  <span className="text-xs text-[#86868b] font-semibold">
                    {fechaSeleccionada === hoyIso ? "Hoy" : fechaSeleccionada}
                  </span>
                </div>
                <button
                  onClick={() => abrirNuevoModal("visita")}
                  className="px-3 py-1 bg-[#0071e3] text-white rounded-lg text-xs font-semibold hover:bg-[#0077ed] transition-all"
                >
                  + Programar Visita
                </button>
              </div>

              {visitasDelDia.length === 0 ? (
                <div className="p-8 text-center bg-[#f5f5f7] rounded-xl text-[#86868b]">
                  <p className="text-sm font-semibold">No hay visitas a obra programadas para esta fecha.</p>
                  <p className="text-xs mt-1">Usa el botón "+ Programar Visita" para agendar una inspección técnica.</p>
                </div>
              ) : (
                visitasDelDia.map((visita) => (
                  <div key={visita.id} className="mb-4 last:mb-0 p-4 border border-[#e5e5ea] rounded-xl bg-white shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#ff9500]">{visita.hora}</span>
                          <h3 className="text-lg font-bold text-[#1d1d1f]">{visita.obra || visita.titulo}</h3>
                          {visita.ciudad && (
                            <span className="text-[11px] bg-[#f5f5f7] text-[#1d1d1f] font-semibold px-2 py-0.5 rounded">
                              {visita.ciudad}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#86868b]">{visita.cliente}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleEstado(visita.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            visita.estado === "completado"
                              ? "bg-[#34c759]/20 text-[#22a049]"
                              : "bg-[#f5f5f7] text-[#86868b] hover:text-[#1d1d1f]"
                          }`}
                        >
                          {visita.estado === "completado" ? "✓ Realizada" : "Marcar Realizada"}
                        </button>
                        <button
                          onClick={() => abrirEditarModal(visita)}
                          className="px-2 py-1 text-xs text-[#86868b] hover:text-[#1d1d1f]"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => eliminarCompromiso(visita.id)}
                          className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-[#f5f5f7] rounded-xl text-xs mb-3">
                      <div>
                        <div className="text-[#86868b]">Contacto en obra:</div>
                        <div className="font-bold text-[#1d1d1f]">{visita.contacto || "No especificado"}</div>
                        <div className="text-[#0071e3] font-semibold">{visita.telefono || ""}</div>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-[#86868b]">Objetivo de visita:</div>
                        <div className="font-medium text-[#1d1d1f]">{visita.notas || "Inspección y levantamiento técnico."}</div>
                        {visita.requerimientoSst && (
                          <div className="text-[#34c759] font-semibold mt-0.5">SST: {visita.requerimientoSst}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openWhatsApp(visita)}
                        className="py-2 px-3.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                        </svg>
                        WhatsApp Residente
                      </button>
                      <button
                        onClick={() => openWaze(visita)}
                        className="py-2 px-3 bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <svg className="w-3.5 h-3.5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Waze / Maps
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* BENTO CARD 3: LLAMADAS POR HACER (6 cols) */}
            <div className="md:col-span-6 bg-white rounded-2xl p-6 border border-[#e5e5ea] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0071e3]/10 text-[#0071e3] flex items-center gap-1.5">
                  📞 Llamadas de Seguimiento ({llamadasDelDia.length})
                </span>
                <button
                  onClick={() => abrirNuevoModal("llamada")}
                  className="text-xs font-bold text-[#0071e3] hover:underline"
                >
                  + Nueva Llamada
                </button>
              </div>

              {llamadasDelDia.length === 0 ? (
                <div className="p-6 text-center bg-[#f5f5f7] rounded-xl text-[#86868b] text-xs">
                  No hay llamadas registradas para este día.
                </div>
              ) : (
                <div className="space-y-3">
                  {llamadasDelDia.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        item.estado === "completado"
                          ? "bg-gray-50 border-gray-200 opacity-60"
                          : "bg-[#f5f5f7] border-transparent hover:border-[#0071e3]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0071e3]">{item.hora}</span>
                            <span className="font-bold text-xs text-[#1d1d1f]">{item.cliente || item.obra}</span>
                          </div>
                          <div className="text-xs text-[#86868b] mt-0.5">{item.notas}</div>
                          {item.contacto && (
                            <div className="text-[11px] text-[#1d1d1f] font-semibold mt-1">
                              Contacto: {item.contacto}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleEstado(item.id)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                              item.estado === "completado" ? "bg-[#34c759] text-white" : "bg-white text-gray-400"
                            }`}
                            title="Marcar llamada como hecha"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => abrirEditarModal(item)}
                            className="w-6 h-6 rounded-md bg-white text-gray-500 hover:text-black flex items-center justify-center text-xs"
                          >
                            ✎
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-[#e5e5ea]">
                        {item.telefono && (
                          <>
                            <a
                              href={`tel:${item.telefono}`}
                              className="px-2.5 py-1 bg-white hover:bg-[#e5e5ea] text-[#0071e3] font-bold text-xs rounded-lg shadow-xs flex items-center gap-1"
                            >
                              📞 {item.telefono}
                            </a>
                            <button
                              onClick={() => openWhatsApp(item)}
                              className="px-2.5 py-1 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128c7e] font-bold text-xs rounded-lg flex items-center gap-1"
                            >
                              WhatsApp
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BENTO CARD 4: REUNIONES & COORDINACIÓN (6 cols) */}
            <div className="md:col-span-6 bg-white rounded-2xl p-6 border border-[#e5e5ea] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#af52de]/10 text-[#af52de] flex items-center gap-1.5">
                  🤝 Reuniones & Coordinación ({reunionesDelDia.length + coordinacionesDelDia.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirNuevoModal("reunion")}
                    className="text-xs font-bold text-[#af52de] hover:underline"
                  >
                    + Reunión
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    onClick={() => abrirNuevoModal("coordinacion")}
                    className="text-xs font-bold text-[#34c759] hover:underline"
                  >
                    + Coordinar
                  </button>
                </div>
              </div>

              {reunionesDelDia.length === 0 && coordinacionesDelDia.length === 0 ? (
                <div className="p-6 text-center bg-[#f5f5f7] rounded-xl text-[#86868b] text-xs">
                  No hay reuniones ni coordinaciones para esta fecha.
                </div>
              ) : (
                <div className="space-y-3">
                  {reunionesDelDia.map((item) => (
                    <div key={item.id} className="p-3.5 border border-[#e5e5ea] rounded-xl hover:border-[#af52de] transition-all bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#af52de]">
                          {item.hora} • REUNIÓN {item.modalidad === "virtual" ? "(VIRTUAL)" : "(PRESENCIAL)"}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleEstado(item.id)}
                            className={`text-xs px-2 py-0.5 rounded font-bold ${
                              item.estado === "completado" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.estado === "completado" ? "✓ Hecho" : "Pendiente"}
                          </button>
                          <button onClick={() => abrirEditarModal(item)} className="text-xs px-1 text-gray-400">✎</button>
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-[#1d1d1f]">{item.titulo}</h4>
                      <p className="text-xs text-[#86868b] mt-0.5">{item.notas || item.obra}</p>
                      {item.linkReunion && (
                        <div className="mt-2">
                          <a
                            href={item.linkReunion}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-[#0071e3]/10 text-[#0071e3] rounded-lg text-xs font-semibold hover:bg-[#0071e3]/20"
                          >
                            🔗 Unirse a Google Meet
                          </a>
                        </div>
                      )}
                    </div>
                  ))}

                  {coordinacionesDelDia.map((item) => (
                    <div key={item.id} className="p-3.5 border border-[#e5e5ea] rounded-xl hover:border-[#34c759] transition-all bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#34c759]">
                          {item.hora} • COORDINACIÓN DE OBRA
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleEstado(item.id)}
                            className={`text-xs px-2 py-0.5 rounded font-bold ${
                              item.estado === "completado" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.estado === "completado" ? "✓ Listo" : "Por Coordinar"}
                          </button>
                          <button onClick={() => abrirEditarModal(item)} className="text-xs px-1 text-gray-400">✎</button>
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-[#1d1d1f]">{item.titulo}</h4>
                      <p className="text-xs text-[#86868b] mt-0.5">{item.notas || item.obra}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* VISTA 2: CALENDARIO MENSUAL COMPLETO (ESTILO iCAL) */}
        {/* ============================================================== */}
        {viewMode === "fullcal" && (
          <div className="bg-white rounded-2xl p-6 border border-[#e5e5ea] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e5e5ea]">
              <div>
                <h3 className="text-2xl font-bold text-[#1d1d1f]">
                  {NOMBRES_MESES[calMes.mes]} {calMes.anio}
                </h3>
                <p className="text-xs text-[#86868b]">
                  Calendario mensual de visitas, llamadas y reuniones para Ingeanclajes
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCalMes((prev) => {
                      const m = prev.mes === 0 ? 11 : prev.mes - 1;
                      const a = prev.mes === 0 ? prev.anio - 1 : prev.anio;
                      return { anio: a, mes: m };
                    })
                  }
                  className="px-3 py-1.5 bg-[#f5f5f7] hover:bg-[#e5e5ea] text-xs font-bold rounded-lg transition-all"
                >
                  ‹ Mes Anterior
                </button>
                <button
                  onClick={() => {
                    const ahora = new Date();
                    setCalMes({ anio: ahora.getFullYear(), mes: ahora.getMonth() });
                    setFechaSeleccionada(hoyIso);
                  }}
                  className="px-3 py-1.5 bg-[#0071e3]/10 text-[#0071e3] text-xs font-bold rounded-lg hover:bg-[#0071e3]/20 transition-all"
                >
                  Hoy
                </button>
                <button
                  onClick={() =>
                    setCalMes((prev) => {
                      const m = prev.mes === 11 ? 0 : prev.mes + 1;
                      const a = prev.mes === 11 ? prev.anio + 1 : prev.anio;
                      return { anio: a, mes: m };
                    })
                  }
                  className="px-3 py-1.5 bg-[#f5f5f7] hover:bg-[#e5e5ea] text-xs font-bold rounded-lg transition-all"
                >
                  Siguiente Mes ›
                </button>
              </div>
            </div>

            {/* Cabecera Días */}
            <div className="grid grid-cols-7 gap-2 text-center font-bold text-xs text-[#86868b] py-1 border-b border-[#e5e5ea]">
              {DIAS_SEMANA_COMPLETO.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Grilla Mensual iCal */}
            <div className="grid grid-cols-7 gap-2">
              {matrizMes.map((c, idx) => {
                if (c.otroMes) {
                  return (
                    <div key={idx} className="min-h-[120px] p-2 bg-gray-50/50 rounded-xl border border-gray-100 text-gray-300">
                      <span className="text-xs font-bold">{c.num}</span>
                    </div>
                  );
                }

                const evts = eventosPorFecha[c.iso] || [];

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setFechaSeleccionada(c.iso);
                    }}
                    className={`min-h-[120px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      c.esSeleccionado
                        ? "border-[#0071e3] ring-2 ring-[#0071e3]/30 bg-blue-50/20"
                        : c.esHoy
                        ? "border-[#0071e3] bg-blue-50/40"
                        : "border-[#e5e5ea] bg-white hover:border-[#0071e3]/50 hover:bg-[#fbfbfd]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            c.esHoy ? "bg-[#0071e3] text-white" : "text-[#1d1d1f]"
                          }`}
                        >
                          {c.num}
                        </span>
                        {c.esHoy && <span className="text-[10px] font-bold text-[#0071e3]">HOY</span>}
                      </div>

                      <div className="space-y-1 overflow-hidden">
                        {evts.slice(0, 3).map((e) => {
                          const conf = TIPO_CONFIG[e.tipo] || TIPO_CONFIG.visita;
                          return (
                            <div
                              key={e.id}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                abrirEditarModal(e);
                              }}
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded truncate"
                              style={{ backgroundColor: conf.badgeBg, color: conf.badgeColor }}
                              title={`${e.hora || ""} ${e.titulo || ""} - ${e.obra || ""}`}
                            >
                              {conf.icon} {e.hora ? `${e.hora} ` : ""}{e.obra || e.titulo}
                            </div>
                          );
                        })}
                        {evts.length > 3 && (
                          <div className="text-[10px] font-semibold text-[#86868b] px-1">
                            +{evts.length - 3} más...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 pt-1 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setFechaSeleccionada(c.iso);
                          abrirNuevoModal("visita");
                        }}
                        className="text-[11px] text-gray-400 hover:text-[#0071e3] font-bold"
                        title="Agregar compromiso en este día"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* MODAL APPLE PARA CREAR / EDITAR COMPROMISO */}
      {/* ============================================================== */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-white/60 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0071e3]">
                  {itemEnEdicion ? "Modificar Compromiso" : "Nuevo Compromiso"}
                </span>
                <h3 className="text-xl font-bold text-[#1d1d1f]">
                  {itemEnEdicion ? "Editar Detalles" : "Agendar en Calendario"}
                </h3>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e5e5ea] flex items-center justify-center text-sm font-bold text-gray-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardarModal} className="space-y-4 text-xs">
              {/* Selector de Tipo */}
              <div>
                <label className="block font-bold text-gray-600 mb-1.5 uppercase text-[11px]">Tipo de Compromiso</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setFormTipo(key)}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all flex flex-col items-center gap-1 ${
                        formTipo === key
                          ? "border-[#0071e3] bg-blue-50/50 text-[#0071e3] shadow-xs"
                          : "border-[#e5e5ea] text-gray-600 hover:bg-[#f5f5f7]"
                      }`}
                    >
                      <span className="text-lg">{cfg.icon}</span>
                      <span className="text-[11px] leading-tight">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Título y Obra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Título / Asunto *</label>
                  <input
                    type="text"
                    required
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    placeholder="Ej. Inspección de puntos de anclaje"
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white rounded-xl outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Obra / Proyecto</label>
                  <input
                    type="text"
                    list="lista-obras-agenda"
                    value={formObra}
                    onChange={(e) => setFormObra(e.target.value)}
                    placeholder="Ej. Edificio Los Samanes"
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white rounded-xl outline-none font-medium"
                  />
                  <datalist id="lista-obras-agenda">
                    {(ctx?.obras || []).map((o) => (
                      <option key={o.id} value={o.nombre} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Cliente y Ciudad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Cliente</label>
                  <input
                    type="text"
                    list="lista-clientes-agenda"
                    value={formCliente}
                    onChange={(e) => setFormCliente(e.target.value)}
                    placeholder="Ej. Inversiones Ingeniería & Arq."
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white rounded-xl outline-none font-medium"
                  />
                  <datalist id="lista-clientes-agenda">
                    {(ctx?.clientes || []).map((cl) => (
                      <option key={cl.id} value={cl.nombre} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Ciudad / Ubicación</label>
                  <input
                    type="text"
                    value={formCiudad}
                    onChange={(e) => setFormCiudad(e.target.value)}
                    placeholder="Ej. Pereira, Risaralda"
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white rounded-xl outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Hora</label>
                  <input
                    type="text"
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    placeholder="Ej. 10:00 AM"
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              {/* Contacto y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Contacto en Obra / Cliente</label>
                  <input
                    type="text"
                    value={formContacto}
                    onChange={(e) => setFormContacto(e.target.value)}
                    placeholder="Ej. Ing. Juan Buitrago (Residente)"
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white rounded-xl outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Celular / Teléfono (WhatsApp)</label>
                  <input
                    type="text"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    placeholder="Ej. 316 024 0823"
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              {/* Si es reunión: Modalidad y Link */}
              {formTipo === "reunion" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-purple-50/40 rounded-xl border border-purple-100">
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">Modalidad</label>
                    <select
                      value={formModalidad}
                      onChange={(e) => setFormModalidad(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-purple-200"
                    >
                      <option value="presencial">Presencial en Obra</option>
                      <option value="virtual">Virtual (Meet / Teams)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">Link de Reunión (opcional)</label>
                    <input
                      type="url"
                      value={formLink}
                      onChange={(e) => setFormLink(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="w-full px-3 py-2 bg-white rounded-xl border border-purple-200"
                    />
                  </div>
                </div>
              )}

              {/* Notas y Requerimiento SST */}
              <div>
                <label className="block font-bold text-gray-600 mb-1">Notas / Objetivo</label>
                <textarea
                  rows={2}
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  placeholder="Detalles sobre lo que se debe revisar o coordinar..."
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white rounded-xl outline-none font-medium"
                />
              </div>

              {formTipo === "visita" && (
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Requisitos de Ingreso / SST</label>
                  <input
                    type="text"
                    value={formSst}
                    onChange={(e) => setFormSst(e.target.value)}
                    placeholder="Ej. ARL vigente, carta radicada para 2 técnicos"
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white rounded-xl outline-none font-medium"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-[#e5e5ea] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-gray-500 hover:text-black font-semibold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                >
                  {itemEnEdicion ? "Guardar Cambios" : "Agendar Compromiso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
