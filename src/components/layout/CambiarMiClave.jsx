// Cambiar la propia contraseña. Cualquiera que tenga sesión puede hacerlo, sin
// pasar por la jefa: la persona recibe una contraseña provisional por correo y
// necesita poder reemplazarla ella misma.
import { useEffect, useRef, useState } from "react";
import * as backend from "../../lib/backend";

const MINIMO = 8;

const campo = {
  width: "100%", boxSizing: "border-box",
  background: "#fff", border: "1px solid #e4e7ec", borderRadius: 10,
  color: "#101828", padding: "12px 13px",
  // 16px evita que Safari en iPhone haga zoom al enfocar.
  fontSize: 16, outline: "none", fontFamily: "inherit",
};

const etiqueta = {
  display: "block", fontSize: 12.5, fontWeight: 600,
  color: "#344054", marginBottom: 6,
};

export default function CambiarMiClave({ onCerrar }) {
  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const primerCampo = useRef(null);

  useEffect(() => { primerCampo.current?.focus(); }, []);

  useEffect(() => {
    const alTeclear = (e) => { if (e.key === "Escape" && !guardando) onCerrar(); };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar, guardando]);

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

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) onCerrar(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(9,11,16,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, padding: "26px 24px",
        width: "100%", maxWidth: 400, boxSizing: "border-box",
        boxShadow: "0 24px 60px -20px rgba(16,24,40,.3)",
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}>
        {listo ? (
          <>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#101828" }}>
              Contraseña cambiada
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "#667085", lineHeight: 1.6 }}>
              La próxima vez que entres, usa la nueva. Si te llegó una por correo, ya puedes borrar
              ese mensaje.
            </p>
            <button onClick={onCerrar} style={{
              width: "100%", background: "#cc0000", color: "#fff", border: "none",
              borderRadius: 10, padding: "13px 18px", fontSize: 14.5, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Entendido
            </button>
          </>
        ) : (
          <>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#101828" }}>
              Cambiar mi contraseña
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#667085", lineHeight: 1.55 }}>
              Mínimo {MINIMO} caracteres. Elige una que recuerdes: nadie más puede verla.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={etiqueta} htmlFor="clave-nueva">Nueva contraseña</label>
              <input id="clave-nueva" ref={primerCampo} type="password" value={clave}
                onChange={(e) => setClave(e.target.value)} style={campo} autoComplete="new-password" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={etiqueta} htmlFor="clave-repetida">Escríbela otra vez</label>
              <input id="clave-repetida" type="password" value={repetida}
                onChange={(e) => setRepetida(e.target.value)} style={campo} autoComplete="new-password"
                onKeyDown={(e) => { if (e.key === "Enter") guardar(); }} />
            </div>

            {error && (
              <div style={{
                background: "#fef3f2", border: "1px solid #fecdca", color: "#cc0000",
                borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 14, lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={guardar} disabled={guardando} style={{
                flex: 1, background: "#cc0000", color: "#fff", border: "none",
                borderRadius: 10, padding: "13px 18px", fontSize: 14.5, fontWeight: 700,
                cursor: guardando ? "default" : "pointer", opacity: guardando ? .7 : 1,
                fontFamily: "inherit",
              }}>
                {guardando ? "Guardando…" : "Cambiar"}
              </button>
              <button onClick={onCerrar} disabled={guardando} style={{
                background: "#fff", color: "#475467", border: "1px solid #e4e7ec",
                borderRadius: 10, padding: "13px 18px", fontSize: 14.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
