--
-- PostgreSQL database dump
--

-- \restrict FYeecSiTX0FrVsndHtP5ExymHTCZXzeul74oeD0DrvPlrlyF5bq6Afvb9Rk4iwC

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";


--
-- Name: EXTENSION "pg_cron"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "pg_cron" IS 'Job scheduler for PostgreSQL';


--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pg_net"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "pg_net" IS 'Async HTTP';


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pg_stat_statements"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "pg_stat_statements" IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pgcrypto"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "pgcrypto" IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


--
-- Name: EXTENSION "supabase_vault"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "supabase_vault" IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: activity_income_summary("uuid", "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."activity_income_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") RETURNS TABLE("activity_id" "uuid", "activity_name" "text", "activity_color" "text", "payments_count" integer, "total" numeric, "active_students" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin_of(p_gym_id) then
    raise exception 'No autorizado';
  end if;

  return query
  with pay as (
    select sp.activity_id as aid, count(*)::integer as cnt, sum(sp.amount) as amt
    from public.subscription_payments sp
    where sp.gym_id = p_gym_id and sp.paid_at between p_from and p_to
    group by sp.activity_id
  ),
  subs as (
    select s.activity_id as aid, count(*)::integer as students
    from public.activity_subscriptions s
    where s.gym_id = p_gym_id and s.status = 'active'
    group by s.activity_id
  )
  select a.id, a.name, a.color,
         coalesce(p.cnt, 0), coalesce(p.amt, 0), coalesce(s.students, 0)
  from public.activities a
  left join pay p on p.aid = a.id
  left join subs s on s.aid = a.id
  where a.gym_id = p_gym_id
    and (p.aid is not null or s.aid is not null)
  order by coalesce(p.amt, 0) desc;
end;
$$;


ALTER FUNCTION "public"."activity_income_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") OWNER TO "postgres";

