// Dialogos del programa: confirmar() y avisar().
//
// Reemplazan a window.confirm() y window.alert(), que abren la ventana gris
// del navegador: no dicen que programa pregunta, se ven distinto en cada
// navegador y bloquean la pagina. Estos se ven como el resto del sistema (la
// hoja de «¿Cerrar sesión?») y, al aceptar, muestran el logotipo con la barra
// llenandose mientras se guarda, igual que el arranque.
//
//   if (!(await confirmar("¿Eliminar la obra OB-012?"))) return;
//   avisar("El correo no es válido.");
//
// Se puede pasar un texto, como a window.confirm, o un objeto:
//   confirmar({ titulo, mensaje, textoConfirmar, destructivo, textoGuardando })
//
// Con un texto, si trae un parrafo aparte («\n\n»), el primero es el titulo
// y el resto el mensaje. Asi los textos que ya existian se ven bien sin
// tener que reescribirlos.
//
// Los dialogos los pinta <DialogosGlobales />, montado una vez en main.jsx.

let siguienteId = 1;
let cola = [];
const oyentes = new Set();

function emitir() {
  oyentes.forEach((fn) => fn(cola));
}

export function suscribirDialogos(fn) {
  oyentes.add(fn);
  fn(cola);
  return () => oyentes.delete(fn);
}

export function cerrarDialogo(id, valor) {
  const dialogo = cola.find((d) => d.id === id);
  if (!dialogo) return;
  cola = cola.filter((d) => d.id !== id);
  emitir();
  dialogo.resolver(valor);
}

// Pasa el dialogo a «Guardando…» (logotipo y barra) y lo cierra solo. La
// accion ya se esta ejecutando: la promesa se resolvio al pulsar el boton.
export function mostrarGuardando(id, duracionMs = 1100) {
  cola = cola.map((d) => (d.id === id ? { ...d, guardando: true } : d));
  emitir();
  setTimeout(() => {
    cola = cola.filter((d) => d.id !== id);
    emitir();
  }, duracionMs);
}

const VERBOS_DESTRUCTIVOS = /^(eliminar|borrar|quitar|retirar|desactivar|descartar|anular|vaciar|limpiar|desaprobar|cancelar la|archivar)/i;

// «¿Deseas eliminar…?», «¿Seguro que quieres…?», «¿Estás seguro de que
// deseas…?»: la pregunta de verdad es el verbo que viene despues. Se quita
// ese arranque para saber que accion es y que poner en el boton.
const ARRANQUE_CORTESIA = /^¿?\s*(?:est[aá]s?\s+segur[oa]s?\s+(?:de\s+)?(?:que\s+)?|segur[oa]s?\s+(?:de\s+)?(?:que\s+)?|realmente\s+)?(?:(?:deseas?|quieres?|desea|quiere)\s+)?/i;

function accionDe(titulo) {
  return String(titulo || "").replace(ARRANQUE_CORTESIA, "").trim();
}

function separarTexto(texto, tituloPorDefecto) {
  const limpio = String(texto ?? "").trim();
  if (!limpio) return { titulo: tituloPorDefecto, mensaje: "" };
  const corte = limpio.indexOf("\n\n");
  if (corte > 0 && corte <= 160) {
    return { titulo: limpio.slice(0, corte).trim(), mensaje: limpio.slice(corte + 2).trim() };
  }
  if (limpio.length <= 110 && !limpio.includes("\n")) {
    return { titulo: limpio, mensaje: "" };
  }
  return { titulo: tituloPorDefecto, mensaje: limpio };
}

function normalizar(opciones, tituloPorDefecto) {
  if (typeof opciones === "string" || opciones == null) {
    return separarTexto(opciones, tituloPorDefecto);
  }
  return { ...opciones };
}

export function confirmar(opciones) {
  const base = normalizar(opciones, "¿Continuar?");
  const accion = accionDe(base.titulo);
  const destructivo = base.destructivo ?? VERBOS_DESTRUCTIVOS.test(accion);
  // Solo si la pregunta empieza con un verbo en infinitivo («¿Guardar…?»,
  // «¿Unificar…?»); si no, el boton dice «Aceptar».
  const verbo = String(base.titulo || "").trim().startsWith("¿")
    ? accion.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:ar|er|ir))\b/i)?.[1]
    : null;
  const textoConfirmar = base.textoConfirmar
    || (verbo && verbo.length <= 14 ? verbo.charAt(0).toUpperCase() + verbo.slice(1).toLowerCase() : "Aceptar");
  return new Promise((resolver) => {
    cola = [...cola, {
      id: siguienteId++,
      tipo: "confirmar",
      titulo: base.titulo,
      mensaje: base.mensaje,
      textoConfirmar,
      textoCancelar: base.textoCancelar || "Cancelar",
      destructivo,
      // Por defecto, al aceptar se ve el logotipo y la barra. Se puede apagar
      // para preguntas que no guardan nada (por ejemplo «¿Recargar ahora?»).
      conGuardando: base.conGuardando ?? true,
      textoGuardando: base.textoGuardando || "Guardando…",
      // Lo que se devuelve si se cierra sin elegir. Sin definir, cuenta como
      // cancelar (false), que es lo de siempre.
      alCerrar: base.alCerrar,
      resolver,
    }];
    emitir();
  });
}

// Avance de una tarea larga (generar un PDF): el logotipo y la barra, con un
// texto que se puede ir cambiando. No se cierra solo ni con Escape: lo cierra
// quien lo abrio, cuando termina.
//
//   const aviso = mostrarProgreso("Preparando el PDF…");
//   aviso.actualizar("Hoja 2 de 5", 0.4);
//   aviso.cerrar();
export function mostrarProgreso(texto) {
  const id = siguienteId++;
  cola = [...cola, { id, tipo: "progreso", guardando: true, textoGuardando: texto, fraccion: null, resolver() {} }];
  emitir();
  return {
    actualizar(nuevoTexto, fraccion = null) {
      cola = cola.map((d) => (d.id === id ? { ...d, textoGuardando: nuevoTexto, fraccion } : d));
      emitir();
    },
    cerrar() {
      cola = cola.filter((d) => d.id !== id);
      emitir();
    },
  };
}

export function avisar(opciones) {
  const base = normalizar(opciones, "Aviso");
  return new Promise((resolver) => {
    cola = [...cola, {
      id: siguienteId++,
      tipo: "avisar",
      titulo: base.titulo,
      mensaje: base.mensaje,
      textoConfirmar: base.textoConfirmar || "Entendido",
      resolver,
    }];
    emitir();
  });
}
