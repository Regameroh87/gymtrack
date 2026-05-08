-- Server-managed updated_at para sync confiable entre dispositivos.
--
-- Problema que resuelve: el cliente seteaba updated_at con su reloj local al
-- crear/editar offline, y al hacer push tardío el timestamp quedaba "viejo".
-- Otros devices con watermark más alto nunca bajaban esas filas.
--
-- Solución: Postgres setea updated_at en INSERT (default now()) y en cada
-- UPDATE (trigger). El cliente strippea updated_at del payload del upsert.

-- 1) Función reutilizable que el trigger usa en cada tabla.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$;

do $do$
declare
  t text;
  tables text[] := array[
    'exercises_base',
    'equipment',
    'exercise_equipment',
    'sessions',
    'session_exercises',
    'training_plans',
    'training_plan_days'
  ];
begin
  foreach t in array tables loop
    execute format(
      'alter table public.%I alter column updated_at set default now()',
      t
    );
    execute format(
      'drop trigger if exists set_updated_at on public.%I',
      t
    );
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$do$;
