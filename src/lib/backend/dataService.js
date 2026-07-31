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

  const list = async (entity) => {
    const cfg = assertEntity(entity);
    const { data, error } = await supabase
      .from(cfg.table)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: true });

    if (error) {
      if (cfg.optional && isMissingRelationError(error)) {
        return [];
      }
      throw error;
    }
    return (data ?? []).map(cfg.fromRow);
  };

  const upsertMany = async (entity, items) => {
    const cfg = assertEntity(entity);
    const prepared = (items ?? [])
      .filter((item) => item && item.id)
      .map((item) => ({
        source: item,
        row: coerceEmptyToNull(
          {
            tenant_id: tenantId,
            ...cfg.toRow(item),
          },
          cfg.coerceNullCols
        ),
      }));

    if (!prepared.length) return;

    const chunks = chunkArray(prepared);
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

  const loadAll = async () => {
    const entries = await Promise.all(
      entityKeys.map(async (entity) => [entity, await list(entity)])
    );
    return Object.fromEntries(entries);
  };

  return {
    tenantId,
    list,
    upsertMany,
    deleteMany,
    replaceAll,
    loadAll,
  };
}
