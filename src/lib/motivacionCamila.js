// Mensajes de bienvenida y reflexiones motivacionales para María Camila Sepúlveda.
// Diseñado para recibirla cálidamente al iniciar sesión y brindarle energía,
// reconocimiento y motivación para su jornada en Ingeanclajes SAS.

export const EMAIL_CAMILA = "sistemasingeanclajes@gmail.com";

/**
 * Determina con certeza si el usuario conectado es María Camila Sepúlveda.
 */
export function esUsuarioCamila(membresia, emailFallback = "") {
  if (!membresia && !emailFallback) return false;
  const nombre = String(membresia?.nombre || "").toLowerCase().trim();
  const email = String(membresia?.email || emailFallback || "").toLowerCase().trim();
  return (
    email === EMAIL_CAMILA ||
    email.includes("sistemasingeanclajes") ||
    email.includes("camila") ||
    nombre.includes("camila") ||
    nombre.includes("sepulveda") ||
    nombre.includes("sepúlveda")
  );
}

/**
 * Devuelve un saludo acorde a la hora del día en español colombiano.
 */
export function obtenerSaludoSegunHora() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) {
    return {
      saludo: "¡Buenos días, María Camila!",
      icono: "☀️",
      subtitulo: "Que hoy tengas una mañana llena de energía, claridad y metas cumplidas.",
    };
  }
  if (hora >= 12 && hora < 18) {
    return {
      saludo: "¡Buenas tardes, María Camila!",
      icono: "🌤️",
      subtitulo: "Continúa tu tarde con serenidad, enfoque y la satisfacción del deber cumplido.",
    };
  }
  return {
    saludo: "¡Buenas noches, María Camila!",
    icono: "🌙",
    subtitulo: "Gracias por tu entrega y dedicación constante en cada detalle de hoy.",
  };
}

/**
 * Formatea la fecha de hoy en español amigable.
 * Ej: "Miércoles, 7 de octubre de 2026"
 */
export function obtenerFechaHoyTexto() {
  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1);
}

/**
 * Colección de mensajes motivacionales y de reconocimiento.
 */
