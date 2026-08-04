-- gym_dunning_settings.reply_to vuelve a estar en uso, pero con otra semántica
-- que la original: ahora es un OVERRIDE opcional sobre gyms.email, no la única
-- fuente. NULL —el caso normal— significa "usar el mail de contacto del
-- gimnasio"; solo se completa cuando las respuestas de los deudores tienen que
-- ir a una casilla distinta de la de contacto general.
--
-- Ese cambio es lo que arregla el problema de la versión anterior: antes esto
-- era el único origen del Reply-To y arrancaba vacío, así que la cobranza salía
-- sin dirección de respuesta y nadie se enteraba. Con el fallback, siempre hay
-- un valor.
comment on column gym_dunning_settings.reply_to is
  'Override del Reply-To de los mails de cobranza. NULL = usar gyms.email, que '
  'es el caso normal. Se completa solo para mandar las respuestas de los '
  'deudores a una casilla distinta de la de contacto del gimnasio.';

-- Mismo check que gyms.email, y por el mismo motivo: el valor viaja tal cual
-- hasta Resend, que valida las direcciones y rechaza el envío entero. Sin esto,
-- un typo en este campo opcional voltea toda la cobranza del gimnasio y recién
-- se ve en el historial. La forma es laxa a propósito — el caso real no es el
-- RFC 5322, es la coma en lugar del punto o el @ que falta.
alter table gym_dunning_settings
  add constraint gym_dunning_settings_reply_to_format
  check (reply_to is null or reply_to ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
