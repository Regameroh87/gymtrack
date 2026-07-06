# Plan Multi-Tenant — GymTrack

> ⚠️ **DOCUMENTO HISTÓRICO (superado el 2026-06-11).** El modelo descripto acá
> (un build por gym, `EXPO_PUBLIC_GYM_ID` en compile-time, `gym_id`/`role` en
> `profiles`) fue reemplazado por el modelo **multi-gym**: un solo build, tabla
> `memberships` (una cuenta puede pertenecer a varios gyms con rol por gym),
> gym activo elegido en runtime, theme dinámico y RLS basada en membresías.
> La descripción vigente está en la sección "Arquitectura" del [README](./README.md).

Resumen del modelo SaaS white-label, decisiones de schema, plan de migraciones y estado actual.

---

## Modelo de negocio

White-label: una sola base remota en Supabase, **N builds del cliente, uno por gimnasio**. Cada build se entrega "tatuado" con:

- Logo del gym (en `assets/`)
- Colores del gym (en `tailwind.config.js`)
- ID del gym (vía variable de entorno `EXPO_PUBLIC_GYM_ID` al compilar)

**Flujo del super_admin (vos) para vender a un gym nuevo:**

1. Crear el gym + owner en la DB vía edge function `crear-gym` (devuelve el `gym_id`).
2. Abrir el proyecto, reemplazar logo, cambiar colores en `tailwind.config.js`.
3. Compilar con la env var apuntando al nuevo gym:
   ```
   EXPO_PUBLIC_GYM_ID=<uuid> eas build --platform android
   ```
4. Entregar APK/IPA al gym.

**Flujo del owner del gym:**

1. Recibe la app branded.
2. Hace login con su email (whitelist + OTP).
3. Carga admins, coaches y members.
4. Coaches gestionan catálogo y planes.

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Backend | **Un solo proyecto Supabase compartido** por todos los gyms. |
| Tenant ID | Columna `gym_id` en tablas relevantes + RLS. |
| User ↔ Gym | **1 usuario pertenece a 1 solo gym** (excepto `super_admin`). |
| Roles | `super_admin`, `owner`, `admin`, `coach`, `member`. |
| Super admin | No pertenece a ningún gym. Único que crea gyms. Bootstrap manual con SQL. |
| Catálogo (ejercicios/equipos) | **Por gym**, no global. |
| Build per-gym | Logo/colores se editan en el proyecto; el `gym_id` se inyecta vía env var `EXPO_PUBLIC_GYM_ID` al compilar. |
| Branding fuente de verdad | Hardcoded en el build (logo, colores). DB guarda copia para dashboard del super_admin. |
| Aislamiento de datos | **RLS en Postgres** — diseñada pero **pospuesta**: durante desarrollo las tablas quedan sin RLS. Se aplica antes de producción. |
| Denormalización de `gym_id` en hijas | **No** — heredan vía FK del padre. |

---

## Roles y permisos

| Tabla | super_admin | owner | admin | coach | member |
|---|---|---|---|---|---|
| `gyms` (crear) | C | — | — | — | — |
| `gyms` (su gym) | R todos | RU | R | R | R |
| `profiles` (otros del gym) | R todos | CRUD | C solo `member` | R | R solo self |
| `exercises_base` / `equipment` | R todos | CRUD | R | CRUD | R |
| `sessions` / `session_exercises` | R todos | CRUD | R | CRUD | R |
| `training_plans` + jerarquía | R todos | CRUD | R | CRUD | R solo asignados |

- `super_admin`: opera la plataforma, lee todo para soporte.
- `owner`: full control dentro de su gym.
- `admin`: alta de socios (members), cobros (futuro).
- `coach`: gestiona ejercicios, equipos, planes.
- `member`: socio/cliente.

> Asignación plan ↔ socio requiere tabla nueva `plan_assignments`. Fuera del scope inicial.

---

## Schema

### Tabla nueva: `gyms`

```sql
gyms (
  id            uuid pk default gen_random_uuid(),
  slug          text unique not null,    -- 'fitness-cordoba'
  name          text not null,
  owner_id      uuid not null references auth.users,
  logo_url      text,
  theme_primary text,
  theme_accent  text,
  created_at, updated_at
)
```

> `slug`, `logo_url`, `theme_*` son metadata para el dashboard del super_admin. La fuente de verdad del branding es el build del cliente.

### `profiles` — agregar

- `gym_id uuid references gyms(id)` — nullable a nivel columna.
- `role text check (role in ('super_admin','owner','admin','coach','member'))`
- Check constraint: `role in ('super_admin','owner') or gym_id is not null`.

### Tablas que reciben `gym_id` NOT NULL directo

- `exercises_base`
- `equipment`
- `sessions`
- `training_plans`

### Tablas que **NO** reciben `gym_id` (heredan vía FK)

- `exercise_equipment`
- `session_exercises`
- `plan_weeks`, `plan_week_days`, `plan_week_day_exercises`, `plan_week_day_exercise_sets`

---

## Flujo de auth (whitelist + OTP)

**Estado actual** ([src/auth/lib/sendCode.js](src/auth/lib/sendCode.js)):
```js
.from("profiles").select("*").eq("email", email)
// si existe → signInWithOtp({ shouldCreateUser: false })
```

**Estado objetivo (multi-tenant):**
```js
.from("profiles").select("*")
  .eq("email", email)
  .eq("gym_id", process.env.EXPO_PUBLIC_GYM_ID)
```

> Esto evita que un user de Gym A pueda loguearse desde la app de Gym B. La RLS lo cubriría igual (no vería datos cruzados) pero la UX sería confusa.

---

## Variables de entorno

