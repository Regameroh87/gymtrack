-- Reemplaza la FK training_plan_days.plan_id -> training_plans.id agregando ON DELETE CASCADE,
-- para que al borrar un plan se eliminen automáticamente sus días asociados y no se viole
-- la restricción durante el push de borrado desde el cliente.

alter table public.training_plan_days
  drop constraint if exists training_plan_days_plan_id_fkey;

alter table public.training_plan_days
  add constraint training_plan_days_plan_id_fkey
  foreign key (plan_id)
  references public.training_plans(id)
  on delete cascade;
