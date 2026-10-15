// Cabecera de pantalla.
//
// Hoy no hay criterio: la barra superior ya pone el titulo, y encima cuatro
// modulos lo repiten dentro de la pagina -con otro tamano y a veces con otro
// nombre que el del menu-, mientras Cotizaciones y Certificaciones no tienen
// ninguno. El acuerdo es: la barra superior dice DONDE estas; esta cabecera
// aparece solo cuando la pantalla necesita ademas un subtitulo, un dato de
// contexto o sus propias acciones.

export default function PageHeader({
  eyebrow,
  titulo,
  subtitulo,
  acciones,
  linea = true,
  className = "",
  ...props
}) {
  return (
    <div
      className={`ui-page-header ${linea ? "" : "ui-page-header--sin-linea"} ${className}`.trim()}
      {...props}
    >
      <div style={{ minWidth: 0, flex: "1 1 240px" }}>
        {eyebrow && <div className="ui-page-header__eyebrow">{eyebrow}</div>}
        {titulo && <h1 className="ui-page-header__titulo">{titulo}</h1>}
        {subtitulo && <p className="ui-page-header__sub">{subtitulo}</p>}
      </div>
      {acciones && <div className="ui-page-header__acciones">{acciones}</div>}
    </div>
  );
}