**Compartidas (mismo valor en todos los builds, en `.env`):**
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Por gym (cambia en cada build):**
```
EXPO_PUBLIC_GYM_ID=<uuid-del-gym>
```

Cómo se inyecta al compilar:
```bash
EXPO_PUBLIC_GYM_ID=abc-123-uuid eas build --platform android
```

La env var queda horneada en el bundle JS — el usuario final no la ve ni la puede cambiar. Cada APK/IPA es un build distinto con su `gym_id` tatuado.

**Acceso en el código:**
```js
const GYM_ID = process.env.EXPO_PUBLIC_GYM_ID
```

> El `name` y demás metadata del gym (logo_url, etc.) se leen de la tabla `gyms` después del login. Solo `gym_id` necesita venir del build.

---

## Edge functions

### `crear-gym` (nueva) — [supabase/functions/crear-gym/index.ts](supabase/functions/crear-gym/index.ts)

**Quién llama:** solo `super_admin` (valida JWT).
**Qué hace, atómico con rollback:**
1. `auth.admin.createUser()` para el owner del gym.
2. `insert into gyms (...)` con `owner_id = newUser.id`.
3. `insert into profiles` con `gym_id`, `role='owner'`.

**Body:** `gym_name`, `email`, `name`, `last_name`, `image_profile`, `phone`, `document_number`, `address`.

### `crear-socio` (actualizar) — [supabase/functions/crear-socio/index.ts](supabase/functions/crear-socio/index.ts)

**Quién llama:** `owner` o `admin` del gym (valida JWT).
**Cambio:**
- Lee `gym_id` y `role` del **caller** (no del body) — el cliente nunca pasa `gym_id`.
- Validación de rol: `admin` solo puede crear `member`; `owner` puede crear `admin`/`coach`/`member`.

---

## RLS — patrón

### Helpers (SECURITY DEFINER, evitan recursión sobre `profiles`)

```sql
create function auth.user_gym() returns uuid
language sql security definer stable as $$
  select gym_id from public.profiles where id = auth.uid()
$$;

create function auth.user_role() returns text
language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;
```

### Policies — ejemplos

**Tabla con `gym_id` directo:**
```sql
create policy "gym read" on sessions
  for select using (
    auth.user_role() = 'super_admin' or gym_id = auth.user_gym()
  );

create policy "coach write" on sessions
  for all using (
    gym_id = auth.user_gym() and auth.user_role() in ('owner','coach')
  );
```

**Tabla hija (ej. `plan_weeks`) — join al padre:**
```sql
create policy "via parent" on plan_weeks
  for select using (
    exists (
      select 1 from training_plans tp
      where tp.id = plan_weeks.plan_id
        and (auth.user_role() = 'super_admin' or tp.gym_id = auth.user_gym())
    )
  );
```

---

## Plan de migración — orden de ejecución

1. **Migración 1** [20260516120000_multitenant_step1_gyms.sql](supabase/migrations/20260516120000_multitenant_step1_gyms.sql)
   - Crea `gyms` (falta agregar `slug`, `logo_url`, `theme_*`).
   - Agrega `gym_id` + `role` a `profiles` con check constraint.
2. **Bootstrap del super_admin (manual):**
   - Crear user en Auth dashboard.
   - `insert into profiles (id, role, email) values ('<uuid>', 'super_admin', 'tu@email.com')`.
3. **Migración 2** [20260516130000_multitenant_step2_gym_id_columns.sql](supabase/migrations/20260516130000_multitenant_step2_gym_id_columns.sql)
   - Agrega `gym_id` NOT NULL a `exercises_base`, `equipment`, `sessions`, `training_plans`.
   - Índices por `gym_id`.
4. **Deploy `crear-gym`** y probar creando un gym de prueba.
5. **Migración 3 — RLS (pospuesta, antes de producción):**
   - Helpers `auth.user_gym()`, `auth.user_role()`.
   - `enable row level security` + policies por tabla.
   - **No aplicar durante desarrollo:** la app necesita acceso libre a las tablas mientras se itera.
6. **Update `crear-socio`** (validación de role + herencia de `gym_id`).
7. **Cliente:**
   - Agregar `EXPO_PUBLIC_GYM_ID` al `.env` local (para desarrollo).
   - Update `sendCode.js` para filtrar whitelist por `gym_id`.
   - Update schema Drizzle local + lógica de sync para incluir `gym_id` en inserts.
8. **Tests de aislamiento:** 2 gyms, 2 users, verificar que no se filtran datos entre gyms en ninguna tabla.

---

## Pendientes antes de avanzar

- [ ] Ajustar migración 1 para incluir `slug`, `logo_url`, `theme_primary`, `theme_accent` en `gyms`.
- [ ] Confirmar si base remota está vacía (solo 1 user de prueba — borrar antes de aplicar).
- [ ] Decidir si seedeamos catálogo base de ejercicios al crear un gym nuevo, o si el coach arma desde cero.
- [ ] Decidir si `plan_assignments` se hace ahora o más adelante.
- [x] Definir cómo se sube el logo → Supabase Storage (bucket público `media`).

---

## Referencias rápidas

- Schema local Drizzle: [src/database/schemas.js](src/database/schemas.js)
- Migraciones cloud: [supabase/migrations/](supabase/migrations/)
- Edge function `crear-socio`: [supabase/functions/crear-socio/index.ts](supabase/functions/crear-socio/index.ts)
- Edge function `crear-gym`: [supabase/functions/crear-gym/index.ts](supabase/functions/crear-gym/index.ts)
- Auth (sendCode): [src/auth/lib/sendCode.js](src/auth/lib/sendCode.js)
- Sync cliente ↔ cloud: [src/database/sync.js](src/database/sync.js)
