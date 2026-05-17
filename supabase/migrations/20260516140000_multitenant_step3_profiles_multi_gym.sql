-- Multi-tenant paso 3
-- Reestructura profiles para soportar un usuario en múltiples gyms.
-- Antes: id (PK) = auth.users.id → 1 usuario, 1 perfil.
-- Ahora: id (PK autogenerado), user_id (FK → auth.users), gym_id (FK → gyms).
--        UNIQUE(user_id, gym_id) → 1 membresía por gym por usuario.

-- 1. Agregar columna user_id y copiar el id actual
ALTER TABLE public.profiles ADD COLUMN user_id uuid;
UPDATE public.profiles SET user_id = id;

-- 2. FK y NOT NULL en user_id
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;

-- 3. Cambiar id: dejar de ser FK implícita y pasar a PK autogenerada
ALTER TABLE public.profiles DROP CONSTRAINT profiles_pkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD PRIMARY KEY (id);

-- 4. Unicidad: un usuario puede estar en un gym a lo sumo una vez.
--    Dos índices parciales para manejar gym_id nullable (super_admin).
CREATE UNIQUE INDEX profiles_user_gym_idx
  ON public.profiles(user_id, gym_id)
  WHERE gym_id IS NOT NULL;

CREATE UNIQUE INDEX profiles_user_no_gym_idx
  ON public.profiles(user_id)
  WHERE gym_id IS NULL;

-- 5. Actualizar constraint: solo super_admin puede omitir gym_id.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profile_gym_required;
ALTER TABLE public.profiles
  ADD CONSTRAINT profile_gym_required
  CHECK (role = 'super_admin' OR gym_id IS NOT NULL);

-- 6. Índice en user_id para queries frecuentes (buscar perfil del caller)
CREATE INDEX profiles_user_id_idx ON public.profiles(user_id);
