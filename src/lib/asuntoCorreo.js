// Asunto seguro para un correo.
//
// Un asunto con tildes o símbolos hay que codificarlo, y si además es largo el
// servidor lo parte en varias líneas. Esa combinación rompió un envío real: el
// corte cayó dentro del texto codificado, el cliente de correo dejó de
// reconocer las cabeceras y mostró el From, el To y hasta la estructura interna
// del mensaje como si fueran el cuerpo.
//
// Va aparte de texto.js porque aquí importa el detalle de los rangos de
// caracteres, y conviene tenerlo a la vista.

const DIACRITICOS = /[̀-ͯ]/g;      // tildes ya separadas por NFD
const SEPARADORES = /[·•–—]/g;  // · • – —
const NO_ASCII = /[^\x20-\x7e]/g;

export function asuntoSeguro(valor, maximo = 72) {
  const plano = String(valor ?? "")
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .replace(SEPARADORES, "-")
    .replace(NO_ASCII, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plano.length <= maximo) return plano;

  // Se corta en un espacio para no partir una palabra por la mitad.
  const corte = plano.slice(0, maximo);
  const espacio = corte.lastIndexOf(" ");
  return (espacio > maximo * 0.6 ? corte.slice(0, espacio) : corte).trim();
}
