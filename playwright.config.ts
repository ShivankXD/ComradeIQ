import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
// The desktop environment already has Edge installed. CI uses Playwright's
// downloaded Chromium; Windows contributors can run the same suite without a
// second multi-hundred-MB browser download.
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: 1,
  reporter: isCi ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // CI installs Playwright's media dependencies. Local Windows QA uses Edge
    // and does not need a separate ffmpeg download merely to exercise tests.
    video: isCi ? "retain-on-failure" : "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], ...(browserChannel ? { channel: browserChannel } : {}) } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !isCi,
        timeout: 120_000,
        // Explicitly retain server-only provider and storage configuration for
        // opt-in live checks; nothing is forwarded into browser JavaScript.
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      },
});
