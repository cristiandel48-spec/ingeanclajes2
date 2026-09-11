import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAppData } from "../../context/AppDataContext";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import PrintHeader from "../../components/print/PrintHeader";
import { fmtL, today as hoy } from "../../lib/format";
import { LOGO_INGEANCLAJES } from "../../assets/embeddedImages";

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

export default function CertificacionDocumento({cert}){
  const {empresaConfig}=useAppData();
  const firmaImg=getFirmaImg(empresaConfig);
  const [qrUrl, setQrUrl] = useState("");

  const folioDoc = cert?.numero || cert?.id || "C-2026";

  useEffect(() => {
    let activo = true;
    const textoValidacion = `https://www.ingeanclajessas.com/verificar?folio=${encodeURIComponent(folioDoc)}&nit=${encodeURIComponent(cert?.nit || "")}`;
    QRCode.toDataURL(textoValidacion, {
      width: 120,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (activo) setQrUrl(url);
      })
      .catch((err) => console.warn("Error generando QR:", err));
    return () => {
      activo = false;
    };
  }, [folioDoc, cert?.nit]);

  if(!cert) return null;
  const esRecertificacion = cert.tipo==="Recertificación";
  const elementos = Array.isArray(cert.elementos) ? cert.elementos : [];

  return(
    <div
      id="pz"
      className="doc-shell"
      style={{
        background: "#fff",
        color: "#111",
        fontFamily: "'Aptos','Segoe UI',sans-serif",
        fontSize: 10.5,
        lineHeight: 1.55,
        border: "1px solid #ddd",
        borderRadius: 4,
        padding: "20px 24px 20px 32px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Franja lateral de seguridad oficial (Opción 3) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 18,
          background: "linear-gradient(180deg, #991b1b 0%, #c81e1e 50%, #991b1b 100%)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontSize: 6.5,
          fontWeight: 800,
          letterSpacing: 2,
          textTransform: "uppercase",
          userSelect: "none",
          zIndex: 4,
        }}
      >
        INGEANCLAJES S.A.S · PROTOCOLO OFICIAL DE SEGURIDAD · RES. 4272/2021 & ANSI Z359
      </div>

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

      {/* Contenedor interno desplazado para no tocar la franja roja */}
      <div style={{ marginLeft: 26, paddingRight: 4, position: "relative", zIndex: 1 }}>

        {/* Encabezado Oficial */}
        <div style={{ padding: "0 0 8px" }}>
          <PrintHeader dual={true} formato="certificacion" empresaConfig={empresaConfig} numeroDocumento={folioDoc}/>
        </div>

        {/* Cintillo de Título Oficial */}
        <div
          style={{
            textAlign: "center",
            padding: "4px 10px",
            background: "linear-gradient(90deg, rgba(200,30,30,0.03) 0%, rgba(200,30,30,0.08) 50%, rgba(200,30,30,0.03) 100%)",
            borderTop: "1px solid rgba(200,30,30,0.25)",
            borderBottom: "1px solid rgba(200,30,30,0.25)",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#991b1b", textTransform: "uppercase" }}>
            {esRecertificacion ? "Recertificación Oficial de Sistemas Anticaídas" : "Certificación Oficial de Sistemas Anticaídas"}
          </div>
          <div style={{ fontSize: 8.5, color: "#64748b", fontWeight: 600, letterSpacing: 0.4, marginTop: 1 }}>
            En estricto cumplimiento con la Resolución 4272 de 2021 del Ministerio del Trabajo & Norma ANSI Z359
          </div>
        </div>

        {/* Destinatario y Metadatos */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>Envigado, {fmtL(cert.fecha || hoy())}</div>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#0f172a" }}>SEÑORES:</div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: "#0f172a" }}>{(cert.cliente||"").toUpperCase()}</div>
          {cert.nit && <div style={{ fontSize: 10, color: "#334155" }}>NIT: <strong>{cert.nit}</strong></div>}
          {cert.direccion && <div style={{ fontSize: 10, color: "#334155" }}>DIRECCIÓN: <strong>{cert.direccion.toUpperCase()}</strong></div>}
        </div>

        {/* Emisor Oficial */}
        <div style={{ textAlign: "center", fontWeight: 900, fontSize: 13, color: "#0f172a", letterSpacing: 0.8, marginBottom: 8 }}>
          INGEANCLAJES S.A.S
        </div>

        {/* Texto del Sistema Certificado */}
        <div style={{ textAlign: "justify", marginBottom: 10, lineHeight: 1.6, fontSize: 10.5, color: "#1e293b" }}>
          {conNegritas(cert.sistema, [cert.nit, cert.cliente, cert.direccion, cert.lugar])}
        </div>

        {/* Elementos Estructurales Certificados */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 10, color: "#0f172a", marginBottom: 4 }}>
            Componentes y elementos utilizados en dicha labor:
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: elementos.length > 3 ? "1fr 1fr" : "1fr",
            gap: "2px 14px",
            paddingLeft: 4,
            marginBottom: 8,
          }}>
            {elementos.map((el, i) => (
              <div key={i} style={{ fontSize: 9.5, color: "#334155", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 4, height: 4, background: "#c81e1e", borderRadius: "50%", flexShrink: 0 }} />
                <span>{el}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cierre Técnico del Alcance */}
        <div style={{ textAlign: "justify", marginBottom: 10, lineHeight: 1.5, fontSize: 10, color: "#334155" }}>
          cuyo objetivo es la fijación segura de los trabajadores al momento de realizar tareas que
          impliquen riesgo de caída, cumplen a cabalidad con la {cert.normativa || "Resolución 4272 de 2021"} del Ministerio
          del Trabajo, por la cual se establece el reglamento de seguridad para protección contra caídas
          en trabajo en alturas. Todos los elementos que componen los diferentes sistemas anticaídas
          se encuentran en excelente estado técnico y operativo.
        </div>

        {/* Tarjeta de Vigencia Técnica ARL */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 6,
            padding: "6px 12px",
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            breakInside: "avoid",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#16a34a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 11,
                flexShrink: 0,
              }}
            >
              ✓
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: 0.3 }}>
                Certificación Vigente y Homologada
              </div>
              <div style={{ fontSize: 8.5, color: "#15803d" }}>
                Apta para auditorías SST, visitas de ARL e inspección de trabajo en alturas.
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
              Próxima Inspección Anual
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "#0f172a" }}>
              {cert.proxMant ? `Antes del ${fmtL(cert.proxMant)}` : "Plazo máximo: 12 meses"}
            </div>
          </div>
        </div>

        {/* Recomendaciones Técnicas */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px", marginBottom: 10, breakInside: "avoid" }}>
          <div style={{ fontWeight: 800, marginBottom: 4, fontSize: 9.5, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.4 }}>
            RECOMENDACIONES PARA TENER EN CUENTA
          </div>
          <div style={{ fontSize: 9, marginBottom: 4, textAlign: "justify", color: "#334155" }}>
            A continuación, se realizan algunas recomendaciones para preservar en buen estado los sistemas anticaídas certificados en dicha sede:
          </div>
          <ul style={{ marginLeft: 14, fontSize: 9, lineHeight: 1.45, marginBottom: 4, color: "#334155" }}>
            <li>Dar aviso de inmediato en caso de registrarse algún evento de caída o impacto para su valoración y diagnóstico.</li>
            <li>Conectar como máximo dos personas por cada línea de vida o en cada tramo entre soportes laterales e intermedios.</li>
            <li>No modificar ningún elemento del sistema, ya que puede perder sus funciones y generar riesgo para los usuarios.</li>
            <li>Limpiar de inmediato las estructuras u otros elementos que entren en contacto con químicos en el área.</li>
          </ul>
          <div style={{ fontSize: 9, textAlign: "justify", lineHeight: 1.4, color: "#475569" }}>
            Estas recomendaciones son de carácter técnico; su cumplimiento es obligatorio para minimizar el riesgo en trabajo en alturas. Se debe realizar el próximo mantenimiento preventivo de todo el sistema máximo dentro de un (1) año contado a partir de la expedición del presente documento{cert.proxMant ? " (antes del " + fmtL(cert.proxMant) + ")" : "."}.
          </div>
        </div>

        {/* Cierre: Firma, Sello Oficial y Código QR */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: 8,
            breakInside: "avoid",
          }}
        >
          {/* Firma del Ingeniero */}
          <div style={{ minWidth: 200 }}>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>Cordialmente,</div>
            <div style={{ height: 46, display: "flex", alignItems: "flex-end" }}>
              {firmaImg && <img src={firmaImg} alt="Firma" style={{ maxHeight: 44, maxWidth: 190, objectFit: "contain" }}/>}
            </div>
            <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: 4, display: "inline-block", minWidth: 200 }}>
              <div style={{ fontWeight: 800, fontSize: 10.5, color: "#0f172a" }}>{cert.ingeniero}</div>
              <div style={{ fontSize: 9, color: "#475569" }}>Especialista en Estructuras y Trabajo en Alturas</div>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: "#0f172a" }}>{cert.matricula}</div>
            </div>
          </div>

          {/* Sello y QR de Validación */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Sello Oficial Circular */}
            <div
              style={{
                width: 70,
                height: 70,
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
              <div style={{ fontSize: 6, fontWeight: 800, letterSpacing: 0.3, textTransform: "uppercase" }}>SISTEMA CONFORME</div>
              <div style={{ fontSize: 10, margin: "1px 0" }}>⚙️</div>
              <div style={{ fontSize: 7, fontWeight: 900, lineHeight: 1.1 }}>RES. 4272<br/>2021</div>
              <div style={{ fontSize: 5, fontWeight: 700, letterSpacing: 0.2 }}>INGEANCLAJES</div>
            </div>

            {/* Código QR con Folio */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "5px 7px",
                flexShrink: 0,
              }}
            >
              {qrUrl ? (
                <img src={qrUrl} alt="QR Validación" style={{ width: 44, height: 44, display: "block", borderRadius: 2 }}/>
              ) : (
                <div style={{ width: 44, height: 44, background: "#e2e8f0", borderRadius: 2 }}/>
              )}
              <div style={{ fontSize: 7, color: "#475569", lineHeight: 1.25, maxWidth: 105 }}>
                <strong style={{ fontSize: 7.5, color: "#0f172a", display: "block", marginBottom: 1 }}>VERIFICACIÓN DIGITAL</strong>
                Valida autenticidad y vigencia
                <div style={{ fontFamily: "monospace", fontSize: 7, fontWeight: 700, color: "#c81e1e", marginTop: 1 }}>
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
            marginTop: 12,
            textAlign: "center",
            fontSize: 8,
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

