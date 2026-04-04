import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import * as Crypto from "expo-crypto";
export const exercises_base = sqliteTable("exercises_base", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Crypto.randomUUID()),
  name: text("name").notNull(),
  category: text("category").notNull(),
  muscle_group: text("muscle_group").notNull(),
  equipment: text("equipment").notNull(),
  video_public_id: text("video_public_id").notNull(),
  youtube_video_url: text("youtube_video_url").notNull(),
  image_public_id: text("image_public_id").notNull(),
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
