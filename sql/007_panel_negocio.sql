-- ============================================================================
-- Panel del negocio (/admin): todo lo que antes estaba fijo en el código pasa a
-- la base de datos y se edita desde el panel, sin publicar cambios.
-- Ejecutar después de 006_puntos_pedido.sql. Se puede ejecutar más de una vez.
-- La contraseña del dueño se define aparte (ver mensaje del chat / README).
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Columnas nuevas ─────────────────────────────────────────────────────────

alter table config add column if not exists ajustes jsonb not null default '{}'::jsonb;
alter table config add column if not exists clave_admin_hash text;
alter table config add column if not exists intentos int not null default 0;
alter table config add column if not exists bloqueado_hasta timestamptz;

alter table categorias add column if not exists color text not null default '';

-- dias: días de la semana en que se muestra (0 = domingo … 6 = sábado). null = todos.
alter table productos add column if not exists dias smallint[];
alter table productos add column if not exists orden int not null default 0;

alter table puntos_pedido add column if not exists mensaje text not null default 'Hola! Quiero ordenar';
alter table puntos_pedido add column if not exists etiqueta_enlace text not null default '';
alter table puntos_pedido add column if not exists en_enlaces boolean not null default true;

-- ── Valores iniciales (los que estaban en el código) ───────────────────────
-- Los ajustes ya guardados tienen prioridad sobre estos valores.

update config set ajustes = jsonb_build_object(
  'titulo', 'Crujientes, doraditos y recién hechos',
  'subtitulo', 'Elige tus favoritos y envía tu pedido directo por WhatsApp.',
  'instagram', 'kiosko_los_bunuelos',
  'boton_menu', 'Menú domicilios',
  'medios_pago', jsonb_build_array('Efectivo', 'Nequi', 'Bancolombia', 'Otro'),
  'hora_reinicio', 4,
  -- dias: 0 = domingo … 6 = sábado; los festivos usan el horario del domingo
  'horario_domicilios', jsonb_build_array(
    jsonb_build_object('dias', jsonb_build_array(1,2,3,4,5,6),
                       'franjas', jsonb_build_array(jsonb_build_array('06:00','13:00'), jsonb_build_array('14:00','19:00'))),
    jsonb_build_object('dias', jsonb_build_array(0),
                       'franjas', jsonb_build_array(jsonb_build_array('06:00','13:00')))
  )
) || ajustes
where id = 1;

update categorias set color = case id
  when 'bunuelos' then '#E8781A'
  when 'otras-delicias' then '#E2563F'
  when 'jugos' then '#1B3A8C'
  when 'bebidas-calientes' then '#A9B4F7'
  when 'combos' then '#F2B231'
  else color end
where color = '';

-- Orden del menú impreso (solo si todavía no se ha ordenado desde el panel)
update productos p set orden = o.orden
from (values
  ('bunuelo-tradicional',1),('bunuelo-mozarella',2),('bunuelo-arequipe',3),('bunuelo-bocadillo',4),('bunuelo-nutella',5),
  ('pan-de-bono',1),('pan-de-bono-arequipe',2),('pan-de-bono-bocadillo',3),('pan-de-bono-nutella',4),('almojabana',5),('palibono',6),
  ('jugo-naranja',1),('jugo-corozo',2),('jugo-mora',3),('jugo-maracuya',4),('jugo-lulo',5),('jugo-guayaba',6),
  ('jugo-tomate-arbol',7),('jugo-borojo',8),('jugo-fresa',9),('jugo-nispero',10),('jugo-zapote',11),('jugo-guanabana',12),('milo-granizado',13),
  ('capuchino',1),('tinto',2),('capuchino-vainilla',3),('chocolate-abuelita',4),
  ('match-perfecto',1),('combo-uno',2),('combo-dos',3),('combo-tres',4),('combo-cuatro',5),('combo-cinco',6)
) as o(id, orden)
where p.id = o.id and p.orden = 0;

