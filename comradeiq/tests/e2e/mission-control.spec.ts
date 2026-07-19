import { expect, test, type Download, type Page } from "@playwright/test";

const liveProviderRequested = process.env.COMRADEIQ_E2E_LIVE === "1" && Boolean(process.env.OPENAI_API_KEY);

async function providerState(page: Page) {
  const response = await page.request.get("/api/health/ai");
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ provider?: string }>;
}

async function requireNoProvider(page: Page) {
  const health = await providerState(page);
  test.skip(health.provider !== "unconfigured", "This check requires the server to run without an AI provider.");
}

async function requireLiveProvider(page: Page) {
  test.skip(!liveProviderRequested, "Set COMRADEIQ_E2E_LIVE=1 and provide OPENAI_API_KEY to run live-provider acceptance checks.");
  const health = await providerState(page);
  test.skip(health.provider !== "openai", "The running server did not report an OpenAI provider.");
}

async function submitMission(page: Page, mission: string) {
  await page.getByPlaceholder(/message comradeiq/i).fill(mission);
  await page.getByRole("button", { name: "Send", exact: true }).click();
}

async function openTeamControlsFromUnavailableMission(page: Page) {
  await page.goto("/");
  await submitMission(page, "Show the team controls.");
  await expect(page.getByText(/live ai.*configur/i)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await page.getByRole("button", { name: /open team controls/i }).click();
  const dialog = page.getByRole("dialog", { name: /commander network/i });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function waitForResult(page: Page) {
  const result = page.getByRole("region", { name: /mission result/i });
  await expect(result).toBeVisible({ timeout: 150_000 });
  return result;
}

async function downloadBytes(download: Download) {
  const stream = await download.createReadStream();
  if (!stream) throw new Error("The browser did not provide a download stream.");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test.describe("provider configuration and team controls", () => {
  test("shows an honest onboarding state when no API key is configured", async ({ page }) => {
    await requireNoProvider(page);
    await page.goto("/");

    await submitMission(page, "Hello");

    await expect(page.getByText(/live ai.*configur/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/OPENAI_API_KEY/)).toBeVisible();
    await expect(page.getByRole("region", { name: /mission result/i })).not.toBeVisible();
  });

  test("can disconnect and reconnect a Comrade without changing the direct Commander topology", async ({ page }) => {
    await requireNoProvider(page);
    const dialog = await openTeamControlsFromUnavailableMission(page);

    const disconnect = dialog.getByRole("button", { name: /disconnect researcher/i });
    await expect(disconnect).toHaveAttribute("aria-pressed", "true");
    await disconnect.click();
    const reconnect = dialog.getByRole("button", { name: /connect researcher/i });
    await expect(reconnect).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.getByText(/researcher is now offline/i)).toBeVisible();

    await reconnect.click();
    await expect(dialog.getByRole("button", { name: /disconnect researcher/i })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByText(/researcher is now online/i)).toBeVisible();
  });
});

test.describe("mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps Team Controls visible and free of horizontal page overflow", async ({ page }) => {
    await requireNoProvider(page);
    const dialog = await openTeamControlsFromUnavailableMission(page);

    await expect(dialog.getByText(/comrades online/i)).toBeVisible();
    await expect(dialog.getByRole("button", { name: /disconnect writer/i })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe("real provider artifacts", () => {
  test.setTimeout(180_000);

  test("answers a greeting with a real configured provider", async ({ page }) => {
    await requireLiveProvider(page);
    await page.goto("/");
    await submitMission(page, "Hi");

    const result = await waitForResult(page);
    await expect(result).not.toContainText(/live ai.*configur/i);
    expect((await result.innerText()).trim().length).toBeGreaterThan(24);
  });

  test("creates a downloadable README Markdown artifact", async ({ page }) => {
    await requireLiveProvider(page);
    await page.goto("/");
    await submitMission(page, "Create a concise README for a small TypeScript release-check project. Include installation and usage sections.");

    const result = await waitForResult(page);
    const downloadPromise = page.waitForEvent("download");
    await result.getByTestId("download-markdown").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("README.md");
    const artifact = await downloadBytes(download);
    expect(artifact.byteLength).toBeGreaterThan(100);
    expect(artifact.toString("utf8")).toMatch(/^#\s/m);
  });

  test("uses web research only after the user enables it and returns a cited source link", async ({ page }) => {
    await requireLiveProvider(page);
    await page.goto("/");
    await page.getByRole("button", { name: /search web/i }).click();
    await expect(page.getByRole("button", { name: /web on/i })).toBeVisible();
    await submitMission(page, "Research the official OpenAI API documentation and give one concise, cited finding.");

    const result = await waitForResult(page);
    const externalSources = result.locator('a[href^="http"]');
    await expect(externalSources.first()).toBeVisible({ timeout: 30_000 });
  });

  test("creates and downloads a valid PPTX presentation", async ({ page }) => {
    await requireLiveProvider(page);
    await page.goto("/");
    await submitMission(page, "Create a short three-slide presentation about release verification.");

    const result = await waitForResult(page);
    const downloadPromise = page.waitForEvent("download");
    await result.getByTestId("download-presentation").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pptx$/i);
    const artifact = await downloadBytes(download);
    expect(artifact.byteLength).toBeGreaterThan(500);
    expect(artifact.subarray(0, 2).toString("utf8")).toBe("PK");
  });
});
