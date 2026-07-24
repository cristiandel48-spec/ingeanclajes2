// Formato de moneda, fechas y utilidades de rango de mes
export const fmt  = n=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n||0);
export const fmtK = n=>n>=1000000?"$" + ((n/1000000).toFixed(1)) + "M":"$" + ((n/1000).toFixed(0)) + "K";
export const today= ()=>new Date().toISOString().split("T")[0];
export const fmtD = iso=>{ if(!iso)return""; const d=new Date(iso+"T12:00:00"); return d.toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"}); };
export const scrollAppToTop = (behavior="smooth")=>{
  const main = typeof document!=="undefined" ? document.querySelector("main") : null;
  if(main?.scrollTo) main.scrollTo({top:0,behavior});
  if(typeof window!=="undefined" && window.scrollTo){
    window.scrollTo({top:0,behavior});
  }
};
export const buildMonthDateRange = (period = today().slice(0,7))=>{
  const normalized = String(period || "").trim();
  if(!/^\d{4}-\d{2}$/.test(normalized)){
    const current = today();
    return {inicio:current.slice(0,7) + "-01", fin:current};
  }
  const [year, month] = normalized.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    inicio:`${normalized}-01`,
    fin:`${normalized}-${String(lastDay).padStart(2,"0")}`,
  };
};
export const isDateWithinRange = (iso = "", inicio = "", fin = "")=>{
  const value = String(iso || "").trim();
  if(!value) return false;
  if(inicio && value < inicio) return false;
  if(fin && value > fin) return false;
  return true;
};
export const fmtL = iso=>{ if(!iso)return""; const ms=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]; const d=new Date(iso+"T12:00:00"); return (d.getDate()) + " de " + (ms[d.getMonth()]) + " de " + (d.getFullYear()); };
