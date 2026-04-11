import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const exercises_base = sqliteTable("exercises_base", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  muscle_group: text("muscle_group").notNull(),
  youtube_video_url: text("youtube_video_url").notNull(),
  cloudinary_video_public_id: text("cloudinary_video_public_id"),
  cloudinary_image_public_id: text("cloudinary_image_public_id"),
  local_image_uri: text("local_image_uri"),
  local_video_uri: text("local_video_uri"),
  instructions: text("instructions").notNull(),
  is_unilateral: integer("is_unilateral").notNull().default(0),
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
  cloudinary_image_public_id: text("cloudinary_image_public_id"),
  local_image_uri: text("local_image_uri"),
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
