// Formato de moneda, fechas y utilidades de rango de mes
export const fmt  = n=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n||0);
export const fmtK = n=>n>=1000000?"$" + ((n/1000000).toFixed(1)) + "M":"$" + ((n/1000).toFixed(0)) + "K";
// La fecha de hoy en la hora del equipo (Colombia), no en UTC. Con
// toISOString(), despues de las 7 p. m. salia el dia siguiente: cotizaciones,
// bitacora, pagos y nomina quedaban con la fecha de mañana.
export const today= ()=>{
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
// Una fecha suelta -"2026-08-18"- se ancla al mediodia para que el cambio de
// huso no la corra un dia hacia atras.
//
// Una marca de tiempo completa -"2026-08-18T07:31:00.000Z", que es lo que
// devuelve la base- ya trae hora. Pegarle "T12:00:00" dejaba
// "…000ZT12:00:00", que no es una fecha: en la pantalla de WhatsApp cada
// mensaje salia con «Invalid Date» al lado de la hora. Y si algo llega roto de
// verdad, mejor no escribir nada que escribir «Invalid Date» en un documento.
export const fmtD = iso=>{
  if(!iso)return"";
  const texto=String(iso);
  const d=new Date(/[T ]/.test(texto) ? texto : texto+"T12:00:00");
  if(Number.isNaN(d.getTime()))return"";
  return d.toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"});
};
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
// «27 de octubre de 2026». Acepta una fecha suelta (2026-10-27) o una fecha
// con hora (2026-10-27T22:40:00Z, que es como se guarda cuando el cliente
// firma). A la suelta se le pone el mediodia para que el huso horario no la
// corra un dia; la que ya trae hora se lee tal cual.
//
// Antes solo servia la suelta: a la otra le pegaba «T12:00:00» detras, salia
// una fecha invalida y el acta firmada decia «NaN de undefined de NaN».
export const fmtL = iso=>{
  if(!iso)return"";
  const ms=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const valor=String(iso);
  const d=/\d{2}:\d{2}/.test(valor) ? new Date(valor) : new Date(valor+"T12:00:00");
  if(Number.isNaN(d.getTime()))return"";
  return (d.getDate()) + " de " + (ms[d.getMonth()]) + " de " + (d.getFullYear());
};
