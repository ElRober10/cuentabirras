-- Categoría de cada bebida del catálogo, para poder mostrarla con un icono
-- reconocible (botellín, caña, refresco...) en vez de solo texto.
alter table public.catalog_items
  add column category text not null default 'otro'
  check (category in (
    'botellin', 'cana', 'refresco', 'licor', 'cubata',
    'cafe', 'colacao', 'desayuno', 'zumo', 'batido', 'otro'
  ));

-- Color del icono (código hexadecimal, ej. '#FFA500'). Cada categoría tiene
-- un color por defecto, pero se puede elegir otro al crear la bebida — útil
-- sobre todo en "refresco", donde la misma forma de botella representa
-- líquidos de colores muy distintos (naranja, limón, té, transparente...).
alter table public.catalog_items
  add column color text not null default '#888888';
