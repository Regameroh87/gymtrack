import { defineconfig } from "drizzle-kit";

export default defineconfig({
  dialect: "sqlite",
  schema: "./src/database/schemas.js",
  out: "./src/database/migrations",
  driver: "expo",
});
