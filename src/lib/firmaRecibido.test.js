import { beforeEach, describe, expect, it, vi } from "vitest";

// Lo que se le manda a la funcion «firma-recibido», sin mandar nada de verdad.
const llamadas = [];

// Estas pruebas corren en node, sin navegador, y `invocar` lee el origen de
// la pagina para armar el enlace de firma.
globalThis.window = { location: { origin: "https://ingeanclajes.pages.dev" } };

vi.mock("./backend/supabaseClient", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseClient: () => ({
    functions: {
      invoke: async (_nombre, { body }) => {
        llamadas.push(body);
        if (body.accion === "preparar-subida") {
          return { data: { ok: true, ruta: "T1/abc.pdf", token: "tok" }, error: null };
        }
        return { data: { ok: true, id: "FD-1", enlace: "https://app/?firmar=tok" }, error: null };
      },
    },
    storage: { from: () => ({ uploadToSignedUrl: async () => ({ error: null }) }) },
  }),
}));

vi.mock("./backend/usuarios", () => ({ getTenantIdActual: async () => "T1" }));

const { enviarParaFirma } = await import("./firmaRecibido");

const comun = {
  tipo: "acta", documentoId: "ACT-005", numero: "ACT-005",
  titulo: "Acta de entrega de obra", cliente: "INTECKNO S.A.S",
  para: "profesionalsst@inteckno.com", paraNombre: "Wilson Alzate",
  mensaje: "Le enviamos el acta.", pdfBlob: new Blob(["%PDF-"]), pdfNombre: "acta.pdf",
};

const ultimoEnvio = () => llamadas.filter((l) => l.accion === "enviar").at(-1);

describe("enviar a firma por correo o por WhatsApp", () => {
  beforeEach(() => { llamadas.length = 0; });

  it("por correo NO pide saltarse el aviso", async () => {
    const r = await enviarParaFirma(comun);
    expect(ultimoEnvio().soloEnlace).toBe(false);
    expect(r.enlace).toBe("https://app/?firmar=tok");
  });

  it("por WhatsApp pide saltarse el correo de aviso", async () => {
    await enviarParaFirma({ ...comun, soloEnlace: true });
    expect(ultimoEnvio().soloEnlace).toBe(true);
  });

  it("en los dos casos va el correo, porque ahi llega el codigo para firmar", async () => {
    await enviarParaFirma({ ...comun, soloEnlace: true });
    expect(ultimoEnvio().para).toBe("profesionalsst@inteckno.com");
  });
});
