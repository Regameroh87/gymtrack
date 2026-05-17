# GymTrack

App móvil multi-tenant (white-label SaaS) para gestión de gimnasios. Permite administrar ejercicios, sesiones de entrenamiento, planes y miembros, con soporte offline-first y múltiples roles de usuario.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | React Native + Expo SDK 54 (Hermes) |
| Routing | Expo Router 6 (file-based) |
| Styling | NativeWind 4 + TailwindCSS 3 |
| Estado del servidor | TanStack Query 5 |
| Validación de forms | TanStack Form + Zod |
| BD local | SQLite via expo-sqlite + Drizzle ORM |
| BD remota | Supabase (PostgreSQL + Auth + Edge Functions) |
| Media | Cloudinary |
| Animaciones | Reanimated 4 + Gesture Handler 2 |

---

## Estructura del proyecto

```
gymtrack/
├── app/                        # Pantallas (Expo Router file-based routing)
│   ├── (auth)/                 # Login, verificación OTP
│   └── (protected)/            # Requiere sesión activa
│       ├── index.jsx           # Home
│       ├── ejercicios.jsx
│       ├── registros.jsx
│       ├── rutinas/
│       └── admin/              # Panel de administración
│           ├── exercises/
│           ├── sessions/
│           ├── plans/
│           ├── equipments/
│           └── users/
│
├── src/
│   ├── components/             # Componentes reutilizables
│   ├── contexts/               # React Contexts (PlanFormContext)
│   ├── database/
│   │   ├── schemas.js          # Schema Drizzle (SQLite local)
│   │   ├── sync.js             # Motor de sincronización offline ↔ Supabase
│   │   └── supabase.js         # Cliente Supabase
│   ├── hooks/                  # Hooks de datos y UI
│   ├── theme/                  # Design tokens (colores, tipografía)
│   └── utils/                  # Cloudinary, media picker, helpers
│
├── supabase/
│   ├── functions/              # Edge Functions (Deno)
│   └── migrations/             # Migraciones PostgreSQL
│
├── DESIGN.md                   # Sistema de diseño "Kinetic Precision"
└── MULTI_TENANT_PLAN.md        # Arquitectura multi-tenant
```

---

## Variables de entorno

Crear un archivo `.env` en la raíz con las siguientes variables:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_KEY=

# Cloudinary
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=

# Identificador del gimnasio para este build
EXPO_PUBLIC_GYM_ID=
```

> `EXPO_PUBLIC_GYM_ID` es el campo clave del modelo multi-tenant: cada build compilado corresponde a un gimnasio específico. Ver sección [Arquitectura multi-tenant](#arquitectura-multi-tenant).

---

## Cómo correr el proyecto

```bash
npm install

# Dev server (Expo Go)
npm start

# Android
npm run android

# iOS
npm run ios
```

### Build de producción (EAS)

```bash
EXPO_PUBLIC_GYM_ID=<uuid-del-gym> eas build --platform android
EXPO_PUBLIC_GYM_ID=<uuid-del-gym> eas build --platform ios
```

---

## Arquitectura

### Modelo multi-tenant

GymTrack es un white-label SaaS: hay un único proyecto de Supabase y una única codebase, pero se compila una APK/IPA diferente por gimnasio.

- Cada build lleva el `EXPO_PUBLIC_GYM_ID` "tatuado" en tiempo de compilación
- El logo y los colores del gimnasio se configuran antes de compilar
- Todos los datos se aíslan por `gym_id` a nivel de BD

**Flujo para dar de alta un nuevo gimnasio:**
1. Llamar a la Edge Function `crear-gym` (solo `super_admin`) — crea el gym + owner + profile
2. Actualizar logo/colores en el proyecto
3. Compilar con `EXPO_PUBLIC_GYM_ID=<uuid> eas build`
4. Entregar el APK/IPA al gimnasio

**Roles:**
```
super_admin → owner → admin → coach → member
```

---

### Sistema de sincronización offline-first

Las tablas de contenido (ejercicios, equipamiento, sesiones, planes) son offline-first: se escriben primero en SQLite local y luego se sincronizan con Supabase.

**Tablas sincronizadas:**

| Tabla | Scoped por gym_id |
|-------|:-----------------:|
| `exercises_base` | ✓ |
| `equipment` | ✓ |
| `sessions` | ✓ |
| `training_plans` | ✓ |
| `exercise_equipment` | — |
| `session_exercises` | — |
| `plan_weeks` | — |
| `plan_week_days` | — |
| `plan_week_day_exercises` | — |
| `plan_week_day_exercise_sets` | — |

**Columnas de sync en cada tabla local:**
- `sync_status` — `"pending"` | `"dirty"` | `"deleted"` | `"synced"`
- `updated_at` — gestionado por trigger en el servidor (no por el cliente)

#### Ciclo de sync (`src/database/sync.js`)

El entry point es `syncWithSupabase()`. Se ejecuta en tres fases secuenciales para todas las tablas configuradas en `tablesToSync`.

```
PULL (todas las tablas)
    ↓
