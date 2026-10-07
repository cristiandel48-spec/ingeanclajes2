import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAppData } from "../../context/AppDataContext";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import PrintHeader from "../../components/print/PrintHeader";
import { fmtL, today as hoy } from "../../lib/format";
import { LOGO_INGEANCLAJES } from "../../assets/embeddedImages";
import { normalizarTextoCertificacion } from "../../lib/normalizarEntrada";

// Pone en negrita los datos del cliente dentro de una frase escrita en plano.
const conNegritas = (texto, datos)=>{
  const trozos = [...new Set((datos||[]).map((d)=>String(d||"").trim()).filter((d)=>d.length>2))]
    .sort((a,b)=>b.length-a.length);
  if(!trozos.length) return texto;

  const escapar = (t)=>t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patron = new RegExp(`(${trozos.map(escapar).join("|")})`, "gi");

  return String(texto||"").split(patron).map((parte,i)=>(
    trozos.some((t)=>t.toLowerCase()===parte.toLowerCase())
      ? <strong key={i}>{parte}</strong>
      : <span key={i}>{parte}</span>
  ));
};

// Formatea el párrafo del sistema certificado resaltando en negrita todos los datos dinámicos
const renderTextoSistema = (cert)=>{
  const t = String(cert?.sistema || "").trim();
  if(!t) return null;

  // Si viene en el formato crudo antiguo ("con NIT: ... con DIRECCIÓN: ..."), lo normalizamos a Opción A
  const textoLimpio = normalizarTextoCertificacion(t);

  const mVerbo = textoLimpio.match(/^(CERTIFICA|RECERTIFICA)\s+que\s+/i);
  if (mVerbo) {
    const verbo = mVerbo[1].toUpperCase();
    const afterVerbo = textoLimpio.slice(mVerbo[0].length);

    // Extraer fragmentos para negrita precisa
    const mDetalle = afterVerbo.match(/^los\s+sistemas\s+de\s+protecci[oó]n\s+contra\s+ca[ií]das\s+consistentes\s+en:\s*([^,]+)/i);
    const detalleTexto = mDetalle ? mDetalle[1].trim() : (cert?.detalle || "");

    const mLugar = afterVerbo.match(/instalados\s+en\s+([^,]+)/i);
    const lugarTexto = mLugar ? mLugar[1].trim() : (cert?.lugar || "");

    const mDir = afterVerbo.match(/ubicad[ao]\s+en\s+la\s+([^,]+)/i);
    const dirTexto = mDir ? mDir[1].trim() : (cert?.direccion || "");

    const mCli = afterVerbo.match(/a\s+solicitud\s+de\s+([^(,]+?)(?:\s*\(NIT:\s*([^)]+)\))?(?:,|$)/i);
    const cliTexto = mCli ? mCli[1].trim() : (cert?.cliente || "");
    const nitTexto = mCli && mCli[2] ? mCli[2].trim() : (cert?.nit || "");

    const trozosNegrita = [
      verbo,
      detalleTexto,
      lugarTexto,
      dirTexto,
      cliTexto,
      nitTexto,
      "fueron inspeccionados y verificados técnicamente",
      "estructuralmente conformes, operativos y aptos para trabajo seguro en alturas",
      cert?.normativa,
      "Resolución 4272 de 2021",
      ...(textoLimpio.match(/\([^)]+\)/g) || [])
    ].filter(Boolean);

    return conNegritas(textoLimpio, trozosNegrita);
  }

  return conNegritas(textoLimpio, [
    "CERTIFICA",
    "RECERTIFICA",
    cert?.nit,
    cert?.cliente,
    cert?.direccion,
    cert?.lugar,
    cert?.detalle,
    cert?.normativa,
    "Resolución 4272 de 2021",
    ...(textoLimpio.match(/\([^)]+\)/g) || [])
  ]);
};

