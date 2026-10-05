import fs from "fs";
import path from "path";
import { buildCotizacionPrintHtml } from "../src/lib/cotizacionPrint.js";

// Leer la foto de la propuesta que el usuario subió
const fotoPath = "C:/Users/User/.gemini/antigravity/brain/e2eac55d-b121-49b2-87a6-e33e7a2c5aa4/.user_uploaded/media_1790873961751.png";
let fotoSrc = "";
if (fs.existsSync(fotoPath)) {
  const buf = fs.readFileSync(fotoPath);
  fotoSrc = `data:image/png;base64,${buf.toString("base64")}`;
}

const cotizacionEjemplo = {
  id: "COT-26122",
  numero: "C-26122",
  fecha: "2026-10-01",
  val: 30,
  cliente: "COMERCIALIZADORA DE PAPAS - MARIA OMAIRA ZULUAGA DE QUINTERO",
  nit: "21872838-9",
  contacto: "Maria Omaira Zuluaga de Quintero",
  telefono: "312 456 7890",
  ciudad: "MEDELLIN",
  obra: "COMERCIALIZADORA DE PAPAS",
  direccion: "CLL 85B #48-74",
  formaPago: "50% ANTICIPO, 50% AL CONCLUIR LABORES Y ENTREGA DE CERTIFICADO",
  tiempoEjec: "10 DÍAS HÁBILES (4 EN FABRICACIÓN, 6 EN MONTAJE)",
  incluyeTexto: "Suministro de materiales estructurales certificados\nMano de obra calificada con cursos de alturas vigentes\nEquipos de protección contra caídas y herramientas certificadas\nEnsayos de tracción y pruebas estáticas/dinámicas en sitio\nPólizas de cumplimiento y responsabilidad civil extracontractual\nInforme de actividades y Certificado legal bajo Resolución 4272 de 2021",
  propuestas: [
    {
      id: "PROP-1",
      nombre: "Estructura Metálica y Plataforma para Aires Acondicionados",
      tipoLabel: "Estructuras Metálicas y Protección en Alturas",
      alcancePropuesta: "Fabricación, suministro e instalación de estructura metálica de soporte y pasarela técnica con plataforma de tránsito seguro para mantenimiento de unidades condensadoras de aire acondicionado en fachada y cubierta, incluyendo barandas perimetrales y puntos de anclaje de seguridad certificados bajo Resolución 4272 de 2021.",
      sinAiu: false,
      util: 10,
      sub: 56000000,
      ut: 5600000,
      iva: 1064000,
      tot: 62664000,
      items: [
        {
          desc: "ESTRUCTURA METÁLICA CON PLATAFORMA PARA AIRES ACONDICIONADOS",
          cant: 7,
          unit: "ML",
          vu: 8000000
        }
      ],
      fotos: [
        {
          id: "foto-1",
          src: fotoSrc,
          label: "Plano Estructural, Isométrico y Fachada Frontal"
        }
      ]
    }
  ]
};

let html = buildCotizacionPrintHtml(cotizacionEjemplo);

// Inyectar estilos de visor de PDF (hojas con sombra sobre fondo gris oscuro) y barra de impresión
const visorCss = `
  <style>
    @media screen {
      html, body {
        background: #334155 !important;
        padding: 60px 0 40px !important;
      }
      .page {
        margin: 0 auto 28px !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45) !important;
        border-radius: 2px !important;
      }
      #visor-toolbar {
        position: fixed;
        top: 0; left: 0; right: 0;
        z-index: 99999;
        background: #0f172a;
        color: #fff;
        padding: 10px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
    }
  </style>
`;

const toolbarHtml = `
  <div id="visor-toolbar">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:15px;font-weight:700;letter-spacing:0.5px;">📄 Vista Previa Completa del PDF Oficial</span>
      <span style="background:#2563eb;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;">Cotización C-26122</span>
      <span style="color:#94a3b8;font-size:12px;">Comercializadora de Papas (4 Páginas)</span>
    </div>
    <div style="display:flex;gap:10px;">
      <button onclick="window.print()" style="background:#f47c20;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:12.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
        🖨 Imprimir / Guardar como PDF
      </button>
    </div>
  </div>
`;

html = html.replace("</head>", `${visorCss}</head>`).replace("<body>", `<body>${toolbarHtml}`);

const outputPath = "C:/Users/User/.gemini/antigravity/brain/e2eac55d-b121-49b2-87a6-e33e7a2c5aa4/cotizacion_completa_en_vivo.html";
fs.writeFileSync(outputPath, html, "utf-8");
console.log("HTML generado exitosamente en:", outputPath);
