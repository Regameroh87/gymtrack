-- Cómo se cobra el primer mes de una membresía: decisión del gym, no nuestra.
--
-- El alta ahora crea la membresía debiendo el MES CALENDARIO en curso (antes daba
-- por pagado el primer mes y anclaba el vencimiento al día del alta, que es lo que
-- se acaba de arreglar). Con mes calendario queda una pregunta que no tiene una
-- respuesta universal: un socio que se anota el 20 de agosto, ¿paga agosto entero
-- por 11 días de uso, o paga la parte proporcional?
--
-- Los dos criterios existen en la calle. El gym que cobra por mes cerrado no quiere
-- calcular fracciones, y el que compite por precio no quiere cobrarle un mes entero
-- a alguien que entra a fin de mes. Elegir uno por ellos es meterse en su política
-- comercial, así que va como configuración del gym.
--
-- LO QUE ESTO NO CAMBIA
--
-- El período sigue siendo el mes calendario en los dos casos: prorratear mueve el
-- MONTO sugerido del primer cobro, no las fechas. El socio del 20/8 queda cubierto
-- hasta el 1/9 elija el gym lo que elija. Es a propósito: el período corrido
-- (20/8 → 20/9) obligaría a sacar el anclaje a mes calendario de
-- member_pending_charges, del RPC de cobro y del checkout de MercadoPago — o sea,
-- sostener dos modelos de cobranza a la vez. Esto es un default de monto; aquello
-- sería otro sistema.
--
-- Y el monto queda editable en el alta: la configuración decide qué viene
-- precargado, no qué se puede cobrar.

ALTER TABLE "public"."gyms"
  ADD COLUMN IF NOT EXISTS "prorate_first_month" boolean DEFAULT false NOT NULL;

-- Arranca apagado: es el comportamiento que los gyms ya tienen (mes completo), así
-- que ninguno se entera del cambio hasta que lo prenda.
COMMENT ON COLUMN "public"."gyms"."prorate_first_month" IS
  'Si es true, el alta de una membresía a mitad de mes sugiere el monto proporcional a los días que quedan del mes en curso, en vez del precio completo del pase. Solo afecta el monto sugerido del primer cobro: el período cubierto es el mes calendario en los dos casos, y el monto es editable.';

-- Misma razón que set_training_access: la RLS de gyms solo deja escribir a la
-- plataforma, y Postgres no permite acotar una policy a ciertas columnas. Abrir el
-- UPDATE al owner le daría también slug, owner_id y el branding. Por eso va como
-- RPC acotado que valida rol y toca únicamente esta columna.
CREATE OR REPLACE FUNCTION "public"."set_billing_settings"(
  "p_gym_id" "uuid",
  "p_prorate_first_month" boolean DEFAULT NULL
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Coach no: es política de precios, la misma línea que usa set_training_access
  -- para la oferta comercial.
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

  -- Lo que no se manda queda como está, así cada control del panel toca solo lo
  -- suyo cuando esta configuración crezca.
  UPDATE public.gyms
  SET prorate_first_month = COALESCE(p_prorate_first_month, prorate_first_month),
      updated_at = now()
  WHERE id = p_gym_id;
END;
$$;

ALTER FUNCTION "public"."set_billing_settings"("p_gym_id" "uuid", "p_prorate_first_month" boolean) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."set_billing_settings"("p_gym_id" "uuid", "p_prorate_first_month" boolean) IS
  'Configura la política de cobranza del gym (por ahora, el prorrateo del primer mes). Solo owner/admin del gym (o super_admin).';

GRANT EXECUTE ON FUNCTION "public"."set_billing_settings"("p_gym_id" "uuid", "p_prorate_first_month" boolean) TO "authenticated";
