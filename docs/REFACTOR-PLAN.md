# Plan de Modularización — `src/App.jsx`

> **Objetivo:** dividir el monolito `src/App.jsx` (11 132 líneas) en módulos por dominio, **sin reescribir la lógica** y **sin romper la app en ningún paso**. El refactor es puramente estructural (mover código, ajustar `import`/`export`). Cada etapa termina con la app compilando y funcionando.
>
> **Estado actual de referencia:**
> - `src/App.jsx` — monolito con imports, ~14 pantallas, ~13 componentes auxiliares, ~150 helpers, datos semilla y constantes de estilo.
> - `src/lib/accounting.js` (2 029 líneas) — **ya está modularizado** y exporta 22 símbolos vía `import { ... } from "./lib/accounting"`. No se toca salvo para añadir submódulos opcionales (ver §2).
> - `src/lib/backend/` — capa de persistencia Supabase ya separada (`index.js`, `dataService.js`, `bootstrapAppData.js`, `entityConfig.js`, `supabaseClient.js`).
> - `src/main.jsx` — `AppErrorBoundary` + `SupabaseGate` envolviendo `<App/>`. **No se modifica.**
> - Sin TypeScript, sin tests, ESLint 9 configurado (`eslint.config.js`), Vite 8, React 19.

---

## 1. Inventario de la fuente actual

### 1.1 Pantallas (componentes de ruta, renderizadas según `scr`)

| Pantalla / Componente | Rango aprox. de líneas | Notas |
|---|---|---|
| `Dashboard({ctx,go})` | 39–88 | Recibe `go` (alias de `setScr`) además de `ctx`. |
| `Cotizacion({ctx})` | 89–666 | La pantalla más grande tras Contabilidad/Nómina. |
| `CotizacionPrint({c})` | 4324–4427 | Subcomponente de impresión de cotización. |
| `Planos({ctx})` | 4428–4641 | Usa `GoogleMeasureWorkspace`, geo/mapas. |
| `Pagos({ctx})` | 4642–4979 | Cuentas por cobrar. |
| `ClientesDB({ctx})` | 4980–5256 | Clientes + proveedores. |
| `CuentasPagar({ctx})` | 5257–6496 | Causación / facturas / retenciones. Muy grande. |
| `Obras({ctx})` | 6497–6639 | Lista de obras. |
| `ObraDetalle({obraId,ctx,onVolver})` | 6640–6920 | Detalle de obra (subcomponente de `Obras`). |
| `CertificacionDocumento({cert})` | 6999–7067 | Documento imprimible de certificación. |
| `CertificacionDetalle({cert,...})` | 7068–7087 | Vista previa de certificación. |
| `Certificaciones({ctx})` | 7088–7220 | Pantalla de certificaciones. |
| `Informes({ctx})` | 7221–7591 | Informes de actividades. |
| `Contabilidad({ctx})` | 7592–8906 | **La pantalla más grande (~1 300 líneas).** |
| `Financiero({ctx})` | 8907–9027 | Informe financiero. |
| `Nomina({ctx})` | 9028–10644 | **Segunda más grande (~1 600 líneas).** |
| `Horarios({ctx})` | 10645–10874 | |
| `Vencimientos({ctx})` | 10875–fin | Alertas de vencimiento de certificaciones. |
| `App()` (root) | 4093–4320 | Estado global, `ctx`, bootstrap/autosave cloud, nav, router. |

### 1.2 Componentes auxiliares / UI primitivos

