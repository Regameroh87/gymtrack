import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 1, // Incrementar cada vez que cambies el schema
  tables: [
    // ─── Tabla: exercises_base ───
    tableSchema({
      name: "exercises_base",
      columns: [
        { name: "name", type: "string" },
        { name: "category", type: "string" },
        { name: "muscle_group", type: "string", isOptional: true },
        { name: "equipment", type: "string", isOptional: true },
        { name: "video_public_id", type: "string", isOptional: true },
        { name: "youtube_video_url", type: "string", isOptional: true },
        { name: "image_public_id", type: "string", isOptional: true },
        { name: "instructions", type: "string", isOptional: true },
        { name: "is_unilateral", type: "boolean" },
        // Timestamps necesarios para el sync
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Agregar más tablas acá cuando las necesites:
    // tableSchema({ name: "profiles", columns: [...] }),
    // tableSchema({ name: "routines", columns: [...] }),
  ],
});
