-- Registro de pedidos del catálogo. Ejecutar en Supabase → SQL Editor.
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cliente_nombre text not null check (char_length(cliente_nombre) <= 80),
  cliente_telefono text not null check (char_length(cliente_telefono) <= 20),
  direccion text not null check (char_length(direccion) <= 240),
  medio_pago text not null,
  items jsonb not null,
  total numeric not null check (total >= 0),
  estado text not null default 'nuevo' check (estado in ('nuevo','entregado','cancelado'))
);
create index if not exists pedidos_created_at_idx on public.pedidos (created_at desc);

alter table public.pedidos enable row level security;

-- El catálogo público solo puede INSERTAR pedidos nuevos.
drop policy if exists "pedidos_insert_publico" on public.pedidos;
create policy "pedidos_insert_publico" on public.pedidos
  for insert to anon, authenticated with check (estado = 'nuevo');

-- ⚠️ TEMPORAL: el admin actual no usa Supabase Auth, así que lectura/edición
-- quedan abiertas a la anon key (igual que hoy config/productos).
-- Migrar a Supabase Auth y cambiar "anon" por "authenticated" aquí.
drop policy if exists "pedidos_admin_select" on public.pedidos;
create policy "pedidos_admin_select" on public.pedidos for select to anon, authenticated using (true);
drop policy if exists "pedidos_admin_update" on public.pedidos;
create policy "pedidos_admin_update" on public.pedidos for update to anon, authenticated using (true);
