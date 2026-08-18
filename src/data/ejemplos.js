// Datos de muestra para enseñar el programa con las pantallas llenas.
//
// La base del cliente está vacía: cada pantalla dice «Todavía no hay nada» y
// así no se puede ver cómo funciona ni explicar para qué sirve. Estos registros
// llenan los listados MIENTRAS no haya datos de verdad.
//
// ── Lo importante ───────────────────────────────────────────────────────────
//
// NUNCA SE GUARDAN EN LA BASE. Van marcados con `__ejemplo` y el autoguardado
// los descarta antes de subir nada (ver buildCloudPayload en AppDataContext).
// Es un solo punto de control, y es el que hay que respetar si mañana alguien
// agrega otra entidad de ejemplo.
//
// SOLO APARECEN CUANDO LA TABLA ESTA VACIA. En cuanto el cliente registre su
// primera obra de verdad, las de ejemplo desaparecen de esa pantalla: no se
// mezclan nunca con lo real, y no hay que acordarse de borrarlas.
//
// ── Por qué es una sola historia ────────────────────────────────────────────
//
// Podrían ser registros sueltos, pero entonces cada pantalla se vería por
// separado y lo que hay que entender es el recorrido: un mensaje de WhatsApp
// se vuelve cotización, la cotización aprobada se vuelve obra, la obra
// terminada produce el informe, el informe sostiene la certificación y la
// certificación se cobra. Los tres clientes de aquí son los mismos que
// escriben en la pantalla de WhatsApp, y van en distintos puntos del recorrido
// para que se vea entero.

