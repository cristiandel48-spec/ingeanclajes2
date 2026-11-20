// Arma el borrador de una cotizacion a partir de un texto dictado.
//
// La persona dice algo como "cotizacion para Constructora Velez en Medellin,
// 120 metros de linea de vida horizontal y 4 puntos de anclaje epoxico" y
// esta funcion devuelve los campos separados y los items del catalogo que
// mejor encajan. NO crea nada: devuelve una propuesta que la persona revisa
// y acepta o descarta en pantalla.
//
// Vive en el servidor porque la clave de la IA jamas puede viajar al
// navegador: todo lo que va en el bundle de Vite queda a la vista de
// cualquiera, y con esa clave se puede gastar la cuota ajena.
//
// Desplegar:  supabase functions deploy armar-cotizacion
// Secretos:   supabase secrets set GROQ_API_KEY=...
//
// El proveedor se cambia con variables de entorno, sin tocar codigo:
//   IA_URL     (por defecto, la API de Groq, compatible con OpenAI)
//   IA_MODELO  (por defecto, un modelo rapido de Groq)
// Cualquier servicio con API compatible con OpenAI sirve igual.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IA_URL = Deno.env.get("IA_URL") ?? "https://api.groq.com/openai/v1/chat/completions";
// Modelo por defecto en Groq. Si IA_MODELO está configurado en Supabase se usa ese,
// con respaldo automático a llama-3.1-8b-instant si falla. llama-3.3-70b-versatile
// NO va: Groq lo apago el 16/08/2026 (ver commit 5cb7ecb).
const IA_MODELO = Deno.env.get("IA_MODELO") ?? "openai/gpt-oss-120b";

// Un dictado de cotizacion son unas pocas frases, pero un documento importado
// en PDF puede contener tablas y condiciones extensas.
const MAX_CARACTERES = 25000;

const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

function construirInstruccion(catalogo: string) {
  return [
    "Eres un asistente de una empresa colombiana que instala sistemas anticaidas:",
    "lineas de vida, puntos de anclaje, escaleras y certificaciones.",
    "",
    "Recibes la transcripcion de alguien dictando los datos de una cotizacion.",
    "Devuelves UNICAMENTE un objeto JSON con esta forma exacta:",
    "{",
    '  "cliente": string,        // razon social o nombre; "" si no se dijo',
    '  "contacto": string,       // persona de contacto; "" si no se dijo',
    '  "ciudad": string,         // ciudad de la obra; "" si no se dijo',
    '  "obra": string,           // sitio o nombre de la obra; "" si no se dijo',
    '  "telefono": string,       // solo digitos; "" si no se dijo',
    '  "alcance": string,        // descripcion del trabajo, redactada formal',
    '  "items": [{ "desc": string, "cant": number, "vu": number|null }],',
    '  "avisos": [string]        // que quedo dudoso o no se entendio',
    "}",
    "",
    "REGLAS:",
    "- `desc` de cada item debe ser EXACTAMENTE uno de los del catalogo. Si lo",
    "  dictado no encaja con ninguno, no lo inventes: dejalo fuera y explicalo",
    "  en `avisos`.",
    "- `vu` es el valor unitario. SOLO se pone si la persona dijo un precio",
    "  para ese item concreto (\"a 100 mil cada uno\", \"a 150.000 la unidad\").",
    "  Si no dijo precio, `vu` va en null y el sistema usa el del catalogo.",
    "  Nunca calcules ni supongas un precio: o lo dijeron, o va null.",
    "- No inventes cantidades, precios, nombres ni telefonos. Lo que no se dijo",
    "  va vacio. Es preferible un campo en blanco a un dato falso.",
    "- El dictado viene de voz: puede traer errores. Si un nombre propio suena",
    "  dudoso, ponlo igual y avisa en `avisos` que hay que revisarlo.",
    "- `alcance` se redacta en espanol formal, en tercera persona, sin saludos.",
    "- Responde solo el JSON, sin explicaciones ni ```.",
    "",
    "CATALOGO DE SERVICIOS (usa estas descripciones tal cual):",
    catalogo,
  ].join("\n");
}

