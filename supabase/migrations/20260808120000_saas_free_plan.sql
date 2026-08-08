-- Plan interno para activar un gimnasio sin cobro desde el panel de plataforma
-- (super_admin), sin pasar por el checkout de MercadoPago.
--
-- is_active=false a propósito: saas_plans_select solo deja leer planes activos
-- a los autenticados comunes, así que este plan queda invisible en el selector
-- de planes del owner (self-service) y en el checkout — que además rechaza
-- price=0 como resguardo extra ("El precio del plan no está configurado").
-- Solo super_admin lo ve y lo asigna, vía saas_plans_super_admin (policy "for
-- all" sin filtro de is_active).
insert into public.saas_plans (name, description, price, currency, trial_days, is_active, max_members)
select
  'Gratis',
  'Acceso sin cargo asignado manualmente desde el panel de plataforma',
  0,
  'ARS',
  0,
  false,
  null
where not exists (select 1 from public.saas_plans where name = 'Gratis');
