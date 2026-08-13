// Listado de cotizaciones. Usa el componente comun, igual que obras,
// certificaciones, informes y vencimientos.
//
// Lo propio de aqui: se puede filtrar por obra, y de cada una se hacen seis
// cosas -ver, editar, aprobar, PDF, enviar y borrar-.
//
// AQUI NO SE VEN CIFRAS, como en el resto de listados: se viene a buscar y
// abrir documentos, y el dinero se ve al abrirlos o en el informe financiero.
import { useMemo } from "react";
import ListadoConFiltros, { GrupoFiltro, Resaltable } from "../../components/ListadoConFiltros";
import { C, boton, enMilis } from "../../components/listadoEstilos";
import Badge from "../../components/ui/Badge";
import { SI } from "../../styles/tokens";
import { fmtD } from "../../lib/format";
import { normalizarMayusculas, normalizarRazonSocial } from "../../lib/normalizarEntrada";

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
      estadosFijos={["Pendiente", "Aprobada"]}
      fechaDe={(c) => c.fecha}
      ordenes={ORDENES}
      filtrosExtra={({ valores, poner }) => (
        <GrupoFiltro titulo="Obra">
          <select value={valores.obra || "todas"}
            onChange={(e) => poner("obra", e.target.value === "todas" ? null : e.target.value)}
            style={{ ...SI, fontSize: 12, padding: "6px 8px" }}>
            <option value="todas">Todas las obras</option>
            {obras.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </GrupoFiltro>
      )}
      aplicarExtra={(c, v) => !v.obra || String(c.obra || "").trim() === v.obra}
      fila={(c, { compacta }) => <Fila key={c.id} c={c} compacta={compacta} acciones={acciones} />}
      vacio={{
        titulo: "Todavía no hay cotizaciones",
        texto: "Crea la primera con el botón de arriba.",
      }}
    />
  );
}

function Fila({ c, compacta, acciones }) {
  const aprobada = c.estado === "Aprobada";
  const alPulsar = (fn) => (e) => { e.stopPropagation(); fn(c); };

  // La obra suele llamarse igual que el cliente, y salia el mismo nombre dos
  // veces. Solo se pone si aporta algo distinto.
  const cliente = normalizarRazonSocial(c.cliente);
  const obra = normalizarMayusculas(c.obra || "");
  const ciudad = normalizarMayusculas(c.ciudad || "");
  const mismoNombre = obra && obra.replace(/[.\s]/g, "") === cliente.replace(/[.\s]/g, "");
  const debajo = [mismoNombre ? "" : obra, ciudad].filter(Boolean).join(" · ");

  const botones = (
    <>
      <button style={boton("#dbeafe", "#1e40af")} onClick={alPulsar(acciones.ver)}>Ver</button>
      <button style={boton("#1a3050", "#f5c842")} onClick={alPulsar(acciones.editar)}>Editar</button>
      {!aprobada
        ? <button style={boton("#0f2d1a", "#4ade80", { border: "1px solid #166534" })}
            title="Aprueba la cotización y crea la obra"
            onClick={alPulsar(acciones.aprobar)}>Aprobar</button>
        : <button style={boton("#fff", "#b54708", { border: "1.5px solid #fde3c4" })}
            title="Devuelve la cotización a Pendiente. La obra solo se borra si está sin empezar y tú lo confirmas."
            onClick={alPulsar(acciones.desaprobar)}>↩ Desaprobar</button>}
      <button style={boton("#2d1414", "#ef4444")} onClick={alPulsar(acciones.pdf)}>PDF</button>
      <button style={boton("#f47c20", "#fff")} title="Enviar al cliente"
        onClick={alPulsar(acciones.enviar)}>Enviar</button>
      <button style={boton("#fff", "#ef4444", { border: "1.5px solid #ef4444" })}
        title="Eliminar" onClick={alPulsar(acciones.eliminar)}>🗑</button>
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

  if (compacta) {
    return (
      <Resaltable as="article" onClick={() => acciones.ver(c)}
        estiloHover={{ borderColor: C.acentoFuerte, background: "#fffdfb" }}
        style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 10, background: "#fff",
          padding: "9px 12px 9px 14px", display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", position: "relative", overflow: "hidden",
          transition: "border-color .16s ease, background .16s ease" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: aprobada ? "#12B76A" : C.acento }} />
        <div style={{ minWidth: 0, flex: 1 }}>{datos}</div>
        <Badge estado={c.estado} />
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
        background: aprobada ? "#12B76A" : C.acento }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>{datos}</div>
        <Badge estado={c.estado} />
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 8,
        borderTop: `1px solid ${C.borde}` }}>{botones}</div>
    </Resaltable>
  );
}
