import { Model } from "@nozbe/watermelondb";
import { field, text, readonly, date } from "@nozbe/watermelondb/decorators";

/**
 * Model para la tabla exercises_base.
 *
 * Decoradores:
 *   @text("col")    → para strings (aplica .trim() automático)
 *   @field("col")   → para number o boolean (sin transformación)
 *   @date("col")    → convierte epoch (number) ↔ Date automáticamente
 *   @readonly       → impide escritura directa (ideal para timestamps)
 *
 * NOTA: El 'id' se genera automáticamente, no hace falta declararlo.
 */
export default class Exercise extends Model {
  static table = "exercises_base";

  @text("name") name;
  @text("category") category;
  @text("muscle_group") muscleGroup;
  @text("equipment") equipment;
  @text("video_public_id") videoPublicId;
  @text("youtube_video_url") youtubeVideoUrl;
  @text("image_public_id") imagePublicId;
  @text("instructions") instructions;

  @field("is_unilateral") isUnilateral;

  @readonly @date("created_at") createdAt;
  @readonly @date("updated_at") updatedAt;
}
