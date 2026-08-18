// Conversaciones de muestra para la pantalla de WhatsApp.
//
// La pantalla no se puede enseñar vacía. Mientras no llegue lo de Meta dice
// «Todavía no ha escrito nadie», y con eso nadie entiende qué compró: ni cómo
// se ve una conversación, ni que el sistema contesta solo, ni que de un chat
// sale una cotización.
//
// NO SE GUARDA NADA EN LA BASE. Son cuatro conversaciones inventadas que vive
// solo en la memoria del navegador, y la pantalla las enseña únicamente cuando
// no hay ni un mensaje real. En cuanto entre el primero, desaparecen solas: no
// hay nada que borrar después ni forma de que se mezclen con lo de verdad.
//
// LOS TELEFONOS SON FALSOS A PROPOSITO -300 000 0001 y siguientes-. La pantalla
// tiene un boton «Escribirle por WhatsApp», y con un número verosímil alguien
// probando terminaría escribiéndole a un desconocido.
//
// Las cuatro cubren los cuatro estados que sabe pintar la pantalla: respondida
// con cotización, respondida sin cotización, en cola y fallida. Quien las mira
// ve de una vez todo lo que puede pasar.

// Las horas se calculan al abrir, no van escritas: si estuvieran fijas, en dos
// semanas el ejemplo diría «hace 14 días» y parecería un sistema abandonado.
const haceMinutos = (n) => new Date(Date.now() - n * 60000).toISOString();
const haceHoras = (n) => haceMinutos(n * 60);

export function mensajesEjemplo() {
  return [
    // 1. El caso completo: pregunta, el sistema responde, pide los datos y de
    //    ahí sale la cotización. Es lo que se compró.
    {
      wa_message_id: "ejemplo-1a",
      telefono: "573000000001",
      perfil_nombre: "Andrés Ospina",
      texto: "Buenas tardes, necesito cotizar líneas de vida para una bodega en Itagüí. Son como 80 metros de cubierta.",
      recibido_en: haceHoras(3),
      estado: "respondido",
      respuesta: "Buenas tardes, Andrés. Con gusto. Manejamos línea de vida horizontal certificada, instalada y con memoria de cálculo. Para pasarle el valor exacto necesito el nombre de la empresa y el NIT. ¿Me los confirma?",
      error: null,
      cotizacion_id: null,
    },
    {
      wa_message_id: "ejemplo-1b",
      telefono: "573000000001",
      perfil_nombre: "Andrés Ospina",
      texto: "Claro. Almacenes La 33 S.A.S, NIT 900456123-7",
      recibido_en: haceHoras(2.8),
      estado: "respondido",
      respuesta: "Listo, Andrés. Quedó registrado y le preparé la cotización C-26130 por los 80 ML. Un asesor la revisa y se la envía hoy mismo al correo. Si prefiere que lo llamemos, dígame a qué hora le queda bien.",
      error: null,
      cotizacion_id: "C-26130",
    },

    // 2. El que pregunta por algo que no es lo de siempre. Interesa que se vea
    //    que el sistema no inventa: recoge el dato y pasa la bola al asesor.
    {
      wa_message_id: "ejemplo-2a",
      telefono: "573000000002",
      perfil_nombre: "Marcela Ruiz",
      texto: "Buenos días. ¿Ustedes también instalan puntos de anclaje en una pérgola de madera?",
      recibido_en: haceHoras(1.5),
      estado: "respondido",
      respuesta: "Buenos días, Marcela. Sobre madera hay que revisar el anclaje en sitio antes de comprometer un valor: depende de la escuadría y del estado de la estructura. ¿Me cuenta en qué ciudad está y cuántos puntos necesita? Con eso un asesor la contacta hoy.",
      error: null,
      cotizacion_id: null,
    },
    {
      wa_message_id: "ejemplo-2b",
      telefono: "573000000002",
      perfil_nombre: "Marcela Ruiz",
      texto: "Estamos en Sabaneta, serían 4 puntos. Es para el mantenimiento de las canales.",
      recibido_en: haceMinutos(52),
      estado: "respondido",
      respuesta: "Perfecto, Marcela. Ya quedó anotado: Sabaneta, 4 puntos sobre pérgola en madera. Un asesor la llama para coordinar la visita.",
      error: null,
      cotizacion_id: null,
    },

    // 3. Una foto. La pantalla no muestra imágenes -WhatsApp las entrega en un
    //    enlace aparte-, pero deja constancia de que llegó algo que hay que ir
    //    a mirar. Se queda en cola: el sistema no responde lo que no lee.
    {
      wa_message_id: "ejemplo-3a",
      telefono: "573000000003",
      perfil_nombre: "Luis Fernando Gómez",
      texto: null,
      recibido_en: haceMinutos(24),
      estado: "recibido",
      respuesta: null,
      error: null,
      cotizacion_id: null,
    },

    // 4. La que hay que mirar: escribió y no recibió nada. Es el único caso que
    //    pide que una persona haga algo, y por eso sale el aviso naranja.
    {
      wa_message_id: "ejemplo-4a",
      telefono: "573000000004",
      perfil_nombre: "Camila Restrepo",
      texto: "Buenas. Necesito con urgencia la certificación de los puntos de anclaje que nos instalaron el año pasado, nos la está pidiendo la ARL para mañana.",
      recibido_en: haceMinutos(9),
      estado: "fallido",
      respuesta: null,
      error: "No se pudo enviar la respuesta: WhatsApp devolvió un error temporal.",
      cotizacion_id: null,
    },
  ];
}
