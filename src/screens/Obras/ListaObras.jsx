// Listado de obras. Usa el componente comun, igual que las demas pantallas de
// listado.
//
// Lo propio de aqui:
//   · La fila deja HACER cosas sin entrar a la obra: mover el avance con la
//     barra y cambiar el estado. Eso ya se podia antes y no se pierde.
//   · Se puede filtrar por tramo de avance y por si la obra tiene fotos de
//     avance cargadas, que es lo que decide si el informe sale vacio.
//   · El avance promedio de lo filtrado sale al final de las pestañas.
import { useMemo } from "react";
import ListadoConFiltros, { GrupoFiltro, Pastilla, Resaltable } from "../../components/ListadoConFiltros";
import { C, enMilis } from "../../components/listadoEstilos";
import Badge from "../../components/ui/Badge";
import { SI } from "../../styles/tokens";
import { ESTADOS_OBRA } from "../../lib/flujoObra";
import { resumenBitacora } from "../../lib/bitacoraObra";
import { fmtD } from "../../lib/format";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

const TRAMOS_AVANCE = [
  { key: "sin",   label: "Sin iniciar (0%)", test: (v) => v === 0 },
  { key: "bajo",  label: "1–49%",            test: (v) => v > 0 && v < 50 },
  { key: "medio", label: "50–99%",           test: (v) => v >= 50 && v < 100 },
  { key: "full",  label: "Terminadas",       test: (v) => v === 100 },
];

const ORDENES = [
  { key: "recientes",   label: "Más recientes", comparar: (a, b) => enMilis(b.fechaInicio) - enMilis(a.fechaInicio) || String(b.id).localeCompare(String(a.id)) },
  { key: "antiguas",    label: "Más antiguas",  comparar: (a, b) => enMilis(a.fechaInicio) - enMilis(b.fechaInicio) },
  { key: "avance-desc", label: "Mayor avance",  comparar: (a, b) => (b.avance || 0) - (a.avance || 0) },
  { key: "avance-asc",  label: "Menor avance",  comparar: (a, b) => (a.avance || 0) - (b.avance || 0) },
  { key: "cliente",     label: "Cliente A–Z",   comparar: (a, b) => String(a.cliente || "").localeCompare(String(b.cliente || ""), "es") },
];

export default function ListaObras({ obras, cotizaciones, onAbrir, onCambiarAvance, onCambiarEstado }) {
  // Las fotos se cuentan una vez por obra y no en cada filtro.
  const fotosPorObra = useMemo(() => {
    const mapa = new Map();
    (obras || []).forEach((o) => mapa.set(o.id, resumenBitacora(o.bitacora)));
    return mapa;
  }, [obras]);

  return (
    <ListadoConFiltros
      datos={obras || []}
      nombre="obra"
      nombrePlural="obras"
      marcador="Buscar por cliente, proyecto, número de obra, ciudad o cotización…"
      buscarEn={(o) => [o.cliente, o.id, o.proyecto, o.ciudad, o.direccion, o.cotizacionId].filter(Boolean).join(" ")}
      estadoDe={(o) => o.estado}
      estadosFijos={ESTADOS_OBRA}
      fechaDe={(o) => o.fechaInicio}
      ordenes={ORDENES}
      filtrosExtra={({ valores, poner }) => (
        <>
          <GrupoFiltro titulo="Avance">
            {TRAMOS_AVANCE.map((t) => (
              <Pastilla key={t.key} activa={valores.avance === t.key}
                onClick={() => poner("avance", valores.avance === t.key ? null : t.key)}>{t.label}</Pastilla>
            ))}
          </GrupoFiltro>
          <GrupoFiltro titulo="Registro de avance">
            <Pastilla activa={valores.fotos === "con"}
              onClick={() => poner("fotos", valores.fotos === "con" ? null : "con")}>Con fotos</Pastilla>
            <Pastilla activa={valores.fotos === "sin"}
              onClick={() => poner("fotos", valores.fotos === "sin" ? null : "sin")}>Sin fotos</Pastilla>
          </GrupoFiltro>
        </>
      )}
      aplicarExtra={(o, v) => {
        if (v.avance) {
          const tramo = TRAMOS_AVANCE.find((t) => t.key === v.avance);
          if (tramo && !tramo.test(Number(o.avance) || 0)) return false;
        }
        if (v.fotos) {
          const tiene = (fotosPorObra.get(o.id)?.fotos || 0) > 0;
          if (v.fotos === "con" && !tiene) return false;
          if (v.fotos === "sin" && tiene) return false;
        }
        return true;
      }}
      derecha={(lista) => {
        const promedio = lista.length
          ? Math.round(lista.reduce((t, o) => t + (Number(o.avance) || 0), 0) / lista.length)
          : 0;
        return (
          <span style={{ fontSize: 11.5, color: C.tenue, fontWeight: 600 }}>
            Avance promedio <strong style={{ color: C.tinta }}>{promedio}%</strong>
          </span>
        );
      }}
      fila={(o, { compacta }) => (
        <Fila key={o.id} o={o} compacta={compacta}
          cotizacion={(cotizaciones || []).find((c) => c.id === o.cotizacionId)}
          resumen={fotosPorObra.get(o.id)}
          onAbrir={() => onAbrir(o)}
          onCambiarAvance={onCambiarAvance}
          onCambiarEstado={onCambiarEstado} />
      )}
      vacio={{
        titulo: "Todavía no hay obras",
        texto: "Las obras se crean al aprobar una cotización, o a mano con el botón de arriba.",
      }}
    />
  );
}

