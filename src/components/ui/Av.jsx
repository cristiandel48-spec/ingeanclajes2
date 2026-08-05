export default function Av({init,color="#E0342A",size=36}){
  return <div style={{width:size,height:size,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.32,fontWeight:700,color:"#fff",flexShrink:0}}>{init}</div>;
}
