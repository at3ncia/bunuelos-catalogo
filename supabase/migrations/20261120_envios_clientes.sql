-- Zonas de domicilio por barrios + perfiles de cliente automáticos.
-- Ejecutar DESPUÉS de 20261119_pedidos.sql.

-- ─── Zonas de envío ─────────────────────────────────────────────
create table if not exists public.zonas_envio (
  id text primary key,
  ciudad text not null check (ciudad in ('Barranquilla','Soledad','Cartagena')),
  nombre text not null,
  precio numeric not null default 0 check (precio >= 0),
  barrios text[] not null default '{}',
  activo boolean not null default true,
  orden int not null default 0
);
alter table public.zonas_envio enable row level security;
drop policy if exists "zonas_lectura" on public.zonas_envio;
create policy "zonas_lectura" on public.zonas_envio for select to anon, authenticated using (true);
-- ⚠️ TEMPORAL hasta migrar el admin a Supabase Auth:
drop policy if exists "zonas_escritura" on public.zonas_envio;
create policy "zonas_escritura" on public.zonas_envio for all to anon, authenticated using (true) with check (true);

-- ─── Pedidos: datos de envío ────────────────────────────────────
alter table public.pedidos add column if not exists ciudad text;
alter table public.pedidos add column if not exists barrio text;
alter table public.pedidos add column if not exists zona_id text;
alter table public.pedidos add column if not exists domicilio numeric not null default 0;
alter table public.pedidos add column if not exists cliente_id uuid;

-- ─── Clientes: se crean/actualizan solos con cada pedido ────────
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  telefono text not null unique,           -- solo dígitos
  nombre text not null,
  ciudad text,
  barrio text,
  direccion text,
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clientes enable row level security;
-- ⚠️ TEMPORAL hasta migrar el admin a Supabase Auth:
drop policy if exists "clientes_admin" on public.clientes;
create policy "clientes_admin" on public.clientes for all to anon, authenticated using (true) with check (true);

create or replace function public.pedido_upsert_cliente() returns trigger
language plpgsql security definer set search_path = public as $$
declare tel text := regexp_replace(new.cliente_telefono, '\D', '', 'g');
begin
  insert into clientes (telefono, nombre, ciudad, barrio, direccion)
  values (tel, new.cliente_nombre, new.ciudad, new.barrio, new.direccion)
  on conflict (telefono) do update
    set nombre = excluded.nombre, ciudad = excluded.ciudad, barrio = excluded.barrio,
        direccion = excluded.direccion, updated_at = now()
  returning id into new.cliente_id;
  return new;
end $$;

drop trigger if exists trg_pedido_cliente on public.pedidos;
create trigger trg_pedido_cliente before insert on public.pedidos
  for each row execute function public.pedido_upsert_cliente();

-- Clientes de pedidos anteriores
insert into public.clientes (telefono, nombre, direccion)
select distinct on (t) t, cliente_nombre, direccion
from (select regexp_replace(cliente_telefono, '\D', '', 'g') t, * from public.pedidos order by created_at desc) s
on conflict (telefono) do nothing;
update public.pedidos p set cliente_id = c.id from public.clientes c
where p.cliente_id is null and c.telefono = regexp_replace(p.cliente_telefono, '\D', '', 'g');
