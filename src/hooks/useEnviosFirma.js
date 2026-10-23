import { useCallback, useEffect, useState } from "react";
import { listarEnviosFirma } from "../lib/firmaRecibido";

// Envios a firma de recibido de un informe, para el panel del informe.
export function useEnviosFirma(informeId) {
  const [envios, setEnvios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const recargar = useCallback(async () => {
    if (!informeId) { setEnvios([]); return; }
    setCargando(true);
    try {
      setEnvios(await listarEnviosFirma("informe", informeId));
    } catch (e) {
      console.warn("No se pudieron leer los envíos a firma:", e);
    } finally {
      setCargando(false);
    }
  }, [informeId]);
  useEffect(() => { recargar(); }, [recargar]);
  return { envios, cargando, recargar };
}
