// Mensajes de bienvenida y reflexiones de vida, esperanza y fortaleza para María Camila Sepúlveda.
// Diseñado para brindarle consuelo, aliento, paz interior y amor sereno ante momentos difíciles familiares.

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
 * Devuelve un saludo acorde a la hora del día enfocado en serenidad, consuelo y paz.
 */
export function obtenerSaludoSegunHora() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) {
    return {
      saludo: "¡Buenos días, María Camila!",
      icono: "🕊️",
      subtitulo: "Que hoy encuentres calma en tu corazón, instantes de paz y la fuerza serena para acompañar este día con amor y esperanza.",
    };
  }
  if (hora >= 12 && hora < 18) {
    return {
      saludo: "¡Buenas tardes, María Camila!",
      icono: "🌿",
      subtitulo: "Toma un respiro profundo. Recuerda que no tienes que cargarlo todo sola; permítete pausas de tranquilidad y cuidado personal.",
    };
  }
  return {
    saludo: "¡Buenas noches, María Camila!",
    icono: "🤍",
    subtitulo: "Que esta noche tu mente y tu corazón encuentren verdadero descanso, renueves tus fuerzas y sientas el abrazo cálido de la esperanza.",
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
 * Colección de mensajes de vida, amor filial, fortaleza, esperanza y consuelo.
 */
export const FRASES_MOTIVACIONALES_CAMILA = [
  {
    id: 1,
    frase: "Abraza el presente con amor y serenidad. El amor incondicional que le das a tu papá es su mayor medicina y su refugio más seguro. No caminas sola en este sendero.",
    autor: "Amor & Esperanza",
    tag: "#AmorDeHija",
    icono: "🤍",
  },
  {
    id: 2,
    frase: "Hay días en los que solo respirar profundo ya es un acto inmenso de valentía. Permítete sentir, permítete descansar, y recuerda que la esperanza florece en los rincones más inesperados.",
    autor: "Fortaleza Serena",
    tag: "#UnPasoALaVez",
    icono: "🌿",
  },
  {
    id: 3,
    frase: "La fuerza de una hija que ama con toda el alma mueve montañas en silencio. Tu ternura, tus palabras y tu presencia son una luz cálida y poderosa en la vida de tu papá.",
    autor: "Luz & Familia",
    tag: "#FuerzaInterior",
    icono: "🕊️",
  },
  {
    id: 4,
    frase: "Un día a la vez. No intentes cargar hoy con el peso del futuro; confía en que cada amanecer trae consigo su propia porción de fuerza, paz y consuelo.",
    autor: "Serenidad Diaria",
    tag: "#VivirElHoy",
    icono: "✨",
  },
  {
    id: 5,
    frase: "El amor es la energía más viva y sanadora que existe en este universo. Cada caricia, cada mirada y cada momento compartido con tu papá queda grabado con amor en el alma.",
    autor: "Vida & Gratitud",
    tag: "#AmorIncondicional",
    icono: "🌸",
  },
  {
    id: 6,
    frase: "En medio de las tormentas, recuerda que dentro de ti habita una calma que nada puede apagar. Eres mucho más fuerte de lo que crees y sumamente amada.",
    autor: "Paz en el Corazón",
    tag: "#PazInterior",
    icono: "🕯️",
  },
  {
    id: 7,
    frase: "No tienes que ser fuerte todo el tiempo. Llorar cuando el corazón lo necesita también es desahogar y sanar. Después de la lluvia siempre regresa la luz.",
    autor: "Compasión & Ternura",
    tag: "#CuidarElAlma",
    icono: "💧",
  },
  {
    id: 8,
    frase: "Tu papá ve en tus ojos la mayor de sus alegrías y su más grande orgullo. Tu cariño es su motor diario, su calma en momentos difíciles y su más hermosa bendición.",
    autor: "Lazos Sagrados",
    tag: "#AmorDePadreEHija",
    icono: "🤍",
  },
  {
    id: 9,
    frase: "La esperanza no significa que el camino sea fácil; significa tener la certeza de que es posible encontrar amor, propósito y paz aun en los momentos de incertidumbre.",
    autor: "Fe en la Vida",
    tag: "#EsperanzaViva",
    icono: "🌱",
  },
  {
    id: 10,
    frase: "Cuidar a quien amamos también exige cuidarnos a nosotras mismas con ternura. Come bien, respira aire fresco y regálate pausas de silencio para recobrar tu energía.",
    autor: "Amor Propio",
    tag: "#CuidarteParaCuidar",
    icono: "☕",
  },
  {
    id: 11,
    frase: "Las pruebas de salud nos recuerdan el valor más sagrado de la existencia: el tiempo juntos, los abrazos sinceros y el amor mutuo. Cada minuto a su lado es un tesoro.",
    autor: "Valor de la Vida",
    tag: "#Gratitud",
    icono: "🌼",
  },
  {
    id: 12,
    frase: "Ten fe en la fuerza de la vida, en la ciencia, en los médicos y, por encima de todo, en el amor inmenso que los une. Los milagros a menudo suceden en los pequeños detalles.",
    autor: "Fe & Confianza",
    tag: "#FeEnLaVida",
    icono: "🕊️",
  },
  {
    id: 13,
    frase: "Cuando sientas cansancio, cierra los ojos un instante y recuerda: eres una mujer dulce, valiente y profundamente noble. Estás haciendo las cosas con el corazón.",
    autor: "Consuelo & Ánimo",
    tag: "#EresValiente",
    icono: "🌿",
  },
  {
    id: 14,
    frase: "El lazo sagrado entre un padre y su hija es indestructible; trasciende temores y diagnósticos. Lo que han construido juntos tiene una fuerza eterna.",
    autor: "Unión Eterna",
    tag: "#LazoDeAmor",
    icono: "🤍",
  },
  {
    id: 15,
    frase: "Que hoy la vida te envuelva en un abrazo invisible de tranquilidad. Que en cada respiro sueltes la angustia y recibas paz, paciencia y renovada esperanza.",
    autor: "Respiro de Paz",
    tag: "#Serenidad",
    icono: "🍃",
  },
  {
    id: 16,
    frase: "No hay medicina más dulce para el alma de un padre que la compañía serena y amorosa de su hija. Tu sola sonrisa ilumina cualquier rincón.",
    autor: "Ternura & Aliento",
    tag: "#LuzFamiliar",
    icono: "☀️",
  },
  {
    id: 17,
    frase: "La fe no es la ausencia de miedo, sino el coraje de seguir amando, apoyando y sonriendo a pesar de las dificultades. Confía en el proceso de la vida.",
    autor: "Valentía Serena",
    tag: "#FeYEsperanza",
    icono: "✨",
  },
  {
    id: 18,
    frase: "Eres un refugio de paz para tu familia. Que en este día encuentres personas que te escuchen, abrazos que te sostengan y palabras que te reconforten el corazón.",
    autor: "Compañía & Apoyo",
    tag: "#NoEstásSola",
    icono: "🤝",
  },
  {
    id: 19,
    frase: "Mira hacia atrás y contempla cuántos retos ya has superado con gracia y templanza. Tienes un corazón fuerte, compasivo y lleno de bendición.",
    autor: "Resiliencia Femenina",
    tag: "#FuerzaDelCorazón",
    icono: "🌸",
  },
  {
    id: 20,
    frase: "En los momentos de silencio, dile al oído a tu papá lo agradecida que estás por su vida y su ejemplo. Las palabras de amor son bálsamos que acarician el alma.",
    autor: "Palabras que Sanan",
    tag: "#GratitudYAmor",
    icono: "💬",
  },
  {
    id: 21,
    frase: "No permitas que la preocupación por el mañana te robe la bendición de estar juntos hoy. El presente es el regalo más sagrado y hermoso que tenemos.",
    autor: "Tiempo Compartido",
    tag: "#VivirElPresente",
    icono: "🕯️",
  },
  {
    id: 22,
    frase: "Que la vida colme a tu papá de alivio, tranquilidad y ánimo, y a ti te regale fortaleza, sabiduría y la paz que sobrepasa todo entendimiento.",
    autor: "Bendición Diaria",
    tag: "#PazYSalud",
    icono: "🕊️",
  },
  {
    id: 23,
    frase: "Detrás de tu dulzura hay una fortaleza inmensa. Siéntete orgullosa de la hija ejemplar y amorosa que eres, y de cómo estás dando lo mejor de ti.",
    autor: "Reconocimiento del Alma",
    tag: "#HijaEjemplar",
    icono: "🤍",
  },
  {
    id: 24,
    frase: "A veces el mayor acto de amor es simplemente estar ahí: sostener una mano en silencio, escuchar con el corazón y regalar una mirada de complicidad y paz.",
    autor: "Presencia Serena",
    tag: "#EstarPresente",
    icono: "🤲",
  },
  {
    id: 25,
    frase: "Respira hondo y suelta la tensión de tus hombros. Hoy estás haciendo lo correcto. Eres un ser humano valioso, amado y con una luz hermosa para dar.",
    autor: "Calma & Respiro",
    tag: "#UnRespiroParaTi",
    icono: "🌿",
  },
  {
    id: 26,
    frase: "La vida tiene ritmos misteriosos, pero el amor nunca se rinde. Pon tu corazón en calma y permite que cada jornada sea una oportunidad para abrazar la vida.",
    autor: "Esperanza Infinita",
    tag: "#ElAmorSana",
    icono: "✨",
  },
  {
    id: 27,
    frase: "Que en tu jornada de hoy no falte una sonrisa sincera, una taza de té o café caliente y un instante de quietud para recordar lo hermosa que es la vida.",
    autor: "Pausa Reconfortante",
    tag: "#InstantesDePaz",
    icono: "☕",
  },
  {
    id: 28,
    frase: "Tu papá sabe que cuenta contigo, y tú sabes que cuentas con el amor de quienes te aprecian. Apóyate en quienes te quieren; compartir la carga alivia el camino.",
    autor: "Red de Apoyo",
    tag: "#JuntosSomosMásFuertes",
    icono: "🤍",
  },
  {
    id: 29,
    frase: "La esperanza es como una pequeña semilla que crece aun en tierra difícil. Riega esa semilla con pensamientos de fe, paciencia y mucho amor.",
    autor: "Semilla de Vida",
    tag: "#SembrarEsperanza",
    icono: "🌱",
  },
  {
    id: 30,
    frase: "Todo lo que haces con amor genuino da frutos de paz. Sigue caminando con la frente en alto, con tu dulzura característica y con la certeza de que das lo mejor de ti.",
    autor: "Nobleza & Bondad",
    tag: "#EntregaConAmor",
    icono: "🌸",
  },
  {
    id: 31,
    frase: "En las horas difíciles, recuerda los momentos alegres compartidos: las risas, las historias y las anécdotas. Esos recuerdos son luces que nunca se apagan.",
    autor: "Memorias del Alma",
    tag: "#RecuerdosLuminosos",
    icono: "🌼",
  },
  {
    id: 32,
    frase: "Cierra el día agradeciendo por la vida, por cada respiro y por la bendición de tener a quienes amas cerca. Mañana será un nuevo amanecer lleno de posibilidades.",
    autor: "Cierre de Paz",
    tag: "#GratitudYVida",
    icono: "🌙",
  },
];

/**
 * Obtiene la frase del día calculada determinísticamente según la fecha.
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
