import { createDataService, resolveTenantId } from "./dataService";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";

const ENTITY_TO_STATE = {
  obras: "obras",
  empleados: "empleados",
  cargos: "cargos",
  pagos: "pagos",
  horarios: "horarios",
  certificaciones: "certs",
  informes: "informes",
  clientes: "clientes",
  proveedores: "proveedores",
  cuentas: "cuentas",
  cotizaciones: "cotizaciones",
  contabilidad_config: "contabilidadConfig",
  plan_cuentas: "planCuentas",
  asientos_contables: "asientosContables",
  nominas_generadas: "nominasGeneradasCloud",
};

// Baseline en memoria: por entidad, un Map(id -> JSON serializado de la última
// versión conocida en la nube). Permite guardar de forma incremental y, sobre todo,
// multi-usuario seguro: solo borramos los ids que ESTE cliente eliminó (estaban en el
// baseline y ya no están), nunca filas que otro usuario haya creado entretanto.
let baselineByEntity = {};

// Solo permitimos guardar después de una carga inicial EXITOSA. Si la carga falla
// (sin conexión, RLS, etc.), el estado de la app conserva los datos semilla (*_INIT);
// guardar en ese momento los escribiría a la nube y contaminaría el tenant. Mientras
// esto sea false, saveCloudAppData se niega a guardar.
let baselineLoaded = false;

function serializeForCompare(item) {
  try {
    return JSON.stringify(item);
  } catch {
    // Estructuras con referencias circulares: forzamos "siempre distinto".
    return null;
  }
}

function setBaseline(entity, items) {
  const map = new Map();
  for (const item of items ?? []) {
    if (item && item.id) {
      map.set(item.id, serializeForCompare(item));
    }
  }
  baselineByEntity[entity] = map;
}

async function getService() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase no configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
    );
  }

  const supabase = getSupabaseClient();
  const tenantId = await resolveTenantId(
    supabase,
    import.meta.env.VITE_SUPABASE_TENANT_SLUG
  );

  return createDataService({ supabase, tenantId });
}

export async function loadCloudAppData() {
  // Hasta que esta carga termine bien, no se debe guardar.
  baselineLoaded = false;

  const service = await getService();
  const cloudData = await service.loadAll();

  // Reiniciamos el baseline con lo que realmente vino de la nube.
  baselineByEntity = {};

  const result = {};
  for (const [entity, stateKey] of Object.entries(ENTITY_TO_STATE)) {
    const items = cloudData[entity] ?? [];
    setBaseline(entity, items);
    result[stateKey] = items;
  }

  baselineLoaded = true;
  return result;
}

export async function syncCloudCollection(entity, items) {
  const service = await getService();
  await service.replaceAll(entity, items ?? []);
  // replaceAll deja la nube == items, así que ese pasa a ser el baseline.
  setBaseline(entity, items ?? []);
}

export async function saveCloudAppData(appData) {
  if (!baselineLoaded) {
    throw new Error(
      "No se puede guardar todavía: los datos de la nube aún no se cargaron correctamente. Reintenta cuando haya conexión."
    );
  }

  const service = await getService();

  for (const [entity, stateKey] of Object.entries(ENTITY_TO_STATE)) {
    if (!Object.prototype.hasOwnProperty.call(appData ?? {}, stateKey)) continue;

    const items = (appData[stateKey] ?? []).filter((item) => item && item.id);
    const baseline = baselineByEntity[entity] ?? new Map();

    // 1) Upsert solo de lo nuevo o lo que cambió respecto al baseline.
    const nextMap = new Map();
    const upserts = [];
    for (const item of items) {
      const serialized = serializeForCompare(item);
      nextMap.set(item.id, serialized);
      if (serialized === null || baseline.get(item.id) !== serialized) {
        upserts.push(item);
      }
    }

    // 2) Borrar solo los ids que estaban en el baseline y este cliente eliminó.
    //    Si no hay baseline (carga falló), no borramos nada: nunca destruimos datos ajenos.
    const deletes = [];
    for (const id of baseline.keys()) {
      if (!nextMap.has(id)) deletes.push(id);
    }

    if (upserts.length) await service.upsertMany(entity, upserts);
    if (deletes.length) await service.deleteMany(entity, deletes);

    // 3) Solo tras aplicar los cambios actualizamos el baseline de esta entidad.
    baselineByEntity[entity] = nextMap;
  }
}

export function mapStateKeyToEntity(stateKey) {
  const found = Object.entries(ENTITY_TO_STATE).find(([, key]) => key === stateKey);
  return found?.[0] ?? null;
}