export const FRASES_MOTIVACIONALES_CAMILA = [
  {
    id: 1,
    frase: "Tu dedicación y liderazgo marcan la diferencia cada día en Ingeanclajes. Cada decisión firme y con propósito construye grandes logros.",
    autor: "Liderazgo & Excelencia",
    tag: "#LiderazgoFirme",
    icono: "🌟",
  },
  {
    id: 2,
    frase: "No tienes que tener todo resuelto hoy; solo dar lo mejor de ti en cada paso. Eres capaz de superar con éxito cualquier reto que se presente.",
    autor: "Fortaleza Diaria",
    tag: "#FuerzaInterior",
    icono: "💪",
  },
  {
    id: 3,
    frase: "La excelencia no es un acto aislado, es el reflejo del cariño, la disciplina y la entrega que pones en cada detalle de tu trabajo.",
    autor: "Cultura de Excelencia",
    tag: "#Excelencia",
    icono: "💎",
  },
  {
    id: 4,
    frase: "Empieza hoy con la certeza de que tu esfuerzo tiene un valor incalculable. Confía en tu talento y haz que hoy sea un gran día.",
    autor: "Confianza & Éxito",
    tag: "#Confianza",
    icono: "✨",
  },
  {
    id: 5,
    frase: "Detrás de cada proyecto exitoso y cada cliente satisfecho hay personas apasionadas como tú. Gracias por tu entrega constante y por hacer que las cosas pasen.",
    autor: "Reconocimiento Ingeanclajes",
    tag: "#GratitudYReconocimiento",
    icono: "🌸",
  },
  {
    id: 6,
    frase: "Cree en tu intuición, en tu experiencia y en tu capacidad. Tienes todo lo necesario para triunfar y seguir abriendo nuevos caminos.",
    autor: "Visión & Empoderamiento",
    tag: "#PoderFemenino",
    icono: "🦋",
  },
  {
    id: 7,
    frase: "Un gran equipo florece cuando hay alguien que guía con empatía, claridad y compromiso. Tu energía positiva contagia a todos a tu alrededor.",
    autor: "Trabajo en Equipo",
    tag: "#LiderazgoEmpático",
    icono: "🤝",
  },
  {
    id: 8,
    frase: "Respira hondo, confía en el proceso y recuerda que cada día trae una nueva oportunidad para brillar a tu propio ritmo.",
    autor: "Bienestar & Calma",
    tag: "#PazYEnfoque",
    icono: "🌿",
  },
  {
    id: 9,
    frase: "Los grandes objetivos se conquistan con pequeños pasos firmes. Cada llamada, cada cotización y cada gestión tuya cuenta y suma al éxito colectivo.",
    autor: "Constancia Diaria",
    tag: "#Perseverancia",
    icono: "🎯",
  },
  {
    id: 10,
    frase: "El éxito llega para quienes ponen el corazón y la mente en lo que hacen. ¡Hoy es un día perfecto para alcanzar nuevas metas!",
    autor: "Motivación Activa",
    tag: "#MetasClaras",
    icono: "🚀",
  },
  {
    id: 11,
    frase: "Tu capacidad para coordinar, resolver imprevistos y avanzar es admirable. Nunca dudes del enorme impacto y respeto que generas.",
    autor: "Reconocimiento & Mérito",
    tag: "#CapacidadResolutiva",
    icono: "👑",
  },
  {
    id: 12,
    frase: "Que la serenidad guíe tus decisiones y la alegría acompañe tus horas de trabajo. ¡Adelante, hoy será un día extraordinario!",
    autor: "Actitud Positiva",
    tag: "#AlegríaYTrabajo",
    icono: "☀️",
  },
  {
    id: 13,
    frase: "Cada obstáculo superado es un testimonio de tu resiliencia. Estás donde estás porque te lo has ganado con inteligencia y dedicación.",
    autor: "Superación Personal",
    tag: "#Resiliencia",
    icono: "🛡️",
  },
  {
    id: 14,
    frase: "La organización, la precisión y la visión clara son tus mejores aliadas. Haz que hoy cada logro te recuerde tu gran potencial.",
    autor: "Gestión Eficaz",
    tag: "#Organización",
    icono: "📊",
  },
  {
    id: 15,
    frase: "No busques días perfectos, haz que este día sea valioso con tu autenticidad, tu calidez y tu energía. ¡Mucho éxito en tu jornada!",
    autor: "Sabiduría Diaria",
    tag: "#Autenticidad",
    icono: "🌷",
  },
  {
    id: 16,
    frase: "El liderazgo no se impone, se inspira con el ejemplo diario. Gracias por ser un pilar fundamental en el corazón de Ingeanclajes.",
    autor: "Equipo Ingeanclajes",
    tag: "#PilarFundamental",
    icono: "🏛️",
  },
  {
    id: 17,
    frase: "Confía en lo que sabes, mantén la mente abierta a lo que aprendes y disfruta el camino de lo que construyes día a día.",
    autor: "Crecimiento Continuo",
    tag: "#AprendizajeYVisión",
    icono: "🌱",
  },
  {
    id: 18,
    frase: "Hoy es una página en blanco lista para llenarse de soluciones inteligentes, acuerdos fructíferos y buenas noticias.",
    autor: "Optimismo Activo",
    tag: "#NuevasOportunidades",
    icono: "📝",
  },
  {
    id: 19,
    frase: "Tu voz, tu criterio y tu dedicación le dan solidez y rumbo a cada proyecto. Sigue adelante con seguridad y la frente en alto.",
    autor: "Firmeza & Carácter",
    tag: "#CriterioYFirmeza",
    icono: "🧭",
  },
  {
    id: 20,
    frase: "La constancia vence lo que la fuerza no puede. Tu perseverancia diaria es la clave de los grandes resultados que cosechas.",
    autor: "Perseverancia & Victoria",
    tag: "#ConstanciaInagotable",
    icono: "⛰️",
  },
  {
    id: 21,
    frase: "Que nunca te falte la pasión por lo que haces ni la satisfacción de contemplar el fruto de tu trabajo bien hecho.",
    autor: "Pasión Profesional",
    tag: "#TrabajoBienHecho",
    icono: "❤️",
  },
  {
    id: 22,
    frase: "Cuando pones entusiasmo en cada tarea, hasta lo más desafiante se vuelve una oportunidad de demostrar tu gran talento.",
    autor: "Entusiasmo & Talento",
    tag: "#TalentoEnAcción",
    icono: "🔥",
  },
  {
    id: 23,
    frase: "Tu tranquilidad ante los retos es tu mayor fortaleza. Da un paso a la vez, con calma, firmeza y seguridad en ti misma.",
    autor: "Serenidad Estratégica",
    tag: "#CalmaYFirmeza",
    icono: "🌊",
  },
  {
    id: 24,
    frase: "En Ingeanclajes sabemos que tu labor es vital para que todo marche sobre ruedas. ¡Gracias por estar siempre al frente con una sonrisa!",
    autor: "Familia Ingeanclajes",
    tag: "#AgradecimientoSincero",
    icono: "🌻",
  },
  {
    id: 25,
    frase: "Que hoy encuentres satisfacción en cada tarea concluida y orgullo en el esfuerzo que entregas sin reservas.",
    autor: "Realización Personal",
    tag: "#OrgulloYPropósito",
    icono: "🏆",
  },
  {
    id: 26,
    frase: "Toda gran obra comienza con una persona que creyó que era posible y se puso manos a la obra. Tú eres esa persona.",
    autor: "Visión & Acción",
    tag: "#HacerQuePase",
    icono: "🏗️",
  },
  {
    id: 27,
    frase: "Tu inteligencia y capacidad de gestión abren puertas donde otros solo ven dificultades. ¡Confía siempre en tu criterio!",
    autor: "Inteligencia Práctica",
    tag: "#SolucionesReales",
    icono: "🔑",
  },
  {
    id: 28,
    frase: "La vida recompensa a las personas valientes y constantes. Tu dedicación de hoy es la victoria que celebrarás mañana.",
    autor: "Valentía & Triunfo",
    tag: "#VictoriaAsegurada",
    icono: "🥇",
  },
  {
    id: 29,
    frase: "Que tengas una jornada productiva, llena de momentos gratificantes y la certeza de que tu trabajo transforma realidades.",
    autor: "Propósito & Trascendencia",
    tag: "#TransformarConTrabajo",
    icono: "🌈",
  },
  {
    id: 30,
    frase: "Recuerda celebrar tus pequeños logros diarios; cada uno de ellos es un peldaño firme hacia las grandes metas de tu vida.",
    autor: "Celebración Cotidiana",
    tag: "#PasosDeGigante",
    icono: "🎉",
  },
  {
    id: 31,
    frase: "Tu calidez y profesionalismo hacen que trabajar contigo sea un verdadero gusto para todo el equipo y para cada cliente.",
    autor: "Calidez Humana",
    tag: "#ProfesionalismoCálido",
    icono: "💖",
  },
  {
    id: 32,
    frase: "Sé la líder que a ti te gustaría seguir: clara, justa, humana y decidida. ¡Ya lo eres y cada día lo haces aún mejor!",
    autor: "Liderazgo Ejemplar",
    tag: "#LiderazgoConCorazón",
    icono: "⭐",
  },
];

