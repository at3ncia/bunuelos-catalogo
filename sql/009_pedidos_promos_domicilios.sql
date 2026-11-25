-- ============================================================================
-- Pedidos registrados, pop-ups de promociones y domicilio por barrio.
-- Ejecutar después de 008_fotos.sql. Se puede ejecutar más de una vez.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Barrios y precio de domicilio ───────────────────────────────────────────
-- precio null = "por confirmar" (el cliente igual puede pedir)

create table if not exists barrios (
  id      text primary key,
  sede_id int  not null references sedes(id) on delete cascade,
  nombre  text not null,
  precio  int,
  activo  boolean not null default true
);
alter table barrios enable row level security;
drop policy if exists "lectura publica barrios" on barrios;
create policy "lectura publica barrios" on barrios for select using (activo);

-- Lista inicial de barrios (sin precio). Se completa y corrige desde /admin → Domicilios.
with lista(ciudad, nombre) as (values
  -- Cartagena
  ('Cartagena','Bocagrande'),('Cartagena','Castillogrande'),('Cartagena','El Laguito'),
  ('Cartagena','Centro Histórico'),('Cartagena','San Diego'),('Cartagena','Getsemaní'),('Cartagena','La Matuna'),
  ('Cartagena','Manga'),('Cartagena','Pie de la Popa'),('Cartagena','Pie del Cerro'),('Cartagena','Crespo'),
  ('Cartagena','Marbella'),('Cartagena','El Cabrero'),('Cartagena','Torices'),('Cartagena','Daniel Lemaitre'),
  ('Cartagena','Canapote'),('Cartagena','Santa María'),('Cartagena','Lo Amador'),('Cartagena','Espinal'),
  ('Cartagena','Bruselas'),('Cartagena','Amberes'),('Cartagena','España'),('Cartagena','Barrio Chino'),
  ('Cartagena','Martínez Martelo'),('Cartagena','Alcibia'),('Cartagena','El Bosque'),('Cartagena','Nuevo Bosque'),
  ('Cartagena','Alto Bosque'),('Cartagena','Los Alpes'),('Cartagena','Zaragocilla'),('Cartagena','Escallón Villa'),
  ('Cartagena','La Castellana'),('Cartagena','Los Ángeles'),('Cartagena','El Prado'),('Cartagena','Las Gaviotas'),
  ('Cartagena','Chiquinquirá'),('Cartagena','Olaya Herrera'),('Cartagena','El Recreo'),('Cartagena','Los Ejecutivos'),
  ('Cartagena','Los Calamares'),('Cartagena','Santa Lucía'),('Cartagena','El Socorro'),('Cartagena','Blas de Lezo'),
  ('Cartagena','San Fernando'),('Cartagena','Ternera'),('Cartagena','La Plazuela'),('Cartagena','Villa Sandra'),
  ('Cartagena','La Concepción'),('Cartagena','Las Delicias'),('Cartagena','Paraguay'),('Cartagena','La Boquilla'),
  ('Cartagena','Crespito'),('Cartagena','Cielo Mar'),
  -- Barranquilla
  ('Barranquilla','Centro'),('Barranquilla','Barrio Abajo'),('Barranquilla','El Prado'),('Barranquilla','Alto Prado'),
  ('Barranquilla','Bellavista'),('Barranquilla','Boston'),('Barranquilla','El Recreo'),('Barranquilla','Las Delicias'),
  ('Barranquilla','Riomar'),('Barranquilla','Altos de Riomar'),('Barranquilla','Villa Country'),('Barranquilla','Villa Santos'),
  ('Barranquilla','Altos del Limón'),('Barranquilla','El Golf'),('Barranquilla','Ciudad Jardín'),('Barranquilla','Granadillo'),
  ('Barranquilla','Paraíso'),('Barranquilla','Miramar'),('Barranquilla','Villa Carolina'),('Barranquilla','El Poblado'),
  ('Barranquilla','La Concepción'),('Barranquilla','San Francisco'),('Barranquilla','Rebolo'),('Barranquilla','Chiquinquirá'),
  ('Barranquilla','Las Nieves'),('Barranquilla','Simón Bolívar'),('Barranquilla','Montecristo'),('Barranquilla','Modelo'),
  ('Barranquilla','Los Andes'),('Barranquilla','Olaya'),('Barranquilla','El Carmen'),('Barranquilla','Rosario'),
  ('Barranquilla','San Isidro'),('Barranquilla','Las Estrellas'),('Barranquilla','El Silencio'),('Barranquilla','Los Nogales'),
  ('Barranquilla','La Campiña'),('Barranquilla','Siape'),('Barranquilla','Carrizal'),('Barranquilla','Lucero'),
  ('Barranquilla','Los Alpes'),('Barranquilla','La Cumbre'),('Barranquilla','Betania'),('Barranquilla','Santo Domingo de Guzmán')
)
insert into barrios (id, sede_id, nombre, precio)
select
  lower(left(l.ciudad, 3)) || '-' ||
    regexp_replace(lower(translate(l.nombre, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN')), '[^a-z0-9]+', '-', 'g'),
  s.id, l.nombre, null
from lista l
join sedes s on s.ciudad = l.ciudad and s.activa
on conflict (id) do nothing;

-- ── Pop-ups de promociones ──────────────────────────────────────────────────

create table if not exists promos (
  id          text primary key,
  titulo      text not null default '',
  imagen      text not null default '',
  producto_id text references productos(id) on delete set null,
  boton_texto text not null default 'Lo quiero',
  dias        smallint[],          -- 0 = domingo … 6 = sábado; null = todos
  desde       date,                -- null = sin fecha de inicio
  hasta       date,                -- null = sin fecha de fin
  activo      boolean not null default true,
  orden       int not null default 0
);
alter table promos enable row level security;
drop policy if exists "lectura publica promos" on promos;
create policy "lectura publica promos" on promos for select using (activo);

-- ── Pedidos ─────────────────────────────────────────────────────────────────

create table if not exists pedidos (
  id              bigserial primary key,
  codigo          text unique not null,
  sede_id         int references sedes(id) on delete set null,
  punto_id        text,
  cliente         jsonb not null default '{}'::jsonb,  -- lo que llenó en el formulario
  items           jsonb not null,                      -- [{id, nombre, precio, cantidad}]
  subtotal        int not null,
  domicilio       int,                                 -- null = por confirmar / sin domicilio
  total           int not null,
  barrio          text,
  estado          text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'cancelado')),
  confirmado_por  text,                                -- 'sede', 'dueño' o el proveedor de pago
  pago_proveedor  text,                                -- para Bold u otro (pago confirmado solo)
  pago_referencia text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);
create index if not exists pedidos_creado_en on pedidos (creado_en desc);
create index if not exists pedidos_sede on pedidos (sede_id, creado_en desc);
alter table pedidos enable row level security;  -- nadie lee ni escribe directo

-- El catálogo registra el pedido. Los precios se calculan aquí con los de la base
-- de datos (no se confía en lo que mande el navegador).
create or replace function registrar_pedido(p jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_items jsonb; v_sub int; v_dom int; v_barrio text; v_codigo text; v_pref text; v_sede int; n int;
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

  insert into pedidos (codigo, sede_id, punto_id, cliente, items, subtotal, domicilio, total, barrio)
  values (
    v_codigo, v_sede, left(p->>'punto_id', 60),
    case when jsonb_typeof(p->'cliente') = 'object'
         then coalesce((select jsonb_object_agg(left(key, 60), left(value, 300)) from jsonb_each_text(p->'cliente')), '{}'::jsonb)
         else '{}'::jsonb end,
    v_items, v_sub, v_dom, v_sub + coalesce(v_dom, 0), v_barrio
  );
  return json_build_object('ok', true, 'codigo', v_codigo, 'subtotal', v_sub, 'domicilio', v_dom,
                           'total', v_sub + coalesce(v_dom, 0));
end $$;

-- Inicio del día p_dias atrás (hora de Colombia)
create or replace function desde_dias(p_dias int)
returns timestamptz language sql stable as $$
  select (date_trunc('day', now() at time zone 'America/Bogota')
          - make_interval(days => greatest(coalesce(p_dias, 1), 1) - 1)) at time zone 'America/Bogota';
$$;

create or replace function admin_listar_pedidos(p_clave text, p_dias int default 1)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  return json_build_object('ok', true, 'pedidos', coalesce((
    select json_agg(x order by x.creado_en desc) from (
      select * from pedidos where creado_en >= desde_dias(p_dias) limit 2000) x), '[]'::json));
end $$;

create or replace function admin_estado_pedido(p_clave text, p_id bigint, p_estado text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  if p_estado not in ('pendiente', 'confirmado', 'cancelado') then
    return json_build_object('ok', false, 'error', 'Estado no válido');
  end if;
  update pedidos set estado = p_estado, actualizado_en = now(),
         confirmado_por = case when p_estado = 'confirmado' then 'dueño' else confirmado_por end
   where id = p_id;
  return json_build_object('ok', true);
end $$;

-- Las sedes ven y confirman solo los pedidos de su ciudad
create or replace function sede_listar_pedidos(p_sede int, p_clave text, p_dias int default 1)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := login_sede(p_sede, p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  return json_build_object('ok', true, 'pedidos', coalesce((
    select json_agg(x order by x.creado_en desc) from (
      select * from pedidos where sede_id = p_sede and creado_en >= desde_dias(p_dias) limit 500) x), '[]'::json));
end $$;

create or replace function sede_estado_pedido(p_sede int, p_clave text, p_id bigint, p_estado text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := login_sede(p_sede, p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  if p_estado not in ('pendiente', 'confirmado', 'cancelado') then
    return json_build_object('ok', false, 'error', 'Estado no válido');
  end if;
  update pedidos set estado = p_estado, actualizado_en = now(),
         confirmado_por = case when p_estado = 'confirmado' then 'sede' else confirmado_por end
   where id = p_id and sede_id = p_sede;
  return json_build_object('ok', true);
end $$;

-- ── Panel: barrios y promos ─────────────────────────────────────────────────

create or replace function admin_guardar_barrios(p_clave text, lista jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  insert into barrios (id, sede_id, nombre, precio, activo)
  select b->>'id', (b->>'sede_id')::int, trim(b->>'nombre'),
         case when nullif(b->>'precio', '') is null then null else greatest((b->>'precio')::int, 0) end,
         coalesce((b->>'activo')::boolean, true)
    from jsonb_array_elements(lista) b
   where coalesce(trim(b->>'nombre'), '') <> ''
  on conflict (id) do update set
    sede_id = excluded.sede_id, nombre = excluded.nombre, precio = excluded.precio, activo = excluded.activo;
  return json_build_object('ok', true);
end $$;

create or replace function admin_borrar_barrio(p_clave text, p_id text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  delete from barrios where id = p_id;
  return json_build_object('ok', true);
end $$;

create or replace function admin_listar_barrios(p_clave text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  return json_build_object('ok', true, 'barrios',
    coalesce((select json_agg(b order by b.nombre) from barrios b), '[]'::json));
end $$;

create or replace function admin_guardar_promo(p_clave text, p jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  insert into promos (id, titulo, imagen, producto_id, boton_texto, dias, desde, hasta, activo, orden)
  values (
    p->>'id', coalesce(p->>'titulo', ''), coalesce(p->>'imagen', ''), nullif(p->>'producto_id', ''),
    coalesce(nullif(p->>'boton_texto', ''), 'Lo quiero'),
    case when jsonb_typeof(p->'dias') = 'array' and jsonb_array_length(p->'dias') > 0
         then array(select jsonb_array_elements_text(p->'dias')::smallint) end,
    nullif(p->>'desde', '')::date, nullif(p->>'hasta', '')::date,
    coalesce((p->>'activo')::boolean, true), coalesce((p->>'orden')::int, 0)
  )
  on conflict (id) do update set
    titulo = excluded.titulo, imagen = excluded.imagen, producto_id = excluded.producto_id,
    boton_texto = excluded.boton_texto, dias = excluded.dias, desde = excluded.desde,
    hasta = excluded.hasta, activo = excluded.activo, orden = excluded.orden;
  return json_build_object('ok', true);
end $$;

create or replace function admin_listar_promos(p_clave text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  return json_build_object('ok', true, 'promos',
    coalesce((select json_agg(x order by x.orden, x.id) from promos x), '[]'::json));
end $$;

create or replace function admin_borrar_promo(p_clave text, p_id text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  delete from promos where id = p_id;
  return json_build_object('ok', true);
end $$;

-- ── Permisos ────────────────────────────────────────────────────────────────

grant execute on function registrar_pedido(jsonb) to anon, authenticated;
grant execute on function admin_listar_pedidos(text, int) to anon, authenticated;
grant execute on function admin_estado_pedido(text, bigint, text) to anon, authenticated;
grant execute on function sede_listar_pedidos(int, text, int) to anon, authenticated;
grant execute on function sede_estado_pedido(int, text, bigint, text) to anon, authenticated;
grant execute on function admin_guardar_barrios(text, jsonb) to anon, authenticated;
grant execute on function admin_borrar_barrio(text, text) to anon, authenticated;
grant execute on function admin_listar_barrios(text) to anon, authenticated;
grant execute on function admin_guardar_promo(text, jsonb) to anon, authenticated;
grant execute on function admin_listar_promos(text) to anon, authenticated;
grant execute on function admin_borrar_promo(text, text) to anon, authenticated;

-- Verificación
select s.ciudad, count(b.*) as barrios from sedes s left join barrios b on b.sede_id = s.id
where s.activa group by s.ciudad;
