// Servicio de integración en vivo con la API pública de SECOP II (datos.gov.co)
// Dataset oficial 1: SECOP II - Procesos de Contratación (p6dx-8zbt)
// Dataset oficial 2: SECOP II - Archivos Descarga Oficiales (dmgg-8hin)
// Contiene las convocatorias, licitaciones, pliegos, propuestas y documentos de compra pública del Estado en tiempo real.

const SOCRATA_ENDPOINT = "https://www.datos.gov.co/resource/p6dx-8zbt.json";
const ARCHIVOS_ENDPOINT = "https://www.datos.gov.co/resource/dmgg-8hin.json";

export async function consultarSecop({
  query = "cubiertas",
  departamento = "Antioquia",
  anio = "2026",
  instancia = "licitacion", // 'todas' | 'licitacion' | 'borrador' | 'evaluacion' | 'adjudicado'
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

    // 2. Filtro por instancia / fase del proceso
    const inst = instancia || (soloEnLicitacion ? "licitacion" : "todas");

    if (inst === "licitacion") {
      whereClauses.push("adjudicado = 'No'");
      whereClauses.push("estado_del_procedimiento in ('Publicado', 'Abierto', 'Seleccionado')");
      whereClauses.push(
        "fase in ('Presentación de oferta', 'Fase de ofertas', 'Presentación de observaciones', 'Fase de Selección (Presentación de ofertas)', 'Fase de Concurso', 'Manifestación de interés (Menor Cuantía)')"
      );
    } else if (inst === "borrador") {
      whereClauses.push(
        "(fase in ('Presentación de observaciones', 'Borrador') or estado_del_procedimiento in ('Borrador', 'En aprobación'))"
      );
    } else if (inst === "evaluacion") {
      whereClauses.push("adjudicado = 'No'");
      whereClauses.push(
        "(estado_del_procedimiento in ('En evaluación', 'Evaluación', 'Seleccionado') or fase in ('Fase de Evaluación', 'Evaluación de ofertas', 'Informe de evaluación'))"
      );
    } else if (inst === "adjudicado") {
      whereClauses.push(
        "(adjudicado = 'Sí' or estado_del_procedimiento in ('Adjudicado', 'Celebrado', 'Liquidado'))"
      );
    }
    // Si inst === "todas", no se filtra por fase para ver el 100% de las instancias

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
        Number(String(item.precio_base || "").replace(/[^\d]/g, "")) || 0;
      const valorAdjNum =
        Number(String(item.valor_total_adjudicacion || "").replace(/[^\d]/g, "")) || 0;

      const urlProc = item.urlproceso?.url || (typeof item.urlproceso === "string" ? item.urlproceso : "");

      return {
        id: item.id_del_proceso || item.referencia_del_proceso || `secop-${idx}`,
        referencia: item.referencia_del_proceso || item.id_del_proceso || "Sin referencia",
        portafolio: item.id_del_portafolio || "",
        entidad: String(item.entidad || "Entidad del Estado").trim(),
        nit: String(item.nit_entidad || "").trim(),
        departamento: String(item.departamento_entidad || "").trim(),
        ciudad: String(item.ciudad_entidad || "").trim(),
        objeto: String(item.descripci_n_del_procedimiento || item.nombre_del_procedimiento || "Sin descripción").trim(),
        valor: valorNum,
        valorTexto: valorNum > 0 ? `$${valorNum.toLocaleString("es-CO")}` : (valorAdjNum > 0 ? `$${valorAdjNum.toLocaleString("es-CO")}` : "Por definir"),
        valorAdjudicado: valorAdjNum,
        valorAdjudicadoTexto: valorAdjNum > 0 ? `$${valorAdjNum.toLocaleString("es-CO")}` : "",
        estado: String(item.fase || item.estado_del_procedimiento || item.estado_resumen || "En licitación").trim(),
        fase: item.fase || "Presentación de ofertas",
        estadoProc: item.estado_del_procedimiento || "Publicado",
        adjudicado: item.adjudicado || "No",
        proveedorAdjudicado: item.nombre_del_proveedor && item.nombre_del_proveedor !== "No Definido" ? item.nombre_del_proveedor : "",
        nitProveedorAdjudicado: item.nit_del_proveedor_adjudicado && item.nit_del_proveedor_adjudicado !== "No Definido" ? item.nit_del_proveedor_adjudicado : "",
        duracion: item.duracion || "",
        unidadDuracion: item.unidad_de_duracion || "",
        duracionTexto: item.duracion ? `${item.duracion} ${item.unidad_de_duracion || ""}`.trim() : "",
        respuestasOfertas: Number(item.conteo_de_respuestas_a_ofertas) || 0,
        proveedoresManifestaron: Number(item.proveedores_que_manifestaron) || 0,
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

/**
 * Consulta la lista oficial de documentos, pliegos, anexos y propuestas
 * cargadas en el repositorio de SECOP II para un proceso determinado (dataset dmgg-8hin).
 */
export async function consultarDocumentosProceso(portafolioId) {
  if (!portafolioId) return [];
  try {
    const url = new URL(ARCHIVOS_ENDPOINT);
    url.searchParams.set("proceso", portafolioId);
    url.searchParams.set("$order", "fecha_carga DESC");
    url.searchParams.set("$limit", "60");

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) return [];
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];

    return raw.map((item, idx) => {
      const tamanoBytes = Number(item.tamanno_archivo) || 0;
      let tamanoTexto = "";
      if (tamanoBytes > 1024 * 1024) {
        tamanoTexto = `${(tamanoBytes / (1024 * 1024)).toFixed(1)} MB`;
      } else if (tamanoBytes > 1024) {
        tamanoTexto = `${(tamanoBytes / 1024).toFixed(0)} KB`;
      } else if (tamanoBytes > 0) {
        tamanoTexto = `${tamanoBytes} B`;
      }

      const urlDoc =
        item.url_descarga_documento?.url ||
        (typeof item.url_descarga_documento === "string" ? item.url_descarga_documento : "") ||
        `https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=${item.id_documento}&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=`;

      return {
        id: item.id_documento || `doc-${idx}`,
        nombre: item.nombre_archivo || item.descripci_n || "Documento oficial",
        descripcion: item.descripci_n || "",
        extension: (item.extensi_n || "pdf").toLowerCase().replace(".", ""),
        tamanoBytes,
        tamanoTexto,
        fechaCarga: item.fecha_carga || null,
        urlDescarga: urlDoc,
      };
    });
  } catch (err) {
    console.warn("Aviso consultando documentos SECOP II:", err);
    return [];
  }
}
