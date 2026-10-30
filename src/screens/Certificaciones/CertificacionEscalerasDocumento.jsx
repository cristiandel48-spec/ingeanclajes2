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
import { PRUEBAS_ESCALERAS_ANSI, CAPACIDAD_CARGA_ESCALERA, unAnoDespues } from "./certConfig";

function generarFranjaSeguridad(ancho = 44, alto = 1056) {
  if (typeof document === "undefined") return "";
  const dpr = 2;
  const canvas = document.createElement("canvas");
  canvas.width = ancho * dpr;
  canvas.height = alto * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.scale(dpr, dpr);

  // Fondo degradado rojo institucional
  const grad = ctx.createLinearGradient(0, 0, 0, alto);
  grad.addColorStop(0, "#7f1d1d");
  grad.addColorStop(0.2, "#b91c1c");
  grad.addColorStop(0.5, "#dc2626");
  grad.addColorStop(0.8, "#b91c1c");
  grad.addColorStop(1, "#7f1d1d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ancho, alto);

  // Filete fino blanco translúcido en el borde derecho
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(ancho - 1.5, 0, 1.5, alto);

  // Texto vertical centrado legible y grande
  ctx.save();
  ctx.translate(ancho / 2, alto / 2);
  ctx.rotate(-Math.PI / 2);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 12px 'Segoe UI', -apple-system, Arial, sans-serif";
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

  // Extraer o formular la declaración oficial
  const textoLugar = cert.lugar ? cert.lugar.toUpperCase() : "LA OBRA";
  const textoLongitud = cert.longitudEscalera || "5.5 METROS";

  // Redacción de la declaración directa
  const declaracionOficial =
    cert.sistema && !cert.sistema.toLowerCase().includes("consistentes en: treinta")
      ? cert.sistema.replace(/^(?:INGEANCLAJES\s+S\.?A\.?S\.?\s+)?(?:CERTIFICA|RECERTIFICA)\s*:?\s*(?:que\s+)?/i, "")
      : `1 ESCALERA DE ${textoLongitud} INSTALADA EN ${textoLugar}, A SOLICITUD DE ${(cert.cliente || "").toUpperCase()} (NIT: ${cert.nit || ""}), CON SU RESPECTIVA LÍNEA DE VIDA VERTICAL.`;

  const renderHojaBase = (numeroPagina, contenido) => (
    <div
      key={`hoja-${numeroPagina}`}
      className="doc-page doc-bleed-page"
      data-page={numeroPagina}
      style={{
        background: "#ffffff",
        color: "#111111",
        fontFamily: FUENTE,
        fontSize: 12,
        lineHeight: 1.45,
        border: "1px solid #e2e8f0",
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
        marginBottom: 24,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Franja lateral de seguridad oficial */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 44,
          backgroundImage: franjaUrl ? `url("${franjaUrl}")` : "none",
          backgroundColor: "#b91c1c",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          zIndex: 4,
          userSelect: "none",
        }}
      />

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

      {/* Contenedor interno con márgenes controlados */}
      <div
        style={{
          marginLeft: 58,
          marginRight: 22,
          paddingTop: 14,
          paddingBottom: 10,
          position: "relative",
          zIndex: 1,
          height: "100%",
          maxHeight: 1056,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Encabezado Oficial en cada página */}
        <div style={{ padding: "0 0 4px" }}>
          <PrintHeader dual={true} formato="certificacion" empresaConfig={empresaConfig} numeroDocumento={folioDoc} />
        </div>

        {/* Contenido dinámico de la página */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {contenido}
        </div>

        {/* Pie de página oficial con numeración */}
        <div
          style={{
            borderTop: "1px solid #cbd5e1",
            paddingTop: 4,
            marginTop: 4,
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
          <div style={{ fontWeight: 600 }}>Página {numeroPagina} de 3</div>
        </div>
      </div>
    </div>
  );

  return (
    <div id="pz" data-bleed-left="true" className="doc-shell-multi">
      {/* ══════════════════════════════════════════════════════════════════════════
          PÁGINA 1: CERTIFICACIÓN, MATERIALES E INSPECCIONES
          ══════════════════════════════════════════════════════════════════════════ */}
      {renderHojaBase(
        1,
        <>
          {/* Cintillo de Título Oficial */}
          <div
            style={{
              textAlign: "center",
              padding: "5px 10px",
              background: "linear-gradient(90deg, rgba(200,30,30,0.03) 0%, rgba(200,30,30,0.08) 50%, rgba(200,30,30,0.03) 100%)",
              borderTop: "1px solid rgba(200,30,30,0.25)",
              borderBottom: "1px solid rgba(200,30,30,0.25)",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: 1.5, color: "#991b1b", textTransform: "uppercase" }}>
              CERTIFICACIÓN OFICIAL DE ESCALERAS
            </div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: 0.3, marginTop: 1 }}>
              En cumplimiento con Norma ANSI ASC A14.5-2017 · ASTM D229/D790 · NTC 17025-2017 & Res. 4272 de 2021
            </div>
          </div>

          {/* Destinatario y Metadatos */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: "#475569", marginBottom: 3 }}>Envigado, {fmtL(fechaDoc)}</div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "#0f172a" }}>SEÑORES:</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: "1px 0" }}>
              {(cert.cliente || "").toUpperCase()}
            </div>
            {cert.nit && (
              <div style={{ fontSize: 11.5, color: "#334155" }}>
                NIT: <strong>{cert.nit}</strong>
              </div>
            )}
            {cert.lugar && (
              <div style={{ fontSize: 11.5, color: "#334155" }}>
                OBRA / PROYECTO: <strong>{cert.lugar.toUpperCase()}</strong>
              </div>
            )}
            {cert.direccion && (
              <div style={{ fontSize: 11.5, color: "#334155" }}>
                DIRECCIÓN: <strong>{cert.direccion.toUpperCase()}</strong>
              </div>
            )}
          </div>

          {/* Emisor Oficial y Declaración */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ textAlign: "center", fontWeight: 900, fontSize: 14.5, color: "#0f172a", letterSpacing: 1, marginBottom: 6 }}>
              INGEANCLAJES S.A.S
            </div>
            <div
              style={{
                textAlign: "justify",
                lineHeight: 1.5,
                fontSize: 12,
                color: "#0f172a",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: "8px 12px",
                borderLeft: "4px solid #b91c1c",
              }}
            >
              <strong>CERTIFICA: </strong>
              <span>{declaracionOficial}</span>
            </div>
          </div>

          {/* Sección 1: Materiales y componentes */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "#991b1b",
                borderBottom: "1.5px solid #e2e8f0",
                paddingBottom: 3,
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>1.</span>
              <span>MATERIALES Y COMPONENTES</span>
            </div>
            <div style={{ textAlign: "justify", fontSize: 11.5, lineHeight: 1.5, color: "#1e293b", marginBottom: 6 }}>
              Las escaleras <strong>ARTICO</strong> son fabricadas con materiales y componentes de alta calidad, los cuales han sido previamente seleccionados y validados para dar cumplimiento a los requisitos de calidad exigidos en la norma <strong>ANSI ASC A14.5-2017</strong>.
            </div>
            <div style={{ textAlign: "justify", fontSize: 11.5, lineHeight: 1.5, color: "#1e293b", marginBottom: 6 }}>
              La validación de los rieles utilizados en estas escaleras se realiza en laboratorios acreditados de acuerdo con lo establecido en planes de calidad internos y las Normas <strong>ASTM D229 – ASTM D790</strong>. Los resultados de los ensayos aplicados a los rieles; de tensión, compresión, flexión e impacto cumplen a cabalidad con los requisitos exigidos.
            </div>
            <div style={{ textAlign: "justify", fontSize: 11.5, lineHeight: 1.5, color: "#1e293b" }}>
              Los resultados de las pruebas de rigidez dieléctrica superan ampliamente los <strong>25 kV</strong> efectuada bajo la norma <strong>ASTM D149-2004</strong>.
            </div>
          </div>

          {/* Sección 2: Inspecciones */}
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "#991b1b",
                borderBottom: "1.5px solid #e2e8f0",
                paddingBottom: 3,
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>2.</span>
              <span>INSPECCIONES DE FABRICACIÓN</span>
            </div>
            <div style={{ textAlign: "justify", fontSize: 11.5, lineHeight: 1.5, color: "#1e293b" }}>
              El producto fue inspeccionado y liberado en cada una de las etapas de fabricación de acuerdo con el plan de calidad interno <strong>PC-CH-003</strong>, donde se definen los criterios de conformidad del producto en cada etapa. INGEANCLAJES S.A.S de acuerdo con los requisitos de la norma <strong>NTC 17025-2017</strong>.
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
          {/* Subtítulo Sección 3 */}
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "#991b1b",
                borderBottom: "1.5px solid #e2e8f0",
                paddingBottom: 3,
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>3.</span>
              <span>VALIDACIÓN DEL PRODUCTO TERMINADO Y ENSAYOS DE DESEMPEÑO</span>
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 3 }}>
              De acuerdo con los requisitos de la norma <strong>NTC 17025-2017</strong>.
            </div>
            <div style={{ textAlign: "justify", fontSize: 11, lineHeight: 1.45, color: "#1e293b", marginBottom: 6 }}>
              Las escaleras <strong>ARTICO</strong> han sido sometidas a pruebas de desempeño exigentes de acuerdo con la norma <strong>ANSI ASC A14.5-2017</strong>. Los requisitos de las pruebas han sido especificados con un amplio factor de seguridad para asegurar la capacidad de carga de acuerdo con su clasificación así:
            </div>
          </div>

          {/* Tabla 1: Capacidad de carga */}
          <div style={{ marginBottom: 8 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 10.5,
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9", color: "#0f172a", borderBottom: "1.5px solid #cbd5e1" }}>
                  <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 700 }}>TIPO DE ESCALERA</th>
                  <th style={{ padding: "4px 8px", textAlign: "center", fontWeight: 700 }}>PRUEBA</th>
                  <th style={{ padding: "4px 8px", textAlign: "center", fontWeight: 700 }}>REQUISITO</th>
                  <th style={{ padding: "4px 8px", textAlign: "center", fontWeight: 700 }}>CARGA DE PRUEBA</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#ffffff" }}>
                  <td style={{ padding: "4px 8px", fontWeight: 700, color: "#991b1b" }}>{tipoEscalera}</td>
                  <td style={{ padding: "4px 8px", textAlign: "center" }}>{capacidadCarga.prueba}</td>
                  <td style={{ padding: "4px 8px", textAlign: "center", fontWeight: 600 }}>{capacidadCarga.requisito}</td>
                  <td style={{ padding: "4px 8px", textAlign: "center", fontWeight: 700, color: "#15803d" }}>
                    {cert.cargaPrueba || capacidadCarga.cargaPrueba}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabla 2: 15 Pruebas de la Norma ANSI A14.5 */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>
              Pruebas aplicadas a este tipo de escaleras:
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 9.8,
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9", color: "#0f172a", borderBottom: "1.5px solid #cbd5e1" }}>
                  <th style={{ padding: "3px 8px", textAlign: "left", width: "22%", fontWeight: 700 }}>Numeral de la norma</th>
                  <th style={{ padding: "3px 8px", textAlign: "left", fontWeight: 700 }}>Descripción de la prueba</th>
                  <th style={{ padding: "3px 8px", textAlign: "center", width: "18%", fontWeight: 700 }}>Resultado</th>
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
                    <td style={{ padding: "2.5px 8px", fontWeight: 700, color: "#334155" }}>{p.numeral}</td>
                    <td style={{ padding: "2.5px 8px", color: "#1e293b" }}>{p.descripcion}</td>
                    <td style={{ padding: "2.5px 8px", textAlign: "center" }}>
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#15803d",
                          padding: "1px 6px",
                          borderRadius: 3,
                          fontWeight: 700,
                          fontSize: 9,
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
            <div style={{ fontSize: 9.5, color: "#64748b", fontStyle: "italic", marginTop: 3 }}>
              * Todas las pruebas no fueron aplicadas a este lote de fabricación, la periodicidad está definida en el plan de calidad interno.
            </div>
          </div>

          {/* Sección 4: Resultados */}
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#991b1b",
                borderBottom: "1.5px solid #e2e8f0",
                paddingBottom: 2,
                marginBottom: 3,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>4.</span>
              <span>RESULTADOS DE CONFORMIDAD</span>
            </div>
            <div style={{ textAlign: "justify", fontSize: 11, lineHeight: 1.45, color: "#1e293b" }}>
              Este producto cumple plenamente con los requisitos de conformidad de acuerdo con la norma <strong>ANSI ASC A14.5-2017</strong>.
            </div>
          </div>

          {/* Sección 5: Garantía */}
          <div style={{ marginBottom: 4 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#991b1b",
                borderBottom: "1.5px solid #e2e8f0",
                paddingBottom: 2,
                marginBottom: 3,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>5.</span>
              <span>GARANTÍA DE FABRICACIÓN</span>
            </div>
            <div style={{ textAlign: "justify", fontSize: 11, lineHeight: 1.45, color: "#1e293b" }}>
              La garantía por defectos de fabricación de las escaleras <strong>ARTICO</strong> es de <strong>dos (2) años</strong> a partir de la fecha de facturación; dicha garantía no cubre daños por el uso inadecuado, desgaste natural no atribuible a falla de materiales ni modificaciones no autorizadas de esta herramienta.
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          PÁGINA 3: RECOMENDACIONES, VIGENCIA ARL, FIRMA Y QR
          ══════════════════════════════════════════════════════════════════════════ */}
      {renderHojaBase(
        3,
        <>
          {/* Tarjeta de Vigencia Técnica ARL */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 6,
              padding: "7px 12px",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  Apta para auditorías SST, visitas de ARL e inspección oficial de trabajo en alturas.
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                Próxima Inspección Anual
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginTop: 1 }}>
                Antes del {fmtL(proxMant)}
              </div>
            </div>
          </div>

          {/* Recomendaciones Técnicas */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              padding: "9px 14px",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                marginBottom: 5,
                fontSize: 12,
                color: "#0f172a",
                textTransform: "uppercase",
                letterSpacing: 0.3,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>📋</span>
              <span>RECOMENDACIONES PARA TENER EN CUENTA</span>
            </div>
            <div style={{ fontSize: 11, marginBottom: 5, textAlign: "justify", color: "#334155" }}>
              A continuación, se realizan algunas recomendaciones para preservar en buen estado los sistemas anticaídas y escaleras certificados en dicha sede:
            </div>
            <ul style={{ marginLeft: 16, fontSize: 11, lineHeight: 1.5, marginBottom: 6, color: "#334155", paddingLeft: 0 }}>
              <li style={{ margin: "2px 0" }}>
                <strong>Dar aviso de inmediato</strong>, en caso de tener algún evento de caída o impacto por muy mínima que sea para hacer su respectiva valoración y diagnóstico.
              </li>
              <li style={{ margin: "2px 0" }}>
                <strong>Conectar máximo dos (2) personas</strong> por cada línea de vida o en cada tramo entre soportes laterales e intermedios.
              </li>
              <li style={{ margin: "2px 0" }}>
                <strong>No modificar ningún elemento</strong> del sistema ni de la escalera, ya que este puede perder sus funciones y generaría un riesgo más para las personas que las utilizan.
              </li>
              <li style={{ margin: "2px 0" }}>
                <strong>Limpiar de inmediato</strong> las estructuras u otro elemento que entren en contacto con los químicos de esta área.
              </li>
            </ul>
            <div style={{ fontSize: 10.5, textAlign: "justify", lineHeight: 1.45, color: "#475569", marginBottom: 5 }}>
              Estas recomendaciones son de carácter técnico, por lo tanto, su cumplimiento debe ser obligatorio para minimizar el riesgo generado por la falta y/o ausencia de algunos de sus elementos, ya que estos tienen como principal característica soportar las cargas generadas por la caída de una persona en la realización de trabajos en alturas. Se debe realizar el próximo mantenimiento preventivo de todo el sistema máximo dentro de un (1) año contado a partir de la expedición del presente documento (antes del {fmtL(proxMant)}).
            </div>
            <div
              style={{
                fontSize: 10.5,
                textAlign: "justify",
                lineHeight: 1.4,
                color: "#b45309",
                background: "#fffbeb",
                padding: "6px 9px",
                borderRadius: 4,
                border: "1px solid #fde68a",
              }}
            >
              ⚠️ <strong>Importante:</strong> Es importante señalar que, si la línea de vida o la estructura es impactada, ya sea de manera intencional o accidental, la revisión y reparación del sistema tendrá un costo adicional, ya que es necesario garantizar su correcto funcionamiento y la seguridad de los usuarios.
            </div>
          </div>

          {/* Cierre: Firma, Sello Oficial y Código QR */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: 10,
              marginBottom: 4,
            }}
          >
            {/* Firma del Ingeniero */}
            <div style={{ minWidth: 200 }}>
              <div style={{ fontSize: 11.5, color: "#475569", marginBottom: 2 }}>Cordialmente,</div>
              <div style={{ height: 48, display: "flex", alignItems: "flex-end" }}>
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
                  width: 74,
                  height: 74,
                  border: "1.5px dashed #c81e1e",
                  borderRadius: "50%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: 2,
                  color: "#c81e1e",
                  background: "rgba(200, 30, 30, 0.02)",
                  userSelect: "none",
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 0.3, textTransform: "uppercase" }}>
                  ESCALERA CONFORME
                </div>
                <div style={{ fontSize: 11.5, margin: "1px 0" }}>🪜</div>
                <div style={{ fontSize: 8.5, fontWeight: 900, lineHeight: 1.1 }}>
                  ANSI A14.5<br />NTC 17025
                </div>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.2 }}>INGEANCLAJES</div>
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
