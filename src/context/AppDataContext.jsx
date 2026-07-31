/* eslint-disable react-refresh/only-export-components */
// Estado global de la aplicacion. El value mantiene exactamente el mismo
// shape que el ctx historico de App.jsx (mismos nombres y setters).
import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import * as backend from "../lib/backend";
import {
  OBRAS_INIT, EMPLEADOS_INIT, CARGOS_INIT, PAGOS_INIT, HORARIOS_INIT,
  CERTIFICACIONES_INIT, INFORMES_INIT, CLIENTES_INIT, PROVEEDORES_INIT,
  CUENTAS_PAGAR_INIT, COTIZACIONES_INIT, CONTABILIDAD_CONFIG_INIT,
  PLAN_CUENTAS_INIT, ASIENTOS_CONTABLES_INIT,
} from "../data/seed";
import {
  normalizarEmpleado, normalizarCargos, normalizeNominaGeneratedRecord,
  NOMINAS_GENERADAS_INIT,
} from "../lib/nomina";
import {
  normalizeContabilidadConfig, normalizePlanCuenta, normalizeAsientoContable,
} from "../lib/accounting";

const isSupabaseConfigured = backend.isSupabaseConfigured;
const loadCloudAppData = backend.loadCloudAppData;
const saveCloudAppData = backend.saveCloudAppData;

const AppDataContext = createContext(null);

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData fuera de AppDataProvider");
  return value;
}

