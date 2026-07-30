-- Corrige el comment de member_pending_charges: apuntaba a una ruta que no
-- existe.
--
-- La migración 20260726130000 dejó escrito que la usa "/api/gym-mp/cobro". Esa
-- ruta nunca se implementó: el cobro lo arma la edge function
-- crear-cobro-socio, que es donde vive el token OAuth del gym y el único lugar
-- desde el que se crea la preferencia. El resto de /api/gym-mp/* sí existe
-- (connect, callback, toggle, disconnect), y justamente por eso el nombre
-- inventado se lee como si fuera uno más de esa familia — que es lo que lo hace
-- caro: manda a buscar el cobro al lado equivocado del sistema.
--
-- Solo cambia el texto del comment. El cuerpo de la función, su firma y sus
-- permisos quedan exactamente como estaban: por eso no se la redefine.

comment on function public.member_pending_charges(uuid, uuid) is
  'Cuotas que un socio debe en un gym, una fila por actividad. Es la definición única de "lo que hay que cobrarle": la usa la edge function crear-cobro-socio para armar el desglose, y la app móvil para mostrárselo al socio antes de pagar.';
