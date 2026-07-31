# Usuarios y permisos

Camila crea las cuentas del equipo desde el propio sistema y marca a qué
módulos entra cada persona. Sin salir a Supabase.

Hay que hacer **tres cosas una sola vez**. Después es todo desde la aplicación.

---

## 1. Aplicar la migración

Supabase → **SQL Editor** → pegar y ejecutar el contenido de:

```
supabase/migrations/20260731_024_usuarios_y_permisos.sql
```

Agrega a `app.memberships` las columnas `nombre`, `email`, `modulos` y
`activo`, y permite ver a los compañeros de empresa (antes cada quien solo
veía su propia fila).

Al final imprime la lista de miembros actuales. Deben aparecer los dos correos
que ya existen.

---

## 2. Publicar la función `gestionar-usuarios`

Crear un usuario exige la **llave de servicio** de Supabase, que jamás puede
estar en el navegador: cualquiera podría verla y tomar control de la base.
Por eso vive en una función que corre en el servidor de Supabase.

Supabase → **Edge Functions** → **Deploy a new function**

- Nombre: `gestionar-usuarios` (exacto, con guion)
- Contenido: todo el archivo `supabase/functions/gestionar-usuarios/index.ts`

No hay que configurar variables: Supabase le entrega las llaves sola.

> **Ojo con el nombre.** El campo del nombre viene relleno con algo como
> `smart-endpoint` y hay que cambiarlo **antes** de desplegar: la dirección de
> la función se fija al crearla y después ya no cambia. Renombrarla en el panel
> solo cambia la etiqueta que se ve en la lista, no la URL.
>
> Para comprobarlo, mira la columna **URL** en la lista de funciones: tiene que
> terminar en `/gestionar-usuarios`. Si terminó en otra cosa, tienes dos
> salidas: borrar la función y volver a crearla con el nombre correcto, o dejar
> la que hay y decirle a la aplicación cómo se llama, añadiendo esta variable de
> entorno (en `.env` y en Vercel):
>
> ```
> VITE_SUPABASE_FUNCION_USUARIOS=el-nombre-que-quedo
> ```

### Comprueba que el código pegado sea el correcto

Es el fallo más fácil de pasar por alto: el editor **deja su ejemplo puesto** y
si se le da Deploy sin borrarlo, la función queda publicada con el código de
muestra de Supabase, no con el nuestro.

El ejemplo empieza así:

```ts
fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
  const { name }: ReqPayload = await req.json();
```

y rechaza a la aplicación con `INVALID_CREDENTIALS` (401), porque solo acepta
llaves del formato nuevo y la aplicación envía el token de sesión.

Para verificarlo: **Edge Functions → la función → pestaña Code**. La primera
línea del archivo tiene que ser el comentario `// Crear y administrar las
cuentas del equipo desde la propia aplicacion.`

La verificación de JWT del portal se deja **encendida**: la aplicación manda el
token de sesión y pasa sin problema.

Si prefieres la terminal y tienes el CLI instalado:

```bash
supabase functions deploy gestionar-usuarios
```

**Mientras no esté publicada**, la pantalla de Usuarios muestra la lista del
equipo pero al crear a alguien avisa que falta publicar la función.

---

## 2b. Conectar el correo de la empresa (opcional)

Sirve para que, al crear un usuario, le lleguen sus datos por correo desde
`sistemasingeanclajes@gmail.com`. Si no se configura, todo lo demás sigue
funcionando: simplemente el sistema avisa que el correo no salió y Camila
entrega los datos a mano.

Gmail no acepta la contraseña normal para esto. Hay que generar una
**contraseña de aplicación**:

1. Entra a `myaccount.google.com` con la cuenta de la empresa
2. **Seguridad** → activa la **verificación en dos pasos** (es requisito)
3. Busca **Contraseñas de aplicaciones** y crea una nueva
4. Google muestra 16 letras. Cópialas — no se vuelven a ver

Después, en Supabase → **Edge Functions → Secrets**, agrega:

| Nombre | Valor |
|---|---|
| `SMTP_USUARIO` | `sistemasingeanclajes@gmail.com` |
| `SMTP_CLAVE` | las 16 letras de la contraseña de aplicación |

