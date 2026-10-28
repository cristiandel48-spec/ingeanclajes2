import { useState } from "react";
import { Button, Callout, Input, Sheet } from "./ui";
import { avisoCelular, avisoCorreo, normalizarCorreo, normalizarMayusculas, normalizarNombrePropio, normalizarTelefono } from "../lib/normalizarEntrada";
import { correoValido } from "../lib/quienRecibe";

// Ventana para poner quien recibe los informes de una obra.
//
// La abre la bitacora antes del primer registro, si la obra no lo tiene, y el
// detalle de la obra para cambiarlo. `motivo` dice por que se pide: en la
// bitacora no se puede seguir sin el, y eso tiene que quedar claro.
//
// `sugerido` es lo que tiene la ficha del cliente en el directorio: si la
// obra no tiene nada, se arranca con eso. Lo que se guarde aqui actualiza
// esa ficha, que es de donde salen los informes y las certificaciones.
export default function ModalQuienRecibe({ obra, sugerido = null, motivo = "", onGuardar, onCerrar }) {
  const [nombre, setNombre] = useState(obra?.recibeNombre || sugerido?.nombre || "");
  const [email, setEmail] = useState(obra?.recibeEmail || sugerido?.email || "");
  const [telefono, setTelefono] = useState(obra?.tel || sugerido?.telefono || "");
  // El cargo va al acta de entrega, debajo del nombre de quien firma el
  // recibido. Se pide aqui, que es donde ya se esta preguntando por esa
  // persona, para no tener que escribirlo otra vez en cada acta.
  const [cargo, setCargo] = useState(obra?.recibeCargo || sugerido?.cargo || "");
  const [tocado, setTocado] = useState(false);
  const correo = normalizarCorreo(email);
  const ok = correoValido(correo) && nombre.trim().length >= 3;

  const guardar = () => {
    setTocado(true);
    if (!ok) return;
    onGuardar({
      nombre: normalizarNombrePropio(nombre),
      email: correo,
      telefono: normalizarTelefono(telefono),
      cargo: normalizarMayusculas(cargo),
    });
  };

  return (
    <Sheet
      titulo="¿Quién recibe los informes de esta obra?"
      subtitulo={[obra?.cliente, obra?.proyecto].filter(Boolean).join(" · ")}
      onCerrar={onCerrar}
      pie={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variante="tertiary" onClick={onCerrar}>Ahora no</Button>
          <Button variante="primary" onClick={guardar}>Guardar</Button>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <Callout tono="info">
          {motivo || "Es la persona del cliente a la que se le envían los informes de actividades para que firme el recibido."}
          {" "}Suele ser el residente o el interventor de la obra. Lo que guardes aquí también actualiza la ficha del cliente.
        </Callout>
        <Input
          label="Nombre de quien recibe"
          obligatorio
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => setNombre((v) => normalizarNombrePropio(v))}
          placeholder="Ej: Ing. María Ruiz"
          error={tocado && nombre.trim().length < 3 ? "Escribe el nombre de quien recibe." : ""}
        />
        <Input
          label="Correo de quien recibe"
          obligatorio
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmail((v) => normalizarCorreo(v))}
          placeholder="residente@constructora.com"
          ayuda="A este correo le llega el enlace para firmar y el código para confirmar que es él."
          error={tocado && !correoValido(correo) ? (avisoCorreo(correo) || "Escribe el correo de quien recibe.") : ""}
        />
        <Input
          label="Cargo"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          onBlur={() => setCargo((v) => normalizarMayusculas(v))}
          placeholder="RESIDENTE DE OBRA"
          ayuda="Sale debajo de su nombre en el acta de entrega, donde firma el recibido."
        />
        <Input
          label="Celular"
          type="tel"
          inputMode="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          onBlur={() => setTelefono((v) => normalizarTelefono(v))}
          placeholder="3001234567"
          ayuda="Para enviarle la firma también por WhatsApp."
          error={tocado && telefono ? avisoCelular(telefono) : ""}
        />
      </div>
    </Sheet>
  );
}
