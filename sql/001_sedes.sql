-- ============================================================================
-- Sedes con contraseña propia, disponibilidad por sede y escritura controlada
-- Ejecutar en Supabase → SQL Editor. Las contraseñas iniciales NO van aquí:
-- se cargan con 002_seed_sedes.sql (no versionado).
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Tablas ──────────────────────────────────────────────────────────────────

create table if not exists sedes (
  id            serial primary key,
  nombre        text not null,
  ciudad        text not null,
  direccion     text not null default '',
  whatsapp      text not null default '',
  clave_hash    text not null,
  intentos      int  not null default 0,
  bloqueado_hasta timestamptz,
  activa        boolean not null default true
);

-- Disponibilidad por sede (el menú es uno solo, compartido)
create table if not exists sede_productos (
  sede_id     int  not null references sedes(id) on delete cascade,
  producto_id text not null references productos(id) on delete cascade,
  disponible  boolean not null default true,
  primary key (sede_id, producto_id)
);

-- ── Seguridad: nadie escribe directo; todo pasa por funciones ───────────────

alter table sedes         enable row level security;
alter table sede_productos enable row level security;

-- Lectura pública de sedes SIN el hash de la clave
create or replace view sedes_publicas as
  select id, nombre, ciudad, direccion, whatsapp, activa from sedes;
grant select on sedes_publicas to anon, authenticated;

create policy "lectura publica sede_productos" on sede_productos
  for select using (true);

-- Sin políticas de escritura para anon en sedes ni sede_productos.
-- Las tablas originales productos/categorias/config se mantienen como estaban.

-- ── Validación de contraseñas ───────────────────────────────────────────────
-- Mínimo 8, solo letras y números, al menos una mayúscula y un número.

create or replace function validar_clave_nueva(p_clave text)
returns void language plpgsql as $$
begin
  if length(p_clave) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres';
  end if;
  if p_clave !~ '^[A-Za-z0-9]+$' then
    raise exception 'Solo se permiten letras y números';
  end if;
  if p_clave !~ '[A-Z]' then
    raise exception 'Debe tener al menos una mayúscula';
  end if;
  if p_clave !~ '[0-9]' then
    raise exception 'Debe tener al menos un número';
  end if;
end $$;

-- ── Login: verifica clave con límite de intentos ────────────────────────────
-- Devuelve json {ok, ...}. NO lanza error en clave incorrecta, para que el
-- contador de intentos se guarde (un raise revertiría la transacción).
-- 5 intentos fallidos bloquean la sede 15 minutos.

create or replace function login_sede(p_sede int, p_clave text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  s sedes%rowtype;
begin
  select * into s from sedes where id = p_sede and activa;
  if not found then
    return json_build_object('ok', false, 'error', 'Sede no encontrada');
  end if;

  if s.bloqueado_hasta is not null and s.bloqueado_hasta > now() then
    return json_build_object('ok', false, 'error', 'Demasiados intentos. Intenta en unos minutos');
  end if;

  if s.clave_hash = crypt(p_clave, s.clave_hash) then
    update sedes set intentos = 0, bloqueado_hasta = null where id = p_sede;
    return json_build_object('ok', true, 'id', s.id, 'nombre', s.nombre, 'ciudad', s.ciudad);
  end if;

  update sedes
     set intentos = case when intentos + 1 >= 5 then 0 else intentos + 1 end,
         bloqueado_hasta = case when intentos + 1 >= 5 then now() + interval '15 minutes' end
   where id = p_sede;

  return json_build_object('ok', false, 'error', 'Contraseña incorrecta');
end $$;

-- ── Cambiar disponibilidad de un producto (requiere contraseña de la sede) ──

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
  insert into sede_productos (sede_id, producto_id, disponible)
  values (p_sede, p_producto, p_disponible)
  on conflict (sede_id, producto_id) do update set disponible = excluded.disponible;
  return json_build_object('ok', true);
end $$;

-- ── Cambiar contraseña de la sede (requiere la actual) ──────────────────────
-- Errores de validación de la nueva clave sí lanzan excepción (no tocan intentos).

create or replace function cambiar_clave_sede(
  p_sede int, p_actual text, p_nueva text
) returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  r json;
begin
  r := login_sede(p_sede, p_actual);
  if not (r->>'ok')::boolean then
    return r;
  end if;
  perform validar_clave_nueva(p_nueva);
  update sedes set clave_hash = crypt(p_nueva, gen_salt('bf')) where id = p_sede;
  return json_build_object('ok', true);
end $$;

-- Permisos: anon puede ejecutar las funciones, nada más
grant execute on function login_sede(int, text) to anon, authenticated;
grant execute on function set_disponibilidad(int, text, text, boolean) to anon, authenticated;
grant execute on function cambiar_clave_sede(int, text, text) to anon, authenticated;
