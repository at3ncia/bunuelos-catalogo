# Operación del catálogo — Los Buñuelos Los Originales

Guía para el día a día. Casi todo se cambia desde la web, sin tocar código ni publicar.

## Quién usa qué

| Página | Quién | Para qué |
|---|---|---|
| `/` | Clientes | Ver el menú y pedir por WhatsApp |
| `/links` | Clientes (bio de Instagram, QR) | Botones de WhatsApp y acceso al menú |
| `/sede` | Encargado de cada ciudad | Interruptor **Hay / No hay** y **confirmar pedidos** de su ciudad |
| `/admin` | Dueño | Productos, precios, categorías, WhatsApp, horarios, claves |

## Qué se cambia desde `/admin` (sin pedir cambios de código)

- **Pedidos:** cada pedido enviado desde el catálogo queda registrado con su código (ej. `CAR-04821`, también va en el mensaje de WhatsApp), todos los datos del formulario, barrio y domicilio. Se confirman o cancelan a mano aquí o en `/sede`. Resumen de ventas confirmadas de hoy, 7 y 30 días.
- **Promos:** ventanas emergentes verticales 3:4 (ideal 1080 × 1440) al abrir el menú. Imagen, producto que lleva (el botón lo agrega al pedido), días de la semana y fechas desde/hasta. Cada cliente la ve una vez al día.
- **Domicilios:** precio del domicilio por barrio en Cartagena y Barranquilla. Lista inicial de barrios cargada; "Precio rápido" llena todos los que no tienen precio y luego se ajustan los distintos. También se puede pegar una lista ("Manga, 5000"). Barrio sin precio = "por confirmar". **El cliente nunca ve el precio del domicilio** (para que no elija el barrio más barato): elige su barrio, el mensaje dice "Domicilio: por confirmar" y la sede ve el valor real y el total en Pedidos para responderle.

- **Productos:** crear, editar precio, nombre y descripción, ocultar o borrar.
- **Fotos:** en cada producto, "Subir foto" desde el celular (cámara o galería) o el computador. Se comprime sola (~100-200 KB).
- **Promos por día:** en un producto, activa "Solo ciertos días" (por ejemplo, el Martes 2x1). Aparece solo esos días.
- **Categorías:** nombre, orden y color. El texto encima del color se ajusta solo para que se lea.
- **Links:** la página `/links` completa: texto bajo el logo, botón dorado del menú (texto y mostrar/ocultar), botones extra (Maps, TikTok, apps de domicilio…) y los puntos de WhatsApp (número, mensaje inicial, texto del botón).
- **Ajustes:** título y subtítulo de la portada e Instagram.
- **Formulario del pedido** (en Ajustes): qué datos llena el cliente, en qué orden, cuáles son obligatorios, listas de opciones (medios de pago, "¿Domicilio o recoger?") y el saludo del mensaje de WhatsApp.
- **Horario de domicilios:** días y franjas. Fuera de horario, el catálogo avisa solo cuándo abren. Los **festivos de Colombia se calculan automáticamente** (usan el horario del domingo).
- **Reinicio diario:** la hora en que todo lo marcado como "Se acabó hoy" vuelve a estar disponible.
- **Claves:** restablecer la clave de una ciudad (cuando cambia el personal) y cambiar la tuya.

## Automatizaciones que ya funcionan solas

- Los agotados vuelven a disponibles cada día a la hora de reinicio.
- Los productos con días asignados aparecen y desaparecen solos.
- El aviso de "domicilios cerrados" se muestra según el horario y los festivos.
- Si Supabase falla, el catálogo muestra el último menú que cargó bien (con aviso) en vez de quedarse en blanco.

## Qué sí requiere un cambio de código

- Diseño, colores de marca, logo.
- Campos nuevos (por ejemplo, tamaños o adiciones por producto).
- Imagen de vista previa al compartir el enlace, favicon e íconos de la app (archivos en `public/`: `og-image.png`, `favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`). WhatsApp e Instagram leen solo el `index.html`, por eso no salen de la base de datos.
- Los logos (`public/logo-claro.png`, `public/logo-oscuro.png`).

## Base de datos (Supabase): orden de los scripts

Ejecutar en **SQL Editor → Run**, en este orden, una sola vez cada uno:

1. Tablas base (`config`, `categorias`, `productos`) — ver historial del proyecto
2. `sql/001_sedes.sql` — sedes, contraseñas por sede, funciones de disponibilidad
3. Carga inicial de sedes (no versionada: contiene contraseñas)
4. `sql/003_menu.sql` — menú real
5. `sql/004_reinicio_diario.sql` — "Se acabó por hoy"
6. `sql/005_por_ciudad.sql` — operación por ciudad
7. `sql/006_puntos_pedido.sql` — puntos de pedido con su WhatsApp
8. `sql/007_panel_negocio.sql` — panel del dueño y ajustes editables
9. `sql/008_fotos.sql` — subir fotos de productos desde el panel
10. `sql/009_pedidos_promos_domicilios.sql` — pedidos, promos y domicilio por barrio
11. `sql/010_ocultar_precio_domicilio.sql` — el público ya no puede leer el precio del domicilio

Después del paso 8, define la contraseña del dueño (una sola vez; luego se cambia desde `/admin`):

```sql
update config set clave_admin_hash = crypt('TU_CLAVE_AQUI', gen_salt('bf')) where id = 1;
```

Reglas de contraseñas: mínimo 8 caracteres, solo letras y números, al menos una mayúscula y un número.

## Pagos en línea (Bold u otro) — preparado, pendiente de conectar

La tabla `pedidos` ya tiene `pago_proveedor` y `pago_referencia`. Para que un pago confirme el pedido solo:
1. Crear cuenta y llaves en Bold.
2. Crear una función (Supabase Edge Function o Netlify Function) que reciba el *webhook* de Bold, verifique su firma y marque el pedido como `confirmado` con `confirmado_por = 'bold'`.
3. Agregar el botón "Pagar con Bold" en el formulario del pedido usando el código del pedido como referencia.

## Pendientes

- [ ] **Correo de la política de datos:** definir el correo de atención al cliente (quejas y solicitudes de datos personales) y reemplazar `[CORREO DE ATENCIÓN AL CLIENTE]` en `src/routes/politica-de-privacidad-y-uso-de-datos.tsx` (aparece 3 veces).