--
-- Name: archive_catalog_plan("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."archive_catalog_plan"("p_plan_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  update public.training_plans
    set archived_at = now(), updated_at = now()
  where id = p_plan_id and is_catalog = true;

  if not found then
    raise exception 'plan % not found or not a catalog plan', p_plan_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."archive_catalog_plan"("p_plan_id" "text") OWNER TO "postgres";

--
-- Name: auth_gym_ids(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."auth_gym_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select m.gym_id
  from public.memberships m
  join public.gyms g on g.id = m.gym_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and g.is_active;
$$;


ALTER FUNCTION "public"."auth_gym_ids"() OWNER TO "postgres";

--
-- Name: auth_profile_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."auth_profile_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."auth_profile_id"() OWNER TO "postgres";

--
-- Name: check_in_with_qr("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."check_in_with_qr"("p_token" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_gym_id     uuid;
  v_profile_id uuid;
  v_now        timestamptz := now();
  v_existing   uuid;
  v_new_id     uuid;
begin
  select gym_id into v_gym_id
  from gym_qr_tokens
  where token = p_token and expires_at > v_now;

  if v_gym_id is null then
    raise exception 'QR inválido o expirado';
  end if;

  select id into v_profile_id
  from profiles
  where user_id = auth.uid();

  if v_profile_id is null or not exists (
    select 1 from memberships
    where user_id = auth.uid()
      and gym_id = v_gym_id
      and status = 'active'
  ) then
    raise exception 'No pertenecés a este gimnasio';
  end if;

  -- Anti doble-check-in: ventana de 30 min
  select id into v_existing
  from attendances
  where profile_id = v_profile_id
    and gym_id = v_gym_id
    and checked_in_at > v_now - interval '30 minutes';

  if v_existing is not null then
    return json_build_object('status','already_checked_in','id',v_existing);
  end if;

  insert into attendances (gym_id, profile_id, method)
  values (v_gym_id, v_profile_id, 'qr')
  returning id into v_new_id;

  return json_build_object('status','ok','id',v_new_id);
end;
$$;


ALTER FUNCTION "public"."check_in_with_qr"("p_token" "text") OWNER TO "postgres";

--
-- Name: coach_payment_summary("uuid", "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."coach_payment_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") RETURNS TABLE("coach_id" "uuid", "fixed_total" numeric, "revenue_total" numeric, "classes_count" integer, "classes_total" numeric, "total" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_staff_of(p_gym_id) then
    raise exception 'No autorizado';
  end if;

  return query
  with fixed as (
    select ac.coach_id as cid, sum(ac.monthly_fee) as amt
    from public.activity_coaches ac
    where ac.gym_id = p_gym_id and ac.is_active and ac.monthly_fee is not null
    group by ac.coach_id
  ),
  rev as (
    select ac.coach_id as cid,
           sum(sp.amount * ac.revenue_share_pct / 100) as amt
    from public.activity_coaches ac
    join public.subscription_payments sp
      on sp.activity_id = ac.activity_id
     and sp.paid_at between p_from and p_to
    where ac.gym_id = p_gym_id and ac.is_active
      and ac.revenue_share_pct is not null
    group by ac.coach_id
  ),
  cls as (
    select c.coach_id as cid,
           count(*)::integer as cnt,
           sum(coalesce(ac.rate_per_class, 0)) as amt
    from public.activity_classes c
    left join public.activity_coaches ac
      on ac.activity_id = c.activity_id
     and ac.coach_id = c.coach_id
     and ac.is_active
    where c.gym_id = p_gym_id
      and c.coach_id is not null
      and c.date between p_from and p_to
      and (c.status = 'completed'
           or (c.status = 'scheduled' and c.date <= current_date))
    group by c.coach_id
  )
  select coalesce(f.cid, r.cid, c.cid) as coach_id,
         coalesce(f.amt, 0) as fixed_total,
         coalesce(r.amt, 0) as revenue_total,
         coalesce(c.cnt, 0) as classes_count,
         coalesce(c.amt, 0) as classes_total,
         coalesce(f.amt, 0) + coalesce(r.amt, 0) + coalesce(c.amt, 0) as total
  from fixed f
  full join rev r on r.cid = f.cid
  full join cls c on c.cid = coalesce(f.cid, r.cid)
  where public.is_admin_of(p_gym_id)
     or coalesce(f.cid, r.cid, c.cid) = public.auth_profile_id();
end;
$$;


ALTER FUNCTION "public"."coach_payment_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") OWNER TO "postgres";

--
-- Name: delete_catalog_plan("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."delete_catalog_plan"("p_plan_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  if exists (
    select 1 from public.plan_assignments
    where plan_id = p_plan_id and status = 'active'
  ) then
    raise exception 'plan % en uso por members activos: archivar en vez de borrar', p_plan_id;
  end if;

  delete from public.plan_week_day_exercise_sets where exercise_id in (
    select x.id from public.plan_week_day_exercises x
    join public.plan_week_days d on d.id = x.week_day_id
    join public.plan_weeks pw on pw.id = d.week_id
    where pw.plan_id = p_plan_id);
  delete from public.plan_week_day_exercises where week_day_id in (
    select d.id from public.plan_week_days d
    join public.plan_weeks pw on pw.id = d.week_id
    where pw.plan_id = p_plan_id);
  delete from public.plan_week_days where week_id in (
    select id from public.plan_weeks where plan_id = p_plan_id);
  delete from public.plan_weeks where plan_id = p_plan_id;
  delete from public.training_plans where id = p_plan_id and is_catalog = true;
end;
$$;


ALTER FUNCTION "public"."delete_catalog_plan"("p_plan_id" "text") OWNER TO "postgres";

--
-- Name: delete_catalog_session("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."delete_catalog_session"("p_session_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  delete from public.plan_week_day_exercise_sets where exercise_id in (
    select id from public.plan_week_day_exercises where session_exercise_id in (
      select id from public.session_exercises where session_id = p_session_id));
  delete from public.plan_week_day_exercises where session_exercise_id in (
    select id from public.session_exercises where session_id = p_session_id);
  delete from public.plan_week_days where session_id = p_session_id;
  delete from public.session_exercises where session_id = p_session_id;
  delete from public.sessions where id = p_session_id and is_catalog = true;
end;
$$;


ALTER FUNCTION "public"."delete_catalog_session"("p_session_id" "text") OWNER TO "postgres";

--
-- Name: delete_gym_cascade("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."delete_gym_cascade"("p_gym_id" "uuid") RETURNS "uuid"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_member_ids uuid[];
  v_orphans    uuid[];
begin
  select coalesce(
           array_agg(distinct user_id) filter (where user_id is not null),
           '{}'::uuid[]
         )
    into v_member_ids
  from memberships
  where gym_id = p_gym_id;

  insert into media_delete_queue (public_id, resource_type)
  select public_id, resource_type
  from (
    select logo_url        as public_id, 'image' as resource_type from gyms where id = p_gym_id
    union all
    select logo_url_dark,   'image' from gyms where id = p_gym_id
    union all
    select image_uri,       'image' from exercises_base where gym_id = p_gym_id
    union all
    select video_uri,       'video' from exercises_base where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from sessions where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from training_plans where gym_id = p_gym_id
    union all
    select image_uri,       'image' from equipment where gym_id = p_gym_id
  ) a
  where public_id is not null
  on conflict (public_id) do nothing;

  delete from session_logs   where gym_id = p_gym_id;
  delete from sessions       where gym_id = p_gym_id;
  delete from exercises_base where gym_id = p_gym_id;
  delete from gyms           where id     = p_gym_id;

  select coalesce(array_agg(uid), '{}'::uuid[])
    into v_orphans
  from unnest(v_member_ids) as uid
  where not exists (select 1 from memberships m where m.user_id = uid)
    and not exists (select 1 from profiles p where p.user_id = uid and p.is_super_admin);

  if array_length(v_orphans, 1) is not null then
    insert into media_delete_queue (public_id, resource_type)
    select public_id, resource_type
    from (
      select image_profile   as public_id, 'image' as resource_type from profiles where user_id = any(v_orphans)
      union all
      select image_uri,       'image' from custom_exercises where user_id = any(v_orphans)
      union all
      select video_uri,       'video' from custom_exercises where user_id = any(v_orphans)
      union all
      select cover_image_uri, 'image' from custom_sessions where user_id = any(v_orphans)
      union all
      select cover_image_uri, 'image' from custom_plans where user_id = any(v_orphans)
    ) a
    where public_id is not null
    on conflict (public_id) do nothing;
  end if;

  return v_orphans;
end;
$$;


ALTER FUNCTION "public"."delete_gym_cascade"("p_gym_id" "uuid") OWNER TO "postgres";

--
-- Name: email_exists("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."email_exists"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1 from public.profiles
    where lower(email) = lower(p_email)
      and is_active = true
  );
$$;


ALTER FUNCTION "public"."email_exists"("p_email" "text") OWNER TO "postgres";

--
-- Name: generate_activity_classes("uuid", "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."generate_activity_classes"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_count integer;
begin
  if not public.is_admin_of(p_gym_id) then
    raise exception 'No autorizado';
  end if;
  if p_from > p_to then
    raise exception 'Rango de fechas inválido';
  end if;
  if p_to - p_from > 62 then
    raise exception 'Rango máximo: 62 días';
  end if;

  insert into public.activity_classes
    (gym_id, activity_id, schedule_id, date, start_time, end_time, capacity, coach_id)
  select s.gym_id, s.activity_id, s.id, d::date, s.start_time, s.end_time,
         s.capacity, s.coach_id
  from public.activity_schedules s
  cross join generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
  join public.activities a on a.id = s.activity_id and a.is_active
  where s.gym_id = p_gym_id
    and s.is_active
    and extract(dow from d)::int = s.weekday
  on conflict (schedule_id, date) where schedule_id is not null do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."generate_activity_classes"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") OWNER TO "postgres";

--
-- Name: get_public_gym("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."get_public_gym"("p_slug" "text") RETURNS TABLE("slug" "text", "name" "text", "logo_url" "text", "logo_url_dark" "text", "theme_primary" "text", "theme_accent" "text", "address" "text", "phone" "text", "email" "text", "instagram" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select g.slug, g.name, g.logo_url, g.logo_url_dark, g.theme_primary,
         g.theme_accent, g.address, g.phone, g.email, g.instagram
  from public.gyms g
  where g.slug = p_slug
    and g.is_active = true;
$$;


ALTER FUNCTION "public"."get_public_gym"("p_slug" "text") OWNER TO "postgres";

--
-- Name: guard_profile_self_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."guard_profile_self_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- Service role / backend sin JWT (edge functions): sin restricción.
  if auth.uid() is null then
    return new;
  end if;

  -- is_super_admin NUNCA se modifica desde un cliente con JWT, ni por admins.
  -- Va ANTES del atajo de admin para que no haya bypass.
  if new.is_super_admin is distinct from old.is_super_admin then
    raise exception 'No autorizado a modificar is_super_admin';
  end if;

  -- Admin/owner de un gym del usuario objetivo: puede el resto de columnas.
  if public.user_in_admin_gym(old.user_id) then
    return new;
  end if;

  -- Self-update: resto de columnas privilegiadas inmutables.
  if new.id           is distinct from old.id
     or new.user_id   is distinct from old.user_id
     or new.is_active is distinct from old.is_active
     or new.active_plan_id is distinct from old.active_plan_id
     or new.created_at is distinct from old.created_at then
    raise exception 'No autorizado a modificar campos privilegiados del perfil';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."guard_profile_self_update"() OWNER TO "postgres";

--
-- Name: has_gym_permission("uuid", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."has_gym_permission"("g" "uuid", "p_perm" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select
    public.is_owner_of(g)
    or (
      p_perm = 'payments.register'
      and exists (
        select 1 from public.memberships m
        join public.gyms gg on gg.id = m.gym_id
        where m.user_id = auth.uid()
          and m.gym_id = g
          and m.status = 'active'
          and m.role = 'admin'
          and gg.is_active
      )
    )
    or exists (
      select 1
      from public.memberships m
      join public.gyms gg on gg.id = m.gym_id
      join public.membership_permissions mp on mp.membership_id = m.id
      where m.user_id = auth.uid()
        and m.gym_id = g
        and m.status = 'active'
        and gg.is_active
        and mp.permission = p_perm
    );
$$;


ALTER FUNCTION "public"."has_gym_permission"("g" "uuid", "p_perm" "text") OWNER TO "postgres";

--
-- Name: is_admin_of("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."is_admin_of"("g" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select public.is_super_admin() or exists (
    select 1
    from public.memberships m
    join public.gyms gg on gg.id = m.gym_id
    where m.user_id = auth.uid()
      and m.gym_id = g
      and m.status = 'active'
      and m.role in ('owner', 'admin')
      and gg.is_active
  );
$$;


ALTER FUNCTION "public"."is_admin_of"("g" "uuid") OWNER TO "postgres";

--
-- Name: is_owner_of("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."is_owner_of"("g" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select public.is_super_admin() or exists (
    select 1
    from public.memberships m
    join public.gyms gg on gg.id = m.gym_id
    where m.user_id = auth.uid()
      and m.gym_id = g
      and m.status = 'active'
      and m.role = 'owner'
      and gg.is_active
  );
$$;


ALTER FUNCTION "public"."is_owner_of"("g" "uuid") OWNER TO "postgres";

--
-- Name: is_platform_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."is_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select public.is_super_admin() or public.platform_staff_role() = 'admin';
$$;


ALTER FUNCTION "public"."is_platform_admin"() OWNER TO "postgres";

--
-- Name: is_platform_staff(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."is_platform_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select public.is_super_admin() or public.platform_staff_role() in ('admin', 'coach');
$$;


ALTER FUNCTION "public"."is_platform_staff"() OWNER TO "postgres";

--
-- Name: is_saas_subscription_active("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."is_saas_subscription_active"("p_gym_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_status               text;
  v_cancel_at_period_end boolean;
  v_access_until         timestamptz;
begin
  if public.is_super_admin() is not true then
    select status, cancel_at_period_end, access_until
      into v_status, v_cancel_at_period_end, v_access_until
    from public.gym_saas_subscriptions
    where gym_id = p_gym_id;

    if found then
      if v_cancel_at_period_end
         and v_access_until is not null
         and v_access_until <= now() then
        return false;
      end if;
      return v_status in ('trialing', 'active');
    end if;
  end if;
  return true;
end;
$$;


ALTER FUNCTION "public"."is_saas_subscription_active"("p_gym_id" "uuid") OWNER TO "postgres";

--
-- Name: is_staff_of("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."is_staff_of"("g" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select public.is_super_admin() or exists (
    select 1
    from public.memberships m
    join public.gyms gg on gg.id = m.gym_id
    where m.user_id = auth.uid()
      and m.gym_id = g
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'coach')
      and gg.is_active
  );
$$;


ALTER FUNCTION "public"."is_staff_of"("g" "uuid") OWNER TO "postgres";

--
-- Name: is_super_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and is_super_admin
  );
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";

--
-- Name: list_archived_catalog_plans(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."list_archived_catalog_plans"() RETURNS TABLE("id" "text", "name" "text", "objective" "text", "level" "text", "target_gender" "text", "weekly_days" integer, "duration_weeks" integer, "cover_image_uri" "text", "archived_at" timestamp with time zone, "active_followers" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  return query
  select
    tp.id, tp.name, tp.objective, tp.level, tp.target_gender,
    tp.weekly_days, tp.duration_weeks, tp.cover_image_uri, tp.archived_at,
    coalesce(cnt.n, 0) as active_followers
  from public.training_plans tp
  left join (
    select plan_id, count(*) as n
    from public.plan_assignments
    where status = 'active'
    group by plan_id
  ) cnt on cnt.plan_id = tp.id
  where tp.is_catalog = true and tp.archived_at is not null
  order by tp.archived_at desc;
end;
$$;


ALTER FUNCTION "public"."list_archived_catalog_plans"() OWNER TO "postgres";

--
-- Name: list_public_gyms(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."list_public_gyms"() RETURNS TABLE("slug" "text", "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select g.slug, g.updated_at
  from public.gyms g
  where g.is_active = true;
$$;


ALTER FUNCTION "public"."list_public_gyms"() OWNER TO "postgres";

--
-- Name: platform_staff_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."platform_staff_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select platform_staff_role from public.profiles where user_id = auth.uid();
$$;


ALTER FUNCTION "public"."platform_staff_role"() OWNER TO "postgres";

--
-- Name: purge_archived_catalog_plans(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."purge_archived_catalog_plans"("p_older_than_days" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_plan record;
  v_count integer := 0;
begin
  for v_plan in
    select tp.id
    from public.training_plans tp
    where tp.is_catalog = true
      and tp.archived_at is not null
      and tp.archived_at < now() - make_interval(days => p_older_than_days)
      and not exists (
        select 1 from public.plan_assignments pa
        where pa.plan_id = tp.id and pa.status = 'active'
      )
  loop
    delete from public.plan_week_day_exercise_sets where exercise_id in (
      select x.id from public.plan_week_day_exercises x
      join public.plan_week_days d on d.id = x.week_day_id
      join public.plan_weeks pw on pw.id = d.week_id
      where pw.plan_id = v_plan.id);
    delete from public.plan_week_day_exercises where week_day_id in (
      select d.id from public.plan_week_days d
      join public.plan_weeks pw on pw.id = d.week_id
      where pw.plan_id = v_plan.id);
    delete from public.plan_week_days where week_id in (
      select id from public.plan_weeks where plan_id = v_plan.id);
    delete from public.plan_weeks where plan_id = v_plan.id;
    delete from public.training_plans where id = v_plan.id and is_catalog = true;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."purge_archived_catalog_plans"("p_older_than_days" integer) OWNER TO "postgres";

--
-- Name: purge_soft_deleted(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."purge_soft_deleted"() RETURNS TABLE("session_logs_purged" integer, "set_logs_purged" integer, "qr_tokens_purged" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_set_logs int;
  v_logs int;
  v_tokens int;
  v_cutoff timestamptz := now() - interval '30 days';
begin
  -- 1. Sets soft-deleted cuyo session_log padre sigue vivo (el CASCADE no los cubre)
  with deleted as (
    delete from public.session_set_logs
    where deleted_at is not null and deleted_at < v_cutoff
    returning 1
  )
  select count(*) into v_set_logs from deleted;

  -- 2. Logs soft-deleted (el CASCADE arrastra los sets hijos restantes)
  with deleted as (
    delete from public.session_logs
    where deleted_at is not null and deleted_at < v_cutoff
    returning 1
  )
  select count(*) into v_logs from deleted;

  -- 3. Tokens QR expirados (no son tombstones: basura por expires_at vencido)
  with deleted as (
    delete from public.gym_qr_tokens
    where expires_at < now()
    returning 1
  )
  select count(*) into v_tokens from deleted;

  raise notice 'purge_soft_deleted: session_logs=%, session_set_logs=%, gym_qr_tokens=%',
    v_logs, v_set_logs, v_tokens;

  session_logs_purged := v_logs;
  set_logs_purged := v_set_logs;
  qr_tokens_purged := v_tokens;
  return next;
end;
$$;


ALTER FUNCTION "public"."purge_soft_deleted"() OWNER TO "postgres";

--
-- Name: register_subscription_payment("uuid", numeric, "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric DEFAULT NULL::numeric, "p_period_start" "date" DEFAULT NULL::"date") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_sub          public.activity_subscriptions%rowtype;
  v_period_start date;
  v_period_end   date;
  v_payment_id   uuid;
begin
  select * into v_sub
  from public.activity_subscriptions
  where id = p_subscription_id;

  if not found then
    raise exception 'Suscripción inexistente';
  end if;
  if not public.is_admin_of(v_sub.gym_id) then
    raise exception 'No autorizado';
  end if;

  -- Mes que se paga: el elegido, o por defecto el del vencimiento actual (o el
  -- mes en curso si la suscripción no tiene vencimiento).
  v_period_start := date_trunc(
    'month',
    coalesce(p_period_start, v_sub.due_date, current_date)
  )::date;
  v_period_end := (v_period_start + interval '1 month')::date;

  insert into public.subscription_payments
    (gym_id, subscription_id, activity_id, user_id, amount,
     period_start, period_end, registered_by)
  values
    (v_sub.gym_id, v_sub.id, v_sub.activity_id, v_sub.user_id,
     coalesce(p_amount, v_sub.price, 0),
     v_period_start, v_period_end, public.auth_profile_id())
  returning id into v_payment_id;

  update public.activity_subscriptions
  set last_payment_date = current_date,
      -- Nunca retrocede el vencimiento (greatest ignora null): cobrar un mes
      -- atrasado no debe adelantar la fecha de un socio que ya iba adelantado.
      due_date = greatest(v_sub.due_date, v_period_end)
  where id = v_sub.id;

  return v_payment_id;
end;
$$;


ALTER FUNCTION "public"."register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric, "p_period_start" "date") OWNER TO "postgres";

--
-- Name: register_subscription_payment("uuid", numeric, "date", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric DEFAULT NULL::numeric, "p_period_start" "date" DEFAULT NULL::"date", "p_payment_method" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_sub          public.activity_subscriptions%rowtype;
  v_period_start date;
  v_period_end   date;
  v_payment_id   uuid;
begin
  select * into v_sub
  from public.activity_subscriptions
  where id = p_subscription_id;

  if not found then
    raise exception 'Suscripción inexistente';
  end if;
  if not public.has_gym_permission(v_sub.gym_id, 'payments.register') then
    raise exception 'No autorizado';
  end if;

  v_period_start := date_trunc(
    'month',
    coalesce(p_period_start, v_sub.due_date, current_date)
  )::date;
  v_period_end := (v_period_start + interval '1 month')::date;

  insert into public.subscription_payments
    (gym_id, subscription_id, activity_id, user_id, amount,
     period_start, period_end, payment_method, registered_by)
  values
    (v_sub.gym_id, v_sub.id, v_sub.activity_id, v_sub.user_id,
     coalesce(p_amount, v_sub.price, 0),
     v_period_start, v_period_end, p_payment_method, public.auth_profile_id())
  returning id into v_payment_id;

  update public.activity_subscriptions
  set last_payment_date = current_date,
      due_date = greatest(v_sub.due_date, v_period_end)
  where id = v_sub.id;

  return v_payment_id;
end;
$$;


ALTER FUNCTION "public"."register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric, "p_period_start" "date", "p_payment_method" "text") OWNER TO "postgres";

--
-- Name: restore_catalog_plan("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."restore_catalog_plan"("p_plan_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  update public.training_plans
    set archived_at = null, updated_at = now()
  where id = p_plan_id and is_catalog = true;

  if not found then
    raise exception 'plan % not found or not a catalog plan', p_plan_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."restore_catalog_plan"("p_plan_id" "text") OWNER TO "postgres";

--
-- Name: save_catalog_plan("jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."save_catalog_plan"("payload" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_plan_id text;
  v_now     timestamptz := now();
  v_week    jsonb;
  v_day     jsonb;
  v_ex      jsonb;
  v_set     jsonb;
  v_week_id text;
  v_day_id  text;
  v_ex_id   text;
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  v_plan_id := nullif(payload->>'id', '');

  if v_plan_id is null then
    v_plan_id := gen_random_uuid()::text;
    insert into public.training_plans
      (id, gym_id, name, description, objective, level, target_gender,
       weekly_days, duration_weeks, cover_image_uri, is_catalog, is_published,
       created_at, updated_at)
    values
      (v_plan_id, null, payload->>'name', nullif(payload->>'description', ''),
       nullif(payload->>'objective', ''), nullif(payload->>'level', ''),
       coalesce(nullif(payload->>'target_gender', ''), 'ambos'),
       coalesce((payload->>'weekly_days')::int, 3),
       coalesce((payload->>'duration_weeks')::int, 0),
       nullif(payload->>'cover_image_uri', ''),
       true, true, v_now, v_now);
  else
    update public.training_plans set
      name            = payload->>'name',
      description     = nullif(payload->>'description', ''),
      objective       = nullif(payload->>'objective', ''),
      level           = nullif(payload->>'level', ''),
      target_gender   = coalesce(nullif(payload->>'target_gender', ''), 'ambos'),
      weekly_days     = coalesce((payload->>'weekly_days')::int, 3),
      duration_weeks  = coalesce((payload->>'duration_weeks')::int, 0),
      cover_image_uri = nullif(payload->>'cover_image_uri', ''),
      updated_at      = v_now
    where id = v_plan_id and is_catalog = true;
    if not found then
      raise exception 'plan % not found or not a catalog plan', v_plan_id;
    end if;

    -- Borrar el árbol anterior completo
    delete from public.plan_week_day_exercise_sets where exercise_id in (
      select x.id from public.plan_week_day_exercises x
      join public.plan_week_days d on d.id = x.week_day_id
      join public.plan_weeks pw on pw.id = d.week_id
      where pw.plan_id = v_plan_id);
    delete from public.plan_week_day_exercises where week_day_id in (
      select d.id from public.plan_week_days d
      join public.plan_weeks pw on pw.id = d.week_id
      where pw.plan_id = v_plan_id);
    delete from public.plan_week_days where week_id in (
      select id from public.plan_weeks where plan_id = v_plan_id);
    delete from public.plan_weeks where plan_id = v_plan_id;
  end if;

  -- Reconstruir el árbol desde el payload
  for v_week in
    select value from jsonb_array_elements(coalesce(payload->'weeks', '[]'::jsonb))
  loop
    v_week_id := gen_random_uuid()::text;
    insert into public.plan_weeks (id, plan_id, week_number, created_at, updated_at)
    values (v_week_id, v_plan_id, (v_week->>'week_number')::int, v_now, v_now);

    for v_day in
      select value from jsonb_array_elements(coalesce(v_week->'days', '[]'::jsonb))
    loop
      continue when nullif(v_day->>'session_id', '') is null;

      v_day_id := gen_random_uuid()::text;
      insert into public.plan_week_days
        (id, week_id, day_number, session_id, created_at, updated_at)
      values
        (v_day_id, v_week_id, (v_day->>'day_number')::int,
         v_day->>'session_id', v_now, v_now);

      for v_ex in
        select value from jsonb_array_elements(coalesce(v_day->'exercises', '[]'::jsonb))
      loop
        v_ex_id := gen_random_uuid()::text;
        insert into public.plan_week_day_exercises
          (id, week_day_id, session_exercise_id, position, prescription_mode,
           rest_seconds, intensity_mode, tempo, notes, created_at, updated_at)
        values
          (v_ex_id, v_day_id, v_ex->>'session_exercise_id',
           coalesce((v_ex->>'position')::int, 0),
           coalesce(nullif(v_ex->>'prescription_mode', ''), 'reps'),
           coalesce((v_ex->>'rest_seconds')::int, 90),
           coalesce(nullif(v_ex->>'intensity_mode', ''), 'none'),
           nullif(v_ex->>'tempo', ''), nullif(v_ex->>'notes', ''),
           v_now, v_now);

        for v_set in
          select value from jsonb_array_elements(coalesce(v_ex->'sets', '[]'::jsonb))
        loop
          insert into public.plan_week_day_exercise_sets
            (id, exercise_id, set_number, reps_min, reps_max, weight_kg,
             duration_seconds, rir, rpe, created_at, updated_at)
          values
            (gen_random_uuid()::text, v_ex_id, (v_set->>'set_number')::int,
             (v_set->>'reps_min')::int, (v_set->>'reps_max')::int,
             (v_set->>'weight_kg')::real, (v_set->>'duration_seconds')::int,
             (v_set->>'rir')::real, (v_set->>'rpe')::real, v_now, v_now);
        end loop;
      end loop;
    end loop;
  end loop;

  return v_plan_id;
end;
$$;


ALTER FUNCTION "public"."save_catalog_plan"("payload" "jsonb") OWNER TO "postgres";

--
-- Name: save_catalog_session("jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."save_catalog_session"("payload" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_session_id text;
  v_now        timestamptz := now();
  v_keep_ids   text[];
  v_removed    text[];
  v_ex         jsonb;
  v_idx        int := 0;
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  v_session_id := nullif(payload->>'id', '');

  if v_session_id is null then
    v_session_id := gen_random_uuid()::text;
    insert into public.sessions
      (id, gym_id, name, description, level, cover_image_uri, is_catalog, created_at, updated_at)
    values
      (v_session_id, null, payload->>'name', nullif(payload->>'description', ''),
       nullif(payload->>'level', ''), nullif(payload->>'cover_image_uri', ''),
       true, v_now, v_now);
  else
    update public.sessions set
      name            = payload->>'name',
      description     = nullif(payload->>'description', ''),
      level           = nullif(payload->>'level', ''),
      cover_image_uri = nullif(payload->>'cover_image_uri', ''),
      updated_at      = v_now
    where id = v_session_id and is_catalog = true;
    if not found then
      raise exception 'session % not found or not a catalog session', v_session_id;
    end if;
  end if;

  -- IDs entrantes que ya existían
  select coalesce(array_agg(e->>'id'), '{}'::text[])
  into v_keep_ids
  from jsonb_array_elements(coalesce(payload->'exercises', '[]'::jsonb)) e
  where nullif(e->>'id', '') is not null;

  -- session_exercises a borrar (existían pero ya no están en el payload)
  select coalesce(array_agg(se.id), '{}'::text[])
  into v_removed
  from public.session_exercises se
  where se.session_id = v_session_id
    and se.id <> all(v_keep_ids);

  if array_length(v_removed, 1) is not null then
    delete from public.plan_week_day_exercise_sets
    where exercise_id in (
      select id from public.plan_week_day_exercises
      where session_exercise_id = any(v_removed)
    );
    delete from public.plan_week_day_exercises
    where session_exercise_id = any(v_removed);
    delete from public.session_exercises
    where id = any(v_removed);
  end if;

  -- Upsert de los entrantes, en orden
  for v_ex in
    select value from jsonb_array_elements(coalesce(payload->'exercises', '[]'::jsonb))
  loop
    if nullif(v_ex->>'id', '') is not null then
      update public.session_exercises
        set position = v_idx, exercise_id = v_ex->>'exercise_id'
      where id = v_ex->>'id';
    else
      insert into public.session_exercises (id, session_id, exercise_id, position)
      values (gen_random_uuid()::text, v_session_id, v_ex->>'exercise_id', v_idx);
    end if;
    v_idx := v_idx + 1;
  end loop;

  return v_session_id;
end;
$$;


ALTER FUNCTION "public"."save_catalog_session"("payload" "jsonb") OWNER TO "postgres";

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

--
-- Name: shares_gym_with("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."shares_gym_with"("p_user" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.memberships a
    join public.memberships b on b.gym_id = a.gym_id
    where a.user_id = auth.uid()
      and b.user_id = p_user
      and a.status = 'active'
      and b.status = 'active'
  );
$$;


ALTER FUNCTION "public"."shares_gym_with"("p_user" "uuid") OWNER TO "postgres";

--
-- Name: transfer_gym_owner("uuid", "uuid", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."transfer_gym_owner"("p_gym_id" "uuid", "p_new_owner_id" "uuid", "p_previous_action" "text" DEFAULT 'demote'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_current_owner uuid;
  v_actor         uuid := auth.uid();
begin
  if public.is_platform_admin() is not true then
    raise exception 'No autorizado';
  end if;

  if p_previous_action not in ('demote', 'remove') then
    raise exception 'Acción inválida para el dueño anterior: %', p_previous_action;
  end if;

  select owner_id into v_current_owner
  from public.gyms
  where id = p_gym_id
  for update;

  if not found then
    raise exception 'Gimnasio inexistente';
  end if;

  if not exists (select 1 from public.profiles where user_id = p_new_owner_id) then
    raise exception 'La persona indicada no tiene perfil en la plataforma';
  end if;

  if v_current_owner = p_new_owner_id then
    raise exception 'Esa persona ya es la dueña de este gimnasio';
  end if;

  update public.gyms
  set owner_id = p_new_owner_id
  where id = p_gym_id;

  if v_current_owner is not null then
    if p_previous_action = 'demote' then
      update public.memberships
      set role = 'admin', updated_at = now()
      where gym_id = p_gym_id and user_id = v_current_owner;
    else
      delete from public.memberships
      where gym_id = p_gym_id and user_id = v_current_owner;
    end if;
  end if;

  insert into public.memberships (user_id, gym_id, role, status, added_by)
  values (p_new_owner_id, p_gym_id, 'owner', 'active', v_actor)
  on conflict (user_id, gym_id) do update
    set role = 'owner', status = 'active', updated_at = now();
end;
$$;


ALTER FUNCTION "public"."transfer_gym_owner"("p_gym_id" "uuid", "p_new_owner_id" "uuid", "p_previous_action" "text") OWNER TO "postgres";

--
-- Name: FUNCTION "transfer_gym_owner"("p_gym_id" "uuid", "p_new_owner_id" "uuid", "p_previous_action" "text"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."transfer_gym_owner"("p_gym_id" "uuid", "p_new_owner_id" "uuid", "p_previous_action" "text") IS 'Transfiere un gimnasio a un nuevo dueño de forma atómica: gyms.owner_id + membership del saliente (demote/remove) + membership owner del entrante. Solo staff admin de plataforma.';


--
-- Name: user_in_admin_gym("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."user_in_admin_gym"("p_user" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = p_user
      and m.status = 'active'
      and public.is_admin_of(m.gym_id)
  );
$$;


ALTER FUNCTION "public"."user_in_admin_gym"("p_user" "uuid") OWNER TO "postgres";

--
-- Name: user_in_staff_gym("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."user_in_staff_gym"("p_user" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = p_user
      and m.status = 'active'
      and public.is_staff_of(m.gym_id)
  );
$$;


ALTER FUNCTION "public"."user_in_staff_gym"("p_user" "uuid") OWNER TO "postgres";

--
-- Name: void_coach_payment("uuid", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."void_coach_payment"("p_payment_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_payment public.coach_payments%rowtype;
begin
  select * into v_payment
  from public.coach_payments
  where id = p_payment_id;

  if not found then
    raise exception 'Pago inexistente';
  end if;
  if not public.is_owner_of(v_payment.gym_id) then
    raise exception 'No autorizado';
  end if;
  if v_payment.voided_at is not null then
    raise exception 'El pago ya está anulado';
  end if;

  update public.coach_payments
  set voided_at   = now(),
      voided_by   = public.auth_profile_id(),
      void_reason = p_reason
  where id = p_payment_id;
end;
$$;


ALTER FUNCTION "public"."void_coach_payment"("p_payment_id" "uuid", "p_reason" "text") OWNER TO "postgres";

--
-- Name: void_subscription_payment("uuid", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."void_subscription_payment"("p_payment_id" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_pay          public.subscription_payments%rowtype;
  v_actor        uuid := public.auth_profile_id();
  v_same_day     boolean;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'El motivo de la anulación es obligatorio';
  end if;

  select * into v_pay
  from public.subscription_payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Pago inexistente';
  end if;
  if v_pay.voided_at is not null then
    raise exception 'El pago ya está anulado';
  end if;

  v_same_day := v_pay.registered_by = v_actor
    and (v_pay.created_at at time zone 'America/Argentina/Buenos_Aires')::date
      = (now() at time zone 'America/Argentina/Buenos_Aires')::date;

  if not (public.has_gym_permission(v_pay.gym_id, 'payments.void') or v_same_day) then
    raise exception 'No autorizado';
  end if;

  update public.subscription_payments
  set voided_at = now(),
      voided_by = v_actor,
      void_reason = p_reason
  where id = p_payment_id;

  update public.activity_subscriptions s
  set due_date = case
        when v_pay.period_start is not null then least(s.due_date, v_pay.period_start)
        else s.due_date
      end,
      last_payment_date = (
        select max(sp.paid_at)
        from public.subscription_payments sp
        where sp.subscription_id = s.id and sp.voided_at is null
      )
  where s.id = v_pay.subscription_id;
end;
$$;


ALTER FUNCTION "public"."void_subscription_payment"("p_payment_id" "uuid", "p_reason" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activities" OWNER TO "postgres";

--
-- Name: activity_classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."activity_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "schedule_id" "uuid",
    "date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "capacity" integer,
    "coach_id" "uuid",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_classes_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "activity_classes_time_valid" CHECK (("start_time" < "end_time"))
);


ALTER TABLE "public"."activity_classes" OWNER TO "postgres";

--
-- Name: activity_coaches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."activity_coaches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "monthly_fee" numeric(10,2),
    "revenue_share_pct" numeric(5,2),
    "rate_per_class" numeric(10,2),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_coaches_amounts_positive" CHECK (((("monthly_fee" IS NULL) OR ("monthly_fee" >= (0)::numeric)) AND (("rate_per_class" IS NULL) OR ("rate_per_class" >= (0)::numeric)))),
    CONSTRAINT "activity_coaches_pct_range" CHECK ((("revenue_share_pct" IS NULL) OR (("revenue_share_pct" >= (0)::numeric) AND ("revenue_share_pct" <= (100)::numeric))))
);


ALTER TABLE "public"."activity_coaches" OWNER TO "postgres";

--
-- Name: activity_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."activity_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "frequency_per_week" integer,
    "price" numeric(10,2),
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_plans_freq_positive" CHECK ((("frequency_per_week" IS NULL) OR ("frequency_per_week" > 0)))
);


ALTER TABLE "public"."activity_plans" OWNER TO "postgres";

--
-- Name: activity_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."activity_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "weekday" smallint NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "capacity" integer,
    "coach_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_schedules_capacity_positive" CHECK ((("capacity" IS NULL) OR ("capacity" > 0))),
    CONSTRAINT "activity_schedules_time_valid" CHECK (("start_time" < "end_time")),
    CONSTRAINT "activity_schedules_weekday_valid" CHECK ((("weekday" >= 0) AND ("weekday" <= 6)))
);


ALTER TABLE "public"."activity_schedules" OWNER TO "postgres";

--
-- Name: activity_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."activity_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "activity_plan_id" "uuid" NOT NULL,
    "price" numeric(10,2),
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "start_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "end_date" "date",
    "due_date" "date",
    "last_payment_date" "date",
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."activity_subscriptions" OWNER TO "postgres";

--
-- Name: attendances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."attendances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "checked_in_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "method" "text" NOT NULL,
    "checked_in_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "attendances_method_check" CHECK (("method" = ANY (ARRAY['qr'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."attendances" OWNER TO "postgres";

--
-- Name: coach_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."coach_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "fixed_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "revenue_share_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "classes_count" integer DEFAULT 0 NOT NULL,
    "classes_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "notes" "text",
    "paid_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "registered_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    CONSTRAINT "coach_payments_period_valid" CHECK (("period_start" <= "period_end")),
    CONSTRAINT "coach_payments_total_positive" CHECK (("total_amount" >= (0)::numeric))
);


ALTER TABLE "public"."coach_payments" OWNER TO "postgres";

--
-- Name: custom_exercises; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."custom_exercises" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "muscle_group" "text" NOT NULL,
    "youtube_video_url" "text" DEFAULT ''::"text" NOT NULL,
    "image_uri" "text",
    "video_uri" "text",
    "instructions" "text" DEFAULT ''::"text" NOT NULL,
    "is_unilateral" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sync_status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."custom_exercises" OWNER TO "postgres";

--
-- Name: custom_plan_week_day_exercise_sets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."custom_plan_week_day_exercise_sets" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "exercise_id" "text" NOT NULL,
    "set_number" integer NOT NULL,
    "reps_min" integer,
    "reps_max" integer,
    "weight_kg" real,
    "duration_seconds" integer,
    "rir" real,
    "rpe" real,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sync_status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."custom_plan_week_day_exercise_sets" OWNER TO "postgres";

--
-- Name: custom_plan_week_day_exercises; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."custom_plan_week_day_exercises" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "week_day_id" "text" NOT NULL,
    "session_exercise_id" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "prescription_mode" "text" DEFAULT 'reps'::"text" NOT NULL,
    "rest_seconds" integer DEFAULT 90,
    "intensity_mode" "text" DEFAULT 'none'::"text",
    "tempo" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sync_status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."custom_plan_week_day_exercises" OWNER TO "postgres";

--
-- Name: custom_plan_week_days; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."custom_plan_week_days" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "week_id" "text" NOT NULL,
    "day_number" integer NOT NULL,
    "session_source" "text" DEFAULT 'custom'::"text",
    "session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sync_status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."custom_plan_week_days" OWNER TO "postgres";

--
-- Name: custom_plan_weeks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."custom_plan_weeks" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "plan_id" "text" NOT NULL,
    "week_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sync_status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."custom_plan_weeks" OWNER TO "postgres";

--
-- Name: custom_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."custom_plans" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "objective" "text",
    "level" "text",
    "weekly_days" integer DEFAULT 3 NOT NULL,
    "duration_weeks" integer DEFAULT 8 NOT NULL,
    "cover_image_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sync_status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."custom_plans" OWNER TO "postgres";

--
-- Name: custom_session_exercises; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."custom_session_exercises" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "session_id" "text" NOT NULL,
    "exercise_source" "text" DEFAULT 'base'::"text" NOT NULL,
    "exercise_id" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sync_status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."custom_session_exercises" OWNER TO "postgres";

--
-- Name: custom_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."custom_sessions" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "level" "text",
    "cover_image_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sync_status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."custom_sessions" OWNER TO "postgres";

--
-- Name: email_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."email_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid",
    "to_email" "text" NOT NULL,
    "type" "text" NOT NULL,
    "subject" "text",
    "resend_id" "text",
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_log" OWNER TO "postgres";

--
-- Name: equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."equipment" (
    "id" "text" NOT NULL,
    "created_at" "text" NOT NULL,
    "updated_at" "text" DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "image_uri" "text",
    "gym_id" "uuid" NOT NULL
);


ALTER TABLE "public"."equipment" OWNER TO "postgres";

--
-- Name: exercise_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."exercise_equipment" (
    "id" "text" NOT NULL,
    "created_at" "text" NOT NULL,
    "updated_at" "text" DEFAULT "now"() NOT NULL,
    "equipment_id" "text" NOT NULL,
    "exercise_id" "text" NOT NULL
);


ALTER TABLE "public"."exercise_equipment" OWNER TO "postgres";

--
-- Name: exercises_base; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."exercises_base" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "muscle_group" "text" NOT NULL,
    "video_uri" "text",
    "youtube_video_url" "text" NOT NULL,
    "image_uri" "text",
    "is_unilateral" boolean DEFAULT false NOT NULL,
    "instructions" "text" NOT NULL,
    "created_at" "text" NOT NULL,
    "updated_at" "text" DEFAULT "now"() NOT NULL,
    "gym_id" "uuid",
    "is_catalog" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."exercises_base" OWNER TO "postgres";

--
-- Name: gym_qr_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."gym_qr_tokens" (
    "token" "text" NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gym_qr_tokens" OWNER TO "postgres";

--
-- Name: gym_saas_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."gym_saas_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "mp_preapproval_id" "text",
    "payer_email" "text",
    "trial_ends_at" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "cancel_requested_at" timestamp with time zone,
    "cancel_reason" "text",
    "cancel_feedback" "text",
    "access_until" timestamp with time zone,
    "mp_application_id" "text",
    "mp_authorized_at" timestamp with time zone,
    CONSTRAINT "gym_saas_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'trialing'::"text", 'active'::"text", 'past_due'::"text", 'canceled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."gym_saas_subscriptions" OWNER TO "postgres";

--
-- Name: COLUMN "gym_saas_subscriptions"."cancel_at_period_end"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."gym_saas_subscriptions"."cancel_at_period_end" IS 'Baja pedida: no se cobra más, pero el gym escribe hasta access_until.';


--
-- Name: COLUMN "gym_saas_subscriptions"."access_until"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."gym_saas_subscriptions"."access_until" IS 'Fin del acceso de escritura, congelado al pedir la baja. NULL = sin baja pendiente.';


--
-- Name: COLUMN "gym_saas_subscriptions"."mp_application_id"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."gym_saas_subscriptions"."mp_application_id" IS 'App de MP que creó el preapproval. El webhook descarta avisos de otra app. NULL = fila anterior a esta columna; la reclama el primer aviso que llegue.';


--
-- Name: COLUMN "gym_saas_subscriptions"."mp_authorized_at"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."gym_saas_subscriptions"."mp_authorized_at" IS 'Cuándo MP confirmó ''authorized'' el preapproval vigente. NULL = checkout creado pero sin autorizar (o sin checkout). Lo resetea /api/saas/checkout al crear un preapproval nuevo; lo escribe el webhook mp-webhook.';


--
-- Name: gyms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."gyms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "logo_url" "text",
    "theme_primary" "text",
    "theme_accent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text",
    "phone" "text",
    "email" "text",
    "instagram" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "header_logo_size" "text" DEFAULT 'md'::"text" NOT NULL,
    "header_logo_position" "text" DEFAULT 'left'::"text" NOT NULL,
    "logo_url_dark" "text",
    "header_content" "text" DEFAULT 'logo'::"text" NOT NULL,
    "default_catalog" boolean DEFAULT false NOT NULL,
    "created_via" "text" DEFAULT 'platform'::"text" NOT NULL,
    "is_test" boolean DEFAULT false NOT NULL,
    CONSTRAINT "gyms_created_via_check" CHECK (("created_via" = ANY (ARRAY['platform'::"text", 'self_service'::"text"]))),
    CONSTRAINT "gyms_header_content_check" CHECK (("header_content" = ANY (ARRAY['logo'::"text", 'logo_title'::"text", 'title'::"text"]))),
    CONSTRAINT "gyms_header_logo_position_check" CHECK (("header_logo_position" = ANY (ARRAY['left'::"text", 'center'::"text"]))),
    CONSTRAINT "gyms_header_logo_size_check" CHECK (("header_logo_size" = ANY (ARRAY['sm'::"text", 'md'::"text", 'lg'::"text"])))
);


ALTER TABLE "public"."gyms" OWNER TO "postgres";

--
-- Name: COLUMN "gyms"."is_test"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."gyms"."is_test" IS 'Gym de prueba: la única clase de gym que los avisos del vendedor de prueba de MP pueden tocar.';


--
-- Name: health_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."health_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "steps" integer,
    "active_calories" real,
    "distance_meters" real,
    "avg_heart_rate" real,
    "min_heart_rate" real,
    "max_heart_rate" real,
    "resting_heart_rate" real,
    "weight_kg" real,
    "source" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "health_metrics_source_check" CHECK (("source" = ANY (ARRAY['healthkit'::"text", 'health_connect'::"text"])))
);


ALTER TABLE "public"."health_metrics" OWNER TO "postgres";

--
-- Name: media_delete_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."media_delete_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "public_id" "text" NOT NULL,
    "resource_type" "text" DEFAULT 'image'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_attempted_at" timestamp with time zone
);


ALTER TABLE "public"."media_delete_queue" OWNER TO "postgres";

--
-- Name: membership_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."membership_permissions" (
    "membership_id" "uuid" NOT NULL,
    "permission" "text" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "membership_permissions_permission_check" CHECK (("permission" = ANY (ARRAY['payments.register'::"text", 'payments.void'::"text"])))
);


ALTER TABLE "public"."membership_permissions" OWNER TO "postgres";

--
-- Name: memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "added_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "memberships_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'coach'::"text", 'member'::"text"]))),
    CONSTRAINT "memberships_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";

--
-- Name: plan_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."plan_assignments" (
    "id" "text" NOT NULL,
    "plan_id" "text",
    "user_id" "text" NOT NULL,
    "assigned_by" "text" NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "custom_plan_id" "text"
);


ALTER TABLE "public"."plan_assignments" OWNER TO "postgres";

--
-- Name: plan_week_day_exercise_sets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."plan_week_day_exercise_sets" (
    "id" "text" NOT NULL,
    "exercise_id" "text" NOT NULL,
    "set_number" integer NOT NULL,
    "reps_min" integer,
    "reps_max" integer,
    "weight_kg" real,
    "duration_seconds" integer,
    "rir" real,
    "rpe" real,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plan_week_day_exercise_sets" OWNER TO "postgres";

--
-- Name: plan_week_day_exercises; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."plan_week_day_exercises" (
    "id" "text" NOT NULL,
    "week_day_id" "text" NOT NULL,
    "session_exercise_id" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "prescription_mode" "text" DEFAULT 'reps'::"text" NOT NULL,
    "rest_seconds" integer DEFAULT 90,
    "intensity_mode" "text" DEFAULT 'none'::"text",
    "tempo" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plan_week_day_exercises" OWNER TO "postgres";

--
-- Name: plan_week_days; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."plan_week_days" (
    "id" "text" NOT NULL,
    "week_id" "text" NOT NULL,
    "day_number" integer NOT NULL,
    "session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "plan_week_days_day_number_check" CHECK ((("day_number" >= 1) AND ("day_number" <= 7)))
);


ALTER TABLE "public"."plan_week_days" OWNER TO "postgres";

--
-- Name: plan_weeks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."plan_weeks" (
    "id" "text" NOT NULL,
    "plan_id" "text" NOT NULL,
    "week_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plan_weeks" OWNER TO "postgres";

--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "id" boolean DEFAULT true NOT NULL,
    "self_service_signup_enabled" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "platform_settings_id_check" CHECK ("id")
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "last_name" "text",
    "image_profile" "text",
    "phone" "text",
    "document_number" "text",
    "address" "text",
    "weight" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "active_plan_id" "text",
    "user_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "gender" "text",
    "is_super_admin" boolean DEFAULT false NOT NULL,
    "platform_staff_role" "text",
    "health_sync_consent_at" timestamp with time zone,
    CONSTRAINT "profiles_gender_check" CHECK ((("gender" IS NULL) OR ("gender" = ANY (ARRAY['hombre'::"text", 'mujer'::"text", 'prefiero_no_decir'::"text"])))),
    CONSTRAINT "profiles_platform_staff_role_check" CHECK (("platform_staff_role" = ANY (ARRAY['admin'::"text", 'coach'::"text"]))),
    CONSTRAINT "profiles_platform_staff_role_super_admin_excl" CHECK (((NOT "is_super_admin") OR ("platform_staff_role" IS NULL)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";

--
-- Name: saas_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."saas_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2),
    "currency" "text" DEFAULT 'ARS'::"text" NOT NULL,
    "billing_period" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "trial_days" integer DEFAULT 14 NOT NULL,
    "mp_preapproval_plan_id" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "saas_plans_billing_period_check" CHECK (("billing_period" = ANY (ARRAY['monthly'::"text", 'annual'::"text"])))
);


ALTER TABLE "public"."saas_plans" OWNER TO "postgres";

--
-- Name: saas_preapprovals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."saas_preapprovals" (
    "mp_preapproval_id" "text" NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "mp_application_id" "text",
    "payer_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "canceled_at" timestamp with time zone
);


ALTER TABLE "public"."saas_preapprovals" OWNER TO "postgres";

--
-- Name: TABLE "saas_preapprovals"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."saas_preapprovals" IS 'Preapprovals de MP creados por el checkout. Existe porque /preapproval/search ignora external_reference y no se puede paginar de forma estable: sin este registro no hay manera de saber qué preapprovals son de qué gym.';


--
-- Name: saas_subscription_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."saas_subscription_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_subscription_id" "uuid",
    "mp_event_id" "text",
    "event_type" "text" NOT NULL,
    "payload" "jsonb",
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."saas_subscription_events" OWNER TO "postgres";

--
-- Name: self_service_signup_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."self_service_signup_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip" "text" NOT NULL,
    "user_id" "uuid",
    "gym_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."self_service_signup_attempts" OWNER TO "postgres";

--
-- Name: session_exercises; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."session_exercises" (
    "id" "text" NOT NULL,
    "session_id" "text" NOT NULL,
    "exercise_id" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."session_exercises" OWNER TO "postgres";

--
-- Name: session_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."session_logs" (
    "id" "text" NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "user_id" "text" NOT NULL,
    "session_id" "text",
    "plan_id" "text",
    "week_number" integer,
    "day_number" integer,
    "duration_seconds" integer,
    "completed_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "custom_plan_id" "text"
);


ALTER TABLE "public"."session_logs" OWNER TO "postgres";

--
-- Name: session_set_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."session_set_logs" (
    "id" "text" NOT NULL,
    "session_log_id" "text" NOT NULL,
    "exercise_id" "text" NOT NULL,
    "set_number" integer NOT NULL,
    "reps" integer NOT NULL,
    "weight_kg" real,
    "rest_seconds" integer,
    "notes" "text",
    "rir" real,
    "rpe" real,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."session_set_logs" OWNER TO "postgres";

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "level" "text",
    "cover_image_uri" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gym_id" "uuid",
    "is_catalog" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";

--
-- Name: subscription_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."subscription_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "paid_at" "date" DEFAULT CURRENT_DATE NOT NULL,
    "registered_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "period_start" "date",
    "period_end" "date",
    "payment_method" "text",
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    CONSTRAINT "subscription_payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "subscription_payments_payment_method_check" CHECK ((("payment_method" IS NULL) OR ("payment_method" = ANY (ARRAY['efectivo'::"text", 'transferencia'::"text", 'tarjeta'::"text", 'mercado_pago'::"text"])))),
    CONSTRAINT "subscription_payments_void_reason_required" CHECK ((("voided_at" IS NULL) OR ("void_reason" IS NOT NULL)))
);


ALTER TABLE "public"."subscription_payments" OWNER TO "postgres";

--
-- Name: COLUMN "subscription_payments"."period_start"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."subscription_payments"."period_start" IS 'Primer día del mes cubierto por el cobro. Null en filas previas al rollout.';


--
-- Name: COLUMN "subscription_payments"."period_end"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."subscription_payments"."period_end" IS 'Primer día del mes siguiente al cubierto (= vencimiento del período). Null en filas previas.';


--
-- Name: training_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."training_plans" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "objective" "text",
    "weekly_days" integer DEFAULT 3 NOT NULL,
    "created_by" "text",
    "created_at" "text" NOT NULL,
    "updated_at" "text" DEFAULT "now"() NOT NULL,
    "description" "text",
    "level" "text",
    "cover_image_uri" "text",
    "duration_weeks" integer DEFAULT 8 NOT NULL,
    "gym_id" "uuid",
    "is_published" boolean DEFAULT false NOT NULL,
    "target_gender" "text" DEFAULT 'ambos'::"text" NOT NULL,
    "is_catalog" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone,
    CONSTRAINT "training_plans_target_gender_check" CHECK (("target_gender" = ANY (ARRAY['hombre'::"text", 'mujer'::"text", 'ambos'::"text"])))
);


ALTER TABLE "public"."training_plans" OWNER TO "postgres";

--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");


--
-- Name: activity_classes activity_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_classes"
    ADD CONSTRAINT "activity_classes_pkey" PRIMARY KEY ("id");


--
-- Name: activity_coaches activity_coaches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_coaches"
    ADD CONSTRAINT "activity_coaches_pkey" PRIMARY KEY ("id");


--
-- Name: activity_plans activity_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_plans"
    ADD CONSTRAINT "activity_plans_pkey" PRIMARY KEY ("id");


--
-- Name: activity_schedules activity_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_schedules"
    ADD CONSTRAINT "activity_schedules_pkey" PRIMARY KEY ("id");


--
-- Name: activity_subscriptions activity_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_subscriptions"
    ADD CONSTRAINT "activity_subscriptions_pkey" PRIMARY KEY ("id");


--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_pkey" PRIMARY KEY ("id");


--
-- Name: media_delete_queue cloudinary_delete_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."media_delete_queue"
    ADD CONSTRAINT "cloudinary_delete_queue_pkey" PRIMARY KEY ("id");


--
-- Name: media_delete_queue cloudinary_delete_queue_public_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."media_delete_queue"
    ADD CONSTRAINT "cloudinary_delete_queue_public_id_key" UNIQUE ("public_id");


--
-- Name: coach_payments coach_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."coach_payments"
    ADD CONSTRAINT "coach_payments_pkey" PRIMARY KEY ("id");


--
-- Name: custom_exercises custom_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_exercises"
    ADD CONSTRAINT "custom_exercises_pkey" PRIMARY KEY ("id");


--
-- Name: custom_plan_week_day_exercise_sets custom_plan_week_day_exercise_sets_exercise_id_set_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_week_day_exercise_sets"
    ADD CONSTRAINT "custom_plan_week_day_exercise_sets_exercise_id_set_number_key" UNIQUE ("exercise_id", "set_number");


--
-- Name: custom_plan_week_day_exercise_sets custom_plan_week_day_exercise_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_week_day_exercise_sets"
    ADD CONSTRAINT "custom_plan_week_day_exercise_sets_pkey" PRIMARY KEY ("id");


--
-- Name: custom_plan_week_day_exercises custom_plan_week_day_exercise_week_day_id_session_exercise__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_week_day_exercises"
    ADD CONSTRAINT "custom_plan_week_day_exercise_week_day_id_session_exercise__key" UNIQUE ("week_day_id", "session_exercise_id");


--
-- Name: custom_plan_week_day_exercises custom_plan_week_day_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_week_day_exercises"
    ADD CONSTRAINT "custom_plan_week_day_exercises_pkey" PRIMARY KEY ("id");


--
-- Name: custom_plan_week_days custom_plan_week_days_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_week_days"
    ADD CONSTRAINT "custom_plan_week_days_pkey" PRIMARY KEY ("id");


--
-- Name: custom_plan_week_days custom_plan_week_days_week_id_day_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_week_days"
    ADD CONSTRAINT "custom_plan_week_days_week_id_day_number_key" UNIQUE ("week_id", "day_number");


--
-- Name: custom_plan_weeks custom_plan_weeks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_weeks"
    ADD CONSTRAINT "custom_plan_weeks_pkey" PRIMARY KEY ("id");


--
-- Name: custom_plan_weeks custom_plan_weeks_plan_id_week_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_weeks"
    ADD CONSTRAINT "custom_plan_weeks_plan_id_week_number_key" UNIQUE ("plan_id", "week_number");


--
-- Name: custom_plans custom_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plans"
    ADD CONSTRAINT "custom_plans_pkey" PRIMARY KEY ("id");


--
-- Name: custom_session_exercises custom_session_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_session_exercises"
    ADD CONSTRAINT "custom_session_exercises_pkey" PRIMARY KEY ("id");


--
-- Name: custom_session_exercises custom_session_exercises_session_id_exercise_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_session_exercises"
    ADD CONSTRAINT "custom_session_exercises_session_id_exercise_id_key" UNIQUE ("session_id", "exercise_id");


--
-- Name: custom_sessions custom_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_sessions"
    ADD CONSTRAINT "custom_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: email_log email_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_log"
    ADD CONSTRAINT "email_log_pkey" PRIMARY KEY ("id");


--
-- Name: email_log email_log_resend_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_log"
    ADD CONSTRAINT "email_log_resend_id_key" UNIQUE ("resend_id");


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("id");


--
-- Name: exercises_base exercises_base_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."exercises_base"
    ADD CONSTRAINT "exercises_base_name_key" UNIQUE ("name");


--
-- Name: exercises_base exercises_base_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."exercises_base"
    ADD CONSTRAINT "exercises_base_pkey" PRIMARY KEY ("id");


--
-- Name: exercise_equipment exercises_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."exercise_equipment"
    ADD CONSTRAINT "exercises_equipment_pkey" PRIMARY KEY ("id");


--
-- Name: gym_qr_tokens gym_qr_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."gym_qr_tokens"
    ADD CONSTRAINT "gym_qr_tokens_pkey" PRIMARY KEY ("token");


--
-- Name: gym_saas_subscriptions gym_saas_subscriptions_gym_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."gym_saas_subscriptions"
    ADD CONSTRAINT "gym_saas_subscriptions_gym_id_key" UNIQUE ("gym_id");


--
-- Name: gym_saas_subscriptions gym_saas_subscriptions_mp_preapproval_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."gym_saas_subscriptions"
    ADD CONSTRAINT "gym_saas_subscriptions_mp_preapproval_id_key" UNIQUE ("mp_preapproval_id");


--
-- Name: gym_saas_subscriptions gym_saas_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."gym_saas_subscriptions"
    ADD CONSTRAINT "gym_saas_subscriptions_pkey" PRIMARY KEY ("id");


--
-- Name: gyms gyms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_pkey" PRIMARY KEY ("id");


--
-- Name: gyms gyms_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_slug_key" UNIQUE ("slug");


--
-- Name: health_metrics health_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."health_metrics"
    ADD CONSTRAINT "health_metrics_pkey" PRIMARY KEY ("id");


--
-- Name: health_metrics health_metrics_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."health_metrics"
    ADD CONSTRAINT "health_metrics_user_id_date_key" UNIQUE ("user_id", "date");


--
-- Name: membership_permissions membership_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."membership_permissions"
    ADD CONSTRAINT "membership_permissions_pkey" PRIMARY KEY ("membership_id", "permission");


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");


--
-- Name: memberships memberships_user_id_gym_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_gym_id_key" UNIQUE ("user_id", "gym_id");


--
-- Name: plan_assignments plan_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_assignments"
    ADD CONSTRAINT "plan_assignments_pkey" PRIMARY KEY ("id");


--
-- Name: plan_week_day_exercise_sets plan_week_day_exercise_sets_exercise_id_set_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_week_day_exercise_sets"
    ADD CONSTRAINT "plan_week_day_exercise_sets_exercise_id_set_number_key" UNIQUE ("exercise_id", "set_number");


--
-- Name: plan_week_day_exercise_sets plan_week_day_exercise_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_week_day_exercise_sets"
    ADD CONSTRAINT "plan_week_day_exercise_sets_pkey" PRIMARY KEY ("id");


--
-- Name: plan_week_day_exercises plan_week_day_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_week_day_exercises"
    ADD CONSTRAINT "plan_week_day_exercises_pkey" PRIMARY KEY ("id");


--
-- Name: plan_week_day_exercises plan_week_day_exercises_week_day_id_session_exercise_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_week_day_exercises"
    ADD CONSTRAINT "plan_week_day_exercises_week_day_id_session_exercise_id_key" UNIQUE ("week_day_id", "session_exercise_id");


--
-- Name: plan_week_days plan_week_days_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_week_days"
    ADD CONSTRAINT "plan_week_days_pkey" PRIMARY KEY ("id");


--
-- Name: plan_week_days plan_week_days_week_id_day_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_week_days"
    ADD CONSTRAINT "plan_week_days_week_id_day_number_key" UNIQUE ("week_id", "day_number");


--
-- Name: plan_weeks plan_weeks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_weeks"
    ADD CONSTRAINT "plan_weeks_pkey" PRIMARY KEY ("id");


--
-- Name: plan_weeks plan_weeks_plan_id_week_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_weeks"
    ADD CONSTRAINT "plan_weeks_plan_id_week_number_key" UNIQUE ("plan_id", "week_number");


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: session_exercises routine_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "routine_exercises_pkey" PRIMARY KEY ("id");


--
-- Name: sessions routines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "routines_pkey" PRIMARY KEY ("id");


--
-- Name: saas_plans saas_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."saas_plans"
    ADD CONSTRAINT "saas_plans_pkey" PRIMARY KEY ("id");


--
-- Name: saas_preapprovals saas_preapprovals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."saas_preapprovals"
    ADD CONSTRAINT "saas_preapprovals_pkey" PRIMARY KEY ("mp_preapproval_id");


--
-- Name: saas_subscription_events saas_subscription_events_mp_event_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."saas_subscription_events"
    ADD CONSTRAINT "saas_subscription_events_mp_event_id_key" UNIQUE ("mp_event_id");


--
-- Name: saas_subscription_events saas_subscription_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."saas_subscription_events"
    ADD CONSTRAINT "saas_subscription_events_pkey" PRIMARY KEY ("id");


--
-- Name: self_service_signup_attempts self_service_signup_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."self_service_signup_attempts"
    ADD CONSTRAINT "self_service_signup_attempts_pkey" PRIMARY KEY ("id");


--
-- Name: session_exercises session_exercises_session_id_exercise_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_session_id_exercise_id_unique" UNIQUE ("session_id", "exercise_id");


--
-- Name: session_logs session_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_logs"
    ADD CONSTRAINT "session_logs_pkey" PRIMARY KEY ("id");


--
-- Name: session_set_logs session_set_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_set_logs"
    ADD CONSTRAINT "session_set_logs_pkey" PRIMARY KEY ("id");


--
-- Name: session_set_logs session_set_logs_session_log_id_exercise_id_set_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_set_logs"
    ADD CONSTRAINT "session_set_logs_session_log_id_exercise_id_set_number_unique" UNIQUE ("session_log_id", "exercise_id", "set_number");


--
-- Name: subscription_payments subscription_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id");


--
-- Name: training_plans training_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."training_plans"
    ADD CONSTRAINT "training_plans_pkey" PRIMARY KEY ("id");


--
-- Name: activities_gym_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activities_gym_id_idx" ON "public"."activities" USING "btree" ("gym_id");


--
-- Name: activities_gym_name_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "activities_gym_name_uniq" ON "public"."activities" USING "btree" ("gym_id", "lower"("name"));


--
-- Name: activity_classes_coach_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_classes_coach_date_idx" ON "public"."activity_classes" USING "btree" ("coach_id", "date");


--
-- Name: activity_classes_gym_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_classes_gym_date_idx" ON "public"."activity_classes" USING "btree" ("gym_id", "date");


--
-- Name: activity_classes_occurrence_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "activity_classes_occurrence_uniq" ON "public"."activity_classes" USING "btree" ("schedule_id", "date") WHERE ("schedule_id" IS NOT NULL);


--
-- Name: activity_coaches_coach_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_coaches_coach_idx" ON "public"."activity_coaches" USING "btree" ("coach_id");


--
-- Name: activity_coaches_gym_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_coaches_gym_idx" ON "public"."activity_coaches" USING "btree" ("gym_id");


--
-- Name: activity_coaches_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "activity_coaches_uniq" ON "public"."activity_coaches" USING "btree" ("activity_id", "coach_id");


--
-- Name: activity_plans_activity_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_plans_activity_id_idx" ON "public"."activity_plans" USING "btree" ("activity_id");


--
-- Name: activity_plans_label_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "activity_plans_label_uniq" ON "public"."activity_plans" USING "btree" ("activity_id", "lower"("label"));


--
-- Name: activity_schedules_coach_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_schedules_coach_idx" ON "public"."activity_schedules" USING "btree" ("coach_id");


--
-- Name: activity_schedules_gym_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_schedules_gym_idx" ON "public"."activity_schedules" USING "btree" ("gym_id");


--
-- Name: activity_schedules_slot_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "activity_schedules_slot_uniq" ON "public"."activity_schedules" USING "btree" ("activity_id", "weekday", "start_time");


--
-- Name: activity_subscriptions_gym_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_subscriptions_gym_idx" ON "public"."activity_subscriptions" USING "btree" ("gym_id");


--
-- Name: activity_subscriptions_one_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "activity_subscriptions_one_active" ON "public"."activity_subscriptions" USING "btree" ("user_id", "activity_id") WHERE ("status" = 'active'::"text");


--
-- Name: activity_subscriptions_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_subscriptions_user_idx" ON "public"."activity_subscriptions" USING "btree" ("user_id");


--
-- Name: attendances_gym_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "attendances_gym_idx" ON "public"."attendances" USING "btree" ("gym_id");


--
-- Name: attendances_profile_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "attendances_profile_idx" ON "public"."attendances" USING "btree" ("profile_id");


--
-- Name: attendances_recent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "attendances_recent_idx" ON "public"."attendances" USING "btree" ("gym_id", "checked_in_at" DESC);


--
-- Name: coach_payments_coach_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "coach_payments_coach_idx" ON "public"."coach_payments" USING "btree" ("coach_id", "period_start");


--
-- Name: coach_payments_gym_period_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "coach_payments_gym_period_idx" ON "public"."coach_payments" USING "btree" ("gym_id", "period_start");


--
-- Name: custom_exercises_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "custom_exercises_user_id_idx" ON "public"."custom_exercises" USING "btree" ("user_id");


--
-- Name: custom_plans_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "custom_plans_user_id_idx" ON "public"."custom_plans" USING "btree" ("user_id");


--
-- Name: custom_sessions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "custom_sessions_user_id_idx" ON "public"."custom_sessions" USING "btree" ("user_id");


--
-- Name: email_log_gym_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "email_log_gym_created_idx" ON "public"."email_log" USING "btree" ("gym_id", "created_at" DESC);


--
-- Name: email_log_resend_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "email_log_resend_id_idx" ON "public"."email_log" USING "btree" ("resend_id");


--
-- Name: equipment_gym_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "equipment_gym_id_idx" ON "public"."equipment" USING "btree" ("gym_id");


--
-- Name: equipment_gym_id_updated_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "equipment_gym_id_updated_at_idx" ON "public"."equipment" USING "btree" ("gym_id", "updated_at");


--
-- Name: exercises_base_gym_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "exercises_base_gym_id_idx" ON "public"."exercises_base" USING "btree" ("gym_id");


--
-- Name: exercises_base_gym_id_updated_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "exercises_base_gym_id_updated_at_idx" ON "public"."exercises_base" USING "btree" ("gym_id", "updated_at");


--
-- Name: exercises_base_is_catalog_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "exercises_base_is_catalog_idx" ON "public"."exercises_base" USING "btree" ("is_catalog") WHERE "is_catalog";


--
-- Name: gym_qr_tokens_expires_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "gym_qr_tokens_expires_idx" ON "public"."gym_qr_tokens" USING "btree" ("expires_at");


--
-- Name: gym_qr_tokens_gym_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "gym_qr_tokens_gym_idx" ON "public"."gym_qr_tokens" USING "btree" ("gym_id");


--
-- Name: gym_saas_subscriptions_cancel_pending_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "gym_saas_subscriptions_cancel_pending_idx" ON "public"."gym_saas_subscriptions" USING "btree" ("access_until") WHERE "cancel_at_period_end";


--
-- Name: gym_saas_subscriptions_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "gym_saas_subscriptions_status_idx" ON "public"."gym_saas_subscriptions" USING "btree" ("status", "trial_ends_at");


--
-- Name: gyms_owner_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "gyms_owner_id_idx" ON "public"."gyms" USING "btree" ("owner_id");


--
-- Name: health_metrics_user_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "health_metrics_user_date_idx" ON "public"."health_metrics" USING "btree" ("user_id", "date" DESC);


--
-- Name: memberships_gym_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "memberships_gym_id_idx" ON "public"."memberships" USING "btree" ("gym_id");


--
-- Name: memberships_one_owner_per_gym; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "memberships_one_owner_per_gym" ON "public"."memberships" USING "btree" ("gym_id") WHERE ("role" = 'owner'::"text");


--
-- Name: memberships_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "memberships_user_id_idx" ON "public"."memberships" USING "btree" ("user_id");


--
-- Name: plan_assignments_gym_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "plan_assignments_gym_idx" ON "public"."plan_assignments" USING "btree" ("gym_id");


--
-- Name: plan_assignments_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "plan_assignments_user_idx" ON "public"."plan_assignments" USING "btree" ("user_id");


--
-- Name: profiles_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profiles_user_id_idx" ON "public"."profiles" USING "btree" ("user_id");


--
-- Name: saas_preapprovals_gym_pendientes_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "saas_preapprovals_gym_pendientes_idx" ON "public"."saas_preapprovals" USING "btree" ("gym_id") WHERE ("canceled_at" IS NULL);


--
-- Name: saas_subscription_events_sub_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "saas_subscription_events_sub_idx" ON "public"."saas_subscription_events" USING "btree" ("gym_subscription_id", "processed_at" DESC);


--
-- Name: self_service_signup_attempts_ip_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "self_service_signup_attempts_ip_idx" ON "public"."self_service_signup_attempts" USING "btree" ("ip", "created_at" DESC);


--
-- Name: session_logs_deleted_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "session_logs_deleted_at_idx" ON "public"."session_logs" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);


--
-- Name: session_logs_gym_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "session_logs_gym_id_idx" ON "public"."session_logs" USING "btree" ("gym_id");


--
-- Name: session_logs_gym_id_updated_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "session_logs_gym_id_updated_at_idx" ON "public"."session_logs" USING "btree" ("gym_id", "updated_at");


--
-- Name: session_logs_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "session_logs_user_id_idx" ON "public"."session_logs" USING "btree" ("user_id");


--
-- Name: session_set_logs_deleted_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "session_set_logs_deleted_at_idx" ON "public"."session_set_logs" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);


--
-- Name: session_set_logs_session_log_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "session_set_logs_session_log_id_idx" ON "public"."session_set_logs" USING "btree" ("session_log_id");


--
-- Name: sessions_gym_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sessions_gym_id_idx" ON "public"."sessions" USING "btree" ("gym_id");


--
-- Name: sessions_gym_id_updated_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sessions_gym_id_updated_at_idx" ON "public"."sessions" USING "btree" ("gym_id", "updated_at");


--
-- Name: sessions_is_catalog_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sessions_is_catalog_idx" ON "public"."sessions" USING "btree" ("is_catalog") WHERE "is_catalog";


--
-- Name: subscription_payments_activity_paid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "subscription_payments_activity_paid_idx" ON "public"."subscription_payments" USING "btree" ("activity_id", "paid_at");


--
-- Name: subscription_payments_gym_paid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "subscription_payments_gym_paid_idx" ON "public"."subscription_payments" USING "btree" ("gym_id", "paid_at");


--
-- Name: subscription_payments_subscription_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "subscription_payments_subscription_idx" ON "public"."subscription_payments" USING "btree" ("subscription_id");


--
-- Name: subscription_payments_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "subscription_payments_user_idx" ON "public"."subscription_payments" USING "btree" ("user_id");


--
-- Name: training_plans_archived_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "training_plans_archived_idx" ON "public"."training_plans" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);


--
-- Name: training_plans_gym_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "training_plans_gym_id_idx" ON "public"."training_plans" USING "btree" ("gym_id");


--
-- Name: training_plans_gym_id_updated_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "training_plans_gym_id_updated_at_idx" ON "public"."training_plans" USING "btree" ("gym_id", "updated_at");


--
-- Name: training_plans_is_catalog_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "training_plans_is_catalog_idx" ON "public"."training_plans" USING "btree" ("is_catalog") WHERE "is_catalog";


--
-- Name: uniq_active_plan_assignment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uniq_active_plan_assignment" ON "public"."plan_assignments" USING "btree" ("user_id") WHERE ("status" = 'active'::"text");


--
-- Name: activities activities_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "activities_set_updated_at" BEFORE UPDATE ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: activity_classes activity_classes_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "activity_classes_set_updated_at" BEFORE UPDATE ON "public"."activity_classes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: activity_coaches activity_coaches_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "activity_coaches_set_updated_at" BEFORE UPDATE ON "public"."activity_coaches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: activity_plans activity_plans_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "activity_plans_set_updated_at" BEFORE UPDATE ON "public"."activity_plans" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: activity_schedules activity_schedules_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "activity_schedules_set_updated_at" BEFORE UPDATE ON "public"."activity_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: activity_subscriptions activity_subscriptions_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "activity_subscriptions_set_updated_at" BEFORE UPDATE ON "public"."activity_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: custom_exercises custom_exercises_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "custom_exercises_updated_at" BEFORE UPDATE ON "public"."custom_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: custom_plan_week_day_exercise_sets custom_plan_week_day_exercise_sets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "custom_plan_week_day_exercise_sets_updated_at" BEFORE UPDATE ON "public"."custom_plan_week_day_exercise_sets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: custom_plan_week_day_exercises custom_plan_week_day_exercises_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "custom_plan_week_day_exercises_updated_at" BEFORE UPDATE ON "public"."custom_plan_week_day_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: custom_plan_week_days custom_plan_week_days_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "custom_plan_week_days_updated_at" BEFORE UPDATE ON "public"."custom_plan_week_days" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: custom_plan_weeks custom_plan_weeks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "custom_plan_weeks_updated_at" BEFORE UPDATE ON "public"."custom_plan_weeks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: custom_plans custom_plans_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "custom_plans_updated_at" BEFORE UPDATE ON "public"."custom_plans" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: custom_session_exercises custom_session_exercises_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "custom_session_exercises_updated_at" BEFORE UPDATE ON "public"."custom_session_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: custom_sessions custom_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "custom_sessions_updated_at" BEFORE UPDATE ON "public"."custom_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: gym_saas_subscriptions gym_saas_subscriptions_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "gym_saas_subscriptions_set_updated_at" BEFORE UPDATE ON "public"."gym_saas_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: health_metrics health_metrics_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "health_metrics_set_updated_at" BEFORE UPDATE ON "public"."health_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: memberships memberships_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "memberships_set_updated_at" BEFORE UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: platform_settings platform_settings_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "platform_settings_set_updated_at" BEFORE UPDATE ON "public"."platform_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: saas_plans saas_plans_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "saas_plans_set_updated_at" BEFORE UPDATE ON "public"."saas_plans" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: session_logs session_logs_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "session_logs_set_updated_at" BEFORE UPDATE ON "public"."session_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: session_set_logs session_set_logs_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "session_set_logs_set_updated_at" BEFORE UPDATE ON "public"."session_set_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: equipment set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."equipment" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: exercise_equipment set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."exercise_equipment" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: exercises_base set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."exercises_base" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: gyms set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."gyms" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: plan_assignments set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."plan_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: plan_week_day_exercise_sets set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."plan_week_day_exercise_sets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: plan_week_day_exercises set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."plan_week_day_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: plan_week_days set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."plan_week_days" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: plan_weeks set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."plan_weeks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: session_exercises set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."session_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: sessions set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: training_plans set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."training_plans" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: equipment sync-media-assets-equipment; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "sync-media-assets-equipment" AFTER INSERT OR DELETE OR UPDATE ON "public"."equipment" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://claoplxdhdxoixfdsatz.supabase.co/functions/v1/sync-media-webhook', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYW9wbHhkaGR4b2l4ZmRzYXR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc0MTAwMSwiZXhwIjoyMDg3MzE3MDAxfQ.HE8LCrJWydlhg3Ue6vM8b8sFlRDysQZl8q1-v0uv9LM"}', '{}', '5000');


--
-- Name: exercises_base sync-media-assets-exercises; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "sync-media-assets-exercises" AFTER INSERT OR DELETE OR UPDATE ON "public"."exercises_base" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://claoplxdhdxoixfdsatz.supabase.co/functions/v1/sync-media-webhook', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYW9wbHhkaGR4b2l4ZmRzYXR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc0MTAwMSwiZXhwIjoyMDg3MzE3MDAxfQ.HE8LCrJWydlhg3Ue6vM8b8sFlRDysQZl8q1-v0uv9LM"}', '{}', '5000');


--
-- Name: gyms sync-media-assets-gyms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "sync-media-assets-gyms" AFTER INSERT OR DELETE OR UPDATE ON "public"."gyms" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://claoplxdhdxoixfdsatz.supabase.co/functions/v1/sync-media-webhook', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYW9wbHhkaGR4b2l4ZmRzYXR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc0MTAwMSwiZXhwIjoyMDg3MzE3MDAxfQ.HE8LCrJWydlhg3Ue6vM8b8sFlRDysQZl8q1-v0uv9LM"}', '{}', '5000');


--
-- Name: profiles sync-media-assets-profiles; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "sync-media-assets-profiles" AFTER INSERT OR DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://claoplxdhdxoixfdsatz.supabase.co/functions/v1/sync-media-webhook', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYW9wbHhkaGR4b2l4ZmRzYXR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc0MTAwMSwiZXhwIjoyMDg3MzE3MDAxfQ.HE8LCrJWydlhg3Ue6vM8b8sFlRDysQZl8q1-v0uv9LM"}', '{}', '5000');


--
-- Name: sessions sync-media-assets-sessions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "sync-media-assets-sessions" AFTER INSERT OR DELETE OR UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://claoplxdhdxoixfdsatz.supabase.co/functions/v1/sync-media-webhook', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYW9wbHhkaGR4b2l4ZmRzYXR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc0MTAwMSwiZXhwIjoyMDg3MzE3MDAxfQ.HE8LCrJWydlhg3Ue6vM8b8sFlRDysQZl8q1-v0uv9LM"}', '{}', '5000');


--
-- Name: training_plans sync-media-assets-training-plans; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "sync-media-assets-training-plans" AFTER INSERT OR DELETE OR UPDATE ON "public"."training_plans" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://claoplxdhdxoixfdsatz.supabase.co/functions/v1/sync-media-webhook', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYW9wbHhkaGR4b2l4ZmRzYXR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc0MTAwMSwiZXhwIjoyMDg3MzE3MDAxfQ.HE8LCrJWydlhg3Ue6vM8b8sFlRDysQZl8q1-v0uv9LM"}', '{}', '5000');


--
-- Name: profiles trg_guard_profile_self_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "trg_guard_profile_self_update" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_self_update"();


--
-- Name: activities activities_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: activity_classes activity_classes_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_classes"
    ADD CONSTRAINT "activity_classes_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;


--
-- Name: activity_classes activity_classes_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_classes"
    ADD CONSTRAINT "activity_classes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: activity_classes activity_classes_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_classes"
    ADD CONSTRAINT "activity_classes_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: activity_classes activity_classes_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_classes"
    ADD CONSTRAINT "activity_classes_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."activity_schedules"("id") ON DELETE SET NULL;


--
-- Name: activity_coaches activity_coaches_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_coaches"
    ADD CONSTRAINT "activity_coaches_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;


--
-- Name: activity_coaches activity_coaches_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_coaches"
    ADD CONSTRAINT "activity_coaches_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: activity_coaches activity_coaches_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_coaches"
    ADD CONSTRAINT "activity_coaches_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: activity_plans activity_plans_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_plans"
    ADD CONSTRAINT "activity_plans_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;


--
-- Name: activity_schedules activity_schedules_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_schedules"
    ADD CONSTRAINT "activity_schedules_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;


--
-- Name: activity_schedules activity_schedules_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_schedules"
    ADD CONSTRAINT "activity_schedules_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: activity_schedules activity_schedules_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_schedules"
    ADD CONSTRAINT "activity_schedules_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: activity_subscriptions activity_subscriptions_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_subscriptions"
    ADD CONSTRAINT "activity_subscriptions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;


--
-- Name: activity_subscriptions activity_subscriptions_activity_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_subscriptions"
    ADD CONSTRAINT "activity_subscriptions_activity_plan_id_fkey" FOREIGN KEY ("activity_plan_id") REFERENCES "public"."activity_plans"("id") ON DELETE CASCADE;


--
-- Name: activity_subscriptions activity_subscriptions_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_subscriptions"
    ADD CONSTRAINT "activity_subscriptions_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");


--
-- Name: activity_subscriptions activity_subscriptions_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_subscriptions"
    ADD CONSTRAINT "activity_subscriptions_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: activity_subscriptions activity_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."activity_subscriptions"
    ADD CONSTRAINT "activity_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: attendances attendances_checked_in_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "public"."profiles"("id");


--
-- Name: attendances attendances_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: attendances attendances_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: coach_payments coach_payments_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."coach_payments"
    ADD CONSTRAINT "coach_payments_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: coach_payments coach_payments_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."coach_payments"
    ADD CONSTRAINT "coach_payments_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: coach_payments coach_payments_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."coach_payments"
    ADD CONSTRAINT "coach_payments_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: coach_payments coach_payments_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."coach_payments"
    ADD CONSTRAINT "coach_payments_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: custom_exercises custom_exercises_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_exercises"
    ADD CONSTRAINT "custom_exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: custom_plan_week_day_exercise_sets custom_plan_week_day_exercise_sets_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_week_day_exercise_sets"
    ADD CONSTRAINT "custom_plan_week_day_exercise_sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."custom_plan_week_day_exercises"("id") ON DELETE CASCADE;


--
-- Name: custom_plan_week_day_exercises custom_plan_week_day_exercises_session_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_week_day_exercises"
    ADD CONSTRAINT "custom_plan_week_day_exercises_session_exercise_id_fkey" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."custom_session_exercises"("id") ON DELETE CASCADE;


--
-- Name: custom_plan_week_day_exercises custom_plan_week_day_exercises_week_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_week_day_exercises"
    ADD CONSTRAINT "custom_plan_week_day_exercises_week_day_id_fkey" FOREIGN KEY ("week_day_id") REFERENCES "public"."custom_plan_week_days"("id") ON DELETE CASCADE;


--
-- Name: custom_plan_week_days custom_plan_week_days_week_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_week_days"
    ADD CONSTRAINT "custom_plan_week_days_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."custom_plan_weeks"("id") ON DELETE CASCADE;


--
-- Name: custom_plan_weeks custom_plan_weeks_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plan_weeks"
    ADD CONSTRAINT "custom_plan_weeks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."custom_plans"("id") ON DELETE CASCADE;


--
-- Name: custom_plans custom_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_plans"
    ADD CONSTRAINT "custom_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: custom_session_exercises custom_session_exercises_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_session_exercises"
    ADD CONSTRAINT "custom_session_exercises_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."custom_sessions"("id") ON DELETE CASCADE;


--
-- Name: custom_sessions custom_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."custom_sessions"
    ADD CONSTRAINT "custom_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: email_log email_log_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_log"
    ADD CONSTRAINT "email_log_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE SET NULL;


--
-- Name: equipment equipment_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: exercises_base exercises_base_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."exercises_base"
    ADD CONSTRAINT "exercises_base_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: exercise_equipment exercises_equipment_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."exercise_equipment"
    ADD CONSTRAINT "exercises_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: exercise_equipment exercises_equipment_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."exercise_equipment"
    ADD CONSTRAINT "exercises_equipment_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises_base"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gym_qr_tokens gym_qr_tokens_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."gym_qr_tokens"
    ADD CONSTRAINT "gym_qr_tokens_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: gym_saas_subscriptions gym_saas_subscriptions_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."gym_saas_subscriptions"
    ADD CONSTRAINT "gym_saas_subscriptions_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: gym_saas_subscriptions gym_saas_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."gym_saas_subscriptions"
    ADD CONSTRAINT "gym_saas_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."saas_plans"("id");


--
-- Name: gyms gyms_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");


--
-- Name: health_metrics health_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."health_metrics"
    ADD CONSTRAINT "health_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: membership_permissions membership_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."membership_permissions"
    ADD CONSTRAINT "membership_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: membership_permissions membership_permissions_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."membership_permissions"
    ADD CONSTRAINT "membership_permissions_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE CASCADE;


--
-- Name: memberships memberships_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id");


--
-- Name: memberships memberships_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: memberships memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: plan_assignments plan_assignments_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_assignments"
    ADD CONSTRAINT "plan_assignments_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: plan_assignments plan_assignments_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_assignments"
    ADD CONSTRAINT "plan_assignments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE CASCADE;


--
-- Name: plan_week_day_exercise_sets plan_week_day_exercise_sets_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_week_day_exercise_sets"
    ADD CONSTRAINT "plan_week_day_exercise_sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."plan_week_day_exercises"("id") ON DELETE CASCADE;


--
-- Name: plan_week_day_exercises plan_week_day_exercises_session_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_week_day_exercises"
    ADD CONSTRAINT "plan_week_day_exercises_session_exercise_id_fkey" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."session_exercises"("id") ON DELETE CASCADE;


--
-- Name: plan_week_day_exercises plan_week_day_exercises_week_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_week_day_exercises"
    ADD CONSTRAINT "plan_week_day_exercises_week_day_id_fkey" FOREIGN KEY ("week_day_id") REFERENCES "public"."plan_week_days"("id") ON DELETE CASCADE;


--
-- Name: plan_week_days plan_week_days_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_week_days"
    ADD CONSTRAINT "plan_week_days_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;


--
-- Name: plan_week_days plan_week_days_week_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_week_days"
    ADD CONSTRAINT "plan_week_days_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."plan_weeks"("id") ON DELETE CASCADE;


--
-- Name: plan_weeks plan_weeks_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."plan_weeks"
    ADD CONSTRAINT "plan_weeks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: session_exercises routine_exercises_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "routine_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises_base"("id");


--
-- Name: saas_preapprovals saas_preapprovals_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."saas_preapprovals"
    ADD CONSTRAINT "saas_preapprovals_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: saas_subscription_events saas_subscription_events_gym_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."saas_subscription_events"
    ADD CONSTRAINT "saas_subscription_events_gym_subscription_id_fkey" FOREIGN KEY ("gym_subscription_id") REFERENCES "public"."gym_saas_subscriptions"("id") ON DELETE CASCADE;


--
-- Name: session_exercises session_exercises_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;


--
-- Name: session_logs session_logs_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_logs"
    ADD CONSTRAINT "session_logs_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id");


--
-- Name: session_logs session_logs_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_logs"
    ADD CONSTRAINT "session_logs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE SET NULL;


--
-- Name: session_logs session_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_logs"
    ADD CONSTRAINT "session_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;


--
-- Name: session_set_logs session_set_logs_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_set_logs"
    ADD CONSTRAINT "session_set_logs_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises_base"("id");


--
-- Name: session_set_logs session_set_logs_session_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_set_logs"
    ADD CONSTRAINT "session_set_logs_session_log_id_fkey" FOREIGN KEY ("session_log_id") REFERENCES "public"."session_logs"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: subscription_payments subscription_payments_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;


--
-- Name: subscription_payments subscription_payments_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: subscription_payments subscription_payments_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: subscription_payments subscription_payments_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."activity_subscriptions"("id") ON DELETE CASCADE;


--
-- Name: subscription_payments subscription_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: subscription_payments subscription_payments_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: training_plans training_plans_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."training_plans"
    ADD CONSTRAINT "training_plans_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;


--
-- Name: activities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;

--
-- Name: activities activities_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activities_admin_write" ON "public"."activities" USING ("public"."is_admin_of"("gym_id")) WITH CHECK ("public"."is_admin_of"("gym_id"));


--
-- Name: activities activities_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activities_select" ON "public"."activities" FOR SELECT USING ((("gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "public"."is_super_admin"()));


--
-- Name: activity_classes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."activity_classes" ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_classes activity_classes_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activity_classes_admin_write" ON "public"."activity_classes" USING ("public"."is_admin_of"("gym_id")) WITH CHECK ("public"."is_admin_of"("gym_id"));


--
-- Name: activity_classes activity_classes_coach_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activity_classes_coach_update" ON "public"."activity_classes" FOR UPDATE USING (("coach_id" = "public"."auth_profile_id"())) WITH CHECK (("coach_id" = "public"."auth_profile_id"()));


--
-- Name: activity_classes activity_classes_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activity_classes_select" ON "public"."activity_classes" FOR SELECT USING ((("gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "public"."is_super_admin"()));


--
-- Name: activity_coaches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."activity_coaches" ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_coaches activity_coaches_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activity_coaches_admin_write" ON "public"."activity_coaches" USING ("public"."is_admin_of"("gym_id")) WITH CHECK ("public"."is_admin_of"("gym_id"));


--
-- Name: activity_coaches activity_coaches_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activity_coaches_select" ON "public"."activity_coaches" FOR SELECT USING ((("gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "public"."is_super_admin"()));


--
-- Name: activity_plans; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."activity_plans" ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_plans activity_plans_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activity_plans_admin_write" ON "public"."activity_plans" USING ((EXISTS ( SELECT 1
   FROM "public"."activities" "a"
  WHERE (("a"."id" = "activity_plans"."activity_id") AND "public"."is_admin_of"("a"."gym_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."activities" "a"
  WHERE (("a"."id" = "activity_plans"."activity_id") AND "public"."is_admin_of"("a"."gym_id")))));


--
-- Name: activity_plans activity_plans_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activity_plans_select" ON "public"."activity_plans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."activities" "a"
  WHERE (("a"."id" = "activity_plans"."activity_id") AND (("a"."gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "public"."is_super_admin"())))));


--
-- Name: activity_schedules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."activity_schedules" ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_schedules activity_schedules_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activity_schedules_admin_write" ON "public"."activity_schedules" USING ("public"."is_admin_of"("gym_id")) WITH CHECK ("public"."is_admin_of"("gym_id"));


--
-- Name: activity_schedules activity_schedules_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activity_schedules_select" ON "public"."activity_schedules" FOR SELECT USING ((("gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "public"."is_super_admin"()));


--
-- Name: activity_subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."activity_subscriptions" ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_subscriptions activity_subscriptions_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activity_subscriptions_admin_write" ON "public"."activity_subscriptions" USING ("public"."is_admin_of"("gym_id")) WITH CHECK ("public"."is_admin_of"("gym_id"));


--
-- Name: activity_subscriptions activity_subscriptions_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "activity_subscriptions_select" ON "public"."activity_subscriptions" FOR SELECT USING ((("user_id" = "public"."auth_profile_id"()) OR "public"."is_staff_of"("gym_id")));


--
-- Name: attendances; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."attendances" ENABLE ROW LEVEL SECURITY;

--
-- Name: attendances attendances_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "attendances_select" ON "public"."attendances" FOR SELECT USING ((("profile_id" = "public"."auth_profile_id"()) OR "public"."is_staff_of"("gym_id")));


--
-- Name: attendances attendances_staff_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "attendances_staff_insert" ON "public"."attendances" FOR INSERT WITH CHECK ("public"."is_staff_of"("gym_id"));


--
-- Name: coach_payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."coach_payments" ENABLE ROW LEVEL SECURITY;

--
-- Name: coach_payments coach_payments_admin_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "coach_payments_admin_insert" ON "public"."coach_payments" FOR INSERT WITH CHECK ("public"."is_admin_of"("gym_id"));


--
-- Name: coach_payments coach_payments_owner_void; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "coach_payments_owner_void" ON "public"."coach_payments" FOR UPDATE USING ("public"."is_owner_of"("gym_id")) WITH CHECK ("public"."is_owner_of"("gym_id"));


--
-- Name: coach_payments coach_payments_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "coach_payments_select" ON "public"."coach_payments" FOR SELECT USING ((("coach_id" = "public"."auth_profile_id"()) OR "public"."is_admin_of"("gym_id")));


--
-- Name: custom_exercises; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."custom_exercises" ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_exercises custom_exercises_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_exercises_delete" ON "public"."custom_exercises" FOR DELETE USING (("user_id" = "auth"."uid"()));


--
-- Name: custom_exercises custom_exercises_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_exercises_insert" ON "public"."custom_exercises" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: custom_exercises custom_exercises_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_exercises_select" ON "public"."custom_exercises" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: custom_exercises custom_exercises_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_exercises_update" ON "public"."custom_exercises" FOR UPDATE USING (("user_id" = "auth"."uid"()));


--
-- Name: custom_plan_week_day_exercise_sets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."custom_plan_week_day_exercise_sets" ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_plan_week_day_exercise_sets custom_plan_week_day_exercise_sets_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_day_exercise_sets_delete" ON "public"."custom_plan_week_day_exercise_sets" FOR DELETE USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_week_day_exercise_sets custom_plan_week_day_exercise_sets_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_day_exercise_sets_insert" ON "public"."custom_plan_week_day_exercise_sets" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_week_day_exercise_sets custom_plan_week_day_exercise_sets_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_day_exercise_sets_select" ON "public"."custom_plan_week_day_exercise_sets" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_week_day_exercise_sets custom_plan_week_day_exercise_sets_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_day_exercise_sets_update" ON "public"."custom_plan_week_day_exercise_sets" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_week_day_exercises; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."custom_plan_week_day_exercises" ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_plan_week_day_exercises custom_plan_week_day_exercises_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_day_exercises_delete" ON "public"."custom_plan_week_day_exercises" FOR DELETE USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_week_day_exercises custom_plan_week_day_exercises_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_day_exercises_insert" ON "public"."custom_plan_week_day_exercises" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_week_day_exercises custom_plan_week_day_exercises_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_day_exercises_select" ON "public"."custom_plan_week_day_exercises" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_week_day_exercises custom_plan_week_day_exercises_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_day_exercises_update" ON "public"."custom_plan_week_day_exercises" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_week_days; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."custom_plan_week_days" ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_plan_week_days custom_plan_week_days_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_days_delete" ON "public"."custom_plan_week_days" FOR DELETE USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_week_days custom_plan_week_days_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_days_insert" ON "public"."custom_plan_week_days" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_week_days custom_plan_week_days_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_days_select" ON "public"."custom_plan_week_days" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_week_days custom_plan_week_days_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_week_days_update" ON "public"."custom_plan_week_days" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_weeks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."custom_plan_weeks" ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_plan_weeks custom_plan_weeks_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_weeks_delete" ON "public"."custom_plan_weeks" FOR DELETE USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_weeks custom_plan_weeks_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_weeks_insert" ON "public"."custom_plan_weeks" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_weeks custom_plan_weeks_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_weeks_select" ON "public"."custom_plan_weeks" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plan_weeks custom_plan_weeks_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plan_weeks_update" ON "public"."custom_plan_weeks" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_plans; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."custom_plans" ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_plans custom_plans_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plans_delete" ON "public"."custom_plans" FOR DELETE USING (("user_id" = "auth"."uid"()));


--
-- Name: custom_plans custom_plans_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plans_insert" ON "public"."custom_plans" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: custom_plans custom_plans_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plans_select" ON "public"."custom_plans" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: custom_plans custom_plans_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_plans_update" ON "public"."custom_plans" FOR UPDATE USING (("user_id" = "auth"."uid"()));


--
-- Name: custom_session_exercises; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."custom_session_exercises" ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_session_exercises custom_session_exercises_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_session_exercises_delete" ON "public"."custom_session_exercises" FOR DELETE USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_session_exercises custom_session_exercises_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_session_exercises_insert" ON "public"."custom_session_exercises" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_session_exercises custom_session_exercises_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_session_exercises_select" ON "public"."custom_session_exercises" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_session_exercises custom_session_exercises_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_session_exercises_update" ON "public"."custom_session_exercises" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));


--
-- Name: custom_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."custom_sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_sessions custom_sessions_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_sessions_delete" ON "public"."custom_sessions" FOR DELETE USING (("user_id" = "auth"."uid"()));


--
-- Name: custom_sessions custom_sessions_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_sessions_insert" ON "public"."custom_sessions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: custom_sessions custom_sessions_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_sessions_select" ON "public"."custom_sessions" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: custom_sessions custom_sessions_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "custom_sessions_update" ON "public"."custom_sessions" FOR UPDATE USING (("user_id" = "auth"."uid"()));


--
-- Name: email_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."email_log" ENABLE ROW LEVEL SECURITY;

--
-- Name: email_log email_log_admin_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "email_log_admin_select" ON "public"."email_log" FOR SELECT USING ("public"."is_admin_of"("gym_id"));


--
-- Name: equipment; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."equipment" ENABLE ROW LEVEL SECURITY;

--
-- Name: equipment equipment_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "equipment_select" ON "public"."equipment" FOR SELECT USING ((("gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "public"."is_super_admin"()));


--
-- Name: equipment equipment_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "equipment_write" ON "public"."equipment" USING ("public"."is_staff_of"("gym_id")) WITH CHECK ("public"."is_staff_of"("gym_id"));


--
-- Name: exercise_equipment; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."exercise_equipment" ENABLE ROW LEVEL SECURITY;

--
-- Name: exercise_equipment exercise_equipment_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "exercise_equipment_select" ON "public"."exercise_equipment" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."exercises_base" "e"
  WHERE (("e"."id" = "exercise_equipment"."exercise_id") AND (("e"."gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "e"."is_catalog" OR "public"."is_super_admin"())))));


--
-- Name: exercise_equipment exercise_equipment_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "exercise_equipment_write" ON "public"."exercise_equipment" USING ((EXISTS ( SELECT 1
   FROM "public"."exercises_base" "e"
  WHERE (("e"."id" = "exercise_equipment"."exercise_id") AND "public"."is_staff_of"("e"."gym_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."exercises_base" "e"
  WHERE (("e"."id" = "exercise_equipment"."exercise_id") AND "public"."is_staff_of"("e"."gym_id")))));


--
-- Name: exercises_base; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."exercises_base" ENABLE ROW LEVEL SECURITY;

--
-- Name: exercises_base exercises_base_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "exercises_base_select" ON "public"."exercises_base" FOR SELECT USING ((("gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "is_catalog" OR "public"."is_super_admin"()));


--
-- Name: exercises_base exercises_base_super_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "exercises_base_super_admin_all" ON "public"."exercises_base" USING ("public"."is_platform_staff"()) WITH CHECK ("public"."is_platform_staff"());


--
-- Name: exercises_base exercises_base_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "exercises_base_write" ON "public"."exercises_base" USING ("public"."is_staff_of"("gym_id")) WITH CHECK ("public"."is_staff_of"("gym_id"));


--
-- Name: gym_qr_tokens; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."gym_qr_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: gym_qr_tokens gym_qr_tokens_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "gym_qr_tokens_staff" ON "public"."gym_qr_tokens" USING ("public"."is_staff_of"("gym_id")) WITH CHECK ("public"."is_staff_of"("gym_id"));


--
-- Name: gym_saas_subscriptions gym_saas_sub_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "gym_saas_sub_select" ON "public"."gym_saas_subscriptions" FOR SELECT USING (("public"."is_staff_of"("gym_id") OR ("public"."is_super_admin"() IS TRUE)));


--
-- Name: gym_saas_subscriptions gym_saas_sub_super_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "gym_saas_sub_super_admin" ON "public"."gym_saas_subscriptions" USING (("public"."is_super_admin"() IS TRUE)) WITH CHECK (("public"."is_super_admin"() IS TRUE));


--
-- Name: gym_saas_subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."gym_saas_subscriptions" ENABLE ROW LEVEL SECURITY;

--
-- Name: gyms; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."gyms" ENABLE ROW LEVEL SECURITY;

--
-- Name: gyms gyms_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "gyms_select" ON "public"."gyms" FOR SELECT USING (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."gym_id" = "gyms"."id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."status" = 'active'::"text"))))));


--
-- Name: gyms gyms_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "gyms_update" ON "public"."gyms" FOR UPDATE USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());


--
-- Name: gyms gyms_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "gyms_write" ON "public"."gyms" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());


--
-- Name: health_metrics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."health_metrics" ENABLE ROW LEVEL SECURITY;

--
-- Name: health_metrics health_metrics_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "health_metrics_delete_own" ON "public"."health_metrics" FOR DELETE USING (("user_id" = "auth"."uid"()));


--
-- Name: health_metrics health_metrics_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "health_metrics_insert_own" ON "public"."health_metrics" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."health_sync_consent_at" IS NOT NULL))))));


--
-- Name: health_metrics health_metrics_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "health_metrics_select_own" ON "public"."health_metrics" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: health_metrics health_metrics_select_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "health_metrics_select_staff" ON "public"."health_metrics" FOR SELECT USING ("public"."user_in_staff_gym"("user_id"));


--
-- Name: health_metrics health_metrics_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "health_metrics_update_own" ON "public"."health_metrics" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."health_sync_consent_at" IS NOT NULL))))));


--
-- Name: media_delete_queue; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."media_delete_queue" ENABLE ROW LEVEL SECURITY;

--
-- Name: membership_permissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."membership_permissions" ENABLE ROW LEVEL SECURITY;

--
-- Name: membership_permissions membership_permissions_owner_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "membership_permissions_owner_delete" ON "public"."membership_permissions" FOR DELETE USING ("public"."is_owner_of"(( SELECT "m"."gym_id"
   FROM "public"."memberships" "m"
  WHERE ("m"."id" = "membership_permissions"."membership_id"))));


--
-- Name: membership_permissions membership_permissions_owner_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "membership_permissions_owner_write" ON "public"."membership_permissions" FOR INSERT WITH CHECK ("public"."is_owner_of"(( SELECT "m"."gym_id"
   FROM "public"."memberships" "m"
  WHERE ("m"."id" = "membership_permissions"."membership_id"))));


--
-- Name: membership_permissions membership_permissions_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "membership_permissions_select" ON "public"."membership_permissions" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."id" = "membership_permissions"."membership_id") AND ("m"."user_id" = "auth"."uid"())))) OR "public"."is_admin_of"(( SELECT "m"."gym_id"
   FROM "public"."memberships" "m"
  WHERE ("m"."id" = "membership_permissions"."membership_id")))));


--
-- Name: memberships; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;

--
-- Name: memberships memberships_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "memberships_admin_write" ON "public"."memberships" USING ("public"."is_admin_of"("gym_id")) WITH CHECK ("public"."is_admin_of"("gym_id"));


--
-- Name: memberships memberships_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "memberships_select_own" ON "public"."memberships" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: memberships memberships_select_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "memberships_select_staff" ON "public"."memberships" FOR SELECT USING ("public"."is_staff_of"("gym_id"));


--
-- Name: plan_assignments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."plan_assignments" ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_assignments plan_assignments_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "plan_assignments_insert" ON "public"."plan_assignments" FOR INSERT WITH CHECK ((("user_id" = ("public"."auth_profile_id"())::"text") OR "public"."is_staff_of"("gym_id")));


--
-- Name: plan_assignments plan_assignments_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "plan_assignments_select" ON "public"."plan_assignments" FOR SELECT USING ((("user_id" = ("public"."auth_profile_id"())::"text") OR "public"."is_staff_of"("gym_id")));


--
-- Name: plan_assignments plan_assignments_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "plan_assignments_update" ON "public"."plan_assignments" FOR UPDATE USING ((("user_id" = ( SELECT ("profiles"."id")::"text" AS "id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())
 LIMIT 1)) OR "public"."is_staff_of"("gym_id")));


--
-- Name: plan_week_day_exercise_sets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."plan_week_day_exercise_sets" ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_week_day_exercise_sets plan_week_day_exercise_sets_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "plan_week_day_exercise_sets_select" ON "public"."plan_week_day_exercise_sets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."plan_week_day_exercises" "x"
     JOIN "public"."plan_week_days" "d" ON (("d"."id" = "x"."week_day_id")))
     JOIN "public"."plan_weeks" "pw" ON (("pw"."id" = "d"."week_id")))
     JOIN "public"."training_plans" "tp" ON (("tp"."id" = "pw"."plan_id")))
  WHERE (("x"."id" = "plan_week_day_exercise_sets"."exercise_id") AND (("tp"."gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "tp"."is_catalog" OR "public"."is_super_admin"())))));


--
-- Name: plan_week_day_exercise_sets plan_week_day_exercise_sets_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "plan_week_day_exercise_sets_write" ON "public"."plan_week_day_exercise_sets" USING ((EXISTS ( SELECT 1
   FROM ((("public"."plan_week_day_exercises" "x"
     JOIN "public"."plan_week_days" "d" ON (("d"."id" = "x"."week_day_id")))
     JOIN "public"."plan_weeks" "pw" ON (("pw"."id" = "d"."week_id")))
     JOIN "public"."training_plans" "tp" ON (("tp"."id" = "pw"."plan_id")))
  WHERE (("x"."id" = "plan_week_day_exercise_sets"."exercise_id") AND "public"."is_staff_of"("tp"."gym_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((("public"."plan_week_day_exercises" "x"
     JOIN "public"."plan_week_days" "d" ON (("d"."id" = "x"."week_day_id")))
     JOIN "public"."plan_weeks" "pw" ON (("pw"."id" = "d"."week_id")))
     JOIN "public"."training_plans" "tp" ON (("tp"."id" = "pw"."plan_id")))
  WHERE (("x"."id" = "plan_week_day_exercise_sets"."exercise_id") AND "public"."is_staff_of"("tp"."gym_id")))));


--
-- Name: plan_week_day_exercises; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."plan_week_day_exercises" ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_week_day_exercises plan_week_day_exercises_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "plan_week_day_exercises_select" ON "public"."plan_week_day_exercises" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."plan_week_days" "d"
     JOIN "public"."plan_weeks" "pw" ON (("pw"."id" = "d"."week_id")))
     JOIN "public"."training_plans" "tp" ON (("tp"."id" = "pw"."plan_id")))
  WHERE (("d"."id" = "plan_week_day_exercises"."week_day_id") AND (("tp"."gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "tp"."is_catalog" OR "public"."is_super_admin"())))));


--
-- Name: plan_week_day_exercises plan_week_day_exercises_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "plan_week_day_exercises_write" ON "public"."plan_week_day_exercises" USING ((EXISTS ( SELECT 1
   FROM (("public"."plan_week_days" "d"
     JOIN "public"."plan_weeks" "pw" ON (("pw"."id" = "d"."week_id")))
     JOIN "public"."training_plans" "tp" ON (("tp"."id" = "pw"."plan_id")))
  WHERE (("d"."id" = "plan_week_day_exercises"."week_day_id") AND "public"."is_staff_of"("tp"."gym_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."plan_week_days" "d"
     JOIN "public"."plan_weeks" "pw" ON (("pw"."id" = "d"."week_id")))
     JOIN "public"."training_plans" "tp" ON (("tp"."id" = "pw"."plan_id")))
  WHERE (("d"."id" = "plan_week_day_exercises"."week_day_id") AND "public"."is_staff_of"("tp"."gym_id")))));


--
-- Name: plan_week_days; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."plan_week_days" ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_week_days plan_week_days_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "plan_week_days_select" ON "public"."plan_week_days" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."plan_weeks" "pw"
     JOIN "public"."training_plans" "tp" ON (("tp"."id" = "pw"."plan_id")))
  WHERE (("pw"."id" = "plan_week_days"."week_id") AND (("tp"."gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "tp"."is_catalog" OR "public"."is_super_admin"())))));


--
-- Name: plan_week_days plan_week_days_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "plan_week_days_write" ON "public"."plan_week_days" USING ((EXISTS ( SELECT 1
   FROM ("public"."plan_weeks" "pw"
     JOIN "public"."training_plans" "tp" ON (("tp"."id" = "pw"."plan_id")))
  WHERE (("pw"."id" = "plan_week_days"."week_id") AND "public"."is_staff_of"("tp"."gym_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."plan_weeks" "pw"
     JOIN "public"."training_plans" "tp" ON (("tp"."id" = "pw"."plan_id")))
  WHERE (("pw"."id" = "plan_week_days"."week_id") AND "public"."is_staff_of"("tp"."gym_id")))));


--
-- Name: plan_weeks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."plan_weeks" ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_weeks plan_weeks_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "plan_weeks_select" ON "public"."plan_weeks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."training_plans" "tp"
  WHERE (("tp"."id" = "plan_weeks"."plan_id") AND (("tp"."gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "tp"."is_catalog" OR "public"."is_super_admin"())))));


--
-- Name: plan_weeks plan_weeks_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "plan_weeks_write" ON "public"."plan_weeks" USING ((EXISTS ( SELECT 1
   FROM "public"."training_plans" "tp"
  WHERE (("tp"."id" = "plan_weeks"."plan_id") AND "public"."is_staff_of"("tp"."gym_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."training_plans" "tp"
  WHERE (("tp"."id" = "plan_weeks"."plan_id") AND "public"."is_staff_of"("tp"."gym_id")))));


--
-- Name: platform_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_settings platform_settings_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "platform_settings_select" ON "public"."platform_settings" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: platform_settings platform_settings_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "platform_settings_update" ON "public"."platform_settings" FOR UPDATE TO "authenticated" USING (("public"."is_platform_admin"() IS TRUE)) WITH CHECK (("public"."is_platform_admin"() IS TRUE));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_admin_write" ON "public"."profiles" USING ("public"."user_in_admin_gym"("user_id")) WITH CHECK ("public"."user_in_admin_gym"("user_id"));


--
-- Name: profiles profiles_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_super_admin"() OR ("public"."shares_gym_with"("user_id") AND (NOT "is_super_admin")) OR ("public"."is_platform_staff"() AND ("is_super_admin" OR ("platform_staff_role" IS NOT NULL)))));


--
-- Name: profiles profiles_self_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: saas_subscription_events saas_events_super_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_events_super_admin" ON "public"."saas_subscription_events" USING (("public"."is_super_admin"() IS TRUE)) WITH CHECK (("public"."is_super_admin"() IS TRUE));


--
-- Name: activities saas_gate_activities_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activities_del" ON "public"."activities" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activities saas_gate_activities_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activities_ins" ON "public"."activities" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activities saas_gate_activities_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activities_upd" ON "public"."activities" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_classes saas_gate_activity_classes_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_classes_del" ON "public"."activity_classes" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_classes saas_gate_activity_classes_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_classes_ins" ON "public"."activity_classes" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_classes saas_gate_activity_classes_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_classes_upd" ON "public"."activity_classes" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_coaches saas_gate_activity_coaches_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_coaches_del" ON "public"."activity_coaches" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_coaches saas_gate_activity_coaches_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_coaches_ins" ON "public"."activity_coaches" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_coaches saas_gate_activity_coaches_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_coaches_upd" ON "public"."activity_coaches" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_plans saas_gate_activity_plans_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_plans_del" ON "public"."activity_plans" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"(( SELECT "a"."gym_id"
   FROM "public"."activities" "a"
  WHERE ("a"."id" = "activity_plans"."activity_id"))));


--
-- Name: activity_plans saas_gate_activity_plans_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_plans_ins" ON "public"."activity_plans" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"(( SELECT "a"."gym_id"
   FROM "public"."activities" "a"
  WHERE ("a"."id" = "activity_plans"."activity_id"))));


--
-- Name: activity_plans saas_gate_activity_plans_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_plans_upd" ON "public"."activity_plans" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"(( SELECT "a"."gym_id"
   FROM "public"."activities" "a"
  WHERE ("a"."id" = "activity_plans"."activity_id")))) WITH CHECK ("public"."is_saas_subscription_active"(( SELECT "a"."gym_id"
   FROM "public"."activities" "a"
  WHERE ("a"."id" = "activity_plans"."activity_id"))));


--
-- Name: activity_schedules saas_gate_activity_schedules_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_schedules_del" ON "public"."activity_schedules" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_schedules saas_gate_activity_schedules_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_schedules_ins" ON "public"."activity_schedules" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_schedules saas_gate_activity_schedules_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_schedules_upd" ON "public"."activity_schedules" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_subscriptions saas_gate_activity_subs_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_subs_del" ON "public"."activity_subscriptions" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_subscriptions saas_gate_activity_subs_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_subs_ins" ON "public"."activity_subscriptions" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: activity_subscriptions saas_gate_activity_subs_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_activity_subs_upd" ON "public"."activity_subscriptions" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: attendances saas_gate_attendances_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_attendances_del" ON "public"."attendances" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: attendances saas_gate_attendances_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_attendances_ins" ON "public"."attendances" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: attendances saas_gate_attendances_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_attendances_upd" ON "public"."attendances" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: coach_payments saas_gate_coach_payments_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_coach_payments_del" ON "public"."coach_payments" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: coach_payments saas_gate_coach_payments_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_coach_payments_ins" ON "public"."coach_payments" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: coach_payments saas_gate_coach_payments_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_coach_payments_upd" ON "public"."coach_payments" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: equipment saas_gate_equipment_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_equipment_del" ON "public"."equipment" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: equipment saas_gate_equipment_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_equipment_ins" ON "public"."equipment" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: equipment saas_gate_equipment_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_equipment_upd" ON "public"."equipment" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: exercises_base saas_gate_exercises_base_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_exercises_base_del" ON "public"."exercises_base" AS RESTRICTIVE FOR DELETE USING ((("gym_id" IS NULL) OR "public"."is_saas_subscription_active"("gym_id")));


--
-- Name: exercises_base saas_gate_exercises_base_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_exercises_base_ins" ON "public"."exercises_base" AS RESTRICTIVE FOR INSERT WITH CHECK ((("gym_id" IS NULL) OR "public"."is_saas_subscription_active"("gym_id")));


--
-- Name: exercises_base saas_gate_exercises_base_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_exercises_base_upd" ON "public"."exercises_base" AS RESTRICTIVE FOR UPDATE USING ((("gym_id" IS NULL) OR "public"."is_saas_subscription_active"("gym_id"))) WITH CHECK ((("gym_id" IS NULL) OR "public"."is_saas_subscription_active"("gym_id")));


--
-- Name: gym_qr_tokens saas_gate_gym_qr_tokens_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_gym_qr_tokens_del" ON "public"."gym_qr_tokens" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: gym_qr_tokens saas_gate_gym_qr_tokens_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_gym_qr_tokens_ins" ON "public"."gym_qr_tokens" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: gym_qr_tokens saas_gate_gym_qr_tokens_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_gym_qr_tokens_upd" ON "public"."gym_qr_tokens" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: membership_permissions saas_gate_membership_perms_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_membership_perms_del" ON "public"."membership_permissions" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"(( SELECT "m"."gym_id"
   FROM "public"."memberships" "m"
  WHERE ("m"."id" = "membership_permissions"."membership_id"))));


--
-- Name: membership_permissions saas_gate_membership_perms_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_membership_perms_ins" ON "public"."membership_permissions" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"(( SELECT "m"."gym_id"
   FROM "public"."memberships" "m"
  WHERE ("m"."id" = "membership_permissions"."membership_id"))));


--
-- Name: membership_permissions saas_gate_membership_perms_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_membership_perms_upd" ON "public"."membership_permissions" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"(( SELECT "m"."gym_id"
   FROM "public"."memberships" "m"
  WHERE ("m"."id" = "membership_permissions"."membership_id")))) WITH CHECK ("public"."is_saas_subscription_active"(( SELECT "m"."gym_id"
   FROM "public"."memberships" "m"
  WHERE ("m"."id" = "membership_permissions"."membership_id"))));


--
-- Name: memberships saas_gate_memberships_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_memberships_del" ON "public"."memberships" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: memberships saas_gate_memberships_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_memberships_ins" ON "public"."memberships" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: memberships saas_gate_memberships_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_memberships_upd" ON "public"."memberships" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: sessions saas_gate_sessions_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_sessions_del" ON "public"."sessions" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: sessions saas_gate_sessions_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_sessions_ins" ON "public"."sessions" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: sessions saas_gate_sessions_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_sessions_upd" ON "public"."sessions" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: subscription_payments saas_gate_sub_payments_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_sub_payments_del" ON "public"."subscription_payments" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: subscription_payments saas_gate_sub_payments_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_sub_payments_ins" ON "public"."subscription_payments" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: subscription_payments saas_gate_sub_payments_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_sub_payments_upd" ON "public"."subscription_payments" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: training_plans saas_gate_training_plans_del; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_training_plans_del" ON "public"."training_plans" AS RESTRICTIVE FOR DELETE USING ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: training_plans saas_gate_training_plans_ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_training_plans_ins" ON "public"."training_plans" AS RESTRICTIVE FOR INSERT WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: training_plans saas_gate_training_plans_upd; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_gate_training_plans_upd" ON "public"."training_plans" AS RESTRICTIVE FOR UPDATE USING ("public"."is_saas_subscription_active"("gym_id")) WITH CHECK ("public"."is_saas_subscription_active"("gym_id"));


--
-- Name: saas_plans; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."saas_plans" ENABLE ROW LEVEL SECURITY;

--
-- Name: saas_plans saas_plans_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_plans_select" ON "public"."saas_plans" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));


--
-- Name: saas_plans saas_plans_super_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_plans_super_admin" ON "public"."saas_plans" TO "authenticated" USING (("public"."is_super_admin"() IS TRUE)) WITH CHECK (("public"."is_super_admin"() IS TRUE));


--
-- Name: saas_preapprovals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."saas_preapprovals" ENABLE ROW LEVEL SECURITY;

--
-- Name: saas_preapprovals saas_preapprovals_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "saas_preapprovals_select" ON "public"."saas_preapprovals" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() IS TRUE));


