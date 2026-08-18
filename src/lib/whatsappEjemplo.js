// Conversaciones de muestra para la pantalla de WhatsApp.
//
// La pantalla no se puede enseñar vacía. Mientras no llegue lo de Meta dice
// «Todavía no ha escrito nadie», y con eso nadie entiende qué compró: ni cómo
// se ve una conversación, ni que el sistema contesta solo, ni que de un chat
// sale una cotización.
//
// NO SE GUARDA NADA EN LA BASE. Viven solo en la memoria del navegador, y la
// pantalla las enseña únicamente cuando no hay ni un mensaje real. En cuanto
// entre el primero desaparecen solas: no hay nada que borrar después ni forma
// de que se mezclen con lo de verdad.
//
// LOS TELEFONOS SON FALSOS A PROPOSITO -300 000 0001 y siguientes-. La pantalla
// tiene un botón «Escribirle por WhatsApp», y con un número verosímil alguien
// probando terminaría escribiéndole a un desconocido.
//
// LAS CONVERSACIONES SON LARGAS A PROPOSITO. Una pregunta y una respuesta no
// enseñan nada: el cliente de verdad no sabe lo que necesita, pregunta por
// cosas distintas, pide precio antes de dar los datos, se va y vuelve. Lo que
// hay que ver es que el sistema aguanta ese vaivén sin perder el hilo y sin
// inventar un precio que después no se pueda sostener.
//
// Las cinco cubren los cuatro estados que sabe pintar la pantalla -respondida
// con cotización, respondida sin cotización, en cola y fallida- y además los
// tres casos que se repiten en la vida real: el que ya sabe lo que quiere, el
// que no tiene ni idea, y el que no quiere soltar los datos.

// Las horas se calculan al abrir, no van escritas: si estuvieran fijas, en dos
// semanas el ejemplo diría «hace 14 días» y parecería un sistema abandonado.
const haceMinutos = (n) => new Date(Date.now() - n * 60000).toISOString();

// Azúcar para no repetir las mismas cinco claves en cada mensaje.
const msg = (telefono, nombre, minutos, texto, respuesta, extra = {}) => ({
  wa_message_id: `ejemplo-${telefono}-${minutos}`,
  telefono,
  perfil_nombre: nombre,
  texto,
  recibido_en: haceMinutos(minutos),
  estado: respuesta ? "respondido" : "recibido",
  respuesta,
  error: null,
  cotizacion_id: null,
  ...extra,
});