export function AppDataProvider({ children }) {
  const [scr, setScr] = useState("dashboard");
  const [obras, setObras] = useState(OBRAS_INIT);
  const [empleados, setEmpleados] = useState(() => EMPLEADOS_INIT.map(normalizarEmpleado));
  const [cargos, setCargos] = useState(() => normalizarCargos(CARGOS_INIT));
  const [pagos, setPagos] = useState(PAGOS_INIT);
  const [horarios, setHorarios] = useState(HORARIOS_INIT);
  const [certs, setCerts] = useState(CERTIFICACIONES_INIT);
  const [informes, setInformes] = useState(INFORMES_INIT);
  const [clientes, setClientes] = useState(CLIENTES_INIT);
  const [proveedores, setProveedores] = useState(PROVEEDORES_INIT);
  const [cuentas, setCuentas] = useState(CUENTAS_PAGAR_INIT);
  const [cotizaciones, setCotizaciones] = useState(COTIZACIONES_INIT);
  const [contabilidadConfig, setContabilidadConfig] = useState(CONTABILIDAD_CONFIG_INIT);
  const [planCuentas, setPlanCuentas] = useState(PLAN_CUENTAS_INIT);
  const [asientosContables, setAsientosContables] = useState(ASIENTOS_CONTABLES_INIT);
  const [nominasGeneradas, setNominasGeneradas] = useState(NOMINAS_GENERADAS_INIT);
  // Configuracion de empresa (firma escaneada). Una sola fila.
  const [empresaConfig, setEmpresaConfig] = useState([]);
  const [cotDraft, setCotDraft] = useState(null);

  // Permite saltar a otra pantalla llevando contexto, por ejemplo "abre un
  // informe para la obra OB-001". La pantalla destino lo lee al montarse y
  // se descarta al salir de ella.
  const [intencion, setIntencion] = useState(null);
  const irAPantalla = (pantalla, datos = null) => {
    setIntencion(datos ? { pantalla, ...datos } : null);
    setScr(pantalla);
  };
  // Estable, para que las pantallas puedan usarla como dependencia de un
  // efecto sin recrearlo en cada render.
  const limpiarIntencion = useCallback(() => setIntencion(null), []);
  const bootstrappedRef = useRef(false);
  const autosaveTimerRef = useRef(null);

  // Estado visible del autoguardado: "idle" | "saving" | "saved" | "error".
  // Sin esto un fallo de red quedaba solo en la consola y la persona seguia
  // trabajando creyendo que todo estaba guardado.
  const [saveState, setSaveState] = useState("idle");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const retryTimerRef = useRef(null);
  const retryAttemptRef = useRef(0);
  // Referencia siempre fresca al contenido a guardar: un reintento programado
  // debe subir el estado actual, no el que existia cuando fallo.
  const payloadRef = useRef(null);

  const buildCloudPayload = () => ({
    obras,
    empleados,
    cargos,
    pagos,
    horarios,
    certs,
    informes,
    clientes,
    proveedores,
    cuentas,
    cotizaciones,
    contabilidadConfig,
    planCuentas,
    asientosContables,
    nominasGeneradasCloud: nominasGeneradas,
    empresaConfig,
  });

  payloadRef.current = buildCloudPayload;

  const saveAllToCloud = async (override = null) => {
    if (!isSupabaseConfigured()) return { ok: false, reason: "not-configured" };
    if (typeof saveCloudAppData !== "function") {
      console.warn("saveCloudAppData no está disponible en ./lib/backend");
      return { ok: false, reason: "missing-function" };
    }

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    setSaveState("saving");
    try {
      await saveCloudAppData(override || payloadRef.current());
      retryAttemptRef.current = 0;
      setSaveError(null);
      setHasPendingChanges(false);
      setLastSavedAt(new Date());
      setSaveState("saved");
      return { ok: true };
    } catch (error) {
      console.error("No se pudo guardar datos en Supabase:", error);
      setSaveError(error);
      setSaveState("error");
      scheduleRetryRef.current?.();
      return { ok: false, error };
    }
  };

  // Reintento con espera creciente para no golpear el servidor: 3s, 8s, 20s,
  // 45s y luego cada 90s hasta que vuelva la conexion.
  const scheduleRetryRef = useRef(null);
  scheduleRetryRef.current = () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    const esperas = [3000, 8000, 20000, 45000, 90000];
    const espera = esperas[Math.min(retryAttemptRef.current, esperas.length - 1)];
    retryAttemptRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      saveAllToCloudRef.current?.();
    }, espera);
  };

  const saveAllToCloudRef = useRef(null);
  saveAllToCloudRef.current = saveAllToCloud;

  useEffect(() => {
    let cancel = false;

    const bootstrapCloudData = async () => {
      if (!isSupabaseConfigured()) {
        bootstrappedRef.current = true;
        return;
      }

      try {
        const cloud = await loadCloudAppData();
        if (cancel) return;

        if (Array.isArray(cloud.obras)) setObras(cloud.obras);
        if (Array.isArray(cloud.empleados)) setEmpleados(cloud.empleados.map(normalizarEmpleado));
        if (Array.isArray(cloud.cargos)) setCargos(normalizarCargos(cloud.cargos));
        if (Array.isArray(cloud.pagos)) setPagos(cloud.pagos);
        if (Array.isArray(cloud.horarios)) setHorarios(cloud.horarios);
        if (Array.isArray(cloud.certs)) setCerts(cloud.certs);
        if (Array.isArray(cloud.informes)) setInformes(cloud.informes);
        if (Array.isArray(cloud.clientes)) setClientes(cloud.clientes);
        if (Array.isArray(cloud.proveedores)) setProveedores(cloud.proveedores);
        if (Array.isArray(cloud.cuentas)) setCuentas(cloud.cuentas);
        if (Array.isArray(cloud.cotizaciones)) setCotizaciones(cloud.cotizaciones);
        if (Array.isArray(cloud.contabilidadConfig) && cloud.contabilidadConfig.length) {
          setContabilidadConfig(cloud.contabilidadConfig.map(normalizeContabilidadConfig));
        }
        if (Array.isArray(cloud.planCuentas) && cloud.planCuentas.length) {
          setPlanCuentas(cloud.planCuentas.map(normalizePlanCuenta));
        }
        if (Array.isArray(cloud.asientosContables)) {
          setAsientosContables(cloud.asientosContables.map((entry) => normalizeAsientoContable(entry, cloud.planCuentas?.length ? cloud.planCuentas.map(normalizePlanCuenta) : PLAN_CUENTAS_INIT)));
        }
        if (Array.isArray(cloud.empresaConfig)) setEmpresaConfig(cloud.empresaConfig);
        if (Array.isArray(cloud.nominasGeneradasCloud)) {
          setNominasGeneradas(cloud.nominasGeneradasCloud.map(normalizeNominaGeneratedRecord));
        }
        if (!cancel) setLoadError(null);
      } catch (error) {
        console.error("No se pudo cargar datos de Supabase:", error);
        // Sin esto la app mostraba los datos de ejemplo como si fueran los
        // reales del cliente, sin ninguna senal de que algo fallo.
        if (!cancel) setLoadError(error);
      } finally {
        if (!cancel) bootstrappedRef.current = true;
      }
    };

    bootstrapCloudData();

    return () => { cancel = true; };
  }, []);

  // Reintenta apenas vuelve la conexion, sin esperar al siguiente intento.
  useEffect(() => {
    const onOnline = () => {
      if (saveState === "error" || hasPendingChanges) saveAllToCloudRef.current?.();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [saveState, hasPendingChanges]);

  // Avisa antes de cerrar la pestana si quedan cambios sin subir.
  useEffect(() => {
    const enRiesgo = hasPendingChanges || saveState === "error";
    if (!enRiesgo) return;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasPendingChanges, saveState]);

  // Limpia el reintento pendiente al desmontar.
  useEffect(() => () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  useEffect(() => {
    if (!bootstrappedRef.current) return;
    if (!isSupabaseConfigured()) return;
    if (typeof saveCloudAppData !== "function") return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    setHasPendingChanges(true);
    autosaveTimerRef.current = setTimeout(() => {
      saveAllToCloudRef.current?.();
    }, 700);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    obras,
    empleados,
    cargos,
    pagos,
    horarios,
    certs,
    informes,
    clientes,
    proveedores,
    cuentas,
    cotizaciones,
    contabilidadConfig,
    planCuentas,
    asientosContables,
    nominasGeneradas,
    empresaConfig,
  ]);

  const value = {
    scr, setScr,
    obras, setObras,
    empleados, setEmpleados,
    cargos, setCargos,
    pagos, setPagos,
    horarios, setHorarios,
    certs, setCerts,
    informes, setInformes,
    clientes, setClientes,
    proveedores, setProveedores,
    cuentas, setCuentas,
    cotizaciones, setCotizaciones,
    contabilidadConfig, setContabilidadConfig,
    planCuentas, setPlanCuentas,
    asientosContables, setAsientosContables,
    nominasGeneradas, setNominasGeneradas,
    empresaConfig, setEmpresaConfig,
    cotDraft, setCotDraft,
    intencion, irAPantalla, limpiarIntencion,
    saveAllToCloud,
    // Estado del autoguardado, para el indicador de la barra superior.
    saveState,
    lastSavedAt,
    hasPendingChanges,
    saveError,
    loadError,
    reintentarGuardado: () => saveAllToCloudRef.current?.(),
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
