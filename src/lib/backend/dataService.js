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

    if (error) throw error;
    return (data ?? []).map(cfg.fromRow);
  };

  const upsertMany = async (entity, items) => {
    const cfg = assertEntity(entity);
    const normalized = (items ?? [])
      .filter((item) => item && item.id)
      .map((item) => ({
        tenant_id: tenantId,
        ...cfg.toRow(item),
      }));

    if (!normalized.length) return;

    const chunks = chunkArray(normalized);
    for (const rows of chunks) {
      const { error } = await supabase
        .from(cfg.table)
        .upsert(rows, { onConflict: "tenant_id,id" });
      if (error) throw error;
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
      if (error) throw error;
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
