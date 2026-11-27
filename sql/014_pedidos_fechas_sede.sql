-- ============================================================================
-- Pedidos en /sede: los encargados también pueden ver por fechas (este mes, año…)
-- solo los pedidos de su ciudad. Solo lectura: no pueden borrar.
-- Ejecutar después de 011. Se puede ejecutar más de una vez.
-- ============================================================================

create or replace function sede_listar_pedidos_rango(p_sede int, p_clave text, p_desde date, p_hasta date)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := login_sede(p_sede, p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    return json_build_object('ok', false, 'error', 'Revisa las fechas: "Hasta" debe ser igual o después de "Desde"');
  end if;
  perform limpiar_pedidos_viejos();
  return json_build_object('ok', true, 'pedidos', coalesce((
    select json_agg(x order by x.creado_en desc) from (
      select * from pedidos
       where sede_id = p_sede
         and creado_en >= (p_desde::timestamp at time zone 'America/Bogota')
         and creado_en <  ((p_hasta + 1)::timestamp at time zone 'America/Bogota')
       order by creado_en desc limit 2000) x), '[]'::json));
end $$;

grant execute on function sede_listar_pedidos_rango(int, text, date, date) to anon, authenticated;
