-- email_log: registro de cada mail transaccional enviado por la app (vía Resend).
-- Permite conteo por gym (visibilidad + quotas a futuro) y trackeo de estado de
-- entrega vía webhook de Resend. Los mails de login (OTP) NO pasan por acá: salen
-- por el SMTP de Auth y no se pueden atribuir a un gym.

create table public.email_log (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid references public.gyms(id) on delete set null,  -- null = mail de plataforma
  to_email    text not null,
  type        text not null,                 -- 'welcome_member' | 'welcome_owner' | ...
  subject     text,
  resend_id   text unique,                   -- id que devuelve la API de Resend
  status      text not null default 'sent',  -- sent|delivered|bounced|complained|delivery_delayed|failed
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index email_log_gym_created_idx on public.email_log (gym_id, created_at desc);
create index email_log_resend_id_idx   on public.email_log (resend_id);

alter table public.email_log enable row level security;

-- Escritura: solo las edge functions (service role) escriben; bypassean RLS, sin policy.
-- Lectura: staff admin/owner ve los logs de su gym; super_admin ve todo (incluida
-- plataforma, gym_id null). Reusa is_admin_of() de la RLS v2. Member no lee.
create policy email_log_admin_select on public.email_log
  for select using (public.is_admin_of(gym_id));
