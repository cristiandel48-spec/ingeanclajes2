import { LOGO_CCS, LOGO_INGEANCLAJES } from "../../assets/embeddedImages";
import { selloDe } from "../../lib/controlDocumental";

// Encabezado de los documentos que se imprimen: informe de actividades y
// certificacion.
//
// `formato` dice de que documento se trata -"informe", "certificacion"- para
// sacar su codigo y su version. Si no se pasa, o si ese formato no tiene
// codigo configurado, no se pinta el cuadro de control y el encabezado queda
// como estaba.
export default function PrintHeader({ dual, formato, empresaConfig }) {
  const sello = formato ? selloDe(empresaConfig, formato) : null;

  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"stretch",borderBottom:"2.5px solid #cc0000",paddingBottom:14,marginBottom:0}}>
      {/* 54 y no 82: a 82 el logo se comia la cuarta parte de la cabecera y
          dejaba en desventaja al titulo del documento. En la cotizacion va a
          30, y este encabezado es mas alto porque lleva cuatro lineas de datos
          al otro lado. */}
      <img src={LOGO_INGEANCLAJES} alt="Ingeanclajes" style={{height:54,objectFit:"contain",alignSelf:"center"}}/>
      <div style={{textAlign:"center",flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontSize:10,letterSpacing:3,color:"#333",textTransform:"uppercase",fontWeight:700}}>Especialistas en Anclajes</div>
        {dual&&<img src={LOGO_CCS} alt="CCS" style={{height:38,objectFit:"contain",marginTop:4}}/>}
      </div>
      <div style={{textAlign:"right",fontSize:9.5,color:"#555",lineHeight:1.7,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div>Calle 38 sur # 36 - 48, Envigado</div>
        <div>PBX 448 26 86 · Cel 3152889541</div>
        <div>Nit. 900193965-4</div>
        <div style={{color:"#cc0000",fontWeight:600}}>www.ingeanclajes.com</div>
      </div>

      {/* El cuadro de control documental. Va con borde y en la esquina, que es
          donde lo busca quien audita. */}
      {sello && (
        <div style={{border:"1px solid #333",marginLeft:12,width:150,flexShrink:0,
          display:"flex",flexDirection:"column",alignSelf:"center"}}>
          <div style={{borderBottom:"1px solid #333",padding:"4px 6px",textAlign:"center",
            fontSize:8,color:"#333",lineHeight:1.3}}>{sello.linea}</div>
          <div style={{padding:"4px 6px",textAlign:"center",fontSize:8.5,fontWeight:700,
            letterSpacing:.3,fontFamily:"Consolas, monospace",color:"#111"}}>{sello.codigo}</div>
        </div>
      )}
    </div>
  );
}
