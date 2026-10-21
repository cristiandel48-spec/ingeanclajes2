// Fase 2 de R2: pasa a Supabase Storage las fotos que siguen dentro de las
// filas de informes, obras y cotizaciones.
//
// Usa el mismo modulo que la aplicacion (src/lib/backend/fotosStorage.js), asi
// que las referencias quedan identicas a las de la fase 1. Por cada registro:
//
//   1. Guarda una copia del registro en respaldo-fotos/<fecha>/ (en este
//      equipo, no en la base).
//   2. Sube sus fotos al bucket «fotos».
//   3. COMPRUEBA: descarga lo subido y verifica que, al abrir el registro, se
//      veria exactamente igual que antes. Si no, no toca nada.
//   4. Escribe las referencias con app.migrar_fotos_registro (migracion 072),
//      solo si nadie guardo el registro entretanto.
//   5. Vuelve a leerlo y confirma que quedo lo que se escribio.
//
// Sin --ejecutar solo cuenta (no escribe nada). Uso, desde la carpeta del
// proyecto, con la llave de servicio en una variable (nunca en un archivo):
//
//   $env:SUPABASE_SERVICE_ROLE_KEY = "..."      (PowerShell)
//   node scripts/migrar-fotos-storage.mjs                 # revisar
//   node scripts/migrar-fotos-storage.mjs --ejecutar      # migrar todo
//   node scripts/migrar-fotos-storage.mjs --ejecutar --tabla informes --limite 1
//   node scripts/migrar-fotos-storage.mjs --restaurar respaldo-fotos/2026-10-21T...
//
// La llave de servicio esta en Supabase -> Project Settings -> API.

import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { contarFotosDentro, migrarRegistro } from "../src/lib/backend/migrarFotos.js";

const COLUMNAS = {
  informes: ["actividades", "fotos"],
  obras: ["bitacora", "img_plano", "img_sat", "trazos", "anclajes", "geo_mediciones"],
  cotizaciones: ["fotos_cotizacion", "map_img"],
};

// ── Argumentos y conexion ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : null;
};
const EJECUTAR = args.includes("--ejecutar");
const SOLO_TABLA = opcion("--tabla");
const LIMITE = Number(opcion("--limite")) || Infinity;
const RESTAURAR = opcion("--restaurar");

function leerEnv() {
  if (!existsSync(".env")) return {};
  return Object.fromEntries(
    readFileSync(".env", "utf8").split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]])
  );
}
const env = { ...leerEnv(), ...process.env };
const URL_SUPABASE = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const LLAVE = env.SUPABASE_SERVICE_ROLE_KEY;
const SLUG = env.VITE_SUPABASE_TENANT_SLUG || "ingeanclajes";
if (!URL_SUPABASE || !LLAVE) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY. Defínela en la terminal antes de correr el script (ver el comentario de arriba).");
  process.exit(1);
}
if (SOLO_TABLA && !COLUMNAS[SOLO_TABLA]) {
  console.error(`--tabla debe ser una de: ${Object.keys(COLUMNAS).join(", ")}`);
  process.exit(1);
}

const supabase = createClient(URL_SUPABASE, LLAVE, { db: { schema: "app" }, auth: { persistSession: false } });

const { data: tenant, error: errTenant } = await supabase.from("tenants").select("id").eq("slug", SLUG).single();
if (errTenant) throw errTenant;
const TENANT = tenant.id;

// ── Utilidades ──────────────────────────────────────────────────────────────
const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;

