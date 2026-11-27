-- ============================================================================
-- API para la IA de WhatsApp (APEX): consulta el menú real de su punto, el
-- domicilio de un barrio y registra pedidos que salen en /admin y /sede con 🤖 IA.
-- Toda llamada lleva la "clave de la IA" (se genera en /admin → Claves y se pega
-- una sola vez en APEX). Ejecutar después de 015. Se puede ejecutar más de una vez.
--
-- Llamadas (POST https://<proyecto>.supabase.co/rest/v1/rpc/<función>, con la clave pública):
--   ia_menu            { p_clave, p_punto }                      → productos disponibles HOY en ese punto
--   ia_domicilio       { p_clave, p_punto, p_barrio }            → precio del domicilio (o "por confirmar")
--   ia_registrar_pedido{ p_clave, p }                            → código, subtotal, domicilio y total reales
--   ia_comprobante     { p_clave, p_codigo }                     → marca que llegó el pantallazo
--   ia_estado_pedido   { p_clave, p_codigo }                     → pendiente / confirmado / cancelado
-- ============================================================================

alter table config add column if not exists clave_ia_hash text;

-- La clave es larga y aleatoria: basta un hash rápido (sha256) para verificarla
create or replace function ia_verificar(p_clave text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select clave_ia_hash = encode(digest(coalesce(p_clave, ''), 'sha256'), 'hex') from config where id = 1), false);
$$;
revoke all on function ia_verificar(text) from public, anon, authenticated;

