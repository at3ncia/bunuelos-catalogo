# Operación del catálogo — Los Buñuelos Los Originales

Guía para el día a día. Casi todo se cambia desde la web, sin tocar código ni publicar.

## Quién usa qué

| Página | Quién | Para qué |
|---|---|---|
| `/` | Clientes | Ver el menú y pedir por WhatsApp |
| `/links` | Clientes (bio de Instagram, QR) | Botones de WhatsApp y acceso al menú |
| `/sede` | Encargado de cada ciudad | Marcar lo que **se acabó hoy** |
| `/admin` | Dueño | Productos, precios, categorías, WhatsApp, horarios, claves |

## Qué se cambia desde `/admin` (sin pedir cambios de código)

- **Productos:** crear, editar precio, nombre, descripción y foto (enlace), ocultar o borrar.
- **Promos por día:** en un producto, activa "Solo ciertos días" (por ejemplo, el Martes 2x1). Aparece solo esos días.
- **Categorías:** nombre, orden y color. El texto encima del color se ajusta solo para que se lea.
- **WhatsApp:** número, mensaje inicial y texto del botón de cada punto de pedido. Lo mismo alimenta el catálogo y `/links`.
- **Ajustes:** título y subtítulo de la portada, Instagram, botón dorado de `/links`, medios de pago.
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
- Subir fotos desde el celular (hoy se pega un enlace).

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

Después del paso 8, define la contraseña del dueño (una sola vez; luego se cambia desde `/admin`):

```sql
update config set clave_admin_hash = crypt('TU_CLAVE_AQUI', gen_salt('bf')) where id = 1;
```

Reglas de contraseñas: mínimo 8 caracteres, solo letras y números, al menos una mayúscula y un número.
