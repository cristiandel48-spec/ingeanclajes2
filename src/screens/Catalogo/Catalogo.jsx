import { useEffect, useMemo, useState } from "react";
import AvisoFlujo from "../../components/AvisoFlujo";
import { Button } from "../../components/ui";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import { CD, SI, ST } from "../../styles/tokens";
import { fmt } from "../../lib/format";
import { filasDesdeSemilla, filasEditables } from "../../lib/catalogo";
import { esAdmin, puedeVerCostosInternos } from "../../lib/permisos";
import { siguienteIdUnico } from "../../lib/identificadores";
import { normalizarMayusculas } from "../../lib/normalizarEntrada";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { confirmar } from "../../lib/dialogos";
import { calcularCostoUnitarioServicio, obtenerConfigCostos } from "../../lib/costosCotizacion";
import { VistaInsumosCostos, VistaRecetasApu } from "./GestionCostosApu";

// Los servicios que se cotizan y su precio.
//
// Antes vivian en el codigo (src/data/seed.js) y cambiar un precio obligaba a
// publicar una version del programa. Ahora estan en la base: se cambian aqui y
// los usan al instante el editor de cotizaciones, el dictado, el importador de
// documentos y la automatizacion de WhatsApp.
//
// SOLO EL ADMINISTRADOR EDITA. Un precio mal puesto se va derecho a una
// cotizacion y de ahi a un cliente; no es algo que deba poder cambiar quien
// entra a registrar el avance de una obra. Los demas lo consultan.

const UNIDADES = ["ML", "Und", "Metro", "Global", "Dia"];

