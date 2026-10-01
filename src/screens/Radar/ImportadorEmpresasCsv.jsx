import { useState, useRef } from "react";
import { CD, ST, SI } from "../../styles/tokens";
import { siguienteIdUnico } from "../../lib/identificadores";
import { normalizarRazonSocial, normalizarDocumento, normalizarTelefono, normalizarCorreo } from "../../lib/normalizarEntrada";

/**
 * Parser ligero de CSV compatible con comillas y delimitadores comma / semicolon
 */
function parsearCsv(texto = "") {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lineas.length) return { cabeceras: [], filas: [] };

  // Detectar separador común (, o ;)
  const primera = lineas[0];
  const separador = primera.includes(";") && !primera.includes(",") ? ";" : ",";

  const separarCampos = (linea) => {
    const campos = [];
    let dentroComillas = false;
    let actual = "";

    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        dentroComillas = !dentroComillas;
      } else if (c === separador && !dentroComillas) {
        campos.push(actual.trim().replace(/^"|"$/g, ""));
        actual = "";
      } else {
        actual += c;
      }
    }
    campos.push(actual.trim().replace(/^"|"$/g, ""));
    return campos;
  };

  const cabeceras = separarCampos(lineas[0]).map((h) => h.toLowerCase().trim());
  const filas = [];

  for (let i = 1; i < lineas.length; i++) {
    const campos = separarCampos(lineas[i]);
    if (campos.length > 1) {
      const obj = {};
      cabeceras.forEach((h, idx) => {
        obj[h] = campos[idx] || "";
      });
      filas.push(obj);
    }
  }

  return { cabeceras, filas };
}

