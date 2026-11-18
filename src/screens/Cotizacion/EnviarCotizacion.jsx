// Envío de la cotización al cliente por correo, desde la cuenta de la empresa.
//
// El correo NO sale solo: se muestra el destinatario, el asunto y el mensaje
// para revisarlos, y sale cuando la persona pulsa Enviar. Va a un cliente, con
// el precio de un trabajo: mandarlo por accidente sería un problema comercial.
import { useState } from "react";
import { blobABase64, generarCotizacionPdf } from "../../lib/cotizacionPdf";
import { enviarCotizacionPorCorreo } from "../../lib/backend/usuarios";
import { fmt } from "../../lib/format";
import { comoFrase, comoNombre, primerNombre } from "../../lib/texto";
import { asuntoSeguro } from "../../lib/asuntoCorreo";
import { getQuotePrintableProposals } from "../../lib/cotizaciones";
import { Button, Callout, Input, Sheet } from "../../components/ui";

// El nombre de la empresa va en el asunto: en la bandeja del cliente, un
// "Cotización C-26115" a secas no dice de quién viene y se pierde.
function asuntoPorDefecto(c) {
  const obra = comoNombre(c?.obra || c?.cliente || "");
  return asuntoSeguro(
    [`Cotizacion ${c?.numero || ""}`.trim(), "Ingeanclajes", obra].filter(Boolean).join(" - ")
  );
}

// Detalle de la propuesta activa: qué se cotiza, cuánto y a qué precio. Sin
// esto el correo solo daba un total, y el cliente tenía que abrir el adjunto
// para saber qué estaba comprando.
//
// LOS RENGLONES VAN SIN AGRUPAR, uno por item, igual que en el PDF. Los tramos
// medidos en el plano entran separados -«Linea de vida horizontal 1», «2»...-
// y durante un tiempo se juntaron en uno solo con los metros sumados, porque
// diez renglones seguidos parecian de relleno. Pero el cliente lee el correo
// con el adjunto abierto al lado, y una tabla que dice 120,75 ML frente a otra
// que dice diez tramos distintos obliga a comprobar si cuadran. Que digan lo
// mismo vale mas que ahorrar nueve renglones.
function propuestaActiva(c) {
  const propuestas = getQuotePrintableProposals(c);
  return propuestas.find((p) => p.id === c?.propuestaActivaId) || propuestas[0] || null;
}

// 120.75 -> "120,75"; 4 -> "4". Sin decimales de relleno.
const cantidadLegible = (n) =>
  Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 });

function detallePropuesta(c) {
  const activa = propuestaActiva(c);
  if (!activa?.items?.length) return [];

  const lineas = activa.items.map((item) => (
    `· ${cantidadLegible(item.cant)} ${item.unit || "UND"} de ${comoFrase(item.desc)}` +
    ` — ${fmt(item.vu)} c/u — ${fmt(Number(item.cant || 0) * Number(item.vu || 0))}`
  ));

  const sinAiu = Boolean(activa.sinAiu ?? activa.quote?.sinAiu);

  return [
    "Detalle de la propuesta:",
    ...lineas,
    "",
    `Subtotal: ${fmt(activa.sub)}`,
    ...(sinAiu
      ? [`IVA (19%): ${fmt(activa.iva)}`]
      : [
          `Utilidades (${activa.quote?.util ?? 10}% del valor de la obra): ${fmt(activa.ut)}`,
          `IVA (19% sobre utilidades): ${fmt(activa.iva)}`,
        ]),
    `Total propuesta: ${fmt(activa.tot)}`,
  ];
}

// Las mismas cifras, pero sin convertir a texto: el correo las pinta en una
// tabla y necesita los números, no los renglones. El texto de arriba sigue
// yendo como alternativa en texto plano, para quien lea el correo sin formato.
//
// La descripción viaja tal como está guardada; el correo la pasa a mayúscula,
// que es lo que hace el PDF al imprimirla.
function detalleParaCorreo(c) {
  const activa = propuestaActiva(c);
  if (!activa?.items?.length) return null;

  const sinAiu = Boolean(activa.sinAiu ?? activa.quote?.sinAiu);

  return {
    saludo: primerNombre(c?.contacto) ? `${primerNombre(c.contacto)}, buen día` : "Buen día",
    obra: comoNombre(c?.obra || ""),
    items: activa.items.map((i) => ({
      desc: i.desc, cant: i.cant, unit: i.unit || "UND", vu: i.vu,
    })),
    subtotal: activa.sub,
    sinAiu,
    utilidad: sinAiu ? 0 : activa.ut,
    utilidadPct: sinAiu ? 0 : (activa.quote?.util ?? 10),
    iva: activa.iva,
    total: activa.tot,
    validez: c?.val || 30,
    tiempoEjec: c?.tiempoEjec ? comoFrase(c.tiempoEjec) : "",
    formaPago: c?.formaPago ? comoFrase(c.formaPago) : "",
  };
}

// El mensaje es editable, y el correo con formato lo arma la función a partir
// de las cifras: si alguien agrega una línea a mano -«el lunes paso por la
// obra»- se perdería. Se rescata comparando con lo que propuso el programa;
// lo que no reconoce, viaja aparte y sale destacado antes de la tabla.
function notaEscritaAMano(mensaje, original) {
  const propuestas = new Set(original.split("\n").map((l) => l.trim()).filter(Boolean));
  return mensaje
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !propuestas.has(l))
    .join("\n");
}

