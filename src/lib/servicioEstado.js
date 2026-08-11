// Interruptor de servicio.
//
// Cuando SERVICIO_SUSPENDIDO es true, la aplicacion no arranca: muestra una
// pantalla de fallo de conexion antes de pedir la sesion. Para reactivarla,
// poner en false y volver a publicar en Vercel.
//
// Es una bandera fija a proposito: no se lee de la base ni de una variable de
// entorno, para que solo se cambie tocando el codigo y publicando de nuevo.
export const SERVICIO_SUSPENDIDO = true;
