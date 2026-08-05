# Envío automático de turnos por WhatsApp

Manda los turnos del día a cada trabajador sin tener que abrir un chat por
persona. Se ejecuta **a mano desde el computador**, no forma parte de la app ni
se publica en internet.

## Antes de empezar: dos advertencias

**1. WhatsApp puede bloquear el número.** Automatizar WhatsApp Web va contra las
condiciones de uso de WhatsApp, y su castigo habitual es bloquear la línea. Si
bloquean la principal, se pierde el WhatsApp con el que la empresa habla con
clientes y trabajadores. **Usa una línea aparte**, no la de siempre.

**2. Esto se rompe solo cada cierto tiempo.** WhatsApp Web cambia por dentro sin
avisar. El día que Meta mueva algo, el script deja de encontrar el cuadro de
texto y hay que retocarlo. No es un "se instala y se olvida".

La alternativa sin ninguno de estos dos problemas es la **WhatsApp Cloud API**
de Meta, que es la vía oficial.

## Instalación (una sola vez)

```bash
cd scripts/avisar-whatsapp
npm install
npm run instalar-navegador
```

## Cómo se usa, cada día

1. En la app, **Horarios**, elige la fecha y asigna los turnos.
2. En el panel verde, pulsa **«Descargar avisos para el envío automático»**.
   Baja un archivo `avisos-2026-08-05.json`.
3. Ábrelo si quieres revisar qué le va a llegar a cada quien. Es texto normal.
4. Ejecuta:

```bash
node avisar.mjs ruta/al/avisos-2026-08-05.json
```

5. **La primera vez** se abre WhatsApp Web con el código QR: escanéalo con el
   celular. La sesión queda guardada en `.sesion-whatsapp/` y no vuelve a
   pedirlo.
6. Te pregunta si confirmas antes de mandar nada. Escribe `s` y empieza.

### Ver sin enviar

```bash
node avisar.mjs avisos-2026-08-05.json --prueba
```

Lista a quién se le mandaría y enseña el mensaje del primero. No envía nada.

## Qué esperar

- Tarda entre 6 y 11 segundos por persona. Siete trabajadores son un par de
  minutos. **No cierres la ventana del navegador mientras corre.**
- Va diciendo por consola quién recibió y quién falló.
- Al final lista los que fallaron para avisarles a mano.

## Cuando algo falla

| Dice | Qué pasa |
|---|---|
| `no cargó el chat (¿sesión caída?...)` | Se cerró la sesión. Borra `.sesion-whatsapp/` y vuelve a escanear el QR. |
| `el número no tiene WhatsApp` | Ese celular no está en WhatsApp. Revísalo en Nómina. |
| `se escribió pero no se confirmó el envío` | Puede haber salido igual. Míralo en el celular antes de reenviar. |

## Seguridad

`.sesion-whatsapp/` contiene la sesión iniciada de WhatsApp: **cualquiera que
copie esa carpeta entra al WhatsApp de la empresa**. No la subas a git (ya está
en `.gitignore`) ni la compartas.
