// Juego unico de iconos de trazo.
//
// La aplicacion usaba mas de 200 emojis como iconos de interfaz. Cada sistema
// operativo los dibuja distinto, no se pueden tenir del color del texto y
// descuadran la linea base. Estos son de trazo 1.8 y heredan el color, asi que
// funcionan igual en claro y en oscuro.
//
// Uso: <Icono nombre="buscar" /> o <Icono nombre="check" size={16} />

const TRAZOS = {
  check: <path d="M20 6 9 17l-5-5" />,
  cerrar: <path d="M18 6 6 18M6 6l12 12" />,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  buscar: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  lapiz: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  papelera: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  alerta: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendario: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  documento: <><path d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /><path d="M14 2v6h6" /></>,
  carpetaVacia: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  flechaDer: <path d="m9 18 6-6-6-6" />,
  flechaIzq: <path d="m15 18-6-6 6-6" />,
  flechaAbajo: <path d="m6 9 6 6 6-6" />,
  filtro: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  mas3: <><circle cx="12" cy="5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="19" r="1.4" /></>,
  descargar: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>,
  usuario: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  sol: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  luna: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  // Dos naves de distinta altura: una obra en ejecucion.
  obra: <><rect x="4" y="3" width="10" height="18" rx="1.5" /><rect x="14" y="9" width="6" height="12" rx="1.5" /><path d="M7 7h.01M11 7h.01M7 11h.01M11 11h.01" /></>,
  escudo: <><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  candado: <><rect x="4" y="10.5" width="16" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>,
  salir: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
};

export default function Icono({ nombre, size = 16, strokeWidth = 1.8, style, ...props }) {
  const trazo = TRAZOS[nombre];
  if (!trazo) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0, ...style }}
      {...props}
    >
      {trazo}
    </svg>
  );
}
