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

export const routines = sqliteTable("routines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  objective: text("objective"),
  level: text("level"),
  estimated_duration_min: integer("estimated_duration_min"),
  cover_image_uri: text("cover_image_uri"),
  status: text("status").notNull().default("borrador"),
  created_by: text("created_by"),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

export const routine_exercises = sqliteTable("routine_exercises", {
  id: text("id").primaryKey(),
  routine_id: text("routine_id")
    .notNull()
    .references(() => routines.id),
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
