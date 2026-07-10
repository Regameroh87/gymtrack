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
