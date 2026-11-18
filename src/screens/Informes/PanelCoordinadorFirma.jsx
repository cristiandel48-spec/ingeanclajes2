import { useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui";
import LBL from "../../components/ui/LBL";
import { SI } from "../../styles/tokens";
import { normalizarMayusculas, normalizarNombrePropio } from "../../lib/normalizarEntrada";
import {
  TIPOS_FIRMA_ACEPTADOS,
  coincidenNombresPersona,
  getFirmaCoordinador,
  leerFirmaCoordinadorComoDataUri,
  obtenerOpcionesCoordinadores,
} from "../../lib/firmasCoordinadores";

const CAMPO = { ...SI, borderRadius: 12 };

/**
 * Selector de Coordinador de Obra / SST con gestion de firma automatica en JPEG.
 *
 * Al subir la firma en JPEG (o PNG) de un coordinador como Richard Buelvas o
 * Paola Escobar una sola vez, queda guardada en `empresaConfig` y cualquier
 * informe donde se seleccione ese coordinador se firma automaticamente.
 */
export default function PanelCoordinadorFirma({
  coordinador = null,
  empleados = [],
  empresaConfig = [],
  onCambiarCoordinador,
  onGuardarFirma,
  onQuitarFirma,
  compacto = false,
  isMobile = false,
}) {
  const inputFirmaRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFirma, setErrorFirma] = useState("");
  const [modoManual, setModoManual] = useState(false);

  const opcionesRapidas = useMemo(
    () => obtenerOpcionesCoordinadores({ empleados, empresaConfig }),
    [empleados, empresaConfig]
  );

  const perfilGuardado = useMemo(
    () => (coordinador?.nombre ? getFirmaCoordinador(empresaConfig, coordinador) : null),
    [empresaConfig, coordinador]
  );

  const firmaActual = String(coordinador?.firmaImg || perfilGuardado?.firmaImg || "").trim();

  const seleccionarOpcion = (op) => {
    setErrorFirma("");
    setModoManual(false);
    if (!op) {
      onCambiarCoordinador?.(null);
      return;
    }
    const perfil = getFirmaCoordinador(empresaConfig, op);
    const emp = (empleados || []).find((e) =>
      (op.empleadoId && e?.id === op.empleadoId) ||
      coincidenNombresPersona(e?.nombre, op.nombre)
    );
    onCambiarCoordinador?.({
      empleadoId: op.empleadoId || emp?.id || perfil?.empleadoId || "",
      nombre: normalizarNombrePropio(op.nombre || emp?.nombre || ""),
      cargo: String(perfil?.cargo || op.cargo || emp?.cargo || "COORDINADOR SST").trim().toUpperCase(),
      cedula: String(perfil?.cedula || emp?.cedula || op.cedula || "").trim(),
      firmaImg: String(perfil?.firmaImg || op.firmaImg || "").trim(),
    });
  };

  const manejarSubidaFirma = async (archivo) => {
    if (!archivo || !coordinador?.nombre) return;
    setErrorFirma("");
    setSubiendo(true);
    try {
      const dataUri = await leerFirmaCoordinadorComoDataUri(archivo);
      const actualizado = {
        empleadoId: coordinador.empleadoId || "",
        nombre: normalizarNombrePropio(coordinador.nombre),
        cargo: String(coordinador.cargo || "COORDINADOR SST").trim().toUpperCase(),
        cedula: String(coordinador.cedula || "").trim(),
        firmaImg: dataUri,
      };
      onGuardarFirma?.(actualizado);
      onCambiarCoordinador?.(actualizado);
    } catch (err) {
      setErrorFirma(err?.message || "No se pudo procesar la firma.");
    } finally {
      setSubiendo(false);
    }
  };

  const actualizarCampo = (campo, valor) => {
    const base = coordinador || { empleadoId: "", nombre: "", cargo: "COORDINADOR SST", cedula: "", firmaImg: "" };
    const next = { ...base, [campo]: valor };
    // Si cambio el nombre, buscamos automaticamente si ya tiene firma guardada
    if (campo === "nombre") {
      const perfil = getFirmaCoordinador(empresaConfig, valor);
      if (perfil) {
        next.firmaImg = perfil.firmaImg || "";
        if (!next.cedula && perfil.cedula) next.cedula = perfil.cedula;
        if (perfil.cargo) next.cargo = perfil.cargo;
        if (!next.empleadoId && perfil.empleadoId) next.empleadoId = perfil.empleadoId;
      } else {
        next.firmaImg = "";
      }
    }
    onCambiarCoordinador?.(next);
  };

  const sincronizarPerfilSiExiste = (datos) => {
    if (!datos?.nombre) return;
    const existe = getFirmaCoordinador(empresaConfig, datos);
    if (existe) {
      onGuardarFirma?.({
        empleadoId: datos.empleadoId || existe.empleadoId || "",
        nombre: normalizarNombrePropio(datos.nombre),
        cargo: String(datos.cargo || existe.cargo || "COORDINADOR SST").trim().toUpperCase(),
        cedula: String(datos.cedula || "").trim(),
        firmaImg: existe.firmaImg || datos.firmaImg || "",
      });
    }
  };

  const selectValue = (() => {
    if (modoManual) return "__manual__";
    if (!coordinador?.nombre) return "";
    const matchRapido = opcionesRapidas.find((o) => coincidenNombresPersona(o.nombre, coordinador.nombre));
    if (matchRapido) return `op:${matchRapido.clave}`;
    const matchEmp = (empleados || []).find((e) =>
      (coordinador.empleadoId && e?.id === coordinador.empleadoId) ||
      coincidenNombresPersona(e?.nombre, coordinador.nombre)
    );
    if (matchEmp) return `emp:${matchEmp.id}`;
    return "__manual__";
  })();

  const inputArchivoOculto = (
    <input
      ref={inputFirmaRef}
      type="file"
      accept={TIPOS_FIRMA_ACEPTADOS}
      style={{ display: "none" }}
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) manejarSubidaFirma(f);
        e.target.value = "";
      }}
    />
  );

  // --- MODO COMPACTO (barra interactiva estilo macOS sobre la vista previa del informe) ---
  if (compacto) {
    return (
      <div
        className="no-print"
        style={{
          maxWidth: 920,
          margin: "0 auto 14px",
          width: "100%",
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--separator, #e2e8f0)",
          borderRadius: 16,
          padding: isMobile ? "12px 14px" : "12px 16px",
          boxShadow: "var(--sombra-sm, 0 1px 3px rgba(16,24,40,0.05))",
          boxSizing: "border-box",
        }}
      >
        {inputArchivoOculto}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--text-tertiary, #667085)",
              }}
            >
              Coordinador SST / Obra:
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {opcionesRapidas.slice(0, 4).map((op) => {
                const activo = coincidenNombresPersona(coordinador?.nombre, op.nombre);
                return (
                  <button
                    key={op.clave}
                    type="button"
                    onClick={() => seleccionarOpcion(activo ? null : op)}
                    title={
                      op.firmaImg
                        ? `${op.nombre} · Firma JPEG guardada (auto-firma activa)`
                        : `Asignar a ${op.nombre} como coordinador de este informe`
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 11px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: activo
                        ? "1px solid #0071E3"
                        : "1px solid var(--border-strong, #e2e8f0)",
                      background: activo ? "#0071E3" : "var(--surface-subtle, #f8fafc)",
                      color: activo ? "#ffffff" : "var(--text-primary, #101828)",
                      transition: "all 0.15s ease",
                      fontFamily: "inherit",
                    }}
                  >
                    <span>{op.nombre}</span>
                    {op.firmaImg && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: activo ? "#86efac" : "#12B76A",
                          display: "inline-block",
                        }}
                      />
                    )}
                  </button>
                );
              })}

              <select
                value={selectValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    seleccionarOpcion(null);
                  } else if (val === "__manual__") {
                    setModoManual(true);
                    onCambiarCoordinador?.({
                      empleadoId: "",
                      nombre: coordinador?.nombre || "",
                      cargo: coordinador?.cargo || "COORDINADOR SST",
                      cedula: coordinador?.cedula || "",
                      firmaImg: "",
                    });
                  } else if (val.startsWith("op:")) {
                    const op = opcionesRapidas.find((o) => o.clave === val.slice(3));
                    if (op) seleccionarOpcion(op);
                  } else if (val.startsWith("emp:")) {
                    const emp = (empleados || []).find((x) => x.id === val.slice(4));
                    if (emp) {
                      seleccionarOpcion({
                        empleadoId: emp.id,
                        nombre: emp.nombre,
                        cargo: emp.cargo || "COORDINADOR SST",
                        cedula: emp.cedula || "",
                      });
                    }
                  }
                }}
                style={{
                  ...CAMPO,
                  width: "auto",
                  fontSize: 11.5,
                  padding: "5px 10px",
                  borderRadius: 999,
                  maxWidth: 190,
                }}
              >
                <option value="">Otro coordinador…</option>
                {opcionesRapidas.map((op) => (
                  <option key={op.clave} value={`op:${op.clave}`}>
                    {op.nombre} {op.firmaImg ? "✓" : ""}
                  </option>
                ))}
                {empleados.filter((e) => e.activo !== false).length > 0 && (
                  <optgroup label="Todo el personal">
                    {empleados
                      .filter((e) => e.activo !== false && !opcionesRapidas.some((o) => coincidenNombresPersona(o.nombre, e.nombre)))
                      .map((e) => (
                        <option key={e.id} value={`emp:${e.id}`}>
                          {e.nombre}{e.cargo ? ` · ${e.cargo}` : ""}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {coordinador?.nombre && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {firmaActual ? (
                <>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#047857",
                      background: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      borderRadius: 999,
                      padding: "3px 9px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span>✓ Auto-firma activa</span>
                  </span>
                  <Button
                    variante="texto"
                    tam="sm"
                    disabled={subiendo}
                    onClick={() => inputFirmaRef.current?.click()}
                  >
                    {subiendo ? "Subiendo…" : "Cambiar firma"}
                  </Button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={subiendo}
                  onClick={() => inputFirmaRef.current?.click()}
                  style={{
                    background: "#0071E3",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 999,
                    padding: "5px 12px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {subiendo ? "Procesando…" : `Subir firma PDF / JPEG de ${coordinador.nombre.split(" ")[0]}`}
                </button>
              )}
            </div>
          )}
        </div>

        {errorFirma && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: "#b91c1c", fontWeight: 500 }}>
            {errorFirma}
          </div>
        )}
      </div>
    );
  }

  // --- MODO COMPLETO (bloque en el formulario de crear / editar informe) ---
  return (
    <section
      style={{
        background: "var(--surface)",
        borderRadius: 22,
        padding: "20px 22px",
        marginBottom: 14,
      }}
    >
      {inputArchivoOculto}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3, color: "var(--text-primary)", margin: 0 }}>
            Coordinador de obra / Coordinador SST
          </h2>
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.5, marginTop: 3 }}>
            Encargado del personal en sitio. Sube su firma en JPEG una sola vez y cada informe con ese coordinador se firmará automáticamente.
          </div>
        </div>
        {coordinador?.nombre && (
          <Button variante="texto" tam="sm" onClick={() => seleccionarOpcion(null)}>
            Quitar coordinador
          </Button>
        )}
      </div>

      {/* Accesos rápidos de un toque para coordinadores frecuentes */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {opcionesRapidas.map((op) => {
          const activo = coincidenNombresPersona(coordinador?.nombre, op.nombre);
          return (
            <button
              key={op.clave}
              type="button"
              onClick={() => seleccionarOpcion(op)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 13px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                border: activo
                  ? "1.5px solid #0071E3"
                  : "1px solid var(--border-strong, #e2e8f0)",
                background: activo ? "#EFF6FF" : "var(--surface-subtle, #f8fafc)",
                color: activo ? "#1D4ED8" : "var(--text-primary, #101828)",
                transition: "all 0.15s ease",
                fontFamily: "inherit",
              }}
            >
              <span>{op.nombre}</span>
              {op.firmaImg ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#047857",
                    background: "#ECFDF5",
                    border: "1px solid #A7F3D0",
                    borderRadius: 999,
                    padding: "1px 6px",
                  }}
                >
                  ✓ Firma lista
                </span>
              ) : (
                <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Sin firma</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selector completo y datos del coordinador */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 0.8fr", gap: 12 }}>
        <div>
          <LBL>Coordinador asignado</LBL>
          <select
            value={selectValue}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                seleccionarOpcion(null);
              } else if (val === "__manual__") {
                setModoManual(true);
                onCambiarCoordinador?.({
                  empleadoId: "",
                  nombre: "",
                  cargo: "COORDINADOR SST",
                  cedula: "",
                  firmaImg: "",
                });
              } else if (val.startsWith("op:")) {
                const op = opcionesRapidas.find((o) => o.clave === val.slice(3));
                if (op) seleccionarOpcion(op);
              } else if (val.startsWith("emp:")) {
                const emp = (empleados || []).find((x) => x.id === val.slice(4));
                if (emp) {
                  seleccionarOpcion({
                    empleadoId: emp.id,
                    nombre: emp.nombre,
                    cargo: emp.cargo || "COORDINADOR SST",
                    cedula: emp.cedula || "",
                  });
                }
              }
            }}
            style={CAMPO}
          >
            <option value="">— Seleccionar coordinador —</option>
            <optgroup label="Coordinadores de obra / SST">
              {opcionesRapidas.map((op) => (
                <option key={op.clave} value={`op:${op.clave}`}>
                  {op.nombre} · {op.cargo}{op.firmaImg ? " (Firma guardada)" : ""}
                </option>
              ))}
            </optgroup>
            {empleados.filter((e) => e.activo !== false).length > 0 && (
              <optgroup label="Todo el personal">
                {empleados
                  .filter((e) => e.activo !== false && !opcionesRapidas.some((o) => coincidenNombresPersona(o.nombre, e.nombre)))
                  .map((e) => (
                    <option key={e.id} value={`emp:${e.id}`}>
                      {e.nombre}{e.cargo ? ` · ${String(e.cargo).toUpperCase()}` : ""}
                    </option>
                  ))}
              </optgroup>
            )}
            <option value="__manual__">Escribir otro coordinador…</option>
          </select>

          {modoManual && (
            <input
              value={coordinador?.nombre || ""}
              onChange={(e) => actualizarCampo("nombre", e.target.value)}
              onBlur={(e) => {
                const limpio = normalizarNombrePropio(e.target.value);
                if (limpio !== coordinador?.nombre) actualizarCampo("nombre", limpio);
              }}
              placeholder="Nombre completo del coordinador"
              autoCapitalize="words"
              style={{ ...CAMPO, marginTop: 8 }}
            />
          )}
        </div>

        <div>
          <LBL>Cargo</LBL>
          <input
            value={coordinador?.cargo || ""}
            disabled={!coordinador?.nombre && !modoManual}
            onChange={(e) => actualizarCampo("cargo", e.target.value.toUpperCase())}
            onBlur={(e) => {
              const limpio = normalizarMayusculas(e.target.value);
              const next = { ...(coordinador || {}), cargo: limpio };
              actualizarCampo("cargo", limpio);
              sincronizarPerfilSiExiste(next);
            }}
            placeholder="COORDINADOR SST"
            style={{ ...CAMPO, textTransform: "uppercase" }}
          />
        </div>

        <div>
          <LBL>Cédula (C.C.)</LBL>
          <input
            value={coordinador?.cedula || ""}
            disabled={!coordinador?.nombre && !modoManual}
            onChange={(e) => actualizarCampo("cedula", e.target.value)}
            onBlur={(e) => {
              const next = { ...(coordinador || {}), cedula: e.target.value.trim() };
              actualizarCampo("cedula", next.cedula);
              sincronizarPerfilSiExiste(next);
            }}
            placeholder="Ej: 1037600123"
            style={CAMPO}
          />
        </div>
      </div>

      {/* Tarjeta de firma automática JPEG del coordinador seleccionado */}
      {coordinador?.nombre && (
        <div
          style={{
            marginTop: 14,
            borderRadius: 14,
            padding: "12px 14px",
            border: firmaActual ? "1px solid #A7F3D0" : "1px solid #BFDBFE",
            background: firmaActual ? "#ECFDF5" : "#EFF6FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", minWidth: 0, flex: 1 }}>
            {firmaActual ? (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #D1FAE5",
                  borderRadius: 10,
                  padding: "6px 12px",
                  height: 52,
                  minWidth: 130,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={firmaActual}
                  alt={`Firma de ${coordinador.nombre}`}
                  style={{ maxHeight: 42, maxWidth: 165, objectFit: "contain", display: "block" }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "#DBEAFE",
                  color: "#1D4ED8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                ✍️
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: firmaActual ? "#047857" : "#1D4ED8",
                }}
              >
                {firmaActual
                  ? `Firma automática activa para ${coordinador.nombre}`
                  : `Sube la firma escaneada de ${coordinador.nombre} (PDF o JPEG)`}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-secondary, #475467)", marginTop: 2, lineHeight: 1.4 }}>
                {firmaActual
                  ? "Quedó guardada en el sistema: cada vez que pongas a este coordinador en un informe, se firmará solo."
                  : "Se sube una sola vez en PDF escaneado, JPEG o PNG. Recortamos los márgenes blancos automáticamente y se firmará solo en todos sus informes."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              disabled={subiendo}
              onClick={() => inputFirmaRef.current?.click()}
              style={{
                background: firmaActual ? "#ffffff" : "#0071E3",
                color: firmaActual ? "#1d1d1f" : "#ffffff",
                border: firmaActual ? "1px solid #A7F3D0" : "none",
                borderRadius: 10,
                padding: "7px 13px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {subiendo
                ? "Procesando…"
                : firmaActual
                ? "Cambiar firma (PDF / JPEG)"
                : "Subir firma (PDF / JPEG)"}
            </button>

            {firmaActual && (
              <Button
                variante="texto"
                tam="sm"
                onClick={() => {
                  onQuitarFirma?.(coordinador);
                  onCambiarCoordinador?.({ ...coordinador, firmaImg: "" });
                }}
              >
                Quitar
              </Button>
            )}
          </div>
        </div>
      )}

      {errorFirma && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c", fontWeight: 500 }}>
          {errorFirma}
        </div>
      )}
    </section>
  );
}
