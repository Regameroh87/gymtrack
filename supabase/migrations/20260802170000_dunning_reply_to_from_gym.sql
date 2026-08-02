-- El Reply-To de los mails de cobranza pasa a salir de gyms.email en vez de un
-- campo propio de la cobranza. Son la misma cosa (la dirección de contacto del
-- gimnasio) y tenerla duplicada solo abría la puerta a que difirieran.
--
-- gym_dunning_settings.reply_to queda sin uso: el panel ya no lo escribe y el
-- job ya no lo lee.
--
-- NO se borra todavía. Borrarla acá rompe el frontend que está corriendo, que
-- sigue pidiéndola en su select hasta que se despliegue esta misma rama: la
-- pantalla de cobranza se cae entera con "column gym_dunning_settings.reply_to
-- does not exist". La columna se elimina en una migración posterior, una vez
-- desplegada la web que dejó de leerla. Está en NULL en todas las filas, así
-- que mientras tanto no molesta a nadie.
comment on column gym_dunning_settings.reply_to is
  'SIN USO. El Reply-To de la cobranza sale de gyms.email. Esta columna existe '
  'solo para no romper el frontend anterior; se puede borrar una vez que la web '
  'desplegada ya no la incluya en su select.';

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
