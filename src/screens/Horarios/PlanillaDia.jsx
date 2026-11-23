import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui";
import { today } from "../../lib/format";
import { obrasMasNuevasPrimero } from "../../lib/identificadores";
import { normalizarMayusculas } from "../../lib/normalizarEntrada";

// Planilla «Actividades y clientes» del dia: la misma hoja que se armaba a mano
// en Excel y se mandaba como foto al grupo de WhatsApp.
//
// Se llena ahi mismo, como en Excel: se elige el cliente, se agregan los
// trabajadores y se escribe en las celdas. Cada cambio se guarda solo (son los
// mismos turnos de siempre, agrupados por obra) y la hoja se descarga como
// imagen lista para reenviar.
//
// Va siempre en claro (clase doc-shell, que el modo oscuro respeta): es un
// documento, y la imagen que se comparte tiene que verse igual que en pantalla.
// Todo lo que es para editar -botones, listas, pistas- lleva
// data-html2canvas-ignore y no sale en la imagen.

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

const sumarDias = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const hora12 = (hhmm) => {
  const [hs, ms = "00"] = String(hhmm || "").trim().split(":");
  const h = Number(hs);
  if (!hs || Number.isNaN(h)) return "";
  return `${((h + 11) % 12) + 1}:${ms.padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

// Lo normal es salir todos de la oficina; solo se cambia cuando la cuadrilla
// llega directo a la obra. Un turno sin punto de encuentro es este.
const ENCUENTRO_POR_DEFECTO = "Salida desde la oficina";
const INICIO_POR_DEFECTO = "07:00";

const limpio = (v) => String(v ?? "").trim();
const inicioDelTurno = (turno) => limpio(turno).split("-")[0].trim();
const distintos = (lista) => [...new Set(lista)];

// SST se pone junto al nombre, como en la hoja: «PAOLA - SST».
const etiquetaTrabajador = (e) => {
  const nombre = normalizarMayusculas(limpio(e?.nombre) || "—");
  return /\bSST\b|SEGURIDAD/i.test(String(e?.cargo || "")) ? `${nombre} - SST` : nombre;
};

const direccionDe = (o) => [o?.direccion, o?.ciudad].filter(Boolean).join(" ").toUpperCase();

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
  .hor-nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
  }
  .hor-planilla .hor-fecha-btn {
    display: inline-block;
    padding: 3px 10px;
    border: 1px solid transparent;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    color: #2c2f3a;
    outline: none;
    transition: background .12s ease, border-color .12s ease;
  }
  .hor-planilla .hor-fecha-btn:hover, .hor-planilla .hor-fecha-btn:focus-visible {
    background: rgba(255, 255, 255, .7);
    border-color: #b9c5ea;
  }
  .hor-planilla .hor-flecha {
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #5b6478;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    transition: background .12s ease;
  }
  .hor-planilla .hor-flecha:hover, .hor-planilla .hor-flecha:focus-visible { background: rgba(255, 255, 255, .8); }
  .hor-planilla .hor-chip {
    padding: 3px 12px;
    border: 1px solid #b9c5ea;
    border-radius: 999px;
    background: #ffffff;
    color: #2a3b8f;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    cursor: pointer;
    transition: background .12s ease;
  }
  .hor-planilla .hor-chip:hover, .hor-planilla .hor-chip:focus-visible { background: #eef2ff; }
  .hor-planilla table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
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
    position: relative;
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
  .hor-planilla td.hor-planilla__sin-datos {
    padding: 22px 12px;
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

  /* ── Edicion en la celda ── */
  .hor-celda {
    display: block;
    min-height: 22px;
    margin: -4px -4px;
    padding: 4px 6px;
    border: 1px solid transparent;
    border-radius: 7px;
    cursor: text;
    outline: none;
    transition: background .12s ease, border-color .12s ease;
  }
  .hor-celda:hover, .hor-celda:focus-visible {
    background: #f1f4ff;
    border-color: #c5d0f5;
  }
  .hor-celda--linea { display: inline-block; margin: 0; }
  .hor-celda__ph {
    color: #b4b9c6;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
  }
  .hor-planilla .hor-input {
    display: block;
    width: 100%;
    box-sizing: border-box;
    font: inherit;
    font-size: 14px;
    color: #1d1d1f;
    background: #ffffff;
    text-align: center;
    text-transform: uppercase;
    border: 2px solid #0a84ff;
    border-radius: 7px;
    padding: 4px 6px;
    /* El aro de foco de la app es rojo; aqui manda el azul de la celda. */
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(10, 132, 255, .15) !important;
  }
  .hor-planilla .hor-input::placeholder { color: #b4b9c6; text-transform: none; }
  .hor-planilla .hor-agregar {
    appearance: none;
    -webkit-appearance: none;
    max-width: 100%;
    margin-top: 8px;
    padding: 5px 14px;
    border: 1px dashed #b9c5ea;
    border-radius: 999px;
    background: #f5f7ff;
    color: #2a3b8f;
    font: inherit;
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    text-align: center;
    text-align-last: center;
    cursor: pointer;
    outline: none;
    transition: background .12s ease, border-color .12s ease;
  }
  .hor-planilla .hor-agregar:hover, .hor-planilla .hor-agregar:focus-visible {
    background: #e9eeff;
    border-color: #8fa2e6;
  }
  /* Ancho fijo: una lista mide lo que su opcion mas larga, y con eso
     ensanchaba la columna entera. */
  .hor-planilla select.hor-agregar { width: 176px; }
  .hor-planilla .hor-agregar--solo { margin-top: 0; }
  .hor-planilla .hor-agregar--fecha { display: inline-block; margin-top: 10px; }
  /* Nombre y apellidos en un solo renglon: partidos en dos no se sabia donde
     terminaba una persona y empezaba la otra. La tabla reparte el ancho segun
     el contenido (table-layout: auto) para que el nombre mas largo quepa. */
  .hor-trab { position: relative; padding: 0 20px; white-space: nowrap; }

  /* ── La hoja como imagen ──
     Se fotografia una copia con ancho fijo, no lo que haya en pantalla: asi la
     imagen sale igual desde un celular o un monitor grande, la hoja la ocupa
     entera (sin franjas en blanco a los lados) y la letra se lee en WhatsApp. */
  .hor-planilla.hor-planilla--imagen {
    position: absolute;
    left: 0;
    top: 0;
    margin: 0;
    width: 1120px;
    min-width: 0;
    border-radius: 0;
    box-shadow: none;
    overflow: visible;
  }
  .hor-planilla--imagen .hor-trab { padding: 0; }
  .hor-planilla .hor-x {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #a0a6b5;
    font-size: 15px;
    line-height: 16px;
    cursor: pointer;
    opacity: .45;
    transition: opacity .12s ease, background .12s ease, color .12s ease;
  }
  .hor-planilla tr:hover .hor-x { opacity: 1; }
  .hor-planilla .hor-x:hover, .hor-planilla .hor-x:focus-visible { background: #ffe5e5; color: #d70015; opacity: 1; }
  .hor-planilla .hor-x--fila { top: 6px; right: 6px; transform: none; }
  .hor-pista {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    color: #b25000;
  }
  .hor-pista--suave { color: #a0a6b5; }
`;

// Agrupa los turnos del dia por obra: una fila por cliente, con todos sus
// trabajadores juntos, como la hoja original.
//
// Una celda se puede escribir cuando todos los turnos de la fila comparten el
// dato. Si varia -dos turnos con tareas distintas, armados con el formulario-
// se muestra junto y se corrige abajo, en la lista de turnos.
function filasDeLaPlanilla(dia, obras, empleados) {
  const porObra = new Map();
  for (const h of dia) {
    if (!porObra.has(h.obraId)) porObra.set(h.obraId, []);
    porObra.get(h.obraId).push(h);
  }
  return [...porObra.entries()].map(([obraId, turnos]) => {
    const o = obras.find((x) => x.id === obraId);
    const trabajadores = distintos(turnos.map((t) => t.empleadoId))
      .map((id) => empleados.find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => ({ id: e.id, etiqueta: etiquetaTrabajador(e) }));
    const tareas = distintos(turnos.map((t) => limpio(t.tarea)));
    const cantidades = distintos(turnos.map((t) => limpio(t.cantidad)));
    const encuentros = distintos(turnos.map((t) => limpio(t.encuentro)));
    const horas = distintos(turnos.map((t) => limpio(t.turno)));
    const inicios = horas.map(inicioDelTurno).filter(Boolean).sort();
    const cliente = normalizarMayusculas(o?.cliente || "SIN OBRA");
    const proyecto = normalizarMayusculas(o?.proyecto || "");
    return {
      obraId,
      cliente,
      proyecto: proyecto && proyecto !== cliente ? proyecto : "",
      trabajadores,
      direccion: direccionDe(o),
      tarea: tareas.length === 1 ? tareas[0] : null,
      tareaTexto: tareas.filter(Boolean).join(" / "),
      cantidad: cantidades.length === 1 ? cantidades[0] : null,
      cantidadTexto: cantidades.filter(Boolean).join(" / "),
      encuentro: encuentros.length === 1 ? encuentros[0] : null,
      encuentroTexto: distintos(encuentros.map((x) => x || ENCUENTRO_POR_DEFECTO)).join(" / "),
      inicio: horas.length === 1 ? inicioDelTurno(horas[0]) : null,
      inicioTexto: inicios[0] ? hora12(inicios[0]) : "",
    };
  });
}

const VARIA = "Este dato cambia entre los turnos de la fila. Corrígelo abajo, en «Turnos del día».";

// Celda de texto: se ve como texto y, al hacer clic, se vuelve un campo.
// Enter o salir de la celda guarda; Escape deja lo que habia.
function CeldaTexto({
  valor, mostrar, placeholder, onGuardar, lista, maxLength = 160,
  etiqueta, enLinea = false, claseTexto,
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const cerrado = useRef(false);

  // `valor` nulo = el dato varia entre turnos: solo se muestra.
  if (valor === null) {
    return <span title={VARIA} className={claseTexto}>{mostrar}</span>;
  }

  const abrir = () => {
    cerrado.current = false;
    setBorrador(valor);
    setEditando(true);
  };
  const cerrar = (guardar) => {
    if (cerrado.current) return;
    cerrado.current = true;
    setEditando(false);
    const nuevo = limpio(borrador);
    if (guardar && nuevo !== valor) onGuardar(nuevo);
  };

  if (editando) {
    return (
      <input
        autoFocus
        className="hor-input"
        value={borrador}
        list={lista}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={etiqueta}
        onChange={(e) => setBorrador(e.target.value)}
        onBlur={() => cerrar(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); cerrar(true); }
          if (e.key === "Escape") { e.preventDefault(); cerrar(false); }
        }}
      />
    );
  }

  const texto = mostrar ?? valor;
  return (
    <div
      role="button"
      tabIndex={0}
      className={`hor-celda${enLinea ? " hor-celda--linea" : ""}`}
      title="Clic para escribir"
      aria-label={`${etiqueta}: ${texto || "vacío"}. Clic para escribir`}
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "F2") { e.preventDefault(); abrir(); }
      }}
    >
      {texto
        ? <span className={claseTexto}>{texto}</span>
        : <span className="hor-celda__ph" data-html2canvas-ignore="true">{placeholder}</span>}
    </div>
  );
}

