-- Configuracion general de la empresa. Nace para guardar la firma escaneada
-- que va en cotizaciones, certificaciones e informes: se sube una vez y
-- queda disponible para todos los documentos.
--
-- La imagen se guarda como data URI en texto, igual que las fotos de las
-- propuestas, para no depender de almacenamiento de archivos aparte.
--
-- Es idempotente: se puede volver a ejecutar sin error.

create table if not exists app.empresa_config (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  firma_img text,
  firma_nombre text,
  firma_cargo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

alter table app.empresa_config enable row level security;

drop policy if exists empresa_config_tenant_all on app.empresa_config;
create policy empresa_config_tenant_all on app.empresa_config
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

drop trigger if exists empresa_config_updated_at on app.empresa_config;
create trigger empresa_config_updated_at before update on app.empresa_config
for each row execute function app.set_updated_at();

comment on column app.empresa_config.firma_img is
  'Firma escaneada en data URI. Se imprime en cotizaciones, certificaciones e informes.';
