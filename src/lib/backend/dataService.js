import { entityConfig, entityKeys } from "./entityConfig";

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
  // Cincuenta es un termino medio: suficientes para no hacer decenas de viajes
  // en una empresa normal, y pocas para que ninguna consulta se acerque al
  // limite aunque las filas lleven fotos.
  const FILAS_POR_PAGINA = 50;

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
      // se leen, para poder decir cuantas fotos hay sin traerlas.
      return ["tenant_id", ...ligeras, ...(cfg.columnasCalculadas ?? [])].join(",");
    } catch {
      // Si toRow no soporta un objeto vacio, mejor traerlo todo que romper la
      // carga: se pierde el ahorro, no los datos.
      return "*";
    }
  };

  const list = async (entity) => {
    const cfg = assertEntity(entity);
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

    for (;;) {
      let consulta = supabase
        .from(cfg.table)
        .select(columnas)
        .eq("tenant_id", tenantId);
      if (ordenar) consulta = consulta.order("updated_at", { ascending: true });

      const { data, error } = await consulta
        .range(desde, desde + FILAS_POR_PAGINA - 1);

      if (error) {
        if (cfg.optional && isMissingRelationError(error)) {
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

    // Se marca lo que viene incompleto. La marca es la que impide despues que
    // un guardado deje sin fotos un registro que solo se cargo a medias.
    const parcial = columnas !== "*";
    return filas.map((fila) => {
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
      .from(cfg.table)
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (cfg.optional && isMissingRelationError(error)) return null;
      throw error;
    }
    return data ? cfg.fromRow(data) : null;
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
      const rows = chunk.map((item) => item.row);
      const { error } = await supabase
        .from(cfg.table)
        .upsert(rows, { onConflict: "tenant_id,id" });
      if (!error) continue;

      if (cfg.optional && isMissingRelationError(error)) {
        return;
      }

      if (cfg.toLegacyRow && isMissingColumnError(error)) {
        const legacyRows = chunk.map((item) =>
          coerceEmptyToNull(
            {
              tenant_id: tenantId,
              ...cfg.toLegacyRow(item.source),
            },
            cfg.coerceNullCols
          )
        );
        const { error: legacyError } = await supabase
          .from(cfg.table)
          .upsert(legacyRows, { onConflict: "tenant_id,id" });
        if (!legacyError) continue;
        throw legacyError;
      }

      throw error;
    }
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

  // Las tablas se piden UNA DETRAS DE OTRA, no todas a la vez.
  //
  // En paralelo, quince consultas pesadas competian por el puñado de conexiones
  // que da el plan gratuito: se estorbaban entre ellas, cada una tardaba mas y
  // acababan agotando el tiempo justo las que traian fotos. De a una tardan un
  // poco mas en total, pero llegan.
  const loadAll = async () => {
    const resultado = {};
    for (const entity of entityKeys) {
      resultado[entity] = await list(entity);
    }
    return resultado;
  };

  return {
    tenantId,
    list,
    cargarDetalle,
    upsertMany,
    deleteMany,
    replaceAll,
    loadAll,
  };
}
