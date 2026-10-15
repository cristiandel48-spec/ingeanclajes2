import Icono from "./Icono";

// Barra de filtros y busqueda sobre una lista.
//
// Cada modulo reescribio la suya: hay dos sistemas completos -el de
// ListadoConFiltros y el copiado entre Certificaciones e Informes- mas las
// barras sueltas de Cotizaciones y Agenda. Esta es la unica, y deja el hueco
// `espacio` para empujar a la derecha lo que vaya al final.

export function BuscadorToolbar({ valor, onChange, placeholder = "Buscar...", ...props }) {
  return (
    <div className="ui-toolbar__buscador">
      <span className="ui-toolbar__lupa"><Icono nombre="buscar" size={15} /></span>
      <input
        type="search"
        className="ui-input"
        value={valor}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        {...props}
      />
    </div>
  );
}

export function EspacioToolbar() {
  return <div className="ui-toolbar__espacio" />;
}

export default function Toolbar({ className = "", children, ...props }) {
  return (
    <div className={`ui-toolbar ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
