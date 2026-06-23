-- Lectura pública (anónima) del subconjunto seguro de cada gimnasio, para las
-- páginas públicas por gym del sitio Next ([slug].gymtrack.ar).
--
-- El RLS de `gyms` (gyms_select) solo permite leer al super_admin o a miembros
-- activos → un visitante anónimo no puede leer nada. En vez de aflojar el RLS de
-- la tabla, exponemos SOLO columnas públicas (identidad + branding + contacto) de
-- gyms activos vía funciones SECURITY DEFINER, igual que los demás helpers del
-- proyecto. Nada de owner_id, flags internos ni datos de miembros.

-- Datos de un gym por slug (solo si está activo). Una fila o cero.
create or replace function public.get_public_gym(p_slug text)
returns table (
  slug          text,
  name          text,
  logo_url      text,
  logo_url_dark text,
  theme_primary text,
  theme_accent  text,
  address       text,
  phone         text,
  email         text,
  instagram     text
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select g.slug, g.name, g.logo_url, g.logo_url_dark, g.theme_primary,
         g.theme_accent, g.address, g.phone, g.email, g.instagram
  from public.gyms g
  where g.slug = p_slug
    and g.is_active = true;
$$;

-- Lista de gyms activos para el sitemap (slug + última actualización).
create or replace function public.list_public_gyms()
returns table (
  slug       text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select g.slug, g.updated_at
  from public.gyms g
  where g.is_active = true;
$$;

-- Solo lectura pública: cualquiera (anon) puede ejecutarlas; nadie puede escribir.
revoke all on function public.get_public_gym(text)  from public;
revoke all on function public.list_public_gyms()     from public;
grant execute on function public.get_public_gym(text) to anon, authenticated;
grant execute on function public.list_public_gyms()   to anon, authenticated;
