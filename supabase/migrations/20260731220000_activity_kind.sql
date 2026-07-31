-- Capability de la actividad: qué habilita en la app del socio.
--
-- Las tabs de entrenamiento se van a gatear por suscripción, y el gate necesita
-- saber QUÉ actividad da ese acceso. Preguntar por el nombre ("Musculación") no
-- sirve: el owner la renombra, la borra, o llama "Personal Training" a la que en
-- realidad entrena. Va como dato en la actividad, no como string en el código.
--
--   'training' → módulo de entrenamiento (planes, registros, progreso).
--   'class'    → clase con horarios/agenda.
--
-- El default es 'class' porque es lo que da de alta un gym la mayor parte de las
-- veces (spinning, funcional, yoga); la de entrenamiento suele ser una sola.

ALTER TABLE "public"."activities"
  ADD COLUMN IF NOT EXISTS "kind" "text" DEFAULT 'class' NOT NULL;

ALTER TABLE "public"."activities"
  DROP CONSTRAINT IF EXISTS "activities_kind_check";

ALTER TABLE "public"."activities"
  ADD CONSTRAINT "activities_kind_check" CHECK ("kind" IN ('training', 'class'));

COMMENT ON COLUMN "public"."activities"."kind" IS
  'training = habilita el módulo de entrenamiento del socio; class = clase con agenda.';

-- Backfill: la semilla de Musculación y cualquier actividad que un gym haya
-- creado a mano con ese nombre son las que entrenan. Lo que no matchea queda
-- como 'class', que es el default seguro (no da acceso, pero tampoco lo quita:
-- el gate solo actúa si el gym lo prende, ver training_access_gated).
UPDATE "public"."activities"
SET "kind" = 'training'
WHERE lower("name") IN ('musculación', 'musculacion');

-- El gate pregunta "¿este gym tiene actividad de entrenamiento?" en cada
-- arranque de la app; el índice parcial lo resuelve sin escanear la tabla.
CREATE INDEX IF NOT EXISTS "activities_gym_training_idx"
  ON "public"."activities" ("gym_id")
  WHERE "kind" = 'training';

-- La semilla de gyms nuevos nace ya marcada como entrenamiento (reemplaza a la
-- versión de 20260731210000, que es previa a esta columna).
CREATE OR REPLACE FUNCTION "public"."seed_default_activity"("p_gym_id" "uuid")
RETURNS "uuid"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  INSERT INTO public.activities (gym_id, name, color, kind)
  VALUES (p_gym_id, 'Musculación', '#4A44E4', 'training')
  RETURNING id INTO v_activity_id;

  INSERT INTO public.activity_plans (activity_id, label, frequency_per_week, price, sort_order)
  VALUES
    (v_activity_id, '2 veces/semana', 2, NULL, 0),
    (v_activity_id, '3 veces/semana', 3, NULL, 1),
    (v_activity_id, 'Libre / Ilimitado', NULL, NULL, 2);

  RETURN v_activity_id;
END;
$$;

REVOKE ALL ON FUNCTION "public"."seed_default_activity"("p_gym_id" "uuid") FROM PUBLIC, "anon", "authenticated";