| Componente | Línea | Destino sugerido |
|---|---|---|
| `Badge({estado})` | 2014 | `components/ui/Badge.jsx` |
| `Av({init,color,size})` | 2015 | `components/ui/Av.jsx` |
| `H1({title,subtitle,action})` | 2016 | `components/ui/H1.jsx` |
| `SC({label,value,color,icon,sub})` | 2017 | `components/ui/SC.jsx` (stat card) |
| `LBL({children})` | 2018 | `components/ui/LBL.jsx` |
| `PrintHeader({dual})` | 2216 | `components/print/PrintHeader.jsx` |
| `StaticMapPreview({...})` | 2181 | `components/maps/StaticMapPreview.jsx` |
| `GoogleMeasureWorkspace({...})` | 3816 | `components/maps/GoogleMeasureWorkspace.jsx` |
| `CotizacionPrint({c})` | 4324 | `screens/Cotizacion/CotizacionPrint.jsx` |
| `CertificacionDocumento` / `CertificacionDetalle` | 6999 / 7068 | `screens/Certificaciones/` |
| `ObraDetalle` | 6640 | `screens/Obras/ObraDetalle.jsx` |

### 1.3 Constantes de estilo inline (líneas 1982–1998)
`EC` (estados→color), `PAL` (paleta), `TC` (colores tipo), `SI` (estilo input), `B(bg,c)` (factory de botón), `CD` (card), `ST` (section title), `hasBrokenEncoding`, `buildCardBadge`. → **Punto crítico:** las usan casi todas las pantallas. Van a `styles/tokens.js`.

---

## 2. Agrupación de los ~150 helpers por dominio

Cada grupo va a un archivo bajo `src/lib/`. Reglas: funciones **puras** (sin JSX, sin estado) → `lib/`; con JSX → `components/`.

| Dominio | Helpers (rango/ejemplos) | Archivo destino |
|---|---|---|
| **Formato / fmt** | `fmt`, `fmtK`, `fmtD`, `fmtL`, `today`, `buildMonthDateRange`, `isDateWithinRange`, `scrollAppToTop` (768–799) | `lib/format.js` |
| **Fechas (base nómina)** | `parseIsoDate`, `diffDaysInclusive`, `toIsoDate`, `addDaysToDate`, `maxDate`, `minDate`, `round1`, `getDaysInMonth` (1039–1059) | `lib/dates.js` |
| **Cotizaciones (modelo)** | `hasAnchorPointsService`, `ensureProposalDefaultTexts`, `getQuoteProposalLabel`, `createQuoteProposalId`, `normalizeQuoteItem`, `buildQuoteProposal`, `getQuoteProposals`, `getQuoteActiveProposal`, `mergeQuoteWithProposal`, `getQuoteApprovalAccountingSnapshot`, `normalizeQuoteItems`, `normalizeProposalItems`, `getQuoteProposalTotals`, `hasVerticalLifeLineService`, `getQuoteProposalPhotos`, `getQuotePrintableProposals` (843–2358) + constantes `ITEMS_DB`, `DEFAULT_COT_*` (800–842) | `lib/cotizaciones.js` |
| **Cotizaciones (impresión)** | `buildCotizacionPrintHtml` (2358–3341), `COTIZACION_AUTO_SEND_ENDPOINTS`, `downloadGeneratedFile`, `sanitizeFileName`, `normalizeEntityKey`, `getCotizacionClientPhone/Email`, `buildCotizacionShareMessage`, `buildCotizacionEmailSubject/Body`, `openPrintTab`, `printCurrentPz` (3342–3565) | `lib/cotizacionPrint.js` |
| **Mapas / Geo** | `parseLatLngValue`, `loadLeafletAssets`, `getStaticMapCenter`, `latLngToWorldPoint`, `latLngToImagePixel`, `escapeXml`, `buildStaticMapLabelData`, `getStaticMapDimensions`, `getStaticMapLabelData`, `buildGoogleStaticMapUrl`, `loadGoogleMapsJsApi`, `measurementsToQuoteItems`, `createMapLabelOverlay`, `measurementTypeLabel`, `measurementUnitFromType`, constantes `LEAFLET_*`, `GOOGLE_MAPS_EMBED_KEY` (2020–3815) | `lib/maps.js` |
| **Impresión genérica / texto** | `escapeHtml`, `buildMeasurementNarrative`, `openPrintTab` (compartido con cotización), `printColilla`, `printVacaciones`, `printLiquidacion` (3549–3730) | `lib/print.js` (nómina) + `lib/html.js` (`escapeHtml`, `escapeXml`) |
| **Nómina** | Todo el bloque 1011–1980: `NOMINA_CO_2026`, `TIPOS_CONTRATO_LABELS`, `RECARGOS_CO_2026`, `getPctRecargo`, `buildNominaPeriodo`, `calcular*` (días, vacaciones, recargos, resumen, parafiscales, indemnización, liquidación), prestaciones (`buildPrestacionPeriod`, `calcularPrestacionSocialEmpleado`, `normalizar*`, `upsert*`), incapacidades (`INCAPACIDAD_*`, `buildIncapacidadFormDefault`, `calcularResumenIncapacidades*`), normalización de empleado/cargos, planos de banco (`buildNominaPlanoBanco*`, `padNomina*`, `downloadExcelWorkbook`, `downloadTextFile`), persistencia local (`loadStoredNominasGeneradas`, `NOMINA_GENERATED_STORAGE_KEY`, `buildNominaSnapshot`, `normalizeNomina*Record`) | `lib/nomina/` (subdividir): `nomina/constants.js`, `nomina/calculos.js`, `nomina/prestaciones.js`, `nomina/incapacidades.js`, `nomina/planoBanco.js`, `nomina/storage.js`, `nomina/excel.js` |
| **Contabilidad** | Ya externalizado en `lib/accounting.js`. Solo verificar que App.jsx no tenga helpers contables locales duplicados. | `lib/accounting.js` (sin cambios) |

