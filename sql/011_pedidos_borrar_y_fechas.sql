-- ============================================================================
-- Pedidos: borrar definitivamente, limpieza automática y filtro por fechas.
-- - Los pedidos que siguen "pendiente" después de 30 días se borran solos
--   (cada vez que alguien abre Pedidos en /admin o /sede).
-- - El dueño puede borrar un pedido para siempre.
-- - El dueño puede ver pedidos entre dos fechas (mes, año, etc.).
-- Ejecutar después de 009. Se puede ejecutar más de una vez.
-- ============================================================================

create or replace function limpiar_pedidos_viejos()
returns void language sql security definer set search_path = public, extensions as $$
  delete from pedidos where estado = 'pendiente' and creado_en < now() - interval '30 days';
$$;
revoke all on function limpiar_pedidos_viejos() from public, anon, authenticated;

create or replace function admin_listar_pedidos(p_clave text, p_dias int default 1)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  perform limpiar_pedidos_viejos();
  return json_build_object('ok', true, 'pedidos', coalesce((
    select json_agg(x order by x.creado_en desc) from (
      select * from pedidos where creado_en >= desde_dias(p_dias) limit 2000) x), '[]'::json));
end $$;

create or replace function sede_listar_pedidos(p_sede int, p_clave text, p_dias int default 1)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := login_sede(p_sede, p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  perform limpiar_pedidos_viejos();
  return json_build_object('ok', true, 'pedidos', coalesce((
    select json_agg(x order by x.creado_en desc) from (
      select * from pedidos where sede_id = p_sede and creado_en >= desde_dias(p_dias) limit 500) x), '[]'::json));
end $$;

-- Pedidos entre dos fechas (incluidas), en hora de Colombia
create or replace function admin_listar_pedidos_rango(p_clave text, p_desde date, p_hasta date)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    return json_build_object('ok', false, 'error', 'Revisa las fechas: "Hasta" debe ser igual o después de "Desde"');
  end if;
  perform limpiar_pedidos_viejos();
  return json_build_object('ok', true, 'pedidos', coalesce((
    select json_agg(x order by x.creado_en desc) from (
      select * from pedidos
       where creado_en >= (p_desde::timestamp at time zone 'America/Bogota')
         and creado_en <  ((p_hasta + 1)::timestamp at time zone 'America/Bogota')
       order by creado_en desc limit 5000) x), '[]'::json));
end $$;

create or replace function admin_borrar_pedido(p_clave text, p_id bigint)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  delete from pedidos where id = p_id;
  return json_build_object('ok', true);
end $$;
