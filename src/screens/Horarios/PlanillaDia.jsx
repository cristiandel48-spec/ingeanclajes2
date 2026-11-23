import { useRef, useState } from "react";
import { Button } from "../../components/ui";
import { normalizarMayusculas } from "../../lib/normalizarEntrada";

// Planilla «Actividades y clientes» del dia: la misma hoja que se armaba a mano
// en Excel y se mandaba como foto al grupo de WhatsApp. Ahora sale sola de los
// turnos guardados y se descarga como imagen lista para reenviar.
//
// Va siempre en claro (clase doc-shell, que el modo oscuro respeta): es un
// documento, y la imagen que se comparte tiene que verse igual que en pantalla.

const DIAS = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

const fechaLarga = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso || "";
  return `${DIAS[d.getDay()]} ${d.getDate()} DE ${MESES[d.getMonth()]} DEL ${d.getFullYear()}`;
};

const hora12 = (hhmm) => {
  const [hs, ms = "00"] = String(hhmm || "").trim().split(":");
  const h = Number(hs);
  if (!hs || Number.isNaN(h)) return "";
  return `${((h + 11) % 12) + 1}:${ms.padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const inicioDelTurno = (turno) => String(turno || "").split("-")[0].trim();

// SST se pone junto al nombre, como en la hoja: «PAOLA - SST».
const etiquetaTrabajador = (e) => {
  const nombre = normalizarMayusculas(String(e?.nombre || "—").trim());
  return /\bSST\b|SEGURIDAD/i.test(String(e?.cargo || "")) ? `${nombre} - SST` : nombre;
};

// Hoja tipo Excel (cuadricula completa, todo centrado, cabecera azul) con
// acabado Apple: tipografia del sistema, lineas finas, azul suave, esquinas
// redondeadas y jerarquia por peso y gris en vez de por tamaño.
const ESTILOS_PLANILLA = `
  .hor-planilla {
    background: #ffffff;
    color: #1d1d1f;
    border: 1px solid #d5dcef;
    border-radius: 14px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    min-width: 860px;
    box-shadow: 0 1px 2px rgba(16, 24, 64, .04), 0 8px 24px rgba(16, 24, 64, .05);
  }
  .hor-planilla__titulo {
    background: #dfe6ff;
    color: #1d1d1f;
    text-align: center;
    font-weight: 700;
    font-size: 17px;
    letter-spacing: .06em;
    text-transform: uppercase;
    padding: 14px 16px 12px;
    border-bottom: 3px double #b9c5ea;
  }
  .hor-planilla__fecha {
    display: block;
    margin-top: 3px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: .04em;
    color: #5b6478;
  }
  .hor-planilla table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .hor-planilla th {
    background: #eef2ff;
    color: #2c2f3a;
    font-weight: 600;
    font-size: 13px;
    letter-spacing: .07em;
    text-transform: uppercase;
    text-align: center;
    padding: 12px 8px;
    border: 1px solid #d5dcef;
    border-top: none;
  }
  .hor-planilla td {
    background: #ffffff;
    color: #1d1d1f;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.55;
    text-transform: uppercase;
    text-align: center;
    vertical-align: middle;
    padding: 18px 12px;
    border: 1px solid #e3e7f2;
    word-break: break-word;
  }
  .hor-planilla tbody tr:nth-child(even) td { background: #fafbff; }
  .hor-planilla th:first-child, .hor-planilla td:first-child { border-left: none; }
  .hor-planilla th:last-child, .hor-planilla td:last-child { border-right: none; }
  .hor-planilla tbody tr:last-child td { border-bottom: none; }
  .hor-planilla__cliente { font-weight: 600; }
  .hor-planilla__suave {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    font-weight: 500;
    color: #6e6e73;
  }
  .hor-planilla__cifra {
    font-size: 20px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: -.01em;
  }
  .hor-planilla__vacio { color: #c7c7cc; }
  .hor-planilla tr.hor-planilla__fila-vacia td { height: 44px; padding: 0; background: #ffffff; }
  .hor-planilla td.hor-planilla__sin-datos {
    padding: 26px 12px;
    background: #fafbff;
    color: #6e6e73;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: .05em;
  }
  .hor-planilla__hora {
    display: inline-block;
    margin-top: 6px;
    padding: 2px 10px;
    border-radius: 999px;
    background: #eef2ff;
    color: #2a3b8f;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .hor-planilla__marco {
    width: 100%;
    overflow-x: auto;
    padding: 2px 2px 10px;
    box-sizing: border-box;
  }
`;

// Agrupa los turnos del dia por obra: una fila por cliente, con todos sus
// trabajadores juntos, como la hoja original.
function filasDeLaPlanilla(dia, obras, empleados) {
  const porObra = new Map();
  for (const h of dia) {
    if (!porObra.has(h.obraId)) porObra.set(h.obraId, []);
    porObra.get(h.obraId).push(h);
  }
  return [...porObra.entries()].map(([obraId, turnos]) => {
    const o = obras.find((x) => x.id === obraId);
    const ids = [...new Set(turnos.map((t) => t.empleadoId))];
    const trabajadores = ids
      .map((id) => empleados.find((e) => e.id === id))
      .filter(Boolean)
      .map(etiquetaTrabajador);
    const actividades = [...new Set(turnos.map((t) => String(t.tarea || "").trim()).filter(Boolean))];
    const cantidades = [...new Set(turnos.map((t) => String(t.cantidad || "").trim()).filter(Boolean))];
    const inicios = turnos.map((t) => inicioDelTurno(t.turno)).filter(Boolean).sort();
    const cliente = normalizarMayusculas(o?.cliente || "SIN OBRA");
    const proyecto = normalizarMayusculas(o?.proyecto || "");
    return {
      obraId,
      cliente,
      proyecto: proyecto && proyecto !== cliente ? proyecto : "",
      actividad: actividades.join(" / "),
      cantidad: cantidades.join(" / "),
      trabajadores,
      direccion: [o?.direccion, o?.ciudad].filter(Boolean).join(" ").toUpperCase(),
      hora: inicios[0] ? hora12(inicios[0]) : "",
    };
  });
}

export default function PlanillaDia({ fecha, dia, obras, empleados, accionVacia = null }) {
  const hojaRef = useRef(null);
  const [estado, setEstado] = useState(null); // null | "trabajando" | "listo" | "error"
  const filas = filasDeLaPlanilla(dia, obras, empleados);
  const fechaTexto = fechaLarga(fecha);

  // Foto de la hoja en PNG. Se intenta copiar al portapapeles (se pega directo
  // en el chat) y ademas se descarga, por si el navegador no deja copiar.
  const descargarImagen = async () => {
    if (!hojaRef.current) return;
    setEstado("trabajando");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const lienzo = await html2canvas(hojaRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        width: hojaRef.current.scrollWidth,
        windowWidth: hojaRef.current.scrollWidth + 40,
      });
      const blob = await new Promise((ok) => lienzo.toBlob(ok, "image/png"));
      if (!blob) throw new Error("No se pudo generar la imagen.");
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      } catch {
        // Sin permiso de portapapeles: queda la descarga.
      }
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `programacion-${fecha}.png`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setEstado("listo");
      setTimeout(() => setEstado(null), 6000);
    } catch {
      setEstado("error");
      setTimeout(() => setEstado(null), 6000);
    }
  };

  return (
    <div>
      <style>{ESTILOS_PLANILLA}</style>
      <div className="hor-planilla__marco">
        <div ref={hojaRef} className="hor-planilla doc-shell">
          <div className="hor-planilla__titulo">
            Actividades y clientes
            <span className="hor-planilla__fecha">{fechaTexto}</span>
          </div>
          <table>
            <colgroup>
              <col style={{ width: "16%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "22%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Clientes</th>
                <th>Actividad</th>
                <th>Cantidades</th>
                <th>Trabajadores</th>
                <th>Dirección</th>
                <th>Fecha y hora</th>
              </tr>
            </thead>
            <tbody>
              {/* Dia sin turnos: la hoja se ve igual, con la cuadricula en
                  blanco, para que la pantalla siempre abra como la planilla. */}
              {filas.length === 0 && (
                <>
                  <tr className="hor-planilla__fila-vacia">
                    <td /><td /><td /><td /><td /><td />
                  </tr>
                  <tr>
                    <td colSpan={6} className="hor-planilla__sin-datos">
                      Sin actividades programadas para este día
                    </td>
                  </tr>
                  <tr className="hor-planilla__fila-vacia">
                    <td /><td /><td /><td /><td /><td />
                  </tr>
                </>
              )}
              {filas.map((f) => (
                <tr key={f.obraId}>
                  <td>
                    <span className="hor-planilla__cliente">{f.cliente}</span>
                    {f.proyecto && <span className="hor-planilla__suave">{f.proyecto}</span>}
                  </td>
                  <td>{f.actividad}</td>
                  <td>
                    {f.cantidad
                      ? <span className={/^\d+$/.test(f.cantidad) ? "hor-planilla__cifra" : undefined}>{f.cantidad}</span>
                      : <span className="hor-planilla__vacio">—</span>}
                  </td>

                  <td>
                    {f.trabajadores.map((t) => (
                      <div key={t}>{t}</div>
                    ))}
                  </td>
                  <td>{f.direccion}</td>
                  <td>
                    {fechaTexto}
                    {f.hora && <div><span className="hor-planilla__hora">{f.hora}</span></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        {/* Dia vacio: no hay nada que descargar; lo que toca es asignar. */}
        {filas.length === 0 ? accionVacia : (
          <Button
            variante="secondary"
            icono="descargar"
            onClick={descargarImagen}
            disabled={estado === "trabajando"}
          >
            {estado === "trabajando" ? "Generando imagen…" : "Descargar imagen para WhatsApp"}
          </Button>
        )}
        {estado === "listo" && (
          <span style={{ fontSize: 13, color: "var(--success-text)" }}>
            Imagen descargada (y copiada, si el navegador lo permitió): pégala o adjúntala en el grupo.
          </span>
        )}
        {estado === "error" && (
          <span style={{ fontSize: 13, color: "var(--danger-text)" }}>
            No se pudo generar la imagen. Intenta de nuevo.
          </span>
        )}
      </div>
    </div>
  );
}
