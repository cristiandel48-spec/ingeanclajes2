import { useMemo } from "react";
import MenuUsuario from "./MenuUsuario";
import SaveIndicator from "./SaveIndicator";
import { getScreenTitle, getScreenSection, getScreenShort } from "../../config/navigation";
import { TOPBAR_HEIGHT } from "../../styles/shellTheme";
import { useAppData } from "../../context/AppDataContext";
import { puedeVer, pantallaInicial } from "../../lib/permisos";
import { BotonInstalarApp } from "../pwa/InstaladorApp";
import { Button, StatusPill } from "../ui";
import { TIPO, CAPA } from "../../styles/designTokens";

// Barra superior: ubicacion actual, acciones de la pantalla, tema y usuario.
// En movil incluye el boton que abre el menu lateral.
//
// `acciones` lo publica la pantalla que este abierta (ver AccionesPantalla).
// Sirve para que un boton importante -guardar una cotizacion larga- quede
// siempre a la vista junto al indicador de guardado, sin tener que subir.
//
// Todos los controles de aqui son Button del kit en variante tertiary y
// tamano 32: antes convivian alturas de 34, 36, 38 y 40 y radios 8, 10 y 999
// en la misma linea de 64px de alto.

// Pastilla de estado que ademas abre algo. El boton no pinta nada: solo
// aporta el clic y el foco de teclado, que un <span> no tiene.
function PastillaBoton({ tono, onClick, children, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none", border: "none", padding: 0, margin: 0,
        cursor: "pointer", flexShrink: 0, display: "flex", borderRadius: 999,
      }}
      {...props}
    >
      <StatusPill tono={tono}>{children}</StatusPill>
    </button>
  );
}

export default function Topbar({ scr, dark, onToggleTheme, isMobile, onOpenMenu, acciones }) {
  const { membresia, usuariosEnLinea, esSuperAdminCristian, irAPantalla, agenda } = useAppData();
  // En el telefono el nombre largo se recortaba con puntos suspensivos:
  // «Recordatorio de agendas y visi…». El corto ya estaba en navigation.jsx.
  const title = isMobile ? getScreenShort(scr) : getScreenTitle(scr);
  const section = getScreenSection(scr);

  const mananaIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dia}`;
  }, []);

  const totalManana = useMemo(() => {
    if (!Array.isArray(agenda)) return 0;
    return agenda.filter((item) => item.fecha === mananaIso && item.estado !== "completado").length;
  }, [agenda, mananaIso]);

  const destinoMenu = useMemo(() => {
    if (!membresia) return "dashboard";
    return puedeVer(membresia, "dashboard") ? "dashboard" : pantallaInicial(membresia);
  }, [membresia]);

  const esPantallaMenu = scr === "dashboard" || (!puedeVer(membresia, "dashboard") && scr === destinoMenu);

  const totalEnLinea = useMemo(() => {
    if (!usuariosEnLinea || typeof usuariosEnLinea !== "object") return 0;
    const vistos = new Set();
    Object.values(usuariosEnLinea).forEach((u) => {
      if (u?.userId) vistos.add(u.userId);
    });
    return vistos.size;
  }, [usuariosEnLinea]);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: CAPA.barra,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: isMobile ? 8 : 12,
        minHeight: TOPBAR_HEIGHT,
        height: TOPBAR_HEIGHT,
        // El mismo margen lateral que el contenido de abajo: con 28 aqui y 32
        // alli el titulo y la pagina no estaban alineados.
        //
        // Van sueltos y no como `padding`: mezclar la forma corta con
        // paddingTop en el mismo estilo hace que React avise de un conflicto y
        // el valor que gana depende del orden del renderizado.
        paddingLeft: isMobile ? 12 : 32,
        paddingRight: isMobile ? 12 : 32,
        paddingBottom: 0,
        // Deja pasar el notch en iPhone cuando la app va a pantalla completa.
        paddingTop: "env(safe-area-inset-top)",
        background: "var(--surface)",
        borderBottom: "1px solid var(--separator)",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 12, flex: 1, minWidth: 0, overflow: "hidden" }}>
        {isMobile && (
          <Button
            variante="tertiary"
            tam="sm"
            soloIcono
            icono="menu"
            onClick={onOpenMenu}
            aria-label="Abrir menú"
            style={{ color: "var(--text-primary)" }}
          />
        )}

        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          {!isMobile && section && (
            <div style={{ ...TIPO.caption, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
              {section}
            </div>
          )}
          <div style={{
            ...TIPO.headline, color: "var(--text-primary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {title}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, flexShrink: 0, justifyContent: "flex-end" }}>
        {!isMobile && !esPantallaMenu && (
          <Button
            variante="tertiary"
            tam="sm"
            icono="flechaIzq"
            onClick={() => irAPantalla(destinoMenu || "dashboard")}
            title="Volver al menú principal (Dashboard)"
          >
            Volver al menú
          </Button>
        )}

        {acciones && (
          <div
            className="topbar-acciones"
            data-no-wrap="true"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              maxWidth: isMobile ? "38vw" : "none",
              overflowX: isMobile ? "auto" : "visible",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              flexShrink: 1,
            }}
          >
            {acciones}
          </div>
        )}
        <SaveIndicator compact={isMobile} />

        {!isMobile && esSuperAdminCristian && (
          <PastillaBoton
            tono="exito"
            onClick={() => irAPantalla("usuarios")}
            aria-label="Ver usuarios en línea"
            title={`Monitoreo en tiempo real (Exclusivo Cristian Delgado): ${totalEnLinea} usuario(s) conectado(s). Clic para abrir administración.`}
          >
            {totalEnLinea} en línea
          </PastillaBoton>
        )}

        {!isMobile && totalManana > 0 && (
          <PastillaBoton
            tono="aviso"
            onClick={() => window.dispatchEvent(new CustomEvent("abrir-aviso-agenda-manana"))}
            aria-label={`Compromisos de mañana (${totalManana})`}
            title={`Tienes ${totalManana} compromiso(s) para mañana. Clic para ver el itinerario completo.`}
          >
            Mañana ({totalManana})
          </PastillaBoton>
        )}

        {!isMobile && <BotonInstalarApp estilo="topbar" />}

        <Button
          variante="tertiary"
          tam="sm"
          soloIcono
          icono={dark ? "luna" : "sol"}
          onClick={onToggleTheme}
          aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          title={dark ? "Tema oscuro" : "Tema claro"}
          style={{ color: "var(--text-secondary)" }}
        />

        {!isMobile && <div style={{ width: 1, height: 26, background: "var(--separator)" }} />}

        <MenuUsuario compact={isMobile} />
      </div>
    </header>
  );
}
