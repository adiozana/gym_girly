import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration tests need the local Supabase stack running (`supabase start`).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
