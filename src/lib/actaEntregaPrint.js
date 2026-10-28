// La hoja impresa del acta de entrega de obra (FORM-SST-89).
//
// Es el mismo documento que se llenaba a mano, con sus mismas casillas y en
// el mismo orden: quien lo recibe en la obra reconoce la hoja de siempre. Lo
// que cambia es que llega escrita, con los datos que ya estaban guardados.
//
// La forma -hoja carta, encabezado de formato controlado, pie con el codigo y
// la numeracion- es la de la cotizacion y el informe, porque los tres salen
// de la misma empresa y van a la misma carpeta del cliente.

import { fmtL } from "./format";
import { escapeHtml } from "./html";
import { normalizarMayusculas } from "./normalizarEntrada";
import { LOGO_INGEANCLAJES } from "../assets/embeddedImages";
import { getControlDocumental } from "./controlDocumental";
import { cssHojaImpresion } from "./hojaImpresion";
import { FUENTE } from "../styles/designTokens";

const TINTA = "#1d1d1f";
const GRIS = "#6e6e73";
const FONDO = "#f5f5f7";
const LINEA = "#d2d2d7";
const LINEA_SUAVE = "#e8e8ed";

const val = (v) => escapeHtml(String(v ?? "").trim());
// Una casilla vacia en el formato de papel es una raya para escribir a mano.
// Aqui se deja igual: a veces el acta se imprime y se completa delante del
// cliente, y una casilla en blanco no se ve como un dato que falta.
const valOrRaya = (v) => (String(v ?? "").trim() ? val(v) : "<span style=\"color:#c7c7cc;\">__________________</span>");

