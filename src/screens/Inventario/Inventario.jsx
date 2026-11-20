import { useEffect, useMemo, useRef, useState } from "react";
import {
  aviso,
  BarraFija,
  BuscadorToolbar,
  Button,
  CABECERA_FIJA,
  Callout,
  Card,
  EmptyState,
  Icono,
  SegmentedControl,
  StatusPill,
  Toolbar,
} from "../../components/ui";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { confirmar, avisar } from "../../lib/dialogos";
import { downloadGeneratedFile } from "../../lib/download";
import { fmt, fmtD, today } from "../../lib/format";
import { siguienteIdUnico } from "../../lib/identificadores";
import {
  calcularResumenInventario,
  CATEGORIAS_INVENTARIO,
  colorCategoriaBien,
  darDeBajaBien,
  ESTADO_DADO_DE_BAJA,
  estadoCalibracion,
  ESTADOS_INVENTARIO,
  filtrarYOrdenarInventario,
  generarCsvInventario,
  hojasExcelInventario,
  ORDENES_INVENTARIO,
  resolverResponsable,
  subtotalesPorCategoria,
  tonoEstadoBien,
  valorTotalBien,
} from "../../lib/inventario";
import { puedeEscribirTabla } from "../../lib/permisos";
import { construirXlsx, TIPO_XLSX } from "../../lib/xlsxSimple";
import {
  CAPA,
  CIFRA,
  COLOR,
  ESPACIO,
  MONO,
  RADIO,
  SOMBRA,
  TIPO,
  TRANSICION,
} from "../../styles/designTokens";
import HojaBien from "./HojaBien";
import HojaDarDeBaja from "./HojaDarDeBaja";

// Estilos mínimos específicos del módulo (todos con variables del tema).
const ESTILOS_INVENTARIO = `
  @media (min-width: 641px) {
    .ui-overlay:has(.inv-sheet-lateral) {
      justify-content: flex-end;
      align-items: stretch;
      padding: 12px;
    }
    .inv-sheet-lateral {
      width: min(560px, 100%);
      max-width: 560px;
      max-height: 100%;
      height: 100%;
      border-radius: 18px;
      animation: invSheetEntra var(--transicion-entrada);
    }
    @keyframes invSheetEntra {
      from { opacity: 0; transform: translateX(24px); }
      to   { opacity: 1; transform: none; }
    }
  }
  .inv-fila {
    transition: background var(--transicion-rapida);
  }
  .inv-fila:hover {
    background: var(--fill);
  }
  .inv-kpi-activo {
    background: var(--accent-tint) !important;
  }
  .ui-inv-cat {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 12px;
    padding: 10px 12px;
    cursor: pointer;
    font-family: inherit;
    transition: background var(--transicion-rapida), border-color var(--transicion-rapida);
  }
  .ui-inv-cat:hover {
    background: var(--fill);
  }
  .ui-inv-cat--activa {
    background: var(--accent-tint);
  }
  .inv-barra-seg {
    display: flex;
    gap: 3px;
    width: 100%;
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--fill);
  }
  .ui-inv-tramo {
    height: 100%;
    border: none;
    border-radius: 999px;
    padding: 0;
    cursor: pointer;
    transition: opacity var(--transicion-rapida), transform var(--transicion-rapida);
  }
  .ui-inv-tramo:hover {
    opacity: .85;
  }
  .ui-inv-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    color: var(--text-primary);
    transition: background var(--transicion-rapida);
  }
  .ui-inv-menu-item:hover {
    background: var(--fill);
  }
  .ui-inv-menu-item--peligro {
    color: var(--danger-text);
  }
  .inv-pagina {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    max-width: 1360px;
    min-width: 0;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .inv-filtros-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }
  .inv-seg-wrap {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .inv-seg-wrap::-webkit-scrollbar {
    display: none;
  }
  @media (max-width: 900px) {
    .inv-toolbar .ui-toolbar__buscador {
      max-width: none;
      flex-basis: 100%;
    }
  }
`;

const COLUMNAS_TABLA = "minmax(230px, 2.2fr) minmax(150px, 1.15fr) minmax(170px, 1.35fr) 150px 160px 104px";

