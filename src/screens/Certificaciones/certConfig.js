// Elementos y formulario por defecto de certificaciones
import { today } from "../../lib/format";

export const CERT_ELEMENTOS_DEFAULT = [
  "Perno Grado 8 B7 Ø 5/8",
  "Arandela Ø 5/8",
  "Tuerca Ø 5/8",
  "Cable diámetro 5/16\" (8mm) galvanizado",
  "Tensor cable",
  "Soportes laterales e intermedios",
];

export const RECERT_ELEMENTOS_DEFAULT = [
  "Limpieza sistema completo",
  "Verificación ajuste tuercas y pernos",
  "Laca protectora anticorrosiva en todos los puntos",
  "Tensado de cables",
];

export const CERT_ELEMENTOS_BY_SISTEMA = {
  "Líneas de vida horizontales": [
    "Perno Grado 8 B7 Ø 5/8",
    "Arandela Ø 5/8",
    "Tuerca Ø 5/8",
    "Cable diámetro 5/16\" (8mm) galvanizado",
    "Guardacables",
    "Tensor cable",
    "Soportes laterales e intermedios",
  ],
  "Puntos de anclaje": [
    "Perno Grado 8 B7 Ø 5/8",
    "Arandela Ø 5/8",
    "Tuerca Ø 5/8",
    "Punto de anclaje ARTICO acero galvanizado",
    "Epóxico ProAnchor Elite ESP",
  ],
  "Escalera fija": [
    "Peldaños acero galvanizado",
    "Largueros perfil L",
    "Pernos de fijación",
    "Guardacuerpo lateral",
    "Línea de vida vertical integrada",
  ],
  "Línea de vida vertical": [
    "Cable de acero Ø 8mm galvanizado",
    "Absorbedor de caída",
    "Dispositivo deslizante",
    "Anclaje superior e inferior",
    "Tensor y guardacables",
  ],
};

export const getCertDefaultElements = (tipo="Certificación", tipoSistema="", fallback=[])=>{
  if (Array.isArray(fallback) && fallback.length) return [...fallback];
  if (tipo === "Recertificación") return [...RECERT_ELEMENTOS_DEFAULT];
  if (tipoSistema && CERT_ELEMENTOS_BY_SISTEMA[tipoSistema]) return [...CERT_ELEMENTOS_BY_SISTEMA[tipoSistema]];
  return [...CERT_ELEMENTOS_DEFAULT];
};

export const buildCertForm = (overrides={})=>{
  const tipo = overrides.tipo || "Certificación";
  const tipoSistema = overrides.tipoSistema || "";
  return {
    obraId: "OB-001",
    tipo,
    tipoSistema,
    numero: "",
    fecha: today(),
    cliente: "",
    nit: "",
    direccion: "",
    sistema: "",
    normativa: "Resolución 4272 de 2021",
    ingeniero: "ING. JHON JAIME SEPULVEDA LONDOÑO",
    matricula: "MP. 05256-409949",
    proxMant: "",
    elementos: getCertDefaultElements(tipo, tipoSistema, overrides.elementos),
    ...overrides,
  };
};