export function buildActaPrintHtml(acta, { empresaConfig, firmaImg = "", firmaCliente = null, qrVerificacion = "", rastro = null } = {}) {
  const control = getControlDocumental(empresaConfig)?.acta;
  const docCodigo = control?.codigo || "FORM-SST-89";
  const docVersion = control?.version || "02";

  const numero = String(acta?.id || "").trim();
  const contratante = normalizarMayusculas(acta?.contratante || "");
  const sistemas = Array.isArray(acta?.sistemas) ? acta.sistemas : [];
  const colaboradores = (Array.isArray(acta?.colaboradores) ? acta.colaboradores : []).filter(Boolean);

  // Quien entrega firma con la firma que se subio en esta acta -el lider de
  // proyecto cambia de obra en obra-; si no se subio ninguna, sale la de la
  // empresa, que es lo que habia antes.
  const firmaEntrega = String(acta?.firmaLider || "").trim() || firmaImg;

  const firmaClienteObj = firmaCliente || acta?.firmaCliente || null;
  const firmaClienteImg = firmaClienteObj?.firmaImagen || firmaClienteObj?.firma_imagen || acta?.recibeFirma || acta?.firmaImagen || "";
  const nombreFirmante = firmaClienteObj?.firmanteNombre || firmaClienteObj?.firmante_nombre || acta?.recibeNombre;
  const documentoFirmante = firmaClienteObj?.firmanteDocumento || firmaClienteObj?.firmante_documento || acta?.recibeDocumento;
  const cargoFirmante = firmaClienteObj?.firmanteCargo || firmaClienteObj?.firmante_cargo || acta?.recibeCargo;
  const fechaFirmadoIso = firmaClienteObj?.firmadoEn || firmaClienteObj?.firmado_en;
  const fechaFirmadoTexto = fechaFirmadoIso ? fmtL(fechaFirmadoIso) : "";

  const celdaControl = (etiqueta, valor, ultima = false) => `
    <tr>
      <td style="padding:4px 9px;font-size:9px;font-weight:600;color:${GRIS};text-transform:uppercase;letter-spacing:0.04em;${ultima ? "" : `border-bottom:1px solid ${LINEA_SUAVE};`}">${etiqueta}</td>
      <td style="padding:4px 9px;font-size:10px;font-weight:700;color:${TINTA};text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;${ultima ? "" : `border-bottom:1px solid ${LINEA_SUAVE};`}">${valor}</td>
    </tr>`;

  const encabezadoPortada = () => `
    <table style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid ${LINEA};border-radius:8px;margin-bottom:10px;table-layout:fixed;">
      <tr>
        <td style="width:27%;padding:8px 12px;border-right:1px solid ${LINEA};vertical-align:middle;text-align:center;">
          ${LOGO_INGEANCLAJES ? `<img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" style="height:44px;max-width:100%;object-fit:contain;display:inline-block;"/>` : `<div style="font-size:17px;font-weight:800;color:${TINTA};letter-spacing:-0.03em;">INGEANCLAJES</div>`}
        </td>
        <td style="padding:8px 12px;vertical-align:middle;text-align:center;">
          <div style="font-size:9px;font-weight:600;color:${GRIS};text-transform:uppercase;letter-spacing:0.08em;">Sistema de gestión de seguridad y salud en el trabajo</div>
          <div style="font-size:14px;font-weight:800;color:${TINTA};letter-spacing:0.01em;text-transform:uppercase;margin-top:3px;line-height:1.25;">Acta de entrega de obra</div>
          <div style="font-size:9px;color:${GRIS};margin-top:4px;">Ingeanclajes S.A.S. · NIT 900.193.965-4 · PBX (604) 448 26 86</div>
        </td>
        <td style="width:26%;padding:0;border-left:1px solid ${LINEA};vertical-align:middle;">
          <table style="width:100%;border-collapse:collapse;">
            ${celdaControl("Código", escapeHtml(docCodigo))}
            ${celdaControl("Versión", escapeHtml(docVersion))}
            ${celdaControl("Orden de trabajo", escapeHtml(numero || "—"), true)}
          </table>
        </td>
      </tr>
    </table>
  `;

  // Las casillas de datos, dos por fila como en el formato de papel.
  const fila = (izqEtiqueta, izqValor, derEtiqueta, derValor, primera = false) => {
    const borde = primera ? "" : `border-top:1px solid ${LINEA_SUAVE};`;
    return `
      <tr>
        <td style="width:17%;font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:4px 6px;${borde}">${izqEtiqueta}</td>
        <td style="width:33%;color:${TINTA};font-weight:600;font-size:10px;padding:4px 6px;${borde}">${izqValor}</td>
        <td style="width:17%;font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:4px 6px;border-left:1px solid ${LINEA_SUAVE};${borde}">${derEtiqueta}</td>
        <td style="width:33%;color:${TINTA};font-weight:600;font-size:10px;padding:4px 6px;${borde}">${derValor}</td>
      </tr>`;
  };

  const datosContratante = () => `
    <div style="border:1px solid ${LINEA_SUAVE};border-radius:8px;padding:8px 12px;margin-bottom:10px;background:${FONDO};">
      <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
        ${fila("Contratante:", valOrRaya(contratante), "NIT:", valOrRaya(acta?.nit), true)}
        ${fila("Dirección de obra:", valOrRaya(acta?.direccionObra), "Teléfono:", valOrRaya(acta?.telefono))}
        ${fila("Contacto admin.:", valOrRaya(acta?.contactoAdministrativo), "Correo fact. electrónica:", valOrRaya(acta?.correoFacturacion))}
        ${fila("Objetivo del proyecto:", valOrRaya(acta?.objetivo), "Correo administrativo:", valOrRaya(acta?.correoAdministrativo))}
        ${fila("Áreas intervenidas:", valOrRaya(acta?.areasIntervenidas), "Fecha de inicio:", valOrRaya(fmtL(acta?.fechaInicio)))}
        ${fila("Fecha del acta:", valOrRaya(fmtL(acta?.fecha)), "Fecha de entrega:", valOrRaya(fmtL(acta?.fechaEntrega)))}
      </table>
    </div>
  `;

  // La casilla del acero: las dos opciones a la vista y marcada la que es,
  // igual que en el papel, donde se pone una X sobre una de las dos.
  const casillaAcero = (etiqueta, marcada) => `
    <span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px;">
      <span style="display:inline-block;width:11px;height:11px;border:1px solid ${TINTA};border-radius:2px;text-align:center;line-height:10px;font-size:9px;font-weight:800;color:${TINTA};background:#ffffff;">${marcada ? "✕" : "&nbsp;"}</span>
      <span style="font-size:10px;font-weight:${marcada ? 700 : 500};color:${marcada ? TINTA : GRIS};">${etiqueta}</span>
    </span>`;

  const sistemaInstalado = () => `
    <div style="font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:${TINTA};margin-bottom:5px;">1. Sistema instalado o recertificado</div>
    <div style="border:1px solid ${LINEA_SUAVE};border-radius:8px;background:#ffffff;padding:8px 12px;margin-bottom:10px;">
      <div style="padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid ${LINEA_SUAVE};">
        ${casillaAcero("Acero galvanizado", acta?.acero === "galvanizado")}
        ${casillaAcero("Acero inoxidable", acta?.acero === "inoxidable")}
      </div>
      ${sistemas.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <thead>
            <tr>
              <th style="text-align:left;width:14%;font-size:9px;font-weight:700;color:${GRIS};text-transform:uppercase;letter-spacing:0.04em;padding:2px 6px 4px 0;">Cantidad</th>
              <th style="text-align:left;width:14%;font-size:9px;font-weight:700;color:${GRIS};text-transform:uppercase;letter-spacing:0.04em;padding:2px 6px 4px 0;">Unidad</th>
              <th style="text-align:left;font-size:9px;font-weight:700;color:${GRIS};text-transform:uppercase;letter-spacing:0.04em;padding:2px 0 4px;">Sistema entregado</th>
            </tr>
          </thead>
          <tbody>
            ${sistemas.map((s) => `
              <tr>
                <td style="padding:3px 6px 3px 0;border-top:1px solid ${LINEA_SUAVE};font-variant-numeric:tabular-nums;font-weight:700;color:${TINTA};">${val(s.cantidad)}</td>
                <td style="padding:3px 6px 3px 0;border-top:1px solid ${LINEA_SUAVE};color:${TINTA};">${val(s.unidad)}</td>
                <td style="padding:3px 0;border-top:1px solid ${LINEA_SUAVE};color:${TINTA};">${val(s.descripcion)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      ` : `<div style="font-size:9.5px;color:${GRIS};font-style:italic;">Sin sistemas registrados en la cotización de la obra.</div>`}
    </div>
  `;

  const personalEnObra = () => `
    <div style="font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:${TINTA};margin-bottom:5px;">2. Personal que ejecutó el trabajo</div>
    <div style="border:1px solid ${LINEA_SUAVE};border-radius:8px;background:#ffffff;padding:8px 12px;margin-bottom:10px;">
      <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
        <tr>
          <td style="width:17%;font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:4px 6px 4px 0;vertical-align:top;">Colaboradores:</td>
          <td style="color:${TINTA};font-weight:600;font-size:10px;padding:4px 0;">
            ${colaboradores.length ? colaboradores.map((n) => val(n)).join(" · ") : valOrRaya("")}
          </td>
        </tr>
        <tr>
          <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:4px 6px 4px 0;border-top:1px solid ${LINEA_SUAVE};">Coordinador de alturas:</td>
          <td style="color:${TINTA};font-weight:600;font-size:10px;padding:4px 0;border-top:1px solid ${LINEA_SUAVE};">${valOrRaya(acta?.coordinadorAlturas)}</td>
        </tr>
        <tr>
          <td style="font-weight:700;color:${GRIS};letter-spacing:0.04em;text-transform:uppercase;padding:4px 6px 4px 0;border-top:1px solid ${LINEA_SUAVE};">Líder de proyecto:</td>
          <td style="color:${TINTA};font-weight:600;font-size:10px;padding:4px 0;border-top:1px solid ${LINEA_SUAVE};">${valOrRaya(acta?.liderProyecto)}</td>
        </tr>
      </table>
    </div>
  `;

  // El cuerpo va partido en parrafos -un parrafo por cada renglon en blanco-
  // en vez de en un solo bloque de texto. Asi, cuando la descripcion no cabe
  // en lo que queda de hoja, se reparte por parrafos entre una hoja y la
  // siguiente (ver lib/repaginarHojas.js) en lugar de saltar entera y dejar
  // media hoja en blanco detras.
  const parrafosDe = (cuerpo) => String(cuerpo || "")
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const bloqueTexto = (titulo, cuerpo, vacio) => {
    const parrafos = parrafosDe(cuerpo);
    return `
    <div style="font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:${TINTA};margin-bottom:5px;">${titulo}</div>
    <div data-parte="caja" style="border:1px solid ${LINEA_SUAVE};border-radius:8px;background:#ffffff;padding:9px 12px;margin-bottom:10px;">
      ${parrafos.length
        ? parrafos.map((p, i) => `<div data-parte="parrafo" style="font-size:10.5px;color:${TINTA};line-height:1.48;text-align:justify;white-space:pre-line;${i ? "margin-top:7px;" : ""}">${val(p)}</div>`).join("")
        : `<div data-parte="parrafo" style="font-size:9.5px;color:${GRIS};font-style:italic;">${vacio}</div>`}
    </div>
  `;
  };

  const firmas = () => `
    <table class="bloque-firma" style="width:100%;border-collapse:collapse;margin-top:4px;border-top:1px solid ${LINEA_SUAVE};padding-top:8px;">
      <tr>
        <td style="width:50%;padding:10px 12px 0 0;vertical-align:top;border-right:1px solid ${LINEA_SUAVE};">
          <div style="font-size:9px;font-weight:700;color:${GRIS};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;">Entrega conforme · Ingeanclajes S.A.S.</div>
          <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:3px;">
            ${firmaEntrega ? `<img src="${firmaEntrega}" alt="Firma" style="max-height:42px;max-width:180px;object-fit:contain;"/>` : ""}
          </div>
          <div style="font-weight:800;font-size:10.5px;color:${TINTA};">${valOrRaya(acta?.liderProyecto)}</div>
          <div style="font-size:9px;color:${GRIS};margin-top:1px;">Líder de proyecto</div>
          <div style="font-size:9px;color:${GRIS};margin-top:6px;">Coordinación SST: ${valOrRaya(acta?.coordinadorAlturas)}</div>
        </td>
        <td style="width:50%;padding:10px 0 0 12px;vertical-align:top;">
          <div style="font-size:9px;font-weight:700;color:${GRIS};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;">Recibe conforme · ${val(contratante || "El contratante")}</div>
          <!-- Firmada: la firma que dibujo el cliente y el QR de verificacion
               suben aqui, al recuadro donde se espera ver su firma. Antes solo
               estaban en la hoja de constancia, al final, y la hoja del acta
               -que es la que se archiva y se imprime- salia con la raya en
               blanco como si nadie la hubiera firmado. -->
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="vertical-align:top;padding:0;">
                <div style="height:44px;display:flex;align-items:flex-end;margin-bottom:3px;font-size:9px;color:${GRIS};font-style:italic;">
                  ${firmaClienteImg
                    ? `<img src="${firmaClienteImg}" alt="Firma del cliente" style="max-height:42px;max-width:170px;object-fit:contain;display:inline-block;font-style:normal;"/>`
                    : `(Firma de recepción a satisfacción)`}
                </div>
                <div style="font-size:9.5px;color:${TINTA};font-weight:700;">NOMBRE: ${valOrRaya(nombreFirmante)}</div>
                <div style="font-size:9px;color:${GRIS};margin-top:3px;">C.C.: ${valOrRaya(documentoFirmante)}</div>
                <div style="font-size:9px;color:${GRIS};margin-top:3px;">CARGO: ${valOrRaya(cargoFirmante)}</div>${fechaFirmadoTexto ? `
                <div style="font-size:8px;color:${GRIS};margin-top:3px;">Firmado electrónicamente · ${val(fechaFirmadoTexto)}</div>` : ""}
              </td>
              ${qrVerificacion ? `
              <td style="width:78px;vertical-align:top;padding:0 0 0 8px;text-align:center;">
                <img src="${qrVerificacion}" alt="Código QR de verificación" style="width:70px;height:70px;display:block;margin:0 auto;"/>
                <div style="font-size:7px;color:${GRIS};line-height:1.3;margin-top:2px;">Verifique<br/>esta firma</div>
              </td>` : ""}
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${rastroDelEnvioHtml()}
  `;

  // El rastro del envio al pie del acta: cuando se mando, cuando abrio el
  // enlace y cuando firmo, con la IP de cada paso. Antes solo estaba en la
  // hoja de constancia; al dejar de adjuntarla, el acta se quedaba sin la
  // prueba de como se firmo.
  const rastroDelEnvioHtml = () => {
    const filas = rastro?.filas || [];
    if (!filas.length) return "";
    return `
    <div style="margin-top:10px;padding-top:6px;border-top:1px solid ${LINEA_SUAVE};">
      <div style="font-size:8.5px;font-weight:700;color:${GRIS};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px;">Rastro del envío</div>
      <table style="width:100%;border-collapse:collapse;font-size:8px;color:${GRIS};">
        ${filas.map((f) => `
          <tr>
            <td style="padding:1.5px 0;white-space:nowrap;">${val(f.fecha)}</td>
            <td style="padding:1.5px 10px;font-weight:700;color:${TINTA};">${val(f.etiqueta)}</td>
            <td style="padding:1.5px 0;text-align:right;white-space:nowrap;">${f.ip ? `IP ${val(f.ip)}` : ""}</td>
          </tr>`).join("")}
        ${rastro?.omitidas ? `
          <tr><td colspan="3" style="padding:1.5px 0;font-style:italic;">… y ${val(rastro.omitidas)} apertura(s) más del enlace.</td></tr>` : ""}
      </table>
    </div>`;
  };

  // Las marcas `data-rol` son para volver a repartir el contenido en hojas al
  // generar el PDF, midiendo lo ya dibujado (ver lib/repaginarHojas.js). Aqui
  // se emite una sola hoja: el acta cabe en una salvo que la descripcion del
  // trabajo sea muy larga, y entonces el reparto la pasa a la siguiente.
  const marcar = (html, rol, divisible = false) => `<div data-rol="${rol}"${divisible ? ' data-divisible="1"' : ""}>${html}</div>`;

  const contenido = [
    marcar(encabezadoPortada() + datosContratante(), "fijo"),
    marcar(sistemaInstalado(), "contenido"),
    marcar(personalEnObra(), "contenido"),
    marcar(bloqueTexto("3. Descripción del trabajo realizado", acta?.descripcion, "Sin descripción del trabajo."), "contenido", true),
    marcar(bloqueTexto("4. Observaciones", acta?.observaciones, "Sin observaciones."), "contenido", true),
    marcar(firmas(), "contenido"),
  ].join("\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Acta de entrega ${escapeHtml(numero)} ${escapeHtml(contratante)}</title>
    <style>
      ${cssHojaImpresion()}

      * { letter-spacing: normal; }
      html, body {
        font-family: ${FUENTE};
        color: ${TINTA};
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page-inner {
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: column;
        min-height: 232mm;
        height: 100%;
        box-sizing: border-box;
      }
      .page-content { display: block; flex: 1 1 auto; }
      .page-footer {
        margin-top: auto;
        border-top: 1px solid ${LINEA_SUAVE};
        padding-top: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9px;
        color: ${GRIS};
      }
      @media print {
        #print-toolbar, #print-toolbar + div { display: none !important; }
      }
    </style>
  </head>
  <body>
    <section class="page">
      <div class="page-inner">
        <div class="page-content">
          ${contenido}
        </div>
        <div class="page-footer">
          <span>Ingeanclajes S.A.S · Acta de entrega ${escapeHtml(numero)} · ${escapeHtml(docCodigo)} (V-${escapeHtml(docVersion)})</span>
          <span data-rol="numeracion">Página 1 de 1</span>
        </div>
      </div>
    </section>
  </body>
</html>`;
}
