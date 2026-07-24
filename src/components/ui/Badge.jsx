import { EC } from "../../styles/tokens";

export default function Badge({estado}){const c=EC[estado]||{bg:"#1a3050",text:"#7da5c8",border:"#2a4a6a"};return <span style={{background:c.bg,color:c.text,border:"1px solid " + (c.border),borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:500,whiteSpace:"nowrap"}}>{estado}</span>;}
