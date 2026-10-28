import { useState } from "react";
import { Button, Callout, Input, Sheet, StatusPill, useToast } from "./ui";
import {
  ESTADO_FIRMA, anularEnvioFirma, descargarPdfEnviado, enlaceDeEnvioFirma, enlaceVerificacionFirma, enviarParaFirma, mensajeWhatsAppFirma,
} from "../lib/firmaRecibido";
import { armarPdfConConstancia, descargarBlob, fechaHoraCo, nombreConConstancia } from "../lib/constanciaRecibido";
import { confirmar } from "../lib/dialogos";
import { normalizarCelular, urlWhatsAppOElegirContacto } from "../lib/whatsapp";
import { normalizarNombrePersona } from "../lib/autorAuditoria";

// Firma de recibido de un documento: enviarlo al cliente y ver en que va.
//
// Vivia dentro de Informes, porque el informe de actividades fue el primero
// que se envio a firma. El acta de entrega hace lo mismo con el mismo
// mecanismo, asi que el panel y la ventana se mudaron aqui: lo unico que
// cambia entre uno y otro es el tipo, el titulo y como se genera su PDF.
//
// El panel va encima del documento. Si nunca se envio no ocupa nada; cuando
// hay envios dice el estado del ultimo y deja ver los demas.

const fechaCorta = (iso) =>
  iso ? new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

// Direccion de WhatsApp con el mensaje escrito. Con celular abre ese chat; sin
// el, WhatsApp deja elegir a quien mandarlo. Vive en lib/whatsapp.js para
// poder comprobarla sin tener que pulsar «Enviar», que manda de verdad.
const direccionWhatsApp = urlWhatsAppOElegirContacto;

