import { useState } from "react";
import { Button, Callout } from "./ui";
import { FUENTE, TIPO } from "../styles/designTokens";
import { TERMINOS_USO, POLITICA_DATOS, VERSION_TERMINOS, EMPRESA } from "../lib/terminos";
import logoIngeanclajes from "../assets/logo-ingeanclajes.jpeg";

// Pantalla que se muestra al entrar cuando la persona todavia no ha aceptado
// la version vigente de los Terminos de uso y la Politica de datos. No deja
// pasar sin aceptar: la otra salida es cerrar la sesion.
//
// Mismo lenguaje que las pantallas de acceso (SupabaseGate): sin tarjeta,
// centrado sobre el fondo, con el logotipo como icono de aplicacion. Es mas
// ancha porque aqui hay que leer.

function Documento({ titulo, secciones }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", margin: "0 0 12px" }}>
        {titulo}
      </h2>
      {secciones.map((s) => (
        <div key={s.titulo} style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>{s.titulo}</h3>
          {s.parrafos.map((p, i) => (
            <p key={i} style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", margin: "0 0 6px" }}>{p}</p>
          ))}
        </div>
      ))}
    </section>
  );
}

export default function AceptacionTerminos({ email, onAceptar, onSalir }) {
  const [marcado, setMarcado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  const aceptar = async () => {
    if (!marcado || ocupado) return;
    setOcupado(true);
    setError("");
    try {
      await onAceptar();
    } catch (e) {
      setError(`No se pudo guardar tu aceptación: ${e?.message || "intenta de nuevo"}.`);
      setOcupado(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg-app)",
        padding: "32px 16px",
        display: "flex",
        justifyContent: "center",
        fontFamily: FUENTE,
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 13, background: "#ffffff", border: "1px solid var(--separator)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <img src={logoIngeanclajes} alt="" style={{ width: 46, height: 46, objectFit: "contain" }} />
          </div>
        </div>

        <h1 style={{ fontSize: 26, lineHeight: "32px", fontWeight: 700, letterSpacing: "-0.024em", color: "var(--text-primary)", textAlign: "center", margin: "0 0 6px" }}>
          Antes de continuar
        </h1>
        <p style={{ ...TIPO.body, color: "var(--text-tertiary)", textAlign: "center", margin: "0 auto 20px", maxWidth: "46ch" }}>
          Lee y acepta los Términos de uso y la Política de tratamiento de datos de {EMPRESA.razonSocial}
        </p>

        {/* El texto va en su propia caja con scroll: asi los botones quedan
            siempre a la vista, tambien en el celular. */}
        <div
          tabIndex={0}
          aria-label="Términos de uso y Política de tratamiento de datos"
          style={{
            background: "var(--surface)",
            borderRadius: 16,
            padding: "22px 22px 6px",
            maxHeight: "52dvh",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          <Documento titulo="Términos de uso del sistema" secciones={TERMINOS_USO} />
          <Documento titulo="Política de tratamiento de datos personales" secciones={POLITICA_DATOS} />
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "0 0 16px" }}>Versión {VERSION_TERMINOS}</p>
        </div>

        <label
          style={{
            display: "flex", alignItems: "flex-start", gap: 10, marginTop: 18,
            fontSize: 13.5, lineHeight: 1.45, color: "var(--text-primary)", cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={marcado}
            onChange={(e) => setMarcado(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: "var(--text-primary)" }}
          />
          <span>
            He leído y acepto los Términos de uso y autorizo el tratamiento de mis datos personales conforme a la Política de tratamiento de datos.
          </span>
        </label>

        {error ? <div style={{ marginTop: 14 }}><Callout tono="peligro">{error}</Callout></div> : null}

        <Button
          variante="primary"
          tam="lg"
          bloque
          onClick={aceptar}
          disabled={!marcado}
          cargando={ocupado}
          style={{ marginTop: 16, height: 50, borderRadius: 13, fontSize: 15 }}
        >
          {ocupado ? "Guardando…" : "Aceptar y continuar"}
        </Button>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12.5, color: "var(--text-tertiary)" }}>
          {email ? <>Entraste como {email}. </> : null}
          <button
            type="button"
            onClick={onSalir}
            disabled={ocupado}
            style={{ background: "none", border: "none", padding: 0, color: "var(--text-secondary)", fontSize: 12.5, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}
          >
            Salir sin aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