const hoy = new Date();
const iso = (dias) => {
  const d = new Date(hoy);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const marca = { __ejemplo: true };

// ── Clientes ────────────────────────────────────────────────────────────────
const clientes = [
  {
    ...marca,
    id: "CL-901",
    nombre: "Almacenes La 33 S.A.S",
    nit: "900456123-7",
    telefono: "604 448 2686",
    ciudad: "Itagüí",
    direccion: "Carrera 50 # 37 Sur - 12, Bodega 4",
    contacto: "Andrés Ospina",
    email: "andres.ospina@la33.com.co",
    estado: "Activo",
    notas: "Llegó por WhatsApp. Cubierta en teja sándwich, 80 ML de línea de vida.",
  },
  {
    ...marca,
    id: "CL-902",
    nombre: "Comercializadora Andina S.A.S",
    nit: "901233874-1",
    telefono: "604 322 1190",
    ciudad: "Sabaneta",
    direccion: "Calle 68 Sur # 45 - 30",
    contacto: "Marcela Ruiz",
    email: "sst@comercializadoraandina.co",
    estado: "Activo",
    notas: "Requerimiento de ARL abierto por un accidente en cubierta.",
  },
  {
    ...marca,
    id: "CL-903",
    nombre: "Distribuciones del Valle S.A.S",
    nit: "890900608-9",
    telefono: "604 604 1188",
    ciudad: "Medellín",
    direccion: "Calle 30 # 65 - 120",
    contacto: "Paula Henao",
    email: "compras@distrivalle.com.co",
    estado: "Activo",
    notas: "Cliente de recompra: se le certifica el sistema cada año.",
  },
];

// ── Cotizaciones ────────────────────────────────────────────────────────────
//
// Tres estados distintos a proposito: una recien enviada esperando respuesta,
// una aprobada que ya se volvio obra, y una en borrador todavia sin mandar.
const cotizaciones = [
  {
    ...marca,
    id: "COT-901",
    numero: "C-26130",
    fecha: iso(-2),
    val: 30,
    cliente: "Almacenes La 33 S.A.S",
    nit: "900456123-7",
    contacto: "Andrés Ospina",
    contactoEmail: "andres.ospina@la33.com.co",
    telefono: "604 448 2686",
    obra: "Bodega Itagüí — Línea de vida en cubierta",
    ciudad: "Itagüí",
    direccion: "Carrera 50 # 37 Sur - 12, Bodega 4",
    formaPago: "50% anticipo, 50% al concluir labores",
    tiempoEjec: "6 días calendario",
    util: 10,
    estado: "Enviada",
    items: [
      { desc: "LINEA DE VIDA HORIZONTAL", cant: 80, unit: "ML", vu: 280000 },
      { desc: "PUNTO DE ANCLAJE CERTIFICADO", cant: 4, unit: "UND", vu: 320000 },
    ],
  },
  {
    ...marca,
    id: "COT-902",
    numero: "C-26127",
    fecha: iso(-24),
    val: 30,
    cliente: "Comercializadora Andina S.A.S",
    nit: "901233874-1",
    contacto: "Marcela Ruiz",
    contactoEmail: "sst@comercializadoraandina.co",
    telefono: "604 322 1190",
    obra: "Mantenimiento de canales — Anclajes sobre pérgola",
    ciudad: "Sabaneta",
    direccion: "Calle 68 Sur # 45 - 30",
    formaPago: "50% anticipo, 50% al concluir labores",
    tiempoEjec: "4 días calendario",
    util: 10,
    estado: "Aprobada",
    items: [
      { desc: "PUNTO DE ANCLAJE CERTIFICADO", cant: 6, unit: "UND", vu: 320000 },
      { desc: "LINEA DE VIDA HORIZONTAL", cant: 18, unit: "ML", vu: 280000 },
    ],
  },
  {
    ...marca,
    id: "COT-903",
    numero: "C-26131",
    fecha: iso(0),
    val: 30,
    cliente: "Distribuciones del Valle S.A.S",
    nit: "890900608-9",
    contacto: "Paula Henao",
    contactoEmail: "compras@distrivalle.com.co",
    telefono: "604 604 1188",
    obra: "Recertificación anual del sistema",
    ciudad: "Medellín",
    direccion: "Calle 30 # 65 - 120",
    formaPago: "Contado contra entrega del certificado",
    tiempoEjec: "2 días calendario",
    util: 10,
    estado: "Borrador",
    items: [
      { desc: "INSPECCION Y RECERTIFICACION DE SISTEMA INSTALADO", cant: 1, unit: "GLB", vu: 2800000 },
    ],
  },
];

// ── Obras ───────────────────────────────────────────────────────────────────
//
// Una a medio ejecutar y otra terminada y cobrada. La terminada al 100% es la
// que enseña el bloqueo: con «Finalizado» y 100% solo un administrador la
// puede editar.
const obras = [
  {
    ...marca,
    id: "OB-901",
    cliente: "Comercializadora Andina S.A.S",
    nit: "901233874-1",
    tel: "604 322 1190",
    proyecto: "Mantenimiento de canales — Anclajes sobre pérgola",
    ciudad: "Sabaneta",
    direccion: "Calle 68 Sur # 45 - 30",
    estado: "En Obra",
    avance: 65,
    total: 7788240,
    pagado: 3894120,
    saldo: 3894120,
    costos: 3120000,
    fechaInicio: iso(-9),
    fechaFin: iso(3),
    cotizacionId: "C-26127",
    empleados: [],
  },
  {
    ...marca,
    id: "OB-902",
    cliente: "Distribuciones del Valle S.A.S",
    nit: "890900608-9",
    tel: "604 604 1188",
    proyecto: "Línea de vida horizontal — Cubierta principal",
    ciudad: "Medellín",
    direccion: "Calle 30 # 65 - 120",
    estado: "Finalizado",
    avance: 100,
    total: 16292640,
    pagado: 16292640,
    saldo: 0,
    costos: 5890000,
    fechaInicio: iso(-52),
    fechaFin: iso(-38),
    cotizacionId: "C-26104",
    empleados: [],
  },
];

// ── Pagos ───────────────────────────────────────────────────────────────────
const pagos = [
  {
    ...marca,
    id: "PG-901", obraId: "OB-901", fecha: iso(-9), monto: 3894120,
    metodo: "Transferencia", tipo: "Anticipo", estado: "Pagado",
    notas: "50% de anticipo para iniciar.",
  },
  {
    ...marca,
    id: "PG-902", obraId: "OB-902", fecha: iso(-45), monto: 8146320,
    metodo: "Transferencia", tipo: "Anticipo", estado: "Pagado", notas: "",
  },
  {
    ...marca,
    id: "PG-903", obraId: "OB-902", fecha: iso(-36), monto: 8146320,
    metodo: "Transferencia", tipo: "Saldo", estado: "Pagado",
    notas: "Pagado contra entrega del acta y la certificación.",
  },
];

// ── Informes de actividades ─────────────────────────────────────────────────
const informes = [
  {
    ...marca,
    id: "INF-901",
    obraId: "OB-902",
    proyecto: "Línea de vida horizontal — Cubierta principal",
    localizacion: "Calle 30 # 65 - 120, Medellín",
    fechaInforme: iso(-38),
    periodoInicio: iso(-52),
    periodoFin: iso(-38),
    personal: [
      { nombre: "Jhon Alexánder Muñoz", cargo: "Técnico instalador" },
      { nombre: "Wílmar Zapata", cargo: "Ayudante de altura" },
    ],
    actividades: [
      {
        titulo: "Instalación de los anclajes de extremo",
        descripcion: "Se instalaron los anclajes terminales sobre la estructura metálica de la cubierta, con placa de reparto y tornillería de alta resistencia.",
        observaciones: "La correa del extremo norte requirió refuerzo adicional.",
        fotos: [],
      },
      {
        titulo: "Tendido y tensionado del cable",
        descripcion: "Tendido del cable de acero inoxidable de 3/8\", con tensor y absorbedor de energía en el extremo.",
        observaciones: "Tensión verificada con dinamómetro y registrada en el acta.",
        fotos: [],
      },
      {
        titulo: "Prueba de carga y entrega",
        descripcion: "Prueba de carga del sistema e inducción de uso al personal de mantenimiento del cliente.",
        observaciones: "Sistema aprobado. Se entregan fichas técnicas y memoria de cálculo.",
        fotos: [],
      },
    ],
  },
];

// ── Certificaciones ─────────────────────────────────────────────────────────
const certs = [
  {
    ...marca,
    id: "CE-901",
    obraId: "OB-902",
    tipo: "Sistema de protección contra caídas",
    numero: "CERT-2601",
    fecha: iso(-38),
    cliente: "Distribuciones del Valle S.A.S",
    nit: "890900608-9",
    direccion: "Calle 30 # 65 - 120, Medellín",
    sistema: "Línea de vida horizontal de 52 ML con 6 puntos de anclaje",
    elementos: [
      "Cable de acero inoxidable 3/8\"",
      "Absorbedor de energía",
      "Anclajes terminales con placa de reparto",
      "Señalización de capacidad máxima",
    ],
    normativa: "Resolución 4272 de 2021 · NTC 6052",
    ingeniero: "Ingeanclajes S.A.S",
    matricula: "",
    estado: "Vigente",
    // Vence al año: sale en Vencimientos con el aviso de recertificación.
    proxMant: iso(327),
  },
];

export const EJEMPLOS = { clientes, cotizaciones, obras, pagos, informes, certs };

/** Quita los registros de ejemplo de una lista antes de guardarla. */
export const sinEjemplos = (lista) =>
  Array.isArray(lista) ? lista.filter((fila) => !fila?.__ejemplo) : lista;

/** ¿Hay algún registro de ejemplo a la vista? Para avisarlo en la pantalla. */
export const hayEjemplos = (...listas) =>
  listas.some((lista) => Array.isArray(lista) && lista.some((fila) => fila?.__ejemplo));
