import { useRef, useState } from "react";
import AvisoFlujo from "../../components/AvisoFlujo";
import { B, CD, SI, ST } from "../../styles/tokens";
import { leerFacturaDian } from "../../lib/lectorFacturaDian";
import { fmt } from "../../lib/format";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

export default function ImportarFacturaDian({
  proveedores = [],
  obras = [],
  onAplicar,
  onCerrar,
}) {
  const entrada = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [textoPegado, setTextoPegado] = useState("");
  const [modoPegar, setModoPegar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [obraIdSeleccionada, setObraIdSeleccionada] = useState("");
  const [tipoOperacion, setTipoOperacion] = useState("compras");
  const [esAutorretenedor, setEsAutorretenedor] = useState(false);
  const [tarifaRetFuente, setTarifaRetFuente] = useState(2.5);

  const limpiar = () => {
    setArchivo(null);
    setTextoPegado("");
    setError("");
    setResultado(null);
    setObraIdSeleccionada("");
  };

  const procesarContenido = async (archivoOTexto) => {
    setCargando(true);
    setError("");
    try {
      const data = await leerFacturaDian(archivoOTexto);
      setResultado(data);

      // Revisar si el proveedor ya existe en la base
      const provExistente = proveedores.find((p) => {
        const nitLimpio = String(p.nit || "").replace(/\D/g, "");
        const nitDian = String(data.proveedor.nit || "").replace(/\D/g, "");
        if (nitLimpio && nitDian && nitLimpio === nitDian) return true;
        return normalizarRazonSocial(p.nombre) === normalizarRazonSocial(data.proveedor.nombre);
      });

      const autorret = provExistente ? !!provExistente.autorretenedorRenta : false;
      setEsAutorretenedor(autorret);

      const op = data.tipoOperacion || "compras";
      setTipoOperacion(op);
      setTarifaRetFuente(autorret ? 0 : (op === "servicio" ? 4.0 : 2.5));
    } catch (err) {
      setError(err.message || "No se pudo interpretar el archivo de la DIAN.");
    } finally {
      setCargando(false);
    }
  };

  const alEscogerArchivo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) {
      setArchivo(file);
      procesarContenido(file);
    }
  };

  const alProcesarTextoPegado = () => {
    if (!textoPegado.trim()) {
      setError("Pega el contenido XML o HTML antes de interpretar.");
      return;
    }
    procesarContenido(textoPegado);
  };

  // Buscar proveedor en la lista actual
  const proveedorExistente = resultado
    ? proveedores.find((p) => {
        const nitLimpio = String(p.nit || "").replace(/\D/g, "");
        const nitDian = String(resultado.proveedor.nit || "").replace(/\D/g, "");
        if (nitLimpio && nitDian && nitLimpio === nitDian) return true;
        return normalizarRazonSocial(p.nombre) === normalizarRazonSocial(resultado.proveedor.nombre);
      })
    : null;

  // Cálculos dinámicos
  const subtotal = Number(resultado?.subtotal || 0);
  const valorIva = Number(resultado?.valorIva || 0);
  const baseRet = esAutorretenedor ? 0 : subtotal;
  const valorRet = esAutorretenedor ? 0 : Number((baseRet * (tarifaRetFuente / 100)).toFixed(2));
  const valorTotalPagar = Number((subtotal + valorIva - valorRet).toFixed(2));

  const copiarCufe = () => {
    if (resultado?.cufe) {
      navigator.clipboard.writeText(resultado.cufe);
      window.alert("CUFE copiado al portapapeles.");
    }
  };

  const causar = () => {
    if (!resultado) return;

    onAplicar({
      factura: resultado.factura,
      cufe: resultado.cufe,
      fecha: resultado.fecha,
      fechaVence: resultado.fechaVence,
      proveedorExistenteId: proveedorExistente?.id || null,
      proveedorData: {
        nombre: resultado.proveedor.nombre,
        nit: resultado.proveedor.nit,
        dv: resultado.proveedor.dv,
        direccion: resultado.proveedor.direccion,
        ciudad: resultado.proveedor.ciudad,
        telefono: resultado.proveedor.telefono,
        email: resultado.proveedor.email,
        responsableIva: resultado.proveedor.responsableIva,
        autorretenedorRenta: esAutorretenedor,
      },
      obraId: obraIdSeleccionada || "",
      tipoOperacion,
      concepto: resultado.concepto,
      subtotal,
      tarifaIva: resultado.tarifaIva,
      valorIva,
      conceptoRetFuente: tipoOperacion === "servicio" ? "servicios" : "compras",
      baseRetFuente: baseRet,
      tarifaRetFuente,
      valorRetFuente: valorRet,
      valorTotalPagar,
      monto: valorTotalPagar,
      items: resultado.items,
      estadoRadian: "pendiente",
      eventosRadian: [
        {
          codigo: "030",
          nombre: "Acuse de recibo de la Factura Electrónica",
          estado: "registrado_local",
          fecha: new Date().toISOString(),
        },
      ],
    });
  };

  return (
    <div style={{ background: "#fff", border: "1.5px solid #2563eb", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 4px 16px rgba(37,99,235,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "#1e3a8a" }}>Importar Factura Electrónica DIAN (XML / HTML)</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Lee AttachedDocument UBL 2.1, CUFE y representaciones oficiales de compras</div>
          </div>
        </div>
        <button type="button" onClick={onCerrar} style={{ ...B("#f1f5f9", "#475569"), fontSize: 12, padding: "6px 12px" }}>
          Cerrar
        </button>
      </div>

      {!resultado && (
        <AvisoFlujo tono="info" titulo="Sube el archivo XML (AttachedDocument) o HTML que te envió el proveedor">
          Las facturas electrónicas en Colombia llegan por correo dentro de un archivo .zip que contiene un archivo <strong>.xml</strong> (AttachedDocument) y la representación gráfica.
          <div style={{ marginTop: 4 }}>
            El sistema extrae el <strong>CUFE</strong>, datos del emisor, impuestos, retenciones e ítems con precisión matemática exacta y sin costo.
          </div>
        </AvisoFlujo>
      )}

      {/* Selector o entrada */}
      <input ref={entrada} type="file" accept=".xml,.html,.htm,.txt" onChange={alEscogerArchivo} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={cargando}
          style={{ ...B("#2563eb", "#ffffff"), opacity: cargando ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <span>📁</span>
          {archivo ? "Escoger otro archivo…" : "Escoger archivo XML o HTML…"}
        </button>

        <button
          type="button"
          onClick={() => setModoPegar(!modoPegar)}
          style={{ ...B("#f8fafc", "#334155"), border: "1px solid #cbd5e1" }}
        >
          {modoPegar ? "Ocultar área de texto" : "Pegar XML / HTML / CUFE"}
        </button>

        {archivo && (
          <span style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>
            ✓ {archivo.name} ({Math.round(archivo.size / 1024)} KB)
          </span>
        )}

        {cargando && (
          <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 700 }}>
            Leyendo y validando estructura DIAN UBL 2.1…
          </span>
        )}
      </div>

      {modoPegar && !resultado && (
        <div style={{ marginTop: 12 }}>
          <textarea
            rows={4}
            value={textoPegado}
            onChange={(e) => setTextoPegado(e.target.value)}
            placeholder="Pega aquí el código XML completo de la factura, el código HTML o el CUFE..."
            style={{ ...SI, fontFamily: "Consolas, monospace", fontSize: 11, width: "100%", boxSizing: "border-box" }}
          />
          <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={alProcesarTextoPegado} style={B("#2563eb", "#ffffff")}>
              Interpretar contenido pegado
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "#FEF3F2", border: "1px solid #FECDCA", color: "#B42318", borderRadius: 10, padding: "10px 14px", fontSize: 12, marginTop: 12 }}>
          <strong>Error de lectura:</strong> {error}
        </div>
      )}

      {/* Vista previa de la factura interpretada */}
      {resultado && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
            {/* Columna 1: Proveedor y Documento */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                🏢 Datos del Proveedor (Emisor)
              </div>

              {proveedorExistente ? (
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, color: "#166534", marginBottom: 10 }}>
                  ✓ <strong>Proveedor registrado:</strong> {proveedorExistente.nombre} ({proveedorExistente.id})
                </div>
              ) : (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, color: "#92400e", marginBottom: 10 }}>
                  ✨ <strong>Proveedor nuevo:</strong> Se registrará automáticamente en la base de datos al causar.
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 9.5, color: "#64748b", textTransform: "uppercase" }}>Razón Social</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{resultado.proveedor.nombre}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, color: "#64748b", textTransform: "uppercase" }}>NIT / Documento</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                    {resultado.proveedor.nit} {resultado.proveedor.dv ? `-${resultado.proveedor.dv}` : ""}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, color: "#64748b", textTransform: "uppercase" }}>Ciudad / Municipio</div>
                  <div style={{ fontSize: 11.5, color: "#334155" }}>{resultado.proveedor.ciudad || "No indicada"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, color: "#64748b", textTransform: "uppercase" }}>Correo Emisor</div>
                  <div style={{ fontSize: 11.5, color: "#334155", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {resultado.proveedor.email || "No indicado"}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "#334155", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={esAutorretenedor}
                    onChange={(e) => {
                      const check = e.target.checked;
                      setEsAutorretenedor(check);
                      setTarifaRetFuente(check ? 0 : (tipoOperacion === "servicio" ? 4.0 : 2.5));
                    }}
                  />
                  <span>Es <strong>Autorretenedor de Renta</strong> (no practicar retención en la fuente)</span>
                </label>
              </div>

              <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                  📄 Factura Electrónica y CUFE
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: "#64748b", textTransform: "uppercase" }}>N° Factura</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#cc0000" }}>{resultado.factura}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: "#64748b", textTransform: "uppercase" }}>Fecha Emisión</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{resultado.fecha}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: "#64748b", textTransform: "uppercase" }}>Fecha Vencimiento</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{resultado.fechaVence}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: "#64748b", textTransform: "uppercase" }}>Estado RADIAN</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb" }}>⚡ Pendiente Acuse (030)</div>
                  </div>
                </div>

                {resultado.cufe && (
                  <div style={{ marginTop: 8, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 9.5, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>CUFE OFICIAL DIAN</span>
                      <button type="button" onClick={copiarCufe} style={{ ...B("#f1f5f9", "#0f172a"), fontSize: 10, padding: "2px 6px" }}>
                        Copiar
                      </button>
                    </div>
                    <div style={{ fontFamily: "Consolas, monospace", fontSize: 10, color: "#334155", wordBreak: "break-all" }}>
                      {resultado.cufe}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Columna 2: Desglose Tributario y Económico */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#ffffff" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                💰 Liquidación Tributaria
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 9.5, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Tipo de Operación</div>
                  <select
                    value={tipoOperacion}
                    onChange={(e) => {
                      const t = e.target.value;
                      setTipoOperacion(t);
                      if (!esAutorretenedor) {
                        setTarifaRetFuente(t === "servicio" ? 4.0 : (t === "honorarios" ? 11.0 : 2.5));
                      }
                    }}
                    style={{ ...SI, fontSize: 11.5, padding: "5px 8px" }}
                  >
                    <option value="compras">Bien / Compra (2.5%)</option>
                    <option value="servicio">Servicio General (4.0%)</option>
                    <option value="honorarios">Honorarios (11.0%)</option>
                    <option value="arrendamientos">Arrendamiento (3.5%)</option>
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: 9.5, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Asignar a Obra (Opcional)</div>
                  <select
                    value={obraIdSeleccionada}
                    onChange={(e) => setObraIdSeleccionada(e.target.value)}
                    style={{ ...SI, fontSize: 11.5, padding: "5px 8px" }}
                  >
                    <option value="">(Gasto general de empresa)</option>
                    {obras.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.proyecto || o.id} · {o.cliente}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tabla de valores */}
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: 10, border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                  <span style={{ color: "#475569" }}>Subtotal / Base gravable:</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{fmt(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                  <span style={{ color: "#475569" }}>IVA ({resultado.tarifaIva}%):</span>
                  <span style={{ fontWeight: 700, color: "#166534" }}>+ {fmt(valorIva)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#475569" }}>Retefuente:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      disabled={esAutorretenedor}
                      value={tarifaRetFuente}
                      onChange={(e) => setTarifaRetFuente(Number(e.target.value) || 0)}
                      style={{ ...SI, width: 55, padding: "2px 4px", fontSize: 11, textAlign: "center", background: esAutorretenedor ? "#e2e8f0" : "#fff" }}
                    />
                    <span style={{ fontSize: 11, color: "#64748b" }}>%</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#b91c1c" }}>
                    - {fmt(valorRet)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 4px 0", marginTop: 6, borderTop: "1.5px solid #e2e8f0", fontSize: 13.5 }}>
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>Neto a pagar:</span>
                  <span style={{ fontWeight: 800, color: "#cc0000" }}>{fmt(valorTotalPagar)}</span>
                </div>
              </div>

              {/* Ítems detallados */}
              {resultado.items.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                    Ítems facturados ({resultado.items.length})
                  </div>
                  <div style={{ maxHeight: 110, overflowY: "auto", fontSize: 11, border: "1px solid #f1f5f9", borderRadius: 6, padding: "4px 8px" }}>
                    {resultado.items.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: idx < resultado.items.length - 1 ? "1px solid #f8fafc" : "none" }}>
                        <span style={{ color: "#334155", flex: 1, marginRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.cant}x {item.desc}
                        </span>
                        <span style={{ color: "#0f172a", fontWeight: 600 }}>{fmt(item.total || item.cant * item.vu)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción final */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
            <button type="button" onClick={limpiar} style={{ ...B("#f1f5f9", "#475569"), fontSize: 12 }}>
              Descartar
            </button>
            <button
              type="button"
              onClick={causar}
              style={{ ...B("#166534", "#ffffff"), padding: "9px 18px", fontSize: 13, fontWeight: 800, boxShadow: "0 2px 6px rgba(22,101,52,0.25)" }}
            >
              ✅ Causar Factura en Contabilidad
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
