# Checklist de producción (MVP)

Estado del plan MVP → prod. Lo ya hecho quedó verificado en código/infra; lo
pendiente son trámites y configuración que requieren cuentas del dueño del
proyecto. Ir tachando antes de invitar al primer gimnasio pagando.

## ✅ Hecho (en el repo / aplicado en Supabase)

- [x] **Hardening de la base** (`20260710120000_prod_hardening.sql`, aplicado):
      bucket `media` sin listado público; RPCs `SECURITY DEFINER` restringidas
      al mínimo rol (`purge_*` y `delete_gym_cascade` solo service_role).
      Advisors de seguridad: solo quedan las 3 RPCs públicas por diseño
      (`email_exists`, `get_public_gym`, `list_public_gyms`) y el INFO de
      `media_delete_queue` (intencional: solo la toca el service role).
- [x] **Sentry** integrado en mobile (`@sentry/react-native`) y web
      (`@sentry/nextjs`): sin DSN queda inactivo, no requiere nada para dev.
- [x] **CI** (`.github/workflows/ci.yml`): tsc + lint de web, sintaxis de core
      y tests del sync en cada PR/push a main.
- [x] **Tests del motor de sync** (15 casos sobre `sync-core.js`): el PULL no
      pisa cambios locales, tombstones ganan, reconciliación exacta, catálogo.
      Correr con `npm --workspace gymtrack run test`.
- [x] **Test de aislamiento RLS** (`scripts/test-rls-isolation.mjs` +
      workflow manual `RLS isolation`).
- [x] **Health Connect tras feature flag**: los builds de producción salen sin
      permisos ni módulos de salud (verificado con `expo config`); dev/preview
      los conservan. Para activar en prod: `EXPO_PUBLIC_HEALTH=1` + build.
- [x] **Páginas legales**: `/legal/privacidad` y `/legal/terminos` en la web.
- [x] **Aislamiento del vendedor de prueba de MP**
      (`20260725120000_saas_test_isolation.sql`): `gym_saas_subscriptions.mp_application_id`
      (una fila solo la escribe la app que la creó) + `gyms.is_test` (el sandbox
      solo puede tocar gyms marcados como de prueba, toggle en
      `/platform/gyms/[id]`). El checkout además cancela y rechaza con 422 si un
      token de prueba apuntó a un gym real.
- [x] **Suscripciones huérfanas** (`20260725130000_saas_pending_orphans.sql`):
      cron `expire-saas-pending` cierra las filas de checkouts abandonados, y el
      Vercel Cron `/api/cron/saas-reap-preapprovals` cancela en MP los
      preapprovals `pending` que nadie autorizó (si no, reabrir un `init_point`
      viejo cobra la tarjeta y el webhook descarta el aviso). `eliminar-gym`
      cancela el preapproval antes del borrado en cascada.

## 🔲 Pendiente — cuentas y configuración (dueño del proyecto)

### Supabase
- [ ] **Upgrade a Pro** ($25/mes): en Free la base se pausa a los 7 días sin
      tráfico y no hay backups. Dashboard → Settings → Billing.
- [ ] **Probar una restauración de backup** (una vez, tras el upgrade):
      Database → Backups → restaurar a un proyecto nuevo temporal y verificar
      que los datos estén. Un backup no probado no cuenta como backup.
- [ ] **Bajar los rate limits de Auth**: Dashboard → Authentication → Rate
      Limits. Sugerido: OTP por hora ≤ 10 por IP (default es generoso). Evita
      spam de emails de login que consume cuota de Resend.

### Cloudflare R2 — mudanza de los videos

Los ~150 videos (2,6 GB) son el 99% del storage y prácticamente todo el egress.
En el plan Free de Supabase el tope de storage es 1 GB, así que hoy están por
encima de la cuota; en R2 entran en el free tier (10 GB) y el egress no se
cobra. Las imágenes (~15 MB) se quedan en Supabase Storage.

- [ ] **Crear el bucket R2** y un token de API con lectura/escritura sobre él.
- [ ] **Conectarle un dominio propio** (ej. `media.gymtrack.ar`): es el prefijo
      que queda guardado en las columnas `video_uri`. Con el dominio de
      desarrollo `r2.dev` alcanza para probar, pero no para producción — está
      rate-limitado y no es tuyo.
