-- ============================================================================
-- El cliente no ve el precio del domicilio por barrio (para que no elija el
-- barrio más barato). El público solo puede leer el nombre del barrio; el precio
-- lo calcula registrar_pedido y lo ven la sede y el dueño en Pedidos.
-- Ejecutar después de 009. Se puede ejecutar más de una vez.
-- ============================================================================

drop policy if exists "lectura publica barrios" on barrios;

create or replace view barrios_publicos as
  select id, sede_id, nombre from barrios where activo;
grant select on barrios_publicos to anon, authenticated;
