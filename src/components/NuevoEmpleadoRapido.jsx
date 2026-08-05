import { useState } from "react";
import AvisoFlujo from "./AvisoFlujo";
import CampoTexto from "./ui/CampoTexto";
import LBL from "./ui/LBL";
import { B, SI } from "../styles/tokens";
import { NOMINA_CO_2026, normalizarCargos, normalizarEmpleado } from "../lib/nomina";
import {
  avisoCedula, avisoCelular, avisoNombre,
  normalizarDocumento, normalizarFrase, normalizarNombrePropio, normalizarTelefono,
} from "../lib/normalizarEntrada";

// Alta de un trabajador desde la obra o desde horarios.
//
// Quien coordina el trabajo se topa con que la persona que llegó hoy no está
// en la lista, y antes tenía que pedirle a alguien de nómina que la creara.
// Aquí la registra con lo básico y sigue trabajando: puede asignarle turnos
// de inmediato.
//
// Lo que NO se pide aquí es a propósito: salario, banco, contrato. Eso es de
// nómina, y el registro llega allí marcado como pendiente para que lo
// completen. El salario entra con el mínimo vigente solo para que el empleado
// exista con un valor coherente, no como una decisión salarial.

// Valor del desplegable que abre el campo para escribir un cargo que no está.
const CARGO_NUEVO = "__crear__";

