# Edge functions — deploy manual

Las funciones **no** se deployan solas: no hay CI que las suba. Un merge a `main`
deja el código nuevo en el repo y la versión vieja corriendo en Supabase. Cada
vez que se toca algo de `supabase/functions/`, hay que deployar a mano.

## El comando

Con la [CLI de Supabase](https://supabase.com/docs/guides/local-development)
instalada y logueada (`supabase login`):

```bash
supabase functions deploy <nombre> --project-ref <ref>
```

`<ref>` es el project ref de Supabase (el subdominio de la URL del proyecto:
`https://<ref>.supabase.co`). Se puede evitar repetirlo con
`supabase link --project-ref <ref>` una sola vez.

Varias juntas, en un solo comando:

```bash
supabase functions deploy mp-webhook crear-cobro-socio mp-gym-webhook --project-ref <ref>
```

Y todas de una (sirve cuando se tocó algo de `_shared/`, ver más abajo):

```bash
supabase functions deploy --project-ref <ref>
```

### `verify_jwt` sale de `config.toml`, no del comando

Cada función declara el suyo en `supabase/config.toml`:

```toml
[functions.mp-gym-webhook]
enabled = true
verify_jwt = false
entrypoint = "./functions/mp-gym-webhook/index.ts"
```

La CLI lo lee de ahí, así que **no hace falta pasar `--no-verify-jwt`**. Importa
saberlo porque el default de Supabase es `verify_jwt = true`, y un webhook
deployado con JWT prendido rechaza todos los avisos de MercadoPago con 401 antes
de que el código llegue a ejecutarse: MP no manda JWT, manda su firma HMAC en
`x-signature`. Los tres webhooks (`mp-webhook`, `mp-gym-webhook`,
`resend-webhook`) y `send-email` van con `verify_jwt = false` por eso, y validan
la autenticidad adentro.

Si se deploya desde el dashboard o desde una herramienta que no lee
`config.toml`, ese flag hay que ponerlo a mano.

## `_shared/` no es un deploy aparte

`_shared/mp-signature.ts` y `_shared/mp-oauth.ts` no son una función: se bundlean
dentro de cada función que los importa. Un cambio en `_shared/` **no llega a
ninguna función hasta que se redeployan las que lo usan**.

Quién usa qué, hoy:

| módulo compartido       | lo importan                       |
| ----------------------- | --------------------------------- |
| `_shared/mp-signature.ts` | `mp-webhook`, `mp-gym-webhook`   |
| `_shared/mp-oauth.ts`     | `crear-cobro-socio`              |

Ante la duda, `supabase functions deploy` sin argumentos las sube todas y el
problema desaparece.

## Los secrets van antes del deploy

Las funciones leen su configuración de Edge Functions → Secrets, no del repo.
Dos casos donde el orden importa y el síntoma no es obvio:

- **`MP_WEBHOOK_SECRET` / `MP_GYM_WEBHOOK_SECRET`**: sin el secret, la firma no
  se puede validar y el aviso se rechaza con 401 (fail-closed, a propósito — un
  aviso que no se puede validar no se procesa). Deployar antes de cargarlos deja
  los cobros sin registrarse en silencio.
- **`MP_GYM_WEBHOOK_URL`**: sin ella `crear-cobro-socio` se niega a generar el
  link de pago, porque un pago sin webhook se cobra y nunca se registra.

La lista completa, con qué función usa cada uno, está en
[`PROD_CHECKLIST.md`](../../PROD_CHECKLIST.md).

Cargar un secret no redeploya nada, pero sí lo toma la ejecución siguiente:

```bash
supabase secrets set MP_GYM_WEBHOOK_SECRET=... --project-ref <ref>
supabase secrets list --project-ref <ref>   # confirma qué está cargado (no muestra valores)
```

## Verificar que quedó bien

```bash
supabase functions list --project-ref <ref>
```

Mira la columna de versión: si no subió respecto de antes del deploy, el código
viejo sigue corriendo. Después, `supabase functions logs <nombre> --project-ref <ref>`
o el dashboard para ver qué contestó el primer aviso real.

Un chequeo rápido de que un webhook está vivo y rechazando lo que debe rechazar:

```bash
curl -i -X POST "https://<ref>.supabase.co/functions/v1/mp-gym-webhook?data.id=123456&type=payment" \
  -H "Content-Type: application/json" -d '{"type":"payment","data":{"id":"123456"}}'
```

Tiene que dar **401**. Un 200 significa que el aviso se procesó sin firma válida,
y un 401 con `Invalid JWT` en el body (en vez del `Unauthorized` de la función)
significa que quedó deployada con `verify_jwt = true`.

## Antes de deployar

`deno check` sobre las funciones que tocan plata corre en CI
(`.github/workflows/ci.yml`), junto con los tests de `_shared`. Localmente:

```bash
deno test supabase/functions/_shared/mp-signature.test.ts
deno check \
  supabase/functions/_shared/mp-signature.ts \
  supabase/functions/_shared/mp-oauth.ts \
  supabase/functions/mp-webhook/index.ts \
  supabase/functions/mp-gym-webhook/index.ts \
  supabase/functions/crear-cobro-socio/index.ts
```
