import { useMemo, useRef, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { Button, useToast } from "./ui";
import LBL from "./ui/LBL";
import { SI } from "../styles/tokens";
import { FUENTE } from "../styles/designTokens";
import { normalizarMayusculas } from "../lib/normalizarEntrada";
import {
  TIPOS_FIRMA_ACEPTADOS,
  detectarCoordinadorEnSesion,
  guardarFirmaCoordinador,
  leerFirmaCoordinadorComoDataUri,
} from "../lib/firmasCoordinadores";

const CAMPO = { ...SI, borderRadius: 12 };

/**
 * Aviso automatico por sesion para coordinadores de obra / SST (por ejemplo
 * Paola Escobar, Richard Buelvas u otro coordinador registrado).
 *
 * Al iniciar sesion, si todavia no han subido su firma escaneada (PDF, JPEG o
 * PNG), aparece esta hoja estilo macOS invitandolos a subirla una sola vez
 * para que quede impresa automaticamente en los Informes de Actividades.
 */
export default function AvisoFirmaCoordinador() {
  const {
    membresia,
    authUserEmail,
    empleados,
    empresaConfig,
    setEmpresaConfig,
    nubeLista,
  } = useAppData();
  const toast = useToast();
  const inputArchivoRef = useRef(null);

  const coordSesion = useMemo(
    () => detectarCoordinadorEnSesion({ membresia, authUserEmail, empleados, empresaConfig }),
    [membresia, authUserEmail, empleados, empresaConfig]
  );

  const claveDescarte = coordSesion
    ? `ingeanclajes_aviso_firma_coord_v1:${coordSesion.clave}`
    : "";

  const [descartadoClave, setDescartadoClave] = useState("");
  const [firmaPreview, setFirmaPreview] = useState("");
  const [archivoNombre, setArchivoNombre] = useState("");
  const [cedulaEdit, setCedulaEdit] = useState(null);
  const [cargoEdit, setCargoEdit] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState("");

  const descartadoEnSesion = useMemo(() => {
    if (!claveDescarte) return true;
    if (descartadoClave === claveDescarte) return true;
    try {
      return sessionStorage.getItem(claveDescarte) === "1";
    } catch {
      return false;
    }
  }, [claveDescarte, descartadoClave]);

  const mostrar = Boolean(
    nubeLista &&
    coordSesion &&
    !coordSesion.tieneFirmaGuardada &&
    !descartadoEnSesion
  );

  if (!mostrar || !coordSesion) return null;

  const primerNombre = coordSesion.nombre.split(" ")[0] || coordSesion.nombre;
  const cedulaActual = cedulaEdit !== null ? cedulaEdit : (coordSesion.cedula || "");
  const cargoActual = cargoEdit !== null ? cargoEdit : (coordSesion.cargo || "COORDINADOR SST");

  const descartar = () => {
    try {
      if (claveDescarte) sessionStorage.setItem(claveDescarte, "1");
    } catch {
      // Ignorar si sessionStorage no esta disponible
    }
    setDescartadoClave(claveDescarte);
  };

  const procesarArchivo = async (archivo) => {
    if (!archivo) return;
    setError("");
    setProcesando(true);
    try {
      const dataUri = await leerFirmaCoordinadorComoDataUri(archivo);
      setFirmaPreview(dataUri);
      setArchivoNombre(archivo.name || "firma");
    } catch (err) {
      setError(err?.message || "No se pudo leer el archivo. Intenta con un PDF escaneado, JPEG o PNG.");
    } finally {
      setProcesando(false);
    }
  };

  const guardarMiFirma = () => {
    if (!firmaPreview || typeof setEmpresaConfig !== "function") return;
    setEmpresaConfig((prev) =>
      guardarFirmaCoordinador(prev, {
        nombre: coordSesion.nombre,
        empleadoId: coordSesion.empleadoId || "",
        cargo: String(cargoActual || "COORDINADOR SST").trim().toUpperCase(),
        cedula: String(cedulaActual || "").trim(),
        firmaImg: firmaPreview,
      })
    );
    toast.exito(
      `¡Listo, ${primerNombre}! Tu firma quedó guardada y saldrá impresa automáticamente en los Informes de Actividades.`
    );
    setFirmaPreview("");
    setArchivoNombre("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-aviso-firma-coord"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2500,
        background: "rgba(15, 23, 42, 0.48)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: FUENTE,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--surface, #ffffff)",
          color: "var(--text-primary, #1d1d1f)",
          borderRadius: 22,
          border: "1px solid var(--separator, #e2e8f0)",
          boxShadow: "0 24px 60px -12px rgba(15, 23, 42, 0.35)",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Franja superior cromática estilo Mac */}
        <div
          style={{
            height: 4,
            background: "linear-gradient(90deg, #E0342A 0%, #F97316 48%, #0071E3 100%)",
          }}
        />

        <div style={{ padding: "22px 24px 20px" }}>
          {/* Cabecera personalizada por sesión */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <span
                style={{
                  display: "inline-block",
                  background: "#EFF6FF",
                  color: "#1D4ED8",
                  border: "1px solid #BFDBFE",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "2.5px 9px",
                  borderRadius: 999,
                  marginBottom: 8,
                }}
              >
                {cargoActual}
              </span>
              <h2
                id="titulo-aviso-firma-coord"
                style={{
                  margin: 0,
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.25,
                  color: "var(--text-primary, #1d1d1f)",
                }}
              >
                Hola, {coordSesion.nombre}
              </h2>
            </div>

            <button
              type="button"
              onClick={descartar}
              aria-label="Cerrar por ahora"
              style={{
                background: "var(--fill, #f2f4f7)",
                border: "none",
                width: 30,
                height: 30,
                borderRadius: "50%",
                color: "var(--text-tertiary, #667085)",
                fontSize: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>

          <p
            style={{
              margin: "8px 0 16px",
              fontSize: 13.5,
              lineHeight: 1.5,
              color: "var(--text-secondary, #475467)",
            }}
          >
            Sube tu <strong>firma escaneada en PDF</strong> (o en JPEG / PNG) una sola vez para dejarla
            impresa automáticamente en el <strong>Informe de Actividades</strong> cada vez que seas
            coordinador(a) en obra.
          </p>

          {/* Datos que acompañan la firma */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 10, marginBottom: 14 }}>
            <div>
              <LBL>Cargo en el informe</LBL>
              <input
                value={cargoActual}
                onChange={(e) => setCargoEdit(e.target.value.toUpperCase())}
                onBlur={(e) => setCargoEdit(normalizarMayusculas(e.target.value))}
                placeholder="COORDINADOR SST"
                style={{ ...CAMPO, fontSize: 12.5, textTransform: "uppercase" }}
              />
            </div>
            <div>
              <LBL>Cédula (C.C.)</LBL>
              <input
                value={cedulaActual}
                onChange={(e) => setCedulaEdit(e.target.value)}
                placeholder="Ej: 1037600123"
                style={{ ...CAMPO, fontSize: 12.5 }}
              />
            </div>
          </div>

          {/* Input de archivo oculto: acepta PDF escaneado, JPEG y PNG */}
          <input
            ref={inputArchivoRef}
            type="file"
            accept={TIPOS_FIRMA_ACEPTADOS}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) procesarArchivo(f);
              e.target.value = "";
            }}
          />

          {/* Zona de carga o vista previa en vivo */}
          {!firmaPreview ? (
            <div
              onClick={() => !procesando && inputArchivoRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastrando(false);
                const f = e.dataTransfer?.files?.[0];
                if (f) procesarArchivo(f);
              }}
              style={{
                border: `1.5px dashed ${arrastrando ? "#0071E3" : "#93C5FD"}`,
                background: arrastrando ? "#DBEAFE" : "#EFF6FF",
                borderRadius: 16,
                padding: "22px 18px",
                textAlign: "center",
                cursor: procesando ? "wait" : "pointer",
                transition: "all 0.18s ease",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>
                {procesando ? "⏳" : "✍️"}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1D4ED8" }}>
                {procesando
                  ? "Procesando firma escaneada y limpiando fondo…"
                  : "Toca aquí o arrastra tu firma escaneada en PDF"}
              </div>
              <div style={{ fontSize: 11.5, color: "#475467", marginTop: 4 }}>
                Acepta <strong>PDF escaneado</strong>, <strong>JPEG</strong> o <strong>PNG</strong> (máx. 8 MB).
                Recortamos los márgenes blancos automáticamente.
              </div>
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #BFDBFE",
                borderTop: "3px solid #0071E3",
                borderRadius: 14,
                padding: "12px 14px",
                background: "#EFF6FF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Vista previa en tu Informe de Actividades
                </span>
                <button
                  type="button"
                  onClick={() => inputArchivoRef.current?.click()}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #BFDBFE",
                    color: "#1D4ED8",
                    borderRadius: 999,
                    padding: "2px 9px",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cambiar archivo
                </button>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #DBEAFE",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 8.5, fontWeight: 800, color: "#1D4ED8", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
                  Coordinador de Obra / SST
                </div>
                <div
                  style={{
                    height: 56,
                    display: "flex",
                    alignItems: "flex-end",
                    borderBottom: "1px solid #E2E8F0",
                    paddingBottom: 4,
                    marginBottom: 6,
                  }}
                >
                  <img
                    src={firmaPreview}
                    alt={`Firma de ${coordSesion.nombre}`}
                    style={{ maxHeight: 50, maxWidth: 220, objectFit: "contain", display: "block" }}
                  />
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#1d1d1f", textTransform: "uppercase" }}>
                  {coordSesion.nombre}
                </div>
                {cedulaActual && (
                  <div style={{ fontSize: 9.5, color: "#1d1d1f", marginTop: 1 }}>C.C.: {cedulaActual}</div>
                )}
                <div style={{ fontSize: 9.5, color: "#1D4ED8", fontWeight: 600, marginTop: 1 }}>{cargoActual}</div>
                <div style={{ fontSize: 8.5, color: "#6e6e73", marginTop: 1 }}>
                  Encargado del personal · Ingeanclajes S.A.S.
                </div>
              </div>

              {archivoNombre && (
                <div style={{ fontSize: 11, color: "#047857", fontWeight: 600, marginTop: 7 }}>
                  ✓ Archivo cargado: {archivoNombre}
                </div>
              )}
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                borderRadius: 10,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#B91C1C",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* Botones de acción */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
              marginTop: 18,
              paddingTop: 14,
              borderTop: "1px solid var(--separator, #e2e8f0)",
            }}
          >
            <Button variante="texto" tam="sm" onClick={descartar}>
              Ahora no
            </Button>
            {firmaPreview ? (
              <button
                type="button"
                onClick={guardarMiFirma}
                style={{
                  background: "#0071E3",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 2px 8px rgba(0, 113, 227, 0.25)",
                }}
              >
                Guardar mi firma
              </button>
            ) : (
              <button
                type="button"
                disabled={procesando}
                onClick={() => inputArchivoRef.current?.click()}
                style={{
                  background: "#0071E3",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: procesando ? "wait" : "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 2px 8px rgba(0, 113, 227, 0.25)",
                }}
              >
                {procesando ? "Procesando…" : "Seleccionar PDF o JPEG"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
