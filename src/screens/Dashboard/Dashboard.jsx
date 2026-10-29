import { fmt, fmtD, today } from "../../lib/format";
import { getQuoteActiveProposal } from "../../lib/cotizaciones";
import { resumenVencimientos, etiquetaVencimiento, UMBRAL_URGENTE } from "../../lib/vencimientos";
import { resumenSeguimiento, etiquetaSeguimiento, UMBRAL_POR_VENCER } from "../../lib/seguimientoCotizaciones";
import { puedeVerDinero } from "../../lib/permisos";
import { TarjetaInstalarAppDashboard } from "../../components/pwa/InstaladorApp";
import { formatFechaLegible, generarUrlAppleCalendar, generarUrlGoogleCalendar } from "../../lib/agendaEmail";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useEstadosFirmaActas, useEstadosFirmaInformes } from "../../hooks/useEnviosFirma";
import { obrasConActaPendiente } from "../../lib/actaEntrega";
import { obraEstaCerrada } from "../../lib/flujoObra";
import { ICONS, ICON_COLORS } from "../../config/navigation";
import {
  Button, Card, ListRow, Lista, StatusPill, EmptyState,
  PageHeader, Toolbar,
} from "../../components/ui";
import { TIPO, CIFRA, ESPACIO } from "../../styles/designTokens";

// Pantalla de inicio. Era el modulo que menos usaba el sistema: tenia su
// propio acento (el azul #0071e3), sus propias tarjetas, tres formatos de
// estado vacio y emojis por iconos. Ahora es todo kit.

// Que tono de pastilla le toca a un plazo. Es presentacion, no negocio: las
// funciones de color de lib/ siguen igual para los modulos que aun no se han
// migrado.
function tonoPorDias(dias, umbralAviso) {
  if (dias === null || dias === undefined) return "neutro";
  if (dias < 0) return "peligro";
  if (dias <= umbralAviso) return "aviso";
  return "exito";
}

// ── Pendientes propios ───────────────────────────────────────────────────
// Lo que el usuario dejo sin marcar: las tareas de «Mis tareas» y las
// casillas sin tachar de las listas que tenga dentro de sus notas. Las dos
// cosas son privadas -la nube filtra por dueño-, asi que aqui solo salen las
// de quien tiene la sesion abierta.

const MAX_PENDIENTES_VISIBLES = 5;

// Dias cumplidos desde una fecha ISO (yyyy-mm-dd). null si no hay fecha.
function diasDesde(iso) {
  const texto = String(iso || "").slice(0, 10);
  if (texto.length < 10) return null;
  const [anio, mes, dia] = texto.split("-").map(Number);
  if (!anio || !mes || !dia) return null;
  const hoy = new Date();
  const ms = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - new Date(anio, mes - 1, dia);
  return Math.round(ms / 86400000);
}

function etiquetaAntiguedad(dias) {
  if (dias === null) return "Sin fecha";
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return `Hace ${dias} días`;
}

// Una tarea recien anotada no es una alarma; una de hace tres semanas si.
function tonoAntiguedad(dias) {
  if (dias === null || dias <= 7) return "neutro";
  if (dias <= 20) return "aviso";
  return "peligro";
}

function pendientesSinMarcar(tareas, notas) {
  const items = [];

  (Array.isArray(tareas) ? tareas : []).forEach((t) => {
    if (!t || t.completada) return;
    const texto = String(t.texto || "").trim();
    if (!texto) return;
    items.push({
      id: `tarea-${t.id}`,
      texto,
      origen: t.seccion && t.seccion !== "General" ? `Mis tareas · ${t.seccion}` : "Mis tareas",
      dias: diasDesde(t.fecha),
    });
  });

  (Array.isArray(notas) ? notas : []).forEach((nota) => {
    // Solo los bloques de tipo lista llevan casillas; los de viñetas o texto
    // no tienen nada que marcar.
    (nota?.bloques || []).forEach((bloque) => {
      if (bloque?.tipo !== "checklist" || !Array.isArray(bloque.items)) return;
      bloque.items.forEach((item) => {
        if (!item || item.completada) return;
        const texto = String(item.texto || "").trim();
        if (!texto) return;
        items.push({
          id: `nota-${nota.id}-${item.id}`,
          texto,
          origen: [nota.titulo || "Mis notas", bloque.titulo].filter(Boolean).join(" · "),
          dias: diasDesde(item.fecha || nota.fechaActualizacion),
        });
      });
    });
  });

  // Lo mas viejo arriba: es lo que lleva mas tiempo sin hacerse. Lo que no
  // tiene fecha se va al final, porque no se puede decir cuanto lleva ahi.
  return items.sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));
}

