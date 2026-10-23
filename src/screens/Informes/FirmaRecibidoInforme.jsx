import { useState } from "react";
import { Button, Callout, Input, Sheet, StatusPill, useToast } from "../../components/ui";
import { generarInformePdf } from "../../lib/informePdf";
import {
  ESTADO_FIRMA, anularEnvioFirma, descargarPdfEnviado, enlaceVerificacionFirma, enviarParaFirma,
} from "../../lib/firmaRecibido";
import { armarPdfConConstancia, descargarBlob, fechaHoraCo, nombreConConstancia } from "../../lib/constanciaRecibido";
import { confirmar } from "../../lib/dialogos";

// Firma de recibido del informe: enviar al cliente y ver en que va.
//
// El panel va encima del documento. Si el informe nunca se envio no ocupa
// nada; cuando hay envios dice el estado del ultimo y deja ver los demas.

const fechaCorta = (iso) =>
  iso ? new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export function PanelFirmaRecibido({ envios, onRecargar, onEnviar }) {
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
                  {e.enviadoPor ? ` por ${e.enviadoPor}` : ""}
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
                  <Button tam="sm" variante="tertiary" disabled={ocupado === e.id} onClick={() => anular(e)}>Anular</Button>
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

export function ModalEnviarFirma({ informe, contactoEmail = "", contactoNombre = "", empresaConfig, firmaImg, onCerrar, onEnviado }) {
  const toast = useToast();
  const [para, setPara] = useState(contactoEmail);
  const [paraNombre, setParaNombre] = useState(contactoNombre);
  const numero = String(informe?.id || informe?.numero || "").trim();
  const [mensaje, setMensaje] = useState(
    `Le enviamos el informe de actividades ${numero}${informe?.proyecto ? ` de ${informe.proyecto}` : ""}, con el registro de los trabajos ejecutados y las evidencias fotográficas.`
  );
  const [estado, setEstado] = useState("");
  const [fallo, setFallo] = useState("");

  const correoOk = /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/.test(para.trim());

  const enviar = async () => {
    if (!correoOk) { setFallo("Escribe un correo válido."); return; }
    setFallo("");
    try {
      setEstado("Generando el PDF…");
      const { blob, nombre } = await generarInformePdf(informe, { empresaConfig, firmaImg });
      setEstado("Enviando al cliente…");
      await enviarParaFirma({
        tipo: "informe",
        documentoId: informe.id,
        numero,
        titulo: "Informe técnico de actividades",
        cliente: informe.cliente || informe.contratante || "",
        para: para.trim(),
        paraNombre: paraNombre.trim(),
        mensaje: mensaje.trim(),
        pdfBlob: blob,
        pdfNombre: nombre,
      });
      toast.exito(`Enviado a ${para.trim()}. Te avisaremos por correo cuando firme.`);
      onEnviado?.();
      onCerrar();
    } catch (e) {
      setFallo(e.message || "No se pudo enviar.");
    } finally {
      setEstado("");
    }
  };

  return (
    <Sheet
      titulo="Enviar para firma de recibido"
      subtitulo={`Informe ${numero}`}
      onCerrar={estado ? undefined : onCerrar}
      cerrarAlPulsarFondo={!estado}
      pie={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variante="tertiary" onClick={onCerrar} disabled={Boolean(estado)}>Cancelar</Button>
          <Button variante="primary" onClick={enviar} disabled={Boolean(estado) || !correoOk}>{estado || "Enviar"}</Button>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <Callout tono="info">
          El cliente recibe un enlace para ver el informe y firmar el recibido. Para firmar le llega un código a este
          correo, así queda probado que fue él. Al firmar, el PDF queda con una constancia y un QR de verificación.
        </Callout>
        <Input label="Correo del cliente" obligatorio type="email" value={para} onChange={(e) => setPara(e.target.value)}
          ayuda="El código para firmar llega a este correo: debe ser el de quien recibe." />
        <Input label="Nombre de quien recibe" value={paraNombre} onChange={(e) => setParaNombre(e.target.value)} />
        <Input label="Mensaje" como="textarea" rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
        {fallo && <Callout tono="peligro">{fallo}</Callout>}
      </div>
    </Sheet>
  );
}