- [ ] **Cargar los secrets** en las edge functions: `R2_ACCOUNT_ID`,
      `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
      `R2_PUBLIC_BASE_URL`.
- [ ] **Configurar CORS en el bucket** (R2 → el bucket → Settings → CORS
      Policy). Sin esto las subidas desde el navegador fallan con un
      `Failed to fetch` a secas: el browser hace el PUT contra el endpoint S3,
      que es otro origen, y el preflight se rechaza. Mobile no lo necesita
      (React Native no aplica CORS), así que el síntoma aparece **solo en
      web** y solo al subir un video.

      ```json
      [
        {
          "AllowedOrigins": [
            "https://www.gymtrack.ar",
            "https://gymtrack.ar",
            "https://*.vercel.app",
            "http://localhost:3000"
          ],
          "AllowedMethods": ["PUT"],
          "AllowedHeaders": ["content-type", "cache-control"],
          "MaxAgeSeconds": 3600
        }
      ]
      ```

      `AllowedHeaders` tiene que listar exactamente los headers que van
      firmados en `presignPut` — el preflight pide permiso para esos y si
      falta uno, falla. Si algún día se agrega un header a la firma, hay que
      agregarlo también acá.

**El dominio público tiene que ser el definitivo antes del paso 3**: el prefijo
queda escrito en las 151 filas de `video_uri`. Migrar con `r2.dev` y mudarse
después a un dominio propio obliga a reescribir todo otra vez.

**Los pasos 1 a 3 van en la misma sesión, el mismo día.** Entre la copia y la
reescritura los objetos de R2 todavía no los referencia ninguna fila, así que
si pasan más de 24hs quedan a tiro del barrido de huérfanos de `cleanUp-media`
y se borran solos. No es pérdida de datos — los originales de Storage siguen
intactos — pero deshace la copia sin avisar. Si se cortó a mitad de camino,
volvé a correr el script antes de seguir: es idempotente.

**El orden importa y no es negociable** — cada paso depende del anterior:

1. [ ] `node scripts/migrate-videos-to-r2.mjs` (dry-run) y después con
       `--execute`. Copia y verifica tamaño + MD5 de cada video. **No borra
       nada**: al terminar los videos están en los dos lados, y esa duplicación
       es la red de seguridad de toda la mudanza.
2. [ ] Desplegar las edge functions (`sign-video-upload`, `sync-media-webhook`,
       `cleanUp-media`), la web y el update de Expo.
3. [ ] Recién ahí, aplicar la migración SQL que emite el script: reescribe
       `video_uri` con el trigger `sync-media-assets-exercises` desactivado.
       Con el trigger activo, el `UPDATE` dispara `sync-media-webhook`, que
       borra el asset viejo cuando la columna cambia — o sea que borraría los
       151 originales justo cuando todavía son la única copia verificada.
4. [ ] **Mucho después**, cuando ya no queden bundles viejos de Expo con las
       URLs de Storage en su SQLite: borrar los originales del bucket `media`,
       en su propia tanda. Hasta entonces no los toca nadie — el barrido de
       huérfanos de `cleanUp-media` ya no mira el prefijo `videos/` de Storage
       justamente para eso.
5. [ ] Después del paso 4, restringir la policy de INSERT del bucket `media` a
       `images/` otra vez (hoy sigue aceptando `videos/` para no romper los
       bundles viejos que todavía suben ahí).

### MercadoPago
Referencia completa de las variables: `apps/web/.env.example`.

- [ ] **Vercel** (Settings → Environment Variables): `MP_ACCESS_TOKEN` con el
      token productivo **solo en Production**, y el de un vendedor de prueba en
      Preview/Development. `MP_TEST_APPLICATION_ID` en **los tres** entornos: es
      lo único que frena que un token de prueba estrene una suscripción sobre un
      gimnasio real. `MP_TEST_PAYER_EMAIL` solo en Preview/Development.
- [ ] **Supabase** (Edge Functions → Secrets, los usan `mp-webhook` y
      `eliminar-gym`): `MP_ACCESS_TOKEN` + `MP_WEBHOOK_SECRET` de la app real y
      `MP_ACCESS_TOKEN_TEST` + `MP_WEBHOOK_SECRET_TEST` + `MP_TEST_APPLICATION_ID`
      de la de prueba. El proyecto es uno solo: la función está deployada una vez
      y atiende las dos apps, eligiendo credenciales por `application_id`.
      **Los `*_WEBHOOK_SECRET` van antes del deploy, no después**: sin secret
      cargado la firma no se puede validar y el aviso se rechaza con 401, así que
      un deploy adelantado deja las suscripciones sin activarse hasta que estén.
- [ ] **Registrar la URL del webhook en el panel de MP, por aplicación**
      (`https://<ref>.supabase.co/functions/v1/mp-webhook`). `/preapproval` NO
      acepta `notification_url`: si la app cobradora cambia y nadie carga la URL
      allá, no llega ninguna notificación y las suscripciones nunca se activan.
