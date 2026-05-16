# Plan Multi-Tenant — GymTrack

Plan de migración para convertir la app en multi-tenant (un proyecto Supabase compartido, datos aislados por gimnasio).

## Contexto

- App pensada para que **cada gimnasio tenga su propia "copia" del cliente**, pero apuntando todas a la **misma base remota** en Supabase.
- Motivación: abaratar costos (un solo proyecto Supabase en vez de uno por gym) y unificar el catálogo de auth.
- Estado actual: **no hay RLS aplicada todavía**. Es el momento ideal para introducir el modelo tenant antes de que la base tenga datos productivos.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| User ↔ Gym | **1 usuario pertenece a 1 solo gym** (no N:N). |
| Roles | `owner`, `admin`, `coach`, `member` en `profiles.role`. |
| Catálogo (ejercicios/equipos) | **Por gym** (cada gym arma el suyo). |
| Onboarding | El owner crea el gym → admins ingresan socios → coaches gestionan catálogo y planes. |
| Denormalización de `gym_id` en tablas hijas | **No** — las hijas heredan vía FK del padre (joins en RLS). |

## Estado actual del schema (cloud)

**Auth/Perfiles:**
- `profiles` (id, email, name, last_name, image_profile, phone, document_number, address)

**Catálogo:**
- `exercises_base`
- `equipment`
- `exercise_equipment` (N:N)

**Contenido:**
- `sessions` (tiene `created_by`)
- `session_exercises`

**Planes (jerarquía):**
- `training_plans` (tiene `created_by`)
- `plan_weeks` → `plan_week_days` → `plan_week_day_exercises` → `plan_week_day_exercise_sets`

**Migraciones existentes** en `supabase/migrations/`:
- `20260508120000_server_managed_updated_at.sql`
- `20260509020602_add_missing_columns_to_training_plans.sql`
- `20260509020753_drop_kind_from_training_plans.sql`
- `20260509020834_drop_status_from_training_plans.sql`
- `20260509120000_cascade_training_plan_days.sql`
- `20260509130000_drop_prescription_fields_from_session_exercises.sql`
- `20260513120000_create_plan_weeks_structure.sql`
- `20260513120001_drop_training_plan_days.sql`

**Edge functions:**
- `crear-socio` — crea user en Auth + inserta `profiles` (rollback si falla). **Hoy no recibe `gym_id` ni `role`.**
- `cleanUp-cloudinary`
- `sync-cloudinary-webhook`

## Schema propuesto

### Nueva tabla `gyms`

```sql
create table public.gyms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

### `profiles` — agregar

- `gym_id uuid references gyms(id)` (nullable durante bootstrap del owner; ver más abajo)
- `role text not null check (role in ('owner','admin','coach','member'))`

### Tablas que llevan `gym_id` NOT NULL directo

- `exercises_base`
- `equipment`
- `sessions`
- `training_plans`

### Tablas que **NO** llevan `gym_id` (heredan vía FK)

- `exercise_equipment` (via `exercise_id` o `equipment_id`)
- `session_exercises` (via `session_id`)
- `plan_weeks`, `plan_week_days`, `plan_week_day_exercises`, `plan_week_day_exercise_sets` (via cadena de FKs hasta `training_plans`)

## Matriz de permisos

| Tabla | owner | admin | coach | member |
|---|---|---|---|---|
| `profiles` (otros del gym) | CRUD | CRUD | R | R (solo self) |
| `gyms` (su gym) | RU | R | R | R |
| `exercises_base` / `equipment` | CRUD | R | CRUD | R |
| `sessions` / `session_exercises` | CRUD | R | CRUD | R |
| `training_plans` + jerarquía | CRUD | R | CRUD | R (solo los asignados) |

> **Nota:** la asignación de planes a socios requiere una tabla nueva `plan_assignments (plan_id, user_id, start_date, ...)`. Queda fuera del scope de esta migración inicial.

## RLS — patrón

### Helpers (SECURITY DEFINER para evitar recursión sobre `profiles`)

```sql
create or replace function auth.user_gym() returns uuid
language sql security definer stable as $$
  select gym_id from public.profiles where id = auth.uid()
