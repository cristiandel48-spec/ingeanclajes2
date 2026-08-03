import { useCallback, useEffect, useRef, useState } from "react";

// Dictado por voz con el reconocedor que ya trae el navegador.
//
// No hay servidor ni costo: el navegador escucha y devuelve el texto. Lo usa
// quien esta en obra con el celular en la mano y quien redacta el alcance de
// una cotizacion sin ganas de teclear tres parrafos.
//
// LIMITES QUE HAY QUE CONOCER:
// - Firefox no lo trae. Por eso `soportado`: el boton no se muestra alli, que
//   es mejor que un boton que no hace nada.
// - En Chrome de escritorio el audio se transcribe en servidores de Google.
//   No es local. Se avisa en la interfaz, porque son datos del cliente.
// - La puntuacion hay que dictarla: "punto", "coma".
// - Referencias tecnicas y apellidos salen mal seguido. Sirve para parrafos,
//   no para datos exactos.

const Reconocedor =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const dictadoDisponible = () => Boolean(Reconocedor);

const MENSAJES_ERROR = {
  "not-allowed": "No diste permiso al micrófono. Búscalo en el candado de la barra de direcciones y actívalo.",
  "service-not-allowed": "El navegador bloqueó el micrófono. Revisa los permisos del sitio.",
  "audio-capture": "No se encontró ningún micrófono conectado.",
  // "network" casi nunca es falta de internet: la app ya cargó. Es que no se
  // pudo llegar al servicio que transcribe. Pasa en navegadores Chromium sin
  // las claves de Google (Brave, Opera, Vivaldi) y en redes con firewall.
  network: "No se pudo contactar el servicio que transcribe. Suele pasar en Brave, Opera o Vivaldi, y en redes con restricciones. Prueba en Chrome o Edge, o usa el dictado del teclado (tecla Windows + H).",
  "no-speech": "No se escuchó nada. Acércate al micrófono y vuelve a intentar.",
};

export function useDictado({ onTexto, lang = "es-CO" } = {}) {
  const [escuchando, setEscuchando] = useState(false);
  const [error, setError] = useState("");
  const reconocedorRef = useRef(null);
  // Texto que ya se entrego en esta sesion de escucha, para no repetirlo.
  const entregadoRef = useRef("");
  // Chrome corta la escucha solo cada tanto. Si la persona no le dio a parar,
  // se vuelve a arrancar; sin esto el dictado se muere a media frase.
  const queremosEscucharRef = useRef(false);
  // El reconocedor se crea una vez y vive fuera de React, asi que necesita
  // una referencia siempre fresca a quien recibe el texto. Se actualiza en un
  // efecto, no durante el render.
  const onTextoRef = useRef(onTexto);
  useEffect(() => {
    onTextoRef.current = onTexto;
  }, [onTexto]);

  const detener = useCallback(() => {
    queremosEscucharRef.current = false;
    setEscuchando(false);
    try {
      reconocedorRef.current?.stop();
    } catch {
      // Ya estaba detenido.
    }
  }, []);

  const arrancar = useCallback(() => {
    if (!Reconocedor) return;
    setError("");

    const reconocedor = new Reconocedor();
    reconocedor.lang = lang;
    reconocedor.continuous = true;
    reconocedor.interimResults = true;

    reconocedor.onstart = () => {
      // `results` arranca de cero en cada sesion de escucha.
      entregadoRef.current = "";
    };

    reconocedor.onresult = (evento) => {
      // El efecto bola de nieve ("Hola Hola constructora Hola constructora
      // Velez...") sale de dos comportamientos que cambian segun el navegador:
      //
      //   a) `resultIndex` llega en 0 siempre, asi que recorrer desde ahi
      //      reenvia todas las frases anteriores.
      //   b) cada resultado trae la frase ACUMULADA, no solo el trozo nuevo.
      //
      // En vez de confiar en el navegador, se reconstruye el texto de la
      // sesion absorbiendo las dos formas, y despues se entrega unicamente lo
      // que aun no habia salido.
      let completo = "";
      for (let i = 0; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        if (!resultado.isFinal) continue;
        const trozo = String(resultado[0].transcript || "").trim();
        if (!trozo) continue;
        if (!completo) completo = trozo;
        else if (trozo.startsWith(completo)) completo = trozo;   // viene acumulado
        else if (completo.endsWith(trozo)) continue;             // repetido
        else completo += " " + trozo;                            // trozo nuevo
      }

      const yaEntregado = entregadoRef.current;
      if (!completo || completo === yaEntregado) return;

      const nuevo = yaEntregado && completo.startsWith(yaEntregado)
        ? completo.slice(yaEntregado.length)
        : completo;
      entregadoRef.current = completo;

      const limpio = nuevo.trim();
      if (limpio) onTextoRef.current?.(limpio, { definitivo: true });
    };

    reconocedor.onerror = (evento) => {
      // "aborted" es lo que pasa al pulsar parar: no es un fallo.
      if (evento.error === "aborted") return;
      // Un silencio no debe matar el dictado si la persona sigue grabando.
      if (evento.error === "no-speech" && queremosEscucharRef.current) return;
      setError(MENSAJES_ERROR[evento.error] || "No se pudo usar el micrófono.");
      queremosEscucharRef.current = false;
      setEscuchando(false);
    };

    reconocedor.onend = () => {
      if (queremosEscucharRef.current) {
        try {
          reconocedor.start();
          return;
        } catch {
          // No se pudo reanudar: se cae a detenido, mas abajo.
        }
      }
      setEscuchando(false);
    };

    reconocedorRef.current = reconocedor;
    queremosEscucharRef.current = true;
    try {
      reconocedor.start();
      setEscuchando(true);
    } catch {
      setError("No se pudo iniciar el micrófono. Vuelve a intentar.");
      queremosEscucharRef.current = false;
      setEscuchando(false);
    }
  }, [lang]);

  const alternar = useCallback(() => {
    if (escuchando) detener();
    else arrancar();
  }, [escuchando, arrancar, detener]);

  // Si la pantalla se cierra a media grabacion, el microfono se queda abierto.
  useEffect(() => () => {
    queremosEscucharRef.current = false;
    try {
      reconocedorRef.current?.abort();
    } catch {
      // Nada que hacer al desmontar.
    }
  }, []);

  return { escuchando, alternar, detener, error, soportado: Boolean(Reconocedor) };
}