async function leerRegistro(tabla, id) {
  const { data, error } = await supabase
    .from(tabla)
    .select(["id", "updated_at", ...COLUMNAS[tabla]].join(","))
    .eq("tenant_id", TENANT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function escribir(tabla, id, version, valores) {
  const { data, error } = await supabase.rpc("migrar_fotos_registro", {
    p_tabla: tabla, p_tenant: TENANT, p_id: id, p_version: version, p_valores: valores,
  });
  if (error) throw error;
  return data;
}

// ── Restaurar desde un respaldo ─────────────────────────────────────────────
if (RESTAURAR) {
  let restaurados = 0;
  for (const tabla of Object.keys(COLUMNAS)) {
    const carpeta = join(RESTAURAR, tabla);
    if (!existsSync(carpeta)) continue;
    for (const archivo of readdirSync(carpeta)) {
      const copia = JSON.parse(readFileSync(join(carpeta, archivo), "utf8"));
      const actual = await leerRegistro(tabla, copia.id);
      if (!actual) { console.warn(`  ${tabla} ${copia.id}: ya no existe, se omite`); continue; }
      const valores = Object.fromEntries(COLUMNAS[tabla].map((c) => [c, copia[c]]));
      const r = await escribir(tabla, copia.id, actual.updated_at, valores);
      console.log(`  ${tabla} ${copia.id}: ${r}`);
      if (r === "ok") restaurados += 1;
    }
  }
  console.log(`Restaurados: ${restaurados}`);
  process.exit(0);
}

// ── Revisar o migrar ────────────────────────────────────────────────────────
const carpetaRespaldo = join("respaldo-fotos", new Date().toISOString().replace(/[:.]/g, "-"));
const resumen = { registros: 0, fotos: 0, bytes: 0, migrados: 0, cambiados: 0, fallidos: 0, pendientes: 0 };

console.log(EJECUTAR ? "MODO EJECUTAR: se escriben cambios." : "MODO REVISAR: no se escribe nada (usa --ejecutar para migrar).");

for (const tabla of Object.keys(COLUMNAS)) {
  if (SOLO_TABLA && tabla !== SOLO_TABLA) continue;

  const { data: ids, error } = await supabase.from(tabla).select("id").eq("tenant_id", TENANT).order("id");
  if (error) throw error;
  console.log(`\n${tabla}: ${ids.length} registros`);

  let procesados = 0;
  for (const { id } of ids) {
    if (procesados >= LIMITE) break;
    const original = await leerRegistro(tabla, id);
    if (!original) continue;

    const cuenta = COLUMNAS[tabla].reduce((s, c) => {
      const f = contarFotosDentro(original[c]);
      return { n: s.n + f.n, bytes: s.bytes + f.bytes };
    }, { n: 0, bytes: 0 });
    if (!cuenta.n) continue;
    resumen.registros += 1;
    resumen.fotos += cuenta.n;
    resumen.bytes += cuenta.bytes;
    procesados += 1;

    if (!EJECUTAR) {
      console.log(`  ${id}: ${cuenta.n} fotos, ${mb(cuenta.bytes)}`);
      continue;
    }

    try {
      // 1. Respaldo local del registro tal como esta.
      mkdirSync(join(carpetaRespaldo, tabla), { recursive: true });
      writeFileSync(join(carpetaRespaldo, tabla, `${id}.json`), JSON.stringify(original));

      // 2 a 5: subir, comprobar, escribir y confirmar (src/lib/backend/migrarFotos.js).
      const r = await migrarRegistro({
        supabase,
        tenantId: TENANT,
        original,
        columnas: COLUMNAS[tabla],
        escribir: (valores) => escribir(tabla, id, original.updated_at, valores),
        releer: () => leerRegistro(tabla, id),
      });
      if (r.estado === "cambio") {
        resumen.cambiados += 1;
        console.log(`  ${id}: alguien lo guardó mientras tanto; se omite (vuelve a correr el script después)`);
        continue;
      }

      resumen.migrados += 1;
      resumen.pendientes += r.quedan;
      console.log(`  ${id}: ${r.movidas} de ${cuenta.n} fotos movidas (${mb(cuenta.bytes)})`);
    } catch (e) {
      resumen.fallidos += 1;
      console.error(`  ${id}: NO SE TOCÓ. ${e.message || e}`);
    }
  }
}

console.log("\nResumen");
console.log(`  Registros con fotos dentro: ${resumen.registros}`);
console.log(`  Fotos: ${resumen.fotos} (${mb(resumen.bytes)} como texto)`);
if (EJECUTAR) {
  console.log(`  Migrados: ${resumen.migrados}`);
  console.log(`  Omitidos porque alguien los guardó: ${resumen.cambiados}`);
  console.log(`  Fallidos (sin tocar): ${resumen.fallidos}`);
  console.log(`  Fotos que no se pudieron subir (siguen dentro): ${resumen.pendientes}`);
  console.log(`  Respaldo: ${carpetaRespaldo}`);
}
