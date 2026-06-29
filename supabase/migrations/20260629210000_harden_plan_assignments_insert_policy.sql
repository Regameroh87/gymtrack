-- Reemplaza la policy INSERT permisiva ("auth.uid() IS NOT NULL") por una que
-- espeja la lógica del UPDATE: solo el propio socio o staff del gym pueden insertar.
drop policy if exists "usuario o coach puede insertar" on public.plan_assignments;

create policy plan_assignments_insert on public.plan_assignments
  for insert with check (
    user_id = (public.auth_profile_id())::text
    or public.is_staff_of(gym_id)
  );