CLEANUP (huérfanos de planes)
    ↓
PUSH (todas las tablas)
```

El sync se dispara automáticamente al recuperar conectividad (via `NetInfo`). Hay un flag `isSyncing` que previene ejecuciones concurrentes.

---

#### Fase 1 — PULL (`pullTableChanges`)

Descarga desde Supabase todos los registros con `updated_at >= lastSync` (watermark por tabla guardado en AsyncStorage).

**Protección de cambios locales — por ID:**

Antes de insertar los rows remotos, se consultan los IDs locales que están en estado no-synced (`pending`, `dirty`, `deleted`) y se construye un `Set` llamado `lockedIds`. Cualquier row remoto cuyo `id` esté en ese set se saltea: el PUSH del mismo ciclo se encargará de resolver la versión canónica.

**Protección de cambios locales — por unique compuesta:**

Cuatro tablas del árbol de planes tienen restricciones de unique compuesta (dos columnas):

| Tabla | Unique compuesta |
|-------|-----------------|
| `plan_weeks` | `(plan_id, week_number)` |
| `plan_week_days` | `(week_id, day_number)` |
| `plan_week_day_exercises` | `(week_day_id, session_exercise_id)` |
| `plan_week_day_exercise_sets` | `(exercise_id, set_number)` |

El check por `id` no protege el caso donde el row remoto tiene un **ID diferente** pero el **mismo par de columnas únicas** que un row local pendiente — el `INSERT` exploraría con un error de constraint. Para evitarlo, cuando la tabla tiene `COMPOSITE_UNIQUE_COLUMNS` definidas, se cargan todos los rows locales no-synced, se construye un `Set` de claves `"col1::col2"`, y se saltea cualquier row remoto cuya clave ya esté ocupada localmente.

**Reconciliación de borrados remotos:**

Después de aplicar las novedades, se descarga la lista completa de IDs remotos y se eliminan localmente los rows `synced` que ya no existen en el servidor (borrados desde otro dispositivo u otro proceso).

**Watermark:**

El `last_sync_at` por tabla solo avanza si el servidor devolvió al menos un registro. Usa el `updated_at` del último row devuelto (no el reloj local) para evitar clock-skew entre dispositivos.

---

#### Fase 2 — CLEANUP (`cleanOrphanedPlanChildren`)

Elimina hijos locales cuyo padre ya no existe, independientemente del `sync_status` del hijo. Esto previene errores de FK en el PUSH: si un padre fue borrado remotamente durante el PULL, sus hijos huérfanos fallarían al intentar subirse.

El orden de limpieza respeta la jerarquía de FK:

```
plan_week_day_exercise_sets (hijos sin plan_week_day_exercise padre)
    ↓
plan_week_day_exercises (hijos sin plan_week_day padre)
    ↓
plan_week_days (hijos sin plan_week padre)
    ↓
