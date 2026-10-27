import { useState } from "react";
import { avisar } from "../lib/dialogos";

// Recuadro que recibe archivos por tres caminos: clic (abre el selector),
// arrastrar y soltar, y pegar (Cmd+V / Ctrl+V con el recuadro enfocado).
//
// Los otros dos caminos existen porque el selector del sistema a veces falla
// sin que la pagina pueda hacer nada: en el Mac de Camila, Safari dejaba
// «Cargar» en gris con una foto valida escogida. Ese boton lo controla macOS,
// no la app; arrastrando la foto desde el Finder no se pasa por el.
//
//   <ZonaArchivos alRecibir={(archivos) => ...} onClick={() => ref.current?.click()}
//     style={...} estiloArrastrando={...}>
//     {(arrastrando) => arrastrando ? "Suelta aquí" : "Agregar foto"}
//   </ZonaArchivos>
//
// Sin onClick sirve como zona para soltar sobre un panel entero.

const traeArchivos = (e) => Array.from(e.dataTransfer?.types || []).includes("Files");

export default function ZonaArchivos({
  alRecibir,
  onClick,
  deshabilitado = false,
  style,
  estiloArrastrando,
  children,
  ...resto
}) {
  const [arrastrando, setArrastrando] = useState(false);

  const entregar = (lista) => {
    if (deshabilitado || !lista.length) return;
    alRecibir?.(lista);
  };

  return (
    <div
      {...resto}
      role={onClick ? "button" : resto.role}
      tabIndex={onClick ? 0 : resto.tabIndex}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick || e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e);
        }
      }}
      onDragOver={(e) => {
        if (!traeArchivos(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = deshabilitado ? "none" : "copy";
        if (!arrastrando && !deshabilitado) setArrastrando(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setArrastrando(false);
      }}
      onDrop={(e) => {
        if (!traeArchivos(e)) return;
        e.preventDefault();
        setArrastrando(false);
        if (deshabilitado) return;
        const lista = Array.from(e.dataTransfer.files || []);
        if (!lista.length) {
          // Pasa al arrastrar desde la app Fotos o desde una carpeta: el
          // navegador no recibe el archivo.
          avisar({
            titulo: "No llegó ningún archivo",
            mensaje: "Si lo arrastraste desde la app Fotos o desde una carpeta, guárdalo primero en el Escritorio o en Descargas y arrástralo desde allí.",
          });
          return;
        }
        entregar(lista);
      }}
      onPaste={(e) => {
        const lista = Array.from(e.clipboardData?.files || []);
        if (!lista.length) return; // Texto normal: que lo maneje el campo.
        e.preventDefault();
        entregar(lista);
      }}
      style={{ ...style, ...(arrastrando ? estiloArrastrando : null) }}
    >
      {typeof children === "function" ? children(arrastrando) : children}
    </div>
  );
}
