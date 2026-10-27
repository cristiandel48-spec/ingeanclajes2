import { useCallback, useEffect, useRef, useState } from "react";
import { listarEnviosFirma, listarEstadosFirma } from "../lib/firmaRecibido";

// Cada cuanto se vuelve a mirar si el cliente ya firmo, mientras haya un
// envio pendiente y la pestaña este a la vista.
const CADA_MS = 20000;

const pendiente = (e) => e.estado === "enviado" || e.estado === "abierto";

// Envios a firma de recibido de un documento, para su panel. `tipo` dice de
// cual: «informe» o «acta» de entrega.
//
// Mientras alguno este pendiente se vuelve a consultar solo: antes habia que
// salir del informe y volver a entrar para ver que el cliente ya habia
// firmado. `onFirmado(envio)` avisa cuando uno pasa a firmado.
export function useEnviosFirma(documentoId, { tipo = "informe", onFirmado } = {}) {
  const [envios, setEnvios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const anteriores = useRef(new Map());
  const avisar = useRef(onFirmado);
  useEffect(() => { avisar.current = onFirmado; });

  const recargar = useCallback(async () => {
    if (!documentoId) { setEnvios([]); anteriores.current = new Map(); return; }
    setCargando(true);
    try {
      const lista = await listarEnviosFirma(tipo, documentoId);
      for (const e of lista) {
        const antes = anteriores.current.get(e.id);
        if (antes && antes !== "firmado" && e.estado === "firmado") avisar.current?.(e);
      }
      anteriores.current = new Map(lista.map((e) => [e.id, e.estado]));
      setEnvios(lista);
    } catch (e) {
      console.warn("No se pudieron leer los envíos a firma:", e);
    } finally {
      setCargando(false);
    }
  }, [documentoId, tipo]);

  useEffect(() => { recargar(); }, [recargar]);

  const hayPendiente = envios.some(pendiente);
  useEffect(() => {
    if (!hayPendiente) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") recargar();
    }, CADA_MS);
    // Al volver a la pestaña se mira de una vez, sin esperar el turno.
    const alVolver = () => { if (document.visibilityState === "visible") recargar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [hayPendiente, recargar]);

  return { envios, cargando, recargar };
}

// Estado de firma de todos los informes, para marcar los firmados en la
// lista: { [informeId]: "firmado" | "abierto" | "enviado" }.
export function useEstadosFirmaInformes(activo = true) {
  const [estados, setEstados] = useState({});
  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    const cargar = () => listarEstadosFirma("informe")
      .then((r) => { if (vivo) setEstados(r); })
      .catch((e) => console.warn("No se pudo leer el estado de las firmas:", e));
    cargar();
    const id = setInterval(() => { if (document.visibilityState === "visible") cargar(); }, CADA_MS * 3);
    return () => { vivo = false; clearInterval(id); };
  }, [activo]);
  return estados;
}
