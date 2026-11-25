-- ============================================================================
-- Operación por ciudad: clientes y admin eligen Cartagena o Barranquilla.
-- No borra nada: las sedes Castellana y Bocagrande quedan desactivadas para
-- reactivarlas cuando se quiera manejar por sede (ver al final).
-- Se puede ejecutar más de una vez.
-- ============================================================================

-- Cartagena: usa la fila de Terminal (conserva su contraseña y su disponibilidad)
update sedes
   set nombre = 'Cartagena',
       direccion = 'Terminal · Castellana · Bocagrande',
       whatsapp = '573013416503',
       activa = true
 where nombre in ('Cartagena · Terminal', 'Cartagena');

-- Castellana y Bocagrande: desactivadas (no aparecen ni pueden ingresar)
update sedes
   set activa = false
 where nombre in ('Cartagena · Castellana', 'Cartagena · Bocagrande');

-- Barranquilla: única sede, conserva su contraseña
update sedes
   set nombre = 'Barranquilla',
       direccion = 'Centro, Calle 38 No 38-10',
       activa = true
 where nombre in ('Barranquilla · Centro', 'Barranquilla');

-- Verificación: deben quedar activas solo Cartagena y Barranquilla
select id, nombre, ciudad, whatsapp, activa from sedes order by id;

-- ── Para volver a manejar por sede más adelante ─────────────────────────────
-- update sedes set nombre = 'Cartagena · Terminal', direccion = 'Terminal de transporte'
--   where nombre = 'Cartagena';
-- update sedes set activa = true
--   where nombre in ('Cartagena · Castellana', 'Cartagena · Bocagrande');
-- update sedes set nombre = 'Barranquilla · Centro' where nombre = 'Barranquilla';
