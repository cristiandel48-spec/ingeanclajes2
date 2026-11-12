import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Button from "./ui/Button";
import SegmentedControl from "./ui/SegmentedControl";
import { enviarCotizacionPorCorreo, listarUsuarios } from "../lib/backend/usuarios";
import { puedeVerReporteActividad, sinCuentasSoporte } from "../lib/permisos";
import {
  TIPOS_REPORTE,
  armarReporteActividad,
  filtrarReportePorUsuario,
  mesActualColombia,
  restarMeses,
  tituloMes,
  tituloPeriodo,
  valorCasilla,
} from "../lib/reporteActividad";

// Reporte de actividad por usuario: cuantas cotizaciones, informes,
// certificaciones y ejecuciones de obra hizo cada quien en cada mes, con
// descarga en Excel y en PDF.
//
// Es solo para Camila Sepulveda. Se abre desde un icono propio en «Mis
// tareas», al lado de la tarjeta de la lista: es el unico modulo que tiene
// todo el mundo sin importar su rol. Estuvo como boton DENTRO de la tarjeta,
// debajo del titulo, y ahi estorbaba: no es una tarea.

const CORREO_VALIDO = /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/;

const blobABase64 = (blob) =>
  new Promise((listo, fallo) => {
    const lector = new FileReader();
    lector.onload = () => {
      const texto = String(lector.result || "");
      listo(texto.slice(texto.indexOf(",") + 1));
    };
    lector.onerror = () => fallo(new Error("No se pudo preparar el PDF para el correo."));
    lector.readAsDataURL(blob);
  });

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
.ra-rango select { height: 36px; border: 0; border-radius: 10px; background: var(--fill); color: var(--text-primary); font: inherit; font-size: 13px; padding: 0 10px; outline: none; max-width: 220px; }
.ra-rango input:focus-visible, .ra-rango select:focus-visible { box-shadow: 0 0 0 3px var(--accent-tint); }
.ra-tarjetas { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 18px 0 20px; }
.ra-tarjeta { background: var(--surface-subtle); border-radius: 14px; padding: 14px 16px; }
.ra-cifra { font-size: 26px; line-height: 30px; font-weight: 700; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.ra-etiqueta { font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-tertiary); margin-top: 2px; }
.ra-tabla-caja { overflow-x: auto; margin: 0 -4px; padding: 0 4px; }
.ra-tabla { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 640px; }
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
.ra-ok { color: var(--success-text); }
.ra-acciones { display: flex; gap: 8px; flex-wrap: wrap; }
.ra-correo { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; width: 100%; }
.ra-correo input { flex: 1; min-width: 200px; height: 36px; border: 0; border-radius: 10px; background: var(--fill); color: var(--text-primary); font: inherit; font-size: 13px; padding: 0 12px; outline: none; }
.ra-correo input:focus-visible { box-shadow: 0 0 0 3px var(--accent-tint); }
@media (max-width: 600px) {
  .ra-fondo { padding: 0; align-items: flex-end; }
  .ra-hoja { max-height: 94dvh; border-radius: 20px 20px 0 0; }
  .ra-cabeza { padding: 20px 16px 0; }
  .ra-cuerpo { padding: 16px 16px 8px; }
  .ra-tarjetas { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ra-pie { padding: 12px 16px calc(16px + var(--safe-bottom, 0px)); }
  .ra-acciones { width: 100%; }
  .ra-acciones .ui-btn { flex: 1; }
  .ra-rango input, .ra-rango select, .ra-correo input { font-size: 16px; height: 44px; }
}
`;

function Cifra({ valor }) {
  return <td className={typeof valor === "number" && valor ? undefined : "ra-cero"}>{valor}</td>;
}

// Las casillas de una fila: una por tipo de documento y el total.
function Casillas({ fila, conteo }) {
  return (
    <>
      {TIPOS_REPORTE.map((t) => <Cifra key={t.id} valor={valorCasilla(fila, conteo, t.id)} />)}
      <Cifra valor={conteo.total} />
    </>
  );
}

function HojaReporte({ ctx, onCerrar }) {
  const { cotizaciones = [], informes = [], certs = [], obras = [], agenda = [] } = ctx || {};
  // La agenda que llega es solo la de quien tiene la sesion: sus visitas.
  const agendaDe = ctx?.membresia?.nombre || ctx?.membresia?.email || "";
  const mesActual = useMemo(() => mesActualColombia(), []);

  const [periodo, setPeriodo] = useState("6");
  const [desde, setDesde] = useState(() => restarMeses(mesActual, 5));
  const [hasta, setHasta] = useState(mesActual);
  const [usuarios, setUsuarios] = useState([]);
  const [descargando, setDescargando] = useState("");
  const [error, setError] = useState("");
  const [correoAbierto, setCorreoAbierto] = useState(false);
  const [para, setPara] = useState("");
  const [enviadoA, setEnviadoA] = useState("");
  const [soloUsuario, setSoloUsuario] = useState("");

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

  const reporteEquipo = useMemo(
    () => armarReporteActividad({ cotizaciones, informes, certs, obras, agenda, agendaDe, usuarios, desde, hasta }),
    [cotizaciones, informes, certs, obras, agenda, agendaDe, usuarios, desde, hasta]
  );
  // Lo que se ve es lo que se descarga y lo que se envia: con una persona
  // elegida, la pantalla, el Excel, el PDF y el correo son solo de ella.
  const reporte = useMemo(() => filtrarReportePorUsuario(reporteEquipo, soloUsuario), [reporteEquipo, soloUsuario]);
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

  // Sale desde el correo de la empresa, por la misma funcion que envia las
  // cotizaciones y las colillas, y queda en el registro de correos enviados.
  const enviarPorCorreo = async (e) => {
    e?.preventDefault();
    const destino = para.trim();
    setError("");
    setEnviadoA("");
    if (!CORREO_VALIDO.test(destino)) {
      setError("Escribe un correo válido.");
      return;
    }
    setDescargando("correo");
    try {
      const salida = await import("../lib/reporteActividadExport");
      const blob = await salida.generarReportePdf(reporte);
      const periodoTexto = tituloPeriodo(reporte.desde, reporte.hasta);
      const resumen = TIPOS_REPORTE
        .map((t) => `- ${t.label}: ${valorCasilla(reporte.filaTotal, reporte.totales.general, t.id)}`)
        .join("\n");
      const deQuien = reporte.soloUsuario ? ` por ${reporte.soloUsuario}` : " por usuarios";
      await enviarCotizacionPorCorreo({
        para: destino,
        asunto: `Reporte de tareas ejecutadas${deQuien} - ${periodoTexto}`,
        mensaje:
          `Hola,\n\nAdjunto el reporte de tareas ejecutadas${deQuien} de Ingeanclajes, período ${periodoTexto}.\n\n` +
          `Documentos creados en el período:\n${resumen}\n\n` +
          `El detalle por persona y por mes va en el PDF adjunto.\n\nCordialmente,\nINGEANCLAJES S.A.S.`,
        numero: "REPORTE DE TAREAS",
        nombreArchivo: salida.nombreArchivoReporte(reporte, "pdf"),
        pdfBase64: await blobABase64(blob),
      });
      setEnviadoA(destino);
      setCorreoAbierto(false);
    } catch (fallo) {
      setError(fallo?.message || "No se pudo enviar el correo. Inténtalo de nuevo.");
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
            <h2 className="ra-titulo" id="ra-titulo">Reporte de tareas ejecutadas por usuarios</h2>
            <div className="ra-sub">
              {tituloPeriodo(reporte.desde, reporte.hasta)} · {reporte.soloUsuario ? `solo ${reporte.soloUsuario}` : "documentos creados por cada persona"}
            </div>
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
            <label className="ra-rango">
              Usuario
              <select value={reporte.soloUsuario || ""} onChange={(e) => setSoloUsuario(e.target.value)}>
                <option value="">Todo el equipo</option>
                {reporteEquipo.filas.map((f) => <option key={f.usuario} value={f.usuario}>{f.usuario}</option>)}
              </select>
            </label>
          </div>

          <div className="ra-tarjetas">
            {TIPOS_REPORTE.map((t) => (
              <div className="ra-tarjeta" key={t.id}>
                <div className="ra-cifra">{valorCasilla(reporte.filaTotal, reporte.totales.general, t.id)}</div>
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
                      <Casillas fila={fila} conteo={fila.totales} />
                    </tr>,
                    ...reporte.meses
                      .filter((mes) => fila.porMes[mes]?.total)
                      .map((mes) => (
                        <tr className="ra-mes" key={`${fila.usuario}-${mes}`}>
                          <td>{tituloMes(mes)}</td>
                          <Casillas fila={fila} conteo={fila.porMes[mes]} />
                        </tr>
                      )),
                  ])}
                  {hayDatos && (
                    <tr className="ra-total">
                      <td>Total del período</td>
                      <Casillas fila={reporte.filaTotal} conteo={reporte.totales.general} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="ra-pie">
          {correoAbierto && (
            <form className="ra-correo" onSubmit={enviarPorCorreo}>
              <input
                type="email"
                autoFocus
                value={para}
                onChange={(e) => setPara(e.target.value)}
                placeholder="Correo de quien recibe el PDF"
                aria-label="Correo de quien recibe el PDF"
              />
              <Button type="submit" variante="primary" cargando={descargando === "correo"} disabled={Boolean(descargando)}>
                Enviar PDF
              </Button>
              <Button variante="tertiary" disabled={Boolean(descargando)} onClick={() => { setCorreoAbierto(false); setError(""); }}>
                Cancelar
              </Button>
            </form>
          )}
          <div
            className={`ra-nota${error ? " ra-error" : enviadoA ? " ra-ok" : ""}`}
            role={error ? "alert" : enviadoA ? "status" : undefined}
          >
            {error || (enviadoA
              ? `PDF enviado a ${enviadoA}.`
              : "Cuenta cada documento a nombre de quien lo creó, en el mes en que lo creó. Las visitas son solo las de tu agenda, que es privada: en los demás sale «—».")}
          </div>
          <div className="ra-acciones">
            {!correoAbierto && (
              <Button disabled={Boolean(descargando)} onClick={() => { setCorreoAbierto(true); setEnviadoA(""); setError(""); }}>
                Enviar por correo
              </Button>
            )}
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

const ESTILOS_ACCESO = `
.ra-acceso { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 112px; padding: 4px; border: 0; background: transparent; cursor: pointer; font: inherit; color: var(--text-secondary); -webkit-tap-highlight-color: transparent; }
.ra-acceso__icono { width: 60px; height: 60px; border-radius: 15px; display: flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(180deg, #7D7AFF 0%, #5856D6 100%); box-shadow: inset 0 0 0 .5px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.28), 0 6px 14px -4px rgba(88,86,214,.55), 0 1px 2px rgba(16,24,40,.12); transform-origin: center bottom; transition: transform 90ms cubic-bezier(.2,.9,.3,1.25), box-shadow 150ms ease; }
.ra-acceso__nombre { font-size: 12px; line-height: 15px; font-weight: 600; text-align: center; letter-spacing: -.005em; transition: color 150ms ease; }
.ra-acceso:hover .ra-acceso__icono { transform: scale(1.1); box-shadow: inset 0 0 0 .5px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.28), 0 12px 22px -6px rgba(88,86,214,.6), 0 2px 4px rgba(16,24,40,.12); }
.ra-acceso:hover .ra-acceso__nombre { color: var(--text-primary); }
.ra-acceso:active .ra-acceso__icono { transform: scale(.96); }
.ra-acceso:focus-visible { outline: none; }
.ra-acceso:focus-visible .ra-acceso__icono { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px #5856D6; }
@media (prefers-reduced-motion: reduce) { .ra-acceso__icono { transition: none; } }
`;

// El acceso al reporte: un icono como los de las apps del Mac, con su nombre
// debajo. Solo le aparece a Camila Sepulveda; para los demas no pinta nada.
export function AccesoReporteActividad({ ctx, className = "" }) {
  const [abierto, setAbierto] = useState(false);
  if (!puedeVerReporteActividad(ctx?.membresia)) return null;

  return (
    <>
      <style>{ESTILOS_ACCESO}</style>
      <button type="button" className={`ra-acceso ${className}`.trim()} onClick={() => setAbierto(true)}>
        <span className="ra-acceso__icono" aria-hidden="true">
          {/* Barras que suben: lo que hizo cada quien, mes a mes. */}
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 19v-5" />
            <path d="M12 19V9" />
            <path d="M18 19V5" />
          </svg>
        </span>
        <span className="ra-acceso__nombre">Reporte de tareas ejecutadas por usuarios</span>
      </button>
      {abierto && <ReporteActividad ctx={ctx} onCerrar={() => setAbierto(false)} />}
    </>
  );
}

// La hoja del reporte. Quien la abre decide donde va el boton; aqui solo se
// vuelve a comprobar que sea para quien es.
export default function ReporteActividad({ ctx, onCerrar }) {
  if (!puedeVerReporteActividad(ctx?.membresia)) return null;

  // Se abre desde la barra superior, que es su propia capa (z-index 40): una
  // hoja dibujada ahi dentro quedaria por debajo del menu lateral. Se cuelga
  // del armazon y no de <body> porque de el cuelgan los colores del modo oscuro.
  const destino = document.querySelector(".app-shell") || document.body;
  return createPortal(
    <>
      <style>{ESTILOS}</style>
      <HojaReporte ctx={ctx} onCerrar={onCerrar} />
    </>,
    destino
  );
}
