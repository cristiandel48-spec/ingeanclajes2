import { useState } from "react";
import logoIngeanclajes from "./assets/logo-ingeanclajes.jpeg";
import { AppDataProvider, useAppData } from "./context/AppDataContext";
import Av from "./components/ui/Av";
import Dashboard from "./screens/Dashboard/Dashboard";
import Cotizacion from "./screens/Cotizacion/Cotizacion";
import ClientesDB from "./screens/Clientes/ClientesDB";
import Pagos from "./screens/Pagos/Pagos";
import Obras from "./screens/Obras/Obras";
import Certificaciones from "./screens/Certificaciones/Certificaciones";
import Informes from "./screens/Informes/Informes";
import CuentasPagar from "./screens/CuentasPagar/CuentasPagar";
import Contabilidad from "./screens/Contabilidad/Contabilidad";
import Financiero from "./screens/Financiero/Financiero";
import Nomina from "./screens/Nomina/Nomina";
import Horarios from "./screens/Horarios/Horarios";
import Vencimientos from "./screens/Vencimientos/Vencimientos";

const LOGO_INGEANCLAJES = logoIngeanclajes;

export default function App(){
  return (
    <AppDataProvider>
      <AppShell/>
    </AppDataProvider>
  );
}

function AppShell(){
  const ctx = useAppData();
  const { scr, setScr } = ctx;
  const [open,setOpen]=useState(true);

  const navSections=[
    {
      title:"General",
      items:[
        {id:"dashboard",l:"Dashboard",i:"■"},
      ],
    },
    {
      title:"Comercial y Proyectos",
      items:[
        {id:"cotizacion",l:"Cotizaciones",i:"CT"},
        {id:"clientes",l:"Clientes",i:"CL"},
        {id:"obras",l:"Ejecucion de Obra",i:"OB"},
        {id:"pagos",l:"Cuentas por cobrar",i:"PG"},
      ],
    },
    {
      title:"Calidad y Entregables",
      items:[
        {id:"certificaciones",l:"Certificaciones",i:"CF"},
        {id:"vencimientos",l:"Vencimientos de Certificaciones",i:"AL"},
        {id:"informes",l:"Informes de Actividades",i:"IN"},
      ],
    },
    {
      title:"Administracion",
      items:[
        {id:"proveedores",l:"Causación / Facturas y Gastos",i:"CP"},
        {id:"contabilidad",l:"Contabilidad",i:"CO"},
        {id:"nomina",l:"Nomina y Empleados",i:"NO"},
        {id:"horarios",l:"Horarios",i:"HR"},
        {id:"financiero",l:"Informe Financiero",i:"IF"},
      ],
    },
  ];

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'Aptos','Segoe UI',sans-serif",background:"#f0f2f5",color:"#1a1a2e",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=Aptos:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{'select option{background:#ffffff;color:#1e293b}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#f0f2f5}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}@media print{@page{size:Letter;margin:12mm}html,body{margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}body *{visibility:hidden!important}#pz,#pz *{visibility:visible!important}#pz{position:relative!important;left:auto!important;top:auto!important;width:auto!important;max-width:none!important;margin:0!important;padding:0!important;border:none!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;overflow:visible!important}.no-print{display:none!important}.print-avoid-break,table,tr,td,th{break-inside:avoid;page-break-inside:avoid}}'}</style>
      <aside style={{width:open?230:64,background:"#ffffff",borderRight:"1px solid #e2e8f0",display:"flex",flexDirection:"column",transition:"width 0.25s",flexShrink:0,overflowX:"hidden",boxShadow:"2px 0 8px rgba(0,0,0,0.06)"}}>
        <div onClick={()=>setOpen(!open)} style={{padding:"16px 14px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:10,cursor:"pointer",overflow:"hidden",background:"#fff"}}>
          <div style={{width:40,height:40,background:"#fff",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:3,border:"1px solid #f1f5f9"}}><img src={LOGO_INGEANCLAJES} alt="Logo" style={{width:"100%",height:"100%",objectFit:"contain"}}/></div>
          {open&&<div><div style={{fontWeight:700,fontSize:13,color:"#cc0000",whiteSpace:"nowrap"}}>INGEANCLAJES</div><div style={{fontSize:10,color:"#94a3b8"}}>Sistema v3.0</div></div>}
        </div>
        <nav style={{flex:1,padding:"8px 6px",overflowY:"auto"}}>
          {navSections.map(section=>(
            <div key={section.title} style={{marginBottom:10}}>
              {open&&(
                <div style={{padding:"10px 10px 6px",fontSize:10,fontWeight:700,letterSpacing:0.8,color:"#94a3b8",textTransform:"uppercase"}}>
                  {section.title}
                </div>
              )}
              {section.items.map(item=>{const a=scr===item.id;return(
                <button key={item.id} onClick={()=>setScr(item.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",background:a?"#cc0000":"transparent",color:a?"#fff":"#475569",marginBottom:2,textAlign:"left",overflow:"hidden",whiteSpace:"nowrap"}}>
                  <span style={{fontSize:15,flexShrink:0}}>{item.i}</span>
                  {open&&<span style={{fontSize:12,fontWeight:a?600:400}}>{item.l}</span>}
                </button>
              );})}
            </div>
          ))}
        </nav>
        <div style={{padding:"10px 8px",borderTop:"1px solid #f1f5f9"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",overflow:"hidden"}}>
            <Av init="MC" size={28}/>
            {open&&<div><div style={{fontSize:12,color:"#1a1a2e",whiteSpace:"nowrap"}}>Maria Camila Sepulveda</div><div style={{fontSize:10,color:"#94a3b8"}}>Directora Comercial</div></div>}
          </div>
        </div>
      </aside>
      <main style={{flex:1,overflow:"auto",background:"#f0f2f5"}}>
        {scr==="dashboard"&&<Dashboard ctx={ctx} go={setScr}/>}
        {scr==="cotizacion"&&<Cotizacion ctx={ctx}/>}
        {scr==="clientes"&&<ClientesDB ctx={ctx}/>}
        {scr==="pagos"&&<Pagos ctx={ctx}/>}
        {scr==="obras"&&<Obras ctx={ctx}/>}
        {scr==="certificaciones"&&<Certificaciones ctx={ctx}/>}
        {scr==="informes"&&<Informes ctx={ctx}/>}
        {scr==="proveedores"&&<CuentasPagar ctx={ctx}/>}
        {scr==="contabilidad"&&<Contabilidad ctx={ctx}/>}
        {scr==="financiero"&&<Financiero ctx={ctx}/>}
        {scr==="nomina"&&<Nomina ctx={ctx}/>}
        {scr==="horarios"&&<Horarios ctx={ctx}/>}
        {scr==="vencimientos"&&<Vencimientos ctx={ctx}/>}
      </main>
    </div>
  );
}