/**
 * Obtiene la frase oficial designada para el día de hoy (rotación determinista por día del año).
 */
export function obtenerFraseDelDia() {
  const ahora = new Date();
  const inicioAno = new Date(ahora.getFullYear(), 0, 0);
  const diff = ahora - inicioAno;
  const unDia = 1000 * 60 * 60 * 24;
  const diaDelAno = Math.floor(diff / unDia);
  const indice = Math.abs(diaDelAno) % FRASES_MOTIVACIONALES_CAMILA.length;
  return FRASES_MOTIVACIONALES_CAMILA[indice];
}

/**
 * Obtiene una frase aleatoria diferente a la actual.
 */
export function obtenerFraseAleatoria(excluirId = null) {
  const disponibles = FRASES_MOTIVACIONALES_CAMILA.filter((f) => f.id !== excluirId);
  if (disponibles.length === 0) return FRASES_MOTIVACIONALES_CAMILA[0];
  const indice = Math.floor(Math.random() * disponibles.length);
  return disponibles[indice];
}

const CLAVE_FAVORITAS = "camila_frases_favoritas";

export function obtenerFavoritas() {
  try {
    const raw = localStorage.getItem(CLAVE_FAVORITAS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return [];
}

export function alternarFavorita(id) {
  try {
    const actuales = obtenerFavoritas();
    let nuevas;
    if (actuales.includes(id)) {
      nuevas = actuales.filter((x) => x !== id);
    } else {
      nuevas = [...actuales, id];
    }
    localStorage.setItem(CLAVE_FAVORITAS, JSON.stringify(nuevas));
    return nuevas;
  } catch {
    return [];
  }
}