update puntos_pedido set
  mensaje = case id
    when 'ctg-terminal-castellana' then 'Hola! Quiero ordenar'
    when 'ctg-bocagrande' then 'Hola! Estoy interesad@ en:'
    when 'baq-centro' then 'Hola! Quisiera ordenar:'
    else mensaje end,
  etiqueta_enlace = case id
    when 'ctg-terminal-castellana' then 'Terminal - Castellana Cartagena'
    when 'ctg-bocagrande' then 'Bocagrande'
    when 'baq-centro' then 'Barranquilla'
    else etiqueta_enlace end
where etiqueta_enlace = '';

-- ── Seguridad: la tabla config ya no es pública; se lee por una vista ──────

drop policy if exists "lectura publica config" on config;

create or replace view config_publica as
  select id, nombre, whatsapp, logo, ajustes from config;
grant select on config_publica to anon, authenticated;

-- ── Reinicio diario: la hora sale de los ajustes ────────────────────────────

create or replace function inicio_dia_operacion()
returns timestamp language sql stable security definer set search_path = public as $$
  select date_trunc('day', (now() at time zone 'America/Bogota')
           - make_interval(hours => coalesce((select (ajustes->>'hora_reinicio')::int from config where id = 1), 4)))
         + make_interval(hours => coalesce((select (ajustes->>'hora_reinicio')::int from config where id = 1), 4));
$$;

-- ── Contraseña del dueño ────────────────────────────────────────────────────
-- Devuelve {ok}. No lanza error si la clave es incorrecta, para que el
-- contador de intentos se guarde. 5 fallos bloquean 15 minutos.