function Fila({ o, compacta, cotizacion, resumen, onAbrir, onCambiarAvance, onCambiarEstado }) {
  const avance = Number(o.avance) || 0;
  const color = avance === 100 ? "#4ade80" : C.acento;
  const fotos = resumen?.fotos || 0;

  // El proyecto suele llamarse igual que el cliente; solo se pone si aporta.
  const cliente = normalizarRazonSocial(o.cliente);
  const proyecto = String(o.proyecto || "").trim();
  const repetido = proyecto
    && proyecto.replace(/[.\s]/g, "").toUpperCase() === cliente.replace(/[.\s]/g, "").toUpperCase();
  const debajo = [repetido ? "" : proyecto, o.ciudad].filter(Boolean).join(" · ");

  const selectorEstado = (
    <select value={o.estado}
      onChange={(e) => { e.stopPropagation(); onCambiarEstado(o.id, e.target.value); }}
      onClick={(e) => e.stopPropagation()}
      style={{ ...SI, fontSize: 11, padding: "4px 7px", width: "auto", minWidth: 108 }}>
      {[...new Set([...ESTADOS_OBRA, o.estado].filter(Boolean))].map((s) => <option key={s}>{s}</option>)}
    </select>
  );

  const contadores = (
    <>
      <span style={{ fontSize: 11, color: C.tenue, flexShrink: 0 }}>{(o.empleados || []).length} 👷</span>
      <span
        title={fotos ? "Fotos de avance cargadas para el informe" : "Sin fotos de avance: el informe saldría vacío"}
        style={{ fontSize: 11, color: fotos ? C.tenue : "#b54708", flexShrink: 0 }}>{fotos} 📸</span>
    </>
  );

  const datos = (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.tinta }}>{cliente}</span>
        <span style={{ fontSize: 11, color: C.tenue }}>
          {o.id} · {fmtD(o.fechaInicio)}{cotizacion ? ` · 📄 ${o.cotizacionId}` : ""}
        </span>
      </div>
      {debajo && (
        <div style={{ fontSize: 11.5, color: C.apagado, marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{debajo}</div>
      )}
    </>
  );

  if (compacta) {
    return (
      <Resaltable as="article" onClick={onAbrir}
        estiloHover={{ borderColor: C.acentoFuerte, background: "#fffdfb" }}
        style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 10, background: "#fff",
          padding: "9px 12px 9px 14px", display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", position: "relative", overflow: "hidden",
          transition: "border-color .16s ease, background .16s ease" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color }} />
        <div style={{ minWidth: 0, flex: 1 }}>{datos}</div>

        {/* La barra sigue siendo la de mover el avance, aqui estrecha. */}
        <div style={{ width: 150, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5,
            color: C.apagado, marginBottom: 2 }}>
            <span>Avance</span>
            <span style={{ color: avance === 100 ? "#166534" : C.acento, fontWeight: 700,
              fontVariantNumeric: "tabular-nums" }}>{avance}%</span>
          </div>
          <input type="range" min={0} max={100} value={avance}
            onChange={(e) => onCambiarAvance(o.id, Number(e.target.value))}
            style={{ width: "100%", accentColor: C.acento, display: "block", margin: 0 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {contadores}
          {selectorEstado}
          <span style={{ fontSize: 11, color: C.acentoFuerte, fontWeight: 600 }}>Ver →</span>
        </div>
      </Resaltable>
    );
  }

  return (
    <Resaltable as="article" onClick={onAbrir}
      estiloHover={{ borderColor: C.acentoFuerte, boxShadow: "0 12px 28px -16px rgba(15,23,42,.30)" }}
      style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 12, background: "#fff",
        padding: "12px 13px 10px", display: "flex", flexDirection: "column", gap: 9,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>{datos}</div>
        <Badge estado={o.estado} />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.apagado,
          marginBottom: 4 }}>
          <span>Avance</span>
          <span style={{ color: avance === 100 ? "#166534" : C.acento, fontWeight: 600,
            fontVariantNumeric: "tabular-nums" }}>{avance}%</span>
        </div>
        <div style={{ height: 5, background: C.bordeFuerte, borderRadius: 3 }}>
          <div style={{ width: avance + "%", height: "100%", background: color, borderRadius: 3,
            transition: "width .4s ease" }} />
        </div>
        <input type="range" min={0} max={100} value={avance}
          onChange={(e) => onCambiarAvance(o.id, Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", marginTop: 4, accentColor: C.acento }} />
      </div>

      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
        <div style={{ flex: 1 }} onClick={(e) => e.stopPropagation()}>{selectorEstado}</div>
        {contadores}
        <span style={{ fontSize: 11, color: C.acentoFuerte, fontWeight: 600, flexShrink: 0 }}>Ver →</span>
      </div>
    </Resaltable>
  );
}
