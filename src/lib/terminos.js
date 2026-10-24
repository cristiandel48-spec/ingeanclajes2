// Terminos de uso del sistema y Politica de tratamiento de datos personales.
//
// Cada persona los acepta al entrar, y queda registrado quien, que version y
// cuando (migracion 061). Cuando se cambie el texto hay que subir
// VERSION_TERMINOS: asi todos lo vuelven a ver y aceptar la proxima vez que
// entren, y la aceptacion anterior queda en el historial con su version.
//
// BORRADOR. Esta redactado conforme a la Ley 1581 de 2012 y el Decreto 1377
// de 2013 (hoy en el Decreto 1074 de 2015), pero conviene que lo revise un
// abogado antes de darlo por definitivo.

export const VERSION_TERMINOS = "2026-10-19";

export const EMPRESA = {
  razonSocial: "INGEANCLAJES S.A.S.",
  nit: "900.193.965-4",
  direccion: "Calle 38 Sur # 36 – 48, Envigado, Antioquia",
  telefono: "PBX (604) 448 26 86",
  // Correo donde las personas ejercen sus derechos sobre sus datos.
  correoDatos: "comercial1ingeanclajes@gmail.com",
};

// Cada seccion: titulo y parrafos. La pantalla los pinta tal cual.
export const TERMINOS_USO = [
  {
    titulo: "1. Para qué es este sistema",
    parrafos: [
      `Este sistema es una herramienta interna de ${EMPRESA.razonSocial} para gestionar cotizaciones, obras, personal, pagos, informes, certificaciones y la comunicación con clientes. Solo puede usarse para labores de la empresa.`,
    ],
  },
  {
    titulo: "2. Tu cuenta es personal",
    parrafos: [
      "Tu usuario y contraseña son personales e intransferibles. No los compartas con nadie. Todo lo que se haga con tu cuenta queda registrado a tu nombre.",
      "Si crees que alguien conoce tu contraseña, cámbiala de inmediato y avísale al administrador.",
    ],
  },
  {
    titulo: "3. Confidencialidad",
    parrafos: [
      "La información del sistema es confidencial: datos de clientes, precios, cotizaciones, nómina, datos del personal, documentos y fotografías de obra. No puedes copiarla, descargarla, enviarla ni divulgarla fuera de la empresa, salvo cuando tu trabajo lo requiera.",
      "Esta obligación sigue vigente después de que termine tu relación con la empresa.",
    ],
  },
  {
    titulo: "4. Lo que registras",
    parrafos: [
      "Eres responsable de que la información que registras sea veraz y esté completa. Los correos, cotizaciones, invitaciones e informes que envías desde el sistema salen en nombre de la empresa.",
    ],
  },
  {
    titulo: "5. Registro de actividad",
    parrafos: [
      "Por seguridad y control, el sistema guarda quién crea o modifica cada registro, cuándo te conectas y desde qué navegador aceptaste estos términos.",
    ],
  },
  {
    titulo: "6. Acceso y suspensión",
    parrafos: [
      "La empresa decide qué módulos puede usar cada persona, y puede suspender o retirar el acceso cuando lo considere necesario, en especial al terminar la relación laboral o comercial.",
    ],
  },
];

export const POLITICA_DATOS = [
  {
    titulo: "1. Responsable del tratamiento",
    parrafos: [
      `${EMPRESA.razonSocial}, NIT ${EMPRESA.nit}, con domicilio en ${EMPRESA.direccion}, ${EMPRESA.telefono}, correo ${EMPRESA.correoDatos}.`,
    ],
  },
  {
    titulo: "2. Qué datos tratamos",
    parrafos: [
      "De las personas que usan el sistema: nombre, correo, cargo y registros de actividad.",
      "Del personal: identificación, datos de contacto, cargo, salario, datos bancarios para el pago de nómina, afiliaciones a seguridad social y certificados de trabajo en alturas.",
      "De clientes y sus contactos: nombre o razón social, NIT, teléfono, correo, dirección y ubicación de la obra.",
      "Fotografías y registros de las obras, que pueden mostrar a personas trabajando.",
    ],
  },
  {
    titulo: "3. Para qué los usamos",
    parrafos: [
      "Elaborar y enviar cotizaciones; ejecutar, documentar y certificar las obras conforme a la Resolución 4272 de 2021; pagar la nómina y cumplir las obligaciones laborales, de seguridad social y tributarias; llevar la contabilidad; comunicarnos con clientes y con el equipo; y proteger la seguridad del sistema.",
    ],
  },
  {
    titulo: "4. Dónde se guardan",
    parrafos: [
      "Los datos se guardan en servicios de proveedores tecnológicos que actúan como encargados del tratamiento: almacenamiento en la nube (Supabase), alojamiento de la aplicación (Cloudflare) y envío de correos (Google). Algunos de estos servidores están fuera de Colombia, por lo que puede haber transferencia internacional de datos a países con medidas de protección adecuadas.",
    ],
  },
  {
    titulo: "5. Tus derechos",
    parrafos: [
      "Como titular de los datos tienes derecho a: conocer, actualizar y rectificar tus datos; pedir prueba de la autorización que diste; saber para qué se han usado; presentar quejas ante la Superintendencia de Industria y Comercio; revocar la autorización o pedir que se supriman tus datos, cuando no exista un deber legal o contractual de conservarlos; y acceder a ellos de forma gratuita.",
      "Los datos sensibles, como los de salud, no son obligatorios: puedes decidir no darlos.",
    ],
  },
  {
    titulo: "6. Cómo ejercerlos",
    parrafos: [
      `Escribe a ${EMPRESA.correoDatos} indicando tu nombre, identificación y lo que solicitas. Las consultas se responden en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles.`,
    ],
  },
  {
    titulo: "7. Datos de otras personas",
    parrafos: [
      "Cuando registras datos de un tercero —un empleado, un cliente, un contacto de obra— declaras que esa persona autorizó a la empresa para tratarlos con estas finalidades, o que existe una relación contractual o legal que lo permite.",
    ],
  },
];
