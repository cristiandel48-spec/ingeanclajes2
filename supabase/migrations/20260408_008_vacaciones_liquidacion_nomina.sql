alter table if exists app.empleados
add column if not exists vacaciones_pagadas_dias numeric(6,1) not null default 0;

alter table if exists app.empleados
add column if not exists vacaciones_liquidacion_dias numeric(6,1);
