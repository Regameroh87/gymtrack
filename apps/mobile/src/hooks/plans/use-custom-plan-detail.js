import { useQuery } from "@tanstack/react-query";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";

import { database } from "../../database";
import {
  custom_plan_weeks,
  custom_plan_week_days,
  custom_plan_week_day_exercises,
  custom_plan_week_day_exercise_sets,
  custom_sessions,
  custom_session_exercises,
  custom_exercises,
  exercises_base,
  session_exercises,
  sessions,
} from "../../database/schemas";

export const useCustomPlanDetail = (planId) =>
  useQuery({
    queryKey: ["custom_plan_detail_weeks", planId],
    enabled: !!planId,
    queryFn: async () => {
      // 1. Semanas
      const weeksRows = await database
        .select()
        .from(custom_plan_weeks)
        .where(
          and(
            eq(custom_plan_weeks.plan_id, planId),
            ne(custom_plan_weeks.sync_status, "deleted")
          )
        )
        .orderBy(asc(custom_plan_weeks.week_number));

      if (!weeksRows.length) return [];

      const weekIds = weeksRows.map((w) => w.id);

      // 2. Días (sin join de sesión todavía)
      const daysRows = await database
        .select({
          id: custom_plan_week_days.id,
          week_id: custom_plan_week_days.week_id,
          day_number: custom_plan_week_days.day_number,
          session_id: custom_plan_week_days.session_id,
          session_source: custom_plan_week_days.session_source,
        })
        .from(custom_plan_week_days)
        .where(
          and(
            inArray(custom_plan_week_days.week_id, weekIds),
            ne(custom_plan_week_days.sync_status, "deleted")
          )
        )
        .orderBy(asc(custom_plan_week_days.day_number));

      // 3. Nombres de sesiones (gym o custom según session_source)
      const sessionIds = daysRows.map((d) => d.session_id).filter(Boolean);
      const gymSessionMap = {};
      const customSessionMap = {};

      if (sessionIds.length) {
        const gymRows = await database
          .select({
            id: sessions.id,
            name: sessions.name,
            cover_image_uri: sessions.cover_image_uri,
          })
          .from(sessions)
          .where(inArray(sessions.id, sessionIds));
        gymRows.forEach((s) => {
          gymSessionMap[s.id] = s;
        });

        const customRows = await database
          .select({
            id: custom_sessions.id,
            name: custom_sessions.name,
            cover_image_uri: custom_sessions.cover_image_uri,
          })
          .from(custom_sessions)
          .where(inArray(custom_sessions.id, sessionIds));
        customRows.forEach((s) => {
          customSessionMap[s.id] = s;
        });
      }

      const dayIds = daysRows.map((d) => d.id);

      // 4. Ejercicios (basic)
      let exRows = [];
      if (dayIds.length) {
        exRows = await database
          .select({
            id: custom_plan_week_day_exercises.id,
            week_day_id: custom_plan_week_day_exercises.week_day_id,
            position: custom_plan_week_day_exercises.position,
            session_exercise_id: custom_plan_week_day_exercises.session_exercise_id,
          })
          .from(custom_plan_week_day_exercises)
          .where(
            and(
              inArray(custom_plan_week_day_exercises.week_day_id, dayIds),
              ne(custom_plan_week_day_exercises.sync_status, "deleted")
            )
          )
          .orderBy(asc(custom_plan_week_day_exercises.position));
      }

      // 5. Nombres de ejercicios (desde custom_session_exercises o session_exercises según origen)
      const sessionExIds = exRows.map((e) => e.session_exercise_id).filter(Boolean);
      const exNameMap = {};

      if (sessionExIds.length) {
        // Intentar desde custom_session_exercises primero. El nombre puede venir de
        // exercises_base o de custom_exercises según exercise_source: coalesce sobre
        // ambos leftJoin (ids UUID únicos entre tablas).
        const customExRows = await database
          .select({
            id: custom_session_exercises.id,
            name: sql`coalesce(${exercises_base.name}, ${custom_exercises.name})`,
          })
          .from(custom_session_exercises)
          .leftJoin(
            exercises_base,
            eq(custom_session_exercises.exercise_id, exercises_base.id)
          )
          .leftJoin(
            custom_exercises,
            eq(custom_session_exercises.exercise_id, custom_exercises.id)
          )
          .where(inArray(custom_session_exercises.id, sessionExIds));
        customExRows.forEach((r) => {
          exNameMap[r.id] = r.name;
        });

        // Intentar desde session_exercises (para sesiones del gym)
        const gymExRows = await database
          .select({
            id: session_exercises.id,
            name: exercises_base.name,
          })
          .from(session_exercises)
          .leftJoin(
            exercises_base,
            eq(session_exercises.exercise_id, exercises_base.id)
          )
          .where(inArray(session_exercises.id, sessionExIds));
        gymExRows.forEach((r) => {
          if (!exNameMap[r.id]) exNameMap[r.id] = r.name;
        });
      }

      // 6. Series
      const exIds = exRows.map((e) => e.id);
      const setsByEx = {};
      if (exIds.length) {
        const setRows = await database
          .select({
            exercise_id: custom_plan_week_day_exercise_sets.exercise_id,
            set_number: custom_plan_week_day_exercise_sets.set_number,
            reps_min: custom_plan_week_day_exercise_sets.reps_min,
            reps_max: custom_plan_week_day_exercise_sets.reps_max,
            duration_seconds: custom_plan_week_day_exercise_sets.duration_seconds,
          })
          .from(custom_plan_week_day_exercise_sets)
          .where(inArray(custom_plan_week_day_exercise_sets.exercise_id, exIds))
          .orderBy(asc(custom_plan_week_day_exercise_sets.set_number));
        for (const s of setRows) {
          if (!setsByEx[s.exercise_id]) setsByEx[s.exercise_id] = [];
          setsByEx[s.exercise_id].push(s);
        }
      }

      // 7. Normalizar jerarquía
      const exByDayId = {};
      for (const ex of exRows) {
        if (!exByDayId[ex.week_day_id]) exByDayId[ex.week_day_id] = [];
        exByDayId[ex.week_day_id].push({
          ...ex,
          exercise_name: exNameMap[ex.session_exercise_id] ?? null,
          sets: setsByEx[ex.id] ?? [],
        });
      }

      const daysByWeekId = {};
      for (const d of daysRows) {
        if (!daysByWeekId[d.week_id]) daysByWeekId[d.week_id] = [];
        const sessionData =
          gymSessionMap[d.session_id] ?? customSessionMap[d.session_id] ?? null;
        daysByWeekId[d.week_id].push({
          ...d,
          session_name: sessionData?.name ?? null,
          cover_image_uri: sessionData?.cover_image_uri ?? null,
          exercises: exByDayId[d.id] ?? [],
        });
      }

      return weeksRows.map((w) => ({
        ...w,
        days: daysByWeekId[w.id] ?? [],
      }));
    },
  });
