-- Acceso del socio al módulo de entrenamiento (planes / registros / progreso).
--
-- Hasta acá la app no gateaba NADA por suscripción: cualquier socio con
-- membership activa veía todo. Esto define una única política de acceso, en la
-- DB, para que móvil y web no puedan discrepar sobre quién entra.
--
-- ── Por qué arranca apagado ────────────────────────────────────────────────
-- training_access_gated nace en false. Prenderlo por default dejaría afuera, en
-- el acto, a TODOS los socios de todos los gyms que todavía no cargaron sus
-- inscripciones: el gym tiene que cargar las suscripciones primero y recién
-- después cerrar la puerta. Es un switch por gym, del owner.
--
-- ── Por qué hay período de gracia ──────────────────────────────────────────
-- Buena parte de los gyms cobra en efectivo y carga el pago con días de atraso.
-- Cortarle el acceso a alguien que ya pagó es peor negocio que dejarlo entrar
-- unos días de más, así que el vencimiento no bloquea hasta pasada la gracia.

ALTER TABLE "public"."gyms"
  ADD COLUMN IF NOT EXISTS "training_access_gated" boolean DEFAULT false NOT NULL;

ALTER TABLE "public"."gyms"
  ADD COLUMN IF NOT EXISTS "training_access_grace_days" integer DEFAULT 10 NOT NULL;

ALTER TABLE "public"."gyms"
  DROP CONSTRAINT IF EXISTS "gyms_training_access_grace_days_check";

ALTER TABLE "public"."gyms"
  ADD CONSTRAINT "gyms_training_access_grace_days_check"
  CHECK ("training_access_grace_days" BETWEEN 0 AND 90);

COMMENT ON COLUMN "public"."gyms"."training_access_gated" IS
  'Si está en true, el socio necesita una suscripción activa a una actividad kind=training para entrar al módulo de entrenamiento.';

COMMENT ON COLUMN "public"."gyms"."training_access_grace_days" IS
  'Días después del vencimiento en los que el socio sigue entrando (el gym suele cargar el pago en efectivo con atraso).';

-- Veredicto de acceso del CALLER (nunca de un tercero: la identidad sale del
-- JWT, no de un parámetro). SECURITY DEFINER para que el resultado no dependa de
-- qué alcanza a ver la RLS del socio sobre activities/gyms —si no viera nada, el
-- gate se volvería no determinista.
--
-- reason:
--   not_gated             el gym no usa el gate
--   staff                 owner/admin/coach/super_admin, nunca se gatea
--   not_member            sin membership activa en ese gym
--   no_training_activity  el gym no tiene ninguna actividad de entrenamiento
--   active                suscripción al día (o dentro de la gracia)
--   overdue               suscripción vencida más allá de la gracia
--   not_subscribed        no está inscripto a ninguna actividad de entrenamiento
CREATE OR REPLACE FUNCTION "public"."member_training_access"("p_gym_id" "uuid")
RETURNS TABLE("allowed" boolean, "reason" "text", "activity_name" "text", "due_date" "date")
LANGUAGE "plpgsql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
DECLARE
  v_profile_id uuid;
  v_gated boolean;
  v_grace integer;
  v_name text;
  v_due date;
BEGIN
  SELECT g.training_access_gated, g.training_access_grace_days
    INTO v_gated, v_grace
  FROM public.gyms g
  WHERE g.id = p_gym_id;

  IF v_gated IS NOT TRUE THEN
    RETURN QUERY SELECT true, 'not_gated'::text, NULL::text, NULL::date;
    RETURN;
  END IF;

  -- El staff gestiona el contenido de entrenamiento: gatearlo sería absurdo.
  IF public.is_staff_of(p_gym_id) IS TRUE THEN
    RETURN QUERY SELECT true, 'staff'::text, NULL::text, NULL::date;
    RETURN;
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  IF v_profile_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid() AND m.gym_id = p_gym_id AND m.status = 'active'
  ) THEN
    RETURN QUERY SELECT false, 'not_member'::text, NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Un gym sin actividad de entrenamiento no modeló nada que gatear: bloquear
  -- ahí sería cerrarle la app entera a sus socios por un dato que falta.
  IF NOT EXISTS (
    SELECT 1 FROM public.activities a
    WHERE a.gym_id = p_gym_id AND a.kind = 'training' AND a.is_active
  ) THEN
    RETURN QUERY SELECT true, 'no_training_activity'::text, NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Alcanza con UNA suscripción de entrenamiento al día. Se busca primero la que
  -- habilita (no la más reciente): con dos inscripciones, una vencida no puede
  -- tapar a la que está paga.
  SELECT a.name, s.due_date INTO v_name, v_due
  FROM public.activity_subscriptions s
  JOIN public.activities a ON a.id = s.activity_id
  WHERE s.gym_id = p_gym_id
    AND s.user_id = v_profile_id
    AND s.status = 'active'
    AND a.kind = 'training'
    AND a.is_active
    AND (s.due_date IS NULL OR s.due_date + v_grace >= current_date)
  ORDER BY s.due_date DESC NULLS FIRST
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT true, 'active'::text, v_name, v_due;
    RETURN;
  END IF;

  -- No hay ninguna al día: distinguir "debe" de "nunca se inscribió" para poder
  -- mandarlo a pagar en vez de decirle que hable con el gym.
  SELECT a.name, s.due_date INTO v_name, v_due
  FROM public.activity_subscriptions s
  JOIN public.activities a ON a.id = s.activity_id
  WHERE s.gym_id = p_gym_id
    AND s.user_id = v_profile_id
    AND s.status = 'active'
    AND a.kind = 'training'
    AND a.is_active
  ORDER BY s.due_date DESC NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT false, 'overdue'::text, v_name, v_due;
  ELSE
    RETURN QUERY SELECT false, 'not_subscribed'::text, NULL::text, NULL::date;
  END IF;
END;
$$;

ALTER FUNCTION "public"."member_training_access"("p_gym_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."member_training_access"("p_gym_id" "uuid") IS
  'Veredicto de acceso del caller al módulo de entrenamiento del gym indicado. Fuente única de la política para móvil y web.';

GRANT EXECUTE ON FUNCTION "public"."member_training_access"("p_gym_id" "uuid") TO "authenticated";