create or replace function admin_verificar(p_clave text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  c config%rowtype;
begin
  select * into c from config where id = 1;
  if c.clave_admin_hash is null then
    return json_build_object('ok', false, 'error', 'Aún no hay contraseña de administrador configurada');
  end if;
  if c.bloqueado_hasta is not null and c.bloqueado_hasta > now() then
    return json_build_object('ok', false, 'error', 'Demasiados intentos. Intenta en unos minutos');
  end if;
  if c.clave_admin_hash = crypt(p_clave, c.clave_admin_hash) then
    update config set intentos = 0, bloqueado_hasta = null where id = 1;
    return json_build_object('ok', true);
  end if;
  update config
     set intentos = case when intentos + 1 >= 5 then 0 else intentos + 1 end,
         bloqueado_hasta = case when intentos + 1 >= 5 then now() + interval '15 minutes' end
   where id = 1;
  return json_build_object('ok', false, 'error', 'Contraseña incorrecta');
end $$;

create or replace function admin_cambiar_clave(p_clave text, p_nueva text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  perform validar_clave_nueva(p_nueva);
  update config set clave_admin_hash = crypt(p_nueva, gen_salt('bf')) where id = 1;
  return json_build_object('ok', true);
end $$;

-- Restablecer la clave de una sede sin conocer la anterior (rotación de personal)
create or replace function admin_restablecer_clave_sede(p_clave text, p_sede int, p_nueva text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  perform validar_clave_nueva(p_nueva);
  update sedes set clave_hash = crypt(p_nueva, gen_salt('bf')), intentos = 0, bloqueado_hasta = null
   where id = p_sede;
  return json_build_object('ok', true);
end $$;

-- ── Productos ───────────────────────────────────────────────────────────────

create or replace function admin_guardar_producto(p_clave text, p jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  if coalesce(trim(p->>'nombre'), '') = '' then
    return json_build_object('ok', false, 'error', 'El producto necesita un nombre');
  end if;
  insert into productos (id, nombre, descripcion, precio, categoria_id, foto, disponible, dias, orden)
  values (
    p->>'id', trim(p->>'nombre'), coalesce(p->>'descripcion', ''), coalesce((p->>'precio')::int, 0),
    nullif(p->>'categoria_id', ''), coalesce(p->>'foto', ''), coalesce((p->>'disponible')::boolean, true),
    case when jsonb_typeof(p->'dias') = 'array' and jsonb_array_length(p->'dias') > 0
         then array(select jsonb_array_elements_text(p->'dias')::smallint) end,
    coalesce((p->>'orden')::int, 0)
  )
  on conflict (id) do update set
    nombre = excluded.nombre, descripcion = excluded.descripcion, precio = excluded.precio,
    categoria_id = excluded.categoria_id, foto = excluded.foto, disponible = excluded.disponible,
    dias = excluded.dias, orden = excluded.orden;
  -- Un producto nuevo queda disponible en todas las sedes
  insert into sede_productos (sede_id, producto_id, disponible)
  select s.id, p->>'id', true from sedes s
  on conflict (sede_id, producto_id) do nothing;
  return json_build_object('ok', true);
end $$;

create or replace function admin_borrar_producto(p_clave text, p_id text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  delete from productos where id = p_id;
  return json_build_object('ok', true);
end $$;

-- ── Categorías ──────────────────────────────────────────────────────────────

create or replace function admin_guardar_categoria(p_clave text, c jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  if coalesce(trim(c->>'nombre'), '') = '' then
    return json_build_object('ok', false, 'error', 'La categoría necesita un nombre');
  end if;
  insert into categorias (id, nombre, orden, color)
  values (c->>'id', trim(c->>'nombre'), coalesce((c->>'orden')::int, 0), coalesce(c->>'color', ''))
  on conflict (id) do update set nombre = excluded.nombre, orden = excluded.orden, color = excluded.color;
  return json_build_object('ok', true);
end $$;

create or replace function admin_borrar_categoria(p_clave text, p_id text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  if exists (select 1 from productos where categoria_id = p_id) then
    return json_build_object('ok', false, 'error', 'Mueve o borra primero los productos de esta categoría');
  end if;
  delete from categorias where id = p_id;
  return json_build_object('ok', true);
end $$;

-- ── Puntos de pedido (WhatsApp y botones de /links) ─────────────────────────

create or replace function admin_guardar_punto(p_clave text, p jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  if coalesce(regexp_replace(p->>'whatsapp', '\D', '', 'g'), '') !~ '^\d{10,15}$' then
    return json_build_object('ok', false, 'error', 'El WhatsApp debe tener indicativo y número, por ejemplo 573001234567');
  end if;
  insert into puntos_pedido (id, sede_id, nombre, detalle, whatsapp, orden, activo, mensaje, etiqueta_enlace, en_enlaces)
  values (
    p->>'id', (p->>'sede_id')::int, trim(p->>'nombre'), coalesce(p->>'detalle', ''),
    regexp_replace(p->>'whatsapp', '\D', '', 'g'), coalesce((p->>'orden')::int, 0),
    coalesce((p->>'activo')::boolean, true), coalesce(p->>'mensaje', 'Hola! Quiero ordenar'),
    coalesce(p->>'etiqueta_enlace', ''), coalesce((p->>'en_enlaces')::boolean, true)
  )
  on conflict (id) do update set
    sede_id = excluded.sede_id, nombre = excluded.nombre, detalle = excluded.detalle,
    whatsapp = excluded.whatsapp, orden = excluded.orden, activo = excluded.activo,
    mensaje = excluded.mensaje, etiqueta_enlace = excluded.etiqueta_enlace, en_enlaces = excluded.en_enlaces;
  return json_build_object('ok', true);
end $$;

-- ── Ajustes generales ───────────────────────────────────────────────────────

create or replace function admin_guardar_ajustes(p_clave text, a jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  update config set ajustes = a where id = 1;
  return json_build_object('ok', true);
end $$;

-- ── Permisos ────────────────────────────────────────────────────────────────

grant execute on function admin_verificar(text) to anon, authenticated;
grant execute on function admin_cambiar_clave(text, text) to anon, authenticated;
grant execute on function admin_restablecer_clave_sede(text, int, text) to anon, authenticated;
grant execute on function admin_guardar_producto(text, jsonb) to anon, authenticated;
grant execute on function admin_borrar_producto(text, text) to anon, authenticated;
grant execute on function admin_guardar_categoria(text, jsonb) to anon, authenticated;
grant execute on function admin_borrar_categoria(text, text) to anon, authenticated;
grant execute on function admin_guardar_punto(text, jsonb) to anon, authenticated;
grant execute on function admin_guardar_ajustes(text, jsonb) to anon, authenticated;
