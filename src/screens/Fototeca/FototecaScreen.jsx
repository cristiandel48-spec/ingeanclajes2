import { useState, useEffect, useMemo } from "react";
import FototecaObra from "../Obras/FototecaObra";
import Badge from "../../components/ui/Badge";
import { B, CD, SI, ST } from "../../styles/tokens";
import { obraEstaCerrada } from "../../lib/flujoObra";
import { esAdmin } from "../../lib/permisos";
import { normalizarBitacora } from "../../lib/bitacoraObra";

// Cuenta todas las fotos disponibles de una obra sumando Fototeca directa, Bitácora diaria e Informes
function contarFotosObra(obra, informes = []) {
  if (!obra) return 0;
  let count = 0;
  if (Array.isArray(obra.fototeca)) {
    count += obra.fototeca.filter((f) => Boolean(f?.img)).length;
  }
  const bitacora = normalizarBitacora(obra.bitacora);
  bitacora.forEach((reg) => {
    count += (reg.fotos || []).filter((f) => Boolean(f?.img)).length;
  });
  const infs = (informes || []).filter((i) => i.obraId === obra.id);
  infs.forEach((inf) => {
    (inf.actividades || []).forEach((act) => {
      count += (act.fotos || []).filter((f) => Boolean(f?.img)).length;
    });
  });
  return count;
}

