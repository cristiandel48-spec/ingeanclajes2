// Cambiar la propia contraseña. Cualquiera que tenga sesión puede hacerlo, sin
// pasar por la jefa: la persona recibe una contraseña provisional por correo y
// necesita poder reemplazarla ella misma.
//
// Es una Sheet del kit: antes era un modal propio -el sexto del proyecto, con
// su radio 16 y sus campos copiados- que no cerraba con Escape ni devolvia el
// foco, y cuyos campos no tenian señal de foco.
import { useState } from "react";
import * as backend from "../../lib/backend";
import { Sheet, Input, Button, Callout } from "../ui";
import { TIPO } from "../../styles/designTokens";

const MINIMO = 8;

export default function CambiarMiClave({ onCerrar }) {
  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // El foco en el primer campo lo pone la propia Sheet al abrirse.
  const guardar = async () => {
    if (clave.length < MINIMO) return setError(`La contraseña debe tener al menos ${MINIMO} caracteres.`);
    if (clave !== repetida) return setError("Las dos contraseñas no son iguales.");

    setGuardando(true);
    setError("");
    try {
      const supabase = backend.getSupabaseClient();
      const { error: err } = await supabase.auth.updateUser({ password: clave });
      if (err) throw err;
      setListo(true);
    } catch (e) {
      const texto = String(e?.message || "").toLowerCase();
      setError(
        texto.includes("should be different")
          ? "Esa es la contraseña que ya tenías. Escribe una distinta."
          : texto.includes("weak") || texto.includes("password")
            ? "Esa contraseña es muy fácil de adivinar. Prueba con una más larga."
            : e?.message || "No se pudo cambiar la contraseña."
      );
    } finally {
      setGuardando(false);
    }
  };

  if (listo) {
    return (
      <Sheet
        titulo="Contraseña cambiada"
        onCerrar={onCerrar}
        pie={<Button variante="primary" onClick={onCerrar}>Entendido</Button>}
      >
        <p style={{ ...TIPO.body, color: "var(--text-secondary)", margin: 0 }}>
          La próxima vez que entres, usa la nueva. Si te llegó una por correo, ya puedes borrar
          ese mensaje.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet
      titulo="Cambiar mi contraseña"
      subtitulo={`Mínimo ${MINIMO} caracteres. Elige una que recuerdes: nadie más puede verla.`}
      onCerrar={guardando ? undefined : onCerrar}
      cerrarAlPulsarFondo={!guardando}
      pie={
        <>
          <Button variante="secondary" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variante="primary" onClick={guardar} cargando={guardando}>
            Cambiar
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 16 }}>
        <Input
          id="clave-nueva"
          label="Nueva contraseña"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          autoComplete="new-password"
        />
        <Input
          id="clave-repetida"
          label="Escríbela otra vez"
          type="password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          autoComplete="new-password"
          onKeyDown={(e) => { if (e.key === "Enter") guardar(); }}
        />
        {error && <Callout tono="peligro">{error}</Callout>}
      </div>
    </Sheet>
  );
}
