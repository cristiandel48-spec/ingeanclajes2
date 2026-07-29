-- Comprueba que migraciones estan aplicadas en esta base de datos.
-- Pegalo en Supabase > SQL Editor y ejecuta. No modifica nada.
-- Cada fila dice APLICADA o FALTA.

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
order by migracion;
