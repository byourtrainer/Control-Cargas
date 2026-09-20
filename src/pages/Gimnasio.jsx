-- ============================================================================
-- Migración: bloques dentro de una sesión de gimnasio (ej. "Calentamiento",
-- "Bloque principal", "Vuelta a la calma"), y campos ampliados por ejercicio:
-- repeticiones (con opción "por lado"), intensidad, duración/tiempo de
-- trabajo, descanso entre repeticiones y descanso entre series.
-- ============================================================================

-- 1) Bloques: agrupan ejercicios dentro de una sesión, con nombre editable.
create table if not exists gimnasio_plantilla_bloques (
  id uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references gimnasio_plantillas(id) on delete cascade,
  nombre text not null default 'Bloque',
  orden int not null default 0
);

create index if not exists idx_gimnasio_plantilla_bloques_plantilla on gimnasio_plantilla_bloques(plantilla_id);

-- 2) Nuevas columnas en los ejercicios de la sesión.
alter table gimnasio_plantilla_items add column if not exists bloque_id uuid references gimnasio_plantilla_bloques(id) on delete cascade;
alter table gimnasio_plantilla_items add column if not exists repeticiones_por_lado boolean not null default false;
alter table gimnasio_plantilla_items add column if not exists descanso_repeticiones text;
alter table gimnasio_plantilla_items add column if not exists descanso_series text;

-- 3) Si ya tenías sesiones creadas con la estructura anterior (sin bloques),
--    se les crea automáticamente un bloque "Bloque único" y se les migran
--    los ejercicios, copiando el antiguo "tiempo_descanso" a
--    "descanso_series" como mejor aproximación de lo que ya tenías.
do $$
declare
  r record;
  nuevo_bloque_id uuid;
begin
  for r in
    select distinct plantilla_id
    from gimnasio_plantilla_items
    where bloque_id is null and plantilla_id is not null
  loop
    insert into gimnasio_plantilla_bloques (plantilla_id, nombre, orden)
    values (r.plantilla_id, 'Bloque único', 0)
    returning id into nuevo_bloque_id;

    update gimnasio_plantilla_items
    set bloque_id = nuevo_bloque_id,
        descanso_series = coalesce(descanso_series, tiempo_descanso)
    where plantilla_id = r.plantilla_id and bloque_id is null;
  end loop;
end $$;

-- 4) Las políticas de seguridad actuales de gimnasio_plantilla_items todavía
--    usan la columna "plantilla_id" que vamos a retirar, así que hay que
--    quitarlas antes de poder borrar esa columna (si no, Postgres se niega).
--    Se vuelven a crear más abajo, ya basadas en el bloque.
drop policy if exists gimnasio_plantilla_items_select on gimnasio_plantilla_items;
drop policy if exists gimnasio_plantilla_items_write on gimnasio_plantilla_items;

-- 5) A partir de ahora cada ejercicio cuelga de un bloque, no directamente
--    de la plantilla, así que bloque_id pasa a ser obligatorio y
--    plantilla_id/tiempo_descanso (sustituido por los dos campos de
--    descanso nuevos) se retiran.
alter table gimnasio_plantilla_items alter column bloque_id set not null;
alter table gimnasio_plantilla_items drop column if exists plantilla_id;
alter table gimnasio_plantilla_items drop column if exists tiempo_descanso;

-- ============================================================================
-- RLS
-- ============================================================================

alter table gimnasio_plantilla_bloques enable row level security;

drop policy if exists gimnasio_plantilla_bloques_select on gimnasio_plantilla_bloques;
create policy gimnasio_plantilla_bloques_select on gimnasio_plantilla_bloques for select
  using (
    exists (
      select 1 from gimnasio_plantillas p
      where p.id = plantilla_id
        and gimnasio_tiene_acceso_club(p.club_id)
    )
  );

drop policy if exists gimnasio_plantilla_bloques_write on gimnasio_plantilla_bloques;
create policy gimnasio_plantilla_bloques_write on gimnasio_plantilla_bloques for all
  using (
    exists (
      select 1 from gimnasio_plantillas p
      where p.id = plantilla_id
        and gimnasio_tiene_acceso_club(p.club_id)
    )
  )
  with check (
    exists (
      select 1 from gimnasio_plantillas p
      where p.id = plantilla_id
        and gimnasio_tiene_acceso_club(p.club_id)
    )
  );

-- Las políticas de gimnasio_plantilla_items ya existentes comprobaban el
-- acceso a través de "plantilla_id", columna que acabamos de retirar. Se
-- sustituyen por otras que pasan por el bloque.
drop policy if exists gimnasio_plantilla_items_select on gimnasio_plantilla_items;
create policy gimnasio_plantilla_items_select on gimnasio_plantilla_items for select
  using (
    exists (
      select 1 from gimnasio_plantilla_bloques b
      join gimnasio_plantillas p on p.id = b.plantilla_id
      where b.id = bloque_id
        and gimnasio_tiene_acceso_club(p.club_id)
    )
  );

drop policy if exists gimnasio_plantilla_items_write on gimnasio_plantilla_items;
create policy gimnasio_plantilla_items_write on gimnasio_plantilla_items for all
  using (
    exists (
      select 1 from gimnasio_plantilla_bloques b
      join gimnasio_plantillas p on p.id = b.plantilla_id
      where b.id = bloque_id
        and gimnasio_tiene_acceso_club(p.club_id)
    )
  )
  with check (
    exists (
      select 1 from gimnasio_plantilla_bloques b
      join gimnasio_plantillas p on p.id = b.plantilla_id
      where b.id = bloque_id
        and gimnasio_tiene_acceso_club(p.club_id)
    )
  );
