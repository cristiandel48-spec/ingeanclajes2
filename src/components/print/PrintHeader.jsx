import { LOGO_CCS, LOGO_INGEANCLAJES } from "../../assets/embeddedImages";
export default function PrintHeader({dual}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"2.5px solid #cc0000",paddingBottom:14,marginBottom:0}}>
      <img src={LOGO_INGEANCLAJES} alt="Ingeanclajes" style={{height:82,objectFit:"contain"}}/>
      <div style={{textAlign:"center",flex:1}}>
        <div style={{fontSize:10,letterSpacing:3,color:"#333",textTransform:"uppercase",fontWeight:700}}>Especialistas en Anclajes</div>
        {dual&&<img src={LOGO_CCS} alt="CCS" style={{height:38,objectFit:"contain",marginTop:4}}/>}
      </div>
      <div style={{textAlign:"right",fontSize:9.5,color:"#555",lineHeight:1.7}}>
        <div>Calle 38 sur # 36 - 48, Envigado</div>
        <div>PBX 448 26 86 · Cel 3152889541</div>
        <div>Nit. 900193965-4</div>
        <div style={{color:"#cc0000",fontWeight:600}}>www.ingeanclajes.com</div>
      </div>
    </div>
  );
}

