// Control para subir la firma escaneada de la empresa. Se sube una vez y
// queda guardada para cotizaciones, certificaciones e informes.
import { useRef, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { getFirmaImg, leerFirmaComoDataUri, setFirmaImg } from "../lib/firmaEmpresa";
import LBL from "./ui/LBL";
import { B } from "../styles/tokens";

export default function FirmaEmpresa() {
  const { empresaConfig, setEmpresaConfig } = useAppData();
  const firma = getFirmaImg(empresaConfig);
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  const onArchivo = async (e) => {
    const file = e.target.files?.[0];
    // Se limpia el input para que volver a elegir el mismo archivo dispare
    // el evento de nuevo.
    e.target.value = "";
    if (!file) return;
    try {
      const dataUri = await leerFirmaComoDataUri(file);
      setEmpresaConfig((prev) => setFirmaImg(prev, dataUri));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const quitar = () => {
    setEmpresaConfig((prev) => setFirmaImg(prev, ""));
    setError("");
  };

  return (
    <div style={{ marginTop: 12 }}>
      <LBL>Firma escaneada (se usa en todos los documentos)</LBL>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
        <div
          style={{
            width: 190,
            height: 84,
            border: "1px dashed #d0d5dd",
            borderRadius: 8,
            background: "#fafafa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {firma ? (
            <img src={firma} alt="Firma de la empresa" style={{ maxWidth: "100%", maxHeight: "100%" }} />
          ) : (
            <span style={{ fontSize: 10.5, color: "#98a2b3" }}>Sin firma cargada</span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{ ...B("#f2f4f7", "#475467"), fontSize: 11, padding: "7px 14px" }}
            >
              {firma ? "Cambiar firma" : "Subir firma"}
            </button>
            {firma && (
              <button
                type="button"
                onClick={quitar}
                style={{ ...B("#f2f4f7", "#475467"), fontSize: 11, padding: "7px 14px" }}
              >
                Quitar
              </button>
            )}
          </div>
          <div style={{ fontSize: 10, color: "#98a2b3", maxWidth: 320, lineHeight: 1.5 }}>
            Imagen PNG o JPG, de preferencia con fondo blanco. Se guarda una sola vez
            y aparece automaticamente en cotizaciones, certificaciones e informes.
          </div>
          {error && <div style={{ fontSize: 10.5, color: "#cc0000" }}>{error}</div>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={onArchivo}
        style={{ display: "none" }}
      />
    </div>
  );
}
