import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";
export const exercisesBase = sqliteTable("exercises_base", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
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
});
