import {
  sqliteTable,
  text,
  integer,
  real,
  unique,
} from "drizzle-orm/sqlite-core";

export const exercises_base = sqliteTable("exercises_base", {
  id: text("id").primaryKey(),
  gym_id: text("gym_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  muscle_group: text("muscle_group").notNull(),
  youtube_video_url: text("youtube_video_url").notNull(),
  image_uri: text("image_uri"),
  video_uri: text("video_uri"),
  instructions: text("instructions").notNull(),
  is_unilateral: integer("is_unilateral", { mode: "boolean" })
    .notNull()
    .default(false),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

export const equipment = sqliteTable("equipment", {
  id: text("id").primaryKey(),
  gym_id: text("gym_id").notNull(),
  name: text("name").notNull(),
  image_uri: text("image_uri"),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

export const exercise_equipment = sqliteTable("exercise_equipment", {
  id: text("id").primaryKey(),
  exercise_id: text("exercise_id")
    .notNull()
    .references(() => exercises_base.id),
  equipment_id: text("equipment_id")
    .notNull()
    .references(() => equipment.id),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  gym_id: text("gym_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  level: text("level"),
  cover_image_uri: text("cover_image_uri"),
  created_by: text("created_by"),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

export const session_exercises = sqliteTable(
  "session_exercises",
  {
    id: text("id").primaryKey(),
    session_id: text("session_id")
      .notNull()
      .references(() => sessions.id),
    exercise_id: text("exercise_id")
      .notNull()
      .references(() => exercises_base.id),
    position: integer("position").notNull().default(0),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.session_id, t.exercise_id)]
);

export const training_plans = sqliteTable("training_plans", {
  id: text("id").primaryKey(),
  gym_id: text("gym_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  objective: text("objective"),
  level: text("level"),
  target_gender: text("target_gender").notNull().default("ambos"),
  weekly_days: integer("weekly_days").notNull().default(3),
  duration_weeks: integer("duration_weeks").notNull().default(8),
  cover_image_uri: text("cover_image_uri"),
  is_published: integer("is_published", { mode: "boolean" })
    .notNull()
    .default(false),
  created_by: text("created_by"),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

export const plan_weeks = sqliteTable(
  "plan_weeks",
  {
    id: text("id").primaryKey(),
    plan_id: text("plan_id")
      .notNull()
      .references(() => training_plans.id),
    week_number: integer("week_number").notNull(),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.plan_id, t.week_number)]
);

export const plan_week_days = sqliteTable(
  "plan_week_days",
  {
    id: text("id").primaryKey(),
    week_id: text("week_id")
      .notNull()
      .references(() => plan_weeks.id),
    day_number: integer("day_number").notNull(),
    session_id: text("session_id").references(() => sessions.id),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.week_id, t.day_number)]
);

export const plan_week_day_exercises = sqliteTable(
  "plan_week_day_exercises",
  {
    id: text("id").primaryKey(),
    week_day_id: text("week_day_id")
      .notNull()
      .references(() => plan_week_days.id),
    session_exercise_id: text("session_exercise_id")
      .notNull()
      .references(() => session_exercises.id),
    position: integer("position").notNull().default(0),
    prescription_mode: text("prescription_mode").notNull().default("reps"),
    rest_seconds: integer("rest_seconds").default(90),
    intensity_mode: text("intensity_mode").default("none"),
    tempo: text("tempo"),
    notes: text("notes"),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.week_day_id, t.session_exercise_id)]
);

export const plan_week_day_exercise_sets = sqliteTable(
  "plan_week_day_exercise_sets",
  {
    id: text("id").primaryKey(),
    exercise_id: text("exercise_id")
      .notNull()
      .references(() => plan_week_day_exercises.id),
    set_number: integer("set_number").notNull(),
    reps_min: integer("reps_min"),
    reps_max: integer("reps_max"),
    weight_kg: real("weight_kg"),
    duration_seconds: integer("duration_seconds"),
    rir: real("rir"),
    rpe: real("rpe"),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.exercise_id, t.set_number)]
);

export const plan_assignments = sqliteTable("plan_assignments", {
  id: text("id").primaryKey(),
  plan_id: text("plan_id"),
  custom_plan_id: text("custom_plan_id"),
  user_id: text("user_id").notNull(),
  assigned_by: text("assigned_by").notNull(),
  gym_id: text("gym_id").notNull(),
  start_date: text("start_date").notNull(),
  end_date: text("end_date"),
  status: text("status").notNull().default("active"),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

export const session_logs = sqliteTable("session_logs", {
  id: text("id").primaryKey(),
  gym_id: text("gym_id").notNull(),
  user_id: text("user_id").notNull(),
  session_id: text("session_id").references(() => sessions.id, {
    onDelete: "set null",
  }),
  plan_id: text("plan_id").references(() => training_plans.id, {
    onDelete: "set null",
  }),
  // Cuando el log corresponde a un plan custom, plan_id queda null y se
  // referencia el plan por acá. Sin FK: los planes custom viven en custom_plans
  // y se limpian por su propio camino de sync (cleanup).
  custom_plan_id: text("custom_plan_id"),
  week_number: integer("week_number"),
  day_number: integer("day_number"),
  duration_seconds: integer("duration_seconds"),
  completed_at: text("completed_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
  deleted_at: text("deleted_at"),
});

export const session_set_logs = sqliteTable(
  "session_set_logs",
  {
    id: text("id").primaryKey(),
    session_log_id: text("session_log_id")
      .notNull()
      .references(() => session_logs.id, { onDelete: "cascade" }),
    exercise_id: text("exercise_id")
      .notNull()
      .references(() => exercises_base.id),
    set_number: integer("set_number").notNull(),
    reps: integer("reps").notNull(),
    weight_kg: real("weight_kg"),
    rest_seconds: integer("rest_seconds"),
    notes: text("notes"),
    rir: real("rir"),
    rpe: real("rpe"),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
    deleted_at: text("deleted_at"),
  },
  (t) => [unique().on(t.session_log_id, t.exercise_id, t.set_number)]
);

export const custom_exercises = sqliteTable("custom_exercises", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  muscle_group: text("muscle_group").notNull(),
  youtube_video_url: text("youtube_video_url").notNull().default(""),
  image_uri: text("image_uri"),
  video_uri: text("video_uri"),
  instructions: text("instructions").notNull().default(""),
  is_unilateral: integer("is_unilateral", { mode: "boolean" })
    .notNull()
    .default(false),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

export const custom_sessions = sqliteTable("custom_sessions", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  level: text("level"),
  cover_image_uri: text("cover_image_uri"),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

export const custom_session_exercises = sqliteTable(
  "custom_session_exercises",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    session_id: text("session_id")
      .notNull()
      .references(() => custom_sessions.id),
    exercise_source: text("exercise_source").notNull().default("base"),
    exercise_id: text("exercise_id").notNull(),
    position: integer("position").notNull().default(0),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.session_id, t.exercise_id)]
);

export const custom_plans = sqliteTable("custom_plans", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  objective: text("objective"),
  level: text("level"),
  weekly_days: integer("weekly_days").notNull().default(3),
  duration_weeks: integer("duration_weeks").notNull().default(8),
  cover_image_uri: text("cover_image_uri"),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

export const custom_plan_weeks = sqliteTable(
  "custom_plan_weeks",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    plan_id: text("plan_id")
      .notNull()
      .references(() => custom_plans.id),
    week_number: integer("week_number").notNull(),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.plan_id, t.week_number)]
);

export const custom_plan_week_days = sqliteTable(
  "custom_plan_week_days",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    week_id: text("week_id")
      .notNull()
      .references(() => custom_plan_weeks.id),
    day_number: integer("day_number").notNull(),
    session_source: text("session_source").default("custom"),
    session_id: text("session_id"),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.week_id, t.day_number)]
);

export const custom_plan_week_day_exercises = sqliteTable(
  "custom_plan_week_day_exercises",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    week_day_id: text("week_day_id")
      .notNull()
      .references(() => custom_plan_week_days.id),
    session_exercise_id: text("session_exercise_id")
      .notNull()
      .references(() => custom_session_exercises.id),
    position: integer("position").notNull().default(0),
    prescription_mode: text("prescription_mode").notNull().default("reps"),
    rest_seconds: integer("rest_seconds").default(90),
    intensity_mode: text("intensity_mode").default("none"),
    tempo: text("tempo"),
    notes: text("notes"),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.week_day_id, t.session_exercise_id)]
);

export const custom_plan_week_day_exercise_sets = sqliteTable(
  "custom_plan_week_day_exercise_sets",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    exercise_id: text("exercise_id")
      .notNull()
      .references(() => custom_plan_week_day_exercises.id),
    set_number: integer("set_number").notNull(),
    reps_min: integer("reps_min"),
    reps_max: integer("reps_max"),
    weight_kg: real("weight_kg"),
    duration_seconds: integer("duration_seconds"),
    rir: real("rir"),
    rpe: real("rpe"),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.exercise_id, t.set_number)]
);
