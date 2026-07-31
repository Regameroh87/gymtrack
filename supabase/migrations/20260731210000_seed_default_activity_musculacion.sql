-- Todo gym nace con la actividad "Musculación" y sus tres pases (2 días, 3 días
-- y libre), sin precio: la tabla arrancaba vacía y el owner no tenía nada que
-- asignarle a un socio recién creado.
--
-- Va como trigger sobre gyms (y no dentro de las edge functions) para cubrir los
-- dos caminos de alta —crear-gym y crear-gym-self-service— más cualquier insert
-- manual, sin duplicar la semilla en cada uno.
--
-- Los labels replican FREQUENCY_OPTIONS de apps/web/lib/activity-options.ts para
-- que la semilla sea indistinguible de un pase creado desde la UI; el color es
-- DEFAULT_ACTIVITY_COLOR. price queda NULL: lo define cada gym.

CREATE OR REPLACE FUNCTION "public"."seed_default_activity"("p_gym_id" "uuid")
RETURNS "uuid"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  INSERT INTO public.activities (gym_id, name, color)
  VALUES (p_gym_id, 'Musculación', '#4A44E4')
  RETURNING id INTO v_activity_id;

  INSERT INTO public.activity_plans (activity_id, label, frequency_per_week, price, sort_order)
  VALUES
    (v_activity_id, '2 veces/semana', 2, NULL, 0),
    (v_activity_id, '3 veces/semana', 3, NULL, 1),
    (v_activity_id, 'Libre / Ilimitado', NULL, NULL, 2);

  RETURN v_activity_id;
END;
$$;

ALTER FUNCTION "public"."seed_default_activity"("p_gym_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."seed_default_activity"("p_gym_id" "uuid") IS
  'Crea la actividad Musculación con los pases 2/3 veces por semana y libre (sin precio) para el gym indicado.';

-- SECURITY DEFINER + gym_id por parámetro: si quedara expuesta como RPC,
-- cualquier autenticado podría sembrar actividades en gyms ajenos. Solo la usa
-- el trigger (que corre como owner, sin necesitar el grant).
REVOKE ALL ON FUNCTION "public"."seed_default_activity"("p_gym_id" "uuid") FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION "public"."seed_default_activity_on_gym_insert"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  PERFORM public.seed_default_activity(NEW.id);
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."seed_default_activity_on_gym_insert"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "seed_default_activity" AFTER INSERT ON "public"."gyms"
  FOR EACH ROW EXECUTE FUNCTION "public"."seed_default_activity_on_gym_insert"();

-- Backfill: gyms ya creados que siguen sin ninguna actividad.
DO $$
DECLARE
  v_gym_id uuid;
BEGIN
  FOR v_gym_id IN
    SELECT g.id
    FROM public.gyms g
    WHERE NOT EXISTS (SELECT 1 FROM public.activities a WHERE a.gym_id = g.id)
  LOOP
    PERFORM public.seed_default_activity(v_gym_id);
  END LOOP;
END;
$$;
