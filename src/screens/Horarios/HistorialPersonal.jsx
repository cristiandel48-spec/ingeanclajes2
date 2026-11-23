import { useMemo, useState } from "react";
import { Button, Callout, EmptyState, Input, SegmentedControl, Sheet } from "../../components/ui";
import { today } from "../../lib/format";
import {
  armarHistorial,
  esFechaIso,
  fechaCortaHistorial,
  fechaLargaHistorial,
  rangoEsteMes,
  rangoMesPasado,
  rangoUltimosDias,
  tituloPeriodoHistorial,
} from "../../lib/historialPersonal";
import { obrasMasNuevasPrimero } from "../../lib/identificadores";

// Historial de personal en obras: donde estuvo cada persona y que obras hubo
// cada dia, en el rango que se elija, con descarga en Excel y PDF.
//
// Sale de los turnos de Horarios; aqui solo se consulta. Lo que se descarga es
// lo que se esta viendo: el mismo rango, los mismos filtros y, en el PDF, la
// misma agrupacion (por persona o por dia).

const ESTILOS = `
  .hist-filtros {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 12px;
    margin: 14px 0 16px;
  }
  .hist-cifras {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 16px;
  }
  .hist-cifra {
    padding: 10px 12px;
    border: 1px solid var(--separator);
    border-radius: 12px;
    background: var(--surface-subtle);
  }
  .hist-cifra__valor {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary);
  }
  .hist-cifra__rotulo { font-size: 12px; color: var(--text-tertiary); }
  .hist-barra {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }
  .hist-grupo {
    border: 1px solid var(--separator);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 12px;
    background: var(--surface);
  }
  .hist-grupo__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px 12px;
    padding: 10px 14px;
    background: var(--surface-subtle);
  }
  .hist-grupo__titulo { font-size: 14.5px; font-weight: 600; color: var(--text-primary); }
  .hist-grupo__sub { font-size: 12px; font-weight: 400; color: var(--text-tertiary); margin-left: 8px; }
  .hist-grupo__detalle { font-size: 12px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }
  .hist-fila {
    display: grid;
    gap: 4px 14px;
    padding: 9px 14px;
    border-top: 1px solid var(--separator);
    font-size: 13px;
    line-height: 1.45;
    color: var(--text-secondary);
  }
  .hist-fila--persona { grid-template-columns: 128px minmax(0, 1.2fr) minmax(0, 1.3fr) 150px; }
  .hist-fila--dia { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.6fr) minmax(0, 1.2fr); }
  .hist-fila__fuerte { font-weight: 600; color: var(--text-primary); }
  .hist-fila__tenue { display: block; font-size: 12px; color: var(--text-tertiary); }
  .hist-codigo {
    display: inline-block;
    margin-left: 6px;
    padding: 0 6px;
    border-radius: 6px;
    background: var(--fill);
    color: var(--text-tertiary);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11px;
    font-weight: 600;
  }
  @media (max-width: 640px) {
    .hist-cifras { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .hist-fila--persona, .hist-fila--dia { grid-template-columns: minmax(0, 1fr); }
  }
`;

const ATAJOS = [
  { id: "mesPasado", label: "Mes pasado" },
  { id: "esteMes", label: "Este mes" },
  { id: "semana", label: "Últimos 7 días" },
  { id: "otro", label: "Otro rango" },
];

const VISTAS = [
  { id: "persona", label: "Por persona" },
  { id: "dia", label: "Por día" },
];