> **Nota sobre `openPrintTab`:** lo usan cotizaciones y nómina. Vive en un módulo neutro (`lib/print.js`) e importado por ambos; **no** duplicarlo.

---

## 3. Árbol de archivos propuesto

```
src/
├── main.jsx                       (sin cambios)
├── SupabaseGate.jsx               (sin cambios)
├── App.jsx                        (queda: ~250 líneas: estado, ctx/Provider, nav, router)
│
├── context/
│   └── AppDataContext.jsx         (Context + Provider + hook useAppData)
│
├── data/
│   └── seed.js                    (OBRAS_INIT, EMPLEADOS_INIT, CARGOS_INIT, PAGOS_INIT,
│                                    HORARIOS_INIT, CERTIFICACIONES_INIT, INFORMES_INIT,
│                                    CLIENTES_INIT, PROVEEDORES_INIT, CUENTAS_PAGAR_INIT,
│                                    COTIZACIONES_INIT, CONTABILIDAD_CONFIG_INIT,
│                                    PLAN_CUENTAS_INIT, ASIENTOS_CONTABLES_INIT,
│                                    NOMINAS_GENERADAS_INIT, ITEMS_DB, DEFAULT_COT_*)
│
├── styles/
│   └── tokens.js                  (EC, PAL, TC, SI, B, CD, ST, buildCardBadge, hasBrokenEncoding)
│
├── components/
│   ├── ui/
│   │   ├── Badge.jsx
│   │   ├── Av.jsx
│   │   ├── H1.jsx
│   │   ├── SC.jsx
│   │   └── LBL.jsx
│   ├── print/
│   │   └── PrintHeader.jsx
│   └── maps/
│       ├── StaticMapPreview.jsx
│       └── GoogleMeasureWorkspace.jsx
│
├── screens/
│   ├── Dashboard/Dashboard.jsx
│   ├── Cotizacion/
│   │   ├── Cotizacion.jsx
│   │   └── CotizacionPrint.jsx
│   ├── Planos/Planos.jsx
│   ├── Pagos/Pagos.jsx
│   ├── Clientes/ClientesDB.jsx
│   ├── CuentasPagar/CuentasPagar.jsx
│   ├── Obras/
│   │   ├── Obras.jsx
│   │   └── ObraDetalle.jsx
│   ├── Certificaciones/
│   │   ├── Certificaciones.jsx
│   │   ├── CertificacionDocumento.jsx
│   │   └── CertificacionDetalle.jsx   (+ CERT_ELEMENTOS_*, buildCertForm)
│   ├── Informes/Informes.jsx
│   ├── Contabilidad/Contabilidad.jsx
│   ├── Financiero/Financiero.jsx
│   ├── Nomina/Nomina.jsx
│   ├── Horarios/Horarios.jsx
│   └── Vencimientos/Vencimientos.jsx
│
└── lib/
    ├── accounting.js              (sin cambios)
    ├── backend/                   (sin cambios)
    ├── format.js
    ├── dates.js
    ├── html.js
    ├── print.js
    ├── cotizaciones.js
    ├── cotizacionPrint.js
    ├── maps.js
    └── nomina/
        ├── constants.js
        ├── calculos.js
        ├── prestaciones.js
        ├── incapacidades.js
        ├── planoBanco.js
        ├── storage.js
        └── excel.js
```

