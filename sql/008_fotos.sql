-- ============================================================================
-- Fotos de productos: subir desde cualquier celular o computador en /admin.
--
-- Seguridad sin servidores extra: para subir, el panel pide un permiso temporal
-- (10 minutos) con la contraseña del dueño. Supabase Storage solo acepta archivos
-- dentro de la carpeta de un permiso vigente, solo imágenes y hasta 2 MB.
-- Ejecutar después de 007_panel_negocio.sql. Se puede ejecutar más de una vez.
-- ============================================================================

-- Carpeta pública de fotos (lectura pública para mostrarlas en el catálogo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Permisos de subida temporales
create table if not exists permisos_subida (
  token   text primary key,
  expira  timestamptz not null
);
alter table permisos_subida enable row level security;  -- nadie la lee directo

-- El panel pide un permiso con la contraseña del dueño
create or replace function admin_permiso_subida(p_clave text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  r json;
  t text;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  delete from permisos_subida where expira < now();  -- limpieza
  t := encode(gen_random_bytes(18), 'hex');
  insert into permisos_subida (token, expira) values (t, now() + interval '10 minutes');
  return json_build_object('ok', true, 'token', t);
end $$;
grant execute on function admin_permiso_subida(text) to anon, authenticated;

-- Usada por la política de Storage (se ejecuta como dueño para leer la tabla)
create or replace function permiso_subida_vigente(p_token text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from permisos_subida where token = p_token and expira > now());
$$;
grant execute on function permiso_subida_vigente(text) to anon, authenticated;

-- Subir: solo dentro de la carpeta <token>/ de un permiso vigente
drop policy if exists "subir fotos con permiso" on storage.objects;
create policy "subir fotos con permiso" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'productos'
    and public.permiso_subida_vigente((storage.foldername(name))[1])
  );
