import Av from "./ui/Av";
import { useMemo, useState } from "react";
import { PAL, SI } from "../styles/tokens";

// Lista de trabajadores con casillas, para asignarle lo mismo a varios de una
// sola vez.
//
// Antes habia que repetir el formulario entero -obra, fecha, turno, tarea- por
// cada persona, y en una obra con seis instaladores eso eran seis vueltas
// escribiendo lo mismo. El atajo que de verdad ahorra tiempo es «el equipo de
// la obra»: la obra ya sabe quien esta asignado, asi que el grupo se marca
// completo con un toque.

const sinTildes = (texto) =>
  String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function SelectorEmpleados({
  empleados = [],
  seleccionados = [],
  onCambiar,
  idsDeLaObra = [],
  nombreObra = "",
}) {
  const [busqueda, setBusqueda] = useState("");

  const marcados = useMemo(() => new Set(seleccionados), [seleccionados]);
  const delaObra = useMemo(
    () => idsDeLaObra.filter((id) => empleados.some((e) => e.id === id)),
    [idsDeLaObra, empleados]
  );

  const filtrados = useMemo(() => {
    const q = sinTildes(busqueda).trim();
    if (!q) return empleados;
    return empleados.filter((e) =>
      sinTildes(e.nombre).includes(q) || sinTildes(e.cargo).includes(q)
    );
  }, [empleados, busqueda]);

  const alternar = (id) => {
    onCambiar(marcados.has(id)
      ? seleccionados.filter((x) => x !== id)
      : [...seleccionados, id]);
  };

  // Suma a lo ya marcado en vez de reemplazarlo: se puede traer el equipo de la
  // obra y despues agregar a alguien suelto que va de refuerzo.
  const agregar = (ids) => onCambiar([...new Set([...seleccionados, ...ids])]);

  const chip = (activo) => ({
    background: activo ? "#fff4ec" : "#f4eee4",
    border: "1px solid " + (activo ? "#f9c99e" : "#e8dfd2"),
    color: activo ? "#b54708" : "#574e44",
    borderRadius: 999, padding: "4px 11px", fontSize: 11, fontWeight: 600,
    cursor: activo ? "pointer" : "default", fontFamily: "inherit",
    opacity: activo ? 1 : 0.55,
  });

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:7,flexWrap:"wrap"}}>
        <span style={{fontSize:11,fontWeight:700,color: seleccionados.length ? "#027a48" : "#a2988a"}}>
          {seleccionados.length
            ? `${seleccionados.length} ${seleccionados.length === 1 ? "persona seleccionada" : "personas seleccionadas"}`
            : "Nadie seleccionado todavía"}
        </span>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button
            type="button"
            onClick={() => delaObra.length && agregar(delaObra)}
            disabled={!delaObra.length}
            style={chip(delaObra.length > 0)}
            title={delaObra.length
              ? `Marca a los ${delaObra.length} que ya están asignados a ${nombreObra || "esta obra"}`
              : "Esta obra todavía no tiene personal asignado en su pestaña «Personal»"}
          >
            👷 Equipo de la obra ({delaObra.length})
          </button>
          <button type="button" onClick={() => agregar(filtrados.map((e) => e.id))} style={chip(filtrados.length > 0)}>
            Todos{busqueda ? " los visibles" : ""}
          </button>
          <button
            type="button"
            onClick={() => onCambiar([])}
            disabled={!seleccionados.length}
            style={chip(seleccionados.length > 0)}
          >
            Limpiar
          </button>
        </div>
      </div>

      {empleados.length > 6 && (
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o cargo"
          style={{...SI, marginBottom: 7, fontSize: 12, padding: "6px 10px"}}
        />
      )}

      <div style={{
        border: "1px solid #e8dfd2", borderRadius: 10, maxHeight: 210,
        overflowY: "auto", background: "#fff",
      }}>
        {filtrados.length === 0 && (
          <div style={{padding:"16px 12px",textAlign:"center",fontSize:12,color:"#a2988a"}}>
            Nadie coincide con «{busqueda}»
          </div>
        )}
        {filtrados.map((e) => {
          const activo = marcados.has(e.id);
          const idx = empleados.findIndex((x) => x.id === e.id);
          return (
            <label
              key={e.id}
              style={{
                display:"flex",alignItems:"center",gap:9,padding:"7px 11px",cursor:"pointer",
                borderBottom:"1px solid #f4eee4",
                background: activo ? "#f0fdf4" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={activo}
                onChange={() => alternar(e.id)}
                style={{width:15,height:15,accentColor:"#027a48",cursor:"pointer",flexShrink:0}}
              />
              <Av init={e.avatar || "?"} color={PAL[idx % PAL.length]} size={26}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:600,color:"#2b2622",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.nombre}</div>
                <div style={{fontSize:10.5,color:"#756a5e"}}>{e.cargo}</div>
              </div>
              {delaObra.includes(e.id) && (
                <span style={{fontSize:9.5,color:"#b54708",background:"#fff4ec",borderRadius:999,padding:"2px 7px",flexShrink:0}}>
                  en la obra
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
