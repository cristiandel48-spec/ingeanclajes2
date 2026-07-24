// Tokens de estilo compartidos por todas las pantallas
export const EC={
  "En Obra":{bg:"#1a3a5c",text:"#60b4ff",border:"#2563a8"},
  "Cotización":{bg:"#2d2a14",text:"#f5c842",border:"#7a6610"},
  "Pagado":{bg:"#0f2d1a",text:"#4ade80",border:"#166534"},
  "Pendiente":{bg:"#2d1a0f",text:"#fb923c",border:"#7c3110"},
  "Finalizado":{bg:"#1a1a3a",text:"#c084fc",border:"#6b21a8"},
  "Vigente":{bg:"#0f2d1a",text:"#4ade80",border:"#166534"},
  "Vencida":{bg:"#2d1414",text:"#ef4444",border:"#7c1010"},
};
export const PAL=["#f47c20","#60b4ff","#4ade80","#c084fc","#f5c842","#fb923c","#e879f9","#34d399","#f472b6","#a78bfa","#38bdf8","#fbbf24"];
export const TC={LVH:"#60b4ff",LVV:"#4ade80",CON:"#f5c842",ESC:"#f47c20"};

export const SI={background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:8,color:"#1a1a2e",padding:"9px 12px",fontSize:13,width:"100%",outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
export const B=(bg,c="#fff")=>({background:bg,color:c,border:"1px solid " + (bg==="#1a3050"?"#2a4a6a":bg),borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit",whiteSpace:"nowrap"});
export const CD={background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,padding:20};
export const ST={fontSize:11,fontWeight:600,color:"#cc0000",textTransform:"uppercase",letterSpacing:1,marginBottom:14,borderBottom:"1px solid #e2e8f0",paddingBottom:8};
export const hasBrokenEncoding = (value="") => /[ðâÃÂŸ]/.test(String(value || ""));
export const buildCardBadge = (icon="", label="") => {
  const iconText = String(icon || "").trim();
  if(iconText && !hasBrokenEncoding(iconText)) return iconText;

  return String(label || "NA")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .split(/\s+/)
    .map((word)=>word.replace(/[^A-Za-z0-9]/g,""))
    .filter(Boolean)
    .slice(0,2)
    .map((word)=>word[0]?.toUpperCase() || "")
    .join("") || "NA";
};
