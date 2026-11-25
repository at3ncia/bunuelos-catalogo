# Los Buñuelos Los Originales — reglas del proyecto

## Regla de oro: "que no haya pierde"

Todo lo que se construya debe ser **fácil y a prueba de errores** para quien lo usa:
clientes que piden desde el celular, encargados de sede con poca experiencia en
tecnología y alta rotación, y el dueño administrando desde el celular.

Antes de dar algo por terminado, revisar:

- **Cero esfuerzo innecesario:** nada de listas largas para elegir (usar buscador),
  nada de escribir lo que se puede tocar, nada de repetir datos que ya se dieron.
- **No se puede equivocar:** valores por defecto sensatos, validación antes de enviar,
  mensajes claros de qué falta, y que un olvido no tenga consecuencias graves
  (ej.: los agotados vuelven solos cada mañana).
- **Nunca perder una venta:** si algo falla (red, Supabase, barrio que no está en la
  lista), el pedido igual debe poder salir por WhatsApp.
- **Se entiende sin explicación:** textos en español de Colombia, botones grandes,
  estado visible (Hay / No hay, Pendiente / Confirmado), colores con texto al lado.
- **Probarlo como el usuario real:** en celular (390×844 y 360×640), con el distintivo
  de Netlify abajo a la derecha, y con Supabase caído.
- **Editable sin código:** lo que el negocio pueda querer cambiar va en `/admin`,
  no fijo en el código.

## Contexto

- Catálogo y pedidos por WhatsApp; ciudades: Cartagena (puntos Terminal · Castellana
  y Bocagrande) y Barranquilla.
- Stack: Vite + React + TanStack Router, Supabase (datos y fotos), Netlify (publica
  cada push a `main`).
- Rutas: `/` catálogo, `/links` linktree, `/sede` encargados, `/admin` dueño.
- Seguridad: la web usa la clave pública de Supabase; toda escritura pasa por funciones
  de Postgres que verifican contraseña (ver `sql/`). Nunca agregar políticas de
  escritura abiertas.
- Cambios de base de datos: nuevo archivo `sql/NNN_nombre.sql`, que se pueda ejecutar
  más de una vez, y anotarlo en `OPERACION.md`.
- Guía del día a día para el negocio: `OPERACION.md`.