export function PanelFirmaRecibido({ envios, onRecargar, onEnviar, celular = "", proyecto = "", tipo = "informe" }) {
  const toast = useToast();
  const [ocupado, setOcupado] = useState("");
  const [verTodos, setVerTodos] = useState(false);
  if (!envios.length) return null;

  const descargarConstancia = async (e) => {
    setOcupado(e.id);
    try {
      const original = await descargarPdfEnviado(e.pdfRuta);
      descargarBlob(await armarPdfConConstancia(original, e), nombreConConstancia(e));
    } catch (fallo) {
      toast.error(fallo.message || "No se pudo armar el PDF con la constancia.");
    } finally {
      setOcupado("");
    }
  };

  const anular = async (e) => {
    const ok = await confirmar({
      titulo: "Anular el envío",
      mensaje: `El enlace que se le envió a ${e.paraEmail} dejará de funcionar. Úsalo si se envió a la persona equivocada o con un error.`,
      textoConfirmar: "Anular envío",
      destructivo: true,
    });
    if (!ok) return;
    setOcupado(e.id);
    try {
      await anularEnvioFirma(e.id);
      toast.exito("Envío anulado.");
      onRecargar();
    } catch (fallo) {
      toast.error(fallo.message);
    } finally {
      setOcupado("");
    }
  };

  // La ventana se abre en el mismo clic y despues se le pone la direccion:
  // si se abriera al volver de pedir el enlace, el navegador la bloquearia.
  const porWhatsApp = async (e) => {
    const ventana = window.open("", "_blank");
    setOcupado(e.id);
    try {
      const enlace = await enlaceDeEnvioFirma(e.id);
      const url = direccionWhatsApp(celular, mensajeWhatsAppFirma({ tipo, nombre: e.paraNombre, numero: e.numero, proyecto, enlace }));
      if (ventana) ventana.location.href = url;
      else window.location.href = url;
    } catch (fallo) {
      ventana?.close();
      toast.error(fallo.message || "No se pudo preparar el mensaje de WhatsApp.");
    } finally {
      setOcupado("");
    }
  };

  const lista = verTodos ? envios : envios.slice(0, 1);
  return (
    <div style={{ maxWidth: 920, margin: "0 auto 16px", width: "100%", border: "1px solid var(--border, #e5e5ea)", borderRadius: 12, background: "var(--surface, #fff)" }}>
      {lista.map((e, i) => {
        const estado = ESTADO_FIRMA[e.estado] || ESTADO_FIRMA.enviado;
        return (
          <div key={e.id} style={{ padding: "12px 14px", borderTop: i ? "1px solid var(--border, #e5e5ea)" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Firma de recibido</span>
                  <StatusPill tono={estado.tono}>{estado.rotulo}</StatusPill>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4, lineHeight: 1.6 }}>
                  Enviado a <strong style={{ color: "var(--text-secondary)" }}>{e.paraEmail}</strong> el {fechaCorta(e.enviadoEn)}
                  {/* Con el nombre, no el correo; la cuenta tecnica sale como
                      Camila Sepúlveda, igual que en el resto del historial. */}
                  {e.enviadoPor ? ` por ${normalizarNombrePersona(e.enviadoPor)}` : ""}
                  {e.abiertoEn && <> · abierto el {fechaCorta(e.abiertoEn)}{e.vecesAbierto > 1 ? ` (${e.vecesAbierto} veces)` : ""}</>}
                  {e.firmadoEn && <> · <strong style={{ color: "var(--text-secondary)" }}>firmó {e.firmanteNombre}</strong>{e.firmanteCargo ? `, ${e.firmanteCargo}` : ""}, el {fechaHoraCo(e.firmadoEn)}</>}
                </div>
                {e.firmanteObservaciones && (
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6, whiteSpace: "pre-line" }}>
                    <strong>Observaciones del cliente:</strong> {e.firmanteObservaciones}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {e.estado === "firmado" ? (
                  <>
                    <Button tam="sm" icono="descargar" disabled={ocupado === e.id} onClick={() => descargarConstancia(e)}>
                      {ocupado === e.id ? "Armando…" : "PDF con constancia"}
                    </Button>
                    <Button tam="sm" variante="tertiary" onClick={() => window.open(enlaceVerificacionFirma(e.codigoVerificacion), "_blank", "noopener")}>
                      Verificación
                    </Button>
                  </>
                ) : e.estado !== "anulado" ? (
                  <>
                    <Button tam="sm" disabled={ocupado === e.id} onClick={() => porWhatsApp(e)} title={celular ? `Abre WhatsApp con ${celular}` : "Abre WhatsApp para elegir el contacto"}>
                      WhatsApp
                    </Button>
                    <Button tam="sm" variante="tertiary" disabled={ocupado === e.id} onClick={() => anular(e)}>Anular</Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderTop: "1px solid var(--border, #e5e5ea)" }}>
        {envios.length > 1 ? (
          <Button tam="sm" variante="tertiary" onClick={() => setVerTodos((v) => !v)}>
            {verTodos ? "Ver solo el último" : `Ver los ${envios.length} envíos`}
          </Button>
        ) : <span />}
        <Button tam="sm" variante="tertiary" onClick={onEnviar}>Enviar de nuevo</Button>
      </div>
    </div>
  );
}

/**
 * Ventana de envio a firma.
 *
 * @param {object} props
 * @param {object} props.documento   el informe o el acta: de ahi salen id,
 *   numero, proyecto y cliente.
 * @param {string} props.tipo        «informe» o «acta»: es lo que guarda la
 *   base y lo que decide los textos del correo y de WhatsApp.
 * @param {string} props.etiqueta    como se llama en el subtitulo: «Informe».
 * @param {string} props.tituloFormato  el nombre del formato, que es lo que
 *   el cliente acepta al firmar.
 * @param {(doc:object, opciones:object)=>Promise<{blob:Blob,nombre:string}>} props.generarPdf
 * @param {string} props.mensajePorDefecto  el cuerpo del correo, editable.
 */
export function ModalEnviarFirma({
  documento,
  tipo = "informe",
  etiqueta = "Informe",
  tituloFormato = "Informe técnico de actividades",
  generarPdf,
  mensajePorDefecto = "",
  contactoEmail = "",
  contactoNombre = "",
  celular = "",
  empresaConfig,
  firmaImg,
  onCerrar,
  onEnviado,
}) {
  const toast = useToast();
  const [para, setPara] = useState(contactoEmail);
  const [paraNombre, setParaNombre] = useState(contactoNombre);
  const numero = String(documento?.id || documento?.numero || "").trim();
  const [mensaje, setMensaje] = useState(mensajePorDefecto);
  const [estado, setEstado] = useState("");
  const [fallo, setFallo] = useState("");
  // Despues de enviar queda el enlace, para mandarlo tambien por WhatsApp.
  const [enlace, setEnlace] = useState("");
  const [cel, setCel] = useState(celular);

  const correoOk = /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/.test(para.trim());

  // `porWhatsApp`: ademas de enviar el correo, abre WhatsApp con el mensaje y
  // el enlace ya escritos. El correo se manda igual porque el codigo para
  // firmar llega ahi: es la prueba de que firmo quien recibe. WhatsApp solo
  // lleva el enlace, que es por donde el cliente lo abre de verdad.
  const enviar = async ({ porWhatsApp = false } = {}) => {
    if (!correoOk) { setFallo("Escribe un correo válido."); return; }
    setFallo("");
    // La ventana se abre en el mismo clic y se le pone la direccion despues:
    // abierta al volver de la promesa, el navegador la bloquea por emergente.
    const ventana = porWhatsApp ? window.open("", "_blank") : null;
    try {
      setEstado("Generando el PDF…");
      const { blob, nombre } = await generarPdf(documento, { empresaConfig, firmaImg, liviano: true });
      // Se avisa aqui, antes de subir nada, si aun asi es demasiado grande.
      if (blob.size > 20 * 1024 * 1024) {
        throw new Error(`El PDF pesa ${(blob.size / 1024 / 1024).toFixed(1)} MB y el límite para enviar es 20 MB. Quita algunas fotos del documento.`);
      }
      setEstado("Enviando al cliente…");
      const r = await enviarParaFirma({
        tipo,
        documentoId: documento.id,
        numero,
        titulo: tituloFormato,
        cliente: documento.cliente || documento.contratante || "",
        para: para.trim(),
        paraNombre: paraNombre.trim(),
        mensaje: mensaje.trim(),
        pdfBlob: blob,
        pdfNombre: nombre,
      });
      toast.exito(`Enviado a ${para.trim()}. Te avisaremos por correo cuando firme.`);
      onEnviado?.();
      setEnlace(r?.enlace || "");
      if (r?.enlace && porWhatsApp) {
        const url = direccionWhatsApp(cel, mensajeWhatsAppFirma({
          tipo, nombre: paraNombre.trim(), numero, proyecto: documento?.proyecto, enlace: r.enlace,
        }));
        if (ventana) ventana.location.href = url;
        else window.open(url, "_blank", "noopener");
      } else {
        ventana?.close();
      }
      if (!r?.enlace) onCerrar();
    } catch (e) {
      ventana?.close();
      setFallo(e.message || "No se pudo enviar.");
    } finally {
      setEstado("");
    }
  };

  if (enlace) {
    const abrir = () => window.open(
      direccionWhatsApp(cel, mensajeWhatsAppFirma({ tipo, nombre: paraNombre, numero, proyecto: documento?.proyecto, enlace })),
      "_blank",
      "noopener"
    );
    return (
      <Sheet
        titulo="Enviado al cliente"
        subtitulo={`${etiqueta} ${numero}`}
        onCerrar={onCerrar}
        pie={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button variante="tertiary" onClick={onCerrar}>Listo</Button>
            <Button variante="primary" onClick={abrir}>Enviar también por WhatsApp</Button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Callout tono="exito">
            Le llegó un correo a <strong>{para.trim()}</strong> con el enlace para firmar. Por WhatsApp le llega más
            rápido: el mensaje sale ya escrito, solo hay que darle enviar.
          </Callout>
          <Input label="Celular del cliente" type="tel" inputMode="tel" value={cel} onChange={(e) => setCel(e.target.value)}
            placeholder="3001234567"
            ayuda={normalizarCelular(cel) ? "Se abre el chat con este número." : "Sin celular, WhatsApp te deja elegir el contacto."} />
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            El código para firmar sigue llegando al correo: es la prueba de que firmó quien recibe.
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      titulo="Enviar para firma de recibido"
      subtitulo={`${etiqueta} ${numero}`}
      onCerrar={estado ? undefined : onCerrar}
      cerrarAlPulsarFondo={!estado}
      pie={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variante="tertiary" onClick={onCerrar} disabled={Boolean(estado)}>Cancelar</Button>
          <Button variante="secondary" onClick={() => enviar({ porWhatsApp: true })} disabled={Boolean(estado) || !correoOk}
            title={normalizarCelular(cel) ? `Envía el correo y abre WhatsApp con ${cel}` : "Envía el correo y abre WhatsApp para elegir el contacto"}>
            Enviar y abrir WhatsApp
          </Button>
          <Button variante="primary" onClick={() => enviar()} disabled={Boolean(estado) || !correoOk}>{estado || "Enviar"}</Button>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <Callout tono="info">
          El cliente recibe un enlace para ver el documento y firmar el recibido. Para firmar le llega un código a este
          correo, así queda probado que fue él. Al firmar, el PDF queda con una constancia y un QR de verificación.
        </Callout>
        <Input label="Correo del cliente" obligatorio type="email" value={para} onChange={(e) => setPara(e.target.value)}
          ayuda="El código para firmar llega a este correo: debe ser el de quien recibe." />
        <Input label="Nombre de quien recibe" value={paraNombre} onChange={(e) => setParaNombre(e.target.value)} />
        <Input label="Celular del cliente" type="tel" inputMode="tel" value={cel} onChange={(e) => setCel(e.target.value)}
          placeholder="3001234567"
          ayuda={normalizarCelular(cel)
            ? "«Enviar y abrir WhatsApp» abre el chat con este número, con el enlace ya escrito."
            : "Sin celular, WhatsApp te deja elegir el contacto al enviarlo."} />
        <Input label="Mensaje" como="textarea" rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
        {fallo && <Callout tono="peligro">{fallo}</Callout>}
      </div>
    </Sheet>
  );
}