export default function Catalogo({ ctx }) {
  const { catalogoItems, setCatalogoItems, empresaConfig, setEmpresaConfig, membresia, intencion, limpiarIntencion } = ctx;
  const isMobile = useIsMobile();
  const puedeEditar = esAdmin(membresia);
  const verCostos = puedeVerCostosInternos(membresia);
  const configCostos = useMemo(() => obtenerConfigCostos(empresaConfig), [empresaConfig]);
  const subtabIntencion =
    verCostos && ["servicios", "insumos", "recetas"].includes(intencion?.subtab)
      ? intencion.subtab
      : null;
  const [subtabManual, setSubtabManual] = useState(null);
  const tabActiva = verCostos ? (subtabManual || subtabIntencion || "servicios") : "servicios";
  const cambiarSubtab = (nuevoTab) => {
    setSubtabManual(nuevoTab);
    if (intencion?.subtab) limpiarIntencion?.();
  };
  const filas = filasEditables(catalogoItems);
  const [nuevo, setNuevo] = useState(false);
  // El servicio nuevo se agrega al final de la tabla y el boton esta arriba:
  // se baja hasta la fila y se deja el cursor en el nombre.
  const [filaPorMostrar, setFilaPorMostrar] = useState(null);
  useEffect(() => {
    if (!filaPorMostrar) return undefined;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-fila-id="${CSS.escape(filaPorMostrar)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.querySelector("input[data-campo='descripcion']")?.focus({ preventScroll: true });
      }
      setFilaPorMostrar(null);
    });
    return () => cancelAnimationFrame(id);
  }, [filaPorMostrar]);

  const cambiar = (id, campo, valor) =>
    setCatalogoItems((prev) => (prev || []).map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));

  const agregar = () => {
    const id = siguienteIdUnico(catalogoItems || [], "CAT");
    setCatalogoItems((prev) => [...(prev || []), {
      id, categoria: "Servicios", descripcion: "", unidad: "Und", precioBase: 0, disponible: true,
    }]);
    cambiarSubtab("servicios");
    setNuevo(true);
    setFilaPorMostrar(id);
  };

  // La primera vez, para no teclear los dieciocho servicios a mano.
  const sembrar = async () => {
    if (!(await confirmar(
      "¿Cargar los servicios con los que venía el programa?\n\n" +
      "Se cargan con sus precios actuales. Solo se agregan los que falten; no se toca nada de lo que ya esté aquí."
    ))) return;
    setCatalogoItems((prev) => {
      const actuales = prev || [];
      const yaEstan = new Set(actuales.map((f) => String(f.descripcion || "").trim().toUpperCase()));
      const faltan = filasDesdeSemilla()
        .filter((f) => !yaEstan.has(f.descripcion.toUpperCase()))
        // Se renumeran para no chocar con los ids que ya existan.
        .map((f, i) => ({ ...f, id: `CAT-${String(actuales.length + i + 1).padStart(3, "0")}` }));
      return [...actuales, ...faltan];
    });
  };

  useAccionesPantalla(
    puedeEditar && tabActiva === "servicios" ? (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {filas.length === 0 && (
          <Button variante="texto" tam="sm" onClick={sembrar}>Cargar los de siempre</Button>
        )}
        <Button variante="oscuro" tam="sm" icono="mas" onClick={agregar}>Nuevo servicio</Button>
      </div>
    ) : null,
    [puedeEditar, filas.length, tabActiva]
  );

  const activos = filas.filter((f) => f.disponible !== false).length;

  return (
    <div
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: isMobile ? "12px 8px 24px" : "16px 16px 28px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Selector de pestañas (Insumos y Recetas APU visibles SOLO para administradores) */}
      {verCostos && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 4,
              background: "var(--surface-subtle, #f2f4f7)",
              border: "1px solid var(--border, #e2e8f0)",
              borderRadius: 11,
              flexWrap: "wrap",
            }}
          >
            {[
              { id: "servicios", label: "Servicios y precios" },
              { id: "insumos", label: `Insumos y costos (${configCostos.insumos.length})` },
              { id: "recetas", label: "Recetas (APU)" },
            ].map((t) => {
              const activa = tabActiva === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => cambiarSubtab(t.id)}
                  style={{
                    background: activa ? "var(--surface, #ffffff)" : "transparent",
                    color: activa ? "var(--text-main, #101828)" : "var(--text-muted, #475467)",
                    border: activa ? "1px solid var(--border, #d0d5dd)" : "1px solid transparent",
                    boxShadow: activa ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                    borderRadius: 8,
                    padding: "6px 13px",
                    fontSize: 12,
                    fontWeight: activa ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted, #475467)",
              background: "var(--surface-subtle, #f2f4f7)",
              border: "1px solid var(--border, #e2e8f0)",
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            Costos y recetas: solo visibles para administradores
          </span>
        </div>
      )}

      {tabActiva === "insumos" && verCostos && (
        <VistaInsumosCostos
          empresaConfig={empresaConfig}
          setEmpresaConfig={setEmpresaConfig}
          isMobile={isMobile}
        />
      )}

      {tabActiva === "recetas" && verCostos && (
        <VistaRecetasApu
          catalogoItems={catalogoItems}
          empresaConfig={empresaConfig}
          setEmpresaConfig={setEmpresaConfig}
          isMobile={isMobile}
        />
      )}

      {tabActiva === "servicios" && (
        <>
          {/* Sin titulo grande: la barra de arriba ya dice donde se esta y tiene
              los botones. Aqui solo el conteo. */}
          <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 12px" }}>
            {activos} de {filas.length} servicio(s) activos
          </div>

          <AvisoFlujo tono="info" titulo="De aquí salen todos los precios">
            Lo que se cambie aquí lo usan al instante el editor de cotizaciones, el dictado, la
            importación de documentos y las respuestas de WhatsApp. <strong>No hace falta publicar
            nada.</strong>
            <div style={{ marginTop: 5 }}>
              Las cotizaciones ya guardadas <strong>no cambian</strong>: cada una conserva el precio con
              el que se hizo. Un cambio aquí solo afecta a lo que se cotice de ahora en adelante.
            </div>
          </AvisoFlujo>

          {!puedeEditar && (
            <div style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)", borderRadius: 10,
              padding: "10px 14px", fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
              Puedes consultar los precios, pero solo un administrador los cambia.
            </div>
          )}

          {filas.length === 0 ? (
            <div style={{ ...CD, textAlign: "center", padding: 34 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", marginBottom: 6 }}>
                El catálogo todavía está vacío
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>
                Mientras esté vacío se usan los servicios con los que venía el programa, así que nada
                deja de funcionar. {puedeEditar
                  ? "Con «Cargar los de siempre» los traes aquí para poder editarlos."
                  : "Un administrador puede cargarlos para poder editarlos."}
              </div>
            </div>
          ) : (
            <div style={CD}>
              <div style={{ ...ST, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span>Servicios y precios</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>
                  {activos} activo{activos === 1 ? "" : "s"} de {filas.length}
                </span>
              </div>

              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%" }}>
                <div style={{ minWidth: verCostos ? 780 : 640 }}>
                  <div style={{ display: "grid", gridTemplateColumns: verCostos ? "1.05fr 2.2fr .75fr 1.05fr 1.15fr .6fr" : "1.1fr 2.4fr .8fr 1.1fr .7fr",
                    gap: 8, padding: "8px 10px", background: "var(--surface-subtle, #f5f5f7)", borderRadius: 8,
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-muted, #667085)", textTransform: "uppercase" }}>
                    <span>Categoría</span><span>Servicio</span><span>Unidad</span><span>Precio</span>
                    {verCostos && <span>Costo APU / Margen</span>}
                    <span>Activo</span>
                  </div>

                  {filas.map((fila) => {
                    const resumenCosto = verCostos ? calcularCostoUnitarioServicio(fila, configCostos) : null;
                    return (
                      <div key={fila.id} data-fila-id={fila.id} style={{ display: "grid", gridTemplateColumns: verCostos ? "1.05fr 2.2fr .75fr 1.05fr 1.15fr .6fr" : "1.1fr 2.4fr .8fr 1.1fr .7fr",
                        gap: 8, padding: "7px 10px", alignItems: "center", borderBottom: "1px solid var(--border, rgba(0, 0, 0, 0.06))",
                        opacity: fila.disponible === false ? .55 : 1 }}>
                        <input value={fila.categoria || ""} disabled={!puedeEditar}
                          onChange={(e) => cambiar(fila.id, "categoria", e.target.value)}
                          style={{ ...SI, fontSize: 12, padding: "5px 8px" }} />

                        <input data-campo="descripcion" value={fila.descripcion || ""} disabled={!puedeEditar}
                          onChange={(e) => cambiar(fila.id, "descripcion", e.target.value)}
                          onBlur={(e) => cambiar(fila.id, "descripcion", normalizarMayusculas(e.target.value))}
                          placeholder="Nombre del servicio, como sale impreso"
                          style={{ ...SI, fontSize: 12, padding: "5px 8px", fontWeight: 600 }} />

                        <select value={fila.unidad || "Und"} disabled={!puedeEditar}
                          onChange={(e) => cambiar(fila.id, "unidad", e.target.value)}
                          style={{ ...SI, fontSize: 12, padding: "5px 6px" }}>
                          {[...new Set([...UNIDADES, fila.unidad].filter(Boolean))].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>

                        <div>
                          <input type="number" min="0" step="1000" value={fila.precioBase ?? 0}
                            disabled={!puedeEditar}
                            onChange={(e) => cambiar(fila.id, "precioBase", Number(e.target.value) || 0)}
                            style={{ ...SI, fontSize: 12, padding: "5px 8px", textAlign: "right",
                              fontVariantNumeric: "tabular-nums" }} />
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right", marginTop: 1 }}>
                            {fmt(Number(fila.precioBase) || 0)}
                          </div>
                        </div>

                        {verCostos && (
                          <div style={{ fontSize: 11, lineHeight: 1.35 }}>
                            {resumenCosto?.tieneReceta ? (
                              <>
                                <div style={{ fontWeight: 700, color: "var(--text-main)", fontVariantNumeric: "tabular-nums" }}>
                                  {fmt(resumenCosto.costoUnitario)}
                                  {resumenCosto.cantReferencia > 1 && (
                                    <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: 10 }}>
                                      {" "}· ref. {resumenCosto.cantReferencia}
                                    </span>
                                  )}
                                </div>
                                {resumenCosto.margenPct != null && (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      marginTop: 2,
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      padding: "1px 6px",
                                      borderRadius: 999,
                                      background:
                                        resumenCosto.margenPct < 15
                                          ? "#FEF3F2"
                                          : resumenCosto.margenPct < configCostos.margenMinimoPct
                                          ? "#FFFAEB"
                                          : "#ECFDF3",
                                      color:
                                        resumenCosto.margenPct < 15
                                          ? "#B42318"
                                          : resumenCosto.margenPct < configCostos.margenMinimoPct
                                          ? "#B54708"
                                          : "#027A48",
                                    }}
                                  >
                                    Margen {resumenCosto.margenPct}%
                                  </span>
                                )}
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => cambiarSubtab("recetas")}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  padding: 0,
                                  color: "#1D4ED8",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                + Crear receta
                              </button>
                            )}
                          </div>
                        )}

                        {/* Un servicio que se deja de prestar se APAGA, no se borra: las
                            cotizaciones viejas siguen diciendo de donde salio su precio. */}
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-main)" }}>
                          <input type="checkbox" checked={fila.disponible !== false} disabled={!puedeEditar}
                            onChange={(e) => cambiar(fila.id, "disponible", e.target.checked)} />
                          {fila.disponible === false ? "No" : "Sí"}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {nuevo && (
                <div style={{ fontSize: 12, color: "var(--success-text)", background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 8, padding: "8px 11px", marginTop: 10 }}>
                  Servicio agregado; el cursor ya está en su nombre. Ponle nombre y precio; se guarda solo.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
