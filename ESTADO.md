# Estado del proyecto y todo lo pendiente

Corte: 27 de noviembre de 2026. Para retomar en un chat nuevo, empezar leyendo este archivo,
`CLAUDE.md` (reglas), `OPERACION.md` (uso del negocio) y `APEX.md` (IA de WhatsApp).

---

## 1. Dónde está todo

- **Repositorio:** `at3ncia/bunuelos-catalogo`.
- **Borrador:** rama `claude/inspiring-sagan-1f18ej`, con 14 cambios. **Nada está publicado:**
  la web que ven los clientes (`main`) sigue igual.
- **Web:** Netlify publica solo `main` (https://bunuelos-catalogo.netlify.app). Las ramas y los
  PR ya no compilan en Netlify, para no gastar créditos.
- **Base de datos:** Supabase, proyecto `cbrvghvbyoicumvdvtdv`. Una sola base para las dos ciudades.
- **APEX:** organizaciones LOS BUÑUELOS CARTAGENA (954) y LOS BUÑUELOS BARRANQUILLA (922).

## 2. Lo que quedó construido (en el borrador)

| Área | Qué hay |
|---|---|
| Catálogo `/` | Formulario de entrega arreglado en celular; casilla opcional de autorización de promociones (Ley 1581); mensaje de WhatsApp con negritas, formato compacto y cierre |
| Política de datos | Llena con datos de Cámara de Comercio y RUT (Diana Carolina Belalcázar Padilla, NIT 1047368628-7) |
| `/links` | Rediseño: estado de domicilios en vivo, botón del menú destacado, tarjetas de WhatsApp por punto y botones extra |
| `/sede` | Pedidos con filtro por fechas (solo lectura, sin borrar); disponibilidad con buscador, categorías con agotados y fotos; distintivo 🤖 IA |
| `/admin` · Resumen | 6 indicadores comparados con el periodo anterior y gráficas: ventas, mapa de días y horas, más y menos vendidos, barrios, sedes y clientes nuevos o que repiten. Periodos desde hoy hasta 10 años, por sede |
| `/admin` · Clientes | Un cliente = un teléfono; fichas Dormidos, Frecuentes, Nuevos y Top; ficha con historial; WhatsApp con mensaje listo; borrar datos (Ley 1581) |
| `/admin` · Pedidos | Borrar pedido; filtro por fechas y años; pendientes de más de 30 días se borran solos; ventas de la IA con 🤖 |
| `/admin` · Promos | Pausar y borrar desde la lista; estado arriba; buscador de producto; frecuencia (cada visita, 1 vez al día, 1 sola vez) y momento del día |
| `/admin` · Categorías | Arrastrar desde los 6 puntos; agregar varios productos con buscador |
| `/admin` · Links | Editor con vista previa en vivo en un celular; barra de guardar arriba |
| `/admin` · Ajustes | Pasos numerados; vista previa (portada, formulario y mensaje); opciones como fichas; mensaje de WhatsApp configurable; agotados con reinicio automático (1 h antes de abrir) y "Reiniciar" por sede |
| `/admin` · Claves | Genera la clave de la IA (APEX) |
| API para la IA | `rpc/ia`: menú de hoy por punto, domicilio por barrio, registrar pedido, comprobante y estado |
| Automatización | Capturas automáticas en cada PR; los SQL se prueban en una base desechable; los SQL se aplican solos al fusionar a `main` si existe el secreto `SUPABASE_DB_URL` |

## 3. Lo que falta, en orden

### A. Para publicar la web (tú, unos 15 minutos)
1. **Base de datos:** pegar en Supabase → SQL Editor, en orden: `sql/011` a `sql/016`. Sirve volver
   a pegar alguno: se pueden ejecutar más de una vez. Otra opción: guardar en GitHub el secreto
   `SUPABASE_DB_URL` (ver `OPERACION.md` → "Cómo se publica") y se aplican solos.
2. **Publicar:** fusionar la rama `claude/inspiring-sagan-1f18ej` a `main`. Lo puede hacer el
   próximo chat con un pull request: tú lo apruebas y lo fusionas. Netlify publica solo.
3. **Revisar en el celular** la web publicada: catálogo, `/links`, `/sede` y `/admin`.
4. **Clave de la IA:** `/admin → Claves → Generar clave de la IA`. Guárdala (se muestra una sola vez).
5. **Tarifas de Barranquilla:** `/admin → Domicilios → Barranquilla → Pegar lista` con
   `apex/tarifas-barranquilla-para-pegar.txt`.
6. **Correo de la política de datos:** definir el correo de atención al cliente y reemplazar
   `[CORREO DE ATENCIÓN AL CLIENTE]` (3 veces) en
   `src/routes/politica-de-privacidad-y-uso-de-datos.tsx`.

**Al publicar, ten en cuenta:**
- Los mensajes de pedido llegan con el **formato nuevo** (negritas y compacto). Se apaga en
  Ajustes → Mensaje de WhatsApp.
- Los **pendientes de más de 30 días se borran** la primera vez que alguien abra Pedidos.
- La **hora de reinicio de agotados** pasa a automática; en Ajustes → Agotados sale un botón "Aplicar".

### B. APEX (tú, cuando tengas Meta, APEX pagado y créditos)
Lista detallada en `APEX.md` → "Estado".
1. Portafolio comercial de Meta y conexión de los 3 WhatsApp + Instagram.
2. En la herramienta `plataforma` de cada organización (165 en 922, 166 en 954), reemplazar
   `PEGAR_CLAVE_PUBLICA_SUPABASE` (2 veces) y `PEGAR_CLAVE_DE_LA_IA`.
3. Asignar canales: Ventas Cartagena 🧡 (1979) a los 2 WhatsApp de Cartagena; Instagram 🧡 (1980)
   a Instagram; asistente 550 al WhatsApp de Barranquilla.
4. Completar en Ventas Cartagena los `[PENDIENTE]`: Nequi, Bancolombia y horario. Configurar
   también el horario del asistente.
5. Crear las columnas del pipeline de conversaciones en las 2 organizaciones:
   📥 Entrada (sin columna), 🙋 Ayuda humana, 💸 Venta por confirmar, 🛵 Por entregar y ♻️ Reiniciar.
6. Automatizaciones:
   - "VOLVER AL CICLO 🤖" (1075, Barranquilla): disparador "entra a ♻️ Reiniciar". Crear la misma
     en Cartagena.
   - Reinicio automático: más de 8 horas en 🛵 Por entregar → la misma automatización.
   - "💸 Deal" (1073, Barranquilla): la nota apunta a la organización 953 (JHUYKE SERVICES), hay que
     corregirla. Mover a 💸 Venta por confirmar sin quitar la IA. Crear la misma en Cartagena.
   - Etapas de los deals: Pedido → Esperando pago → Ganado / Perdido (hoy hay etapas llamadas "-").
7. Cuando el handoff tenga su columna "🙋 Ayuda humana", apuntar ahí la regla `humano` de los 3
   asistentes.
8. Borrar el skill `tarifas_domicilio_barranquilla` (273) después de pegar las tarifas (A.5).
9. Plantilla de WhatsApp "¿Cómo te llegaron los buñuelos?" para el día siguiente a la entrega,
   y plantillas para campañas.
10. **Prueba con un número propio antes de abrir:** pedir el menú, pedir algo agotado, dar un
    barrio inexistente, registrar con transferencia + pantallazo, revisar que aparezca en `/sede`
    con 🤖 IA, confirmar y probar ♻️ Reiniciar (que la IA ya no recuerde el pedido anterior).

### C. Para construir en un próximo chat (con claves de terceros)
- **Con la API de APEX:** al confirmar o cancelar un pedido en la plataforma, mover el chat a
  🛵 Por entregar y marcar el deal Ganado o Perdido. Sincronizar cada noche etiquetas y campos de
  clientes para segmentar campañas (dormido, frecuente, nuevo, top, acepta-promos, cliente-ia, sede,
  barrio, compras, gasto, última compra, favorito). Se haría con Supabase Edge Functions; la clave
  va como secreto de Supabase.
- **Con Bold:** link de pago por pedido con el total exacto (la IA lo pide con
  `metodo_pago: "link"`). Aviso de pago de Bold → pedido confirmado solo (`confirmado_por = 'bold'`).
  Si el cliente cambia el pedido, sale un link nuevo y el anterior deja de servir. La tabla
  `pedidos` ya tiene `pago_proveedor` y `pago_referencia`.
- **`conversacion_url`:** verificar si APEX le da a la IA el enlace o el id del chat para guardarlo
  en el pedido. Así el botón "Ver la conversación" de `/sede` funciona.

### D. Mejoras pendientes (sin terceros)
- Dividir `src/routes/admin.tsx` (~3.000 líneas) en un archivo por pestaña. Resumen y Clientes ya
  están aparte, en `src/components/`.
- Fidelización: "cada N pedidos, uno gratis", contado por teléfono.
- Resumen semanal automático al correo o WhatsApp del dueño.
- Exportar clientes y ventas a Excel.
- `sql/001_sedes.sql` no se puede ejecutar dos veces (ya corrió en producción; el sistema
  automático no lo repite).
- Al llegar al final de la página de Ajustes en PC, las pestañas de la vista previa quedan detrás
  de la barra de guardar.
- `npm run lint` marca errores de formato (prettier) que ya estaban antes; la compilación funciona.
- Los "puntos" de pedido (Terminal · Castellana, Bocagrande, Barranquilla) y su `punto_id` deben
  coincidir con los de APEX: `ctg-terminal-castellana`, `ctg-bocagrande`, `baq-centro`.

## 4. Datos útiles para el próximo chat

**APEX**
| Qué | Barranquilla (922) | Cartagena (954) |
|---|---|---|
| Asistente de ventas | 550 "ASISTENTE IA 🧡" | 1979 "Ventas Cartagena 🧡" |
| Asistente Instagram | — | 1980 "Instagram 🧡" |
| Herramienta `plataforma` | 165 | 166 |
| Eventos | 113–117 | 118–123 (123 = enviado_a_links) |
| Pipeline de conversaciones | 1554 (ASESOR🧡 7765, PAGO CONFIRMADO 7766, PEDIDO EN CAMINO 7767, VOLVER AL CICLO 7768) | 1627 (por defecto, por rehacer) |
| Pipeline de deals | 1555 (Pedidos🧡🔥 7772) | 1628 |
| Automatizaciones | 1073 💸 Deal · 1075 VOLVER AL CICLO | ninguna |
| Usuario dueño | 531 | 531 |

- Modelo de los 3 asistentes: GPT-5.6 Luna (id 46). También está GPT-6 Luna (id 51) por si se
  quiere probar.
- Instrucciones versionadas en `apex/`. Respaldo de Barranquilla:
  `apex/respaldo-barranquilla-2026-11-27.md`.

**Cómo probar sin Supabase real**
- SQL: `scripts/prueba-sql/probar.sh` con un Postgres vacío (`PRUEBA_DB_URL`); los casos van en
  `scripts/prueba-sql/funciones.sql`.
- Pantallas: `npx vite preview --port 4173` + `node scripts/capturas.cjs carpeta` (datos de prueba).
- En celular: 390×844 y 360×640. En PC: 1366×768.

**Forma de trabajar acordada con el dueño**
- Todo fácil y a prueba de errores para personal poco experto y con rotación (`CLAUDE.md`).
- Enviar capturas de cada cambio. Coherencia visual: interruptores verdes "Activa/Visible",
  confirmación antes de borrar, guardar arriba y vista previa en vivo donde aplique.
- No gastar créditos de Netlify en pruebas.
- Avisar cuando algo se pueda automatizar.

## 5. Mensaje sugerido para abrir el chat nuevo

> Hola. Seguimos con el catálogo de Los Buñuelos Los Originales (repo `at3ncia/bunuelos-catalogo`,
> rama `claude/inspiring-sagan-1f18ej`). Lee primero `ESTADO.md`, `CLAUDE.md`, `OPERACION.md` y
> `APEX.md`. Hoy quiero: [publicar la web / conectar APEX / Bold / …]. Ya hice: [SQL pegados sí/no,
> clave de la IA sí/no, Meta y APEX sí/no].
