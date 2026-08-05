import { useState } from "react";
import { B, CD, ST } from "../styles/tokens";
import { contarFotosPesadas, recomprimirFotosPesadas } from "../lib/imagenes";

// Reduce las fotos que se guardaron sin comprimir en su momento.
//
// Las fotos viven dentro de la fila de la obra o la cotizacion, y cada guardado
// sube la fila completa. Una foto de celular sin reducir son 4-8 MB que viajan
// otra vez cada vez que se toca cualquier campo de ese registro: eso es lo que
// dejaba sin conexiones al proyecto. Las fotos nuevas ya entran reducidas; esto
// es para las que quedaron de antes.

const enMB = (caracteres) => (caracteres * 0.75 / 1048576);

export default function OptimizarFotos({ ctx }) {
  const { obras, setObras, cotizaciones, setCotizaciones, informes, setInformes, certs, setCerts } = ctx;

  const [revision, setRevision] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 });
  const [resultado, setResultado] = useState(null);

  const grupos = [
    { nombre: "Obras", datos: obras, aplicar: setObras },
    { nombre: "Cotizaciones", datos: cotizaciones, aplicar: setCotizaciones },
    { nombre: "Informes", datos: informes, aplicar: setInformes },
    { nombre: "Certificaciones", datos: certs, aplicar: setCerts },
  ];

  const revisar = () => {
    const detalle = grupos.map(({ nombre, datos }) => ({
      nombre,
      ...contarFotosPesadas(datos ?? []),
    }));
    setResultado(null);
    setRevision({
      detalle,
      fotos: detalle.reduce((s, d) => s + d.fotos, 0),
      caracteres: detalle.reduce((s, d) => s + d.caracteres, 0),
    });
  };

  const optimizar = async () => {
    if (!revision?.fotos) return;
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
      for (const { datos, aplicar } of grupos) {
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
    } catch (error) {
      console.error("No se pudieron reducir las fotos:", error);
      window.alert("Algo falló al reducir las fotos. No se perdió ninguna: vuelve a intentarlo.");
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div style={{ ...CD, marginTop: 20 }}>
      <div style={ST}>Mantenimiento · fotos guardadas</div>
      <div style={{ fontSize: 12, color: "#667085", lineHeight: 1.6, marginBottom: 14 }}>
        Las fotos se guardan dentro de la obra o la cotización, y cada vez que guardas un cambio
        vuelven a subir enteras. Las que se cargaron antes de septiembre entraron sin reducir y son
        la causa de que la base de datos se quede sin conexión. Esto las reduce de una vez.
        <strong> En los PDF se siguen viendo igual.</strong>
      </div>

      {!revision && !resultado && !trabajando && (
        <button onClick={revisar} style={B("#101828")}>Revisar fotos guardadas</button>
      )}

      {revision && !trabajando && (
        <div>
          {revision.fotos === 0 ? (
            <div style={{ background: "#f2f4f7", border: "1px solid #027a48", color: "#027a48", borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>
              Todo en orden: no hay fotos sin reducir. No hay nada que hacer aquí.
            </div>
          ) : (
            <>
              <div style={{ background: "#f2f4f7", border: "1px solid #eaecf0", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#b54708", marginBottom: 6 }}>
                  {revision.fotos} foto{revision.fotos !== 1 ? "s" : ""} sin reducir · unos {enMB(revision.caracteres).toFixed(1)} MB
                </div>
                {revision.detalle.filter((d) => d.fotos > 0).map((d) => (
                  <div key={d.nombre} style={{ fontSize: 12, color: "#b54708" }}>
                    · {d.nombre}: {d.fotos} foto{d.fotos !== 1 ? "s" : ""} ({enMB(d.caracteres).toFixed(1)} MB)
                  </div>
                ))}
                <div style={{ fontSize: 11.5, color: "#b54708", marginTop: 7 }}>
                  Quedarían en torno a {(enMB(revision.caracteres) / 15).toFixed(1)} MB.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={optimizar} style={B("#101828", "#ffffff")}>Reducirlas ahora</button>
                <button onClick={() => setRevision(null)} style={B("#f2f4f7", "#475467")}>Ahora no</button>
              </div>
            </>
          )}
        </div>
      )}

      {trabajando && (
        <div>
          <div style={{ fontSize: 13, color: "#101828", marginBottom: 8 }}>
            Reduciendo {progreso.hechas} de {progreso.total}… no cierres la página.
          </div>
          <div style={{ background: "#f2f4f7", borderRadius: 999, height: 9, overflow: "hidden" }}>
            <div style={{
              background: "#101828", height: "100%", borderRadius: 999,
              width: `${progreso.total ? (progreso.hechas / progreso.total) * 100 : 0}%`,
              transition: "width .2s",
            }}/>
          </div>
        </div>
      )}

      {resultado && (
        <div style={{ background: "#f2f4f7", border: "1px solid #027a48", color: "#027a48", borderRadius: 10, padding: "12px 16px", fontSize: 13, lineHeight: 1.6 }}>
          <strong>Listo.</strong> Se redujeron {resultado.fotos} foto{resultado.fotos !== 1 ? "s" : ""}:
          de {enMB(resultado.antes).toFixed(1)} MB a {enMB(resultado.despues).toFixed(1)} MB
          {resultado.antes > 0 && <> ({Math.round((1 - resultado.despues / resultado.antes) * 100)}% menos)</>}.
          <div style={{ marginTop: 5, fontSize: 12 }}>
            El indicador de arriba dirá «Guardando» un momento mientras suben los cambios. Cuando
            diga «Guardado», ya está.
          </div>
        </div>
      )}
    </div>
  );
}
