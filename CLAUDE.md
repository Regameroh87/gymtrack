# Convenciones del proyecto

## Base de datos

**No dejar columnas sueltas.** Una columna que dejó de usarse se elimina, no se
comenta como "sin uso" ni se deja por las dudas. Un campo muerto que sigue en la
tabla es una invitación a que alguien lo vuelva a cablear sin saber por qué se
había abandonado.

El borrado va **después** de desplegar el código que dejó de leerla, nunca en la
misma tanda. Al revés rompe la app que está corriendo: el bundle viejo sigue
pidiendo la columna en su `select` y PostgREST contesta 400 hasta que termina el
despliegue. Si hace falta cortar el paso en dos, la migración que borra se
manda aparte y se aclara en el mensaje del commit que depende del deploy previo.
