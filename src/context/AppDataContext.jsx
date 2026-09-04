/* eslint-disable react-refresh/only-export-components */
// Estado global de la aplicacion. El value mantiene exactamente el mismo
// shape que el ctx historico de App.jsx (mismos nombres y setters).
import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import * as backend from "../lib/backend";
import {
  OBRAS_INIT, EMPLEADOS_INIT, CARGOS_INIT, PAGOS_INIT, HORARIOS_INIT,
  CERTIFICACIONES_INIT, INFORMES_INIT, CLIENTES_INIT, PROVEEDORES_INIT,
  CUENTAS_PAGAR_INIT, COTIZACIONES_INIT, CONTABILIDAD_CONFIG_INIT,
  PLAN_CUENTAS_INIT, ASIENTOS_CONTABLES_INIT, ORDENES_COMPRA_INIT,
} from "../data/seed";
import {
  normalizarEmpleado, normalizarCargos, normalizeNominaGeneratedRecord,
  NOMINAS_GENERADAS_INIT,
} from "../lib/nomina";
import {
  normalizeContabilidadConfig, normalizePlanCuenta, normalizeAsientoContable,
} from "../lib/accounting";
import { EJEMPLOS, hayEjemplos, sinEjemplos } from "../data/ejemplos";

const isSupabaseConfigured = backend.isSupabaseConfigured;
const loadCloudAppData = backend.loadCloudAppData;
const getMiMembresia = backend.getMiMembresia;
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
  const [ordenesCompra, setOrdenesCompra] = useState(() => {
    try {
      const guardado = localStorage.getItem("ordenes_compra");
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("No se pudo cargar ordenes_compra de localStorage", e);
    }
    return ORDENES_COMPRA_INIT;
  });

  useEffect(() => {
    try {
      localStorage.setItem("ordenes_compra", JSON.stringify(ordenesCompra));
    } catch (e) {
      console.warn("No se pudo guardar ordenes_compra en localStorage", e);
    }
  }, [ordenesCompra]);

  const [cotizaciones, setCotizaciones] = useState(COTIZACIONES_INIT);
  const [contabilidadConfig, setContabilidadConfig] = useState(CONTABILIDAD_CONFIG_INIT);
  const [planCuentas, setPlanCuentas] = useState(PLAN_CUENTAS_INIT);
  const [asientosContables, setAsientosContables] = useState(ASIENTOS_CONTABLES_INIT);
  const [nominasGeneradas, setNominasGeneradas] = useState(NOMINAS_GENERADAS_INIT);
  // Configuracion de empresa (firma escaneada). Una sola fila.
  const [empresaConfig, setEmpresaConfig] = useState([]);
  // El catalogo de servicios. Vive en la base para que los precios se
  // cambien sin publicar una version del programa.
  const [catalogoItems, setCatalogoItems] = useState([]);
  // Rol y modulos de quien tiene la sesion abierta. null mientras carga.
  const [membresia, setMembresia] = useState(null);
  const [cotDraft, setCotDraft] = useState(null);
  // Los datos de muestra se pueden quitar de en medio sin esperar a tener los
  // reales. Se apagan de una vez en todas las pantallas -tambien en la de
  // WhatsApp, que trae los suyos- porque apagarlos de una en una seria peor
  // que dejarlos.
  const [ejemplosOcultos, setEjemplosOcultos] = useState(false);

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

  // AQUI SE CORTAN LOS REGISTROS DE EJEMPLO, y es el unico sitio donde se
  // cortan: si alguien agrega mañana otra entidad de muestra, tiene que pasar
  // por `sinEjemplos` o se le subiran a la base del cliente como si fueran
  // suyos. El autoguardado sube lo que salga de aqui.
  const buildCloudPayload = () => ({
    obras: sinEjemplos(obras),
    empleados,
    cargos,
    pagos: sinEjemplos(pagos),
    horarios,
    certs: sinEjemplos(certs),
    informes: sinEjemplos(informes),
    clientes: sinEjemplos(clientes),
    proveedores,
    cuentas,
    cotizaciones: sinEjemplos(cotizaciones),
    contabilidadConfig,
    planCuentas,
    asientosContables,
    nominasGeneradasCloud: nominasGeneradas,
    empresaConfig,
    catalogoItems,
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
        // El rol decide que ve la persona, asi que se pide junto con los datos.
        try {
          const mia = await getMiMembresia();
          if (!cancel) setMembresia(mia);
        } catch (error) {
          console.error("No se pudo leer el rol del usuario:", error);
        }

        const cloud = await loadCloudAppData();
        if (cancel) return;

        // Con la tabla vacia se dejan los registros de ejemplo: una pantalla
        // que dice «todavia no hay nada» no enseña para que sirve, y quien la
        // abre por primera vez es justo el que necesita entenderlo. Se van
        // solos en cuanto haya un registro de verdad, y el autoguardado los
        // descarta (ver buildCloudPayload).
        const oEjemplo = (lista, ejemplo) => (lista.length ? lista : ejemplo);

        if (Array.isArray(cloud.obras)) setObras(oEjemplo(cloud.obras, EJEMPLOS.obras));
        if (Array.isArray(cloud.empleados)) setEmpleados(cloud.empleados.map(normalizarEmpleado));
        if (Array.isArray(cloud.cargos)) setCargos(normalizarCargos(cloud.cargos));
        if (Array.isArray(cloud.pagos)) setPagos(oEjemplo(cloud.pagos, EJEMPLOS.pagos));
        if (Array.isArray(cloud.horarios)) setHorarios(cloud.horarios);
        if (Array.isArray(cloud.certs)) setCerts(oEjemplo(cloud.certs, EJEMPLOS.certs));
        if (Array.isArray(cloud.informes)) setInformes(oEjemplo(cloud.informes, EJEMPLOS.informes));
        if (Array.isArray(cloud.clientes)) setClientes(oEjemplo(cloud.clientes, EJEMPLOS.clientes));
        if (Array.isArray(cloud.proveedores)) setProveedores(cloud.proveedores);
        if (Array.isArray(cloud.cuentas)) setCuentas(cloud.cuentas);
        if (Array.isArray(cloud.cotizaciones)) setCotizaciones(oEjemplo(cloud.cotizaciones, EJEMPLOS.cotizaciones));
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
        if (Array.isArray(cloud.catalogoItems)) setCatalogoItems(cloud.catalogoItems);
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
    // Espera antes de guardar. Cada guardado sube la fila COMPLETA de lo que
    // cambio -cotizacion u obra, con sus fotos dentro-, asi que a 700 ms
    // escribir un parrafo largo mandaba la misma foto una y otra vez y ahogaba
    // la base. Con 2 s se juntan mas teclas en un solo envio; si la persona
    // cierra antes, el aviso de "cambios sin guardar" la detiene igual.
    autosaveTimerRef.current = setTimeout(() => {
      saveAllToCloudRef.current?.();
    }, 2000);

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
    catalogoItems,
  ]);

  // Registros cuyo detalle ya se pidio, para no volver a pedirlo cada vez que
  // se abre la misma pantalla.
  const detallesPedidos = useRef(new Set());

  /**
   * Completa un registro con las columnas de imagenes, que la carga inicial no
   * trae. Se llama al ABRIR un informe, una obra o una cotizacion.
   *
   * Si falla no pasa nada grave: se sigue viendo el registro sin las fotos, y
   * el guardado tiene su propia proteccion para no borrarlas.
   */
  // Devuelve el registro completo la primera vez que se pide. Despues devuelve
  // undefined, que significa «el que tienes ya esta completo»: al mezclarlo en
  // el estado, lo que llega del listado a partir de entonces ya trae todo.
  //
  // Quien vaya a EDITAR debe esperar a esto antes de llenar el formulario. Si
  // lo llena con un registro sin fotos y despues guarda, las borraria.
  const asegurarDetalle = useCallback(async (entidad, id) => {
    if (!id) return undefined;
    const clave = `${entidad}:${id}`;
    if (detallesPedidos.current.has(clave)) return undefined;
    detallesPedidos.current.add(clave);

    const completo = await backend.cargarDetalleNube(entidad, id);
    if (!completo) {
      // Se olvida para poder reintentar la proxima vez que se abra.
      detallesPedidos.current.delete(clave);
      return undefined;
    }

    const mezclar = (prev) => (prev || []).map((x) => (
      x.id === id ? { ...x, ...completo, __parcial: false } : x
    ));

    if (entidad === "informes") setInformes(mezclar);
    else if (entidad === "obras") setObras(mezclar);
    else if (entidad === "cotizaciones") setCotizaciones(mezclar);

    return { ...completo, __parcial: false };
  }, []);

  const value = {
    scr, setScr,
    asegurarDetalle,
    // Para que la barra de arriba pueda avisar que lo que se ve es de muestra.
    // Se apaga solo: en cuanto haya un registro de verdad en TODAS las
    // pantallas que traen ejemplo, deja de haber ejemplos que anunciar.
    verEjemplos: !ejemplosOcultos
      && hayEjemplos(obras, cotizaciones, clientes, informes, certs, pagos),
    ejemplosOcultos,
    // Quita los de muestra de todas las listas a la vez. No hay vuelta atras
    // en la sesion, y no hace falta: al recargar vuelven, porque las tablas
    // siguen vacias.
    ocultarEjemplos: () => {
      setEjemplosOcultos(true);
      setObras(sinEjemplos);
      setCotizaciones(sinEjemplos);
      setClientes(sinEjemplos);
      setInformes(sinEjemplos);
      setCerts(sinEjemplos);
      setPagos(sinEjemplos);
    },
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
    ordenesCompra, setOrdenesCompra,
    cotizaciones, setCotizaciones,
    contabilidadConfig, setContabilidadConfig,
    planCuentas, setPlanCuentas,
    asientosContables, setAsientosContables,
    nominasGeneradas, setNominasGeneradas,
    empresaConfig, setEmpresaConfig,
    catalogoItems, setCatalogoItems,
    membresia,
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
