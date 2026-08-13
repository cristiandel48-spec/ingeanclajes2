// Listado de certificaciones. Usa el componente comun, igual que obras,
// cotizaciones, informes y vencimientos: mismo buscador, mismos filtros,
// misma forma de ordenar.
//
// Lo propio de aqui: las pestañas separan certificacion de recertificacion, y
// cada fila enseña CUANDO VENCE, que es lo que se viene a mirar.
import ListadoConFiltros, { Resaltable } from "../../components/ListadoConFiltros";
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

  const botones = (
    <>
      <button style={boton("#dbeafe", "#1e40af")} onClick={alPulsar(acciones.ver)}>Ver</button>
      <button style={boton("#1a3050", "#f5c842")} onClick={alPulsar(acciones.editar)}>Editar</button>
      <button style={boton("#2d1414", "#ef4444")} onClick={alPulsar(acciones.imprimir)}>PDF</button>
    </>
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

  const vence = c.proxMant
    ? <span style={{ fontSize: 11, color: C.tenue, flexShrink: 0 }}>vence {fmtD(c.proxMant)}</span>
    : null;

  if (compacta) {
    return (
      <Resaltable as="article" onClick={() => acciones.ver(c)}
        estiloHover={{ borderColor: C.acentoFuerte, background: "#fffdfb" }}
        style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 10, background: "#fff",
          padding: "9px 12px 9px 14px", display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", position: "relative", overflow: "hidden",
          transition: "border-color .16s ease, background .16s ease" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: recert ? "#7c3aed" : C.acento }} />
        <div style={{ minWidth: 0, flex: 1 }}>{datos}</div>
        <Badge estado={c.estado} />
        {vence}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>{botones}</div>
      </Resaltable>
    );
  }

  return (
    <Resaltable as="article" onClick={() => acciones.ver(c)}
      estiloHover={{ borderColor: C.acentoFuerte, boxShadow: "0 12px 28px -16px rgba(15,23,42,.30)" }}
      style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 12, background: "#fff",
        padding: "12px 13px 10px", display: "flex", flexDirection: "column", gap: 9,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: recert ? "#7c3aed" : C.acento }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>{datos}</div>
        <Badge estado={c.estado} />
      </div>
      {c.sistema && (
        <div style={{ fontSize: 11.5, color: C.suave, lineHeight: 1.45,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {c.sistema}
        </div>
      )}
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap",
        paddingTop: 8, borderTop: `1px solid ${C.borde}` }}>
        {botones}
        {vence && <span style={{ marginLeft: "auto" }}>{vence}</span>}
      </div>
    </Resaltable>
  );
}
