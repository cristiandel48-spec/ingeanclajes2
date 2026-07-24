/* eslint-disable react-refresh/only-export-components */
// Estado global de la aplicacion. El value mantiene exactamente el mismo
// shape que el ctx historico de App.jsx (mismos nombres y setters).
import { createContext, useContext, useState, useRef, useEffect } from "react";
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
  const [cotDraft, setCotDraft] = useState(null);
  const bootstrappedRef = useRef(false);
  const autosaveTimerRef = useRef(null);

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
  });

  const saveAllToCloud = async (override = null) => {
    if (!isSupabaseConfigured()) return { ok: false, reason: "not-configured" };
    if (typeof saveCloudAppData !== "function") {
      console.warn("saveCloudAppData no está disponible en ./lib/backend");
      return { ok: false, reason: "missing-function" };
    }
    try {
      await saveCloudAppData(override || buildCloudPayload());
      return { ok: true };
    } catch (error) {
      console.error("No se pudo guardar datos en Supabase:", error);
      return { ok: false, error };
    }
  };

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
        if (Array.isArray(cloud.nominasGeneradasCloud)) {
          setNominasGeneradas(cloud.nominasGeneradasCloud.map(normalizeNominaGeneratedRecord));
        }
      } catch (error) {
        console.error("No se pudo cargar datos de Supabase:", error);
      } finally {
        if (!cancel) bootstrappedRef.current = true;
      }
    };

    bootstrapCloudData();

    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!bootstrappedRef.current) return;
    if (!isSupabaseConfigured()) return;
    if (typeof saveCloudAppData !== "function") return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      saveAllToCloud();
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
    cotDraft, setCotDraft,
    saveAllToCloud,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
