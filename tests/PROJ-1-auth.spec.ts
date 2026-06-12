import { test, expect } from "@playwright/test";
import { hasTestCreds, login } from "./helpers/auth";

// PROJ-1 (auth) + PROJ-2 (route guards). The unauthenticated specs are
// read-only against the app and safe to run anywhere. The authenticated block
// is skipped unless E2E_TEST_EMAIL / E2E_TEST_PASSWORD are provided.

test.describe("login page", () => {
  test("renders the email + password form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Willkommen zurück")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  });

  test("switches to the Magic Link tab", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Magic Link" }).click();
    await expect(page.locator("#magic-email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Magic Link senden" }),
    ).toBeVisible();
  });
});

test.describe("route guards (unauthenticated)", () => {
  // The middleware (src/middleware.ts) redirects to /login and preserves the
  // originally requested path in the `redirect` query param (BUG-003 fix —
  // previously the middleware sat at the repo root and never ran).
  test("protected route redirects to login with the redirect target", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
    await expect(page.locator("#email")).toBeVisible();
  });

  test("a deep protected route preserves its redirect target", async ({
    page,
  }) => {
    await page.goto("/kunden");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fkunden/);
  });

  test("forgot-password is publicly reachable", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});

test.describe("authenticated login", () => {
  test.skip(
    !hasTestCreds,
    "Set E2E_TEST_EMAIL + E2E_TEST_PASSWORD to run authenticated E2E tests",
  );

  test("password login lands on the dashboard", async ({ page }) => {
    await login(page, { expectUrl: /\/dashboard/ });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("login with a redirect param honors the target", async ({ page }) => {
    await page.goto("/login?redirect=%2Fkunden");
    await page.locator("#email").fill(process.env.E2E_TEST_EMAIL!);
    await page.locator("#password").fill(process.env.E2E_TEST_PASSWORD!);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/kunden/);
  });
});
