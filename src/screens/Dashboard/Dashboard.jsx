import H1 from "../../components/ui/H1";
import { B, CD, ST } from "../../styles/tokens";
import { fmt, fmtD } from "../../lib/format";
import { getQuoteActiveProposal } from "../../lib/cotizaciones";
import { resumenVencimientos, colorVencimiento, etiquetaVencimiento } from "../../lib/vencimientos";
export default function Dashboard({ctx,go}){
  const {obras,cotizaciones,certs}=ctx;
  const saldoPendiente = obras.reduce((sum, obra)=>sum + Number(obra.saldo || 0), 0);
  const recientes = [...cotizaciones].sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||""))).slice(0,4);
  const venc = resumenVencimientos(certs);

  return(
    <div style={{padding:28}}>
      <H1
        title="Dashboard"
        subtitle="Resumen comercial, operativo y financiero de Ingeanclajes"
        action={<div style={{display:"flex",gap:10}}><button style={B("#f47c20")} onClick={()=>go("cotizacion")}>+ Nueva Cotización</button><button style={B("#dbeafe","#1e40af")} onClick={()=>go("clientes")}>Clientes</button></div>}
      />
      <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:18}}>
        <div style={CD}>
          <div style={ST}>Cotizaciones recientes</div>
          <div style={{display:"grid",gap:10}}>
            {recientes.map((cotizacion)=>{
              const activa = getQuoteActiveProposal(cotizacion);
              return(
                <div key={cotizacion.id} style={{border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:11,color:"#64748b"}}>{cotizacion.numero} · {fmtD(cotizacion.fecha)}</div>
                    <div style={{fontSize:16,fontWeight:700,color:"#1a1a2e"}}>{cotizacion.cliente}</div>
                    <div style={{fontSize:12,color:"#475569"}}>{cotizacion.obra}</div>
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{activa.nombre} · {fmt(Number(activa.total || 0))}</div>
                  </div>
                  <button style={{...B("#f1f5f9","#475569"),fontSize:12,padding:"7px 12px"}} onClick={()=>go("cotizacion")}>Abrir módulo</button>
                </div>
              );
            })}
          </div>
        </div>
        <div style={CD}>
          <div style={ST}>Alertas rápidas</div>
          <div style={{display:"grid",gap:12,fontSize:13,color:"#475569"}}>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",marginBottom:4}}>Cobro pendiente</div>
              <div style={{fontSize:24,fontWeight:800,color:Number(saldoPendiente)>0?"#cc0000":"#166534"}}>{fmt(Number(saldoPendiente || 0))}</div>
            </div>
            {/* Vencimientos de certificaciones: es la alerta que evita perder
                una recertificación por fecha. Lleva directo a generarla. */}
            <div style={{
              background: venc.hayAlgoQueHacer ? "#fff7ed" : "#f8fafc",
              border: `1px solid ${venc.hayAlgoQueHacer ? "#fdba74" : "#e2e8f0"}`,
              borderRadius:12, padding:"14px 16px",
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,marginBottom:8}}>
                <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase"}}>Vencimientos de certificaciones</div>
                {venc.hayAlgoQueHacer && (
                  <div style={{fontSize:11,fontWeight:700,color:"#c2410c"}}>
                    {venc.requierenAccion.length} por atender
                  </div>
                )}
              </div>

              {venc.hayAlgoQueHacer ? (
                <>
                  <div style={{display:"flex",gap:14,marginBottom:10,fontSize:11.5}}>
                    {venc.vencidas.length>0 && <span style={{color:"#ef4444",fontWeight:700}}>{venc.vencidas.length} vencida{venc.vencidas.length===1?"":"s"}</span>}
                    {venc.urgentes.length>0 && <span style={{color:"#c2410c",fontWeight:700}}>{venc.urgentes.length} urgente{venc.urgentes.length===1?"":"s"}</span>}
                    {venc.proximas.length>0 && <span style={{color:"#a16207"}}>{venc.proximas.length} próxima{venc.proximas.length===1?"":"s"}</span>}
                  </div>

                  <div style={{display:"grid",gap:6,marginBottom:12}}>
                    {venc.destacadas.map((cert)=>(
                      <div key={cert.id} style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",background:"#fff",border:"1px solid #fed7aa",borderRadius:8,padding:"8px 10px"}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:12.5,fontWeight:600,color:"#1a1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {cert.cliente || cert.obra || cert.id}
                          </div>
                          <div style={{fontSize:10.5,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {cert.tipoSistema || cert.tipo || "Certificación"}{cert.proxMant?` · ${fmtD(cert.proxMant)}`:""}
                          </div>
                        </div>
                        <div style={{fontSize:11,fontWeight:800,color:colorVencimiento(cert.diasRestantes),flexShrink:0,textAlign:"right"}}>
                          {etiquetaVencimiento(cert.diasRestantes)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {venc.requierenAccion.length > venc.destacadas.length && (
                    <div style={{fontSize:11,color:"#94a3b8",marginBottom:10}}>
                      y {venc.requierenAccion.length - venc.destacadas.length} más.
                    </div>
                  )}

                  {/* Una certificación sin fecha tampoco se puede controlar,
                      así que se avisa aunque haya urgencias por delante. */}
                  {venc.sinFecha.length>0 && (
                    <div style={{fontSize:11,color:"#b45309",marginBottom:10}}>
                      {venc.sinFecha.length} sin fecha de mantenimiento registrada.
                    </div>
                  )}

                  <button
                    style={{...B("#f47c20"),fontSize:12,padding:"8px 14px",width:"100%",justifyContent:"center"}}
                    onClick={()=>go("vencimientos")}
                  >
                    Generar recertificación
                  </button>
                </>
              ) : (
                <div style={{fontSize:12.5,color:"#475569"}}>
                  {venc.proximas.length>0
                    ? <>Ninguna vencida. {venc.proximas.length} se acerca{venc.proximas.length===1?"":"n"} en los próximos 90 días.</>
                    : venc.lista.length>0
                      ? <>Todas las certificaciones están al día.</>
                      : <>Aún no hay certificaciones registradas.</>}
                  {venc.sinFecha.length>0 && (
                    <div style={{marginTop:6,color:"#b45309"}}>
                      {venc.sinFecha.length} sin fecha de mantenimiento registrada.
                    </div>
                  )}
                  {venc.lista.length>0 && (
                    <button
                      style={{...B("#f1f5f9","#475569"),fontSize:11.5,padding:"7px 12px",marginTop:10}}
                      onClick={()=>go("vencimientos")}
                    >
                      Ver vencimientos
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

