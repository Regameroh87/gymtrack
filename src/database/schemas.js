import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

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
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  sync_status: text("sync_status").notNull().default("pending"),
});

export const training_plans = sqliteTable("training_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  objective: text("objective"),
  level: text("level"),
  weekly_days: integer("weekly_days").notNull().default(3),
  duration_weeks: integer("duration_weeks").notNull().default(8),
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

export const training_plan_days = sqliteTable(
  "training_plan_days",
  {
    id: text("id").primaryKey(),
    plan_id: text("plan_id")
      .notNull()
      .references(() => training_plans.id),
    day_number: integer("day_number").notNull(),
    session_id: text("session_id")
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
);
