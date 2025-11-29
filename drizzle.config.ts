import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./shared/schema.ts",
  out: "./drizzle", // IMPORTANT pour db:push
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
