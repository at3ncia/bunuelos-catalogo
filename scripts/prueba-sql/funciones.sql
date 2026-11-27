-- Prueba rápida de las funciones nuevas (011–013) con datos de ejemplo. Falla si algo no cuadra.
update config set clave_admin_hash = crypt('Admin123', gen_salt('bf')) where id = 1;
insert into categorias (id, nombre) values ('b', 'Buñuelos') on conflict do nothing;
insert into productos (id, nombre, precio, categoria_id) values ('p1', 'Buñuelo', 3500, 'b') on conflict do nothing;
do $$
declare r json; cod text; idp bigint;
begin
  r := registrar_pedido('{"sede_id":1,"punto_id":"x","cliente":{"Nombre":"Ana"},"items":[{"id":"p1","cantidad":2}]}');
  assert (r->>'ok')::boolean, 'registrar_pedido: ' || r::text;
  assert (r->>'total')::int = 7000, 'total esperado 7000: ' || r::text;
  cod := r->>'codigo';
  select id into idp from pedidos where codigo = cod;

  r := admin_listar_pedidos_rango('Admin123', current_date - 1, current_date + 1);
  assert json_array_length(r->'pedidos') >= 1, 'rango no trae el pedido: ' || r::text;
  r := admin_listar_pedidos_rango('Admin123', current_date + 1, current_date);
  assert not (r->>'ok')::boolean, 'rango al revés debería fallar';

  -- Pendiente de hace 31 días: se borra solo al listar
  insert into pedidos (codigo, sede_id, cliente, items, subtotal, total, creado_en)
    values ('VIE-00001', 1, '{}', '[]', 0, 0, now() - interval '31 days');
  perform admin_listar_pedidos('Admin123', 1);
  assert not exists (select 1 from pedidos where codigo = 'VIE-00001'), 'el pendiente viejo no se borró';

  r := admin_borrar_pedido('Admin123', idp);
  assert not exists (select 1 from pedidos where id = idp), 'admin_borrar_pedido no borró';
  r := admin_borrar_pedido('mala', idp);
  assert not (r->>'ok')::boolean, 'borrar con clave mala debería fallar';

  r := admin_guardar_promo('Admin123', '{"id":"pr1","imagen":"x.png","frecuencia":"una_vez","hora_desde":"12:00","hora_hasta":"18:00"}');
  assert (select frecuencia = 'una_vez' and hora_desde = '12:00' from promos where id = 'pr1'), 'promo sin frecuencia/horario';
  r := admin_guardar_promo('Admin123', '{"id":"pr1","imagen":"x.png","frecuencia":"cualquiera","hora_desde":"mal"}');
  assert (select frecuencia = 'dia' and hora_desde is null from promos where id = 'pr1'), 'promo debería limpiar valores malos';

  insert into sede_productos (sede_id, producto_id, disponible) values (1, 'p1', false), (2, 'p1', false)
    on conflict (sede_id, producto_id) do update set disponible = false;
  r := admin_reiniciar_agotados('Admin123', 1);
  assert (r->>'reiniciados')::int = 1, 'reinicio sede 1: ' || r::text;
  assert (select disponible from sede_productos where sede_id = 1 and producto_id = 'p1'), 'sede 1 sigue agotada';
  assert not (select disponible from sede_productos where sede_id = 2 and producto_id = 'p1'), 'la sede 2 no debía cambiar';
  -- 014: la sede ve por fechas solo sus pedidos
  perform registrar_pedido('{"sede_id":1,"items":[{"id":"p1","cantidad":1}]}');
  perform registrar_pedido('{"sede_id":2,"items":[{"id":"p1","cantidad":1}]}');
  r := sede_listar_pedidos_rango(1, 'Prueba123', current_date - 1, current_date + 1);
  assert (r->>'ok')::boolean, 'sede rango: ' || r::text;
  assert (select bool_and((x->>'sede_id')::int = 1) from json_array_elements(r->'pedidos') x), 'la sede ve pedidos de otra';
  r := sede_listar_pedidos_rango(1, 'mala', current_date - 1, current_date + 1);
  assert not (r->>'ok')::boolean, 'sede con clave mala debería fallar';
  raise notice '✓ Funciones 011–014 OK';
end $$;