export default function NuevoEmpleadoRapido({ ctx, onCreado, onCerrar, obraId = null }) {
  const { empleados, setEmpleados, cargos, setCargos, membresia, setObras } = ctx;
  const [form, setForm] = useState({ nombre: "", apellidos: "", cargo: "", cedula: "", tel: "" });
  const [cargoNuevo, setCargoNuevo] = useState("");
  const [error, setError] = useState("");

  const cargosDisponibles = [...new Set([
    ...normalizarCargos(cargos).filter((c) => c.activo !== false).map((c) => c.nombre),
    ...empleados.map((e) => e.cargo).filter(Boolean),
  ])].filter(Boolean).sort((a, b) => a.localeCompare(b));

  const nombreCompleto = [form.nombre, form.apellidos]
    .map((parte) => normalizarNombrePropio(parte))
    .filter(Boolean)
    .join(" ");

  // El cargo tambien dependia de nomina: si el que hacia falta no estaba en la
  // lista, quien coordina volvia a quedarse bloqueado. Aqui se puede crear.
  // Devuelve el nombre definitivo del cargo, o "" si falta escribirlo.
  const resolverCargo = () => {
    if (form.cargo !== CARGO_NUEVO) return form.cargo.trim();

    const nombre = normalizarFrase(cargoNuevo);
    if (!nombre) return "";

    // Si ya existe con otra grafia se reutiliza, para no acabar con
    // "Instalador" e "instalador" como dos cargos distintos.
    const existente = cargosDisponibles.find((c) => c.toLowerCase() === nombre.toLowerCase());
    if (existente) return existente;

    setCargos((prev) => [...normalizarCargos(prev), {
      id: "CAR-" + Date.now(),
      nombre,
      descripcion: "",
      activo: true,
    }]);
    return nombre;
  };

  const guardar = () => {
    setError("");

    if (!form.nombre.trim() || !form.apellidos.trim()) {
      setError("Escribe el nombre y los apellidos.");
      return;
    }
    const cargoFinal = resolverCargo();
    if (!cargoFinal) {
      setError(form.cargo === CARGO_NUEVO
        ? "Escribe cómo se llama el cargo nuevo."
        : "Elige el cargo. Es lo que sale en el informe de actividades.");
      return;
    }
    const cedula = normalizarDocumento(form.cedula).replace(/\D/g, "");
    if (cedula.length < 6) {
      setError("La cédula parece muy corta. Revísala.");
      return;
    }
    const celular = normalizarTelefono(form.tel);
    if (celular.length !== 10) {
      setError("El celular debe tener 10 dígitos. A ese número le llegan los turnos por WhatsApp.");
      return;
    }

    // Se busca por cédula, que es el identificador real de la persona. Por
    // nombre habría falsos positivos con los homónimos.
    const existente = empleados.find(
      (e) => String(e.cedula || "").replace(/\D/g, "") === cedula
    );
    if (existente) {
      if (existente.activo === false) {
        const reactivar = window.confirm(
          `${existente.nombre} ya está registrado pero aparece inactivo.\n\n` +
          "¿Quieres reactivarlo y asignarlo a esta obra? Así conserva su historial " +
          "en vez de crear una ficha nueva."
        );
        if (!reactivar) return;
        setEmpleados((prev) => prev.map((e) => (e.id === existente.id ? { ...e, activo: true } : e)));
        asignarAObra(existente.id);
        onCreado?.(existente.id, { reactivado: true, nombre: existente.nombre });
        return;
      }
      window.alert(
        `Esa cédula ya está registrada a nombre de ${existente.nombre}.\n\n` +
        "No se creó una ficha nueva. Búscalo en la lista con ese nombre."
      );
      return;
    }

    const numero = empleados.reduce((max, e) => {
      const m = String(e.id || "").match(/^E(\d+)$/);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0) + 1;
    const id = "E" + String(numero).padStart(2, "0");
    const iniciales = nombreCompleto.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "EM";

    const nuevo = normalizarEmpleado({
      id,
      nombre: nombreCompleto,
      cedula,
      cargo: cargoFinal,
      tel: celular,
      email: "",
      // El mínimo vigente es un valor de arranque para que la ficha sea
      // coherente, no una decisión salarial: nómina lo define después.
      salario: NOMINA_CO_2026.salarioMinimo,
      salarioOrigen: "minimo_automatico",
      activo: true,
      avatar: iniciales,
      banco: "Bancolombia",
      tipoCuenta: "Ahorros",
      numeroCuenta: "",
      tipoContrato: "indefinido",
      fechaIngreso: new Date().toISOString().slice(0, 10),
      horasExtrasPorObra: [],
      comisionesPorObra: [],
      altaEstado: "pendiente",
      altaCreadoPor: membresia?.email || "",
      altaCreadoEn: new Date().toISOString(),
    });

    setEmpleados((prev) => [...prev, nuevo]);
    asignarAObra(id);
    onCreado?.(id, { nombre: nombreCompleto });
  };

  // Si se creó desde una obra, se asigna de una: es lo que la persona quería.
  const asignarAObra = (empleadoId) => {
    if (!obraId || !setObras) return;
    setObras((prev) => prev.map((o) => (
      o.id === obraId && !(o.empleados || []).includes(empleadoId)
        ? { ...o, empleados: [...(o.empleados || []), empleadoId] }
        : o
    )));
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #cc0000", borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#2b2622" }}>👷 Registrar un trabajador</div>
        <button onClick={onCerrar} style={{ ...B("#f4eee4", "#574e44"), fontSize: 12, padding: "6px 12px" }}>Cerrar</button>
      </div>

      <AvisoFlujo tono="info" titulo="Solo los datos básicos: el resto lo completa Nómina">
        Con esto la persona queda registrada y puedes asignarle turnos de inmediato.
        El <strong>salario, la cuenta bancaria y el contrato</strong> los define Nómina, que
        recibe la ficha marcada como pendiente por revisar.
      </AvisoFlujo>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <CampoTexto
          label="Nombre *" valor={form.nombre}
          onChange={(v) => setForm({ ...form, nombre: v })}
          normalizar={normalizarNombrePropio} placeholder="Carlos Andrés"
          autoCapitalize="words"
        />
        <CampoTexto
          label="Apellidos *" valor={form.apellidos}
          onChange={(v) => setForm({ ...form, apellidos: v })}
          normalizar={normalizarNombrePropio} revisar={avisoNombre} placeholder="Ríos Gómez"
          autoCapitalize="words"
        />
        <div>
          <LBL>Cargo *</LBL>
          <select value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} style={SI}>
            <option value="">Seleccionar cargo…</option>
            {cargosDisponibles.map((cargo) => <option key={cargo} value={cargo}>{cargo}</option>)}
            <option value={CARGO_NUEVO}>+ Crear un cargo nuevo…</option>
          </select>
          {form.cargo === CARGO_NUEVO ? (
            <>
              <input
                value={cargoNuevo}
                onChange={(e) => setCargoNuevo(e.target.value)}
                onBlur={(e) => setCargoNuevo(normalizarFrase(e.target.value))}
                placeholder="Ej: Ayudante de instalación"
                autoFocus
                style={{ ...SI, marginTop: 6 }}
              />
              <div style={{ fontSize: 10.5, color: "#a2988a", marginTop: 3 }}>
                Queda disponible para los demás. Si ya existe con otra escritura, se usa el que hay.
              </div>
            </>
          ) : (
            <div style={{ fontSize: 10.5, color: "#a2988a", marginTop: 3 }}>
              Sale impreso en la tabla de personal del informe.
            </div>
          )}
        </div>
        <CampoTexto
          label="Cédula *" valor={form.cedula}
          onChange={(v) => setForm({ ...form, cedula: v })}
          normalizar={normalizarDocumento} revisar={avisoCedula}
          placeholder="1032456781" inputMode="numeric" spellCheck={false}
          ayuda="Identifica a la persona: evita que quede registrada dos veces."
        />
        <CampoTexto
          label="Celular *" valor={form.tel}
          onChange={(v) => setForm({ ...form, tel: v })}
          normalizar={normalizarTelefono} revisar={avisoCelular}
          placeholder="3001234567" inputMode="tel" spellCheck={false}
          ayuda="A este número le llegan los turnos por WhatsApp."
        />
      </div>

      {error && (
        <div style={{ background: "#f9e9e4", border: "1px solid #eec7bd", color: "#cc0000", borderRadius: 10, padding: "11px 14px", fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={guardar} style={B("#2b2622")}>✅ Registrar trabajador</button>
        <button onClick={onCerrar} style={B("#f4eee4", "#574e44")}>Cancelar</button>
        {nombreCompleto && (
          <div style={{ fontSize: 11.5, color: "#756a5e" }}>
            Se registrará como <strong>{nombreCompleto}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
