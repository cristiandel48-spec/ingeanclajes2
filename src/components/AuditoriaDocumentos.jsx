import { useMemo, useState } from "react";
import { CD, SI, ST } from "../styles/tokens";

// Quien hizo cada documento y quien fue el ultimo en tocarlo.
//
// Aplica para Cotizaciones, Informes de actividades y Certificaciones.
// El dato lo escribe un disparador de la base con el usuario de la sesion
// (migraciones 030 y 040). Asi queda registrado venga el cambio de donde venga,
// y no se puede falsear desde el cliente.
//
// ALCANCE: creador original y ultimo cambio.

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
  cotizacion: {
    etiqueta: "Cotización",
    bg: "#fff7ed",
    text: "#c2410c",
    border: "#ffedd5",
  },
  informe: {
    etiqueta: "Informe",
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
  const { cotizaciones = [], informes = [], certs = [] } = ctx || {};
  const [tab, setTab] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [verTodas, setVerTodas] = useState(false);

  // Normalizar registros para consulta unificada
  const listaCotizaciones = useMemo(() => {
    return (cotizaciones || []).map((c) => ({
      id: `cot_${c.id}`,
      originalId: c.id,
      tipoKey: "cotizacion",
      tipoDoc: "Cotización",
      codigo: c.numero || c.id,
      referencia: c.cliente || c.obra || "—",
      subreferencia: c.obra && c.cliente ? c.obra : "",
      creadoPorNombre: c.creadoPorNombre || "",
      creadoEn: c.creadoEn || null,
      modificadoPorNombre: c.modificadoPorNombre || "",
      modificadoEn: c.modificadoEn || null,
    }));
  }, [cotizaciones]);

  const listaInformes = useMemo(() => {
    return (informes || []).map((i) => ({
      id: `inf_${i.id}`,
      originalId: i.id,
      tipoKey: "informe",
      tipoDoc: "Informe de actividades",
      codigo: i.id,
      referencia: i.proyecto || i.localizacion || i.obraId || "—",
      subreferencia: i.obraId ? `Obra: ${i.obraId}` : "",
      creadoPorNombre: i.creadoPorNombre || "",
      creadoEn: i.creadoEn || null,
      modificadoPorNombre: i.modificadoPorNombre || "",
      modificadoEn: i.modificadoEn || null,
    }));
  }, [informes]);

  const listaCertificaciones = useMemo(() => {
    return (certs || []).map((c) => ({
      id: `cert_${c.id}`,
      originalId: c.id,
      tipoKey: "certificacion",
      tipoDoc: c.tipo || "Certificación",
      codigo: c.numero || c.id,
      referencia: c.cliente || c.sistema || "—",
      subreferencia: c.sistema || (c.obraId ? `Obra: ${c.obraId}` : ""),
      creadoPorNombre: c.creadoPorNombre || "",
      creadoEn: c.creadoEn || null,
      modificadoPorNombre: c.modificadoPorNombre || "",
      modificadoEn: c.modificadoEn || null,
    }));
  }, [certs]);

  const pool = useMemo(() => {
    if (tab === "cotizaciones") return listaCotizaciones;
    if (tab === "informes") return listaInformes;
    if (tab === "certificaciones") return listaCertificaciones;
    return [...listaCotizaciones, ...listaInformes, ...listaCertificaciones];
  }, [tab, listaCotizaciones, listaInformes, listaCertificaciones]);

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
      // El documento modificado más recientemente primero
      .sort((a, b) => String(b.modificadoEn || "").localeCompare(String(a.modificadoEn || "")));
  }, [pool, busqueda]);

  const visibles = verTodas ? filas : filas.slice(0, 15);

  const sinRegistro = pool.filter((c) => !c.creadoPorNombre && !c.modificadoPorNombre).length;

  const tabs = [
    { id: "todos", label: "Todos los documentos", total: listaCotizaciones.length + listaInformes.length + listaCertificaciones.length },
    { id: "cotizaciones", label: "Cotizaciones", total: listaCotizaciones.length },
    { id: "informes", label: "Informes de actividades", total: listaInformes.length },
    { id: "certificaciones", label: "Certificaciones", total: listaCertificaciones.length },
  ];

  return (
    <div style={{ ...CD, marginTop: 18 }}>
      <div style={ST}>Registro de auditoría de documentos</div>
      <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 14 }}>
        Quién creó cada cotización, informe o certificación y quién fue el último en modificarlo.
        Lo registra automáticamente la base de datos con la sesión del usuario.
      </div>

      {/* Pestañas de tipo de documento */}
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

      {sinRegistro > 0 && (
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
          Hay <strong>{sinRegistro} {sinRegistro === 1 ? "documento anterior" : "documentos anteriores"}</strong> sin
          autor registrado en esta vista. No es un fallo: son registros creados antes de activar la auditoría.
          Los documentos nuevos o modificados quedan registrados automáticamente.
        </div>
      )}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por código, cliente, proyecto, obra o persona…"
        style={{ ...SI, marginBottom: 14 }}
      />

      {!filas.length ? (
        <div style={{ fontSize: 12, color: "#64748b", padding: "14px 0" }}>
          {busqueda
            ? "Ningún documento coincide con esa búsqueda."
            : "Todavía no hay documentos registrados en esta sección."}
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 760 }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Documento</th>
                  {tab === "todos" && (
                    <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Tipo</th>
                  )}
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Cliente / Proyecto</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Lo creó</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Cuándo</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Último cambio</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Cuándo</th>
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
                      <td style={{ padding: "8px 10px", color: doc.creadoPorNombre ? "#334155" : "#94a3b8" }}>
                        {doc.creadoPorNombre || "no registrado"}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {fechaHora(doc.creadoEn) || "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: doc.modificadoPorNombre ? "#334155" : "#94a3b8" }}>
                        {doc.modificadoPorNombre || "no registrado"}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {fechaHora(doc.modificadoEn) || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filas.length > 15 && (
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
              {verTodas ? "Ver solo las últimas 15" : `Ver los ${filas.length} documentos`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
