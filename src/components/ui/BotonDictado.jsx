import { useDictado } from "../../hooks/useDictado";

// Boton de microfono que se pone al lado de un campo de texto.
//
// Lo dictado se AGREGA al final de lo que ya hay: nunca borra lo escrito.
// Si el navegador no trae reconocedor -Firefox- el boton no aparece, en vez
// de quedarse ahi sin hacer nada.

// Se separa con un espacio salvo que lo anterior termine en salto de linea.
function unir(actual, nuevo) {
  const previo = String(actual ?? "");
  const trozo = String(nuevo ?? "").trim();
  if (!trozo) return previo;
  if (!previo) return trozo.charAt(0).toUpperCase() + trozo.slice(1);
  const separador = /[\s\n]$/.test(previo) ? "" : " ";
  return previo + separador + trozo;
}

export default function BotonDictado({ valor, onChange, titulo = "Dictar", compacto = false }) {
  const { escuchando, alternar, error, soportado } = useDictado({
    onTexto: (texto, { definitivo }) => {
      // Solo se pega lo definitivo. Lo provisional cambia mientras se habla y
      // pegarlo dejaba la frase repetida a pedazos.
      if (!definitivo) return;
      onChange(unir(valor, texto));
    },
  });

  if (!soportado) return null;

  const lado = compacto ? 26 : 32;

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
      <button
        type="button"
        onClick={alternar}
        title={escuchando ? "Parar el dictado" : titulo + " (el texto se agrega al final)"}
        aria-label={escuchando ? "Parar el dictado" : titulo}
        aria-pressed={escuchando}
        style={{
          width: lado,
          height: lado,
          borderRadius: 8,
          flexShrink: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: compacto ? 13 : 15,
          lineHeight: 1,
          transition: "background .12s ease",
          background: escuchando ? "#cc0000" : "#f1f5f9",
          color: escuchando ? "#fff" : "#475569",
          border: "1px solid " + (escuchando ? "#cc0000" : "#e2e8f0"),
        }}
      >
        {escuchando ? "■" : "🎤"}
      </button>
      {escuchando && (
        <span style={{ fontSize: 10, color: "#cc0000", whiteSpace: "nowrap" }}>Escuchando…</span>
      )}
      {error && (
        <span style={{ fontSize: 10, color: "#b54708", maxWidth: 210, textAlign: "right", lineHeight: 1.35 }}>
          {error}
        </span>
      )}
    </span>
  );
}
