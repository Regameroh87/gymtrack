-- El Reply-To de los mails de cobranza pasa a salir de gyms.email en vez de un
-- campo propio de la cobranza. Son la misma cosa (la dirección de contacto del
-- gimnasio) y tenerla duplicada solo abría la puerta a que difirieran.
--
-- gym_dunning_settings.reply_to queda sin uso: el panel ya no lo escribe y el
-- job ya no lo lee. Se elimina en vez de dejarlo muerto — está en NULL en todas
-- las filas (la columna nació hoy, en 20260802120000, y nunca se cargó), así
-- que no se pierde ningún dato.
alter table gym_dunning_settings drop column if exists reply_to;

-- gyms.email viaja tal cual hasta Resend, que valida las direcciones y rechaza
-- el envío entero si no le cierra. Sin este check, un typo en el mail del
-- gimnasio voltea toda la cobranza y el owner recién lo ve en el historial.
--
-- La forma es a propósito laxa: el caso real no es el RFC 5322, es la coma en
-- lugar del punto o el @ que falta. Sigue admitiendo NULL — hoy los gimnasios
-- lo tienen vacío y la columna no puede volverse obligatoria sin romperlos; que
-- la cobranza exija tenerlo cargado se resuelve en la app, no acá.
alter table gyms
  add constraint gyms_email_format
  check (email is null or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

comment on column gyms.email is
  'Mail de contacto del gimnasio. Es el Reply-To de los mails de cobranza: los '
  'mails salen desde el noreply@ de la plataforma, así que esto es lo único que '
  'hace que la respuesta de un socio llegue a alguien. Obligatorio para prender '
  'la cobranza (se valida en la app; la columna admite NULL por los gyms viejos).';
