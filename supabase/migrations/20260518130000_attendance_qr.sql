-- Asistencia al gimnasio con QR rotatorio.
-- Dos tablas: `attendances` (registro inmutable) y `gym_qr_tokens` (tokens
-- efímeros que muestra la pantalla de recepción y escanean los socios).
-- Members entran SIEMPRE vía RPC `check_in_with_qr` — la policy de INSERT
-- directo solo deja entrar a staff (método manual como fallback).

-- 1. attendances
CREATE TABLE public.attendances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_in_at   timestamptz NOT NULL DEFAULT now(),
  method          text NOT NULL CHECK (method IN ('qr','manual')),
  checked_in_by   uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX attendances_gym_idx     ON public.attendances(gym_id);
CREATE INDEX attendances_profile_idx ON public.attendances(profile_id);
CREATE INDEX attendances_recent_idx  ON public.attendances(gym_id, checked_in_at DESC);

-- 2. gym_qr_tokens
CREATE TABLE public.gym_qr_tokens (
  token       text PRIMARY KEY,
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gym_qr_tokens_gym_idx     ON public.gym_qr_tokens(gym_id);
CREATE INDEX gym_qr_tokens_expires_idx ON public.gym_qr_tokens(expires_at);

-- 3. RLS
ALTER TABLE public.attendances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_qr_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT attendances: socio ve las suyas; staff del gym ve todas
CREATE POLICY "lectura asistencias"
  ON public.attendances FOR SELECT
  USING (
    profile_id = (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid() AND gym_id = attendances.gym_id
      LIMIT 1
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.gym_id = attendances.gym_id
        AND p.user_id = auth.uid()
        AND p.role IN ('coach','admin','owner','super_admin')
    )
  );

-- INSERT directo: solo staff (método manual). Members usan RPC.
CREATE POLICY "staff inserta asistencia manual"
  ON public.attendances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.gym_id = attendances.gym_id
        AND p.user_id = auth.uid()
        AND p.role IN ('coach','admin','owner','super_admin')
    )
  );

-- gym_qr_tokens: solo staff lee/inserta (el QR no se valida por RLS,
-- se valida dentro de la función SECURITY DEFINER)
CREATE POLICY "staff gestiona tokens qr"
  ON public.gym_qr_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.gym_id = gym_qr_tokens.gym_id
        AND p.user_id = auth.uid()
        AND p.role IN ('coach','admin','owner','super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.gym_id = gym_qr_tokens.gym_id
        AND p.user_id = auth.uid()
        AND p.role IN ('coach','admin','owner','super_admin')
    )
  );

-- 4. RPC check-in con QR (única ruta de INSERT para members)
CREATE OR REPLACE FUNCTION public.check_in_with_qr(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_id     uuid;
  v_profile_id uuid;
  v_now        timestamptz := now();
  v_existing   uuid;
  v_new_id     uuid;
BEGIN
  SELECT gym_id INTO v_gym_id
  FROM gym_qr_tokens
  WHERE token = p_token AND expires_at > v_now;

  IF v_gym_id IS NULL THEN
    RAISE EXCEPTION 'QR inválido o expirado';
  END IF;

  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid()
    AND gym_id = v_gym_id
    AND role = 'member';

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No sos miembro de este gimnasio';
  END IF;

  -- Anti doble-check-in: ventana de 30 min
  SELECT id INTO v_existing
  FROM attendances
  WHERE profile_id = v_profile_id
    AND gym_id = v_gym_id
    AND checked_in_at > v_now - interval '30 minutes';

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('status','already_checked_in','id',v_existing);
  END IF;

  INSERT INTO attendances (gym_id, profile_id, method)
  VALUES (v_gym_id, v_profile_id, 'qr')
  RETURNING id INTO v_new_id;

  RETURN json_build_object('status','ok','id',v_new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in_with_qr(text) TO authenticated;
