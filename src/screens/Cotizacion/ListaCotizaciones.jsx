// Listado de cotizaciones. Usa el componente comun, igual que obras,
// certificaciones, informes y vencimientos.
//
// Lo propio de aqui: se puede filtrar por obra, y de cada una se hacen seis
// cosas -ver, editar, aprobar, PDF, enviar y borrar-.
//
// AQUI NO SE VEN CIFRAS, como en el resto de listados: se viene a buscar y
// abrir documentos, y el dinero se ve al abrirlos o en el informe financiero.
import { useMemo, useState } from "react";
import ListadoConFiltros, { GrupoFiltro, Resaltable } from "../../components/ListadoConFiltros";
import { C, boton, enMilis } from "../../components/listadoEstilos";
import Badge from "../../components/ui/Badge";
import { EC, SI } from "../../styles/tokens";
import { fmt, fmtD } from "../../lib/format";
import { normalizarMayusculas, normalizarRazonSocial } from "../../lib/normalizarEntrada";
import { seguimientoDe, colorSeguimiento, etiquetaSeguimiento, UMBRAL_POR_VENCER } from "../../lib/seguimientoCotizaciones";

const ORDENES = [
  { key: "recientes", label: "Más recientes", comparar: (a, b) => enMilis(b.fecha) - enMilis(a.fecha) || String(b.id).localeCompare(String(a.id)) },
  { key: "antiguas",  label: "Más antiguas",  comparar: (a, b) => enMilis(a.fecha) - enMilis(b.fecha) },
  { key: "cliente",   label: "Cliente A–Z",   comparar: (a, b) => String(a.cliente || "").localeCompare(String(b.cliente || ""), "es") },
  { key: "numero",    label: "Número",        comparar: (a, b) => String(a.numero || a.id).localeCompare(String(b.numero || b.id), "es", { numeric: true }) },
];

