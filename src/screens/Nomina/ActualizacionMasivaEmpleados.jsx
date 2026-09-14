import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { fmt } from "../../lib/format";
import {
  normalizarDocumento,
  normalizarNombrePropio,
  normalizarTelefono,
  normalizarCorreo,
} from "../../lib/normalizarEntrada";
import { normalizarEmpleado, normalizarCargos, TIPOS_CONTRATO_LABELS } from "../../lib/nomina";
import { siguienteIdUnico } from "../../lib/identificadores";

// Mapeo flexible de nombres de columna para aceptar variaciones
function limpiarClave(k) {
  return String(k || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function resolverCampo(obj, opciones) {
  const llaves = Object.keys(obj);
  for (const opt of opciones) {
    const optLim = limpiarClave(opt);
    const encontrada = llaves.find((k) => limpiarClave(k) === optLim);
    if (encontrada !== undefined && obj[encontrada] !== undefined && obj[encontrada] !== null) {
      return String(obj[encontrada]).trim();
    }
  }
  return "";
}

function mapearTipoContrato(valor) {
  const v = String(valor || "").toLowerCase();
  if (v.includes("fijo")) return "fijo";
  if (v.includes("obra") || v.includes("labor")) return "obra_labor";
  if (v.includes("servicio")) return "prestacion_servicios";
  if (v.includes("aprendizaje")) return "aprendizaje";
  return "indefinido";
}

export default function ActualizacionMasivaEmpleados({
  empleados = [],
  cargos = [],
  setCargos,
  onActualizarEmpleados,
}) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [archivoNombre, setArchivoNombre] = useState("");
  const [cambiosDetectados, setCambiosDetectados] = useState({
    actualizar: [],
    nuevos: [],
    sinCambio: [],
  });
  const [mensajeExito, setMensajeExito] = useState("");
  const [filtroVista, setFiltroVista] = useState("todos"); // 'todos', 'actualizar', 'nuevos'
  const fileInputRef = useRef(null);

  // 1. Descargar Formulario Excel
  const descargarFormularioExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Datos para la hoja principal
      let datosFilas = [];

      if (empleados && empleados.length > 0) {
        datosFilas = empleados.map((e) => ({
          ID: e.id || "",
          "Cédula": e.cedula || "",
          "Nombre Completo": e.nombre || "",
          Cargo: e.cargo || "",
          "Salario Base": Number(e.salario) || 0,
          "Tipo Contrato": TIPOS_CONTRATO_LABELS[e.tipoContrato] || e.tipoContrato || "Término Indefinido",
          "Fecha Ingreso (AAAA-MM-DD)": e.fechaIngreso || "",
          "Teléfono / Celular": e.tel || "",
          "Correo Electrónico": e.email || "",
          Banco: e.banco || "Bancolombia",
          "Tipo Cuenta": e.tipoCuenta || "Ahorros",
          "Número de Cuenta": e.numeroCuenta || "",
          Estado: e.activo !== false ? "Activo" : "Inactivo",
        }));
      } else {
        // Filas de ejemplo si aún no hay empleados registrados
        datosFilas = [
          {
            ID: "E01",
            "Cédula": "1020304050",
            "Nombre Completo": "CARLOS ANDRES RAMIREZ",
            Cargo: "Técnico de Anclajes",
            "Salario Base": 2600000,
            "Tipo Contrato": "Término Indefinido",
            "Fecha Ingreso (AAAA-MM-DD)": "2025-02-01",
            "Teléfono / Celular": "3101234567",
            "Correo Electrónico": "carlos.ramirez@correo.com",
            Banco: "Bancolombia",
            "Tipo Cuenta": "Ahorros",
            "Número de Cuenta": "204-123456-78",
            Estado: "Activo",
          },
          {
            ID: "E02",
            "Cédula": "1030405060",
            "Nombre Completo": "MARIA FERNANDA LOPEZ",
            Cargo: "Auxiliar Administrativa",
            "Salario Base": 2000000,
            "Tipo Contrato": "Término Fijo",
            "Fecha Ingreso (AAAA-MM-DD)": "2025-03-01",
            "Teléfono / Celular": "3119876543",
            "Correo Electrónico": "maria.lopez@correo.com",
            Banco: "Bancolombia",
            "Tipo Cuenta": "Ahorros",
            "Número de Cuenta": "204-987654-32",
            Estado: "Activo",
          },
        ];
      }

      const ws = XLSX.utils.json_to_sheet(datosFilas);

      // Anchos de columna optimizados
      ws["!cols"] = [
        { wch: 8 },  // ID
        { wch: 16 }, // Cédula
        { wch: 32 }, // Nombre
        { wch: 28 }, // Cargo
        { wch: 16 }, // Salario
        { wch: 22 }, // Tipo Contrato
        { wch: 26 }, // Fecha Ingreso
        { wch: 20 }, // Teléfono
        { wch: 30 }, // Correo
        { wch: 18 }, // Banco
        { wch: 15 }, // Tipo Cuenta
        { wch: 22 }, // Número Cuenta
        { wch: 12 }, // Estado
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Empleados");

      // Hoja de instrucciones y ayuda
      const wsInstrucciones = XLSX.utils.json_to_sheet([
        {
          "Instrucciones de Uso": "1. MODIFICAR EXISTENTES: Puedes cambiar salarios, cargos, teléfonos, cuentas o bancos. El sistema los reconoce automáticamente por su número de CÉDULA o ID.",
        },
        {
          "Instrucciones de Uso": "2. NUEVOS EMPLEADOS: Agrega nuevas filas al final. Puedes dejar la columna ID vacía, el sistema le asignará el código consecutivo automáticamente.",
        },
        {
          "Instrucciones de Uso": "3. SALARIO: Escribe el valor numérico sin puntos de mil ni signo pesos (ejemplo: 2500000).",
        },
        {
          "Instrucciones de Uso": "4. FECHA DE INGRESO: Usa el formato estándar AAAA-MM-DD (ejemplo: 2025-01-15).",
        },
        {
          "Instrucciones de Uso": "5. ESTADO: Escribe 'Activo' o 'Inactivo' para deshabilitar o retirar personal.",
        },
        {
          "Instrucciones de Uso": "6. Al terminar de editar, guarda el archivo en tu equipo y súbelo en la opción 'Cargar formulario diligenciado'.",
        },
      ]);
      wsInstrucciones["!cols"] = [{ wch: 120 }];
      XLSX.utils.book_append_sheet(wb, wsInstrucciones, "Instrucciones");

      const fechaHoy = new Date().toISOString().slice(0, 10);
      const nombreArchivo = `Formulario_Empleados_Ingeanclajes_${fechaHoy}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);
      setMensajeExito(`✓ Formulario descargado: ${nombreArchivo}`);
      setTimeout(() => setMensajeExito(""), 4000);
    } catch (err) {
      console.error("Error al generar Excel:", err);
      alert("No se pudo generar el archivo Excel: " + (err.message || String(err)));
    }
  };

  // 2. Leer archivo subido
  const handleArchivoSeleccionado = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    procesarArchivo(file);
    e.target.value = "";
  };

  const procesarArchivo = (file) => {
    setArchivoNombre(file.name);
    setProcesando(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Tomar la primera hoja o la que se llame 'Empleados'
        const nombreHoja = workbook.SheetNames.includes("Empleados")
          ? "Empleados"
          : workbook.SheetNames[0];

        const hoja = workbook.Sheets[nombreHoja];
        const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

        if (!filas || filas.length === 0) {
          alert("El archivo seleccionado está vacío o no contiene filas con datos.");
          setProcesando(false);
          return;
        }

        // Analizar y contrastar con los empleados actuales
        const actualizar = [];
        const nuevos = [];
        const sinCambio = [];

        // Mapa de existentes por cédula e ID para búsqueda instantánea
        const mapPorCedula = new Map();
        const mapPorId = new Map();

        empleados.forEach((emp) => {
          if (emp.cedula) mapPorCedula.set(normalizarDocumento(emp.cedula), emp);
          if (emp.id) mapPorId.set(String(emp.id).toUpperCase().trim(), emp);
        });

        filas.forEach((fila) => {
          const cedulaRaw = resolverCampo(fila, [
            "cedula",
            "documento",
            "identificacion",
            "cc",
            "nit",
          ]);
          const cedulaNorm = normalizarDocumento(cedulaRaw);

          const idRaw = resolverCampo(fila, ["id", "codigo", "clave"]).toUpperCase();
          const nombreRaw = resolverCampo(fila, [
            "nombre",
            "nombres",
            "nombrecompleto",
            "empleado",
            "trabajador",
          ]);
          const cargoRaw = resolverCampo(fila, ["cargo", "puesto", "ocupacion", "rol"]);
          const salarioRaw = resolverCampo(fila, [
            "salario",
            "salariobase",
            "sueldo",
            "basico",
            "salariomensual",
          ]);
          const contratoRaw = resolverCampo(fila, [
            "tipocontrato",
            "contrato",
            "tipodecontrato",
          ]);
          const fechaIngresoRaw = resolverCampo(fila, [
            "fechaingreso",
            "ingreso",
            "fechainicio",
          ]);
          const telRaw = resolverCampo(fila, ["telefono", "celular", "tel", "movil"]);
          const emailRaw = resolverCampo(fila, ["correo", "email", "mail", "correoelectronico"]);
          const bancoRaw = resolverCampo(fila, ["banco", "entidad", "entidadbancaria"]);
          const tipoCuentaRaw = resolverCampo(fila, ["tipocuenta", "tipodecuenta"]);
          const numCuentaRaw = resolverCampo(fila, [
            "numerocuenta",
            "cuenta",
            "numcuenta",
            "nocuenta",
            "numerodecuenta",
          ]);
          const estadoRaw = resolverCampo(fila, ["estado", "activo"]);

          // Si la fila está totalmente vacía de nombre y cédula, omitir
          if (!nombreRaw && !cedulaNorm && !idRaw) return;

          const salarioNum = Math.round(Number(String(salarioRaw).replace(/[^0-9.-]+/g, "")) || 0);
          const activoBool = !estadoRaw || estadoRaw.toLowerCase().includes("act");

          // Buscar coincidencia en existentes
          let empExistente = null;
          if (cedulaNorm && mapPorCedula.has(cedulaNorm)) {
            empExistente = mapPorCedula.get(cedulaNorm);
          } else if (idRaw && mapPorId.has(idRaw)) {
            empExistente = mapPorId.get(idRaw);
          }

          if (empExistente) {
            // Comparar si hubo algún cambio
            const difSalario = salarioNum > 0 && salarioNum !== Number(empExistente.salario);
            const difCargo = cargoRaw && cargoRaw !== empExistente.cargo;
            const difNombre = nombreRaw && normalizarNombrePropio(nombreRaw) !== empExistente.nombre;
            const difCedula = cedulaNorm && cedulaNorm !== empExistente.cedula;
            const difTel = telRaw && normalizarTelefono(telRaw) !== empExistente.tel;
            const difEmail = emailRaw && normalizarCorreo(emailRaw) !== empExistente.email;
            const difBanco = bancoRaw && bancoRaw !== empExistente.banco;
            const difTipoCuenta = tipoCuentaRaw && tipoCuentaRaw !== empExistente.tipoCuenta;
            const difNumCuenta = numCuentaRaw && normalizarDocumento(numCuentaRaw) !== empExistente.numeroCuenta;
            const difContrato = contratoRaw && mapearTipoContrato(contratoRaw) !== empExistente.tipoContrato;
            const difFecha = fechaIngresoRaw && fechaIngresoRaw !== empExistente.fechaIngreso;
            const difActivo = activoBool !== empExistente.activo;

            const hayCambios =
              difSalario ||
              difCargo ||
              difNombre ||
              difCedula ||
              difTel ||
              difEmail ||
              difBanco ||
              difTipoCuenta ||
              difNumCuenta ||
              difContrato ||
              difFecha ||
              difActivo;

            const datosActualizados = {
              ...empExistente,
              nombre: nombreRaw ? normalizarNombrePropio(nombreRaw) : empExistente.nombre,
              cedula: cedulaNorm || empExistente.cedula,
              cargo: cargoRaw || empExistente.cargo,
              salario: salarioNum > 0 ? salarioNum : empExistente.salario,
              tipoContrato: contratoRaw ? mapearTipoContrato(contratoRaw) : empExistente.tipoContrato,
              fechaIngreso: fechaIngresoRaw || empExistente.fechaIngreso,
              tel: telRaw ? normalizarTelefono(telRaw) : empExistente.tel,
              email: emailRaw ? normalizarCorreo(emailRaw) : empExistente.email,
              banco: bancoRaw || empExistente.banco || "Bancolombia",
              tipoCuenta: tipoCuentaRaw || empExistente.tipoCuenta || "Ahorros",
              numeroCuenta: numCuentaRaw ? normalizarDocumento(numCuentaRaw) : empExistente.numeroCuenta,
              activo: activoBool,
              altaEstado: "confirmado",
              salarioOrigen: "definido",
            };

            const itemReporte = {
              origen: empExistente,
              actualizado: datosActualizados,
              cambios: {
                difSalario,
                difCargo,
                difNombre,
                salarioAnterior: empExistente.salario,
                salarioNuevo: datosActualizados.salario,
                cargoAnterior: empExistente.cargo,
                cargoNuevo: datosActualizados.cargo,
              },
            };

            if (hayCambios) {
              actualizar.push(itemReporte);
            } else {
              sinCambio.push(itemReporte);
            }
          } else {
            // Empleado nuevo
            const nombreNorm = normalizarNombrePropio(nombreRaw || "EMPLEADO NUEVO");
            const av =
              nombreNorm
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "EM";

            nuevos.push({
              actualizado: {
                id: idRaw && !mapPorId.has(idRaw) ? idRaw : null, // Se asignará secuencial al aplicar
                nombre: nombreNorm,
                cedula: cedulaNorm,
                cargo: cargoRaw || "Operario",
                salario: salarioNum > 0 ? salarioNum : 1423500,
                tipoContrato: mapearTipoContrato(contratoRaw),
                fechaIngreso: fechaIngresoRaw || new Date().toISOString().slice(0, 10),
                tel: normalizarTelefono(telRaw),
                email: normalizarCorreo(emailRaw),
                banco: bancoRaw || "Bancolombia",
                tipoCuenta: tipoCuentaRaw || "Ahorros",
                numeroCuenta: normalizarDocumento(numCuentaRaw),
                activo: activoBool,
                avatar: av,
                altaEstado: "confirmado",
                salarioOrigen: "definido",
                deduccionesPersonalizadas: [],
                horasExtrasPorObra: [],
                comisionesPorObra: [],
                incapacidades: [],
                prestacionesSociales: [],
              },
            });
          }
        });

        // Detectar si hay cargos nuevos en el archivo que no existen en el catálogo
        const cargosActuales = normalizarCargos(cargos);
        const nombresCargosExistentes = new Set(cargosActuales.map((c) => c.nombre.toLowerCase().trim()));
        const cargosNuevos = [];
        [...actualizar.map((a) => a.actualizado.cargo), ...nuevos.map((n) => n.actualizado.cargo)]
          .filter(Boolean)
          .forEach((c) => {
            const tr = c.trim();
            if (tr && !nombresCargosExistentes.has(tr.toLowerCase()) && !cargosNuevos.includes(tr)) {
              cargosNuevos.push(tr);
            }
          });

        setCambiosDetectados({ actualizar, nuevos, sinCambio, cargosNuevos });
        setModalAbierto(true);
        setProcesando(false);
      } catch (err) {
        console.error("Error al procesar archivo:", err);
        alert("Ocurrió un error al leer el archivo. Asegúrate de que sea un archivo válido de Excel (.xlsx / .xls) o CSV.");
        setProcesando(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 3. Confirmar y aplicar la actualización masiva
  const aplicarActualizacion = async () => {
    try {
      setProcesando(true);

      // Calcular el siguiente número consecutivo para IDs
      let nextNumber =
        empleados.reduce((maximo, emp) => {
          const match = String(emp.id || "").match(/^E(\d+)$/);
          return match ? Math.max(maximo, Number(match[1])) : maximo;
        }, 0) + 1;

      // Mapa de actualizados
      const mapActualizados = new Map();
      cambiosDetectados.actualizar.forEach((item) => {
        mapActualizados.set(item.actualizado.id, item.actualizado);
      });

      // Nuevos con ID asignado
      const nuevosConId = cambiosDetectados.nuevos.map((item) => {
        const emp = item.actualizado;
        let idFinal = emp.id;
        if (!idFinal || empleados.some((e) => e.id === idFinal)) {
          idFinal = "E" + String(nextNumber++).padStart(2, "0");
        }
        return normalizarEmpleado({ ...emp, id: idFinal });
      });

      // Unir lista final preservando el orden original y reemplazando los modificados
      const listaFinal = empleados.map((emp) => {
        if (mapActualizados.has(emp.id)) {
          return normalizarEmpleado(mapActualizados.get(emp.id));
        }
        return emp;
      });

      // Agregar los nuevos al final
      listaFinal.push(...nuevosConId);

      // Detectar nuevos cargos y agregarlos al catálogo oficial
      let listaCargosFinal = null;
      if (typeof setCargos === "function") {
        const cargosActuales = normalizarCargos(cargos);
        const nombresCargosExistentes = new Set(cargosActuales.map((c) => c.nombre.toLowerCase().trim()));
        const nuevosCargosParaAgregar = [];

        [...cambiosDetectados.actualizar.map((a) => a.actualizado.cargo), ...nuevosConId.map((n) => n.cargo)]
          .filter(Boolean)
          .forEach((nombreCargo) => {
            const trimmed = nombreCargo.trim();
            if (trimmed && !nombresCargosExistentes.has(trimmed.toLowerCase())) {
              nombresCargosExistentes.add(trimmed.toLowerCase());
              nuevosCargosParaAgregar.push({
                id: siguienteIdUnico([...cargosActuales, ...nuevosCargosParaAgregar], "CAR"),
                nombre: trimmed,
                descripcion: "Registrado automáticamente desde formulario Excel de empleados",
                activo: true,
              });
            }
          });

        if (nuevosCargosParaAgregar.length > 0) {
          listaCargosFinal = [...cargosActuales, ...nuevosCargosParaAgregar];
          setCargos(listaCargosFinal);
        }
      }

      const totalActualizados = cambiosDetectados.actualizar.length;
      const totalNuevos = nuevosConId.length;
      const totalCargosNuevos = listaCargosFinal ? (listaCargosFinal.length - normalizarCargos(cargos).length) : 0;

      let resumen = `✓ Actualización masiva completada: ${totalActualizados} empleado(s) actualizado(s) y ${totalNuevos} nuevo(s) ingresado(s).`;
      if (totalCargosNuevos > 0) {
        resumen += ` Se crearon ${totalCargosNuevos} nuevo(s) cargo(s) en el catálogo de la empresa.`;
      }

      if (typeof onActualizarEmpleados === "function") {
        await onActualizarEmpleados(listaFinal, listaCargosFinal, resumen);
      }

      setModalAbierto(false);
      setMensajeExito(resumen);
      setProcesando(false);
      setTimeout(() => setMensajeExito(""), 6000);
    } catch (err) {
      console.error("Error al aplicar actualización masiva:", err);
      alert("Error al aplicar los cambios: " + (err.message || String(err)));
      setProcesando(false);
    }
  };

  const totalModificados = cambiosDetectados.actualizar.length;
  const totalNuevos = cambiosDetectados.nuevos.length;
  const totalSinCambio = cambiosDetectados.sinCambio.length;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Mensaje flotante o de estado de éxito */}
      {mensajeExito && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            border: "1px solid #86efac",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 2px 5px rgba(22,101,52,0.08)",
          }}
        >
          <span>🎉</span>
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Tarjeta Banner de Actualización Masiva */}
      <div
        style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 60%, #eff6ff 100%)",
          border: "1.5px solid #bbf7d0",
          borderRadius: 12,
          padding: "14px 18px",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Lado izquierdo: Explicación amigable */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, maxWidth: 640 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#16a34a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(22,163,74,0.3)",
              }}
            >
              📑
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#14532d", letterSpacing: -0.2 }}>
                Actualización Rápida de Empleados por Formulario Excel
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 3, lineHeight: 1.4 }}>
                <strong>No tienes que editar uno por uno:</strong> Descarga este formulario en Excel con todos los empleados actuales, modifica salarios, cargos o datos bancarios (o añade nuevos empleados abajo) y súbelo para actualizarlos de un solo golpe.
              </div>
            </div>
          </div>

          {/* Lado derecho: Botones de Acción */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Botón 1: Descargar Formulario */}
            <button
              type="button"
              onClick={descargarFormularioExcel}
              style={{
                background: "#ffffff",
                color: "#166534",
                border: "1.5px solid #16a34a",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                transition: "all 0.15s ease",
              }}
              title="Descarga un archivo Excel con los empleados actuales listos para editar"
            >
              <span style={{ fontSize: 15 }}>📥</span> Descargar Formulario Excel
            </button>

            {/* Botón 2: Cargar Formulario */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleArchivoSeleccionado}
              accept=".xlsx, .xls, .csv"
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={procesando}
              style={{
                background: "#16a34a",
                color: "#ffffff",
                border: "1.5px solid #15803d",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: procesando ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                boxShadow: "0 2px 6px rgba(22,163,74,0.3)",
              }}
              title="Cargar el archivo Excel con los cambios realizados"
            >
              <span style={{ fontSize: 15 }}>📤</span> {procesando ? "Procesando..." : "Cargar Formulario Diligenciado"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Previsualización y Confirmación de Cambios */}
      {modalAbierto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 820,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            {/* Cabecera del Modal */}
            <div
              style={{
                padding: "16px 22px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  Vista Previa de Cambios: {archivoNombre}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  Revisa los cambios detectados antes de aplicarlos a la nómina de la empresa.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "#64748b",
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Aviso de cargos nuevos que se crearán */}
            {cambiosDetectados.cargosNuevos?.length > 0 && (
              <div
                style={{
                  background: "#fdf4ff",
                  borderBottom: "1px solid #f0abfc",
                  padding: "10px 22px",
                  fontSize: 12,
                  color: "#86198f",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>🏷️</span>
                <span>
                  <strong>Nuevos cargos detectados ({cambiosDetectados.cargosNuevos.length}):</strong> Se crearán automáticamente en el catálogo de la empresa:{" "}
                  <em>{cambiosDetectados.cargosNuevos.join(", ")}</em>
                </span>
              </div>
            )}

            {/* Resumen de estadísticas */}
            <div
              style={{
                padding: "14px 22px",
                background: "#ffffff",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setFiltroVista("todos")}
                style={{
                  background: filtroVista === "todos" ? "#0f172a" : "#f1f5f9",
                  color: filtroVista === "todos" ? "#ffffff" : "#334155",
                  border: "none",
                  borderRadius: 20,
                  padding: "4px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Todos ({totalModificados + totalNuevos + totalSinCambio})
              </button>

              <button
                type="button"
                onClick={() => setFiltroVista("actualizar")}
                style={{
                  background: filtroVista === "actualizar" ? "#2563eb" : "#eff6ff",
                  color: filtroVista === "actualizar" ? "#ffffff" : "#1e40af",
                  border: "none",
                  borderRadius: 20,
                  padding: "4px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🔄 Por Actualizar ({totalModificados})
              </button>

              <button
                type="button"
                onClick={() => setFiltroVista("nuevos")}
                style={{
                  background: filtroVista === "nuevos" ? "#16a34a" : "#f0fdf4",
                  color: filtroVista === "nuevos" ? "#ffffff" : "#166534",
                  border: "none",
                  borderRadius: 20,
                  padding: "4px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ➕ Nuevos a Ingresar ({totalNuevos})
              </button>

              <button
                type="button"
                onClick={() => setFiltroVista("sinCambio")}
                style={{
                  background: filtroVista === "sinCambio" ? "#64748b" : "#f8fafc",
                  color: filtroVista === "sinCambio" ? "#ffffff" : "#64748b",
                  border: "none",
                  borderRadius: 20,
                  padding: "4px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Sin Cambios ({totalSinCambio})
              </button>
            </div>

            {/* Lista detallada de filas detectadas */}
            <div style={{ padding: "12px 22px", overflowY: "auto", flex: 1, maxHeight: 380 }}>
              {totalModificados === 0 && totalNuevos === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 20px", color: "#64748b" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                    No se encontraron cambios en el archivo
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Los datos del archivo coinciden exactamente con los empleados ya registrados en el sistema.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Filas por actualizar */}
                  {(filtroVista === "todos" || filtroVista === "actualizar") &&
                    cambiosDetectados.actualizar.map((item, idx) => (
                      <div
                        key={`upd-${idx}`}
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: 10,
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                background: "#dbeafe",
                                color: "#1e40af",
                                fontSize: 10.5,
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: 6,
                              }}
                            >
                              ACTUALIZAR
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                              {item.actualizado.nombre}
                            </span>
                            <span style={{ fontSize: 11, color: "#64748b" }}>
                              (CC: {item.actualizado.cedula || "N/A"})
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: "#334155", marginTop: 4 }}>
                            {item.cambios.difCargo && (
                              <span style={{ marginRight: 12 }}>
                                <strong>Cargo:</strong> {item.cambios.cargoAnterior} →{" "}
                                <strong style={{ color: "#2563eb" }}>{item.cambios.cargoNuevo}</strong>
                              </span>
                            )}
                            {item.cambios.difSalario && (
                              <span>
                                <strong>Salario:</strong> {fmt(item.cambios.salarioAnterior)} →{" "}
                                <strong style={{ color: "#16a34a" }}>{fmt(item.cambios.salarioNuevo)}</strong>
                              </span>
                            )}
                            {!item.cambios.difCargo && !item.cambios.difSalario && (
                              <span style={{ color: "#64748b" }}>
                                Cambios en datos bancarios o de contacto
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#1e40af" }}>
                            {item.actualizado.id}
                          </span>
                        </div>
                      </div>
                    ))}

                  {/* Filas nuevas */}
                  {(filtroVista === "todos" || filtroVista === "nuevos") &&
                    cambiosDetectados.nuevos.map((item, idx) => (
                      <div
                        key={`new-${idx}`}
                        style={{
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: 10,
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                background: "#dcfce7",
                                color: "#166534",
                                fontSize: 10.5,
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: 6,
                              }}
                            >
                              NUEVO EMPLEADO
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                              {item.actualizado.nombre}
                            </span>
                            <span style={{ fontSize: 11, color: "#64748b" }}>
                              (CC: {item.actualizado.cedula || "Pendiente"})
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: "#334155", marginTop: 4 }}>
                            <strong>Cargo:</strong> {item.actualizado.cargo} · <strong>Salario:</strong>{" "}
                            {fmt(item.actualizado.salario)} · <strong>Banco:</strong>{" "}
                            {item.actualizado.banco} ({item.actualizado.numeroCuenta || "Sin cuenta"})
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>
                            + Asignar ID
                          </span>
                        </div>
                      </div>
                    ))}

                  {/* Filas sin cambios */}
                  {filtroVista === "sinCambio" &&
                    cambiosDetectados.sinCambio.map((item, idx) => (
                      <div
                        key={`nc-${idx}`}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontSize: 12,
                          color: "#64748b",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          {item.actualizado.nombre} (CC: {item.actualizado.cedula})
                        </span>
                        <span>Sin cambios · {fmt(item.actualizado.salario)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Pie de acciones del modal */}
            <div
              style={{
                padding: "14px 22px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                disabled={procesando}
                style={{
                  background: "#ffffff",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={aplicarActualizacion}
                disabled={procesando || (totalModificados === 0 && totalNuevos === 0)}
                style={{
                  background:
                    totalModificados > 0 || totalNuevos > 0 ? "#16a34a" : "#94a3b8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor:
                    totalModificados > 0 || totalNuevos > 0 && !procesando
                      ? "pointer"
                      : "not-allowed",
                  boxShadow:
                    totalModificados > 0 || totalNuevos > 0
                      ? "0 2px 6px rgba(22,163,74,0.3)"
                      : "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{procesando ? "⏳ Guardando..." : "✅ Confirmar y Aplicar Cambios"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
