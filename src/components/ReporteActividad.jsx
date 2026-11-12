import { useEffect, useMemo, useState } from "react";
import Button from "./ui/Button";
import SegmentedControl from "./ui/SegmentedControl";
import { listarUsuarios } from "../lib/backend";
import { puedeVerReporteActividad, sinCuentasSoporte } from "../lib/permisos";
import {
  TIPOS_REPORTE,
  armarReporteActividad,
  mesActualColombia,
  restarMeses,
  tituloMes,
  tituloPeriodo,
} from "../lib/reporteActividad";

// Reporte de actividad por usuario: cuantas cotizaciones, informes,
// certificaciones y ejecuciones de obra hizo cada quien en cada mes, con
// descarga en Excel y en PDF.
//
// Es solo para Camila Sepulveda. El boton vive en «Mis tareas» porque es el
// unico modulo que tiene todo el mundo sin importar su rol: en cualquier otro
// dependeria de que se lo hubieran marcado.

const PERIODOS = [
  { id: "1", label: "Este mes" },
  { id: "3", label: "3 meses" },
  { id: "6", label: "6 meses" },
  { id: "12", label: "12 meses" },
];

const ESTILOS = `
.ra-fondo { position: fixed; inset: 0; z-index: var(--capa-hoja, 2000); background: rgba(16, 24, 40, .42); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.ra-hoja { background: var(--surface); color: var(--text-primary); border-radius: 20px; box-shadow: var(--sombra-lg); width: 100%; max-width: 860px; max-height: calc(100dvh - 32px); display: flex; flex-direction: column; overflow: hidden; animation: raEntrada .25s cubic-bezier(.2,.8,.2,1); }
@keyframes raEntrada { from { opacity: 0; transform: translateY(8px) scale(.99); } to { opacity: 1; transform: none; } }
.ra-cabeza { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 24px 24px 0; }
.ra-eyebrow { font-size: 11px; line-height: 14px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--accent); }
.ra-titulo { font-size: 22px; line-height: 28px; font-weight: 700; letter-spacing: -.018em; margin: 2px 0 0; }
.ra-sub { font-size: 13px; line-height: 18px; color: var(--text-tertiary); margin-top: 4px; }
.ra-cuerpo { padding: 20px 24px 8px; overflow-y: auto; }
.ra-filtros { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ra-rango { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-tertiary); }
.ra-rango input { height: 36px; border: 0; border-radius: 10px; background: var(--fill); color: var(--text-primary); font: inherit; font-size: 13px; padding: 0 10px; outline: none; }
.ra-rango input:focus-visible { box-shadow: 0 0 0 3px var(--accent-tint); }
.ra-tarjetas { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0 20px; }
.ra-tarjeta { background: var(--surface-subtle); border-radius: 14px; padding: 14px 16px; }
.ra-cifra { font-size: 26px; line-height: 30px; font-weight: 700; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.ra-etiqueta { font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-tertiary); margin-top: 2px; }
.ra-tabla-caja { overflow-x: auto; margin: 0 -4px; padding: 0 4px; }
.ra-tabla { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 560px; }
.ra-tabla th { font-size: 11px; line-height: 14px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--text-quaternary); text-align: right; padding: 0 8px 8px; border-bottom: 1px solid var(--separator); white-space: nowrap; }
.ra-tabla th:first-child, .ra-tabla td:first-child { text-align: left; padding-left: 0; }
.ra-tabla td { text-align: right; padding: 5px 8px; font-variant-numeric: tabular-nums; }
.ra-tabla td:last-child, .ra-tabla th:last-child { padding-right: 0; }
.ra-usuario td { font-weight: 600; padding-top: 12px; border-top: 1px solid var(--separator); }
.ra-tabla tbody tr.ra-usuario:first-child td { border-top: 0; }
.ra-mes td { color: var(--text-secondary); }
.ra-mes td:first-child { padding-left: 14px; }
.ra-cero { color: var(--text-quaternary); font-weight: 400; }
.ra-total td { font-weight: 700; padding: 12px 8px 4px; border-top: 1px solid var(--border-strong); }
.ra-vacio { text-align: center; padding: 36px 16px; font-size: 13px; color: var(--text-tertiary); }
.ra-pie { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 16px 24px 20px; border-top: 1px solid var(--separator); }
.ra-nota { font-size: 12px; line-height: 16px; color: var(--text-tertiary); flex: 1; min-width: 180px; }
.ra-error { color: var(--danger-text); }
.ra-acciones { display: flex; gap: 8px; flex-wrap: wrap; }
@media (max-width: 600px) {
  .ra-fondo { padding: 0; align-items: flex-end; }
  .ra-hoja { max-height: 94dvh; border-radius: 20px 20px 0 0; }
  .ra-cabeza { padding: 20px 16px 0; }
  .ra-cuerpo { padding: 16px 16px 8px; }
  .ra-tarjetas { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ra-pie { padding: 12px 16px calc(16px + var(--safe-bottom, 0px)); }
  .ra-acciones { width: 100%; }
  .ra-acciones .ui-btn { flex: 1; }
  .ra-rango input { font-size: 16px; }
}
`;

function Cifra({ valor }) {
  return <td className={valor ? undefined : "ra-cero"}>{valor}</td>;
}