export default function ListaCotizaciones({ cotizaciones, acciones }) {
  const obras = useMemo(() => (
    [...new Set((cotizaciones || []).map((c) => String(c.obra || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "es"))
  ), [cotizaciones]);

  return (
    <ListadoConFiltros
      datos={cotizaciones || []}
      nombre="cotización"
      nombrePlural="cotizaciones"
      marcador="Buscar por número, cliente, obra o ciudad…"
      buscarEn={(c) => [c.numero, c.id, c.cliente, c.obra, c.ciudad].filter(Boolean).join(" ")}
      estadoDe={(c) => c.estado}
      estadosFijos={["Borrador", "Pendiente", "Aprobada"]}
      fechaDe={(c) => c.fecha}
      ordenes={ORDENES}
      filtrosExtra={({ valores, poner }) => (
        <>
          <GrupoFiltro titulo="Obra">
            <select value={valores.obra || "todas"}
              onChange={(e) => poner("obra", e.target.value === "todas" ? null : e.target.value)}
              style={{ ...SI, fontSize: 12, padding: "6px 8px" }}>
              <option value="todas">Todas las obras</option>
              {obras.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </GrupoFiltro>
          {/* Para sentarse a llamar: saca las que se estan enfriando. */}
          <GrupoFiltro titulo="Seguimiento">
            <select value={valores.seguimiento || "todas"}
              onChange={(e) => poner("seguimiento", e.target.value === "todas" ? null : e.target.value)}
              style={{ ...SI, fontSize: 12, padding: "6px 8px" }}>
              <option value="todas">Sin filtrar</option>
              <option value="llamar">Por llamar (vencidas o a punto)</option>
              <option value="vencidas">Solo vencidas</option>
              <option value="alDia">Dentro del plazo</option>
            </select>
          </GrupoFiltro>
        </>
      )}
      aplicarExtra={(c, v) => {
        if (v.obra && String(c.obra || "").trim() !== v.obra) return false;
        if (!v.seguimiento) return true;
        // Las aprobadas y las que no tienen fecha no estan en seguimiento, asi
        // que no aparecen en ninguno de los tres grupos.
        const { diasParaVencer } = seguimientoDe(c);
        if (diasParaVencer === null) return false;
        if (v.seguimiento === "vencidas") return diasParaVencer < 0;
        if (v.seguimiento === "llamar") return diasParaVencer <= UMBRAL_POR_VENCER;
        if (v.seguimiento === "alDia") return diasParaVencer > UMBRAL_POR_VENCER;
        return true;
      }}
      fila={(c, { compacta }) => <Fila key={c.id} c={c} compacta={compacta} acciones={acciones} />}
      vacio={{
        titulo: "Todavía no hay cotizaciones",
        texto: "Crea la primera con el botón de arriba.",
      }}
    />
  );
}

function BotonEstadoAprobacion({ cotizacion, acciones }) {
  const [hover, setHover] = useState(false);
  const aprobada = cotizacion.estado === "Aprobada" || Boolean(cotizacion.obraId);
  const estado = cotizacion.estado || "Pendiente";
  const conf = EC[estado] || (aprobada ? { bg: "#ECFDF3", text: "#027A48" } : { bg: "#FFFAEB", text: "#B54708" });

  const handleClick = (e) => {
    e.stopPropagation();
    if (aprobada) {
      if (typeof acciones?.desaprobar === "function") {
        acciones.desaprobar(cotizacion);
      }
    } else {
      if (typeof acciones?.aprobar === "function") {
        acciones.aprobar(cotizacion);
      }
    }
  };

  const bgHover = aprobada ? "#fee2e2" : "#dcfce7";
  const textHover = aprobada ? "#dc2626" : "#15803d";
  const borderHover = aprobada ? "#fca5a5" : "#86efac";

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={
        aprobada
          ? "Cotización aprobada. Haz clic aquí para desaprobarla (devolver a Pendiente)"
          : "Cotización pendiente. Haz clic aquí para aprobarla y crear la obra automáticamente"
      }
      style={{
        background: hover ? bgHover : conf.bg,
        color: hover ? textHover : conf.text,
        border: `1px solid ${hover ? borderHover : (aprobada ? "rgba(2, 122, 72, 0.25)" : "rgba(181, 71, 8, 0.25)")}`,
        borderRadius: 999,
        padding: "4px 12px",
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        transition: "all 0.16s ease-in-out",
        transform: hover ? "scale(1.04)" : "scale(1)",
        boxShadow: hover ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: 11 }}>
        {hover
          ? (aprobada ? "↩ Desaprobar" : "✓ Aprobar")
          : (aprobada ? "✓ Aprobada" : estado)}
      </span>
    </button>
  );
}

function Fila({ c, compacta, acciones }) {
  const aprobada = c.estado === "Aprobada";
  const alPulsar = (fn) => (e) => { e.stopPropagation(); if (typeof fn === "function") fn(c); };

  // Solo se marca lo que hay que mirar: una cotizacion dentro del plazo no
  // necesita etiqueta, seria ruido en todas las filas.
  const { diasParaVencer } = seguimientoDe(c);
  const avisa = diasParaVencer !== null && diasParaVencer <= UMBRAL_POR_VENCER;
  const colorBarra = aprobada ? "#12B76A" : (avisa && diasParaVencer < 0 ? "#ef4444" : C.acento);

  // La obra suele llamarse igual que el cliente, y salia el mismo nombre dos
  // veces. Solo se pone si aporta algo distinto.
  const cliente = normalizarRazonSocial(c.cliente);
  const obra = normalizarMayusculas(c.obra || "");
  const ciudad = normalizarMayusculas(c.ciudad || "");
  const mismoNombre = obra && obra.replace(/[.\s]/g, "") === cliente.replace(/[.\s]/g, "");
  const debajo = [mismoNombre ? "" : obra, ciudad].filter(Boolean).join(" · ");

  const totalEstimado = Number(
    c.total ||
    c.totalPresupuesto ||
    (Array.isArray(c.propuestas) ? c.propuestas.reduce((s, p) => s + Number(p?.total || 0), 0) : 0) ||
    0
  );

  const botones = (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button
        type="button"
        style={{
          background: "var(--surface-subtle, #f2f4f7)",
          color: "var(--text-main, #101828)",
          border: "1px solid var(--border, #eaecf0)",
          borderRadius: 8,
          padding: "5px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
        onClick={alPulsar(acciones.ver)}
      >
        <span>Ver</span>
      </button>
      <button
        type="button"
        style={{
          background: "transparent",
          color: "var(--text-muted, #475467)",
          border: "1px solid var(--border, #eaecf0)",
          borderRadius: 8,
          padding: "5px 11px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
        onClick={alPulsar(acciones.editar)}
      >
        Editar
      </button>
      <button
        type="button"
        title="Duplicar cotización (crea una copia idéntica con nuevo folio)"
        style={{
          background: "transparent",
          color: "var(--text-muted, #475467)",
          border: "1px solid var(--border, #eaecf0)",
          borderRadius: 8,
          padding: "5px 10px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
        onClick={alPulsar(acciones.duplicar)}
      >
        <span>📋 Duplicar</span>
      </button>
      <button
        type="button"
        title="Eliminar cotización permanentemente"
        style={{
          background: "rgba(239, 68, 68, 0.06)",
          color: "#dc2626",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          borderRadius: 8,
          padding: "5px 9px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
        }}
        onClick={alPulsar(acciones.eliminar)}
      >
        <span>🗑️</span>
      </button>
    </div>
  );

  const datos = (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.tinta }}>{cliente}</span>
        <span style={{ fontSize: 11, color: C.tenue }}>
          {c.numero || c.id}{c.fecha ? ` · ${fmtD(c.fecha)}` : ""}
        </span>
        {avisa && (
          <span title={`Enviada hace ${seguimientoDe(c).diasSinRespuesta} días y sigue sin respuesta`}
            style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: .2,
              color: colorSeguimiento(diasParaVencer),
              border: `1px solid ${colorSeguimiento(diasParaVencer)}`,
              borderRadius: 5, padding: "1px 5px", whiteSpace: "nowrap" }}>
            {etiquetaSeguimiento(diasParaVencer)}
          </span>
        )}
      </div>
      {debajo && (
        <div style={{ fontSize: 11.5, color: C.apagado, marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{debajo}</div>
      )}
    </>
  );

  if (compacta) {
    return (
      <Resaltable as="article" onClick={() => acciones.ver(c)}
        estiloHover={{ borderColor: C.acentoFuerte, background: "var(--surface-hover, #fffdfb)" }}
        style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 10, background: "var(--surface, #fff)",
          padding: "9px 12px 9px 14px", display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", position: "relative", overflow: "hidden",
          transition: "border-color .16s ease, background .16s ease" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: colorBarra }} />
        <div style={{ minWidth: 0, flex: 1 }}>{datos}</div>
        {totalEstimado > 0 && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #101828)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {fmt(totalEstimado)}
          </div>
        )}
        <BotonEstadoAprobacion cotizacion={c} acciones={acciones} />
        <div style={{ display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>{botones}</div>
      </Resaltable>
    );
  }

  return (
    <Resaltable as="article" onClick={() => acciones.ver(c)}
      estiloHover={{ borderColor: C.acentoFuerte, boxShadow: "0 12px 28px -16px rgba(0,0,0,.35)" }}
      style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 12, background: "var(--surface, #fff)",
        padding: "12px 14px 11px", display: "flex", flexDirection: "column", gap: 10,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: colorBarra }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>{datos}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {totalEstimado > 0 && (
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-main, #101828)", fontVariantNumeric: "tabular-nums" }}>
              {fmt(totalEstimado)}
            </div>
          )}
          <BotonEstadoAprobacion cotizacion={c} acciones={acciones} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8,
        borderTop: `1px solid ${C.borde}` }}>{botones}</div>
    </Resaltable>
  );
}
