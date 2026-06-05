// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../database/supabase";

// Detalle de un alumno para la ficha de staff. A diferencia de
// use-plan-assignments (que lee la DB local del propio usuario logueado), esto
// consulta Supabase directo por el id del member: el staff accede a los datos de
// sus alumnos gracias a la rama is_staff_of de las policies RLS.
export const useMemberDetail = (memberId) =>
  useQuery({
    queryKey: ["member_detail", memberId],
    enabled: !!memberId,
    queryFn: async () => {
      // 1. Perfil del alumno.
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", memberId)
        .single();
      if (pErr) throw pErr;

      // 2. Asignaciones de plan (normales y custom).
      const { data: assignments, error: aErr } = await supabase
        .from("plan_assignments")
        .select("*")
        .eq("user_id", memberId)
        .order("created_at", { ascending: false });
      if (aErr) throw aErr;

      const planIds = [
        ...new Set(
          (assignments ?? []).filter((a) => a.plan_id).map((a) => a.plan_id)
        ),
      ];
      const customIds = [
        ...new Set(
          (assignments ?? [])
            .filter((a) => a.custom_plan_id)
            .map((a) => a.custom_plan_id)
        ),
      ];

      const PLAN_COLS =
        "id,name,objective,level,weekly_days,duration_weeks,cover_image_uri";
      const planMap = {};
      const customMap = {};
      if (planIds.length) {
        const { data } = await supabase
          .from("training_plans")
          .select(PLAN_COLS)
          .in("id", planIds);
        (data ?? []).forEach((p) => (planMap[p.id] = p));
      }
      if (customIds.length) {
        const { data } = await supabase
          .from("custom_plans")
          .select(PLAN_COLS)
          .in("id", customIds);
        (data ?? []).forEach((p) => (customMap[p.id] = p));
      }

      const mapped = (assignments ?? []).map((a) => ({
        ...a,
        is_custom: !!a.custom_plan_id,
        plan: a.custom_plan_id
          ? customMap[a.custom_plan_id]
          : planMap[a.plan_id],
      }));

      // 3. Historial de entrenamientos (session_logs no borrados).
      const { data: logs, error: lErr } = await supabase
        .from("session_logs")
        .select("*")
        .eq("user_id", memberId)
        .is("deleted_at", null)
        .order("completed_at", { ascending: false })
        .limit(50);
      if (lErr) throw lErr;

      const sessionIds = [
        ...new Set(
          (logs ?? []).filter((l) => l.session_id).map((l) => l.session_id)
        ),
      ];
      const sessionMap = {};
      if (sessionIds.length) {
        const { data } = await supabase
          .from("sessions")
          .select("id,name")
          .in("id", sessionIds);
        (data ?? []).forEach((s) => (sessionMap[s.id] = s.name));
      }
      const history = (logs ?? []).map((l) => ({
        ...l,
        session_name: sessionMap[l.session_id] ?? null,
      }));

      return {
        profile,
        activePlan: mapped.find((a) => a.status === "active") ?? null,
        pastPlans: mapped.filter((a) => a.status !== "active"),
        history,
      };
    },
  });