- [ ] **Verificar el cron de huérfanos**: tras el primer deploy, Vercel →
      Settings → Cron Jobs muestra `/api/cron/saas-reap-preapprovals` y genera
      `CRON_SECRET`. En plan Hobby los crons corren una vez por día.
- [ ] **Probar el flujo en un gym marcado como de prueba** (nunca en prod):
      `/platform/gyms/[id]` → "Gimnasio de prueba" → checkout con
      `MP_TEST_PAYER_EMAIL` y tarjeta de prueba. Los test users de MP no sirven
      (colector real vs. pagador de prueba).

### MercadoPago — cobros del gym a sus socios (OAuth / marketplace)
Flujo distinto al de arriba: acá el gimnasio le cobra al socio y la plata cae en
la cuenta **del gym**, no en la nuestra. Cada gym autoriza por OAuth y guardamos
un token delegado por gimnasio.

- [ ] **Habilitar OAuth en la aplicación de MP** y registrar el redirect URI
      exacto `https://www.gymtrack.ar/api/gym-mp/callback`. MP rechaza el canje
      si no coincide carácter por carácter con el que manda `/connect`.
- [ ] **Vercel**: `MP_OAUTH_CLIENT_ID` y `MP_OAUTH_CLIENT_SECRET` de esa
      aplicación. Sin las dos, `/api/gym-mp/connect` responde 500.
- [ ] **Verificar el cron de renovación**: Vercel → Cron Jobs debe mostrar
      `/api/cron/refresh-mp-tokens`. **No es opcional**: los tokens de OAuth
      caducan (~180 días) y uno vencido no avisa — el panel sigue diciendo
      "habilitado" y el socio descubre el problema al intentar pagar.
- [x] **Confirmar que los tokens no son legibles desde el cliente** (verificado
      contra la base el 2026-07-27, con las migraciones ya aplicadas). Los
      cuatro casos dan permiso denegado: `select *` como `anon`,
      `select token_secret_id` como `authenticated`, y `gym_mp_get_credentials()`
      con los dos roles. Los wrappers de Vault quedaron `SECURITY DEFINER` con
      EXECUTE solo para `service_role`; `authenticated` ve siete columnas de
      `gym_mp_accounts` y ninguna es un secreto. `member_pending_charges` sí es
      invocable por `authenticated`, a propósito: es `SECURITY INVOKER` y RLS
      decide qué devuelve.
- [ ] **Probar con un test user de MP** conectado desde un gym de prueba. La
      página `/admin/cobros` avisa con un cartel ámbar cuando la cuenta
      conectada no es productiva (`live_mode = false`): si ese cartel aparece en
      un gym real, hay un error de configuración.
- [ ] **Supabase** (Edge Functions → Secrets, los usan `crear-cobro-socio` y
      `mp-gym-webhook`):
      `MP_GYM_WEBHOOK_URL` = `https://<ref>.supabase.co/functions/v1/mp-gym-webhook`
      y `MP_GYM_WEBHOOK_SECRET` = clave de la app de marketplace.
      **Sin la primera la función se niega a cobrar** (a propósito: un pago sin
      webhook se cobra y nunca se registra). **Sin la segunda `mp-gym-webhook`
      rechaza todos los avisos con 401** y ningún pago de socio queda
      registrado: va cargada antes del deploy. `APP_DEEP_LINK` es opcional y por
      defecto vale `gymtrack://`.
- [ ] **Supabase**: `MP_OAUTH_CLIENT_ID` y `MP_OAUTH_CLIENT_SECRET` (los mismos
      valores que en Vercel). Con ellas `crear-cobro-socio` renueva el token del
      gym si está por vencer, en el momento del cobro. Sin ellas el cobro sale
      igual, pero el único respaldo vuelve a ser el cron diario: si una corrida
      falla, el socio se encuentra con un token vencido y un error que no le dice
      nada.
