# Conexión con APEX (IA de WhatsApp e Instagram)

## Estado (27 nov 2026)

**Ya configurado en APEX (por Claude):**
- Barranquilla (922): asistente 550 con instrucciones nuevas (`apex/instrucciones-ventas-barranquilla.md`),
  GPT-5.6 Luna, herramienta `plataforma` (id 165), eventos 113–117, 2 follow-ups, paso a humano a la
  columna ASESOR🧡, automatización 💸 Deal con el total real. Respaldo: `apex/respaldo-barranquilla-2026-11-27.md`.
- Cartagena (954): asistentes **Ventas Cartagena 🧡** (1979) e **Instagram 🧡** (1980), GPT-5.6 Luna,
  herramienta `plataforma` (id 166), eventos 118–123, follow-ups y paso a humano.

**Te toca (en la app de APEX, una sola vez):**
1. En la herramienta `plataforma` de cada organización, reemplazar en los encabezados
   `PEGAR_CLAVE_PUBLICA_SUPABASE` (Supabase → Settings → API → clave *anon public*, dos veces) y
   `PEGAR_CLAVE_DE_LA_IA` (/admin → Claves → Generar clave de la IA).
2. Conectar canales: Ventas Cartagena → los 2 WhatsApp de Cartagena; Instagram 🧡 → Instagram;
   asistente 550 → WhatsApp Barranquilla.
3. Cartagena: completar en las instrucciones los `[PENDIENTE]` (Nequi, Bancolombia y horario) y
   configurar el horario del asistente.
4. Crear columnas y automatizaciones (secciones 2 y 3). En "💸 Deal" (Barranquilla) cambiar la
   organización de la nota a la propia (hoy apunta a 953). Crear "💸 Deal" en Cartagena.
5. Barranquilla: pegar `apex/tarifas-barranquilla-para-pegar.txt` en /admin → Domicilios →
   "Pegar lista" (Barranquilla) y luego borrar el skill `tarifas_domicilio_barranquilla` (id 273).
6. Probar con un número de prueba antes de abrir a clientes: pedir menú, un agotado, un barrio que
   no existe, registrar con transferencia + pantallazo, y "♻️ Reiniciar".

Guía para dejar APEX trabajando con la plataforma. Regla de fondo:

- **La plataforma** (Supabase + /admin + /sede) es la verdad de **productos, disponibilidad,
  domicilios, pedidos y ventas**.
- **APEX** es la verdad de **conversaciones, contactos, deals y campañas**.
- Ningún dato se escribe dos veces a mano.

## Mapa

| Organización APEX | Canales | Asistente | Trabajo |
|---|---|---|---|
| LOS BUÑUELOS CARTAGENA (954) | WhatsApp Terminal · Castellana, WhatsApp Bocagrande | **Ventas Cartagena** (uno solo para los dos números) | Vender, cobrar, follow-ups |
| LOS BUÑUELOS CARTAGENA (954) | Instagram | **Instagram** | Dudas frecuentes, comentarios y stories; manda a `/links` |
| LOS BUÑUELOS BARRANQUILLA (922) | WhatsApp Barranquilla | **Ventas Barranquilla** (el actual, id 550) | Vender, cobrar, follow-ups |

Modelo: **GPT-5.6 Luna** en los tres (rápido, barato, lee pantallazos).

---

## 1. Plataforma (ya está hecho, solo activar)

1. Pegar en Supabase `sql/015_clientes_metricas.sql` y `sql/016_api_ia.sql` (o fusionar a `main`
   con el secreto `SUPABASE_DB_URL` configurado).
2. `/admin → Claves → Generar clave de la IA`. Copiarla.
3. Cada asistente de ventas usa **su punto** (`punto_id` en /admin → Links):
   - WhatsApp Terminal · Castellana → `ctg-terminal-castellana`
   - WhatsApp Bocagrande → `ctg-bocagrande`
   - WhatsApp Barranquilla → el `punto_id` de Barranquilla

### Herramientas API que usa la IA (APEX → Herramientas API)

Todas: `POST https://<proyecto>.supabase.co/rest/v1/rpc/<función>`,
encabezados `apikey: <clave pública>` y `Content-Type: application/json`.
`p_clave` (la clave de la IA) va como parámetro fijo, nunca a la vista de la IA.

| Herramienta | Función | Cuándo la usa la IA |
|---|---|---|
| `ver_menu` | `ia_menu` `{p_clave, p_punto}` | Antes de recomendar o dar precios. Solo vende lo que aparece (lo demás está agotado hoy en ese punto) |
| `precio_domicilio` | `ia_domicilio` `{p_clave, p_punto, p_barrio}` | Cuando el cliente da su barrio. Si `encontrado:false` → Ayuda humana |
| `registrar_pedido` | `ia_registrar_pedido` `{p_clave, p}` | Al tener nombre, teléfono, dirección, barrio, productos y medio de pago. Usa el **total que devuelve**, nunca uno calculado por ella |
| `marcar_comprobante` | `ia_comprobante` `{p_clave, p_codigo}` | Cuando el cliente manda el pantallazo después de registrar |
| `estado_pedido` | `ia_estado_pedido` `{p_clave, p_codigo}` | Si el cliente pregunta "¿ya confirmaron?" |

