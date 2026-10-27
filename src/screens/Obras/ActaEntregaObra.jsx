import { useEffect, useRef, useState } from "react";
import { Button, Callout, Card, EmptyState, Input, StatusPill, useToast } from "../../components/ui";
import { ESPACIO, RADIO, TIPO } from "../../styles/designTokens";
import { fmtD } from "../../lib/format";
import { openPrintTab } from "../../lib/abrirImpresion";
import { confirmar } from "../../lib/dialogos";
import { getFirmaImg, setFirmaImg } from "../../lib/firmaEmpresa";
import { leerImagenComprimida } from "../../lib/imagenes";
import { normalizarCorreo, normalizarDocumento, normalizarMayusculas, normalizarNombrePropio } from "../../lib/normalizarEntrada";
import { clienteDeObra, clientesConQuienRecibe } from "../../lib/quienRecibe";
import { buildActaPrintHtml } from "../../lib/actaEntregaPrint";
import { descargarActaPdf, generarActaPdf } from "../../lib/actaEntregaPdf";
import { construirActa, datosDeEjecucion, faltantesDelActa, normalizarActas } from "../../lib/actaEntrega";
import { useEnviosFirma } from "../../hooks/useEnviosFirma";
import { ModalEnviarFirma, PanelFirmaRecibido } from "../../components/FirmaRecibidoDocumento";

// El acta de entrega de obra dentro de la obra.
//
// Se crea con un boton: el programa la arma con lo que ya sabe -el cliente,
// la cotizacion, las fechas de la bitacora, quien estuvo- y aqui se corrige
// lo que haga falta. Despues se imprime para firmar en sitio, o se le envia
// al cliente para que firme desde el celular, que es lo mismo que ya se hace
// con el informe de actividades.
//
// NADA SE ELIGE DE UNA LISTA. Quien ejecuto el trabajo y que se hizo salen de
// la ejecucion de la obra; quien recibe sale de la ficha del cliente de esta
// obra. Antes habia que escogerlos en unos desplegables que permitian poner,
// por equivocacion, el contacto de otro cliente o a alguien que no estuvo.
// Todo sigue siendo editable: lo que no se puede es elegir mal de entrada.
//
// Lo que el programa NO puede saber -las areas intervenidas, la cedula de
// quien recibe- queda en blanco y se avisa antes de entregarla.

const REJILLA = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: ESPACIO.md };

// Un apartado de la hoja: titulo discreto a la izquierda, la accion de ese
// apartado a la derecha y una linea fina que lo separa del anterior.
function Seccion({ titulo, nota, accion, primera = false, children }) {
  return (
    <section style={{
      paddingTop: primera ? 0 : ESPACIO.xxl,
      marginTop: primera ? 0 : ESPACIO.xxl,
      borderTop: primera ? "none" : "1px solid var(--separator)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        gap: ESPACIO.md, flexWrap: "wrap", marginBottom: ESPACIO.md,
      }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ ...TIPO.headline, margin: 0, color: "var(--text-primary)" }}>{titulo}</h3>
          {nota && (
            <div style={{ ...TIPO.caption, color: "var(--text-tertiary)", marginTop: 3, fontWeight: 400, lineHeight: "16px" }}>
              {nota}
            </div>
          )}
        </div>
        {accion}
      </div>
      {children}
    </section>
  );
}

