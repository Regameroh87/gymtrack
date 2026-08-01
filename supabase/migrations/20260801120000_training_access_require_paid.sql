-- El gate de entrenamiento pasa a tener DOS niveles independientes.
--
-- Hasta acá era un solo interruptor que fundía dos reglas distintas:
--   1. quién puede ver el módulo  → los inscriptos a una actividad kind='training'
--   2. hasta cuándo puede verlo   → mientras la inscripción esté al día
--
-- Fundirlas obliga a un trade-off falso. "Que el de zumba no vea las rutinas" es
-- una regla de producto que casi todo gym quiere siempre; "cortarle el acceso al
-- que debe dos semanas" es una decisión comercial que muchos NO quieren, porque
-- cobran en efectivo y cargan el pago tarde. Con un único switch, el gym que
-- quería lo primero tenía que tragarse lo segundo — y en la práctica terminaba
-- dejando el gate apagado, que es el peor de los tres mundos: el de zumba
-- viendo planes de musculación.
--
-- Ahora el nivel 2 cuelga del 1 y se prende aparte.

ALTER TABLE "public"."gyms"
  ADD COLUMN IF NOT EXISTS "training_access_require_paid" boolean DEFAULT true NOT NULL;

-- Arranca en true para no cambiarle el comportamiento a ningún gym que ya tenga
-- el gate prendido: antes de esta migración, gated=true SIEMPRE chequeaba pago.
COMMENT ON COLUMN "public"."gyms"."training_access_require_paid" IS
  'Solo aplica con training_access_gated=true. Si es true, además de estar inscripto a una actividad de entrenamiento la inscripción tiene que estar al día (o dentro de la gracia). Si es false, alcanza con estar inscripto.';

COMMENT ON COLUMN "public"."gyms"."training_access_gated" IS
  'Nivel 1 del gate: el socio necesita una inscripción activa a una actividad kind=training para entrar al módulo de entrenamiento.';

COMMENT ON COLUMN "public"."gyms"."training_access_grace_days" IS
  'Solo aplica con training_access_require_paid=true. Días después del vencimiento en los que el socio sigue entrando (el gym suele cargar el pago en efectivo con atraso).';

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
--   active                inscripto (y al día, si el gym exige pago)
--   overdue               inscripto pero vencido más allá de la gracia
--   not_subscribed        no está inscripto a ninguna actividad de entrenamiento
--
-- 'overdue' solo puede salir con training_access_require_paid=true; con el nivel
-- 2 apagado, estar inscripto alcanza y la fecha de vencimiento no se mira.
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
  v_require_paid boolean;
  v_grace integer;
  v_name text;
  v_due date;
BEGIN
  SELECT g.training_access_gated,
         g.training_access_require_paid,
         g.training_access_grace_days
    INTO v_gated, v_require_paid, v_grace
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

  -- Nivel 1 + nivel 2 en una sola pasada. El filtro de fecha se desactiva entero
  -- cuando el gym no exige pago, así que ahí alcanza con estar inscripto.
  --
  -- Alcanza con UNA suscripción que habilite. Se busca primero la que habilita
  -- (no la más reciente): con dos inscripciones, una vencida no puede tapar a la
  -- que está paga.
  SELECT a.name, s.due_date INTO v_name, v_due
  FROM public.activity_subscriptions s
  JOIN public.activities a ON a.id = s.activity_id
  WHERE s.gym_id = p_gym_id
    AND s.user_id = v_profile_id
    AND s.status = 'active'
    AND a.kind = 'training'
    AND a.is_active
    AND (
      v_require_paid IS NOT TRUE
      OR s.due_date IS NULL
      OR s.due_date + v_grace >= current_date
    )
  ORDER BY s.due_date DESC NULLS FIRST
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT true, 'active'::text, v_name, v_due;
    RETURN;
  END IF;

  -- No hay ninguna que habilite: distinguir "debe" de "nunca se inscribió" para
  -- poder mandarlo a pagar en vez de decirle que hable con el gym.
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
REVOKE ALL ON FUNCTION "public"."member_training_access"("p_gym_id" "uuid") FROM PUBLIC, "anon";

-- Prender/apagar el gate es una decisión del gym, no de la plataforma. Pero la
-- RLS de gyms solo deja escribir a is_platform_admin(), y Postgres no permite
-- acotar una policy a ciertas columnas: abrir el UPDATE al owner le daría
-- también slug, owner_id y el branding. Por eso va como RPC acotado.
--
-- Los tres parámetros de configuración son NULL-able y se aplican con COALESCE:
-- así el panel puede tocar un nivel sin tener que reenviar los otros dos.
CREATE OR REPLACE FUNCTION "public"."set_training_access"(
  "p_gym_id" "uuid",
  "p_gated" boolean,
  "p_grace_days" integer DEFAULT NULL,
  "p_require_paid" boolean DEFAULT NULL
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Coach no: define la oferta comercial, es admin/owner (mismo criterio que
  -- MODULE_ROLES.activities en packages/core/src/roles.js).
  IF NOT (
    public.is_super_admin() IS TRUE
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.gym_id = p_gym_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF p_grace_days IS NOT NULL AND p_grace_days NOT BETWEEN 0 AND 90 THEN
    RAISE EXCEPTION 'Los días de gracia deben estar entre 0 y 90' USING ERRCODE = '22023';
  END IF;

  UPDATE public.gyms
  SET training_access_gated = p_gated,
      training_access_grace_days = COALESCE(p_grace_days, training_access_grace_days),
      training_access_require_paid = COALESCE(p_require_paid, training_access_require_paid),
      updated_at = now()
  WHERE id = p_gym_id;
END;
$$;

ALTER FUNCTION "public"."set_training_access"("p_gym_id" "uuid", "p_gated" boolean, "p_grace_days" integer, "p_require_paid" boolean) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."set_training_access"("p_gym_id" "uuid", "p_gated" boolean, "p_grace_days" integer, "p_require_paid" boolean) IS
  'Configura los dos niveles del gate de entrenamiento del gym. Solo owner/admin del gym (o super_admin).';

GRANT EXECUTE ON FUNCTION "public"."set_training_access"("p_gym_id" "uuid", "p_gated" boolean, "p_grace_days" integer, "p_require_paid" boolean) TO "authenticated";
REVOKE ALL ON FUNCTION "public"."set_training_access"("p_gym_id" "uuid", "p_gated" boolean, "p_grace_days" integer, "p_require_paid" boolean) FROM PUBLIC, "anon";

-- La firma de 3 argumentos queda huérfana: PostgREST resolvería por nombre de
-- parámetro y un cliente viejo podría seguir pegándole. Se borra para que exista
-- una sola versión de la política.
DROP FUNCTION IF EXISTS "public"."set_training_access"("uuid", boolean, integer);
