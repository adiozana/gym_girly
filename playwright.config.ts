import { execSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// The main-flow test (SPEC.md) runs a production build on port 3100 against the LOCAL Supabase
// stack (`supabase start`), never the cloud project, and doesn't clash with `npm run dev`.
const status = JSON.parse(execSync("supabase status -o json", { encoding: "utf8" })) as {
  API_URL: string;
  PUBLISHABLE_KEY: string;
};
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(status.API_URL)) {
  throw new Error(`E2E tests must run against local Supabase, got ${status.API_URL}`);
}

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "he-IL",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile",
      // A phone-sized viewport; locally the installed Chrome, in CI Playwright's Chromium.
      use: { ...devices["Pixel 7"], channel: process.env.CI ? undefined : "chrome" },
    },
  ],
  webServer: {
    command: `npx next build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
    },
  },
});
