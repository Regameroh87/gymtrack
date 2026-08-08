-- El cooldown de cobranza pasa a estar acotado al MISMO recordatorio.
--
-- Solo documentación: el comportamiento vive en el job
-- (supabase/functions/cobranza-recordatorios), no en la base. Esta migración
-- existe para que el comentario de la columna deje de mentir.
--
-- El comentario original decía "aunque coincidan otro step", que describía
-- exactamente el problema: un cooldown mayor que el salto entre dos escalones
-- se comía el segundo en silencio. Con steps en día 10 y día 15 y un cooldown
-- de 7, el recordatorio del día 15 no salía nunca — quedaba como 'skipped' en
-- gym_dunning_log y el owner no tenía forma de enterarse.
--
-- Ahora el job compara (user_id, step_id): repetir el mismo recordatorio se
-- frena, avanzar al siguiente no. El cooldown queda inocuo para la escalada
-- valga lo que valga, que es lo que lo vuelve seguro de configurar.

comment on column public.gym_dunning_settings.cooldown_days is
  'Mínimo de días antes de repetir EL MISMO recordatorio al mismo socio. Cubre el rebote de un pago parcial: al pagar una cuota, reference_due_date se corre y la idempotencia por unique ya no reconoce el envío previo. No afecta la escalada: pasar a un step distinto nunca se frena por esto.';