`p` de `registrar_pedido`: `punto_id`, `items` `[{id, cantidad}]` (ids de `ver_menu`), `nombre`,
`telefono`, `direccion`, `barrio`, `metodo_pago` (`efectivo` | `transferencia` | `link`),
`comprobante` (true si ya llegó el pantallazo), `notas`, `conversacion_url`.

Esto reemplaza: la consulta directa a la tabla `productos` (no veía los agotados por sede) y el
skill fijo de tarifas de Barranquilla (se desactualizaba frente a /admin → Domicilios).

---

## 2. Pipeline de conversaciones (en cada organización)

Columnas, en este orden. **El asesor no mueve columnas**, salvo ♻️ Reiniciar.

| Columna | Quién mueve el chat | Qué pasa |
|---|---|---|
| **📥 Entrada** (sin columna) | — | La IA atiende y vende |
| **🙋 Ayuda humana** | La IA (handoff) | Queja, barrio no listado, problema de pago, pedido grande. La IA se quita y el chat queda sin leer |
| **💸 Venta por confirmar** | La IA, al registrar el pedido | El pedido ya está en /sede con 🤖 IA. Falta verificar el pago |
| **🛵 Por entregar** | La plataforma, al confirmar el pago (*cuando haya API de APEX*) | Pedido en preparación o en camino |
| **♻️ Reiniciar** | El asesor (arrastra el chat) | Dispara "Borrón y cuenta nueva" y el chat vuelve solo a Entrada |

Mientras no haya API de APEX, el paso a **🛵 Por entregar** lo hace la IA: cuando el cliente
escribe, consulta `estado_pedido` y, si está confirmado, mueve el chat (herramienta interna
`update_conversation`).

## 3. Automatizaciones

**♻️ Borrón y cuenta nueva** (basada en la actual "VOLVER AL CICLO 🤖", id 1075 en Barranquilla)
- Disparador: el chat entra a la columna **♻️ Reiniciar**.
- Acciones: cerrar conversación (corta el contexto de la IA) → quitar columna (vuelve a Entrada)
  → asignar a la IA → quitar etiquetas de pedido.
- *Probar con un chat de prueba que, al cerrar, la IA no recuerde el pedido anterior.*

**♻️ Reinicio automático**: chats con más de 8 horas en 🛵 Por entregar → misma automatización.
Así, si nadie reinicia, el siguiente pedido de ese cliente empieza limpio.

**💸 Deal** (corregir la actual, id 1073 en Barranquilla)
- La nota se está creando en **otra organización (953 JHUYKE SERVICES)**: cambiar a la propia.
- No quitar la IA ni mandar a "ASESOR🧡": mover a **💸 Venta por confirmar** y dejar la IA.
- Monto: el `total` que devolvió `registrar_pedido` (no uno calculado por la IA).
- Etapas del deal: **Pedido → Esperando pago → Ganado / Perdido** (hoy hay etapas llamadas "-").
- Cuando haya API de APEX, la plataforma marca el deal **Ganado** al confirmar el pedido y
  **Perdido** al cancelarlo.

## 4. Follow-ups (asistentes de ventas)

Dentro de las 24 horas (después, WhatsApp solo permite plantillas):

| Regla | Tiempo | Mensaje (lo redacta la IA, corto) |
|---|---|---|
| Pidió precios y no confirmó | 20 min | Retomar + 1 recomendación del menú |
| Dijo transferencia y no envió pantallazo | 15 min | Recordar enviar el comprobante |
| Link de pago sin pagar *(cuando haya Bold)* | 30 min | Reenviar el link |

Límite: 2 follow-ups por conversación. Revisar en APEX si `time_after` está en minutos u horas.

**Con plantilla de WhatsApp (fuera de la ventana de 24 h):** "¿Cómo te llegaron los buñuelos?"
al día siguiente de la entrega, y las campañas a segmentos.

## 5. Segmentación para campañas (cuando haya API de APEX)

Cada noche la plataforma actualiza cada contacto en APEX:
- Etiquetas: `dormido`, `frecuente`, `nuevo`, `top`, `acepta-promos`, `cliente-ia`, sede, barrio.
- Campos: compras, total gastado, última compra, producto favorito.

En APEX se cruzan con etapa del pipeline, conversaciones y respuesta a campañas anteriores.
**Las campañas solo van a contactos con `acepta-promos`** (Ley 1581 y para que WhatsApp no
bloquee el número por reportes).

## 6. Pendiente de terceros

- **API de APEX** (de pago): mover chats a 🛵 Por entregar, marcar deals y sincronizar segmentos
  desde la plataforma.
- **Bold**: link de pago por pedido que se confirma solo.

Hasta entonces todo funciona con transferencia + pantallazo y efectivo, confirmando en /sede.