export default function Inventario({ ctx }) {
  const {
    inventario = [],
    setInventario,
    empleados = [],
    obras = [],
    membresia,
    asegurarDetalle,
  } = ctx;

  const isMobile = useIsMobile();
  const puedeEscribir = puedeEscribirTabla(membresia, "inventario");
  const [ahora] = useState(() => new Date());

  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [estado, setEstado] = useState("Todos");
  const [soloAtencion, setSoloAtencion] = useState(false);
  const [soloCalibracion, setSoloCalibracion] = useState(false);
  const [orden, setOrden] = useState("nombre");
  const [exportando, setExportando] = useState(false);

  // Estado de las hojas laterales / modales.
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [bienEditandoId, setBienEditandoId] = useState(null);
  const [bienParaBaja, setBienParaBaja] = useState(null);

  const buscadorRef = useRef(null);

  useEffect(() => {
    const alPulsar = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        buscadorRef.current?.focus();
      }
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, []);

  const contextos = useMemo(() => ({ empleados, obras }), [empleados, obras]);

  const resumen = useMemo(
    () => calcularResumenInventario(inventario, ahora),
    [inventario, ahora]
  );

  const subtotales = useMemo(
    () => subtotalesPorCategoria(inventario, { incluirDadosDeBaja: estado === ESTADO_DADO_DE_BAJA }),
    [inventario, estado]
  );

  const opcionesEstado = useMemo(() => {
    const conteo = new Map();
    for (const bien of inventario) {
      conteo.set(bien.estado, (conteo.get(bien.estado) || 0) + 1);
    }
    return [
      { id: "Todos", label: "Todos", cuenta: inventario.length },
      ...ESTADOS_INVENTARIO.map((est) => ({
        id: est,
        label: est,
        cuenta: conteo.get(est) || 0,
      })),
    ];
  }, [inventario]);

  const filtrados = useMemo(
    () =>
      filtrarYOrdenarInventario(
        inventario,
        { busqueda, categoria, estado, soloAtencion, soloCalibracion, orden },
        contextos,
        ahora
      ),
    [inventario, busqueda, categoria, estado, soloAtencion, soloCalibracion, orden, contextos, ahora]
  );

  const valorVisible = useMemo(
    () => filtrados.reduce((acc, b) => acc + valorTotalBien(b), 0),
    [filtrados]
  );

  const hayFiltros = Boolean(
    busqueda.trim() || categoria !== "Todas" || estado !== "Todos" || soloAtencion || soloCalibracion
  );

  const limpiarFiltros = () => {
    setBusqueda("");
    setCategoria("Todas");
    setEstado("Todos");
    setSoloAtencion(false);
    setSoloCalibracion(false);
  };

  const codigoNuevo = useMemo(
    () => siguienteIdUnico(inventario, "INV"),
    [inventario]
  );

  const bienEditando = useMemo(
    () => (bienEditandoId ? inventario.find((b) => b.id === bienEditandoId) || null : null),
    [bienEditandoId, inventario]
  );

  const abrirNuevo = () => {
    if (!puedeEscribir) return;
    setBienEditandoId(null);
    setHojaAbierta(true);
  };

  const abrirBien = (bien) => {
    setBienEditandoId(bien.id);
    setHojaAbierta(true);
  };

  const cerrarHoja = () => {
    setHojaAbierta(false);
    setBienEditandoId(null);
  };

  const guardarBien = (datos) => {
    if (!puedeEscribir) return;
    if (bienEditandoId) {
      setInventario((prev) =>
        (prev || []).map((b) => (b.id === bienEditandoId ? { ...b, ...datos, id: bienEditandoId } : b))
      );
      aviso.exito(`Cambios guardados en ${bienEditandoId}.`);
    } else {
      const nuevoId = siguienteIdUnico(inventario, "INV");
      setInventario((prev) => [
        ...(prev || []),
        { ...datos, id: nuevoId, __parcial: false },
      ]);
      aviso.exito(`Bien ${nuevoId} agregado al inventario.`);
    }
    cerrarHoja();
  };

  const confirmarBaja = (bien, motivo) => {
    if (!puedeEscribir) return;
    const actualizado = darDeBajaBien(bien, motivo, today());
    setInventario((prev) =>
      (prev || []).map((b) => (b.id === bien.id ? actualizado : b))
    );
    setBienParaBaja(null);
    if (bienEditandoId === bien.id) cerrarHoja();
    aviso.exito(`${bien.id} pasó a estado «Dado de baja».`);
  };

  const eliminarBien = async (bien) => {
    if (!puedeEscribir) return;
    const ok = await confirmar({
      titulo: `¿Eliminar definitivamente ${bien.id}?`,
      mensaje:
        `${bien.nombre}\n\n` +
        "Esta acción borra el registro por completo y no se puede deshacer. " +
        "Si el equipo salió de servicio o se dañó, usa «Dar de baja» para conservar el historial.",
      textoConfirmar: "Eliminar",
      destructivo: true,
    });
    if (!ok) return;
    setInventario((prev) => (prev || []).filter((b) => b.id !== bien.id));
    if (bienEditandoId === bien.id) cerrarHoja();
    aviso.exito(`Se eliminó ${bien.id} del inventario.`);
  };

  const exportarExcel = async () => {
    const origen = hayFiltros ? filtrados : inventario;
    if (!origen.length || exportando) return;
    setExportando(true);
    try {
      const hojas = hojasExcelInventario(origen, contextos, ahora);
      const blob = await construirXlsx(hojas);
      downloadGeneratedFile(
        new File([blob], `Inventario-Ingeanclajes-${today()}.xlsx`, { type: TIPO_XLSX })
      );
      aviso.exito("Inventario exportado en Excel (.xlsx).");
    } catch (err) {
      await avisar({
        titulo: "No se pudo exportar a Excel",
        mensaje: err?.message || "Intenta de nuevo o usa la exportación CSV.",
      });
    } finally {
      setExportando(false);
    }
  };

  const exportarCsv = () => {
    const origen = hayFiltros ? filtrados : inventario;
    if (!origen.length) return;
    const contenido = generarCsvInventario(origen, contextos, ahora);
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
    downloadGeneratedFile(
      new File([blob], `Inventario-Ingeanclajes-${today()}.csv`, { type: "text/csv;charset=utf-8" })
    );
    aviso.exito("Inventario exportado en CSV.");
  };

  // Acciones en la barra superior: se omiten cuando el inventario está vacío
  // para dejar una única acción principal («Agregar primer bien») en el centro.
  const accionesRef = useRef({});
  useEffect(() => {
    accionesRef.current = { abrirNuevo, exportarExcel, exportarCsv };
  });

  useAccionesPantalla(
    inventario.length > 0 ? (
      <div style={{ display: "flex", alignItems: "center", gap: ESPACIO.xs }}>
        <MenuExportar
          deshabilitado={exportando}
          hayFiltros={hayFiltros}
          cantidadVisible={filtrados.length}
          onExcel={() => accionesRef.current.exportarExcel?.()}
          onCsv={() => accionesRef.current.exportarCsv?.()}
        />
        {puedeEscribir && (
          <Button
            variante="oscuro"
            tam="sm"
            icono="mas"
            onClick={() => accionesRef.current.abrirNuevo?.()}
          >
            Nuevo bien
          </Button>
        )}
      </div>
    ) : null,
    [inventario.length, puedeEscribir, exportando, hayFiltros, filtrados.length]
  );

  const alternarFiltroAtencion = () => {
    setSoloCalibracion(false);
    setEstado("Todos");
    setSoloAtencion((v) => !v);
  };

  const alternarFiltroCalibracion = () => {
    setSoloAtencion(false);
    setEstado("Todos");
    setSoloCalibracion((v) => !v);
  };

  return (
    <div
      className="inv-pagina"
      style={{
        padding: isMobile ? `${ESPACIO.md}px ${ESPACIO.sm}px ${ESPACIO.xxl}px` : `${ESPACIO.lg}px ${ESPACIO.lg}px ${ESPACIO.xxxl}px`,
      }}
    >
      <style>{ESTILOS_INVENTARIO}</style>

      {!puedeEscribir && (
        <Callout tono="info" titulo="Modo solo lectura">
          Puedes consultar y exportar el inventario, pero tu rol o permisos no habilitan cambios ni
          eliminaciones.
        </Callout>
      )}

      {/* Resumen superior */}
      <div
        className="grid-2-col"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
          gap: ESPACIO.md,
        }}
      >
        <TarjetaKpi
          etiqueta="Bienes activos"
          icono="cuadricula"
          fondoIcono={COLOR.infoBg}
          colorIcono={COLOR.infoText}
          valor={String(resumen.activos)}
          detalle={
            resumen.activos === 0 && resumen.dadosDeBaja === 0
              ? "Sin registros todavía"
              : [
                  `${resumen.unidadesActivas} ${resumen.unidadesActivas === 1 ? "unidad" : "unidades"}`,
                  resumen.dadosDeBaja > 0 ? `${resumen.dadosDeBaja} de baja` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")
          }
          onClick={hayFiltros ? limpiarFiltros : undefined}
        />

        <TarjetaKpi
          etiqueta="Valor total actual"
          icono="escudo"
          fondoIcono={COLOR.successBg}
          colorIcono={COLOR.successText}
          valor={fmt(resumen.valorTotalActual)}
          detalle={
            resumen.valorTotalCompra > 0
              ? `Valor de compra: ${fmt(resumen.valorTotalCompra)}`
              : "Estimado vigente en COP"
          }
        />

        <TarjetaKpi
          etiqueta="Mantenimiento o dañados"
          icono="alerta"
          fondoIcono={resumen.danados > 0 ? COLOR.dangerBg : resumen.enMantenimiento > 0 ? COLOR.warningBg : COLOR.successBg}
          colorIcono={resumen.danados > 0 ? COLOR.dangerText : resumen.enMantenimiento > 0 ? COLOR.warningText : COLOR.successText}
          valor={String(resumen.enAtencion)}
          detalle={
            resumen.enAtencion > 0
              ? `${resumen.enMantenimiento} mant. · ${resumen.danados} ${resumen.danados === 1 ? "dañado" : "dañados"}`
              : "Todos operativos"
          }
          tonoValor={resumen.danados > 0 ? COLOR.dangerText : resumen.enMantenimiento > 0 ? COLOR.warningText : undefined}
          activo={soloAtencion}
          onClick={resumen.enAtencion > 0 || soloAtencion ? alternarFiltroAtencion : undefined}
        />

        <TarjetaKpi
          etiqueta="Calibración / vencimiento"
          icono="calendario"
          fondoIcono={
            resumen.calibracionVencida > 0
              ? COLOR.dangerBg
              : resumen.calibracionProxima > 0
                ? COLOR.warningBg
                : COLOR.successBg
          }
          colorIcono={
            resumen.calibracionVencida > 0
              ? COLOR.dangerText
              : resumen.calibracionProxima > 0
                ? COLOR.warningText
                : COLOR.successText
          }
          valor={String(resumen.conAlertaCalibracion)}
          detalle={
            resumen.conAlertaCalibracion === 0
              ? "Todo al día (próximos 30 días)"
              : [
                  resumen.calibracionVencida > 0 ? `${resumen.calibracionVencida} venc.` : "",
                  resumen.calibracionProxima > 0 ? `${resumen.calibracionProxima} en ≤30 días` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")
          }
          tonoValor={
            resumen.calibracionVencida > 0
              ? COLOR.dangerText
              : resumen.calibracionProxima > 0
                ? COLOR.warningText
                : undefined
          }
          activo={soloCalibracion}
          onClick={resumen.conAlertaCalibracion > 0 || soloCalibracion ? alternarFiltroCalibracion : undefined}
        />
      </div>

      {/* Estado vacío inicial (sin ningún bien en la base) */}
      {inventario.length === 0 ? (
        <Card>
          <EmptyState
            icono="carpetaVacia"
            titulo="Todavía no hay bienes en el inventario"
            texto="Registra herramientas, equipos de medición como dinamómetros, cómputo, EPP o mobiliario para controlar qué tienes, cuánto vale hoy y quién lo tiene."
            accion={
              puedeEscribir ? (
                <Button variante="primary" icono="mas" onClick={abrirNuevo}>
                  Agregar primer bien
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <>
          {/* Subtotal por categoría */}
          {subtotales.length > 0 && (
            <Card ajustado>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: ESPACIO.md,
                  flexWrap: "wrap",
                  marginBottom: ESPACIO.sm,
                }}
              >
                <div style={{ ...TIPO.headline, color: COLOR.textPrimary }}>
                  Subtotal por categoría
                </div>
                <span style={{ ...TIPO.caption, color: COLOR.textTertiary }}>
                  {estado === ESTADO_DADO_DE_BAJA
                    ? "Mostrando bienes dados de baja · toca una categoría para filtrar"
                    : "Bienes activos · toca una categoría para filtrar"}
                </span>
              </div>

              {/* Barra proporcional segmentada estilo Almacenamiento de Apple */}
              {subtotales.some((f) => f.porcentaje > 0) && (
                <div
                  className="inv-barra-seg"
                  aria-label="Distribución de valor por categoría"
                  style={{ marginBottom: ESPACIO.md }}
                >
                  {subtotales
                    .filter((f) => f.porcentaje > 0)
                    .map((fila) => {
                      const activa = categoria === fila.categoria;
                      const atenuada = categoria !== "Todas" && !activa;
                      return (
                        <button
                          key={fila.categoria}
                          type="button"
                          className="ui-inv-tramo"
                          title={`${fila.categoria}: ${fmt(fila.valorTotal)} (${fila.porcentaje}%)`}
                          aria-label={`Filtrar por ${fila.categoria}`}
                          onClick={() => setCategoria(activa ? "Todas" : fila.categoria)}
                          style={{
                            flexGrow: fila.porcentaje,
                            flexBasis: 0,
                            minWidth: 6,
                            background: colorCategoriaBien(fila.categoria),
                            opacity: atenuada ? 0.25 : 1,
                          }}
                        />
                      );
                    })}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
                  gap: ESPACIO.xs,
                }}
              >
                {subtotales.map((fila) => {
                  const activa = categoria === fila.categoria;
                  const colorCat = colorCategoriaBien(fila.categoria);
                  return (
                    <button
                      key={fila.categoria}
                      type="button"
                      className={`ui-inv-cat ${activa ? "ui-inv-cat--activa" : ""}`}
                      onClick={() => setCategoria(activa ? "Todas" : fila.categoria)}
                      aria-pressed={activa}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: ESPACIO.sm,
                        }}
                      >
                        <span
                          style={{
                            ...TIPO.callout,
                            fontWeight: 600,
                            color: COLOR.textPrimary,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            minWidth: 0,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: RADIO.pildora,
                              background: colorCat,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {fila.categoria}
                          </span>
                        </span>
                        <span
                          style={{
                            ...TIPO.callout,
                            ...CIFRA,
                            fontWeight: 600,
                            color: COLOR.textPrimary,
                            flexShrink: 0,
                          }}
                        >
                          {fmt(fila.valorTotal)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: ESPACIO.sm,
                          marginTop: 6,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: RADIO.pildora,
                            background: COLOR.fill,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(fila.porcentaje > 0 ? 4 : 0, fila.porcentaje))}%`,
                              height: "100%",
                              borderRadius: RADIO.pildora,
                              background: colorCat,
                              transition: `width ${TRANSICION.rapida}`,
                            }}
                          />
                        </div>
                        <span style={{ ...TIPO.caption, ...CIFRA, color: COLOR.textTertiary, flexShrink: 0 }}>
                          {fila.registros} {fila.registros === 1 ? "bien" : "bienes"}
                          {fila.unidades !== fila.registros ? ` · ${fila.unidades} und.` : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Barra fija de filtros y listado */}
          <div style={{ width: "100%", minWidth: 0 }}>
            <BarraFija style={{ paddingTop: 4, paddingBottom: ESPACIO.sm }}>
              <div className="inv-filtros-stack">
                <div className="inv-seg-wrap">
                  <SegmentedControl
                    opciones={opcionesEstado}
                    valor={estado}
                    onChange={(est) => {
                      setEstado(est);
                      if (est !== "Todos") {
                        setSoloAtencion(false);
                        setSoloCalibracion(false);
                      }
                    }}
                    etiqueta="Filtrar por estado"
                  />
                </div>

                <Toolbar className="inv-toolbar" style={{ marginBottom: 0 }}>
                  <BuscadorToolbar
                    ref={buscadorRef}
                    valor={busqueda}
                    onChange={setBusqueda}
                    placeholder="Buscar por nombre, marca, serial o código…"
                  />

                  <select
                    aria-label="Filtrar por categoría"
                    className="ui-input"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    style={{ width: isMobile ? "100%" : "auto", minWidth: isMobile ? 0 : 190 }}
                  >
                    <option value="Todas">Todas las categorías</option>
                    {CATEGORIAS_INVENTARIO.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <select
                    aria-label="Ordenar inventario"
                    className="ui-input"
                    value={orden}
                    onChange={(e) => setOrden(e.target.value)}
                    style={{ width: isMobile ? "100%" : "auto", minWidth: isMobile ? 0 : 185 }}
                  >
                    {ORDENES_INVENTARIO.map((op) => (
                      <option key={op.key} value={op.key}>{op.label}</option>
                    ))}
                  </select>
                </Toolbar>

                {hayFiltros && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: ESPACIO.sm,
                      flexWrap: "wrap",
                      padding: `2px ${ESPACIO.xs}px`,
                    }}
                  >
                    <span style={{ ...TIPO.footnote, ...CIFRA, color: COLOR.textTertiary }}>
                      Mostrando {filtrados.length} de {inventario.length}{" "}
                      {inventario.length === 1 ? "bien" : "bienes"}
                      {soloAtencion ? " · Mantenimiento o dañados" : ""}
                      {soloCalibracion ? " · Calibración próxima o vencida" : ""}
                      {filtrados.length > 0 ? ` · Subtotal visible: ${fmt(valorVisible)}` : ""}
                    </span>
                    <Button variante="texto" tam="sm" onClick={limpiarFiltros}>
                      Limpiar filtros
                    </Button>
                  </div>
                )}
              </div>
            </BarraFija>

            {filtrados.length === 0 ? (
              <Card>
                <EmptyState
                  icono="buscar"
                  titulo="Ningún bien coincide"
                  texto="Prueba con otra búsqueda o quita los filtros de categoría y estado."
                  accion={
                    <Button variante="secondary" onClick={limpiarFiltros}>
                      Limpiar filtros
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div
                style={{
                  background: COLOR.surface,
                  borderRadius: RADIO.tarjeta,
                  border: `1px solid ${COLOR.separator}`,
                }}
              >
                {!isMobile && (
                  <div
                    style={{
                      ...CABECERA_FIJA,
                      display: "grid",
                      gridTemplateColumns: COLUMNAS_TABLA,
                      padding: `10px ${ESPACIO.lg}px`,
                      background: COLOR.surface,
                      borderRadius: `${RADIO.tarjeta}px ${RADIO.tarjeta}px 0 0`,
                      borderBottom: `1px solid ${COLOR.separator}`,
                      ...TIPO.eyebrow,
                      color: COLOR.textTertiary,
                    }}
                  >
                    <span>Bien</span>
                    <span>Categoría</span>
                    <span>Ubicación / responsable</span>
                    <span style={{ textAlign: "right", paddingRight: ESPACIO.md }}>Valor actual</span>
                    <span>Estado</span>
                    <span style={{ textAlign: "right" }}>Acciones</span>
                  </div>
                )}

                {filtrados.map((bien, indice) => (
                  <FilaBien
                    key={bien.id}
                    bien={bien}
                    contextos={contextos}
                    ahora={ahora}
                    compacta={isMobile}
                    esUltima={indice === filtrados.length - 1}
                    puedeEscribir={puedeEscribir}
                    onAbrir={() => abrirBien(bien)}
                    onPedirBaja={() => setBienParaBaja(bien)}
                    onEliminar={() => eliminarBien(bien)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Hoja lateral de alta / edición / consulta */}
      {hojaAbierta && (
        <HojaBien
          key={bienEditando ? bienEditando.id : "nuevo"}
          bienInicial={bienEditando}
          codigoNuevo={codigoNuevo}
          empleados={empleados}
          obras={obras}
          puedeEscribir={puedeEscribir}
          asegurarDetalle={asegurarDetalle}
          onGuardar={guardarBien}
          onPedirBaja={(bien) => {
            cerrarHoja();
            setBienParaBaja(bien);
          }}
          onEliminar={eliminarBien}
          onCerrar={cerrarHoja}
        />
      )}

      {/* Hoja de baja con motivo obligatorio */}
      {bienParaBaja && (
        <HojaDarDeBaja
          key={bienParaBaja.id}
          bien={bienParaBaja}
          onConfirmar={confirmarBaja}
          onCerrar={() => setBienParaBaja(null)}
        />
      )}
    </div>
  );
}

function TarjetaKpi({
  etiqueta,
  icono,
  fondoIcono,
  colorIcono,
  valor,
  detalle,
  tonoValor,
  activo = false,
  onClick,
}) {
  return (
    <Card
      ajustado
      interactivo={Boolean(onClick)}
      onClick={onClick}
      className={activo ? "inv-kpi-activo" : ""}
      aria-pressed={onClick ? activo : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: ESPACIO.xs,
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: ESPACIO.sm,
        }}
      >
        <span style={{ ...TIPO.footnote, color: COLOR.textTertiary }}>{etiqueta}</span>
        {icono && (
          <span
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              borderRadius: RADIO.chip + 2,
              background: fondoIcono || COLOR.fill,
              color: colorIcono || COLOR.textSecondary,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icono nombre={icono} size={15} />
          </span>
        )}
      </div>
      <div
        style={{
          ...TIPO.title1,
          ...CIFRA,
          color: tonoValor || COLOR.textPrimary,
          letterSpacing: "-0.02em",
        }}
      >
        {valor}
      </div>
      {detalle && (
        <div style={{ ...TIPO.caption, ...CIFRA, color: COLOR.textTertiary }}>
          {detalle}
        </div>
      )}
    </Card>
  );
}

function FilaBien({
  bien,
  contextos,
  ahora,
  compacta,
  esUltima,
  puedeEscribir,
  onAbrir,
  onPedirBaja,
  onEliminar,
}) {
  const resp = resolverResponsable(bien, contextos);
  const cal = estadoCalibracion(bien, ahora);
  const alertaCal = cal.nivel === "vencida" || cal.nivel === "proxima";
  const total = valorTotalBien(bien);
  const dadoDeBaja = bien.estado === ESTADO_DADO_DE_BAJA;

  const fichaTecnica = [bien.marca, bien.modelo, bien.serial ? `S/N ${bien.serial}` : ""]
    .filter(Boolean)
    .join(" · ");

  const bordeInferior = esUltima ? "none" : `1px solid ${COLOR.separator}`;
  const opcionesMenu = puedeEscribir
    ? [
        ...(dadoDeBaja ? [] : [{ label: "Dar de baja…", onClick: onPedirBaja }]),
        { label: "Eliminar", peligro: true, onClick: onEliminar },
      ]
    : [];

  const acciones = (
    <div
      style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2 }}
      onClick={(e) => e.stopPropagation()}
    >
      <Button variante="texto" tam="sm" onClick={onAbrir}>
        {puedeEscribir ? "Editar" : "Ver"}
      </Button>
      {opcionesMenu.length > 0 && <MenuMas opciones={opcionesMenu} />}
    </div>
  );

  const colorCat = colorCategoriaBien(bien.categoria);

  const insigniaCalibracion = alertaCal ? (
    <StatusPill
      tono={cal.nivel === "vencida" ? "peligro" : "aviso"}
      title={`Calibración o vencimiento: ${fmtD(bien.fechaCalibracion)}`}
      style={{
        background: cal.nivel === "vencida" ? COLOR.dangerBg : COLOR.warningBg,
        color: cal.nivel === "vencida" ? COLOR.dangerText : COLOR.warningText,
      }}
    >
      {cal.etiqueta}
    </StatusPill>
  ) : null;

  if (compacta) {
    return (
      <div
        onClick={onAbrir}
        className="inv-fila"
        style={{
          padding: `${ESPACIO.md}px ${ESPACIO.lg}px`,
          borderBottom: bordeInferior,
          display: "flex",
          flexDirection: "column",
          gap: ESPACIO.xs,
          cursor: "pointer",
          opacity: dadoDeBaja ? 0.72 : 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ESPACIO.sm }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ ...TIPO.caption, fontFamily: MONO, color: COLOR.textTertiary }}>
              {bien.id}
            </span>
            {bien.tieneFoto && (
              <Icono nombre="camara" size={13} style={{ color: COLOR.textQuaternary }} />
            )}
          </div>
          <StatusPill estado={bien.estado} tono={tonoEstadoBien(bien.estado)} />
        </div>

        <div style={{ ...TIPO.headline, color: COLOR.textPrimary }}>
          {bien.nombre}
        </div>

        {fichaTecnica && (
          <div style={{ ...TIPO.caption, color: COLOR.textTertiary }}>
            {fichaTecnica}
          </div>
        )}

        <div
          style={{
            ...TIPO.callout,
            color: COLOR.textSecondary,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: RADIO.pildora,
              background: colorCat,
              flexShrink: 0,
            }}
          />
          <span>
            {bien.categoria}
            {resp.principal ? ` · ${resp.principal}` : ""}
          </span>
        </div>

        {dadoDeBaja && bien.motivoBaja && (
          <div style={{ ...TIPO.caption, color: COLOR.textTertiary }}>
            Baja: {bien.motivoBaja}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: ESPACIO.sm,
            marginTop: ESPACIO.xs,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: ESPACIO.sm, flexWrap: "wrap" }}>
            <span style={{ ...TIPO.headline, ...CIFRA, color: COLOR.textPrimary }}>
              {fmt(total)}
            </span>
            {Number(bien.cantidad) > 1 && (
              <span style={{ ...TIPO.caption, ...CIFRA, color: COLOR.textTertiary }}>
                ({bien.cantidad} × {fmt(bien.valorActual)})
              </span>
            )}
            {insigniaCalibracion}
          </div>
          {acciones}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onAbrir}
      className="inv-fila"
      style={{
        display: "grid",
        gridTemplateColumns: COLUMNAS_TABLA,
        alignItems: "center",
        padding: `${ESPACIO.md}px ${ESPACIO.lg}px`,
        borderBottom: bordeInferior,
        cursor: "pointer",
        opacity: dadoDeBaja ? 0.72 : 1,
      }}
    >
      {/* Bien */}
      <div style={{ minWidth: 0, paddingRight: ESPACIO.md }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{ ...TIPO.caption, fontFamily: MONO, color: COLOR.textTertiary, flexShrink: 0 }}>
            {bien.id}
          </span>
          <span
            style={{
              ...TIPO.body,
              fontWeight: 600,
              color: COLOR.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {bien.nombre}
          </span>
          {bien.tieneFoto && (
            <span title="Tiene foto adjunta" style={{ color: COLOR.textQuaternary, flexShrink: 0 }}>
              <Icono nombre="camara" size={13} />
            </span>
          )}
        </div>
        {(fichaTecnica || (dadoDeBaja && bien.motivoBaja)) && (
          <div
            style={{
              ...TIPO.caption,
              color: COLOR.textTertiary,
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {dadoDeBaja && bien.motivoBaja ? `Baja: ${bien.motivoBaja}` : fichaTecnica}
          </div>
        )}
      </div>

      {/* Categoría */}
      <div
        style={{
          ...TIPO.callout,
          color: COLOR.textSecondary,
          paddingRight: ESPACIO.sm,
          display: "flex",
          alignItems: "center",
          gap: 7,
          minWidth: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            borderRadius: RADIO.pildora,
            background: colorCat,
            flexShrink: 0,
          }}
        />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {bien.categoria}
        </span>
      </div>

      {/* Ubicación / responsable */}
      <div style={{ minWidth: 0, paddingRight: ESPACIO.sm }}>
        <div
          style={{
            ...TIPO.callout,
            color: resp.principal ? COLOR.textPrimary : COLOR.textQuaternary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {resp.principal || "Sin asignar"}
        </div>
        {resp.detalle && (
          <div
            style={{
              ...TIPO.caption,
              color: COLOR.textTertiary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {resp.detalle}
          </div>
        )}
      </div>

      {/* Valor actual */}
      <div style={{ textAlign: "right", paddingRight: ESPACIO.md }}>
        <div style={{ ...TIPO.body, ...CIFRA, fontWeight: 600, color: COLOR.textPrimary }}>
          {fmt(total)}
        </div>
        {Number(bien.cantidad) > 1 ? (
          <div style={{ ...TIPO.caption, ...CIFRA, color: COLOR.textTertiary }}>
            {bien.cantidad} × {fmt(bien.valorActual)}
          </div>
        ) : bien.fechaCalibracion && !alertaCal && !dadoDeBaja ? (
          <div style={{ ...TIPO.caption, ...CIFRA, color: COLOR.textTertiary }}>
            Cal. {fmtD(bien.fechaCalibracion)}
          </div>
        ) : null}
      </div>

      {/* Estado y calibración */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        <StatusPill estado={bien.estado} tono={tonoEstadoBien(bien.estado)} />
        {insigniaCalibracion}
      </div>

      {/* Acciones */}
      {acciones}
    </div>
  );
}

function MenuExportar({ deshabilitado, hayFiltros, cantidadVisible, onExcel, onCsv }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alTocarFuera = (e) => {
      if (!ref.current?.contains(e.target)) setAbierto(false);
    };
    const alTeclear = (e) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Button
        variante="texto"
        tam="sm"
        icono="descargar"
        disabled={deshabilitado || (hayFiltros && cantidadVisible === 0)}
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        {deshabilitado ? "Exportando…" : "Exportar"}
      </Button>

      {abierto && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            zIndex: CAPA.menu,
            minWidth: 210,
            background: COLOR.surface,
            border: `1px solid ${COLOR.separator}`,
            borderRadius: RADIO.control,
            boxShadow: SOMBRA.md,
            padding: 4,
          }}
        >
          {hayFiltros && (
            <div style={{ padding: "6px 10px 4px", ...TIPO.caption, color: COLOR.textTertiary }}>
              Exportará {cantidadVisible} {cantidadVisible === 1 ? "bien filtrado" : "bienes filtrados"}
            </div>
          )}
          <button
            type="button"
            role="menuitem"
            className="ui-inv-menu-item"
            onClick={() => {
              setAbierto(false);
              onExcel?.();
            }}
          >
            <Icono nombre="documento" size={15} style={{ color: COLOR.textTertiary }} />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="ui-inv-menu-item"
            onClick={() => {
              setAbierto(false);
              onCsv?.();
            }}
          >
            <Icono nombre="lista" size={15} style={{ color: COLOR.textTertiary }} />
            <span>CSV (.csv)</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MenuMas({ opciones }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alTocarFuera = (e) => {
      if (!ref.current?.contains(e.target)) setAbierto(false);
    };
    const alTeclear = (e) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Button
        variante="tertiary"
        tam="sm"
        soloIcono
        icono="puntos"
        aria-label="Más acciones"
        aria-expanded={abierto}
        style={{ color: COLOR.textSecondary }}
        onClick={() => setAbierto((v) => !v)}
      />
      {abierto && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: CAPA.menu,
            minWidth: 155,
            background: COLOR.surface,
            border: `1px solid ${COLOR.separator}`,
            borderRadius: RADIO.control,
            boxShadow: SOMBRA.md,
            padding: 4,
          }}
        >
          {opciones.map((o) => (
            <button
              key={o.label}
              type="button"
              role="menuitem"
              className={`ui-inv-menu-item ${o.peligro ? "ui-inv-menu-item--peligro" : ""}`}
              onClick={() => {
                setAbierto(false);
                o.onClick?.();
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
