import { defineConfig } from "drizzle-kit";

// Generates SQL migrations only. Alchemy applies them to D1 on every
// `alchemy dev` / `alchemy deploy` (see apps/api/alchemy.run.ts).
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
