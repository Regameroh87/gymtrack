import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

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
