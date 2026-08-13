// Listado de informes de actividades. Usa el componente comun, igual que las
// demas pantallas de listado.
//
// Lo propio de aqui: se puede filtrar por si el informe TIENE FOTOS. Un
// informe sin fotos sale practicamente vacio, y saberlo antes de abrirlo
// ahorra el viaje.
import ListadoConFiltros, { GrupoFiltro, Pastilla, Resaltable } from "../../components/ListadoConFiltros";
import { C, boton, enMilis } from "../../components/listadoEstilos";
import { fmtD } from "../../lib/format";

const ORDENES = [
  { key: "recientes", label: "Más recientes", comparar: (a, b) => enMilis(b.fechaInforme) - enMilis(a.fechaInforme) },
  { key: "antiguos",  label: "Más antiguos",  comparar: (a, b) => enMilis(a.fechaInforme) - enMilis(b.fechaInforme) },
  { key: "obra",      label: "Obra",          comparar: (a, b) => String(a.obraId || "").localeCompare(String(b.obraId || ""), "es") },
  { key: "proyecto",  label: "Proyecto A–Z",  comparar: (a, b) => String(a.proyecto || "").localeCompare(String(b.proyecto || ""), "es") },
];

const contarFotos = (inf) =>
  (inf?.actividades || []).reduce((s, a) => s + (a?.fotos || []).filter((f) => f?.img).length, 0);

export default function ListaInformes({ informes, acciones }) {
  return (
    <ListadoConFiltros
      datos={informes || []}
      nombre="informe"
      nombrePlural="informes"
      marcador="Buscar por número, obra, proyecto o localización…"
      buscarEn={(i) => [i.id, i.obraId, i.proyecto, i.localizacion].filter(Boolean).join(" ")}
      fechaDe={(i) => i.fechaInforme}
      ordenes={ORDENES}
      filtrosExtra={({ valores, poner }) => (
        <GrupoFiltro titulo="Registro fotográfico">
          <Pastilla activa={valores.fotos === "con"}
            onClick={() => poner("fotos", valores.fotos === "con" ? null : "con")}>Con fotos</Pastilla>
          <Pastilla activa={valores.fotos === "sin"}
            onClick={() => poner("fotos", valores.fotos === "sin" ? null : "sin")}>Sin fotos</Pastilla>
        </GrupoFiltro>
      )}
      aplicarExtra={(i, v) => {
        if (v.fotos === "con") return contarFotos(i) > 0;
        if (v.fotos === "sin") return contarFotos(i) === 0;
        return true;
      }}
      fila={(i, { compacta }) => <Fila key={i.id} inf={i} compacta={compacta} acciones={acciones} />}
      vacio={{
        titulo: "Todavía no hay informes",
        texto: "Se arman con los avances que se registran en la obra, en «Avance y fotos».",
      }}
    />
  );
}

function Fila({ inf, compacta, acciones }) {
  const fotos = contarFotos(inf);
  const actividades = (inf.actividades || []).length;
  const alPulsar = (fn) => (e) => { e.stopPropagation(); fn(inf); };

  // La localizacion suele repetir el proyecto; solo se pone si aporta.
  const proyecto = String(inf.proyecto || "").trim() || inf.id;
  const localizacion = String(inf.localizacion || "").trim();
  const repetida = localizacion
    && localizacion.replace(/[.\s]/g, "").toUpperCase() === proyecto.replace(/[.\s]/g, "").toUpperCase();
  const periodo = inf.periodoInicio || inf.periodoFin
    ? `del ${fmtD(inf.periodoInicio)} al ${fmtD(inf.periodoFin)}`
    : "";
  const debajo = [repetida ? "" : localizacion, inf.obraId, periodo].filter(Boolean).join(" · ");

  const botones = (
    <>
      <button style={boton("#dbeafe", "#1e40af")} onClick={alPulsar(acciones.ver)}>Ver</button>
      <button style={boton("#1a3050", "#f5c842")} onClick={alPulsar(acciones.editar)}>Editar</button>
    </>
  );

  const contadores = (
    <>
      <span style={{ fontSize: 11, color: C.tenue, flexShrink: 0 }}>
        {actividades} act. · {(inf.personal || []).length} 👷
      </span>
      <span
        title={fotos ? "Fotos cargadas para el informe" : "Sin fotos: el informe saldría vacío"}
        style={{ fontSize: 11, color: fotos ? C.tenue : "#b54708", flexShrink: 0 }}>{fotos} 📸</span>
    </>
  );

  const datos = (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.tinta }}>{proyecto}</span>
        <span style={{ fontSize: 11, color: C.tenue }}>
          {inf.id}{inf.fechaInforme ? ` · ${fmtD(inf.fechaInforme)}` : ""}
        </span>
      </div>
      {debajo && (
        <div style={{ fontSize: 11.5, color: C.apagado, marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{debajo}</div>
      )}
    </>
  );

  // La barra en ambar avisa de un informe sin fotos, que es el que sale vacio.
  const color = fotos ? C.acento : "#fbbf24";

  if (compacta) {
    return (
      <Resaltable as="article" onClick={() => acciones.ver(inf)}
        estiloHover={{ borderColor: C.acentoFuerte, background: "#fffdfb" }}
        style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 10, background: "#fff",
          padding: "9px 12px 9px 14px", display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", position: "relative", overflow: "hidden",
          transition: "border-color .16s ease, background .16s ease" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color }} />
        <div style={{ minWidth: 0, flex: 1 }}>{datos}</div>
        {contadores}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>{botones}</div>
      </Resaltable>
    );
  }

  return (
    <Resaltable as="article" onClick={() => acciones.ver(inf)}
      estiloHover={{ borderColor: C.acentoFuerte, boxShadow: "0 12px 28px -16px rgba(15,23,42,.30)" }}
      style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 12, background: "#fff",
        padding: "12px 13px 10px", display: "flex", flexDirection: "column", gap: 9,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>{datos}</div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "flex-start" }}>{contadores}</div>
      </div>
      {actividades > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {(inf.actividades || []).slice(0, 3).map((a, i) => (
            <span key={i} style={{ background: "#fff3e8", color: "#cc6600", borderRadius: 4,
              padding: "2px 7px", fontSize: 10.5, border: "1px solid #f47c2044" }}>
              {a.titulo || `Actividad ${i + 1}`}
            </span>
          ))}
          {actividades > 3 && (
            <span style={{ fontSize: 10.5, color: C.tenue, alignSelf: "center" }}>y {actividades - 3} más</span>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 8,
        borderTop: `1px solid ${C.borde}` }}>{botones}</div>
    </Resaltable>
  );
}
