-- Imitación mínima de Supabase para probar los scripts de sql/ en un Postgres vacío
-- (roles, esquema storage y las tablas base que se crearon antes de 001).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema public;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;

create table if not exists config (id int primary key, nombre text default '', whatsapp text default '', logo text default '');
insert into config (id) values (1) on conflict do nothing;
create table if not exists categorias (id text primary key, nombre text not null, orden int not null default 0);
create table if not exists productos (
  id text primary key, nombre text not null, descripcion text not null default '', precio int not null default 0,
  categoria_id text references categorias(id), foto text not null default '', disponible boolean not null default true
);