$$;

create or replace function auth.user_role() returns text
language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;
```

### Policies — ejemplos

**Tabla con `gym_id` directo:**
```sql
create policy "gym members read" on sessions
  for select using (gym_id = auth.user_gym());

create policy "coach write" on sessions
  for all using (
    gym_id = auth.user_gym()
    and auth.user_role() in ('owner','coach')
  );
```

**Tabla hija (ej. `plan_weeks`):**
```sql
create policy "via parent" on plan_weeks
  for select using (
    exists (
      select 1 from training_plans tp
      where tp.id = plan_weeks.plan_id
        and tp.gym_id = auth.user_gym()
    )
  );
```

## Bootstrap del owner

Problema: al crear el primer user de un gym, todavía no existe el gym → no se puede setear `profiles.gym_id`.

**Solución elegida:** edge function `crear-gym` que ejecuta atómicamente:
1. `auth.admin.createUser()` para el owner.
2. `insert into gyms (..., owner_id = newUser.id)`.
3. `insert into profiles (id = newUser.id, gym_id = newGym.id, role = 'owner', ...)`.
4. Rollback en cascada si alguno falla (mismo patrón que `crear-socio` actual).

`gym_id` en `profiles` queda **nullable a nivel schema** pero la app garantiza que siempre se setea. Alternativa más estricta: `check (role = 'owner' or gym_id is not null)`.

## Cambios en edge functions existentes

### `crear-socio`
- Recibir `gym_id` y `role` en el body.
- Validar que el caller (vía JWT) sea `owner` o `admin` del mismo `gym_id`.
- Insertar `gym_id` y `role` en `profiles`.

## Cambios en cliente (Drizzle / sync)

- Agregar columna `gym_id` en `schemas.js` para: `exercises_base`, `equipment`, `sessions`, `training_plans`.
- Asegurar que **todos los inserts** del cliente seteen `gym_id` (leer del perfil del user logueado).
- `src/database/sync.js` debe enviar `gym_id` al sincronizar.

## Plan de migración — pasos

1. **Schema:** migración SQL que cree `gyms`, agregue `gym_id`/`role` a `profiles`, y `gym_id` a las 4 tablas (inicialmente nullable).
2. **Backfill:** si hay datos productivos, asignar todo al gym "default". Si la base está vacía, salteamos.
3. **NOT NULL:** una vez backfilleado, `alter ... set not null` en los `gym_id`.
4. **Helpers:** crear `auth.user_gym()` y `auth.user_role()`.
5. **RLS:** `enable row level security` + policies por tabla.
6. **Edge function `crear-gym`** (nueva).
7. **Update `crear-socio`** (validar role + gym del caller).
8. **Schema local Drizzle** + lógica de sync con `gym_id`.
9. **Tests de aislamiento:** crear 2 gyms con 2 users cada uno, verificar que ninguno ve datos del otro en cada tabla.

## Preguntas abiertas — resolver antes de escribir las migraciones

1. **`profiles.id`** — ¿es `text` o `uuid` hoy? (debería ser `uuid` para FK limpia con `auth.users`).
2. **Catálogo inicial:** ¿al crear un gym nuevo, se seedea con N ejercicios/equipos base por defecto, o el coach arma desde cero?
3. **`plan_assignments`:** ¿se incluye en esta migración o queda para una posterior?
4. **Datos productivos:** ¿la base remota está vacía o ya hay registros que requieren backfill?

## Referencias rápidas

- Schema local Drizzle: [src/database/schemas.js](src/database/schemas.js)
- Migraciones cloud: [supabase/migrations/](supabase/migrations/)
- Edge function `crear-socio`: [supabase/functions/crear-socio/index.ts](supabase/functions/crear-socio/index.ts)
- Sync cliente ↔ cloud: [src/database/sync.js](src/database/sync.js)
