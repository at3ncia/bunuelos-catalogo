-- ============================================================================
-- Promos: frecuencia (cada visita / una vez al día / una sola vez) y momento
-- del día (franja de horas). Ejecutar después de 009. Se puede ejecutar más de una vez.
-- ============================================================================

alter table promos add column if not exists frecuencia text not null default 'dia';
alter table promos drop constraint if exists promos_frecuencia_check;
alter table promos add constraint promos_frecuencia_check check (frecuencia in ('visita', 'dia', 'una_vez'));
alter table promos add column if not exists hora_desde text;  -- "HH:MM" hora de Colombia; null = todo el día
alter table promos add column if not exists hora_hasta text;

create or replace function admin_guardar_promo(p_clave text, p jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json; v_frec text; v_hd text; v_hh text;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  v_frec := coalesce(nullif(p->>'frecuencia', ''), 'dia');
  if v_frec not in ('visita', 'dia', 'una_vez') then v_frec := 'dia'; end if;
  v_hd := nullif(p->>'hora_desde', '');
  v_hh := nullif(p->>'hora_hasta', '');
  if v_hd !~ '^\d{2}:\d{2}$' then v_hd := null; end if;
  if v_hh !~ '^\d{2}:\d{2}$' then v_hh := null; end if;
  insert into promos (id, titulo, imagen, producto_id, boton_texto, dias, desde, hasta, activo, orden,
                      frecuencia, hora_desde, hora_hasta)
  values (
    p->>'id', coalesce(p->>'titulo', ''), coalesce(p->>'imagen', ''), nullif(p->>'producto_id', ''),
    coalesce(nullif(p->>'boton_texto', ''), 'Lo quiero'),
    case when jsonb_typeof(p->'dias') = 'array' and jsonb_array_length(p->'dias') > 0
         then array(select jsonb_array_elements_text(p->'dias')::smallint) end,
    nullif(p->>'desde', '')::date, nullif(p->>'hasta', '')::date,
    coalesce((p->>'activo')::boolean, true), coalesce((p->>'orden')::int, 0),
    v_frec, v_hd, v_hh
  )
  on conflict (id) do update set
    titulo = excluded.titulo, imagen = excluded.imagen, producto_id = excluded.producto_id,
    boton_texto = excluded.boton_texto, dias = excluded.dias, desde = excluded.desde,
    hasta = excluded.hasta, activo = excluded.activo, orden = excluded.orden,
    frecuencia = excluded.frecuencia, hora_desde = excluded.hora_desde, hora_hasta = excluded.hora_hasta;
  return json_build_object('ok', true);
end $$;
