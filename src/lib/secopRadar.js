// Servicio de integración en vivo con la API pública de SECOP II (datos.gov.co)
// Permite buscar licitaciones y contratos de cubiertas, líneas de vida y trabajo en alturas.

const SOCRATA_ENDPOINT = "https://www.datos.gov.co/resource/jbjy-vk9h.json";

export async function consultarSecop({
  query = "lineas de vida",
  departamento = "Antioquia",
  limite = 25,
} = {}) {
  try {
    const url = new URL(SOCRATA_ENDPOINT);
    const qLimpio = String(query || "").trim();

    if (qLimpio) {
      url.searchParams.set("$q", qLimpio);
    }

    if (departamento && departamento !== "Todos") {
      url.searchParams.set("departamento", departamento);
    }

    url.searchParams.set("$limit", String(limite || 25));

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Error de conexión con SECOP II: HTTP ${res.status}`);
    }

    const raw = await res.json();
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.map((item, idx) => {
      const valorNum = Number(String(item.valor_del_contrato || "").replace(/[^\d]/g, "")) || 0;
      const urlProc = item.urlproceso?.url || item.urlproceso || "";

      return {
        id: item.id_contrato || item.proceso_de_compra || `secop-${idx}`,
        entidad: String(item.nombre_entidad || "Entidad del Estado").trim(),
        nit: String(item.nit_entidad || "").trim(),
        departamento: String(item.departamento || "").trim(),
        ciudad: String(item.ciudad || "").trim(),
        objeto: String(item.descripcion_del_proceso || item.objeto_del_contrato || "Sin descripción").trim(),
        valor: valorNum,
        valorTexto: valorNum > 0 ? `$${valorNum.toLocaleString("es-CO")}` : "Por definir",
        estado: String(item.estado_contrato || "Publicado").trim(),
        fecha: item.fecha_de_firma || item.fecha_de_inicio_del_contrato || null,
        urlSecop: urlProc,
        tipoContrato: item.tipo_de_contrato || "Obra / Servicio",
      };
    });
  } catch (error) {
    console.error("Error al consultar SECOP II:", error);
    throw error;
  }
}
