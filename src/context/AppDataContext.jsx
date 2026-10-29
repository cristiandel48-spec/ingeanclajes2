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
import { confirmar } from "../lib/dialogos";
import { entidadesSinPermiso, esDueno, puedeVerPagoEmpleados } from "../lib/permisos";
import { iniciarSeguimientoActividad } from "../lib/seguridadSesion";
import {
  cargarCacheUltimasConexionesLocal,
  guardarCacheUltimasConexionesLocal,
  obtenerUltimasConexionesDeEmpresa,
  mezclarUltimasConexiones,
} from "../lib/actividadConexiones";
import { detectarDispositivo } from "../lib/backend/presencia";
import { DOCUMENTOS_EQUIPO_INIT, limpiarDocumentosEjemplo } from "../screens/Produccion/documentosSeed";
import { TAREAS_PRODUCCION_INIT, limpiarTareasEjemplo } from "../screens/Produccion/tareasSeed";
import { sanitizarListaCertificados } from "../screens/Certificaciones/certSanitizer";

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

  // Documentos y notas del modulo «Mis tareas y recordatorios». Son de cada
  // persona, igual que las tareas de arriba: en la nube lo garantiza la RLS
  // de la migracion 059, y aqui la copia local va por usuario para que en un
  // computador compartido una persona no abra las notas de otra.
  //
  // Antes la copia local era una sola clave para todo el mundo
  // (`ingeanclajes_documentos_equipo`), asi que en el PC de la obra se veian
  // las notas de quien hubiera entrado antes.
  const [documentosEquipo, setDocumentosEquipo] = useState([]);
  const [almacenDocumentos, setAlmacenDocumentos] = useState(null);
  // Mientras no se hayan leido, la lista en memoria esta vacia por no haberla
  // cargado aun: subirla borraria de la base todos los documentos de la
  // persona. Ver tareasCargadasRef, que resuelve lo mismo para las tareas.
  const documentosCargadosRef = useRef(false);

  useEffect(() => {
    if (!almacenDocumentos) return;
    const limpias = limpiarDocumentosEjemplo(documentosEquipo);
    try {
      localStorage.setItem(
        almacenDocumentos.clave,
        JSON.stringify({ v: 1, modoLocal: almacenDocumentos.modoLocal, items: limpias })
      );
    } catch (e) {
      console.warn("No se pudo guardar los documentos en localStorage", e);
    }
  }, [documentosEquipo, almacenDocumentos]);

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

  // Numeros reasignados al guardar. Si un registro nuevo choco con un numero
  // que otra persona ya habia usado, se guardo con el siguiente libre (ver
  // dataService.insertMany). Aqui se corrige la copia de la aplicacion: el id
  // del registro, los vinculos que lo apuntan y el numero de cotizacion que
  // haya puesto la base. Las pantallas con un formulario abierto se enteran
  // por el evento «ids-reasignados».
  useEffect(() => {
    const SETTERS = {
      obras: setObras, empleados: setEmpleados, cargos: setCargos, pagos: setPagos,
      horarios: setHorarios, certs: setCerts, informes: setInformes, clientes: setClientes,
      proveedores: setProveedores, cuentas: setCuentas, ordenesCompra: setOrdenesCompra,
      cotizaciones: setCotizaciones, agenda: setAgenda, catalogoItems: setCatalogoItems,
    };
    // Campo con el que otros registros apuntan a uno de esta entidad.
    const VINCULOS = {
      obras: "obraId", cotizaciones: "cotizacionId", proveedores: "proveedorId",
      empleados: "empleadoId", cuentas: "facturaVinculadaId",
    };
    const COLECCIONES_CON_VINCULOS = [
      "obras", "cotizaciones", "informes", "certs", "cuentas", "pagos",
      "horarios", "agenda", "ordenesCompra",
    ];

    // Edicion simultanea: otra persona guardo cambios en un registro que esta
    // persona tambien cambio. No se piso nada; aqui se le pregunta con cual
    // quedarse. Un aviso por registro aunque el autoguardado lo vuelva a
    // detectar mientras la pregunta esta abierta.
    const preguntando = new Set();
    backend.setAlDetectarConflictos(async (conflictos) => {
      for (const c of conflictos) {
        const clave = `${c.entity}:${c.item.id}`;
        if (preguntando.has(clave)) continue;
        preguntando.add(clave);
        try {
          const nombre = [
            c.item.numero || c.item.id,
            c.item.proyecto || c.item.obra || c.item.cliente || c.item.nombre || c.item.titulo || "",
          ].filter(Boolean).join(" · ");
          const quien = String(c.enBase?.modificadoPorNombre || "").trim() || "Otra persona";
          // Cerrar el aviso sin elegir devuelve null: no se toca nada, el
          // registro sigue pendiente y se vuelve a preguntar al guardar.
          const quedarseConLaMia = await confirmar(c.enBase
            ? {
                alCerrar: null,
                titulo: `${quien} también cambió ${nombre}`,
                mensaje:
                  "Mientras lo editabas, otra persona guardó cambios en este mismo registro. Tus cambios en él todavía no se han guardado.\n\n" +
                  "«Guardar la mía»: tus cambios reemplazan los suyos.\n" +
                  "«Ver la suya»: se descartan tus cambios en este registro y ves lo que guardó la otra persona.",
                textoConfirmar: "Guardar la mía",
                textoCancelar: "Ver la suya",
                destructivo: false,
                conGuardando: false,
              }
            : {
                alCerrar: null,
                titulo: `Otra persona eliminó ${nombre}`,
                mensaje:
                  "Mientras lo editabas, otra persona lo eliminó. Tus cambios en él todavía no se han guardado.\n\n" +
                  "«Recuperarlo»: se vuelve a crear con tus cambios.\n" +
                  "«Dejarlo eliminado»: se descartan tus cambios.",
                textoConfirmar: "Recuperarlo",
                textoCancelar: "Dejarlo eliminado",
                destructivo: false,
                conGuardando: false,
              });

          if (quedarseConLaMia === null) continue;
          if (quedarseConLaMia) {
            backend.forzarGuardado(c.entity, c.item.id);
          } else if (c.enBase) {
            await backend.aceptarVersionBase(c.entity, c.enBase, c.versionBase);
            SETTERS[c.stateKey]?.((lista) => (Array.isArray(lista) ? lista : []).map((item) =>
              item?.id === c.item.id ? { ...c.enBase, __parcial: false } : item
            ));
          } else {
            backend.olvidarRegistro(c.entity, c.item.id);
            SETTERS[c.stateKey]?.((lista) => (Array.isArray(lista) ? lista : []).filter((item) => item?.id !== c.item.id));
          }
        } finally {
          preguntando.delete(clave);
        }
        // Se guarda ya con la decision tomada, sin esperar a otro cambio.
        saveAllToCloudRef.current?.();
      }
    });

    backend.setAlReasignarIds((cambios) => {
      for (const { entity, stateKey, viejo, nuevo, campos } of cambios) {
        const setter = SETTERS[stateKey];
        if (setter) {
          setter((lista) => (Array.isArray(lista) ? lista : []).map((item) =>
            item?.id === viejo ? { ...item, id: nuevo, ...(campos || {}) } : item
          ));
        }
        const campo = VINCULOS[entity];
        if (campo && viejo !== nuevo) {
          for (const clave of COLECCIONES_CON_VINCULOS) {
            SETTERS[clave]?.((lista) => (Array.isArray(lista) ? lista : []).map((item) =>
              item?.[campo] === viejo ? { ...item, [campo]: nuevo } : item
            ));
          }
        }
      }
      try {
        window.dispatchEvent(new CustomEvent("ids-reasignados", { detail: cambios }));
      } catch { /* sin ventana: no hay formularios abiertos que avisar */ }
    });
    return () => {
      backend.setAlReasignarIds(null);
      backend.setAlDetectarConflictos(null);
    };
  }, []);

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

  // Apagado remoto del sistema (migracion 067). Antes era una marca en
  // empresaConfig, que cualquier usuario podia escribir, y solo escondia la
  // pantalla. Ahora vive en app.estado_sistema: solo el dueño lo cambia (la
  // base mira el correo de la sesion) y, mientras esta apagado, la base no
  // entrega datos a nadie mas. Este estado solo decide que pantalla mostrar.
  const [appBloqueada, setAppBloqueadaLocal] = useState(false);

  const setAppBloqueada = async (valor) => {
    // Si la base lo rechaza (no es el dueño), el error sube a la pantalla.
    await backend.cambiarBloqueoSistema(Boolean(valor));
    setAppBloqueadaLocal(Boolean(valor));

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
  const limpiarIntencion = useCallback((pantalla) => {
    setIntencion((prev) => (!pantalla || prev?.pantalla === pantalla ? null : prev));
  }, []);
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
      ...(documentosCargadosRef.current ? { documentosEquipo } : {}),
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

  // Los guardados van uno detras de otro. Antes podian cruzarse: el
  // autoguardado, un reintento y el aviso de «volvio la conexion» arrancaban a
  // la vez. Con el control de version (edicion simultanea) eso es peor: el
  // segundo usaria la version vieja del registro y la persona veria un aviso
  // de que «otra persona» lo cambio, cuando fue ella misma un segundo antes.
  // Quien llega mientras otro guarda espera su turno, y guarda lo mas
  // reciente (el payload se arma al empezar, no al pedirlo).
  const guardadoEnCursoRef = useRef(null);
  const saveAllToCloud = async (override = null) => {
    while (guardadoEnCursoRef.current) {
      try {
        await guardadoEnCursoRef.current;
      } catch {
        // El fallo del anterior lo maneja el anterior.
      }
    }
    const promesa = guardarEnNubeAhora(override);
    guardadoEnCursoRef.current = promesa;
    try {
      return await promesa;
    } finally {
      if (guardadoEnCursoRef.current === promesa) guardadoEnCursoRef.current = null;
    }
  };

  const guardarEnNubeAhora = async (override = null) => {
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

    // La clave compartida de los documentos se borra en cuanto se pasa por
    // aqui: mientras exista, en un computador de la oficina cualquiera que
    // abra la aplicacion ve las notas del anterior antes de que responda la
    // nube. Lo que hubiera dentro ya esta en la base de su dueño.
    const borrarCopiaCompartidaDeDocumentos = () => {
      try {
        localStorage.removeItem("ingeanclajes_documentos_equipo");
      } catch (e) {
        console.warn("No se pudo borrar la copia compartida de documentos", e);
      }
    };

    const bootstrapCloudData = async () => {
      // Sin nube la lista vive solo aqui, asi que siempre esta pendiente.
      if (!isSupabaseConfigured()) {
        const clave = "tareas_personales:local";
        setTareasPersonales(leerTareasLocales(clave).items);
        setAlmacenTareas({ clave, modoLocal: true });
        tareasCargadasRef.current = true;

        const claveDocs = "documentos_equipo:local";
        setDocumentosEquipo(limpiarDocumentosEjemplo(leerTareasLocales(claveDocs).items));
        setAlmacenDocumentos({ clave: claveDocs, modoLocal: true });
        documentosCargadosRef.current = true;

        bootstrappedRef.current = true;
        return;
      }

      // La clave sale del usuario de la sesion, no de la membresia: si la
      // membresia falla -un choque de pestanas, un corte- las tareas se
      // cargarian igual, y antes eso dejaba la lista vacia y el autoguardado
      // borraba de la base todas las de esa persona.
      let claveTareas = "tareas_personales:local";
      let claveDocumentos = "documentos_equipo:local";
      try {
        const user = await reintentandoSiChocanPestanas(() => getSessionUser());
        if (user?.id) {
          claveTareas = `tareas_personales:${user.id}`;
          claveDocumentos = `documentos_equipo:${user.id}`;
        }
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
            // Las tablas que la base no le deja escribir no se intentan guardar.
            if (mia) backend.setEntidadesSinPermiso(entidadesSinPermiso(mia));
            // Sin Personal, los empleados se leen sin salarios ni cuentas.
            if (mia) backend.setLecturaEmpleadosReducida(!puedeVerPagoEmpleados(mia));
          }
        } catch (error) {
          console.error("No se pudo leer el rol del usuario:", error);
        }

        // Sistema apagado: para quien no es el dueño la base no entrega datos,
        // asi que no se cargan. Sin carga tampoco se guarda nada.
        try {
          const { bloqueado } = await backend.leerBloqueoSistema();
          if (cancel) return;
          setAppBloqueadaLocal(bloqueado);
          const sesion = await getSessionUser().catch(() => null);
          if (bloqueado && !esDueno({ email: sesion?.email })) return;
        } catch (error) {
          console.warn("No se pudo leer el estado del sistema:", error);
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

        // Los documentos siguen exactamente la misma regla que las tareas.
        {
          const faltaTabla = (cloud.__tablasFaltantes || []).includes("documentos_equipo");
          const nube = Array.isArray(cloud.documentosEquipo)
            ? limpiarDocumentosEjemplo(cloud.documentosEquipo)
            : [];
          const local = leerTareasLocales(claveDocumentos);
          const localLimpio = limpiarDocumentosEjemplo(local.items);

          if (faltaTabla) {
            setDocumentosEquipo(localLimpio);
            setAlmacenDocumentos({ clave: claveDocumentos, modoLocal: true });
          } else {
            const enNube = new Set(nube.map((d) => d?.id));
            const pendientes = local.modoLocal
              ? localLimpio.filter((d) => d?.id && !enNube.has(d.id))
              : [];
            setDocumentosEquipo([...nube, ...pendientes]);
            setAlmacenDocumentos({ clave: claveDocumentos, modoLocal: false });
          }
          documentosCargadosRef.current = true;
          borrarCopiaCompartidaDeDocumentos();
        }

        // Aqui corria una «depuracion» de obras duplicadas en cada arranque:
        // borraba las obras sobrantes de una misma cotizacion y renumeraba las
        // siguientes (OB-033 pasaba a OB-031). Decidia que obra tenia trabajo
        // mirando la bitacora, que no se descarga al arrancar, asi que podia
        // borrar una obra con bitacora y fotos, y cambiaba numeros ya usados en
        // informes y documentos entregados. Se quito: los datos se cargan tal
        // como estan en la base. La causa de los duplicados ya estaba cerrada
        // (aprobar una cotizacion reutiliza su obra en vez de crear otra).
        const obrasList = Array.isArray(cloud.obras) ? cloud.obras : [];
        const clientesList = Array.isArray(cloud.clientes) ? cloud.clientes : [];
        const cotizacionesList = Array.isArray(cloud.cotizaciones) ? cloud.cotizaciones : [];
        const otrasEntidades = {
          cuentas: Array.isArray(cloud.cuentas) ? cloud.cuentas : [],
          pagos: Array.isArray(cloud.pagos) ? cloud.pagos : [],
          horarios: Array.isArray(cloud.horarios) ? cloud.horarios : [],
          certs: Array.isArray(cloud.certs) ? cloud.certs : [],
          informes: Array.isArray(cloud.informes) ? cloud.informes : [],
          ordenesCompra: Array.isArray(cloud.ordenesCompra) ? cloud.ordenesCompra : [],
        };

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
        const certsLimpios = sanitizarListaCertificados(otrasEntidades.certs, { clientes: clientesList, obras: obrasList });
        if (Array.isArray(cloud.certs)) setCerts(oEjemplo(certsLimpios, EJEMPLOS.certs));
        if (Array.isArray(cloud.informes)) setInformes(oEjemplo(otrasEntidades.informes, EJEMPLOS.informes));
        if (Array.isArray(cloud.clientes)) setClientes(oEjemplo(cloud.clientes, EJEMPLOS.clientes));
        if (Array.isArray(cloud.proveedores)) setProveedores(cloud.proveedores);
        if (Array.isArray(cloud.cuentas)) setCuentas(otrasEntidades.cuentas);
        // Ordenes de compra y agenda: manda la nube, aunque venga vacia. Antes,
        // con la nube vacia se quedaba la copia de este navegador, y el
        // autoguardado la volvia a subir: lo que otra persona habia borrado
        // reaparecia. La copia local solo vale si la tabla no existe todavia.
        const faltan = cloud.__tablasFaltantes || [];
        if (Array.isArray(cloud.ordenesCompra) && !faltan.includes("ordenes_compra")) {
          setOrdenesCompra(otrasEntidades.ordenesCompra);
        }
        if (Array.isArray(cloud.agenda) && !faltan.includes("agenda")) {
          setAgenda(cloud.agenda.filter((item) => !item?.__ejemplo && !String(item?.id || "").startsWith("AG-90")));
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
  //
  // Ese aviso lo pinta el navegador («¿Quieres volver a cargar el sitio
  // web?») y ningun navegador deja cambiar como se ve. Pero la forma mas
  // comun de dispararlo es recargar con F5 o Ctrl+R, y eso si se puede
  // atrapar: se pregunta con el dialogo del programa, se guarda y entonces
  // se recarga, sin que llegue a salir el del navegador. El aviso del
  // navegador queda solo para cerrar la pestana o el boton de recargar, que
  // una pagina no puede interceptar.
  const saltarAvisoRef = useRef(false);
  useEffect(() => {
    const enRiesgo = hasPendingChanges || saveState === "error";
    if (!enRiesgo) return;
    const onBeforeUnload = (event) => {
      if (saltarAvisoRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const recargar = () => {
      saltarAvisoRef.current = true;
      window.location.reload();
    };
    const onTecla = async (event) => {
      const esRecargar = event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "r");
      if (!esRecargar) return;
      event.preventDefault();
      const guardar = await confirmar({
        titulo: "¿Volver a cargar la página?",
        mensaje: "Hay cambios que todavía no se han guardado en la nube. Primero se guardan y luego se recarga.",
        textoConfirmar: "Guardar y recargar",
        destructivo: false,
      });
      if (!guardar) return;
      const resultado = await saveAllToCloudRef.current?.();
      if (resultado?.ok) {
        recargar();
        return;
      }
      const igual = await confirmar({
        titulo: "No se pudieron guardar los cambios",
        mensaje: "Revisa la conexión a internet. Si recargas ahora, los cambios que no se guardaron se pierden.",
        textoConfirmar: "Recargar sin guardar",
        textoCancelar: "No recargar",
        destructivo: true,
        conGuardando: false,
      });
      if (igual) recargar();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onTecla, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onTecla, true);
    };
  }, [hasPendingChanges, saveState]);

  // Sanea certificados con datos erróneos de obra en dirección fiscal
  useEffect(() => {
    if (!certs || !certs.length || !clientes || !clientes.length) return;
    setCerts((prev) => sanitizarListaCertificados(prev, { clientes, obras }));
  }, [clientes, obras]);

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

  // Seguimiento de actividad: mantiene al dia la ultima conexion de cada
  // usuario. No cierra la sesion; solo quien sale lo hace, o un cierre remoto.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const seguimiento = iniciarSeguimientoActividad();

    return () => {
      seguimiento.destruir();
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
      } catch { /* sin almacenamiento del navegador: se sigue igual */ }
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
