import { fmt, fmtD, today } from "../../lib/format";
import { getQuoteActiveProposal } from "../../lib/cotizaciones";
import { resumenVencimientos, etiquetaVencimiento, UMBRAL_URGENTE } from "../../lib/vencimientos";
import { resumenSeguimiento, etiquetaSeguimiento, UMBRAL_POR_VENCER } from "../../lib/seguimientoCotizaciones";
import { puedeVerDinero } from "../../lib/permisos";
import { TarjetaInstalarAppDashboard } from "../../components/pwa/InstaladorApp";
import { formatFechaLegible, generarUrlGoogleCalendar } from "../../lib/agendaEmail";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import {
  Button, Card, ListRow, Lista, StatusPill, EmptyState,
  PageHeader, Toolbar, Icono,
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

// Cabecera de una tarjeta del tablero: titulo a la izquierda y, si hay, un
// enlace a la derecha. Antes cada bloque la escribia a su manera.
function CabeceraTarjeta({ titulo, descripcion, accion }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: ESPACIO.md, paddingBottom: ESPACIO.md, marginBottom: ESPACIO.md,
        borderBottom: "1px solid var(--separator)",
      }}
    >
      <div style={{ minWidth: 0 }}>
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

// Acceso directo a un modulo.
function TarjetaAcceso({ icono, titulo, subtitulo, onClick }) {
  return (
    <Card interactivo ajustado onClick={onClick} aria-label={titulo}>
      <div style={{ color: "var(--text-tertiary)", marginBottom: ESPACIO.sm }}>
        <Icono nombre={icono} size={20} />
      </div>
      <div style={{
        ...TIPO.footnote, fontWeight: 600, color: "var(--text-primary)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {titulo}
      </div>
      <div style={{
        ...TIPO.caption, fontWeight: 400, color: "var(--text-tertiary)", marginTop: 2,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {subtitulo}
      </div>
    </Card>
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

// Fila compacta dentro de un bloque de alertas.
function FilaAlerta({ titulo, meta, tono, etiqueta }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: ESPACIO.sm,
      background: "var(--surface)", border: "1px solid var(--separator)",
      borderRadius: 8, padding: "7px 10px",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          ...TIPO.footnote, color: "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {titulo}
        </div>
        <div style={{ ...TIPO.caption, fontWeight: 400, color: "var(--text-tertiary)" }}>{meta}</div>
      </div>
      <StatusPill tono={tono}>{etiqueta}</StatusPill>
    </div>
  );
}

export default function Dashboard({ ctx, go }) {
  const { obras = [], cotizaciones = [], certs = [], membresia, agenda = [], clientes = [] } = ctx;
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

  const hoyIso = today();
  const eventosHoy = (Array.isArray(agenda) ? agenda : []).filter(
    (item) => item.fecha === hoyIso && item.estado !== "completado"
  );

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

  const obrasActivas = obras.filter(
    (o) => o.estado !== "Cancelada" && o.estado !== "Finalizado" && o.estado !== "Terminada"
  ).length;

  const resumenDelDia = [
    eventosHoy.length > 0
      ? `Tienes ${eventosHoy.length} compromiso${eventosHoy.length > 1 ? "s" : ""} hoy`
      : "Agenda de hoy al día",
    seg.requierenAccion.length > 0
      ? `${seg.requierenAccion.length} cotización${seg.requierenAccion.length > 1 ? "es" : ""} por llamar`
      : null,
  ].filter(Boolean).join(" y ") + ".";

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
      <PageHeader
        eyebrow={formatFechaLegible(hoyIso) || "Centro de operaciones"}
        titulo={`${saludo}, ${nombreUsuario}`}
        subtitulo={resumenDelDia}
        linea={false}
      />

      {/* La unica accion principal de la pantalla es la primera. */}
      <Toolbar>
        <Button variante="primary" icono="mas" onClick={() => go("cotizacion")}>
          Nueva cotización
        </Button>
        <Button variante="secondary" icono="calendario" onClick={() => go("agenda")}>
          Agendar visita
        </Button>
        <Button variante="secondary" icono="usuario" onClick={() => go("clientes")}>
          Clientes
        </Button>
      </Toolbar>

      <TarjetaInstalarAppDashboard />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.22fr) minmax(0, 1fr)",
          gap: ESPACIO.lg,
          alignItems: "start",
        }}
      >
        {/* ── Accesos y cotizaciones recientes ───────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: ESPACIO.lg, minWidth: 0 }}>
          <div
            className="grid-2-col"
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
              gap: ESPACIO.sm,
            }}
          >
            <TarjetaAcceso
              icono="obra"
              titulo="Obras en curso"
              subtitulo={`${obrasActivas} proyecto${obrasActivas === 1 ? "" : "s"}`}
              onClick={() => go("obras")}
            />
            <TarjetaAcceso
              icono="escudo"
              titulo="Certificaciones"
              subtitulo="Alturas Res. 4272"
              onClick={() => go("certificaciones")}
            />
            <TarjetaAcceso
              icono="documento"
              titulo="Informes"
              subtitulo="Técnicos y as-built"
              onClick={() => go("informes")}
            />
            <TarjetaAcceso
              icono="usuario"
              titulo="Clientes"
              subtitulo={`${clientes.length} registrados`}
              onClick={() => go("clientes")}
            />
          </div>

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
              titulo="Visitas y agenda de hoy"
              accion={
                <Button variante="tertiary" tam="sm" iconoDerecha="flechaDer" onClick={() => go("agenda")}>
                  Abrir agenda
                </Button>
              }
            />

            {eventosHoy.length === 0 ? (
              <EmptyState
                icono="calendario"
                titulo="Sin compromisos para hoy"
                texto="No hay visitas técnicas ni llamadas de seguimiento para esta fecha."
                accion={
                  <Button variante="secondary" icono="mas" onClick={() => go("agenda")}>
                    Programar compromiso
                  </Button>
                }
              />
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
                              Calendario
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
