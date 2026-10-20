import { entityConfig, entityKeys } from "./entityConfig";
import { crearAlmacenFotos } from "./fotosStorage";

const DEFAULT_CHUNK_SIZE = 200;

function assertEntity(entity) {
  const cfg = entityConfig[entity];
  if (!cfg) {
    throw new Error(`Entidad no soportada: ${entity}`);
  }
  return cfg;
}

// Convierte "" (o solo espacios) en null para las columnas indicadas en cfg.coerceNullCols.
// Necesario porque Postgres rechaza el string vacío en columnas date/timestamptz/numeric/integer
// ("invalid input syntax for type date/numeric"). Solo se aplica a esas columnas, nunca a texto.
function coerceEmptyToNull(row, cols) {
  if (!cols || !cols.length) return row;
  for (const col of cols) {
    const value = row[col];
    if (typeof value === "string" && value.trim() === "") {
      row[col] = null;
    }
  }
  return row;
}

function chunkArray(items, size = DEFAULT_CHUNK_SIZE) {
  if (items.length <= size) return [items];
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function getErrorText(error) {
  return [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// Errores de DATOS: la tabla y las columnas existen, lo que la base rechaza es
// el contenido de la fila. Nunca se deben confundir con "falta la tabla",
// porque en las entidades opcionales eso los hacia desaparecer en silencio:
// el guardado fallaba, no se avisaba y el indicador decia "Guardado".
//
// Paso de verdad: una cotizacion de puntos de anclaje daba 23514 (violacion de
// CHECK). El mensaje de Postgres es 'new row for relation "cotizaciones"
// violates check constraint ...', y como el clasificador solo buscaba la
// palabra "relation" en el texto, lo tomaba por tabla inexistente.
const DATA_ERROR_CODES = new Set([
  "23502", // not null
  "23503", // clave foranea
  "23505", // clave duplicada
  "23514", // restriccion CHECK
  "22P02", // sintaxis de entrada invalida
  "22007", // formato de fecha invalido
  "42501", // permisos / RLS
]);

function isDataError(error) {
  return DATA_ERROR_CODES.has(String(error?.code ?? ""));
}

// La tabla no existe todavia (migracion sin aplicar). PostgREST responde
// PGRST205; Postgres, 42P01. El texto solo se consulta cuando no hay codigo,
// y con frases completas, no con palabras sueltas.
function isMissingRelationError(error) {
  if (isDataError(error)) return false;
  if (error?.code === "PGRST205" || error?.code === "42P01") return true;
  if (error?.code) return false;
  const text = getErrorText(error);
  return (
    text.includes("could not find the table") ||
    /relation ".*" does not exist/.test(text)
  );
}

// Falta una columna concreta (esquema viejo). Habilita el reintento con la
// fila legada, que trae menos columnas.
function isMissingColumnError(error) {
  if (isDataError(error)) return false;
  if (error?.code === "PGRST204" || error?.code === "42703") return true;
  if (error?.code) return false;
  const text = getErrorText(error);
  return (
    (text.includes("could not find the") && text.includes("column")) ||
    /column ".*" does not exist/.test(text)
  );
}

export async function resolveTenantId(supabase, preferredSlug) {
  // El orden importa: sin ORDER BY, Postgres puede devolver las membresias
  // en distinto orden entre peticiones. Con mas de una empresa eso hacia que
  // se guardara en una y se leyera de otra, y los datos "desaparecian".
  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .order("created_at", { ascending: true });

  if (membershipsError) throw membershipsError;
  if (!memberships?.length) {
    throw new Error(
      "El usuario no tiene membresias. Crea una fila en app.memberships para su usuario y tenant."
    );
  }

  const tenantIds = memberships.map((m) => m.tenant_id);

  if (preferredSlug) {
    const { data: tenantBySlug, error: tenantError } = await supabase
      .from("tenants")
      .select("id, slug, name")
      .eq("slug", preferredSlug)
      .maybeSingle();

    if (tenantError) throw tenantError;

    if (tenantBySlug && tenantIds.includes(tenantBySlug.id)) {
      return tenantBySlug.id;
    }

    // Antes se caia en silencio a otra empresa: se escribian datos donde no
    // correspondia y despues no aparecian. Es preferible fallar a la vista.
    throw new Error(
      `La empresa configurada ("${preferredSlug}") no existe o tu usuario no tiene acceso a ella. ` +
      "Revisa VITE_SUPABASE_TENANT_SLUG y la fila en app.memberships."
    );
  }

  return memberships[0].tenant_id;
}

export function createDataService({ supabase, tenantId }) {
  if (!supabase) throw new Error("Supabase client requerido");
  if (!tenantId) throw new Error("tenantId requerido");

  // Filas por consulta. Antes se pedia la tabla entera de un tiron y con las
  // fotos dentro de las filas la consulta no alcanzaba a terminar: Postgres la
  // mataba a los 8 segundos con «canceling statement due to statement timeout»,
  // y la app arrancaba sin datos y bloqueada.
  //
  // Con Supabase Pro y la separación de imágenes pesadas en cargarDetalle,
  // 100 filas por página reduce a la mitad los viajes de red sin peligro de timeout.
  const FILAS_POR_PAGINA = 100;

  // Las columnas que se piden al arrancar. Las de imagenes se quedan fuera:
  // pesan casi todo -seis informes ocupaban 75 MB- y se descargaban enteras
  // cada vez que alguien abria el programa, aunque no fuera a mirarlas. Se
  // traen despues, al abrir el registro concreto, con `cargarDetalle`.
  //
  // Las columnas se deducen de toRow() para que esto no se quede viejo: el dia
  // que se agregue una columna nueva, entra sola.
  const columnasDeLista = (cfg) => {
    if (!cfg.columnasPesadas?.length) return "*";
    try {
      const todas = Object.keys(cfg.toRow({}));
      const ligeras = todas.filter((c) => !cfg.columnasPesadas.includes(c));
      // tenant_id no sale de toRow y hace falta para saber de quien es la
      // fila. Las calculadas tampoco: las escribe un disparador y aqui solo
      // se leen, para poder decir cuantas fotos hay sin traerlas. updated_at
      // es la version del registro (ver actualizarConVersion).
      const extras = [...(cfg.columnasCalculadas ?? [])];
      if (!extras.includes("updated_at")) extras.push("updated_at");
      return ["tenant_id", ...ligeras, ...extras].join(",");
    } catch {
      // Si toRow no soporta un objeto vacio, mejor traerlo todo que romper la
      // carga: se pierde el ahorro, no los datos.
      return "*";
    }
  };

  // Entidades opcionales cuya tabla todavia no existe en la base. Importa
  // distinguirlas de una tabla vacia: sin este aviso, «no hay filas» y «no hay
  // tabla» se ven igual, y quien lee la respuesta no sabe si puede fiarse de
  // ella o debe recurrir a la copia local.
  const tablasFaltantes = new Set();

  // Lectura reducida: quien no tiene el modulo Personal no puede leer la tabla
  // completa de empleados (salarios, cuentas); lee la vista empleados_basico
  // (migracion 070). Para esas entidades:
  //   - todas las lecturas van a la vista,
  //   - solo se insertan registros nuevos (sin pedirlos de vuelta: la tabla no
  //     se puede leer), y nunca se modifican ni se borran los existentes.
  // Si la vista todavia no existe, se lee la tabla como siempre.
  const tablasLectura = new Map();
  const lecturaReducida = new Set();
  const usarTablaLectura = (entity, tabla) => {
    if (tabla) tablasLectura.set(entity, tabla);
    else {
      tablasLectura.delete(entity);
      lecturaReducida.delete(entity);
    }
  };
  const tablaParaLeer = (entity, cfg) => (lecturaReducida.has(entity) ? tablasLectura.get(entity) : cfg.table);

  // Fotos en Storage (migracion 071, ver fotosStorage.js). Solo las columnas
  // pesadas: ahi estan las fotos, y son las que no se traen al arrancar, asi
  // que descargarlas no retrasa la entrada.
  const fotos = supabase.storage ? crearAlmacenFotos({ supabase, tenantId }) : null;
  const columnasConFotos = (cfg) => (fotos && cfg.columnasPesadas?.length ? cfg.columnasPesadas : null);
  const cambiarFotos = async (cfg, fila, cambiar) => {
    const columnas = columnasConFotos(cfg);
    if (!columnas || !fila) return fila;
    const copia = { ...fila };
    for (const columna of columnas) {
      if (columna in copia) copia[columna] = await cambiar(copia[columna]);
    }
    return copia;
  };
  const subirFotos = (cfg, filas) => Promise.all(filas.map((fila) => cambiarFotos(cfg, fila, fotos?.paraGuardar)));
  const mostrarFotos = (cfg, fila) => cambiarFotos(cfg, fila, fotos?.paraMostrar);

  // Version de cada registro tal como se descargo: su updated_at, que la base
  // cambia en cada modificacion. Al guardar, un registro solo se actualiza si
  // en la base sigue esa misma version; si otra persona lo cambio entretanto,
  // no se pisa (ver actualizarConVersion). Las tablas sin updated_at se
  // guardan como siempre.
  const versiones = new Map();
  const tablasConVersion = new Set();
  const claveVersion = (entity, id) => `${entity}:${id}`;
  const anotarVersion = (entity, fila) => {
    if (!fila || !fila.id || !Object.prototype.hasOwnProperty.call(fila, "updated_at")) return;
    tablasConVersion.add(entity);
    if (fila.updated_at) versiones.set(claveVersion(entity, fila.id), fila.updated_at);
  };

  const list = async (entity) => {
    const cfg = assertEntity(entity);
    tablasFaltantes.delete(entity);
    const filas = [];
    let desde = 0;
    // Se puede degradar a "*" a mitad si la base todavia no tiene las columnas
    // de contadores; por eso no es constante.
    let columnas = columnasDeLista(cfg);
    // Se ordena por updated_at, que tienen todas las tablas. Si alguna no la
    // tiene se pide sin orden: es preferible una lista sin ordenar a que se
    // caiga la carga entera y la aplicacion se quede sin NINGUN dato, que es
    // lo que pasaba con el catalogo -«column catalogo_items.updated_at does
    // not exist»-.
    let ordenar = true;
    // Tabla de lectura: la vista reducida si esta persona no puede leer la
    // tabla completa (ver usarTablaLectura).
    let tabla = tablasLectura.get(entity) || cfg.table;
    if (tabla !== cfg.table) columnas = "*";

    for (;;) {
      let consulta = supabase
        .from(tabla)
        .select(columnas)
        .eq("tenant_id", tenantId);
      if (ordenar) consulta = consulta.order("updated_at", { ascending: true });

      const { data, error } = await consulta
        .range(desde, desde + FILAS_POR_PAGINA - 1);

      if (error) {
        // La vista reducida todavia no existe (migracion 070 sin aplicar): se
        // lee la tabla completa, como antes.
        if (tabla !== cfg.table && isMissingRelationError(error)) {
          console.warn(`[${cfg.table}] no existe ${tabla}; se lee la tabla completa.`);
          tabla = cfg.table;
          columnas = columnasDeLista(cfg);
          filas.length = 0;
          desde = 0;
          continue;
        }
        if (cfg.optional && isMissingRelationError(error)) {
          tablasFaltantes.add(entity);
          return [];
        }
        // La aplicacion puede llegar antes que la migracion que crea los
        // contadores. Si falta una columna se pide todo, como siempre: se
        // pierde el ahorro de esa carga, pero el programa abre igual. Sin
        // esto, el orden de publicacion dejaria a todo el mundo sin datos.
        if (isMissingColumnError(error) && columnas !== "*") {
          console.warn(
            `[${cfg.table}] faltan columnas del esquema nuevo; se carga la tabla entera. ` +
            "Ejecuta las migraciones pendientes para recuperar el ahorro."
          );
          columnas = "*";
          filas.length = 0;
          desde = 0;
          continue;
        }

        // La que falta puede ser la de ordenar. Sin orden se carga igual.
        if (isMissingColumnError(error) && ordenar) {
          console.warn(`[${cfg.table}] no tiene updated_at; se carga sin ordenar.`);
          ordenar = false;
          filas.length = 0;
          desde = 0;
          continue;
        }
        throw error;
      }

      const lote = data ?? [];
      filas.push(...lote);
      // Una pagina incompleta significa que ya no queda nada mas.
      if (lote.length < FILAS_POR_PAGINA) break;
      desde += FILAS_POR_PAGINA;
    }

    // Leida de la vista reducida: a partir de aqui esta entidad solo inserta.
    if (tabla !== cfg.table) lecturaReducida.add(entity);
    else lecturaReducida.delete(entity);

    // Se marca lo que viene incompleto. La marca es la que impide despues que
    // un guardado deje sin fotos un registro que solo se cargo a medias.
    const parcial = columnas !== "*" && tabla === cfg.table;
    // Normalmente no traen columnas pesadas; si la carga se degrado a "*", si.
    if (!parcial && columnasConFotos(cfg)) {
      for (let i = 0; i < filas.length; i += 1) filas[i] = await mostrarFotos(cfg, filas[i]);
    }
    return filas.map((fila) => {
      anotarVersion(entity, fila);
      const item = cfg.fromRow(fila);
      return parcial ? { ...item, __parcial: true } : item;
    });
  };

  /**
   * Trae UN registro completo, con las columnas de imagenes. Se llama al abrir
   * un informe, una obra o una cotizacion.
   */
  const cargarDetalle = async (entity, id) => {
    const cfg = assertEntity(entity);
    if (!id) return null;

    const { data, error } = await supabase
      .from(tablaParaLeer(entity, cfg))
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (cfg.optional && isMissingRelationError(error)) return null;
      throw error;
    }
    // Lo que se acaba de traer es lo vigente: su version pasa a ser la conocida.
    anotarVersion(entity, data);
    return data ? cfg.fromRow(await mostrarFotos(cfg, data)) : null;
  };

  const upsertMany = async (entity, items) => {
    const cfg = assertEntity(entity);
    const prepared = (items ?? [])
      .filter((item) => item && item.id)
      .map((item) => {
        const row = coerceEmptyToNull(
          {
            tenant_id: tenantId,
            ...cfg.toRow(item),
          },
          cfg.coerceNullCols
        );

        // ESTO ES LO QUE EVITA PERDER LAS FOTOS. Si el registro se cargo sin
        // las columnas pesadas, toRow() las arma vacias -no estaban en
        // memoria- y guardarlas asi borraria de la base las fotos de verdad.
        // Se quitan del envio: lo que no se trajo, no se pisa.
        if (item.__parcial && cfg.columnasPesadas?.length) {
          for (const columna of cfg.columnasPesadas) delete row[columna];
        }

        return { source: item, row };
      });

    if (!prepared.length) return;

    // Postgres no acepta que un mismo INSERT ... ON CONFLICT traiga dos veces
    // la misma clave: responde «ON CONFLICT DO UPDATE command cannot affect
    // row a second time» y se pierde el guardado ENTERO, no solo la fila
    // repetida. Pasa cuando en pantalla quedan dos registros con el mismo id
    // -una cotizacion duplicada, un consecutivo que se repitio-.
    //
    // Se manda uno solo, el ultimo, que es lo que habria quedado guardandolos
    // uno detras de otro. El aviso queda en la consola para poder rastrear de
    // donde salio el repetido.
    const porId = new Map();
    for (const item of prepared) porId.set(item.row.id, item);
    const unicos = [...porId.values()];
    if (unicos.length < prepared.length) {
      const repetidos = prepared.length - unicos.length;
      console.warn(
        `[${cfg.table}] ${repetidos} ${repetidos === 1 ? "registro repetido" : "registros repetidos"} al guardar. ` +
        "Se conserva el ultimo de cada id."
      );
    }

    const chunks = chunkArray(unicos);
    for (const chunk of chunks) {
      const rows = await subirFotos(cfg, chunk.map((item) => item.row));
      const { error } = await supabase
        .from(cfg.table)
        .upsert(rows, { onConflict: "tenant_id,id" });
      if (!error) continue;

      if (cfg.optional && isMissingRelationError(error)) {
        return;
      }

      if (cfg.toLegacyRow && isMissingColumnError(error)) {
        const legacyRows = await subirFotos(cfg, chunk.map((item) =>
          coerceEmptyToNull(
            {
              tenant_id: tenantId,
              ...cfg.toLegacyRow(item.source),
            },
            cfg.coerceNullCols
          )
        ));
        const { error: legacyError } = await supabase
          .from(cfg.table)
          .upsert(legacyRows, { onConflict: "tenant_id,id" });
        if (!legacyError) continue;
        throw legacyError;
      }

      throw error;
    }
  };

  // Registros NUEVOS: se insertan, no se hace upsert. El numero lo calcula el
  // navegador como «el mayor que conozco + 1», y con dos personas trabajando
  // a la vez -o una pestaña abierta desde hace horas- los dos sacan el mismo.
  // Con upsert, el segundo borraba sin aviso el registro del primero. Con
  // insert la base rechaza el repetido (23505) y aqui se le busca el siguiente
  // numero libre consultando la base. Devuelve los cambios hechos para que la
  // aplicacion actualice su copia: [{ entity, viejo, nuevo, campos }].
  const insertMany = async (entity, items) => {
    const cfg = assertEntity(entity);
    const cambios = [];
    const nuevos = (items ?? []).filter((item) => item && item.id);
    if (!nuevos.length) return cambios;

    const armarFila = (item, id, legacy = false) => coerceEmptyToNull(
      { tenant_id: tenantId, ...(legacy && cfg.toLegacyRow ? cfg.toLegacyRow(item) : cfg.toRow(item)), id },
      cfg.coerceNullCols
    );
    // La base puede corregir el numero de la cotizacion (migracion 065): se
    // pide de vuelta para que la aplicacion muestre el que quedo.
    const columnasDevueltas = [
      "id",
      ...(cfg.table === "cotizaciones" ? ["numero"] : []),
      ...(tablasConVersion.has(entity) ? ["updated_at"] : []),
    ].join(", ");
    const reservados = new Set();

    const siguienteLibre = async (idOcupado) => {
      const partes = String(idOcupado).match(/^([A-Za-z]+)-(\d+)$/);
      if (!partes) return `${idOcupado}-${Date.now().toString(36)}`;
      const [, prefijo, numero] = partes;
      const { data, error } = await supabase
        .from(tablaParaLeer(entity, cfg))
        .select("id")
        .eq("tenant_id", tenantId)
        .like("id", `${prefijo}-%`);
      if (error) throw error;
      let mayor = 0;
      for (const fila of [...(data ?? []), ...[...reservados].map((id) => ({ id }))]) {
        const m = String(fila.id).match(new RegExp(`^${prefijo}-(\\d+)$`, "i"));
        if (m) mayor = Math.max(mayor, parseInt(m[1], 10));
      }
      return `${prefijo}-${String(mayor + 1).padStart(numero.length, "0")}`;
    };

    // Para saber si lo que hay en la base es este mismo registro. No cuentan
    // la autoria ni lo que calcula la base (los rellenan triggers), y vacio y
    // nulo se tratan igual.
    const huella = (fila) => JSON.stringify(
      Object.keys(fila)
        .filter((k) => !/^(creado|modificado)_/.test(k) && !(cfg.columnasCalculadas || []).includes(k))
        // El numero de cotizacion lo puede corregir la base (migracion 065).
        .filter((k) => !(cfg.table === "cotizaciones" && k === "numero"))
        .sort()
        .map((k) => [k, fila[k] === "" || fila[k] === undefined ? null : fila[k]])
    );

    const anotarNumero = (item, fila) => {
      if (fila?.numero !== undefined && fila.numero !== (item.numero ?? null)) {
        cambios.push({ entity, viejo: item.id, nuevo: item.id, campos: { numero: fila.numero } });
      }
    };

    // Primero en bloque, que es lo normal: ningun numero repetido. Solo si la
    // base rechaza alguno se pasa a uno por uno para saber cual.
    // Con lectura reducida la tabla no se puede leer: pedir de vuelta lo
    // insertado haria fallar el insert. Se inserta sin pedir nada.
    const insertar = async (filas, una = false) => {
      const conFotos = await subirFotos(cfg, [].concat(filas));
      let consulta = supabase.from(cfg.table).insert(una ? conFotos[0] : conFotos);
      if (lecturaReducida.has(entity)) return consulta;
      consulta = consulta.select(columnasDevueltas);
      return una ? consulta.maybeSingle() : consulta;
    };

    const pendientes = [];
    for (const chunk of chunkArray(nuevos)) {
      const { data, error } = await insertar(chunk.map((item) => armarFila(item, item.id)));
      if (!error) {
        const porId = new Map((data ?? []).map((fila) => [fila.id, fila]));
        for (const fila of data ?? []) anotarVersion(entity, fila);
        for (const item of chunk) {
          reservados.add(item.id);
          anotarNumero(item, porId.get(item.id));
        }
        continue;
      }
      if (cfg.optional && isMissingRelationError(error)) return cambios;
      pendientes.push(...chunk);
    }

    for (const item of pendientes) {
      let id = item.id;
      let legacy = false;
      let guardado = false;
      for (let intento = 0; intento < 6 && !guardado; intento += 1) {
        const { data, error } = await insertar(armarFila(item, id, legacy), true);

        if (!error) {
          guardado = true;
          reservados.add(id);
          anotarVersion(entity, data);
          if (id !== item.id) {
            const campos = {};
            if (data?.numero !== undefined && data.numero !== (item.numero ?? null)) campos.numero = data.numero;
            cambios.push({ entity, viejo: item.id, nuevo: id, campos });
          } else {
            anotarNumero(item, data);
          }
          break;
        }

        if (cfg.optional && isMissingRelationError(error)) return cambios;
        if (!legacy && cfg.toLegacyRow && isMissingColumnError(error)) {
          legacy = true;
          intento -= 1;
          continue;
        }
        if (error.code === "23505") {
          // Puede ser este mismo registro: un guardado anterior alcanzo a
          // insertarlo y fallo despues, antes de anotarlo como guardado. Si en
          // la base esta igual, ya quedo; renumerarlo lo duplicaria.
          if (id === item.id) {
            const enBase = await cargarDetalle(entity, id).catch(() => null);
            const mismo = enBase &&
              huella(armarFila(enBase, id, legacy)) === huella(armarFila(item, id, legacy));
            if (mismo) {
              guardado = true;
              reservados.add(id);
              break;
            }
          }
          // El numero es de otro registro: se busca el siguiente libre.
          id = await siguienteLibre(id);
          if (id !== item.id) {
            console.warn(`[${cfg.table}] ${item.id} ya existia en la base; se guarda como ${id}.`);
          }
          continue;
        }
        throw error;
      }
      // Nunca se da por guardado lo que no entro: el autoguardado lo reintenta.
      if (!guardado) {
        throw new Error(`No se encontró un número libre para ${item.id} en ${cfg.table}. Recarga la página e intenta de nuevo.`);
      }
    }
    return cambios;
  };

  // Tablas que se guardan sin control de version. empresa_config la escriben
  // todos a cada rato (la hora de la ultima conexion de cada uno): con control
  // daria avisos de «otra persona lo cambio» sin parar y sin sentido.
  const SIN_CONTROL_DE_VERSION = new Set(["empresa_config"]);

  const refrescarVersiones = async (entity, ids) => {
    const cfg = assertEntity(entity);
    for (const chunk of chunkArray(ids)) {
      const { data, error } = await supabase
        .from(cfg.table)
        .select("id, updated_at")
        .eq("tenant_id", tenantId)
        .in("id", chunk);
      if (!error) for (const fila of data ?? []) anotarVersion(entity, fila);
    }
  };

  // Registros que YA EXISTIAN. Antes se guardaban con upsert: si dos personas
  // editaban la misma obra, ganaba la ultima en guardar y los cambios de la
  // otra se perdian sin aviso. Ahora cada uno se actualiza solo si en la base
  // sigue en la version que se descargo. Si no, no se toca y se devuelve como
  // conflicto, con lo que hay en la base, para que la persona decida.
  //
  // `forzados` son los ids que la persona ya decidio guardar igual («guardar
  // la mia»): esos van con upsert, como antes.
  const actualizarConVersion = async (entity, items, forzados = new Set()) => {
    const cfg = assertEntity(entity);
    const conflictos = [];
    const lista = (items ?? []).filter((item) => item && item.id);
    if (!lista.length) return { conflictos };

    const conControl = tablasConVersion.has(entity) && !SIN_CONTROL_DE_VERSION.has(entity);
    const usaVersion = (item) =>
      conControl && !forzados.has(item.id) && Boolean(versiones.get(claveVersion(entity, item.id)));

    // Sin version conocida o con la decision ya tomada: como siempre.
    const libres = lista.filter((item) => !usaVersion(item));
    if (libres.length) {
      await upsertMany(entity, libres);
      if (tablasConVersion.has(entity)) await refrescarVersiones(entity, libres.map((item) => item.id));
    }

    const armar = (item, legacy) => {
      const row = coerceEmptyToNull(
        { tenant_id: tenantId, ...(legacy && cfg.toLegacyRow ? cfg.toLegacyRow(item) : cfg.toRow(item)) },
        cfg.coerceNullCols
      );
      // Igual que en upsertMany: lo que no se trajo (fotos) no se pisa.
      if (item.__parcial && cfg.columnasPesadas?.length) {
        for (const columna of cfg.columnasPesadas) delete row[columna];
      }
      return row;
    };

    const actualizarUno = async (item) => {
      const version = versiones.get(claveVersion(entity, item.id));
      let legacy = false;
      for (;;) {
        const [fila] = await subirFotos(cfg, [armar(item, legacy)]);
        const { data, error } = await supabase
          .from(cfg.table)
          .update(fila)
          .eq("tenant_id", tenantId)
          .eq("id", item.id)
          .eq("updated_at", version)
          .select("id, updated_at");
        if (error) {
          if (!legacy && cfg.toLegacyRow && isMissingColumnError(error)) {
            legacy = true;
            continue;
          }
          throw error;
        }
        if (data?.length) {
          anotarVersion(entity, data[0]);
          return;
        }
        // Ninguna fila con esa version: otra persona lo cambio o lo borro.
        const { data: actual, error: errActual } = await supabase
          .from(cfg.table)
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("id", item.id)
          .maybeSingle();
        if (errActual) throw errActual;
        conflictos.push({
          entity,
          item,
          enBase: actual ? cfg.fromRow(await mostrarFotos(cfg, actual)) : null,
          versionBase: actual?.updated_at ?? null,
        });
        return;
      }
    };

    // De a cinco a la vez: un cambio que toca muchos registros (la nomina de
    // todo el personal) no se hace eterno, y la base no se satura.
    const controlados = lista.filter(usaVersion);
    for (let i = 0; i < controlados.length; i += 5) {
      await Promise.all(controlados.slice(i, i + 5).map(actualizarUno));
    }
    return { conflictos };
  };

  // La persona eligio quedarse con lo que hay en la base: esa pasa a ser la
  // version conocida del registro.
  const fijarVersion = (entity, id, version) => {
    if (version) versiones.set(claveVersion(entity, id), version);
    else versiones.delete(claveVersion(entity, id));
  };

  const deleteMany = async (entity, ids) => {
    const cfg = assertEntity(entity);
    const safeIds = (ids ?? []).filter(Boolean);
    if (!safeIds.length) return;

    const chunks = chunkArray(safeIds);
    for (const idChunk of chunks) {
      const { error } = await supabase
        .from(cfg.table)
        .delete()
        .eq("tenant_id", tenantId)
        .in("id", idChunk);
      if (error) {
        if (cfg.optional && isMissingRelationError(error)) {
          return;
        }
        throw error;
      }
    }
  };

  const replaceAll = async (entity, items) => {
    const current = await list(entity);
    const currentIds = new Set(current.map((item) => item.id));
    const nextIds = new Set((items ?? []).map((item) => item?.id).filter(Boolean));

    const idsToDelete = [];
    currentIds.forEach((id) => {
      if (!nextIds.has(id)) idsToDelete.push(id);
    });

    await upsertMany(entity, items ?? []);
    await deleteMany(entity, idsToDelete);
  };

  // Carga optimizada con Supabase Pro:
  // Al tener mayor capacidad de conexiones y haber separado las fotos a cargarDetalle,
  // cargamos en lotes paralelos de 5 tablas a la vez. Reduce el arranque de ~3.5s a <700ms.
  const loadAll = async () => {
    const resultado = {};
    const CONCURRENCIA = 5;
    for (let i = 0; i < entityKeys.length; i += CONCURRENCIA) {
      const lote = entityKeys.slice(i, i + CONCURRENCIA);
      const respuestas = await Promise.all(
        lote.map(async (entity) => ({
          entity,
          data: await list(entity),
        }))
      );
      for (const { entity, data } of respuestas) {
        resultado[entity] = data;
      }
    }
    return resultado;
  };

  return {
    tenantId,
    tablasFaltantes,
    list,
    cargarDetalle,
    upsertMany,
    insertMany,
    actualizarConVersion,
    fijarVersion,
    deleteMany,
    replaceAll,
    loadAll,
    usarTablaLectura,
    lecturaReducida,
  };
}
