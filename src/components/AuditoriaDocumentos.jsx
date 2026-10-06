import { useEffect, useMemo, useState } from "react";
import { CD, SI, ST } from "../styles/tokens";
import { limpiarCreador, limpiarModificador } from "../lib/autorAuditoria";
import { listarUsuarios, detectarDispositivo } from "../lib/backend";
import { formatearUltimaConexion } from "../lib/seguridadSesion";
import { normalizarNombrePropio } from "../lib/normalizarEntrada";
import { ROL_LABEL, sinCuentasSoporte } from "../lib/permisos";

// Registro unificado de auditoría y cambios en el sistema.
// Aplica para Ingreso de usuarios, Obras, Horarios, Cotizaciones, Informes y Certificaciones.
//
// Diseñado para que la gerencia y administración (Camila Sepúlveda, Cristian Flórez y administradores)
// tengan trazabilidad completa de qué persona se conectó y qué persona creó y modificó cada registro.

const fechaHora = (valor) => {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Obtiene una clave normalizada por minuto ("AAAA-MM-DD HH:mm") para detectar operaciones masivas en lote
const claveMinuto = (valor) => {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Cuenta cuántos registros comparten el mismo minuto de modificación en una colección
const contarMinutos = (items, getFecha) => {
  const mapa = new Map();
  for (const item of items || []) {
    const f = getFecha(item);
    const min = claveMinuto(f);
    if (min) {
      mapa.set(min, (mapa.get(min) || 0) + 1);
    }
  }
  return mapa;
};

// Determina si una modificación corresponde a una edición humana real y no a:
// 1) La creación inicial del documento (donde modificadoEn ≈ creadoEn, diferencia < 90s).
// 2) Una sincronización masiva técnica en lote o migración (3 o más registros en el mismo minuto).
const esEdicionHumanaValida = (creadoEn, modificadoEn, mapaFrecuencia) => {
  if (!modificadoEn) return false;

  // 1. Si la fecha de creación y la de modificación coinciden o distan menos de 90 segundos,
  // es la marca de inserción inicial generada por el disparador de base de datos.
  if (creadoEn) {
    const tC = new Date(creadoEn).getTime();
    const tM = new Date(modificadoEn).getTime();
    if (!Number.isNaN(tC) && !Number.isNaN(tM) && Math.abs(tM - tC) < 90 * 1000) {
      return false;
    }
  }

  // 2. Si 3 o más registros comparten el mismo minuto exacto de modificación,
  // fue una sincronización técnica en lote o migración de datos, no una edición manual de usuario.
  const min = claveMinuto(modificadoEn);
  if (min && (mapaFrecuencia?.get(min) || 0) >= 3) {
    return false;
  }

  return true;
};

const ESTILOS_TIPO = {
  ingreso: {
    etiqueta: "Ingreso de usuario",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#10b981",
    border: "rgba(16, 185, 129, 0.25)",
  },
  obra: {
    etiqueta: "Ejecución de obra",
    bg: "rgba(190, 24, 93, 0.12)",
    text: "#f472b6",
    border: "rgba(190, 24, 93, 0.25)",
  },
  horario: {
    etiqueta: "Horarios y turnos",
    bg: "rgba(109, 40, 217, 0.12)",
    text: "#a78bfa",
    border: "rgba(109, 40, 217, 0.25)",
  },
  cotizacion: {
    etiqueta: "Cotización",
    bg: "rgba(194, 65, 12, 0.12)",
    text: "#fb923c",
    border: "rgba(194, 65, 12, 0.25)",
  },
  informe: {
    etiqueta: "Informe de actividades",
    bg: "rgba(29, 78, 216, 0.12)",
    text: "#60a5fa",
    border: "rgba(29, 78, 216, 0.25)",
  },
  certificacion: {
    etiqueta: "Certificación",
    bg: "rgba(21, 128, 61, 0.12)",
    text: "#4ade80",
    border: "rgba(21, 128, 61, 0.25)",
  },
};

export default function AuditoriaDocumentos({ ctx }) {
  const {
    cotizaciones = [],
    informes = [],
    certs = [],
    obras = [],
    horarios = [],
    empleados = [],
    usuariosEnLinea = {},
    membresia = null,
    esSuperAdminCristian = false,
  } = ctx || {};

  const [tab, setTab] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [verTodas, setVerTodas] = useState(false);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    let activo = true;
    listarUsuarios()
      .then((data) => {
        if (activo && Array.isArray(data)) {
          setUsuarios(data);
        }
      })
      .catch((err) => {
        console.warn("No se pudo cargar la lista de usuarios para auditoría:", err);
      });
    return () => {
      activo = false;
    };
  }, []);

  // Mapeo id/userId -> nombre de persona registrado en la empresa
  const mapUsuarios = useMemo(() => {
    const map = new Map();
    (usuarios || []).forEach((u) => {
      const id = u.user_id || u.id;
      if (id) {
        map.set(id, u.nombre || u.email || "");
      }
    });
    return map;
  }, [usuarios]);

  // Frecuencia de modificación por minuto para depurar marcas de sincronizaciones masivas
  const freqModObras = useMemo(() => contarMinutos(obras, (o) => o.modificadoEn || o.updated_at), [obras]);
  const freqModHorarios = useMemo(() => contarMinutos(horarios, (h) => h.modificadoEn || h.updated_at), [horarios]);
  const freqModCotizaciones = useMemo(() => contarMinutos(cotizaciones, (c) => c.modificadoEn), [cotizaciones]);
  const freqModInformes = useMemo(() => contarMinutos(informes, (i) => i.modificadoEn), [informes]);
  const freqModCerts = useMemo(() => contarMinutos(certs, (c) => c.modificadoEn), [certs]);

  // 1. Obras (Ejecución de obra)
  const listaObras = useMemo(() => {
    return (obras || []).map((o) => {
      const creadorLimpio = limpiarCreador(o.creadoPorNombre, o.creadoEn || o.created_at, o.creadoPor, mapUsuarios);
      const modificadorLimpio = limpiarModificador(o.modificadoPorNombre, o.modificadoPor, mapUsuarios);
      const fechaCreacion = o.creadoEn || o.created_at || null;
      const fechaModRaw = o.modificadoEn || o.updated_at || null;
      const tieneModReal = Boolean(modificadorLimpio) && esEdicionHumanaValida(fechaCreacion, fechaModRaw, freqModObras);

      return {
        id: `obra_${o.id}`,
        originalId: o.id,
        tipoKey: "obra",
        tipoDoc: "Ejecución de obra",
        codigo: o.id,
        referencia: o.proyecto || o.cliente || "—",
        subreferencia: o.cliente ? `Cliente: ${o.cliente} · Estado: ${o.estado || "En Obra"}` : "",
        creadoPorNombre: creadorLimpio,
        creadoEn: fechaCreacion,
        modificadoPorNombre: tieneModReal ? modificadorLimpio : "",
        modificadoEn: tieneModReal ? fechaModRaw : null,
      };
    });
  }, [obras, mapUsuarios, freqModObras]);

  // 2. Horarios y turnos de personal
  const listaHorarios = useMemo(() => {
    const empMap = new Map((empleados || []).map((e) => [e.id, e.nombre]));
    const obraMap = new Map((obras || []).map((o) => [o.id, o.proyecto || o.cliente || o.id]));

    return (horarios || []).map((h) => {
      const nombreEmp = empMap.get(h.empleadoId) || h.empleadoNombre || h.empleadoId || "Personal";
      const nombreObra = obraMap.get(h.obraId) || (h.obraId ? `Obra ${h.obraId}` : "Sin obra");
      const turnoTexto = h.turno || (h.horaInicio && h.horaFin ? `${h.horaInicio} - ${h.horaFin}` : "") || "Turno";

      const creadorLimpio = limpiarCreador(h.creadoPorNombre, h.creadoEn || h.created_at, h.creadoPor, mapUsuarios);
      const modificadorLimpio = limpiarModificador(h.modificadoPorNombre, h.modificadoPor, mapUsuarios);
      const fechaCreacion = h.creadoEn || h.created_at || null;
      const fechaModRaw = h.modificadoEn || h.updated_at || null;
      const tieneModReal = Boolean(modificadorLimpio) && esEdicionHumanaValida(fechaCreacion, fechaModRaw, freqModHorarios);

      return {
        id: `hor_${h.id}`,
        originalId: h.id,
        tipoKey: "horario",
        tipoDoc: "Horarios y turnos",
        codigo: h.fecha ? `${h.fecha}` : h.id,
        referencia: `${nombreEmp} (${turnoTexto})`,
        subreferencia: `${nombreObra}${h.tarea ? ` · Tarea: ${h.tarea}` : ""}`,
        creadoPorNombre: creadorLimpio,
        creadoEn: fechaCreacion,
        modificadoPorNombre: tieneModReal ? modificadorLimpio : "",
        modificadoEn: tieneModReal ? fechaModRaw : null,
      };
    });
  }, [horarios, empleados, obras, mapUsuarios, freqModHorarios]);

  // 3. Cotizaciones
  const listaCotizaciones = useMemo(() => {
    return (cotizaciones || []).map((c) => {
      const creadorLimpio = limpiarCreador(c.creadoPorNombre, c.creadoEn || c.fecha, c.creadoPor, mapUsuarios);
      const modificadorLimpio = limpiarModificador(c.modificadoPorNombre, c.modificadoPor, mapUsuarios);
      const fechaCreacion = c.creadoEn || c.fecha || null;
      const fechaModRaw = c.modificadoEn || null;
      const tieneModReal = Boolean(modificadorLimpio) && esEdicionHumanaValida(fechaCreacion, fechaModRaw, freqModCotizaciones);

      return {
        id: `cot_${c.id}`,
        originalId: c.id,
        tipoKey: "cotizacion",
        tipoDoc: "Cotización",
        codigo: c.numero || c.id,
        referencia: c.cliente || c.obra || "—",
        subreferencia: c.obra && c.cliente ? c.obra : "",
        creadoPorNombre: creadorLimpio,
        creadoEn: fechaCreacion,
        modificadoPorNombre: tieneModReal ? modificadorLimpio : "",
        modificadoEn: tieneModReal ? fechaModRaw : null,
      };
    });
  }, [cotizaciones, mapUsuarios, freqModCotizaciones]);

  // 4. Informes de actividades
  const listaInformes = useMemo(() => {
    return (informes || []).map((i) => {
      const creadorLimpio = limpiarCreador(i.creadoPorNombre, i.creadoEn || i.fecha, i.creadoPor, mapUsuarios);
      const modificadorLimpio = limpiarModificador(i.modificadoPorNombre, i.modificadoPor, mapUsuarios);
      const fechaCreacion = i.creadoEn || i.fecha || null;
      const fechaModRaw = i.modificadoEn || null;
      const tieneModReal = Boolean(modificadorLimpio) && esEdicionHumanaValida(fechaCreacion, fechaModRaw, freqModInformes);

      return {
        id: `inf_${i.id}`,
        originalId: i.id,
        tipoKey: "informe",
        tipoDoc: "Informe de actividades",
        codigo: i.id,
        referencia: i.proyecto || i.localizacion || i.obraId || "—",
        subreferencia: i.obraId ? `Obra: ${i.obraId}` : "",
        creadoPorNombre: creadorLimpio,
        creadoEn: fechaCreacion,
        modificadoPorNombre: tieneModReal ? modificadorLimpio : "",
        modificadoEn: tieneModReal ? fechaModRaw : null,
      };
    });
  }, [informes, mapUsuarios, freqModInformes]);

  // 5. Certificaciones
  const listaCertificaciones = useMemo(() => {
    return (certs || []).map((c) => {
      const creadorLimpio = limpiarCreador(c.creadoPorNombre, c.creadoEn || c.fecha, c.creadoPor, mapUsuarios);
      const modificadorLimpio = limpiarModificador(c.modificadoPorNombre, c.modificadoPor, mapUsuarios);
      const fechaCreacion = c.creadoEn || c.fecha || null;
      const fechaModRaw = c.modificadoEn || null;
      const tieneModReal = Boolean(modificadorLimpio) && esEdicionHumanaValida(fechaCreacion, fechaModRaw, freqModCerts);

      return {
        id: `cert_${c.id}`,
        originalId: c.id,
        tipoKey: "certificacion",
        tipoDoc: c.tipo || "Certificación",
        codigo: c.numero || c.id,
        referencia: c.cliente || c.sistema || "—",
        subreferencia: c.sistema || (c.obraId ? `Obra: ${c.obraId}` : ""),
        creadoPorNombre: creadorLimpio,
        creadoEn: fechaCreacion,
        modificadoPorNombre: tieneModReal ? modificadorLimpio : "",
        modificadoEn: tieneModReal ? fechaModRaw : null,
      };
    });
  }, [certs, mapUsuarios, freqModCerts]);


  // 6. Ingreso de usuarios y sesiones
  const listaUsuariosAuditoria = useMemo(() => {
    const base = esSuperAdminCristian ? usuarios : sinCuentasSoporte(usuarios);
    return (base || []).map((u) => {
      const uId = u.user_id || u.id;
      const uEmail = (u.email || "").toLowerCase().trim();
      const miUserId = membresia?.user_id;
      const miEmail = (membresia?.email || "").toLowerCase().trim();
      const esMiUsuario = Boolean(
        (miUserId && uId === miUserId) ||
        (miEmail && uEmail && miEmail === uEmail)
      );

      const presencia =
        usuariosEnLinea?.[uId] ||
        (uEmail && usuariosEnLinea?.[uEmail]);

      const estaEnLinea = esMiUsuario || Boolean(presencia);

      const dispositivo = esMiUsuario
        ? detectarDispositivo()
        : (presencia?.dispositivo || "Computador");

      const fechaConexionRaw = (estaEnLinea ? (presencia?.onlineAt || new Date().toISOString()) : null) ||
                               u.ultima_conexion ||
                               u.created_at ||
                               null;

      const textoUltimaConexion = estaEnLinea
        ? "Conectado ahora"
        : formatearUltimaConexion(fechaConexionRaw);

      const rolNombre = ROL_LABEL[u.role] || u.role || "Operario";

      return {
        id: `usr_${uId}`,
        userId: uId,
        nombre: u.nombre || u.email || "Usuario",
        nombreLimpio: normalizarNombrePropio(u.nombre) || u.email || "Usuario",
        email: u.email || "",
        role: u.role || "operator",
        rolLabel: rolNombre,
        activo: u.activo !== false,
        estaEnLinea,
        esMiUsuario,
        dispositivo,
        fechaConexionRaw,
        textoUltimaConexion,
        modulos: u.modulos,
      };
    });
  }, [usuarios, usuariosEnLinea, membresia, esSuperAdminCristian]);

  const listaItemsConexion = useMemo(() => {
    return listaUsuariosAuditoria.map((u) => {
      return {
        id: `conn_${u.userId}`,
        originalId: u.userId,
        tipoKey: "ingreso",
        tipoDoc: "Ingreso de usuario",
        codigo: u.estaEnLinea ? "EN LÍNEA" : "ACCESO",
        referencia: `${u.nombreLimpio} (${u.rolLabel})`,
        subreferencia: u.email
          ? `${u.email} · ${u.estaEnLinea ? `🟢 En línea ahora desde ${u.dispositivo}` : `Último ingreso: ${u.textoUltimaConexion}`}`
          : (u.estaEnLinea ? `🟢 En línea ahora desde ${u.dispositivo}` : `Último ingreso: ${u.textoUltimaConexion}`),
        creadoPorNombre: u.nombreLimpio,
        creadoEn: u.fechaConexionRaw,
        modificadoPorNombre: u.estaEnLinea
          ? `🟢 En línea · ${u.dispositivo}`
          : `Desconectado · Última vez: ${u.textoUltimaConexion}`,
        modificadoEn: u.fechaConexionRaw,
        usuarioData: u,
      };
    });
  }, [listaUsuariosAuditoria]);

  const pool = useMemo(() => {
    if (tab === "ingresos") return listaItemsConexion;
    if (tab === "obras") return listaObras;
    if (tab === "horarios") return listaHorarios;
    if (tab === "cotizaciones") return listaCotizaciones;
    if (tab === "informes") return listaInformes;
    if (tab === "certificaciones") return listaCertificaciones;
    return [
      ...listaItemsConexion,
      ...listaObras,
      ...listaHorarios,
      ...listaCotizaciones,
      ...listaInformes,
      ...listaCertificaciones,
    ];
  }, [tab, listaItemsConexion, listaObras, listaHorarios, listaCotizaciones, listaInformes, listaCertificaciones]);

  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return pool
      .filter((item) => {
        if (!texto) return true;
        return [
          item.codigo,
          item.originalId,
          item.tipoDoc,
          item.referencia,
          item.subreferencia,
          item.creadoPorNombre,
          item.modificadoPorNombre,
          item.usuarioData?.email,
          item.usuarioData?.nombreLimpio,
        ].some((v) => String(v || "").toLowerCase().includes(texto));
      })
      .sort((a, b) => {
        const aOnline = a.usuarioData?.estaEnLinea ? 1 : 0;
        const bOnline = b.usuarioData?.estaEnLinea ? 1 : 0;
        if (bOnline !== aOnline) return bOnline - aOnline;

        const fechaB = b.modificadoEn || b.creadoEn || "";
        const fechaA = a.modificadoEn || a.creadoEn || "";
        return String(fechaB).localeCompare(String(fechaA));
      });
  }, [pool, busqueda]);

  const visibles = verTodas ? filas : filas.slice(0, 20);

  const tabs = [
    { id: "todos", label: "Todo el historial", total: pool.length },
    { id: "ingresos", label: "Ingreso de usuarios", total: listaUsuariosAuditoria.length },
    { id: "obras", label: "Ejecución de obra", total: listaObras.length },
    { id: "horarios", label: "Horarios", total: listaHorarios.length },
    { id: "cotizaciones", label: "Cotizaciones", total: listaCotizaciones.length },
    { id: "informes", label: "Informes de actividades", total: listaInformes.length },
    { id: "certificaciones", label: "Certificaciones", total: listaCertificaciones.length },
  ];

  return (
    <div style={{ ...CD, marginTop: 18 }}>
      <div style={ST}>Registro de auditoría y control de cambios</div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 14 }}>
        Consulta qué persona ingresó al sistema y cuándo se conectó, además de quién creó y modificó obras, horarios, cotizaciones, informes y certificaciones.
        Módulo visible para Camila Sepúlveda y el equipo de Administración.
      </div>

      {/* Pestañas de tipo de registro */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {tabs.map((t) => {
          const activo = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setVerTodas(false);
              }}
              style={{
                background: activo ? "var(--primary, #f47c20)" : "var(--surface-subtle)",
                color: activo ? "#fff" : "var(--text-muted)",
                border: activo ? "1px solid var(--primary, #f47c20)" : "1px solid var(--border)",
                borderRadius: 8,
                padding: "6px 13px",
                fontSize: 12,
                fontWeight: activo ? 700 : 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all .15s ease",
              }}
            >
              <span>{t.label}</span>
              <span
                style={{
                  fontSize: 10.5,
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: activo ? "rgba(255,255,255,0.2)" : "var(--border)",
                  color: activo ? "#fff" : "var(--text-muted)",
                  fontWeight: 700,
                }}
              >
                {t.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barra de monitoreo en tiempo real de conexiones del equipo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          borderRadius: 10,
          padding: "9px 14px",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#166534", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981", display: "inline-block" }} />
            Auditoría de Conexiones del Equipo:
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>
            {listaUsuariosAuditoria.filter((u) => u.estaEnLinea).length} en línea ahora · {listaUsuariosAuditoria.length} usuarios registrados
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            ⏱️ Cierre automático de sesión tras 5 min de inactividad
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setTab(tab === "ingresos" ? "todos" : "ingresos");
            setVerTodas(true);
          }}
          style={{
            background: tab === "ingresos" ? "#10b981" : "transparent",
            color: tab === "ingresos" ? "#ffffff" : "#166534",
            border: "1px solid #10b981",
            borderRadius: 7,
            padding: "5px 12px",
            fontSize: 11.5,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            transition: "all .15s ease",
          }}
        >
          {tab === "ingresos" ? "← Ver todo el historial" : "Ver auditoría de ingresos →"}
        </button>
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por código, cliente, proyecto, empleado, obra o usuario…"
        style={{ ...SI, marginBottom: 14 }}
      />

      {!filas.length ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "14px 0" }}>
          {busqueda
            ? "Ningún registro coincide con esa búsqueda."
            : "Todavía no hay registros en esta sección."}
        </div>
      ) : tab === "ingresos" ? (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 800 }}>
              <thead>
                <tr style={{ background: "var(--surface-subtle)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Usuario / Nombre</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Correo electrónico</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Rol en el sistema</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Estado de conexión</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Última vez que se conectó</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Dispositivo</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Límite sesión</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((doc, i) => {
                  const u = doc.usuarioData || {};
                  return (
                    <tr
                      key={doc.id}
                      style={{
                        background: u.estaEnLinea
                          ? "rgba(16, 185, 129, 0.05)"
                          : (i % 2 ? "var(--surface)" : "var(--surface-subtle)"),
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <td style={{ padding: "10px 10px", color: "var(--text-main)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: u.estaEnLinea ? "rgba(16, 185, 129, 0.2)" : "var(--border)",
                              color: u.estaEnLinea ? "#10b981" : "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: 11,
                              flexShrink: 0,
                            }}
                          >
                            {(u.nombreLimpio || "U").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ fontSize: 13, color: "var(--text-main)" }}>{u.nombreLimpio}</strong>
                            {u.esMiUsuario && (
                              <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: "var(--accent, #f47c20)" }}>· tú</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--text-muted)", fontSize: 11.5 }}>
                        {u.email || "—"}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--text-main)", fontSize: 11.5, fontWeight: 600 }}>
                        {u.rolLabel}
                        {!u.activo && <span style={{ color: "#ef4444", fontSize: 10.5, fontWeight: 400 }}> (suspendido)</span>}
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                        {u.estaEnLinea ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "3px 10px",
                              borderRadius: 999,
                              background: "rgba(34, 197, 94, 0.15)",
                              color: "#16a34a",
                              border: "1px solid rgba(34, 197, 94, 0.3)",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", boxShadow: "0 0 6px #16a34a" }} />
                            En línea ahora
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "3px 10px",
                              borderRadius: 999,
                              background: "var(--surface-subtle)",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border)",
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9ca3af" }} />
                            Desconectado
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                        <strong style={{ color: u.estaEnLinea ? "#16a34a" : "var(--text-main)", fontSize: 12 }}>
                          {u.estaEnLinea ? "Conectado ahora" : u.textoUltimaConexion}
                        </strong>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                          {fechaHora(u.fechaConexionRaw) || "Sin registro previo"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--text-muted)", fontSize: 11.5 }}>
                        {u.dispositivo || "Computador"}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--text-muted)", fontSize: 11 }}>
                        5 min inactividad
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filas.length > 20 && (
            <button
              onClick={() => setVerTodas((v) => !v)}
              style={{
                background: "none",
                border: "none",
                color: "#f47c20",
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: 600,
                marginTop: 12,
                padding: 0,
              }}
            >
              {verTodas ? "Ver solo las primeras 20" : `Ver los ${filas.length} usuarios`}
            </button>
          )}
        </>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 800 }}>
              <thead>
                <tr style={{ background: "var(--surface-subtle)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Identificador / Fecha</th>
                  {tab === "todos" && (
                    <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Módulo</th>
                  )}
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Detalle / Proyecto / Obra</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Lo creó / Usuario</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Fecha creación</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Última actividad / Edición</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-muted)" }}>Fecha última actividad</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((doc, i) => {
                  const estiloBadge = ESTILOS_TIPO[doc.tipoKey] || ESTILOS_TIPO.cotizacion;
                  const esIngreso = doc.tipoKey === "ingreso";
                  return (
                    <tr
                      key={doc.id}
                      style={{
                        background: esIngreso
                          ? (doc.usuarioData?.estaEnLinea ? "rgba(16, 185, 129, 0.05)" : "var(--surface)")
                          : (i % 2 ? "var(--surface)" : "var(--surface-subtle)"),
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: esIngreso ? (doc.usuarioData?.estaEnLinea ? "#16a34a" : "var(--text-main)") : "var(--text-main)", whiteSpace: "nowrap" }}>
                        {doc.codigo}
                      </td>
                      {tab === "todos" && (
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              background: estiloBadge.bg,
                              color: estiloBadge.text,
                              border: `1px solid ${estiloBadge.border}`,
                              borderRadius: 6,
                              padding: "2px 7px",
                              fontSize: 10.5,
                              fontWeight: 600,
                            }}
                          >
                            {doc.tipoDoc}
                          </span>
                        </td>
                      )}
                      <td style={{ padding: "8px 10px", color: "var(--text-main)" }}>
                        <div style={{ fontWeight: 500 }}>{doc.referencia}</div>
                        {doc.subreferencia && doc.subreferencia !== doc.referencia && (
                          <div style={{ fontSize: 10.5, color: esIngreso && doc.usuarioData?.estaEnLinea ? "#16a34a" : "var(--text-muted)", marginTop: 1 }}>
                            {doc.subreferencia}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px", color: doc.creadoPorNombre && doc.creadoPorNombre !== "no registrado" ? "var(--text-main)" : "var(--text-muted)" }}>
                        {doc.creadoPorNombre || "no registrado"}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {fechaHora(doc.creadoEn) || "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: doc.modificadoPorNombre ? "var(--text-main)" : "var(--text-muted)" }}>
                        {doc.modificadoPorNombre || "Sin modificaciones"}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {doc.modificadoPorNombre ? (fechaHora(doc.modificadoEn) || "—") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filas.length > 20 && (
            <button
              onClick={() => setVerTodas((v) => !v)}
              style={{
                background: "none",
                border: "none",
                color: "#f47c20",
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: 600,
                marginTop: 12,
                padding: 0,
              }}
            >
              {verTodas ? "Ver solo las primeras 20" : `Ver los ${filas.length} registros`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
