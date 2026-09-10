import { useState } from "react";
import { B, CD, ST } from "../styles/tokens";
import { contarFotosPesadas, recomprimirFotosPesadas } from "../lib/imagenes";
import { cargarDetalleNube } from "../lib/backend/bootstrapAppData";

// Reduce las fotos que se guardaron sin comprimir en su momento.
//
// Las fotos viven dentro de la fila de la obra, el informe o la cotización.
// Las fotos nuevas ya entran reducidas; esto es para reducir las fotos que
// ya están guardadas en la base de datos para que la app cargue rápido.

const enMB = (caracteres) => (caracteres * 0.75 / 1048576);

export default function OptimizarFotos({ ctx, enModal = false, onCerrar = null }) {
  const {
    obras, setObras,
    cotizaciones, setCotizaciones,
    informes, setInformes,
    certs, setCerts,
    saveAllToCloud,
  } = ctx;

  const [revision, setRevision] = useState(null);
  const [cargandoNube, setCargandoNube] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 });
  const [resultado, setResultado] = useState(null);

  const traerDetallesCompletos = async (entidad, lista, etiqueta) => {
    const items = lista || [];
    const parciales = items.filter((it) => it && it.__parcial && it.id);
    if (!parciales.length) return items;

    setMensajeCarga(`Descargando fotos de ${etiqueta}…`);
    const mapaDetalles = new Map();
    for (let i = 0; i < parciales.length; i++) {
      const it = parciales[i];
      setMensajeCarga(`Descargando fotos de ${etiqueta} (${i + 1}/${parciales.length})…`);
      const full = await cargarDetalleNube(entidad, it.id);
      if (full) mapaDetalles.set(it.id, full);
    }

    return items.map((it) => {
      const full = mapaDetalles.get(it.id);
      return full ? { ...it, ...full, __parcial: false } : it;
    });
  };

  const revisar = async () => {
    setResultado(null);
    setRevision(null);
    setCargandoNube(true);

    try {
      // Asegurar que obras, cotizaciones e informes tengan sus fotos cargadas de la nube
      const obrasFull = await traerDetallesCompletos("obras", obras, "obras");
      if (obrasFull !== obras) setObras(obrasFull);

      const informesFull = await traerDetallesCompletos("informes", informes, "informes");
      if (informesFull !== informes) setInformes(informesFull);

      const cotizacionesFull = await traerDetallesCompletos("cotizaciones", cotizaciones, "cotizaciones");
      if (cotizacionesFull !== cotizaciones) setCotizaciones(cotizacionesFull);

      const gruposActivos = [
        { nombre: "Obras (avances y planos)", datos: obrasFull, aplicar: setObras },
        { nombre: "Informes de actividades", datos: informesFull, aplicar: setInformes },
        { nombre: "Cotizaciones", datos: cotizacionesFull, aplicar: setCotizaciones },
        { nombre: "Certificaciones", datos: certs, aplicar: setCerts },
      ];

      const detalle = gruposActivos.map(({ nombre, datos }) => ({
        nombre,
        ...contarFotosPesadas(datos ?? []),
      }));

      setRevision({
        detalle,
        grupos: gruposActivos,
        fotos: detalle.reduce((s, d) => s + d.fotos, 0),
        caracteres: detalle.reduce((s, d) => s + d.caracteres, 0),
      });
    } catch (err) {
      console.error("Error al revisar fotos:", err);
      window.alert("Ocurrió un error al consultar las fotos. Vuelve a intentarlo.");
    } finally {
      setCargandoNube(false);
      setMensajeCarga("");
    }
  };

  const optimizar = async () => {
    if (!revision?.fotos || !revision?.grupos) return;
    const aviso =
      `Se van a reducir ${revision.fotos} foto(s), unos ${enMB(revision.caracteres).toFixed(1)} MB.\n\n` +
      "Las fotos se ven igual en los PDF, solo pesan menos. El proceso puede " +
      "tardar un par de minutos y no debes cerrar la página mientras corre.\n\n¿Continuar?";
    if (!window.confirm(aviso)) return;

    setTrabajando(true);
    setProgreso({ hechas: 0, total: revision.fotos });
    let hechas = 0;
    let antes = 0;
    let despues = 0;

    try {
      for (const { datos, aplicar } of revision.grupos) {
        const reducido = await recomprimirFotosPesadas(datos ?? [], (paso) => {
          hechas += 1;
          antes += paso.antes;
          despues += paso.despues;
          setProgreso({ hechas, total: revision.fotos });
        });
        aplicar(reducido);
      }
      setResultado({ fotos: hechas, antes, despues });
      setRevision(null);
      if (saveAllToCloud) {
        saveAllToCloud();
      }
    } catch (error) {
      console.error("No se pudieron reducir las fotos:", error);
      window.alert("Algo falló al reducir las fotos. No se perdió ninguna: vuelve a intentarlo.");
    } finally {
      setTrabajando(false);
    }
  };

  const cuerpo = (
    <div>
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
        Las fotos se guardan dentro de las <strong>obras</strong>, <strong>informes de actividades</strong> o <strong>cotizaciones</strong>.
        Si se tomaron directo del celular sin comprimir, pueden pesar 4 a 8 MB cada una y hacer que la base de datos o los documentos se sientan lentos.
        Esta herramienta busca todas las fotos pesadas existentes y las reduce de una vez.
        <br />
        <strong style={{ color: "var(--accent, #4ade80)" }}>En los PDF y en pantalla se siguen viendo nítidas e iguales.</strong>
      </div>

      {cargandoNube && (
        <div style={{ background: "rgba(37, 99, 235, 0.15)", border: "1px solid rgba(37, 99, 235, 0.3)", borderRadius: 10, padding: "14px 16px", color: "#60a5fa", fontSize: 13, marginBottom: 14 }}>
          ⏳ {mensajeCarga || "Consultando fotos en la nube…"}
        </div>
      )}

      {!revision && !resultado && !trabajando && !cargandoNube && (
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={revisar} style={B("#f47c20")}>🔍 Revisar fotos guardadas</button>
          {enModal && <button onClick={onCerrar} style={{ ...B("var(--surface-subtle)", "var(--text-muted)"), border: "1px solid var(--border)" }}>Cerrar</button>}
        </div>
      )}

      {revision && !trabajando && !cargandoNube && (
        <div>
          {revision.fotos === 0 ? (
            <div style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "var(--green-700, #4ade80)", borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>
              ✓ Todo en orden: no hay fotos pesadas sin reducir. Todo el sistema está optimizado.
            </div>
          ) : (
            <>
              <div style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24", marginBottom: 8 }}>
                  Se encontraron {revision.fotos} foto{revision.fotos !== 1 ? "s" : ""} pesadas · unos {enMB(revision.caracteres).toFixed(1)} MB
                </div>
                {revision.detalle.filter((d) => d.fotos > 0).map((d) => (
                  <div key={d.nombre} style={{ fontSize: 12.5, color: "#fbbf24", marginBottom: 4 }}>
                    • <strong>{d.nombre}</strong>: {d.fotos} foto{d.fotos !== 1 ? "s" : ""} ({enMB(d.caracteres).toFixed(1)} MB)
                  </div>
                ))}
                <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 10, borderTop: "1px solid rgba(245, 158, 11, 0.25)", paddingTop: 8 }}>
                  Al optimizarlas quedarían en torno a <strong>{(enMB(revision.caracteres) / 12).toFixed(1)} MB</strong> (aproximadamente un 90% más ligeras).
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={optimizar} style={B("#16a34a", "#fff")}>⚡ Reducir y optimizar ahora</button>
                <button onClick={() => setRevision(null)} style={{ ...B("var(--surface-subtle)", "var(--text-muted)"), border: "1px solid var(--border)" }}>Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}

      {trabajando && (
        <div style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px" }}>
          <div style={{ fontSize: 13, color: "var(--text-main)", marginBottom: 10, fontWeight: 600 }}>
            ⏳ Optimizando {progreso.hechas} de {progreso.total} fotos… por favor no cierres la página.
          </div>
          <div style={{ background: "var(--border)", borderRadius: 999, height: 10, overflow: "hidden" }}>
            <div style={{
              background: "#f47c20", height: "100%", borderRadius: 999,
              width: `${progreso.total ? (progreso.hechas / progreso.total) * 100 : 0}%`,
              transition: "width .2s",
            }}/>
          </div>
        </div>
      )}

      {resultado && (
        <div style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "var(--green-700, #4ade80)", borderRadius: 10, padding: "14px 16px", fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>
          <strong>¡Listo! Mantenimiento completado con éxito.</strong>
          <br />
          Se redujeron {resultado.fotos} foto{resultado.fotos !== 1 ? "s" : ""}:
          de {enMB(resultado.antes).toFixed(1)} MB a {enMB(resultado.despues).toFixed(1)} MB
          {resultado.antes > 0 && <> (<strong>{Math.round((1 - resultado.despues / resultado.antes) * 100)}% de ahorro</strong>)</>}.
          <div style={{ marginTop: 6, fontSize: 12 }}>
            Los cambios se sincronizaron con la nube. La aplicación y la descarga de PDF ahora responderán más rápido.
          </div>
          {enModal && (
            <div style={{ marginTop: 12 }}>
              <button onClick={onCerrar} style={B("#166534", "#fff")}>Entendido y cerrar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (enModal) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(4px)", zIndex: 9999, display: "flex",
          alignItems: "center", justifyContent: "center", padding: 16,
        }}
        onClick={onCerrar}
      >
        <div
          style={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, maxWidth: 620, width: "100%",
            maxHeight: "90vh", overflowY: "auto", padding: 24,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ ...ST, marginBottom: 0 }}>📷 Mantenimiento · fotos guardadas</div>
            <button
              onClick={onCerrar}
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1, padding: 4 }}
              title="Cerrar"
            >
              ×
            </button>
          </div>
          {cuerpo}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...CD, marginTop: 20 }}>
      <div style={ST}>Mantenimiento · fotos guardadas</div>
      {cuerpo}
    </div>
  );
}