export default function FototecaScreen({ ctx }) {
  const { obras = [], setObras, informes = [], intencion, limpiarIntencion, membresia, irAPantalla } = ctx;

  // Si se ingresó con intención de una obra específica (ej. desde detalle o alertas)
  const obraIdIntencion = intencion?.pantalla === "fototeca" ? intencion.obraId : null;

  const [obraIdSeleccionada, setObraIdSeleccionada] = useState(() => {
    if (obraIdIntencion && obras.some((o) => o.id === obraIdIntencion)) {
      return obraIdIntencion;
    }
    // Por defecto la primera obra activa o con fotos, o la primera de la lista
    const primeraConFotos = obras.find((o) => contarFotosObra(o, informes) > 0);
    return primeraConFotos ? primeraConFotos.id : obras[0]?.id || "";
  });

  const [busquedaObra, setBusquedaObra] = useState("");

  // Limpiar intención al salir
  useEffect(() => {
    return () => {
      if (limpiarIntencion) limpiarIntencion();
    };
  }, [limpiarIntencion]);

  // Actualizar si cambia la intención
  useEffect(() => {
    if (obraIdIntencion && obras.some((o) => o.id === obraIdIntencion)) {
      setObraIdSeleccionada(obraIdIntencion);
    }
  }, [obraIdIntencion, obras]);

  const obraActual = obras.find((o) => o.id === obraIdSeleccionada) || obras[0];

  // Métricas globales
  const metricas = useMemo(() => {
    let totalFotos = 0;
    let obrasConFotos = 0;
    obras.forEach((o) => {
      const c = contarFotosObra(o, informes);
      totalFotos += c;
      if (c > 0) obrasConFotos += 1;
    });
    return { totalFotos, obrasConFotos, totalObras: obras.length };
  }, [obras, informes]);

  // Lista de obras filtradas para el selector rápido
  const obrasFiltradas = useMemo(() => {
    if (!busquedaObra.trim()) return obras;
    const q = busquedaObra.toLowerCase().trim();
    return obras.filter(
      (o) =>
        (o.id || "").toLowerCase().includes(q) ||
        (o.cliente || "").toLowerCase().includes(q) ||
        (o.proyecto || "").toLowerCase().includes(q) ||
        (o.ciudad || "").toLowerCase().includes(q)
    );
  }, [obras, busquedaObra]);

  const bloqueada = obraActual && obraEstaCerrada(obraActual) && !esAdmin(membresia);

  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: "0 auto" }}>
      {/* 1. CABECERA PRINCIPAL DEL MÓDULO */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #FFFAEB 0%, #FEF08A 100%)",
              border: "1px solid rgba(181, 71, 8, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              boxShadow: "0 2px 8px rgba(181, 71, 8, 0.08)",
            }}
          >
            📸
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-main, #101828)", margin: 0, letterSpacing: -0.3 }}>
                Fototeca de Obras
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 9px",
                  borderRadius: 8,
                  background: "#FFFAEB",
                  color: "#B54708",
                  border: "1px solid rgba(181, 71, 8, 0.3)",
                }}
              >
                Comercial y Proyectos
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted, #667085)", margin: "4px 0 0" }}>
              Repositorio centralizado de fotos por obra para evitar pérdidas en celulares · Descargas en ZIP y respaldo en nube
            </p>
          </div>
        </div>

        {/* Tarjetas KPI compactas */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--border, #eaecf0)",
              borderRadius: 12,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <span style={{ fontSize: 20 }}>🖼️</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#B54708", lineHeight: 1.1 }}>
                {metricas.totalFotos}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted, #667085)", textTransform: "uppercase", fontWeight: 600 }}>
                Fotos totales
              </div>
            </div>
          </div>

          <div
            style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--border, #eaecf0)",
              borderRadius: 12,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <span style={{ fontSize: 20 }}>🏗️</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1d4ed8", lineHeight: 1.1 }}>
                {metricas.obrasConFotos} de {metricas.totalObras}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted, #667085)", textTransform: "uppercase", fontWeight: 600 }}>
                Obras con fotos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SELECTOR DE OBRA DESTACADO */}
      <div
        style={{
          ...CD,
          marginBottom: 22,
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "linear-gradient(135deg, var(--surface, #ffffff) 0%, var(--surface-subtle, #f8fafc) 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #101828)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Seleccionar Proyecto u Obra:
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="text"
              placeholder="🔍 Filtrar obras..."
              value={busquedaObra}
              onChange={(e) => setBusquedaObra(e.target.value)}
              style={{ ...SI, width: 220, fontSize: 12, padding: "5px 10px" }}
            />
          </div>
        </div>

        {/* Carrusel de selección de obras */}
        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 6,
            scrollbarWidth: "thin",
          }}
        >
          {obrasFiltradas.map((o) => {
            const fotosCount = contarFotosObra(o, informes);
            const activo = o.id === obraActual?.id;

            return (
              <button
                key={o.id}
                onClick={() => setObraIdSeleccionada(o.id)}
                style={{
                  background: activo ? "#FFFAEB" : "var(--surface, #ffffff)",
                  border: activo ? "2px solid #B54708" : "1px solid var(--border, #eaecf0)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  minWidth: 240,
                  maxWidth: 280,
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                  boxShadow: activo ? "0 4px 12px rgba(181, 71, 8, 0.12)" : "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: activo ? "#B54708" : "#475467",
                      background: activo ? "rgba(181, 71, 8, 0.1)" : "var(--surface-subtle, #f2f4f7)",
                      padding: "2px 6px",
                      borderRadius: 6,
                    }}
                  >
                    {o.id}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: fotosCount > 0 ? "#027A48" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>📷</span>
                    <span>{fotosCount}</span>
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-main, #101828)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={o.cliente}
                >
                  {o.cliente}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted, #667085)",
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={`${o.proyecto || ""} · ${o.ciudad || ""}`}
                >
                  {o.proyecto ? `${o.proyecto} · ` : ""}📍 {o.ciudad || "Colombia"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FOTOTECA DE LA OBRA ACTIVA */}
      {obraActual ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Barra informativa de la obra activa */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              padding: "10px 16px",
              background: "var(--surface-subtle, #f8fafc)",
              borderRadius: 10,
              border: "1px solid var(--border, #eaecf0)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main, #101828)" }}>
                {obraActual.id} · {obraActual.cliente}
              </span>
              <Badge estado={obraActual.estado} />
              <span style={{ fontSize: 12, color: "var(--text-muted, #667085)" }}>
                Avance: <strong style={{ color: "#B54708" }}>{obraActual.avance || 0}%</strong>
              </span>
            </div>

            <button
              onClick={() => {
                if (irAPantalla) irAPantalla("obras", { obraId: obraActual.id });
              }}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 12,
                color: "#1d4ed8",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>Ver ficha completa de obra</span>
              <span>↗</span>
            </button>
          </div>

          {/* Componente FototecaObra reutilizable */}
          <FototecaObra
            obra={obraActual}
            setObras={setObras}
            ctx={ctx}
            bloqueada={bloqueada}
          />
        </div>
      ) : (
        <div style={{ ...CD, textAlign: "center", padding: 50 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main, #101828)", marginBottom: 6 }}>
            No hay obras registradas en el sistema
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted, #667085)" }}>
            Registra una obra en el módulo «Ejecución de obra» para comenzar a guardar y descargar sus fotografías.
          </div>
        </div>
      )}
    </div>
  );
}
