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
  AGENDA_COMPROMISOS_INIT,
} from "../data/seed";
import {
  normalizarEmpleado, normalizarCargos, normalizeNominaGeneratedRecord,
  NOMINAS_GENERADAS_INIT,
} from "../lib/nomina";
import {
  normalizeContabilidadConfig, normalizePlanCuenta, normalizeAsientoContable,
} from "../lib/accounting";
import { EJEMPLOS, sinEjemplos } from "../data/ejemplos";
import { depurarObrasDuplicadas } from "../lib/obrasDuplicadas";
import { iniciarVigilanteInactividad } from "../lib/seguridadSesion";
import {
  cargarCacheUltimasConexionesLocal,
  guardarCacheUltimasConexionesLocal,
  obtenerUltimasConexionesDeEmpresa,
  mezclarUltimasConexiones,
} from "../lib/actividadConexiones";
import { detectarDispositivo } from "../lib/backend/presencia";
import { DOCUMENTOS_EQUIPO_INIT, limpiarDocumentosEjemplo } from "../screens/Produccion/documentosSeed";
import { TAREAS_PRODUCCION_INIT, limpiarTareasEjemplo } from "../screens/Produccion/tareasSeed";

const isSupabaseConfigured = backend.isSupabaseConfigured;
const loadCloudAppData = backend.loadCloudAppData;
const getMiMembresia = backend.getMiMembresia;
const saveCloudAppData = backend.saveCloudAppData;
const suscribirPresencia = backend.suscribirPresencia;
const esSuperAdmin = backend.esSuperAdmin;
const getSessionUser = backend.getSessionUser;
const reintentandoSiChocanPestanas = backend.reintentandoSiChocanPestanas;

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

  const [agenda, setAgenda] = useState(() => {
    try {
      const guardado = localStorage.getItem("agenda_compromisos");
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => !item?.__ejemplo && !String(item?.id || "").startsWith("AG-90"));
        }
      }
    } catch (e) {
      console.warn("No se pudo cargar agenda_compromisos de localStorage", e);
    }
    return AGENDA_COMPROMISOS_INIT;
  });

  useEffect(() => {
    try {
      localStorage.setItem("agenda_compromisos", JSON.stringify(agenda));
    } catch (e) {
      console.warn("No se pudo guardar agenda_compromisos en localStorage", e);
    }
  }, [agenda]);

  // Lista de chequeo personal (modulo «Mis tareas y recordatorios»). En la nube
  // cada usuario solo ve las suyas (RLS). La copia local va por usuario para
  // que en un equipo compartido una persona no vea las tareas de otra.
  //
  // `almacenTareas.modoLocal` dice si lo guardado aqui todavia NO esta en la
  // nube -porque falta la migracion 057 o porque la carga fallo-. Solo en ese
  // caso la copia local vuelve a subirse. Sin esa marca, una lista vacia en la
  // nube se confundiria con «la tabla no existe» y resucitaria tareas que la
  // persona ya borro desde otro dispositivo.
  const [tareasPersonales, setTareasPersonales] = useState([]);
  const [almacenTareas, setAlmacenTareas] = useState(null);
  // El payload de la nube solo incluye las tareas una vez cargadas. Mientras
  // no lo esten, la lista en memoria esta vacia por no haberla leido aun, y
  // subirla borraria de la base todas las tareas de la persona.
  const tareasCargadasRef = useRef(false);

  useEffect(() => {
    if (!almacenTareas) return;
    try {
      localStorage.setItem(
        almacenTareas.clave,
        JSON.stringify({ v: 2, modoLocal: almacenTareas.modoLocal, items: tareasPersonales })
      );
    } catch (e) {
      console.warn("No se pudo guardar tareas personales en localStorage", e);
    }
  }, [tareasPersonales, almacenTareas]);

  const [tareasProduccion, setTareasProduccion] = useState(() => {
    try {
      const guardadas = localStorage.getItem("ingeanclajes_tareas_produccion");
      if (guardadas) {
        const parsed = JSON.parse(guardadas);
        const limpias = limpiarTareasEjemplo(parsed);
        if (limpias.length !== parsed.length) {
          localStorage.setItem("ingeanclajes_tareas_produccion", JSON.stringify(limpias));
        }
        return limpias;
      }
    } catch (e) {
      console.warn("No se pudo cargar ingeanclajes_tareas_produccion de localStorage", e);
    }
    return [];
  });

  useEffect(() => {
    const limpias = limpiarTareasEjemplo(tareasProduccion);
    try {
      localStorage.setItem("ingeanclajes_tareas_produccion", JSON.stringify(limpias));
    } catch (e) {
      console.warn("No se pudo guardar ingeanclajes_tareas_produccion en localStorage", e);
    }
  }, [tareasProduccion]);

  const [documentosEquipo, setDocumentosEquipo] = useState(() => {
    try {
      const guardadas = localStorage.getItem("ingeanclajes_documentos_equipo");
      if (guardadas) {
        const parsed = JSON.parse(guardadas);
        const limpias = limpiarDocumentosEjemplo(parsed);
        if (limpias.length !== parsed.length) {
          localStorage.setItem("ingeanclajes_documentos_equipo", JSON.stringify(limpias));
        }
        return limpias;
      }
    } catch (e) {
      console.warn("No se pudo cargar ingeanclajes_documentos_equipo de localStorage", e);
    }
    return [];
  });

  useEffect(() => {
    const limpias = limpiarDocumentosEjemplo(documentosEquipo);
    try {
      localStorage.setItem("ingeanclajes_documentos_equipo", JSON.stringify(limpias));
    } catch (e) {
      console.warn("No se pudo guardar ingeanclajes_documentos_equipo en localStorage", e);
    }
  }, [documentosEquipo]);

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

  // Presencia en tiempo real y superadministración (cristiandel48@gmail.com)
  const [usuariosEnLinea, setUsuariosEnLinea] = useState({});
  const [ultimasConexiones, setUltimasConexiones] = useState(() => cargarCacheUltimasConexionesLocal());
  const ultimasConexionesRef = useRef(ultimasConexiones);
  useEffect(() => {
    ultimasConexionesRef.current = ultimasConexiones;
  }, [ultimasConexiones]);
  const [authUserEmail, setAuthUserEmail] = useState("");
  const presenciaManagerRef = useRef(null);
  const esSuperAdminCristian = esSuperAdmin(membresia?.email) || esSuperAdmin(authUserEmail);

  // Mantener registro de mi propia sesión en el caché de conexiones
  useEffect(() => {
    const miUserId = membresia?.user_id;
    const miEmail = (membresia?.email || authUserEmail || "").toLowerCase().trim();
    if (!miUserId && !miEmail) return;

    const infoPropia = {
      userId: miUserId || miEmail,
      email: miEmail,
      nombre: membresia?.nombre || miEmail,
      dispositivo: detectarDispositivo(),
      onlineAt: new Date().toISOString(),
    };

    setUltimasConexiones((prev) => {
      const combinadas = mezclarUltimasConexiones(prev, {
        [miUserId || miEmail]: infoPropia,
        ...(miEmail ? { [miEmail]: infoPropia } : {}),
      });
      guardarCacheUltimasConexionesLocal(combinadas);
      return combinadas;
    });
  }, [membresia, authUserEmail]);
  // Los datos de muestra se pueden quitar de en medio sin esperar a tener los
  // reales. Se apagan de una vez en todas las pantallas -tambien en la de
  // WhatsApp, que trae los suyos- porque apagarlos de una en una seria peor
  // que dejarlos.
  const [ejemplosOcultos, setEjemplosOcultos] = useState(() => {
    try {
      return localStorage.getItem("ingeanclajes_ejemplos_ocultos") !== "false";
    } catch {
      return true;
    }
  });

  // Kill switch: si es true, todos los usuarios NO-superadmin ven pantalla
  // en blanco (sin mensaje). Solo cristiandel48@gmail.com puede activarlo /
  // desactivarlo desde su panel de control en la pantalla de Usuarios.
  // El estado vive en empresaConfig (id="empresa") y se sincroniza con la nube.
  const appBloqueada = Boolean(
    Array.isArray(empresaConfig) && empresaConfig.some(
      (row) => row?.appBloqueada || row?.controlDocumental?.appBloqueada
    )
  );

  const setAppBloqueada = async (valor) => {
    const lista = Array.isArray(empresaConfig) ? empresaConfig : [];
    const actual = lista.find((row) => row?.id === "empresa") || lista[0];
    const targetId = actual?.id || "empresa";
    const fila = {
      ...(actual || { id: targetId }),
      id: targetId,
      appBloqueada: Boolean(valor),
      controlDocumental: {
        ...(actual?.controlDocumental || {}),
        appBloqueada: Boolean(valor),
      },
    };
    const nuevaLista = lista.some((r) => r.id === targetId)
      ? lista.map((r) => (r.id === targetId ? fila : r))
      : [...lista, fila];

    setEmpresaConfig(nuevaLista);

    // Guardado inmediato en Supabase
    try {
      const payload = payloadRef.current ? payloadRef.current() : {};
      await saveCloudAppData({
        ...payload,
        empresaConfig: nuevaLista,
      });
      setSaveState("saved");
      setLastSavedAt(new Date());
      setHasPendingChanges(false);
    } catch (e) {
      console.error("Error al guardar estado de bloqueo en la nube:", e);
    }

    // Emisión en tiempo real a todos los clientes conectados
    if (presenciaManagerRef.current?.emitirBloqueoSistema) {
      await presenciaManagerRef.current.emitirBloqueoSistema(Boolean(valor));
    }
  };

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
  const buildCloudPayload = () => {
    const empLista = Array.isArray(empresaConfig) ? empresaConfig : [];
    const empRow = empLista.find((r) => r?.id === "empresa") || empLista[0] || { id: "empresa" };
    const empActualizado = {
      ...empRow,
      id: empRow.id || "empresa",
      ultimasConexiones: ultimasConexionesRef.current || {},
    };
    const empresaConfigConConexiones = empLista.some((r) => r.id === empActualizado.id)
      ? empLista.map((r) => (r.id === empActualizado.id ? empActualizado : r))
      : [empActualizado];

    return {
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
      ordenesCompra: sinEjemplos(ordenesCompra),
      agenda: sinEjemplos(agenda),
      // Ver tareasCargadasRef: una clave ausente la salta el guardado entero,
      // que es justo lo que hace falta mientras no se hayan leido.
      ...(tareasCargadasRef.current ? { tareasPersonales } : {}),
      documentosEquipo,
      cotizaciones: sinEjemplos(cotizaciones),
      contabilidadConfig,
      planCuentas,
      asientosContables,
      nominasGeneradasCloud: nominasGeneradas,
      empresaConfig: empresaConfigConConexiones,
      catalogoItems,
    };
  };

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

    // Devuelve siempre { items, modoLocal }. El formato antiguo era un array
    // suelto, escrito cuando las tareas aun no subian a la nube: se trata como
    // pendiente de subir.
    const leerTareasLocales = (clave) => {
      try {
        const guardado = JSON.parse(localStorage.getItem(clave) || "null");
        if (Array.isArray(guardado)) return { items: guardado, modoLocal: true };
        if (guardado && Array.isArray(guardado.items)) {
          return { items: guardado.items, modoLocal: Boolean(guardado.modoLocal) };
        }
      } catch (e) {
        console.warn("No se pudo leer tareas personales de localStorage", e);
      }
      return { items: [], modoLocal: false };
    };

    const bootstrapCloudData = async () => {
      // Sin nube la lista vive solo aqui, asi que siempre esta pendiente.
      if (!isSupabaseConfigured()) {
        const clave = "tareas_personales:local";
        setTareasPersonales(leerTareasLocales(clave).items);
        setAlmacenTareas({ clave, modoLocal: true });
        tareasCargadasRef.current = true;
        bootstrappedRef.current = true;
        return;
      }

      // La clave sale del usuario de la sesion, no de la membresia: si la
      // membresia falla -un choque de pestanas, un corte- las tareas se
      // cargarian igual, y antes eso dejaba la lista vacia y el autoguardado
      // borraba de la base todas las de esa persona.
      let claveTareas = "tareas_personales:local";
      try {
        const user = await reintentandoSiChocanPestanas(() => getSessionUser());
        if (user?.id) claveTareas = `tareas_personales:${user.id}`;
      } catch (error) {
        console.warn("No se pudo identificar la sesion para las tareas personales:", error);
      }

      try {
        // El rol decide que ve la persona, asi que se pide junto con los datos.
        try {
          const mia = await reintentandoSiChocanPestanas(() => getMiMembresia());
          if (!cancel) {
            setMembresia(mia);
            if (mia?.email) setAuthUserEmail(mia.email);
          }
        } catch (error) {
          console.error("No se pudo leer el rol del usuario:", error);
        }

        const cloud = await loadCloudAppData();
        if (cancel) return;

        {
          const faltaTabla = (cloud.__tablasFaltantes || []).includes("tareas_personales");
          const nube = Array.isArray(cloud.tareasPersonales) ? cloud.tareasPersonales : [];
          const local = leerTareasLocales(claveTareas);

          if (faltaTabla) {
            // Sin migracion 057 la nube no guarda nada: manda la copia local.
            setTareasPersonales(local.items);
            setAlmacenTareas({ clave: claveTareas, modoLocal: true });
          } else {
            // Manda la nube, aunque venga vacia. Lo local solo se suma una vez,
            // si quedo pendiente de subir, y sin pisar lo que ya esta arriba.
            const enNube = new Set(nube.map((t) => t?.id));
            const pendientes = local.modoLocal
              ? local.items.filter((t) => t?.id && !enNube.has(t.id))
              : [];
            setTareasPersonales([...nube, ...pendientes]);
            setAlmacenTareas({ clave: claveTareas, modoLocal: false });
          }
          tareasCargadasRef.current = true;
        }

        // Limpiar automáticamente obras duplicadas y corregir saltos de consecutivo
        let obrasList = Array.isArray(cloud.obras) ? cloud.obras : [];
        let cotizacionesList = Array.isArray(cloud.cotizaciones) ? cloud.cotizaciones : [];
        let otrasEntidades = {
          cuentas: Array.isArray(cloud.cuentas) ? cloud.cuentas : [],
          pagos: Array.isArray(cloud.pagos) ? cloud.pagos : [],
          horarios: Array.isArray(cloud.horarios) ? cloud.horarios : [],
          certs: Array.isArray(cloud.certs) ? cloud.certs : [],
          informes: Array.isArray(cloud.informes) ? cloud.informes : [],
          ordenesCompra: Array.isArray(cloud.ordenesCompra) ? cloud.ordenesCompra : [],
        };

        const {
          obrasDepuradas,
          cotizacionesAjustadas,
          otrasEntidadesAjustadas,
          huboLimpieza,
          eliminadas,
          renombradas,
        } = depurarObrasDuplicadas(obrasList, cotizacionesList, otrasEntidades);

        if (huboLimpieza) {
          console.info(`[Depuración Obras] Eliminadas: ${eliminadas.join(", ")}`);
          if (renombradas?.length) {
            console.info("[Depuración Obras] Obras recompactadas para consecutivo:", renombradas);
          }
          obrasList = obrasDepuradas;
          cotizacionesList = cotizacionesAjustadas;
          if (otrasEntidadesAjustadas) {
            otrasEntidades = { ...otrasEntidades, ...otrasEntidadesAjustadas };
          }
          try {
            await saveCloudAppData({
              ...cloud,
              obras: obrasDepuradas,
              cotizaciones: cotizacionesAjustadas,
              ...otrasEntidadesAjustadas,
            });
            console.info("[Depuración Obras] Base de datos y consecutivos corregidos en la nube.");
          } catch (e) {
            console.warn("[Depuración Obras] No se pudo guardar la corrección en la nube:", e);
          }
        }

        // Con la tabla vacia se dejan los registros de ejemplo: una pantalla
        // que dice «todavia no hay nada» no enseña para que sirve, y quien la
        // abre por primera vez es justo el que necesita entenderlo. Se van
        // solos en cuanto haya un registro de verdad, y el autoguardado los
        // descarta (ver buildCloudPayload).
        const oEjemplo = (lista, ejemplo) => (ejemplosOcultos ? lista : (lista.length ? lista : ejemplo));

        if (Array.isArray(cloud.obras)) setObras(oEjemplo(obrasList, EJEMPLOS.obras));
        if (Array.isArray(cloud.empleados)) setEmpleados(cloud.empleados.map(normalizarEmpleado));
        if (Array.isArray(cloud.cargos)) setCargos(normalizarCargos(cloud.cargos));
        if (Array.isArray(cloud.pagos)) setPagos(oEjemplo(otrasEntidades.pagos, EJEMPLOS.pagos));
        if (Array.isArray(cloud.horarios)) setHorarios(otrasEntidades.horarios);
        if (Array.isArray(cloud.certs)) setCerts(oEjemplo(otrasEntidades.certs, EJEMPLOS.certs));
        if (Array.isArray(cloud.informes)) setInformes(oEjemplo(otrasEntidades.informes, EJEMPLOS.informes));
        if (Array.isArray(cloud.clientes)) setClientes(oEjemplo(cloud.clientes, EJEMPLOS.clientes));
        if (Array.isArray(cloud.proveedores)) setProveedores(cloud.proveedores);
        if (Array.isArray(cloud.cuentas)) setCuentas(otrasEntidades.cuentas);
        if (Array.isArray(cloud.ordenesCompra) && cloud.ordenesCompra.length) setOrdenesCompra(otrasEntidades.ordenesCompra);
        if (Array.isArray(cloud.agenda)) {
          const realesNube = cloud.agenda.filter((item) => !item?.__ejemplo && !String(item?.id || "").startsWith("AG-90"));
          if (realesNube.length > 0) {
            setAgenda(realesNube);
          } else {
            setAgenda((prev) => (prev || []).filter((item) => !item?.__ejemplo && !String(item?.id || "").startsWith("AG-90")));
          }
        }
        if (Array.isArray(cloud.documentosEquipo)) {
          setDocumentosEquipo(limpiarDocumentosEjemplo(cloud.documentosEquipo));
        }
        if (Array.isArray(cloud.cotizaciones)) setCotizaciones(oEjemplo(cotizacionesList, EJEMPLOS.cotizaciones));
        if (Array.isArray(cloud.contabilidadConfig) && cloud.contabilidadConfig.length) {
          setContabilidadConfig(cloud.contabilidadConfig.map(normalizeContabilidadConfig));
        }
        if (Array.isArray(cloud.planCuentas) && cloud.planCuentas.length) {
          setPlanCuentas(cloud.planCuentas.map(normalizePlanCuenta));
        }
        if (Array.isArray(cloud.asientosContables)) {
          setAsientosContables(cloud.asientosContables.map((entry) => normalizeAsientoContable(entry, cloud.planCuentas?.length ? cloud.planCuentas.map(normalizePlanCuenta) : PLAN_CUENTAS_INIT)));
        }
        if (Array.isArray(cloud.empresaConfig)) {
          setEmpresaConfig(cloud.empresaConfig);
          const desdeNube = obtenerUltimasConexionesDeEmpresa(cloud.empresaConfig);
          if (desdeNube && typeof desdeNube === "object" && Object.keys(desdeNube).length > 0) {
            setUltimasConexiones((prev) => {
              const combinadas = mezclarUltimasConexiones(prev, desdeNube);
              guardarCacheUltimasConexionesLocal(combinadas);
              return combinadas;
            });
          }
        }
        if (Array.isArray(cloud.catalogoItems)) setCatalogoItems(cloud.catalogoItems);
        if (Array.isArray(cloud.nominasGeneradasCloud)) {
          setNominasGeneradas(cloud.nominasGeneradasCloud.map(normalizeNominaGeneratedRecord));
        }
        if (!cancel) setLoadError(null);
      } catch (error) {
        console.error("No se pudo cargar datos de Supabase:", error);
        // Sin carga no hay guardado (el backend lo bloquea), asi que lo que se
        // anote ahora queda pendiente de subir: la proxima carga buena lo suma.
        if (!cancel) {
          setTareasPersonales(leerTareasLocales(claveTareas).items);
          setAlmacenTareas({ clave: claveTareas, modoLocal: true });
          tareasCargadasRef.current = true;
        }
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
    agenda,
    tareasPersonales,
    documentosEquipo,
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

  // Presencia en tiempo real (Supabase Realtime Presence) y control de sesiones
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let activo = true;

    const inicializarPresencia = async () => {
      try {
        const user = await getSessionUser();
        if (!activo || !user) return;
        if (user?.email) setAuthUserEmail(user.email);

        if (presenciaManagerRef.current) {
          presenciaManagerRef.current.destruir();
          presenciaManagerRef.current = null;
        }

        const manager = suscribirPresencia({
          user,
          membresia,
          onPresenciaSync: (conectados) => {
            if (activo) {
              setUsuariosEnLinea(conectados || {});
              if (conectados && typeof conectados === "object" && Object.keys(conectados).length > 0) {
                setUltimasConexiones((prev) => {
                  const combinadas = mezclarUltimasConexiones(prev, conectados);
                  guardarCacheUltimasConexionesLocal(combinadas);
                  return combinadas;
                });
              }
            }
          },
          onSesionCerradaForzada: (payload) => {
            alert(
              `⚠️ SESIÓN FINALIZADA\n\n` +
              `El administrador (${payload?.adminEmail || "administración"}) ha cerrado tu sesión remotamente.\n` +
              `Debes volver a iniciar sesión para continuar.`
            );
            backend.signOut().catch(() => {});
            window.location.reload();
          },
        });

        presenciaManagerRef.current = manager;
      } catch (err) {
        console.warn("No se pudo iniciar canal de presencia en tiempo real:", err);
      }
    };

    inicializarPresencia();

    return () => {
      activo = false;
      if (presenciaManagerRef.current) {
        presenciaManagerRef.current.destruir();
        presenciaManagerRef.current = null;
      }
    };
  }, [membresia]);

  // Vigilante de inactividad de 5 minutos (cierre automático si pasa 5 min inactivo o desconectado)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const vigilante = iniciarVigilanteInactividad({
      onCierrePorInactividad: () => {
        backend.signOut().catch(() => {});
        window.location.reload();
      },
    });

    return () => {
      vigilante.destruir();
    };
  }, []);

  const cerrarSesionRemota = useCallback(async (targetUserId, targetEmail, targetNombre) => {
    if (!presenciaManagerRef.current) {
      return { ok: false, error: "El canal de presencia en tiempo real no está disponible." };
    }
    return await presenciaManagerRef.current.forzarCierreSesion(targetUserId, targetEmail, targetNombre);
  }, []);

  const value = {
    scr, setScr,
    asegurarDetalle,
    // Para que la barra de arriba pueda avisar que lo que se ve es de muestra.
    // Se apaga solo: en cuanto haya un registro de verdad en TODAS las
    verEjemplos: false,
    ejemplosOcultos,
    // Quita los de muestra de todas las listas a la vez. No hay vuelta atras
    // en la sesion, y no hace falta: al recargar vuelven, porque las tablas
    // siguen vacias.
    ocultarEjemplos: () => {
      try {
        localStorage.setItem("ingeanclajes_ejemplos_ocultos", "true");
        localStorage.setItem("ingeanclajes_tareas_produccion", "[]");
        localStorage.setItem("ingeanclajes_documentos_equipo", "[]");
      } catch {}
      setEjemplosOcultos(true);
      setObras(sinEjemplos);
      setCotizaciones(sinEjemplos);
      setClientes(sinEjemplos);
      setInformes(sinEjemplos);
      setCerts(sinEjemplos);
      setPagos(sinEjemplos);
      setAgenda(sinEjemplos);
      setTareasProduccion([]);
      setDocumentosEquipo([]);
    },
    agenda, setAgenda,
    tareasPersonales, setTareasPersonales,
    tareasProduccion, setTareasProduccion,
    documentosEquipo, setDocumentosEquipo,
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
    authUserEmail,
    // Presencia y control remoto exclusivo (cristiandel48@gmail.com)
    usuariosEnLinea,
    ultimasConexiones,
    setUltimasConexiones,
    esSuperAdminCristian,
    cerrarSesionRemota,
    // Kill switch (solo usable por cristiandel48@gmail.com)
    appBloqueada,
    setAppBloqueada,
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
