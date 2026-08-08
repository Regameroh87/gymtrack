-- El prorrateo del primer mes deja de ser todo-o-nada.
--
-- Como quedó en la migración 20260803140000, prorate_first_month era un
-- interruptor: o el alta sugiere el precio completo siempre, o sugiere la parte
-- proporcional siempre. En la práctica el gym quiere las dos cosas según el día:
-- el que se anota los primeros días del mes paga el mes entero, y recién el que
-- entra más tarde paga proporcional.
--
-- Y no alcanza con confiar en que la cuenta proporcional ya da casi todo el mes
-- en los primeros días. Da CASI: un alta el día 2 de un mes de 31 sugiere 30/31,
-- o sea un 3% menos. Es un descuento que nadie decidió dar, aparece solo, y en un
-- cobro en efectivo obliga al staff a corregir el monto a mano todas las veces.
-- Con el umbral, hasta el día N el monto sugerido es el precio del pase y punto.
--
-- El día es del gym, igual que el resto: hay gimnasios que dan la primera semana
-- entera y otros que cortan a los tres días. Arranca en 5.
--
-- Mismo patrón que training_access_require_paid + training_access_grace_days: un
-- booleano que prende la política y un número que la parametriza, donde el número
-- solo tiene efecto con el booleano en true.

ALTER TABLE "public"."gyms"
  ADD COLUMN IF NOT EXISTS "full_month_until_day" integer DEFAULT 5 NOT NULL;

ALTER TABLE "public"."gyms"
  DROP CONSTRAINT IF EXISTS "gyms_full_month_until_day_check";

-- Tope en 28 y no en 31: más allá de eso el corte caería en un día que no existe
-- en todos los meses, y "cobrar completo hasta el 30" sería una regla que en
-- febrero significa "siempre".
ALTER TABLE "public"."gyms"
  ADD CONSTRAINT "gyms_full_month_until_day_check"
  CHECK ("full_month_until_day" BETWEEN 1 AND 28);

COMMENT ON COLUMN "public"."gyms"."full_month_until_day" IS
  'Solo aplica con prorate_first_month=true. Hasta este día del mes, un alta sugiere el precio completo del pase; a partir del siguiente sugiere la parte proporcional a los días que quedan. Es el monto sugerido del primer cobro: el período cubierto es el mes calendario en todos los casos, y el monto es editable.';

-- Suma el parámetro nuevo. Va con drop previo por lo mismo que la migración
-- anterior: agregar un parámetro es una firma distinta, así que sin el drop
-- quedarían las dos funciones vivas y toda llamada de tres argumentos sería
-- ambigua.
drop function if exists public.set_billing_settings(uuid, boolean, boolean);

CREATE OR REPLACE FUNCTION "public"."set_billing_settings"(
  "p_gym_id" "uuid",
  "p_prorate_first_month" boolean DEFAULT NULL,
  "p_due_day_is_covered" boolean DEFAULT NULL,
  "p_full_month_until_day" integer DEFAULT NULL
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
BEGIN
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

  -- Se valida acá además del CHECK para que el panel reciba un mensaje que se
  -- pueda mostrar, en vez del texto de una violación de constraint.
  IF p_full_month_until_day IS NOT NULL
     AND p_full_month_until_day NOT BETWEEN 1 AND 28 THEN
    RAISE EXCEPTION 'El día de corte debe estar entre 1 y 28' USING ERRCODE = '22023';
  END IF;

  -- Lo que no se manda queda como está, así cada control del panel toca solo lo
  -- suyo.
  UPDATE public.gyms
  SET prorate_first_month  = COALESCE(p_prorate_first_month, prorate_first_month),
      due_day_is_covered   = COALESCE(p_due_day_is_covered, due_day_is_covered),
      full_month_until_day = COALESCE(p_full_month_until_day, full_month_until_day),
      updated_at = now()
  WHERE id = p_gym_id;
END;
$$;

ALTER FUNCTION "public"."set_billing_settings"("p_gym_id" "uuid", "p_prorate_first_month" boolean, "p_due_day_is_covered" boolean, "p_full_month_until_day" integer) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."set_billing_settings"("p_gym_id" "uuid", "p_prorate_first_month" boolean, "p_due_day_is_covered" boolean, "p_full_month_until_day" integer) IS
  'Configura la política de cobranza del gym: prorrateo del primer mes, día hasta el que se cobra completo, y si el día del vencimiento todavía cuenta como pago. Solo owner/admin del gym (o super_admin).';

GRANT EXECUTE ON FUNCTION "public"."set_billing_settings"("p_gym_id" "uuid", "p_prorate_first_month" boolean, "p_due_day_is_covered" boolean, "p_full_month_until_day" integer) TO "authenticated";
