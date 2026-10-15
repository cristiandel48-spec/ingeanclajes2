// Tokens de estilo compartidos por todas las pantallas.
//
// El color NO se define aqui: sale de designTokens.js, que es la unica fuente
// del sistema. Este archivo solo arma las piezas que las pantallas usan
// (boton, tarjeta, campo, estados) a partir de esos tokens.

import { COLOR, FUENTE, RADIO, SOMBRA, TRANSICION } from "./designTokens";

// Estados. Siguen siendo pares de fondo y texto porque hay cientos de usos;
// la fase 5 del plan los sustituye por un unico StatusPill neutro con punto.
export const EC={
  // Azul informativo: la obra esta en curso.
  "En Obra":{bg:COLOR.infoBg,text:COLOR.infoText},
  "Cotización":{bg:COLOR.dangerBg,text:COLOR.dangerText},
  "Pagado":{bg:COLOR.successBg,text:COLOR.successText},
  "Cobrado":{bg:COLOR.successBg,text:COLOR.successText},
  // Faltaba en modo claro y salia gris, aunque en oscuro si era verde.
  "Activo":{bg:COLOR.successBg,text:COLOR.successText},
  "Pendiente":{bg:COLOR.warningBg,text:COLOR.warningText},
  // Nace de WhatsApp y todavia no la ha visto nadie. Gris a proposito: no
  // pide accion del cliente, pide que un asesor la revise.
  "Borrador":{bg:COLOR.fill,text:COLOR.textSecondary},
  "Finalizado":{bg:"#F4F3FF",text:"#5925DC"},
  "Vigente":{bg:COLOR.successBg,text:COLOR.successText},
  "Vencida":{bg:COLOR.dangerBg,text:COLOR.dangerText},
  "Aprobada":{bg:COLOR.successBg,text:COLOR.successText},
};

// Paletas de grafico y de tipo de servicio. No son color de interfaz: sirven
// para distinguir series y tramos, y por eso viven fuera del sistema.
export const PAL=["#E0342A","#3538CD","#12B76A","#7A5AF8","#F79009","#EE46BC","#06AED4","#667085"];
export const TC={LVH:"#3538CD",LVV:"#12B76A",CON:"#F79009",ESC:"#E0342A"};

export const FONT=FUENTE;
export const BRAND={
  primary:COLOR.accent,primaryTint:COLOR.accentTint,primaryDeep:COLOR.accentHover,
  bg:COLOR.bgApp,surface:COLOR.surface,surfaceTint:COLOR.fill,
  text:COLOR.textPrimary,muted:COLOR.textTertiary,divider:COLOR.separator,
};

export const SI={background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:RADIO.control,color:"var(--input-color)",padding:"9px 12px",fontSize:13.5,width:"100%",outline:"none",boxSizing:"border-box",fontFamily:"inherit",transition:`border-color ${TRANSICION.rapida}, box-shadow ${TRANSICION.rapida}`};

export const B=(bg,c="#fff")=>({background:bg,color:c,border:"none",borderRadius:RADIO.control,padding:"8px 16px",fontSize:12.5,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit",whiteSpace:"nowrap",boxShadow:SOMBRA.sm,transition:`all ${TRANSICION.rapida}`});
export const CD={background:COLOR.surface,border:`1px solid ${COLOR.separator}`,borderRadius:16,padding:20,boxShadow:SOMBRA.sm,boxSizing:"border-box"};
export const ST={fontSize:14.5,fontWeight:600,letterSpacing:"-0.01em",color:COLOR.textPrimary,marginBottom:12};

export const hasBrokenEncoding = (value="") => /[ðâÃÂŸ]/.test(String(value || ""));
export const buildCardBadge = (icon="", label="") => {
  const iconText = String(icon || "").trim();
  if(iconText && !hasBrokenEncoding(iconText)) return iconText;

  return String(label || "NA")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g,"")
    .split(/\s+/)
    .map((word)=>word.replace(/[^A-Za-z0-9]/g,""))
    .filter(Boolean)
    .slice(0,2)
    .map((word)=>word[0]?.toUpperCase() || "")
    .join("") || "NA";
};
