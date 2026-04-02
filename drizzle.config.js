import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/database/schemas.js",
  out: "./src/database/migrations",
  driver: "expo",
});
