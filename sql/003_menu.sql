-- ============================================================================
-- Menú real de Los Buñuelos Los Originales (desde las piezas del menú).
-- Reemplaza los productos y categorías de ejemplo. Se puede ejecutar más de
-- una vez: actualiza precios y nombres sin duplicar.
-- ============================================================================

begin;

-- ── Categorías ──────────────────────────────────────────────────────────────
insert into categorias (id, nombre, orden) values
  ('bunuelos',          'Nuestros Buñuelos',  0),
  ('otras-delicias',    'Otras Delicias',     1),
  ('jugos',             'Jugos Naturales',    2),
  ('bebidas-calientes', 'Bebidas Calientes',  3),
  ('combos',            'Combos',             4)
on conflict (id) do update set nombre = excluded.nombre, orden = excluded.orden;

-- ── Productos ───────────────────────────────────────────────────────────────
insert into productos (id, nombre, descripcion, precio, categoria_id, foto, disponible) values
  -- Nuestros Buñuelos
  ('bunuelo-tradicional', 'Buñuelo Tradicional', 'El original, crujiente por fuera y esponjoso por dentro.', 1500, 'bunuelos', '', true),
  ('bunuelo-mozarella',   'Buñuelo Mozarella',   'Relleno de queso mozzarella.', 2500, 'bunuelos', '', true),
  ('bunuelo-arequipe',    'Buñuelo Arequipe',    'Relleno de arequipe.',         4000, 'bunuelos', '', true),
  ('bunuelo-bocadillo',   'Buñuelo Bocadillo',   'Relleno de bocadillo.',        4000, 'bunuelos', '', true),
  ('bunuelo-nutella',     'Buñuelo Nutella',     'Relleno de Nutella.',          4000, 'bunuelos', '', true),

  -- Otras Delicias
  ('pan-de-bono',           'Pan de Bono',           '', 2000, 'otras-delicias', '', true),
  ('pan-de-bono-arequipe',  'Pan de Bono Arequipe',  'Relleno de arequipe.',  3500, 'otras-delicias', '', true),
  ('pan-de-bono-bocadillo', 'Pan de Bono Bocadillo', 'Relleno de bocadillo.', 3500, 'otras-delicias', '', true),
  ('pan-de-bono-nutella',   'Pan de Bono Nutella',   'Relleno de Nutella.',   3500, 'otras-delicias', '', true),
  ('almojabana',            'Almojábana',            '', 4500, 'otras-delicias', '', true),
  ('palibono',              'Palibono',              '', 3500, 'otras-delicias', '', true),

  -- Jugos Naturales
  ('jugo-naranja',       'Jugo de Naranja',        '', 7000, 'jugos', '', true),
  ('jugo-corozo',        'Jugo de Corozo',         '', 7000, 'jugos', '', true),
  ('jugo-mora',          'Jugo de Mora',           '', 8000, 'jugos', '', true),
  ('jugo-maracuya',      'Jugo de Maracuyá',       '', 8000, 'jugos', '', true),
  ('jugo-lulo',          'Jugo de Lulo',           '', 8000, 'jugos', '', true),
  ('jugo-guayaba',       'Jugo de Guayaba',        '', 8000, 'jugos', '', true),
  ('jugo-tomate-arbol',  'Jugo de Tomate de Árbol','', 8000, 'jugos', '', true),
  ('jugo-borojo',        'Jugo de Borojó',         '', 8000, 'jugos', '', true),
  ('jugo-fresa',         'Jugo de Fresa',          '', 8000, 'jugos', '', true),
  ('jugo-nispero',       'Jugo de Níspero',        '', 8000, 'jugos', '', true),
  ('jugo-zapote',        'Jugo de Zapote',         '', 8000, 'jugos', '', true),
  ('jugo-guanabana',     'Jugo de Guanábana',      '', 8000, 'jugos', '', true),
  ('milo-granizado',     'Milo Granizado',         '', 8000, 'jugos', '', true),

  -- Bebidas Calientes
  ('capuchino',          'Capuchino',               '', 7000, 'bebidas-calientes', '', true),
  ('tinto',              'Tinto',                   '', 5000, 'bebidas-calientes', '', true),
  ('capuchino-vainilla', 'Capuchino Vainilla',      '', 9500, 'bebidas-calientes', '', true),
  ('chocolate-abuelita', 'Chocolate La Abuelita',   '', 7000, 'bebidas-calientes', '', true),

  -- Combos
  ('match-perfecto', 'Match Perfecto', 'Buñuelo mozarella + Milo granizado.', 11000, 'combos', '', true),
  ('combo-uno',  'Combo Uno',
     '4 buñuelos rellenos de queso mozzarella + 2 jugos naturales. El precio aumenta con los sabores Níspero, Guanábana, Zapote y Fresa.',
     24000, 'combos', '', true),
  ('combo-dos',  'Combo Dos · Match Perfecto',
     '4 buñuelos rellenos de queso mozzarella + 2 Milo granizado.',
     26000, 'combos', '', true),
  ('combo-tres', 'Combo Tres',
     '8 buñuelos rellenos de queso mozzarella + 8 buñuelos tradicionales.',
     32000, 'combos', '', true),
  ('combo-cuatro', 'Combo Cuatro',
     '10 buñuelos mini tradicionales + 2 toppings.',
     10000, 'combos', '', true),
  ('combo-cinco', 'Combo Cinco · Para Regalar',
     '2 buñuelos rellenos de queso mozzarella + 2 pan de bono + 1 jugo natural. El precio aumenta con los sabores Níspero, Guanábana, Zapote y Fresa.',
     17000, 'combos', '', true)
on conflict (id) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  precio = excluded.precio,
  categoria_id = excluded.categoria_id;

-- ── Quitar los productos y categorías de ejemplo ────────────────────────────
delete from productos where id in ('p1', 'p2', 'p3');
delete from categorias where id in ('comidas', 'bebidas', 'extras')
  and not exists (select 1 from productos p where p.categoria_id = categorias.id);

-- ── Todos los productos disponibles en todas las sedes ──────────────────────
insert into sede_productos (sede_id, producto_id, disponible)
select s.id, p.id, true from sedes s cross join productos p
on conflict (sede_id, producto_id) do nothing;

commit;

-- Verificación: debe dar 5 categorías y 34 productos
select c.nombre, count(p.id) as productos
from categorias c left join productos p on p.categoria_id = c.id
group by c.nombre, c.orden order by c.orden;
