-- Fotos fuera de la base (hallazgo R2, fase 1).
--
-- POR QUE: las fotos iban como texto dentro de las filas. Informes pesaba
-- 355 MB y obras 170 MB, casi todo fotos: cada copia de seguridad las lleva
-- enteras y abrir un informe las baja de un tiron desde la base.
--
-- Desde esta migracion la aplicacion sube cada foto NUEVA a este bucket y en
-- la fila deja solo una referencia («sb-foto:<empresa>/<huella>.jpg»). Al
-- abrir el registro la descarga y la muestra como siempre. Las fotos viejas
-- se quedan donde estan hasta la fase 2.
--
-- Cada empresa tiene su carpeta (el id de la empresa). Solo la leen y suben
-- sus miembros activos. El nombre del archivo es la huella SHA-256 de la
-- foto: la misma foto no se sube dos veces y un archivo nunca cambia, asi que
-- no hace falta permiso para modificar. Tampoco para borrar: eso queda para
-- una limpieza controlada, no para la aplicacion.
--
-- Es idempotente: se puede volver a ejecutar sin error.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fotos_leer on storage.objects;
create policy fotos_leer on storage.objects
for select to authenticated
using (
  bucket_id = 'fotos'
  and (storage.foldername(name))[1] in (select t::text from app.current_user_tenant_ids() t)
);

drop policy if exists fotos_subir on storage.objects;
create policy fotos_subir on storage.objects
for insert to authenticated
with check (
  bucket_id = 'fotos'
  and (storage.foldername(name))[1] in (select t::text from app.current_user_tenant_ids() t)
);

-- Comprobacion: debe salir el bucket privado y las dos politicas.
-- select id, public, file_size_limit from storage.buckets where id = 'fotos';
-- select policyname, cmd from pg_policies where schemaname = 'storage' and policyname like 'fotos_%';
