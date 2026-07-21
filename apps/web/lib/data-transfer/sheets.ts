// Definición del workbook de la sección Datos: nombres de hoja, mapeo columna
// Excel (ES) ↔ campo interno, y helpers de normalización compartidos por
// export.ts e import.ts. La convención de IDs es: la columna ID siempre se
// exporta; en import, ID vacío = crear, ID existente = actualizar, nunca borrar.

import type { Option } from "@/lib/catalog-options";

export type Column = {
  key: string;
  header: string;
  // Columnas informativas del export (imágenes, nombres denormalizados) que el
  // import ignora.
  infoOnly?: boolean;
};

export const SHEET = {
  leeme: "Leeme",
  socios: "Socios",
  equipment: "Equipamiento",
  exercises: "Ejercicios",
  sessions: "Sesiones",
  sessionExercises: "Sesion_Ejercicios",
  plans: "Planes",
  planDetail: "Plan_Detalle",
  subscriptions: "Inscripciones",
  memberPayments: "Pagos_Socios",
  coachPayments: "Pagos_Coaches",
  workoutLogs: "Registros_Entrenamiento",
  workoutSets: "Registros_Series",
} as const;

// ── Hojas importables ──

export const SOCIOS_COLUMNS: Column[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Nombre" },
  { key: "last_name", header: "Apellido" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Teléfono" },
  { key: "document_number", header: "Documento" },
  { key: "address", header: "Dirección" },
  { key: "gender", header: "Género" },
  { key: "role", header: "Rol" },
  { key: "membership_status", header: "Membresía" },
  { key: "is_active", header: "Activo" },
  // Resumen de inscripciones/pagos del socio (solo export; el detalle completo
  // vive en las hojas Inscripciones y Pagos_Socios).
  { key: "activities", header: "Actividades", infoOnly: true },
  { key: "due_date", header: "Próximo vencimiento", infoOnly: true },
  { key: "last_payment_date", header: "Último pago", infoOnly: true },
];

export const EQUIPMENT_COLUMNS: Column[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Nombre" },
  { key: "image_uri", header: "Imagen", infoOnly: true },
];

export const EXERCISES_COLUMNS: Column[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Nombre" },
  { key: "category", header: "Categoría" },
  { key: "muscle_group", header: "Grupo muscular" },
  { key: "equipment_names", header: "Equipamiento" },
  { key: "is_unilateral", header: "Unilateral" },
  { key: "instructions", header: "Instrucciones" },
  { key: "youtube_video_url", header: "Video YouTube" },
  { key: "image_uri", header: "Imagen", infoOnly: true },
  { key: "video_uri", header: "Video", infoOnly: true },
];

export const SESSIONS_COLUMNS: Column[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Nombre" },
  { key: "description", header: "Descripción" },
  { key: "level", header: "Nivel" },
  { key: "cover_image_uri", header: "Portada", infoOnly: true },
];

export const SESSION_EXERCISES_COLUMNS: Column[] = [
  { key: "id", header: "ID" },
  { key: "session_id", header: "ID sesión" },
  { key: "session_name", header: "Sesión", infoOnly: true },
  { key: "exercise_id", header: "ID ejercicio" },
  { key: "exercise_name", header: "Ejercicio", infoOnly: true },
  { key: "position", header: "Posición" },
];

// ── Hojas solo-export ──

export const PLANS_COLUMNS: Column[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Nombre" },
  { key: "description", header: "Descripción" },
  { key: "objective", header: "Objetivo" },
  { key: "level", header: "Nivel" },
  { key: "target_gender", header: "Género objetivo" },
  { key: "weekly_days", header: "Días por semana" },
  { key: "duration_weeks", header: "Duración (semanas)" },
  { key: "is_published", header: "Publicado" },
];

export const PLAN_DETAIL_COLUMNS: Column[] = [
  { key: "plan_id", header: "ID plan" },
  { key: "plan_name", header: "Plan" },
  { key: "week", header: "Semana" },
  { key: "day", header: "Día" },
  { key: "session_name", header: "Sesión" },
  { key: "exercise_name", header: "Ejercicio" },
  { key: "position", header: "Posición" },
  { key: "set_number", header: "Serie" },
  { key: "reps_min", header: "Reps mín" },
  { key: "reps_max", header: "Reps máx" },
  { key: "weight_kg", header: "Peso (kg)" },
  { key: "duration_seconds", header: "Duración (seg)" },
  { key: "rest_seconds", header: "Descanso (seg)" },
  { key: "rir", header: "RIR" },
  { key: "rpe", header: "RPE" },
  { key: "tempo", header: "Tempo" },
  { key: "notes", header: "Notas" },
];

export const SUBSCRIPTIONS_COLUMNS: Column[] = [
  { key: "member_name", header: "Socio" },
  { key: "email", header: "Email" },
  { key: "activity_name", header: "Actividad" },
  { key: "plan_label", header: "Pase" },
  { key: "price", header: "Precio" },
  { key: "status", header: "Estado" },
  { key: "start_date", header: "Inicio" },
  { key: "due_date", header: "Vencimiento" },
  { key: "last_payment_date", header: "Último pago" },
  { key: "end_date", header: "Fin" },
];

export const MEMBER_PAYMENTS_COLUMNS: Column[] = [
  { key: "paid_at", header: "Fecha" },
  { key: "member_name", header: "Socio" },
  { key: "activity_name", header: "Actividad" },
  { key: "amount", header: "Monto" },
  { key: "registered_by_name", header: "Registrado por" },
  { key: "voided", header: "Anulado" },
];

export const COACH_PAYMENTS_COLUMNS: Column[] = [
  { key: "coach_name", header: "Coach" },
  { key: "period_start", header: "Período desde" },
  { key: "period_end", header: "Período hasta" },
  { key: "fixed_amount", header: "Monto fijo" },
  { key: "revenue_share_amount", header: "Monto % ingresos" },
  { key: "classes_count", header: "Clases" },
  { key: "classes_amount", header: "Monto clases" },
  { key: "total_amount", header: "Total" },
  { key: "paid_at", header: "Fecha de pago" },
  { key: "notes", header: "Notas" },
];

export const WORKOUT_LOGS_COLUMNS: Column[] = [
  { key: "id", header: "ID" },
  { key: "member_name", header: "Socio" },
  { key: "session_name", header: "Sesión" },
  { key: "plan_name", header: "Plan" },
  { key: "week_number", header: "Semana" },
  { key: "day_number", header: "Día" },
  { key: "duration_seconds", header: "Duración (seg)" },
  { key: "completed_at", header: "Completado" },
];

export const WORKOUT_SETS_COLUMNS: Column[] = [
  { key: "session_log_id", header: "ID registro" },
  { key: "exercise_name", header: "Ejercicio" },
  { key: "set_number", header: "Serie" },
  { key: "reps", header: "Reps" },
  { key: "weight_kg", header: "Peso (kg)" },
  { key: "rest_seconds", header: "Descanso (seg)" },
  { key: "rir", header: "RIR" },
  { key: "rpe", header: "RPE" },
  { key: "notes", header: "Notas" },
];

// ── Mapeo fila DB ↔ fila Excel ──

export const headersOf = (columns: Column[]) => columns.map((c) => c.header);

// {campo: valor} → {header ES: valor}, para json rows del export.
export function toSheetRow(
  columns: Column[],
  row: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of columns) out[col.header] = row[col.key] ?? null;
  return out;
}

