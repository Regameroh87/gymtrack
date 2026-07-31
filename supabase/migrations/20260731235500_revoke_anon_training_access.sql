-- Las funciones del gate no tienen nada que hacer sin sesión: sin auth.uid() el
-- veredicto es siempre "no sos miembro" y el setter tira 42501. Igual se les
-- revoca EXECUTE a anon para no dejarlas colgando del API público (lo marca el
-- linter 0028 de Supabase).
REVOKE ALL ON FUNCTION "public"."member_training_access"("p_gym_id" "uuid") FROM "anon";

REVOKE ALL ON FUNCTION "public"."set_training_access"("p_gym_id" "uuid", "p_gated" boolean, "p_grace_days" integer) FROM "anon";

-- La función del trigger de la semilla tampoco es un RPC: solo corre como
-- trigger de gyms (llamarla directo falla, pero no tiene por qué estar expuesta).
REVOKE ALL ON FUNCTION "public"."seed_default_activity_on_gym_insert"() FROM PUBLIC, "anon", "authenticated";