Esa contraseña **solo vive en Supabase**, nunca en el navegador ni en el
repositorio. Si algún día se filtra, se revoca desde la cuenta de Google sin
tocar la contraseña real.

Gmail permite unos 500 correos al día, de sobra para dar de alta al equipo.

Si usas otro proveedor de correo, añade también `SMTP_SERVIDOR` y `SMTP_PUERTO`
(por defecto `smtp.gmail.com` y `465`).

---

## 3. Dejar a Camila como Administradora

Solo el rol `admin` puede administrar el equipo. Ejecuta en **SQL Editor**,
cambiando el correo si hace falta:

```sql
update app.memberships m
set role = 'admin',
    nombre = 'Camila Montoya',
    activo = true
from auth.users u
where u.id = m.user_id
  and u.email = 'sistemasingeanclajes@gmail.com';
```

Desde ahí, Camila ya ve **Usuarios y permisos** en el menú y puede crear al
resto sin ayuda.

---

## Cómo se usa (para Camila)

Menú → **Sistema → Usuarios y permisos**

**Crear una persona:** «+ Nuevo usuario». Nombre, correo y una contraseña
provisional de mínimo 8 caracteres. Anótala y entrégasela; ella puede
cambiarla después.

**Dar accesos:** se elige el rol y se marcan los módulos uno por uno.

| Rol | Qué puede |
|---|---|
| **Administrador** | Ve todo y administra el equipo. Es el de Camila. |
| **Coordinador / Operativo / Consulta** | Solo los módulos marcados. |

El **Dashboard va siempre**, para que la persona tenga dónde llegar al entrar.

**Usuarios y permisos no se puede marcar** para nadie más: si se pudiera,
cualquiera con ese módulo se daría a sí mismo el resto.

**El correo de bienvenida:** al crear a alguien hay una casilla para enviarle
sus datos por correo. Va marcada por defecto. Si el envío falla, el sistema lo
dice con todas sus letras y la cuenta queda creada igual, para que nadie se
quede creyendo que la persona ya recibió sus claves.

La contraseña viaja escrita en ese correo y se queda en la bandeja de entrada
de quien lo recibe. El mensaje le insiste en que la cambie al entrar; conviene
recordárselo también de palabra.

**Cómo cambia su contraseña la persona:** entra al sistema, hace clic en su
correo arriba a la derecha y elige **«Cambiar mi contraseña»**. No necesita
pedírselo a nadie. El correo de bienvenida se lo explica.

Si no puede entrar, el **«¿Olvidaste tu contraseña?»** de la pantalla de acceso
le manda un enlace; al abrirlo entra al sistema y usa esa misma opción del menú.

> Ese correo de recuperación lo envía Supabase, no la cuenta de la empresa, y
> en el plan gratuito viene muy limitado (unos pocos por hora). Para que salga
> desde `sistemasingeanclajes@gmail.com` y sin ese tope, hay que poner la misma
> contraseña de aplicación en **Project Settings → Authentication → SMTP
> Settings**. Es la misma que ya está en los secretos.

**Quitar acceso:**

- **Suspender** — deja de entrar de inmediato, se puede reactivar. Es el
  normal para vacaciones o una salida temporal.
- **Quitar** — se va del sistema. La cuenta no se borra, porque podría
  pertenecer a otra empresa.

Nadie puede suspenderse, quitarse ni bajarse de rol a sí mismo. Es a propósito:
evita que la empresa quede sin ningún administrador.

---

## Hasta dónde llega esto

Los módulos **se ocultan del menú** y no se puede entrar por la interfaz.

**No es un blindaje a nivel de base de datos.** Las reglas de Supabase siguen
dando acceso por empresa, no por módulo. Alguien con conocimientos técnicos y
una sesión válida podría consultar las tablas por fuera de la aplicación y ver
nómina o contabilidad.

Para el equipo de una empresa pequeña esto suele bastar. Si más adelante hace
falta blindaje real, la migración ya dejó lista la función
`app.usuario_tiene_modulo(tenant_id, modulo)`; faltaría agregar políticas por
tabla que la consulten.