function generarFranjaSeguridad(ancho = 44, alto = 1100) {
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

  // Filete fino de acento blanco translúcido en el borde derecho
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(ancho - 1.5, 0, 1.5, alto);

  // Texto vertical centrado legible y grande
  ctx.save();
  ctx.translate(ancho / 2, alto / 2);
  ctx.rotate(-Math.PI / 2);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 13px 'Segoe UI', -apple-system, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const texto = "INGEANCLAJES S.A.S · PROTOCOLO OFICIAL DE SEGURIDAD · RES. 4272/2021 & ANSI Z359";
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = "2.8px";
    ctx.fillText(texto, 0, 0);
  } else {
    const caracteres = texto.split("");
    const espaciado = 2.8;
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

export default function CertificacionDocumento({cert}){
  const {empresaConfig}=useAppData();
  const firmaImg=getFirmaImg(empresaConfig);
  const [qrUrl, setQrUrl] = useState("");
  const [linkVerificacion, setLinkVerificacion] = useState("");
  const [franjaUrl, setFranjaUrl] = useState(() => {
    try {
      return generarFranjaSeguridad(44, 1100);
    } catch {
      return "";
    }
  });

  const folioDoc = cert?.numero || cert?.id || "C-2026";

  useEffect(() => {
    if (!franjaUrl) {
      try {
        const u = generarFranjaSeguridad(44, 1100);
        if (u) setFranjaUrl(u);
      } catch (e) {
        console.warn("Error generando franja de seguridad:", e);
      }
    }
  }, [franjaUrl]);

  useEffect(() => {
    let activo = true;
    // URL web directa oficial en la aplicación desplegada
    const basePublica =
      typeof window !== "undefined" && window.location?.origin && !window.location.origin.includes("localhost")
        ? window.location.origin
        : "https://ingeanclajes2.vercel.app";

    const params = new URLSearchParams();
    params.set("v", "1");
    params.set("f", folioDoc);
    if (cert?.cliente) params.set("c", cert.cliente);
    if (cert?.nit) params.set("n", cert.nit);
    if (cert?.lugar) params.set("l", cert.lugar);
    if (cert?.fecha) params.set("fe", cert.fecha);
    if (cert?.proxMant) params.set("vm", cert.proxMant);
    if (cert?.tipo && cert.tipo !== "Certificación") params.set("t", cert.tipo);

    const url = `${basePublica}/?${params.toString()}`;
    setLinkVerificacion(url);

    QRCode.toDataURL(url, {
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
  }, [folioDoc, cert?.cliente, cert?.nit, cert?.lugar, cert?.fecha, cert?.proxMant, cert?.tipo]);

  if(!cert) return null;
  const esRecertificacion = cert.tipo==="Recertificación";
  const elementos = Array.isArray(cert.elementos) ? cert.elementos : [];

  return(
    <div
      id="pz"
      data-bleed-left="true"
      className="doc-shell"
      style={{
        background: "#fff",
        color: "#111",
        fontFamily: "'Aptos','Segoe UI',sans-serif",
        fontSize: 11,
        lineHeight: 1.6,
        border: "1px solid #ddd",
        borderRadius: 4,
        padding: 0,
        position: "relative",
        overflow: "hidden",
        width: "100%",
        maxWidth: 816,
        minHeight: 1056,
        boxSizing: "border-box"
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

      {/* Marca de agua sutil en el fondo (usando div background para no interferir en cálculo de páginas) */}
      <div
        style={{
          position: "absolute",
          top: "48%",
          left: "52%",
          transform: "translate(-50%, -50%) rotate(-12deg)",
          width: 380,
          height: 380,
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

      {/* Contenedor interno con márgenes controlados para separación perfecta de la franja */}
      <div style={{ marginLeft: 62, marginRight: 22, paddingTop: 20, paddingBottom: 18, position: "relative", zIndex: 1, minHeight: 1056, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>

        {/* Encabezado Oficial */}
        <div style={{ padding: "0 0 10px" }}>
          <PrintHeader dual={true} formato="certificacion" empresaConfig={empresaConfig} numeroDocumento={folioDoc}/>
        </div>

        {/* Cintillo de Título Oficial */}
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
          <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 2, color: "#991b1b", textTransform: "uppercase" }}>
            {esRecertificacion ? "Recertificación Oficial de Sistemas Anticaídas" : "Certificación Oficial de Sistemas Anticaídas"}
          </div>
          <div style={{ fontSize: 9.5, color: "#64748b", fontWeight: 600, letterSpacing: 0.4, marginTop: 2 }}>
            En estricto cumplimiento con la Resolución 4272 de 2021 del Ministerio del Trabajo & Norma ANSI Z359
          </div>
        </div>

        {/* Destinatario y Metadatos */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, color: "#475569", marginBottom: 3 }}>Envigado, {fmtL(cert.fecha || hoy())}</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>SEÑORES:</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", margin: "1px 0" }}>{(cert.cliente||"").toUpperCase()}</div>
          {cert.nit && <div style={{ fontSize: 10.5, color: "#334155" }}>NIT: <strong>{cert.nit}</strong></div>}
          {cert.direccion && <div style={{ fontSize: 10.5, color: "#334155" }}>DIRECCIÓN: <strong>{cert.direccion.toUpperCase()}</strong></div>}
        </div>

        {/* Emisor Oficial */}
        <div style={{ textAlign: "center", fontWeight: 900, fontSize: 14.5, color: "#0f172a", letterSpacing: 1, marginBottom: 12 }}>
          INGEANCLAJES S.A.S
        </div>

        {/* Texto del Sistema Certificado */}
        <div style={{ textAlign: "justify", marginBottom: 14, lineHeight: 1.68, fontSize: 11.5, color: "#1e293b" }}>
          {renderTextoSistema(cert)}
        </div>

        {/* Elementos Estructurales Certificados */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: "#0f172a", marginBottom: 5 }}>
            Componentes y elementos utilizados en dicha labor:
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: elementos.length > 3 ? "1fr 1fr" : "1fr",
            gap: "4px 16px",
            paddingLeft: 4,
            marginBottom: 8,
          }}>
            {elementos.map((el, i) => (
              <div key={i} style={{ fontSize: 10.5, color: "#334155", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 5, height: 5, background: "#c81e1e", borderRadius: "50%", flexShrink: 0 }} />
                <span>{el}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cierre Técnico de los Componentes */}
        <div style={{ textAlign: "justify", marginBottom: 14, lineHeight: 1.6, fontSize: 11, color: "#334155" }}>
          Dichos componentes garantizan la fijación, retención y detención segura de los trabajadores durante la ejecución de labores con riesgo de caída en alturas. Todos los elementos que componen los sistemas certificados se encuentran en excelente estado técnico y operativo.
        </div>

        {/* Tarjeta de Vigencia Técnica ARL */}
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
            breakInside: "avoid",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 24,
                height: 24,
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
              <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: 0.3 }}>
                Certificación Vigente y Homologada
              </div>
              <div style={{ fontSize: 9.5, color: "#15803d", marginTop: 1 }}>
                Apta para auditorías SST, visitas de ARL e inspección de trabajo en alturas.
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
              Próxima Inspección Anual
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "#0f172a", marginTop: 1 }}>
              {cert.proxMant ? `Antes del ${fmtL(cert.proxMant)}` : "Plazo máximo: 12 meses"}
            </div>
          </div>
        </div>

        {/* Recomendaciones Técnicas */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 14px", marginBottom: 18, breakInside: "avoid" }}>
          <div style={{ fontWeight: 800, marginBottom: 5, fontSize: 10.5, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.4 }}>
            RECOMENDACIONES PARA TENER EN CUENTA
          </div>
          <div style={{ fontSize: 10, marginBottom: 5, textAlign: "justify", color: "#334155" }}>
            A continuación, se realizan algunas recomendaciones para preservar en buen estado los sistemas anticaídas certificados en dicha sede:
          </div>
          <ul style={{ marginLeft: 16, fontSize: 10, lineHeight: 1.55, marginBottom: 5, color: "#334155" }}>
            <li style={{ margin: "2px 0" }}>Dar aviso de inmediato en caso de registrarse algún evento de caída o impacto para su valoración y diagnóstico.</li>
            <li style={{ margin: "2px 0" }}>Conectar como máximo dos personas por cada línea de vida o en cada tramo entre soportes laterales e intermedios.</li>
            <li style={{ margin: "2px 0" }}>No modificar ningún elemento del sistema, ya que puede perder sus funciones y generar riesgo para los usuarios.</li>
            <li style={{ margin: "2px 0" }}>Limpiar de inmediato las estructuras u otros elementos que entren en contacto con químicos en el área.</li>
          </ul>
          <div style={{ fontSize: 9.8, textAlign: "justify", lineHeight: 1.5, color: "#475569" }}>
            Estas recomendaciones son de carácter técnico; su cumplimiento es obligatorio para minimizar el riesgo en trabajo en alturas. Se debe realizar el próximo mantenimiento preventivo de todo el sistema máximo dentro de un (1) año contado a partir de la expedición del presente documento{cert.proxMant ? " (antes del " + fmtL(cert.proxMant) + ")" : "."}.
          </div>
        </div>

        {/* Cierre: Firma, Sello Oficial y Código QR */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: 10,
            marginBottom: 16,
            breakInside: "avoid",
          }}
        >
          {/* Firma del Ingeniero */}
          <div style={{ minWidth: 220 }}>
            <div style={{ fontSize: 10.5, color: "#475569", marginBottom: 2 }}>Cordialmente,</div>
            <div style={{ height: 50, display: "flex", alignItems: "flex-end" }}>
              {firmaImg && <img src={firmaImg} alt="Firma" style={{ maxHeight: 48, maxWidth: 210, objectFit: "contain" }}/>}
            </div>
            <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: 4, display: "inline-block", minWidth: 220 }}>
              <div style={{ fontWeight: 800, fontSize: 11.5, color: "#0f172a" }}>{cert.ingeniero}</div>
              <div style={{ fontSize: 9.5, color: "#475569", fontWeight: 600 }}>{cert.cargo || "Gerente General"}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#0f172a" }}>{cert.matricula}</div>
            </div>
          </div>

          {/* Sello y QR de Validación */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Sello Oficial Circular */}
            <div
              style={{
                width: 82,
                height: 82,
                border: "1.5px dashed #c81e1e",
                borderRadius: "50%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: 3,
                color: "#c81e1e",
                background: "rgba(200, 30, 30, 0.02)",
                userSelect: "none",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: 0.3, textTransform: "uppercase" }}>SISTEMA CONFORME</div>
              <div style={{ fontSize: 12, margin: "1px 0" }}>⚙️</div>
              <div style={{ fontSize: 8, fontWeight: 900, lineHeight: 1.1 }}>RES. 4272<br/>2021</div>
              <div style={{ fontSize: 6, fontWeight: 700, letterSpacing: 0.2 }}>INGEANCLAJES</div>
            </div>

            {/* Código QR con Folio */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#ffffff",
                border: "1.5px solid #cbd5e1",
                borderRadius: 8,
                padding: "8px 10px",
                flexShrink: 0,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {qrUrl ? (
                <a
                  href={linkVerificacion || `https://ingeanclajes2.vercel.app/?v=1&f=${encodeURIComponent(folioDoc)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "block", textDecoration: "none" }}
                  title="Clic para verificar autenticidad en línea"
                >
                  <img src={qrUrl} alt="QR Validación" style={{ width: 96, height: 96, display: "block", borderRadius: 3 }}/>
                </a>
              ) : (
                <div style={{ width: 96, height: 96, background: "#e2e8f0", borderRadius: 3 }}/>
              )}
              <div style={{ fontSize: 8, color: "#475569", lineHeight: 1.35, maxWidth: 120 }}>
                <strong style={{ fontSize: 9.5, color: "#0f172a", display: "block", marginBottom: 3 }}>VERIFICACIÓN DIGITAL</strong>
                Escanea para validar autenticidad y vigencia
                <div style={{ fontFamily: "monospace", fontSize: 9.5, fontWeight: 800, color: "#c81e1e", marginTop: 4 }}>
                  FOLIO: {folioDoc}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie de página oficial */}
        <div
          style={{
            borderTop: "1px solid #cbd5e1",
            paddingTop: 6,
            marginTop: "auto",
            textAlign: "center",
            fontSize: 8.5,
            color: "#64748b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>Calle 38 sur # 36 - 48, Envigado · PBX (604) 448 26 86 · Cel. 314 863 40 72</div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>INGEANCLAJES S.A.S · NIT 900.193.965-4</div>
          <div>Página 1 de 1</div>
        </div>

      </div>
    </div>
  );
}

