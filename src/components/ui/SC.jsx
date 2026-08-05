import { CD, buildCardBadge } from "../../styles/tokens";
export default function SC({label,value,color="#cc0000",icon,sub}){
  const badge=buildCardBadge(icon,label);
  return (
    <div style={CD}>
      <div style={{width:36,height:36,borderRadius:10,background:"#f9e9e4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#2b2622",marginBottom:10}}>{badge}</div>
      <div style={{fontSize:24,fontWeight:800,color}}>{value}</div>
      <div style={{fontSize:12.5,color:"#756a5e",marginTop:3}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:"#a2988a",marginTop:2}}>{sub}</div>}
    </div>
  );
}