- [ ] **Nuevo build de la app** (no alcanza un OTA): `expo-web-browser` es un
      módulo nativo. Con `expo-updates` solo, la pantalla de pago crashea en los
      clientes viejos.
- [ ] **Homologación de la app de marketplace**: MP la exige para operar en
      producción y la mide sobre un pago **real**, no de prueba. La preferencia
      ya manda todo lo que el quality checklist evalúa y podemos controlar
      (`items.description`, `category_id`, `payer` con documento / teléfono /
      dirección cuando el socio los tiene cargados, `external_reference`,
      `notification_url`, `statement_descriptor`). Quedan dos ítems fuera de
      alcance a propósito: el **backend SDK** (las edge functions usan `fetch`,
      igual que el flujo SaaS — no hay SDK oficial para Deno) y los de
      **Checkout API** (`device_id`, `issuer_id`, `secure_form`), que no aplican
      porque el socio paga en el checkout hosteado de MP y los datos de la
      tarjeta nunca tocan nuestros servidores.
- [ ] **Probar el pago con un socio de DOS actividades** de precios distintos:
      el desglose tiene que mostrar las dos, el total ser la suma, y al pagar
      tienen que quedar **dos** filas en `subscription_payments` con los dos
      vencimientos movidos. Es el caso que el flujo viene a resolver.

### Sentry
- [ ] Crear cuenta gratis en sentry.io con 2 proyectos: `gymtrack-mobile`
      (React Native) y `gymtrack-web` (Next.js).
- [ ] Cargar los DSN: `EXPO_PUBLIC_SENTRY_DSN` en los env de EAS
      (production/preview) y `NEXT_PUBLIC_SENTRY_DSN` en Vercel.
- [ ] (Opcional, para stack traces legibles) `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`
      y `SENTRY_PROJECT` como secrets de EAS: activa la subida de sourcemaps.
- [ ] **Verificar**: forzar un error de prueba en cada app y confirmar que
      llega el evento.

### GitHub
- [ ] Cargar secrets del repo para el workflow de RLS: `SUPABASE_URL`,
      `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
- [ ] **Habilitar el provider email/password en Supabase Auth** (lo usa solo
      el test de RLS para sus usuarios descartables) y correr el workflow
      `RLS isolation` → debe dar verde.

### Google Play (Android-first; iOS queda para después)
- [ ] Cuenta de Google Play Console ($25 una única vez).
- [ ] Ficha de la app: nombre, descripciones, capturas, ícono, y la **URL de
      privacidad**: `https://app.gymtrack.ar/legal/privacidad`.
- [ ] Data safety form (declarar: email/nombre, datos de fitness; sin venta de
      datos). Sin permisos de salud en este build, no pide la declaración
      de Health Connect.
- [ ] Service account de Play para publicar con `eas submit` (guía de Expo:
      expo.fyi/creating-google-service-account) y cargarlo en `eas.json`.
- [ ] Track **internal testing** con los primeros gimnasios → luego producción.
- [ ] En paralelo (sin apuro): presentar la declaración de acceso a Health
      Connect en Play Console para poder activar el flag de salud en una
      actualización futura.

### Legales
- [ ] Revisar los textos de `/legal/privacidad` y `/legal/terminos`
      (idealmente con asesoría legal): son borradores completos pero
      redactados por IA, faltan datos del titular (razón social / CUIT si
      corresponde) y un email de contacto real.

## 🔲 Aceptación final — onboarding E2E real

Con todo lo anterior en verde, ejecutar el flujo completo una vez:

- [ ] `crear-gym` desde el panel → el owner recibe el email de bienvenida
      (con logo del gym).
- [ ] El owner entra, carga logo/tema, catálogo propio y registra un socio.
- [ ] El socio instala el build de internal testing, entra por OTP, entrena
      **sin conexión** (modo avión) y al reconectar el entrenamiento aparece
      en Supabase.
- [ ] Los crons corrieron sin errores en las últimas 24 hs (Dashboard → Edge
      Functions → logs de `cleanUp-media`; cron.job_run_details para los
      `purge_*`).
- [ ] Sentry sin errores nuevos tras un día de uso de prueba.

Cuando todos los casilleros estén tachados: invitar al primer gimnasio. 🚀
