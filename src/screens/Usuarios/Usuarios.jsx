// Administración del equipo: crear cuentas y decidir a qué módulos entra cada
// persona. Solo la ve quien tiene rol Administrador.
import AvisoFlujo from "../../components/AvisoFlujo";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useCallback, useEffect, useMemo, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { NAV_SECTIONS } from "../../config/navigation";
import CampoTexto from "../../components/ui/CampoTexto";
import OptimizarFotos from "../../components/OptimizarFotos";
import { MODULOS_CONTADOR, MODULOS_MINIMOS, MODULOS_SOLO_ADMIN, ROLES, ROL_LABEL, sinCuentasSoporte } from "../../lib/permisos";
import { avisoNombre, normalizarNombrePropio } from "../../lib/normalizarEntrada";
import {
  actualizarUsuario, cambiarClave, crearUsuario, desactivarUsuario,
  eliminarUsuario, listarUsuarios, reactivarUsuario,
} from "../../lib/backend/usuarios";

const FORM_VACIO = {
  nombre: "", email: "", clave: "", rol: "operator",
  modulos: [...MODULOS_MINIMOS], enviarCorreo: true,
};

export default function Usuarios({ ctx }) {
  const { membresia, usuariosEnLinea = {}, esSuperAdminCristian = false, cerrarSesionRemota } = ctx;
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const [form, setForm] = useState(FORM_VACIO);
  const [editId, setEditId] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const usuariosEnLineaIds = useMemo(() => {
    const vistos = new Set();
    Object.values(usuariosEnLinea || {}).forEach((u) => {
      if (u?.userId) vistos.add(u.userId);
    });
    return vistos;
  }, [usuariosEnLinea]);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      setUsuarios(await listarUsuarios());
      setErrorCarga(null);
    } catch (e) {
      setErrorCarga(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  const abrirNuevo = () => {
    setForm(FORM_VACIO);
    setEditId(null);
    setMensaje(null);
    setAbierto(true);
  };

  const abrirEdicion = (u) => {
    setForm({
      nombre: u.nombre || "",
      email: u.email || "",
      clave: "",
      rol: u.role,
      modulos: u.modulos ?? [...MODULOS_MINIMOS],
      enviarCorreo: true,
    });
    setEditId(u.user_id);
    setMensaje(null);
    setAbierto(true);
  };

  const alternarModulo = (id) => {
    if (MODULOS_MINIMOS.includes(id)) return;
    setForm((p) => ({
      ...p,
      modulos: p.modulos.includes(id)
        ? p.modulos.filter((m) => m !== id)
        : [...p.modulos, id],
    }));
  };

  // Ejecuta una acción y deja el resultado a la vista, sin dejar botones
  // colgados si algo falla.
  const ejecutar = async (accion, exito) => {
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await accion();
      await recargar();
      // Que el correo falle no invalida lo hecho, pero callarlo dejaria a
      // Camila creyendo que la persona ya recibio sus datos.
      const correo = res?.correo;
      if (correo && !correo.enviado && correo.motivo !== "No se solicitó.") {
        setMensaje({
          tono: "falta",
          texto: `${exito} Pero el correo NO salió (${correo.motivo}). Entrégale los datos tú misma.`,
        });
      } else if (correo?.enviado) {
        setMensaje({ tono: "listo", texto: `${exito} Se le envió el correo con sus datos.` });
      } else {
        setMensaje({ tono: "listo", texto: exito });
      }
      return true;
    } catch (e) {
      setMensaje({ tono: "falta", texto: e.message });
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return setMensaje({ tono: "falta", texto: "Escribe el nombre de la persona." });
    if (!editId && !form.email.trim()) return setMensaje({ tono: "falta", texto: "Escribe el correo de la persona." });
    if (!editId && form.clave.length < 8) return setMensaje({ tono: "falta", texto: "La contraseña debe tener al menos 8 caracteres." });

    const datos = {
      nombre: normalizarNombrePropio(form.nombre),
      email: form.email.trim(),
      rol: form.rol,
      modulos: form.modulos,
    };

    const ok = editId
      ? await ejecutar(() => actualizarUsuario({ ...datos, userId: editId }), "Cambios guardados.")
      : await ejecutar(
          () => crearUsuario({ ...datos, clave: form.clave, enviarCorreo: form.enviarCorreo }),
          `Cuenta creada para ${datos.email}.`
        );

    if (ok) { setAbierto(false); setEditId(null); }
  };

  const nuevaClave = async (u) => {
    const clave = window.prompt(`Nueva contraseña para ${u.email}\n\nMínimo 8 caracteres. Anótala: no se puede volver a ver.`);
    if (!clave) return;
    const avisar = window.confirm(`¿Enviarle la nueva contraseña por correo a ${u.email}?

Aceptar: se la mandamos.
Cancelar: se la entregas tú.`);
    await ejecutar(
      () => cambiarClave(u.user_id, clave, { email: u.email, nombre: u.nombre || "", enviarCorreo: avisar }),
      `Contraseña cambiada para ${u.email}.`
    );
  };

  const quitarAcceso = async (u) => {
    if (!window.confirm(`¿Quitar del sistema a ${u.email}?\n\nDeja de entrar de inmediato. La cuenta no se borra, así que puedes volver a darle acceso después.`)) return;
    await ejecutar(() => eliminarUsuario(u.user_id), `${u.email} ya no tiene acceso.`);
  };

  const handleCerrarSesion = async (u) => {
    const nombre = normalizarNombrePropio(u.nombre) || u.email;
    const conexion = usuariosEnLinea[u.user_id] || (u.email && usuariosEnLinea[u.email.toLowerCase()]);
    const estadoTxt = conexion ? " (Actualmente EN LÍNEA)" : "";
    const confirmar = window.confirm(
      `¿Cerrar la sesión de "${nombre}" (${u.email})${estadoTxt}?\n\n` +
      `Se desconectará de inmediato en su dispositivo y deberá ingresar credenciales de nuevo.`
    );
    if (!confirmar) return;

    try {
      const res = await cerrarSesionRemota(u.user_id, u.email, nombre);
      if (res?.ok) {
        setMensaje({
          tono: "listo",
          texto: `Se ordenó el cierre de sesión inmediato para ${nombre} (${u.email}).`,
        });
      } else {
        setMensaje({
          tono: "falta",
          texto: res?.error || "No se pudo emitir la orden de cierre de sesión.",
        });
      }
    } catch (e) {
      setMensaje({ tono: "falta", texto: e.message || "Error al solicitar cierre de sesión." });
    }
  };

  const soyYo = (u) => u.user_id === membresia?.user_id;

  return (
    <div style={{ padding: 28 }}>
      <H1
        title="Usuarios y permisos"
        subtitle="Quién entra al sistema y a qué módulos"
        action={<button style={B("#f47c20")} onClick={abrirNuevo}>+ Nuevo usuario</button>}
      />

      {esSuperAdminCristian && (
        <div
          style={{
            ...CD,
            marginBottom: 20,
            border: "1px solid rgba(16, 185, 129, 0.4)",
            background: "rgba(16, 185, 129, 0.06)",
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 10px #10b981",
                  display: "inline-block",
                }}
              />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>
                  Monitoreo de Conexiones en Vivo
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Solo visible para <strong>cristiandel48@gmail.com</strong>. Detecta en tiempo real quién tiene el ERP abierto y permite cerrar sesiones remotas.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  background: "#10b981",
                  color: "#ffffff",
                  padding: "5px 14px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ● {usuariosEnLineaIds.size} {usuariosEnLineaIds.size === 1 ? "usuario en línea" : "usuarios en línea"}
              </span>
            </div>
          </div>
        </div>
      )}

      <AvisoFlujo tono="info" titulo="Cada persona ve solo lo que le marques">
        El Administrador ve todo y puede crear usuarios. A los demás les marcas los módulos uno
        por uno, y entran directo al primero que les hayas marcado.
        <div style={{ marginTop: 5 }}>
          El <strong>Dashboard no se puede asignar</strong>: resume la plata de la empresa —cobros
          pendientes, totales— y es solo del Administrador. Si no le marcas ningún módulo a alguien,
          al entrar verá un aviso de que le falta acceso.
        </div>
      </AvisoFlujo>

      {mensaje && (
        <AvisoFlujo tono={mensaje.tono} titulo={mensaje.tono === "listo" ? "Listo" : "No se pudo"}>
          {mensaje.texto}
        </AvisoFlujo>
      )}

      {errorCarga && (
        <AvisoFlujo tono="falta" titulo="No se pudo cargar el equipo">
          {errorCarga.message}
        </AvisoFlujo>
      )}

      {abierto && (
        <div style={{ ...CD, marginBottom: 20, border: "1px solid var(--accent, #cc0000)" }}>
          <div style={ST}>{editId ? "Editar acceso" : "Nuevo usuario"}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <CampoTexto
              label="Nombre"
              valor={form.nombre}
              onChange={(v) => setForm({ ...form, nombre: v })}
              normalizar={normalizarNombrePropio}
              revisar={avisoNombre}
              placeholder="Camila Montoya"
              autoCapitalize="words"
            />
            <div>
              <LBL>Correo</LBL>
              <input type="email" value={form.email} disabled={Boolean(editId)}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="persona@ingeanclajessas.com"
                style={{ ...SI, ...(editId ? { background: "var(--surface-subtle)", color: "var(--text-muted)" } : {}) }} />
              {editId && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>El correo no se puede cambiar.</div>}
            </div>
            {!editId && (
              <div>
                <LBL>Contraseña provisional</LBL>
                <input value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })}
                  placeholder="Mínimo 8 caracteres" style={SI} />
                <label style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 7, fontSize: 11.5, color: "var(--text-main)", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.enviarCorreo} style={{ marginTop: 2 }}
                    onChange={(e) => setForm({ ...form, enviarCorreo: e.target.checked })} />
                  <span>
                    Enviarle estos datos por correo desde la cuenta de la empresa.
                    {form.enviarCorreo && (
                      <span style={{ display: "block", color: "var(--text-muted)", marginTop: 3 }}>
                        La contraseña queda escrita en su bandeja de entrada. El correo le pide cambiarla al entrar.
                      </span>
                    )}
                    {!form.enviarCorreo && (
                      <span style={{ display: "block", color: "var(--text-muted)", marginTop: 3 }}>
                        Anótala y entrégasela tú.
                      </span>
                    )}
                  </span>
                </label>
              </div>
            )}
            <div>
              <LBL>Rol</LBL>
              <select
                value={form.rol}
                onChange={(e) => {
                  const nuevoRol = e.target.value;
                  setForm((p) => ({
                    ...p,
                    rol: nuevoRol,
                    modulos: nuevoRol === "contador" ? [...MODULOS_CONTADOR] : p.modulos,
                  }));
                }}
                style={SI}
              >
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                {ROLES.find((r) => r.id === form.rol)?.detalle}
              </div>
            </div>
          </div>

          {form.rol === "admin" ? (
            <AvisoFlujo tono="info" titulo="El Administrador entra a todo">
              No hay que marcar módulos: los ve todos y además puede crear usuarios y cambiar permisos.
            </AvisoFlujo>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <LBL>Módulos a los que entra</LBL>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14, marginTop: 8 }}>
                {NAV_SECTIONS
                  .map((s) => ({ ...s, items: s.items.filter((i) => !MODULOS_SOLO_ADMIN.includes(i.id)) }))
                  .filter((s) => s.items.length > 0)
                  .map((seccion) => (
                  <div key={seccion.title} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 7 }}>
                      {seccion.title}
                    </div>
                    {seccion.items.filter((item) => !MODULOS_SOLO_ADMIN.includes(item.id)).map((item) => {
                      const fijo = MODULOS_MINIMOS.includes(item.id);
                      return (
                        <label key={item.id} style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
                          fontSize: 12, color: fijo ? "var(--text-muted)" : "var(--text-main)",
                          cursor: fijo ? "default" : "pointer",
                        }}>
                          <input type="checkbox" disabled={fijo}
                            checked={fijo || form.modulos.includes(item.id)}
                            onChange={() => alternarModulo(item.id)} />
                          {item.label}{fijo && " (siempre)"}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button style={B("#4ade80", "#0f2d1a")} onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : editId ? "Guardar cambios" : "Crear usuario"}
            </button>
            <button style={{ ...B("var(--surface-subtle)", "var(--text-muted)"), border: "1px solid var(--border)" }} onClick={() => { setAbierto(false); setEditId(null); }} disabled={guardando}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <div style={{ ...CD, color: "var(--text-muted)", fontSize: 13 }}>Cargando el equipo…</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {(esSuperAdminCristian ? usuarios : sinCuentasSoporte(usuarios)).map((u) => {
            const modulos = u.role === "admin" || u.modulos == null ? null : u.modulos;
            const conexion = esSuperAdminCristian
              ? (usuariosEnLinea[u.user_id] || (u.email && usuariosEnLinea[u.email.toLowerCase()]))
              : null;
            const estaEnLinea = Boolean(conexion);
            return (
              <div key={u.user_id} style={{ ...CD, opacity: u.activo ? 1 : 0.6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
                        {normalizarNombrePropio(u.nombre) || u.email}
                      </span>
                      {soyYo(u) && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent, #f47c20)" }}> · tú</span>}
                      {esSuperAdminCristian && (
                        estaEnLinea ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "rgba(34, 197, 94, 0.15)",
                              color: "#16a34a",
                              border: "1px solid rgba(34, 197, 94, 0.3)",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                            title={`Conectado en tiempo real desde ${conexion.dispositivo || "dispositivo"}`}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
                            En línea · {conexion.dispositivo || "Activo"}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "var(--surface-subtle)",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border)",
                              fontSize: 11,
                            }}
                          >
                            ⚪ Desconectado
                          </span>
                        )
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{u.email}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
                      <strong style={{ color: "var(--text-main)" }}>{ROL_LABEL[u.role] || u.role}</strong>
                      {!u.activo && <span style={{ color: "#ef4444" }}> · acceso suspendido</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                      {modulos === null
                        ? "Entra a todos los módulos."
                        : modulos.length === 0
                          ? "Sin módulos asignados."
                          : `Entra a: ${modulos.length} módulo(s).`}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <button style={{ ...B("rgba(37, 99, 235, 0.15)", "#60a5fa"), border: "1px solid rgba(37, 99, 235, 0.3)", fontSize: 11.5, padding: "7px 13px" }}
                      onClick={() => abrirEdicion(u)} disabled={guardando}>Editar</button>
                    <button style={{ ...B("var(--surface-subtle)", "var(--text-muted)"), border: "1px solid var(--border)", fontSize: 11.5, padding: "7px 13px" }}
                      onClick={() => nuevaClave(u)} disabled={guardando}>Cambiar contraseña</button>
                    {esSuperAdminCristian && !soyYo(u) && (
                      <button
                        style={{
                          ...B("rgba(225, 29, 72, 0.12)", "#e11d48"),
                          border: "1px solid rgba(225, 29, 72, 0.3)",
                          fontSize: 11.5,
                          padding: "7px 13px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                        title={estaEnLinea ? "Cerrar sesión de inmediato en el dispositivo de este usuario" : "Forzar desconexión remota"}
                        onClick={() => handleCerrarSesion(u)}
                        disabled={guardando}
                      >
                        🚪 Cerrar sesión
                      </button>
                    )}
                    {!soyYo(u) && (u.activo ? (
                      <button style={{ ...B("rgba(245, 158, 11, 0.15)", "#fbbf24"), border: "1px solid rgba(245, 158, 11, 0.3)", fontSize: 11.5, padding: "7px 13px" }}
                        onClick={() => ejecutar(() => desactivarUsuario(u.user_id), `${u.email} quedó suspendido.`)}
                        disabled={guardando}>Suspender</button>
                    ) : (
                      <button style={{ ...B("rgba(34, 197, 94, 0.15)", "var(--green-700, #4ade80)"), border: "1px solid rgba(34, 197, 94, 0.3)", fontSize: 11.5, padding: "7px 13px" }}
                        onClick={() => ejecutar(() => reactivarUsuario(u.user_id), `${u.email} volvió a tener acceso.`)}
                        disabled={guardando}>Reactivar</button>
                    ))}
                    {!soyYo(u) && (
                      <button style={{ ...B("rgba(239, 68, 68, 0.15)", "#ef4444"), border: "1px solid rgba(239, 68, 68, 0.3)", fontSize: 11.5, padding: "7px 13px" }}
                        onClick={() => quitarAcceso(u)} disabled={guardando}>Quitar</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Herramienta de mantenimiento. Vive aqui porque esta pantalla ya es
          solo para administradores y reescribe datos de toda la empresa. */}
      <OptimizarFotos ctx={ctx} />
    </div>
  );
}
