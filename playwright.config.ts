import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4400",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm build && node tests/servidor.mjs",
    url: "http://localhost:4400",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