> Constantes específicas de una sola pantalla (p.ej. `CERT_ELEMENTOS_DEFAULT`, `buildCertForm` en 6921–6998) se mueven junto a esa pantalla, no a `lib/`.

---

## 4. Estado global: de prop-drilling a `AppDataContext`

### 4.1 Situación actual
`App()` declara **16 pares `useState`** (líneas 4096–4111) y arma un objeto `ctx` con todos los valores + setters + `cotDraft/setCotDraft` + `setScr` + `saveAllToCloud` (línea 4148). Ese `ctx` se pasa por props a las 14 pantallas. Además hay dos `useEffect` (bootstrap cloud 4150–4196 y autosave 4198–4232) que dependen de todos los estados.

### 4.2 Diseño objetivo
Crear `context/AppDataContext.jsx`:

```jsx
const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  // mover aquí los 16 useState + cotDraft + buildCloudPayload + saveAllToCloud
  // + los dos useEffect (bootstrap y autosave)
  const value = { /* mismo shape exacto que el ctx actual */ };
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const v = useContext(AppDataContext);
  if (!v) throw new Error("useAppData fuera de AppDataProvider");
  return v;
}
```

**Clave para no reescribir todo:** el `value` del Provider **debe tener exactamente el mismo shape que el `ctx` actual** (mismos nombres de propiedades y setters). Así las pantallas siguen funcionando con `ctx.obras`, `ctx.setObras`, etc., sin cambios internos.

### 4.3 Migración incremental (sin big-bang)

1. **Paso A — Provider "transparente":** crear el Provider con el shape idéntico. En `main.jsx`, envolver `<App/>` con `<AppDataProvider>`. **De momento `App()` sigue creando su propio `ctx` y pasándolo por props** → la app no cambia de comportamiento; el Context coexiste sin usarse aún. Verificar build/dev.
2. **Paso B — `App()` consume el Provider:** mover los `useState`/`useEffect`/`saveAllToCloud` desde `App()` al Provider. `App()` pasa a hacer `const ctx = useAppData();` y sigue pasando `ctx` por props a las pantallas (sin tocar las pantallas). Verificar.
3. **Paso C — pantallas leen del hook, una a una:** a medida que se extrae cada pantalla (§6), cambiar su firma de `function Pantalla({ctx})` a `function Pantalla(){ const ctx = useAppData(); ... }`. El cuerpo no cambia porque `ctx` mantiene el mismo shape. El router en `App.jsx` deja de pasar `ctx={ctx}` para esa pantalla.
   - `Dashboard` recibe también `go` → mantener `go={setScr}` como prop, o exponer `setScr` vía el hook (ya está en `ctx`) y usar `ctx.setScr`.
4. **Paso D — opcional, optimización posterior:** cuando todo lea del hook, partir el value en sub-contexts o memoizar para reducir re-renders. **Fuera del alcance del refactor estructural inicial.**

> Regla de oro: en cada paso, `ctx` mantiene el mismo shape. Mientras eso se cumpla, no hay que reescribir lógica de pantalla.

---

## 5. Datos semilla `*_INIT`

Las constantes en líneas 667–763 (más `ITEMS_DB` 800, `DEFAULT_COT_*` 831–842) son datos puros → `src/data/seed.js`.

