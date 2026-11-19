-- ═══════════════════════════════════════════════════════════════════════════
-- 1 usuario admin (Supabase Auth) + solicitudes como deals + webhook a Apex.
-- Ejecutar DESPUÉS de las migraciones 20261119 y 20261120.
--
-- ANTES de ejecutar:
--   1. Supabase → Authentication → Users → "Add user": crea TU usuario (email + contraseña).
--   2. Authentication → Sign In / Providers → desactiva "Allow new users to sign up".
--   3. Cambia el email de abajo por el de ese usuario.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Único administrador ──────────────────────────────────────
create table if not exists public.admin_owner (
  singleton boolean primary key default true check (singleton),  -- máximo 1 fila
  user_id uuid not null references auth.users(id) on delete cascade
);
alter table public.admin_owner enable row level security;
revoke all on public.admin_owner from anon, authenticated;

insert into public.admin_owner (user_id)
select id from auth.users where email = 'CAMBIA-ESTE-EMAIL@ejemplo.com'
on conflict (singleton) do update set user_id = excluded.user_id;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_owner where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ─── Catálogo: lectura pública, escritura solo admin ──────────
do $$
declare t text;
begin
  foreach t in array array['config','categorias','productos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_lectura" on public.%I', t, t);
    execute format('create policy "%s_lectura" on public.%I for select to anon, authenticated using (true)', t, t);
    execute format('drop policy if exists "%s_admin" on public.%I', t, t);
    execute format('create policy "%s_admin" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- La contraseña vieja ya no vive en una tabla pública
alter table public.config drop column if exists admin_user;
alter table public.config drop column if exists admin_pass;

-- ─── Domicilios: 100% internos ────────────────────────────────
drop policy if exists "zonas_lectura" on public.zonas_envio;
drop policy if exists "zonas_escritura" on public.zonas_envio;
drop policy if exists "zonas_admin" on public.zonas_envio;
create policy "zonas_admin" on public.zonas_envio for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Lista pública SOLO de nombres de barrio (sin precios ni zonas) para el autocompletado
create or replace function public.barrios_publicos()
returns table (ciudad text, barrio text)
language sql stable security definer set search_path = public as $$
  select distinct z.ciudad, b from zonas_envio z, unnest(z.barrios) b where z.activo order by 1, 2;
$$;
grant execute on function public.barrios_publicos() to anon, authenticated;

-- ─── Solicitudes (pedidos) como deals ─────────────────────────
alter table public.pedidos drop constraint if exists pedidos_estado_check;
update public.pedidos set estado = case estado when 'entregado' then 'ganado' when 'cancelado' then 'perdido' else 'pendiente' end
  where estado not in ('pendiente','ganado','perdido');
alter table public.pedidos alter column estado set default 'pendiente';
alter table public.pedidos drop constraint if exists pedidos_estado_check;
alter table public.pedidos add constraint pedidos_estado_check check (estado in ('pendiente','ganado','perdido'));
alter table public.pedidos add column if not exists motivo_perdida text;
alter table public.pedidos add column if not exists cerrado_at timestamptz;
alter table public.pedidos add column if not exists apex_request_id bigint;
alter table public.pedidos add column if not exists apex_enviado_at timestamptz;

drop policy if exists "pedidos_insert_publico" on public.pedidos;
drop policy if exists "pedidos_admin_select" on public.pedidos;
drop policy if exists "pedidos_admin_update" on public.pedidos;
drop policy if exists "pedidos_insert_publico" on public.pedidos;
create policy "pedidos_insert_publico" on public.pedidos for insert to anon, authenticated
  with check (estado = 'pendiente');
drop policy if exists "pedidos_admin" on public.pedidos;
create policy "pedidos_admin" on public.pedidos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Domicilio interno sugerido al entrar la solicitud (según barrio → zona)
create or replace function public.pedido_asignar_zona() returns trigger
language plpgsql security definer set search_path = public as $$
declare zz record;
begin
  select id, precio into zz from zonas_envio
   where activo and ciudad = new.ciudad
     and exists (select 1 from unnest(barrios) b where lower(b) = lower(trim(new.barrio)))
   order by orden limit 1;
  -- lo que venga del navegador en estos campos se ignora
  new.estado := 'pendiente'; new.apex_request_id := null; new.apex_enviado_at := null; new.cerrado_at := null;
  new.zona_id := zz.id;
  new.domicilio := coalesce(zz.precio, 0);
  return new;
end $$;
drop trigger if exists trg_pedido_zona on public.pedidos;
create trigger trg_pedido_zona before insert on public.pedidos
  for each row execute function public.pedido_asignar_zona();

-- ─── Clientes y notas: solo admin ─────────────────────────────
drop policy if exists "clientes_admin" on public.clientes;
create policy "clientes_admin" on public.clientes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.notas_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  pedido_id uuid references public.pedidos(id) on delete set null,
  texto text not null check (char_length(texto) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists notas_cliente_idx on public.notas_cliente (cliente_id, created_at desc);
alter table public.notas_cliente enable row level security;
drop policy if exists "notas_admin" on public.notas_cliente;
create policy "notas_admin" on public.notas_cliente for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── Integración Apex (URL privada, solo admin) ───────────────
create table if not exists public.integraciones (
  singleton boolean primary key default true check (singleton),
  apex_webhook_url text,
  activo boolean not null default false
);
alter table public.integraciones enable row level security;
drop policy if exists "integraciones_admin" on public.integraciones;
create policy "integraciones_admin" on public.integraciones for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
insert into public.integraciones (singleton) values (true) on conflict do nothing;

create extension if not exists pg_net;

-- Arma el deal completo: pedido + cliente + métricas históricas + notas
create or replace function public.deal_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'evento', 'deal.' || p.estado,
    'fuente', 'catalogo-bunuelos',
    'deal', jsonb_build_object(
      'id', p.id, 'estado', p.estado, 'motivo_perdida', p.motivo_perdida,
      'creado', p.created_at, 'cerrado', p.cerrado_at,
      'productos', p.items, 'subtotal', p.total, 'domicilio', p.domicilio,
      'total_con_domicilio', p.total + p.domicilio, 'medio_pago', p.medio_pago,
      'ciudad', p.ciudad, 'barrio', p.barrio, 'zona_id', p.zona_id, 'direccion', p.direccion),
    'cliente', jsonb_build_object(
      'id', c.id, 'telefono', c.telefono, 'nombre', c.nombre,
      'ciudad', c.ciudad, 'barrio', c.barrio, 'direccion', c.direccion, 'desde', c.created_at),
    'metricas', (select jsonb_build_object(
        'solicitudes', count(*),
        'ganados', count(*) filter (where estado = 'ganado'),
        'perdidos', count(*) filter (where estado = 'perdido'),
        'valor_total', coalesce(sum(total) filter (where estado = 'ganado'), 0),
        'ticket_promedio', coalesce(avg(total) filter (where estado = 'ganado'), 0),
        'primer_pedido', min(created_at), 'ultimo_pedido', max(created_at))
      from pedidos where cliente_id = c.id),
    'notas', coalesce((select jsonb_agg(jsonb_build_object('fecha', n.created_at, 'texto', n.texto, 'pedido_id', n.pedido_id)
                        order by n.created_at desc) from notas_cliente n where n.cliente_id = c.id), '[]'::jsonb))
  from pedidos p left join clientes c on c.id = p.cliente_id where p.id = p_id;
$$;

-- Al marcar ganado/perdido: fecha de cierre (BEFORE) y POST al webhook de Apex (AFTER),
-- desde el servidor: la URL nunca llega al navegador.
create or replace function public.pedido_cierre() returns trigger
language plpgsql as $$
begin
  if new.estado in ('ganado','perdido') and new.estado is distinct from old.estado then
    new.cerrado_at := now();
  elsif new.estado = 'pendiente' then
    new.cerrado_at := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_pedido_cierre on public.pedidos;
create trigger trg_pedido_cierre before update of estado on public.pedidos
  for each row execute function public.pedido_cierre();

create or replace function public.apex_enviar(p_id uuid) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare cfg record; rid bigint;
begin
  select * into cfg from integraciones limit 1;
  if not coalesce(cfg.activo, false) or cfg.apex_webhook_url is null then return null; end if;
  select net.http_post(url := cfg.apex_webhook_url, body := public.deal_payload(p_id),
                       headers := '{"Content-Type":"application/json"}'::jsonb) into rid;
  update pedidos set apex_request_id = rid, apex_enviado_at = now() where id = p_id;
  return rid;
end $$;
revoke execute on function public.apex_enviar(uuid) from anon, authenticated, public;

create or replace function public.pedido_enviar_apex() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado in ('ganado','perdido') and new.estado is distinct from old.estado then
    perform public.apex_enviar(new.id);
  end if;
  return null;
end $$;
drop trigger if exists trg_pedido_apex on public.pedidos;
create trigger trg_pedido_apex after update of estado on public.pedidos
  for each row execute function public.pedido_enviar_apex();

-- Resultado del último envío a Apex (para mostrar ✓/✗ en el admin)
create or replace function public.apex_estado(p_ids bigint[])
returns table (id bigint, status_code int, error text)
language sql stable security definer set search_path = public, net as $$
  select r.id, r.status_code, r.error_msg from net._http_response r
  where r.id = any(p_ids) and public.is_admin();
$$;
grant execute on function public.apex_estado(bigint[]) to authenticated;

-- Reenviar manualmente un deal (si Apex falló o cambiaste notas)
create or replace function public.apex_reenviar(p_id uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  if not public.is_admin() then raise exception 'no autorizado'; end if;
  rid := public.apex_enviar(p_id);
  if rid is null then raise exception 'Webhook de Apex no configurado o inactivo'; end if;
  return rid;
end $$;
grant execute on function public.apex_reenviar(uuid) to authenticated;