export function mensajesEjemplo() {
  const T1 = "573000000001", T2 = "573000000002";
  const T3 = "573000000003", T4 = "573000000004", T5 = "573000000005";

  return [
    // ── 1. El que ya sabe lo que quiere ──────────────────────────────────
    // Pide, regatea el plazo, pregunta por la certificación y suelta los datos.
    // Termina en cotización. Es el caso que justifica el módulo.
    msg(T1, "Andrés Ospina", 34,
      "Buenas tardes, necesito cotizar líneas de vida para una bodega en Itagüí. Son como 80 metros de cubierta.",
      "Buenas tardes, Andrés. Con gusto. Manejamos línea de vida horizontal certificada, instalada y con memoria de cálculo. ¿La cubierta es en teja de zinc, sándwich o placa?"),
    msg(T1, "Andrés Ospina", 30,
      "Teja sándwich. ¿Eso cambia mucho el precio?",
      "Cambia el tipo de anclaje, no tanto el valor: sobre sándwich se ancla a la correa y se refuerza el paso del tornillo. Para los 80 ML aproximados, el orden de magnitud está entre $22.000.000 y $24.000.000 más IVA, pero el valor en firme sale con la visita."),
    msg(T1, "Andrés Ospina", 26,
      "Ok. ¿Y eso queda certificado? Es que nos lo está pidiendo la ARL.",
      "Sí. Se entrega certificación del sistema con la memoria de cálculo, las fichas técnicas de los elementos y el acta de instalación. Es lo que le van a pedir en la auditoría."),
    msg(T1, "Andrés Ospina", 21,
      "Perfecto. ¿En cuánto tiempo lo instalan? Necesitamos tenerlo antes de fin de mes.",
      "Para 80 ML el tiempo de ejecución es de 5 a 6 días calendario, sujeto a clima. Contando la visita y la aprobación, antes de fin de mes es viable. Para dejarlo agendado necesito el nombre de la empresa y el NIT."),
    msg(T1, "Andrés Ospina", 16,
      "Almacenes La 33 S.A.S, NIT 900456123-7. El contacto soy yo, Andrés Ospina, andres.ospina@la33.com.co",
      "Listo, Andrés. Quedó registrado y le preparé la cotización C-26130 por los 80 ML. Un asesor la revisa y se la envía hoy a andres.ospina@la33.com.co. ¿Le sirve que la visita sea el jueves en la mañana?",
      { cotizacion_id: "C-26130" }),
    msg(T1, "Andrés Ospina", 11,
      "El jueves en la mañana está bien. Gracias.",
      "Perfecto, queda anotado: jueves en la mañana, bodega en Itagüí. El asesor lo confirma un día antes."),

    // ── 2. La que no sabe lo que necesita ────────────────────────────────
    // El caso más común y el que peor se atiende a mano: pregunta por cosas
    // distintas, y hay que averiguar el problema antes de vender nada. Se ve
    // que el sistema NO inventa un precio sobre algo que no ha visto.
    msg(T2, "Marcela Ruiz", 78,
      "Buenos días. Una pregunta, ¿ustedes qué hacen exactamente? Nos recomendaron con ustedes pero no sé si es lo que necesitamos.",
      "Buenos días, Marcela. Instalamos sistemas de protección contra caídas: líneas de vida horizontales y verticales, puntos de anclaje certificados, escaleras con riel de seguridad y pasarelas. También la certificación anual de los sistemas ya instalados. ¿Qué trabajo en altura necesitan hacer?"),
    msg(T2, "Marcela Ruiz", 71,
      "Es que se nos cayó un operario limpiando las canales del techo. No pasó a mayores pero la ARL nos abrió un requerimiento y nos pidió un sistema de anclaje.",
      "Entiendo, Marcela. Lo lamento. Para mantenimiento de canales lo que normalmente se instala es una línea de vida horizontal que acompañe el recorrido, o puntos de anclaje si el tramo es corto. ¿Cuántos metros tiene la canal y a qué altura está?"),
    msg(T2, "Marcela Ruiz", 65,
      "Uf, no sabría decirle los metros. Es la parte de atrás de la bodega. ¿Y una pérgola también se puede? Porque la canal pasa sobre una pérgola de madera.",
      "Sobre madera hay que revisarlo en sitio antes de comprometer un valor: depende de la escuadría, del estado de la madera y de si hay estructura metálica cerca a la que anclar. No le puedo pasar un precio a ciegas de algo que no hemos visto, sería irresponsable. Lo que sí puedo es agendar la visita, que no tiene costo."),
    msg(T2, "Marcela Ruiz", 58,
      "Ah ok. ¿Y la visita cuánto se demora? ¿Y ustedes también nos capacitan al personal?",
      "La visita toma alrededor de una hora y el asesor le deja el levantamiento hecho. La capacitación de trabajo en altura no la dictamos nosotros, pero al entregar el sistema hacemos la inducción de uso a la gente que lo va a operar. ¿En qué ciudad están y a nombre de quién registro la solicitud?"),
    msg(T2, "Marcela Ruiz", 52,
      "Estamos en Sabaneta. Comercializadora Andina, yo soy la de seguridad y salud en el trabajo.",
      "Gracias, Marcela. Quedó registrado: Comercializadora Andina, Sabaneta, mantenimiento de canales sobre pérgola en madera, requerimiento de ARL abierto. Un asesor la llama hoy para coordinar la visita. Si tiene el NIT a la mano se lo puedo dejar listo desde ya."),

    // ── 3. El que no suelta los datos ────────────────────────────────────
    // Quiere precio y nada más. El sistema no lo persigue ni lo bloquea: da lo
    // que puede dar sin visita y deja la puerta abierta. Queda sin cotizacion,
    // que es lo correcto: no hay con qué hacerla.
    // Sin nombre de perfil: pasa a cada rato, y la lista tiene que verse bien
    // enseñando solo el telefono.
    msg(T3, "", 128,
      "buenas cuanto vale una linea de vida",
      "Buenas. Depende de la longitud y del tipo de cubierta, pero para que se haga una idea: una línea de vida horizontal sale alrededor de $280.000 por metro lineal instalada y certificada. ¿Cuántos metros necesita?"),
    msg(T3, "", 121,
      "y de 30 metros?",
      "Treinta metros lineales estarían alrededor de $8.400.000 más la utilidad y el IVA de ley. Es un estimado: el valor en firme sale después de la visita, que no tiene costo. ¿Me comparte el nombre de la empresa para pasarle la cotización formal?"),
    msg(T3, "", 115,
      "por ahora solo estoy averiguando gracias",
      "Con mucho gusto. Le dejo el dato por si le sirve más adelante: la cotización se sostiene 30 días y la visita es gratuita. Aquí estamos cuando lo necesite."),

    // ── 4. La foto ───────────────────────────────────────────────────────
    // La pantalla no muestra imágenes -WhatsApp las entrega en un enlace
    // aparte-, pero deja constancia de que llegó algo que hay que ir a mirar.
    // Se queda en cola: el sistema no responde lo que no puede leer.
    msg(T4, "Luis Fernando Gómez", 190,
      "Buenas, tengo una duda con el anclaje que nos instalaron el mes pasado. Se ve como movido, ¿les puedo mandar una foto?",
      "Buenas, Luis Fernando. Claro, mándela. Y mientras la revisamos, por precaución no use ese punto: si el anclaje está flojo no sostiene la carga de una caída."),
    msg(T4, "Luis Fernando Gómez", 186, null, null),

    // ── 5. La que se quedó sin respuesta ─────────────────────────────────
    // El único caso que pide que una persona haga algo, y por eso dispara el
    // aviso naranja de arriba. Se enseña a proposito: el sistema avisa cuando
    // falla, no lo esconde.
    msg(T5, "Camila Restrepo", 240,
      "Buenas. Necesito con urgencia la certificación de los puntos de anclaje que nos instalaron el año pasado, la ARL nos la está pidiendo para mañana.",
      null,
      { estado: "fallido", error: "No se pudo enviar la respuesta: WhatsApp devolvió un error temporal." }),
  ];
}
