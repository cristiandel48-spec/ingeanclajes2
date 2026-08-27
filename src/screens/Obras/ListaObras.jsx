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
import { SI } from "../../styles/tokens";
import { ESTADOS_OBRA, estadoObraDe, obraEstaCerrada } from "../../lib/flujoObra";
import { resumenBitacora } from "../../lib/bitacoraObra";
import { fmtD } from "../../lib/format";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

const ORDENES = [
  { key: "recientes",   label: "Más recientes", comparar: (a, b) => enMilis(b.fechaInicio) - enMilis(a.fechaInicio) || String(b.id).localeCompare(String(a.id)) },
  { key: "antiguas",    label: "Más antiguas",  comparar: (a, b) => enMilis(a.fechaInicio) - enMilis(b.fechaInicio) },
  { key: "cliente",     label: "Cliente A–Z",   comparar: (a, b) => String(a.cliente || "").localeCompare(String(b.cliente || ""), "es") },
];

export default function ListaObras({ obras, cotizaciones, onAbrir, onCambiarEstado, puedeDesbloquear }) {
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
      estadoDe={(o) => estadoObraDe(o)}
      estadosFijos={ESTADOS_OBRA}
      fechaDe={(o) => o.fechaInicio}
      ordenes={ORDENES}
      filtrosExtra={({ valores, poner }) => (
        <GrupoFiltro titulo="Registro de fotos">
          <Pastilla activa={valores.fotos === "con"}
            onClick={() => poner("fotos", valores.fotos === "con" ? null : "con")}>Con fotos</Pastilla>
          <Pastilla activa={valores.fotos === "sin"}
            onClick={() => poner("fotos", valores.fotos === "sin" ? null : "sin")}>Sin fotos</Pastilla>
        </GrupoFiltro>
      )}
      aplicarExtra={(o, v) => {
        if (v.fotos) {
          const tiene = (fotosPorObra.get(o.id)?.fotos || 0) > 0;
          if (v.fotos === "con" && !tiene) return false;
          if (v.fotos === "sin" && tiene) return false;
        }
        return true;
      }}
      fila={(o, { compacta }) => (
        <Fila key={o.id} o={o} compacta={compacta}
          cotizacion={(cotizaciones || []).find((c) => c.id === o.cotizacionId)}
          resumen={fotosPorObra.get(o.id)}
          onAbrir={() => onAbrir(o)}
          onCambiarEstado={onCambiarEstado}
          puedeDesbloquear={puedeDesbloquear} />
      )}
      vacio={{
        titulo: "Todavía no hay obras",
        texto: "Las obras se crean al aprobar una cotización, o a mano con el botón de arriba.",
      }}
    />
  );
}

function Fila({ o, compacta, cotizacion, resumen, onAbrir, onCambiarEstado, puedeDesbloquear }) {
  const avance = Number(o.avance) || 0;
  const color = avance === 100 ? "#4ade80" : C.acento;
  // Si la bitacora no se ha traido, el numero lo pone la base.
  const fotos = (o.__parcial && Number.isFinite(o.totalFotosAvance))
    ? o.totalFotosAvance
    : (resumen?.fotos || 0);

  // El proyecto suele llamarse igual que el cliente; solo se pone si aporta.
  const cliente = normalizarRazonSocial(o.cliente);
  const proyecto = String(o.proyecto || "").trim();
  const repetido = proyecto
    && proyecto.replace(/[.\s]/g, "").toUpperCase() === cliente.replace(/[.\s]/g, "").toUpperCase();
  const debajo = [repetido ? "" : proyecto, o.ciudad].filter(Boolean).join(" · ");

  // Una obra entregada no se sigue tocando: los informes y los certificados
  // que salieron de ella dicen lo que decia la obra ese dia.
  const bloqueada = obraEstaCerrada(o) && !puedeDesbloquear;

  const selectorEstado = bloqueada ? (
    <span
      title="Obra finalizada: no se puede cambiar. Solo un administrador puede reabrirla."
      onClick={(e) => e.stopPropagation()}
      style={{ fontSize: 11, fontWeight: 700, color: "#166534", background: "#ecfdf5",
        border: "1px solid #a7f3d0", borderRadius: 7, padding: "4px 9px",
        minWidth: 108, display: "inline-flex", alignItems: "center", gap: 5,
        justifyContent: "center", whiteSpace: "nowrap" }}>
      🔒 Finalizado
    </span>
  ) : (
    <select value={estadoObraDe(o)}
      onChange={(e) => { e.stopPropagation(); onCambiarEstado(o.id, e.target.value); }}
      onClick={(e) => e.stopPropagation()}
      style={{ ...SI, fontSize: 11, padding: "4px 7px", width: "auto", minWidth: 108 }}>
      {ESTADOS_OBRA.map((s) => <option key={s}>{s}</option>)}
    </select>
  );

  const contadores = (
    <>
      <span style={{ fontSize: 11, color: C.tenue, flexShrink: 0 }}>{(o.empleados || []).length} 👷</span>
      {/* Las fotos ya no viajan en la carga inicial: hasta que se abra la obra
          no se sabe cuantas hay. Se pone un guion en vez de un cero, que seria
          decir que no hay ninguna. */}
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

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
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
        padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>{datos}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {contadores}
          <div onClick={(e) => e.stopPropagation()}>{selectorEstado}</div>
          <span style={{ fontSize: 11, color: C.acentoFuerte, fontWeight: 600 }}>Ver →</span>
        </div>
      </div>
    </Resaltable>
  );
}
