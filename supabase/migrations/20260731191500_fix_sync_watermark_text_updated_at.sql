-- Fix: los cambios hechos desde web no llegaban a mobile (p. ej. publicar un plan).
--
-- training_plans, exercises_base, equipment y exercise_equipment tenían updated_at
-- como TEXT (legacy). El PULL del sync usa esa columna como watermark:
--
--   .order("updated_at", { ascending: true })
--   .gte("updated_at", lastSync)
--
-- Sobre TEXT eso es comparación LEXICOGRÁFICA, y en la tabla convivían dos formatos:
--
--   - cliente (INSERT desde web/mobile, new Date().toISOString()):
--       '2026-07-31T18:42:28.879Z'        <- separador 'T' (0x54)
--   - servidor (DEFAULT now() y trigger set_updated_at, timestamptz->text):
--       '2026-07-31 18:59:11.163429+00'   <- separador ' ' (0x20)
--
-- Como ' ' < 'T', todo valor escrito por el servidor ordena ANTES que cualquier
-- valor escrito por el cliente con la misma fecha. Resultado: una vez que el
-- watermark local quedaba en formato cliente, el `.gte` descartaba para siempre
-- los UPDATE posteriores (que el trigger reescribe en formato servidor) y mobile
-- nunca volvía a ver esa fila.
--
-- Pasar la columna a timestamptz hace que la comparación sea temporal y no
-- textual, y normaliza la salida de PostgREST a ISO-8601 con offset.
--
-- created_at se deja en TEXT a propósito: no participa del watermark y el cliente
-- ordena localmente por esa columna como texto (todos sus valores ya son ISO).

alter table public.training_plans
  alter column updated_at drop default,
  alter column updated_at type timestamptz using updated_at::timestamptz,
  alter column updated_at set default now();

alter table public.exercises_base
  alter column updated_at drop default,
  alter column updated_at type timestamptz using updated_at::timestamptz,
  alter column updated_at set default now();

alter table public.equipment
  alter column updated_at drop default,
  alter column updated_at type timestamptz using updated_at::timestamptz,
  alter column updated_at set default now();

alter table public.exercise_equipment
  alter column updated_at drop default,
  alter column updated_at type timestamptz using updated_at::timestamptz,
  alter column updated_at set default now();
