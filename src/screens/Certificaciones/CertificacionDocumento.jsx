import { useAppData } from "../../context/AppDataContext";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import PrintHeader from "../../components/print/PrintHeader";
import { fmtL, today as hoy } from "../../lib/format";
export default function CertificacionDocumento({cert}){
  const {empresaConfig}=useAppData();
  const firmaImg=getFirmaImg(empresaConfig);
  if(!cert) return null;
  const esRecertificacion = cert.tipo==="Recertificación";
  const elementos = Array.isArray(cert.elementos) ? cert.elementos : [];
  return(
    <div id="pz" className="doc-shell" style={{background:"#fff",color:"#111",fontFamily:"'Aptos','Segoe UI',sans-serif",fontSize:12,lineHeight:1.7,border:"1px solid #ddd",borderRadius:4,padding:"36px 44px"}}>
      <div style={{padding:"0 0 14px"}}>
        <PrintHeader dual={true}/>
      </div>
      <div style={{textAlign:"center",fontSize:10,fontWeight:700,letterSpacing:2,padding:"6px 0",borderBottom:"1px solid #ddd",color:"#333",textTransform:"uppercase",marginBottom:20}}>
        {esRecertificacion ? "Recertificación de Sistemas Anticaídas · Res. 4272/2021" : "Certificación de Sistemas Anticaídas · Res. 4272/2021"}
      </div>
      <div style={{marginBottom:20}}>
        <div>Envigado, {fmtL(hoy())}</div>
        <div style={{marginTop:10,fontWeight:700}}>SEÑORES:</div>
        <div style={{fontWeight:700}}>{(cert.cliente||"").toUpperCase()}</div>
        {cert.nit&&<div>NIT: {cert.nit}</div>}
        {cert.direccion&&<div>DIRECCIÓN: {cert.direccion.toUpperCase()}</div>}
      </div>
      <div style={{textAlign:"center",fontWeight:700,fontSize:15,marginBottom:20}}>INGEANCLAJES S.A.S</div>

      {esRecertificacion?(
        <div style={{textAlign:"justify",lineHeight:1.8,marginBottom:20}}>
          <p style={{marginBottom:12}}>Ha realizado el mantenimiento preventivo en las instalaciones de {cert.sistema}, que consta de:</p>
          <p style={{marginBottom:12}}>Limpieza de todo el sistema. Se verifica ajuste de las tuercas y pernos de los puntos de anclaje, finalmente se procedió a dar una laca protectora anticorrosiva como recubrimiento especial en todos los puntos de anclaje para evitar futuras oxidaciones.</p>
          <p style={{marginBottom:12}}>Nuestra empresa se compromete a garantizar la calidad y seguridad de los materiales proporcionados para la instalación de los puntos de anclaje. Nos enfocamos en cumplir con todas las normativas y estándares de la industria, así como en utilizar materiales de alta calidad que cumplan con las especificaciones técnicas requeridas.</p>
          <p style={{marginBottom:12}}>Por otro lado, los pernos utilizados en los puntos de anclaje son seleccionados cuidadosamente para garantizar su resistencia y capacidad de fijación. Trabajamos con proveedores confiables que suministran pernos de alta calidad que cumplen con las normativas de seguridad establecidas.</p>
          <p style={{marginBottom:12}}>En cuanto al epóxico utilizado, nos aseguramos de utilizar productos de reconocidas marcas y de calidad certificada. Nuestro personal altamente capacitado realiza la instalación siguiendo las instrucciones y recomendaciones del fabricante, asegurando así una correcta adherencia y resistencia en los puntos de anclaje.</p>
          <p style={{marginBottom:12}}>Nos comprometemos a cumplir con todas las regulaciones legales vigentes y a realizar un seguimiento riguroso de las inspecciones y pruebas necesarias para garantizar la calidad de los materiales y la adecuada instalación de los puntos de anclaje.</p>
          <p style={{marginBottom:12}}>En caso de que se presenten problemas o fallas relacionadas con los materiales suministrados o la instalación de los puntos de anclaje, nos responsabilizamos totalmente de solventar cualquier inconveniente y cubrir los costos asociados a su corrección. De acuerdo a las labores anteriormente descritas INGEANCLAJES S.A.S. CERTIFICA que los sistemas de detención de caídas instalados en las instalaciones de la empresa {(cert.cliente||"").toUpperCase()}{cert.direccion?" ubicada en " + (cert.direccion.toUpperCase()):""} y cuyo objetivo es la fijación segura de los trabajadores al momento de realizar tareas que impliquen riesgo de caída, cumplen a cabalidad con la {cert.normativa} del ministerio de trabajo, por la cual se establece el reglamento de seguridad para protección contra caídas en trabajo en altura. Todos los elementos que componen los diferentes sistemas anticaídas se encuentran en excelente estado.</p>
        </div>
      ):(
        <div style={{textAlign:"justify",marginBottom:20,lineHeight:1.8}}>
          {cert.sistema}
        </div>
      )}

      <div style={{marginBottom:16}}>Los elementos utilizados en dicha labor son:</div>
      <ul style={{marginLeft:24,marginBottom:20}}>
        {elementos.map((el,i)=><li key={i} style={{marginBottom:6}}>{el}</li>)}
      </ul>

      {/* Cierre de la certificacion. Va DESPUES de la lista porque continua la
          frase: los elementos de arriba son los que tienen ese objetivo.
          Estaba solo dentro del parrafo largo de la recertificacion, asi que
          en las certificaciones se perdia. */}
      {!esRecertificacion && (
        <div style={{textAlign:"justify",marginBottom:20,lineHeight:1.8}}>
          cuyo objetivo es la fijación segura de los trabajadores al momento de realizar tareas que
          impliquen riesgo de caída, cumplen a cabalidad con la {cert.normativa} del ministerio de
          trabajo, por la cual se establece el reglamento de seguridad para protección contra caídas
          en trabajo en altura. Todos los elementos que componen los diferentes sistemas anticaídas
          se encuentran en excelente estado.
        </div>
      )}
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

