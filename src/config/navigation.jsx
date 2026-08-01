// Fuente unica de verdad de la navegacion.
// Para agregar una pantalla: anadir una entrada aqui y su componente en
// el registro de App.jsx. Nada mas necesita cambiar.

const ico = (paths) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
);

export const ICONS = {
  dashboard: ico(<><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>),
  cotizacion: ico(<><path d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></>),
  clientes: ico(<><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="8" r="2.6"/><path d="M17.5 14.6c2.4.4 3.9 2.2 3.9 5.4"/></>),
  obras: ico(<><rect x="4" y="3" width="10" height="18" rx="1.5"/><rect x="14" y="9" width="6" height="12" rx="1.5"/><line x1="7" y1="7" x2="7" y2="7.01"/><line x1="11" y1="7" x2="11" y2="7.01"/><line x1="7" y1="11" x2="7" y2="11.01"/><line x1="11" y1="11" x2="11" y2="11.01"/></>),
  pagos: ico(<><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2"/></>),
  certificaciones: ico(<><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></>),
  vencimientos: ico(<><circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2.5"/><path d="M5 3 2.5 5.5"/><path d="M19 3l2.5 2.5"/></>),
  informes: ico(<><rect x="5" y="4" width="14" height="17" rx="2"/><rect x="8.5" y="2" width="7" height="3.5" rx="1"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="8" y1="19" x2="13" y2="19"/></>),
  proveedores: ico(<><path d="M6 2h12v19l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-19z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></>),
  contabilidad: ico(<><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10.5" x2="8" y2="10.51"/><line x1="12" y1="10.5" x2="12" y2="10.51"/><line x1="16" y1="10.5" x2="16" y2="10.51"/></>),
  nomina: ico(<><rect x="2" y="6" width="20" height="12" rx="2.5"/><circle cx="12" cy="12" r="3"/><line x1="6" y1="9" x2="6" y2="9.01"/><line x1="18" y1="15" x2="18" y2="15.01"/></>),
  horarios: ico(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>),
  financiero: ico(<><line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="13"/><line x1="21" y1="20" x2="3" y2="20"/></>),
  usuarios: ico(<><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.5 2.9-5.8 6.5-5.8s6.5 2.3 6.5 5.8"/><circle cx="18.5" cy="6.5" r="2"/><path d="M18.5 11v4"/><path d="M16.5 13h4"/></>),
};

// Secciones del menu. `label` es el nombre visible; `short` se usa en la
// barra superior movil cuando el nombre largo no cabe.
export const NAV_SECTIONS = [
  {
    title: "General",
    items: [
      { id: "dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Comercial y proyectos",
    items: [
      { id: "cotizacion", label: "Cotizaciones" },
      { id: "clientes", label: "Clientes" },
      { id: "obras", label: "Ejecución de obra", short: "Obras" },
      // Los horarios se arman al lado de la obra: es donde se decide quien va
      // a cada sitio y se le avisa.
      { id: "horarios", label: "Horarios" },
    ],
  },
  {
    title: "Calidad y entregables",
    items: [
      { id: "certificaciones", label: "Certificaciones" },
      { id: "vencimientos", label: "Vencimientos" },
      { id: "informes", label: "Informes de actividades", short: "Informes" },
    ],
  },
  {
    title: "Administración",
    items: [
      // Cobrar y pagar quedan juntos, que es como se revisa la plata.
      { id: "pagos", label: "Cuentas por cobrar", short: "Por cobrar" },
      { id: "proveedores", label: "Causación / facturas", short: "Causación" },
      { id: "contabilidad", label: "Contabilidad" },
      { id: "nomina", label: "Nómina y empleados", short: "Nómina" },
      { id: "financiero", label: "Informe financiero", short: "Financiero" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { id: "usuarios", label: "Usuarios y permisos", short: "Usuarios" },
    ],
  },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.title }))
);

export const NAV_BY_ID = Object.fromEntries(NAV_ITEMS.map((item) => [item.id, item]));

export const getScreenTitle = (id) => NAV_BY_ID[id]?.label || "Dashboard";
export const getScreenSection = (id) => NAV_BY_ID[id]?.section || "";
