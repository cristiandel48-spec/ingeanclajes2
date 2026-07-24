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
const PRIMARY = "#E0342A";
const BG = "#f6f7f9";
const SURFACE = "#ffffff";
const SURFACE_TINT = "#f2f4f7";
const TEXT = "#101828";
const MUTED = "#667085";
const DIVIDER = "#eaecf0";

// Cada icono es un solo <svg> stroke-based (estilo Lucide) — sin dependencias externas.
const ICONS = {
  dashboard: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  cotizacion: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>,
  clientes: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="8" r="2.6"/><path d="M17.5 14.6c2.4.4 3.9 2.2 3.9 5.4"/></svg>,
  obras: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="10" height="18" rx="1.5"/><rect x="14" y="9" width="6" height="12" rx="1.5"/><line x1="7" y1="7" x2="7" y2="7.01"/><line x1="11" y1="7" x2="11" y2="7.01"/><line x1="7" y1="11" x2="7" y2="11.01"/><line x1="11" y1="11" x2="11" y2="11.01"/></svg>,
  pagos: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2"/></svg>,
  certificaciones: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  vencimientos: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2.5"/><path d="M5 3 2.5 5.5"/><path d="M19 3l2.5 2.5"/></svg>,
  informes: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><rect x="8.5" y="2" width="7" height="3.5" rx="1"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="8" y1="19" x2="13" y2="19"/></svg>,
  proveedores: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12v19l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-19z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></svg>,
  contabilidad: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10.5" x2="8" y2="10.51"/><line x1="12" y1="10.5" x2="12" y2="10.51"/><line x1="16" y1="10.5" x2="16" y2="10.51"/></svg>,
  nomina: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2.5"/><circle cx="12" cy="12" r="3"/><line x1="6" y1="9" x2="6" y2="9.01"/><line x1="18" y1="15" x2="18" y2="15.01"/></svg>,
  horarios: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>,
  financiero: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="13"/><line x1="21" y1="20" x2="3" y2="20"/></svg>,
};

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
  const [theme, setTheme] = useState("light");
  const dark = theme === "dark";

  const bg = dark ? "#0f1115" : BG;
  const surface = dark ? "#181a20" : SURFACE;
  const surfaceTint = dark ? "#20232b" : SURFACE_TINT;
  const text = dark ? "#f0f2f5" : TEXT;
  const divider = dark ? "#2a2d36" : DIVIDER;

  const navItems=[
    {id:"dashboard",l:"Dashboard"},
    {id:"cotizacion",l:"Cotizaciones",sep:true},
    {id:"clientes",l:"Clientes"},
    {id:"obras",l:"Ejecución de obra"},
    {id:"pagos",l:"Cuentas por cobrar"},
    {id:"certificaciones",l:"Certificaciones",sep:true},
    {id:"vencimientos",l:"Vencimientos"},
    {id:"informes",l:"Informes de actividades"},
    {id:"proveedores",l:"Causación / facturas",sep:true},
    {id:"contabilidad",l:"Contabilidad"},
    {id:"nomina",l:"Nómina y empleados"},
    {id:"horarios",l:"Horarios"},
    {id:"financiero",l:"Informe financiero"},
  ];

  const titles = {dashboard:"Dashboard",cotizacion:"Cotizaciones",clientes:"Clientes",obras:"Ejecución de obra",pagos:"Cuentas por cobrar",certificaciones:"Certificaciones",vencimientos:"Vencimientos",informes:"Informes de actividades",proveedores:"Causación / facturas",contabilidad:"Contabilidad",nomina:"Nómina y empleados",horarios:"Horarios",financiero:"Informe financiero"};

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'Inter',system-ui,sans-serif",background:bg,color:text,overflow:"hidden"}}>
      <style>{'::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:'+divider+';border-radius:8px}@media print{@page{size:Letter;margin:12mm}html,body{margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}body *{visibility:hidden!important}#pz,#pz *{visibility:visible!important}#pz{position:relative!important;left:auto!important;top:auto!important;width:auto!important;max-width:none!important;margin:0!important;padding:0!important;border:none!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;overflow:visible!important}.no-print{display:none!important}.print-avoid-break,table,tr,td,th{break-inside:avoid;page-break-inside:avoid}}'}</style>

      <nav style={{width:72,flexShrink:0,background:"#14151a",display:"flex",flexDirection:"column",alignItems:"center",padding:"18px 0",overflowY:"auto"}}>
        <div style={{width:40,height:40,borderRadius:12,background:PRIMARY,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginBottom:18}}>
          <img src={LOGO_INGEANCLAJES} alt="Ingeanclajes" style={{width:26,height:26,objectFit:"contain",borderRadius:6}}/>
        </div>
        {navItems.map(item=>{
          const active = scr===item.id;
          return (
            <div key={item.id} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              {item.sep && <div style={{width:28,height:1,background:"#2a2c33",margin:"10px 0"}}/>}
              <button onClick={()=>setScr(item.id)} title={item.l} style={{width:40,height:40,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",marginBottom:6,background:active?"#fff":"transparent",color:active?"#14151a":"#8b93a3"}}>
                {ICONS[item.id]}
              </button>
            </div>
          );
        })}
      </nav>

      <div style={{display:"flex",flexDirection:"column",flex:1,minWidth:0}}>
        <header style={{height:68,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",background:surface,borderBottom:"1px solid "+divider}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:TEXT}}>{titles[scr]||"Dashboard"}</div>
            <div style={{fontSize:12.5,color:MUTED}}>Ingeanclajes · Sistema de gestión</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setTheme(dark?"light":"dark")} style={{display:"flex",alignItems:"center",gap:6,background:surfaceTint,border:"none",borderRadius:999,padding:"8px 14px",fontSize:12.5,fontWeight:600,color:text,cursor:"pointer",fontFamily:"inherit"}}>
              {dark ? "Oscuro" : "Claro"}
            </button>
            <div style={{width:1,height:26,background:divider}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"4px 10px 4px 4px",borderRadius:999,background:surfaceTint}}>
              <Av init="MC" size={30}/>
              <div style={{lineHeight:1.15}}>
                <div style={{fontSize:12.5,fontWeight:600,color:text}}>M. Camila Sepúlveda</div>
                <div style={{fontSize:11,color:MUTED}}>Directora comercial</div>
              </div>
            </div>
          </div>
        </header>

        <main style={{flex:1,overflow:"auto",background:bg,padding:"30px 36px"}}>
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
    </div>
  );
}
