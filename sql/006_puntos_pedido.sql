-- ============================================================================
-- Puntos de pedido: a qué WhatsApp llega el pedido dentro de cada ciudad.
-- La disponibilidad sigue siendo por ciudad (tabla sedes); esto solo decide
-- el número de WhatsApp. Ejecutar después de 005_por_ciudad.sql.
-- ============================================================================

create table if not exists puntos_pedido (
  id       text primary key,
  sede_id  int  not null references sedes(id) on delete cascade,
  nombre   text not null,
  detalle  text not null default '',
  whatsapp text not null,
  orden    int  not null default 0,
  activo   boolean not null default true
);

alter table puntos_pedido enable row level security;

drop policy if exists "lectura publica puntos_pedido" on puntos_pedido;
create policy "lectura publica puntos_pedido" on puntos_pedido for select using (activo);

insert into puntos_pedido (id, sede_id, nombre, detalle, whatsapp, orden) values
  ('ctg-terminal-castellana',
     (select id from sedes where nombre = 'Cartagena'),
     'Terminal · Castellana', 'Terminal de transporte y Castellana', '573013416503', 0),
  ('ctg-bocagrande',
     (select id from sedes where nombre = 'Cartagena'),
     'Bocagrande', 'Bocagrande, Cra 2 Calle 4', '573226768027', 1),
  ('baq-centro',
     (select id from sedes where nombre = 'Barranquilla'),
     'Centro', 'Centro, Calle 38 No 38-10', '573106107552', 0)
on conflict (id) do update set
  sede_id = excluded.sede_id, nombre = excluded.nombre, detalle = excluded.detalle,
  whatsapp = excluded.whatsapp, orden = excluded.orden;

-- Verificación: 2 puntos en Cartagena y 1 en Barranquilla
select s.nombre as ciudad, p.nombre as punto, p.whatsapp
from puntos_pedido p join sedes s on s.id = p.sede_id
order by s.id, p.orden;
