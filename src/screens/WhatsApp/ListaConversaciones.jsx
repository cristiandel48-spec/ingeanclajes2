// Listado de conversaciones de WhatsApp. Usa el componente comun, igual que
// obras, cotizaciones o informes.
//
// La fila es una CONVERSACION, no un mensaje: lo que sirve para atender a
// alguien es su hilo entero, no las lineas sueltas.
import ListadoConFiltros, { Resaltable } from "../../components/ListadoConFiltros";
import { C, boton, enMilis } from "../../components/listadoEstilos";
import { fmtD } from "../../lib/format";
import { telefonoLegible } from "../../lib/whatsappCrm";

const ORDENES = [
  { key: "recientes", label: "Más recientes", comparar: (a, b) => enMilis(b.ultimoEn) - enMilis(a.ultimoEn) },
  { key: "antiguas",  label: "Más antiguas",  comparar: (a, b) => enMilis(a.ultimoEn) - enMilis(b.ultimoEn) },
  { key: "cuantos",   label: "Más mensajes",  comparar: (a, b) => b.cuantos - a.cuantos },
];

// Como se ve cada estado. El que importa es «fallido»: es el unico que pide
// que una persona haga algo.
const COLOR = {
  respondido: { texto: "#166534", fondo: "#ecfdf5", borde: "#a7f3d0" },
  fallido:    { texto: "#b91c1c", fondo: "#fef2f2", borde: "#fecaca" },
  recibido:   { texto: "#b45309", fondo: "#fffbeb", borde: "#fcd34d" },
  procesando: { texto: "#b45309", fondo: "#fffbeb", borde: "#fcd34d" },
  ignorado:   { texto: "#64748b", fondo: "#f8fafc", borde: "#e2e8f0" },
};

const ETIQUETA = {
  respondido: "Respondido",
  fallido: "Sin responder",
  recibido: "En cola",
  procesando: "Procesando",
  ignorado: "No aplica",
};

export default function ListaConversaciones({ conversaciones, acciones }) {
  return (
    <ListadoConFiltros
      datos={conversaciones || []}
      nombre="conversación"
      nombrePlural="conversaciones"
      marcador="Buscar por teléfono, nombre o texto del mensaje…"
      buscarEn={(c) => [c.telefono, c.nombre, ...(c.mensajes || []).map((m) => m.texto)]
        .filter(Boolean).join(" ")}
      estadoDe={(c) => ETIQUETA[c.estado] || c.estado}
      estadosFijos={["Respondido", "Sin responder", "En cola", "No aplica"]}
      fechaDe={(c) => c.ultimoEn}
      ordenes={ORDENES}
      fila={(c, { compacta }) => (
        <Fila key={c.telefono} c={c} compacta={compacta} acciones={acciones} />
      )}
      vacio={{
        titulo: "Todavía no ha escrito nadie",
        texto: "Aquí van a aparecer los mensajes que le lleguen al WhatsApp de la empresa.",
      }}
    />
  );
}

function Fila({ c, compacta, acciones }) {
  const tono = COLOR[c.estado] || COLOR.ignorado;

  const insignia = (
    <span style={{ fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", borderRadius: 20,
      padding: "2px 8px", color: tono.texto, background: tono.fondo,
      border: `1px solid ${tono.borde}` }}>
      {ETIQUETA[c.estado] || c.estado}
    </span>
  );

  const datos = (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.tinta }}>
          {c.nombre || telefonoLegible(c.telefono)}
        </span>
        <span style={{ fontSize: 11, color: C.tenue }}>
          {c.nombre ? `${telefonoLegible(c.telefono)} · ` : ""}
          {c.ultimoEn ? fmtD(c.ultimoEn) : ""}
          {c.cuantos > 1 ? ` · ${c.cuantos} mensajes` : ""}
        </span>
      </div>
      {/* Un mensaje sin texto es una foto, un audio o una ubicacion: WhatsApp
          los entrega aparte y aqui no hay nada que escribir. Decia «—», que
          parecia un fallo; se dice lo que es, para que quien lo vea sepa que
          tiene que abrir la conversacion. */}
      <div style={{ fontSize: 11.5, color: C.apagado, marginTop: 1,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        fontStyle: c.ultimoTexto ? "normal" : "italic" }}>
        {c.ultimoTexto || "Mandó una foto, un audio o una ubicación"}
      </div>
    </>
  );

  const botones = (
    <button style={boton("#dbeafe", "#1e40af")}
      onClick={(e) => { e.stopPropagation(); acciones.abrir(c); }}>Ver conversación</button>
  );

  const barra = (
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
      background: c.sinAtender ? "#ef4444" : "#25D366" }} />
  );

  if (compacta) {
    return (
      <Resaltable as="article" onClick={() => acciones.abrir(c)}
        estiloHover={{ borderColor: C.acentoFuerte, background: "#fffdfb" }}
        style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 10, background: "#fff",
          padding: "9px 12px 9px 14px", display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", position: "relative", overflow: "hidden",
          transition: "border-color .16s ease, background .16s ease" }}>
        {barra}
        <div style={{ minWidth: 0, flex: 1 }}>{datos}</div>
        {insignia}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>{botones}</div>
      </Resaltable>
    );
  }

  return (
    <Resaltable as="article" onClick={() => acciones.abrir(c)}
      estiloHover={{ borderColor: C.acentoFuerte, boxShadow: "0 12px 28px -16px rgba(15,23,42,.30)" }}
      style={{ border: `1px solid ${C.bordeFuerte}`, borderRadius: 12, background: "#fff",
        padding: "12px 13px 10px", display: "flex", flexDirection: "column", gap: 9,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease" }}>
      {barra}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>{datos}</div>
        {insignia}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 8,
        borderTop: `1px solid ${C.borde}` }}>{botones}</div>
    </Resaltable>
  );
}