// ── Lo que viene en la agenda ──────────────────────────────────────────
const MAX_PROXIMOS = 4;
const DIAS_PROXIMOS = 14;
const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Fecha ISO (yyyy-mm-dd) a Date local, sin el corrimiento de zona horaria.
function fechaLocal(iso) {
  const [a, m, d] = String(iso || "").slice(0, 10).split("-").map(Number);
  return a && m && d ? new Date(a, m - 1, d) : null;
}

// «Mañana, viernes 30», «Lunes 2» o, a mas de una semana, «Lunes 10 de noviembre».
function etiquetaDia(iso, hoyIso) {
  const f = fechaLocal(iso);
  const h = fechaLocal(hoyIso);
  if (!f || !h) return iso;
  const dias = Math.round((f - h) / 86400000);
  const nombre = `${NOMBRES_DIA[f.getDay()]} ${f.getDate()}`;
  if (dias === 1) return `Mañana, ${nombre}`;
  const texto = dias <= 6 ? nombre : `${nombre} de ${NOMBRES_MES[f.getMonth()]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// La rayita de cada compromiso, del color del modulo con el que tiene que ver:
// una visita es obra, una llamada es seguimiento de cotizacion.
function colorDeCompromiso(ev) {
  if (ev?.tipo === "visita") return ICON_COLORS.obras;
  if (ev?.tipo === "llamada") return ICON_COLORS.cotizacion;
  if (ev?.tipo === "reunion") return ICON_COLORS.clientes;
  if (ev?.tipo === "especial") return ICON_COLORS.agenda;
  return "#8E8E93";
}

// Cabecera de una tarjeta del tablero: titulo a la izquierda y, si hay, un
// enlace a la derecha. Antes cada bloque la escribia a su manera.
function CabeceraTarjeta({ titulo, descripcion, accion }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        // En el movil el titulo y la accion no caben lado a lado: sin esto
        // la descripcion se quedaba en una columna de cuatro palabras.
        flexWrap: "wrap",
        gap: ESPACIO.md, paddingBottom: ESPACIO.md, marginBottom: ESPACIO.md,
        borderBottom: "1px solid var(--separator)",
      }}
    >
      {/* El 170 es el suelo que decide si la accion cabe al lado o baja a su
          propia linea; sin el, el titulo se encoge y no baja nunca. */}
      <div style={{ minWidth: 0, flex: "1 1 170px" }}>
        <h2 style={{ ...TIPO.headline, color: "var(--text-primary)", margin: 0 }}>{titulo}</h2>
        {descripcion && (
          <div style={{ ...TIPO.caption, fontWeight: 400, color: "var(--text-tertiary)", marginTop: 2 }}>
            {descripcion}
          </div>
        )}
      </div>
      {accion}
    </div>
  );
}

// Acceso directo a un modulo: su icono de color -el mismo del menu-, cuantos
// hay y, debajo, lo que toca hacer ahi. Antes solo decia el nombre del modulo
// y una frase fija, y la tarjeta no le servia a nadie para decidir nada.
function TarjetaAcceso({ modulo, numero, titulo, aviso, onClick }) {
  return (
    <Card interactivo ajustado onClick={onClick} aria-label={titulo}>
      <IconoModulo modulo={modulo} />
      <div style={{ ...CIFRA, fontSize: 28, lineHeight: "32px", fontWeight: 600, color: "var(--text-primary)", marginTop: ESPACIO.md }}>
        {numero}
      </div>
      <div style={{
        ...TIPO.footnote, fontWeight: 600, color: "var(--text-primary)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {titulo}
      </div>
      {aviso && (
        <StatusPill tono={aviso.tono} style={{ marginTop: ESPACIO.sm, maxWidth: "100%" }}>
          {aviso.texto}
        </StatusPill>
      )}
    </Card>
  );
}

// Cuadro de color del modulo con su icono en blanco, el mismo del menu.
function IconoModulo({ modulo, size = 32, radio = 9 }) {
  const color = ICON_COLORS[modulo] || "#8E8E93";
  return (
    <span
      className="rail-icono"
      style={{
        width: size, height: size, borderRadius: radio, color: "#ffffff", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `linear-gradient(180deg, color-mix(in srgb, ${color} 80%, #ffffff), ${color})`,
        boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.10), 0 1px 1.5px rgba(0,0,0,.14)",
      }}
    >
      {ICONS[modulo]}
    </span>
  );
}

