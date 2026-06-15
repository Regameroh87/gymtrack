-- Permite que el super_admin edite los datos de cualquier gimnasio desde el
-- panel web. La tabla gyms tenía RLS con solo policy de SELECT (gyms_select),
-- por lo que un UPDATE directo desde el cliente quedaba bloqueado. El borrado
-- NO se habilita por RLS: va por la edge function eliminar-gym (service role),
-- que además limpia session_logs (FK NO ACTION) y borra cuentas huérfanas.

drop policy if exists gyms_update on public.gyms;
create policy gyms_update on public.gyms
  for update using (public.is_super_admin())
  with check (public.is_super_admin());