function construirInstruccionCostos(catalogoInsumos: string) {
  return [
    "Eres un ingeniero civil y presupuestador APU senior en Colombia, especialista en",
    "sistemas anticaidas (Resolucion 4272 de 2021, MSA Latchways Constant Force, ManSafe,",
    "lineas de vida en cubierta TPO/metalica/concreto), estructuras metalicas y reformas civiles.",
    "",
    "Recibes los datos completos de una propuesta de cotizacion (titulo, frase de apertura,",
    "obra, ciudad, alcance, requerimiento, que incluye e items cotizados) y el catalogo de",
    "insumos con costos de compra de la empresa en COP.",
    "Tu tarea es desglosar TODOS los MATERIALES y COMPONENTES, MANO DE OBRA (jornadas de",
    "tecnico/auxiliar/coordinador SST e ingenieria) y TRANSPORTE/CONSUMIBLES necesarios para",
    "ejecutar el proyecto, con sus COSTOS REALES DE COMPRA (NO precios de venta al cliente).",
    "",
    "Devuelves UNICAMENTE un objeto JSON con esta forma exacta:",
    "{",
    '  "lineas": [',
    "    {",
    '      "insumoId": string | null,  // id exacto del catalogo si es ese mismo insumo, o null si es componente especializado/importado/reforma',
    '      "nombre": string,           // nombre tecnico concreto del componente, mano de obra o gasto',
    '      "categoria": "material" | "mano_obra" | "logistica",',
    '      "unidad": string,           // ML, Und, Kg, M2, Galon, Dia, Viaje, Kit, Global',
    '      "cant": number,             // cantidad realista (> 0)',
    '      "costoUnitario": number,    // costo unitario real de compra en COP entero (> 0)',
    '      "nota": string              // breve calculo tecnico (ej. "12 tramos x 2 extremos", "1 cada 9 m")',
    "    }",
    "  ],",
    '  "resumen": string,              // resumen tecnico (2-3 frases) con tramos, cuadrilla y supuestos',
    '  "avisos": [string]              // puntos clave a confirmar en planos o visita tecnica',
    "}",
    "",
    "REGLAS ESTRICTAS DE INGENIERIA Y COSTEO:",
    "1. COBERTURA 100% DE CADA ELEMENTO NOMBRADO: lee palabra por palabra las descripciones de los",
    "   items, la FRASE DE APERTURA, el ALCANCE y LO QUE INCLUYE. Haz un checklist mental de CADA",
    "   componente listado (ej. cable/guaya, tensores, conjunto de torniquete, manguito de compresion",
    "   y estribo, soporte de esquina 90 grados, soporte variable, anilla en D, sujecion de cable,",
    "   soportes laterales e intermedios, guaya movil retractil, Man Safe / carros deslizantes,",
    "   pieza intermedia de proximidad, sistema de mordaza, modulos de fijacion, postes Constant Force,",
    "   sellos para membrana TPO, placas, etc.) y asegurate de que NINGUNO falte en `lineas`.",
    "2. ESCALA REAL PARA TRAMOS LARGOS (ej. 100 m a 2.000 m de linea de vida):",
    "   - Agrega 10%-15% de holgura al metraje de cable (nunca pongas exactamente los metros netos).",
    "   - Divide el metraje total en tramos independientes realistas (~80 a 100 ML por tramo;",
    "     ej. 1.079 ML son ~11-12 tramos independientes).",
    "   - Calcula postes terminales/laterales (2 por tramo), postes/soportes intermedios (cada 8-10 ML),",
    "     soportes de esquina 90 grados (~2 por tramo si se mencionan), conjunto tensor/torniquete/",
    "     manguito y estribo + absorbedor Constant Force (1-2 por tramo), anillas en D (2 por tramo),",
    "     carros Man Safe / Transfastener y piezas intermedias de proximidad, guayas moviles retractiles,",
    "     sellos de membrana TPO + modulos de fijacion/mordaza (1 por cada poste instalado).",
    "3. PRECIOS REALES DE ACERO INOXIDABLE / SISTEMAS IMPORTADOS / OBRA PESADA (NO USAR IDs BASICOS):",
    "   - Usa `insumoId` del CATALOGO DE INSUMOS solo cuando el componente sea exactamente ese estandar.",
    "   - PROHIBIDO asignar `insumoId` de ferreteria basica (`cable_acero_516`, `poste_terminal`,",
    "     `soporte_intermedio`, `tensor_forjado`, `poste_cuello_cisne`, `dado_concreto`, `autorretractil`,",
    "     `memoria_calculo`) cuando la cotizacion pida ACERO INOXIDABLE 304/316, Latchways Constant Force,",
    "     ManSafe, membrana TPO, columnas/soportes en T en tubo 6\" u 8\", o pedestales industriales:",
    "     en esos casos pon SIEMPRE `insumoId: null` y estima el COSTO REAL DE COMPRA/FABRICACION en COP:",
    "     * Cable inox 316 (5/16\"-3/8\"): ~35.000-55.000/ML.",
    "     * Postes Constant Force (Latchways): ~650.000-950.000/Und; carros ManSafe: ~550.000-850.000/Und.",
    "     * Soporte en T / columna camionera 6\"-8\" (altura 6-7m, platinas, brazos, soldadura):",
    "       acero al carbono ~4.500.000-6.500.000/Und; ACERO INOXIDABLE ~7.000.000-12.000.000/Und.",
    "       (No dupliques: si el proyecto lleva 2 soportes en T, NO agregues ademas 2 postes cuello de cisne).",
    "     * Pedestal / cimentacion en concreto 3500-4000 PSI para linea camionera (excavacion, acero,",
    "       formaleta, concreto, pernos J, demolicion/resane): ~2.500.000-4.500.000/Und.",
    "     * Retractil certificado 12-15m con polea/carro en acero inoxidable: ~2.400.000-3.800.000/Und.",
    "     * Absorbedor de energia inox: ~650.000-950.000/Und; tensor inox pesado: ~450.000-800.000/Und.",
    "4. SISTEMAS INTEGRALES Y ESTRUCTURAS METALICAS:",
    "   - Fijate en la cantidad, unidad y Precio venta unitario: si un item como 'Linea de vida",
    "     camionera' viene como 1 Und / 1 ML por $40M-$80M COP sin postes/dados aparte, estima el",
    "     sistema completo llave en mano (soportes/columnas, obra civil pedestales, cable, tensores,",
    "     absorbedores, retractiles con polea, izaje con grua, manlift, fabricacion, obra civil, montaje).",
    "   - Si son ESTRUCTURAS METALICAS / PLATAFORMAS (ej. 7 plataformas a $8M c/u): desglosa CADA",
    "     material nombrado en 'Esta cotizacion incluye' o frase de apertura (platinas, PTS, lamina",
    "     alfajor, microperforada, barra roscada, epoxico, pintura) x numero real de estructuras.",
    "   - Si son CUBIERTAS / TECHOS TERMOACUSTICOS (teja UPVC / panel sandwich / cambio de cubierta):",
    "     desglosa teja termoacustica (m2 + 10% traslapo/desperdicio), correas/estructura de soporte,",
    "     flanches, caballetes, canales/bajantes, tornilleria autoperforante + arandelas EPDM, selladores,",
    "     desmonte/disposicion de cubierta vieja si aplica, andamios/izaje/red anticaidas, cuadrilla y SST.",
    "   - Si son RECERTIFICACIONES ANUALES / MANTENIMIENTO DE LINEAS DE VIDA (ej. L.V.H - L.V.V,",
    "     puntos de anclaje o escaleras): NO pongas solo 1 placa y ya. Estima placas inox Res. 4272",
    "     segun la cantidad de sistemas/lineas mencionados (ej. L.V.H + L.V.V = minimo 2+ placas),",
    "     pintura anticorrosiva/limpieza para retoque de soportes y anclajes, tornilleria/consumibles",
    "     de mantenimiento, jornadas reales de tecnico instalador en alturas + auxiliar/coordinador SST",
    "     segun el alcance y transporte (1 viaje = ida y vuelta del dia).",
    "     PROHIBIDO en una recertificacion/mantenimiento agregar cable nuevo, puntos de anclaje,",
    "     postes, absorbedores, tensores o escaleras nuevas: el sistema YA EXISTE y solo se",
    "     inspecciona, limpia, retoca y prueba. Esos materiales solo van si un item cotizado o los",
    "     REQUISITOS INTERNOS dicen explicitamente 'reemplazo', 'cambio' o 'suministro' y por la",
    "     cantidad exacta que alli se indique. NUNCA inventes metros o cantidades que el texto no trae.",
    "   - Ignora textos comerciales genericos de plantilla en 'ESTA COTIZACION INCLUYE' que no",
    "     generan costo hoy (ej. 'Recertificacion gratis al ano siguiente de la instalacion').",
    "5. MANO DE OBRA, EQUIPOS DE IZAJE, INGENIERIA Y LOGISTICA (REALISTA SEGUN ESCALA):",
    "   - OBLIGATORIO incluir las 3 categorias en `lineas`: `material`, `mano_obra` y `logistica`.",
    "   - ARITMETICA EXACTA DE JORNADAS: `cant` en mano de obra SIEMPRE es PERSONAS x DIAS reales.",
    "     Ejemplo: si trabajan 2 tecnicos durante 8 dias, pon `cant: 16` (NUNCA `cant: 8`!).",
    "     Para trabajos muy cortos (<1 dia) puedes usar fracciones como `0.5` o `1` dia.",
    "   - PLAZO COMERCIAL vs. DIAS REALES EN SITIO (REGLA CRITICA):",
    "     * El 'PLAZO COMERCIAL DE ENTREGA' (ej. '10 dias calendario', '15 dias habiles') es el",
    "       tiempo maximo de programacion/entrega al cliente, NO los dias que la cuadrilla pasa",
    "       trabajando en obra. NUNCA pongas 5 o 10 dias de cuadrilla o coordinador solo porque",
    "       el plazo comercial dice '10 dias calendario'.",
    "     * Calcula las jornadas estrictamente segun el volumen fisico real de los items: instalar",
    "       unos paneles/placas, pocos puntos de anclaje o un mantenimiento puntual (<$8M) toma",
    "       tipicamente 0.5 a 1 dia real de obra, NO 5 dias.",
    "     * OBLIGATORIO incluir a quien ejecuta fisicamente el trabajo (`tecnico_alturas` y,",
    "       si aplica, `auxiliar_alturas`). PROHIBIDO poner solo `coordinador_sst` sin tecnicos",
    "       instaladores (salvo que el item cotizado sea exclusivamente acompanamiento SST).",
    "     * `coordinador_sst` SOLO va por los mismos dias reales de montaje en alturas (>2 m) de",
    "       la cuadrilla (NUNCA mas dias que los tecnicos en sitio). Si el trabajo es a nivel de",
    "       piso sin alturas, no hace falta coordinador SST.",
    "     * En obras grandes (>$20M), separa FABRICACION EN TALLER + OBRA CIVIL si aplica +",
    "       MONTAJE EN ALTURAS + COORDINADOR SST, y considera el recargo real de prestaciones/ARL",
    "       riesgo V (~35%-50% sobre jornal).",
    "   - EQUIPOS DE IZAJE Y ALTURAS (`logistica`): solo si hay columnas/postes pesados (6\"-8\"),",
    "     estructuras metalicas grandes o trabajo elevado >4m que requiera equipo, incluye alquiler",
    "     de CAMION GRUA y/o MANLIFT / andamio certificado (~1.500.000-2.500.000/dia), SALVO que la",
    "     cotizacion diga explicitamente 'No incluye andamios/grua'.",
    "   - INGENIERIA, POLIZAS Y SEGUROS CONTRACTUALES:",
    "     * PROHIBIDO agregar polizas o seguros cuando la cotizacion es menor a $20.000.000 COP,",
    "       SALVO que el texto de la cotizacion o los REQUISITOS INTERNOS ADICIONALES DEL",
    "       ADMINISTRADOR pidan explicitamente polizas/seguros.",
    "     * En obras industriales grandes (>$20M) incluye memoria de calculo estructural y planos",
    "       (~2M-4.5M), pruebas de carga, certificacion Res. 4272 y POLIZAS / SEGUROS cuando el",
    "       contrato/alcance los exija (NO usar `insumoId: polizas_certificacion` fijo de $1.8M en",
    "       contratos >$30M: pon `insumoId: null` y calcula ~1.8%-3.0% del valor vendido + IVA 19%).",
    "     * Si existen REQUISITOS INTERNOS ADICIONALES DEL ADMINISTRADOR (ej. un seguro especifico,",
    "       trabajo nocturno o andamios), OBLIGATORIAMENTE incluye cada rubro indicado con su costo real.",
    "   - TRANSPORTE Y CONSUMIBLES REALES SEGUN CIUDAD (sede: Envigado/Medellin):",
    "     * 1 `Viaje` (`transporte_obra`, $140.000) YA INCLUYE ida y vuelta completa de una jornada",
    "       en Medellin / Area Metropolitana. PROHIBIDO poner `cant: 2` viajes por 'ida y vuelta'",
    "       en un trabajo de 1 solo dia.",
    "     * Si la obra es fuera de Medellin (Rionegro, Oriente, otra ciudad) o dura varios dias",
    "       reales en sitio / requiere camion de carga para estructuras largas, suma los fletes y",
    "       peajes reales correspondientes.",
    "     * OBRA FUERA DEL VALLE DE ABURRA (cualquier municipio que no sea Medellin, Envigado,",
    "       Itagui, Sabaneta, Bello, La Estrella, Caldas, Copacabana, Girardota o Barbosa): la",
    "       tarifa de $140.000 NO aplica. Usa `insumoId: null` y agrega lineas `logistica` aparte",
    "       para (a) combustible y peajes ida y vuelta segun la distancia real por carretera desde",
    "       Envigado y (b) si el trayecto supera ~2 horas por sentido o el trabajo dura mas de un",
    "       dia, alojamiento y alimentacion por persona y por noche para toda la cuadrilla. Cuenta",
    "       tambien el tiempo de viaje como jornada de la cuadrilla y dilo en un `aviso`.",
    "     * En trabajos pequenos/puntuales, estima ferreteria menor (tuercas, arandelas, tornillos)",
    "       y consumibles a precios reales de ferreteria en Colombia (ej. $15.000-$45.000 en",
    "       tornilleria menor o 0.5 kit de consumibles si no hay soldadura pesada ni perforacion masiva).",
    "6. VERIFICACION DE SENTIDO ECONOMICO (SEPARADA POR ESCALA ANTES DE RESPONDER):",
    "   - OBRAS PEQUENAS / SERVICIOS PUNTUALES (SUBTOTAL < $15.000.000 COP):",
    "     * PROHIBIDO inflar dias de mano de obra, viajes, ferreteria o inventar polizas para",
    "       alcanzar un porcentaje minimo de costo.",
    "     * En servicios puntuales especializados, el costo directo real suele estar entre el 15%",
    "       y el 45% de la venta (margen neto real 55%-85%) porque se cobra tarifa minima de",
    "       servicio, certificacion y disponibilidad. Reporta SOLO el costo real estricto.",
    "   - OBRAS GRANDES LLAVE EN MANO (SUBTOTAL >= $20.000.000 COP):",
    "     * En proyectos integrales (suministro + fabricacion + obra civil + instalacion), el costo",
    "       directo real esta tipicamente entre el 48% y el 72% de la venta (margen 28%-52%).",
    "     * Si tu suma de costos da menos del 40% del valor vendido en una obra grande (>=$20M),",
    "       DETENTE y corrige precios de acero inoxidable, obra civil, alquiler de grua/manlift,",
    "       fabricacion en taller, jornadas reales (personas x dias), polizas y fletes antes de responder.",
    "7. Incluye SIEMPRE un `resumen` claro de 2-3 frases (sistema, fabricacion/obra civil, cuadrilla",
    "   y dias) y 2-3 `avisos` practicos. Responde solo el JSON, sin explicaciones ni ```.",
    "",
    "CATALOGO DE INSUMOS DE LA EMPRESA (id | categoria | unidad | costo COP | nombre):",
    catalogoInsumos,
  ].join("\n");
}

