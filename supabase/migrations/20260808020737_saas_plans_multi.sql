-- Planes SaaS configurables: de "el plan" a "los planes".
--
-- Hasta acá saas_plans era una tabla de una fila por convención, nunca por
-- constraint: el checkout, la landing y las dos funciones de alta de gym hacían
-- todas `.eq(is_active,true).order(created_at).limit(1)`, o sea "el plan activo
-- más viejo". bootstrap_env.sql ya avisaba en un comentario que con dos filas
-- activas cuál cobra depende del orden de inserción.
--
-- Esta migración agrega lo que el panel de plataforma necesita para ofrecer
-- varios planes y, sobre todo, reemplaza ese `limit(1)` implícito por una marca
-- explícita: is_default. El alta de un gym necesita ALGÚN plan y no puede
-- depender de un ORDER BY.

-- ── 1. Columnas nuevas de saas_plans ────────────────────────────────────────

ALTER TABLE "public"."saas_plans"
  ADD COLUMN IF NOT EXISTS "max_members" integer,
  ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "badge_text"  "text",
  ADD COLUMN IF NOT EXISTS "features"    "text"[] DEFAULT '{}'::"text"[] NOT NULL,
  ADD COLUMN IF NOT EXISTS "sort_order"  integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "is_default"  boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN "public"."saas_plans"."max_members" IS
  'Tope de socios activos (role=member, status=active) que el plan habilita. NULL = ilimitado. Lo hace cumplir el trigger memberships_member_limit.';
COMMENT ON COLUMN "public"."saas_plans"."is_featured" IS
  'Solo presentación: destaca la card en el selector del owner. No cambia nada del cobro. Distinto de is_default.';
COMMENT ON COLUMN "public"."saas_plans"."badge_text" IS
  'Texto del cartelito de la card ("Más Popular", "Ilimitado"). Solo presentación.';
COMMENT ON COLUMN "public"."saas_plans"."features" IS
  'Bullets de la card, en orden. Texto de venta: no habilita ni bloquea nada.';
COMMENT ON COLUMN "public"."saas_plans"."is_default" IS
  'El plan que se le asigna a un gym recién creado, antes de que el owner elija. Exactamente uno (índice saas_plans_one_default).';

ALTER TABLE "public"."saas_plans"
  DROP CONSTRAINT IF EXISTS "saas_plans_max_members_check";
ALTER TABLE "public"."saas_plans"
  ADD CONSTRAINT "saas_plans_max_members_check"
  CHECK ("max_members" IS NULL OR "max_members" > 0);

-- Un plan dado de baja no puede ser el que se le asigna a los gyms nuevos. Va
-- como CHECK de fila (no como trigger) porque la regla mira una sola fila:
-- is_default ⇒ is_active.
ALTER TABLE "public"."saas_plans"
  DROP CONSTRAINT IF EXISTS "saas_plans_default_is_active";
ALTER TABLE "public"."saas_plans"
  ADD CONSTRAINT "saas_plans_default_is_active"
  CHECK (NOT "is_default" OR "is_active");

-- Como máximo un default. Índice parcial: solo indexa las filas en true, así que
-- la unicidad cae sobre ellas y las demás no se estorban entre sí.
CREATE UNIQUE INDEX IF NOT EXISTS "saas_plans_one_default"
  ON "public"."saas_plans" ("is_default") WHERE "is_default";

CREATE INDEX IF NOT EXISTS "saas_plans_active_order"
  ON "public"."saas_plans" ("sort_order", "created_at") WHERE "is_active";

-- Backfill: el plan activo más viejo pasa a ser el default, que es exactamente
-- el que venía eligiendo el `limit(1)` de las cuatro queries. Así el
-- comportamiento no cambia para un entorno que ya tenía su fila única.
--
-- En producción hoy saas_plans está vacía, así que esto no toca nada; queda por
-- los entornos que sí tengan datos.
UPDATE "public"."saas_plans"
   SET "is_default" = true
 WHERE "id" = (
   SELECT "id" FROM "public"."saas_plans"
    WHERE "is_active" ORDER BY "created_at" LIMIT 1
 )
 AND NOT EXISTS (SELECT 1 FROM "public"."saas_plans" WHERE "is_default");

