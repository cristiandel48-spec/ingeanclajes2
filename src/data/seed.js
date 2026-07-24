// Datos semilla de la aplicacion
import { buildDefaultContabilidadConfig, buildDefaultPlanCuentas } from "../lib/accounting";

// ======================================================
// DATOS INICIALES
// ======================================================

export const EMPLEADOS_INIT = [
  { id:"E01", nombre:"Carlos Andrés Ríos",      cedula:"1032456781", cargo:"Técnico en alturas",      tel:"3001234567", email:"crios@ingeanclajes.com",      salario:2800000, activo:true, avatar:"CA", banco:"Bancolombia",  tipoCuenta:"Ahorros",   numeroCuenta:"204-123456-78", horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
  { id:"E02", nombre:"Jhon Fredy",       cedula:"79541236",   cargo:"Técnico en alturas",      tel:"3112345678", email:"jzapata@ingeanclajes.com",    salario:2800000, activo:true, avatar:"JF", banco:"Davivienda",   tipoCuenta:"Corriente", numeroCuenta:"0351-234567",  horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
  { id:"E03", nombre:"Miguel Ángel Torres",     cedula:"71784523",   cargo:"Coordinador SST",         tel:"3123456789", email:"mtorres@ingeanclajes.com",    salario:3500000, activo:true, avatar:"MA", banco:"Bancolombia",  tipoCuenta:"Ahorros",   numeroCuenta:"204-345678-90", horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
  { id:"E04", nombre:"Andrés Felipe Gómez",     cedula:"1017245698", cargo:"Técnico instalador",      tel:"3134567890", email:"agomez@ingeanclajes.com",     salario:2600000, activo:true, avatar:"AF", banco:"Nequi",        tipoCuenta:"Ahorros",   numeroCuenta:"3134567890",   horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
  { id:"E05", nombre:"Luis Eduardo Cano",       cedula:"98542167",   cargo:"Técnico instalador",      tel:"3145678901", email:"lcano@ingeanclajes.com",      salario:2600000, activo:true, avatar:"LE", banco:"Banco Bogotá", tipoCuenta:"Ahorros",   numeroCuenta:"012-3456789",  horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
  { id:"E06", nombre:"Sebastián Mora",          cedula:"1005987456", cargo:"Auxiliar de obra",        tel:"3156789012", email:"smora@ingeanclajes.com",      salario:1800000, activo:true, avatar:"SM", banco:"Bancolombia",  tipoCuenta:"Ahorros",   numeroCuenta:"204-456789-01", horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
  { id:"E07", nombre:"David Hernández",         cedula:"1042356789", cargo:"Auxiliar de obra",        tel:"3167890123", email:"dhernandez@ingeanclajes.com", salario:1800000, activo:true, avatar:"DH", banco:"Daviplata",    tipoCuenta:"Ahorros",   numeroCuenta:"3167890123",   horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
  { id:"E08", nombre:"Camilo Ospina",           cedula:"80123456",   cargo:"Soldador certificado",    tel:"3178901234", email:"cospina@ingeanclajes.com",    salario:3200000, activo:true, avatar:"CO", banco:"Bancolombia",  tipoCuenta:"Corriente", numeroCuenta:"204-567890-12", horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
  { id:"E09", nombre:"Ricardo Patiño",          cedula:"91234567",   cargo:"Técnico en alturas",      tel:"3189012345", email:"rpatino@ingeanclajes.com",    salario:2800000, activo:true, avatar:"RP", banco:"BBVA",         tipoCuenta:"Ahorros",   numeroCuenta:"0114-5678901", horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
  { id:"E10", nombre:"Nelson Vargas",           cedula:"15423987",   cargo:"Conductor / Logística",   tel:"3190123456", email:"nvargas@ingeanclajes.com",    salario:2200000, activo:true, avatar:"NV", banco:"Banco Bogotá", tipoCuenta:"Ahorros",   numeroCuenta:"012-6789012",  horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
  { id:"E11", nombre:"Fabián Salcedo",          cedula:"1023145678", cargo:"Técnico instalador",      tel:"3201234567", email:"fsalcedo@ingeanclajes.com",   salario:2600000, activo:true, avatar:"FS", banco:"Nequi",        tipoCuenta:"Ahorros",   numeroCuenta:"3201234567",   horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
  { id:"E12", nombre:"Julián Cardona",          cedula:"1154789632", cargo:"Auxiliar administrativo", tel:"3212345678", email:"jcardona@ingeanclajes.com",   salario:1900000, activo:true, avatar:"JC", banco:"Bancolombia",  tipoCuenta:"Ahorros",   numeroCuenta:"204-789012-34", horasExtrasPorObra:[], comisionesPorObra:[], deduccionesPersonalizadas:[] },
];

export const CARGOS_INIT = [...new Set(EMPLEADOS_INIT.map((empleado)=>empleado.cargo))].map((nombre,index)=>({
  id:"CAR-" + (String(index+1).padStart(3,"0")),
  nombre,
  descripcion:"",
  activo:true,
}));

export const COTIZACIONES_INIT = [
  { id:"COT-001", numero:"P-34153", fecha:"2026-03-10", cliente:"Sergio Zapata", obra:"BYCSA", telefono:"3113372396", ciudad:"BARBOSA - ANTIOQUIA", estado:"Aprobada", obraId:"OB-001", total:37956480, items:[{desc:"LINEA DE VIDA HORIZONTAL 21 ML",cant:21,unit:"ML",vu:280000},{desc:"LINEA DE VIDA HORIZONTAL 27 ML",cant:27,unit:"ML",vu:280000},{desc:"LINEA DE VIDA CONEXION 26 ML",cant:26,unit:"ML",vu:280000},{desc:"ESCALERA 11 METROS",cant:11,unit:"Metro",vu:1200000}], util:10, formaPago:"50% ANTICIPO, 50% CONCLUIR LABORES", tiempoEjec:"10 DIAS (4 EN FABRICACION, 6 DIAS EN INSTALACION)", val:30, mapImg:null, coords:"6.4375,-75.3317" },
  { id:"COT-002", numero:"P-34154", fecha:"2026-03-20", cliente:"Parque Ind. Mamonal", obra:"Mantenimiento Fachada Sur", telefono:"6565000", ciudad:"Cartagena, Bolívar", estado:"Pendiente", obraId:null, total:3200000, items:[{desc:"LINEA DE VIDA HORIZONTAL",cant:45,unit:"ML",vu:71111}], util:10, formaPago:"50% ANTICIPO, 50% CONCLUIR LABORES", tiempoEjec:"5 DIAS", val:30, mapImg:null, coords:"10.3432,-75.505" },
];

export const OBRAS_INIT = [
  { id:"OB-001", cliente:"Sergio Zapata",          nit:"", tel:"3113372396", proyecto:"BYCSA · Líneas de vida y escalera",      ciudad:"Barbosa, Antioquia",  direccion:"Vía principal Barbosa",      coords:"6.4375,-75.3317", estado:"En Obra",   avance:40,  total:37956480, pagado:18978240, saldo:18978240, costos:8500000, fechaInicio:"2026-03-15", fechaFin:"2026-03-25", empleados:["E01","E02","E03"], trazos:[{x1:80,y1:100,x2:320,y2:100,tipo:"LVH",ml:27,label:"LV-1 27ml"},{x1:80,y1:150,x2:290,y2:150,tipo:"LVH",ml:21,label:"LV-2 21ml"},{x1:290,y1:100,x2:290,y2:150,tipo:"CON",ml:26,label:"Conexión"}], anclajes:[{x:80,y:100},{x:320,y:100},{x:80,y:150},{x:290,y:150}] },
  { id:"OB-002", cliente:"Parque Ind. Mamonal",    nit:"890.100.624-1", tel:"6565000", proyecto:"Mantenimiento Fachada Sur",          ciudad:"Cartagena, Bolívar",  direccion:"Zona Industrial Mamonal",    coords:"10.3432,-75.505", estado:"Cotización",avance:0,   total:3200000,  pagado:0,        saldo:3200000,  costos:0,       fechaInicio:"2026-04-10", fechaFin:"2026-04-20", empleados:["E04","E05"],        trazos:[{x1:100,y1:80,x2:350,y2:80,tipo:"LVH",ml:45,label:"LV Fachada"}], anclajes:[{x:100,y:80},{x:350,y:80}] },
  { id:"OB-003", cliente:"Hotel Caribe Hilton",    nit:"800.025.222-1", tel:"6646060", proyecto:"Líneas de Vida + Certificación",      ciudad:"Cartagena, Bolívar",  direccion:"El Laguito, Cartagena",      coords:"10.4236,-75.551", estado:"Pagado",    avance:100, total:12450000, pagado:12450000, saldo:0,        costos:3200000, fechaInicio:"2025-12-01", fechaFin:"2025-12-15", empleados:["E01","E03","E08"],  trazos:[{x1:60,y1:90,x2:380,y2:90,tipo:"LVH",ml:60,label:"LV Principal"},{x1:200,y1:90,x2:200,y2:260,tipo:"LVV",ml:30,label:"LV Vertical"}], anclajes:[{x:60,y:90},{x:380,y:90},{x:200,y:90},{x:200,y:260}] },
  { id:"OB-004", cliente:"Cemex Colombia S.A.",    nit:"860.007.078-4", tel:"3208000", proyecto:"Anclajes Epóxicos Planta",            ciudad:"Medellín, Antioquia", direccion:"Cra 42 #75-377, Itagüí",    coords:"6.2442,-75.5812", estado:"En Obra",   avance:30,  total:5670000,  pagado:2835000,  saldo:2835000,  costos:1800000, fechaInicio:"2026-03-20", fechaFin:"2026-04-05", empleados:["E06","E07","E09"],  trazos:[{x1:120,y1:120,x2:310,y2:120,tipo:"LVH",ml:35,label:"LV Industrial"}], anclajes:[{x:120,y:120},{x:220,y:120},{x:310,y:120}] },
  { id:"OB-005", cliente:"Centro Industrial Sur",  nit:"900.519.711-2", tel:"44483468", proyecto:"Recertificación 20 LVH",             ciudad:"Medellín, Antioquia", direccion:"Carrera 42 #75-377",        coords:"6.2112,-75.5890", estado:"Pagado",    avance:100, total:4800000,  pagado:4800000,  saldo:0,        costos:900000,  fechaInicio:"2026-02-23", fechaFin:"2026-03-03", empleados:["E04","E02","E03"],  trazos:[{x1:60,y1:80,x2:380,y2:80,tipo:"LVH",ml:80,label:"LV Sur"},{x1:60,y1:140,x2:380,y2:140,tipo:"LVH",ml:80,label:"LV Norte"}], anclajes:[{x:60,y:80},{x:380,y:80},{x:60,y:140},{x:380,y:140}] },
];

export const PAGOS_INIT = [
  { id:"PG-001", obraId:"OB-001", tipo:"Anticipo 50%", monto:18978240, fecha:"2026-03-14", estado:"Pagado",   metodo:"PSE" },
  { id:"PG-002", obraId:"OB-003", tipo:"Pago Total",   monto:12450000, fecha:"2025-12-16", estado:"Pagado",   metodo:"PSE" },
  { id:"PG-003", obraId:"OB-004", tipo:"Anticipo 50%", monto:2835000,  fecha:"2026-03-19", estado:"Pagado",   metodo:"Transferencia" },
  { id:"PG-004", obraId:"OB-001", tipo:"Saldo 50%",    monto:18978240, fecha:"2026-03-25", estado:"Pendiente",metodo:"PSE" },
  { id:"PG-005", obraId:"OB-004", tipo:"Saldo 50%",    monto:2835000,  fecha:"2026-04-05", estado:"Pendiente",metodo:"PSE" },
  { id:"PG-006", obraId:"OB-005", tipo:"Pago Total",   monto:4800000,  fecha:"2026-03-04", estado:"Pagado",   metodo:"Transferencia" },
];

export const HORARIOS_INIT = [
  { id:"H01", empleadoId:"E01", obraId:"OB-001", fecha:"2026-04-07", turno:"07:00 - 17:00", tarea:"Instalación líneas de vida" },
  { id:"H02", empleadoId:"E02", obraId:"OB-001", fecha:"2026-04-07", turno:"07:00 - 17:00", tarea:"Instalación líneas de vida" },
  { id:"H03", empleadoId:"E03", obraId:"OB-001", fecha:"2026-04-07", turno:"08:00 - 17:00", tarea:"Coordinación SST" },
  { id:"H04", empleadoId:"E04", obraId:"OB-004", fecha:"2026-04-07", turno:"07:00 - 16:00", tarea:"Perforación anclajes" },
  { id:"H05", empleadoId:"E09", obraId:"OB-004", fecha:"2026-04-07", turno:"07:00 - 16:00", tarea:"Instalación anclajes epóxicos" },
];

export const CERTIFICACIONES_INIT = [
  { id:"CERT-001", obraId:"OB-003", tipo:"Certificación", numero:"C-2025-001", fecha:"2025-12-16", cliente:"Hotel Caribe Hilton", nit:"800.025.222-1", direccion:"El Laguito, Cartagena", sistema:"23 Líneas de vida horizontales con conectoras", elementos:["Perno Grado 8 B7 Ø 5/8","Arandela Ø 5/8","Tuerca Ø 5/8","Guarda Cables","Cable diámetro 5/16\" (8mm) galvanizado","Tensor cable","Soportes laterales e intermedios"], normativa:"Resolución 4272 de 2021", ingeniero:"ING. JHON JAIME SEPULVEDA LONDOÑO", matricula:"MP. 05256-409949", estado:"Vigente", proxMant:"2026-12-16" },
  { id:"CERT-002", obraId:"OB-004", tipo:"Certificación", numero:"C-2024-047", fecha:"2024-10-29", cliente:"Promotora Frontera Sur S.A.S", nit:"900.412.xxx-x", direccion:"Cl. 50 #40 17, Itagüí", sistema:"8 puntos de anclaje en Hotel Ibis Budget", elementos:["Perno Grado 8 B7 Ø 5/8","Arandela Ø 5/8","Tuerca Ø 5/8","Punto de anclaje marca ARTICO acero galvanizado","Epóxico ProAnchor Elite ESP"], normativa:"Resolución 4272 de 2021", ingeniero:"ING. JHON JAIME SEPULVEDA LONDOÑO", matricula:"MP. 05256-409949", estado:"Vigente", proxMant:"2025-10-29" },
  { id:"CERT-003", obraId:"OB-005", tipo:"Recertificación", numero:"R-2025-012", fecha:"2025-12-01", cliente:"Centro Cívico Antioquia Plaza de la Libertad PH", nit:"900.519.711-2", direccion:"CR 53 A 42 161, Medellín", sistema:"34 puntos de anclaje - Mantenimiento preventivo", elementos:["Limpieza sistema completo","Verificación ajuste tuercas y pernos","Laca protectora anticorrosiva en todos los puntos"], normativa:"Resolución 4272 de 2021", ingeniero:"ING. JHON JAIME SEPULVEDA LONDOÑO", matricula:"MP. 05256-409949", estado:"Vigente", proxMant:"2026-12-01" },
];

export const INFORMES_INIT = [
  { id:"INF-001", obraId:"OB-001", proyecto:"COMAPAN-PONQUE", localizacion:"Puente Aranda, Bogotá", fechaInforme:"2026-03-18", periodoInicio:"2026-03-09", periodoFin:"2026-03-14", personal:[{cargo:"Instalador",nombre:"Juan David García"},{cargo:"Instalador",nombre:"James Rincón"},{cargo:"Instalador",nombre:"Carlos Tovar"},{cargo:"Instalador",nombre:"William Álvarez"},{cargo:"SST",nombre:"Paola Escobar"}], actividad:"Instalación de líneas de vida", descripcion:"Primero, se realizó una evaluación detallada de la cubierta para determinar las ubicaciones óptimas para los soportes que sostendrán las líneas. A continuación, se instalaron estos soportes asegurándolos firmemente a la cubierta, por último se realizó la instalación de los cables o líneas horizontales. Este cable se desliza a través de los soportes, asegurándolo con tensores para mantener la línea en la posición deseada y evitar movimientos indeseados. Finalmente, se realiza una verificación de la tensión y la alineación de los cables para asegurar que cumpla con los estándares de seguridad y funcionalidad.", observaciones:"1 Línea de vida horizontal de 119 metros en la bodega ponque", recomendaciones:"Para garantizar la efectividad y seguridad de las líneas de vida instaladas es fundamental implementar un programa de inspección regular para verificar el estado de los anclajes.", fotos:[{url:"",comentario:"Vista general cubierta - evaluación inicial"},{url:"",comentario:"Instalación soportes laterales"},{url:"",comentario:"Tensor y cable instalado"},{url:"",comentario:"Verificación tensión final"}] },
  { id:"INF-002", obraId:"OB-005", proyecto:"CENTRO INDUSTRIAL DEL SUR", localizacion:"Medellín, Antioquia", fechaInforme:"2026-03-03", periodoInicio:"2026-02-23", periodoFin:"2026-02-24", personal:[{cargo:"Instalador",nombre:"William Álvarez"},{cargo:"Instalador",nombre:"James Rincón"},{cargo:"SST",nombre:"Arelis Quiñones"}], actividad:"Recertificación de líneas de vida horizontal", descripcion:"Se realizó la inspección visual y física de todos los elementos que componen el sistema: soportes laterales e intermedios, cable, guardacables, tensor. No fue necesario realizar ajustes al cable ya que este se encontraba en óptimas condiciones de tensión. Se realizó el ajuste a tornillería y se verificó el estado de la soldadura. Se realizó limpieza del sistema y la aplicación de pintura anticorrosiva.", observaciones:"20 líneas de vida horizontal recertificadas", recomendaciones:"Para garantizar la efectividad y seguridad de las líneas de vida instaladas es fundamental implementar un programa de inspección regular.", fotos:[{url:"",comentario:"Inspección visual soportes laterales"},{url:"",comentario:"Verificación tensión cable"},{url:"",comentario:"Aplicación pintura anticorrosiva"},{url:"",comentario:"Estado final del sistema"}] },
];


export const CLIENTES_INIT = [
  { id:"CLI-001", nombre:"Sergio Zapata", nit:"", telefono:"3113372396", ciudad:"Barbosa, Antioquia", direccion:"Vía principal Barbosa", contacto:"Sergio Zapata", email:"", estado:"Activo", notas:"Cliente asociado a BYCSA." },
  { id:"CLI-002", nombre:"Parque Ind. Mamonal", nit:"890.100.624-1", telefono:"6565000", ciudad:"Cartagena, Bolívar", direccion:"Zona Industrial Mamonal", contacto:"Área de mantenimiento", email:"", estado:"Activo", notas:"Cliente industrial con trabajos de mantenimiento." },
  { id:"CLI-003", nombre:"Hotel Caribe Hilton", nit:"800.025.222-1", telefono:"6646060", ciudad:"Cartagena, Bolívar", direccion:"El Laguito, Cartagena", contacto:"Administración hotel", email:"", estado:"Activo", notas:"Cliente con certificaciones vigentes." },
  { id:"CLI-004", nombre:"Cemex Colombia S.A.", nit:"860.007.078-4", telefono:"3208000", ciudad:"Medellín, Antioquia", direccion:"Cra 42 #75-377, Itagüí", contacto:"Compras / mantenimiento", email:"", estado:"Activo", notas:"Cliente corporativo de planta industrial." },
  { id:"CLI-005", nombre:"Centro Industrial Sur", nit:"900.519.711-2", telefono:"44483468", ciudad:"Medellín, Antioquia", direccion:"Carrera 42 #75-377", contacto:"Administración", email:"", estado:"Activo", notas:"Cliente de recertificación y mantenimiento." },
  { id:"CLI-006", nombre:"Promotora Frontera Sur S.A.S", nit:"900.412.xxx-x", telefono:"", ciudad:"Itagüí, Antioquia", direccion:"Cl. 50 #40 17, Itagüí", contacto:"Coordinación de obra", email:"", estado:"Activo", notas:"Cliente registrado en certificaciones." },
  { id:"CLI-007", nombre:"Centro Cívico Antioquia Plaza de la Libertad PH", nit:"900.519.711-2", telefono:"", ciudad:"Medellín, Antioquia", direccion:"CR 53 A 42 161, Medellín", contacto:"Administración PH", email:"", estado:"Activo", notas:"Cliente de recertificación." },
];

export const PROVEEDORES_INIT = [
  { id:"PROV-001", nombre:"Hilti Colombia S.A.S", nit:"830.098.000-1", telefono:"018000114586", tel:"018000114586", email:"hilti@hilti.co", banco:"Bancolombia", numeroCuenta:"410-000123-45", direccion:"Cra. 48 # 14 Sur - 89, Medellín", categoria:"Materiales", contacto:"Asesor comercial" },
  { id:"PROV-002", nombre:"Fischer Colombia", nit:"900.123.456-7", telefono:"6041234567", tel:"6041234567", email:"ventas@fischer.co", banco:"Davivienda", numeroCuenta:"0078-000456-11", direccion:"Autopista Sur # 52 - 31, Itagüí", categoria:"Materiales", contacto:"Equipo de ventas" },
  { id:"PROV-003", nombre:"Ferretería Industrial SAS", nit:"811.000.789-2", telefono:"3005678901", tel:"3005678901", email:"pedidos@ferind.co", banco:"Banco de Bogotá", numeroCuenta:"021-998877-55", direccion:"Cl. 30 # 65 - 10, Medellín", categoria:"Ferretería", contacto:"Jhon Mesa" },
  { id:"PROV-004", nombre:"Transporte Rápido S.A.", nit:"900.234.567-8", telefono:"3142345678", tel:"3142345678", email:"transp@rapido.co", banco:"Bancolombia", numeroCuenta:"201-445566-77", direccion:"Zona Industrial Mamonal, Cartagena", categoria:"Transporte", contacto:"Carlos Díaz" },
  { id:"PROV-005", nombre:"Arco Industrial Cables", nit:"900.345.678-9", telefono:"3153456789", tel:"3153456789", email:"cables@arco.co", banco:"BBVA", numeroCuenta:"912345670", direccion:"Cl. 10 # 48 - 22, Bogotá", categoria:"Cables/Acero", contacto:"Luisa Torres" },
  { id:"PROV-006", nombre:"Epóxicos y Químicos SA", nit:"900.456.789-0", telefono:"3164567890", tel:"3164567890", email:"ventas@epoxicos.co", banco:"Occidente", numeroCuenta:"350-778899-00", direccion:"Parque Industrial Rionegro, Antioquia", categoria:"Químicos", contacto:"Sandra Ruiz" },
];

export const CUENTAS_PAGAR_INIT = [
  { id:"CP-001", proveedorId:"PROV-001", obraId:"OB-001", concepto:"Pernos Grado 8 B7 Ø 5/8 x 200 und", monto:1850000, fecha:"2026-03-10", fechaVence:"2026-04-10", estado:"Pendiente", factura:"FV-2026-0341" },
  { id:"CP-002", proveedorId:"PROV-005", obraId:"OB-001", concepto:"Cable acero 5/16\" galvanizado 300ml", monto:2400000, fecha:"2026-03-10", fechaVence:"2026-03-25", estado:"Pagado",   factura:"FV-2026-0198" },
  { id:"CP-003", proveedorId:"PROV-004", obraId:"OB-001", concepto:"Transporte materiales Bogotá", monto:850000,  fecha:"2026-03-08", fechaVence:"2026-03-15", estado:"Pagado",   factura:"FV-2026-0089" },
  { id:"CP-004", proveedorId:"PROV-006", obraId:"OB-001", concepto:"Epóxico PURE 110 x 12 und", monto:960000,  fecha:"2026-03-11", fechaVence:"2026-04-11", estado:"Pendiente", factura:"FV-2026-0402" },
  { id:"CP-005", proveedorId:"PROV-003", obraId:"OB-004", concepto:"Soportes laterales e intermedios x 30", monto:1200000, fecha:"2026-03-20", fechaVence:"2026-04-20", estado:"Pendiente", factura:"FV-2026-0511" },
  { id:"CP-006", proveedorId:"PROV-005", obraId:"OB-004", concepto:"Cable acero 5/16\" x 150ml", monto:1150000, fecha:"2026-03-19", fechaVence:"2026-04-05", estado:"Pagado",   factura:"FV-2026-0488" },
  { id:"CP-007", proveedorId:"PROV-002", obraId:"OB-005", concepto:"Tornillería certificada pack", monto:480000,  fecha:"2026-02-20", fechaVence:"2026-03-20", estado:"Pagado",   factura:"FV-2026-0112" },
  { id:"CP-008", proveedorId:"PROV-001", obraId:"OB-003", concepto:"Anclajes ARTICO acero galvanizado x 23", monto:3200000, fecha:"2025-11-28", fechaVence:"2025-12-28", estado:"Pagado",   factura:"FV-2025-1893" },
];

export const CONTABILIDAD_CONFIG_INIT = [buildDefaultContabilidadConfig()];
export const PLAN_CUENTAS_INIT = buildDefaultPlanCuentas();
export const ASIENTOS_CONTABLES_INIT = [];

export const ITEMS_DB = [
  { categoria:"Lineas de Vida", items:[
    { desc:"LINEA DE VIDA HORIZONTAL",            unit:"ML",  vu:280000 },
    { desc:"LINEA DE VIDA VERTICAL",              unit:"ML",  vu:320000 },
    { desc:"LINEA DE VIDA CONEXION / TRANSVERSAL",unit:"ML",  vu:280000 },
    { desc:"RECERTIFICACION LINEA DE VIDA",       unit:"ML",  vu:45000  },
  ]},
  { categoria:"Escaleras", items:[
    { desc:"ESCALERA FIJA CON LINEA DE VIDA VERTICAL", unit:"Metro", vu:1200000 },
    { desc:"ESCALERA TIPO GATO",                       unit:"Metro", vu:850000  },
    { desc:"ESCALERA MARINERA",                        unit:"Metro", vu:950000  },
  ]},
  { categoria:"Anclajes", items:[
    { desc:"PUNTO DE ANCLAJE EPOXICO",                unit:"Und",  vu:380000  },
    { desc:"PUNTO DE ANCLAJE SOLDADO",                unit:"Und",  vu:290000  },
    { desc:"PUNTO DE ANCLAJE EN FACHADA",             unit:"Und",  vu:420000  },
    { desc:"ANCLAJE ARTICO ACERO GALVANIZADO",        unit:"Und",  vu:450000  },
  ]},
  { categoria:"Sistemas Completos", items:[
    { desc:"SISTEMA ANTICAIDA CUBIERTA (COMPLETO)",   unit:"Global",vu:8500000 },
    { desc:"BARANDILLA DE PROTECCION EN CABLE",       unit:"ML",   vu:320000  },
    { desc:"PASARELA DE SEGURIDAD EN CUBIERTA",       unit:"ML",   vu:550000  },
  ]},
  { categoria:"Servicios", items:[
    { desc:"CERTIFICACION SISTEMA ANTICAIDA",         unit:"Global",vu:1200000 },
    { desc:"RECERTIFICACION ANUAL",                   unit:"Global",vu:650000  },
    { desc:"INSPECCION Y DIAGNOSTICO",                unit:"Global",vu:400000  },
    { desc:"COORDINADOR SST EN OBRA",                 unit:"Dia",   vu:280000  },
  ]},
];

export const DEFAULT_COT_FORMA_PAGO = "50% ANTICIPO, 50% CONCLUIR LABORES";
export const DEFAULT_COT_TIEMPO_EJEC = "10 DIAS (4 EN FABRICACION, 6 DIAS EN INSTALACION)";
export const DEFAULT_COT_INCLUYE_PUNTOS_ANCLAJE = [
  "Puntos de anclajes certificados.",
  "Elementos de instalación con certificados de fábrica adjuntos en la documentación.",
  "Transporte de materiales y personal hasta el sitio de trabajo.",
  "Certificados según Resolución 4272 — trabajo seguro en alturas.",
  "Recertificación sin costo al año siguiente de la instalación.",
  "Coordinador de trabajo seguro en alturas de tiempo completo en obra.",
  "Todo el personal se encuentra afiliado a ARL, salud y pensiones. Se llevan todos los EPP necesarios, se realizan todas las reparaciones de daños durante la ejecución y se entregan las pólizas exigidas por el contratante."
].join("\n");