// Hora de entrada: la etiqueta azul se vuelve un campo de hora al hacer clic.
function CeldaHora({ inicio, mostrar, onGuardar }) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const cerrado = useRef(false);

  if (inicio === null) {
    return mostrar ? <span className="hor-planilla__hora" title={VARIA}>{mostrar}</span> : null;
  }

  const abrir = () => {
    cerrado.current = false;
    setBorrador(inicio || INICIO_POR_DEFECTO);
    setEditando(true);
  };
  const cerrar = (guardar) => {
    if (cerrado.current) return;
    cerrado.current = true;
    setEditando(false);
    if (guardar && borrador && borrador !== inicio) onGuardar(borrador);
  };

  if (editando) {
    return (
      <input
        autoFocus
        type="time"
        className="hor-input"
        style={{ marginTop: 6 }}
        value={borrador}
        aria-label="Hora de entrada"
        onChange={(e) => setBorrador(e.target.value)}
        onBlur={() => cerrar(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); cerrar(true); }
          if (e.key === "Escape") { e.preventDefault(); cerrar(false); }
        }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      className={inicio ? "hor-planilla__hora" : "hor-celda hor-celda--linea"}
      style={{ cursor: "pointer" }}
      title="Clic para cambiar la hora de entrada"
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "F2") { e.preventDefault(); abrir(); }
      }}
    >
      {inicio
        ? hora12(inicio)
        : <span className="hor-celda__ph" data-html2canvas-ignore="true">Agregar hora</span>}
    </span>
  );
}

