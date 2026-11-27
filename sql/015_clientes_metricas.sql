-- ============================================================================
-- Clientes y métricas (/admin → Clientes y Resumen), autorización de datos y
-- base para ventas hechas por la IA de WhatsApp (APEX).
-- - El teléfono de cada pedido se guarda limpio (10 dígitos) para reconocer al cliente.
-- - acepta_promos: el cliente autorizó recibir promociones (Ley 1581).
-- - origen: 'web' (catálogo), 'ia' (asistente de WhatsApp) o 'asesor'.
-- - metodo_pago: 'efectivo', 'transferencia' o 'link'; comprobante: llegó pantallazo.
-- Ejecutar después de 011. Se puede ejecutar más de una vez.
-- ============================================================================

alter table pedidos add column if not exists telefono text;
alter table pedidos add column if not exists acepta_promos boolean not null default false;
alter table pedidos add column if not exists origen text not null default 'web';
alter table pedidos add column if not exists metodo_pago text;
alter table pedidos add column if not exists comprobante boolean not null default false;
alter table pedidos add column if not exists conversacion_url text;
alter table pedidos drop constraint if exists pedidos_origen_check;
alter table pedidos add constraint pedidos_origen_check check (origen in ('web', 'ia', 'asesor'));
create index if not exists pedidos_telefono on pedidos (telefono, creado_en desc);

-- 300 123 4567, +57 300…, (300) 123-4567 → 3001234567. Fijos de 7 dígitos se dejan igual.
create or replace function normalizar_telefono(t text)
returns text language sql immutable as $$
  select case
    when d ~ '^57\d{10}$' then substr(d, 3)
    when d ~ '^\d{10}$' or d ~ '^\d{7}$' then d
    else null end
  from (select regexp_replace(coalesce(t, ''), '\D', '', 'g') as d) x;
$$;

-- Busca el teléfono entre los datos del formulario (las etiquetas las define el dueño)
create or replace function telefono_de_cliente(c jsonb)
returns text language sql immutable as $$
  select normalizar_telefono(value) from jsonb_each_text(coalesce(c, '{}'::jsonb))
   where normalizar_telefono(value) is not null
   order by (key ~* 'tel|cel|contacto|whats|n[uú]mero') desc
   limit 1;
$$;

-- Pedidos de antes: se completa el teléfono una sola vez
update pedidos set telefono = telefono_de_cliente(cliente) where telefono is null;

