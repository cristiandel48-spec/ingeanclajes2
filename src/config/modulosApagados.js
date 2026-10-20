// Modulos apagados: no estan en el menu y la aplicacion no carga ni guarda sus
// tablas, para no gastar consultas en datos que nadie mira.
//
// El codigo de cada modulo se conserva. Para volver a encender uno:
//   1. quitarlo de esta lista,
//   2. volver a poner su entrada en el menu (src/config/navigation.jsx).
//
// Solo van aqui tablas que NINGUNA pantalla activa usa. Antes de agregar una,
// buscar quien la lee: por ejemplo, Ejecucion de obra usa cuentas, proveedores
// y ordenes_compra (gastos de la obra), y el Dashboard usa documentos_equipo
// (pendientes); esas no se pueden apagar aunque sus modulos esten fuera del menu.
export const MODULOS_APAGADOS = {
  pagos: ["pagos"],
  contabilidad: ["contabilidad_config", "plan_cuentas", "asientos_contables"],
  // De Nomina sigue activo el area de Personal (empleados y cargos); lo que se
  // apaga es la liquidacion: nominas generadas, colillas y planilla.
  nominaLiquidacion: ["nominas_generadas"],
};

export const ENTIDADES_APAGADAS = new Set(Object.values(MODULOS_APAGADOS).flat());