// Fecha que abre el calendario del sistema al tocarla. El campo de fecha va
// escondido debajo: lo que se ve -y lo que sale en la imagen- es el texto.
function SelectorFecha({ fecha, onCambiar, className, titulo, children }) {
  const campo = useRef(null);
  const abrir = () => {
    const el = campo.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        role="button"
        tabIndex={0}
        className={className}
        style={{ cursor: "pointer" }}
        title={titulo}
        onClick={abrir}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "F2") { e.preventDefault(); abrir(); }
        }}
      >
        {children}
      </span>
      <input
        ref={campo}
        type="date"
        className="no-full-width"
        value={fecha}
        tabIndex={-1}
        aria-hidden="true"
        data-html2canvas-ignore="true"
        onChange={(e) => e.target.value && e.target.value !== fecha && onCambiar(e.target.value)}
        style={{
          position: "absolute", left: "50%", bottom: 0, width: 1, height: 1,
          opacity: 0, pointerEvents: "none", border: 0, padding: 0,
        }}
      />
    </span>
  );
}

// Lista para sumar gente a la fila. Es la lista del sistema, que no se recorta
// con los bordes de la hoja y en el celular abre el selector de siempre.
function AgregarTrabajador({ empleados, yaEstan, equipo, ocupados, onAgregar, solo }) {
  const libres = empleados.filter((e) => !yaEstan.includes(e.id));
  if (!libres.length) return null;
  const delEquipo = libres.filter((e) => equipo.includes(e.id));
  const resto = libres.filter((e) => !equipo.includes(e.id));
  const opcion = (e) => (
    <option key={e.id} value={e.id}>
      {limpio(e.nombre)}
      {e.cargo ? ` · ${e.cargo}` : ""}
      {ocupados.has(e.id) ? ` — ya está en ${ocupados.get(e.id)}` : ""}
    </option>
  );
  return (
    <select
      className={`hor-agregar${solo ? " hor-agregar--solo" : ""}`}
      data-html2canvas-ignore="true"
      aria-label="Agregar trabajador a la fila"
      value=""
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return;
        onAgregar(v === "__equipo" ? delEquipo.map((x) => x.id) : [v]);
      }}
    >
      <option value="">＋ Agregar trabajador</option>
      {delEquipo.length > 1 && (
        <option value="__equipo">Todo el equipo de la obra ({delEquipo.length})</option>
      )}
      {delEquipo.length > 0 && <optgroup label="Equipo de la obra">{delEquipo.map(opcion)}</optgroup>}
      {resto.length > 0 && (
        <optgroup label={delEquipo.length ? "Resto del personal" : "Personal"}>{resto.map(opcion)}</optgroup>
      )}
    </select>
  );
}

