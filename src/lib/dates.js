// Utilidades de fechas (base de nomina)
import { today } from "./format";

export const parseIsoDate = (iso)=> iso ? new Date((iso) + "T12:00:00") : null;
export const diffDaysInclusive = (start,end)=> Math.floor((end-start)/(1000*60*60*24))+1;
export const toIsoDate = (date)=>{
  if(!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth()+1).padStart(2,"0");
  const day = String(date.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
};
export const addDaysToDate = (date, days=0)=>{
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
};
export const maxDate = (...dates)=>dates.filter(Boolean).reduce((acc,date)=>(!acc || date>acc ? date : acc), null);
export const minDate = (...dates)=>dates.filter(Boolean).reduce((acc,date)=>(!acc || date<acc ? date : acc), null);
export const round1 = (value)=> Math.round((Number(value)||0) * 10) / 10;
export const getDaysInMonth = (mes)=>{
  const [year,month] = String(mes || today().slice(0,7)).split("-").map(Number);
  return new Date(year, month, 0).getDate();
};
