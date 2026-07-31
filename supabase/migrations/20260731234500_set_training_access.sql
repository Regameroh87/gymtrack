-- Prender/apagar el gate de entrenamiento es una decisión del gym, no de la
-- plataforma. Pero la RLS de gyms solo deja escribir a is_platform_admin(), y
-- Postgres no permite acotar una policy a ciertas columnas: abrir el UPDATE al
-- owner le daría también slug, owner_id y el branding.
--
-- Por eso va como RPC acotado: valida que el caller sea admin/owner DEL gym y
-- toca únicamente las dos columnas del gate.
CREATE OR REPLACE FUNCTION "public"."set_training_access"(
  "p_gym_id" "uuid",
  "p_gated" boolean,
  "p_grace_days" integer DEFAULT NULL
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
      updated_at = now()
  WHERE id = p_gym_id;
END;
$$;

ALTER FUNCTION "public"."set_training_access"("p_gym_id" "uuid", "p_gated" boolean, "p_grace_days" integer) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."set_training_access"("p_gym_id" "uuid", "p_gated" boolean, "p_grace_days" integer) IS
  'Configura el gate del módulo de entrenamiento del gym. Solo owner/admin del gym (o super_admin).';

GRANT EXECUTE ON FUNCTION "public"."set_training_access"("p_gym_id" "uuid", "p_gated" boolean, "p_grace_days" integer) TO "authenticated";
