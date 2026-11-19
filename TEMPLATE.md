# Usar este catálogo para otro negocio

Catálogo con pedidos por WhatsApp, registro de pedidos y panel de administración.
Clonarlo para un negocio nuevo toma unos 15 minutos.

## 1. Marca (un archivo)
Edita `src/business.config.ts`: nombre, WhatsApp, textos SEO, medios de pago y moneda.
Reemplaza el logo en `src/assets/` y actualiza el import de ese archivo.
Los colores están en `src/styles.css` (variables `--primary`, `--gradient-brand`, etc.).

## 2. Supabase (base de datos propia para cada negocio)
1. Crea un proyecto en supabase.com.
2. En el SQL Editor crea las tablas `config`, `categorias` y `productos`, y luego ejecuta, en orden, los archivos de `supabase/migrations/`.
4. Zonas de domicilio: edita las ciudades, sedes y barrios sugeridos en `src/lib/delivery.ts` (o directo en /admin → Envíos).
3. Pon `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env` (local) o en las variables de entorno de Netlify.

## 3. Publicar
Conecta el repo a Netlify (`netlify.toml` ya viene incluido).
Entra a `/admin` con el usuario administrador y carga los productos.

## 4. Legal
Completa los campos `[...]` en `src/routes/politica-de-privacidad-y-uso-de-datos.tsx`.

## Administrador único
El admin usa Supabase Auth y solo existe **un** usuario autorizado:
1. Supabase → Authentication → Users → *Add user* (email + contraseña).
2. Desactiva *Allow new users to sign up*.
3. Pon ese email en `20261121_auth_deals_apex.sql` antes de ejecutarla.

## Apex (CRM)
En /admin → Negocio → *Conexión con Apex*, pega la URL del webhook y activa el envío.
Cada solicitud marcada como ganada o perdida llega a Apex como un deal, con el pedido,
el cliente (identificado por su teléfono), sus métricas históricas y sus notas.
El envío lo hace Supabase (pg_net), así que la URL nunca llega al navegador.