// El menu de compartir del sistema, cuando acepta archivos: celulares, y
// Chrome o Edge en el computador. Firefox de escritorio no lo tiene.
const puedeCompartirArchivos = () => {
  try {
    const prueba = new File([""], "prueba.png", { type: "image/png" });
    return Boolean(navigator.canShare && navigator.canShare({ files: [prueba] }));
  } catch {
    return false;
  }
};

const FILA_NUEVA = { obraId: "", empleadoIds: [], tarea: "", cantidad: "", encuentro: "", inicio: INICIO_POR_DEFECTO };

const normalizarEncuentro = (texto) =>
  limpio(texto).toLowerCase() === ENCUENTRO_POR_DEFECTO.toLowerCase() ? "" : limpio(texto);

export default function PlanillaDia({
  fecha, dia, obras, empleados, tareasSugeridas = [], accionVacia = null,
  onCrearFila, onEditarFila, onAgregarTrabajadores, onQuitarTrabajador, onQuitarFila,
  onCambiarFecha, onMoverFila,
}) {
  const hoy = today();
  const manana = sumarDias(hoy, 1);
  const hojaRef = useRef(null);
  const [ocupado, setOcupado] = useState(false); // se esta armando la imagen
  const [aviso, setAviso] = useState(null); // { tono, texto, enlace?, textoEnlace? }
  // Imagen ya armada, a la espera de un toque para abrir el menu de compartir.
  const [pendiente, setPendiente] = useState(null);
  const [puedeCompartir] = useState(puedeCompartirArchivos);
  // La libreria que arma la imagen se trae al abrir la pantalla, no al tocar
  // el boton: la ventana de compartir exige abrirse casi enseguida del toque,
  // y esa descarga era justo lo que mas demoraba.
  useEffect(() => {
    import("html2canvas").catch(() => {});
  }, []);
  // La fila que se esta empezando. No es un turno todavia: se guarda sola en
  // cuanto tiene cliente y al menos un trabajador, que es lo minimo de un turno.
  const [nueva, setNueva] = useState(FILA_NUEVA);
  const filas = filasDeLaPlanilla(dia, obras, empleados);
  const fechaTexto = fechaLarga(fecha);
  const editable = Boolean(onCrearFila && onEditarFila);

  // Quien ya tiene turno ese dia, y con que cliente: se avisa en la lista, sin
  // bloquear, porque a veces el dia se reparte entre dos obras.
  const ocupadosFuera = (obraId) => {
    const mapa = new Map();
    for (const h of dia) {
      if (h.obraId === obraId || mapa.has(h.empleadoId)) continue;
      const o = obras.find((x) => x.id === h.obraId);
      mapa.set(h.empleadoId, limpio(o?.cliente) || "otra obra");
    }
    return mapa;
  };
  const equipoDe = (obraId) => {
    const o = obras.find((x) => x.id === obraId);
    return Array.isArray(o?.empleados) ? o.empleados : [];
  };

  const cambiarNueva = (cambios) => {
    const siguiente = { ...nueva, ...cambios };
    if (siguiente.obraId && siguiente.empleadoIds.length) {
      onCrearFila(siguiente);
      setNueva(FILA_NUEVA);
    } else {
      setNueva(siguiente);
    }
  };
  const obraNueva = obras.find((o) => o.id === nueva.obraId);
  const obrasLibres = obrasMasNuevasPrimero(obras).filter((o) => !filas.some((f) => f.obraId === o.id));
  const nuevaEmpezada = Boolean(
    nueva.obraId || nueva.empleadoIds.length || nueva.tarea || nueva.cantidad || nueva.encuentro
  );

  // ── La hoja como imagen ──────────────────────────────────────────────────
  //
  // WhatsApp no recibe una imagen por enlace: solo se le puede pasar por la
  // ventana de compartir del dispositivo, o pegandola en el chat. Por eso hay
  // tres caminos, del mas directo al mas manual:
  //   1. «Enviar por WhatsApp»: abre la ventana de compartir (la misma de
  //      cualquier app) y ahi se elige WhatsApp y el grupo.
  //   2. «Copiar»: deja la imagen en el portapapeles y el enlace a WhatsApp
  //      Web, para pegarla en el grupo con Ctrl+V desde el computador.
  //   3. «Descargar» el PNG, para adjuntarlo a mano.
  //
  // Solo se manda el archivo, sin texto: con texto y archivo juntos WhatsApp
  // en iPhone se queda con el texto y descarta la imagen.
  const avisoTimer = useRef(null);
  const avisar = (siguiente, segundos = 8) => {
    clearTimeout(avisoTimer.current);
    setAviso(siguiente);
    if (siguiente && segundos) avisoTimer.current = setTimeout(() => setAviso(null), segundos * 1000);
  };

  const generarImagen = async () => {
    const { default: html2canvas } = await import("html2canvas");
    const lienzo = await html2canvas(hojaRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      windowWidth: 1400,
      // La copia que se fotografia se saca de la pagina y se pone sola, con su
      // ancho fijo (clase --imagen). Sin `width`: el tamaño de la imagen es el
      // de esa copia, justo, y no el de la pantalla. Antes se pedia el ancho de
      // la pantalla y sobraba una franja blanca a la derecha.
      onclone: (doc, copia) => {
        copia.classList.add("hor-planilla--imagen");
        doc.body.appendChild(copia);
        // Si un nombre muy largo no cabe en el ancho fijo, la hoja se ensancha
        // en vez de cortarlo.
        const tabla = copia.querySelector("table");
        if (tabla && tabla.scrollWidth > copia.clientWidth) {
          copia.style.width = `${tabla.scrollWidth + 2}px`;
        }
      },
    });
    const blob = await new Promise((ok) => lienzo.toBlob(ok, "image/png"));
    if (!blob) throw new Error("No se pudo generar la imagen.");
    return new File([blob], `programacion-${fecha}.png`, { type: "image/png" });
  };

  const bajar = (archivo) => {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = archivo.name;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  // Una accion a la vez: mientras se arma la imagen los botones esperan.
  const conImagen = async (accion) => {
    if (!hojaRef.current || ocupado) return;
    setOcupado(true);
    setPendiente(null);
    avisar(null);
    try {
      await accion(await generarImagen());
    } catch {
      avisar({ tono: "error", texto: "No se pudo generar la imagen. Intenta de nuevo." });
    } finally {
      setOcupado(false);
    }
  };

  // El menu de compartir exige que lo pida un toque de la persona. Armar la
  // imagen tarda, y en iPhone ese permiso puede vencerse mientras tanto: ahi la
  // imagen queda lista y se comparte con un segundo toque, que ya es inmediato.
  const abrirMenuCompartir = async (archivo) => {
    try {
      await navigator.share({ files: [archivo], title: `Programación ${fechaTexto}` });
      setPendiente(null);
      avisar(null);
    } catch (error) {
      if (error?.name === "AbortError") return; // Cerro el menu sin enviar.
      if (error?.name === "NotAllowedError") {
        setPendiente(archivo);
        avisar({ tono: "ok", texto: "La imagen ya está lista. Toca «Compartir ahora»." }, 0);
        return;
      }
      bajar(archivo);
      avisar({ tono: "ok", texto: "No se pudo abrir el menú de compartir, así que se descargó la imagen: adjúntala en el grupo." }, 12);
    }
  };

  // «Enviar por WhatsApp» abre la ventana de compartir del dispositivo, la
  // misma de cualquier app: ahi se toca WhatsApp y se elige el grupo. Asi es
  // en el celular, que es desde donde se arma la hoja, y tambien en el
  // computador cuando el navegador la tiene. Solo si no existe (Firefox de
  // escritorio) se cae a copiar la imagen para pegarla en WhatsApp Web.
  const enviarPorWhatsApp = () => conImagen(async (archivo) => {
    if (puedeCompartir) {
      await abrirMenuCompartir(archivo);
      return;
    }
    await copiarParaPegar(archivo);
  });

  const copiarImagen = () => conImagen((archivo) => copiarParaPegar(archivo));

  const copiarParaPegar = async (archivo) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": archivo })]);
      avisar({
        tono: "ok",
        texto: "Imagen copiada. Abre el grupo en WhatsApp y pégala con Ctrl+V.",
        enlace: "https://web.whatsapp.com/",
        textoEnlace: "Abrir WhatsApp Web",
      }, 60);
    } catch {
      bajar(archivo);
      avisar({
        tono: "ok",
        texto: "El navegador no dejó copiar la imagen, así que se descargó: adjúntala en el grupo de WhatsApp.",
        enlace: "https://web.whatsapp.com/",
        textoEnlace: "Abrir WhatsApp Web",
      }, 60);
    }
  };

  const descargarImagen = () => conImagen(async (archivo) => {
    bajar(archivo);
    avisar({ tono: "ok", texto: "Imagen descargada." });
  });

  const celdaFecha = (encuentro, encuentroTexto, inicio, inicioTexto, guardar, alCambiarFecha, botonFecha, tituloFecha) => (
    <td>
      {fechaTexto}
      <div>
        {editable ? (
          <CeldaTexto
            enLinea
            etiqueta="Punto de encuentro"
            valor={encuentro}
            mostrar={encuentroTexto}
            placeholder={ENCUENTRO_POR_DEFECTO}
            lista="hor-planilla-encuentros"
            maxLength={60}
            onGuardar={(v) => guardar({ encuentro: normalizarEncuentro(v) })}
          />
        ) : encuentroTexto}
      </div>
      <div>
        {editable
          ? <CeldaHora inicio={inicio} mostrar={inicioTexto} onGuardar={(v) => guardar({ inicio: v })} />
          : inicioTexto && <span className="hor-planilla__hora">{inicioTexto}</span>}
      </div>
      {/* La fecha se cambia con un boton a la vista, igual que se agrega un
          cliente o un trabajador: tocar el texto no se le ocurria a nadie. */}
      {editable && alCambiarFecha && (
        <div data-html2canvas-ignore="true">
          <SelectorFecha
            fecha={fecha}
            onCambiar={alCambiarFecha}
            className="hor-agregar hor-agregar--fecha"
            titulo={tituloFecha}
          >
            {botonFecha}
          </SelectorFecha>
        </div>
      )}
    </td>
  );

  return (
    <div>
      <style>{ESTILOS_PLANILLA}</style>
      <div className="hor-planilla__marco">
        <div ref={hojaRef} className="hor-planilla doc-shell">
          <div className="hor-planilla__titulo">
            Actividades y clientes
            {/* El dia de la hoja se cambia aqui mismo: flechas, calendario al
                tocar la fecha y atajos. En la imagen solo sale la fecha. */}
            <div className="hor-planilla__fecha">
              {onCambiarFecha ? (
                <span className="hor-nav">
                  <button
                    type="button"
                    className="hor-flecha"
                    data-html2canvas-ignore="true"
                    title="Día anterior"
                    aria-label="Día anterior"
                    onClick={() => onCambiarFecha(sumarDias(fecha, -1))}
                  >
                    ‹
                  </button>
                  <SelectorFecha
                    fecha={fecha}
                    onCambiar={onCambiarFecha}
                    className="hor-fecha-btn"
                    titulo="Clic para elegir otro día"
                  >
                    {fechaTexto}
                  </SelectorFecha>
                  <button
                    type="button"
                    className="hor-flecha"
                    data-html2canvas-ignore="true"
                    title="Día siguiente"
                    aria-label="Día siguiente"
                    onClick={() => onCambiarFecha(sumarDias(fecha, 1))}
                  >
                    ›
                  </button>
                  {fecha !== hoy && (
                    <button type="button" className="hor-chip" data-html2canvas-ignore="true" onClick={() => onCambiarFecha(hoy)}>
                      Hoy
                    </button>
                  )}
                  {fecha !== manana && (
                    <button type="button" className="hor-chip" data-html2canvas-ignore="true" onClick={() => onCambiarFecha(manana)}>
                      Mañana
                    </button>
                  )}
                </span>
              ) : fechaTexto}
            </div>
          </div>
          <table>
            <colgroup>
              <col style={{ width: "16%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "19%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "21%" }} />
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
              {filas.map((f) => (
                <tr key={f.obraId}>
                  <td>
                    <span className="hor-planilla__cliente">{f.cliente}</span>
                    {f.proyecto && <span className="hor-planilla__suave">{f.proyecto}</span>}
                    {editable && (
                      <button
                        type="button"
                        className="hor-x hor-x--fila"
                        data-html2canvas-ignore="true"
                        title="Quitar esta fila de la planilla"
                        aria-label={`Quitar la fila de ${f.cliente}`}
                        onClick={() => onQuitarFila(f.obraId)}
                      >
                        ×
                      </button>
                    )}
                  </td>
                  <td>
                    {editable ? (
                      <CeldaTexto
                        etiqueta="Actividad"
                        valor={f.tarea}
                        mostrar={f.tareaTexto}
                        placeholder="Escribir actividad"
                        lista="hor-planilla-tareas"
                        onGuardar={(v) => onEditarFila(f.obraId, { tarea: v })}
                      />
                    ) : f.tareaTexto}
                  </td>
                  <td>
                    {editable ? (
                      <CeldaTexto
                        etiqueta="Cantidad"
                        valor={f.cantidad}
                        mostrar={f.cantidadTexto}
                        placeholder="—"
                        maxLength={40}
                        claseTexto={/^\d+$/.test(f.cantidadTexto) ? "hor-planilla__cifra" : undefined}
                        onGuardar={(v) => onEditarFila(f.obraId, { cantidad: v })}
                      />
                    ) : f.cantidadTexto
                      ? <span className={/^\d+$/.test(f.cantidadTexto) ? "hor-planilla__cifra" : undefined}>{f.cantidadTexto}</span>
                      : <span className="hor-planilla__vacio">—</span>}
                  </td>
                  <td>
                    {f.trabajadores.map((t) => (
                      <div key={t.id} className="hor-trab">
                        {t.etiqueta}
                        {editable && (
                          <button
                            type="button"
                            className="hor-x"
                            data-html2canvas-ignore="true"
                            title="Quitar de esta fila"
                            aria-label={`Quitar a ${t.etiqueta} de ${f.cliente}`}
                            onClick={() => onQuitarTrabajador(f.obraId, t.id)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {editable && (
                      <AgregarTrabajador
                        empleados={empleados}
                        yaEstan={f.trabajadores.map((t) => t.id)}
                        equipo={equipoDe(f.obraId)}
                        ocupados={ocupadosFuera(f.obraId)}
                        onAgregar={(ids) => onAgregarTrabajadores(f.obraId, ids)}
                      />
                    )}
                  </td>
                  <td>{f.direccion}</td>
                  {celdaFecha(f.encuentro, f.encuentroTexto, f.inicio, f.inicioTexto,
                    (cambios) => onEditarFila(f.obraId, cambios),
                    onMoverFila && ((iso) => onMoverFila(f.obraId, iso)),
                    "Cambiar fecha",
                    "Pasa esta fila, con sus trabajadores, a otro día")}
                </tr>
              ))}

              {/* Fila para empezar un cliente nuevo. No sale en la imagen. */}
              {editable && (
                <tr data-html2canvas-ignore="true">
                  <td>
                    {obraNueva ? (
                      <>
                        <span className="hor-planilla__cliente">{normalizarMayusculas(obraNueva.cliente || "")}</span>
                        {obraNueva.proyecto && obraNueva.proyecto !== obraNueva.cliente && (
                          <span className="hor-planilla__suave">{normalizarMayusculas(obraNueva.proyecto)}</span>
                        )}
                      </>
                    ) : obrasLibres.length ? (
                      <select
                        className="hor-agregar hor-agregar--solo"
                        aria-label="Agregar cliente a la planilla"
                        value=""
                        onChange={(e) => e.target.value && cambiarNueva({ obraId: e.target.value })}
                      >
                        <option value="">＋ Agregar cliente</option>
                        {obrasLibres.map((o) => (
                          <option key={o.id} value={o.id}>
                            {limpio(o.cliente) || o.id}
                            {o.proyecto && o.proyecto !== o.cliente ? ` · ${o.proyecto}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="hor-pista hor-pista--suave">
                        {obras.length ? "Todas las obras ya están en la hoja" : "Crea primero la obra"}
                      </span>
                    )}
                    {nuevaEmpezada && (
                      <button
                        type="button"
                        className="hor-x hor-x--fila"
                        title="Descartar esta fila"
                        aria-label="Descartar la fila nueva"
                        onClick={() => setNueva(FILA_NUEVA)}
                      >
                        ×
                      </button>
                    )}
                  </td>
                  <td>
                    <CeldaTexto
                      etiqueta="Actividad"
                      valor={nueva.tarea}
                      placeholder="Escribir actividad"
                      lista="hor-planilla-tareas"
                      onGuardar={(v) => cambiarNueva({ tarea: v })}
                    />
                  </td>
                  <td>
                    <CeldaTexto
                      etiqueta="Cantidad"
                      valor={nueva.cantidad}
                      placeholder="—"
                      maxLength={40}
                      claseTexto={/^\d+$/.test(nueva.cantidad) ? "hor-planilla__cifra" : undefined}
                      onGuardar={(v) => cambiarNueva({ cantidad: v })}
                    />
                  </td>
                  <td>
                    {nueva.empleadoIds.map((id) => {
                      const e = empleados.find((x) => x.id === id);
                      return (
                        <div key={id} className="hor-trab">
                          {etiquetaTrabajador(e)}
                          <button
                            type="button"
                            className="hor-x"
                            title="Quitar"
                            aria-label={`Quitar a ${limpio(e?.nombre)}`}
                            onClick={() => cambiarNueva({ empleadoIds: nueva.empleadoIds.filter((x) => x !== id) })}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    <AgregarTrabajador
                      solo={!nueva.empleadoIds.length}
                      empleados={empleados}
                      yaEstan={nueva.empleadoIds}
                      equipo={equipoDe(nueva.obraId)}
                      ocupados={ocupadosFuera(nueva.obraId)}
                      onAgregar={(ids) => cambiarNueva({ empleadoIds: [...nueva.empleadoIds, ...ids] })}
                    />
                    {nueva.obraId && !nueva.empleadoIds.length && (
                      <span className="hor-pista">Agrega un trabajador para guardar la fila</span>
                    )}
                    {!nueva.obraId && nueva.empleadoIds.length > 0 && (
                      <span className="hor-pista">Elige el cliente para guardar la fila</span>
                    )}
                  </td>
                  <td>
                    {obraNueva
                      ? direccionDe(obraNueva)
                      : <span className="hor-pista hor-pista--suave" style={{ marginTop: 0 }}>Sale sola al elegir el cliente</span>}
                  </td>
                  {celdaFecha(nueva.encuentro, nueva.encuentro || ENCUENTRO_POR_DEFECTO, nueva.inicio, hora12(nueva.inicio),
                    (cambios) => cambiarNueva(cambios),
                    onCambiarFecha,
                    "＋ Elegir fecha",
                    "Elige el día de la hoja")}
                </tr>
              )}

              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="hor-planilla__sin-datos">
                    Sin actividades programadas para este día
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <datalist id="hor-planilla-tareas">
            {tareasSugeridas.map((t) => <option key={t} value={t} />)}
          </datalist>
          <datalist id="hor-planilla-encuentros">
            <option value="Salida desde la oficina" />
            <option value="Llegada a la obra" />
          </datalist>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        {/* Dia vacio: no hay nada que descargar; lo que toca es asignar. */}
        {filas.length === 0 ? accionVacia : pendiente ? (
          // La imagen ya esta armada: este toque abre el menu al instante.
          <Button variante="primary" icono="compartir" onClick={() => abrirMenuCompartir(pendiente)}>
            Compartir ahora
          </Button>
        ) : (
          <>
            <Button variante="secondary" icono="enviar" onClick={enviarPorWhatsApp} disabled={ocupado}>
              {ocupado ? "Generando imagen…" : "Enviar por WhatsApp"}
            </Button>
            <Button
              variante="texto"
              icono="documento"
              onClick={copiarImagen}
              disabled={ocupado}
              title="Copia la imagen para pegarla en WhatsApp Web con Ctrl+V"
            >
              Copiar
            </Button>
            <Button variante="texto" icono="descargar" onClick={descargarImagen} disabled={ocupado}>
              Descargar
            </Button>
          </>
        )}
        {aviso ? (
          <span
            role="status"
            style={{ fontSize: 13, color: aviso.tono === "error" ? "var(--danger-text)" : "var(--success-text)" }}
          >
            {aviso.texto}
            {aviso.enlace && (
              <>
                {" "}
                <a
                  href={aviso.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 600, color: "inherit", textDecoration: "underline" }}
                >
                  {aviso.textoEnlace}
                </a>
              </>
            )}
          </span>
        ) : editable && !ocupado && (
          <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            Haz clic en una celda para escribir. Los cambios se guardan solos.
          </span>
        )}
      </div>
    </div>
  );
}