// {header ES: valor} → {campo: valor}. El match de headers es insensible a
// mayúsculas/acentos para tolerar planillas retocadas a mano.
export function fromSheetRow(
  columns: Column[],
  row: Record<string, unknown>
): Record<string, unknown> {
  const byNorm = new Map<string, unknown>();
  for (const [header, value] of Object.entries(row)) {
    byNorm.set(normText(header), value);
  }
  const out: Record<string, unknown> = {};
  for (const col of columns) {
    if (col.infoOnly) continue;
    out[col.key] = byNorm.get(normText(col.header)) ?? null;
  }
  return out;
}

// ── Normalización de valores ──

export const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const normText = (s: unknown) =>
  stripAccents(String(s ?? "").trim().toLowerCase());

// Celda → string trimmeado o null (números de teléfono/documento incluidos).
export const asText = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

export const asInt = (v: unknown): number | null => {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

const TRUE_WORDS = new Set(["si", "sí", "true", "1", "x", "verdadero"]);
const FALSE_WORDS = new Set(["no", "false", "0", "falso"]);

// "Sí"/"No" y variantes → boolean; vacío → null (el caller decide el default).
export const asBool = (v: unknown): boolean | null => {
  if (typeof v === "boolean") return v;
  const s = normText(v);
  if (!s) return null;
  if (TRUE_WORDS.has(s)) return true;
  if (FALSE_WORDS.has(s)) return false;
  return null;
};

export const boolLabel = (v: unknown) => (v ? "Sí" : "No");

// Matchea contra un set de opciones {label, value} aceptando el label ("Fuerza")
// o el value crudo ("fuerza"), sin distinguir mayúsculas/acentos.
export function matchOption(options: Option[], input: unknown): string | null {
  const s = normText(input);
  if (!s) return null;
  const hit = options.find(
    (o) => normText(o.value) === s || normText(o.label) === s
  );
  return hit?.value ?? null;
}

export const optionLabel = (options: Option[], value: unknown): string =>
  options.find((o) => o.value === value)?.label ?? String(value ?? "");

// Separador de la columna Equipamiento (varios equipos por ejercicio).
export const EQUIPMENT_SEPARATOR = " | ";

export const splitEquipmentNames = (v: unknown): string[] =>
  String(v ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

// ── Hoja Leeme ──

export const LEEME_AOA: unknown[][] = [
  ["GymTrack — Export / Import de datos"],
  [],
  ["Hojas IMPORTABLES: Socios, Equipamiento, Ejercicios, Sesiones y Sesion_Ejercicios."],
  ["El resto de las hojas son solo informativas (export): el import las ignora."],
  [],
  ["Reglas del import:"],
  ["- Fila con ID vacío: se crea un registro nuevo."],
  ["- Fila con ID existente: se actualiza ese registro."],
  ["- El import nunca borra datos."],
  ["- Las columnas Imagen/Video/Portada y los nombres denormalizados son informativos; el import los ignora."],
  [],
  ["Socios:"],
  ["- Para socios nuevos el Email es obligatorio; se crea la cuenta con la contraseña por defecto."],
  ["- El Email de un socio existente no se puede cambiar desde el import."],
  ["- Rol: Socio, Coach o Administrador. Membresía: Activa/Inactiva. Activo: Sí/No."],
  ["- Actividades, Próximo vencimiento y Último pago son un resumen de las inscripciones activas; el import los ignora."],
  [],
  ["Ejercicios:"],
  ["- Categoría: Fuerza, Cardio, Flexibilidad o Potencia."],
  ["- Grupo muscular: Pecho, Espalda, Piernas, Hombros, Brazos o Core."],
  ["- Equipamiento: nombres separados por \"|\", deben existir en la hoja Equipamiento o en el gimnasio."],
  [],
  ["Sesion_Ejercicios:"],
  ["- Cada fila vincula un ejercicio a una sesión por sus IDs."],
  ["- Para agregar ejercicios a una sesión nueva: importala primero, exportá de nuevo para obtener su ID y volvé a importar."],
];
