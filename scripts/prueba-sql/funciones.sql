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
  -- 015: teléfono limpio, autorización, clientes, borrar cliente y métricas
  r := registrar_pedido('{"sede_id":1,"cliente":{"Nombre completo":"Luz","Número de contacto":"+57 300 111 2233"},"items":[{"id":"p1","cantidad":3}],"acepta_promos":true}');
  assert (select telefono = '3001112233' and acepta_promos and origen = 'web' from pedidos where codigo = r->>'codigo'), 'teléfono o autorización mal guardados';
  update pedidos set estado = 'confirmado' where codigo = r->>'codigo';
  r := registrar_pedido('{"sede_id":1,"cliente":{"Nombre completo":"Luz","Celular":"300-111-2233"},"items":[{"id":"p1","cantidad":1}]}');
  update pedidos set estado = 'confirmado' where codigo = r->>'codigo';
  r := admin_clientes('Admin123');
  assert (select (c->>'compras')::int = 2 and (c->>'gastado')::int = 14000 and c->>'nombre' = 'Luz' and c->>'favorito' = 'Buñuelo'
            from json_array_elements(r->'clientes') c where c->>'telefono' = '3001112233'), 'admin_clientes: ' || r::text;
  r := admin_cliente('Admin123', '300 111 2233');
  assert json_array_length(r->'pedidos') = 2, 'admin_cliente debería traer 2 pedidos';
  r := admin_metricas('Admin123', current_date - 6, current_date);
  assert (r->>'ok')::boolean, 'metricas: ' || r::text;
  assert json_array_length(r->'serie') = 7, 'la serie de 7 días debe tener 7 puntos: ' || (r->'serie')::text;
  assert (r->'resumen'->>'ventas')::int >= 14000, 'ventas del periodo';
  r := admin_metricas('Admin123', current_date - 365 * 3, current_date);
  assert r->>'paso' = 'month' and json_array_length(r->'serie') between 36 and 38, 'serie de 3 años por mes: ' || (r->>'paso');
  r := admin_metricas('Admin123', current_date + 10, current_date + 20);
  assert (r->'resumen'->>'ventas')::int = 0 and json_array_length(r->'serie') = 11, 'periodo sin ventas debe venir en ceros';
  r := admin_metricas('Admin123', current_date, current_date - 1);
  assert not (r->>'ok')::boolean, 'fechas al revés deberían fallar';
  r := admin_borrar_cliente('Admin123', '3001112233');
  assert not exists (select 1 from pedidos where telefono = '3001112233'), 'el cliente no se borró';
  assert exists (select 1 from pedidos where estado = 'confirmado' and total = 10500 and cliente = '{}'), 'la venta debía quedar sin datos personales';
  -- 016: API de la IA
  insert into puntos_pedido (id, sede_id, nombre, whatsapp) values ('pt1', 1, 'Terminal', '573000000000') on conflict do nothing;
  insert into productos (id, nombre, precio, categoria_id) values ('p9', 'Avena', 5000, 'b') on conflict do nothing;
  insert into sede_productos (sede_id, producto_id, disponible) values (1, 'p9', false)
    on conflict (sede_id, producto_id) do update set disponible = false, actualizado_en = now();
  insert into barrios (id, sede_id, nombre, precio) select 'car-crespo', 1, 'Crespo', 6000 where not exists (select 1 from barrios where sede_id = 1 and nombre = 'Crespo');
  update barrios set precio = 6000, activo = true where sede_id = 1 and nombre = 'Crespo';
  insert into barrios (id, sede_id, nombre, precio) select 'car-manga', 1, 'Manga', null where not exists (select 1 from barrios where sede_id = 1 and nombre = 'Manga');
  update barrios set precio = null, activo = true where sede_id = 1 and nombre = 'Manga';
  r := ia_menu('mala', 'pt1');
  assert not (r->>'ok')::boolean, 'sin clave no debe responder';
  r := admin_generar_clave_ia('Admin123');
  cod := r->>'clave';
  r := ia_menu(cod, 'pt1');
  assert (r->>'ok')::boolean, 'ia_menu: ' || r::text;
  assert exists (select 1 from json_array_elements(r->'productos') x where x->>'id' = 'p1'), 'p1 debería estar';
  assert not exists (select 1 from json_array_elements(r->'productos') x where x->>'id' = 'p9'), 'p9 está agotado en la sede 1';
  r := ia_domicilio(cod, 'pt1', '  crespó ');
  assert (r->>'precio')::int = 6000, 'domicilio Crespo: ' || r::text;
  r := ia_domicilio(cod, 'pt1', 'Manga');
  assert (r->>'encontrado')::boolean and r->>'precio' is null, 'Manga sin precio: ' || r::text;
  r := ia_domicilio(cod, 'pt1', 'Barrio Inventado');
  assert not (r->>'encontrado')::boolean, 'barrio inexistente';
  r := ia_registrar_pedido(cod, '{"punto_id":"pt1","items":[{"id":"p9","cantidad":1}],"nombre":"Eva","telefono":"3009998877","direccion":"Cra 1","barrio":"Crespo","metodo_pago":"transferencia"}');
  assert not (r->>'ok')::boolean and r->>'error' like '%Avena%', 'no debe vender agotados: ' || r::text;
  r := ia_registrar_pedido(cod, '{"punto_id":"pt1","items":[{"id":"p1","cantidad":2}],"nombre":"Eva","telefono":"300 999 8877","direccion":"Cra 1","barrio":"crespo","metodo_pago":"transferencia","conversacion_url":"https://app.apex/c/1"}');
  assert (r->>'ok')::boolean and (r->>'total')::int = 13000, 'ia_registrar_pedido: ' || r::text;
  assert (select origen = 'ia' and not comprobante and telefono = '3009998877' and metodo_pago = 'transferencia' and domicilio = 6000
            from pedidos where codigo = r->>'codigo'), 'pedido IA mal guardado';
  perform ia_comprobante(cod, lower(r->>'codigo'));
  assert (select comprobante from pedidos where codigo = r->>'codigo'), 'comprobante no marcado';
  assert (ia_estado_pedido(cod, r->>'codigo')->>'estado') = 'pendiente', 'estado del pedido';
  r := ia_registrar_pedido(cod, '{"punto_id":"pt1","items":[{"id":"p1","cantidad":1}],"nombre":"","telefono":"12","direccion":"x","metodo_pago":"efectivo"}');
  assert not (r->>'ok')::boolean, 'faltan datos debería fallar';
  raise notice '✓ Funciones 011–016 OK';
end $$;
