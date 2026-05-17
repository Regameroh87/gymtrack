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

**Ciclo de sync (`sync.js`):**
1. **PULL** — Descarga cambios remotos desde el último watermark (`last_sync_at` por tabla en AsyncStorage). Omite filas locales con cambios pendientes para no pisar trabajo del usuario.
2. **PUSH** — Sube filas en estado `pending`, `dirty` o `deleted`. Maneja conflictos de nombres duplicados y borrados remotos.
3. **Reconciliación** — Elimina localmente las filas `synced` que ya no existen en el servidor (borradas desde otro dispositivo).

El sync se dispara automáticamente al recuperar conectividad (via `NetInfo`).

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