-- ── 2. Plan pendiente de confirmación (cambio de plan) ──────────────────────
--
-- El checkout escribe el plan elegido apenas crea el preapproval, ANTES de que
-- el owner lo autorice en MP. Para un alta eso está bien. Para un gym que YA
-- está cobrando el plan A y pide el B, escribir plan_id=B ahí sería mentira: MP
-- le sigue debitando el precio de A hasta que autorice el preapproval nuevo, y
-- si abandona el checkout no autoriza nunca. El panel mostraría un plan que no
-- es el que se cobra.
--
-- El destino espera acá y el webhook lo promueve a plan_id recién con el
-- 'authorized' de MP, que es el único momento en que el cobro nuevo es un hecho.
ALTER TABLE "public"."gym_saas_subscriptions"
  ADD COLUMN IF NOT EXISTS "pending_plan_id" "uuid" REFERENCES "public"."saas_plans"("id");

COMMENT ON COLUMN "public"."gym_saas_subscriptions"."pending_plan_id" IS
  'Cambio de plan pedido y todavía no autorizado en MercadoPago. Lo promueve a plan_id el webhook al recibir authorized; lo limpia el reaper si el checkout se abandona.';

-- ── 3. Elegir el plan por defecto ───────────────────────────────────────────
--
-- Va como RPC y no como UPDATE directo del panel porque son dos escrituras
-- (bajar la bandera del anterior, subirla en el nuevo) y el índice único no
-- tolera el estado intermedio. Desde el browser serían dos requests separadas:
-- si la segunda falla, el sistema queda SIN default y el alta de gyms se rompe.
CREATE OR REPLACE FUNCTION "public"."set_default_saas_plan"("p_plan_id" "uuid")
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
BEGIN
  IF public.is_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.saas_plans WHERE id = p_plan_id AND is_active
  ) THEN
    RAISE EXCEPTION 'El plan no existe o está inactivo' USING ERRCODE = '22023';
  END IF;

  UPDATE public.saas_plans SET is_default = false, updated_at = now()
   WHERE is_default AND id <> p_plan_id;

  UPDATE public.saas_plans SET is_default = true, updated_at = now()
   WHERE id = p_plan_id;
END;
$$;

ALTER FUNCTION "public"."set_default_saas_plan"("uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."set_default_saas_plan"("uuid") IS
  'Marca un plan como el default (el que se asigna a los gyms nuevos) y desmarca al anterior en una sola transacción. Solo super_admin.';
GRANT EXECUTE ON FUNCTION "public"."set_default_saas_plan"("uuid") TO "authenticated";
REVOKE ALL ON FUNCTION "public"."set_default_saas_plan"("uuid") FROM PUBLIC, "anon";

-- ── 4. Borrar un plan ───────────────────────────────────────────────────────
--
-- plan_id en gym_saas_subscriptions es FK sin ON DELETE, así que un DELETE sobre
-- un plan referenciado explota con un error de FK crudo. Y borrar el default
-- deja al alta de gyms sin plan que asignar. Las dos cosas se chequean acá para
-- que el panel reciba un mensaje que pueda mostrar, en vez de un 23503.
--
-- Mismo criterio que delete_catalog_plan: borrar solo si nadie lo usa; si hay
-- gyms enganchados, el camino es desactivarlo.
CREATE OR REPLACE FUNCTION "public"."delete_saas_plan"("p_plan_id" "uuid")
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
DECLARE
  v_refs integer;
BEGIN
  IF public.is_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.saas_plans WHERE id = p_plan_id AND is_default) THEN
    RAISE EXCEPTION 'No se puede borrar el plan por defecto. Marcá otro como default primero.'
      USING ERRCODE = '23503';
  END IF;

  SELECT count(*) INTO v_refs
    FROM public.gym_saas_subscriptions
   WHERE plan_id = p_plan_id OR pending_plan_id = p_plan_id;

  IF v_refs > 0 THEN
    RAISE EXCEPTION 'El plan tiene % gimnasio(s) suscripto(s). Desactivalo en vez de borrarlo.', v_refs
      USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.saas_plans WHERE id = p_plan_id;
END;
$$;

