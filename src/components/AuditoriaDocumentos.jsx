import { useMemo, useState } from "react";
import { CD, SI, ST } from "../styles/tokens";
import { limpiarCreador, limpiarModificador } from "../lib/autorAuditoria";

// Registro unificado de auditoría y cambios en el sistema.
// Aplica para Obras (Ejecución de obra), Horarios, Cotizaciones, Informes y Certificaciones.
//
// Diseñado para que la gerencia y administración (Camila Sepúlveda y administradores)
// tengan trazabilidad completa de qué persona creó y qué persona modificó cada registro.
// Cuentas técnicas y de desarrollo no se muestran como modificadores para que los parches no ensucien el historial.

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

const ESTILOS_TIPO = {
  obra: {
    etiqueta: "Ejecución de obra",
    bg: "#fdf2f8",
    text: "#be185d",
    border: "#fbcfe8",
  },
  horario: {
    etiqueta: "Horarios y turnos",
    bg: "#f5f3ff",
    text: "#6d28d9",
    border: "#ede9fe",
  },
  cotizacion: {
    etiqueta: "Cotización",
    bg: "#fff7ed",
    text: "#c2410c",
    border: "#ffedd5",
  },
  informe: {
    etiqueta: "Informe de actividades",
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#dbeafe",
  },
  certificacion: {
    etiqueta: "Certificación",
    bg: "#f0fdf4",
    text: "#15803d",
    border: "#dcfce7",
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
  } = ctx || {};

  const [tab, setTab] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [verTodas, setVerTodas] = useState(false);

  // 1. Obras (Ejecución de obra)
  const listaObras = useMemo(() => {
    return (obras || []).map((o) => {
      const creadorLimpio = limpiarCreador(o.creadoPorNombre, o.creadoEn || o.created_at);
      const modificadorLimpio = limpiarModificador(o.modificadoPorNombre);
      const fechaCreacion = o.creadoEn || o.created_at || null;
      const fechaMod = modificadorLimpio ? (o.modificadoEn || o.updated_at || null) : null;

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
        modificadoPorNombre: modificadorLimpio,
        modificadoEn: fechaMod,
      };
    });
  }, [obras]);

  // 2. Horarios y turnos de personal
  const listaHorarios = useMemo(() => {
    const empMap = new Map((empleados || []).map((e) => [e.id, e.nombre]));
    const obraMap = new Map((obras || []).map((o) => [o.id, o.proyecto || o.cliente || o.id]));

    return (horarios || []).map((h) => {
      const nombreEmp = empMap.get(h.empleadoId) || h.empleadoNombre || h.empleadoId || "Personal";
      const nombreObra = obraMap.get(h.obraId) || (h.obraId ? `Obra ${h.obraId}` : "Sin obra");
      const turnoTexto = h.turno || (h.horaInicio && h.horaFin ? `${h.horaInicio} - ${h.horaFin}` : "") || "Turno";

      const creadorLimpio = limpiarCreador(h.creadoPorNombre, h.creadoEn || h.created_at);
      const modificadorLimpio = limpiarModificador(h.modificadoPorNombre);
      const fechaCreacion = h.creadoEn || h.created_at || null;
      const fechaMod = modificadorLimpio ? (h.modificadoEn || h.updated_at || null) : null;

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
        modificadoPorNombre: modificadorLimpio,
        modificadoEn: fechaMod,
      };
    });
  }, [horarios, empleados, obras]);

  // 3. Cotizaciones
  const listaCotizaciones = useMemo(() => {
    return (cotizaciones || []).map((c) => {
      const creadorLimpio = limpiarCreador(c.creadoPorNombre, c.creadoEn);
      const modificadorLimpio = limpiarModificador(c.modificadoPorNombre);

      return {
        id: `cot_${c.id}`,
        originalId: c.id,
        tipoKey: "cotizacion",
        tipoDoc: "Cotización",
        codigo: c.numero || c.id,
        referencia: c.cliente || c.obra || "—",
        subreferencia: c.obra && c.cliente ? c.obra : "",
        creadoPorNombre: creadorLimpio,
        creadoEn: c.creadoEn || null,
        modificadoPorNombre: modificadorLimpio,
        modificadoEn: modificadorLimpio ? (c.modificadoEn || null) : null,
      };
    });
  }, [cotizaciones]);

  // 4. Informes de actividades
  const listaInformes = useMemo(() => {
    return (informes || []).map((i) => {
      const creadorLimpio = limpiarCreador(i.creadoPorNombre, i.creadoEn);
      const modificadorLimpio = limpiarModificador(i.modificadoPorNombre);

      return {
        id: `inf_${i.id}`,
        originalId: i.id,
        tipoKey: "informe",
        tipoDoc: "Informe de actividades",
        codigo: i.id,
        referencia: i.proyecto || i.localizacion || i.obraId || "—",
        subreferencia: i.obraId ? `Obra: ${i.obraId}` : "",
        creadoPorNombre: creadorLimpio,
        creadoEn: i.creadoEn || null,
        modificadoPorNombre: modificadorLimpio,
        modificadoEn: modificadorLimpio ? (i.modificadoEn || null) : null,
      };
    });
  }, [informes]);

  // 5. Certificaciones
  const listaCertificaciones = useMemo(() => {
    return (certs || []).map((c) => {
      const creadorLimpio = limpiarCreador(c.creadoPorNombre, c.creadoEn);
      const modificadorLimpio = limpiarModificador(c.modificadoPorNombre);

      return {
        id: `cert_${c.id}`,
        originalId: c.id,
        tipoKey: "certificacion",
        tipoDoc: c.tipo || "Certificación",
        codigo: c.numero || c.id,
        referencia: c.cliente || c.sistema || "—",
        subreferencia: c.sistema || (c.obraId ? `Obra: ${c.obraId}` : ""),
        creadoPorNombre: creadorLimpio,
        creadoEn: c.creadoEn || null,
        modificadoPorNombre: modificadorLimpio,
        modificadoEn: modificadorLimpio ? (c.modificadoEn || null) : null,
      };
    });
  }, [certs]);

  const pool = useMemo(() => {
    if (tab === "obras") return listaObras;
    if (tab === "horarios") return listaHorarios;
    if (tab === "cotizaciones") return listaCotizaciones;
    if (tab === "informes") return listaInformes;
    if (tab === "certificaciones") return listaCertificaciones;
    return [
      ...listaObras,
      ...listaHorarios,
      ...listaCotizaciones,
      ...listaInformes,
      ...listaCertificaciones,
    ];
  }, [tab, listaObras, listaHorarios, listaCotizaciones, listaInformes, listaCertificaciones]);

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
        ].some((v) => String(v || "").toLowerCase().includes(texto));
      })
      // El registro modificado o creado más recientemente primero
      .sort((a, b) => {
        const fechaB = b.modificadoEn || b.creadoEn || "";
        const fechaA = a.modificadoEn || a.creadoEn || "";
        return String(fechaB).localeCompare(String(fechaA));
      });
  }, [pool, busqueda]);

  const visibles = verTodas ? filas : filas.slice(0, 20);

  const sinRegistro = pool.filter(
    (c) => (!c.creadoPorNombre || c.creadoPorNombre === "no registrado") && !c.modificadoPorNombre
  ).length;

  const tabs = [
    { id: "todos", label: "Todo el historial", total: pool.length },
    { id: "obras", label: "Ejecución de obra", total: listaObras.length },
    { id: "horarios", label: "Horarios", total: listaHorarios.length },
    { id: "cotizaciones", label: "Cotizaciones", total: listaCotizaciones.length },
    { id: "informes", label: "Informes de actividades", total: listaInformes.length },
    { id: "certificaciones", label: "Certificaciones", total: listaCertificaciones.length },
  ];

  return (
    <div style={{ ...CD, marginTop: 18 }}>
      <div style={ST}>Registro de auditoría y control de cambios</div>
      <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 14 }}>
        Consulta quién creó y quién realizó los últimos cambios en ejecución de obra, horarios, cotizaciones, informes y certificaciones.
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
                background: activo ? "#1a1a2e" : "#f8fafc",
                color: activo ? "#fff" : "#475569",
                border: activo ? "1px solid #1a1a2e" : "1px solid #e2e8f0",
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
                  background: activo ? "rgba(255,255,255,0.2)" : "#e2e8f0",
                  color: activo ? "#fff" : "#64748b",
                  fontWeight: 700,
                }}
              >
                {t.total}
              </span>
            </button>
          );
        })}
      </div>

      {sinRegistro > 0 && tab === "todos" && (
        <div
          style={{
            fontSize: 11.5,
            color: "#92400e",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          Hay <strong>{sinRegistro} registros anteriores</strong> creados de forma previa a la activación de la auditoría.
          A partir de ahora, todo registro nuevo o modificado queda registrado automáticamente con la sesión del usuario.
        </div>
      )}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por código, cliente, proyecto, empleado, obra o usuario…"
        style={{ ...SI, marginBottom: 14 }}
      />

      {!filas.length ? (
        <div style={{ fontSize: 12, color: "#64748b", padding: "14px 0" }}>
          {busqueda
            ? "Ningún registro coincide con esa búsqueda."
            : "Todavía no hay registros en esta sección."}
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 800 }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Identificador / Fecha</th>
                  {tab === "todos" && (
                    <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Módulo</th>
                  )}
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Detalle / Proyecto / Obra</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Lo creó</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Fecha creación</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Último cambio</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Fecha cambio</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((doc, i) => {
                  const estiloBadge = ESTILOS_TIPO[doc.tipoKey] || ESTILOS_TIPO.cotizacion;
                  return (
                    <tr
                      key={doc.id}
                      style={{
                        background: i % 2 ? "#fff" : "#fcfcfd",
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
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
                      <td style={{ padding: "8px 10px", color: "#334155" }}>
                        <div style={{ fontWeight: 500 }}>{doc.referencia}</div>
                        {doc.subreferencia && doc.subreferencia !== doc.referencia && (
                          <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 1 }}>
                            {doc.subreferencia}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px", color: doc.creadoPorNombre && doc.creadoPorNombre !== "no registrado" ? "#334155" : "#94a3b8" }}>
                        {doc.creadoPorNombre || "no registrado"}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {fechaHora(doc.creadoEn) || "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: doc.modificadoPorNombre ? "#334155" : "#94a3b8" }}>
                        {doc.modificadoPorNombre || "Sin modificaciones"}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#64748b", whiteSpace: "nowrap" }}>
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
