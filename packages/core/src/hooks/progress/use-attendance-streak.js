// Librerías externas
import { useQuery } from "@tanstack/react-query";

// Base de datos
import { supabase } from "../../supabase.js";

// Utilidades
import { startOfDay, startOfWeek, weekKey } from "@gymtrack/core/format-date";

// Ventana del heatmap / cálculo de racha (semanas hacia atrás, incluida la actual).
const WEEKS = 12;

// Lee las asistencias (check-ins QR) del socio en el gym activo y deriva:
//   - totalCheckins / thisWeek: contadores rápidos
//   - weekStreak: semanas consecutivas con ≥1 check-in (con gracia para la
//     semana actual si todavía no entrenó)
//   - weeks: grilla Lun→Dom × WEEKS para el heatmap
// La tabla attendances NO se sincroniza a SQLite, así que se consulta a Supabase
// directo (sirve también en web). La RLS attendances_select ya limita las filas
// a las del propio socio; el filtro por gym_id acota al gym activo.
export const fetchAttendanceProgress = async (gymId) => {
  const firstWeekStart = startOfWeek(new Date());
  firstWeekStart.setDate(firstWeekStart.getDate() - (WEEKS - 1) * 7);

  let query = supabase
    .from("attendances")
    .select("checked_in_at")
    .gte("checked_in_at", firstWeekStart.toISOString())
    .order("checked_in_at", { ascending: false });
  if (gymId) query = query.eq("gym_id", gymId);

  const { data, error } = await query;
  if (error) throw error;

  const checkins = (data ?? []).map((r) => new Date(r.checked_in_at));

  // Conteo por día (clave = fecha local "YYYY-MM-DD") para el heatmap.
  const countByDay = new Map();
  for (const d of checkins) {
    const k = startOfDay(d).toISOString().slice(0, 10);
    countByDay.set(k, (countByDay.get(k) ?? 0) + 1);
  }

  // Grilla de semanas (vieja → nueva), cada una con 7 días Lun→Dom.
  const weeks = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const monday = new Date(firstWeekStart);
    monday.setDate(monday.getDate() + (WEEKS - 1 - w) * 7);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(day.getDate() + i);
      const k = startOfDay(day).toISOString().slice(0, 10);
      days.push({ date: k, count: countByDay.get(k) ?? 0 });
    }
    weeks.push({ key: weekKey(monday), days });
  }

  // Check-ins de la semana actual.
  const currentWeekKey = weekKey(new Date());
  const thisWeek = checkins.filter((d) => weekKey(d) === currentWeekKey).length;

  // Racha de semanas consecutivas con al menos un check-in. La semana actual no
  // rompe la racha si todavía está vacía (gracia). Cap implícito en WEEKS por la
  // ventana consultada.
  const weeksWithCheckin = new Set(checkins.map((d) => weekKey(d)));
  let weekStreak = 0;
  const cursor = startOfWeek(new Date());
  for (let i = 0; i < WEEKS; i++) {
    const wk = new Date(cursor);
    wk.setDate(wk.getDate() - i * 7);
    if (weeksWithCheckin.has(weekKey(wk))) {
      weekStreak++;
    } else if (i === 0) {
      continue; // gracia para la semana en curso
    } else {
      break;
    }
  }

  return {
    totalCheckins: checkins.length,
    thisWeek,
    weekStreak,
    weeks,
  };
};

export const useAttendanceStreak = (gymId, userId) => {
  return useQuery({
    queryKey: ["progress", "attendance", gymId, userId],
    enabled: !!userId && !!gymId,
    staleTime: 1000 * 60 * 2,
    queryFn: () => fetchAttendanceProgress(gymId),
  });
};