ALTER FUNCTION "public"."delete_saas_plan"("uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."delete_saas_plan"("uuid") IS
  'Borra un plan SaaS solo si no es el default y ningún gym lo referencia. Solo super_admin.';
GRANT EXECUTE ON FUNCTION "public"."delete_saas_plan"("uuid") TO "authenticated";
REVOKE ALL ON FUNCTION "public"."delete_saas_plan"("uuid") FROM PUBLIC, "anon";

-- ── 5. Límite de socios por plan ────────────────────────────────────────────

-- Tope del plan vigente del gym. NULL = sin límite, y cubre los dos casos que
-- significan lo mismo: plan ilimitado, o gym sin fila de suscripción (los
-- legacy, mismo criterio que is_saas_subscription_active, que los deja pasar).
CREATE OR REPLACE FUNCTION "public"."gym_member_limit"("p_gym_id" "uuid")
RETURNS integer
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
  SELECT p.max_members
    FROM public.gym_saas_subscriptions s
    JOIN public.saas_plans p ON p.id = s.plan_id
   WHERE s.gym_id = p_gym_id;
$$;

ALTER FUNCTION "public"."gym_member_limit"("uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."gym_member_limit"("uuid") IS
  'Tope de socios activos del plan del gym. NULL = ilimitado (o gym sin suscripción).';

CREATE OR REPLACE FUNCTION "public"."can_add_gym_member"("p_gym_id" "uuid")
RETURNS boolean
LANGUAGE "plpgsql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  -- Bajo service role auth.uid() es NULL y esto da false, así que el límite
  -- TAMBIÉN aplica a crear-socio. Es la dirección segura y es deliberado: si el
  -- bypass funcionara ahí, el tope no valdría nada (crear-socio es el único
  -- camino de alta que existe).
  IF public.is_super_admin() IS TRUE THEN
    RETURN true;
  END IF;

  v_limit := public.gym_member_limit(p_gym_id);
  IF v_limit IS NULL THEN
    RETURN true;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.memberships
   WHERE gym_id = p_gym_id AND role = 'member' AND status = 'active';

  RETURN v_count < v_limit;
END;
$$;

ALTER FUNCTION "public"."can_add_gym_member"("uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."can_add_gym_member"("uuid") IS
  '¿Le entra un socio activo más al gym según el tope de su plan? true si no hay tope.';
GRANT EXECUTE ON FUNCTION "public"."can_add_gym_member"("uuid") TO "authenticated";
REVOKE ALL ON FUNCTION "public"."can_add_gym_member"("uuid") FROM PUBLIC, "anon";

-- El enforcement va en un TRIGGER y no en una policy RESTRICTIVE, por dos
-- razones que no son de estilo:
--
--   1. Los socios se dan de alta por la edge function crear-socio, que usa
--      service role y por lo tanto BYPASEA RLS. Una policy no se enteraría
--      nunca; el trigger corre igual.
--   2. Reactivar un socio inactivo es un UPDATE status→'active', y para no
--      bloquear la edición de un socio que YA estaba activo hay que comparar
--      OLD contra NEW (el conteo ya lo incluye → off-by-one). El WITH CHECK de
--      una policy no ve OLD.
CREATE OR REPLACE FUNCTION "public"."enforce_gym_member_limit"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Solo interesa la fila que RESULTA en un socio activo.
  IF NEW.role <> 'member' OR NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- Y que antes no lo fuera: editar un socio ya activo no suma a nadie, y
  -- frenarlo dejaría al gym que llegó al tope sin poder ni corregir un nombre.
  IF TG_OP = 'UPDATE' AND OLD.role = 'member' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  IF NOT public.can_add_gym_member(NEW.gym_id) THEN
    RAISE EXCEPTION 'El plan del gimnasio llegó a su límite de socios activos.'
      USING ERRCODE = 'check_violation', HINT = 'gym_member_limit_reached';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."enforce_gym_member_limit"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."enforce_gym_member_limit"() IS
  'Hace cumplir saas_plans.max_members en el alta, la reactivación y el cambio de rol a member. No toca a los socios ya cargados: un gym por encima del tope (downgrade, o tope bajado) los conserva y solo no puede sumar más.';

DROP TRIGGER IF EXISTS "memberships_member_limit" ON "public"."memberships";
CREATE TRIGGER "memberships_member_limit"
  BEFORE INSERT OR UPDATE ON "public"."memberships"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_gym_member_limit"();

-- Uso actual contra el tope, para el contador del panel. Devuelve NULL en
-- max_allowed cuando no hay límite.
CREATE OR REPLACE FUNCTION "public"."gym_member_usage"("p_gym_id" "uuid")
RETURNS TABLE("used" integer, "max_allowed" integer)
LANGUAGE "plpgsql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT (public.is_staff_of(p_gym_id) OR public.is_super_admin() IS TRUE) THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT (
      SELECT count(*)::integer FROM public.memberships m
       WHERE m.gym_id = p_gym_id AND m.role = 'member' AND m.status = 'active'
    ), public.gym_member_limit(p_gym_id);
END;
$$;

ALTER FUNCTION "public"."gym_member_usage"("uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."gym_member_usage"("uuid") IS
  'Socios activos del gym y tope de su plan (NULL = ilimitado), para el contador del panel. Solo staff del gym.';
GRANT EXECUTE ON FUNCTION "public"."gym_member_usage"("uuid") TO "authenticated";
REVOKE ALL ON FUNCTION "public"."gym_member_usage"("uuid") FROM PUBLIC, "anon";
