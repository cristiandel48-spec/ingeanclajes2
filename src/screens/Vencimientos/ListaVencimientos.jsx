// Listado de certificaciones por vencer. Usa el componente comun, igual que
// las demas pantallas.
//
// LO QUE CAMBIA RESPECTO DE ANTES: los cuatro grupos -vencidas, urgente,
// proximas, al dia- eran cuatro bloques apilados, y para llegar a las que
// estan al dia habia que bajar por los tres anteriores. Ahora son las
// pestañas de arriba, con su conteo: se ve cuantas hay en cada estado de un
// vistazo y se entra a uno solo.
//
// El color y el aviso de dias son los mismos de antes: es lo que se mira
// primero en esta pantalla.
import ListadoConFiltros, { Resaltable } from "../../components/ListadoConFiltros";
import { C, boton } from "../../components/listadoEstilos";
import { colorVencimiento, etiquetaVencimiento } from "../../lib/vencimientos";
import { fmtD } from "../../lib/format";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

// En que grupo cae cada una. Los mismos cortes que usaba la pantalla.
const grupoDe = (dias) => {
  if (dias === null) return "Sin fecha";
  if (dias < 0) return "Vencidas";
  if (dias < 30) return "Urgente";
  if (dias < 90) return "Próximas";
  return "Al día";
};

// Las que no tienen fecha van al final, se ordene como se ordene: no se sabe
// cuando vencen y no tiene sentido colarlas entre las urgentes.
const alFinalSinFecha = (a, b, comparar) => {
  if (a.diasRestantes === null && b.diasRestantes === null) return 0;
  if (a.diasRestantes === null) return 1;
  if (b.diasRestantes === null) return -1;
  return comparar(a, b);
};

const ORDENES = [
  { key: "urgencia", label: "Más urgentes", comparar: (a, b) => alFinalSinFecha(a, b, (x, y) => x.diasRestantes - y.diasRestantes) },
  { key: "lejanas",  label: "Más lejanas",  comparar: (a, b) => alFinalSinFecha(a, b, (x, y) => y.diasRestantes - x.diasRestantes) },
  { key: "cliente",  label: "Cliente A–Z",  comparar: (a, b) => String(a.cliente || "").localeCompare(String(b.cliente || ""), "es") },
];

export default function ListaVencimientos({ lista, obras, acciones }) {
  return (
    <ListadoConFiltros
      datos={lista || []}
      nombre="certificación"
      nombrePlural="certificaciones por vencer"
      marcador="Buscar por número, cliente, sistema o sede…"
      buscarEn={(c) => [c.numero, c.id, c.cliente, c.sistema, c.lugar, c.obraId].filter(Boolean).join(" ")}
      estadoDe={(c) => grupoDe(c.diasRestantes)}
      estadosFijos={["Vencidas", "Urgente", "Próximas", "Al día"]}
      fechaDe={(c) => c.proxMant}
      ordenes={ORDENES}
      fila={(c, { compacta }) => (
        <Fila key={c.id} c={c} compacta={compacta} acciones={acciones}
          obra={(obras || []).find((o) => o.id === c.obraId)} />
      )}
      vacio={{
        titulo: "No hay certificaciones por vencer",
        texto: "Aquí aparecen las certificaciones con su próximo mantenimiento, para renovarlas antes de tiempo.",
      }}
    />
  );
}

function Fila({ c, compacta, acciones, obra }) {
  const dias = c.diasRestantes;
  const color = colorVencimiento(dias);
  const vencida = dias !== null && dias < 0;
  const alPulsar = (fn) => (e) => { e.stopPropagation(); fn(c); };

  const cliente = normalizarRazonSocial(c.cliente);
  const donde = String(c.lugar || obra?.direccion || obra?.ciudad || "").trim();
  const repetido = donde && donde.replace(/[.\s]/g, "").toUpperCase() === cliente.replace(/[.\s]/g, "").toUpperCase();
  const debajo = [
    repetido ? "" : donde,
    c.proxMant ? `próximo mantenimiento ${fmtD(c.proxMant)}` : "sin fecha registrada",
  ].filter(Boolean).join(" · ");

  const aviso = (
    <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 999,
      padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {etiquetaVencimiento(dias)}
    </span>
  );

  const botones = (
    <>
      <button
        style={boton(vencida ? "#7c1010" : "#0f2d1a", vencida ? "#fff" : "#4ade80",
          { border: `1px solid ${vencida ? "#ef4444" : "#166534"}` })}
        onClick={alPulsar(acciones.recertificar)}>
        {vencida ? "Recertificar ahora" : "Recertificar"}
      </button>
      <button style={boton("#2d1414", "#ef4444")} onClick={alPulsar(acciones.verPdf)}>PDF</button>
    </>
  );

  const datos = (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.tinta }}>{cliente}</span>
        <span style={{ fontSize: 11, color: C.tenue }}>{c.numero || c.id}</span>
      </div>
      <div style={{ fontSize: 11.5, color: C.apagado, marginTop: 1,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{debajo}</div>
    </>
  );

  if (compacta) {
    return (
      <Resaltable as="article" onClick={() => acciones.recertificar(c)}
        title={vencida ? "Clic para recertificar" : undefined}
        estiloHover={{ borderColor: color, background: "#fffdfb" }}
        style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 10, background: "#fff",
          padding: "9px 12px 9px 14px", display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", position: "relative", overflow: "hidden",
          transition: "border-color .16s ease, background .16s ease" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color }} />
        <div style={{ minWidth: 0, flex: 1 }}>{datos}</div>
        {aviso}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>{botones}</div>
      </Resaltable>
    );
  }

  return (
    <Resaltable as="article" onClick={() => acciones.recertificar(c)}
      title={vencida ? "Clic para recertificar" : undefined}
      estiloHover={{ borderColor: color, boxShadow: "0 12px 28px -16px rgba(15,23,42,.30)" }}
      style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 12, background: "#fff",
        padding: "12px 13px 10px", display: "flex", flexDirection: "column", gap: 9,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>{datos}</div>
        {aviso}
      </div>
      {c.sistema && (
        <div style={{ fontSize: 11.5, color: C.suave, lineHeight: 1.45,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {c.sistema}
        </div>
      )}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 8,
        borderTop: `1px solid ${C.borde}` }}>{botones}</div>
    </Resaltable>
  );
}
