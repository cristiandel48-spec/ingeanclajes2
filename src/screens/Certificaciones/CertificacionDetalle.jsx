import { B } from "../../styles/tokens";
export default function CertificacionDetalle({cert,onVolver,onEditar,onImprimir,subtitle="Vista previa del documento"}) {
  if(!cert) return null;
  return(
    <div>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <button style={B("#f1f5f9","#475569")} onClick={onVolver}>Volver</button>
        {typeof onEditar==="function" && <button style={{...B("#dbeafe","#1e40af")}} onClick={()=>onEditar(cert)}>Editar</button>}
        {typeof onImprimir==="function" && <button style={B("#f47c20")} onClick={()=>onImprimir(cert)}>Imprimir PDF</button>}
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

