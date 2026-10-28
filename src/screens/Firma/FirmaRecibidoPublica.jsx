import { useEffect, useState } from "react";
import logoIngeanclajes from "../../assets/logo-ingeanclajes.jpeg";
import { FUENTE } from "../../styles/designTokens";
import { abrirFirma, enlaceVerificacionFirma, firmarRecibido, textoDeRecibido } from "../../lib/firmaRecibido";
import { armarPdfConConstancia, descargarBlob, fechaHoraCo, nombreConConstancia } from "../../lib/constanciaRecibido";
import RecuadroFirma from "./RecuadroFirma";

// Pagina que abre el cliente desde el correo o el WhatsApp (?firmar=<token>).
// Sin cuenta y sin codigos: el enlace es la llave, y se firma ahi mismo.
//
// Antes, antes de firmar, habia que pedir un codigo de seis digitos que
// llegaba al correo. En el celular eso obligaba a salir de WhatsApp, abrir el
// correo, copiarlo y volver a entrar, y en ese salto se perdia la firma.
//
// Lo que respalda la firma: tener el enlace -secreto y enviado solo a quien
// recibe-, el nombre y el documento que escribe, la firma que dibuja, y la
// huella que queda guardada (fecha y hora, IP y navegador).
//
// Va pensada para el celular, que es donde casi siempre se abre.

const C = {
  tinta: "#1d1d1f",
  gris: "#6e6e73",
  linea: "#d2d2d7",
  suave: "#e8e8ed",
  fondo: "#f5f5f7",
  ok: "#1f7a3d",
  error: "#b3261e",
};

const tarjeta = { background: "#ffffff", border: `1px solid ${C.suave}`, borderRadius: 14, padding: 18, marginBottom: 14 };
const rotulo = { display: "block", fontSize: 12, fontWeight: 600, color: C.gris, marginBottom: 5 };
const campo = {
  width: "100%", boxSizing: "border-box", border: `1px solid ${C.linea}`, borderRadius: 10,
  padding: "11px 12px", fontSize: 16, fontFamily: "inherit", color: C.tinta, background: "#ffffff",
};
const botonPrincipal = (activo = true) => ({
  width: "100%", border: 0, borderRadius: 10, padding: "13px 16px", fontSize: 15, fontWeight: 700,
  fontFamily: "inherit", cursor: activo ? "pointer" : "default",
  background: activo ? C.tinta : "#c7c7cc", color: "#ffffff",
});
const botonSecundario = {
  width: "100%", border: `1px solid ${C.linea}`, borderRadius: 10, padding: "12px 16px", fontSize: 14,
  fontWeight: 600, fontFamily: "inherit", cursor: "pointer", background: "#ffffff", color: C.tinta,
  textDecoration: "none", display: "block", textAlign: "center", boxSizing: "border-box",
};

function Encabezado() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <img src={logoIngeanclajes} alt="Ingeanclajes" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "contain", background: "#fff", border: `1px solid ${C.suave}` }} />
      <div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>INGEANCLAJES S.A.S.</div>
        <div style={{ fontSize: 12, color: C.gris }}>Firma de recibido</div>
      </div>
    </div>
  );
}

function Aviso({ tono = "error", children }) {
  const color = tono === "ok" ? C.ok : C.error;
  return (
    <div role={tono === "error" ? "alert" : "status"} style={{ border: `1px solid ${color}33`, background: `${color}0d`, color, borderRadius: 10, padding: "10px 12px", fontSize: 13.5, marginBottom: 12 }}>
      {children}
    </div>
  );
}