- Mover tal cual y exportarlas con nombre.
- **Cuidado con dependencias:** algunas semillas se derivan de funciones que viven en otros módulos:
  - `CARGOS_INIT` (682) se deriva de `EMPLEADOS_INIT` → ambas en `seed.js`, sin problema.
  - `CONTABILIDAD_CONFIG_INIT = [buildDefaultContabilidadConfig()]`, `PLAN_CUENTAS_INIT = buildDefaultPlanCuentas()` (761–762) → importan de `lib/accounting.js`. `seed.js` importa esas funciones.
  - `NOMINAS_GENERADAS_INIT = loadStoredNominasGeneradas()` (1934) → depende de `lib/nomina/storage.js`. `seed.js` importa esa función.
- `App()`/Provider importará desde `data/seed.js`. La normalización en `useState` (`EMPLEADOS_INIT.map(normalizarEmpleado)`, `normalizarCargos(CARGOS_INIT)`) se queda en el Provider, no en `seed.js` (separa datos crudos de transformación).

---

## 6. Orden de extracción recomendado

**Principio:** primero lo de **menor acoplamiento** (sin estado, sin dependencias entre sí), para crear la infraestructura de módulos y validar el patrón antes de tocar pantallas grandes. De hojas a raíz.

### Fase 0 — Infraestructura (riesgo mínimo, base de todo)
0.1. `styles/tokens.js` (EC, PAL, TC, SI, B, CD, ST, buildCardBadge, hasBrokenEncoding).
0.2. `lib/format.js`, `lib/dates.js`, `lib/html.js`.
0.3. `data/seed.js`.
> **Por qué primero:** son puros y los consume todo lo demás. Cada extracción: cortar del monolito, crear el módulo, añadir `import` en App.jsx. La app debe seguir idéntica.

### Fase 1 — UI primitivos
1.1. `components/ui/` (Badge, Av, H1, SC, LBL) — dependen solo de `tokens.js`.

### Fase 2 — Helpers de dominio puros
2.1. `lib/cotizaciones.js`
2.2. `lib/maps.js`
2.3. `lib/nomina/*` (constants → calculos → prestaciones → incapacidades → planoBanco → storage → excel)
2.4. `lib/print.js`, `lib/cotizacionPrint.js`

### Fase 3 — Context
3.1. Crear `AppDataContext` y aplicar pasos A–B de §4 (App() consume el Provider, pero **sigue** pasando ctx por props).

### Fase 4 — Pantallas, de más aislada a más acoplada
Orden por aislamiento/tamaño (las pequeñas y autónomas primero para rodar el patrón):

1. **`Horarios`** (10645–10874, ~230 líneas) — pequeña, autónoma.
2. **`Vencimientos`** (10875–fin) — pequeña, depende de `certs` + fechas.
3. **`Dashboard`** (39–88) — pequeña; ajustar `go`/`setScr`.
4. **`Financiero`** (8907–9027) — pequeña; usa accounting + format.
5. **`Planos`** (4428–4641) + `components/maps/` — saca también `StaticMapPreview` y `GoogleMeasureWorkspace`.
6. **`Obras`** + `ObraDetalle` (6497–6920).
7. **`Certificaciones`** + `CertificacionDocumento` + `CertificacionDetalle` + `CERT_*`/`buildCertForm` (6921–7220).
8. **`Informes`** (7221–7591).
9. **`Pagos`** (4642–4979).
10. **`ClientesDB`** (4980–5256).
11. **`Cotizacion`** + `CotizacionPrint` (89–666, 4324–4427) — grande, usa `lib/cotizaciones`, `lib/cotizacionPrint`, `lib/maps`.
12. **`CuentasPagar`** (5257–6496, ~1 240 líneas) — grande, retenciones/tributos.
13. **`Nomina`** (9028–10644, ~1 600 líneas) — depende de todo `lib/nomina/*`.
14. **`Contabilidad`** (7592–8906, ~1 300 líneas) — la última y más entrelazada con `lib/accounting`.

