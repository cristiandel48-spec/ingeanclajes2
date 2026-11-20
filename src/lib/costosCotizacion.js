// Motor de costos internos, insumos y recetas (APU) para cotizaciones.
//
// USO ESTRICTAMENTE INTERNO (solo administradores: Cristian y Camila).
// - Se persiste en `app.empresa_config` bajo id `"costos_apu"` (en `control_documental`),
//   sin requerir migraciones SQL ni tocar la fila `"empresa"` ni `"firma_coord:*"`.
// - Los ajustes manuales o estimaciones con IA por cotizacion se guardan dentro de cada
//   propuesta en `propuesta.costeoInterno` (JSONB de `cotizaciones.propuestas`).
// - NUNCA se imprime ni se exporta en el PDF / vista previa del cliente.

import { calcularTotales, porcentajeUtilidad } from "./cotizaciones";

export const ID_CONFIG_COSTOS_APU = "costos_apu";
export const MARGEN_MINIMO_DEFAULT = 25;
// Cuantos tecnicos van juntos a una obra. De ahi salen los dias en sitio y,
// con ellos, los viajes y los kits de consumibles.
export const TECNICOS_POR_CUADRILLA_DEFAULT = 2;
const INSUMOS_POR_DIA_DE_OBRA = ["transporte_obra", "consumibles_instalacion"];

export const CATEGORIAS_INSUMO = [
  { id: "material", label: "Materiales e insumos", corto: "Materiales", orden: 1 },
  { id: "mano_obra", label: "Mano de obra", corto: "Mano de obra", orden: 2 },
  { id: "logistica", label: "Transporte y consumibles", corto: "Transporte / Otros", orden: 3 },
];

export const MODOS_RECETA = [
  { id: "por_unidad", label: "Por unidad cotizada", ayuda: "Multiplica la cantidad cotizada por este factor (ej. 1.15 ML de cable por ML)." },
  { id: "fijo", label: "Fijo por servicio", ayuda: "Cantidad fija sin importar los metros o unidades (ej. 2 postes terminales, 1 viaje)." },
  { id: "cada_n", label: "1 por cada N unidades", ayuda: "Redondea hacia arriba: 1 unidad por cada N cotizadas (ej. 1 soporte cada 10 ML)." },
];

// Catálogo base de insumos con precios de compra referenciales en COP (Colombia).
// Todos son 100% editables desde Catálogo > Insumos y costos.
export const INSUMOS_DEFAULT = [
  // --- Materiales e insumos ---
  { id: "cable_acero_516", nombre: 'Cable de acero 5/16" (7x19) certificado', categoria: "material", unidad: "ML", costoUnitario: 18000 },
  { id: "cable_acero_38", nombre: 'Cable de acero 3/8" vertical (7x19)', categoria: "material", unidad: "ML", costoUnitario: 24000 },
  { id: "punto_anclaje_epoxico", nombre: "Punto de anclaje epóxico 5.000 lb (cáncamo/argolla)", categoria: "material", unidad: "Und", costoUnitario: 95000 },
  { id: "punto_anclaje_soldado", nombre: "Punto de anclaje soldado certificado 5.000 lb", categoria: "material", unidad: "Und", costoUnitario: 78000 },
  { id: "anclaje_artico_galv", nombre: "Anclaje Ártico acero galvanizado certificado", categoria: "material", unidad: "Und", costoUnitario: 145000 },
  { id: "anclaje_artico_inox", nombre: "Anclaje Ártico acero inoxidable 316 certificado", categoria: "material", unidad: "Und", costoUnitario: 220000 },
  { id: "platina_base", nombre: "Platina estructural empotrada + tornillería", categoria: "material", unidad: "Und", costoUnitario: 68000 },
  { id: "poste_terminal", nombre: "Poste terminal / anclaje de extremo certificado", categoria: "material", unidad: "Und", costoUnitario: 195000 },
  { id: "soporte_intermedio", nombre: "Soporte / pasador intermedio de cable", categoria: "material", unidad: "Und", costoUnitario: 85000 },
  { id: "poste_cuello_cisne", nombre: "Poste cuello de cisne / soporte en T con pedestal (camionera)", categoria: "material", unidad: "Und", costoUnitario: 4200000 },
  { id: "dado_concreto", nombre: "Pedestal / dado cimentación en concreto 3500 PSI + acero + excavación", categoria: "material", unidad: "Und", costoUnitario: 2200000 },
  { id: "tensor_forjado", nombre: "Tensor ojo-ojo forjado + guardacables", categoria: "material", unidad: "Und", costoUnitario: 75000 },
  { id: "absorbedor_energia", nombre: "Absorbedor de energía en línea (shock absorber)", categoria: "material", unidad: "Und", costoUnitario: 320000 },
  { id: "prensacables_kit", nombre: "Kit prensacables / terminales de compresión", categoria: "material", unidad: "Kit", costoUnitario: 45000 },
  { id: "arrestador_vertical", nombre: "Arrestador / freno de caídas vertical certificado", categoria: "material", unidad: "Und", costoUnitario: 380000 },
  { id: "carro_camionera", nombre: "Carro deslizante / polea para línea de vida camionera", categoria: "material", unidad: "Und", costoUnitario: 520000 },
  { id: "autorretractil", nombre: "Línea autorretráctil certificada (12-15 m)", categoria: "material", unidad: "Und", costoUnitario: 2100000 },
  { id: "cartucho_epoxico", nombre: "Cartucho adhesivo epóxico estructural (Hilti / Sikadur)", categoria: "material", unidad: "Und", costoUnitario: 92000 },
  { id: "varilla_roscada", nombre: "Varilla roscada B7 / Inox + tuercas y arandelas", categoria: "material", unidad: "Und", costoUnitario: 18000 },
  { id: "placa_identificacion", nombre: "Placa identificación acero inox (Res. 4272)", categoria: "material", unidad: "Und", costoUnitario: 35000 },
  { id: "acero_estructural", nombre: "Perfilería y acero estructural (suministro + corte)", categoria: "material", unidad: "Kg", costoUnitario: 8500 },
  { id: "escalera_tramo", nombre: "Tramo de escalera metálica (largueros, peldaños y soportes)", categoria: "material", unidad: "Metro", costoUnitario: 340000 },
  { id: "pasarela_rejilla", nombre: "Rejilla / lámina antideslizante + estructura pasarela", categoria: "material", unidad: "ML", costoUnitario: 240000 },
  { id: "pintura_anticorrosiva", nombre: "Pintura anticorrosiva + esmalte + solvente", categoria: "material", unidad: "Galón", costoUnitario: 95000 },
  { id: "kit_resane_civil", nombre: "Mortero / estuco / sellador de resane y acabado", categoria: "material", unidad: "Kit", costoUnitario: 42000 },

  // --- Mano de obra ---
  { id: "tecnico_alturas", nombre: "Jornada técnico instalador certificado en alturas", categoria: "mano_obra", unidad: "Día", costoUnitario: 180000 },
  { id: "auxiliar_alturas", nombre: "Jornada auxiliar técnico en alturas", categoria: "mano_obra", unidad: "Día", costoUnitario: 130000 },
  { id: "coordinador_sst", nombre: "Jornada coordinador trabajo seguro en alturas (SST)", categoria: "mano_obra", unidad: "Día", costoUnitario: 200000 },
  { id: "fabricacion_taller", nombre: "Fabricación en taller (soldadura calificada, corte y pintura)", categoria: "mano_obra", unidad: "Día", costoUnitario: 420000 },
  { id: "memoria_calculo", nombre: "Diseño, memoria de cálculo y firma de ingeniería", categoria: "mano_obra", unidad: "Global", costoUnitario: 450000 },

  // --- Transporte y consumibles ---
  { id: "transporte_obra", nombre: "Transporte de personal, equipos y materiales", categoria: "logistica", unidad: "Viaje", costoUnitario: 140000 },
  { id: "alquiler_grua_manlift", nombre: "Alquiler camión grúa / izajes / plataforma elevadora (manlift)", categoria: "logistica", unidad: "Día", costoUnitario: 1800000 },
  { id: "polizas_certificacion", nombre: "Pólizas, pruebas de carga, certificación Res. 4272 y reserva recertificación", categoria: "logistica", unidad: "Global", costoUnitario: 1800000 },
  { id: "consumibles_instalacion", nombre: "Consumibles (brocas SDS, discos, soldadura, tornillería menor)", categoria: "logistica", unidad: "Kit", costoUnitario: 85000 },
];