plan_weeks (hijos sin training_plan padre)
```

---

#### Fase 3 — PUSH

Cada tabla tiene su función de push dedicada. La estrategia varía:

**Entidades simples** (`exercises_base`, `equipment`, `exercise_equipment`, `sessions`, `session_exercises`):
- Filas `pending`/`dirty` → upsert en Supabase → marcar `synced` localmente
- Filas `deleted` → delete en Supabase → delete local
- Manejo especial: detección de conflictos de nombre duplicado (upsert por nombre cuando el ID no existe en el servidor)

**Planes de entrenamiento** (`training_plans` + árbol de hijos):
- El plan root se upsert por `id` (igual que entidades simples)
- Las semanas/días/ejercicios/series se sincronizan con una estrategia de **replace total**: se borran todas las semanas del plan en Supabase (CASCADE elimina los hijos en cascada) y luego se hace upsert de todas las filas locales en lote. Esto evita la complejidad de detectar qué cambió a nivel de fila en un árbol de 4 niveles.

---

### Flujo de planes de entrenamiento

#### Jerarquía de datos

```
training_plans
└── plan_weeks          (week_number: 1…N)
    └── plan_week_days  (day_number: 1…M, session_id FK opcional)
        └── plan_week_day_exercises  (session_exercise_id FK, position)
            └── plan_week_day_exercise_sets  (set_number: 1…S)
```

Cada nivel tiene `sync_status` propio y unique constraints que evitan duplicados:

| Nivel | Unique |
|-------|--------|
| `plan_weeks` | `(plan_id, week_number)` |
| `plan_week_days` | `(week_id, day_number)` |
| `plan_week_day_exercises` | `(week_day_id, session_exercise_id)` |
| `plan_week_day_exercise_sets` | `(exercise_id, set_number)` |

#### Guardado atómico (`useTrainingPlanForm.js`)

El hook `useTrainingPlanForm` expone un formulario TanStack Form. Al hacer submit, `onSubmit` persiste el árbol completo en SQLite dentro de una **transacción atómica**:

**Path de creación (plan nuevo):**
```
database.transaction(async (tx) => {
    INSERT training_plans
    persistWeeks(planId, weeks, now, tx)   ← INSERT weeks, days, exercises, sets
})
AsyncStorage.removeItem(DRAFT_KEY)          ← fuera de la transacción
```

**Path de edición:**
```
database.transaction(async (tx) => {
    UPDATE training_plans
    SELECT → DELETE sets → DELETE exercises → DELETE days → DELETE weeks
    persistWeeks(id, weeks, now, tx)        ← INSERT weeks, days, exercises, sets
})
```

La transacción garantiza atomicidad: si cualquier INSERT falla (por ejemplo, un conflicto de unique en sets), **todo hace rollback**. La BD local queda en el estado anterior, sin dejar datos corruptos en `pending`.

`persistWeeks` acepta `db` como cuarto parámetro (default: `database`) para recibir el `tx` de la transacción.

#### Borrador en AsyncStorage

Cuando el formulario está en modo **creación** (sin `id`), los valores se persisten automáticamente en AsyncStorage con debounce de 800ms (`DRAFT_KEY = "training_plan_form_draft"`). Al volver a la pantalla se restauran. Al guardar exitosamente se elimina el borrador. En modo edición no hay borrador — los datos se cargan desde SQLite.

#### Hidratación del formulario (modo edición)

Al montar el hook con un `id`, carga el árbol completo desde SQLite mediante queries encadenadas:

```
SELECT training_plans WHERE id = ?
    ↓
SELECT plan_weeks WHERE plan_id = ?
    ↓
SELECT plan_week_days + JOIN sessions WHERE week_id IN (...)
    ↓
SELECT plan_week_day_exercises + JOIN session_exercises + JOIN exercises_base WHERE week_day_id IN (...)
    ↓
