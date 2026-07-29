# Migrar el proyecto a sistemasingeanclajes@gmail.com

Hay **cuatro cosas separadas** con la cuenta personal. Se pueden mover de a una
y en este orden, que está pensado para que nunca te quedes sin acceso.

> **Regla de oro:** no quites tu correo personal de ningún servicio hasta que
> hayas entrado con el nuevo y confirmado que funciona.

---

## Decisión previa: ¿mismo proyecto de Supabase o uno nuevo?

| | Invitar al correo nuevo *(recomendado)* | Crear proyecto nuevo |
|---|---|---|
| Datos (obras, cotizaciones, nómina) | Se conservan | Hay que exportarlos e importarlos |
| Usuarios y contraseñas | Se conservan | **No se pueden migrar**: toca recrearlos y todos cambian su contraseña |
| URL y llave del proyecto | No cambian | Cambian: hay que actualizar `.env` y Vercel |
| Tiempo | ~10 minutos | Varias horas, con riesgo de perder datos |

Salvo que tengas una razón fuerte, usa la primera. La sección final cubre la
otra por si acaso.

---

## 1. Supabase — invitar al correo nuevo como dueño

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) con tu correo actual.
2. Arriba a la izquierda, selecciona la **organización** del proyecto.
3. Ve a **Settings → Team → Invite member**.
4. Correo: `sistemasingeanclajes@gmail.com` · Rol: **Owner**.
5. Abre Gmail con el correo nuevo y acepta la invitación.

Listo: los datos no se movieron de sitio, solo hay un dueño más.

---

## 2. Usuario para entrar a la aplicación

Esto es **distinto** al dueño del proyecto: es quien hace login en la app.

**a) Crear el usuario**

Dashboard → **Authentication → Users → Add user**

- Email: `sistemasingeanclajes@gmail.com`
- Password: la que va a usar la empresa
- Marca **Auto Confirm User** (si no, queda esperando un correo de validación)

**b) Darle permisos en la empresa**

Dashboard → **SQL Editor → New query** → pega el contenido de
`supabase/NUEVO_USUARIO.sql` y ejecuta.

Ese paso es el que se olvida siempre. Sin él, el usuario inicia sesión pero la
app responde *"La cuenta no tiene permisos en esta empresa"*: la seguridad por
empresa (RLS) filtra todo según esa fila.

Al final, la consulta te debe mostrar el correo nuevo con rol `admin`.

**c) Probarlo**

1. Abre la aplicación.
2. Arriba a la derecha, menú de usuario → **Cerrar sesión**.
3. Entra con `sistemasingeanclajes@gmail.com`.
4. Confirma que arriba a la derecha aparece ese correo y que ves tus obras y
   cotizaciones.

Si algo falla aquí, **no sigas**: el problema está en el paso (a) o (b).

---

## 3. GitHub

El repositorio es `cristiandel48-spec/ingeanclajes2`.

**Opción A — solo dar acceso** (más simple, nada se rompe)

Repo → **Settings → Collaborators → Add people** → cuenta nueva, permiso **Admin**.

**Opción B — transferir la propiedad**

Repo → **Settings → General** → abajo, **Transfer ownership**.

Ojo: cambia la dirección del repositorio. Después, en tu copia local hay que
apuntar al nuevo dueño:

```bash
git remote set-url origin https://github.com/NUEVO_USUARIO/ingeanclajes2.git
```

Para una entrega a cliente conviene la opción A primero y la transferencia
más adelante, con calma.

---

## 4. Vercel (si la app está publicada)

1. Invita el correo nuevo al proyecto en Vercel.
2. Revisa **Settings → Environment Variables**. Deben estar las tres:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_TENANT_SLUG` = `ingeanclajes`

Esas variables viven en Vercel, no en el repositorio: si faltan, la app
publicada muestra "Falta configurar el servidor".

---

## Orden resumido

1. Invitar el correo nuevo como Owner en Supabase
2. Crear el usuario de la app + ejecutar `NUEVO_USUARIO.sql`
3. **Cerrar sesión y entrar con el correo nuevo** ← punto de control
4. GitHub y Vercel
5. Solo entonces, quitar el correo personal

---

## Anexo: si de verdad necesitas un proyecto nuevo

Solo si el cliente exige que el proyecto nazca en su propia cuenta.

1. Crear el proyecto nuevo con el correo de empresa.
2. Aplicar **todas** las migraciones de `supabase/migrations/` en orden
   (001 a 019), una por una en el SQL Editor.
3. Crear el tenant y el usuario:

```sql
insert into app.tenants (slug, name)
values ('ingeanclajes', 'Ingeanclajes S.A.S.')
on conflict (slug) do nothing;
```

   Luego el usuario en Authentication y `supabase/NUEVO_USUARIO.sql`.

4. Copiar los datos del proyecto viejo al nuevo. En el proyecto **viejo**,
   por cada tabla, exportar a CSV desde el Table Editor (botón *Export*):
   `clientes`, `empleados`, `cargos`, `proveedores`, `obras`, `cotizaciones`,
   `certificaciones`, `informes`, `cuentas_por_pagar`, `pagos`, `horarios`,
   `contabilidad_config`, `plan_cuentas`, `asientos_contables`,
   `nominas_generadas`, `obra_empleados`, `config_retenciones`.

   Al importarlos en el proyecto nuevo hay que **reemplazar la columna
   `tenant_id`** por el id del tenant nuevo:

```sql
select id from app.tenants where slug = 'ingeanclajes';
```

5. Actualizar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env` y en
   Vercel con los del proyecto nuevo (Settings → API).
6. Los usuarios de Authentication **no se pueden exportar con sus
   contraseñas**: hay que crearlos de nuevo y que cada persona defina una.

Respalda antes de empezar y no borres el proyecto viejo hasta que el nuevo
lleve varios días funcionando.
