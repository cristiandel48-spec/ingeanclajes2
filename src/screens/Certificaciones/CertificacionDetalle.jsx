import CertificacionDocumento from "./CertificacionDocumento";
import { useState } from "react";
import { B } from "../../styles/tokens";
import { descargarDocumentoPdf } from "../../lib/documentoPdf";
import { fmtD } from "../../lib/format";

export default function CertificacionDetalle({cert,onVolver,onEditar,onImprimir,mostrarBotones=false,subtitle="Vista previa del documento"}) {
  const [generando,setGenerando]=useState(false);
  if(!cert) return null;

  // Descarga directa: el PDF sale sin el encabezado ni el pie que Chrome
  // estampa al imprimir («about:blank», la fecha, el numero de pagina).
  const descargar=async()=>{
    setGenerando(true);
    try{
      // Al nombre del archivo se le pone tambien el proyecto: en una carpeta
      // con varias certificaciones, "CERT-002" a secas no dice de cual obra
      // es. Queda "Recertificación CERT-002 CREAFAM SEDE SAN BLAS".
      const proyecto = cert.lugar || cert.cliente || "";
      await descargarDocumentoPdf(
        document.getElementById("pz"),
        `${cert.tipo || "Certificación"} ${cert.numero || cert.id || ""} ${proyecto}`
          .replace(/\s+/g, " ")
          .trim(),
      );
    }catch(fallo){
      window.alert(fallo.message || "No se pudo generar el PDF.");
    }finally{
      setGenerando(false);
    }
  };

  const diasHastaVencer = cert.proxMant ? Math.ceil((new Date(cert.proxMant + "T00:00:00") - new Date()) / 86400000) : null;
  const estadoVigencia = diasHastaVencer === null
    ? { label: "Sin fecha programada", bg: "rgba(148, 163, 184, 0.12)", color: "#64748b" }
    : diasHastaVencer < 0
    ? { label: `Venció hace ${Math.abs(diasHastaVencer)} días`, bg: "rgba(239, 68, 68, 0.12)", color: "#dc2626" }
    : diasHastaVencer <= 30
    ? { label: `Vence en ${diasHastaVencer} días`, bg: "rgba(245, 158, 11, 0.12)", color: "#d97706" }
    : { label: `Vigente · Inspección en ${diasHastaVencer}d`, bg: "rgba(16, 185, 129, 0.12)", color: "#059669" };

  return(
    <div>
      {mostrarBotones && (
        <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
          <button style={{...B("var(--btn-cancelar-bg, #f1f5f9)","var(--btn-cancelar-txt, #475569)"),padding:"8px 16px",borderRadius:8}} onClick={onVolver}>← Volver</button>
          {typeof onEditar==="function" && <button style={{...B("rgba(30, 64, 175, 0.1)","#2563eb"),border:"1px solid rgba(37,99,235,0.25)",padding:"8px 16px",borderRadius:8}} onClick={()=>onEditar(cert)}>✏️ Editar</button>}
          <button style={{...B("#E0342A","#ffffff"),boxShadow:"0 2px 8px rgba(224,52,42,0.25)",padding:"8px 18px",borderRadius:8,opacity:generando?0.65:1}} disabled={generando} onClick={descargar}>
            {generando ? "Generando…" : "📥 Descargar PDF"}
          </button>
          {typeof onImprimir==="function" && <button style={{...B("var(--btn-cancelar-bg, #f1f5f9)","var(--btn-cancelar-txt, #475569)"),padding:"8px 16px",borderRadius:8}} onClick={()=>onImprimir(cert)}>🖨️ Imprimir</button>}
        </div>
      )}

      {/* Dossier Técnico Oficial Card */}
      <div style={{
        background: "var(--card-bg, #ffffff)",
        border: "1px solid var(--border-color, #e2e8f0)",
        borderRadius: 14,
        padding: "16px 20px",
        marginBottom: 20,
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16
      }}>
        <div style={{minWidth:260}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <span style={{
              background: "rgba(224, 52, 42, 0.1)",
              color: "#E0342A",
              fontSize: 10.5,
              fontWeight: 800,
              padding: "3px 8px",
              borderRadius: 6,
              textTransform: "uppercase",
              letterSpacing: 0.8
            }}>
              Dossier Técnico Oficial
            </span>
            <span style={{fontSize:12,fontWeight:700,color:"var(--text-subtle, #64748b)"}}>
              Folio {cert.numero || cert.id || "S/N"}
            </span>
          </div>
          <div style={{fontSize:17,fontWeight:800,color:"var(--text-main, #0f172a)",lineHeight:1.3}}>
            {cert.cliente || "Certificación Técnica"}
          </div>
          <div style={{fontSize:12.5,color:"var(--text-subtle, #64748b)",marginTop:3}}>
            {cert.lugar ? `${cert.lugar} · ` : ""}{cert.tipo || "Certificación"} emitida el {fmtD(cert.fecha)}
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{
            background: "var(--bg-subtle, #f8fafc)",
            border: "1px solid var(--border-color, #e2e8f0)",
            borderRadius: 10,
            padding: "8px 14px",
            textAlign: "right"
          }}>
            <div style={{fontSize:10,fontWeight:700,color:"var(--text-subtle, #94a3b8)",textTransform:"uppercase",letterSpacing:0.5}}>Normativa de Conformidad</div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-main, #334155)",marginTop:2}}>Res. 4272 / ANSI Z359</div>
          </div>

          <div style={{
            background: estadoVigencia.bg,
            border: `1px solid ${estadoVigencia.color}30`,
            borderRadius: 10,
            padding: "8px 14px",
            textAlign: "right"
          }}>
            <div style={{fontSize:10,fontWeight:700,color:estadoVigencia.color,textTransform:"uppercase",letterSpacing:0.5}}>Próximo Mantenimiento</div>
            <div style={{fontSize:12.5,fontWeight:800,color:estadoVigencia.color,marginTop:2}}>
              {cert.proxMant ? fmtD(cert.proxMant) : "No asignado"}
              <span style={{display:"block",fontSize:10.5,fontWeight:600,opacity:0.85}}>
                {estadoVigencia.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="doc-paper-wrapper" style={{maxWidth:920,margin:"0 auto"}}>
        <CertificacionDocumento cert={cert}/>
      </div>
    </div>
  );
}