function esAutorizadoCostos(membresia: { role?: unknown; nombre?: unknown; email?: unknown } | null) {
  if (!membresia) return false;
  const role = String(membresia.role ?? "").toLowerCase().trim();
  if (["admin", "superadmin", "owner", "administrador"].includes(role)) return true;
  const nombre = String(membresia.nombre ?? "").toLowerCase().trim();
  const email = String(membresia.email ?? "").toLowerCase().trim();
  return (
    email === "cristiandel48@gmail.com" ||
    nombre.includes("camila") ||
    nombre.includes("sepulveda") ||
    nombre.includes("sepúlveda") ||
    email.includes("camila")
  );
}

// Origenes que pueden llamar esta funcion desde un navegador (hallazgo S13).
// Antes era «*»: cualquier pagina podia usarla con la sesion de quien la
// visitara. La llamada igual exige sesion; esto cierra la puerta a otros
// sitios. Se puede ampliar con ORIGENES_PERMITIDOS (separados por coma).
const ORIGENES = (Deno.env.get("ORIGENES_PERMITIDOS") ??
  "https://ingeanclajes.pages.dev,http://localhost:5173,http://127.0.0.1:5173")
  .split(",").map((o) => o.trim()).filter(Boolean);

function conOrigenPermitido(manejar: (req: Request) => Response | Promise<Response>) {
  return async (req: Request) => {
    const origen = req.headers.get("origin") ?? "";
    const respuesta = await manejar(req);
    const cabeceras = new Headers(respuesta.headers);
    cabeceras.set("Access-Control-Allow-Origin", ORIGENES.includes(origen) ? origen : ORIGENES[0]);
    cabeceras.set("Vary", "Origin");
    return new Response(respuesta.body, { status: respuesta.status, statusText: respuesta.statusText, headers: cabeceras });
  };
}

