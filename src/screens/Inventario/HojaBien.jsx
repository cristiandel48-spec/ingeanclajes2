import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Callout,
  Icono,
  Input,
  SegmentedControl,
  Sheet,
  StatusPill,
} from "../../components/ui";
import ZonaArchivos from "../../components/ZonaArchivos";
import { limpiarCreador, limpiarModificador } from "../../lib/autorAuditoria";
import { avisar } from "../../lib/dialogos";
import { fmt, fmtD } from "../../lib/format";
import { obrasMasNuevasPrimero } from "../../lib/identificadores";
import { leerImagenComprimida } from "../../lib/imagenes";
import {
  CATEGORIAS_INVENTARIO,
  crearBienVacio,
  ESTADO_DADO_DE_BAJA,
  estadoCalibracion,
  ESTADOS_INVENTARIO,
  normalizarBien,
  TIPOS_RESPONSABLE,
  tonoEstadoBien,
  validarBien,
  valorTotalBien,
} from "../../lib/inventario";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { CIFRA, COLOR, ESPACIO, MONO, RADIO, TIPO } from "../../styles/designTokens";

function estadoInicialFormulario(bien) {
  if (!bien) return crearBienVacio();
  return {
    ...crearBienVacio(),
    ...bien,
    cantidad: bien.cantidad ?? 1,
    valorCompra: bien.valorCompra === null || bien.valorCompra === undefined ? "" : String(bien.valorCompra),
    valorActual: bien.valorActual === null || bien.valorActual === undefined ? "" : String(bien.valorActual),
    fechaCompra: bien.fechaCompra || "",
    fechaCalibracion: bien.fechaCalibracion || "",
    fechaBaja: bien.fechaBaja || "",
    motivoBaja: bien.motivoBaja || "",
    foto: bien.foto || "",
  };
}

function SeccionTitulo({ children }) {
  return (
    <div
      style={{
        ...TIPO.eyebrow,
        color: COLOR.textTertiary,
        paddingBottom: ESPACIO.xs,
        borderBottom: `1px solid ${COLOR.separator}`,
      }}
    >
      {children}
    </div>
  );
}

