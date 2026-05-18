CREATE TABLE public.plan_assignments (
  id          text        PRIMARY KEY,
  plan_id     text        NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  user_id     text        NOT NULL,
  assigned_by text        NOT NULL,
  gym_id      uuid        NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  start_date  date        NOT NULL,
  end_date    date,
  status      text        NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX plan_assignments_gym_idx  ON public.plan_assignments(gym_id);
CREATE INDEX plan_assignments_user_idx ON public.plan_assignments(user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.plan_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.plan_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member ve sus asignaciones"
  ON public.plan_assignments FOR SELECT
  USING (
    user_id = (
      SELECT id::text FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      LIMIT 1
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.gym_id = plan_assignments.gym_id
        AND p.user_id = auth.uid()
        AND p.role IN ('coach', 'admin', 'owner', 'super_admin')
    )
  );

CREATE POLICY "usuario o coach puede insertar"
  ON public.plan_assignments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "usuario puede actualizar sus propias asignaciones"
  ON public.plan_assignments FOR UPDATE
  USING (
    user_id = (
      SELECT id::text FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      LIMIT 1
    )
  );