export function claveServicio(texto = "") {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

// Recetas (APU) por defecto para los servicios estándar de Ingeanclajes.
// Cada regla: { insumoId, modo: "por_unidad" | "fijo" | "cada_n", valor: number }
// - por_unidad: cantidad = cantItem * valor
// - fijo: cantidad = valor
// - cada_n: cantidad = Math.ceil(cantItem / valor)
export const RECETAS_DEFAULT = {
  [claveServicio("LINEA DE VIDA HORIZONTAL")]: [
    { insumoId: "cable_acero_516", modo: "por_unidad", valor: 1.15 },
    { insumoId: "poste_terminal", modo: "fijo", valor: 2 },
    { insumoId: "soporte_intermedio", modo: "cada_n", valor: 10 },
    { insumoId: "tensor_forjado", modo: "fijo", valor: 1 },
    { insumoId: "absorbedor_energia", modo: "fijo", valor: 1 },
    { insumoId: "prensacables_kit", modo: "fijo", valor: 1 },
    { insumoId: "cartucho_epoxico", modo: "cada_n", valor: 15 },
    { insumoId: "placa_identificacion", modo: "fijo", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 15 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 15 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 20 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("LINEA DE VIDA CONEXION / TRANSVERSAL")]: [
    { insumoId: "cable_acero_516", modo: "por_unidad", valor: 1.15 },
    { insumoId: "poste_terminal", modo: "fijo", valor: 2 },
    { insumoId: "soporte_intermedio", modo: "cada_n", valor: 10 },
    { insumoId: "tensor_forjado", modo: "fijo", valor: 1 },
    { insumoId: "absorbedor_energia", modo: "fijo", valor: 1 },
    { insumoId: "prensacables_kit", modo: "fijo", valor: 1 },
    { insumoId: "placa_identificacion", modo: "fijo", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 15 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 15 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 20 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("LINEA DE VIDA VERTICAL")]: [
    { insumoId: "cable_acero_38", modo: "por_unidad", valor: 1.15 },
    { insumoId: "poste_terminal", modo: "fijo", valor: 2 },
    { insumoId: "soporte_intermedio", modo: "cada_n", valor: 8 },
    { insumoId: "tensor_forjado", modo: "fijo", valor: 1 },
    { insumoId: "absorbedor_energia", modo: "fijo", valor: 1 },
    { insumoId: "arrestador_vertical", modo: "fijo", valor: 1 },
    { insumoId: "prensacables_kit", modo: "fijo", valor: 1 },
    { insumoId: "placa_identificacion", modo: "fijo", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 12 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 12 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 15 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("RECERTIFICACION LINEA DE VIDA")]: [
    { insumoId: "placa_identificacion", modo: "fijo", valor: 1 },
    { insumoId: "pintura_anticorrosiva", modo: "cada_n", valor: 40 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 35 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 40 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("PUNTO DE ANCLAJE EPOXICO")]: [
    { insumoId: "punto_anclaje_epoxico", modo: "por_unidad", valor: 1 },
    { insumoId: "varilla_roscada", modo: "por_unidad", valor: 1 },
    { insumoId: "cartucho_epoxico", modo: "cada_n", valor: 4 },
    { insumoId: "placa_identificacion", modo: "por_unidad", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 6 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 8 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("PUNTO DE ANCLAJE SOLDADO")]: [
    { insumoId: "punto_anclaje_soldado", modo: "por_unidad", valor: 1 },
    { insumoId: "placa_identificacion", modo: "por_unidad", valor: 1 },
    { insumoId: "pintura_anticorrosiva", modo: "cada_n", valor: 10 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 8 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 10 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("PUNTO DE ANCLAJE EN FACHADA")]: [
    { insumoId: "punto_anclaje_epoxico", modo: "por_unidad", valor: 1 },
    { insumoId: "varilla_roscada", modo: "por_unidad", valor: 2 },
    { insumoId: "cartucho_epoxico", modo: "cada_n", valor: 3 },
    { insumoId: "placa_identificacion", modo: "por_unidad", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 4 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 4 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 6 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("ANCLAJE ARTICO ACERO GALVANIZADO")]: [
    { insumoId: "anclaje_artico_galv", modo: "por_unidad", valor: 1 },
    { insumoId: "varilla_roscada", modo: "por_unidad", valor: 2 },
    { insumoId: "cartucho_epoxico", modo: "cada_n", valor: 4 },
    { insumoId: "placa_identificacion", modo: "por_unidad", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 6 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 8 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("ANCLAJE ARTICO ACERO INOXIDABLE")]: [
    { insumoId: "anclaje_artico_inox", modo: "por_unidad", valor: 1 },
    { insumoId: "varilla_roscada", modo: "por_unidad", valor: 2 },
    { insumoId: "cartucho_epoxico", modo: "cada_n", valor: 4 },
    { insumoId: "placa_identificacion", modo: "por_unidad", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 6 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 8 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("ESCALERA FIJA CON LINEA DE VIDA VERTICAL")]: [
    { insumoId: "escalera_tramo", modo: "por_unidad", valor: 1 },
    { insumoId: "cable_acero_38", modo: "por_unidad", valor: 1.15 },
    { insumoId: "arrestador_vertical", modo: "fijo", valor: 1 },
    { insumoId: "absorbedor_energia", modo: "fijo", valor: 1 },
    { insumoId: "tensor_forjado", modo: "fijo", valor: 1 },
    { insumoId: "cartucho_epoxico", modo: "cada_n", valor: 6 },
    { insumoId: "pintura_anticorrosiva", modo: "cada_n", valor: 8 },
    { insumoId: "placa_identificacion", modo: "fijo", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 4 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 4 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 6 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("ESCALERA TIPO GATO CON LINEA DE VIDA VERTICAL")]: [
    { insumoId: "escalera_tramo", modo: "por_unidad", valor: 1 },
    { insumoId: "cable_acero_38", modo: "por_unidad", valor: 1.15 },
    { insumoId: "arrestador_vertical", modo: "fijo", valor: 1 },
    { insumoId: "absorbedor_energia", modo: "fijo", valor: 1 },
    { insumoId: "tensor_forjado", modo: "fijo", valor: 1 },
    { insumoId: "cartucho_epoxico", modo: "cada_n", valor: 6 },
    { insumoId: "pintura_anticorrosiva", modo: "cada_n", valor: 8 },
    { insumoId: "placa_identificacion", modo: "fijo", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 4 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 4 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 6 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("ESCALERA TIPO GATO")]: [
    { insumoId: "escalera_tramo", modo: "por_unidad", valor: 1 },
    { insumoId: "cartucho_epoxico", modo: "cada_n", valor: 6 },
    { insumoId: "pintura_anticorrosiva", modo: "cada_n", valor: 8 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 5 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 5 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 8 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("ESCALERA MARINERA")]: [
    { insumoId: "escalera_tramo", modo: "por_unidad", valor: 1.1 },
    { insumoId: "cartucho_epoxico", modo: "cada_n", valor: 6 },
    { insumoId: "pintura_anticorrosiva", modo: "cada_n", valor: 8 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 5 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 5 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 8 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("POSTE TIPO CUELLO DE CISNE CON PEDESTAL")]: [
    { insumoId: "poste_cuello_cisne", modo: "por_unidad", valor: 1 },
    { insumoId: "varilla_roscada", modo: "por_unidad", valor: 8 },
    { insumoId: "pintura_anticorrosiva", modo: "por_unidad", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "por_unidad", valor: 1 },
    { insumoId: "auxiliar_alturas", modo: "por_unidad", valor: 1 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
  ],
  [claveServicio("DADO DE CIMENTACION EN CONCRETO PARA POSTE")]: [
    { insumoId: "dado_concreto", modo: "por_unidad", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "por_unidad", valor: 1 },
    { insumoId: "auxiliar_alturas", modo: "por_unidad", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("LINEA DE VIDA CAMIONERA EN CABLE DE ACERO GALVANIZADO")]: [
    { insumoId: "cable_acero_38", modo: "por_unidad", valor: 1.15 },
    { insumoId: "tensor_forjado", modo: "fijo", valor: 2 },
    { insumoId: "absorbedor_energia", modo: "fijo", valor: 2 },
    { insumoId: "prensacables_kit", modo: "fijo", valor: 2 },
    { insumoId: "placa_identificacion", modo: "fijo", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 15 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 15 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 20 },
  ],
  [claveServicio("LINEA DE VIDA CAMIONERA (SISTEMA COMPLETO)")]: [
    { insumoId: "poste_cuello_cisne", modo: "fijo", valor: 2 },
    { insumoId: "dado_concreto", modo: "fijo", valor: 2 },
    { insumoId: "cable_acero_38", modo: "fijo", valor: 20 },
    { insumoId: "tensor_forjado", modo: "fijo", valor: 2 },
    { insumoId: "absorbedor_energia", modo: "fijo", valor: 2 },
    { insumoId: "prensacables_kit", modo: "fijo", valor: 2 },
    { insumoId: "carro_camionera", modo: "fijo", valor: 1 },
    { insumoId: "autorretractil", modo: "fijo", valor: 1 },
    { insumoId: "varilla_roscada", modo: "fijo", valor: 16 },
    { insumoId: "pintura_anticorrosiva", modo: "fijo", valor: 2 },
    { insumoId: "placa_identificacion", modo: "fijo", valor: 1 },
    { insumoId: "fabricacion_taller", modo: "fijo", valor: 5 },
    { insumoId: "memoria_calculo", modo: "fijo", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "fijo", valor: 10 },
    { insumoId: "auxiliar_alturas", modo: "fijo", valor: 10 },
    { insumoId: "coordinador_sst", modo: "fijo", valor: 6 },
    { insumoId: "alquiler_grua_manlift", modo: "fijo", valor: 2 },
    { insumoId: "polizas_certificacion", modo: "fijo", valor: 1 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 6 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 5 },
  ],
  [claveServicio("CARRO DESLIZANTE PARA LINEA DE VIDA CAMIONERA")]: [
    { insumoId: "carro_camionera", modo: "por_unidad", valor: 1 },
  ],
  [claveServicio("LINEA AUTORRETRACTIL PARA LINEA DE VIDA CAMIONERA")]: [
    { insumoId: "autorretractil", modo: "por_unidad", valor: 1 },
  ],
  [claveServicio("DISEÑO Y MEMORIA DE CALCULO DE LINEA DE VIDA CAMIONERA")]: [
    { insumoId: "memoria_calculo", modo: "por_unidad", valor: 1 },
  ],
  [claveServicio("CERTIFICACION DE LINEA DE VIDA CAMIONERA")]: [
    { insumoId: "placa_identificacion", modo: "fijo", valor: 1 },
    { insumoId: "memoria_calculo", modo: "fijo", valor: 1 },
    { insumoId: "coordinador_sst", modo: "fijo", valor: 1 },
  ],
  [claveServicio("BARANDILLA DE PROTECCION EN CABLE")]: [
    { insumoId: "cable_acero_516", modo: "por_unidad", valor: 2.2 },
    { insumoId: "soporte_intermedio", modo: "cada_n", valor: 3 },
    { insumoId: "tensor_forjado", modo: "fijo", valor: 2 },
    { insumoId: "prensacables_kit", modo: "fijo", valor: 2 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 12 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 12 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 15 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("PASARELA DE SEGURIDAD EN CUBIERTA")]: [
    { insumoId: "pasarela_rejilla", modo: "por_unidad", valor: 1 },
    { insumoId: "varilla_roscada", modo: "por_unidad", valor: 2 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 8 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 8 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 10 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("SISTEMA ANTICAIDA CUBIERTA (COMPLETO)")]: [
    { insumoId: "cable_acero_516", modo: "por_unidad", valor: 35 },
    { insumoId: "poste_terminal", modo: "por_unidad", valor: 4 },
    { insumoId: "soporte_intermedio", modo: "por_unidad", valor: 4 },
    { insumoId: "tensor_forjado", modo: "por_unidad", valor: 2 },
    { insumoId: "absorbedor_energia", modo: "por_unidad", valor: 2 },
    { insumoId: "prensacables_kit", modo: "por_unidad", valor: 2 },
    { insumoId: "cartucho_epoxico", modo: "por_unidad", valor: 3 },
    { insumoId: "placa_identificacion", modo: "por_unidad", valor: 2 },
    { insumoId: "tecnico_alturas", modo: "por_unidad", valor: 3 },
    { insumoId: "auxiliar_alturas", modo: "por_unidad", valor: 3 },
    { insumoId: "coordinador_sst", modo: "por_unidad", valor: 2 },
    { insumoId: "transporte_obra", modo: "por_unidad", valor: 2 },
    { insumoId: "consumibles_instalacion", modo: "por_unidad", valor: 2 },
  ],
  [claveServicio("ESTRUCTURA METÁLICA CON PLATAFORMA PARA AIRES ACONDICIONADOS")]: [
    { insumoId: "acero_estructural", modo: "por_unidad", valor: 240 },
    { insumoId: "varilla_roscada", modo: "por_unidad", valor: 8 },
    { insumoId: "cartucho_epoxico", modo: "por_unidad", valor: 1 },
    { insumoId: "pintura_anticorrosiva", modo: "por_unidad", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "por_unidad", valor: 3 },
    { insumoId: "auxiliar_alturas", modo: "por_unidad", valor: 3 },
    { insumoId: "coordinador_sst", modo: "por_unidad", valor: 2 },
    { insumoId: "memoria_calculo", modo: "fijo", valor: 1 },
    { insumoId: "transporte_obra", modo: "cada_n", valor: 2 },
    { insumoId: "consumibles_instalacion", modo: "por_unidad", valor: 2 },
  ],
  [claveServicio("PLATAFORMA METÁLICA ESTRUCTURAL")]: [
    { insumoId: "acero_estructural", modo: "por_unidad", valor: 200 },
    { insumoId: "varilla_roscada", modo: "por_unidad", valor: 8 },
    { insumoId: "cartucho_epoxico", modo: "por_unidad", valor: 1 },
    { insumoId: "pintura_anticorrosiva", modo: "por_unidad", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "por_unidad", valor: 2.5 },
    { insumoId: "auxiliar_alturas", modo: "por_unidad", valor: 2.5 },
    { insumoId: "coordinador_sst", modo: "por_unidad", valor: 1.5 },
    { insumoId: "transporte_obra", modo: "cada_n", valor: 2 },
    { insumoId: "consumibles_instalacion", modo: "por_unidad", valor: 2 },
  ],
  [claveServicio("FABRICACION Y MONTAJE DE ESTRUCTURA METALICA")]: [
    { insumoId: "acero_estructural", modo: "por_unidad", valor: 1.08 },
    { insumoId: "pintura_anticorrosiva", modo: "cada_n", valor: 120 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 150 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 150 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 250 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
    { insumoId: "consumibles_instalacion", modo: "cada_n", valor: 200 },
  ],
  [claveServicio("SOPORTE METALICO EN PERFIL ESTRUCTURAL")]: [
    { insumoId: "acero_estructural", modo: "por_unidad", valor: 14 },
    { insumoId: "pintura_anticorrosiva", modo: "cada_n", valor: 10 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 6 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("PUNTO DE ANCLAJE EMPOTRADO EN OBRA BLANCA")]: [
    { insumoId: "punto_anclaje_epoxico", modo: "por_unidad", valor: 1 },
    { insumoId: "platina_base", modo: "por_unidad", valor: 1 },
    { insumoId: "cartucho_epoxico", modo: "cada_n", valor: 4 },
    { insumoId: "kit_resane_civil", modo: "por_unidad", valor: 1 },
    { insumoId: "placa_identificacion", modo: "por_unidad", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 4 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 6 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
  ],
  [claveServicio("PLATINA EMPOTRADA PARA SISTEMA ANTICAIDAS")]: [
    { insumoId: "platina_base", modo: "por_unidad", valor: 1 },
    { insumoId: "varilla_roscada", modo: "por_unidad", valor: 4 },
    { insumoId: "cartucho_epoxico", modo: "cada_n", valor: 3 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 5 },
    { insumoId: "consumibles_instalacion", modo: "fijo", valor: 1 },
  ],
  [claveServicio("RESANE Y ACABADO EN PUNTOS DE INSTALACION")]: [
    { insumoId: "kit_resane_civil", modo: "por_unidad", valor: 1 },
    { insumoId: "auxiliar_alturas", modo: "cada_n", valor: 6 },
  ],
  [claveServicio("ACOMPAÑAMIENTO TECNICO EN OBRA BLANCA")]: [
    { insumoId: "tecnico_alturas", modo: "por_unidad", valor: 1 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
  ],
  [claveServicio("CERTIFICACION SISTEMA ANTICAIDA")]: [
    { insumoId: "placa_identificacion", modo: "fijo", valor: 2 },
    { insumoId: "memoria_calculo", modo: "fijo", valor: 1 },
    { insumoId: "coordinador_sst", modo: "fijo", valor: 1 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
  ],
  [claveServicio("RECERTIFICACION ANUAL")]: [
    { insumoId: "placa_identificacion", modo: "por_unidad", valor: 1 },
    { insumoId: "tecnico_alturas", modo: "cada_n", valor: 2 },
    { insumoId: "coordinador_sst", modo: "cada_n", valor: 2 },
    { insumoId: "transporte_obra", modo: "cada_n", valor: 2 },
  ],
  [claveServicio("INSPECCION Y DIAGNOSTICO")]: [
    { insumoId: "tecnico_alturas", modo: "fijo", valor: 1 },
    { insumoId: "transporte_obra", modo: "fijo", valor: 1 },
  ],
  [claveServicio("COORDINADOR SST EN OBRA")]: [
    { insumoId: "coordinador_sst", modo: "por_unidad", valor: 1 },
  ],
};

function clonarInsumosDefault() {
  return INSUMOS_DEFAULT.map((ins) => ({ ...ins }));
}

function clonarRecetasDefault() {
  const out = {};
  for (const [k, reglas] of Object.entries(RECETAS_DEFAULT)) {
    out[k] = reglas.map((r) => ({ ...r }));
  }
  return out;
}

function normalizarInsumo(raw = {}, fallbackIndex = 0) {
  const id = String(raw.id || `ins_${fallbackIndex + 1}`).trim();
  const categoria = CATEGORIAS_INSUMO.some((c) => c.id === raw.categoria)
    ? raw.categoria
    : "material";
  return {
    id,
    nombre: String(raw.nombre || "").trim() || "Insumo sin nombre",
    categoria,
    unidad: String(raw.unidad || "Und").trim() || "Und",
    costoUnitario: Math.max(0, Math.round(Number(raw.costoUnitario) || 0)),
  };
}

function normalizarReglaReceta(raw = {}) {
  const modo = MODOS_RECETA.some((m) => m.id === raw.modo) ? raw.modo : "por_unidad";
  const valor = Math.max(0, Number(raw.valor) || 0);
  return {
    insumoId: String(raw.insumoId || "").trim(),
    modo,
    valor,
  };
}

// Gastos indirectos de la empresa, como porcentaje del ingreso sin IVA. Sin
// configurar es 0: no se inventa un gasto que nadie ha medido.
function normalizarIndirectosPct(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.max(0, Math.min(60, n)) : 0;
}

function normalizarTecnicosPorCuadrilla(valor) {
  const n = Math.round(Number(valor));
  return Number.isFinite(n) && n >= 1 ? Math.min(10, n) : TECNICOS_POR_CUADRILLA_DEFAULT;
}

/**
 * Lee la configuración de insumos y recetas (APU) desde `empresaConfig`.
 * Si todavía no se ha personalizado, entrega el catálogo base listo para usar.
 */
export function obtenerConfigCostos(empresaConfig) {
  const lista = Array.isArray(empresaConfig) ? empresaConfig : [];
  const fila = lista.find((r) => r?.id === ID_CONFIG_COSTOS_APU);
  const doc = fila?.controlDocumental && typeof fila.controlDocumental === "object"
    ? fila.controlDocumental
    : null;

  if (!doc || doc.tipo !== ID_CONFIG_COSTOS_APU) {
    return {
      insumos: clonarInsumosDefault(),
      recetas: clonarRecetasDefault(),
      margenMinimoPct: MARGEN_MINIMO_DEFAULT,
      indirectosPct: 0,
      tecnicosPorCuadrilla: TECNICOS_POR_CUADRILLA_DEFAULT,
      personalizada: false,
    };
  }

  const insumos = Array.isArray(doc.insumos) && doc.insumos.length > 0
    ? doc.insumos.map((item, idx) => normalizarInsumo(item, idx))
    : clonarInsumosDefault();

  const recetas = {};
  if (doc.recetas && typeof doc.recetas === "object") {
    for (const [k, reglas] of Object.entries(doc.recetas)) {
      const clave = claveServicio(k);
      if (!clave || !Array.isArray(reglas)) continue;
      recetas[clave] = reglas
        .map(normalizarReglaReceta)
        .filter((r) => r.insumoId && r.valor > 0);
    }
  } else {
    Object.assign(recetas, clonarRecetasDefault());
  }

  const margenMinimoPct = Number.isFinite(Number(doc.margenMinimoPct))
    ? Math.max(1, Math.min(90, Number(doc.margenMinimoPct)))
    : MARGEN_MINIMO_DEFAULT;

  return {
    insumos,
    recetas,
    margenMinimoPct,
    indirectosPct: normalizarIndirectosPct(doc.indirectosPct),
    tecnicosPorCuadrilla: normalizarTecnicosPorCuadrilla(doc.tecnicosPorCuadrilla),
    personalizada: true,
    actualizadoEn: doc.actualizadoEn || null,
  };
}

/**
 * Devuelve un nuevo arreglo `empresaConfig` con la configuración APU guardada
 * en la fila `costos_apu`, sin modificar `empresa` ni `firma_coord:*`.
 */
export function guardarConfigCostos(empresaConfig, nuevaConfig = {}) {
  const lista = Array.isArray(empresaConfig) ? empresaConfig : [];
  const actual = obtenerConfigCostos(lista);

  const insumos = Array.isArray(nuevaConfig.insumos)
    ? nuevaConfig.insumos.map((item, idx) => normalizarInsumo(item, idx))
    : actual.insumos;

  const recetasLimpias = {};
  const fuenteRecetas = nuevaConfig.recetas && typeof nuevaConfig.recetas === "object"
    ? nuevaConfig.recetas
    : actual.recetas;
  for (const [k, reglas] of Object.entries(fuenteRecetas)) {
    const clave = claveServicio(k);
    if (!clave || !Array.isArray(reglas)) continue;
    recetasLimpias[clave] = reglas
      .map(normalizarReglaReceta)
      .filter((r) => r.insumoId && r.valor > 0);
  }

  const margenMinimoPct = Number.isFinite(Number(nuevaConfig.margenMinimoPct))
    ? Math.max(1, Math.min(90, Number(nuevaConfig.margenMinimoPct)))
    : actual.margenMinimoPct;
  const indirectosPct = nuevaConfig.indirectosPct !== undefined
    ? normalizarIndirectosPct(nuevaConfig.indirectosPct)
    : actual.indirectosPct;
  const tecnicosPorCuadrilla = nuevaConfig.tecnicosPorCuadrilla !== undefined
    ? normalizarTecnicosPorCuadrilla(nuevaConfig.tecnicosPorCuadrilla)
    : actual.tecnicosPorCuadrilla;

  const filaNueva = {
    id: ID_CONFIG_COSTOS_APU,
    firmaImg: "",
    firmaNombre: "",
    firmaCargo: "",
    controlDocumental: {
      tipo: ID_CONFIG_COSTOS_APU,
      version: 1,
      margenMinimoPct,
      indirectosPct,
      tecnicosPorCuadrilla,
      insumos,
      recetas: recetasLimpias,
      actualizadoEn: new Date().toISOString(),
    },
  };

  const existe = lista.some((r) => r?.id === ID_CONFIG_COSTOS_APU);
  return existe
    ? lista.map((r) => (r?.id === ID_CONFIG_COSTOS_APU ? filaNueva : r))
    : [...lista, filaNueva];
}

const CLAVE_RECERT_ANUAL = claveServicio("RECERTIFICACION ANUAL");

// Servicios genéricos cobrados como "1 Global" con receta base fija. Si el ítem
// trae detalles adicionales (ej. "RECERTIFICACIÓN ANUAL L.V.H-L.V.V") o un valor
// muy superior a la tarifa base de 1 sistema, se marca para análisis automático
// con IA en lugar de repetir siempre el mismo costo fijo ($555.000).
const RECETAS_GLOBALES_GENERICAS = {
  [CLAVE_RECERT_ANUAL]: 1200000,
  [claveServicio("CERTIFICACION SISTEMA ANTICAIDA")]: 2500000,
  [claveServicio("INSPECCION Y DIAGNOSTICO")]: 900000,
};

const RECETAS_LINEALES = new Set([
  claveServicio("LINEA DE VIDA HORIZONTAL"),
  claveServicio("LINEA DE VIDA CONEXION / TRANSVERSAL"),
  claveServicio("LINEA DE VIDA VERTICAL"),
  claveServicio("RECERTIFICACION LINEA DE VIDA"),
  claveServicio("ESCALERA FIJA CON LINEA DE VIDA VERTICAL"),
  claveServicio("ESCALERA TIPO GATO CON LINEA DE VIDA VERTICAL"),
  claveServicio("ESCALERA TIPO GATO"),
  claveServicio("ESCALERA MARINERA"),
  claveServicio("BARANDILLA DE PROTECCION EN CABLE"),
  claveServicio("PASARELA DE SEGURIDAD EN CUBIERTA"),
  claveServicio("FABRICACION Y MONTAJE DE ESTRUCTURA METALICA"),
]);

/**
 * Busca la receta APU que mejor corresponde a la descripción de un ítem cotizado.
 * Devuelve `{ clave, reglas }` o `null` si es un trabajo a medida / reforma sin receta.
 */
export function buscarRecetaDeServicio(descripcion = "", recetas = {}) {
  const clave = claveServicio(descripcion);
  if (!clave || !recetas || typeof recetas !== "object") return null;

  // 1. Coincidencia exacta
  if (Array.isArray(recetas[clave]) && recetas[clave].length > 0) {
    return { clave, reglas: recetas[clave] };
  }

  // Si la descripción corresponde a una obra/suministro/instalación/reforma nueva,
  // no debe caer accidentalmente en la receta genérica de "RECERTIFICACION ANUAL"
  // solo porque mencione la palabra "recertificación" dentro del texto.
  const esObraNueva = /\b(?:SUMINISTRO|INSTALACION|FABRICACION|MONTAJE|ESTRUCTURA|CUBIERTA|TEJA|PANEL|REFORMA)\b/.test(clave);

  // 2. Coincidencia por inclusión (prefiriendo la clave más específica / larga)
  const clavesOrdenadas = Object.keys(recetas)
    .filter((k) => Array.isArray(recetas[k]) && recetas[k].length > 0)
    .sort((a, b) => b.length - a.length);

  for (const k of clavesOrdenadas) {
    if (k === CLAVE_RECERT_ANUAL && esObraNueva) continue;
    if (clave.includes(k)) {
      return { clave: k, reglas: recetas[k] };
    }
  }

  // 3. Sinónimos frecuentes del día a día de Ingeanclajes
  const alias = [
    { test: /\bLINEA(?:S)?\s+DE\s+VIDA\s+HORIZONTAL(?:ES)?\b|\bLVH\b/, target: claveServicio("LINEA DE VIDA HORIZONTAL"), soloSinRecert: true },
    { test: /\bLINEA(?:S)?\s+DE\s+VIDA\s+VERTICAL(?:ES)?\b|\bLVV\b/, target: claveServicio("LINEA DE VIDA VERTICAL"), soloSinRecert: true },
    { test: /\bLINEA(?:S)?\s+DE\s+VIDA\s+CAMIONER/, target: claveServicio("LINEA DE VIDA CAMIONERA EN CABLE DE ACERO GALVANIZADO") },
    { test: /\bRECERTIFICACION(?:ES)?\b.*\bLINEA(?:S)?\b/, target: claveServicio("RECERTIFICACION LINEA DE VIDA") },
    { test: /\bANCLAJE\s+ARTICO\b.*\bINOX/, target: claveServicio("ANCLAJE ARTICO ACERO INOXIDABLE") },
    { test: /\bANCLAJE\s+ARTICO\b/, target: claveServicio("ANCLAJE ARTICO ACERO GALVANIZADO") },
    { test: /\bPUNTO(?:S)?\s+DE\s+ANCLAJE\b.*\bSOLDAD/, target: claveServicio("PUNTO DE ANCLAJE SOLDADO") },
    { test: /\bPUNTO(?:S)?\s+DE\s+ANCLAJE\b.*\bFACHAD/, target: claveServicio("PUNTO DE ANCLAJE EN FACHADA") },
    { test: /\bPUNTO(?:S)?\s+DE\s+ANCLAJE\b|\bANCLAJE\s+(?:EPOXICO|QUIMICO|CERTIFICADO)\b/, target: claveServicio("PUNTO DE ANCLAJE EPOXICO") },
    { test: /\bESCALERA\b.*\bVERTICAL\b/, target: claveServicio("ESCALERA FIJA CON LINEA DE VIDA VERTICAL") },
    { test: /\bESCALERA\s+TIPO\s+GATO\b/, target: claveServicio("ESCALERA TIPO GATO") },
    { test: /\bESCALERA\s+MARINERA\b/, target: claveServicio("ESCALERA MARINERA") },
    { test: /\bCAMINADER|\bPASAREL/, target: claveServicio("PASARELA DE SEGURIDAD EN CUBIERTA") },
    { test: /\bBARANDILL|\bBARANDA\b.*\bCABLE\b/, target: claveServicio("BARANDILLA DE PROTECCION EN CABLE") },
    { test: /\bCOORDINADOR\s+(?:SST|DE\s+ALTURAS)\b/, target: claveServicio("COORDINADOR SST EN OBRA") },
    { test: /\bRECERTIFICACION(?:ES)?\b/, target: CLAVE_RECERT_ANUAL, soloSinObraNueva: true },
    { test: /\bCERTIFICACION\b.*\bANTICAIDA/, target: claveServicio("CERTIFICACION SISTEMA ANTICAIDA") },
  ];

  const mencionaRecert = /\bRECERTIFICACION(?:ES)?\b/.test(clave);
  for (const { test, target, soloSinRecert, soloSinObraNueva } of alias) {
    if (soloSinRecert && mencionaRecert) continue;
    if (soloSinObraNueva && esObraNueva) continue;
    if (test.test(clave) && Array.isArray(recetas[target]) && recetas[target].length > 0) {
      return { clave: target, reglas: recetas[target] };
    }
  }

  return null;
}

function redondearCantidad(cant, unidad = "") {
  const n = Math.max(0, Number(cant) || 0);
  const u = String(unidad || "").toLowerCase();
  const esEntera = ["und", "u", "unidad", "unidades", "día", "dia", "días", "dias", "viaje", "viajes", "kit", "kits", "global", "glb"].includes(u);
  if (esEntera) return Math.ceil(n - 1e-9);
  return Math.round(n * 10) / 10;
}

function evaluarRegla(regla, cantItem) {
  const c = Math.max(0, Number(cantItem) || 0);
  if (c <= 0) return 0;
  const val = Math.max(0, Number(regla?.valor) || 0);
  if (val <= 0) return 0;
  if (regla.modo === "fijo") return val;
  if (regla.modo === "cada_n") return Math.ceil(c / val);
  return c * val;
}

/** Huella estable de los ítems cotizados para avisar si cambiaron tras un ajuste manual/IA. */
export function huellaItemsPropuesta(items = []) {
  const lista = Array.isArray(items) ? items : [];
  return JSON.stringify(
    lista
      .filter((it) => it && (String(it.desc || "").trim() || Number(it.cant || 0) > 0))
      .map((it) => [claveServicio(it.desc || ""), Number(it.cant) || 0, String(it.unit || "").toUpperCase()])
  );
}

/**
 * Calcula las líneas de materiales, mano de obra y transporte a partir de
 * las recetas (APU) fijas configuradas. Consolida insumos repetidos entre ítems
 * y separa los ítems a medida / reformas que no tienen receta.
 */
export function calcularLineasDesdeRecetas(items = [], configCostos = null) {
  const cfg = configCostos || obtenerConfigCostos([]);
  const mapaInsumos = new Map((cfg.insumos || []).map((ins) => [ins.id, ins]));
  const acumulados = new Map();
  const itemsConReceta = [];
  const itemsSinReceta = [];
  const itemsGenericosGlobales = [];

  const listaItems = Array.isArray(items) ? items : [];
  // Detecta si la propuesta ya desglosa postes / dados de cimentación camioneros aparte.
  // Si NO los desglosa y se cotiza una "Línea de vida camionera" integral (valor alto o Global),
  // se aplica la receta completa del sistema camionero (postes + dados + cable + carro + SRL).
  const hayPosteCamioneraAparte = listaItems.some((it) => {
    const k = claveServicio(it?.desc || "");
    return /\bPOSTE\b.*\bCISNE\b|\bPEDESTAL\b|\bDADO\b.*\bCIMENTACION\b/.test(k);
  });
  const claveCamioneraCompleta = claveServicio("LINEA DE VIDA CAMIONERA (SISTEMA COMPLETO)");

  for (const item of listaItems) {
    const desc = String(item?.desc || "").trim();
    const cant = Math.max(0, Number(item?.cant) || 0);
    if (!desc || cant <= 0) continue;

    const claveItem = claveServicio(desc);
    const vu = Math.max(0, Number(item?.vu) || 0);
    const subtotalItem = cant * vu;
    const unitNorm = String(item?.unit || "").trim();
    const esUnitGlobal = /^(GLOBAL|GLB)$/i.test(unitNorm);
    const esCamioneraIntegral =
      !hayPosteCamioneraAparte &&
      /\bLINEA\s+DE\s+VIDA\s+CAMIONER/.test(claveItem) &&
      (vu >= 5000000 ||
        (cant <= 2 && /^(GLOBAL|GLB|UND|UN|SISTEMA)$/i.test(unitNorm)));

    let match = null;
    if (esCamioneraIntegral) {
      const reglasCam = cfg.recetas?.[claveCamioneraCompleta] || RECETAS_DEFAULT[claveCamioneraCompleta];
      if (Array.isArray(reglasCam) && reglasCam.length > 0) {
        match = { clave: claveCamioneraCompleta, reglas: reglasCam };
      }
    }
    if (!match) {
      match = buscarRecetaDeServicio(desc, cfg.recetas);
    }

    if (!match) {
      itemsSinReceta.push({
        id: item.id,
        desc,
        cant,
        unit: item.unit || "Und",
        vu,
      });
      continue;
    }

    // Detecta cuando un ítem cayó en una receta genérica/global (ej. "RECERTIFICACION ANUAL"
    // de $555.000 fijos) pero en realidad trae alcance extra ("L.V.H-L.V.V", varios sistemas,
    // valor alto > $1.2M), o es una receta por ML cotizada como "1 Global", o un sistema
    // especial (TPO / Latchways / ManSafe / Inox 316). Estos requieren análisis automático IA.
    const umbralGlobal = RECETAS_GLOBALES_GENERICAS[match.clave];
    const esGlobalGenericoConAlcanceExtra = Boolean(
      umbralGlobal &&
      (
        (claveItem !== match.clave && claveItem.length > match.clave.length + 2) ||
        (cant <= 2 && subtotalItem >= umbralGlobal)
      )
    );
    const esLinealCotizadoComoGlobal = Boolean(
      RECETAS_LINEALES.has(match.clave) &&
      esUnitGlobal &&
      cant <= 2 &&
      subtotalItem >= 1500000
    );
    const esSistemaEspecialEnDesc = /\bTPO\b|LATCHWAYS|CONSTANT\s+FORCE|MAN\s*SAFE|ACERO\s+INOXIDABLE\s+316/.test(claveItem);

    if (esGlobalGenericoConAlcanceExtra || esLinealCotizadoComoGlobal || esSistemaEspecialEnDesc) {
      itemsGenericosGlobales.push({
        id: item.id,
        desc,
        cant,
        unit: item.unit || "Und",
        vu,
        recetaClave: match.clave,
      });
    }

    itemsConReceta.push({
      id: item.id,
      desc,
      cant,
      unit: item.unit || "Und",
      recetaClave: match.clave,
    });

    for (const regla of match.reglas) {
      const ins = mapaInsumos.get(regla.insumoId);
      if (!ins) continue;
      const cantRegla = evaluarRegla(regla, cant);
      if (cantRegla <= 0) continue;

      // Las jornadas, los viajes y los consumibles son de la OBRA, no de cada
      // renglon: se juntan antes de redondear. Renglon por renglon, una linea
      // de vida medida en diez tramos de 12 ML daba diez jornadas de tecnico y
      // diez viajes; los mismos 120 ML en un renglon, ocho jornadas y un viaje.
      // - «1 por cada N»: suma la fraccion y se redondea una sola vez al final.
      // - «fijo»: es el mismo viaje o la misma jornada para todos los renglones
      //   que lo piden, asi que cuenta el mayor, no la suma.
      // Los materiales no cambian: dos postes terminales por linea son dos por
      // cada linea.
      const esDeLaObra = ins.categoria !== "material";
      let aporte = cantRegla;
      let fijo = 0;
      if (esDeLaObra && regla.modo === "cada_n") aporte = cant / regla.valor;
      else if (esDeLaObra && regla.modo === "fijo") { aporte = 0; fijo = cantRegla; }

      const existente = acumulados.get(ins.id);
      const etiquetaOrigen = `${desc} (${cant} ${item.unit || ""})`.trim();
      if (existente) {
        existente.cantBruta += aporte;
        existente.fijoMayor = Math.max(existente.fijoMayor, fijo);
        if (!existente.origenes.includes(etiquetaOrigen)) {
          existente.origenes.push(etiquetaOrigen);
        }
      } else {
        acumulados.set(ins.id, {
          id: `rec-${ins.id}`,
          insumoId: ins.id,
          nombre: ins.nombre,
          categoria: ins.categoria,
          unidad: ins.unidad,
          cantBruta: aporte,
          fijoMayor: fijo,
          costoUnitario: ins.costoUnitario,
          origen: "receta",
          origenes: [etiquetaOrigen],
        });
      }
    }
  }

  const ordenCat = Object.fromEntries(CATEGORIAS_INSUMO.map((c) => [c.id, c.orden]));
  const lineas = [...acumulados.values()]
    .map((linea) => {
      const cant = redondearCantidad(linea.cantBruta + linea.fijoMayor, linea.unidad);
      return {
        id: linea.id,
        insumoId: linea.insumoId,
        nombre: linea.nombre,
        categoria: linea.categoria,
        unidad: linea.unidad,
        cant,
        costoUnitario: linea.costoUnitario,
        subtotal: Math.round(cant * linea.costoUnitario),
        origen: linea.origen,
        nota: linea.origenes.join(" · "),
      };
    })
    .filter((l) => l.cant > 0)
    .sort((a, b) => (ordenCat[a.categoria] || 9) - (ordenCat[b.categoria] || 9));

  // El viaje y el kit de consumibles que piden las recetas son los de UN dia
  // de obra. Una obra de varias semanas necesita uno por cada dia que la
  // cuadrilla esta en sitio: con un solo viaje, una obra de 29 jornadas de
  // tecnico salia con $ 140.000 de transporte.
  // Dias de obra = jornadas de tecnico / tecnicos de la cuadrilla.
  const tecnicosPorCuadrilla = cfg.tecnicosPorCuadrilla ?? TECNICOS_POR_CUADRILLA_DEFAULT;
  const jornadasTecnico = lineas.find((l) => l.insumoId === "tecnico_alturas")?.cant || 0;
  const diasDeObra = Math.ceil(jornadasTecnico / tecnicosPorCuadrilla - 1e-9);
  if (diasDeObra > 1) {
    for (const linea of lineas) {
      if (!INSUMOS_POR_DIA_DE_OBRA.includes(linea.insumoId) || linea.cant >= diasDeObra) continue;
      linea.cant = diasDeObra;
      linea.subtotal = Math.round(diasDeObra * linea.costoUnitario);
      linea.nota = `${diasDeObra} días de obra (${jornadasTecnico} jornadas de técnico ÷ ${tecnicosPorCuadrilla} por cuadrilla)`;
    }
  }

  return { lineas, itemsConReceta, itemsSinReceta, itemsGenericosGlobales, diasDeObra };
}

/**
 * Calcula el costo unitario de referencia y margen de un servicio del catálogo.
 * Para unidades lineales (ML / Metro) usa una corrida típica de 15 m para
 * prorratear los fijos (postes terminales, absorbedor, transporte) de forma realista.
 */
export function calcularCostoUnitarioServicio(servicio = {}, configCostos = null) {
  const cfg = configCostos || obtenerConfigCostos([]);
  const desc = servicio.descripcion || servicio.desc || "";
  const unit = String(servicio.unidad || servicio.unit || "Und").trim();
  const precio = Math.max(0, Number(servicio.precioBase ?? servicio.vu) || 0);
  const match = buscarRecetaDeServicio(desc, cfg.recetas);
  if (!match) {
    return { tieneReceta: false, costoUnitario: 0, margenPct: null, cantReferencia: 1, claveReceta: null };
  }

  const uLower = unit.toLowerCase();
  const cantReferencia = uLower === "ml" || uLower === "metro"
    ? 15
    : uLower === "kg"
    ? 100
    : 1;

  const { lineas } = calcularLineasDesdeRecetas([{ desc, cant: cantReferencia, unit, vu: precio }], cfg);
  const costoTotalRef = lineas.reduce((s, l) => s + l.subtotal, 0);
  const costoUnitario = Math.round(costoTotalRef / cantReferencia);
  const margenPct = precio > 0 ? Number((((precio - costoUnitario) / precio) * 100).toFixed(1)) : null;

  return {
    tieneReceta: true,
    costoUnitario,
    margenPct,
    cantReferencia,
    claveReceta: match.clave,
  };
}

function normalizarLineaGuardada(raw = {}, index = 0) {
  const cant = Math.max(0, Number(raw.cant) || 0);
  const costoUnitario = Math.max(0, Math.round(Number(raw.costoUnitario) || 0));
  const categoria = CATEGORIAS_INSUMO.some((c) => c.id === raw.categoria) ? raw.categoria : "material";
  return {
    id: String(raw.id || `cos-${index + 1}`),
    insumoId: raw.insumoId ? String(raw.insumoId) : null,
    nombre: String(raw.nombre || "").trim() || "Insumo",
    categoria,
    unidad: String(raw.unidad || "Und").trim() || "Und",
    cant,
    costoUnitario,
    subtotal: Math.round(cant * costoUnitario),
    origen: raw.origen || "manual",
    nota: String(raw.nota || "").trim(),
    // El costo se saco del precio de venta, no de una compra: el panel lo
    // marca y deja de contar cuando alguien escribe el costo real.
    ...(raw.costoDesdePrecio ? { costoDesdePrecio: true } : {}),
  };
}

/**
 * Calcula el resumen completo de costos, materiales y rentabilidad para una propuesta.
 * Combina recetas automáticas con cualquier ajuste manual o estimación con IA guardada
 * en `propuesta.costeoInterno`.
 */
export function calcularCosteoPropuesta(propuesta = {}, configCostos = null) {
  const cfg = configCostos || obtenerConfigCostos([]);
  const items = Array.isArray(propuesta?.items) ? propuesta.items : [];
  const sinAiu = Boolean(propuesta?.sinAiu ?? propuesta?.ivaPleno ?? false);
  const utilPct = porcentajeUtilidad(propuesta?.util);

  // La misma cuenta que usan el editor, el guardado y el PDF.
  const { sub: ventaSubtotal, ut: ventaUtilidad, iva: ventaIva } = calcularTotales(items, utilPct, sinAiu);
  const ventaTotal = Math.round(ventaSubtotal + ventaUtilidad + ventaIva);
  // Ingreso real antes de IVA (coincide con `baseIngresoContable` de cotizaciones.js)
  const ingresoNeto = Math.round(ventaSubtotal + ventaUtilidad);

  const auto = calcularLineasDesdeRecetas(items, cfg);
  const huellaActual = huellaItemsPropuesta(items);

  const guardado = propuesta?.costeoInterno && typeof propuesta.costeoInterno === "object"
    ? propuesta.costeoInterno
    : null;
  const usaPersonalizado = Boolean(
    guardado &&
    (guardado.modo === "personalizado" || guardado.modo === "ia") &&
    Array.isArray(guardado.lineas)
  );

  const lineas = usaPersonalizado
    ? guardado.lineas.map((l, idx) => normalizarLineaGuardada(l, idx))
    : auto.lineas;

  const costoMateriales = lineas
    .filter((l) => l.categoria === "material")
    .reduce((s, l) => s + l.subtotal, 0);
  const costoManoObra = lineas
    .filter((l) => l.categoria === "mano_obra")
    .reduce((s, l) => s + l.subtotal, 0);
  const costoLogistica = lineas
    .filter((l) => l.categoria === "logistica")
    .reduce((s, l) => s + l.subtotal, 0);
  const costoTotal = costoMateriales + costoManoObra + costoLogistica;

  const pct = (valor) => (ingresoNeto > 0 ? Number(((valor / ingresoNeto) * 100).toFixed(1)) : 0);

  // Utilidad bruta: lo que queda despues de materiales, mano de obra y
  // transporte. Todavia no es ganancia: de ahi salen los gastos fijos de la
  // empresa (arriendo, administracion, impuestos, garantias). Ese porcentaje
  // se configura en «Insumos y costos»; en 0, bruta y neta coinciden.
  const utilidadBruta = Math.round(ingresoNeto - costoTotal);
  const margenBrutoPct = pct(utilidadBruta);
  const indirectosPct = cfg.indirectosPct ?? 0;
  const costoIndirectos = Math.round((ingresoNeto * indirectosPct) / 100);
  const gananciaNeta = utilidadBruta - costoIndirectos;
  const margenPct = pct(gananciaNeta);
  const margenMinimoPct = cfg.margenMinimoPct ?? MARGEN_MINIMO_DEFAULT;

  // Un margen solo dice algo si el costo es de verdad. No lo es cuando hay
  // renglones vendidos que todavia no tienen costo (sin receta y sin estimar)
  // o lineas cuyo costo se saco del propio precio de venta: esas dan siempre
  // el mismo margen, se cobre lo que se cobre.
  const lineasDesdePrecio = lineas.filter((l) => l.costoDesdePrecio);
  const itemsSinCosto = usaPersonalizado ? [] : auto.itemsSinReceta;
  const margenConfiable = lineasDesdePrecio.length === 0 && itemsSinCosto.length === 0;

  let estadoMargen = "optimo";
  if (ingresoNeto <= 0) {
    estadoMargen = "sin_venta";
  } else if (gananciaNeta < 0) {
    estadoMargen = "perdida";
  } else if (margenPct < 15) {
    estadoMargen = "critico";
  } else if (!margenConfiable) {
    // Con costo incompleto el margen real solo puede ser menor: no se pinta
    // de verde algo que no se ha comprobado.
    estadoMargen = "sin_confirmar";
  } else if (margenPct < margenMinimoPct) {
    estadoMargen = "ajustado";
  }

  const itemsCambiaron = Boolean(
    usaPersonalizado &&
    guardado?.huellaItems &&
    guardado.huellaItems !== huellaActual
  );

  const itemsGenericosGlobales = Array.isArray(auto.itemsGenericosGlobales) ? auto.itemsGenericosGlobales : [];
  const requiereIaAuto = Boolean(
    auto.itemsSinReceta.length > 0 || itemsGenericosGlobales.length > 0
  );

  return {
    modo: usaPersonalizado ? guardado.modo : "auto",
    lineas,
    itemsConReceta: auto.itemsConReceta,
    itemsSinReceta: auto.itemsSinReceta,
    itemsGenericosGlobales,
    requiereIaAuto,
    itemsCambiaron,
    huellaActual,
    resumenIa: usaPersonalizado ? String(guardado?.resumenIa || "") : "",
    avisosIa: usaPersonalizado && Array.isArray(guardado?.avisosIa) ? guardado.avisosIa : [],
    ventaSubtotal: Math.round(ventaSubtotal),
    ventaUtilidad: Math.round(ventaUtilidad),
    ventaIva: Math.round(ventaIva),
    ventaTotal,
    ingresoNeto,
    sinAiu,
    costoMateriales,
    costoManoObra,
    costoLogistica,
    costoTotal,
    utilidadBruta,
    margenBrutoPct,
    indirectosPct,
    costoIndirectos,
    gananciaNeta,
    margenPct,
    margenMinimoPct,
    margenConfiable,
    lineasDesdePrecio,
    itemsSinCosto,
    estadoMargen,
  };
}

/**
 * Estimador de respaldo local para reformas / trabajos a medida cuando la IA
 * no responde o no está disponible. Analiza los textos y cantidades de los ítems
 * usando los costos reales del catálogo de insumos de la empresa.
 */
export function estimarCostosHeuristico({
  titulo = "",
  saludo = "",
  incluyeTexto = "",
  observaciones = "",
  alcance = "",
  requerimientoCliente = "",
  items = [],
  configCostos = null,
}) {
  const cfg = configCostos || obtenerConfigCostos([]);
  const mapa = new Map((cfg.insumos || []).map((ins) => [ins.id, ins]));
  const lineas = [];
  const avisos = [
    "Estimación generada con reglas locales de respaldo. Revisa y ajusta las cantidades y costos según el sitio de obra.",
  ];

  const agregar = (insumoId, fallback, cant, nota, { desdePrecio = false } = {}) => {
    const ins = insumoId ? mapa.get(insumoId) : null;
    const base = ins || fallback;
    if (!base || cant <= 0) return;
    const cantRed = redondearCantidad(cant, base.unidad);
    if (cantRed <= 0) return;
    const prev = lineas.find((l) => (insumoId && l.insumoId === insumoId) || l.nombre === base.nombre);
    if (prev) {
      prev.cant = redondearCantidad(prev.cant + cantRed, prev.unidad);
      prev.subtotal = Math.round(prev.cant * prev.costoUnitario);
      if (nota && !prev.nota.includes(nota)) prev.nota = [prev.nota, nota].filter(Boolean).join(" · ");
    } else {
      lineas.push({
        id: `heur-${Date.now()}-${lineas.length + 1}`,
        insumoId: ins ? ins.id : null,
        nombre: base.nombre,
        categoria: base.categoria,
        unidad: base.unidad,
        cant: cantRed,
        costoUnitario: base.costoUnitario,
        subtotal: Math.round(cantRed * base.costoUnitario),
        origen: "ia",
        nota: nota || "Estimado a medida",
        ...(desdePrecio ? { costoDesdePrecio: true } : {}),
      });
    }
  };

  const contextoGeneral = claveServicio(`${titulo} ${saludo} ${alcance} ${requerimientoCliente} ${incluyeTexto} ${observaciones}`);
  const listaItems = Array.isArray(items) && items.length
    ? items
    : contextoGeneral
    ? [{ desc: titulo || saludo || alcance || requerimientoCliente, cant: 1, unit: "Global", vu: 0 }]
    : [];

  // 1. Conservar primero las recetas APU exactas (excluyendo ítems globales genéricos
  //    que traen alcance extra y deben estimarse según el contexto real de la propuesta)
  const analisisRecetas = calcularLineasDesdeRecetas(listaItems, cfg);
  const clavesGlobales = new Set(
    (analisisRecetas.itemsGenericosGlobales || []).map((g) => `${g.id ?? ""}|${claveServicio(g.desc)}|${g.cant}`)
  );
  const itemsSoloRecetaExacta = listaItems.filter((it) => {
    const desc = String(it?.desc || "").trim();
    const cant = Math.max(0, Number(it?.cant) || 0);
    if (!desc || cant <= 0) return false;
    const key = `${it?.id ?? ""}|${claveServicio(desc)}|${cant}`;
    return !clavesGlobales.has(key);
  });
  const baseRecetas = calcularLineasDesdeRecetas(itemsSoloRecetaExacta, cfg);
  for (const rl of baseRecetas.lineas) {
    lineas.push({ ...rl });
  }

  // 2. Aplicar reglas heurísticas a los ítems sin receta y a los globales genéricos
  const itemsAEstimar = [
    ...baseRecetas.itemsSinReceta,
    ...(analisisRecetas.itemsGenericosGlobales || []),
  ];
  let diasCuadrilla = 0;
  let cuadrillaDoble = false;
  let requiereAlturas = false;

  for (const it of itemsAEstimar) {
    const desc = String(it?.desc || "").trim();
    const c = Math.max(1, Number(it?.cant) || 1);
    const k = claveServicio(`${desc} ${it?.unit || ""} ${saludo} ${alcance} ${requerimientoCliente}`);
    const tag = desc.length > 72 ? `${desc.slice(0, 72)}…` : (desc || "Trabajo a medida");

    if (/\bRECERTIFICACION(?:ES)?\b/.test(claveServicio(desc)) && !/\b(?:SUMINISTRO|FABRICACION|CONSTRUCCION)\b/.test(claveServicio(desc))) {
      const textoItem = `${desc} ${saludo} ${alcance} ${requerimientoCliente}`;
      const kRec = claveServicio(textoItem);
      const tieneLvh = /\bL\s*V\s*H\b|\bHORIZONTAL/.test(kRec);
      const tieneLvv = /\bL\s*V\s*V\b|\bVERTICAL/.test(kRec);
      const tieneAnclajes = /\bANCLAJ/.test(kRec);
      const tieneEscaleras = /\bESCALER/.test(kRec);
      const tiposDistintos = [tieneLvh, tieneLvv, tieneAnclajes, tieneEscaleras].filter(Boolean).length;
      const matchMetros = textoItem.match(/(\d+(?:[.,]\d+)?)\s*(?:ml|m\.l\.|metros?\s*lineales?|metros?)\b/i);
      const metrosMencionados = matchMetros ? Number(String(matchMetros[1]).replace(",", ".")) || 0 : 0;
      const matchSistemas = textoItem.match(/(\d+)\s*(?:l[ií]neas?|sistemas?|tramos?|puntos?)\b/i);
      const sistemasMencionados = matchSistemas ? Number(matchSistemas[1]) || 0 : 0;
      const vuItem = Number(it?.vu) || 0;
      const subItem = c * vuItem;

      const numPlacas = Math.max(
        c > 1 ? c : 1,
        tiposDistintos || 1,
        sistemasMencionados > 0 ? Math.min(30, sistemasMencionados) : 0,
        subItem >= 2000000 ? Math.min(12, Math.max(2, Math.round(subItem / 900000))) : 1
      );
      agregar("placa_identificacion", null, numPlacas, `Placas inox Res. 4272 (${numPlacas} sistema(s)/punto(s))`);

      const galPintura = Math.max(1, metrosMencionados >= 60 ? Math.ceil(metrosMencionados / 50) : (subItem >= 4000000 ? 2 : 1));
      agregar("pintura_anticorrosiva", null, galPintura, "Limpieza y retoque anticorrosivo en soportes y anclajes");

      const diasRecert = Math.max(
        1,
        metrosMencionados >= 50 ? Math.ceil(metrosMencionados / 45) : 0,
        subItem >= 3500000 ? Math.min(6, Math.ceil(subItem / 2200000)) : 1
      );
      diasCuadrilla += diasRecert;
      requiereAlturas = true;
    } else if (/CAMIONER/.test(k)) {
      agregar("poste_cuello_cisne", null, 2, tag);
      agregar("dado_concreto", null, 2, tag);
      agregar("cable_acero_38", null, Math.max(20, c * 1.15), tag);
      agregar("carro_camionera", null, 1, tag);
      agregar("autorretractil", null, 1, tag);
      agregar("tensor_forjado", null, 2, tag);
      agregar("absorbedor_energia", null, 2, tag);
      agregar("memoria_calculo", null, 1, tag);
      diasCuadrilla += 5;
      requiereAlturas = true;
    } else if (/CABLE|GUAYA|LINEA\s+DE\s+VIDA|LATCHWAYS|CONSTANT\s+FORCE|MAN\s*SAFE/.test(k)) {
      const metros = Math.max(1, c);
      // Tramos independientes realistas (~90 ML por tramo)
      const tramos = Math.max(1, Math.ceil(metros / 90));
      const esEspecialTpo = /\bTPO\b|LATCHWAYS|CONSTANT\s+FORCE|MAN\s*SAFE|INOX/.test(k);
      const postesExtremos = tramos * 2;
      const postesIntermedios = Math.max(1, Math.ceil(metros / 9) - tramos);
      const esquinas90 = /ESQUINA|90/.test(k) ? tramos * 2 : 0;
      const totalPostes = postesExtremos + postesIntermedios + esquinas90;

      if (esEspecialTpo) {
        agregar(
          null,
          { nombre: 'Cable acero inoxidable 316 (8mm / 5/16") certificado', categoria: "material", unidad: "ML", costoUnitario: 34000 },
          metros * 1.12,
          `${metros} ML + 12% holgura`
        );
        agregar(
          null,
          { nombre: "Poste terminal / soporte lateral Constant Force (Latchways o equiv.)", categoria: "material", unidad: "Und", costoUnitario: 780000 },
          postesExtremos,
          `${tramos} tramos × 2 extremos`
        );
        agregar(
          null,
          { nombre: "Poste / soporte intermedio + pieza intermedia de proximidad", categoria: "material", unidad: "Und", costoUnitario: 420000 },
          postesIntermedios,
          "1 soporte cada ~9 m"
        );
      } else {
        agregar("cable_acero_516", null, metros * 1.15, `${metros} ML + 15% holgura`);
        agregar("poste_terminal", null, postesExtremos, `${tramos} tramos × 2 extremos`);
        agregar("soporte_intermedio", null, postesIntermedios, "1 soporte cada ~9 m");
      }

      if (esquinas90 > 0) {
        agregar(
          null,
          { nombre: "Soporte de esquina 90° y/o soporte variable certificado", categoria: "material", unidad: "Und", costoUnitario: esEspecialTpo ? 440000 : 185000 },
          esquinas90,
          `${tramos} tramos × 2 cambios de dirección`
        );
      }

      if (/TORNIQUETE|TENSOR|MANGUITO|ESTRIBO|ABSORBEDOR|CONSTANT\s+FORCE/.test(k)) {
        agregar(
          null,
          { nombre: "Conjunto tensor / torniquete + manguito de compresión y estribo", categoria: "material", unidad: "Kit", costoUnitario: esEspecialTpo ? 620000 : 210000 },
          tramos,
          `1 conjunto por tramo (${tramos})`
        );
      } else {
        agregar("tensor_forjado", null, tramos, `1 por tramo (${tramos})`);
        agregar("absorbedor_energia", null, tramos, `1 por tramo (${tramos})`);
        agregar("prensacables_kit", null, tramos, `1 por tramo (${tramos})`);
      }

      if (/ANILLA|SUJECION/.test(k)) {
        agregar(
          null,
          { nombre: "Anilla en D + elemento de sujeción de cable certificado", categoria: "material", unidad: "Und", costoUnitario: esEspecialTpo ? 165000 : 75000 },
          tramos * 2,
          "2 por tramo"
        );
      }

      if (/MAN\s*SAFE|CARRO|PROXIMIDAD/.test(k)) {
        agregar(
          null,
          { nombre: "Carro deslizante / Transfastener ManSafe certificado", categoria: "material", unidad: "Und", costoUnitario: 680000 },
          Math.max(2, Math.ceil(tramos * 0.6)),
          "Dispositivos de conexión continua"
        );
      }

      if (/RETRACTIL|GUAYA\s+MOVIL/.test(k)) {
        agregar("autorretractil", null, Math.max(2, Math.ceil(tramos * 0.4)), "Guaya móvil retráctil");
      }

      if (/\bTPO\b|SELLO|MORDAZA|MODULO(?:S)?\s+DE\s+FIJACION/.test(k)) {
        agregar(
          null,
          { nombre: "Módulos de fijación, sistema de mordaza y sellos térmicos membrana TPO", categoria: "material", unidad: "Kit", costoUnitario: 145000 },
          totalPostes,
          `1 kit de fijación y sellado TPO por poste (${totalPostes})`
        );
      }

      agregar("placa_identificacion", null, tramos, `1 placa Res. 4272 por tramo (${tramos})`);

      if (metros >= 100 || esEspecialTpo) {
        agregar(
          null,
          { nombre: "Diseño, memoria de cálculo estructural, pruebas de carga y certificación Res. 4272", categoria: "mano_obra", unidad: "Global", costoUnitario: metros >= 500 ? 4500000 : 1200000 },
          1,
          `Ingeniería y certificación (${metros} ML)`
        );
      }

      const rendimientoDiario = esEspecialTpo ? 25 : 35;
      diasCuadrilla += Math.max(1, Math.ceil(metros / rendimientoDiario));
      if (metros >= 250) cuadrillaDoble = true;
      requiereAlturas = true;
    } else if (/ANCLAJ|CANCAMO|ARGOLLA/.test(k)) {
      agregar("punto_anclaje_epoxico", null, c, tag);
      agregar("cartucho_epoxico", null, Math.ceil(c / 4), tag);
      agregar("placa_identificacion", null, c, tag);
      diasCuadrilla += Math.ceil(c / 6);
      requiereAlturas = true;
    } else if (/ESTRUCTUR|PLATAFORM|METALIC|PERFIL|REJA|PORTON|BARAND|PERGOLA/.test(k)) {
      const vu = Number(it?.vu) || 0;
      const kgPorUnd = vu >= 3000000 ? 240 : vu >= 1000000 ? 120 : 35;
      const kg = /KG/.test(claveServicio(it?.unit)) ? c : Math.max(35, c * kgPorUnd);
      agregar("acero_estructural", null, kg, tag);
      agregar("pintura_anticorrosiva", null, Math.max(1, Math.ceil(kg / 100)), tag);
      if (/ANCLAJ|EPOXIC|BARRA\s+ROSCADA|PLATINA/.test(k)) {
        agregar("varilla_roscada", null, Math.max(4, c * 8), tag);
        agregar("cartucho_epoxico", null, Math.max(1, c), tag);
      }
      diasCuadrilla += Math.max(1, Math.ceil(kg / 90));
      requiereAlturas = true;
    } else if (/TEJA|CUBIERT|TECHO|IMPERMEABILIZ|CANOA|CANAL/.test(k)) {
      const vu = Number(it?.vu) || 0;
      const subtotalItem = c * vu;
      const esGlobalOAlto = /^(GLOBAL|GLB|UND|UN)$/i.test(String(it?.unit || "").trim()) || vu >= 500000;
      if (esGlobalOAlto && subtotalItem >= 2000000) {
        // Estima m² aproximados si el techo viene en Global/Und a partir del valor comercial (~$180k-$220k/m² en Colombia)
        const m2Est = Math.max(20, Math.round(subtotalItem / 220000));
        agregar(null, { nombre: "Teja termoacústica / cubierta + tornillería, caballetes y sellos", categoria: "material", unidad: "M2", costoUnitario: 95000 }, m2Est, tag, { desdePrecio: true });
        agregar(null, { nombre: "Correas, estructura de apoyo, canales, flanches y remates metálicos", categoria: "material", unidad: "Global", costoUnitario: Math.round(subtotalItem * 0.14) }, 1, tag, { desdePrecio: true });
        agregar("alquiler_grua_manlift", null, Math.max(2, Math.ceil(m2Est / 250)), "Izaje de tejas / andamios certificados");
        if (subtotalItem >= 20000000 || /\bPOLIZ|\bSEGURO|\bRCE\b/.test(contextoGeneral)) {
          agregar("polizas_certificacion", null, 1, "Pólizas y documentación SST");
        }
        diasCuadrilla += Math.max(2, Math.ceil(m2Est / 35));
        if (m2Est >= 200) cuadrillaDoble = true;
      } else {
        agregar(null, { nombre: "Teja termoacústica / material de cubierta, flanches, selladores y tornillería", categoria: "material", unidad: it?.unit || "M2", costoUnitario: 95000 }, c, tag);
        diasCuadrilla += Math.max(1, Math.ceil(c / 20));
      }
      requiereAlturas = true;
    } else if (/PINTUR|FACHAD|RESAN|OBRA BLANCA|ESTUCO|DRYWALL|REFORM|ADECUAC|MANTENIM/.test(k)) {
      agregar("kit_resane_civil", null, Math.max(1, Math.ceil(c / 3)), tag);
      agregar("pintura_anticorrosiva", null, Math.max(1, Math.ceil(c / 12)), tag);
      diasCuadrilla += Math.max(1, Math.ceil(c / 8));
      if (/FACHAD|CUBIERT|ALTUR/.test(k) || /ALTUR|CUBIERT|FACHAD/.test(contextoGeneral)) {
        requiereAlturas = true;
      }
    } else {
      // Ítem genérico de reforma o servicio especial: estimación conservadora editable
      const costoRef = Number(it?.vu) > 0 ? Math.round(Number(it.vu) * 0.35) : 180000;
      agregar(null, { nombre: `Materiales e insumos para: ${desc.slice(0, 60)}`, categoria: "material", unidad: it?.unit || "Und", costoUnitario: costoRef }, c, tag, { desdePrecio: Number(it?.vu) > 0 });
      diasCuadrilla += 1;
    }
  }

  if (itemsAEstimar.length > 0) {
    const diasFinal = Math.max(1, Math.min(365, diasCuadrilla));
    const multiplicadorPersonal = cuadrillaDoble ? 2 : 1;
    agregar(
      "tecnico_alturas",
      null,
      diasFinal * multiplicadorPersonal,
      cuadrillaDoble ? `${diasFinal} días × 2 técnicos` : `${diasFinal} día(s) de ejecución`
    );
    agregar(
      "auxiliar_alturas",
      null,
      diasFinal * multiplicadorPersonal,
      cuadrillaDoble ? `${diasFinal} días × 2 auxiliares` : `${diasFinal} día(s) de apoyo`
    );
    if (requiereAlturas) {
      agregar("coordinador_sst", null, diasFinal, "Acompañamiento SST alturas tiempo completo");
    }
    agregar("transporte_obra", null, Math.max(1, Math.ceil(diasFinal * 0.8)), "Movilización personal y materiales");
    agregar("consumibles_instalacion", null, Math.max(1, Math.ceil(diasFinal * 0.8)), "Consumibles, sellado y herramienta");
  }

  const ordenCat = Object.fromEntries(CATEGORIAS_INSUMO.map((c) => [c.id, c.orden]));
  lineas.sort((a, b) => (ordenCat[a.categoria] || 9) - (ordenCat[b.categoria] || 9));

  const resumenPartes = [];
  if (baseRecetas.itemsConReceta.length > 0) {
    resumenPartes.push(`${baseRecetas.itemsConReceta.length} ítem(s) con receta APU`);
  }
  if (itemsAEstimar.length > 0) {
    resumenPartes.push(`${itemsAEstimar.length} ítem(s) estimados por alcance`);
  }

  return {
    lineas,
    resumen: `Estimación combinada (${resumenPartes.join(" + ") || `${listaItems.length} ítem(s)`}).`,
    avisos,
    esRespaldoLocal: true,
  };
}

function mapearCategoriaBodega(linea = {}) {
  const txt = claveServicio(linea.nombre);
  if (/CABLE|GUAYA|TENSOR|ABSORBEDOR|PRENSACABLE|ARRESTADOR|CARRO|RETRACTIL/.test(txt)) {
    return "Cables y Accesorios";
  }
  if (/POSTE|ESCALERA|ESTRUCTUR|PERFIL|PASARELA|PLATINA|CONCRETO|DADO/.test(txt)) {
    return "Estructuras y Postes";
  }
  if (/ANCLAJ|EPOXIC|VARILLA|TORNILL|FACHAD/.test(txt)) {
    return "Fijación y Anclajes";
  }
  if (/PLACA|SENAL|IDENTIFIC/.test(txt)) {
    return "Señalización y Placas";
  }
  return "Consumibles y Herramientas";
}

/**
 * Convierte el costeo de una propuesta aprobada al formato `materialesDespacho`
 * usado en Obra (`MaterialesDespachoObra.jsx`).
 *
 * PRIVACIDAD: Solo transfiere cantidades y nombres físicos de materiales/consumibles
 * de bodega; NUNCA incluye costos unitarios, mano de obra ni márgenes.
 */
export function costeoAMaterialesDespacho(propuesta = {}, configCostos = null) {
  const items = Array.isArray(propuesta?.items) ? propuesta.items : [];
  const costeo = calcularCosteoPropuesta(propuesta, configCostos);

  const entregables = items
    .filter((it) => it && (String(it.desc || "").trim() || Number(it.cant || 0) > 0))
    .map((it, idx) => ({
      id: `ent-${idx + 1}-${Date.now()}`,
      descripcion: String(it.desc || "").trim() || "Sistema cotizado",
      cant: Math.max(1, Number(it.cant) || 1),
      unidad: String(it.unit || "Und").trim() || "Und",
      estado: "Pendiente",
    }));

  const insumos = costeo.lineas
    .filter((l) => {
      if (l.cant <= 0) return false;
      if (l.categoria === "material") return true;
      // En logística incluimos consumibles físicos de bodega, no transporte/viajes
      if (l.categoria === "logistica" && !/TRANSPORTE|VIAJE|VIATICO/.test(claveServicio(l.nombre))) {
        return true;
      }
      return false;
    })
    .map((l, idx) => ({
      id: `mat-apu-${idx + 1}-${l.insumoId || idx}`,
      nombre: l.nombre,
      cant: l.cant,
      unidad: l.unidad,
      categoria: mapearCategoriaBodega(l),
      estado: "En Bodega",
      verificado: false,
    }));

  return { entregables, insumos };
}

// ---------------------------------------------------------------------------
// Revision de coherencia del costeo
//
// Un costo puede sumar bien y aun asi no corresponder al trabajo. Estas reglas
// miran el costeo ya armado -venga de recetas, de la IA o de la mano- contra
// lo que dice la cotizacion, y avisan de lo que no cuadra. No cambian ninguna
// cifra: la persona decide si corrige o si esta bien asi.
// ---------------------------------------------------------------------------

// Municipios del Valle de Aburra: un viaje a tarifa de ciudad los cubre.
const MUNICIPIOS_CERCANOS = [
  "MEDELLIN", "ENVIGADO", "ITAGUI", "SABANETA", "BELLO", "LA ESTRELLA",
  "CALDAS", "COPACABANA", "GIRARDOTA", "BARBOSA",
];

// Lo que se compra para instalar un sistema nuevo, no para revisarlo.
const MATERIAL_DE_INSTALACION = /\bCABLE\b|\bGUAYA\b|\bANCLAJE|\bPOSTE|\bABSORBEDOR|\bTENSOR|\bESCALERA|\bARRESTADOR|\bRETRACTIL|\bPASARELA|\bPLATAFORMA|\bCARRO\b/;
// Lo que si se gasta al revisar un sistema, aunque nombre sus piezas
// («pintura para retoque de anclajes», «tornilleria de postes»).
const MATERIAL_DE_MANTENIMIENTO = /\bPINTURA|\bANTICORROSIV|\bLIMPIEZA|\bRETOQUE|\bPLACA|\bTORNILL|\bTUERCA|\bARANDELA|\bCONSUMIBLE|\bSELLA|\bLUBRIC|\bGRASA/;
const TRABAJO_DE_REVISION = /\bRECERTIFICACION(?:ES)?\b|\bMANTENIMIENTO\b|\bINSPECCION\b/;
const TRABAJO_NUEVO = /\bSUMINISTRO|\bINSTALACION|\bFABRICACION|\bMONTAJE|\bCONSTRUCCION|\bREEMPLAZO|\bCAMBIO\b|\bREPOSICION/;
const GASTO_DE_VIAJE = /\bVIATICO|\bALOJAMIENTO|\bHOSPEDAJE|\bHOTEL|\bALIMENTACION|\bPEAJE|\bFLETE|\bCOMBUSTIBLE/;

export function esObraFueraDeLaCiudad(ciudad = "") {
  const clave = claveServicio(ciudad);
  if (!clave) return false; // sin ciudad no se puede saber: no se avisa
  return !MUNICIPIOS_CERCANOS.some((m) => new RegExp(`\\b${m}\\b`).test(clave));
}

/**
 * Parte las lineas de un costeo en las que se quedan y los materiales de
 * instalacion nueva que no corresponden a un trabajo de mantenimiento o
 * recertificacion. Si el trabajo no es de revision -o algun renglon cotizado
 * habla de suministro, reemplazo o cambio- no retira nada.
 *
 * Solo se miran el titulo y los renglones cotizados: el texto de «incluye» es
 * una plantilla que nombra la instalacion en todas las cotizaciones.
 */
export function separarMaterialNuevoEnRevision(lineas = [], { titulo = "", items = [] } = {}) {
  const todas = Array.isArray(lineas) ? lineas : [];
  const trabajo = claveServicio(`${titulo} ${(Array.isArray(items) ? items : []).map((it) => it?.desc || "").join(" ")}`);
  if (!TRABAJO_DE_REVISION.test(trabajo) || TRABAJO_NUEVO.test(trabajo)) {
    return { lineas: todas, retiradas: [] };
  }
  const esNuevo = (l) => {
    if (l?.categoria !== "material") return false;
    const nombre = claveServicio(l.nombre);
    return MATERIAL_DE_INSTALACION.test(nombre) && !MATERIAL_DE_MANTENIMIENTO.test(nombre);
  };
  return {
    lineas: todas.filter((l) => !esNuevo(l)),
    retiradas: todas.filter(esNuevo),
  };
}

/**
 * Avisos sobre un costeo que no cuadra con la cotizacion.
 * Devuelve `[{ id, titulo, texto }]`; los `id` de `descartadas` no se repiten.
 */
export function revisarCoherenciaCosteo(costeo = {}, { titulo = "", items = [], ciudad = "", descartadas = [] } = {}) {
  const lineas = Array.isArray(costeo?.lineas) ? costeo.lineas : [];
  if (!lineas.length) return [];
  const avisos = [];
  const pesos = (n) => `$ ${Math.round(n).toLocaleString("es-CO")}`;

  // 1. Recertificacion o mantenimiento costeado como instalacion nueva.
  {
    const nuevos = separarMaterialNuevoEnRevision(lineas, { titulo, items }).retiradas;
    const total = nuevos.reduce((s, l) => s + (Number(l.subtotal) || 0), 0);
    if (nuevos.length && total > 0) {
      avisos.push({
        id: "revision-con-material-nuevo",
        titulo: "Es mantenimiento o recertificación, pero el costo trae materiales de instalación nueva",
        texto: `${nuevos.map((l) => l.nombre).join(" · ")} (${pesos(total)}). Si no vas a reemplazarlos, quita esas líneas: el margen real es mayor al que se muestra.`,
      });
    }
  }

  // 2. Obra fuera del Valle de Aburra con transporte a tarifa de ciudad.
  if (esObraFueraDeLaCiudad(ciudad)) {
    const logistica = lineas.filter((l) => l.categoria === "logistica");
    const hayGastoDeViaje = lineas.some((l) => GASTO_DE_VIAJE.test(claveServicio(`${l.nombre} ${l.nota || ""}`)));
    const transporte = logistica
      .filter((l) => /\bTRANSPORTE|\bVIAJE/.test(claveServicio(l.nombre)))
      .reduce((s, l) => s + (Number(l.subtotal) || 0), 0);
    if (!hayGastoDeViaje) {
      avisos.push({
        id: "obra-fuera-sin-viaticos",
        titulo: `La obra es en ${String(ciudad).trim()}, fuera del Valle de Aburrá`,
        texto: `El transporte suma ${pesos(transporte)}, que es tarifa de ciudad, y no hay peajes, combustible, alojamiento ni alimentación de la cuadrilla. Agrégalos con «+ Agregar material / gasto»: el margen real es menor al que se muestra.`,
      });
    }
  }

  const ocultas = new Set(Array.isArray(descartadas) ? descartadas : []);
  return avisos.filter((a) => !ocultas.has(a.id));
}