-- registrar_pedido: igual que antes + teléfono limpio y autorización de promociones
create or replace function registrar_pedido(p jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_items jsonb; v_sub int; v_dom int; v_barrio text; v_codigo text; v_pref text; v_sede int; n int;
  v_cliente jsonb;
begin
  if jsonb_typeof(p->'items') is distinct from 'array'
     or jsonb_array_length(p->'items') = 0 or jsonb_array_length(p->'items') > 60 then
    return json_build_object('ok', false, 'error', 'Pedido vacío');
  end if;
  select count(*) into n from pedidos where creado_en > now() - interval '1 minute';
  if n > 40 then
    return json_build_object('ok', false, 'error', 'Muchos pedidos al tiempo, intenta en un minuto');
  end if;

  v_sede := nullif(p->>'sede_id', '')::int;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pr.id, 'nombre', pr.nombre, 'precio', pr.precio,
           'cantidad', least(greatest(coalesce((i->>'cantidad')::int, 1), 1), 99))), '[]'::jsonb),
         coalesce(sum(pr.precio * least(greatest(coalesce((i->>'cantidad')::int, 1), 1), 99)), 0)
    into v_items, v_sub
    from jsonb_array_elements(p->'items') i
    join productos pr on pr.id = i->>'id';
  if jsonb_array_length(v_items) = 0 then
    return json_build_object('ok', false, 'error', 'Productos no encontrados');
  end if;

  if nullif(p->>'barrio_id', '') is not null then
    select nombre, precio into v_barrio, v_dom
      from barrios where id = p->>'barrio_id' and (v_sede is null or sede_id = v_sede);
  end if;
  v_barrio := coalesce(v_barrio, nullif(left(p->>'barrio_texto', 80), ''));

  select upper(left(translate(ciudad, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'), 3)) into v_pref from sedes where id = v_sede;
  v_pref := coalesce(v_pref, 'PED');
  loop
    v_codigo := v_pref || '-' || lpad(floor(random() * 100000)::int::text, 5, '0');
    exit when not exists (select 1 from pedidos where codigo = v_codigo);
  end loop;

  v_cliente := case when jsonb_typeof(p->'cliente') = 'object'
    then coalesce((select jsonb_object_agg(left(key, 60), left(value, 300)) from jsonb_each_text(p->'cliente')), '{}'::jsonb)
    else '{}'::jsonb end;

  insert into pedidos (codigo, sede_id, punto_id, cliente, items, subtotal, domicilio, total, barrio,
                       telefono, acepta_promos, origen, metodo_pago)
  values (
    v_codigo, v_sede, left(p->>'punto_id', 60), v_cliente,
    v_items, v_sub, v_dom, v_sub + coalesce(v_dom, 0), v_barrio,
    coalesce(normalizar_telefono(p->>'telefono'), telefono_de_cliente(v_cliente)),
    coalesce((p->>'acepta_promos')::boolean, false),
    'web',
    left(nullif(p->>'metodo_pago', ''), 20)
  );
  return json_build_object('ok', true, 'codigo', v_codigo, 'subtotal', v_sub, 'domicilio', v_dom,
                           'total', v_sub + coalesce(v_dom, 0));
end $$;

-- ── Clientes ───────────────────────────────────────────────────────────────
-- Un cliente = un teléfono. Compras y gasto cuentan solo pedidos confirmados.
create or replace function admin_clientes(p_clave text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  return json_build_object('ok', true, 'clientes', coalesce((
    select json_agg(c order by c.ultimo desc) from (
      select
        p.telefono,
        (array_agg(coalesce(p.cliente->>'Nombre completo', p.cliente->>'Nombre',
                            (select value from jsonb_each_text(p.cliente) where key ~* 'nombre' limit 1), '')
                   order by p.creado_en desc))[1] as nombre,
        (array_agg(p.barrio order by p.creado_en desc) filter (where p.barrio is not null))[1] as barrio,
        (array_agg(p.sede_id order by p.creado_en desc))[1] as sede_id,
        count(*) filter (where p.estado = 'confirmado') as compras,
        count(*) as pedidos,
        coalesce(sum(p.total) filter (where p.estado = 'confirmado'), 0) as gastado,
        min(p.creado_en) as primero,
        max(p.creado_en) as ultimo,
        bool_or(p.acepta_promos) as acepta_promos,
        bool_or(p.origen = 'ia') as via_ia,
        (select i->>'nombre' from pedidos q, jsonb_array_elements(q.items) i
          where q.telefono = p.telefono and q.estado = 'confirmado'
          group by i->>'nombre' order by sum((i->>'cantidad')::int) desc limit 1) as favorito
      from pedidos p
      where p.telefono is not null
      group by p.telefono
      limit 5000) c), '[]'::json));
end $$;

create or replace function admin_cliente(p_clave text, p_telefono text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  return json_build_object('ok', true, 'pedidos', coalesce((
    select json_agg(x order by x.creado_en desc) from (
      select * from pedidos where telefono = normalizar_telefono(p_telefono) limit 500) x), '[]'::json));
end $$;

-- Derecho de supresión (Ley 1581): se borran los datos personales; las ventas quedan
-- (sin nombre ni teléfono) para no descuadrar la contabilidad.
create or replace function admin_borrar_cliente(p_clave text, p_telefono text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json; n int;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  update pedidos set cliente = '{}'::jsonb, telefono = null, barrio = null, acepta_promos = false,
                     conversacion_url = null, actualizado_en = now()
   where telefono = normalizar_telefono(p_telefono);
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'pedidos', n);
end $$;

-- ── Métricas ───────────────────────────────────────────────────────────────
-- Periodo [desde, hasta] (fechas de Colombia) comparado con el periodo anterior de igual largo.
-- La serie trae TODOS los días/semanas/meses del periodo (con 0 si no hubo ventas),
-- así las gráficas nunca quedan con huecos. Agrupa por día hasta 45 días, por semana
-- hasta ~13 meses y por mes después.
create or replace function admin_metricas(p_clave text, p_desde date, p_hasta date, p_sede int default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  r json; dias int; v_ini timestamptz; v_fin timestamptz; a_ini timestamptz; paso text;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    return json_build_object('ok', false, 'error', 'Revisa las fechas: "Hasta" debe ser igual o después de "Desde"');
  end if;
  if p_hasta - p_desde > 3660 then
    return json_build_object('ok', false, 'error', 'El periodo máximo es de 10 años');
  end if;
  perform limpiar_pedidos_viejos();
  dias := p_hasta - p_desde + 1;
  v_ini := p_desde::timestamp at time zone 'America/Bogota';
  v_fin := (p_hasta + 1)::timestamp at time zone 'America/Bogota';
  a_ini := (p_desde - dias)::timestamp at time zone 'America/Bogota';
  paso := case when dias <= 45 then 'day' when dias <= 400 then 'week' else 'month' end;

  return (
  with base as (
    select p.*, (p.creado_en at time zone 'America/Bogota') as local
      from pedidos p
     where p.creado_en >= a_ini and p.creado_en < v_fin and (p_sede is null or p.sede_id = p_sede)
  ),
  act as (select * from base where creado_en >= v_ini),
  ant as (select * from base where creado_en < v_ini),
  conf as (select * from act where estado = 'confirmado'),
  resumen as (
    select
      (select coalesce(sum(total), 0) from conf) as ventas,
      (select count(*) from conf) as confirmados,
      (select count(*) from act) as pedidos,
      (select count(*) from act where estado = 'cancelado') as cancelados,
      (select coalesce(sum(total), 0) from ant where estado = 'confirmado') as ventas_ant,
      (select count(*) from ant where estado = 'confirmado') as confirmados_ant,
      (select count(*) from ant) as pedidos_ant,
      (select coalesce(sum(total), 0) from conf where origen = 'ia') as ventas_ia,
      (select count(*) from conf where origen = 'ia') as confirmados_ia,
      (select count(*) from act where origen = 'ia' and estado = 'pendiente') as ia_por_revisar
  ),
  cubetas as (
    select g as inicio from generate_series(date_trunc(paso, p_desde::timestamp), p_hasta::timestamp, ('1 ' || paso)::interval) g
  ),
  serie as (
    select to_char(c.inicio, 'YYYY-MM-DD') as fecha,
           coalesce(sum(k.total), 0) as ventas, count(k.id) as pedidos
      from cubetas c
      left join conf k on date_trunc(paso, k.local) = c.inicio
     group by c.inicio order by c.inicio
  ),
  calor as (
    select extract(dow from local)::int as dia, extract(hour from local)::int as hora, count(*) as pedidos
      from conf group by 1, 2
  ),
  prods as (
    select i->>'nombre' as nombre, sum((i->>'cantidad')::int) as cantidad,
           sum((i->>'cantidad')::int * (i->>'precio')::int) as ventas
      from conf, jsonb_array_elements(items) i group by 1
  ),
  barrios_ as (
    select barrio, count(*) as pedidos, sum(total) as ventas from conf where barrio is not null group by 1
  ),
  sedes_ as (
    select sede_id, count(*) as pedidos, sum(total) as ventas from conf group by 1
  ),
  -- Clientes del periodo: nuevo = su primer pedido confirmado cae dentro del periodo
  primeros as (
    select telefono, min(creado_en) as primero from pedidos
     where estado = 'confirmado' and telefono is not null and (p_sede is null or sede_id = p_sede)
     group by telefono
  ),
  clientes_ as (
    select count(distinct k.telefono) as total,
           count(distinct k.telefono) filter (where pr.primero >= v_ini) as nuevos
      from conf k join primeros pr using (telefono)
  ),
  -- Recompra: de los clientes que compraron en el periodo anterior, cuántos volvieron en este
  recompra as (
    select count(distinct a.telefono) as base,
           count(distinct a.telefono) filter (where exists (
             select 1 from conf c where c.telefono = a.telefono)) as volvieron
      from ant a where a.estado = 'confirmado' and a.telefono is not null
  )
  select json_build_object(
    'ok', true, 'paso', paso, 'dias', dias,
    'resumen', (select row_to_json(resumen) from resumen),
    'serie', coalesce((select json_agg(serie) from serie), '[]'::json),
    'calor', coalesce((select json_agg(calor) from calor), '[]'::json),
    'productos', coalesce((select json_agg(x) from (select * from prods order by cantidad desc limit 10) x), '[]'::json),
    'productos_menos', coalesce((select json_agg(x) from (
        select pr.nombre, coalesce(s.cantidad, 0) as cantidad from productos pr
          left join prods s on s.nombre = pr.nombre order by coalesce(s.cantidad, 0) asc, pr.nombre limit 5) x), '[]'::json),
    'barrios', coalesce((select json_agg(x) from (select * from barrios_ order by pedidos desc limit 8) x), '[]'::json),
    'sedes', coalesce((select json_agg(sedes_) from sedes_), '[]'::json),
    'clientes', (select row_to_json(clientes_) from clientes_),
    'recompra', (select row_to_json(recompra) from recompra)
  ));
end $$;

grant execute on function admin_clientes(text) to anon, authenticated;
grant execute on function admin_cliente(text, text) to anon, authenticated;
grant execute on function admin_borrar_cliente(text, text) to anon, authenticated;
grant execute on function admin_metricas(text, date, date, int) to anon, authenticated;
