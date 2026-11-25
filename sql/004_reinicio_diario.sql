-- ============================================================================
-- "Se acabó por hoy": los agotados vuelven a estar disponibles solos cada día
-- a las 4:00 a. m. hora de Colombia (las sedes abren a las 5:00 a. m.).
-- Ejecutar después de 001_sedes.sql. Se puede ejecutar más de una vez.
-- ============================================================================

-- Cuándo se marcó por última vez cada producto en cada sede
alter table sede_productos
  add column if not exists actualizado_en timestamptz not null default now();

-- Marcar disponibilidad guarda también la hora
create or replace function set_disponibilidad(
  p_sede int, p_clave text, p_producto text, p_disponible boolean
) returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  r json;
begin
  r := login_sede(p_sede, p_clave);
  if not (r->>'ok')::boolean then
    return r;
  end if;
  insert into sede_productos (sede_id, producto_id, disponible, actualizado_en)
  values (p_sede, p_producto, p_disponible, now())
  on conflict (sede_id, producto_id)
    do update set disponible = excluded.disponible, actualizado_en = now();
  return json_build_object('ok', true);
end $$;

-- Inicio del día de operación: hoy a las 4:00 a. m. en Colombia
-- (antes de las 4:00 a. m. todavía cuenta como el día anterior)
create or replace function inicio_dia_operacion()
returns timestamp language sql stable as $$
  select date_trunc('day', (now() at time zone 'America/Bogota') - interval '4 hours')
         + interval '4 hours';
$$;

-- Disponibilidad efectiva: un "agotado" solo cuenta si se marcó hoy
create or replace view sede_disponibilidad
with (security_invoker = true) as
select
  sede_id,
  producto_id,
  case
    when disponible then true
    when (actualizado_en at time zone 'America/Bogota') >= inicio_dia_operacion() then false
    else true
  end as disponible
from sede_productos;

grant select on sede_disponibilidad to anon, authenticated;
grant execute on function inicio_dia_operacion() to anon, authenticated;
