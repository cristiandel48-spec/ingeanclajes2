import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAppData } from "../../context/AppDataContext";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import PrintHeader from "../../components/print/PrintHeader";
import { fmtL, today as hoy } from "../../lib/format";
import { LOGO_INGEANCLAJES } from "../../assets/embeddedImages";
import { enlaceVerificacion } from "../../lib/verificacionCertificados";
import { FUENTE } from "../../styles/designTokens";
import { sanitizarCertificado } from "./certSanitizer";
import {
  PRUEBAS_ESCALERAS_ANSI,
  CAPACIDAD_CARGA_ESCALERA,
  construirTextoSistema,
  unAnoDespues,
} from "./certConfig";
import { renderTextoSistema } from "./renderTextoSistema";

function generarFranjaSeguridad(ancho = 44, alto = 1056) {
  if (typeof document === "undefined") return "";
  const dpr = 2;
  const canvas = document.createElement("canvas");
  canvas.width = ancho * dpr;
  canvas.height = alto * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.scale(dpr, dpr);

  const grad = ctx.createLinearGradient(0, 0, 0, alto);
  grad.addColorStop(0, "#7f1d1d");
  grad.addColorStop(0.2, "#b91c1c");
  grad.addColorStop(0.5, "#dc2626");
  grad.addColorStop(0.8, "#b91c1c");
  grad.addColorStop(1, "#7f1d1d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ancho, alto);

  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(ancho - 1.5, 0, 1.5, alto);

  ctx.save();
  ctx.translate(ancho / 2, alto / 2);
  ctx.rotate(-Math.PI / 2);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 12.5px 'Segoe UI', -apple-system, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const texto = "INGEANCLAJES S.A.S · ESCALERAS INDUSTRIALES ARTICO · ANSI ASC A14.5 & NTC 17025";
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = "2.6px";
    ctx.fillText(texto, 0, 0);
  } else {
    const caracteres = texto.split("");
    const espaciado = 2.6;
    const anchos = caracteres.map((c) => ctx.measureText(c).width);
    const anchoTotal = anchos.reduce((a, b) => a + b, 0) + (caracteres.length - 1) * espaciado;
    let x = -anchoTotal / 2;
    for (let i = 0; i < caracteres.length; i++) {
      ctx.fillText(caracteres[i], x + anchos[i] / 2, 0);
      x += anchos[i] + espaciado;
    }
  }
  ctx.restore();

  try {
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

const TITULO_SECCION_STYLE = {
  fontSize: 12,
  fontWeight: 800,
  color: "#991b1b",
  borderBottom: "1px solid #e2e8f0",
  paddingBottom: 4,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 6,
  letterSpacing: 0.3,
  textTransform: "uppercase",
};

export default function CertificacionEscalerasDocumento({ cert: certRaw }) {
  const { empresaConfig, clientes, obras } = useAppData();
  const cert = sanitizarCertificado(certRaw, { clientes, obras });
  const firmaImg = getFirmaImg(empresaConfig);
  const [qrUrl, setQrUrl] = useState("");
  const [franjaUrl] = useState(() => {
    try {
      return generarFranjaSeguridad(44, 1056);
    } catch {
      return "";
    }
  });

  const folioDoc = cert?.numero || cert?.id || "C-2026-ESC";
  const linkVerificacion = enlaceVerificacion({
    codigoVerificacion: cert?.codigoVerificacion,
    numero: folioDoc,
    cliente: cert?.cliente,
  });

  useEffect(() => {
    let activo = true;
    QRCode.toDataURL(linkVerificacion, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (activo) setQrUrl(dataUrl);
      })
      .catch((err) => console.warn("Error generando QR:", err));
    return () => {
      activo = false;
    };
  }, [linkVerificacion]);

  if (!cert) return null;

  const tipoEscalera = (cert.tipoEscalera || "TIPO GATO").toUpperCase();
  const capacidadCarga = CAPACIDAD_CARGA_ESCALERA;
  const fechaDoc = cert.fecha || hoy();
  const proxMant = cert.proxMant || unAnoDespues(fechaDoc);
  const elementos = Array.isArray(cert.elementos) ? cert.elementos.filter(Boolean).slice(0, 8) : [];

  const textoLongitud = cert.longitudEscalera || "5.5 metros";
  const sistemaParaRender =
    cert.sistema && !cert.sistema.toLowerCase().includes("consistentes en: treinta")
      ? cert.sistema
      : construirTextoSistema({
          tipo: cert.tipo === "Recertificación" ? "Recertificación" : "Certificación",
          tipoSistema: "Escalera fija",
          cantidad: 1,
          cliente: cert.cliente || "",
          nit: cert.nit || "",
          direccion: cert.direccion || "",
          normativa: "Resolución 4272 de 2021",
          lugar: cert.lugar || "",
          detalle: `una (1) escalera fija de ${textoLongitud} con su respectiva línea de vida vertical`,
        });

  const certConSistema = { ...cert, sistema: sistemaParaRender };

  const renderHojaBase = (numeroPagina, contenido) => (
    <div
      key={`hoja-${numeroPagina}`}
      className="doc-page doc-bleed-page page"
      data-page={numeroPagina}
      style={{
        background: "#ffffff",
        color: "#111111",
        fontFamily: FUENTE,
        fontSize: 12,
        lineHeight: 1.48,
        border: "1px solid #dddddd",
        borderRadius: 4,
        padding: 0,
        position: "relative",
        overflow: "hidden",
        width: "100%",
        maxWidth: 816,
        minHeight: 1056,
        height: 1056,
        maxHeight: 1056,
        boxSizing: "border-box",
        marginBottom: numeroPagina < 3 ? 24 : 0,
        boxShadow: "0 8px 28px rgba(15, 23, 42, 0.08)",
      }}
    >
      {/* Franja lateral de seguridad oficial (idéntica a la certificación estándar) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 44,
          backgroundColor: "#b91c1c",
          zIndex: 4,
          userSelect: "none",
          overflow: "hidden",
        }}
      >
        {franjaUrl && (
          <img
            src={franjaUrl}
            alt=""
            style={{ width: 44, height: 1056, display: "block" }}
          />
        )}
      </div>

      {/* Marca de agua sutil en el fondo */}
      <div
        style={{
          position: "absolute",
          top: "48%",
          left: "52%",
          transform: "translate(-50%, -50%) rotate(-12deg)",
          width: 360,
          height: 360,
          backgroundImage: `url(${LOGO_INGEANCLAJES})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "contain",
          opacity: 0.035,
          pointerEvents: "none",
          zIndex: 0,
          userSelect: "none",
        }}
      />

      {/* Contenedor interno con márgenes unificados */}
      <div
        style={{
          marginLeft: 58,
          marginRight: 24,
          paddingTop: 16,
          paddingBottom: 14,
          position: "relative",
          zIndex: 1,
          height: "100%",
          maxHeight: 1056,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Encabezado Oficial en cada página */}
        <div style={{ padding: "0 0 8px", flexShrink: 0 }}>
          <PrintHeader dual={true} formato="certificacion" empresaConfig={empresaConfig} numeroDocumento={folioDoc} />
        </div>

        {/* Contenido dinámico con flujo editorial continuo */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            minHeight: 0,
          }}
        >
          {contenido}
        </div>

        {/* Pie de página oficial idéntico a la certificación estándar */}
        <div
          style={{
            borderTop: "1px solid #cbd5e1",
            paddingTop: 6,
            marginTop: 8,
            flexShrink: 0,
            textAlign: "center",
            fontSize: 9.5,
            color: "#64748b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>Calle 38 sur # 36 - 48, Envigado · PBX (604) 448 26 86 · Cel. 314 863 40 72</div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>INGEANCLAJES S.A.S · NIT 900.193.965-4</div>
          <div>Página {numeroPagina} de 3</div>
        </div>
      </div>
    </div>
  );

  return (
    <div id="pz" data-bleed-left="true" className="doc-shell-multi">
      {/* ══════════════════════════════════════════════════════════════════════════
          PÁGINA 1: CERTIFICACIÓN, COMPONENTES, MATERIALES E INSPECCIONES
          ══════════════════════════════════════════════════════════════════════════ */}
      {renderHojaBase(
        1,
        <>
          {/* Cintillo de Título Oficial (unificado con CertificacionDocumento) */}
          <div
            style={{
              textAlign: "center",
              padding: "6px 12px",
              background: "linear-gradient(90deg, rgba(200,30,30,0.03) 0%, rgba(200,30,30,0.08) 50%, rgba(200,30,30,0.03) 100%)",
              borderTop: "1px solid rgba(200,30,30,0.25)",
              borderBottom: "1px solid rgba(200,30,30,0.25)",
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: 1.5, color: "#991b1b", textTransform: "uppercase" }}>
              CERTIFICACIÓN OFICIAL DE ESCALERAS
            </div>
            <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 600, letterSpacing: 0.3, marginTop: 1 }}>
              En estricto cumplimiento con la Norma ANSI ASC A14.5-2017 · NTC 17025-2017 & Resolución 4272 de 2021
            </div>
          </div>

          {/* Destinatario y Metadatos (misma estructura y tipografía que CertificacionDocumento) */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, color: "#475569", marginBottom: 3 }}>Envigado, {fmtL(fechaDoc)}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>SEÑORES:</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: "1px 0 2px" }}>
              {(cert.cliente || "").toUpperCase()}
            </div>
            {cert.nit && (
              <div style={{ fontSize: 11.5, color: "#334155" }}>
                NIT: <strong>{cert.nit}</strong>
              </div>
            )}
            {cert.direccion && (
              <div style={{ fontSize: 11.5, color: "#334155" }}>
                DIRECCIÓN: <strong>{cert.direccion.toUpperCase()}</strong>
              </div>
            )}
          </div>

          {/* Emisor Oficial */}
          <div style={{ textAlign: "center", fontWeight: 900, fontSize: 15, color: "#0f172a", letterSpacing: 1, marginBottom: 8 }}>
            INGEANCLAJES S.A.S
          </div>

          {/* Texto del Sistema Certificado (mismo formato limpio y negritas que la certificación normal) */}
          <div style={{ textAlign: "justify", marginBottom: 16, lineHeight: 1.55, fontSize: 12, color: "#1e293b" }}>
            {renderTextoSistema(certConSistema)}
          </div>

          {/* Sección 1: Materiales y componentes */}
          <div style={{ marginBottom: 16 }}>
            <div style={TITULO_SECCION_STYLE}>
              <span>1.</span>
              <span>Materiales y Componentes</span>
            </div>
            <div style={{ textAlign: "justify", fontSize: 11.8, lineHeight: 1.54, color: "#1e293b", marginBottom: 8 }}>
              Las escaleras <strong>ARTICO</strong> son fabricadas con materiales y componentes de alta calidad, los cuales han sido previamente seleccionados y validados para dar cumplimiento a los requisitos de calidad exigidos en la norma <strong>ANSI ASC A14.5-2017</strong>.
            </div>
            <div style={{ textAlign: "justify", fontSize: 11.8, lineHeight: 1.54, color: "#1e293b", marginBottom: 8 }}>
              La validación de los rieles utilizados en estas escaleras se realiza en laboratorios acreditados de acuerdo con lo establecido en planes de calidad internos y las Normas <strong>ASTM D229 – ASTM D790</strong>. Los resultados de los ensayos aplicados a los rieles; de tensión, compresión, flexión e impacto cumplen a cabalidad con los requisitos exigidos.
            </div>
            <div style={{ textAlign: "justify", fontSize: 11.8, lineHeight: 1.54, color: "#1e293b", marginBottom: 12 }}>
              Los resultados de las pruebas de rigidez dieléctrica superan ampliamente los <strong>25 kV</strong> efectuada bajo la norma <strong>ASTM D149-2004</strong>.
            </div>

            {elementos.length > 0 && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  padding: "10px 14px",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", marginBottom: 5 }}>
                  Componentes y elementos utilizados en dicha labor:
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: elementos.length > 3 ? "1fr 1fr" : "1fr",
                    gap: "4px 16px",
                    paddingLeft: 2,
                  }}
                >
                  {elementos.map((el, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 11.5,
                        color: "#334155",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 4.5,
                          height: 4.5,
                          background: "#c81e1e",
                          borderRadius: "50%",
                          flexShrink: 0,
                        }}
                      />
                      <span>{el}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ textAlign: "justify", lineHeight: 1.5, fontSize: 11.5, color: "#334155" }}>
              Dichos componentes garantizan la fijación, retención y detención segura de los trabajadores durante la ejecución de labores con riesgo de caída en alturas. Todos los elementos que componen los sistemas certificados se encuentran en excelente estado técnico y operativo.
            </div>
          </div>

          {/* Sección 2: Inspecciones */}
          <div>
            <div style={TITULO_SECCION_STYLE}>
              <span>2.</span>
              <span>Inspecciones de Fabricación</span>
            </div>
            <div style={{ textAlign: "justify", fontSize: 11.8, lineHeight: 1.54, color: "#1e293b" }}>
              El producto fue inspeccionado y liberado en cada una de las etapas de fabricación de acuerdo con el plan de calidad interno <strong>PC-CH-003</strong>, donde se definen los criterios de conformidad del producto en cada etapa. <strong>INGEANCLAJES S.A.S</strong> verifica cada unidad conforme a los requisitos de la norma <strong>NTC 17025-2017</strong> y la <strong>Resolución 4272 de 2021</strong>.
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          PÁGINA 2: VALIDACIÓN TÉCNICA, ENSAYOS Y GARANTÍA
          ══════════════════════════════════════════════════════════════════════════ */}
      {renderHojaBase(
        2,
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={TITULO_SECCION_STYLE}>
              <span>3.</span>
              <span>Validación del Producto Terminado y Ensayos de Desempeño</span>
            </div>
            <div style={{ fontSize: 11.5, color: "#475569", marginBottom: 5 }}>
              De acuerdo con los requisitos de la norma <strong>NTC 17025-2017</strong>.
            </div>
            <div style={{ textAlign: "justify", fontSize: 11.8, lineHeight: 1.52, color: "#1e293b", marginBottom: 10 }}>
              Las escaleras <strong>ARTICO</strong> han sido sometidas a pruebas de desempeño exigentes de acuerdo con la norma <strong>ANSI ASC A14.5-2017</strong>. Los requisitos de las pruebas han sido especificados con un amplio factor de seguridad para asegurar la capacidad de carga de acuerdo con su clasificación así:
            </div>

            {/* Tabla 1: Capacidad de carga */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 11,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", color: "#0f172a", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 700 }}>TIPO DE ESCALERA</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700 }}>PRUEBA</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700 }}>REQUISITO</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700 }}>CARGA DE PRUEBA</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#ffffff" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0f172a" }}>{tipoEscalera}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center", color: "#334155" }}>{capacidadCarga.prueba}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, color: "#0f172a" }}>
                    {cert.requisitoCarga || capacidadCarga.requisito}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#166534" }}>
                    {cert.cargaPrueba || capacidadCarga.cargaPrueba}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabla 2: 15 Pruebas de la Norma ANSI A14.5 */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
              Pruebas aplicadas a este tipo de escaleras:
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 10.5,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", color: "#0f172a", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "6px 10px", textAlign: "left", width: "22%", fontWeight: 700 }}>Numeral de la norma</th>
                  <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700 }}>Descripción de la prueba</th>
                  <th style={{ padding: "6px 10px", textAlign: "center", width: "18%", fontWeight: 700 }}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {PRUEBAS_ESCALERAS_ANSI.map((p, idx) => (
                  <tr
                    key={p.numeral}
                    style={{
                      background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <td style={{ padding: "4.5px 10px", fontWeight: 600, color: "#334155", fontVariantNumeric: "tabular-nums" }}>{p.numeral}</td>
                    <td style={{ padding: "4.5px 10px", color: "#1e293b" }}>{p.descripcion}</td>
                    <td style={{ padding: "4.5px 10px", textAlign: "center" }}>
                      <span
                        style={{
                          background: "#f0fdf4",
                          color: "#166534",
                          border: "1px solid #bbf7d0",
                          padding: "1px 8px",
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: 9.5,
                          display: "inline-block",
                        }}
                      >
                        ✓ {p.resultado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 10, color: "#64748b", fontStyle: "italic", marginTop: 6 }}>
              * Todas las pruebas no fueron aplicadas a este lote de fabricación; la periodicidad está definida en el plan de calidad interno.
            </div>
          </div>

          {/* Sección 4: Resultados */}
          <div style={{ marginBottom: 18 }}>
            <div style={TITULO_SECCION_STYLE}>
              <span>4.</span>
              <span>Resultados de Conformidad</span>
            </div>
            <div style={{ textAlign: "justify", fontSize: 11.8, lineHeight: 1.54, color: "#1e293b" }}>
              Este producto cumple plenamente con los requisitos de conformidad de acuerdo con la norma <strong>ANSI ASC A14.5-2017</strong>.
            </div>
          </div>

          {/* Sección 5: Garantía */}
          <div>
            <div style={TITULO_SECCION_STYLE}>
              <span>5.</span>
              <span>Garantía de Fabricación</span>
            </div>
            <div style={{ textAlign: "justify", fontSize: 11.8, lineHeight: 1.54, color: "#1e293b" }}>
              La garantía por defectos de fabricación de las escaleras <strong>ARTICO</strong> es de <strong>dos (2) años</strong> a partir de la fecha de facturación; dicha garantía no cubre daños por el uso inadecuado, desgaste natural no atribuible a falla de materiales ni modificaciones no autorizadas de esta herramienta.
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          PÁGINA 3: RECOMENDACIONES, VIGENCIA ARL, TRAZABILIDAD, FIRMA Y QR
          ══════════════════════════════════════════════════════════════════════════ */}
      {renderHojaBase(
        3,
        <>
          <div>
            <div style={TITULO_SECCION_STYLE}>
              <span>6.</span>
              <span>Vigencia Técnica y Recomendaciones</span>
            </div>

            {/* Recomendaciones Técnicas (mismo sombreado #f8fafc y tipografía que CertificacionDocumento) */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: "12px 15px",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  marginBottom: 6,
                  fontSize: 11.5,
                  color: "#0f172a",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                RECOMENDACIONES PARA TENER EN CUENTA
              </div>
              <div style={{ fontSize: 11.2, lineHeight: 1.5, marginBottom: 6, textAlign: "justify", color: "#334155" }}>
                A continuación, se realizan algunas recomendaciones para preservar en buen estado los sistemas anticaídas y escaleras certificados en dicha obra:
              </div>
              <ul style={{ marginLeft: 16, fontSize: 11.2, lineHeight: 1.54, marginBottom: 8, color: "#334155", paddingLeft: 0 }}>
                <li style={{ margin: "4px 0" }}>
                  Dar aviso de inmediato en caso de registrarse algún evento de caída o impacto para su respectiva valoración y diagnóstico.
                </li>
                <li style={{ margin: "4px 0" }}>
                  Conectar como máximo dos (2) personas por cada línea de vida o en cada tramo entre soportes laterales e intermedios.
                </li>
                <li style={{ margin: "4px 0" }}>
                  No modificar ningún elemento del sistema ni de la escalera, ya que puede perder sus funciones y generar riesgo para los usuarios.
                </li>
                <li style={{ margin: "4px 0" }}>
                  Limpiar de inmediato las estructuras u otros elementos que entren en contacto con químicos en el área.
                </li>
              </ul>
              <div style={{ fontSize: 11, textAlign: "justify", lineHeight: 1.5, color: "#475569", marginBottom: 8 }}>
                Estas recomendaciones son de carácter técnico; su cumplimiento es obligatorio para minimizar el riesgo en trabajo en alturas. Se debe realizar el próximo mantenimiento preventivo de todo el sistema máximo dentro de un (1) año contado a partir de la expedición del presente documento (antes del {fmtL(proxMant)}).
              </div>
              <div
                style={{
                  fontSize: 10.8,
                  textAlign: "justify",
                  lineHeight: 1.48,
                  color: "#334155",
                  background: "#ffffff",
                  padding: "8px 11px",
                  borderRadius: 5,
                  border: "1px solid #e2e8f0",
                }}
              >
                <strong style={{ color: "#0f172a" }}>Nota técnica:</strong> Si la línea de vida o la estructura es impactada, ya sea de manera intencional o accidental, la revisión y reparación del sistema tendrá un costo adicional para garantizar su correcto funcionamiento y la seguridad de los usuarios.
              </div>
            </div>

            {/* Tarjeta de Vigencia Técnica ARL (ubicada después de la nota técnica) */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 6,
                padding: "9px 14px",
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#16a34a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: 0.2 }}>
                    Certificación Vigente y Homologada
                  </div>
                  <div style={{ fontSize: 10.5, color: "#15803d", marginTop: 1 }}>
                    Apta para auditorías SST, visitas de ARL e inspección de trabajo en alturas.
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                  Próxima Inspección Anual
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginTop: 1 }}>
                  Antes del {fmtL(proxMant)}
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de Control y Trazabilidad del Documento */}
          <div style={{ marginBottom: 26 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 10.5,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", color: "#334155", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "5.5px 10px", textAlign: "left", fontWeight: 700 }}>FOLIO OFICIAL</th>
                  <th style={{ padding: "5.5px 10px", textAlign: "left", fontWeight: 700 }}>CLASIFICACIÓN EQUIPO</th>
                  <th style={{ padding: "5.5px 10px", textAlign: "left", fontWeight: 700 }}>NORMATIVA DE CONFORMIDAD</th>
                  <th style={{ padding: "5.5px 10px", textAlign: "right", fontWeight: 700 }}>FECHA DE EXPEDICIÓN</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#ffffff" }}>
                  <td style={{ padding: "6.5px 10px", fontWeight: 800, color: "#991b1b" }}>{folioDoc}</td>
                  <td style={{ padding: "6.5px 10px", fontWeight: 700, color: "#0f172a" }}>{tipoEscalera}</td>
                  <td style={{ padding: "6.5px 10px", color: "#334155" }}>ANSI ASC A14.5 · NTC 17025 · Res. 4272/2021</td>
                  <td style={{ padding: "6.5px 10px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>{fmtL(fechaDoc)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cierre: Firma, Sello Oficial y Código QR (idéntico a CertificacionDocumento) */}
          <div
            className="firma-bloque"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: 4,
            }}
          >
            {/* Firma del Ingeniero */}
            <div style={{ minWidth: 200 }}>
              <div style={{ fontSize: 11.5, color: "#475569", marginBottom: 2 }}>Cordialmente,</div>
              <div style={{ height: 46, display: "flex", alignItems: "flex-end" }}>
                {firmaImg && (
                  <img src={firmaImg} alt="Firma" style={{ maxHeight: 44, maxWidth: 190, objectFit: "contain" }} />
                )}
              </div>
              <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: 3, display: "inline-block", minWidth: 210 }}>
                <div style={{ fontWeight: 800, fontSize: 12.5, color: "#0f172a" }}>{cert.ingeniero}</div>
                <div style={{ fontSize: 10.5, color: "#475569", fontWeight: 600 }}>{cert.cargo || "Gerente General"}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>{cert.matricula}</div>
              </div>
            </div>

            {/* Sello y QR de Validación */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Sello Oficial Circular */}
              <div
                style={{
                  width: 78,
                  height: 78,
                  border: "1.5px dashed #c81e1e",
                  borderRadius: "50%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "4px 6px",
                  color: "#c81e1e",
                  background: "rgba(200, 30, 30, 0.02)",
                  userSelect: "none",
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: 0.2, textTransform: "uppercase", lineHeight: 1.1 }}>
                  SISTEMA<br />CONFORME
                </div>
                <div style={{ fontSize: 8.5, fontWeight: 900, lineHeight: 1.1, margin: "3px 0" }}>
                  ANSI A14.5<br />RES. 4272
                </div>
                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: 0.2 }}>INGEANCLAJES</div>
              </div>

              {/* Código QR con Folio */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#ffffff",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "6px 8px",
                  flexShrink: 0,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {qrUrl ? (
                  <a
                    href={linkVerificacion}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", textDecoration: "none" }}
                    title="Clic para verificar autenticidad en línea"
                  >
                    <img src={qrUrl} alt="QR Validación" style={{ width: 80, height: 80, display: "block", borderRadius: 3 }} />
                  </a>
                ) : (
                  <div style={{ width: 80, height: 80, background: "#e2e8f0", borderRadius: 3 }} />
                )}
                <div style={{ fontSize: 9, color: "#475569", lineHeight: 1.3, maxWidth: 110 }}>
                  <strong style={{ fontSize: 10.5, color: "#0f172a", display: "block", marginBottom: 2 }}>
                    VERIFICACIÓN DIGITAL
                  </strong>
                  Escanea para validar autenticidad y vigencia
                  <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 10.5, fontWeight: 800, color: "#c81e1e", marginTop: 3 }}>
                    FOLIO: {folioDoc}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
