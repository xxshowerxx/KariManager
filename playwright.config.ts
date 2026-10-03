import { defineConfig } from "@playwright/test";
export default defineConfig({
  timeout: 60000,
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:1420",
    viewport: { width: 1280, height: 860 },
    launchOptions: {
      executablePath:
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    },
    permissions: ["clipboard-read", "clipboard-write"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