export default function FirmaRecibidoPublica() {
  const token = new URLSearchParams(window.location.search).get("firmar") || "";
  const [carga, setCarga] = useState({ estado: "cargando" });
  const [datos, setDatos] = useState({ nombre: "", documento: "", cargo: "", empresa: "", observaciones: "" });
  const [firmaImagen, setFirmaImagen] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [ocupado, setOcupado] = useState("");
  const [fallo, setFallo] = useState("");
  const [firma, setFirma] = useState(null);

  useEffect(() => {
    let activo = true;
    abrirFirma(token)
      .then((r) => {
        if (!activo) return;
        setCarga({ estado: "listo", documento: r.documento, vencido: r.vencido });
        if (r.firma) setFirma(r.firma);
        // El nombre y la empresa ya los sabe el sistema: son los que se
        // pusieron al enviarlo. Que el cliente los vuelva a escribir en el
        // celular solo es un paso mas para equivocarse o abandonar. Quedan
        // puestos y editables, por si lo recibe otra persona.
        setDatos((d) => ({
          ...d,
          nombre: d.nombre || r.documento?.paraNombre || "",
          empresa: r.documento?.cliente || "",
        }));
      })
      .catch((e) => { if (activo) setCarga({ estado: "error", mensaje: e.message }); });
    return () => { activo = false; };
  }, [token]);

  const documento = carga.documento;
  const textoAceptado = documento ? textoDeRecibido({ tipo: documento.tipo, numero: documento.numero, titulo: documento.titulo }) : "";
  const cambiar = (k) => (e) => setDatos((d) => ({ ...d, [k]: e.target.value }));

  const faltante = !datos.nombre.trim() ? "Escriba su nombre completo."
    : datos.documento.trim().length < 4 ? "Escriba su número de documento."
    : !firmaImagen ? "Dibuje su firma en el recuadro."
    : !acepta ? "Marque la casilla de recibido."
    : "";

  const firmar = async () => {
    if (faltante) { setFallo(faltante); return; }
    setFallo("");
    setOcupado("firmar");
    try {
      const r = await firmarRecibido(token, { ...datos, firmaImagen, acepta, textoAceptado });
      setFirma(r.firma);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setFallo(e.message);
    } finally {
      setOcupado("");
    }
  };

  const descargarCopia = async () => {
    if (!documento?.pdfUrl) return;
    setOcupado("descargar");
    setFallo("");
    try {
      const respuesta = await fetch(documento.pdfUrl);
      if (!respuesta.ok) throw new Error("El enlace al documento venció. Recargue la página e intente de nuevo.");
      const original = new Uint8Array(await respuesta.arrayBuffer());
      descargarBlob(await armarPdfConConstancia(original, firma), nombreConConstancia(firma));
    } catch (e) {
      setFallo(e.message || "No se pudo armar la copia firmada.");
    } finally {
      setOcupado("");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.fondo, fontFamily: FUENTE, color: C.tinta, padding: "22px 16px 48px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <Encabezado />

        {carga.estado === "cargando" && <div style={tarjeta}>Abriendo el documento…</div>}

        {carga.estado === "error" && (
          <div style={tarjeta}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No se pudo abrir el enlace</div>
            <div style={{ fontSize: 14, color: C.gris, lineHeight: 1.5 }}>{carga.mensaje}</div>
            <div style={{ fontSize: 13, color: C.gris, marginTop: 12 }}>Comuníquese con Ingeanclajes: PBX (604) 448 26 86 · Cel. 315 288 9541.</div>
          </div>
        )}

        {documento && (
          <div style={tarjeta}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.gris, textTransform: "uppercase", letterSpacing: "0.05em" }}>{documento.numero}</div>
            <div style={{ fontSize: 19, fontWeight: 800, margin: "3px 0 4px", lineHeight: 1.3 }}>{documento.titulo}</div>
            {documento.cliente && <div style={{ fontSize: 14, color: C.gris }}>{documento.cliente}</div>}
            <div style={{ fontSize: 12.5, color: C.gris, marginTop: 8 }}>Enviado el {fechaHoraCo(documento.enviadoEn)}</div>
            {documento.pdfUrl && (
              <a href={documento.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ ...botonSecundario, marginTop: 14 }}>
                Ver el documento (PDF)
              </a>
            )}
          </div>
        )}

        {firma && (
          <div style={tarjeta}>
            <Aviso tono="ok"><strong>Recibido firmado.</strong> Quedó registrado el {fechaHoraCo(firma.firmadoEn)}.</Aviso>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <div><span style={{ color: C.gris }}>Firmó:</span> <strong>{firma.firmanteNombre}</strong></div>
              <div><span style={{ color: C.gris }}>Documento:</span> {firma.firmanteDocumento}</div>
              {firma.firmanteCargo && <div><span style={{ color: C.gris }}>Cargo:</span> {firma.firmanteCargo}</div>}
              <div><span style={{ color: C.gris }}>Correo verificado:</span> {firma.firmanteEmail}</div>
            </div>
            {fallo && <div style={{ marginTop: 12 }}><Aviso>{fallo}</Aviso></div>}
            <button type="button" onClick={descargarCopia} disabled={ocupado === "descargar"} style={{ ...botonPrincipal(ocupado !== "descargar"), marginTop: 14 }}>
              {ocupado === "descargar" ? "Armando la copia…" : "Descargar copia firmada"}
            </button>
            <a href={enlaceVerificacionFirma(firma.codigoVerificacion)} style={{ ...botonSecundario, marginTop: 10 }}>
              Ver la verificación de la constancia
            </a>
          </div>
        )}

        {documento && !firma && carga.vencido && (
          <div style={tarjeta}>
            <Aviso>Este enlace venció. Pida a Ingeanclajes que le envíen el documento de nuevo.</Aviso>
          </div>
        )}

        {documento && !firma && !carga.vencido && (
          <div style={tarjeta}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Firmar el recibido</div>

            <div style={{ display: "grid", gap: 12 }}>
              <label><span style={rotulo}>Nombre completo *</span>
                <input style={campo} value={datos.nombre} onChange={cambiar("nombre")} autoComplete="name" maxLength={120} />
              </label>
              <label><span style={rotulo}>Número de documento *</span>
                <input style={campo} value={datos.documento} onChange={cambiar("documento")} inputMode="numeric" maxLength={30} />
              </label>
              <label><span style={rotulo}>Cargo</span>
                <input style={campo} value={datos.cargo} onChange={cambiar("cargo")} autoComplete="organization-title" maxLength={120} placeholder="Residente de obra, interventor, SST…" />
              </label>
              <label><span style={rotulo}>Empresa</span>
                <input style={campo} value={datos.empresa} onChange={cambiar("empresa")} autoComplete="organization" maxLength={160} />
              </label>
              <label><span style={rotulo}>Observaciones (opcional)</span>
                <textarea style={{ ...campo, minHeight: 72, resize: "vertical" }} value={datos.observaciones} onChange={cambiar("observaciones")} maxLength={1500}
                  placeholder="Si tiene algún pendiente o reparo, anótelo aquí: queda en la constancia." />
              </label>

              <div>
                <span style={rotulo}>Firma *</span>
                <RecuadroFirma onCambio={setFirmaImagen} />
              </div>

              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.5, cursor: "pointer" }}>
                <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0 }} />
                <span>{textoAceptado}</span>
              </label>
            </div>

            <div style={{ borderTop: `1px solid ${C.suave}`, margin: "18px 0 14px" }} />

            {fallo && <Aviso>{fallo}</Aviso>}

            {/* Se firma aquí mismo. Antes había que pedir un código al correo,
                salir a buscarlo y volver: en el celular mucha gente se quedaba
                en ese paso y el recibido no se firmaba nunca. */}
            <button type="button" onClick={firmar} disabled={ocupado === "firmar"} style={botonPrincipal(ocupado !== "firmar")}>
              {ocupado === "firmar" ? "Firmando…" : "Firmar recibido"}
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 11.5, color: C.gris, lineHeight: 1.6, padding: "0 8px" }}>
          Firma electrónica en los términos de la Ley 527 de 1999 y el Decreto 2364 de 2012.<br />
          Se registran la fecha y hora, la dirección IP y el navegador desde el que se firma.<br />
          Ingeanclajes S.A.S. · NIT 900.193.965-4 · Envigado, Antioquia
        </div>
      </div>
    </div>
  );
}
