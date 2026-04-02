import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const exercisesBase = sqliteTable("exercises_base", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  muscle_group: text("muscle_group").notNull(),
  equipment: text("equipment").notNull(),
  video_public_id: text("video_public_id").notNull(),
  youtube_video_url: text("youtube_video_url").notNull(),
  image_public_id: text("image_public_id").notNull(),
  instructions: text("instructions").notNull(),
  is_unilateral: text("is_unilateral").notNull(),
});
