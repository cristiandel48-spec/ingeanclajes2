// Directorio de clientes. Usa el componente comun, igual que las demas
// pantallas de listado.
//
// Lo propio de aqui: las pestañas separan activos de inactivos, y se puede
// filtrar por los clientes que aun no tienen ninguna obra, que son los que
// suelen estar a medio registrar.
//
// AQUI NO VAN CIFRAS: este es el directorio -quien es el cliente y como se le
// ubica-. Lo facturado y lo que debe se consultan en Cuentas por cobrar y en
// el informe financiero, que es donde tienen contexto.
import ListadoConFiltros, { GrupoFiltro, Pastilla, Resaltable } from "../../components/ListadoConFiltros";
import { C, boton } from "../../components/listadoEstilos";
import Badge from "../../components/ui/Badge";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

const ORDENES = [
  { key: "nombre",   label: "Nombre A–Z",   comparar: (a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es") },
  { key: "obras",    label: "Más obras",    comparar: (a, b) => (b.obrasTotal || 0) - (a.obrasTotal || 0) },
  { key: "reciente", label: "Más recientes", comparar: (a, b) => String(b.id || "").localeCompare(String(a.id || ""), "es", { numeric: true }) },
];

export default function ListaClientes({ clientes, acciones }) {
  return (
    <ListadoConFiltros
      datos={clientes || []}
      nombre="ficha"
      nombrePlural="clientes"
      marcador="Buscar por nombre, NIT, contacto, ciudad o correo…"
      buscarEn={(c) => [c.nombre, c.nit, c.contacto, c.telefono, c.ciudad, c.email].filter(Boolean).join(" ")}
      estadoDe={(c) => c.estado || "Activo"}
      estadosFijos={["Activo"]}
      ordenes={ORDENES}
      filtrosExtra={({ valores, poner }) => (
        <GrupoFiltro titulo="Relación con obras">
          <Pastilla activa={valores.obras === "con"}
            onClick={() => poner("obras", valores.obras === "con" ? null : "con")}>Con obras</Pastilla>
          <Pastilla activa={valores.obras === "sin"}
            onClick={() => poner("obras", valores.obras === "sin" ? null : "sin")}>Sin obras todavía</Pastilla>
        </GrupoFiltro>
      )}
      aplicarExtra={(c, v) => {
        if (v.obras === "con") return (c.obrasTotal || 0) > 0;
        if (v.obras === "sin") return (c.obrasTotal || 0) === 0;
        return true;
      }}
      fila={(c, { compacta }) => <Fila key={c.id} c={c} compacta={compacta} acciones={acciones} />}
      vacio={{
        titulo: "No hay clientes registrados todavía",
        texto: "Se van creando solos al hacer cotizaciones y obras, o puedes añadirlos con el botón de arriba.",
      }}
    />
  );
}

function Fila({ c, compacta, acciones }) {
  const alPulsar = (fn) => (e) => { e.stopPropagation(); fn(c); };
  const nombre = normalizarRazonSocial(c.nombre);

  // La segunda linea junta lo que sirve para dar con el cliente: quien es,
  // donde esta y como se le llama.
  const contacto = [c.nit, c.contacto, c.telefono].filter(Boolean).join(" · ");
  const donde = [c.ciudad, c.direccion].filter(Boolean).join(" · ");
  const relacion = [
    c.obrasTotal ? `${c.obrasTotal} obra(s)` : "",
    c.cotizacionesTotal ? `${c.cotizacionesTotal} cotización(es)` : "",
    c.certificacionesTotal ? `${c.certificacionesTotal} certificación(es)` : "",
  ].filter(Boolean).join(" · ");

  const botones = (
    <>
      <button style={boton("#f1f5f9", "#475569")} onClick={alPulsar(acciones.editar)}>Editar</button>
      <button style={boton("#fff7ed", "#b45309")}
        title="Pasar sus obras y documentos a otro cliente y borrar esta ficha"
        onClick={alPulsar(acciones.unificar)}>Unificar</button>
      <button style={boton("#fef2f2", "#b91c1c")} title="Eliminar la ficha"
        onClick={alPulsar(acciones.eliminar)}>Eliminar</button>
    </>
  );

  const datos = (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.tinta }}>{nombre}</span>
        {contacto && <span style={{ fontSize: 11, color: C.tenue }}>{contacto}</span>}
      </div>
      {(donde || c.email) && (
        <div style={{ fontSize: 11.5, color: C.apagado, marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {[donde, c.email].filter(Boolean).join(" · ")}
        </div>
      )}
    </>
  );

  if (compacta) {
    return (
      <Resaltable as="article" onClick={() => acciones.editar(c)}
        estiloHover={{ borderColor: C.acentoFuerte, background: "#fffdfb" }}
        style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 10, background: "#fff",
          padding: "9px 12px 9px 14px", display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", position: "relative", overflow: "hidden",
          transition: "border-color .16s ease, background .16s ease" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: c.obrasTotal ? C.acento : C.tenue }} />
        <div style={{ minWidth: 0, flex: 1 }}>{datos}</div>
        {relacion && <span style={{ fontSize: 11, color: C.tenue, flexShrink: 0 }}>{relacion}</span>}
        <Badge estado={c.estado || "Activo"} />
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>{botones}</div>
      </Resaltable>
    );
  }

  return (
    <Resaltable as="article" onClick={() => acciones.editar(c)}
      estiloHover={{ borderColor: C.acentoFuerte, boxShadow: "0 12px 28px -16px rgba(15,23,42,.30)" }}
      style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 12, background: "#fff",
        padding: "12px 13px 10px", display: "flex", flexDirection: "column", gap: 9,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: c.obrasTotal ? C.acento : C.tenue }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>{datos}</div>
        <Badge estado={c.estado || "Activo"} />
      </div>
      {relacion && <div style={{ fontSize: 11.5, color: C.suave }}>{relacion}</div>}
      {c.notas && (
        <div style={{ fontSize: 11, color: C.tenue, lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {c.notas}
        </div>
      )}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 8,
        borderTop: `1px solid ${C.borde}` }}>{botones}</div>
    </Resaltable>
  );
}