export default function ImportadorEmpresasCsv({ clientes = [], setClientes, onFinalizado }) {
  const archivoRef = useRef(null);
  const [cargando, setCargando] = useState(false);
  const [datosParseados, setDatosParseados] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [progreso, setProgreso] = useState(null);

  const procesarArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);
    setCargando(true);

    const lector = new FileReader();
    lector.onload = (ev) => {
      try {
        const texto = String(ev.target?.result || "");
        const { cabeceras, filas } = parsearCsv(texto);

        // Mapeo inteligente de columnas
        const mapeados = filas.map((f, idx) => {
          const nombre =
            f.nombre_entidad ||
            f.razon_social ||
            f.nombre ||
            f.empresa ||
            f["razón social"] ||
            f["nombre entidad"] ||
            "";

          const nit =
            f.nit_entidad ||
            f.nit ||
            f.documento ||
            f["nit entidad"] ||
            "";

          const ciudad =
            f.ciudad ||
            f.municipio ||
            f.departamento ||
            "";

          const tel =
            f.telefono ||
            f.tel ||
            f.celular ||
            f.telefono_contacto ||
            "";

          const correo =
            f.email ||
            f.correo ||
            f.correo_electronico ||
            f["correo electrónico"] ||
            "";

          const dir =
            f.direccion ||
            f.domicilio ||
            f.direccion_ejecucion ||
            "";

          const notas =
            f.descripcion_del_proceso ||
            f.objeto_del_contrato ||
            f.objeto ||
            f.actividad ||
            "";

          return {
            idTemp: idx,
            nombre: normalizarRazonSocial(nombre),
            nit: nit ? normalizarDocumento(nit) : "",
            ciudad: ciudad.trim(),
            telefono: tel ? normalizarTelefono(tel) : "",
            email: correo ? normalizarCorreo(correo) : "",
            direccion: dir.trim() || `Sede principal - ${ciudad}`,
            contacto: f.contacto || f.representante_legal || "Gerencia",
            estado: "Prospecto",
            notas: notas.trim() ? `Importado de archivo. ${notas.slice(0, 140)}` : "Importado desde base de datos externa",
          };
        }).filter((x) => x.nombre.trim().length > 0);

        setDatosParseados({ cabeceras, filas: mapeados });
      } catch (err) {
        window.alert("No se pudo leer el archivo CSV. Revisa que esté bien formateado.");
      } finally {
        setCargando(false);
      }
    };

    lector.readAsText(file, "UTF-8");
  };

  const ejecutarImportacion = () => {
    if (!datosParseados?.filas?.length) return;

    // Filtrar repetidos por nombre o NIT
    const existentesNombres = new Set(clientes.map((c) => String(c.nombre || "").trim().toLowerCase()));
    const existentesNits = new Set(clientes.map((c) => String(c.nit || "").replace(/\D/g, "")).filter(Boolean));

    const paraAgregar = [];
    for (const f of datosParseados.filas) {
      const nKey = f.nombre.toLowerCase();
      const nitKey = f.nit.replace(/\D/g, "");

      if (existentesNombres.has(nKey) || (nitKey && existentesNits.has(nitKey))) {
        continue;
      }
      paraAgregar.push(f);
      existentesNombres.add(nKey);
      if (nitKey) existentesNits.add(nitKey);
    }

    if (!paraAgregar.length) {
      window.alert("Todas las empresas del archivo ya están registradas en tu lista de Clientes.");
      return;
    }

    setClientes((prev) => {
      const nuevos = [];
      for (const item of paraAgregar) {
        const id = siguienteIdUnico([...prev, ...nuevos], "CLI");
        nuevos.push({
          id,
          nombre: item.nombre,
          nit: item.nit,
          telefono: item.telefono,
          ciudad: item.ciudad,
          direccion: item.direccion,
          contacto: item.contacto,
          email: item.email,
          estado: "Prospecto",
          notas: item.notas,
        });
      }
      return [...prev, ...nuevos];
    });

    setProgreso(`¡Se importaron ${paraAgregar.length} empresas con éxito como Prospectos!`);
    setTimeout(() => {
      setProgreso(null);
      if (onFinalizado) onFinalizado();
    }, 2500);
  };

  return (
    <div style={CD}>
      <div style={ST}>📥 Importar Base de Datos Externa (Cámara de Comercio / Camacol / CSV)</div>
      <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginBottom: 16 }}>
        Carga cualquier archivo <strong>.csv</strong> descargado de la Cámara de Comercio, Camacol o SECOP II para agregar empresas masivamente como prospectos.
      </div>

      {/* Zona de carga */}
      <div
        onClick={() => archivoRef.current?.click()}
        style={{
          border: "2px dashed #cbd5e1",
          borderRadius: 10,
          padding: "24px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: "var(--surface-subtle, #f8fafc)",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 32 }}>📄</span>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #0f172a)", marginTop: 6 }}>
          {nombreArchivo ? `Archivo seleccionado: ${nombreArchivo}` : "Haz clic aquí para seleccionar el archivo .CSV"}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted, #64748b)", marginTop: 2 }}>
          Detecta automáticamente columnas de Razón Social, NIT, Teléfono, Correo y Ciudad
        </div>
        <input
          ref={archivoRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          style={{ display: "none" }}
          onChange={procesarArchivo}
        />
      </div>

      {cargando && <div style={{ fontSize: 12, color: "#64748b" }}>Leyendo y procesando archivo…</div>}

      {progreso && (
        <div style={{ padding: 12, background: "#dcfce7", color: "#15803d", borderRadius: 8, fontWeight: 700, fontSize: 12.5, marginBottom: 14 }}>
          {progreso}
        </div>
      )}

      {/* Vista previa de datos detectados */}
      {datosParseados?.filas?.length > 0 && !progreso && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main, #1e293b)" }}>
              Vista previa: {datosParseados.filas.length} empresas detectadas
            </span>
            <button
              type="button"
              onClick={ejecutarImportacion}
              style={{
                background: "#0f172a",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✓ Guardar {datosParseados.filas.length} en Clientes
            </button>
          </div>

          <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  <th style={{ padding: "6px 10px" }}>Empresa</th>
                  <th style={{ padding: "6px 10px" }}>NIT</th>
                  <th style={{ padding: "6px 10px" }}>Ciudad</th>
                  <th style={{ padding: "6px 10px" }}>Correo</th>
                  <th style={{ padding: "6px 10px" }}>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {datosParseados.filas.slice(0, 8).map((f) => (
                  <tr key={f.idTemp} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 10px", fontWeight: 600 }}>{f.nombre}</td>
                    <td style={{ padding: "6px 10px", color: "#64748b" }}>{f.nit || "S/N"}</td>
                    <td style={{ padding: "6px 10px" }}>{f.ciudad}</td>
                    <td style={{ padding: "6px 10px", color: "#64748b" }}>{f.email || "—"}</td>
                    <td style={{ padding: "6px 10px", color: "#64748b" }}>{f.telefono || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {datosParseados.filas.length > 8 && (
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, textAlign: "right" }}>
              Mostrando las primeras 8 de {datosParseados.filas.length} empresas.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
