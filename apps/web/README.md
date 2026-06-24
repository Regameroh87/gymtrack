# @gymtrack/web — Sitio público (Next.js)

Sitio público con SEO real: la **landing de marca** (`gymtrack.ar`) y una **página
pública por gym** (`[slug].gymtrack.ar`). App Router + SSR/ISR. La app autenticada
y la móvil siguen en Expo (no se tocan).

## Local

```bash
cp .env.example .env.local   # completar con la anon key real
npm install
npm run dev
```

- Landing de marca: http://localhost:3000
- Página de un gym (subdominio en local): http://gym-de-prueba.localhost:3000

## Variables de entorno

Ver `.env.example`. La `NEXT_PUBLIC_SUPABASE_ANON_KEY` es la clave **publishable**
(segura para el cliente). Los datos públicos del gym se leen por las RPCs
`get_public_gym` / `list_public_gyms` (SECURITY DEFINER, solo columnas públicas de
gyms activos), así que **no se afloja el RLS** de la tabla `gyms`.

## Deploy en Vercel (proyecto SEPARADO del de la app Expo)

1. Nuevo proyecto en Vercel apuntando a este repo.
2. **Root Directory:** `apps/web`. Framework: Next.js (autodetectado).
3. Cargar las env vars de `.env.example` con los valores reales.
4. Dominios:
   - `gymtrack.ar` y `www.gymtrack.ar`
   - `*.gymtrack.ar` (wildcard; requiere registro DNS `*` y verificación del apex
     en Vercel — el TLS wildcard es automático).
5. La **web Expo** (`app.gymtrack.ar`) se despliega en un proyecto Vercel **aparte**,
   apuntando a `apps/mobile`. Su config de deploy todavía no está versionada en el
   repo (no hay `vercel.json`); pendiente de definir. No mezclar ambos proyectos.

## Routing por subdominio

`middleware.ts` resuelve `{slug}.gymtrack.ar` → ruta interna `/s/{slug}`
(carpeta `app/s/[slug]`; la URL del navegador no cambia). `www`, `app` y el apex
quedan reservados para la landing de marca / la app.

## Frescura (gyms nuevos)

Las páginas de gym usan ISR (`revalidate`). Un gym recién creado se renderiza en su
primera visita sin rebuild. Pendiente (Fase 2): ruta `/api/revalidate` para refrescar
el cache on-demand desde la edge function `crear-gym` al editar branding.
