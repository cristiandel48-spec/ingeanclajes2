import { useState } from "react";
import { Button, Callout, Card, EmptyState, Input, StatusPill, useToast } from "../../components/ui";
import { TIPO } from "../../styles/designTokens";
import { fmtD } from "../../lib/format";
import { openPrintTab } from "../../lib/abrirImpresion";
import { confirmar } from "../../lib/dialogos";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import { normalizarCorreo, normalizarDocumento, normalizarMayusculas, normalizarNombrePropio } from "../../lib/normalizarEntrada";
import { clienteDeObra } from "../../lib/quienRecibe";
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
  const { cotizaciones = [], clientes = [], empleados = [], horarios = [], informes = [], obras = [], empresaConfig } = ctx;
  const toast = useToast();
  const firmaImg = getFirmaImg(empresaConfig);

  const actas = normalizarActas(obra);
  const [actaId, setActaId] = useState(() => actas[actas.length - 1]?.id || "");
  const [modalFirma, setModalFirma] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const acta = actas.find((a) => a.id === actaId) || null;
  const { envios, recargar: recargarEnvios } = useEnviosFirma(acta?.id || "", { tipo: "acta" });

  const guardarActa = (id, cambios) =>
    setObras((prev) => prev.map((o) => (o.id === obra.id
      ? { ...o, actas: normalizarActas(o).map((a) => (a.id === id ? { ...a, ...cambios } : a)) }
      : o)));

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

  const imprimir = () => openPrintTab(
    buildActaPrintHtml(acta, { empresaConfig, firmaImg }),
    `Acta de entrega ${acta.id}`
  );

  const descargar = async () => {
    setGenerandoPdf(true);
    try {
      await descargarActaPdf(acta, { empresaConfig, firmaImg });
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
              <StatusPill tono={faltantes.length ? "aviso" : "exito"}>
                {faltantes.length ? "Falta información" : "Lista para firmar"}
              </StatusPill>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Button tam="sm" variante="tertiary" onClick={imprimir}>Imprimir</Button>
            <Button tam="sm" variante="tertiary" disabled={generandoPdf} onClick={descargar}>
              {generandoPdf ? "Generando…" : "Descargar PDF"}
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
            <Input label="Coordinador de alturas" value={acta.coordinadorAlturas} disabled={bloqueada}
              onChange={upd("coordinadorAlturas")} onBlur={alSalir("coordinadorAlturas", normalizarNombrePropio)} />
            <Input label="Líder de proyecto" obligatorio value={acta.liderProyecto} disabled={bloqueada}
              onChange={upd("liderProyecto")} onBlur={alSalir("liderProyecto", normalizarNombrePropio)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Input label="Colaboradores" como="textarea" rows={2} disabled={bloqueada}
              ayuda="Uno por línea. Salen de quién tuvo turno en esta obra."
              value={acta.colaboradores.join("\n")}
              onChange={(ev) => guardarActa(acta.id, { colaboradores: ev.target.value.split("\n") })}
              onBlur={(ev) => guardarActa(acta.id, {
                colaboradores: ev.target.value.split("\n").map(normalizarNombrePropio).filter(Boolean),
              })} />
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
          <h3 style={{ ...TIPO.headline, margin: "0 0 10px", color: "var(--text-primary)" }}>Recibe conforme</h3>
          <div style={REJILLA}>
            <Input label="Nombre" value={acta.recibeNombre} disabled={bloqueada}
              onChange={upd("recibeNombre")} onBlur={alSalir("recibeNombre", normalizarNombrePropio)} />
            <Input label="Cédula" value={acta.recibeDocumento} disabled={bloqueada}
              onChange={upd("recibeDocumento")} onBlur={alSalir("recibeDocumento", normalizarDocumento)} />
            <Input label="Cargo" value={acta.recibeCargo} disabled={bloqueada}
              onChange={upd("recibeCargo")} onBlur={alSalir("recibeCargo", normalizarMayusculas)} />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 8, lineHeight: 1.5 }}>
            Si el acta se envía a firma, estos tres los escribe el cliente al firmar y quedan en la constancia. Aquí
            se llenan cuando se imprime y se firma en la obra.
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
