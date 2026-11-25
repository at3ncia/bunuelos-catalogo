-- Favicon, imagen para compartir y metadatos editables desde el admin.
-- Ejecutar una vez en Supabase → SQL Editor.
alter table public.config add column if not exists favicon text default '';
alter table public.config add column if not exists og_image text default '';
alter table public.config add column if not exists meta_title text default '';
alter table public.config add column if not exists meta_description text default '';
