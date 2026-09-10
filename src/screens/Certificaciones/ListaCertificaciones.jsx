// Listado de certificaciones. Usa el componente comun, igual que obras,
// cotizaciones, informes y vencimientos: mismo buscador, mismos filtros,
// misma forma de ordenar.
//
// Lo propio de aqui: las pestañas separan certificacion de recertificacion, y
// cada fila enseña CUANDO VENCE, que es lo que se viene a mirar.
import ListadoConFiltros, { Resaltable } from "../../components/ListadoConFiltros";
import MenuAccionesFila from "../../components/ui/MenuAccionesFila";
import { C, boton, enMilis } from "../../components/listadoEstilos";
import Badge from "../../components/ui/Badge";
import { fmtD } from "../../lib/format";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

const ORDENES = [
  { key: "recientes", label: "Más recientes", comparar: (a, b) => enMilis(b.fecha) - enMilis(a.fecha) },
  { key: "antiguas",  label: "Más antiguas",  comparar: (a, b) => enMilis(a.fecha) - enMilis(b.fecha) },
  { key: "vence",     label: "Vence antes",   comparar: (a, b) => String(a.proxMant || "9999").localeCompare(String(b.proxMant || "9999")) },
  { key: "cliente",   label: "Cliente A–Z",   comparar: (a, b) => String(a.cliente || "").localeCompare(String(b.cliente || ""), "es") },
];

export default function ListaCertificaciones({ certs, acciones }) {
  return (
    <ListadoConFiltros
      datos={certs || []}
      nombre="certificación"
      nombrePlural="certificaciones"
      marcador="Buscar por número, cliente, obra o sistema…"
      buscarEn={(c) => [c.numero, c.id, c.cliente, c.lugar, c.obraId, c.sistema].filter(Boolean).join(" ")}
      estadoDe={(c) => c.tipo}
      estadosFijos={["Certificación", "Recertificación"]}
      fechaDe={(c) => c.fecha}
      ordenes={ORDENES}
      fila={(c, { compacta }) => <Fila key={c.id} c={c} compacta={compacta} acciones={acciones} />}
      vacio={{
        titulo: "Todavía no hay certificaciones",
        texto: "Se crean desde la obra, cuando el informe de actividades está listo.",
      }}
    />
  );
}

function Fila({ c, compacta, acciones }) {
  const recert = c.tipo === "Recertificación";
  const alPulsar = (fn) => (e) => { e.stopPropagation(); fn(c); };

  // El lugar suele repetir el nombre del cliente; solo se pone si aporta.
  const cliente = normalizarRazonSocial(c.cliente);
  const lugar = String(c.lugar || "").trim();
  const repetido = lugar && lugar.replace(/[.\s]/g, "").toUpperCase() === cliente.replace(/[.\s]/g, "").toUpperCase();
  const debajo = [repetido ? "" : lugar, c.obraId].filter(Boolean).join(" · ");

  // Semáforo de vigencia comercial de 3 fases
  const calcularVigencia = (fechaVence) => {
    if (!fechaVence) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fechaVence);
    const diffDias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return {
        texto: `Vencida (${fmtD(fechaVence)})`,
        color: "#b42318",
        bg: "#fee4e2",
        borde: "#fecdca",
        icono: "⚠️",
      };
    }
    if (diffDias <= 60) {
      return {
        texto: diffDias === 0 ? "Vence hoy" : `Vence en ${diffDias} días`,
        color: "#b54708",
        bg: "#fffaeb",
        borde: "#fedf89",
        icono: "⏳",
      };
    }
    return {
      texto: `Vigente · hasta ${fmtD(fechaVence)}`,
      color: "#027a48",
      bg: "#ecfdf3",
      borde: "#a6f4c5",
      icono: "🛡️",
    };
  };

  const semaforo = calcularVigencia(c.proxMant);

  const menuItems = [
    { label: "Descargar PDF", icon: "📥", onClick: alPulsar(acciones.imprimir) },
  ];

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
      <MenuAccionesFila items={menuItems} />
    </div>
  );

  const datos = (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.tinta }}>{cliente}</span>
        <span style={{ fontSize: 11, color: C.tenue }}>
          {c.numero || c.id}{c.fecha ? ` · ${fmtD(c.fecha)}` : ""}
        </span>
      </div>
      {debajo && (
        <div style={{ fontSize: 11.5, color: C.apagado, marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{debajo}</div>
      )}
    </>
  );

  const badgeVigencia = semaforo ? (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      color: semaforo.color,
      background: semaforo.bg,
      border: `1px solid ${semaforo.borde}`,
      borderRadius: 6,
      padding: "2px 8px",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      whiteSpace: "nowrap",
    }}>
      <span>{semaforo.icono}</span>
      <span>{semaforo.texto}</span>
    </span>
  ) : null;

  if (compacta) {
    return (
      <Resaltable as="article" onClick={() => acciones.ver(c)}
        estiloHover={{ borderColor: C.acentoFuerte, background: "var(--surface-hover, #fffdfb)" }}
        style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 10, background: "var(--surface, #fff)",
          padding: "9px 12px 9px 14px", display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", position: "relative", overflow: "hidden",
          transition: "border-color .16s ease, background .16s ease" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: recert ? "#7a5af8" : "#E0342A" }} />
        <div style={{ minWidth: 0, flex: 1 }}>{datos}</div>
        <Badge estado={c.estado} />
        {badgeVigencia}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>{botones}</div>
      </Resaltable>
    );
  }

  return (
    <Resaltable as="article" onClick={() => acciones.ver(c)}
      estiloHover={{ borderColor: C.acentoFuerte, boxShadow: "0 12px 28px -16px rgba(0,0,0,.35)" }}
      style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 12, background: "var(--surface, #fff)",
        padding: "12px 14px 11px", display: "flex", flexDirection: "column", gap: 9,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: recert ? "#7a5af8" : "#E0342A" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0 }}>{datos}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {badgeVigencia}
          <Badge estado={c.estado} />
        </div>
      </div>
      {c.sistema && (
        <div style={{ fontSize: 11.5, color: C.suave, lineHeight: 1.45,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {c.sistema}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, alignItems: "center", flexWrap: "wrap",
        paddingTop: 8, borderTop: `1px solid ${C.borde}` }}>
        {botones}
      </div>
    </Resaltable>
  );
}
