import { schemaMigrations } from "@nozbe/watermelondb/Schema/migrations";
// import { addColumns, createTable } from "@nozbe/watermelondb/Schema/migrations";

export const migrations = schemaMigrations({
  migrations: [
    // Cuando cambies el schema (versión 2, 3, etc.), agregá migraciones acá.
    // Ejemplo:
    // {
    //   toVersion: 2,
    //   steps: [
    //     addColumns({
    //       table: "exercises_base",
    //       columns: [{ name: "difficulty", type: "string", isOptional: true }],
    //     }),
    //   ],
    // },
  ],
});