const rangoDelAtajo = (id, hoy) => {
  if (id === "esteMes") return rangoEsteMes(hoy);
  if (id === "semana") return rangoUltimosDias(hoy, 7);
  return rangoMesPasado(hoy);
};

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export default function HistorialPersonal({ horarios = [], obras = [], empleados = [], onCerrar }) {
  const hoy = today();
  // Abre en el mes pasado: es la consulta de siempre («¿donde estuvo cada
  // quien el mes pasado?»).
  const [atajo, setAtajo] = useState("mesPasado");
  const [rango, setRango] = useState(() => rangoMesPasado(hoy));
  const [empleadoId, setEmpleadoId] = useState("");
  const [obraId, setObraId] = useState("");
  const [vista, setVista] = useState("persona");
  const [ocupado, setOcupado] = useState(null); // "excel" | "pdf" | null
  const [error, setError] = useState("");

  const elegirAtajo = (id) => {
    setAtajo(id);
    if (id !== "otro") setRango(rangoDelAtajo(id, hoy));
  };
  // Tocar una fecha a mano pasa a «Otro rango».
  const cambiarFecha = (campo, valor) => {
    if (!esFechaIso(valor)) return;
    setAtajo("otro");
    setRango((prev) => ({ ...prev, [campo]: valor }));
  };

  const historial = useMemo(
    () => armarHistorial({ horarios, obras, empleados, desde: rango.desde, hasta: rango.hasta, empleadoId, obraId }),
    [horarios, obras, empleados, rango, empleadoId, obraId]
  );
  const hayDatos = historial.registros.length > 0;

  const personas = useMemo(
    () => [...empleados].sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" })),
    [empleados]
  );
  const listaObras = useMemo(() => obrasMasNuevasPrimero(obras), [obras]);

  const descargar = async (tipo) => {
    if (ocupado || !hayDatos) return;
    setOcupado(tipo);
    setError("");
    try {
      const exportar = await import("../../lib/historialPersonalExport");
      if (tipo === "excel") await exportar.descargarHistorialExcel(historial);
      else await exportar.descargarHistorialPdf(historial, vista);
    } catch (e) {
      setError(e?.message || "No se pudo generar el archivo. Intenta de nuevo.");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Sheet
      ancha
      onCerrar={onCerrar}
      titulo="Historial de personal en obras"
      subtitulo={tituloPeriodoHistorial(historial.desde, historial.hasta)}
      pie={
        <>
          <Button variante="secondary" onClick={onCerrar}>Cerrar</Button>
          <Button
            variante="secondary"
            icono="descargar"
            onClick={() => descargar("excel")}
            disabled={!hayDatos || Boolean(ocupado)}
            title="Descarga un libro de Excel con las hojas Por persona, Por día y Resumen"
          >
            {ocupado === "excel" ? "Generando…" : "Excel"}
          </Button>
          <Button
            variante="primary"
            icono="documento"
            onClick={() => descargar("pdf")}
            disabled={!hayDatos || Boolean(ocupado)}
            title={`Descarga el PDF agrupado ${vista === "dia" ? "por día" : "por persona"}, como se ve aquí`}
          >
            {ocupado === "pdf" ? "Generando…" : "PDF"}
          </Button>
        </>
      }
    >
      <style>{ESTILOS}</style>

      <SegmentedControl opciones={ATAJOS} valor={atajo} onChange={elegirAtajo} etiqueta="Período" />

      <div className="hist-filtros">
        <Input
          label="Desde"
          type="date"
          value={rango.desde}
          max={rango.hasta}
          onChange={(e) => cambiarFecha("desde", e.target.value)}
        />
        <Input
          label="Hasta"
          type="date"
          value={rango.hasta}
          min={rango.desde}
          onChange={(e) => cambiarFecha("hasta", e.target.value)}
        />
        <Input label="Persona" como="select" value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)}>
          <option value="">Todo el personal</option>
          {personas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </Input>
        <Input label="Obra" como="select" value={obraId} onChange={(e) => setObraId(e.target.value)}>
          <option value="">Todas las obras</option>
          {listaObras.map((o) => (
            <option key={o.id} value={o.id}>
              {[o.id, o.cliente, o.proyecto && o.proyecto !== o.cliente ? o.proyecto : ""].filter(Boolean).join(" · ")}
            </option>
          ))}
        </Input>
      </div>

      {error && <Callout tono="peligro" style={{ marginBottom: 12 }}>{error}</Callout>}

      {!hayDatos ? (
        <EmptyState
          icono="calendario"
          titulo="No hay personal programado en ese período"
          texto="Prueba con otro rango de fechas o quita el filtro de persona u obra. El historial sale de los turnos asignados en Horarios."
        />
      ) : (
        <>
          <div className="hist-cifras">
            <div className="hist-cifra">
              <div className="hist-cifra__valor">{historial.totales.personas}</div>
              <div className="hist-cifra__rotulo">{historial.totales.personas === 1 ? "Persona" : "Personas"}</div>
            </div>
            <div className="hist-cifra">
              <div className="hist-cifra__valor">{historial.totales.dias}</div>
              <div className="hist-cifra__rotulo">{historial.totales.dias === 1 ? "Día con actividad" : "Días con actividad"}</div>
            </div>
            <div className="hist-cifra">
              <div className="hist-cifra__valor">{historial.totales.obras}</div>
              <div className="hist-cifra__rotulo">{historial.totales.obras === 1 ? "Obra" : "Obras"}</div>
            </div>
            <div className="hist-cifra">
              <div className="hist-cifra__valor">{historial.totales.asistencias}</div>
              <div className="hist-cifra__rotulo">{historial.totales.asistencias === 1 ? "Asistencia" : "Asistencias"}</div>
            </div>
          </div>

          <div className="hist-barra">
            <SegmentedControl opciones={VISTAS} valor={vista} onChange={setVista} etiqueta="Agrupar el historial" />
            <span style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>
              {vista === "dia" ? "Qué obras hubo cada día y quién fue" : "Dónde estuvo cada persona, día por día"}
            </span>
          </div>

          {vista === "persona" && historial.porPersona.map((p) => (
            <section key={p.empleadoId} className="hist-grupo">
              <header className="hist-grupo__head">
                <span className="hist-grupo__titulo">
                  {p.persona}
                  {p.cargo && <span className="hist-grupo__sub">{p.cargo}</span>}
                </span>
                <span className="hist-grupo__detalle">
                  {plural(p.dias, "día", "días")} · {plural(p.obras, "obra", "obras")}
                </span>
              </header>
              {p.registros.map((r) => (
                <div key={`${r.fecha}|${r.obraId}`} className="hist-fila hist-fila--persona">
                  <div>
                    <span className="hist-fila__fuerte">{fechaCortaHistorial(r.fecha)}</span>
                    <span className="hist-fila__tenue">{r.dia}</span>
                  </div>
                  <div>
                    <span className="hist-fila__fuerte">{r.cliente}</span>
                    {r.obraId && <span className="hist-codigo">{r.obraId}</span>}
                    {r.proyecto && <span className="hist-fila__tenue">{r.proyecto}</span>}
                  </div>
                  <div>
                    {r.actividad || "—"}
                    {r.direccion && <span className="hist-fila__tenue">{r.direccion}</span>}
                  </div>
                  <div>{r.horario || "—"}</div>
                </div>
              ))}
            </section>
          ))}

          {vista === "dia" && historial.porDia.map((d) => (
            <section key={d.fecha} className="hist-grupo">
              <header className="hist-grupo__head">
                <span className="hist-grupo__titulo">{d.dia} {fechaLargaHistorial(d.fecha)}</span>
                <span className="hist-grupo__detalle">
                  {plural(d.personas, "persona", "personas")} · {plural(d.obras.length, "obra", "obras")}
                </span>
              </header>
              {d.obras.map((o) => (
                <div key={o.obraId} className="hist-fila hist-fila--dia">
                  <div>
                    <span className="hist-fila__fuerte">{o.cliente}</span>
                    {o.obraId && <span className="hist-codigo">{o.obraId}</span>}
                    {o.proyecto && <span className="hist-fila__tenue">{o.proyecto}</span>}
                  </div>
                  <div>
                    {o.personas.join(", ")}
                    <span className="hist-fila__tenue">{plural(o.personas.length, "persona", "personas")}</span>
                  </div>
                  <div>
                    {o.actividad || "—"}
                    {o.direccion && <span className="hist-fila__tenue">{o.direccion}</span>}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </Sheet>
  );
}
