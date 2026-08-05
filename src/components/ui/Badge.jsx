import { EC } from "../../styles/tokens";
export default function Badge({estado}){
  const c=EC[estado]||{bg:"#F2F4F7",text:"#344054"};
  return <span style={{background:c.bg,color:c.text,borderRadius:999,padding:"4px 12px",fontSize:11.5,fontWeight:600,whiteSpace:"nowrap"}}>{estado}</span>;
}
