// Servicio de integración en vivo con la API pública de SECOP II (datos.gov.co)
// Dataset oficial: SECOP II - Procesos de Contratación (p6dx-8zbt)
// Contiene las convocatorias, licitaciones y pliegos de compra pública del Estado en tiempo real.

const SOCRATA_ENDPOINT = "https://www.datos.gov.co/resource/p6dx-8zbt.json";

export async function consultarSecop({
  query = "cubiertas",
  departamento = "Antioquia",
  anio = "2026",
  soloEnLicitacion = true,
  limite = 35,
} = {}) {
  try {
    const url = new URL(SOCRATA_ENDPOINT);
    const qLimpio = String(query || "").trim();

    const whereClauses = [
      // Siempre exigir fecha de publicación válida para garantizar orden cronológico
      "fecha_de_publicacion_del is not null",
    ];

    // 1. Filtro por año (por defecto 2026: licitaciones de este año)
    if (anio && anio !== "Todos") {
      whereClauses.push(
        `fecha_de_publicacion_del >= '${anio}-01-01T00:00:00.000' and fecha_de_publicacion_del <= '${anio}-12-31T23:59:59.999'`
      );
    }

    // 2. Filtro: solo las que están en licitación / abiertas para presentar ofertas (sin adjudicar)
    if (soloEnLicitacion) {
      whereClauses.push("adjudicado = 'No'");
      whereClauses.push("estado_del_procedimiento in ('Publicado', 'Abierto', 'Seleccionado')");
      whereClauses.push(
        "fase in ('Presentación de oferta', 'Fase de ofertas', 'Presentación de observaciones', 'Fase de Selección (Presentación de ofertas)', 'Fase de Concurso', 'Manifestación de interés (Menor Cuantía)')"
      );
    }

    url.searchParams.set("$where", whereClauses.join(" and "));

    // 3. Filtro por departamento
    if (departamento && departamento !== "Todos") {
      url.searchParams.set("departamento_entidad", departamento);
    }

    // 4. Búsqueda de texto
    if (qLimpio) {
      url.searchParams.set("$q", qLimpio);
    }

    // 5. Orden: las más recientes publicadas primero
    url.searchParams.set("$order", "fecha_de_publicacion_del DESC");

    // 6. Límite de resultados
    url.searchParams.set("$limit", String(limite || 35));

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

    const items = raw.map((item, idx) => {
      const valorNum =
        Number(String(item.precio_base || item.valor_total_adjudicacion || "").replace(/[^\d]/g, "")) || 0;
      const urlProc = item.urlproceso?.url || (typeof item.urlproceso === "string" ? item.urlproceso : "");

      return {
        id: item.id_del_proceso || item.referencia_del_proceso || `secop-${idx}`,
        entidad: String(item.entidad || "Entidad del Estado").trim(),
        nit: String(item.nit_entidad || "").trim(),
        departamento: String(item.departamento_entidad || "").trim(),
        ciudad: String(item.ciudad_entidad || "").trim(),
        objeto: String(item.descripci_n_del_procedimiento || item.nombre_del_procedimiento || "Sin descripción").trim(),
        valor: valorNum,
        valorTexto: valorNum > 0 ? `$${valorNum.toLocaleString("es-CO")}` : "Por definir",
        estado: String(item.fase || item.estado_del_procedimiento || item.estado_resumen || "En licitación").trim(),
        fase: item.fase || "Presentación de ofertas",
        estadoProc: item.estado_del_procedimiento || "Publicado",
        adjudicado: item.adjudicado || "No",
        fechaPublicacion: item.fecha_de_publicacion_del || null,
        fechaUltima: item.fecha_de_ultima_publicaci || null,
        urlSecop: urlProc,
        tipoContrato: item.tipo_de_contrato || "Obra / Servicio",
        modalidad: item.modalidad_de_contratacion || "",
      };
    });

    // Ordenamiento estricto por fecha de publicación descendente (más reciente primero)
    items.sort((a, b) => {
      const msA = a.fechaPublicacion ? new Date(a.fechaPublicacion).getTime() : 0;
      const msB = b.fechaPublicacion ? new Date(b.fechaPublicacion).getTime() : 0;
      return msB - msA;
    });

    return items;
  } catch (error) {
    console.error("Error al consultar SECOP II:", error);
    throw error;
  }
}
