-- Comprueba que migraciones estan aplicadas en esta base de datos.
-- Pegalo en Supabase > SQL Editor y ejecuta. No modifica nada.
-- Cada fila dice APLICADA o FALTA.
--
-- Las que faltan se aplican pegando el archivo correspondiente de
-- supabase/migrations en el mismo SQL Editor: todos son idempotentes.
--
-- Las migraciones que solo cargan datos del catalogo (078, 079) o limpian
-- registros (080) no dejan rastro en el esquema y por eso no estan aqui.

select '011 nominas generadas' as migracion,
       case when to_regclass('app.nominas_generadas') is not null
            then 'APLICADA' else 'FALTA' end as estado
union all
select '012 cxp tributos',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='cuentas_por_pagar'
                           and column_name='valor_total_retenciones')
            then 'APLICADA' else 'FALTA' end
union all
select '013 contabilidad',
       case when to_regclass('app.asientos_contables') is not null
            then 'APLICADA' else 'FALTA' end
union all
select '014 contabilidad automatismos',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='contabilidad_config'
                           and column_name='auto_nomina')
            then 'APLICADA' else 'FALTA' end
union all
select '015 nomina incapacidades',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='empleados'
                           and column_name='incapacidades')
            then 'APLICADA' else 'FALTA' end
union all
select '016 obras iva generado',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='obras'
                           and column_name='iva_generado_cotizacion')
            then 'APLICADA' else 'FALTA' end
union all
select '017 contabilidad utilidad obra',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='contabilidad_config'
                           and column_name='cuenta_utilidad_obra')
            then 'APLICADA' else 'FALTA' end
union all
select '018 nomina prestaciones sociales',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='empleados'
                           and column_name='prestaciones_sociales')
            then 'APLICADA' else 'FALTA' end
union all
select '019 cotizaciones textos documento',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='cotizaciones'
                           and column_name='textos_documento')
            then 'APLICADA' else 'FALTA' end

-- ── Fotos fuera de la fila ─────────────────────────────────────────────────
union all
select '071 fotos en storage (bucket)',
       case when exists (select 1 from storage.buckets where id = 'fotos')
            then 'APLICADA' else 'FALTA' end
union all
select '072 funcion para migrar fotos',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'app' and p.proname = 'migrar_fotos_registro')
            then 'APLICADA' else 'FALTA' end
union all
select '074 avance inicial de la obra',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='obras'
                           and column_name='avance_inicial')
            then 'APLICADA' else 'FALTA' end
union all
select '075 agenda privada',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='agenda'
                           and column_name='usuario_id')
            then 'APLICADA' else 'FALTA' end

-- ── Lo que necesita el acta de entrega ─────────────────────────────────────
union all
select '076 firma de recibido',
       case when to_regclass('app.firmas_documento') is not null
            then 'APLICADA' else 'FALTA' end
union all
select '077 obras: quien recibe',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='obras'
                           and column_name='recibe_nombre')
            then 'APLICADA' else 'FALTA' end
union all
select '081 acta de entrega (obras.actas)',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='obras'
                           and column_name='actas')
            then 'APLICADA' else 'FALTA' end
union all
-- Sin esto el cliente no puede firmar el acta desde el celular: la tabla de
-- firmas rechaza el tipo de documento «acta».
select '081 firmar el acta desde el celular',
       case when exists (
              select 1 from pg_constraint
              where conrelid = to_regclass('app.firmas_documento')
                and conname = 'firmas_documento_tipo_documento_check'
                and pg_get_constraintdef(oid) like '%acta%')
            then 'APLICADA' else 'FALTA' end
union all
select '082 cedula y cargo de quien recibe',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='clientes'
                           and column_name='contacto_cedula')
             and exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='obras'
                           and column_name='recibe_documento')
            then 'APLICADA' else 'FALTA' end
union all
-- Antes de publicar el codigo que la usa: sin estas columnas el guardado de
-- cotizaciones cae a la fila vieja y no sube las propuestas.
select '083 fecha y destinatario del envio de la cotizacion',
       case when exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='cotizaciones'
                           and column_name='enviada_en')
             and exists (select 1 from information_schema.columns
                         where table_schema='app' and table_name='cotizaciones'
                           and column_name='enviada_a')
            then 'APLICADA' else 'FALTA' end

order by migracion;