-- El dueño genera (o cambia) la clave de la IA. Se muestra una sola vez.
create or replace function admin_generar_clave_ia(p_clave text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json; nueva text;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  nueva := 'ia_' || encode(gen_random_bytes(24), 'hex');
  update config set clave_ia_hash = encode(digest(nueva, 'sha256'), 'hex') where id = 1;
  return json_build_object('ok', true, 'clave', nueva);
end $$;

create or replace function admin_estado_clave_ia(p_clave text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  return json_build_object('ok', true, 'configurada', (select clave_ia_hash is not null from config where id = 1));
end $$;

-- Texto comparable: sin tildes, minúsculas y sin espacios de más ("Pié  de la Popa" = "pie de la popa")
create or replace function texto_plano(t text)
returns text language sql immutable as $$
  select regexp_replace(lower(translate(coalesce(t, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')), '\s+', ' ', 'g');
$$;

-- Productos disponibles HOY en una sede: activos, no agotados en esa sede y del día (promos por día)
create or replace function productos_disponibles(p_sede int)
returns table (id text, nombre text, descripcion text, precio int, categoria text)
language sql stable security definer set search_path = public, extensions as $$
  select pr.id, pr.nombre, pr.descripcion, pr.precio, c.nombre
    from productos pr
    left join categorias c on c.id = pr.categoria_id
    left join sede_disponibilidad d on d.sede_id = p_sede and d.producto_id = pr.id
   where pr.disponible
     and coalesce(d.disponible, true)
     and (pr.dias is null or extract(dow from now() at time zone 'America/Bogota')::int = any(pr.dias))
   order by c.orden nulls last, pr.orden, pr.nombre;
$$;
revoke all on function productos_disponibles(int) from public, anon, authenticated;

create or replace function ia_menu(p_clave text, p_punto text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_sede int; v_punto record;
begin
  if not ia_verificar(p_clave) then return json_build_object('ok', false, 'error', 'Clave de la IA incorrecta'); end if;
  select * into v_punto from puntos_pedido where id = p_punto;
  if v_punto.id is null then return json_build_object('ok', false, 'error', 'Punto no encontrado: ' || coalesce(p_punto, '')); end if;
  v_sede := v_punto.sede_id;
  return json_build_object(
    'ok', true,
    'punto', v_punto.nombre,
    'ciudad', (select ciudad from sedes where id = v_sede),
    'nota', 'Solo se pueden vender estos productos (los que no aparecen están agotados hoy). Precios en pesos colombianos.',
    'productos', coalesce((select json_agg(json_build_object('id', id, 'nombre', nombre, 'descripcion', descripcion,
                                                             'precio', precio, 'categoria', categoria))
                             from productos_disponibles(v_sede)), '[]'::json)
  );
end $$;

create or replace function ia_domicilio(p_clave text, p_punto text, p_barrio text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_sede int; q text; m record;
begin
  if not ia_verificar(p_clave) then return json_build_object('ok', false, 'error', 'Clave de la IA incorrecta'); end if;
  select sede_id into v_sede from puntos_pedido where id = p_punto;
  if v_sede is null then return json_build_object('ok', false, 'error', 'Punto no encontrado'); end if;
  q := texto_plano(p_barrio);
  if length(q) < 3 then return json_build_object('ok', false, 'error', 'Escribe el nombre del barrio'); end if;
  -- Exacto primero; si no, el que contiene lo escrito (o al revés)
  select b.nombre, b.precio into m from barrios b
   where b.sede_id = v_sede and b.activo
     and (texto_plano(b.nombre) = q or texto_plano(b.nombre) like '%' || q || '%' or q like '%' || texto_plano(b.nombre) || '%')
   order by (texto_plano(b.nombre) = q) desc, abs(length(b.nombre) - length(q))
   limit 1;
  if m.nombre is null then
    return json_build_object('ok', true, 'encontrado', false,
      'instruccion', 'Ese barrio no está en la lista: pasa el chat a una persona para confirmar si llegamos y cuánto cuesta.');
  end if;
  if m.precio is null then
    return json_build_object('ok', true, 'encontrado', true, 'barrio', m.nombre, 'precio', null,
      'instruccion', 'Llegamos a ese barrio pero el valor del domicilio se confirma: dile que se lo confirmamos enseguida.');
  end if;
  return json_build_object('ok', true, 'encontrado', true, 'barrio', m.nombre, 'precio', m.precio);
end $$;

-- p: { punto_id, items:[{id,cantidad}], nombre, telefono, direccion, barrio, metodo_pago
--      ('efectivo'|'transferencia'|'link'), comprobante (true/false), notas, conversacion_url }
create or replace function ia_registrar_pedido(p_clave text, p jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_sede int; v_agotados text; v_barrio_id text; v_metodo text; r json; v_cliente jsonb;
begin
  if not ia_verificar(p_clave) then return json_build_object('ok', false, 'error', 'Clave de la IA incorrecta'); end if;
  select sede_id into v_sede from puntos_pedido where id = p->>'punto_id';
  if v_sede is null then return json_build_object('ok', false, 'error', 'Punto no encontrado'); end if;
  if coalesce(trim(p->>'nombre'), '') = '' or normalizar_telefono(p->>'telefono') is null
     or coalesce(trim(p->>'direccion'), '') = '' then
    return json_build_object('ok', false, 'error', 'Faltan datos: nombre completo, teléfono de 10 dígitos y dirección');
  end if;
  v_metodo := lower(coalesce(p->>'metodo_pago', ''));
  if v_metodo not in ('efectivo', 'transferencia', 'link') then
    return json_build_object('ok', false, 'error', 'metodo_pago debe ser efectivo, transferencia o link');
  end if;
  -- No se vende lo que está agotado en ese punto
  select string_agg(coalesce(pr.nombre, i->>'id'), ', ') into v_agotados
    from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) i
    left join productos pr on pr.id = i->>'id'
   where not exists (select 1 from productos_disponibles(v_sede) d where d.id = i->>'id');
  if v_agotados is not null then
    return json_build_object('ok', false, 'error', 'No disponibles hoy: ' || v_agotados || '. Ofrece otra opción del menú.');
  end if;

  select b.id into v_barrio_id from barrios b
   where b.sede_id = v_sede and b.activo and texto_plano(b.nombre) = texto_plano(p->>'barrio') limit 1;

  v_cliente := jsonb_strip_nulls(jsonb_build_object(
    'Nombre completo', left(p->>'nombre', 120),
    'Dirección + punto de referencia', left(p->>'direccion', 240),
    'Número de contacto', left(p->>'telefono', 30),
    'Medio de pago', initcap(v_metodo),
    'Notas', nullif(left(p->>'notas', 240), '')));

  r := registrar_pedido(jsonb_build_object(
    'sede_id', v_sede, 'punto_id', p->>'punto_id', 'cliente', v_cliente, 'items', p->'items',
    'barrio_id', v_barrio_id, 'barrio_texto', p->>'barrio', 'telefono', p->>'telefono', 'metodo_pago', v_metodo));
  if not (r->>'ok')::boolean then return r; end if;

  update pedidos set origen = 'ia',
                     comprobante = coalesce((p->>'comprobante')::boolean, false),
                     conversacion_url = nullif(left(p->>'conversacion_url', 400), '')
   where codigo = r->>'codigo';

  return json_build_object('ok', true, 'codigo', r->>'codigo', 'subtotal', (r->>'subtotal')::int,
    'domicilio', r->'domicilio', 'total', (r->>'total')::int,
    'instruccion', case
      when r->>'domicilio' is null then 'El valor del domicilio se confirma: dile al cliente el subtotal y que el domicilio se lo confirmamos.'
      else 'Confírmale al cliente el total (incluye domicilio) y el código del pedido.' end);
end $$;

create or replace function ia_comprobante(p_clave text, p_codigo text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  if not ia_verificar(p_clave) then return json_build_object('ok', false, 'error', 'Clave de la IA incorrecta'); end if;
  update pedidos set comprobante = true, actualizado_en = now()
   where codigo = upper(trim(p_codigo)) and origen = 'ia';
  get diagnostics n = row_count;
  return json_build_object('ok', n > 0, 'error', case when n = 0 then 'Pedido no encontrado' end);
end $$;

create or replace function ia_estado_pedido(p_clave text, p_codigo text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare x record;
begin
  if not ia_verificar(p_clave) then return json_build_object('ok', false, 'error', 'Clave de la IA incorrecta'); end if;
  select codigo, estado, total, comprobante, metodo_pago into x from pedidos where codigo = upper(trim(p_codigo));
  if x.codigo is null then return json_build_object('ok', false, 'error', 'Pedido no encontrado'); end if;
  return json_build_object('ok', true, 'codigo', x.codigo, 'estado', x.estado, 'total', x.total,
    'comprobante', x.comprobante, 'metodo_pago', x.metodo_pago);
end $$;

grant execute on function admin_generar_clave_ia(text) to anon, authenticated;
grant execute on function admin_estado_clave_ia(text) to anon, authenticated;
grant execute on function ia_menu(text, text) to anon, authenticated;
grant execute on function ia_domicilio(text, text, text) to anon, authenticated;
grant execute on function ia_registrar_pedido(text, jsonb) to anon, authenticated;
grant execute on function ia_comprobante(text, text) to anon, authenticated;
grant execute on function ia_estado_pedido(text, text) to anon, authenticated;
