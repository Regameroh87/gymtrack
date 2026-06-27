-- Habilita Supabase Realtime para la tabla attendances.
-- Sin esto, las suscripciones postgres_changes no reciben eventos.
alter publication supabase_realtime add table public.attendances;
