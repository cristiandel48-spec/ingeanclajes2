// Tokens de estilo compartidos por todas las pantallas
export const EC={
  "En Obra":{bg:"#EFF4FF",text:"#3538CD"},
  "Cotización":{bg:"#FEECEC",text:"#B42318"},
  "Pagado":{bg:"#ECFDF3",text:"#027A48"},
  "Pendiente":{bg:"#FFFAEB",text:"#B54708"},
  // Nace de WhatsApp y todavia no la ha visto nadie. Gris a proposito: no
  // pide accion del cliente, pide que un asesor la revise.
  "Borrador":{bg:"#F2F4F7",text:"#475467"},
  "Finalizado":{bg:"#F4F3FF",text:"#5925DC"},
  "Vigente":{bg:"#ECFDF3",text:"#027A48"},
  "Vencida":{bg:"#FEE4E2",text:"#B42318"},
};
export const PAL=["#E0342A","#3538CD","#12B76A","#7A5AF8","#F79009","#EE46BC","#06AED4","#667085"];
export const TC={LVH:"#3538CD",LVV:"#12B76A",CON:"#F79009",ESC:"#E0342A"};

export const FONT="'Inter',system-ui,sans-serif";
export const BRAND={
  primary:"#E0342A",primaryTint:"#FEECEC",primaryDeep:"#B42318",
  bg:"#f6f7f9",surface:"#ffffff",surfaceTint:"#f2f4f7",
  text:"#101828",muted:"#667085",divider:"#eaecf0",
};

export const SI={background:"#ffffff",border:"1px solid #eaecf0",borderRadius:10,color:"#101828",padding:"9px 12px",fontSize:13.5,width:"100%",outline:"none",boxSizing:"border-box",fontFamily:"inherit"};

export const B=(bg,c="#fff")=>({background:bg,color:c,border:"none",borderRadius:10,padding:"9px 18px",fontSize:13.5,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit",whiteSpace:"nowrap"});
export const CD={background:"#ffffff",border:"1px solid #eef0f3",borderRadius:16,padding:20,boxShadow:"0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.05)"};
export const ST={fontSize:15,fontWeight:700,color:"#101828",marginBottom:14};

export const hasBrokenEncoding = (value="") => /[ðâÃÂŸ]/.test(String(value || ""));
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