export default function ActaEntregaObra({ obra, ctx, setObras, bloqueada = false }) {
  const {
    cotizaciones = [],
    clientes = [],
    setClientes,
    empleados = [],
    horarios = [],
    informes = [],
    setInformes,
    obras = [],
    empresaConfig,
    setEmpresaConfig,
  } = ctx;
  const toast = useToast();
  const firmaEmpresa = getFirmaImg(empresaConfig);

  const actas = normalizarActas(obra);
  const [actaId, setActaId] = useState(() => actas[actas.length - 1]?.id || "");
  const [modalFirma, setModalFirma] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const archivoFirma = useRef(null);
  // Las actas a las que ya se les completo el contacto del cliente, para no
  // volver a escribirlo encima si la persona lo borra a proposito.
  const contactoPuesto = useRef(new Set());

  const acta = actas.find((a) => a.id === actaId) || null;
  const { envios, recargar: recargarEnvios } = useEnviosFirma(acta?.id || "", { tipo: "acta" });

  const clienteFicha = clienteDeObra(clientes, obra);

  const empleadosActivos = (Array.isArray(empleados) ? empleados : [])
    .filter((e) => e && e.activo !== false)
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

  const guardarActa = (id, cambios) =>
    setObras((prev) => prev.map((o) => (o.id === obra.id
      ? { ...o, actas: normalizarActas(o).map((a) => (a.id === id ? { ...a, ...cambios } : a)) }
      : o)));

  // Sincroniza quien recibe en el acta, la obra, los informes de actividades y la tabla de clientes
  const sincronizarContactoRecibe = ({ nombre, documento, cargo }, { notificar = false } = {}) => {
    if (!acta) return;
    const nomLimpio = normalizarNombrePropio(nombre !== undefined ? nombre : acta.recibeNombre);
    const docLimpio = normalizarDocumento(documento !== undefined ? documento : acta.recibeDocumento);
    const cargoLimpio = normalizarMayusculas(cargo !== undefined ? cargo : acta.recibeCargo);

    // 1. Guardar en el acta actual
    guardarActa(acta.id, {
      recibeNombre: nomLimpio,
      recibeDocumento: docLimpio,
      recibeCargo: cargoLimpio,
    });

    // 2. Guardar en la obra (recibeNombre, recibeDocumento, recibeCargo) y en sus actas
    setObras((prev) => prev.map((o) => {
      if (o.id !== obra.id) return o;
      return {
        ...o,
        recibeNombre: nomLimpio || o.recibeNombre,
        recibeDocumento: docLimpio || o.recibeDocumento,
        recibeCargo: cargoLimpio || o.recibeCargo,
        actas: normalizarActas(o).map((a) => (a.id === acta.id ? {
          ...a,
          recibeNombre: nomLimpio,
          recibeDocumento: docLimpio,
          recibeCargo: cargoLimpio,
        } : a)),
      };
    }));

    // 3. Sincronizar en la base de datos de Clientes
    if (typeof setClientes === "function") {
      setClientes((prev) => clientesConQuienRecibe(prev, obra, {
        nombre: nomLimpio,
        documento: docLimpio,
        cargo: cargoLimpio,
        email: acta.correoAdministrativo || obra.recibeEmail || "",
        telefono: acta.telefono || obra.tel || "",
      }));
    }

    // 4. Sincronizar en los informes de actividades de esta obra
    if (typeof setInformes === "function") {
      setInformes((prev) => (Array.isArray(prev) ? prev : []).map((inf) => {
        if (inf.obraId !== obra.id) return inf;
        return {
          ...inf,
          recibeNombre: nomLimpio || inf.recibeNombre,
          recibeDocumento: docLimpio || inf.recibeDocumento,
          recibeCargo: cargoLimpio || inf.recibeCargo,
          contacto: nomLimpio || inf.contacto,
        };
      }));
    }

    if (notificar && nomLimpio) {
      toast.exito("Contacto actualizado en el cliente, la obra y sus informes.");
    }
  };

  // Quien recibe se trae solo de la ficha del cliente de ESTA obra. No hay
  // lista de donde escogerlo: el acta la firma el contacto del cliente al que
  // se le entrega, no uno cualquiera del directorio.
  const contactoCliente = {
    nombre: normalizarNombrePropio(obra?.recibeNombre || clienteFicha?.contacto || ""),
    documento: String(obra?.recibeDocumento || clienteFicha?.contactoCedula || clienteFicha?.contacto_cedula || "").trim(),
    cargo: String(obra?.recibeCargo || clienteFicha?.contactoCargo || clienteFicha?.contacto_cargo || "").trim(),
  };

  useEffect(() => {
    if (!acta || bloqueada) return;
    if (acta.recibeNombre?.trim()) return;
    if (!contactoCliente.nombre) return;
    if (contactoPuesto.current.has(acta.id)) return;
    contactoPuesto.current.add(acta.id);
    guardarActa(acta.id, {
      recibeNombre: contactoCliente.nombre,
      recibeDocumento: acta.recibeDocumento || contactoCliente.documento,
      recibeCargo: acta.recibeCargo || contactoCliente.cargo,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acta?.id, contactoCliente.nombre, bloqueada]);

  const upd = (campo) => (ev) => guardarActa(acta.id, { [campo]: ev.target.value });
  // Al salir del campo se acomoda lo escrito: mayusculas donde el formato las
  // lleva, nombre propio donde va una persona. Se hace al salir y no al
  // teclear para no pelearse con quien esta escribiendo.
  const alSalir = (campo, normalizar) => (ev) => {
    const limpio = normalizar(ev.target.value);
    if (limpio !== acta[campo]) guardarActa(acta.id, { [campo]: limpio });
  };

  const crearActa = () => {
    const nueva = construirActa({
      obra,
      cotizacion: cotizaciones.find((c) => c.id === obra.cotizacionId) || null,
      cliente: clienteDeObra(clientes, obra),
      informes,
      horarios,
      empleados,
      obras,
    });
    setObras((prev) => prev.map((o) => (o.id === obra.id
      ? { ...o, actas: [...normalizarActas(o), nueva] }
      : o)));
    setActaId(nueva.id);
    toast.exito(`Acta ${nueva.id} creada con los datos de la obra. RevÃ­sala antes de entregarla.`);
  };

  // Vuelve a traer de la obra quien ejecuto el trabajo y que se hizo. Sirve
  // cuando el acta se creo antes de que el equipo terminara de registrar sus
  // jornadas: no hay que escribirlo otra vez a mano.
  const traerDeEjecucion = () => {
    const datos = datosDeEjecucion({ obra, informes, horarios, empleados });
    const hayAlgo = datos.liderProyecto || datos.coordinadorAlturas || datos.colaboradores.length || datos.descripcion;
    if (!hayAlgo) {
      toast.error("La obra todavÃ­a no tiene personal asignado ni jornadas registradas.");
      return;
    }
    guardarActa(acta.id, {
      coordinadorAlturas: datos.coordinadorAlturas || acta.coordinadorAlturas,
      liderProyecto: datos.liderProyecto || acta.liderProyecto,
      colaboradores: datos.colaboradores.length ? datos.colaboradores : acta.colaboradores,
      descripcion: datos.descripcion || acta.descripcion,
    });
    toast.exito("Se trajo lo que el equipo registrÃ³ en la ejecuciÃ³n de la obra.");
  };

  const subirFirma = async (file) => {
    if (!file) return;
    try {
      const img = await leerImagenComprimida(file, { ladoMax: 700, calidad: 0.9 });
      guardarActa(acta.id, { firmaLider: img });
      toast.exito("Firma cargada. Sale en la hoja impresa y en el PDF.");
    } catch (fallo) {
      toast.error(fallo.message || "No se pudo leer la imagen de la firma.");
    }
  };

  const guardarFirmaEnEmpresa = () => {
    if (typeof setEmpresaConfig !== "function" || !acta.firmaLider) return;
    setEmpresaConfig((prev) => setFirmaImg(prev, acta.firmaLider));
    toast.exito("Esta firma queda como la de la empresa para los prÃ³ximos documentos.");
  };

  const borrarActa = async () => {
    const ok = await confirmar({
      titulo: `Borrar el acta ${acta.id}`,
      mensaje: "Se borra de la obra con todo lo que se le haya escrito. Los envÃ­os a firma que ya se hicieron no se borran.",
      textoConfirmar: "Borrar acta",
      destructivo: true,
    });
    if (!ok) return;
    setObras((prev) => prev.map((o) => (o.id === obra.id
      ? { ...o, actas: normalizarActas(o).filter((a) => a.id !== acta.id) }
      : o)));
    setActaId("");
  };

  const envioFirmado = envios.find((e) => e.estado === "firmado") || null;

  const imprimir = () => openPrintTab(
    buildActaPrintHtml(acta, { empresaConfig, firmaImg: firmaEmpresa, firmaCliente: envioFirmado }),
    `Acta de entrega ${acta.id}`
  );

  const descargar = async () => {
    setGenerandoPdf(true);
    try {
      await descargarActaPdf(acta, { empresaConfig, firmaImg: firmaEmpresa, firmaCliente: envioFirmado });
    } catch (fallo) {
      toast.error(fallo.message || "No se pudo generar el PDF del acta.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  if (!acta) {
    return (
      <Card ajustado>
        <EmptyState
          titulo="Esta obra no tiene acta de entrega"
          texto={
            "El acta (FORM-SST-89) es la hoja que firma el cliente cuando se le entrega el trabajo. " +
            "Es un requisito obligatorio: sin el acta de entrega no se puede generar el informe de actividades de esta obra. " +
            "El programa la arma con los datos de la obra y de su cotizaciÃ³n; en la obra solo hay que revisarla y firmarla."
          }
          accion={!bloqueada ? <Button variante="primary" icono="mas" onClick={crearActa}>Crear acta de entrega</Button> : null}
        />
        {actas.length > 0 && (
          <div style={{ marginTop: ESPACIO.md, display: "flex", gap: ESPACIO.sm, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...TIPO.footnote, color: "var(--text-tertiary)" }}>Actas de esta obra:</span>
            {actas.map((a) => (
              <Button key={a.id} tam="sm" variante="tertiary" onClick={() => setActaId(a.id)}>
                {a.id} Â· {fmtD(a.fecha)}
              </Button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  const faltantes = faltantesDelActa(acta);
  const firmaEnLaHoja = acta.firmaLider || firmaEmpresa;

  return (
    <>
      <Card ajustado style={{ marginBottom: ESPACIO.lg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ESPACIO.md, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...TIPO.eyebrow, color: "var(--text-tertiary)" }}>Acta de entrega de obra Â· FORM-SST-89</div>
            <div style={{ display: "flex", alignItems: "center", gap: ESPACIO.sm, flexWrap: "wrap", marginTop: 6 }}>
              <span style={{ ...TIPO.title2, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                Orden de trabajo {acta.id}
              </span>
              {envioFirmado ? (
                <StatusPill tono="exito">Firmada por el cliente</StatusPill>
              ) : (
                <StatusPill tono={faltantes.length ? "aviso" : "exito"}>
                  {faltantes.length ? "Falta informaciÃ³n" : "Lista para firmar"}
                </StatusPill>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Button tam="sm" variante="tertiary" onClick={imprimir}>Imprimir</Button>
            <Button tam="sm" variante="tertiary" disabled={generandoPdf} onClick={descargar}>
              {generandoPdf ? "Generandoâ€¦" : envioFirmado ? "Descargar PDF firmado" : "Descargar PDF"}
            </Button>
            <Button tam="sm" variante="primary" onClick={() => setModalFirma(true)}>Enviar a firma</Button>
            {!bloqueada && <Button tam="sm" variante="texto" onClick={borrarActa}>Borrar</Button>}
          </div>
        </div>

        {actas.length > 1 && (
          <div style={{ marginTop: ESPACIO.md, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...TIPO.footnote, color: "var(--text-tertiary)" }}>Otras actas:</span>
            {actas.filter((a) => a.id !== acta.id).map((a) => (
              <Button key={a.id} tam="sm" variante="tertiary" onClick={() => setActaId(a.id)}>
                {a.id} Â· {fmtD(a.fecha)}
              </Button>
            ))}
          </div>
        )}

        {faltantes.length > 0 && (
          <Callout tono="aviso" style={{ marginTop: ESPACIO.md }}>
            Antes de entregarla falta {faltantes.join(", ")}. Se puede imprimir asÃ­ y completarla a mano, pero
            escrita aquÃ­ queda guardada con la obra.
          </Callout>
        )}

        {!bloqueada && (
          <Button tam="sm" variante="tertiary" style={{ marginTop: ESPACIO.md }} onClick={crearActa}>
            Crear otra acta para esta obra
          </Button>
        )}
      </Card>

      <PanelFirmaRecibido
        tipo="acta"
        celular={obra.tel || ""}
        proyecto={obra.proyecto || ""}
        envios={envios}
        onRecargar={recargarEnvios}
        onEnviar={() => setModalFirma(true)}
      />

      <Card ajustado>
        <Seccion primera titulo="Contratante y obra" nota="Sale de la ficha del cliente y de la cotizaciÃ³n de esta obra.">
          <div style={REJILLA}>
            <Input label="Contratante" value={acta.contratante} disabled={bloqueada}
              onChange={upd("contratante")} onBlur={alSalir("contratante", normalizarMayusculas)} />
            <Input label="NIT" value={acta.nit} disabled={bloqueada}
              onChange={upd("nit")} onBlur={alSalir("nit", normalizarDocumento)} />
            <Input label="TelÃ©fono" type="tel" inputMode="tel" value={acta.telefono} disabled={bloqueada} onChange={upd("telefono")} />
            <Input label="Contacto administrativo" value={acta.contactoAdministrativo} disabled={bloqueada}
              onChange={upd("contactoAdministrativo")} onBlur={alSalir("contactoAdministrativo", normalizarNombrePropio)} />
            <Input label="Correo de facturaciÃ³n electrÃ³nica" type="email" value={acta.correoFacturacion} disabled={bloqueada}
              onChange={upd("correoFacturacion")} onBlur={alSalir("correoFacturacion", normalizarCorreo)} />
            <Input label="Correo administrativo" type="email" value={acta.correoAdministrativo} disabled={bloqueada}
              onChange={upd("correoAdministrativo")} onBlur={alSalir("correoAdministrativo", normalizarCorreo)} />
          </div>
          <div style={{ ...REJILLA, marginTop: ESPACIO.md }}>
            <Input label="DirecciÃ³n de obra" value={acta.direccionObra} disabled={bloqueada}
              onChange={upd("direccionObra")} onBlur={alSalir("direccionObra", normalizarMayusculas)} />
            <Input label="Ãreas intervenidas" obligatorio value={acta.areasIntervenidas} disabled={bloqueada}
              placeholder="Cubierta y terraza de la subestaciÃ³n"
              ayuda="DÃ³nde se trabajÃ³. Es lo Ãºnico que el programa no puede deducir."
              onChange={upd("areasIntervenidas")} />
          </div>
          <div style={{ marginTop: ESPACIO.md }}>
            <Input label="Objetivo del proyecto" obligatorio value={acta.objetivo} disabled={bloqueada}
              ayuda="Sale de los Ã­tems de la cotizaciÃ³n vinculada."
              onChange={upd("objetivo")} onBlur={alSalir("objetivo", normalizarMayusculas)} />
          </div>
          <div style={{ ...REJILLA, marginTop: ESPACIO.md }}>
            <Input label="Fecha de inicio" type="date" value={acta.fechaInicio} disabled={bloqueada} onChange={upd("fechaInicio")} />
            <Input label="Fecha de entrega" type="date" value={acta.fechaEntrega} disabled={bloqueada} onChange={upd("fechaEntrega")} />
            <Input label="Fecha del acta" type="date" value={acta.fecha} disabled={bloqueada} onChange={upd("fecha")} />
          </div>
        </Seccion>

        <Seccion titulo="Sistema instalado o recertificado" nota="Las cantidades vienen de la cotizaciÃ³n aprobada.">
          <Input label="Acero" como="select" value={acta.acero} disabled={bloqueada} onChange={upd("acero")}>
            <option value="">Sin especificar</option>
            <option value="galvanizado">Acero galvanizado</option>
            <option value="inoxidable">Acero inoxidable</option>
          </Input>
          <div style={{ marginTop: ESPACIO.md }}>
            <div style={{ ...TIPO.caption, color: "var(--text-tertiary)", marginBottom: 6 }}>
              Cantidades entregadas
            </div>
            {acta.sistemas.length ? acta.sistemas.map((s, i) => (
              <div key={`${s.descripcion}-${i}`} style={{
                display: "grid", gridTemplateColumns: "72px 72px minmax(0,1fr)", gap: ESPACIO.sm,
                padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid var(--separator)", alignItems: "center",
              }}>
                <input type="number" min="0" value={s.cantidad} disabled={bloqueada}
                  aria-label={`Cantidad de ${s.descripcion}`}
                  onChange={(ev) => guardarActa(acta.id, {
                    sistemas: acta.sistemas.map((x, j) => (j === i ? { ...x, cantidad: Number(ev.target.value) || 0 } : x)),
                  })}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: RADIO.chip, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, fontVariantNumeric: "tabular-nums" }} />
                <input value={s.unidad} disabled={bloqueada}
                  aria-label={`Unidad de ${s.descripcion}`}
                  onChange={(ev) => guardarActa(acta.id, {
                    sistemas: acta.sistemas.map((x, j) => (j === i ? { ...x, unidad: ev.target.value } : x)),
                  })}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: RADIO.chip, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13 }} />
                <span style={{ ...TIPO.callout, color: "var(--text-primary)" }}>{s.descripcion}</span>
              </div>
            )) : (
              <div style={{ ...TIPO.callout, color: "var(--text-tertiary)" }}>
                La obra no tiene cotizaciÃ³n vinculada con Ã­tems, asÃ­ que no hay cantidades que traer. Se escriben a
                mano sobre la hoja impresa.
              </div>
            )}
          </div>
        </Seccion>

        <Seccion
          titulo="QuiÃ©n ejecutÃ³ el trabajo"
          nota="Sale de quiÃ©n tuvo turno en esta obra y del cargo que tiene en Personal."
          accion={!bloqueada && (
            <Button tam="sm" variante="tertiary" onClick={traerDeEjecucion}>
              Traer de la ejecuciÃ³n
            </Button>
          )}
        >
          <div style={REJILLA}>
            <Input
              label="Coordinador de alturas"
              value={acta.coordinadorAlturas}
              disabled={bloqueada}
              list="lista-empleados-acta"
              onChange={upd("coordinadorAlturas")}
              onBlur={alSalir("coordinadorAlturas", normalizarNombrePropio)}
            />
            <Input
              label="LÃ­der de proyecto"
              obligatorio
              value={acta.liderProyecto}
              disabled={bloqueada}
              list="lista-empleados-acta"
              onChange={upd("liderProyecto")}
              onBlur={alSalir("liderProyecto", normalizarNombrePropio)}
            />
          </div>

          <datalist id="lista-empleados-acta">
            {empleadosActivos.map((e) => (
              <option key={e.id} value={e.nombre}>
                {e.cargo || ""}
              </option>
            ))}
          </datalist>

          <div style={{ marginTop: ESPACIO.md }}>
            <Input
              label="Colaboradores"
              como="textarea"
              rows={3}
              disabled={bloqueada}
              ayuda="Uno por lÃ­nea. Son los que tuvieron turno en esta obra."
              value={acta.colaboradores.join("\n")}
              onChange={(ev) => guardarActa(acta.id, { colaboradores: ev.target.value.split("\n") })}
              onBlur={(ev) => guardarActa(acta.id, {
                colaboradores: ev.target.value.split("\n").map(normalizarNombrePropio).filter(Boolean),
              })}
            />
          </div>
        </Seccion>

        <Seccion
          titulo="Lo que se hizo"
          nota="Viene de los informes de actividades de esta obra y, si no hay, de la bitÃ¡cora."
        >
          <Input label="DescripciÃ³n del trabajo realizado" obligatorio como="textarea" rows={8} disabled={bloqueada}
            value={acta.descripcion} onChange={upd("descripcion")} />
          <div style={{ marginTop: ESPACIO.md }}>
            <Input label="Observaciones" como="textarea" rows={3} disabled={bloqueada}
              value={acta.observaciones} onChange={upd("observaciones")} />
          </div>
        </Seccion>

        <Seccion
          titulo="Entrega conforme"
          nota="La firma de quien entrega, tal como sale en la hoja impresa."
        >
          <div style={{
            display: "flex", alignItems: "center", gap: ESPACIO.lg, flexWrap: "wrap",
            padding: ESPACIO.lg, borderRadius: RADIO.control, background: "var(--fill)",
          }}>
            <div style={{
              width: 200, height: 76, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: RADIO.chip, background: "#ffffff",
              border: firmaEnLaHoja ? "1px solid var(--separator)" : "1px dashed var(--border)",
            }}>
              {firmaEnLaHoja ? (
                <img src={firmaEnLaHoja} alt="Firma de quien entrega"
                  style={{ maxHeight: 60, maxWidth: 180, objectFit: "contain" }} />
              ) : (
                <span style={{ ...TIPO.caption, color: "var(--text-quaternary)" }}>Sin firma</span>
              )}
            </div>

            <div style={{ minWidth: 200, flex: 1 }}>
              <div style={{ ...TIPO.footnote, color: "var(--text-primary)" }}>
                {acta.liderProyecto || "LÃ­der de proyecto"}
              </div>
              <div style={{ ...TIPO.caption, color: "var(--text-tertiary)", marginTop: 2, fontWeight: 400 }}>
                {acta.firmaLider
                  ? "Firma subida para esta acta."
                  : firmaEmpresa
                    ? "Se estÃ¡ usando la firma de la empresa. Sube la de quien entrega si es otra persona."
                    : "TodavÃ­a no hay firma: la hoja sale con la raya para firmar a mano."}
              </div>
              {!bloqueada && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: ESPACIO.sm }}>
                  <input
                    ref={archivoFirma}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(ev) => {
                      subirFirma(ev.target.files?.[0]);
                      ev.target.value = "";
                    }}
                  />
                  <Button tam="sm" variante="secondary" onClick={() => archivoFirma.current?.click()}>
                    {acta.firmaLider ? "Cambiar firma" : "Subir firma"}
                  </Button>
                  {acta.firmaLider && (
                    <>
                      <Button tam="sm" variante="tertiary" onClick={guardarFirmaEnEmpresa}>
                        Usar en todos los documentos
                      </Button>
                      <Button tam="sm" variante="texto" onClick={() => guardarActa(acta.id, { firmaLider: "" })}>
                        Quitar
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </Seccion>

        <Seccion
          titulo="Recibe conforme"
          nota={clienteFicha?.nombre
            ? `Es el contacto de ${clienteFicha.nombre}, el cliente de esta obra. Al corregirlo aquÃ­ se corrige tambiÃ©n en su ficha, en la obra y en sus informes.`
            : "Al escribirlo aquÃ­ se guarda tambiÃ©n en la ficha del cliente, en la obra y en sus informes."}
        >
          <div style={REJILLA}>
            <Input
              label="Nombre"
              value={acta.recibeNombre}
              disabled={bloqueada}
              onChange={upd("recibeNombre")}
              onBlur={(ev) => {
                const val = normalizarNombrePropio(ev.target.value);
                if (val !== acta.recibeNombre) {
                  sincronizarContactoRecibe({ nombre: val }, { notificar: true });
                }
              }}
            />
            <Input
              label="CÃ©dula"
              value={acta.recibeDocumento}
              disabled={bloqueada}
              onChange={upd("recibeDocumento")}
              onBlur={(ev) => {
                const val = normalizarDocumento(ev.target.value);
                if (val !== acta.recibeDocumento) {
                  sincronizarContactoRecibe({ documento: val });
                }
              }}
            />
            <Input
              label="Cargo"
              value={acta.recibeCargo}
              disabled={bloqueada}
              onChange={upd("recibeCargo")}
              onBlur={(ev) => {
                const val = normalizarMayusculas(ev.target.value);
                if (val !== acta.recibeCargo) {
                  sincronizarContactoRecibe({ cargo: val });
                }
              }}
            />
          </div>
        </Seccion>
      </Card>

      {modalFirma && (
        <ModalEnviarFirma
          documento={{ ...acta, cliente: acta.contratante, proyecto: obra.proyecto || acta.direccionObra }}
          tipo="acta"
          etiqueta="Acta"
          tituloFormato="Acta de entrega de obra"
          generarPdf={generarActaPdf}
          mensajePorDefecto={
            `Le enviamos el acta de entrega ${acta.id}${obra.proyecto ? ` de ${obra.proyecto}` : ""}, ` +
            "con el detalle de los sistemas entregados y el trabajo realizado."
          }
          contactoEmail={acta.correoAdministrativo || obra.recibeEmail || ""}
          contactoNombre={acta.recibeNombre || obra.recibeNombre || ""}
          celular={obra.tel || ""}
          empresaConfig={empresaConfig}
          firmaImg={firmaEmpresa}
          onCerrar={() => setModalFirma(false)}
          onEnviado={recargarEnvios}
        />
      )}
    </>
  );
}