> Las tres últimas (CuentasPagar, Nomina, Contabilidad) se dejan al final porque son las más grandes y con más helpers internos; cuando se llega a ellas, casi todos sus helpers ya están en `lib/`.

### Criterios de "HECHO" por paso
- El símbolo extraído ya **no existe** en `App.jsx` (sin duplicados).
- `App.jsx` lo importa desde su nuevo módulo (o la pantalla lo importa).
- `npm run lint` sin errores nuevos (en particular `no-unused-vars` y `react-refresh/only-export-components`).
- `npm run build` compila sin errores.
- `npm run dev`: smoke test manual de la pantalla afectada (abrir, navegar, una acción de escritura).

### Cómo verificar tras cada paso
1. `npm run build` — Vite falla en imports rotos o símbolos faltantes. Es la red de seguridad principal sin tests.
2. `npm run lint`.
3. `npm run dev` + smoke test manual:
   - Navegar a la pantalla tocada y volver al Dashboard.
   - Una operación de **escritura** (crear/editar) para validar que los setters del ctx siguen llegando.
   - Si Supabase está configurado: confirmar que el **autosave** sigue disparando (revisar consola/Network ~700 ms tras un cambio) — el autosave depende de los 16 estados, no debe romperse al mover estado al Provider.
   - Probar **una impresión** (cotización o colilla) tras mover los helpers de print.
4. `git commit` por cada módulo/pantalla → diffs pequeños y reversibles.

---

## 7. Riesgos y reglas para no romper

1. **No hay TypeScript ni tests** → la única validación automática es `build` + `lint`. Por eso los pasos son **pequeños y atómicos** (un módulo por commit) y siempre con smoke test.
2. **Helpers compartidos entre pantallas.** Antes de mover un helper, buscar todos sus usos (`Grep` del nombre) para asegurarse de exportarlo y de importarlo en cada consumidor. Casos conocidos:
   - `openPrintTab` → cotización **y** nómina.
   - `fmt`/`fmtD`/`fmtL` → prácticamente todas las pantallas.
   - `B`, `SI`, `CD`, `ST`, `EC` (estilos) → casi todas.
   - `getQuote*` / `buildCotizacionPrintHtml` → Cotización y posiblemente Pagos/Obras (verificar).
3. **Estilos inline + factory `B(bg,c)`.** `B` es una función, no un objeto; al moverla a `tokens.js` debe exportarse como función. No convertir a CSS modules en este refactor (cambio de comportamiento). Mantener los estilos inline tal cual; solo cambiar de dónde se importan las constantes.
4. **Dependencias circulares.** Riesgo si un `lib/` importa de una pantalla o si `seed.js` importa de un módulo que a su vez importa `seed.js`. Regla: `lib/` y `data/` **solo** dependen de otros `lib/`/`data/` o de `accounting.js`; **nunca** de `components/`, `screens/` o `App.jsx`. La dirección de imports es siempre `screens → components/lib/data → lib base`.
5. **Orden de evaluación de constantes derivadas.** `CONTABILIDAD_CONFIG_INIT`, `PLAN_CUENTAS_INIT` y `NOMINAS_GENERADAS_INIT` se calculan al cargar el módulo llamando funciones. Al moverlas a `seed.js`, asegurar que las funciones (`buildDefaultPlanCuentas`, `loadStoredNominasGeneradas`) estén importadas antes de usarse. `loadStoredNominasGeneradas` toca `localStorage` en tiempo de import → debe ser segura en ese contexto (ya lo es hoy; conservar el `try/catch`).
6. **El shape del `ctx` no debe cambiar** (ver §4). Si se renombra una propiedad, se rompen todas las pantallas a la vez. Mantener nombres idénticos: `obras/setObras/...`, `cotDraft/setCotDraft`, `setScr`, `saveAllToCloud`.
7. **`react-refresh/only-export-components`.** Esta regla de ESLint exige que un archivo de componente exporte solo componentes. **No** poner helpers que no son componentes en los archivos `.jsx` de pantalla; sacarlos a `.js` en `lib/`. Esto refuerza la separación propuesta.
8. **Assets e imports de imagen.** `logoIngeanclajes`, `articoLineaVidaVertical` (líneas 2–3) y `LOGO_INGEANCLAJES` se usan en `App.jsx` (sidebar) y en impresiones/headers. Mantener un único punto de import (p.ej. `components/print/PrintHeader.jsx` y `App.jsx`) o reexportar desde un `assets/index.js`. Verificar que `PrintHeader` y `CotizacionPrint` reciban las imágenes correctamente tras moverse.
9. **`backend` (`import * as backend`).** No tocar la capa Supabase. `loadCloudAppData`/`saveCloudAppData`/`isSupabaseConfigured` se mueven con el Provider (consumidor), no con la pantalla.
10. **Doble render de StrictMode.** `main.jsx` usa `<StrictMode>`; los `useEffect` de bootstrap/autosave ya están escritos para tolerar doble montaje (`cancel` flag, `bootstrappedRef`). Al mover al Provider, **conservar esos guards**.
11. **Codificación.** Hay `hasBrokenEncoding` y caracteres acentuados en textos. Guardar todos los archivos en **UTF-8** al crearlos (en este repo Windows, no usar Set-Content sin `-Encoding utf8`).

