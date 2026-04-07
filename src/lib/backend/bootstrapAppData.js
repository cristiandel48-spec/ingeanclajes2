import { createDataService, resolveTenantId } from "./dataService";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";

const ENTITY_TO_STATE = {
  obras: "obras",
  empleados: "empleados",
  pagos: "pagos",
  horarios: "horarios",
  certificaciones: "certs",
  informes: "informes",
  clientes: "clientes",
  proveedores: "proveedores",
  cuentas: "cuentas",
  cotizaciones: "cotizaciones",
};

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
  const service = await getService();
  const cloudData = await service.loadAll();

  const result = {};
  for (const [entity, stateKey] of Object.entries(ENTITY_TO_STATE)) {
    result[stateKey] = cloudData[entity] ?? [];
  }

  return result;
}

export async function syncCloudCollection(entity, items) {
  const service = await getService();
  await service.replaceAll(entity, items ?? []);
}

export function mapStateKeyToEntity(stateKey) {
  const found = Object.entries(ENTITY_TO_STATE).find(([, key]) => key === stateKey);
  return found?.[0] ?? null;
}
