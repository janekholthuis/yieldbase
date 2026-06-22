import { test, expect } from "@playwright/test";

// Environment smoke test — runs anywhere (local, Preview/staging, Prod) and only
// touches public, unauthenticated surface. Quick "is this deploy alive + wired to
// a DB" check for the Real-life-test step of the loop. Authenticated flows live in
// the per-feature specs (gated on E2E_TEST_EMAIL/PASSWORD; use the seed creds).

test.describe("smoke", () => {
  test("login page renders (app + assets served)", async ({ page }) => {
    const res = await page.goto("/login");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  });

  test("protected route guard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  });

  test("public marketing landing is reachable", async ({ page }) => {
    const res = await page.goto("/start");
    expect(res?.status()).toBeLessThan(400);
  });
});
