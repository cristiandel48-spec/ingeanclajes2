import { useAppData } from "../../context/AppDataContext";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import PrintHeader from "../../components/print/PrintHeader";
import { fmtL, today as hoy } from "../../lib/format";
// Pone en negrita los datos del cliente dentro de una frase escrita en plano.
//
// El campo "Sistema certificado" se guarda como texto normal para poder
// editarlo a mano; meterle etiquetas dentro lo volveria ilegible. Asi que la
// negrita se aplica aqui, al imprimir: se buscan en la frase el NIT, el
// cliente, la direccion y el sitio, y se resaltan.
const conNegritas = (texto, datos)=>{
  const trozos = [...new Set((datos||[]).map((d)=>String(d||"").trim()).filter((d)=>d.length>2))]
    // De mayor a menor: si "CREAFAM" se resalta antes que "COOPERATIVA ...
    // CREAFAM", parte el nombre largo por la mitad.
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
  if(!cert) return null;
  const esRecertificacion = cert.tipo==="Recertificación";
  const elementos = Array.isArray(cert.elementos) ? cert.elementos : [];
  return(
    <div id="pz" className="doc-shell" style={{background:"#fff",color:"#111",fontFamily:"'Aptos','Segoe UI',sans-serif",fontSize:12,lineHeight:1.7,border:"1px solid #ddd",borderRadius:4,padding:"36px 44px"}}>
      <div style={{padding:"0 0 14px"}}>
        <PrintHeader dual={true} formato="certificacion" empresaConfig={empresaConfig}/>
      </div>
      <div style={{textAlign:"center",fontSize:10,fontWeight:700,letterSpacing:2,padding:"6px 0",borderBottom:"1px solid #ddd",color:"#333",textTransform:"uppercase",marginBottom:20}}>
        {esRecertificacion ? "Recertificación de Sistemas Anticaídas · Res. 4272/2021" : "Certificación de Sistemas Anticaídas · Res. 4272/2021"}
      </div>
      <div style={{marginBottom:20}}>
        <div>Envigado, {fmtL(hoy())}</div>
        <div style={{marginTop:10,fontWeight:700}}>SEÑORES:</div>
        <div style={{fontWeight:700}}>{(cert.cliente||"").toUpperCase()}</div>
        {cert.nit&&<div>NIT: <strong>{cert.nit}</strong></div>}
        {cert.direccion&&<div>DIRECCIÓN: <strong>{cert.direccion.toUpperCase()}</strong></div>}
      </div>
      <div style={{textAlign:"center",fontWeight:700,fontSize:15,marginBottom:20}}>INGEANCLAJES S.A.S</div>

      <div style={{textAlign:"justify",marginBottom:20,lineHeight:1.8}}>
        {conNegritas(cert.sistema, [cert.nit, cert.cliente, cert.direccion, cert.lugar])}
      </div>

      <div style={{marginBottom:16}}>Los elementos utilizados en dicha labor son:</div>
      <ul style={{marginLeft:24,marginBottom:20}}>
        {elementos.map((el,i)=><li key={i} style={{marginBottom:6}}>{el}</li>)}
      </ul>

      {/* Cierre del documento. Va DESPUES de la lista porque continua la
          frase: los elementos de arriba son los que tienen ese objetivo. */}
      <div style={{textAlign:"justify",marginBottom:20,lineHeight:1.8}}>
          cuyo objetivo es la fijación segura de los trabajadores al momento de realizar tareas que
          impliquen riesgo de caída, cumplen a cabalidad con la {cert.normativa} del ministerio de
          trabajo, por la cual se establece el reglamento de seguridad para protección contra caídas
          en trabajo en altura. Todos los elementos que componen los diferentes sistemas anticaídas
        se encuentran en excelente estado.
      </div>
      <div style={{background:"#f9f9f9",border:"1px solid #ddd",borderRadius:6,padding:"14px 18px",marginBottom:20}}>
        <div style={{fontWeight:700,marginBottom:10,fontSize:12}}>RECOMENDACIONES PARA TENER EN CUENTA</div>
        <div style={{fontSize:12,marginBottom:10,textAlign:"justify"}}>A continuación, se realizan algunas recomendaciones para preservar en buen estado los sistemas anti caídas certificados en dicha sede:</div>
        <ul style={{marginLeft:20,fontSize:12,lineHeight:1.9,marginBottom:10}}>
          <li>Dar aviso de inmediato, en caso de tener algún evento de caída por muy mínima que sea para hacer su respectiva valoración y diagnóstico.</li>
          <li>Conectar máximo dos personas por cada línea de vida o en cada tramo entre soportes laterales e intermedios.</li>
          <li>No modificar ningún elemento del sistema, ya que este puede perder sus funciones y generaría un riesgo más para las personas que las utilizan.</li>
          <li>Limpiar de inmediato las estructuras u otro elemento que entren en contacto con los químicos de esta área.</li>
        </ul>
        <div style={{fontSize:12,textAlign:"justify",lineHeight:1.7}}>
          Estas recomendaciones son de carácter técnico, por lo tanto, su cumplimiento debe ser obligatorio para minimizar el riesgo generado por la falta y/o ausencia de algunos de sus elementos, ya que estos tienen como principal característica soportar las cargas generadas por la caída de una persona en la realización de trabajos en alturas. Se debe realizar el próximo mantenimiento preventivo de todo el sistema máximo dentro de un año contado a partir de la expedición del presente documento{cert.proxMant?" (antes del " + (fmtL(cert.proxMant)) + ")":"."}.
        </div>
      </div>
      <div style={{marginBottom:12,fontSize:12}}>Cordialmente,</div>
      <div style={{height:72,display:"flex",alignItems:"flex-end"}}>
        {firmaImg && <img src={firmaImg} alt="" style={{maxHeight:70,maxWidth:230,objectFit:"contain"}}/>}
      </div>
      <div>
        <div style={{borderTop:"1px solid #333",paddingTop:10,display:"inline-block",minWidth:240}}>
          <div style={{fontWeight:700}}>{cert.ingeniero}</div>
          <div>{cert.matricula}</div>
        </div>
      </div>
      <div style={{borderTop:"1px solid #ccc",paddingTop:10,marginTop:30,textAlign:"center",fontSize:10,color:"#555"}}>
        Cl 38 sur # 36-48, Envigado, tel. 448 26 86 · Cel. 314 863 40 72 · Nit. 900193965-4 · ingeanclajes.sas@gmail.com
      </div>
    </div>
  );
}