--
-- Name: saas_subscription_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."saas_subscription_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: self_service_signup_attempts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."self_service_signup_attempts" ENABLE ROW LEVEL SECURITY;

--
-- Name: session_exercises; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."session_exercises" ENABLE ROW LEVEL SECURITY;

--
-- Name: session_exercises session_exercises_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "session_exercises_select" ON "public"."session_exercises" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_exercises"."session_id") AND (("s"."gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "s"."is_catalog" OR "public"."is_super_admin"())))));


--
-- Name: session_exercises session_exercises_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "session_exercises_write" ON "public"."session_exercises" USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_exercises"."session_id") AND "public"."is_staff_of"("s"."gym_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_exercises"."session_id") AND "public"."is_staff_of"("s"."gym_id")))));


--
-- Name: session_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."session_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: session_logs session_logs_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "session_logs_select" ON "public"."session_logs" FOR SELECT USING ((("user_id" = ("public"."auth_profile_id"())::"text") OR "public"."is_staff_of"("gym_id")));


--
-- Name: session_logs session_logs_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "session_logs_write" ON "public"."session_logs" USING ((("user_id" = ("public"."auth_profile_id"())::"text") OR "public"."is_staff_of"("gym_id"))) WITH CHECK ((("user_id" = ("public"."auth_profile_id"())::"text") OR "public"."is_staff_of"("gym_id")));


