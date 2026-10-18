import { useCallback, useEffect, useRef, useState } from "react";

// Lleva la pantalla hasta un formulario y deja el cursor en su primer campo.
//
// Varias pantallas abren su formulario arriba de una lista larga. Al darle
// «Editar» a un registro de abajo, el formulario se abria fuera de la vista y
// parecia que el boton no hacia nada: habia que subir a buscarlo.
//
// Uso:
//   const [formRef, subirAlFormulario] = useSubirAlFormulario();
//   <div ref={formRef} style={{ scrollMarginTop: 16 }}>…</div>
//   onClick={() => { abrir(); subirAlFormulario(); }}
//
// Se pide con un contador y no con «esta abierto»: asi tambien sube cuando el
// formulario ya estaba abierto y se elige otro registro, o el mismo otra vez.
// Espera un cuadro para que el formulario ya este pintado antes de medirlo.
export function useSubirAlFormulario() {
  const ref = useRef(null);
  const [pedido, setPedido] = useState(0);

  useEffect(() => {
    if (!pedido) return undefined;
    const id = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.querySelector("input:not([disabled]):not([type='hidden']), textarea:not([disabled]), select:not([disabled])")
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [pedido]);

  const subir = useCallback(() => setPedido((n) => n + 1), []);
  return [ref, subir];
}
