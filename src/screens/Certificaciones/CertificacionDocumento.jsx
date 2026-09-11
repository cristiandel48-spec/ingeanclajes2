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
      width: 130,
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
        fontSize: 11.5,
        lineHeight: 1.65,
        border: "1px solid #ddd",
        borderRadius: 4,
        padding: "32px 36px 32px 48px",
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
          width: 22,
          background: "linear-gradient(180deg, #991b1b 0%, #c81e1e 50%, #991b1b 100%)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontSize: 7,
          fontWeight: 800,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          userSelect: "none",
          zIndex: 4,
        }}
      >
        INGEANCLAJES S.A.S · PROTOCOLO OFICIAL DE SEGURIDAD · RES. 4272/2021 & ANSI Z359
      </div>

      {/* Marca de agua sutil en el fondo */}
      <img
        src={LOGO_INGEANCLAJES}
        alt=""
        style={{
          position: "absolute",
          top: "48%",
          left: "52%",
          transform: "translate(-50%, -50%) rotate(-12deg)",
          width: 430,
          maxWidth: "80%",
          opacity: 0.038,
          pointerEvents: "none",
          zIndex: 0,
          userSelect: "none",
        }}
      />

      {/* Encabezado Oficial */}
      <div style={{padding: "0 0 12px", position: "relative", zIndex: 1}}>
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
          marginBottom: 16,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{fontSize: 11.5, fontWeight: 800, letterSpacing: 2, color: "#991b1b", textTransform: "uppercase"}}>
          {esRecertificacion ? "Recertificación Oficial de Sistemas Anticaídas" : "Certificación Oficial de Sistemas Anticaídas"}
        </div>
        <div style={{fontSize: 9, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, marginTop: 1}}>
          En estricto cumplimiento con la Resolución 4272 de 2021 del Ministerio del Trabajo & Norma ANSI Z359
        </div>
      </div>

      {/* Destinatario y Metadatos */}
      <div style={{marginBottom: 16, position: "relative", zIndex: 1}}>
        <div style={{fontSize: 11, color: "#475569", marginBottom: 6}}>Envigado, {fmtL(cert.fecha || hoy())}</div>
        <div style={{fontSize: 10.5, fontWeight: 800, color: "#0f172a"}}>SEÑORES:</div>
        <div style={{fontSize: 12.5, fontWeight: 800, color: "#0f172a"}}>{(cert.cliente||"").toUpperCase()}</div>
        {cert.nit&&<div style={{fontSize: 11, color: "#334155"}}>NIT: <strong>{cert.nit}</strong></div>}
        {cert.direccion&&<div style={{fontSize: 11, color: "#334155"}}>DIRECCIÓN: <strong>{cert.direccion.toUpperCase()}</strong></div>}
      </div>

      {/* Emisor Oficial */}
      <div style={{textAlign: "center", fontWeight: 900, fontSize: 14, color: "#0f172a", letterSpacing: 0.8, marginBottom: 14, position: "relative", zIndex: 1}}>
        INGEANCLAJES S.A.S
      </div>

      {/* Texto del Sistema Certificado */}
      <div style={{textAlign: "justify", marginBottom: 14, lineHeight: 1.75, fontSize: 11, color: "#1e293b", position: "relative", zIndex: 1}}>
        {conNegritas(cert.sistema, [cert.nit, cert.cliente, cert.direccion, cert.lugar])}
      </div>

      {/* Elementos Estructurales Certificados */}
      <div style={{marginBottom: 14, position: "relative", zIndex: 1}}>
        <div style={{fontWeight: 700, fontSize: 10.5, color: "#0f172a", marginBottom: 6}}>
          Componentes y elementos utilizados en dicha labor:
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: elementos.length > 3 ? "1fr 1fr" : "1fr",
          gap: "4px 16px",
          paddingLeft: 6,
          marginBottom: 12,
        }}>
          {elementos.map((el, i) => (
            <div key={i} style={{fontSize: 10, color: "#334155", display: "flex", alignItems: "center", gap: 6}}>
              <span style={{width: 4.5, height: 4.5, background: "#c81e1e", borderRadius: "50%", flexShrink: 0}} />
              <span>{el}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cierre Técnico del Alcance */}
      <div style={{textAlign: "justify", marginBottom: 14, lineHeight: 1.7, fontSize: 10.5, color: "#334155", position: "relative", zIndex: 1}}>
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
          borderRadius: 8,
          padding: "8px 14px",
          marginBottom: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
          breakInside: "avoid",
        }}
      >
        <div style={{display: "flex", alignItems: "center", gap: 10}}>
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
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          <div>
            <div style={{fontSize: 10.5, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: 0.4}}>
              Certificación Vigente y Homologada
            </div>
            <div style={{fontSize: 9.5, color: "#15803d"}}>
              Apta para auditorías SST, visitas de ARL e inspección de trabajo en alturas.
            </div>
          </div>
        </div>
        <div style={{textAlign: "right"}}>
          <div style={{fontSize: 8.5, fontWeight: 700, color: "#166534", textTransform: "uppercase"}}>
            Próxima Inspección Anual
          </div>
          <div style={{fontSize: 11, fontWeight: 800, color: "#0f172a"}}>
            {cert.proxMant ? `Antes del ${fmtL(cert.proxMant)}` : "Plazo máximo: 12 meses"}
          </div>
        </div>
      </div>

      {/* Recomendaciones Técnicas */}
      <div style={{background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 14px", marginBottom: 14, position: "relative", zIndex: 1, breakInside: "avoid"}}>
        <div style={{fontWeight: 800, marginBottom: 6, fontSize: 10, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5}}>
          RECOMENDACIONES PARA TENER EN CUENTA
        </div>
        <div style={{fontSize: 10, marginBottom: 6, textAlign: "justify", color: "#334155"}}>
          A continuación, se realizan algunas recomendaciones para preservar en buen estado los sistemas anticaídas certificados en dicha sede:
        </div>
        <ul style={{marginLeft: 16, fontSize: 9.5, lineHeight: 1.6, marginBottom: 6, color: "#334155"}}>
          <li>Dar aviso de inmediato, en caso de tener algún evento de caída por muy mínima que sea para hacer su respectiva valoración y diagnóstico.</li>
          <li>Conectar máximo dos personas por cada línea de vida o en cada tramo entre soportes laterales e intermedios.</li>
          <li>No modificar ningún elemento del sistema, ya que este puede perder sus funciones y generaría un riesgo para las personas que las utilizan.</li>
          <li>Limpiar de inmediato las estructuras u otro elemento que entren en contacto con los químicos de esta área.</li>
        </ul>
        <div style={{fontSize: 9.5, textAlign: "justify", lineHeight: 1.5, color: "#475569"}}>
          Estas recomendaciones son de carácter técnico; su cumplimiento es obligatorio para minimizar el riesgo en trabajo en alturas. Se debe realizar el próximo mantenimiento preventivo de todo el sistema máximo dentro de un (1) año contado a partir de la expedición del presente documento{cert.proxMant ? " (antes del " + fmtL(cert.proxMant) + ")" : "."}.
        </div>
      </div>

      {/* Cierre: Firma, Sello Oficial y Código QR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: 14,
          position: "relative",
          zIndex: 1,
          breakInside: "avoid",
        }}
      >
        {/* Firma del Ingeniero */}
        <div style={{minWidth: 220}}>
          <div style={{fontSize: 10.5, color: "#475569", marginBottom: 2}}>Cordialmente,</div>
          <div style={{height: 56, display: "flex", alignItems: "flex-end"}}>
            {firmaImg && <img src={firmaImg} alt="Firma" style={{maxHeight: 54, maxWidth: 210, objectFit: "contain"}}/>}
          </div>
          <div style={{borderTop: "1.5px solid #0f172a", paddingTop: 6, display: "inline-block", minWidth: 220}}>
            <div style={{fontWeight: 800, fontSize: 11, color: "#0f172a"}}>{cert.ingeniero}</div>
            <div style={{fontSize: 9.5, color: "#475569"}}>Especialista en Estructuras y Trabajo en Alturas</div>
            <div style={{fontSize: 9, fontWeight: 700, color: "#0f172a"}}>{cert.matricula}</div>
          </div>
        </div>

        {/* Sello Oficial y QR de Validación */}
        <div style={{display: "flex", alignItems: "center", gap: 12}}>
          {/* Sello Oficial Circular */}
          <div
            style={{
              width: 80,
              height: 80,
              border: "1.8px dashed #c81e1e",
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
            <div style={{fontSize: 6.5, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase"}}>SISTEMA CONFORME</div>
            <div style={{fontSize: 11, margin: "1px 0"}}>⚙️</div>
            <div style={{fontSize: 7.5, fontWeight: 900, lineHeight: 1.1}}>RES. 4272<br/>2021</div>
            <div style={{fontSize: 5.5, fontWeight: 700, letterSpacing: 0.2}}>INGEANCLAJES</div>
          </div>

          {/* Código QR con Folio */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: 7,
              padding: "6px 8px",
              flexShrink: 0,
            }}
          >
            {qrUrl ? (
              <img src={qrUrl} alt="QR Validación" style={{width: 52, height: 52, display: "block", borderRadius: 3}}/>
            ) : (
              <div style={{width: 52, height: 52, background: "#e2e8f0", borderRadius: 3}}/>
            )}
            <div style={{fontSize: 7.5, color: "#475569", lineHeight: 1.3, maxWidth: 110}}>
              <strong style={{fontSize: 8, color: "#0f172a", display: "block", marginBottom: 1}}>VERIFICACIÓN DIGITAL</strong>
              Escanee para validar autenticidad y vigencia
              <div style={{fontFamily: "monospace", fontSize: 7.5, fontWeight: 700, color: "#c81e1e", marginTop: 2}}>
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
          paddingTop: 8,
          marginTop: 22,
          textAlign: "center",
          fontSize: 8.5,
          color: "#64748b",
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>Calle 38 sur # 36 - 48, Envigado · PBX (604) 448 26 86 · Cel. 314 863 40 72</div>
        <div style={{fontWeight: 700, color: "#0f172a"}}>INGEANCLAJES S.A.S · NIT 900.193.965-4</div>
        <div>Página 1 de 1</div>
      </div>
    </div>
  );
}

