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
  // Cuantas frases definitivas se han entregado ya en esta sesion de escucha.
  const entregadosRef = useRef(0);
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
      // `results` arranca de cero en cada sesion de escucha, asi que el
      // contador de lo ya entregado tiene que arrancar de cero tambien.
      entregadosRef.current = 0;
    };

    reconocedor.onresult = (evento) => {
      // NO se usa `evento.resultIndex`: hay navegadores que lo devuelven
      // siempre en 0, y entonces cada evento reenvia TODAS las frases dichas
      // hasta ese momento. Al pegarlas se producia el efecto bola de nieve
      // ("Hola Hola constructora Hola constructora Velez...").
      //
      // Se lleva la cuenta propia de cuantas frases definitivas ya se
      // entregaron, y solo se manda lo que viene despues.
      let definitivo = "";
      for (let i = entregadosRef.current; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        // En cuanto aparece una no definitiva, las siguientes tampoco lo son.
        if (!resultado.isFinal) break;
        definitivo += resultado[0].transcript;
        entregadosRef.current = i + 1;
      }
      if (definitivo) onTextoRef.current?.(definitivo, { definitivo: true });
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
