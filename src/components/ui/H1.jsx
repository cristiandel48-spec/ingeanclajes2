export default function H1({title,subtitle,action}){
  return (
    <div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
      <div>
        <h1 style={{fontSize:24,fontWeight:800,margin:0,color:"#101828"}}>{title}</h1>
        <p style={{fontSize:13.5,color:"#667085",margin:"4px 0 0"}}>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