--
-- Name: session_set_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."session_set_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: session_set_logs session_set_logs_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "session_set_logs_select" ON "public"."session_set_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."session_logs" "l"
  WHERE (("l"."id" = "session_set_logs"."session_log_id") AND (("l"."user_id" = ("public"."auth_profile_id"())::"text") OR "public"."is_staff_of"("l"."gym_id"))))));


--
-- Name: session_set_logs session_set_logs_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "session_set_logs_write" ON "public"."session_set_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."session_logs" "l"
  WHERE (("l"."id" = "session_set_logs"."session_log_id") AND (("l"."user_id" = ("public"."auth_profile_id"())::"text") OR "public"."is_staff_of"("l"."gym_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."session_logs" "l"
  WHERE (("l"."id" = "session_set_logs"."session_log_id") AND (("l"."user_id" = ("public"."auth_profile_id"())::"text") OR "public"."is_staff_of"("l"."gym_id"))))));


--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions sessions_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "sessions_select" ON "public"."sessions" FOR SELECT USING ((("gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "is_catalog" OR "public"."is_super_admin"()));


--
-- Name: sessions sessions_super_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "sessions_super_admin_all" ON "public"."sessions" USING ("public"."is_platform_staff"()) WITH CHECK ("public"."is_platform_staff"());


--
-- Name: sessions sessions_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "sessions_write" ON "public"."sessions" USING ("public"."is_staff_of"("gym_id")) WITH CHECK ("public"."is_staff_of"("gym_id"));


--
-- Name: subscription_payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."subscription_payments" ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_payments subscription_payments_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "subscription_payments_insert" ON "public"."subscription_payments" FOR INSERT WITH CHECK ("public"."has_gym_permission"("gym_id", 'payments.register'::"text"));


--
-- Name: subscription_payments subscription_payments_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "subscription_payments_select" ON "public"."subscription_payments" FOR SELECT USING ((("user_id" = "public"."auth_profile_id"()) OR "public"."is_staff_of"("gym_id")));


--
-- Name: training_plans; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."training_plans" ENABLE ROW LEVEL SECURITY;

--
-- Name: training_plans training_plans_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "training_plans_select" ON "public"."training_plans" FOR SELECT USING ((("gym_id" IN ( SELECT "public"."auth_gym_ids"() AS "auth_gym_ids")) OR "is_catalog" OR "public"."is_super_admin"()));


--
-- Name: training_plans training_plans_super_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "training_plans_super_admin_all" ON "public"."training_plans" USING ("public"."is_platform_staff"()) WITH CHECK ("public"."is_platform_staff"());


--
-- Name: training_plans training_plans_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "training_plans_write" ON "public"."training_plans" USING ("public"."is_staff_of"("gym_id")) WITH CHECK ("public"."is_staff_of"("gym_id"));


--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

-- CREATE PUBLICATION "supabase_realtime" WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: supabase_admin
--

-- CREATE PUBLICATION "supabase_realtime_messages_publication" WITH (publish = 'insert, update, delete, truncate');


-- ALTER PUBLICATION "supabase_realtime_messages_publication" OWNER TO "supabase_admin";

--
-- Name: supabase_realtime attendances; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."attendances";


--
-- Name: SCHEMA "cron"; Type: ACL; Schema: -; Owner: supabase_admin
--

-- GRANT USAGE ON SCHEMA "cron" TO "postgres" WITH GRANT OPTION;


--
-- Name: SCHEMA "net"; Type: ACL; Schema: -; Owner: supabase_admin
--

-- GRANT USAGE ON SCHEMA "net" TO "supabase_functions_admin";
-- GRANT USAGE ON SCHEMA "net" TO "postgres";
-- GRANT USAGE ON SCHEMA "net" TO "anon";
-- GRANT USAGE ON SCHEMA "net" TO "authenticated";
-- GRANT USAGE ON SCHEMA "net" TO "service_role";


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "alter_job"("job_id" bigint, "schedule" "text", "command" "text", "database" "text", "username" "text", "active" boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."alter_job"("job_id" bigint, "schedule" "text", "command" "text", "database" "text", "username" "text", "active" boolean) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "job_cache_invalidate"(); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."job_cache_invalidate"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "schedule"("schedule" "text", "command" "text"); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."schedule"("schedule" "text", "command" "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "schedule"("job_name" "text", "schedule" "text", "command" "text"); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."schedule"("job_name" "text", "schedule" "text", "command" "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "schedule_in_database"("job_name" "text", "schedule" "text", "command" "text", "database" "text", "username" "text", "active" boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."schedule_in_database"("job_name" "text", "schedule" "text", "command" "text", "database" "text", "username" "text", "active" boolean) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "unschedule"("job_id" bigint); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."unschedule"("job_id" bigint) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "unschedule"("job_name" "text"); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."unschedule"("job_name" "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "armor"("bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."armor"("bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea") TO "dashboard_user";


--
-- Name: FUNCTION "armor"("bytea", "text"[], "text"[]); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."armor"("bytea", "text"[], "text"[]) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea", "text"[], "text"[]) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea", "text"[], "text"[]) TO "dashboard_user";


--
-- Name: FUNCTION "crypt"("text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."crypt"("text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."crypt"("text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."crypt"("text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "dearmor"("text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."dearmor"("text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."dearmor"("text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."dearmor"("text") TO "dashboard_user";


--
-- Name: FUNCTION "decrypt"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."decrypt"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."decrypt"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."decrypt"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "decrypt_iv"("bytea", "bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."decrypt_iv"("bytea", "bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."decrypt_iv"("bytea", "bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."decrypt_iv"("bytea", "bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "digest"("bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."digest"("bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."digest"("bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."digest"("bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "digest"("text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."digest"("text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."digest"("text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."digest"("text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "encrypt"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."encrypt"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."encrypt"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."encrypt"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "encrypt_iv"("bytea", "bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."encrypt_iv"("bytea", "bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."encrypt_iv"("bytea", "bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."encrypt_iv"("bytea", "bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "gen_random_bytes"(integer); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."gen_random_bytes"(integer) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."gen_random_bytes"(integer) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."gen_random_bytes"(integer) TO "dashboard_user";


--
-- Name: FUNCTION "gen_random_uuid"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."gen_random_uuid"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."gen_random_uuid"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."gen_random_uuid"() TO "dashboard_user";


--
-- Name: FUNCTION "gen_salt"("text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."gen_salt"("text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text") TO "dashboard_user";


--
-- Name: FUNCTION "gen_salt"("text", integer); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."gen_salt"("text", integer) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text", integer) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text", integer) TO "dashboard_user";


--
-- Name: FUNCTION "hmac"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."hmac"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."hmac"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."hmac"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "hmac"("text", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."hmac"("text", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."hmac"("text", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."hmac"("text", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pg_stat_statements"("showtext" boolean, OUT "userid" "oid", OUT "dbid" "oid", OUT "toplevel" boolean, OUT "queryid" bigint, OUT "query" "text", OUT "plans" bigint, OUT "total_plan_time" double precision, OUT "min_plan_time" double precision, OUT "max_plan_time" double precision, OUT "mean_plan_time" double precision, OUT "stddev_plan_time" double precision, OUT "calls" bigint, OUT "total_exec_time" double precision, OUT "min_exec_time" double precision, OUT "max_exec_time" double precision, OUT "mean_exec_time" double precision, OUT "stddev_exec_time" double precision, OUT "rows" bigint, OUT "shared_blks_hit" bigint, OUT "shared_blks_read" bigint, OUT "shared_blks_dirtied" bigint, OUT "shared_blks_written" bigint, OUT "local_blks_hit" bigint, OUT "local_blks_read" bigint, OUT "local_blks_dirtied" bigint, OUT "local_blks_written" bigint, OUT "temp_blks_read" bigint, OUT "temp_blks_written" bigint, OUT "shared_blk_read_time" double precision, OUT "shared_blk_write_time" double precision, OUT "local_blk_read_time" double precision, OUT "local_blk_write_time" double precision, OUT "temp_blk_read_time" double precision, OUT "temp_blk_write_time" double precision, OUT "wal_records" bigint, OUT "wal_fpi" bigint, OUT "wal_bytes" numeric, OUT "jit_functions" bigint, OUT "jit_generation_time" double precision, OUT "jit_inlining_count" bigint, OUT "jit_inlining_time" double precision, OUT "jit_optimization_count" bigint, OUT "jit_optimization_time" double precision, OUT "jit_emission_count" bigint, OUT "jit_emission_time" double precision, OUT "jit_deform_count" bigint, OUT "jit_deform_time" double precision, OUT "stats_since" timestamp with time zone, OUT "minmax_stats_since" timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pg_stat_statements"("showtext" boolean, OUT "userid" "oid", OUT "dbid" "oid", OUT "toplevel" boolean, OUT "queryid" bigint, OUT "query" "text", OUT "plans" bigint, OUT "total_plan_time" double precision, OUT "min_plan_time" double precision, OUT "max_plan_time" double precision, OUT "mean_plan_time" double precision, OUT "stddev_plan_time" double precision, OUT "calls" bigint, OUT "total_exec_time" double precision, OUT "min_exec_time" double precision, OUT "max_exec_time" double precision, OUT "mean_exec_time" double precision, OUT "stddev_exec_time" double precision, OUT "rows" bigint, OUT "shared_blks_hit" bigint, OUT "shared_blks_read" bigint, OUT "shared_blks_dirtied" bigint, OUT "shared_blks_written" bigint, OUT "local_blks_hit" bigint, OUT "local_blks_read" bigint, OUT "local_blks_dirtied" bigint, OUT "local_blks_written" bigint, OUT "temp_blks_read" bigint, OUT "temp_blks_written" bigint, OUT "shared_blk_read_time" double precision, OUT "shared_blk_write_time" double precision, OUT "local_blk_read_time" double precision, OUT "local_blk_write_time" double precision, OUT "temp_blk_read_time" double precision, OUT "temp_blk_write_time" double precision, OUT "wal_records" bigint, OUT "wal_fpi" bigint, OUT "wal_bytes" numeric, OUT "jit_functions" bigint, OUT "jit_generation_time" double precision, OUT "jit_inlining_count" bigint, OUT "jit_inlining_time" double precision, OUT "jit_optimization_count" bigint, OUT "jit_optimization_time" double precision, OUT "jit_emission_count" bigint, OUT "jit_emission_time" double precision, OUT "jit_deform_count" bigint, OUT "jit_deform_time" double precision, OUT "stats_since" timestamp with time zone, OUT "minmax_stats_since" timestamp with time zone) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements"("showtext" boolean, OUT "userid" "oid", OUT "dbid" "oid", OUT "toplevel" boolean, OUT "queryid" bigint, OUT "query" "text", OUT "plans" bigint, OUT "total_plan_time" double precision, OUT "min_plan_time" double precision, OUT "max_plan_time" double precision, OUT "mean_plan_time" double precision, OUT "stddev_plan_time" double precision, OUT "calls" bigint, OUT "total_exec_time" double precision, OUT "min_exec_time" double precision, OUT "max_exec_time" double precision, OUT "mean_exec_time" double precision, OUT "stddev_exec_time" double precision, OUT "rows" bigint, OUT "shared_blks_hit" bigint, OUT "shared_blks_read" bigint, OUT "shared_blks_dirtied" bigint, OUT "shared_blks_written" bigint, OUT "local_blks_hit" bigint, OUT "local_blks_read" bigint, OUT "local_blks_dirtied" bigint, OUT "local_blks_written" bigint, OUT "temp_blks_read" bigint, OUT "temp_blks_written" bigint, OUT "shared_blk_read_time" double precision, OUT "shared_blk_write_time" double precision, OUT "local_blk_read_time" double precision, OUT "local_blk_write_time" double precision, OUT "temp_blk_read_time" double precision, OUT "temp_blk_write_time" double precision, OUT "wal_records" bigint, OUT "wal_fpi" bigint, OUT "wal_bytes" numeric, OUT "jit_functions" bigint, OUT "jit_generation_time" double precision, OUT "jit_inlining_count" bigint, OUT "jit_inlining_time" double precision, OUT "jit_optimization_count" bigint, OUT "jit_optimization_time" double precision, OUT "jit_emission_count" bigint, OUT "jit_emission_time" double precision, OUT "jit_deform_count" bigint, OUT "jit_deform_time" double precision, OUT "stats_since" timestamp with time zone, OUT "minmax_stats_since" timestamp with time zone) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements"("showtext" boolean, OUT "userid" "oid", OUT "dbid" "oid", OUT "toplevel" boolean, OUT "queryid" bigint, OUT "query" "text", OUT "plans" bigint, OUT "total_plan_time" double precision, OUT "min_plan_time" double precision, OUT "max_plan_time" double precision, OUT "mean_plan_time" double precision, OUT "stddev_plan_time" double precision, OUT "calls" bigint, OUT "total_exec_time" double precision, OUT "min_exec_time" double precision, OUT "max_exec_time" double precision, OUT "mean_exec_time" double precision, OUT "stddev_exec_time" double precision, OUT "rows" bigint, OUT "shared_blks_hit" bigint, OUT "shared_blks_read" bigint, OUT "shared_blks_dirtied" bigint, OUT "shared_blks_written" bigint, OUT "local_blks_hit" bigint, OUT "local_blks_read" bigint, OUT "local_blks_dirtied" bigint, OUT "local_blks_written" bigint, OUT "temp_blks_read" bigint, OUT "temp_blks_written" bigint, OUT "shared_blk_read_time" double precision, OUT "shared_blk_write_time" double precision, OUT "local_blk_read_time" double precision, OUT "local_blk_write_time" double precision, OUT "temp_blk_read_time" double precision, OUT "temp_blk_write_time" double precision, OUT "wal_records" bigint, OUT "wal_fpi" bigint, OUT "wal_bytes" numeric, OUT "jit_functions" bigint, OUT "jit_generation_time" double precision, OUT "jit_inlining_count" bigint, OUT "jit_inlining_time" double precision, OUT "jit_optimization_count" bigint, OUT "jit_optimization_time" double precision, OUT "jit_emission_count" bigint, OUT "jit_emission_time" double precision, OUT "jit_deform_count" bigint, OUT "jit_deform_time" double precision, OUT "stats_since" timestamp with time zone, OUT "minmax_stats_since" timestamp with time zone) TO "dashboard_user";


--
-- Name: FUNCTION "pg_stat_statements_info"(OUT "dealloc" bigint, OUT "stats_reset" timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pg_stat_statements_info"(OUT "dealloc" bigint, OUT "stats_reset" timestamp with time zone) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements_info"(OUT "dealloc" bigint, OUT "stats_reset" timestamp with time zone) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements_info"(OUT "dealloc" bigint, OUT "stats_reset" timestamp with time zone) TO "dashboard_user";


--
-- Name: FUNCTION "pg_stat_statements_reset"("userid" "oid", "dbid" "oid", "queryid" bigint, "minmax_only" boolean); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pg_stat_statements_reset"("userid" "oid", "dbid" "oid", "queryid" bigint, "minmax_only" boolean) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements_reset"("userid" "oid", "dbid" "oid", "queryid" bigint, "minmax_only" boolean) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements_reset"("userid" "oid", "dbid" "oid", "queryid" bigint, "minmax_only" boolean) TO "dashboard_user";


--
-- Name: FUNCTION "pgp_armor_headers"("text", OUT "key" "text", OUT "value" "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_armor_headers"("text", OUT "key" "text", OUT "value" "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_armor_headers"("text", OUT "key" "text", OUT "value" "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_armor_headers"("text", OUT "key" "text", OUT "value" "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_key_id"("bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_key_id"("bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_key_id"("bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_key_id"("bytea") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt"("bytea", "bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt"("bytea", "bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt_bytea"("bytea", "bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt_bytea"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt_bytea"("bytea", "bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_encrypt"("text", "bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_encrypt"("text", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_encrypt_bytea"("bytea", "bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_encrypt_bytea"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_decrypt"("bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_decrypt"("bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_decrypt_bytea"("bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_decrypt_bytea"("bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_encrypt"("text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_encrypt"("text", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_encrypt_bytea"("bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_encrypt_bytea"("bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "uuid_generate_v1"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_generate_v1"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_generate_v1mc"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_generate_v1mc"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1mc"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1mc"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_generate_v3"("namespace" "uuid", "name" "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_generate_v3"("namespace" "uuid", "name" "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v3"("namespace" "uuid", "name" "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v3"("namespace" "uuid", "name" "text") TO "dashboard_user";


--
-- Name: FUNCTION "uuid_generate_v4"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_generate_v4"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v4"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v4"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_generate_v5"("namespace" "uuid", "name" "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_generate_v5"("namespace" "uuid", "name" "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v5"("namespace" "uuid", "name" "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v5"("namespace" "uuid", "name" "text") TO "dashboard_user";


--
-- Name: FUNCTION "uuid_nil"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_nil"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_nil"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_nil"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_ns_dns"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_ns_dns"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_dns"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_dns"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_ns_oid"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_ns_oid"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_oid"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_oid"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_ns_url"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_ns_url"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_url"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_url"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_ns_x500"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_ns_x500"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_x500"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_x500"() TO "dashboard_user";


--
-- Name: FUNCTION "activity_income_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."activity_income_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."activity_income_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."activity_income_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") TO "service_role";


--
-- Name: FUNCTION "archive_catalog_plan"("p_plan_id" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."archive_catalog_plan"("p_plan_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_catalog_plan"("p_plan_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_catalog_plan"("p_plan_id" "text") TO "service_role";


--
-- Name: FUNCTION "auth_gym_ids"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."auth_gym_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_gym_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_gym_ids"() TO "service_role";


--
-- Name: FUNCTION "auth_profile_id"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."auth_profile_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_profile_id"() TO "service_role";


--
-- Name: FUNCTION "check_in_with_qr"("p_token" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."check_in_with_qr"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_in_with_qr"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_in_with_qr"("p_token" "text") TO "service_role";


--
-- Name: FUNCTION "coach_payment_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."coach_payment_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."coach_payment_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."coach_payment_summary"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") TO "service_role";


--
-- Name: FUNCTION "delete_catalog_plan"("p_plan_id" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."delete_catalog_plan"("p_plan_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_catalog_plan"("p_plan_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_catalog_plan"("p_plan_id" "text") TO "service_role";


--
-- Name: FUNCTION "delete_catalog_session"("p_session_id" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."delete_catalog_session"("p_session_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_catalog_session"("p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_catalog_session"("p_session_id" "text") TO "service_role";


--
-- Name: FUNCTION "delete_gym_cascade"("p_gym_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."delete_gym_cascade"("p_gym_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_gym_cascade"("p_gym_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "email_exists"("p_email" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."email_exists"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."email_exists"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."email_exists"("p_email" "text") TO "service_role";


--
-- Name: FUNCTION "generate_activity_classes"("p_gym_id" "uuid", "p_from" "date", "p_to" "date"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."generate_activity_classes"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_activity_classes"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_activity_classes"("p_gym_id" "uuid", "p_from" "date", "p_to" "date") TO "service_role";


--
-- Name: FUNCTION "get_public_gym"("p_slug" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."get_public_gym"("p_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_gym"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_gym"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_gym"("p_slug" "text") TO "service_role";


--
-- Name: FUNCTION "guard_profile_self_update"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."guard_profile_self_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_profile_self_update"() TO "service_role";


--
-- Name: FUNCTION "has_gym_permission"("g" "uuid", "p_perm" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."has_gym_permission"("g" "uuid", "p_perm" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_gym_permission"("g" "uuid", "p_perm" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_gym_permission"("g" "uuid", "p_perm" "text") TO "service_role";


--
-- Name: FUNCTION "is_admin_of"("g" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."is_admin_of"("g" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_of"("g" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_of"("g" "uuid") TO "service_role";


--
-- Name: FUNCTION "is_owner_of"("g" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."is_owner_of"("g" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_owner_of"("g" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_owner_of"("g" "uuid") TO "service_role";


--
-- Name: FUNCTION "is_platform_admin"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."is_platform_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "service_role";


--
-- Name: FUNCTION "is_platform_staff"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."is_platform_staff"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_platform_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_staff"() TO "service_role";


--
-- Name: FUNCTION "is_saas_subscription_active"("p_gym_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."is_saas_subscription_active"("p_gym_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_saas_subscription_active"("p_gym_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_saas_subscription_active"("p_gym_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "is_staff_of"("g" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."is_staff_of"("g" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_staff_of"("g" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_staff_of"("g" "uuid") TO "service_role";


--
-- Name: FUNCTION "is_super_admin"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."is_super_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";


--
-- Name: FUNCTION "list_archived_catalog_plans"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."list_archived_catalog_plans"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_archived_catalog_plans"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_archived_catalog_plans"() TO "service_role";


--
-- Name: FUNCTION "list_public_gyms"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."list_public_gyms"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_public_gyms"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_public_gyms"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_public_gyms"() TO "service_role";


--
-- Name: FUNCTION "platform_staff_role"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."platform_staff_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_staff_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_staff_role"() TO "service_role";


--
-- Name: FUNCTION "purge_archived_catalog_plans"("p_older_than_days" integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."purge_archived_catalog_plans"("p_older_than_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_archived_catalog_plans"("p_older_than_days" integer) TO "service_role";


--
-- Name: FUNCTION "purge_soft_deleted"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."purge_soft_deleted"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_soft_deleted"() TO "service_role";


--
-- Name: FUNCTION "register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric, "p_period_start" "date"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric, "p_period_start" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric, "p_period_start" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric, "p_period_start" "date") TO "service_role";


--
-- Name: FUNCTION "register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric, "p_period_start" "date", "p_payment_method" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric, "p_period_start" "date", "p_payment_method" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric, "p_period_start" "date", "p_payment_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_subscription_payment"("p_subscription_id" "uuid", "p_amount" numeric, "p_period_start" "date", "p_payment_method" "text") TO "service_role";


--
-- Name: FUNCTION "restore_catalog_plan"("p_plan_id" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."restore_catalog_plan"("p_plan_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_catalog_plan"("p_plan_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_catalog_plan"("p_plan_id" "text") TO "service_role";


--
-- Name: FUNCTION "save_catalog_plan"("payload" "jsonb"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."save_catalog_plan"("payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_catalog_plan"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_catalog_plan"("payload" "jsonb") TO "service_role";


--
-- Name: FUNCTION "save_catalog_session"("payload" "jsonb"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."save_catalog_session"("payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_catalog_session"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_catalog_session"("payload" "jsonb") TO "service_role";


--
-- Name: FUNCTION "set_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


--
-- Name: FUNCTION "shares_gym_with"("p_user" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."shares_gym_with"("p_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."shares_gym_with"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shares_gym_with"("p_user" "uuid") TO "service_role";


--
-- Name: FUNCTION "transfer_gym_owner"("p_gym_id" "uuid", "p_new_owner_id" "uuid", "p_previous_action" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."transfer_gym_owner"("p_gym_id" "uuid", "p_new_owner_id" "uuid", "p_previous_action" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transfer_gym_owner"("p_gym_id" "uuid", "p_new_owner_id" "uuid", "p_previous_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_gym_owner"("p_gym_id" "uuid", "p_new_owner_id" "uuid", "p_previous_action" "text") TO "service_role";


--
-- Name: FUNCTION "user_in_admin_gym"("p_user" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."user_in_admin_gym"("p_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_in_admin_gym"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_in_admin_gym"("p_user" "uuid") TO "service_role";


--
-- Name: FUNCTION "user_in_staff_gym"("p_user" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."user_in_staff_gym"("p_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_in_staff_gym"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_in_staff_gym"("p_user" "uuid") TO "service_role";


--
-- Name: FUNCTION "void_coach_payment"("p_payment_id" "uuid", "p_reason" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."void_coach_payment"("p_payment_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."void_coach_payment"("p_payment_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_coach_payment"("p_payment_id" "uuid", "p_reason" "text") TO "service_role";


--
-- Name: FUNCTION "void_subscription_payment"("p_payment_id" "uuid", "p_reason" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."void_subscription_payment"("p_payment_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."void_subscription_payment"("p_payment_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_subscription_payment"("p_payment_id" "uuid", "p_reason" "text") TO "service_role";


--
-- Name: FUNCTION "_crypto_aead_det_decrypt"("message" "bytea", "additional" "bytea", "key_id" bigint, "context" "bytea", "nonce" "bytea"); Type: ACL; Schema: vault; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "vault"."_crypto_aead_det_decrypt"("message" "bytea", "additional" "bytea", "key_id" bigint, "context" "bytea", "nonce" "bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "vault"."_crypto_aead_det_decrypt"("message" "bytea", "additional" "bytea", "key_id" bigint, "context" "bytea", "nonce" "bytea") TO "service_role";


--
-- Name: FUNCTION "create_secret"("new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid"); Type: ACL; Schema: vault; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "vault"."create_secret"("new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "vault"."create_secret"("new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "update_secret"("secret_id" "uuid", "new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid"); Type: ACL; Schema: vault; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "vault"."update_secret"("secret_id" "uuid", "new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "vault"."update_secret"("secret_id" "uuid", "new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid") TO "service_role";


--
-- Name: TABLE "job"; Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT SELECT ON TABLE "cron"."job" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "job_run_details"; Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON TABLE "cron"."job_run_details" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "pg_stat_statements"; Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON TABLE "extensions"."pg_stat_statements" FROM "postgres";
-- GRANT ALL ON TABLE "extensions"."pg_stat_statements" TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON TABLE "extensions"."pg_stat_statements" TO "dashboard_user";


--
-- Name: TABLE "pg_stat_statements_info"; Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON TABLE "extensions"."pg_stat_statements_info" FROM "postgres";
-- GRANT ALL ON TABLE "extensions"."pg_stat_statements_info" TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON TABLE "extensions"."pg_stat_statements_info" TO "dashboard_user";


--
-- Name: TABLE "activities"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";


--
-- Name: TABLE "activity_classes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."activity_classes" TO "anon";
GRANT ALL ON TABLE "public"."activity_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_classes" TO "service_role";


--
-- Name: TABLE "activity_coaches"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."activity_coaches" TO "anon";
GRANT ALL ON TABLE "public"."activity_coaches" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_coaches" TO "service_role";


--
-- Name: TABLE "activity_plans"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."activity_plans" TO "anon";
GRANT ALL ON TABLE "public"."activity_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_plans" TO "service_role";


--
-- Name: TABLE "activity_schedules"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."activity_schedules" TO "anon";
GRANT ALL ON TABLE "public"."activity_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_schedules" TO "service_role";


--
-- Name: TABLE "activity_subscriptions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."activity_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."activity_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_subscriptions" TO "service_role";


--
-- Name: TABLE "attendances"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."attendances" TO "anon";
GRANT ALL ON TABLE "public"."attendances" TO "authenticated";
GRANT ALL ON TABLE "public"."attendances" TO "service_role";


--
-- Name: TABLE "coach_payments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."coach_payments" TO "anon";
GRANT ALL ON TABLE "public"."coach_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_payments" TO "service_role";


--
-- Name: TABLE "custom_exercises"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."custom_exercises" TO "anon";
GRANT ALL ON TABLE "public"."custom_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_exercises" TO "service_role";


--
-- Name: TABLE "custom_plan_week_day_exercise_sets"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."custom_plan_week_day_exercise_sets" TO "anon";
GRANT ALL ON TABLE "public"."custom_plan_week_day_exercise_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_plan_week_day_exercise_sets" TO "service_role";


--
-- Name: TABLE "custom_plan_week_day_exercises"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."custom_plan_week_day_exercises" TO "anon";
GRANT ALL ON TABLE "public"."custom_plan_week_day_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_plan_week_day_exercises" TO "service_role";


--
-- Name: TABLE "custom_plan_week_days"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."custom_plan_week_days" TO "anon";
GRANT ALL ON TABLE "public"."custom_plan_week_days" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_plan_week_days" TO "service_role";


--
-- Name: TABLE "custom_plan_weeks"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."custom_plan_weeks" TO "anon";
GRANT ALL ON TABLE "public"."custom_plan_weeks" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_plan_weeks" TO "service_role";


--
-- Name: TABLE "custom_plans"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."custom_plans" TO "anon";
GRANT ALL ON TABLE "public"."custom_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_plans" TO "service_role";


--
-- Name: TABLE "custom_session_exercises"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."custom_session_exercises" TO "anon";
GRANT ALL ON TABLE "public"."custom_session_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_session_exercises" TO "service_role";


--
-- Name: TABLE "custom_sessions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."custom_sessions" TO "anon";
GRANT ALL ON TABLE "public"."custom_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_sessions" TO "service_role";


--
-- Name: TABLE "email_log"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."email_log" TO "anon";
GRANT ALL ON TABLE "public"."email_log" TO "authenticated";
GRANT ALL ON TABLE "public"."email_log" TO "service_role";


--
-- Name: TABLE "equipment"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."equipment" TO "anon";
GRANT ALL ON TABLE "public"."equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment" TO "service_role";


--
-- Name: TABLE "exercise_equipment"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."exercise_equipment" TO "anon";
GRANT ALL ON TABLE "public"."exercise_equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_equipment" TO "service_role";


--
-- Name: TABLE "exercises_base"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."exercises_base" TO "anon";
GRANT ALL ON TABLE "public"."exercises_base" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises_base" TO "service_role";


--
-- Name: TABLE "gym_qr_tokens"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."gym_qr_tokens" TO "anon";
GRANT ALL ON TABLE "public"."gym_qr_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."gym_qr_tokens" TO "service_role";


--
-- Name: TABLE "gym_saas_subscriptions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."gym_saas_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."gym_saas_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."gym_saas_subscriptions" TO "service_role";


--
-- Name: TABLE "gyms"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."gyms" TO "anon";
GRANT ALL ON TABLE "public"."gyms" TO "authenticated";
GRANT ALL ON TABLE "public"."gyms" TO "service_role";


--
-- Name: TABLE "health_metrics"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."health_metrics" TO "anon";
GRANT ALL ON TABLE "public"."health_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."health_metrics" TO "service_role";


--
-- Name: TABLE "media_delete_queue"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."media_delete_queue" TO "anon";
GRANT ALL ON TABLE "public"."media_delete_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."media_delete_queue" TO "service_role";


--
-- Name: TABLE "membership_permissions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."membership_permissions" TO "anon";
GRANT ALL ON TABLE "public"."membership_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_permissions" TO "service_role";


--
-- Name: TABLE "memberships"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";


--
-- Name: TABLE "plan_assignments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."plan_assignments" TO "anon";
GRANT ALL ON TABLE "public"."plan_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_assignments" TO "service_role";


--
-- Name: TABLE "plan_week_day_exercise_sets"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."plan_week_day_exercise_sets" TO "anon";
GRANT ALL ON TABLE "public"."plan_week_day_exercise_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_week_day_exercise_sets" TO "service_role";


--
-- Name: TABLE "plan_week_day_exercises"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."plan_week_day_exercises" TO "anon";
GRANT ALL ON TABLE "public"."plan_week_day_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_week_day_exercises" TO "service_role";


--
-- Name: TABLE "plan_week_days"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."plan_week_days" TO "anon";
GRANT ALL ON TABLE "public"."plan_week_days" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_week_days" TO "service_role";


--
-- Name: TABLE "plan_weeks"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."plan_weeks" TO "anon";
GRANT ALL ON TABLE "public"."plan_weeks" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_weeks" TO "service_role";


--
-- Name: TABLE "platform_settings"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";


--
-- Name: TABLE "profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";


--
-- Name: TABLE "saas_plans"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."saas_plans" TO "anon";
GRANT ALL ON TABLE "public"."saas_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_plans" TO "service_role";


--
-- Name: TABLE "saas_preapprovals"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."saas_preapprovals" TO "anon";
GRANT ALL ON TABLE "public"."saas_preapprovals" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_preapprovals" TO "service_role";


--
-- Name: TABLE "saas_subscription_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."saas_subscription_events" TO "anon";
GRANT ALL ON TABLE "public"."saas_subscription_events" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_subscription_events" TO "service_role";


--
-- Name: TABLE "self_service_signup_attempts"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."self_service_signup_attempts" TO "anon";
GRANT ALL ON TABLE "public"."self_service_signup_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."self_service_signup_attempts" TO "service_role";


--
-- Name: TABLE "session_exercises"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."session_exercises" TO "anon";
GRANT ALL ON TABLE "public"."session_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."session_exercises" TO "service_role";


--
-- Name: TABLE "session_logs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."session_logs" TO "anon";
GRANT ALL ON TABLE "public"."session_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."session_logs" TO "service_role";


--
-- Name: TABLE "session_set_logs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."session_set_logs" TO "anon";
GRANT ALL ON TABLE "public"."session_set_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."session_set_logs" TO "service_role";


--
-- Name: TABLE "sessions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";


--
-- Name: TABLE "subscription_payments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."subscription_payments" TO "anon";
GRANT ALL ON TABLE "public"."subscription_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_payments" TO "service_role";


--
-- Name: TABLE "training_plans"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."training_plans" TO "anon";
GRANT ALL ON TABLE "public"."training_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."training_plans" TO "service_role";


--
-- Name: TABLE "secrets"; Type: ACL; Schema: vault; Owner: supabase_admin
--

-- GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE "vault"."secrets" TO "postgres" WITH GRANT OPTION;
-- GRANT SELECT,DELETE ON TABLE "vault"."secrets" TO "service_role";


--
-- Name: TABLE "decrypted_secrets"; Type: ACL; Schema: vault; Owner: supabase_admin
--

-- GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE "vault"."decrypted_secrets" TO "postgres" WITH GRANT OPTION;
-- GRANT SELECT,DELETE ON TABLE "vault"."decrypted_secrets" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "issue_graphql_placeholder" ON "sql_drop"
--          WHEN TAG IN ('DROP EXTENSION')
--    EXECUTE FUNCTION "extensions"."set_graphql_placeholder"();


-- ALTER EVENT TRIGGER "issue_graphql_placeholder" OWNER TO "supabase_admin";

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "issue_pg_cron_access" ON "ddl_command_end"
--          WHEN TAG IN ('CREATE EXTENSION')
--    EXECUTE FUNCTION "extensions"."grant_pg_cron_access"();


-- ALTER EVENT TRIGGER "issue_pg_cron_access" OWNER TO "supabase_admin";

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "issue_pg_graphql_access" ON "ddl_command_end"
--          WHEN TAG IN ('CREATE FUNCTION')
--    EXECUTE FUNCTION "extensions"."grant_pg_graphql_access"();


-- ALTER EVENT TRIGGER "issue_pg_graphql_access" OWNER TO "supabase_admin";

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "issue_pg_net_access" ON "ddl_command_end"
--          WHEN TAG IN ('CREATE EXTENSION')
--    EXECUTE FUNCTION "extensions"."grant_pg_net_access"();


-- ALTER EVENT TRIGGER "issue_pg_net_access" OWNER TO "supabase_admin";

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "pgrst_ddl_watch" ON "ddl_command_end"
--    EXECUTE FUNCTION "extensions"."pgrst_ddl_watch"();


-- ALTER EVENT TRIGGER "pgrst_ddl_watch" OWNER TO "supabase_admin";

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "pgrst_drop_watch" ON "sql_drop"
--    EXECUTE FUNCTION "extensions"."pgrst_drop_watch"();


-- ALTER EVENT TRIGGER "pgrst_drop_watch" OWNER TO "supabase_admin";

--
-- PostgreSQL database dump complete
--

-- \unrestrict FYeecSiTX0FrVsndHtP5ExymHTCZXzeul74oeD0DrvPlrlyF5bq6Afvb9Rk4iwC