function HojaReporte({ ctx, onCerrar }) {
  const { cotizaciones = [], informes = [], certs = [], obras = [] } = ctx || {};
  const mesActual = useMemo(() => mesActualColombia(), []);

  const [periodo, setPeriodo] = useState("6");
  const [desde, setDesde] = useState(() => restarMeses(mesActual, 5));
  const [hasta, setHasta] = useState(mesActual);
  const [usuarios, setUsuarios] = useState([]);
  const [descargando, setDescargando] = useState("");
  const [error, setError] = useState("");

  // Los nombres del equipo. Si no llegan, el reporte sale igual con el nombre
  // que quedo guardado en cada documento.
  useEffect(() => {
    let activo = true;
    listarUsuarios()
      .then((lista) => { if (activo && Array.isArray(lista)) setUsuarios(sinCuentasSoporte(lista)); })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    const alPulsar = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [onCerrar]);

  const elegirPeriodo = (id) => {
    setPeriodo(id);
    setDesde(restarMeses(mesActual, Number(id) - 1));
    setHasta(mesActual);
  };

  const reporte = useMemo(
    () => armarReporteActividad({ cotizaciones, informes, certs, obras, usuarios, desde, hasta }),
    [cotizaciones, informes, certs, obras, usuarios, desde, hasta]
  );
  const hayDatos = reporte.totales.general.total > 0;

  const descargar = async (formato) => {
    setError("");
    setDescargando(formato);
    try {
      const salida = await import("../lib/reporteActividadExport");
      if (formato === "excel") await salida.descargarReporteExcel(reporte);
      else await salida.descargarReportePdf(reporte);
    } catch (fallo) {
      setError(fallo?.message || "No se pudo generar el archivo. Inténtalo de nuevo.");
    } finally {
      setDescargando("");
    }
  };

  return (
    <div className="ra-fondo" onClick={onCerrar}>
      <div className="ra-hoja" role="dialog" aria-modal="true" aria-labelledby="ra-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="ra-cabeza">
          <div style={{ minWidth: 0 }}>
            <div className="ra-eyebrow">Equipo</div>
            <h2 className="ra-titulo" id="ra-titulo">Reporte de actividad por usuario</h2>
            <div className="ra-sub">{tituloPeriodo(reporte.desde, reporte.hasta)} · documentos creados por cada persona</div>
          </div>
          <Button variante="tertiary" soloIcono icono="cerrar" aria-label="Cerrar" onClick={onCerrar} />
        </div>

        <div className="ra-cuerpo">
          <div className="ra-filtros">
            <SegmentedControl opciones={PERIODOS} valor={periodo} onChange={elegirPeriodo} etiqueta="Período" />
            <label className="ra-rango">
              Desde
              <input
                type="month"
                value={desde}
                max={hasta}
                onChange={(e) => { if (e.target.value) { setDesde(e.target.value); setPeriodo(""); } }}
              />
            </label>
            <label className="ra-rango">
              Hasta
              <input
                type="month"
                value={hasta}
                min={desde}
                max={mesActual}
                onChange={(e) => { if (e.target.value) { setHasta(e.target.value); setPeriodo(""); } }}
              />
            </label>
          </div>

          <div className="ra-tarjetas">
            {TIPOS_REPORTE.map((t) => (
              <div className="ra-tarjeta" key={t.id}>
                <div className="ra-cifra">{reporte.totales.general[t.id]}</div>
                <div className="ra-etiqueta">{t.label}</div>
              </div>
            ))}
          </div>

          {reporte.filas.length === 0 ? (
            <div className="ra-vacio">No hay documentos creados en este período.</div>
          ) : (
            <div className="ra-tabla-caja">
              <table className="ra-tabla">
                <thead>
                  <tr>
                    <th>Usuario / mes</th>
                    {TIPOS_REPORTE.map((t) => <th key={t.id}>{t.corto}</th>)}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.filas.map((fila) => [
                    <tr className="ra-usuario" key={fila.usuario}>
                      <td>{fila.usuario}</td>
                      {TIPOS_REPORTE.map((t) => <Cifra key={t.id} valor={fila.totales[t.id]} />)}
                      <Cifra valor={fila.totales.total} />
                    </tr>,
                    ...reporte.meses
                      .filter((mes) => fila.porMes[mes]?.total)
                      .map((mes) => (
                        <tr className="ra-mes" key={`${fila.usuario}-${mes}`}>
                          <td>{tituloMes(mes)}</td>
                          {TIPOS_REPORTE.map((t) => <Cifra key={t.id} valor={fila.porMes[mes][t.id]} />)}
                          <Cifra valor={fila.porMes[mes].total} />
                        </tr>
                      )),
                  ])}
                  {hayDatos && (
                    <tr className="ra-total">
                      <td>Total del período</td>
                      {TIPOS_REPORTE.map((t) => <Cifra key={t.id} valor={reporte.totales.general[t.id]} />)}
                      <Cifra valor={reporte.totales.general.total} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="ra-pie">
          <div className={`ra-nota${error ? " ra-error" : ""}`} role={error ? "alert" : undefined}>
            {error || "Cuenta cada documento a nombre de quien lo creó, en el mes en que lo creó."}
          </div>
          <div className="ra-acciones">
            <Button icono="descargar" cargando={descargando === "excel"} disabled={Boolean(descargando)} onClick={() => descargar("excel")}>
              Descargar Excel
            </Button>
            <Button icono="descargar" cargando={descargando === "pdf"} disabled={Boolean(descargando)} onClick={() => descargar("pdf")}>
              Descargar PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BotonReporteActividad({ ctx }) {
  const [abierto, setAbierto] = useState(false);
  if (!puedeVerReporteActividad(ctx?.membresia)) return null;

  return (
    <>
      <style>{ESTILOS}</style>
      <Button icono="documento" onClick={() => setAbierto(true)}>
        Reporte de actividad del equipo
      </Button>
      {abierto && <HojaReporte ctx={ctx} onCerrar={() => setAbierto(false)} />}
    </>
  );
}