Deno.serve(conOrigenPermitido(async (peticion) => {
  if (peticion.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (peticion.method !== "POST") return responder({ error: "Método no permitido" }, 405);

  const clave = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("IA_API_KEY");
  if (!clave) {
    return responder({
      error: "Falta configurar la clave de la IA. En Supabase: Edge Functions > Secrets > GROQ_API_KEY.",
    }, 500);
  }

  // Solo alguien con sesion abierta en la empresa puede usar esto. Sin esta
  // comprobacion la funcion queda abierta a internet y cualquiera gasta la
  // cuota.
  const autorizacion = peticion.headers.get("Authorization") ?? "";
  if (!autorizacion.startsWith("Bearer ")) {
    return responder({ error: "Falta la sesión. Vuelve a iniciar sesión." }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: autorizacion } } },
    );
    const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
    if (errorUsuario || !user) {
      return responder({ error: "Tu sesión expiró. Inicia sesión de nuevo." }, 401);
    }

    // Una sesion no basta: si el registro publico estuviera abierto, cualquiera
    // crearia una cuenta y gastaria la cuota. Tiene que ser miembro activo de
    // una empresa del sistema (su propia fila en memberships la puede leer).
    const { data: membresias, error: errorMembresia } = await supabase
      .schema("app")
      .from("memberships")
      .select("user_id, role, nombre, email")
      .eq("user_id", user.id)
      .eq("activo", true)
      .limit(1);
    if (errorMembresia || !membresias?.length) {
      return responder({ error: "Tu cuenta no tiene acceso activo a ninguna empresa." }, 403);
    }

    const cuerpo = await peticion.json();
    const modo = String(cuerpo?.modo ?? "cotizacion");

    let systemPrompt = "";
    let userPrompt = "";

    if (modo === "estimar_costos") {
      if (!esAutorizadoCostos(membresias[0])) {
        return responder({ error: "Solo administradores pueden usar la estimación interna de costos." }, 403);
      }

      const proyecto = cuerpo?.proyecto && typeof cuerpo.proyecto === "object" ? cuerpo.proyecto : {};
      const items = Array.isArray(cuerpo?.items) ? cuerpo.items : [];
      const insumosCatalogo = Array.isArray(cuerpo?.insumosCatalogo) ? cuerpo.insumosCatalogo : [];

      if (
        !items.length &&
        !String(proyecto?.titulo ?? "").trim() &&
        !String(proyecto?.saludo ?? "").trim() &&
        !String(proyecto?.alcance ?? "").trim() &&
        !String(proyecto?.requerimientoCliente ?? "").trim()
      ) {
        return responder({ error: "Agrega al menos un ítem o describe el proyecto antes de estimar costos." }, 400);
      }

      const listaInsumos = insumosCatalogo.length
        ? insumosCatalogo
            .slice(0, 120)
            .map((ins: { id?: unknown; categoria?: unknown; unidad?: unknown; costoUnitario?: unknown; nombre?: unknown }) =>
              `- ${String(ins.id ?? "")} | ${String(ins.categoria ?? "material")} | ${String(ins.unidad ?? "Und")} | ${Math.round(Number(ins.costoUnitario) || 0)} COP | ${String(ins.nombre ?? "")}`
            )
            .join("\n")
        : "- (sin catálogo de insumos)";

      let subtotalVenta = 0;
      const detalleItems = items
        .slice(0, 60)
        .map((it: { desc?: unknown; cant?: unknown; unit?: unknown; vu?: unknown }, idx: number) => {
          const c = Number(it.cant) || 0;
          const v = Math.round(Number(it.vu) || 0);
          const st = Math.round(c * v);
          subtotalVenta += st;
          return `${idx + 1}. ${String(it.desc ?? "")} — Cantidad: ${c} ${String(it.unit ?? "Und")} — Precio venta unitario: ${v} COP — Subtotal venta: ${st} COP`;
        })
        .join("\n");

      systemPrompt = construirInstruccionCostos(listaInsumos);
      userPrompt = [
        proyecto.titulo ? `TÍTULO DEL PROYECTO: ${String(proyecto.titulo).slice(0, 400)}` : "",
        proyecto.obra ? `OBRA / SITIO: ${String(proyecto.obra).slice(0, 200)}` : "",
        proyecto.ciudad ? `CIUDAD DE LA OBRA (sede empresa: Envigado/Medellín): ${String(proyecto.ciudad).slice(0, 120)}` : "",
        proyecto.tiempoEjec ? `PLAZO COMERCIAL DE ENTREGA COTIZADO (solo plazo máximo de programación/entrega al cliente; NO son días obligatorios de cuadrilla en obra): ${String(proyecto.tiempoEjec).slice(0, 200)}` : "",
        proyecto.saludo ? `FRASE DE APERTURA / ESPECIFICACIÓN TÉCNICA: ${String(proyecto.saludo).slice(0, 2500)}` : "",
        proyecto.alcance ? `ALCANCE: ${String(proyecto.alcance).slice(0, 1500)}` : "",
        proyecto.requerimientoCliente ? `ESPECIFICACIONES / REQUERIMIENTO: ${String(proyecto.requerimientoCliente).slice(0, 1500)}` : "",
        proyecto.incluyeTexto ? `ESTA COTIZACIÓN INCLUYE:\n${String(proyecto.incluyeTexto).slice(0, 1500)}` : "",
        proyecto.observaciones ? `OBSERVACIONES: ${String(proyecto.observaciones).slice(0, 1000)}` : "",
        proyecto.notasInternas ? `REQUISITOS INTERNOS ADICIONALES INDICADOS POR EL ADMINISTRADOR (PRIORIDAD MÁXIMA — INCLUIR OBLIGATORIAMENTE):\n${String(proyecto.notasInternas).slice(0, 1000)}` : "",
        subtotalVenta > 0 ? `SUBTOTAL VENTA DIRECTA DE LOS ÍTEMS: ${subtotalVenta} COP` : "",
        subtotalVenta > 0 && subtotalVenta < 15000000
          ? "ESCALA DEL PROYECTO: OBRA MENOR / SERVICIO PUNTUAL (<$15M COP). Estima estrictamente los materiales reales, jornadas reales en sitio (p. ej. 0.5 a 2 días de técnico/auxiliar según el trabajo físico; nunca infles días por el plazo comercial), 1 viaje = ida y vuelta del día, y NO agregues pólizas/seguros salvo que se pidan explícitamente."
          : "",
        cuerpo?.soloSinReceta
          ? "NOTA: Estima ÚNICAMENTE los materiales, mano de obra y consumibles para los ítems a medida listados abajo (los del catálogo ya tienen receta propia)."
          : "NOTA: Estima TODOS los materiales, componentes técnicos mencionados, mano de obra y transporte/consumibles para ejecutar el proyecto completo.",
        "ÍTEMS A ESTIMAR:",
        detalleItems || "(Basarse en título, frase de apertura y alcance del proyecto)",
      ]
        .filter(Boolean)
        .join("\n\n");
    } else {
      const { texto, catalogo } = cuerpo ?? {};
      const dictado = String(texto ?? "").trim();
      if (!dictado) return responder({ error: "No llegó ningún texto que interpretar." }, 400);
      if (dictado.length > MAX_CARACTERES) {
        return responder({ error: `El texto es muy largo (máximo ${MAX_CARACTERES} caracteres).` }, 400);
      }

      const listaCatalogo = Array.isArray(catalogo) && catalogo.length
        ? catalogo.map((linea: unknown) => "- " + String(linea)).join("\n")
        : "- (sin catálogo: deja `items` vacío y avisa que no se pudo cargar)";

      systemPrompt = construirInstruccion(listaCatalogo);
      userPrompt = dictado;
    }

    const extraerJsonDeTexto = (crudo: string) => {
      const limpio = String(crudo ?? "").trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      try {
        return JSON.parse(limpio);
      } catch {
        const ini = limpio.indexOf("{");
        const fin = limpio.lastIndexOf("}");
        if (ini >= 0 && fin > ini) {
          return JSON.parse(limpio.slice(ini, fin + 1));
        }
        throw new Error("JSON no encontrado");
      }
    };

    // En Groq, `openai/gpt-oss-120b` a veces devuelve HTTP 400 (`json_validate_failed`)
    // cuando se fuerza `response_format: json_object` en respuestas largas. Por eso
    // primero probamos con `json_object`, y si falla con 400 reintentamos el mismo
    // modelo sin `response_format` extrayendo el JSON del texto, antes de pasar a respaldo.
    const intentos = [
      { model: IA_MODELO, jsonFormat: true },
      { model: IA_MODELO, jsonFormat: false },
      { model: "openai/gpt-oss-120b", jsonFormat: false },
      { model: "openai/gpt-oss-20b", jsonFormat: true },
      { model: "openai/gpt-oss-20b", jsonFormat: false },
      { model: "meta-llama/llama-4-scout-17b-16e-instruct", jsonFormat: false },
      { model: "qwen/qwen3-32b", jsonFormat: false },
    ].filter((it, idx, arr) =>
      arr.findIndex((o) => o.model === it.model && o.jsonFormat === it.jsonFormat) === idx
    );

    let propuesta: Record<string, unknown> | null = null;
    const errores: string[] = [];
    let hubo429 = false;

    for (const intento of intentos) {
      try {
        const payload: Record<string, unknown> = {
          model: intento.model,
          temperature: 0.2,
          max_completion_tokens: 4096,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        };
        if (intento.model.startsWith("openai/gpt-oss")) {
          // "low" ahorra ~70% de tokens de razonamiento y evita agotar el límite por minuto de Groq
          payload.reasoning_effort = "low";
        }
        if (intento.jsonFormat) {
          payload.response_format = { type: "json_object" };
        }

        const resp = await fetch(IA_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clave}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (resp.ok) {
          const datos = await resp.json();
          const contenido = datos?.choices?.[0]?.message?.content ?? "";
          try {
            propuesta = extraerJsonDeTexto(contenido);
            break;
          } catch {
            errores.push(`${intento.model}: JSON inválido`);
            console.warn(`Modelo ${intento.model} devolvió texto no JSON:`, contenido.slice(0, 300));
            continue;
          }
        } else {
          const txt = await resp.text();
          errores.push(`${intento.model} (${resp.status}): ${txt.slice(0, 140)}`);
          console.warn(`Modelo ${intento.model} (jsonFormat=${intento.jsonFormat}) falló ${resp.status}:`, txt);
          if (resp.status === 429) {
            // En Groq cada modelo tiene su propio cupo por minuto: si uno da 429,
            // probamos automáticamente el siguiente modelo de la lista.
            hubo429 = true;
            continue;
          }
          if (resp.status === 401 || resp.status === 403) {
            return responder({ error: "La clave de la IA no es válida o venció. Hay que actualizarla en Supabase." }, 500);
          }
        }
      } catch (err) {
        errores.push(`${intento.model}: ${String(err).slice(0, 100)}`);
        console.warn(`Error llamando a modelo ${intento.model}:`, err);
      }
    }

    if (!propuesta) {
      console.error("Fallo la IA en todos los intentos:", errores.join(" | "));
      if (hubo429) {
        return responder({ error: "Se alcanzó el límite de uso gratuito por minuto en todos los modelos. Espera un minuto y vuelve a intentar." }, 429);
      }
      const motivo = errores[0] ? errores[0].slice(0, 200) : "";
      return responder({
        error: `El servicio de IA respondió con error. ` +
          (motivo ? `Dice: ${motivo}` : "Intenta de nuevo en un momento."),
      }, 502);
    }

    if (modo === "estimar_costos") {
      const categoriasValidas = new Set(["material", "mano_obra", "logistica"]);
      const lineas = Array.isArray(propuesta?.lineas)
        ? propuesta.lineas
            .filter((l: { nombre?: unknown; cant?: unknown }) => l && String(l.nombre ?? "").trim() && Number(l.cant) > 0)
            .map((l: { insumoId?: unknown; nombre?: unknown; categoria?: unknown; unidad?: unknown; cant?: unknown; costoUnitario?: unknown; nota?: unknown }) => ({
              insumoId: l.insumoId ? String(l.insumoId).trim() : null,
              nombre: String(l.nombre ?? "").trim(),
              categoria: categoriasValidas.has(String(l.categoria)) ? String(l.categoria) : "material",
              unidad: String(l.unidad ?? "Und").trim() || "Und",
              cant: Math.max(0.1, Number(l.cant) || 1),
              costoUnitario: Math.max(0, Math.round(Number(l.costoUnitario) || 0)),
              nota: String(l.nota ?? "").trim(),
            }))
        : [];
      return responder({
        lineas,
        resumen: String(propuesta?.resumen ?? ""),
        avisos: Array.isArray(propuesta?.avisos) ? propuesta.avisos.map(String) : [],
      });
    }

    // Se normaliza aqui para que el navegador reciba siempre la misma forma,
    // diga lo que diga el modelo.
    return responder({
      cliente: String(propuesta.cliente ?? ""),
      contacto: String(propuesta.contacto ?? ""),
      ciudad: String(propuesta.ciudad ?? ""),
      obra: String(propuesta.obra ?? ""),
      telefono: String(propuesta.telefono ?? "").replace(/\D/g, ""),
      alcance: String(propuesta.alcance ?? ""),
      items: Array.isArray(propuesta.items)
        ? propuesta.items
            .filter((item: { desc?: unknown }) => item && item.desc)
            .map((item: { desc: unknown; cant: unknown; vu: unknown }) => ({
              desc: String(item.desc),
              cant: Number(item.cant) > 0 ? Number(item.cant) : 1,
              // null = no se dicto precio, manda el catalogo.
              vu: Number(item.vu) > 0 ? Number(item.vu) : null,
            }))
        : [],
      avisos: Array.isArray(propuesta.avisos) ? propuesta.avisos.map(String) : [],
    });
  } catch (error) {
    console.error("Error armando la cotización:", error);
    return responder({ error: "No se pudo interpretar el dictado. Intenta de nuevo." }, 500);
  }
}));
