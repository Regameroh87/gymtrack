import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const exercises_base = sqliteTable("exercises_base", {
  id: text("id").primaryKey(),
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
  name: text("name").notNull(),
  description: text("description"),
  level: text("level"),
  estimated_duration_min: integer("estimated_duration_min"),
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

export const session_exercises = sqliteTable("session_exercises", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => sessions.id),
  exercise_id: text("exercise_id")
    .notNull()
    .references(() => exercises_base.id),
  position: integer("position").notNull().default(0),
  sets: integer("sets").notNull().default(3),
  prescription_mode: text("prescription_mode").notNull().default("reps"),
  reps_min: integer("reps_min"),
  reps_max: integer("reps_max"),
  duration_seconds: integer("duration_seconds"),
  weight_kg: real("weight_kg"),
  rest_seconds: integer("rest_seconds"),
  intensity_mode: text("intensity_mode").notNull().default("none"),
  rir: integer("rir"),
  rpe: real("rpe"),
  tempo: text("tempo"),
  notes: text("notes"),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

/* export const routines = sqliteTable("routines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  objective: text("objective"),
  level: text("level"),
  cover_image_uri: text("cover_image_uri"),
  kind: text("kind").notNull().default("template"),
  owner_user_id: text("owner_user_id"),
  created_by: text("created_by"),
  status: text("status").notNull().default("draft"),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
}); */

/* export const routine_sessions = sqliteTable(
  "routine_sessions",
  {
    id: text("id").primaryKey(),
    routine_id: text("plan_id")
      .notNull()
      .references(() => routines.id),
    day_number: integer("day_number").notNull(),
    routine_id: text("session_id")
      .notNull()
      .references(() => sessions.id),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.plan_id, t.day_number)]
); */

/* export const plan_assignments = sqliteTable(
  "plan_assignments",
  {
    id: text("id").primaryKey(),
    plan_id: text("plan_id")
      .notNull()
      .references(() => training_plans.id),
    user_id: text("user_id").notNull(),
    assigned_by: text("assigned_by"),
    assigned_at: text("assigned_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sync_status: text("sync_status").notNull().default("pending"),
  },
  (t) => [unique().on(t.plan_id, t.user_id)]
); */
