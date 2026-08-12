// Administración del equipo: crear cuentas y decidir a qué módulos entra cada
// persona. Solo la ve quien tiene rol Administrador.
import AvisoFlujo from "../../components/AvisoFlujo";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useCallback, useEffect, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { NAV_SECTIONS } from "../../config/navigation";
import CampoTexto from "../../components/ui/CampoTexto";
import OptimizarFotos from "../../components/OptimizarFotos";
import { MODULOS_MINIMOS, MODULOS_SOLO_ADMIN, ROLES, ROL_LABEL, sinCuentasSoporte } from "../../lib/permisos";
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
  const { membresia } = ctx;
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const [form, setForm] = useState(FORM_VACIO);
  const [editId, setEditId] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

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

  const soyYo = (u) => u.user_id === membresia?.user_id;

  return (
    <div style={{ padding: 28 }}>
      <H1
        title="Usuarios y permisos"
        subtitle="Quién entra al sistema y a qué módulos"
        action={<button style={B("#f47c20")} onClick={abrirNuevo}>+ Nuevo usuario</button>}
      />

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
        <div style={{ ...CD, marginBottom: 20, border: "1px solid #cc0000" }}>
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
                placeholder="persona@ingeanclajes.com"
                style={{ ...SI, ...(editId ? { background: "#f8fafc", color: "#94a3b8" } : {}) }} />
              {editId && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>El correo no se puede cambiar.</div>}
            </div>
            {!editId && (
              <div>
                <LBL>Contraseña provisional</LBL>
                <input value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })}
                  placeholder="Mínimo 8 caracteres" style={SI} />
                <label style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 7, fontSize: 11.5, color: "#334155", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.enviarCorreo} style={{ marginTop: 2 }}
                    onChange={(e) => setForm({ ...form, enviarCorreo: e.target.checked })} />
                  <span>
                    Enviarle estos datos por correo desde la cuenta de la empresa.
                    {form.enviarCorreo && (
                      <span style={{ display: "block", color: "#94a3b8", marginTop: 3 }}>
                        La contraseña queda escrita en su bandeja de entrada. El correo le pide cambiarla al entrar.
                      </span>
                    )}
                    {!form.enviarCorreo && (
                      <span style={{ display: "block", color: "#94a3b8", marginTop: 3 }}>
                        Anótala y entrégasela tú.
                      </span>
                    )}
                  </span>
                </label>
              </div>
            )}
            <div>
              <LBL>Rol</LBL>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} style={SI}>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
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
                  <div key={seccion.title} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 7 }}>
                      {seccion.title}
                    </div>
                    {seccion.items.filter((item) => !MODULOS_SOLO_ADMIN.includes(item.id)).map((item) => {
                      const fijo = MODULOS_MINIMOS.includes(item.id);
                      return (
                        <label key={item.id} style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
                          fontSize: 12, color: fijo ? "#94a3b8" : "#334155",
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
            <button style={B("#f1f5f9", "#475569")} onClick={() => { setAbierto(false); setEditId(null); }} disabled={guardando}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <div style={{ ...CD, color: "#64748b", fontSize: 13 }}>Cargando el equipo…</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {sinCuentasSoporte(usuarios).map((u) => {
            const modulos = u.role === "admin" || u.modulos == null ? null : u.modulos;
            return (
              <div key={u.user_id} style={{ ...CD, opacity: u.activo ? 1 : 0.6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {/* Se acomoda tambien al mostrar: las cuentas creadas
                          antes de esto quedaron en minuscula y no se van a
                          arreglar solas hasta que alguien las edite. */}
                      {normalizarNombrePropio(u.nombre) || u.email}
                      {soyYo(u) && <span style={{ fontSize: 11, fontWeight: 600, color: "#f47c20" }}> · tú</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{u.email}</div>
                    <div style={{ fontSize: 11.5, color: "#475569", marginTop: 6 }}>
                      <strong>{ROL_LABEL[u.role] || u.role}</strong>
                      {!u.activo && <span style={{ color: "#b42318" }}> · acceso suspendido</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, lineHeight: 1.5 }}>
                      {modulos === null
                        ? "Entra a todos los módulos."
                        : modulos.length === 0
                          ? "Sin módulos asignados."
                          : `Entra a: ${modulos.length} módulo(s).`}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <button style={{ ...B("#dbeafe", "#1e40af"), fontSize: 11.5, padding: "7px 13px" }}
                      onClick={() => abrirEdicion(u)} disabled={guardando}>Editar</button>
                    <button style={{ ...B("#f1f5f9", "#475569"), fontSize: 11.5, padding: "7px 13px" }}
                      onClick={() => nuevaClave(u)} disabled={guardando}>Cambiar contraseña</button>
                    {!soyYo(u) && (u.activo ? (
                      <button style={{ ...B("#fff7ed", "#b45309"), fontSize: 11.5, padding: "7px 13px" }}
                        onClick={() => ejecutar(() => desactivarUsuario(u.user_id), `${u.email} quedó suspendido.`)}
                        disabled={guardando}>Suspender</button>
                    ) : (
                      <button style={{ ...B("#e8f5ee", "#166534"), fontSize: 11.5, padding: "7px 13px" }}
                        onClick={() => ejecutar(() => reactivarUsuario(u.user_id), `${u.email} volvió a tener acceso.`)}
                        disabled={guardando}>Reactivar</button>
                    ))}
                    {!soyYo(u) && (
                      <button style={{ ...B("#fef2f2", "#b42318"), fontSize: 11.5, padding: "7px 13px" }}
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