SELECT plan_week_day_exercise_sets WHERE exercise_id IN (...)
```

Los sets se agrupan por `exercise_id` y se mapean a `set_configs[]` dentro de cada ejercicio. Si un ejercicio no tiene sets en BD, se inicializa con un set por defecto `{reps_min: 8, reps_max: 12, rest_seconds: 90}`.

---

### Flujos de media (imágenes y videos)

Hay dos patrones según si la tabla es offline-first o no.

#### Patrón A — Sync diferido (tablas offline-first)

Aplica para: ejercicios, equipamiento, sesiones, planes de entrenamiento.

```
Usuario selecciona imagen
    ↓
useMediaPicker copia el archivo a almacenamiento persistente (documentDirectory)
    ↓
Se guarda el file:// local en SQLite (sync_status = "pending")
    ↓
Al sincronizar: si image_uri empieza con "file://",
    uploadFileToCloudinary() → obtiene public_id
    → reemplaza el file:// local con el public_id
    → hace upsert en Supabase con el public_id
```

El archivo local se elimina después de subir exitosamente a Cloudinary.

#### Patrón B — Upload inline (operaciones 100% online)

Aplica para: registro de usuarios (`crear-socio`), cualquier operación que va directo a Supabase via Edge Function.

```
Usuario selecciona imagen
    ↓
useMediaPicker guarda el file:// local (preview inmediato)
    ↓
Al hacer submit:
    si image_profile empieza con "file://"
        uploadFileToCloudinary() → obtiene public_id
    → llama a la Edge Function con el public_id (o null si falló)
```

> Los perfiles (`profiles`) no son una tabla offline-first — se crean directamente en Supabase via Edge Function, que es una operación de red bloqueante. Por eso el upload a Cloudinary ocurre inline en el submit, no de forma diferida.

**Preset de Cloudinary:**
- Imágenes: `gymtrack_images`
- Videos: `gymtrack_videos`
- Los archivos se suben con el tag `pending_approval` para revisión del admin

---

### Edge Functions

Ubicadas en `supabase/functions/`. Todas validan el JWT del caller antes de ejecutar.

| Función | Quién puede llamarla | Qué hace |
|---------|----------------------|----------|
| `crear-gym` | `super_admin` | Crea un nuevo gym, su owner y el profile correspondiente |
| `crear-socio` | `owner`, `admin` | Crea un usuario con rol dentro del gym del caller. Hereda el `gym_id` del caller — el cliente nunca lo pasa en el body |
| `sync-cloudinary-webhook` | Cloudinary (webhook) | Sincroniza eventos de Cloudinary |
| `cleanUp-cloudinary` | Scheduled / manual | Elimina assets de Cloudinary sin referencia en la BD |

**Regla de negocio de roles en `crear-socio`:**
- `admin` solo puede crear `member`
- `owner` puede crear `admin`, `coach`, `member`

---

### Base de datos (PostgreSQL)

**Tablas principales (con `gym_id`):**
- `gyms` — configuración del gimnasio (slug, nombre, owner, logo, colores)
- `profiles` — extensión de `auth.users` con `gym_id` y `role`
- `exercises_base`, `equipment`, `sessions`, `training_plans`

**Tablas secundarias (heredan el gym por FK):**
- `exercise_equipment`, `session_exercises`
- `plan_weeks`, `plan_week_days`, `plan_week_day_exercises`, `plan_week_day_exercise_sets`

**Row Level Security (RLS):**
Diseñada con helpers `auth.user_gym()` y `auth.user_role()` (`SECURITY DEFINER`). Deshabilitada en desarrollo para no interferir con el sync offline-first. Se activa en producción.

---

## Documentos de referencia

- [`DESIGN.md`](./DESIGN.md) — Sistema de diseño "Kinetic Precision": paleta, tipografía, espaciado, forma. Leer antes de tomar decisiones visuales.
- [`MULTI_TENANT_PLAN.md`](./MULTI_TENANT_PLAN.md) — Plan detallado de implementación multi-tenant: migraciones, RLS, decisiones de arquitectura.
