import { useState } from "react";
import { Button, Callout, Card, EmptyState, Input, StatusPill, useToast } from "../../components/ui";
import { TIPO } from "../../styles/designTokens";
import { fmtD } from "../../lib/format";
import { openPrintTab } from "../../lib/abrirImpresion";
import { confirmar } from "../../lib/dialogos";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import { normalizarCorreo, normalizarDocumento, normalizarMayusculas, normalizarNombrePropio } from "../../lib/normalizarEntrada";
import { clienteDeObra, clientesConQuienRecibe } from "../../lib/quienRecibe";
import { buildActaPrintHtml } from "../../lib/actaEntregaPrint";
import { descargarActaPdf, generarActaPdf } from "../../lib/actaEntregaPdf";
import { construirActa, faltantesDelActa, normalizarActas } from "../../lib/actaEntrega";
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
// Lo que el programa NO puede saber -las areas intervenidas, la cedula de
// quien recibe- queda en blanco y se avisa antes de entregarla.

const SECCION = { marginBottom: 18 };
const REJILLA = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 };

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
  } = ctx;
  const toast = useToast();
  const firmaImg = getFirmaImg(empresaConfig);

  const actas = normalizarActas(obra);
  const [actaId, setActaId] = useState(() => actas[actas.length - 1]?.id || "");
  const [modalFirma, setModalFirma] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const acta = actas.find((a) => a.id === actaId) || null;
  const { envios, recargar: recargarEnvios } = useEnviosFirma(acta?.id || "", { tipo: "acta" });

  const clienteFicha = clienteDeObra(clientes, obra);
  const clientesConContacto = (Array.isArray(clientes) ? clientes : [])
    .filter((c) => c && c.contacto && c.contacto.trim().length >= 2);

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
    toast.exito(`Acta ${nueva.id} creada con los datos de la obra. Revísala antes de entregarla.`);
  };

  const borrarActa = async () => {
    const ok = await confirmar({
      titulo: `Borrar el acta ${acta.id}`,
      mensaje: "Se borra de la obra con todo lo que se le haya escrito. Los envíos a firma que ya se hicieron no se borran.",
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
    buildActaPrintHtml(acta, { empresaConfig, firmaImg, firmaCliente: envioFirmado }),
    `Acta de entrega ${acta.id}`
  );

  const descargar = async () => {
    setGenerandoPdf(true);
    try {
      await descargarActaPdf(acta, { empresaConfig, firmaImg, firmaCliente: envioFirmado });
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
            "El programa la arma con los datos de la obra y de su cotización; en la obra solo hay que revisarla y firmarla."
          }
          accion={!bloqueada ? <Button variante="primary" icono="mas" onClick={crearActa}>Crear acta de entrega</Button> : null}
        />
        {actas.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Actas de esta obra:</span>
            {actas.map((a) => (
              <Button key={a.id} tam="sm" variante="tertiary" onClick={() => setActaId(a.id)}>
                {a.id} · {fmtD(a.fecha)}
              </Button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  const faltantes = faltantesDelActa(acta);

  return (
    <>
      <Card ajustado style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...TIPO.eyebrow, color: "var(--text-tertiary)" }}>Acta de entrega de obra · FORM-SST-89</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                Orden de trabajo {acta.id}
              </span>
              {envioFirmado ? (
                <StatusPill tono="exito">Firmada por el cliente</StatusPill>
              ) : (
                <StatusPill tono={faltantes.length ? "aviso" : "exito"}>
                  {faltantes.length ? "Falta información" : "Lista para firmar"}
                </StatusPill>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Button tam="sm" variante="tertiary" onClick={imprimir}>Imprimir</Button>
            <Button tam="sm" variante="tertiary" disabled={generandoPdf} onClick={descargar}>
              {generandoPdf ? "Generando…" : envioFirmado ? "Descargar PDF firmado" : "Descargar PDF"}
            </Button>
            <Button tam="sm" variante="primary" onClick={() => setModalFirma(true)}>Enviar a firma</Button>
            {!bloqueada && <Button tam="sm" variante="texto" onClick={borrarActa}>Borrar</Button>}
          </div>
        </div>

        {actas.length > 1 && (
          <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Otras actas:</span>
            {actas.filter((a) => a.id !== acta.id).map((a) => (
              <Button key={a.id} tam="sm" variante="tertiary" onClick={() => setActaId(a.id)}>
                {a.id} · {fmtD(a.fecha)}
              </Button>
            ))}
          </div>
        )}

        {faltantes.length > 0 && (
          <Callout tono="aviso" style={{ marginTop: 12 }}>
            Antes de entregarla falta {faltantes.join(", ")}. Se puede imprimir así y completarla a mano, pero
            escrita aquí queda guardada con la obra.
          </Callout>
        )}

        {!bloqueada && (
          <Button tam="sm" variante="tertiary" style={{ marginTop: 12 }} onClick={crearActa}>
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
        <div style={SECCION}>
          <h3 style={{ ...TIPO.headline, margin: "0 0 10px", color: "var(--text-primary)" }}>Contratante y obra</h3>
          <div style={REJILLA}>
            <Input label="Contratante" value={acta.contratante} disabled={bloqueada}
              onChange={upd("contratante")} onBlur={alSalir("contratante", normalizarMayusculas)} />
            <Input label="NIT" value={acta.nit} disabled={bloqueada}
              onChange={upd("nit")} onBlur={alSalir("nit", normalizarDocumento)} />
            <Input label="Teléfono" type="tel" inputMode="tel" value={acta.telefono} disabled={bloqueada} onChange={upd("telefono")} />
            <Input label="Contacto administrativo" value={acta.contactoAdministrativo} disabled={bloqueada}
              onChange={upd("contactoAdministrativo")} onBlur={alSalir("contactoAdministrativo", normalizarNombrePropio)} />
            <Input label="Correo de facturación electrónica" type="email" value={acta.correoFacturacion} disabled={bloqueada}
              onChange={upd("correoFacturacion")} onBlur={alSalir("correoFacturacion", normalizarCorreo)} />
            <Input label="Correo administrativo" type="email" value={acta.correoAdministrativo} disabled={bloqueada}
              onChange={upd("correoAdministrativo")} onBlur={alSalir("correoAdministrativo", normalizarCorreo)} />
          </div>
          <div style={{ ...REJILLA, marginTop: 12 }}>
            <Input label="Dirección de obra" value={acta.direccionObra} disabled={bloqueada}
              onChange={upd("direccionObra")} onBlur={alSalir("direccionObra", normalizarMayusculas)} />
            <Input label="Áreas intervenidas" obligatorio value={acta.areasIntervenidas} disabled={bloqueada}
              placeholder="Cubierta y terraza de la subestación"
              ayuda="Dónde se trabajó. Es lo único que el programa no puede deducir."
              onChange={upd("areasIntervenidas")} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Input label="Objetivo del proyecto" obligatorio value={acta.objetivo} disabled={bloqueada}
              ayuda="Sale de los ítems de la cotización vinculada."
              onChange={upd("objetivo")} onBlur={alSalir("objetivo", normalizarMayusculas)} />
          </div>
          <div style={{ ...REJILLA, marginTop: 12 }}>
            <Input label="Fecha de inicio" type="date" value={acta.fechaInicio} disabled={bloqueada} onChange={upd("fechaInicio")} />
            <Input label="Fecha de entrega" type="date" value={acta.fechaEntrega} disabled={bloqueada} onChange={upd("fechaEntrega")} />
            <Input label="Fecha del acta" type="date" value={acta.fecha} disabled={bloqueada} onChange={upd("fecha")} />
          </div>
        </div>

        <div style={SECCION}>
          <h3 style={{ ...TIPO.headline, margin: "0 0 10px", color: "var(--text-primary)" }}>Sistema instalado o recertificado</h3>
          <Input label="Acero" como="select" value={acta.acero} disabled={bloqueada} onChange={upd("acero")}>
            <option value="">Sin especificar</option>
            <option value="galvanizado">Acero galvanizado</option>
            <option value="inoxidable">Acero inoxidable</option>
          </Input>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6 }}>
              Cantidades entregadas
            </div>
            {acta.sistemas.length ? acta.sistemas.map((s, i) => (
              <div key={`${s.descripcion}-${i}`} style={{
                display: "grid", gridTemplateColumns: "72px 72px minmax(0,1fr)", gap: 10,
                padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid var(--separator)", alignItems: "center",
              }}>
                <input type="number" min="0" value={s.cantidad} disabled={bloqueada}
                  aria-label={`Cantidad de ${s.descripcion}`}
                  onChange={(ev) => guardarActa(acta.id, {
                    sistemas: acta.sistemas.map((x, j) => (j === i ? { ...x, cantidad: Number(ev.target.value) || 0 } : x)),
                  })}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }} />
                <input value={s.unidad} disabled={bloqueada}
                  aria-label={`Unidad de ${s.descripcion}`}
                  onChange={(ev) => guardarActa(acta.id, {
                    sistemas: acta.sistemas.map((x, j) => (j === i ? { ...x, unidad: ev.target.value } : x)),
                  })}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 12.5 }} />
                <span style={{ fontSize: 12.5, color: "var(--text-primary)", lineHeight: 1.4 }}>{s.descripcion}</span>
              </div>
            )) : (
              <div style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>
                La obra no tiene cotización vinculada con ítems, así que no hay cantidades que traer. Se escriben a
                mano sobre la hoja impresa.
              </div>
            )}
          </div>
        </div>

        <div style={SECCION}>
          <h3 style={{ ...TIPO.headline, margin: "0 0 10px", color: "var(--text-primary)" }}>Quién ejecutó el trabajo</h3>
          <div style={REJILLA}>
            <div>
              <Input
                label="Coordinador de alturas"
                value={acta.coordinadorAlturas}
                disabled={bloqueada}
                list="lista-empleados-coordinador"
                onChange={upd("coordinadorAlturas")}
                onBlur={alSalir("coordinadorAlturas", normalizarNombrePropio)}
              />
              {!bloqueada && empleadosActivos.length > 0 && (
                <select
                  aria-label="Elegir coordinador de alturas de la lista de empleados"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) guardarActa(acta.id, { coordinadorAlturas: normalizarNombrePropio(e.target.value) });
                  }}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px dashed var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-secondary)",
                    fontSize: 11.5,
                    cursor: "pointer",
                  }}
                >
                  <option value="">👤 Elegir de la base de empleados…</option>
                  {empleadosActivos.map((e) => (
                    <option key={e.id} value={e.nombre}>
                      {e.nombre} {e.cargo ? `· ${e.cargo}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <Input
                label="Líder de proyecto"
                obligatorio
                value={acta.liderProyecto}
                disabled={bloqueada}
                list="lista-empleados-lider"
                onChange={upd("liderProyecto")}
                onBlur={alSalir("liderProyecto", normalizarNombrePropio)}
              />
              {!bloqueada && empleadosActivos.length > 0 && (
                <select
                  aria-label="Elegir líder de proyecto de la lista de empleados"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) guardarActa(acta.id, { liderProyecto: normalizarNombrePropio(e.target.value) });
                  }}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px dashed var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-secondary)",
                    fontSize: 11.5,
                    cursor: "pointer",
                  }}
                >
                  <option value="">👤 Elegir de la base de empleados…</option>
                  {empleadosActivos.map((e) => (
                    <option key={e.id} value={e.nombre}>
                      {e.nombre} {e.cargo ? `· ${e.cargo}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <datalist id="lista-empleados-coordinador">
            {empleadosActivos.map((e) => (
              <option key={e.id} value={e.nombre}>
                {e.nombre} {e.cargo ? `(${e.cargo})` : ""}
              </option>
            ))}
          </datalist>
          <datalist id="lista-empleados-lider">
            {empleadosActivos.map((e) => (
              <option key={e.id} value={e.nombre}>
                {e.nombre} {e.cargo ? `(${e.cargo})` : ""}
              </option>
            ))}
          </datalist>

          <div style={{ marginTop: 12 }}>
            <Input
              label="Colaboradores"
              como="textarea"
              rows={2}
              disabled={bloqueada}
              ayuda="Uno por línea. Salen de quién tuvo turno en esta obra o puedes agregar más desde la lista."
              value={acta.colaboradores.join("\n")}
              onChange={(ev) => guardarActa(acta.id, { colaboradores: ev.target.value.split("\n") })}
              onBlur={(ev) => guardarActa(acta.id, {
                colaboradores: ev.target.value.split("\n").map(normalizarNombrePropio).filter(Boolean),
              })}
            />
            {!bloqueada && empleadosActivos.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  aria-label="Agregar colaborador de la lista de empleados"
                  value=""
                  onChange={(e) => {
                    const nom = normalizarNombrePropio(e.target.value);
                    if (!nom) return;
                    if (!acta.colaboradores.some((c) => c.toLowerCase() === nom.toLowerCase())) {
                      guardarActa(acta.id, { colaboradores: [...acta.colaboradores, nom] });
                    }
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px dashed var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-secondary)",
                    fontSize: 11.5,
                    cursor: "pointer",
                  }}
                >
                  <option value="">➕ Agregar colaborador de la base de empleados…</option>
                  {empleadosActivos.map((e) => (
                    <option key={e.id} value={e.nombre}>
                      {e.nombre} {e.cargo ? `· ${e.cargo}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div style={SECCION}>
          <h3 style={{ ...TIPO.headline, margin: "0 0 10px", color: "var(--text-primary)" }}>Lo que se hizo</h3>
          <Input label="Descripción del trabajo realizado" obligatorio como="textarea" rows={8} disabled={bloqueada}
            ayuda="Viene de los informes de actividades de esta obra, o de la bitácora. Corrige lo que no haya pasado así."
            value={acta.descripcion} onChange={upd("descripcion")} />
          <div style={{ marginTop: 12 }}>
            <Input label="Observaciones" como="textarea" rows={3} disabled={bloqueada}
              value={acta.observaciones} onChange={upd("observaciones")} />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <h3 style={{ ...TIPO.headline, margin: 0, color: "var(--text-primary)" }}>Recibe conforme</h3>
            {!bloqueada && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {clienteFicha?.contacto && (
                  <Button
                    tam="xs"
                    variante="tertiary"
                    onClick={() => {
                      sincronizarContactoRecibe({
                        nombre: clienteFicha.contacto,
                        documento: clienteFicha.contactoCedula || clienteFicha.contacto_cedula || acta.recibeDocumento,
                        cargo: clienteFicha.contactoCargo || clienteFicha.contacto_cargo || acta.recibeCargo,
                      }, { notificar: true });
                    }}
                    title={`Cargar datos del cliente ${clienteFicha.nombre}`}
                  >
                    👤 Traer contacto de {clienteFicha.nombre}: {clienteFicha.contacto}
                  </Button>
                )}
                {clientesConContacto.length > 0 && (
                  <select
                    aria-label="Elegir contacto de la base de clientes"
                    value=""
                    onChange={(e) => {
                      const c = clientes.find((x) => x.id === e.target.value);
                      if (c?.contacto) {
                        sincronizarContactoRecibe({
                          nombre: c.contacto,
                          documento: c.contactoCedula || c.contacto_cedula || "",
                          cargo: c.contactoCargo || c.contacto_cargo || "",
                        }, { notificar: true });
                      }
                    }}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px dashed var(--border)",
                      background: "var(--surface)",
                      color: "var(--text-secondary)",
                      fontSize: 11.5,
                      cursor: "pointer",
                    }}
                  >
                    <option value="">👤 Elegir de la BD de clientes…</option>
                    {clientesConContacto.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contacto} · {c.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

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
              label="Cédula"
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
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 8, lineHeight: 1.5 }}>
            Al modificar o escribir el contacto aquí, se actualiza automáticamente en la ficha del cliente, en la obra y en sus informes de actividades.
          </div>
        </div>
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
          firmaImg={firmaImg}
          onCerrar={() => setModalFirma(false)}
          onEnviado={recargarEnvios}
        />
      )}
    </>
  );
}