// Atajo del resumen del dia, bajo el saludo: cuantos hay y a donde llevar.
function AtajoResumen({ modulo, numero, texto, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="dash-atajo"
      style={{
        display: "inline-flex", alignItems: "center", gap: ESPACIO.sm,
        padding: "7px 14px 7px 8px", borderRadius: 12, cursor: "pointer",
        background: "var(--surface)", border: "1px solid var(--separator)",
        font: "inherit", color: "var(--text-secondary)", fontSize: 13.5,
      }}
    >
      <IconoModulo modulo={modulo} size={24} radio={7} />
      <span style={{ ...CIFRA, fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{numero}</span>
      {texto}
    </button>
  );
}

// Un bloque de la columna de alertas: etiqueta, cuantas faltan y el detalle.
function BloqueAlerta({ titulo, resumen, children }) {
  return (
    <div style={{
      background: "var(--surface-subtle)", border: "1px solid var(--separator)",
      borderRadius: 12, padding: "12px 14px",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: ESPACIO.sm, marginBottom: ESPACIO.sm,
      }}>
        <div style={{ ...TIPO.eyebrow, color: "var(--text-tertiary)" }}>{titulo}</div>
        {resumen}
      </div>
      {children}
    </div>
  );
}

// Fila compacta dentro de un bloque de alertas. Con `onClick` sale como un
// boton de verdad, no como un div que responde al raton: asi se alcanza con
// el tabulador y se activa con Enter.
function FilaAlerta({ titulo, meta, tono, etiqueta, onClick, multilinea = false }) {
  const Elemento = onClick ? "button" : "div";
  return (
    <Elemento
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: ESPACIO.sm,
        background: "var(--surface)", border: "1px solid var(--separator)",
        borderRadius: 8, padding: "7px 10px",
        ...(onClick ? { width: "100%", textAlign: "left", font: "inherit", cursor: "pointer" } : null),
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{
          ...TIPO.footnote, color: "var(--text-primary)", overflow: "hidden",
          // Un nombre de cliente cabe en una linea; una tarea escrita a mano
          // no, y cortarla deja un recordatorio que no se entiende.
          ...(multilinea
            ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }
            : { textOverflow: "ellipsis", whiteSpace: "nowrap" }),
        }}>
          {titulo}
        </div>
        <div style={{ ...TIPO.caption, fontWeight: 400, color: "var(--text-tertiary)" }}>{meta}</div>
      </div>
      <StatusPill tono={tono} style={{ flexShrink: 0 }}>{etiqueta}</StatusPill>
    </Elemento>
  );
}

