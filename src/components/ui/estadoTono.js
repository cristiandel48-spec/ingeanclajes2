// A que tono corresponde cada estado de la aplicacion.
//
// Va en su propio archivo porque mezclar constantes y componentes en el mismo
// modulo rompe la recarga en caliente de Vite: al tocar un color se recarga la
// pagina entera en vez de solo la pieza.
//
// Lo que no este aqui sale neutro, que es el comportamiento correcto: un
// estado nuevo no deberia inventarse un color.

const TONOS = {
  "Vigente": "exito",
  "Pagado": "exito",
  "Cobrado": "exito",
  "Activo": "exito",
  "Aprobada": "exito",
  "Finalizado": "exito",
  "Realizada": "exito",
  "Completada": "exito",
  "Pendiente": "aviso",
  "Por vencer": "aviso",
  "En revisión": "aviso",
  "Vencida": "peligro",
  "Vencido": "peligro",
  "Rechazada": "peligro",
  "En Obra": "acento",
  "En Ejecución": "acento",
  "Cotización": "neutro",
  "Borrador": "neutro",
  "Por hacer": "neutro",
};

export function tonoDeEstado(estado) {
  return TONOS[estado] || "neutro";
}
