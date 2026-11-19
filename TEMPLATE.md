# Usar este catálogo para otro negocio

Catálogo con pedidos por WhatsApp, registro de pedidos y panel de administración.
Clonarlo para un negocio nuevo toma unos 15 minutos.

## 1. Marca (un archivo)
Edita `src/business.config.ts`: nombre, WhatsApp, textos SEO, medios de pago y moneda.
Reemplaza el logo en `src/assets/` y actualiza el import de ese archivo.
Los colores están en `src/styles.css` (variables `--primary`, `--gradient-brand`, etc.).

## 2. Supabase (base de datos propia para cada negocio)
1. Crea un proyecto en supabase.com.
2. En el SQL Editor crea las tablas `config`, `categorias` y `productos`, y luego ejecuta `supabase/migrations/20261119_pedidos.sql`.
3. Pon `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env` (local) o en las variables de entorno de Netlify.

## 3. Publicar
Conecta el repo a Netlify (`netlify.toml` ya viene incluido).
Entra a `/admin`, **cambia la contraseña por defecto** y carga los productos.

## 4. Legal
Completa los campos `[...]` en `src/routes/politica-de-privacidad-y-uso-de-datos.tsx`.

## Pendiente antes de venderlo a terceros
- El login del admin compara la contraseña en el navegador, y esa contraseña se puede leer
  desde la tabla `config` con la anon key. Hay que migrarlo a Supabase Auth y cerrar las
  políticas RLS de `pedidos` (ver los comentarios en la migración).