export default function Dashboard({ ctx, go }) {
  const {
    obras = [], cotizaciones = [], certs = [], membresia, agenda = [],
    tareasPersonales = [], documentosEquipo = [], informes = [],
  } = ctx;
  // Las firmas de actas e informes, para que las tarjetas de arriba digan que
  // falta firmar. Mientras no responden (`listo`), no se avisa nada: lo que no
  // se sabe no es lo mismo que «sin firmar».
  const { estados: estadosActas, listo: actasListas } = useEstadosFirmaActas();
  const { estados: estadosInformes, listo: informesListos } = useEstadosFirmaInformes();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const verDinero = puedeVerDinero(membresia);
  // `go` solo cambia de pantalla; `irAPantalla` ademas lleva contexto, que es
  // lo que hace falta para abrir UNA cotizacion y no el listado entero.
  const irAPantalla = ctx.irAPantalla || ((pantalla) => go(pantalla));

  const saldoPendiente = obras.reduce((sum, obra) => sum + Number(obra.saldo || 0), 0);
  const recientes = [...cotizaciones]
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))
    .slice(0, 4);

  const venc = resumenVencimientos(certs);
  const seg = resumenSeguimiento(cotizaciones);
  const pendientes = pendientesSinMarcar(tareasPersonales, documentosEquipo);

  const hoyIso = today();
  const eventosHoy = (Array.isArray(agenda) ? agenda : []).filter(
    (item) => item.fecha === hoyIso && item.estado !== "completado"
  );

  // Los siguientes compromisos de las proximas dos semanas, agrupados por dia.
  const limiteProximos = (() => {
    const f = fechaLocal(hoyIso);
    if (!f) return "";
    f.setDate(f.getDate() + DIAS_PROXIMOS);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
  })();
  const proximosPorDia = (Array.isArray(agenda) ? agenda : [])
    .filter((item) => item?.fecha > hoyIso && item.fecha <= limiteProximos && item.estado !== "completado")
    .sort((a, b) => `${a.fecha} ${a.hora || "99"}`.localeCompare(`${b.fecha} ${b.hora || "99"}`))
    .slice(0, MAX_PROXIMOS)
    .reduce((grupos, ev) => {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo?.fecha === ev.fecha) ultimo.eventos.push(ev);
      else grupos.push({ fecha: ev.fecha, eventos: [ev] });
      return grupos;
    }, []);

  const horaActual = new Date().getHours();
  const saludo =
    horaActual < 12 ? "Buenos días" : horaActual < 18 ? "Buenas tardes" : "Buenas noches";
  const authEmail = (ctx?.authUserEmail || ctx?.membresia?.email || "").toLowerCase();
  const primerNombre = (membresia?.nombre || "").trim().split(" ")[0] || "";
  const nombreUsuario =
    primerNombre ||
    (authEmail.includes("cristian")
      ? "Cristian"
      : authEmail.includes("camila")
      ? "Camila"
      : "Equipo");

  const listaObrasActivas = obras.filter(
    (o) => o.estado !== "Cancelada" && o.estado !== "Finalizado" && o.estado !== "Terminada"
  );
  const obrasActivas = listaObrasActivas.length;

  // ── Lo que dice cada tarjeta de arriba ──────────────────────────────────
  // Obras al 90% o mas sin el acta firmada: son las que no se pueden ni
  // certificar ni hacer su informe.
  const sinActa = actasListas
    ? obrasConActaPendiente(obras, estadosActas, { estaCerrada: obraEstaCerrada }).length
    : null;
  const avisoObras = sinActa === null ? null
    : sinActa > 0 ? { tono: "peligro", texto: `${sinActa} sin acta firmada` }
    : { tono: "exito", texto: "Actas al día" };

  const certsVigentes = venc.lista.filter((c) => c.diasRestantes !== null && c.diasRestantes >= 0).length;
  const avisoCerts = venc.vencidas.length > 0
    ? { tono: "peligro", texto: `${venc.vencidas.length} vencida${venc.vencidas.length === 1 ? "" : "s"}` }
    : venc.urgentes.length > 0
    ? { tono: "aviso", texto: `${venc.urgentes.length} vence${venc.urgentes.length === 1 ? "" : "n"} pronto` }
    : { tono: "exito", texto: "Todas al día" };

  // Los informes del mes y, de esos, los que el cliente aun no firma.
  const mesActual = hoyIso.slice(0, 7);
  const informesDelMes = (Array.isArray(informes) ? informes : [])
    .filter((inf) => String(inf?.fechaInforme || inf?.fecha || "").slice(0, 7) === mesActual);
  const informesSinFirmar = informesDelMes.filter((inf) => estadosInformes?.[inf.id] !== "firmado").length;
  const avisoInformes = !informesListos || informesDelMes.length === 0 ? null
    : informesSinFirmar > 0 ? { tono: "aviso", texto: `${informesSinFirmar} sin firmar` }
    : { tono: "exito", texto: "Todos firmados" };

  // El resumen del dia ya no es una frase: son atajos con su numero que llevan
  // a donde se resuelve cada cosa. Solo salen los que tienen algo.
  const atajos = [
    eventosHoy.length > 0 && {
      modulo: "agenda", numero: eventosHoy.length,
      texto: eventosHoy.length === 1 ? "compromiso hoy" : "compromisos hoy",
      onClick: () => go("agenda"),
    },
    seg.requierenAccion.length > 0 && {
      modulo: "cotizacion", numero: seg.requierenAccion.length,
      texto: seg.requierenAccion.length === 1 ? "cotización por llamar" : "cotizaciones por llamar",
      onClick: () => go("cotizacion"),
    },
    pendientes.length > 0 && {
      modulo: "tareas", numero: pendientes.length,
      texto: pendientes.length === 1 ? "tarea sin marcar" : "tareas sin marcar",
      onClick: () => go("tareas"),
    },
  ].filter(Boolean);

  return (
    <div
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
        paddingBottom: ESPACIO.xxl,
      }}
    >
      {/* Arriba, dos columnas con las mismas medidas que las de abajo: el
          saludo a la izquierda y las cuatro tarjetas a la derecha, en el
          espacio que quedaba vacio junto al saludo. En el movil van una
          debajo de la otra. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.22fr) minmax(0, 1fr)",
          gap: ESPACIO.lg,
          // Arriba los dos: alineado abajo, el saludo bajaba y dejaba un hueco
          // encima cuando las tarjetas eran mas altas.
          alignItems: "start",
          marginBottom: ESPACIO.lg,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <PageHeader
            eyebrow={formatFechaLegible(hoyIso) || "Centro de operaciones"}
            titulo={`${saludo}, ${nombreUsuario}`}
            subtitulo={atajos.length ? undefined : "Todo al día: sin compromisos, llamadas ni tareas pendientes."}
            linea={false}
          />

          {atajos.length > 0 && (
            <div style={{ display: "flex", gap: ESPACIO.sm, flexWrap: "wrap", marginBottom: ESPACIO.lg }}>
              {atajos.map((a) => <AtajoResumen key={a.modulo} {...a} />)}
            </div>
          )}

          {/* La unica accion principal de la pantalla es la primera.
              A Clientes se llega desde el menu. */}
          <Toolbar>
            <Button variante="primary" icono="mas" onClick={() => go("cotizacion")}>
              Nueva cotización
            </Button>
            <Button variante="secondary" icono="calendario" onClick={() => go("agenda")}>
              Agendar visita
            </Button>
          </Toolbar>
        </div>

        <div
          style={{
            display: "grid",
            // Siempre las tres en una fila: si bajaba una a otra fila, la
            // columna crecia y dejaba un hueco encima del saludo. minmax y no
            // 1fr a secas para que no se salgan de la columna.
            gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "repeat(3, minmax(0, 1fr))",
            gap: ESPACIO.sm,
            minWidth: 0,
          }}
        >
          <TarjetaAcceso
            modulo="obras"
            numero={obrasActivas}
            titulo="Obras en curso"
            aviso={avisoObras}
            onClick={() => go("obras")}
          />
          <TarjetaAcceso
            modulo="certificaciones"
            numero={certsVigentes}
            titulo="Certificaciones"
            aviso={avisoCerts}
            onClick={() => go("certificaciones")}
          />
          <TarjetaAcceso
            modulo="informes"
            numero={informesDelMes.length}
            titulo="Informes del mes"
            aviso={avisoInformes}
            onClick={() => go("informes")}
          />
        </div>
      </div>

      <TarjetaInstalarAppDashboard />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.22fr) minmax(0, 1fr)",
          gap: ESPACIO.lg,
          alignItems: "start",
        }}
      >
        {/* ── Notas y cotizaciones recientes ──────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: ESPACIO.lg, minWidth: 0 }}>
          {/* El acceso a las notas y las tareas no va de quinta tarjeta en la
              fila de arriba: con cinco pistas los titulos no caben en un
              portatil. Va aqui, donde ademas cabe el recordatorio. */}
          <Card ajustado>
            <CabeceraTarjeta
              titulo="Mis notas y tareas"
              descripcion="Lo que dejaste sin marcar. Solo tú lo ves."
              accion={
                <div style={{ display: "flex", alignItems: "center", gap: ESPACIO.sm }}>
                  {pendientes.length > 0 && (
                    <StatusPill tono="aviso">{pendientes.length} sin marcar</StatusPill>
                  )}
                  <Button variante="tertiary" tam="sm" iconoDerecha="flechaDer" onClick={() => go("tareas")}>
                    Abrir
                  </Button>
                </div>
              }
            />

            {pendientes.length === 0 ? (
              <EmptyState
                icono="check"
                titulo="No tienes nada sin marcar"
                texto="Aquí te recuerdo las tareas y las casillas de tus notas que dejes sin tachar."
                accion={
                  <Button variante="secondary" icono="mas" onClick={() => go("tareas")}>
                    Anotar algo
                  </Button>
                }
              />
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {pendientes.slice(0, MAX_PENDIENTES_VISIBLES).map((p) => (
                    <FilaAlerta
                      key={p.id}
                      onClick={() => go("tareas")}
                      multilinea
                      titulo={p.texto}
                      meta={p.origen}
                      tono={tonoAntiguedad(p.dias)}
                      etiqueta={etiquetaAntiguedad(p.dias)}
                    />
                  ))}
                </div>
                {pendientes.length > MAX_PENDIENTES_VISIBLES && (
                  <div style={{
                    ...TIPO.caption, fontWeight: 400, color: "var(--text-tertiary)",
                    marginTop: ESPACIO.sm, textAlign: "center",
                  }}>
                    Y {pendientes.length - MAX_PENDIENTES_VISIBLES} más sin marcar.
                  </div>
                )}
              </>
            )}
          </Card>

          <Card ajustado>
            <CabeceraTarjeta
              titulo="Cotizaciones recientes"
              descripcion="Últimas propuestas técnicas emitidas"
              accion={
                <Button variante="tertiary" tam="sm" iconoDerecha="flechaDer" onClick={() => go("cotizacion")}>
                  Ver todas
                </Button>
              }
            />

            {recientes.length === 0 ? (
              <EmptyState
                icono="documento"
                titulo="Todavía no hay cotizaciones"
                texto="Cuando emitas la primera propuesta técnica aparecerá aquí."
                accion={
                  <Button variante="secondary" icono="mas" onClick={() => go("cotizacion")}>
                    Crear la primera
                  </Button>
                }
              />
            ) : (
              <Lista>
                {recientes.map((c) => {
                  const activa = getQuoteActiveProposal(c);
                  const aprobada = c.estado === "Aprobada" || Boolean(c.obraId);
                  const estado = aprobada ? "Aprobada" : (c.estado || "Pendiente");

                  return (
                    <ListRow
                      key={c.id}
                      // Antes llevaba al listado completo: «Abrir» abria otra
                      // cosa que la que decia abrir.
                      onClick={() => irAPantalla("cotizacion", { cotizacionId: c.id })}
                      titulo={c.cliente || "Cliente sin nombre"}
                      meta={
                        <>
                          <span style={CIFRA}>{c.numero || c.id}</span>
                          {" · "}{fmtD(c.fecha)}{c.ciudad ? ` · ${c.ciudad}` : ""}
                          <br />
                          {c.obra || activa.nombre || "Propuesta técnica"}
                        </>
                      }
                      derecha={
                        <div style={{
                          display: "flex", flexDirection: "column", alignItems: "flex-end",
                          gap: 4, flexShrink: 0,
                        }}>
                          {verDinero && (
                            <div style={{ ...TIPO.headline, ...CIFRA, color: "var(--text-primary)" }}>
                              {fmt(Number(activa.total || c.total || 0))}
                            </div>
                          )}
                          <StatusPill estado={estado} />
                        </div>
                      }
                    />
                  );
                })}
              </Lista>
            )}
          </Card>
        </div>

        {/* ── Agenda de hoy y alertas ────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: ESPACIO.lg, minWidth: 0 }}>
          <Card ajustado>
            <CabeceraTarjeta
              titulo={
                <span style={{ display: "inline-flex", alignItems: "center", gap: ESPACIO.sm }}>
                  <IconoModulo modulo="agenda" size={26} radio={8} />
                  Agenda
                </span>
              }
              accion={
                <Button variante="tertiary" tam="sm" iconoDerecha="flechaDer" onClick={() => go("agenda")}>
                  Abrir agenda
                </Button>
              }
            />

            {eventosHoy.length === 0 ? (
              // Una linea y no un estado vacio grande: el espacio es para lo
              // que viene, que es lo que sirve cuando hoy no hay nada.
              <div style={{
                ...TIPO.footnote, color: "var(--text-secondary)",
                background: "var(--surface-subtle)", borderRadius: 10, padding: "10px 12px",
              }}>
                Hoy no tienes compromisos.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ESPACIO.sm }}>
                {eventosHoy.map((item) => {
                  const telLimpio = String(item.telefono || "").replace(/\D/g, "");
                  const urlWa = telLimpio
                    ? `https://wa.me/57${telLimpio}?text=${encodeURIComponent(
                        `Hola ${item.contacto || item.cliente || ""}, te saludo de Ingeanclajes respecto al compromiso programado para hoy...`
                      )}`
                    : null;
                  const ubicacion = `${item.direccion || ""} ${item.obra || ""} ${item.ciudad || ""}`.trim();
                  const urlWaze = ubicacion
                    ? `https://waze.com/ul?q=${encodeURIComponent(ubicacion)}&navigate=yes`
                    : null;
                  const urlCal = generarUrlGoogleCalendar(item);
                  const urlApple = generarUrlAppleCalendar(item);

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: 13,
                        borderRadius: 12,
                        background: "var(--surface-subtle)",
                        border: "1px solid var(--separator)",
                      }}
                    >
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", gap: ESPACIO.sm, marginBottom: 4,
                      }}>
                        <StatusPill tono={item.tipo === "visita" ? "acento" : "info"}>
                          {item.hora || "Hora por definir"} · {item.tipo === "visita" ? "Visita a obra" : "Llamada / seguimiento"}
                        </StatusPill>
                        {item.ciudad && (
                          <span style={{ ...TIPO.caption, fontWeight: 400, color: "var(--text-tertiary)" }}>
                            {item.ciudad}
                          </span>
                        )}
                      </div>

                      <div style={{ ...TIPO.headline, color: "var(--text-primary)" }}>
                        {item.obra || item.titulo || "Compromiso de obra"}
                      </div>

                      {item.cliente && (
                        <div style={{ ...TIPO.callout, color: "var(--text-tertiary)", marginTop: 2 }}>
                          {item.cliente}
                          {item.contacto ? ` · ${item.contacto}` : ""}
                        </div>
                      )}

                      {(urlWa || (urlWaze && item.tipo === "visita") || urlCal) && (
                        <div style={{
                          display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
                          marginTop: ESPACIO.md, paddingTop: ESPACIO.sm,
                          borderTop: "1px solid var(--separator)",
                        }}>
                          {urlWa && (
                            <Button
                              variante="secondary" tam="sm"
                              onClick={() => window.open(urlWa, "_blank", "noopener,noreferrer")}
                            >
                              WhatsApp
                            </Button>
                          )}
                          {urlWaze && item.tipo === "visita" && (
                            <Button
                              variante="secondary" tam="sm"
                              onClick={() => window.open(urlWaze, "_blank", "noopener,noreferrer")}
                            >
                              Waze
                            </Button>
                          )}
                          {urlCal && (
                            <Button
                              variante="secondary" tam="sm" icono="calendario"
                              onClick={() => window.open(urlCal, "_blank", "noopener,noreferrer")}
                            >
                              Google Calendar
                            </Button>
                          )}
                          {urlApple && (
                            <Button
                              variante="secondary" tam="sm" icono="calendario"
                              onClick={() => { window.location.href = urlApple; }}
                            >
                              Apple Calendar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lo que viene en los proximos dias, agrupado por dia. */}
            {proximosPorDia.length > 0 ? (
              <div style={{ marginTop: ESPACIO.md }}>
                {proximosPorDia.map(({ fecha, eventos }) => (
                  <div key={fecha} style={{ marginTop: ESPACIO.sm }}>
                    <div style={{ ...TIPO.caption, color: "var(--text-tertiary)", marginBottom: 2 }}>
                      {etiquetaDia(fecha, hoyIso)}
                    </div>
                    {eventos.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => go("agenda")}
                        style={{
                          display: "grid", gridTemplateColumns: "48px 4px minmax(0, 1fr)", gap: 10,
                          width: "100%", padding: "7px 0", background: "none", border: "none",
                          textAlign: "left", font: "inherit", cursor: "pointer", color: "inherit",
                        }}
                      >
                        <span style={{ ...CIFRA, ...TIPO.footnote, color: "var(--text-secondary)", paddingTop: 1 }}>
                          {ev.hora || "—"}
                        </span>
                        <span style={{ borderRadius: 4, background: colorDeCompromiso(ev) }} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{
                            ...TIPO.footnote, fontWeight: 600, color: "var(--text-primary)", display: "block",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {ev.titulo || ev.obra || "Compromiso"}
                          </span>
                          <span style={{
                            ...TIPO.caption, fontWeight: 400, color: "var(--text-tertiary)", display: "block",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {[ev.titulo ? ev.obra : null, ev.cliente].filter(Boolean).join(" · ") || ev.ciudad || ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : eventosHoy.length === 0 && (
              <div style={{ marginTop: ESPACIO.md }}>
                <Button variante="secondary" tam="sm" icono="mas" onClick={() => go("agenda")}>
                  Programar compromiso
                </Button>
              </div>
            )}
          </Card>

          <Card ajustado>
            <CabeceraTarjeta titulo="Alertas operativas" descripcion="Lo que necesita atención" />

            <div style={{ display: "flex", flexDirection: "column", gap: ESPACIO.md }}>
              {verDinero && (
                <BloqueAlerta
                  titulo="Cobro pendiente en obras"
                  resumen={
                    Number(saldoPendiente) > 0 && (
                      <Button variante="tertiary" tam="sm" iconoDerecha="flechaDer" onClick={() => go("obras")}>
                        Ver obras
                      </Button>
                    )
                  }
                >
                  <div style={{
                    ...TIPO.title2, ...CIFRA,
                    color: Number(saldoPendiente) > 0 ? "var(--danger-text)" : "var(--success-text)",
                  }}>
                    {fmt(Number(saldoPendiente || 0))}
                  </div>
                </BloqueAlerta>
              )}

              <BloqueAlerta
                titulo="Vencimiento de certificaciones"
                resumen={
                  venc.hayAlgoQueHacer && (
                    <StatusPill tono="aviso">{venc.requierenAccion.length} por atender</StatusPill>
                  )
                }
              >
                {venc.hayAlgoQueHacer ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: ESPACIO.sm }}>
                      {venc.destacadas.slice(0, 3).map((cert) => (
                        <FilaAlerta
                          key={cert.id}
                          titulo={cert.cliente || cert.obra || cert.id}
                          meta={`${cert.tipoSistema || cert.tipo || "Certificación"}${cert.proxMant ? ` · ${fmtD(cert.proxMant)}` : ""}`}
                          tono={tonoPorDias(cert.diasRestantes, UMBRAL_URGENTE)}
                          etiqueta={etiquetaVencimiento(cert.diasRestantes)}
                        />
                      ))}
                    </div>
                    <Button variante="secondary" bloque tam="sm" onClick={() => go("vencimientos")}>
                      Generar recertificación
                    </Button>
                  </>
                ) : (
                  <div style={{ ...TIPO.callout, color: "var(--text-tertiary)" }}>
                    Todas las certificaciones de altura están al día.
                  </div>
                )}
              </BloqueAlerta>

              <BloqueAlerta
                titulo="Cotizaciones sin respuesta"
                resumen={
                  seg.hayAlgoQueHacer && (
                    <StatusPill tono="aviso">{seg.requierenAccion.length} por llamar</StatusPill>
                  )
                }
              >
                {seg.hayAlgoQueHacer ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: ESPACIO.sm }}>
                      {seg.destacadas.slice(0, 3).map((cot) => (
                        <FilaAlerta
                          key={cot.id}
                          titulo={cot.cliente || cot.numero || cot.id}
                          meta={[cot.numero, cot.obra].filter(Boolean).join(" · ")}
                          tono={tonoPorDias(cot.diasParaVencer, UMBRAL_POR_VENCER)}
                          etiqueta={etiquetaSeguimiento(cot.diasParaVencer)}
                        />
                      ))}
                    </div>
                    <Button variante="secondary" bloque tam="sm" onClick={() => go("cotizacion")}>
                      Ver cotizaciones
                    </Button>
                  </>
                ) : (
                  <div style={{ ...TIPO.callout, color: "var(--text-tertiary)" }}>
                    No hay propuestas técnicas pendientes de respuesta comercial.
                  </div>
                )}
              </BloqueAlerta>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
