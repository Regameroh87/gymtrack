-- La política UPDATE anterior solo permitía al propio member actualizar
-- sus asignaciones. El staff (coach/admin) no podía cerrar la asignación
-- activa anterior al asignar un nuevo plan.
-- Se amplía para permitir también al staff del gym operar sobre filas de sus alumnos.
drop policy if exists "usuario puede actualizar sus propias asignaciones" on public.plan_assignments;

create policy plan_assignments_update on public.plan_assignments
  for update using (
    user_id = (select (profiles.id)::text from profiles where profiles.user_id = auth.uid() limit 1)
    or public.is_staff_of(gym_id)
  );
