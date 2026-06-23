-- Coach opcional por actividad: permite designar quién la dicta, para filtrar
-- (p. ej. "actividades de tal coach") y, a futuro, imputar costos. Es opcional;
-- si el coach se elimina, la actividad queda sin coach (set null), no se borra.

alter table public.activities
  add column coach_id uuid references public.profiles(id) on delete set null;

create index activities_coach_id_idx on public.activities (coach_id);
