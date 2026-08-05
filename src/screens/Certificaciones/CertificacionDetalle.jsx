import CertificacionDocumento from "./CertificacionDocumento";
import { useState } from "react";
import { B } from "../../styles/tokens";
import { descargarDocumentoPdf } from "../../lib/documentoPdf";
export default function CertificacionDetalle({cert,onVolver,onEditar,onImprimir,subtitle="Vista previa del documento"}) {
  const [generando,setGenerando]=useState(false);
  if(!cert) return null;

  // Descarga directa: el PDF sale sin el encabezado ni el pie que Chrome
  // estampa al imprimir («about:blank», la fecha, el numero de pagina).
  const descargar=async()=>{
    setGenerando(true);
    try{
      await descargarDocumentoPdf(
        document.getElementById("pz"),
        `${cert.tipo || "Certificación"} ${cert.numero || cert.id || ""}`.trim(),
      );
    }catch(fallo){
      window.alert(fallo.message || "No se pudo generar el PDF.");
    }finally{
      setGenerando(false);
    }
  };

  return(
    <div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <button style={B("#f1f5f9","#475569")} onClick={onVolver}>Volver</button>
        {typeof onEditar==="function" && <button style={{...B("#dbeafe","#1e40af")}} onClick={()=>onEditar(cert)}>Editar</button>}
        <button style={{...B("#f47c20"),opacity:generando?0.65:1}} disabled={generando} onClick={descargar}>
          {generando ? "Generando…" : "Descargar PDF"}
        </button>
        {typeof onImprimir==="function" && <button style={B("#f1f5f9","#475569")} onClick={()=>onImprimir(cert)}>Imprimir</button>}
      </div>
      <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:12,padding:"12px 14px",marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:"#9a3412",textTransform:"uppercase",letterSpacing:0.7}}>Certificación</div>
        <div style={{fontSize:13,color:"#7c2d12",marginTop:4}}>{subtitle}</div>
      </div>
      <div style={{maxWidth:980}}>
        <CertificacionDocumento cert={cert}/>
      </div>
    </div>
  );
}