---

## 8. Herramientas mínimas de calidad recomendadas

| Herramienta | Recomendación | Por qué |
|---|---|---|
| **ESLint** | Ya presente (`eslint.config.js`, v9 + react-hooks + react-refresh). **Usar `npm run lint` como gate en cada paso.** | Detecta imports/exports rotos, hooks mal usados y, vía `react-refresh/only-export-components`, fuerza la separación helpers-vs-componentes que pide este plan. |
| **Prettier** | **Añadir** (`prettier` + `eslint-config-prettier`). Un `.prettierrc` mínimo. | El monolito tiene estilo muy comprimido (líneas larguísimas). Al cortar y pegar a archivos nuevos, Prettier normaliza el formato y hace los diffs de extracción **legibles y revisables**, reduciendo el riesgo de errores manuales al mover bloques. `eslint-config-prettier` evita que ESLint y Prettier choquen. |
| **Vitest + React Testing Library** | **Añadir, pero acotado.** Integra nativo con Vite. | Sin tests, el `build` es la única red. Conviene un puñado de **smoke tests**: (a) tests unitarios de los helpers puros recién extraídos (`fmt`, `buildNominaPeriodo`, `calcularLiquidacionRetiro`, `buildTrialBalance`…) — son funciones puras, fáciles de fijar y blindan que mover el código no cambió resultados; (b) un test de render por pantalla ("monta sin lanzar") envolviendo en `AppDataProvider`. No buscar cobertura alta; el objetivo es **regresión barata** durante el refactor. |
| **Husky + lint-staged** | *Opcional.* Pre-commit que corra `lint` + `prettier --check`. | Mantiene la disciplina durante las ~17 extracciones. Bajo costo; omitible si el equipo prefiere correr scripts a mano. |

**Recomendación de adopción:** instalar **Prettier antes de empezar** (Fase 0) para que todo el código nuevo nazca formateado; añadir **Vitest** en paralelo a la Fase 2 (helpers puros), que es donde más barato y valioso es el test. TypeScript queda **fuera de alcance** de este refactor (migración aparte); el árbol propuesto (separación clara `lib`/`components`/`screens`) deja el terreno listo para una futura adopción incremental de TS o JSDoc.

---

## Resumen ejecutivo
- **App.jsx final:** ~250 líneas (estado movido al Provider, router, nav).
- **17 extracciones atómicas**, cada una con `build` + `lint` + smoke test.
- **`ctx` mantiene su shape** → migración a Context sin reescribir pantallas.
- **Regla de dirección de imports:** `screens → components/lib/data → lib base`; nunca al revés.
- **Red de seguridad:** `npm run build` (imports), `npm run lint` (hooks/exports), Prettier (diffs legibles), Vitest (regresión de helpers puros).
