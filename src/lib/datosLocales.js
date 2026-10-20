// Copias de datos que quedan en el navegador (hallazgo S12).
//
// Agenda, ordenes de compra y nominas generadas se guardan tambien en el
// navegador para que la pantalla no arranque vacia. Al cerrar sesion se
// quedaban ahi: en un equipo compartido, el siguiente que lo usara podia
// leer las nominas con salarios abriendo las herramientas del navegador.
//
// Solo se borran las que son copia de la nube: al volver a entrar se cargan
// de nuevo. Las tareas de produccion viven solo en el navegador, y las tareas
// y documentos personales pueden tener algo pendiente de subir: esas no se
// tocan.

import { NOMINA_GENERATED_STORAGE_KEY } from "./nomina";

const COPIAS_DE_LA_NUBE = [
  "agenda_compromisos",
  "ordenes_compra",
  NOMINA_GENERATED_STORAGE_KEY,
];

export function borrarCopiasLocales() {
  for (const clave of COPIAS_DE_LA_NUBE) {
    try {
      localStorage.removeItem(clave);
    } catch { /* sin almacenamiento del navegador: no hay nada que borrar */ }
  }
}
