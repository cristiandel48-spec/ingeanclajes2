import { CD, buildCardBadge } from "../../styles/tokens";

export default function SC({label,value,color,icon,sub}){const badge=buildCardBadge(icon,label);return <div style={CD}><div style={{fontSize:18,marginBottom:8,fontWeight:700,letterSpacing:0.4}}>{badge}</div><div style={{fontSize:22,fontWeight:700,color}}>{value}</div><div style={{fontSize:12,color:"#475569",marginTop:3}}>{label}</div>{sub&&<div style={{fontSize:10,color:"rgba(255,255,255,0.7)",marginTop:2}}>{sub}</div>}</div>;}
