// El proceso de nómina, en el orden en que se hace de verdad.
//
// Antes eran nueve botones sueltos, todos del mismo tamaño y sin orden
// aparente: nada indicaba por dónde empezar ni que "Planilla Bancolombia" era
// el final del camino.

export const FASES = [
  {
    titulo: "Preparación del corte",
    detalle: "Reúne todo lo que cambia el pago de la quincena.",
    pasos: [
      { id: "lista", label: "Empleados" },
      { id: "he", label: "Horas extras y comisiones" },
      { id: "incapacidades", label: "Incapacidades" },
      { id: "vacaciones", label: "Vacaciones" },
      { id: "deducciones", label: "Deducciones" },
    ],
  },
  {
    titulo: "Novedades de contrato",
    detalle: "Solo si alguien entró, salió o se le liquidan prestaciones.",
    pasos: [
      { id: "contratos", label: "Contratos y liquidación" },
      { id: "prestaciones", label: "Prestaciones sociales" },
    ],
  },
  {
    titulo: "Cierre y pago",
    detalle: "Se genera la nómina y sale el archivo para el banco.",
    pasos: [
      { id: "planilla", label: "Generar nómina" },
      { id: "colillas", label: "Colillas de pago" },
    ],
  },
];

// Lista plana, en orden, para numerar los pasos y moverse entre ellos.
export const PASOS = FASES.flatMap((fase) => fase.pasos);

export function indiceDePaso(id) {
  return PASOS.findIndex((paso) => paso.id === id);
}

export function pasoAnterior(id) {
  const i = indiceDePaso(id);
  return i > 0 ? PASOS[i - 1] : null;
}

export function pasoSiguiente(id) {
  const i = indiceDePaso(id);
  return i >= 0 && i < PASOS.length - 1 ? PASOS[i + 1] : null;
}
