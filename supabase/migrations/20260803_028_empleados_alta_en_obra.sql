-- Alta de personal desde obra y horarios.
--
-- Quien coordina la obra puede registrar a un trabajador sin entrar a nomina
-- y sin ver ni tocar el salario. El registro llega a nomina marcado como
-- pendiente, para que alli se revise la parte contractual.
--
-- Los empleados que ya existen quedan como 'confirmado': ya pasaron por
-- nomina, no hay nada que revisar en ellos.
alter table if exists app.empleados
  add column if not exists alta_estado text not null default 'confirmado',
  add column if not exists alta_creado_por text,
  add column if not exists alta_creado_en timestamptz,
  -- Distingue a quien nunca tuvo revision salarial de quien gana el minimo
  -- por decision de la empresa.
  add column if not exists salario_origen text not null default 'definido';
