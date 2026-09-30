export default function H1({title,subtitle,action}){
  return (
    <div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",width:"100%",maxWidth:"100%",boxSizing:"border-box"}}>
      <div style={{minWidth:0,flex:"1 1 200px"}}>
        <h1 style={{fontSize:"clamp(19px, 4.5vw, 24px)",fontWeight:800,margin:0,color:"var(--text-h1, #101828)",lineHeight:1.25}}>{title}</h1>
        {subtitle && <p style={{fontSize:13,color:"var(--text-muted, #667085)",margin:"4px 0 0",lineHeight:1.45}}>{subtitle}</p>}
      </div>
      {action && <div style={{flexShrink:0,maxWidth:"100%",boxSizing:"border-box"}}>{action}</div>}
    </div>
  );
}