function mensajePorDefecto(c) {
  const saludo = primerNombre(c?.contacto);
  const obra = comoNombre(c?.obra || "");
  const detalle = detallePropuesta(c);

  return [
    saludo ? `${saludo}, buen día.` : "Buen día.",
    "",
    `Adjunto encontrará la cotización ${c?.numero || ""} para ${obra || "su solicitud"}.`,
    "",
    ...(detalle.length ? [...detalle, ""] : []),
    `La propuesta tiene una validez de ${c?.val || 30} días.` +
      (c?.tiempoEjec ? ` El tiempo de ejecución estimado es de ${comoFrase(c.tiempoEjec)}.` : ""),
    ...(c?.formaPago ? ["", `Forma de pago: ${comoFrase(c.formaPago)}.`] : []),
    "",
    "Quedamos atentos a sus comentarios y a cualquier ajuste que necesite.",
    "",
    "Cordialmente,",
    "Ingeanclajes S.A.S.",
  ].join("\n");
}

export default function EnviarCotizacion({ cotizacion, firmaImg = "", onCerrar, onEnviado }) {
  const [para, setPara] = useState(cotizacion?.contactoEmail || "");
  const [asunto, setAsunto] = useState(asuntoPorDefecto(cotizacion));
  const [mensajeOriginal] = useState(() => mensajePorDefecto(cotizacion));
  const [mensaje, setMensaje] = useState(mensajeOriginal);
  const [estado, setEstado] = useState("");     // texto de avance
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async () => {
    if (!para.trim()) return setError("Escribe el correo del cliente.");
    setOcupado(true);
    setError("");
    try {
      setEstado("Preparando el documento…");
      const { blob, nombre } = await generarCotizacionPdf(cotizacion, {
        firmaImg,
        // La version liviana: la de alta calidad no cabia en la funcion de
        // correo cuando la cotizacion trae fotos y fichas tecnicas.
        liviano: true,
        onProgreso: (hoja, total) => setEstado(`Generando el PDF · hoja ${hoja} de ${total}`),
      });
      // Se avisa antes de mandar nada si aun asi es demasiado pesado.
      const megas = blob.size / 1024 / 1024;
      if (megas > 12) {
        throw new Error(`El PDF pesa ${megas.toFixed(1)} MB y es demasiado para enviarlo por correo. Quita algunas fotos de la cotización o descárgalo y envíalo aparte.`);
      }

      setEstado("Enviando el correo…");
      await enviarCotizacionPorCorreo({
        para: para.trim(),
        // Se limpia otra vez al enviar, no solo al proponerlo: el campo es
        // editable y una tilde escrita a mano rompe las cabeceras del correo.
        asunto: asuntoSeguro(asunto),
        mensaje,
        detalle: {
          ...(detalleParaCorreo(cotizacion) || {}),
          nota: notaEscritaAMano(mensaje, mensajeOriginal),
        },
        pdfBase64: await blobABase64(blob),
        nombreArchivo: nombre,
        numero: cotizacion?.numero || "",
      });

      setEnviado(true);
      // Solo despues de que el correo salio: quien la lista ve que el cliente
      // ya la tiene, en vez de seguir viendola como «Pendiente».
      onEnviado?.({ para: para.trim(), fecha: new Date().toISOString() });
    } catch (e) {
      setError(e.message || "No se pudo enviar el correo.");
    } finally {
      setOcupado(false);
      setEstado("");
    }
  };

  // Mientras sale el correo no se deja cerrar: el PDF y el envio siguen en
  // marcha y cerrar a medias dejaba la duda de si llego.
  const cerrar = () => { if (!ocupado) onCerrar(); };

  if (enviado) {
    return (
      <Sheet
        onCerrar={onCerrar}
        titulo="Cotización enviada"
        pie={<Button variante="primary" bloque onClick={onCerrar}>Cerrar</Button>}
      >
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Salió a <strong style={{ color: "var(--text-primary)" }}>{para}</strong> con el PDF adjunto,
          desde el correo de la empresa.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet
      onCerrar={cerrar}
      cerrarAlPulsarFondo={!ocupado}
      titulo="Enviar la cotización al cliente"
      subtitulo="Revisa el mensaje. Sale desde el correo de la empresa con el PDF adjunto."
      pie={
        <>
          <Button variante="secondary" onClick={cerrar} disabled={ocupado}>Cancelar</Button>
          <Button variante="primary" onClick={enviar} cargando={ocupado}>
            {ocupado ? "Enviando…" : "Enviar al cliente"}
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <Input
          label="Para"
          type="email"
          value={para}
          onChange={(e) => setPara(e.target.value)}
          placeholder="isabel@empresa.com"
          ayuda={!cotizacion?.contactoEmail
            ? "Esta cotización no tiene correo guardado. Escríbelo aquí y agrégalo también en el formulario para la próxima."
            : undefined}
        />
        <Input label="Asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} />
        <Input
          label="Mensaje"
          como="textarea"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          style={{ minHeight: 190, lineHeight: 1.6 }}
        />
        {estado && <Callout tono="info">{estado}</Callout>}
        {error && <Callout tono="peligro">{error}</Callout>}
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          El PDF se arma en el momento y puede tardar unos segundos si la cotización trae fotos.
        </div>
      </div>
    </Sheet>
  );
}
