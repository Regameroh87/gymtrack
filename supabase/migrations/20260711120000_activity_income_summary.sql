-- Ingresos reales por actividad en un período, para la pestaña "Ingresos por
-- actividad" del panel de Contabilidad. Agrega subscription_payments (cobros
-- reales, no precios teóricos de suscripción) por actividad, más los socios
-- activos actuales. Solo admin/owner del gym (misma vara que el módulo billing).

create or replace function public.activity_income_summary(
  p_gym_id uuid,
  p_from   date,
  p_to     date
) returns table (
  activity_id     uuid,
  activity_name   text,
  activity_color  text,
  payments_count  integer,
  total           numeric,
  active_students integer
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin_of(p_gym_id) then
    raise exception 'No autorizado';
  end if;

  return query
  with pay as (
    select sp.activity_id as aid, count(*)::integer as cnt, sum(sp.amount) as amt
    from public.subscription_payments sp
    where sp.gym_id = p_gym_id and sp.paid_at between p_from and p_to
    group by sp.activity_id
  ),
  subs as (
    select s.activity_id as aid, count(*)::integer as students
    from public.activity_subscriptions s
    where s.gym_id = p_gym_id and s.status = 'active'
    group by s.activity_id
  )
  select a.id, a.name, a.color,
         coalesce(p.cnt, 0), coalesce(p.amt, 0), coalesce(s.students, 0)
  from public.activities a
  left join pay p on p.aid = a.id
  left join subs s on s.aid = a.id
  where a.gym_id = p_gym_id
    and (p.aid is not null or s.aid is not null)
  order by coalesce(p.amt, 0) desc;
end;
$$;
