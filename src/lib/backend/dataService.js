import { entityConfig, entityKeys } from "./entityConfig";

const DEFAULT_CHUNK_SIZE = 200;

function assertEntity(entity) {
  const cfg = entityConfig[entity];
  if (!cfg) {
    throw new Error(`Entidad no soportada: ${entity}`);
  }
  return cfg;
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

function isMissingRelationError(error) {
  const text = getErrorText(error);
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    text.includes("relation") ||
    text.includes("does not exist") ||
    text.includes("schema cache")
  );
}

function isMissingColumnError(error) {
  const text = getErrorText(error);
  return (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    text.includes("column") ||
    text.includes("schema cache")
  );
}

export async function resolveTenantId(supabase, preferredSlug) {
  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("tenant_id, role");

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
        row: {
          tenant_id: tenantId,
          ...cfg.toRow(item),
        },
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
        const legacyRows = chunk.map((item) => ({
          tenant_id: tenantId,
          ...cfg.toLegacyRow(item.source),
        }));
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
