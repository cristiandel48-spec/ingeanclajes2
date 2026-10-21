// Kit de componentes del sistema de diseno (fase 2 del plan de revision
// visual, docs/revision-visual.html).
//
// Para usarlos en una pantalla:
//   import { Button, Input, StatusPill } from "../../components/ui";
//
// Reglas de uso:
// - UN solo Button primary por pantalla: la accion principal.
// - El color no se elige, se deduce de para que sirve el control.
// - Los estados van en StatusPill, nunca en un color inventado en la pantalla.
// - Para confirmar o avisar: SheetConfirmacion y useToast, nunca confirm() ni
//   alert() del navegador.
// - Nada de emojis como iconos: el juego esta en Icono.

export { default as Button } from "./Button";
export { default as Input } from "./Input";
export { default as SegmentedControl } from "./SegmentedControl";
export { default as Card } from "./Card";
export { default as ListRow, Lista } from "./ListRow";
export { default as StatusPill } from "./StatusPill";
export { tonoDeEstado } from "./estadoTono";
export { default as EmptyState } from "./EmptyState";
export { default as Callout } from "./Callout";
export { default as Sheet, SheetConfirmacion } from "./Sheet";
export { default as PageHeader } from "./PageHeader";
export { default as Toolbar, BuscadorToolbar, EspacioToolbar } from "./Toolbar";
export { default as BarraFija } from "./BarraFija";
export { CABECERA_FIJA } from "./cabeceraFija";
export { default as Icono } from "./Icono";
export { ToastProvider, useToast } from "./Toast";
