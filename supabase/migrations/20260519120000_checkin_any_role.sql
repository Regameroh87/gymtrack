-- Permite check-in QR a cualquier perfil del gimnasio, sin importar el rol.
-- Antes solo dejaba entrar a role = 'member'.

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
    AND gym_id = v_gym_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No pertenecés a este gimnasio';
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
