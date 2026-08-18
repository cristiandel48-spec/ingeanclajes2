// Codigo y version de cada formato de la empresa.
//
// Va aqui, al lado de la firma, porque es lo mismo: se configura una vez y
// vale para todos los documentos que salen del programa.
//
// LO IMPORTANTE ES QUE SE PUEDA SUBIR LA VERSION SIN TOCAR EL PROGRAMA. El
// control de documentos no consiste en poner un codigo bonito, sino en que
// cuando la plantilla cambia, el numero de version cambie con ella. Si eso
// obligara a publicar una version nueva del sistema, nadie lo haria y el
// codigo impreso mentiria.
import { useAppData } from "../context/AppDataContext";
import { FORMATOS, getControlDocumental, setControlDocumental } from "../lib/controlDocumental";
import LBL from "./ui/LBL";
import { SI } from "../styles/tokens";

export default function ControlDocumentalConfig() {
  const { empresaConfig, setEmpresaConfig } = useAppData();
  const valores = getControlDocumental(empresaConfig);

  const cambiar = (clave, campo, valor) =>
    setEmpresaConfig((prev) => setControlDocumental(prev, clave, { [campo]: valor }));

  return (
    <div>
      <LBL>Control de documentos</LBL>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, lineHeight: 1.55 }}>
        El código y la versión salen impresos en el encabezado de cada documento. Identifican
        <strong> la plantilla</strong>, no el documento: el número de la cotización o del informe
        sigue siendo el de siempre. <strong>Cuando cambies un formato, sube aquí su versión.</strong>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr .6fr 1fr",
          gap: 8, padding: "7px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
          fontSize: 9.5, fontWeight: 800, letterSpacing: .4, color: "#94a3b8", textTransform: "uppercase" }}>
          <span>Documento</span><span>Código</span><span>Versión</span><span>Desde</span>
        </div>

        {FORMATOS.map(({ clave, etiqueta }) => (
          <div key={clave} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr .6fr 1fr",
            gap: 8, padding: "8px 12px", alignItems: "center", borderBottom: "1px solid #f8fafc" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{etiqueta}</span>
            <input
              value={valores[clave].codigo}
              onChange={(e) => cambiar(clave, "codigo", e.target.value.toUpperCase())}
              placeholder="sin código"
              spellCheck={false}
              style={{ ...SI, fontSize: 11.5, padding: "5px 8px", fontFamily: "Consolas, monospace" }} />
            <input
              value={valores[clave].version}
              onChange={(e) => cambiar(clave, "version", e.target.value)}
              placeholder="1"
              style={{ ...SI, fontSize: 11.5, padding: "5px 8px", textAlign: "center" }} />
            <input
              type="date"
              value={valores[clave].fecha}
              onChange={(e) => cambiar(clave, "fecha", e.target.value)}
              style={{ ...SI, fontSize: 11.5, padding: "5px 8px" }} />
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 7, lineHeight: 1.5 }}>
        Deja el código en blanco y ese documento sale sin el cuadro de control, como antes.
      </div>
    </div>
  );
}