// Hoja lateral (o hoja inferior en el celular) para crear, editar y consultar
// un bien sin sacar a la persona del listado.
export default function HojaBien({
  bienInicial = null,
  codigoNuevo = "",
  empleados = [],
  obras = [],
  puedeEscribir = false,
  asegurarDetalle,
  onGuardar,
  onPedirBaja,
  onEliminar,
  onCerrar,
}) {
  const esNuevo = !bienInicial;
  const isMobile = useIsMobile();
  const [form, setForm] = useState(() => estadoInicialFormulario(bienInicial));
  const [errores, setErrores] = useState({});
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const necesitaDetalle = Boolean(bienInicial?.__parcial && bienInicial?.tieneFoto);
  const [cargandoFoto, setCargandoFoto] = useState(necesitaDetalle);
  // Evita sobrescribir una foto recién elegida si la descarga del detalle termina después.
  const fotoTocadaRef = useRef(false);
  const detalleCargadoRef = useRef(!bienInicial?.__parcial);
  const inputFotoRef = useRef(null);
  const [ahora] = useState(() => new Date());

  useEffect(() => {
    if (!bienInicial?.id || !bienInicial?.__parcial || !asegurarDetalle) return undefined;
    let vivo = true;
    asegurarDetalle("inventario", bienInicial.id)
      .then((completo) => {
        if (!vivo) return;
        if (completo) {
          detalleCargadoRef.current = true;
          if (!fotoTocadaRef.current) {
            setForm((prev) => ({
              ...prev,
              foto: completo.foto || "",
              tieneFoto: Boolean(completo.foto),
            }));
          }
        }
        setCargandoFoto(false);
      })
      .catch(() => {
        if (vivo) setCargandoFoto(false);
      });
    return () => {
      vivo = false;
    };
  }, [bienInicial?.id, bienInicial?.__parcial, asegurarDetalle]);

  const empleadosOrdenados = useMemo(() => {
    const lista = Array.isArray(empleados) ? empleados : [];
    const activos = lista
      .filter((e) => e?.id && e.activo !== false)
      .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));
    // Si el bien estaba asignado a alguien hoy inactivo, se conserva en la lista
    // para que el selector no pierda el dato histórico al abrir la ficha.
    if (form.empleadoId && !activos.some((e) => e.id === form.empleadoId)) {
      const actual = lista.find((e) => e?.id === form.empleadoId);
      if (actual) return [{ ...actual, __inactivo: true }, ...activos];
    }
    return activos;
  }, [empleados, form.empleadoId]);

  const obrasOrdenadas = useMemo(() => obrasMasNuevasPrimero(obras), [obras]);

  const actualizar = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) {
      setErrores((prev) => {
        const copia = { ...prev };
        delete copia[campo];
        return copia;
      });
    }
  };

  const cambiarTipoResponsable = (nuevoTipo) => {
    setForm((prev) => ({
      ...prev,
      responsableTipo: nuevoTipo,
      empleadoId: nuevoTipo === "empleado" ? prev.empleadoId : "",
      obraId: nuevoTipo === "obra" ? prev.obraId : "",
    }));
    setErrores((prev) => {
      if (!prev.empleadoId && !prev.obraId) return prev;
      const copia = { ...prev };
      delete copia.empleadoId;
      delete copia.obraId;
      return copia;
    });
  };

  const recibirFoto = async (archivos) => {
    if (!puedeEscribir) return;
    const archivo = archivos?.[0];
    if (!archivo) return;
    setProcesandoFoto(true);
    try {
      const dataUrl = await leerImagenComprimida(archivo, { ladoMax: 1400, calidad: 0.82 });
      fotoTocadaRef.current = true;
      detalleCargadoRef.current = true;
      setForm((prev) => ({ ...prev, foto: dataUrl, tieneFoto: true }));
    } catch (err) {
      await avisar({
        titulo: "No se pudo cargar la foto",
        mensaje: err?.message || "Elige una imagen JPG, PNG o WebP.",
      });
    } finally {
      setProcesandoFoto(false);
      if (inputFotoRef.current) inputFotoRef.current.value = "";
    }
  };

  const quitarFoto = () => {
    fotoTocadaRef.current = true;
    detalleCargadoRef.current = true;
    setForm((prev) => ({ ...prev, foto: "", tieneFoto: false }));
  };

  const enviar = (e) => {
    e?.preventDefault();
    if (!puedeEscribir || cargandoFoto || procesandoFoto) return;

    const { valido, errores: errs } = validarBien(form);
    if (!valido) {
      setErrores(errs);
      return;
    }

    // Si la descarga del detalle falló (p. ej. sin conexión) y no se tocó la
    // foto, se conserva __parcial: true para que dataService no borre la foto
    // existente en Supabase Storage al guardar otros cambios del bien.
    const sigueParcial = Boolean(bienInicial?.__parcial && !detalleCargadoRef.current && !fotoTocadaRef.current);
    const limpio = normalizarBien({
      ...form,
      __parcial: sigueParcial,
    });

    onGuardar?.(limpio);
  };

  const totalRenglon = valorTotalBien(form);
  const cal = estadoCalibracion(form, ahora);
  const creador = bienInicial ? limpiarCreador(bienInicial.creadoPorNombre, bienInicial.creadoEn, bienInicial.creadoPor) : "";
  const modificador = bienInicial ? limpiarModificador(bienInicial.modificadoPorNombre, bienInicial.modificadoPor) : "";
  const soloLectura = !puedeEscribir;
  const dosColumnas = isMobile ? "1fr" : "1fr 1fr";
  const tresColumnas = isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))";

  const pie = soloLectura ? (
    <Button variante="secondary" onClick={onCerrar}>
      Cerrar
    </Button>
  ) : (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: ESPACIO.sm,
        flexWrap: "wrap",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", gap: ESPACIO.sm, flexWrap: "wrap" }}>
        {!esNuevo && bienInicial.estado !== ESTADO_DADO_DE_BAJA && (
          <Button
            variante="secondary"
            tam="sm"
            onClick={() => onPedirBaja?.(bienInicial)}
          >
            Dar de baja
          </Button>
        )}
        {!esNuevo && (
          <Button
            variante="destructive"
            tam="sm"
            icono="papelera"
            onClick={() => onEliminar?.(bienInicial)}
          >
            Eliminar
          </Button>
        )}
      </div>

      <div style={{ display: "flex", gap: ESPACIO.sm, marginLeft: "auto" }}>
        <Button variante="secondary" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          variante="primary"
          onClick={enviar}
          disabled={cargandoFoto || procesandoFoto}
          cargando={procesandoFoto}
        >
          {esNuevo ? "Guardar bien" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );

  return (
    <Sheet
      abierta
      onCerrar={onCerrar}
      className="inv-sheet-lateral"
      titulo={esNuevo ? "Nuevo bien" : (bienInicial.nombre || bienInicial.id)}
      subtitulo={
        esNuevo ? (
          <span style={{ fontFamily: MONO }}>Código automático: {codigoNuevo}</span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: ESPACIO.sm, flexWrap: "wrap" }}>
            <span style={{ fontFamily: MONO }}>{bienInicial.id}</span>
            <span>·</span>
            <span>{bienInicial.categoria}</span>
            <StatusPill estado={bienInicial.estado} tono={tonoEstadoBien(bienInicial.estado)} />
          </span>
        )
      }
      pie={pie}
    >
      <form onSubmit={enviar} style={{ display: "grid", gap: ESPACIO.xl }}>
        {!esNuevo && bienInicial.estado === ESTADO_DADO_DE_BAJA && (
          <Callout tono="neutro" titulo="Bien dado de baja">
            {bienInicial.motivoBaja || "Sin motivo registrado."}
            {bienInicial.fechaBaja ? ` (${fmtD(bienInicial.fechaBaja)})` : ""}
          </Callout>
        )}

        {(cal.nivel === "vencida" || cal.nivel === "proxima") && (
          <Callout
            tono={cal.nivel === "vencida" ? "peligro" : "aviso"}
            titulo={cal.nivel === "vencida" ? "Calibración o vencimiento vencido" : "Calibración o vencimiento próximo"}
          >
            {cal.etiqueta} · fecha registrada: {fmtD(form.fechaCalibracion)}.
          </Callout>
        )}

        {/* 1. Identificación */}
        <section style={{ display: "grid", gap: ESPACIO.md }}>
          <SeccionTitulo>Identificación</SeccionTitulo>

          <Input
            label="Nombre / descripción"
            obligatorio
            disabled={soloLectura}
            value={form.nombre}
            onChange={(e) => actualizar("nombre", e.target.value)}
            placeholder="Ej. Taladro percutor inalámbrico, Dinamómetro 25 kN, Casco dieléctrico"
            error={errores.nombre}
          />

          <div style={{ display: "grid", gridTemplateColumns: dosColumnas, gap: ESPACIO.md }}>
            <Input
              como="select"
              label="Categoría"
              obligatorio
              disabled={soloLectura}
              value={form.categoria}
              onChange={(e) => actualizar("categoria", e.target.value)}
              error={errores.categoria}
            >
              {CATEGORIAS_INVENTARIO.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Input>

            <Input
              como="select"
              label="Estado"
              disabled={soloLectura}
              value={form.estado}
              onChange={(e) => actualizar("estado", e.target.value)}
            >
              {ESTADOS_INVENTARIO.map((est) => (
                <option key={est} value={est}>{est}</option>
              ))}
            </Input>
          </div>

          {form.estado === ESTADO_DADO_DE_BAJA && (
            <Input
              como="textarea"
              label="Motivo de baja"
              obligatorio
              rows={2}
              disabled={soloLectura}
              value={form.motivoBaja}
              onChange={(e) => actualizar("motivoBaja", e.target.value)}
              placeholder="Ej. Daño irreparable, extravío o reemplazo por fin de vida útil"
              error={errores.motivoBaja}
            />
          )}

          <div style={{ display: "grid", gridTemplateColumns: tresColumnas, gap: ESPACIO.md }}>
            <Input
              label="Marca"
              disabled={soloLectura}
              value={form.marca}
              onChange={(e) => actualizar("marca", e.target.value)}
              placeholder="Ej. DeWalt, Hilti, Dell"
            />
            <Input
              label="Línea / modelo"
              disabled={soloLectura}
              value={form.modelo}
              onChange={(e) => actualizar("modelo", e.target.value)}
              placeholder="Ej. DCD996, TE 30"
            />
            <Input
              label="Número de serie"
              disabled={soloLectura}
              value={form.serial}
              onChange={(e) => actualizar("serial", e.target.value)}
              placeholder="Opcional"
              style={{ fontFamily: MONO }}
            />
          </div>
        </section>

        {/* 2. Valoración */}
        <section style={{ display: "grid", gap: ESPACIO.md }}>
          <SeccionTitulo>Valoración</SeccionTitulo>

          <div style={{ display: "grid", gridTemplateColumns: dosColumnas, gap: ESPACIO.md }}>
            <Input
              label="Cantidad"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              obligatorio
              disabled={soloLectura}
              value={form.cantidad}
              onChange={(e) => actualizar("cantidad", e.target.value)}
              ayuda="Por defecto 1 (útil para lotes iguales como cascos)."
              error={errores.cantidad}
              style={CIFRA}
            />

            <Input
              label="Valor actual por unidad (COP)"
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              obligatorio
              disabled={soloLectura}
              value={form.valorActual}
              onChange={(e) => actualizar("valorActual", e.target.value)}
              placeholder="0"
              ayuda={form.valorActual !== "" && Number(form.valorActual) >= 0 ? fmt(Number(form.valorActual)) : "Estimado hoy en pesos colombianos."}
              error={errores.valorActual}
              style={CIFRA}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: ESPACIO.md,
              padding: `${ESPACIO.sm}px ${ESPACIO.md}px`,
              borderRadius: RADIO.control,
              background: COLOR.successBg,
            }}
          >
            <span style={{ ...TIPO.footnote, color: COLOR.successText }}>
              Valor total del renglón
              {Number(form.cantidad) > 1 ? ` (${form.cantidad} unidades)` : ""}
            </span>
            <strong style={{ ...TIPO.headline, ...CIFRA, color: COLOR.successText }}>
              {fmt(totalRenglon)}
            </strong>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: dosColumnas, gap: ESPACIO.md }}>
            <Input
              label="Fecha de compra"
              type="date"
              disabled={soloLectura}
              value={form.fechaCompra}
              onChange={(e) => actualizar("fechaCompra", e.target.value)}
              ayuda="Opcional."
            />

            <Input
              label="Valor de compra unitario (COP)"
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              disabled={soloLectura}
              value={form.valorCompra}
              onChange={(e) => actualizar("valorCompra", e.target.value)}
              placeholder="Opcional"
              ayuda={form.valorCompra !== "" && Number(form.valorCompra) >= 0 ? fmt(Number(form.valorCompra)) : "Referencia histórica."}
              error={errores.valorCompra}
              style={CIFRA}
            />
          </div>
        </section>

        {/* 3. Ubicación o responsable */}
        <section style={{ display: "grid", gap: ESPACIO.md }}>
          <SeccionTitulo>Ubicación o responsable</SeccionTitulo>

          <div>
            <SegmentedControl
              opciones={TIPOS_RESPONSABLE}
              valor={form.responsableTipo}
              onChange={(v) => { if (!soloLectura) cambiarTipoResponsable(v); }}
              etiqueta="Tipo de asignación"
            />
          </div>

          {form.responsableTipo === "empleado" && (
            <Input
              como="select"
              label="Empleado responsable"
              obligatorio
              disabled={soloLectura}
              value={form.empleadoId}
              onChange={(e) => actualizar("empleadoId", e.target.value)}
              error={errores.empleadoId}
            >
              <option value="">Selecciona un empleado…</option>
              {empleadosOrdenados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre}
                  {emp.cargo ? ` · ${emp.cargo}` : ""}
                  {emp.__inactivo ? " (inactivo)" : ""}
                </option>
              ))}
            </Input>
          )}

          {form.responsableTipo === "obra" && (
            <Input
              como="select"
              label="Obra asignada"
              obligatorio
              disabled={soloLectura}
              value={form.obraId}
              onChange={(e) => actualizar("obraId", e.target.value)}
              error={errores.obraId}
            >
              <option value="">Selecciona una obra…</option>
              {obrasOrdenadas.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {[obra.id, obra.proyecto || obra.cliente, obra.ciudad].filter(Boolean).join(" · ")}
                </option>
              ))}
            </Input>
          )}

          <Input
            label={form.responsableTipo === "texto" ? "Ubicación o responsable" : "Detalle de ubicación (opcional)"}
            disabled={soloLectura}
            value={form.ubicacion}
            onChange={(e) => actualizar("ubicacion", e.target.value)}
            placeholder={
              form.responsableTipo === "texto"
                ? "Ej. Bodega Envigado, Oficina principal, Camioneta"
                : "Ej. Estante 2, maletín de pruebas, frente norte"
            }
          />
        </section>

        {/* 4. Calibración / vencimiento */}
        <section style={{ display: "grid", gap: ESPACIO.md }}>
          <SeccionTitulo>Calibración o vencimiento</SeccionTitulo>

          <Input
            label="Próxima calibración o vencimiento"
            type="date"
            disabled={soloLectura}
            value={form.fechaCalibracion}
            onChange={(e) => actualizar("fechaCalibracion", e.target.value)}
            ayuda="Opcional. Para dinamómetros, arneses, cascos o extintores; se alerta cuando falten 30 días o menos."
          />
        </section>

        {/* 5. Foto y notas */}
        <section style={{ display: "grid", gap: ESPACIO.md }}>
          <SeccionTitulo>Foto y notas</SeccionTitulo>

          <div>
            <div className="ui-label">Foto del bien</div>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => recibirFoto(Array.from(e.target.files || []))}
            />

            {cargandoFoto ? (
              <div
                style={{
                  padding: ESPACIO.lg,
                  borderRadius: RADIO.control,
                  background: COLOR.fill,
                  color: COLOR.textTertiary,
                  ...TIPO.callout,
                  textAlign: "center",
                }}
              >
                Cargando foto…
              </div>
            ) : form.foto ? (
              <div
                style={{
                  display: "grid",
                  gap: ESPACIO.sm,
                  padding: ESPACIO.sm,
                  borderRadius: RADIO.control,
                  background: COLOR.fill,
                }}
              >
                <img
                  src={form.foto}
                  alt={form.nombre || "Foto del bien"}
                  style={{
                    width: "100%",
                    maxHeight: 240,
                    objectFit: "contain",
                    borderRadius: RADIO.chip,
                    background: COLOR.surface,
                    display: "block",
                  }}
                />
                {!soloLectura && (
                  <div style={{ display: "flex", gap: ESPACIO.sm, justifyContent: "flex-end" }}>
                    <Button
                      variante="secondary"
                      tam="sm"
                      icono="camara"
                      disabled={procesandoFoto}
                      onClick={() => inputFotoRef.current?.click()}
                    >
                      Cambiar foto
                    </Button>
                    <Button
                      variante="destructive"
                      tam="sm"
                      icono="papelera"
                      disabled={procesandoFoto}
                      onClick={quitarFoto}
                    >
                      Quitar
                    </Button>
                  </div>
                )}
              </div>
            ) : soloLectura ? (
              <div
                style={{
                  padding: ESPACIO.md,
                  borderRadius: RADIO.control,
                  background: COLOR.fill,
                  color: COLOR.textTertiary,
                  ...TIPO.callout,
                }}
              >
                Sin foto registrada.
              </div>
            ) : (
              <ZonaArchivos
                alRecibir={recibirFoto}
                deshabilitado={procesandoFoto}
                onClick={() => inputFotoRef.current?.click()}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: ESPACIO.xs,
                  padding: `${ESPACIO.xl}px ${ESPACIO.lg}px`,
                  borderRadius: RADIO.control,
                  background: COLOR.fill,
                  border: `1px dashed ${COLOR.separator}`,
                  color: COLOR.textSecondary,
                  cursor: procesandoFoto ? "wait" : "pointer",
                  textAlign: "center",
                }}
                estiloArrastrando={{
                  borderColor: COLOR.textTertiary,
                  background: COLOR.surface,
                }}
              >
                {(arrastrando) => (
                  <>
                    <Icono nombre="camara" size={20} style={{ color: COLOR.textTertiary }} />
                    <span style={{ ...TIPO.callout, fontWeight: 500, color: COLOR.textPrimary }}>
                      {procesandoFoto
                        ? "Optimizando imagen…"
                        : arrastrando
                          ? "Suelta la foto aquí"
                          : "Agregar foto (clic, arrastrar o pegar)"}
                    </span>
                    <span style={{ ...TIPO.caption, color: COLOR.textTertiary }}>
                      Se guarda optimizada en Storage, fuera del arranque inicial.
                    </span>
                  </>
                )}
              </ZonaArchivos>
            )}
          </div>

          <Input
            como="textarea"
            label="Notas"
            rows={3}
            disabled={soloLectura}
            value={form.notas}
            onChange={(e) => actualizar("notas", e.target.value)}
            placeholder="Accesorios incluidos, observaciones de uso, número de certificado de calibración…"
          />
        </section>

        {/* Autoría */}
        {!esNuevo && (bienInicial.creadoEn || bienInicial.modificadoEn) && (
          <div
            style={{
              paddingTop: ESPACIO.md,
              borderTop: `1px solid ${COLOR.separator}`,
              display: "grid",
              gap: ESPACIO.xs,
              ...TIPO.caption,
              color: COLOR.textTertiary,
            }}
          >
            {bienInicial.creadoEn && (
              <div>
                Creado por <strong style={{ color: COLOR.textSecondary }}>{creador}</strong> el {fmtD(bienInicial.creadoEn)}
              </div>
            )}
            {bienInicial.modificadoEn && (
              <div>
                Última modificación{modificador ? <> por <strong style={{ color: COLOR.textSecondary }}>{modificador}</strong></> : ""} el {fmtD(bienInicial.modificadoEn)}
              </div>
            )}
          </div>
        )}
      </form>
    </Sheet>
  );
}
